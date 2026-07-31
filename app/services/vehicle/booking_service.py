"""
booking_service.py — approve/reject/cancel/revert/assign booking (Phase 2, 2026-07-19)

ทุก status transition ผ่าน domain.vehicle.workflow.apply_transition ทางเดียว — รวม 2-path
เดิม (approve_booking + admin_assign) ให้ guard เดียวกัน ตามที่ตกลงกับเจ้าของโปรเจกต์:

- budget: domain.vehicle.workflow.guard_budget() ทุกจุด — เดิม approve_booking() (admin-path)
  เรียก _lookup_budget_for_booking() ตรงๆ แล้วเช็ค `if budget is None: block` โดยไม่กรอง
  expense_type ก่อน ทำให้ personal-expense booking ถูก block เสมอ (bug — ขัด product spec)
  guard_budget() เช็ค expense_type ก่อนแล้ว จึงแก้ปัญหานี้ไปด้วยเมื่อรวม path
- conflict: vehicle/driver ตรวจทุก approve path (เดิม admin_assign ตรวจ, approve_booking ไม่ตรวจ
  เลย — ตกลงให้รวมเข้าไปด้วยเพื่อกันรถ/คนขับชนกัน)
- Telegram: service ไม่ auto-send เลย (เดิม approve_booking ส่ง auto, admin_assign ส่งผ่านปุ่ม
  แจ้งเตือนแยกเท่านั้น — ยึด pattern admin_assign ซึ่งเป็น decision หลัง 2026-06-07)

Route ยังรับผิดชอบ: permission/authorization check, parse request, เรียก service,
flash/redirect

check_vehicle_conflict/check_driver_conflict/check_vehicle_active ย้ายมาจาก
views/vehicle/vehicle_common.py ด้วย — caller จริงมีแค่ vehicle_admin.py
(admin_assign ในไฟล์นี้ + admin_swap_vehicle/admin_merge/api_check_merge ที่ยังไม่ย้าย
เพราะนอก scope Phase 2 — import กลับจาก service นี้แทน)

หมายเหตุ behavior ที่ตั้งใจคงไว้ (ไม่ใช่ bug, สังเกตจากโค้ดเดิม): admin actions ส่วนใหญ่
(approve/reject จาก pending, assign) ไม่ set booking.updated_by แต่ approver actions และ
revert set เสมอ — คงรูปแบบเดิมไว้ทุกจุด ไม่ทำให้เป็นมาตรฐานเดียวกัน (เกินขอบเขต Phase 2)

── Phase 4 (2026-07-19) — side effect (notify) ย้ายเข้ามาจาก controller ──
ทุกฟังก์ชันข้างล่างนี้เรียก notify ที่ท้ายฟังก์ชันเอง (flush ก่อน แล้วค่อย notify — ตกลงกับ
เจ้าของโปรเจกต์ให้คงลำดับเดิม "notify ก่อน commit" ไม่ใช่ "หลัง commit" ตามที่ ADR 0001 เขียน
ไว้เดิม เพราะโค้ดจริงทุกจุดรวมถึง mileage_service.py ที่ Reviewer อนุมัติแล้วก็ทำแบบนี้ — commit
ยังเป็นหน้าที่ controller เหมือนเดิม ไม่ย้ายเข้า service)

- approve_from_pending(): รวม 2 caller (approve_booking + admin_assign) แต่ Event #2
  (notify_admin_assigned) เดิมมีแค่ admin_assign ที่ส่ง (เงื่อนไข not is_join_trip and
  had_resources) — approve_booking ไม่เคยส่งเลย → เพิ่ม param notify_assigned (default False
  ตรงกับ approve_booking) ให้ admin_assign ส่งเงื่อนไขเดิมเข้ามา ไม่เปลี่ยน behavior ทั้งคู่
- reject_from_pending(): notify_rejected(booking, rejected_by, by_approver=False) —
  ตรวจ body ของ notify_rejected แล้วพบว่า param `rejected_by` ไม่ถูกใช้เลยในข้อความ (role มา
  จาก by_approver อย่างเดียว) — ส่ง None ตรงๆ ไม่ query User เพิ่ม (ของเดิมส่ง current_user
  แต่ผลลัพธ์ข้อความเหมือนกันทุกตัวอักษร)
- cancel(): param notify=True (default) รักษา behavior ของ vehicle_booking.py::cancel_booking()
  (แจ้งครบ owner/admin/approver/driver/trip-mate + Telegram) — vehicle_budget.py's
  _handle_cancel_booking() ส่ง notify=False เพราะเดิมไม่เคยแจ้งเตือนใครเลย (ไม่มี notify import
  ในไฟล์นั้นด้วยซ้ำ) การรวม cancel() เข้าด้วยกันใน Phase 3.5 (REQ-2/DEBT-3) ไม่ได้ตั้งใจให้
  budget_manage ได้ notify ใหม่มาด้วย — คง gap เดิมไว้ผ่าน flag แทนที่จะ silent-add
"""
from models import db, Vehicle, VehicleBooking, VehicleDepartment, User, DeptApprover, get_bkk_time
from sqlalchemy import or_
from domain.vehicle.workflow import guard_budget, apply_transition
from views.core.broadcast import notify_cancelled as tg_notify_cancelled
from views.core.notification_service import (
    notify_admin_assigned        as _n_admin_assigned,
    notify_admin_approved        as _n_admin_approved,
    notify_forwarded_to_approver as _n_forwarded,
    notify_approver_approved     as _n_approver_approved,
    notify_rejected              as _n_rejected,
    notify_user_cancelled        as _n_user_cancelled,
    notify_merged_into_group     as _n_merged,
)


# ──────────────────────────────────────────────────────────────
# Conflict checks (ย้ายจาก vehicle_common.py — caller เดิมมีแค่ vehicle_admin.py)
# ──────────────────────────────────────────────────────────────
def check_vehicle_conflict(vehicle_id, start_dt, end_dt, exclude_booking_ids=None):
    """คืน VehicleBooking ที่ใช้รถคันนี้ทับช่วง [start,end) หรือ None ถ้าว่าง.
    exclude = booking ids ที่ไม่นับ (ตัวเอง + เพื่อนร่วมทริป)."""
    if not vehicle_id:
        return None
    q = VehicleBooking.query.filter(
        VehicleBooking.assigned_vehicle_id == int(vehicle_id),
        VehicleBooking.status.in_(['approved', 'waiting_approver']),
        VehicleBooking.start_datetime < end_dt,
        VehicleBooking.end_datetime   > start_dt,
    )
    if exclude_booking_ids:
        q = q.filter(VehicleBooking.id.notin_([int(x) for x in exclude_booking_ids]))
    return q.first()


def check_driver_conflict(driver_id, start_dt, end_dt, exclude_booking_ids=None):
    """เหมือน check_vehicle_conflict แต่เช็คคนขับ"""
    if not driver_id:
        return None
    q = VehicleBooking.query.filter(
        VehicleBooking.driver_id == int(driver_id),
        VehicleBooking.status.in_(['approved', 'waiting_approver']),
        VehicleBooking.start_datetime < end_dt,
        VehicleBooking.end_datetime   > start_dt,
    )
    if exclude_booking_ids:
        q = q.filter(VehicleBooking.id.notin_([int(x) for x in exclude_booking_ids]))
    return q.first()


def check_vehicle_active(vehicle_id):
    """คืน True ถ้ารถพร้อมใช้งาน (status='active'). ใช้กด block ก่อน assign/merge/swap."""
    if not vehicle_id:
        return True
    v = Vehicle.query.get(int(vehicle_id))
    return v is not None and v.status == 'active'


# ──────────────────────────────────────────────────────────────
# Approve / Reject จาก pending (admin) — ไม่ set updated_by (ตาม behavior เดิม)
# ──────────────────────────────────────────────────────────────
def approve_from_pending(booking, *, driver_id=None, skip_conflict_check=False,
                          notify_assigned=False):
    """Guard (budget+conflict) แล้ว transition pending → waiting_approver(department)/approved
    (central,personal) — ใช้ร่วมทั้ง approve_booking()[admin-path] และ admin_assign()
    [assign_action='approve']

    skip_conflict_check=True สำหรับ join-trip (admin_assign): รถ/คนขับสืบทอดจากทริปหลักที่
    ตรวจสอบแล้วตอน assign ทริปหลัก — ตรงกับที่ admin_assign เดิมข้าม check ในเคสนี้

    notify_assigned=True → ส่ง notify_admin_assigned (Event #2) ก่อน forwarded/approved —
    เฉพาะ admin_assign() ที่ assign resource ตรง (ไม่ใช่ join-trip + มีรถ/คนขับจริง) เท่านั้นที่
    ส่ง event นี้ (Phase 4, 2026-07-19 — ของเดิม approve_booking() ไม่เคยส่ง Event #2 เลย
    default False จึงตรงกับ behavior เดิมของมันพอดี)

    คืน (ok: bool, msg: str|None)
    """
    if driver_id:
        booking.driver_id = driver_id

    if not skip_conflict_check:
        if not check_vehicle_active(booking.assigned_vehicle_id):
            return False, 'รถคันนี้ไม่พร้อมใช้งาน (maintenance/inactive)'
        exclude = [booking.id]
        vconf = check_vehicle_conflict(booking.assigned_vehicle_id,
                                       booking.start_datetime, booking.end_datetime, exclude)
        if vconf:
            return False, f'รถคันนี้ถูกใช้ทับช่วงเวลานี้แล้ว (#{vconf.id})'
        dconf = check_driver_conflict(booking.driver_id,
                                      booking.start_datetime, booking.end_datetime, exclude)
        if dconf:
            return False, f'คนขับมีทริปอื่นทับช่วงเวลานี้ (#{dconf.id})'

    ok, err = guard_budget(booking)
    if not ok:
        return False, err

    if booking.expense_type == 'department':
        if booking.trip_department_id is None:
            dept_name = booking.trip_department or (booking.user.department if booking.user else None)
            if dept_name:
                dept = VehicleDepartment.query.filter_by(name=dept_name).first()
                if dept:
                    booking.trip_department_id = dept.id
        ok, msg = apply_transition(booking, 'waiting_approver')
    else:
        ok, msg = apply_transition(booking, 'approved')
    if not ok:
        return ok, msg

    db.session.flush()
    if notify_assigned:
        _n_admin_assigned(booking)                          # In-app Event #2
    if booking.status == 'waiting_approver':
        _n_forwarded(booking)                                # In-app Event #4
    else:
        _n_admin_approved(booking)                           # In-app Event #3
    return ok, msg


def reject_from_pending(booking, *, reason):
    """Admin reject booking pending → rejected — ไม่ guard อะไร (reject ทำได้เสมอจาก pending)"""
    ok, msg = apply_transition(booking, 'rejected')
    if not ok:
        return ok, msg
    booking.reject_reason = reason
    db.session.flush()
    # rejected_by ไม่ถูกใช้ใน notify_rejected() body เลย (role มาจาก by_approver อย่างเดียว) —
    # ส่ง None ตรงๆ แทนที่จะ query User เพิ่ม ผลลัพธ์ข้อความเหมือนของเดิม (ที่ส่ง current_user)
    # ทุกตัวอักษร — อย่า "แก้" ให้ query User โดยไม่เช็ค notify_rejected() ก่อน
    _n_rejected(booking, None, by_approver=False)            # In-app Event #6
    return ok, msg


# ──────────────────────────────────────────────────────────────
# Approver actions จาก waiting_approver — set updated_by เสมอ (ตาม behavior เดิม)
# ──────────────────────────────────────────────────────────────
def approver_approve(booking, *, actor_id):
    """Approver อนุมัติงบกอง waiting_approver → approved (เฉพาะแผนกตัวเอง — permission เช็คที่ route)"""
    ok, err = guard_budget(booking)
    if not ok:
        return False, err
    ok, msg = apply_transition(booking, 'approved', actor_id)
    if not ok:
        return ok, msg
    db.session.flush()
    _n_approver_approved(booking, User.query.get(actor_id))  # In-app Event #5
    return ok, msg


def approver_reject(booking, *, actor_id, reason):
    """Approver ปฏิเสธ waiting_approver → rejected"""
    ok, msg = apply_transition(booking, 'rejected', actor_id)
    if not ok:
        return ok, msg
    booking.reject_reason = reason
    db.session.flush()
    # rejected_by ไม่ถูกใช้ใน notify_rejected() body (ดู comment เดียวกันใน reject_from_pending)
    _n_rejected(booking, None, by_approver=True)              # In-app Event #6
    return ok, msg


# ──────────────────────────────────────────────────────────────
# Assign resources — ไม่แตะ status (admin_assign เรียกก่อน approve/reject)
# ──────────────────────────────────────────────────────────────
def assign_resources(booking, *, vehicle_id=None, driver_id=None, trip_group=None,
                      expense_type=None, central_category=None, trip_department=None,
                      is_join_trip=False):
    """ตั้งรถ/คนขับ/หมวดงบ ให้ booking — ไม่แตะ status
    is_join_trip=True → สืบทอดรถ/คนขับจากทริปหลัก (ข้าม set + validate คนขับ)
    คืน (ok: bool, msg: str|None)
    """
    if not is_join_trip:
        if booking.need_driver and not driver_id and not booking.driver_id:
            return False, f'รายการ #{booking.id} ขอคนขับ กรุณาเลือกคนขับด้วย'
        if vehicle_id:
            booking.assigned_vehicle_id = int(vehicle_id)
        if driver_id:
            booking.driver_id = int(driver_id)

    booking.trip_group = trip_group
    booking.expense_type = expense_type
    booking.central_category = central_category
    booking.trip_department = trip_department or (booking.user.department if booking.user else None)
    if booking.trip_department:
        dept_obj = VehicleDepartment.query.filter_by(name=booking.trip_department).first()
        if dept_obj:
            booking.trip_department_id = dept_obj.id
    return True, None


def ungroup(booking):
    """เอา booking + สมาชิกที่เหลือทั้งกลุ่ม ออกจาก trip_group — reset กลับ pending ทั้งหมด
    (all-or-nothing ตาม REQ-1, Phase 3.5, 2026-07-19 — เดิมเคลียร์แค่ booking ตัวเดียวที่รับ
    เข้ามา และไม่ครบ field ด้วย: ไม่เคย reset status/driver_id เลย ทั้งที่ frontend
    (vehicle_admin.js patchBooking) คาดหวังว่า server ทำครบทั้ง 4 field)
    Guard: ถ้ามีสมาชิกใดในกลุ่มมี mileage start entry (odometer_start ไม่ None — รถออกแล้ว)
    → block ทั้งกลุ่ม (เหมือน cancel())
    คืน (ok: bool, msg: str|None)
    """
    group_bookings = [booking]
    if booking.trip_group:
        group_bookings = VehicleBooking.query.filter(
            VehicleBooking.trip_group == booking.trip_group).all()

    if any(m.odometer_start is not None for gb in group_bookings for m in gb.mileage):
        return False, ('ทริปนี้ (หรือเพื่อนร่วมทริป) มีการบันทึกไมล์เริ่มแล้ว รถออกแล้ว — '
                       'ไม่สามารถถอดออกจากกลุ่มได้')

    for gb in group_bookings:
        gb.status = 'pending'
        gb.assigned_vehicle_id = None
        gb.driver_id = None
        gb.trip_group = None

    return True, None


# ──────────────────────────────────────────────────────────────
# Merge เข้ากลุ่มที่มีอยู่แล้ว — งานเดิมเป็นหลักเสมอ ไม่ถูกแตะ (2026-07-31)
# ──────────────────────────────────────────────────────────────
def merge_into_group(trip_group, new_booking_ids, *, vehicle_id, driver_id=None,
                      expense_type=None, central_category=None, trip_department=None):
    """เพิ่ม booking(s) ใหม่ (new_booking_ids) เข้ากลุ่มทริปที่มีสมาชิกอยู่แล้ว (trip_group)
    งานเดิมในกลุ่มเป็นหลักเสมอ — ไม่ถูกแตะ (คง status/vehicle/driver/expense_type เดิมไว้ทั้งหมด)
    งานใหม่รับ vehicle/driver/expense_type ตามที่ส่งมา แล้ว transition
    pending → waiting_approver(department)/approved(central,personal) เหมือน merge ทั่วไป —
    ต่างจาก admin_merge() เดิม (ทาง "รวมทริปใหม่" — ยังไม่แตะ, BUG-3 เดิมยังอยู่) ตรงที่ path นี้
    เดินผ่าน guard_budget()/apply_transition() จริงตาม ADR 0001

    guard: ต้องมีสมาชิกอยู่ก่อนแล้ว (ไม่งั้นใช้ทาง "รวมทริปใหม่" แทน) · ห้ามถ้าสมาชิกเดิมคนใด
    ออกรถแล้ว (odometer_start ไม่ None — กันรถ/คนขับของทริปที่เริ่มแล้วถูกแก้ กรณีนี้ไม่เคยเกิดกับ
    admin_merge() เดิมเพราะทางนั้นรวมได้แค่ booking pending ล้วนซึ่งไม่มีไมล์อยู่แล้ว) · vehicle
    active/conflict + driver conflict ครอบทั้งกลุ่ม (เดิม+ใหม่) เหมือน merge เดิม

    คืน (ok: bool, msg: str|None)
    """
    existing = VehicleBooking.query.filter(VehicleBooking.trip_group == trip_group).all()
    if not existing:
        return False, f'ไม่พบกลุ่มทริป {trip_group}'
    existing_ids = {b.id for b in existing}
    if any(m.odometer_start is not None for gb in existing for m in gb.mileage):
        return False, 'ทริปนี้มีการบันทึกไมล์เริ่มแล้ว รถออกแล้ว — เพิ่มงานเข้ากลุ่มไม่ได้'

    new_bookings = [b for b in (VehicleBooking.query.get(int(bid)) for bid in new_booking_ids)
                     if b and b.id not in existing_ids]
    if not new_bookings:
        return False, 'ไม่พบรายการที่จะเพิ่ม'

    if not check_vehicle_active(vehicle_id):
        return False, 'รถคันนี้ไม่พร้อมใช้งาน (maintenance/inactive)'

    all_ids = list(existing_ids) + [b.id for b in new_bookings]
    starts  = [b.start_datetime for b in existing + new_bookings]
    ends    = [b.end_datetime   for b in existing + new_bookings]
    vconf = check_vehicle_conflict(vehicle_id, min(starts), max(ends), all_ids)
    if vconf:
        return False, f'รถถูกใช้ทับช่วงนี้แล้ว (#{vconf.id})'
    if driver_id:
        dconf = check_driver_conflict(driver_id, min(starts), max(ends), all_ids)
        if dconf:
            return False, f'คนขับมีทริปทับช่วงนี้ (#{dconf.id})'

    for b in new_bookings:
        b.assigned_vehicle_id = int(vehicle_id)
        if driver_id:
            b.driver_id = int(driver_id)
        b.trip_group      = trip_group
        b.expense_type     = expense_type
        b.central_category = central_category
        b.trip_department  = trip_department or (b.user.department if b.user else None)
        if b.trip_department:
            dept_obj = VehicleDepartment.query.filter_by(name=b.trip_department).first()
            if dept_obj:
                b.trip_department_id = dept_obj.id
        ok, err = guard_budget(b)
        if not ok:
            return False, err

    to_status = 'waiting_approver' if expense_type == 'department' else 'approved'
    for b in new_bookings:
        ok, msg = apply_transition(b, to_status)
        if not ok:
            return False, msg

    db.session.flush()
    for b in new_bookings:
        _n_merged(b, trip_group)
        _n_forwarded(b) if to_status == 'waiting_approver' else _n_admin_approved(b)
    return True, None


# ──────────────────────────────────────────────────────────────
# Cancel — set updated_by เสมอ (ตาม behavior เดิม)
# ──────────────────────────────────────────────────────────────
def _build_cancel_recipients(booking, is_admin, is_owner, prev_status, trip_mate_user_ids,
                              actor_id):
    """คำนวณผู้รับแจ้งเตือน cancel — ย้ายมาจาก vehicle_booking.py (Phase 4, 2026-07-19)
    เปลี่ยนแค่ current_user → actor_id (service ห้ามแตะ flask_login ตรง) ตรรกะเดิม 100%"""
    already_notified = {actor_id}

    owner_notify_id = booking.user_id if (is_admin and not is_owner) else None
    if owner_notify_id and owner_notify_id not in already_notified:
        already_notified.add(owner_notify_id)
    else:
        owner_notify_id = None

    admin_user_ids = {u.id for u in User.query.filter(
        or_(User.role_vehicle == 'admin', User.is_superadmin.is_(True))
    ).all()} - already_notified
    already_notified |= admin_user_ids

    approver_user_ids = set()
    if booking.trip_department_id and prev_status in ('waiting_approver', 'approved'):
        apv_rows = DeptApprover.query.filter_by(dept_id=booking.trip_department_id).all()
        approver_user_ids = {r.user_id for r in apv_rows} - already_notified
        already_notified |= approver_user_ids

    driver_user_id = None
    if booking.driver_id and booking.driver and booking.driver.user_id:
        cand = booking.driver.user_id
        if cand not in already_notified:
            driver_user_id = cand
            already_notified.add(cand)

    trip_mate_ids = set(trip_mate_user_ids) - already_notified

    return owner_notify_id, admin_user_ids, approver_user_ids, driver_user_id, trip_mate_ids


def _send_cancel_notifications(booking, owner_notify_id, admin_user_ids,
                                approver_user_ids, driver_user_id, trip_mate_user_ids, actor):
    """ย้ายมาจาก vehicle_booking.py (Phase 4, 2026-07-19) — เปลี่ยนแค่ current_user → actor
    (resolve จาก actor_id ครั้งเดียวใน cancel()) รวม tg_notify_cancelled (Telegram) เข้ามาด้วย
    (เดิมอยู่แยกที่ route หลัง _send_cancel_notifications) ตรรกะ/ข้อความเดิม 100%"""
    if owner_notify_id:
        _n_user_cancelled(user_id=owner_notify_id, booking=booking,
                          cancelled_by=actor, role_label='owner')
    for uid in admin_user_ids:
        _n_user_cancelled(user_id=uid, booking=booking,
                          cancelled_by=actor, role_label='admin')
    for uid in approver_user_ids:
        _n_user_cancelled(user_id=uid, booking=booking,
                          cancelled_by=actor, role_label='approver')
    if driver_user_id:
        _n_user_cancelled(user_id=driver_user_id, booking=booking,
                          cancelled_by=actor, role_label='driver')
    for uid in trip_mate_user_ids:
        _n_user_cancelled(user_id=uid, booking=booking,
                          cancelled_by=actor, role_label='mate')
    tg_notify_cancelled(booking, actor)


def cancel(booking, *, actor_id, is_owner, is_admin, notify=True):
    """ยกเลิก booking — guards ครบ (permission เช็คที่ route ก่อนเรียก) + un-merge trip mates
    คืน (ok: bool, msg: str|None, info: dict|None)
    info = {'prev_status', 'trip_mate_user_ids'} — เก็บไว้ให้ caller ตรวจสอบ/ทดสอบ cascade ได้
    แม้ notify=False (ไม่ได้ใช้ build recipients เองแล้วตั้งแต่ Phase 4 — ย้ายเข้ามาในนี้แทน)

    Guard mileage start entry (REQ-1, Phase 3.5, 2026-07-19): เช็กทุกคนในทริปเดียวกัน (ไม่ใช่
    แค่ตัวเอง) ว่ามี odometer_start บันทึกแล้วหรือยัง — มีแม้แต่คนเดียว = block ทั้งทริป
    (เดิมเช็กแค่ budget_deducted_at ของตัวเอง — เข้มขึ้นเพราะ "รถออกแล้ว" ควรยกเลิกไม่ได้
    แม้ยังไม่ทันหักงบ — ปิดรู trip all-or-nothing)

    notify=True (default, Phase 4, 2026-07-19) → แจ้งเตือนครบ owner/admin/approver/driver/
    trip-mate (in-app) + Telegram หลัง cascade เสร็จ — ตรงกับ behavior เดิมของ
    vehicle_booking.py::cancel_booking() ทุกจุด. vehicle_budget.py's _handle_cancel_booking()
    (budget_manage action cancel_booking) ส่ง notify=False เพราะเดิมไม่เคยแจ้งเตือนใครเลย —
    การรวม cancel() เข้าด้วยกันใน Phase 3.5 (REQ-2/DEBT-3) ตั้งใจรวมแค่ guard/status logic
    ไม่ได้ตั้งใจให้ budget_manage ได้ notify ใหม่มาด้วยเป็นผลพลอยได้ — ถ้าจะเปิด notify ให้
    เส้นทางนั้นด้วยต้องเป็นการตัดสินใจแยกต่างหาก ไม่ใช่ silent side-effect ของ refactor นี้
    """
    if not is_admin and booking.status != 'pending':
        return False, 'ยกเลิกได้เฉพาะก่อนที่ Admin จะจัดรถ — ติดต่อ Admin หากต้องการยกเลิก', None
    if booking.status not in ('pending', 'waiting_approver', 'approved'):
        return False, f'ยกเลิกไม่ได้ — สถานะปัจจุบันคือ {booking.status}', None
    if not is_admin and get_bkk_time() >= booking.start_datetime:
        return False, 'ทริปเริ่มแล้ว ไม่สามารถยกเลิกได้ — ติดต่อ Admin หากจำเป็น', None

    group_bookings = [booking]
    if booking.trip_group:
        group_bookings = VehicleBooking.query.filter(
            VehicleBooking.trip_group == booking.trip_group).all()
    if any(m.odometer_start is not None for gb in group_bookings for m in gb.mileage):
        return False, ('ทริปนี้ (หรือเพื่อนร่วมทริป) มีการบันทึกไมล์เริ่มแล้ว รถออกแล้ว — '
                       'ไม่สามารถยกเลิกได้ ติดต่อผู้ดูแลระบบ'), None

    prev_status = booking.status
    ok, msg = apply_transition(booking, 'cancelled', actor_id)
    if not ok:
        return False, msg, None  # ไม่ควรเกิด (guard ข้างบนครอบไว้แล้ว) กันเผื่อ workflow เปลี่ยน

    mates = []
    if booking.trip_group:
        mates = [gb for gb in group_bookings if gb.id != booking.id]
        for mb in mates:
            # ตั้งใจไม่ผ่าน apply_transition() — นี่คือ force-reset (side-effect ของ
            # un-merge เมื่อ leader ถูกยกเลิก) ไม่ใช่ user-requested transition ของ mate
            # เอง อย่าแก้ให้ผ่าน workflow โดยไม่เช็ค ALLOWED_TRANSITIONS ก่อน — ไม่ skip
            # ใครอีกแล้ว (REQ-1, Phase 3.5, 2026-07-19: guard ด้านบนครอบไปแล้วว่าไม่มีใคร
            # ในกลุ่มมี mileage start entry ก่อนถึงจุดนี้ — เดิม comment อ้าง Phase 2
            # checkpoint ตอนยัง skip เป็นรายคนตาม budget_deducted_at)
            mb.status = 'pending'
            mb.assigned_vehicle_id = None
            mb.driver_id = None
            mb.trip_group = None
        booking.trip_group = None

    trip_mate_user_ids = [m.user_id for m in mates if m.user_id]

    if notify:
        db.session.flush()
        actor = User.query.get(actor_id)
        recipients = _build_cancel_recipients(booking, is_admin, is_owner, prev_status,
                                              trip_mate_user_ids, actor_id)
        _send_cancel_notifications(booking, *recipients, actor)

    return True, None, {
        'prev_status': prev_status,
        'trip_mate_user_ids': trip_mate_user_ids,
    }


# ──────────────────────────────────────────────────────────────
# Revert — set updated_by เสมอ (ตาม behavior เดิม)
# ──────────────────────────────────────────────────────────────
def revert(booking, *, actor_id):
    """approved/waiting_approver/rejected → pending
    guard: ห้ามถ้ามีการหักงบแล้ว (ป้องกัน ledger เพี้ยน) · ห้ามถ้าอยู่ในกลุ่มทริป (trip_group
    set — ไปทาง ungroup() แทน เพราะต้อง cascade ทั้งกลุ่ม revert ตัวเดียวจะทิ้ง trip_group
    ค้างให้เพื่อนร่วมทริปที่เหลือชี้มาที่กลุ่มที่มีสมาชิก pending ปนอยู่)

    เคลียร์ assigned_vehicle_id/driver_id ด้วย (2026-07-31) — เดิมเปลี่ยนแค่ status ทำให้ DB
    ไม่ตรงกับที่ frontend patch (vehicle_admin.js submitRevert) คาดหวังไว้อยู่แล้ว

    คืน (ok: bool, msg: str|None)
    """
    if any(m.budget_deducted_at for m in booking.mileage):
        return False, 'revert ไม่ได้ — มีการหักงบแล้ว'
    if booking.trip_group:
        return False, 'revert ไม่ได้ — booking นี้อยู่ในกลุ่มทริป กรุณาแยกกลุ่มก่อน'
    if booking.status not in ('approved', 'waiting_approver', 'rejected'):
        return False, f'revert ไม่ได้จากสถานะ {booking.status}'
    ok, msg = apply_transition(booking, 'pending', actor_id)
    if ok:
        booking.reject_reason = None
        booking.assigned_vehicle_id = None
        booking.driver_id = None
    return ok, msg
