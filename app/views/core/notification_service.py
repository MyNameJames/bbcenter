"""
In-App Notification Service
────────────────────────────
ครอบคลุม 15 events ของระบบยานพาหนะ — ทุก notification เรียก `_create()`
ใช้ Font Awesome icons ทั้งหมด (ตาม CLAUDE.md — ห้ามใช้ emoji)

Convention:
    category : status | mileage | budget | payment | payment_admin
    ntype    : success | info | warning | danger
    icon     : fa-solid / fa-regular class
"""
from datetime import timedelta
from models import db, Notification, get_bkk_time


# ─────────────────────────────────────────────
# Icon registry (FA only, no emoji)
# ─────────────────────────────────────────────
ICON = {
    'success':       'fa-solid fa-circle-check',
    'info':          'fa-solid fa-circle-info',
    'warning':       'fa-solid fa-triangle-exclamation',
    'danger':        'fa-solid fa-circle-xmark',
    'booked':        'fa-solid fa-calendar-plus',
    'assigned':      'fa-solid fa-car',
    'forwarded':     'fa-solid fa-paper-plane',
    'approved':      'fa-solid fa-circle-check',
    'rejected':      'fa-solid fa-circle-xmark',
    'merged':        'fa-solid fa-link',
    'mileage_start': 'fa-solid fa-flag',
    'mileage_end':   'fa-solid fa-flag-checkered',
    'budget':        'fa-solid fa-sack-dollar',
    'payment':       'fa-solid fa-credit-card',
    'payment_done':  'fa-solid fa-circle-check',
    'edited':        'fa-solid fa-pen-to-square',
    'deleted':       'fa-solid fa-trash',
    'reminder':      'fa-solid fa-bell',
}


# ─────────────────────────────────────────────
# Central helper
# ─────────────────────────────────────────────
def _create(user_id, message, *, ntype='info', category='status',
            booking_id=None, action_url=None, is_sticky=False,
            icon=None, expired_days=40):
    """
    สร้าง Notification record + commit
    หมายเหตุ: caller ต้องอยู่ใน request context และ db.session พร้อมใช้งาน
             ฟังก์ชันนี้ add+flush แต่ไม่ commit — caller ต้อง commit เอง
             (เพื่อให้ atomic กับ transaction หลัก)
    """
    now = get_bkk_time()
    exp = None if (category == 'payment' or expired_days is None) \
              else now + timedelta(days=expired_days)

    n = Notification(
        user_id    = user_id,
        booking_id = booking_id,
        message    = message,
        ntype      = ntype,
        category   = category,
        action_url = action_url,
        is_sticky  = is_sticky,
        icon       = icon or ICON.get(ntype, ICON['info']),
        expired_at = exp,
    )
    db.session.add(n)
    db.session.flush()
    return n


def _book_url(booking):
    return f"/vehicle/detail/{booking.id}"


def _display_name(u):
    return u.full_name or u.username


def _ot_total(booking):
    """รวมค่า OT สารถีของ booking — ตัด is_deleted + no_receipt (OT ที่ user จ่ายเอง)"""
    return sum(
        float(ot.total_amount or 0)
        for ot in booking.driver_ots
        if not ot.is_deleted and not ot.no_receipt
    )


# ═══════════════════════════════════════════════════════════════
# Events #1-15 (ระบบยานพาหนะ)
# ═══════════════════════════════════════════════════════════════

# #1 — จองสำเร็จ (pending)
def notify_booking_created(booking):
    _create(
        user_id    = booking.user_id,
        booking_id = booking.id,
        message    = f'คำขอ #{booking.id} ไป{booking.destination} ถูกสร้างแล้ว รอ Admin พิจารณา',
        ntype      = 'info',
        category   = 'status',
        icon       = ICON['booked'],
        action_url = _book_url(booking),
    )


# #2 — Admin assign รถ/คนขับ (ก่อน approve หรือแก้หลัง approve)
def notify_admin_assigned(booking):
    veh = booking.assigned_vehicle
    car = f"{veh.brand} {veh.model} ({veh.license_plate})" if veh else "รอกำหนดรถ"
    drv = booking.driver.name if booking.driver else None
    detail = f"รถ {car}" + (f", คนขับ {drv}" if drv else "")
    _create(
        user_id    = booking.user_id,
        booking_id = booking.id,
        message    = f'Admin กำหนดรถให้คำขอ #{booking.id} แล้ว — {detail}',
        ntype      = 'info',
        category   = 'status',
        icon       = ICON['assigned'],
        action_url = _book_url(booking),
    )


# #3 — Admin อนุมัติตรง → approved
def notify_admin_approved(booking):
    veh = booking.assigned_vehicle
    car = f"{veh.brand} {veh.model}" if veh else "รอกำหนดรถ"
    _create(
        user_id    = booking.user_id,
        booking_id = booking.id,
        message    = f'คำขอ #{booking.id} ไป{booking.destination} ได้รับการอนุมัติแล้ว (รถ: {car})',
        ntype      = 'success',
        category   = 'status',
        icon       = ICON['approved'],
        action_url = _book_url(booking),
    )


# #4 — Admin ส่งต่อ Approver
def notify_forwarded_to_approver(booking):
    _create(
        user_id    = booking.user_id,
        booking_id = booking.id,
        message    = f'คำขอ #{booking.id} ไป{booking.destination} รอการอนุมัติจากหัวหน้าแผนก',
        ntype      = 'info',
        category   = 'status',
        icon       = ICON['forwarded'],
        action_url = _book_url(booking),
    )


# #5 — Approver อนุมัติ → approved
def notify_approver_approved(booking, approver):
    veh = booking.assigned_vehicle
    car = f"{veh.brand} {veh.model}" if veh else "รอกำหนดรถ"
    _create(
        user_id    = booking.user_id,
        booking_id = booking.id,
        message    = f'คำขอ #{booking.id} ไป{booking.destination} ได้รับการอนุมัติจากหัวหน้าแผนก (รถ: {car})',
        ntype      = 'success',
        category   = 'status',
        icon       = ICON['approved'],
        action_url = _book_url(booking),
    )


# #6 — Admin/Approver ปฏิเสธ
def notify_rejected(booking, rejected_by, *, by_approver=False):
    role = 'หัวหน้าแผนก' if by_approver else 'Admin'
    _create(
        user_id    = booking.user_id,
        booking_id = booking.id,
        message    = f'คำขอ #{booking.id} ไป{booking.destination} ถูกปฏิเสธโดย{role}' + (f' — เหตุผล: {booking.reject_reason}' if booking.reject_reason else ''),
        ntype      = 'danger',
        category   = 'status',
        icon       = ICON['rejected'],
        action_url = _book_url(booking),
    )


# #7 — ถูกรวมเข้ากลุ่มทริป (merge)
def notify_merged_into_group(booking, group_label):
    _create(
        user_id    = booking.user_id,
        booking_id = booking.id,
        message    = f'คำขอ #{booking.id} ถูกรวมเข้ากลุ่มทริป "{group_label}"',
        ntype      = 'info',
        category   = 'status',
        icon       = ICON['merged'],
        action_url = _book_url(booking),
    )


# #8 — คนขับบันทึกไมล์ start
def notify_mileage_started(booking, mileage):
    _create(
        user_id    = booking.user_id,
        booking_id = booking.id,
        message    = f'ทริป #{booking.id} ออกเดินทางแล้ว — เลขไมล์เริ่มต้น {mileage.odometer_start} km',
        ntype      = 'info',
        category   = 'mileage',
        icon       = ICON['mileage_start'],
        action_url = _book_url(booking),
    )


# #9 — คนขับบันทึกไมล์ end
def notify_mileage_ended(booking, mileage):
    distance = (mileage.odometer_end or 0) - (mileage.odometer_start or 0)
    _create(
        user_id    = booking.user_id,
        booking_id = booking.id,
        message    = f'ทริป #{booking.id} เสร็จสิ้น — ระยะทาง {distance} km',
        ntype      = 'success',
        category   = 'mileage',
        icon       = ICON['mileage_end'],
        action_url = _book_url(booking),
    )


# #10, #11 — หักงบ central / department
def notify_budget_deducted(booking, fuel_cost, budget_type):
    """
    budget_type: 'central' | 'department'
    fuel_cost  : จำนวนเงิน (float)
    """
    label = 'งบส่วนกลาง' if budget_type == 'central' else f'งบแผนก {booking.trip_department or "-"}'
    amount = f'{fuel_cost:,.0f}'
    _create(
        user_id    = booking.user_id,
        booking_id = booking.id,
        message    = f'ทริป #{booking.id} หักจาก{label} {amount}฿',
        ntype      = 'info',
        category   = 'budget',
        icon       = ICON['budget'],
        action_url = _book_url(booking),
    )


# #12 — Personal unpaid (ครั้งแรก หลังปิดงาน)
def notify_payment_required(booking, mileage, fuel_cost):
    ot = _ot_total(booking)
    total = f'{fuel_cost + ot:,.0f}'
    fuel  = f'{fuel_cost:,.0f}'
    ot_s  = f'{ot:,.0f}'
    _create(
        user_id    = booking.user_id,
        booking_id = booking.id,
        message    = f'ทริป #{booking.id} ค่าเดินทาง {total}฿ (ค่าน้ำมัน {fuel}฿ + ค่าล่วงเวลาสารถี {ot_s}฿) กรุณาชำระและกดยืนยัน',
        ntype      = 'warning',
        category   = 'payment',
        icon       = ICON['payment'],
        is_sticky  = True,
        action_url = f'/vehicle?pay={booking.id}',
        expired_days = None,   # ไม่หมดอายุ
    )


# #13a — Reminder ให้ user (day 3+)
def notify_payment_reminder_user(booking, mileage, fuel_cost, days_overdue):
    ot = _ot_total(booking)
    total = f'{fuel_cost + ot:,.0f}'
    fuel  = f'{fuel_cost:,.0f}'
    ot_s  = f'{ot:,.0f}'
    _create(
        user_id    = booking.user_id,
        booking_id = booking.id,
        message    = f'เตือน: ทริป #{booking.id} ยังค้างชำระค่าเดินทาง {total}฿ (ค่าน้ำมัน {fuel}฿ + ค่าล่วงเวลาสารถี {ot_s}฿) เกินกำหนด {days_overdue} วัน',
        ntype      = 'warning',
        category   = 'payment',
        icon       = ICON['reminder'],
        is_sticky  = True,
        action_url = f'/vehicle?pay={booking.id}',
        expired_days = None,
    )


# #13b — Escalation ให้ admin (day 7+)
def notify_payment_overdue_admin(admin_user_id, booking, mileage, fuel_cost, days_overdue):
    user_name = _display_name(booking.user)
    ot = _ot_total(booking)
    total = f'{fuel_cost + ot:,.0f}'
    fuel  = f'{fuel_cost:,.0f}'
    ot_s  = f'{ot:,.0f}'
    _create(
        user_id    = admin_user_id,
        booking_id = booking.id,
        message    = f'{user_name} ค้างชำระค่าเดินทาง #{booking.id} จำนวน {total}฿ (ค่าน้ำมัน {fuel}฿ + ค่าล่วงเวลาสารถี {ot_s}฿) เกิน {days_overdue} วัน',
        ntype      = 'danger',
        category   = 'payment_admin',
        icon       = ICON['reminder'],
        is_sticky  = True,
        action_url = '/admin/budget/personal?status=pending',
        expired_days = None,
    )


# #14 — Admin แก้ไข booking ของ user
def notify_admin_edited(booking, edited_by):
    _create(
        user_id    = booking.user_id,
        booking_id = booking.id,
        message    = f'คำขอ #{booking.id} ถูกแก้ไขโดย {_display_name(edited_by)}',
        ntype      = 'warning',
        category   = 'status',
        icon       = ICON['edited'],
        action_url = _book_url(booking),
    )


# #15 — Admin ลบ booking ของ user
def notify_admin_deleted(booking_id, user_id, destination, deleted_by):
    """หมายเหตุ: booking ถูกลบแล้ว → ไม่มี booking object, รับ primitive"""
    _create(
        user_id    = user_id,
        booking_id = None,   # booking ถูกลบแล้ว
        message    = f'คำขอ #{booking_id} ไป{destination} ถูกลบโดย {_display_name(deleted_by)}',
        ntype      = 'danger',
        category   = 'status',
        icon       = ICON['deleted'],
        action_url = '/vehicle',
    )


# #16 — Booking cancelled (Phase 9, 2026-05-22) — user or admin cancels approved booking
def notify_user_cancelled(*, user_id, booking, cancelled_by, role_label):
    """Multi-recipient cancel notify. role_label = 'admin' | 'approver' | 'driver' | 'mate' | 'owner'
       เรียก 1 ครั้ง/recipient — caller loop user_ids แล้วเรียกซ้ำ.
       'owner' ใช้เมื่อ admin ยกเลิกของ user (แจ้งเจ้าของ).
    """
    canceller = _display_name(cancelled_by)
    if role_label == 'mate':
        msg = f'ทริป #{booking.id} ที่คุณร่วมไป{booking.destination} ถูกยกเลิกโดย {canceller}'
    elif role_label == 'driver':
        msg = f'คำขอ #{booking.id} ไป{booking.destination} ถูกยกเลิก (คุณเป็นคนขับที่ถูก assign) — โดย {canceller}'
    elif role_label == 'approver':
        dept = booking.trip_department or '-'
        msg = f'คำขอ #{booking.id} ไป{booking.destination} (แผนก {dept}) ถูกยกเลิกโดย {canceller}'
    elif role_label == 'owner':
        msg = f'คำขอ #{booking.id} ไป{booking.destination} ของคุณถูกยกเลิกโดย Admin ({canceller})'
    else:  # admin
        msg = f'คำขอ #{booking.id} ไป{booking.destination} ถูกยกเลิกโดย {canceller}'

    _create(
        user_id    = user_id,
        booking_id = booking.id,
        message    = msg,
        ntype      = 'warning',
        category   = 'status',
        icon       = ICON['deleted'],  # trash icon (reuse, semantic match)
        action_url = _book_url(booking),
    )


# ─────────────────────────────────────────────
# Payment confirm feedback (admin confirms → notify user)
# ─────────────────────────────────────────────
def notify_payment_confirmed(booking, mileage):
    _create(
        user_id    = booking.user_id,
        booking_id = booking.id,
        message    = f'การชำระเงินทริป #{booking.id} ได้รับการยืนยันแล้ว ขอบคุณครับ',
        ntype      = 'success',
        category   = 'payment',
        icon       = ICON['payment_done'],
        action_url = _book_url(booking),
    )
