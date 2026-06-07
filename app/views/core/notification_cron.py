"""
Notification Cron Jobs (APScheduler)
─────────────────────────────────────
รันทุกวัน 08:00 Thai time (UTC+7)
- check_payment_escalation: เตือนค่าเดินทางส่วนตัวที่ยังไม่จ่าย
    Day 3  → เตือน user
    Day 7  → แจ้ง admin (+ user ซ้ำ)
    Day 14+ → แจ้ง admin ซ้ำทุก 7 วัน
"""
from datetime import timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger


def _calc_fuel_cost(mileage, booking, fuel_price):
    """ตรงกับสูตรใน budget_personal() — central/department/personal ใช้ร่วมกัน"""
    if mileage.fuel_cost and float(mileage.fuel_cost) > 0:
        return float(mileage.fuel_cost)
    if (mileage.odometer_start is None) or (mileage.odometer_end is None):
        return 0.0
    distance = mileage.odometer_end - mileage.odometer_start
    veh = booking.assigned_vehicle
    if not veh or not veh.fuel_rate or float(veh.fuel_rate) <= 0:
        return 0.0
    return round((distance / float(veh.fuel_rate)) * fuel_price, 2)


def check_payment_escalation(app):
    """วนเช็ค VehicleMileage ที่เป็น personal + ปิดงานแล้ว + ยังไม่ paid"""
    from models import db, User, VehicleBooking, VehicleMileage, SystemConfig, get_bkk_time
    from views.core.notification_service import (
        notify_payment_reminder_user,
        notify_payment_overdue_admin,
    )

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

            cost = _calc_fuel_cost(m, b, fuel_price)
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


def init_scheduler(app):
    """เรียกจาก app.py หลัง register blueprints"""
    scheduler = BackgroundScheduler(timezone='Asia/Bangkok')
    scheduler.add_job(
        func    = lambda: check_payment_escalation(app),
        trigger = CronTrigger(hour=8, minute=0),
        id      = 'payment_escalation',
        name    = 'Check overdue personal payments',
        replace_existing = True,
    )
    scheduler.start()
    app.config['SCHEDULER'] = scheduler
    return scheduler
