"""
Notification Cron Jobs (APScheduler)
─────────────────────────────────────
รันทุกวัน 08:00 Thai time (UTC+7)
- check_payment_escalation: เตือนค่าเดินทางส่วนตัวที่ยังไม่จ่าย
    Day 3  → เตือน user
    Day 7  → แจ้ง admin (+ user ซ้ำ)
    Day 14+ → แจ้ง admin ซ้ำทุก 7 วัน
- check_stale_mileage (08:20, REQ-3 Phase 3.5 2026-07-19): เตือน driver — บันทึกไมล์
    เริ่มแล้วแต่ยังไม่ปิด ข้ามวันเดินทางไปแล้ว
Phase 5 (2026-07-19) — เก็บกวาด: import ทุกจุดย้ายขึ้น top-level (เดิมแต่ละ function
import ในตัวเอง — ทดสอบแล้วไม่มี circular import จริง จึงรวมได้ตาม Clean Code Rules)
"""
from datetime import timedelta

from models import db, User, VehicleBooking, VehicleMileage, SystemConfig, get_bkk_time
from domain.vehicle.fuel import calc_fuel_cost
from domain.vehicle.workflow import apply_transition
from views.core.notification_service import (
    notify_payment_reminder_user,
    notify_payment_overdue_admin,
    notify_mileage_not_closed,
    notify_auto_rejected,
)


def check_payment_escalation(app):
    """วนเช็ค VehicleMileage ที่เป็น personal + ปิดงานแล้ว + ยังไม่ paid"""
    with app.app_context():
        now = get_bkk_time()
        fuel_price = float(SystemConfig.get('fuel_price', '40'))

        # ดึง mileage personal ที่ยังไม่จ่าย และปิดงานแล้ว
        candidates = (VehicleMileage.query
                      .join(VehicleBooking)
                      .filter(VehicleBooking.expense_type == 'personal',
                              VehicleMileage.personal_status == 0,
                              VehicleMileage.odometer_end.isnot(None))
                      .all())

        if not candidates:
            return

        # หา admin ทั้งหมด (สำหรับ escalation)
        admins = User.query.filter(
            (User.role_vehicle == 'admin') | (User.is_superadmin == True)
        ).all()
        admin_ids = [a.id for a in admins]

        for m in candidates:
            b = m.booking
            end_time = m.actual_end or m.created_at
            if not end_time:
                continue
            days_overdue = (now - end_time).days
            if days_overdue < 3:
                continue   # ยังไม่ถึงเวลาเตือน

            distance = (m.odometer_end - m.odometer_start
                        if m.odometer_start is not None and m.odometer_end is not None else None)
            cost = calc_fuel_cost(b.assigned_vehicle, distance, fuel_price, override=m.fuel_cost)
            if cost <= 0:
                continue

            # กันเตือนซ้ำในวันเดียว
            if m.last_reminder_at and (now - m.last_reminder_at).days < 1:
                continue

            # Day 3-6: เตือน user (ครั้งเดียวในช่วงนั้น)
            if 3 <= days_overdue < 7:
                notify_payment_reminder_user(b, m, cost, days_overdue)

            # Day 7+: เตือน user + admin ทุก 7 วัน
            elif days_overdue >= 7:
                # ส่งทุก 7 วันหลัง day 7 (7, 14, 21, ...)
                if (days_overdue - 7) % 7 == 0:
                    notify_payment_reminder_user(b, m, cost, days_overdue)
                    for aid in admin_ids:
                        notify_payment_overdue_admin(aid, b, m, cost, days_overdue)

            m.last_reminder_at = now

        db.session.commit()


def check_stale_mileage(app):
    """แจ้งเตือน driver — งานเริ่มไมล์แล้วแต่ยังไม่ปิด ข้ามวันเดินทางไปแล้ว (08:20 BKK)
    REQ-3 (Phase 3.5, 2026-07-19) — ส่วนเสริม auto_close_stale_trips ของ Phase 3 (ปิด
    อัตโนมัติเมื่อรถคันเดียวกันมีงานใหม่บันทึกไมล์เริ่ม): ตัวนี้เตือนล่วงหน้าถ้ายังไม่มี
    งานใหม่มาปิดให้ ใช้ mileage_open_reminder_at กันแจ้งซ้ำ (แยกจาก last_reminder_at ที่
    check_payment_escalation ใช้อยู่แล้ว — คนละเรื่องกัน ห้ามใช้ร่วม)"""
    with app.app_context():
        now = get_bkk_time()

        candidates = (VehicleMileage.query
                      .join(VehicleBooking)
                      .filter(VehicleMileage.odometer_start.isnot(None),
                              VehicleMileage.odometer_end.is_(None),
                              VehicleBooking.status == 'approved',
                              VehicleBooking.driver_id.isnot(None))
                      .all())

        if not candidates:
            return

        for m in candidates:
            b = m.booking
            trip_date = (m.actual_start or b.start_datetime).date()
            if trip_date >= now.date():
                continue  # ยังไม่ข้ามวัน

            if m.mileage_open_reminder_at and (now - m.mileage_open_reminder_at).days < 1:
                continue  # กันแจ้งซ้ำในวันเดียวกัน

            days_open = (now.date() - trip_date).days
            notify_mileage_not_closed(b, m, days_open)
            m.mileage_open_reminder_at = now

        db.session.commit()


def auto_reject_overdue_bookings(app):
    """ยกเลิก pending/waiting_approver ที่ start_datetime < now อัตโนมัติ (08:10 BKK)
    DEBT-4 (Phase 3.5 พบ, ปิด Phase 4, 2026-07-19): เดิมเซ็ต bk.status = 'rejected' ตรง ไม่ผ่าน
    workflow gate เลย — เปลี่ยนเป็น apply_transition() (ไม่ใช้ booking_service.reject_from_pending()
    เพราะ notify คนละตัว: reject_from_pending ส่ง notify_rejected ซึ่งสื่อว่ามี Admin/หัวหน้าแผนก
    เป็นคนกดปฏิเสธ ผิดความจริงสำหรับ cron — path นี้ยังคง notify_auto_rejected(bk) เดิมไว้)"""
    REASON = 'เลยกำหนดเดินทาง — ระบบยกเลิกอัตโนมัติ'

    with app.app_context():
        now = get_bkk_time()
        overdue = VehicleBooking.query.filter(
            VehicleBooking.status.in_(['pending', 'waiting_approver']),
            VehicleBooking.start_datetime < now,
        ).all()

        for bk in overdue:
            ok, _msg = apply_transition(bk, 'rejected')
            if not ok:
                continue  # ไม่ควรเกิด — pending/waiting_approver → rejected อนุญาตเสมอใน ALLOWED_TRANSITIONS
            bk.reject_reason = REASON
            bk.updated_by = None  # ระบบ
            db.session.flush()
            notify_auto_rejected(bk)

        db.session.commit()


def init_scheduler(app):
    """เรียกจาก app.py หลัง register blueprints
    apscheduler import ไว้ในนี้ตั้งใจ (ไม่ย้ายขึ้น top-level เหมือนจุดอื่นใน Phase 5) — ทดสอบแล้ว
    apscheduler ไม่ได้ติดตั้งใน dev/test env (`ModuleNotFoundError` ทันทีที่ import module นี้
    ถ้าย้ายขึ้นบน) เดิม tests/conftest.py เตือนไว้แล้วว่า "ห้าม import app/app.py ใน test —
    จะ start APScheduler" — lazy import ตรงนี้คือกลไกที่ทำให้ pytest import module นี้ได้โดย
    ไม่ต้องมี apscheduler อยู่จริง (ไม่ใช่ circular import — เป็นเรื่อง optional dependency)"""
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
    scheduler = BackgroundScheduler(timezone='Asia/Bangkok')
    scheduler.add_job(
        func    = lambda: check_payment_escalation(app),
        trigger = CronTrigger(hour=8, minute=0),
        id      = 'payment_escalation',
        name    = 'Check overdue personal payments',
        replace_existing = True,
    )
    scheduler.add_job(
        func    = lambda: auto_reject_overdue_bookings(app),
        trigger = CronTrigger(hour=8, minute=10),
        id      = 'auto_reject_overdue',
        name    = 'Auto-reject overdue pending bookings',
        replace_existing = True,
    )
    scheduler.add_job(
        func    = lambda: check_stale_mileage(app),
        trigger = CronTrigger(hour=8, minute=20),
        id      = 'stale_mileage_reminder',
        name    = 'Remind driver of unclosed mileage (REQ-3, Phase 3.5)',
        replace_existing = True,
    )
    scheduler.start()
    app.config['SCHEDULER'] = scheduler
    return scheduler
