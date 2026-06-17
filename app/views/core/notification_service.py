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
from flask import current_app
from models import db, Notification, User, DeptApprover, get_bkk_time


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
            icon=None, expired_days=40, event_key=None, title=None):
    """
    สร้าง Notification record + commit
    หมายเหตุ: caller ต้องอยู่ใน request context และ db.session พร้อมใช้งาน
             ฟังก์ชันนี้ add+flush แต่ไม่ commit — caller ต้อง commit เอง
             (เพื่อให้ atomic กับ transaction หลัก)
    """
    now = get_bkk_time()
    exp = None if (category == 'payment' or expired_days is None) \
              else now + timedelta(days=expired_days)

    # Supersede — event ชนิดเดียวกัน (event_key) ของ booking เดิม → ซ่อนอันเก่า เหลือล่าสุด
    # ข้าม sticky (กันลบ payment ค้างชำระ) + ต้องมี booking_id (repair/room booking_id=None ไม่ supersede)
    if booking_id and event_key and not is_sticky:
        Notification.query.filter(
            Notification.user_id == user_id,
            Notification.booking_id == booking_id,
            Notification.event_key == event_key,
            Notification.superseded_at.is_(None),
        ).update({'superseded_at': now}, synchronize_session=False)

    n = Notification(
        user_id    = user_id,
        booking_id = booking_id,
        title      = title,
        message    = message,
        ntype      = ntype,
        category   = category,
        action_url = action_url,
        is_sticky  = is_sticky,
        icon       = icon or ICON.get(ntype, ICON['info']),
        expired_at = exp,
        event_key  = event_key,
    )
    db.session.add(n)
    db.session.flush()

    # LINE per-user DM mirror — ส่ง in-app notification เดียวกันไป LINE DM
    # graceful skip: ห้ามให้ LINE error ล้ม transaction หลัก (try/except + ไม่ rollback)
    try:
        u = User.query.get(user_id)
        if u and u.line_user_id:
            from views.core.line_service import _push_user
            _push_user(u.line_user_id, message)
    except Exception:
        current_app.logger.warning("LINE per-user mirror error", exc_info=True)

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


# ─────────────────────────────────────────────
# Role-aware multi-recipient (Phase 2d, 2026-06-15)
# ทุก vehicle event แยกข้อความตามบทบาท (User/Admin/Approver/Driver)
# แล้วส่งหลายผู้รับใน 1 event — in-app เท่านั้น (Telegram ไม่แตะ)
# ─────────────────────────────────────────────

def _vehicle_admin_ids():
    rows = User.query.filter(
        (User.role_vehicle == 'admin') | (User.is_superadmin == True)  # noqa: E712
    ).all()
    return {u.id for u in rows}


def _booking_approver_ids(booking):
    """Approver = DeptApprover ของแผนกทริป — set() ถ้าไม่มีแผนก"""
    if not booking.trip_department_id:
        return set()
    rows = DeptApprover.query.filter_by(dept_id=booking.trip_department_id).all()
    return {r.user_id for r in rows}


def _booking_driver_uid(booking):
    """User account ของคนขับ — ไม่มี → logger.warning + None (Phase 2d decision)"""
    drv = booking.driver
    if not drv or not drv.user_id:
        if booking.driver_id:
            current_app.logger.warning(
                'notify: driver #%s ของ booking #%s ไม่มี User account — ข้าม in-app',
                booking.driver_id, booking.id)
        return None
    return drv.user_id


def _emit(role_msgs, *, booking, category, ntype, icon, action_url=None, title=None, **kw):
    """role_msgs = {user_id: message} — สร้าง notification ต่อผู้รับ (ตัด None/ซ้ำ/ว่าง)
       title = บรรทัดแรกบน UI card (เหมือนกันทุก role ของ event เดียวกัน)"""
    url = action_url or _book_url(booking)
    seen = set()
    for uid, msg in role_msgs.items():
        if uid is None or uid in seen or not msg:
            continue
        seen.add(uid)
        _create(user_id=uid, booking_id=booking.id, message=msg, title=title,
                ntype=ntype, category=category, icon=icon, action_url=url, **kw)


def _car_label(booking, *, full=False):
    veh = booking.assigned_vehicle
    if not veh:
        return booking.snap_vehicle_plate or 'รอกำหนดรถ'
    if full:
        return f'{veh.brand} {veh.model} ({veh.license_plate})'
    return veh.license_plate or f'{veh.brand} {veh.model}'


def _driver_label(booking):
    if booking.driver:
        return booking.driver.name
    return booking.snap_driver_name or '-'


def _hm(dt):
    return dt.strftime('%H:%M') if dt else '-'


def _date_th(dt):
    return dt.strftime('%d/%m/%Y') if dt else '-'


def _pay_subtitle(fuel, ot):
    """subtitle ค่าเดินทาง (notif card บรรทัด 2) — เลือก format ตามองค์ประกอบที่มี
       ทั้งคู่ → 'ทั้งหมด X บาท (ค่าน้ำมัน : f + ค่า OT : o)' · อย่างเดียว → format เฉพาะ
       ใช้ร่วม payment_required (ส่วนตัว) + budget_deducted (กอง/กลาง)"""
    f = float(fuel or 0)
    o = float(ot or 0)
    if f > 0 and o > 0:
        return f'ทั้งหมด {f + o:,.0f} บาท (ค่าน้ำมัน : {f:,.0f} + ค่า OT : {o:,.0f})'
    if o > 0:
        return f'ค่าล่วงเวลาสารถีทั้งหมด {o:,.0f} บาท'
    return f'ค่าน้ำมันทั้งหมด {f:,.0f} บาท'


# ═══════════════════════════════════════════════════════════════
# Events #1-15 (ระบบยานพาหนะ)
# ═══════════════════════════════════════════════════════════════

# #1 — จองสำเร็จ (pending) → owner + admin
def notify_booking_created(booking):
    user_name = _display_name(booking.user)
    owner_msg = f'การจองสำเร็จ — คำขอ #{booking.id} ไป{booking.destination} รอ Admin อนุมัติ'
    admin_msg = (f'มีการจองใหม่ #{booking.id} ไป{booking.destination} '
                 f'วันที่ {_date_th(booking.start_datetime)} โดย {user_name}')
    msgs = {booking.user_id: owner_msg}
    for aid in _vehicle_admin_ids():
        msgs.setdefault(aid, admin_msg)
    _emit(msgs, booking=booking, category='status', ntype='info', icon=ICON['booked'],
          event_key='booked')


# #2/#8 — Admin กำหนด/ปรับเปลี่ยนรถ → owner + admin
#   (driver รับข่าวรถผ่านข้อความ "อนุมัติ/ได้รับงาน" — กัน notify ซ้ำ)
def notify_admin_assigned(booking):
    car = _car_label(booking, full=True)
    sub = f'ปรับเปลี่ยนรถเป็น รถ {car}'
    msgs = {booking.user_id: sub}
    for aid in _vehicle_admin_ids():
        msgs.setdefault(aid, sub)
    msgs.setdefault(_booking_driver_uid(booking), sub)
    _emit(msgs, booking=booking, category='status', ntype='info', icon=ICON['assigned'],
          event_key='assigned', title='มีการปรับเปลี่ยนรถ')


# #3 — Admin อนุมัติตรง → approved · owner + admin + driver(จัดสรรงาน)
def notify_admin_approved(booking):
    drv = _driver_label(booking)
    sub = f'{drv} → {booking.destination}'
    msgs = {booking.user_id: sub}
    for aid in _vehicle_admin_ids():
        msgs.setdefault(aid, sub)
    msgs.setdefault(_booking_driver_uid(booking), sub)
    _emit(msgs, booking=booking, category='status', ntype='success', icon=ICON['approved'],
          event_key='approved', title=f'อนุมัติงาน {booking.purpose}')


# #4 — Admin ส่งต่อ Approver → owner + admin + approver(รายละเอียดเต็ม)
def notify_forwarded_to_approver(booking):
    sub = 'อยู่ระหว่างการรอผู้ประสานงานกองอนุมัติ'
    msgs = {booking.user_id: sub}
    for aid in _vehicle_admin_ids():
        msgs.setdefault(aid, sub)
    for pid in _booking_approver_ids(booking):
        msgs.setdefault(pid, sub)
    _emit(msgs, booking=booking, category='status', ntype='info', icon=ICON['forwarded'],
          event_key='forwarded', title='ส่งต่อให้ผู้ประสานงาน')


# #5 — Approver อนุมัติ → approved · owner + admin + approver(self) + driver
def notify_approver_approved(booking, approver):
    sub = 'ผู้ประสานงานกองอนุมัติเรียบร้อย'
    msgs = {booking.user_id: sub}
    for aid in _vehicle_admin_ids():
        msgs.setdefault(aid, sub)
    if approver:
        msgs.setdefault(approver.id, sub)
    for pid in _booking_approver_ids(booking):
        msgs.setdefault(pid, sub)
    msgs.setdefault(_booking_driver_uid(booking), sub)
    _emit(msgs, booking=booking, category='status', ntype='success', icon=ICON['approved'],
          event_key='approved', title='ส่งต่อให้ผู้ประสานงาน')


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
        event_key  = 'rejected',
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
        event_key  = 'merged',
    )


# #8 — คนขับบันทึกไมล์ start → owner + admin + driver
def notify_mileage_started(booking, mileage):
    sub = f'เลขไมล์เริ่มต้น {(mileage.odometer_start or 0):,} km'
    msgs = {booking.user_id: sub}
    for aid in _vehicle_admin_ids():
        msgs.setdefault(aid, sub)
    msgs.setdefault(_booking_driver_uid(booking), sub)
    _emit(msgs, booking=booking, category='mileage', ntype='info', icon=ICON['mileage_start'],
          event_key='mileage_start', title='เริ่มต้นการเดินทาง')


# #9 — คนขับบันทึกไมล์ end → owner + admin + driver
def notify_mileage_ended(booking, mileage):
    sub = f'เลขไมล์สิ้นสุด {(mileage.odometer_end or 0):,} km'
    msgs = {booking.user_id: sub}
    for aid in _vehicle_admin_ids():
        msgs.setdefault(aid, sub)
    msgs.setdefault(_booking_driver_uid(booking), sub)
    _emit(msgs, booking=booking, category='mileage', ntype='success', icon=ICON['mileage_end'],
          event_key='mileage_end', title='สิ้นสุดการเดินทาง')


# #10, #11 — หักงบ central / department → owner + admin + approver
def notify_budget_deducted(booking, fuel_cost, budget_type):
    """budget_type: 'central' | 'department' · fuel_cost: float
       subtitle ตัดบรรทัด OT อัตโนมัติถ้า OT ถูกย้ายไป self-pay (no_receipt) ผ่าน _pay_subtitle/_ot_total"""
    sub = _pay_subtitle(fuel_cost, _ot_total(booking))
    msgs = {booking.user_id: sub}
    for aid in _vehicle_admin_ids():
        msgs.setdefault(aid, sub)
    for pid in _booking_approver_ids(booking):
        msgs.setdefault(pid, sub)
    _emit(msgs, booking=booking, category='budget', ntype='info', icon=ICON['budget'],
          event_key='budget', title='แจ้งหักงบส่วนกลาง')


# #12 — Personal unpaid (ครั้งแรก หลังปิดงาน) → owner(sticky ร่วมบุญ) + admin
def notify_payment_required(booking, mileage, fuel_cost):
    sub = _pay_subtitle(fuel_cost, _ot_total(booking))
    # owner — sticky ร่วมบุญ
    _create(
        user_id    = booking.user_id,
        booking_id = booking.id,
        title      = 'แจ้งร่วมบุญค่าเดินทาง',
        message    = sub,
        ntype      = 'warning',
        category   = 'payment',
        icon       = ICON['payment'],
        is_sticky  = True,
        action_url = f'/vehicle?pay={booking.id}',
        expired_days = None,   # ไม่หมดอายุ
    )
    # admin — escalation (ไม่ sticky)
    for aid in _vehicle_admin_ids():
        if aid == booking.user_id:
            continue
        _create(user_id=aid, booking_id=booking.id, title='แจ้งร่วมบุญค่าเดินทาง',
                message=sub, ntype='warning', category='payment_admin', icon=ICON['payment'],
                action_url='/admin/budget/personal')


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
        event_key  = 'edited',
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
        event_key  = 'cancelled',
    )


# #17 — ระบบ auto-reject booking เลยวันเดินทาง (Phase 2, 2026-06-12)
def notify_auto_rejected(booking):
    """แจ้ง owner เมื่อระบบ auto-reject booking ที่เลยวันเดินทาง"""
    _create(
        user_id    = booking.user_id,
        booking_id = booking.id,
        message    = (
            f'คำขอ #{booking.id} ไป{booking.destination} '
            f'ถูกยกเลิกอัตโนมัติเนื่องจากเลยกำหนดเดินทางแล้ว'
        ),
        ntype      = 'warning',
        category   = 'status',
        icon       = ICON['rejected'],
        action_url = _book_url(booking),
        event_key  = 'rejected',
    )


# ═══════════════════════════════════════════════════════════════
# Events #18-24 — Repair / Maintenance / Room
# ═══════════════════════════════════════════════════════════════

def _repair_admins():
    return User.query.filter(
        (User.role_repair == 'admin') | (User.is_superadmin == True)  # noqa: E712
    ).all()

def _maintenance_admins():
    return User.query.filter(
        (User.role_maintenance == 'admin') | (User.is_superadmin == True)  # noqa: E712
    ).all()

# #18 — แจ้งซ่อม IT: owner ยืนยัน + admin งานใหม่
def notify_repair_created(ticket):
    _create(
        user_id    = ticket.user_id,
        message    = f'แจ้งซ่อม #{ticket.id}: {ticket.subject} เรียบร้อยแล้ว รอ Admin ดำเนินการ',
        ntype      = 'success',
        category   = 'status',
        icon       = ICON['success'],
        action_url = '/repair',
    )
    for admin in _repair_admins():
        if admin.id == ticket.user_id:
            continue
        _create(
            user_id    = admin.id,
            message    = f'มีการแจ้งซ่อมใหม่ #{ticket.id}: {ticket.subject} ({ticket.location})',
            ntype      = 'info',
            category   = 'status',
            icon       = ICON['info'],
            action_url = '/repair',
        )

# #19 — รับงานซ่อม IT: แจ้ง owner
def notify_repair_accepted(ticket):
    _create(
        user_id    = ticket.user_id,
        message    = f'งานซ่อม #{ticket.id}: {ticket.subject} — Admin กำลังเข้าซ่อมแซม',
        ntype      = 'info',
        category   = 'status',
        icon       = ICON['success'],
        action_url = '/repair',
    )

# #20 — ปิดงานซ่อม IT: owner เสร็จ + admin งานถูกปิด
def notify_repair_closed(ticket):
    _create(
        user_id    = ticket.user_id,
        message    = f'งานซ่อม #{ticket.id}: {ticket.subject} เสร็จเรียบร้อยแล้ว',
        ntype      = 'success',
        category   = 'status',
        icon       = ICON['success'],
        action_url = '/repair',
    )
    for admin in _repair_admins():
        if admin.id == ticket.user_id:
            continue
        _create(
            user_id    = admin.id,
            message    = f'งานซ่อม #{ticket.id}: {ticket.subject} ถูกปิดเรียบร้อยแล้ว',
            ntype      = 'success',
            category   = 'status',
            icon       = ICON['success'],
            action_url = '/repair',
        )

# #21 — แจ้งซ่อมอาคาร: owner ยืนยัน + admin งานใหม่
def notify_maintenance_created(ticket):
    _create(
        user_id    = ticket.user_id,
        message    = f'แจ้งซ่อมอาคาร #{ticket.id}: {ticket.subject} เรียบร้อยแล้ว รอ Admin ดำเนินการ',
        ntype      = 'success',
        category   = 'status',
        icon       = ICON['success'],
        action_url = '/maintenance',
    )
    for admin in _maintenance_admins():
        if admin.id == ticket.user_id:
            continue
        _create(
            user_id    = admin.id,
            message    = f'มีการแจ้งซ่อมอาคารใหม่ #{ticket.id}: {ticket.subject} ({ticket.location})',
            ntype      = 'info',
            category   = 'status',
            icon       = ICON['info'],
            action_url = '/maintenance',
        )

# #22 — รับงานซ่อมอาคาร: แจ้ง owner
def notify_maintenance_accepted(ticket):
    _create(
        user_id    = ticket.user_id,
        message    = f'งานซ่อมอาคาร #{ticket.id}: {ticket.subject} — Admin กำลังเข้าซ่อมแซม',
        ntype      = 'info',
        category   = 'status',
        icon       = ICON['success'],
        action_url = '/maintenance',
    )

# #23 — ปิดงานซ่อมอาคาร: owner เสร็จ + admin งานถูกปิด
def notify_maintenance_closed(ticket):
    _create(
        user_id    = ticket.user_id,
        message    = f'งานซ่อมอาคาร #{ticket.id}: {ticket.subject} เสร็จเรียบร้อยแล้ว',
        ntype      = 'success',
        category   = 'status',
        icon       = ICON['success'],
        action_url = '/maintenance',
    )
    for admin in _maintenance_admins():
        if admin.id == ticket.user_id:
            continue
        _create(
            user_id    = admin.id,
            message    = f'งานซ่อมอาคาร #{ticket.id}: {ticket.subject} ถูกปิดเรียบร้อยแล้ว',
            ntype      = 'success',
            category   = 'status',
            icon       = ICON['success'],
            action_url = '/maintenance',
        )

# ═══════════════════════════════════════════════════════════════
# Event #25 — OT auto-generated (ปิดทริป)
# ═══════════════════════════════════════════════════════════════

def notify_ot_created(booking, ot):
    driver_name = booking.snap_driver_name or f'คนขับ #{booking.driver_id}'
    admins = User.query.filter(
        (User.role_vehicle == 'admin') | (User.is_superadmin == True)
    ).all()
    for admin in admins:
        _create(
            user_id    = admin.id,
            booking_id = booking.id,
            message    = (
                f'OT ใหม่ #{ot.ot_number}: {driver_name} '
                f'{ot.total_hours} ชม. ฿{ot.total_amount:,.0f} — ทริป #{booking.id}'
            ),
            ntype      = 'info',
            category   = 'status',
            icon       = ICON['payment'],
            action_url = '/admin/cost',
        )


def notify_admin_personal_trip(booking, trip_cost):
    """แจ้ง vehicle admin เมื่อทริปส่วนตัว (expense_type=personal) หรือ ad-hoc ปิดทริป"""
    trip_label = 'Ad-hoc' if booking.is_ad_hoc else 'ส่วนตัว'
    user_name  = (booking.user.full_name if booking.user else None) or f'#{booking.user_id}'
    dest       = booking.destination or ''
    admins = User.query.filter(
        (User.role_vehicle == 'admin') | (User.is_superadmin == True)
    ).all()
    for admin in admins:
        _create(
            user_id    = admin.id,
            booking_id = booking.id,
            message    = f'ทริป{trip_label}: {user_name} → {dest} ฿{trip_cost:,.0f}',
            ntype      = 'warning',
            category   = 'payment_admin',
            icon       = ICON['warning'],
            action_url = '/admin/budget/personal',
        )


# #24 — จองห้องประชุม: ยืนยันให้ owner
def notify_room_booked(booking):
    msg = (f'ยืนยันการจอง{booking.room_name} วันที่ {_date_th(booking.start_time)} '
           f'ตั้งแต่เวลา {_hm(booking.start_time)} ถึง {_hm(booking.end_time)} น. เรียบร้อยแล้ว')
    _create(
        user_id    = booking.user_id,
        message    = msg,
        ntype      = 'success',
        category   = 'status',
        icon       = ICON['booked'],
        action_url = '/room',
    )


# ─────────────────────────────────────────────
# Payment confirm feedback (admin confirms → notify user)
# ─────────────────────────────────────────────
def notify_payment_confirmed(booking, mileage):
    car   = _car_label(booking, full=True)
    dist  = (mileage.odometer_end or 0) - (mileage.odometer_start or 0)
    total = float(mileage.fuel_cost or 0) + _ot_total(booking)
    sub   = (f'เดินทางด้วยรถ {car} ระยะทาง {dist:,} กม. '
             f'ใช้จ่ายทั้งหมด {total:,.0f} บาท')
    _create(
        user_id    = booking.user_id,
        booking_id = booking.id,
        title      = 'สรุปการเดินทาง',
        message    = sub,
        ntype      = 'success',
        category   = 'payment',
        icon       = ICON['payment_done'],
        action_url = _book_url(booking),
    )
    for aid in _vehicle_admin_ids():
        if aid == booking.user_id:
            continue
        _create(user_id=aid, booking_id=booking.id, title='สรุปการเดินทาง',
                message=sub, ntype='success', category='payment_admin', icon=ICON['payment_done'],
                action_url='/admin/budget/personal')
