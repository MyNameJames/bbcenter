from flask import render_template, request, redirect, url_for, flash, jsonify, session
from flask_login import login_required, current_user
from models import (db, get_bkk_time, User, Vehicle, VehicleBooking, Driver, VehicleMileage,
                    SystemConfig, VehicleBudget, VehicleDepartment, DeptApprover, FuelPrice)
from sqlalchemy import func
from datetime import date
from views.core.broadcast import notify_approved
from views.core.notification_service import (
    notify_admin_approved       as _n_admin_approved,
    notify_forwarded_to_approver as _n_forwarded,
    notify_merged_into_group    as _n_merged,
)
import services.vehicle.booking_service as booking_svc
from services.vehicle.booking_service import (
    check_vehicle_conflict, check_driver_conflict, check_vehicle_active,
)
import os, time
from collections import Counter
from werkzeug.utils import secure_filename
from components import WeekStrip, ToastRegion
from views.vehicle.vehicle_common import (
    vehicle_bp, adminfleet_bp, admincost_bp, driver_bp,
    is_vehicle_admin, _lookup_budget_for_booking,
    EXPENSE_CATEGORIES, TH_MONTHS, _fmt_date_th,
)


def _sync_user_vehicle_role(user_id):
    """ตั้ง user.role_vehicle ตามบทบาทจริง: approver > driver > user.
    ไม่แตะ admin/superadmin. เรียกหลังเพิ่ม/ลบ driver link หรือ DeptApprover."""
    if not user_id:
        return
    user = User.query.get(int(user_id))
    if not user or user.is_superadmin or user.role_vehicle == 'admin':
        return
    is_approver = DeptApprover.query.filter_by(user_id=user.id).first() is not None
    is_driver   = Driver.query.filter_by(user_id=user.id).first() is not None
    if is_approver:
        user.role_vehicle = 'approver'
    elif is_driver:
        user.role_vehicle = 'driver'
    else:
        user.role_vehicle = 'user'


def _save_driver_image(field_name, prefix):
    """รับไฟล์รูปจาก request.files แล้วเซฟลง static/uploads/driver/ คืนชื่อไฟล์ (None ถ้าไม่มี)"""
    img = request.files.get(field_name)
    if not (img and img.filename):
        return None
    upload_folder = os.path.join('static', 'uploads', 'driver')
    os.makedirs(upload_folder, exist_ok=True)
    fname = f"{int(time.time())}_{prefix}_{secure_filename(img.filename)}"
    img.save(os.path.join(upload_folder, fname))
    return fname


def _fleet_add_vehicle():
    v = Vehicle(
        brand         = request.form.get('brand'),
        model         = request.form.get('model'),
        license_plate = request.form.get('license_plate'),
        capacity      = int(request.form.get('capacity')),
        fuel_rate     = float(request.form.get('fuel_rate') or 10),
        vehicle_type  = request.form.get('vehicle_type') or None,
    )
    db.session.add(v)
    db.session.commit()
    flash(f"เพิ่มรถ {v.brand} {v.model} สำเร็จ!", 'success')


def _fleet_add_driver():
    d = Driver(
        name             = request.form.get('name'),
        phone            = request.form.get('phone'),
        is_active        = bool(request.form.get('is_active')),
        user_id          = request.form.get('user_id') or None,
        national_id      = (request.form.get('national_id') or '').strip() or None,
        addr_line        = (request.form.get('addr_line') or '').strip() or None,
        addr_subdistrict = (request.form.get('addr_subdistrict') or '').strip() or None,
        addr_district    = (request.form.get('addr_district') or '').strip() or None,
        addr_province    = (request.form.get('addr_province') or '').strip() or None,
        addr_postal      = (request.form.get('addr_postal') or '').strip() or None,
    )
    d.avatar_image  = _save_driver_image('avatar_image', 'avatar')
    d.id_card_image = _save_driver_image('id_card_image', 'idcard')
    db.session.add(d)
    db.session.flush()
    _sync_user_vehicle_role(d.user_id)
    db.session.commit()
    flash(f"เพิ่มพนักงานขับรถ {d.name} สำเร็จ!", 'success')


def _fleet_edit_vehicle():
    vehicle = Vehicle.query.get_or_404(int(request.form.get('vehicle_id')))
    vehicle.brand         = request.form.get('brand')
    vehicle.model         = request.form.get('model')
    vehicle.license_plate = request.form.get('license_plate')
    vehicle.capacity      = int(request.form.get('capacity'))
    vehicle.status        = request.form.get('status', 'active')
    vehicle.vehicle_type  = request.form.get('vehicle_type') or None
    fuel_rate_str = request.form.get('fuel_rate', '').strip()
    if fuel_rate_str:
        vehicle.fuel_rate = float(fuel_rate_str)
    svc_date_str = request.form.get('next_service_date', '').strip()
    vehicle.next_service_date = date.fromisoformat(svc_date_str) if svc_date_str else None
    svc_km_str = request.form.get('next_service_km', '').strip()
    vehicle.next_service_km = int(svc_km_str) if svc_km_str else None
    tax_date_str = request.form.get('tax_due_date', '').strip()
    vehicle.tax_due_date = date.fromisoformat(tax_date_str) if tax_date_str else None
    db.session.commit()
    flash(f"อัปเดตข้อมูลรถ {vehicle.brand} {vehicle.model} สำเร็จ!", 'success')


def _fleet_delete_vehicle():
    vehicle = Vehicle.query.get_or_404(int(request.form.get('vehicle_id')))
    db.session.delete(vehicle)
    db.session.commit()
    flash('ลบรถออกจากระบบแล้ว', 'success')


def _fleet_edit_driver():
    driver = Driver.query.get_or_404(int(request.form.get('driver_id')))
    old_user_id            = driver.user_id
    driver.name             = request.form.get('name')
    driver.phone            = request.form.get('phone')
    driver.is_active        = True if request.form.get('is_active') else False
    driver.user_id          = request.form.get('user_id') or None
    driver.national_id      = (request.form.get('national_id') or '').strip() or None
    driver.addr_line        = (request.form.get('addr_line') or '').strip() or None
    driver.addr_subdistrict = (request.form.get('addr_subdistrict') or '').strip() or None
    driver.addr_district    = (request.form.get('addr_district') or '').strip() or None
    driver.addr_province    = (request.form.get('addr_province') or '').strip() or None
    driver.addr_postal      = (request.form.get('addr_postal') or '').strip() or None
    new_avatar = _save_driver_image('avatar_image', 'avatar')
    if new_avatar:
        driver.avatar_image = new_avatar
    new_idcard = _save_driver_image('id_card_image', 'idcard')
    if new_idcard:
        driver.id_card_image = new_idcard
    db.session.flush()
    if old_user_id and old_user_id != driver.user_id:
        _sync_user_vehicle_role(old_user_id)
    _sync_user_vehicle_role(driver.user_id)
    db.session.commit()
    flash(f"อัปเดตข้อมูลคนขับ {driver.name} สำเร็จ!", 'success')


def _fleet_delete_driver():
    driver = Driver.query.get_or_404(int(request.form.get('driver_id')))
    uid = driver.user_id
    db.session.delete(driver)
    db.session.flush()
    _sync_user_vehicle_role(uid)
    db.session.commit()
    flash('ลบพนักงานขับรถออกจากระบบแล้ว', 'success')


def _fleet_add_approver():
    uid = int(request.form.get('approver_user_id'))
    did = int(request.form.get('approver_dept_id'))
    if DeptApprover.query.filter_by(user_id=uid, dept_id=did).first():
        flash('ผู้อนุมัติคนนี้ถูกเพิ่มในกองนั้นแล้ว', 'warning')
    else:
        db.session.add(DeptApprover(user_id=uid, dept_id=did))
        db.session.flush()
        _sync_user_vehicle_role(uid)
        db.session.commit()
        flash('เพิ่มผู้อนุมัติเรียบร้อยแล้ว', 'success')


def _fleet_delete_approver():
    row = DeptApprover.query.get_or_404(int(request.form.get('approver_id')))
    uid = row.user_id
    db.session.delete(row)
    db.session.flush()
    _sync_user_vehicle_role(uid)
    db.session.commit()
    flash('ลบผู้อนุมัติออกจากกองแล้ว', 'success')


def _load_fleet_data():
    vehicles  = Vehicle.query.order_by(Vehicle.id).all()
    drivers   = Driver.query.order_by(Driver.id).all()
    users     = User.query.order_by(User.full_name).all()
    depts     = (VehicleDepartment.query
                 .filter_by(is_disable=0)
                 .order_by(VehicleDepartment.name).all())
    approvers = (DeptApprover.query
                 .join(DeptApprover.dept)
                 .order_by(VehicleDepartment.name).all())
    odo_rows  = (db.session.query(
                     VehicleBooking.assigned_vehicle_id,
                     func.max(VehicleMileage.odometer_end))
                 .join(VehicleMileage, VehicleMileage.booking_id == VehicleBooking.id)
                 .filter(VehicleBooking.assigned_vehicle_id.isnot(None),
                         VehicleMileage.odometer_end.isnot(None))
                 .group_by(VehicleBooking.assigned_vehicle_id).all())
    vehicle_odometers = {vid: odo for vid, odo in odo_rows}
    now_dt      = get_bkk_time()
    month_start = now_dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    job_rows = (db.session.query(VehicleBooking.driver_id, func.count(VehicleBooking.id))
                .filter(VehicleBooking.driver_id.isnot(None),
                        VehicleBooking.start_datetime >= month_start,
                        VehicleBooking.status == 'approved')
                .group_by(VehicleBooking.driver_id).all())
    driver_jobs = {did: cnt for did, cnt in job_rows}
    return vehicles, drivers, users, depts, approvers, vehicle_odometers, driver_jobs, now_dt


@adminfleet_bp.route('/admin/manage-fleet', methods=['GET', 'POST'])
@login_required
def manage_fleet():
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์เข้าหน้านี้', 'danger')
        return redirect(url_for('vehicle.index'))

    if request.method == 'POST':
        _POST_HANDLERS = {
            'add_vehicle':     _fleet_add_vehicle,
            'add_driver':      _fleet_add_driver,
            'edit_vehicle':    _fleet_edit_vehicle,
            'delete_vehicle':  _fleet_delete_vehicle,
            'edit_driver':     _fleet_edit_driver,
            'delete_driver':   _fleet_delete_driver,
            'add_approver':    _fleet_add_approver,
            'delete_approver': _fleet_delete_approver,
        }
        handler = _POST_HANDLERS.get(request.form.get('action'))
        if handler:
            handler()
        return redirect(url_for('adminfleet.manage_fleet'))

    vehicles, drivers, users, depts, approvers, vehicle_odometers, driver_jobs, now_dt = \
        _load_fleet_data()
    return render_template('vehicle/admin/vehicle_fleet.html',
                           vehicles=vehicles, drivers=drivers, users=users,
                           depts=depts, approvers=approvers,
                           vehicle_odometers=vehicle_odometers,
                           driver_jobs=driver_jobs,
                           now=now_dt)


# ─────────────────────────────────────────────
# Admin: หน้าจัดการทริป (รวมทริป / เปลี่ยนรถ)
# ─────────────────────────────────────────────

@vehicle_bp.route('/vehicle/admin')
@login_required
def admin_trips():
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์เข้าหน้านี้', 'danger')
        return redirect(url_for('vehicle.index'))

    bookings = VehicleBooking.query.order_by(VehicleBooking.created_at.desc()).all()
    vehicles = Vehicle.query.order_by(Vehicle.id).all()
    drivers  = Driver.query.filter_by(is_active=True).order_by(Driver.id).all()

    users_dept = [d.name for d in VehicleDepartment.query
                  .filter_by(is_disable=0).order_by(VehicleDepartment.name).all()]

    now = get_bkk_time()
    # งบ active period (2026-06-06): เลิกผูก year/month — ดึงงบ is_active ที่ช่วง
    # start_date–end_date ครอบวันนี้ (mirror _lookup_budget_for_booking).
    # overlap หลายก้อนต่อแผนก → เอา start_date ล่าสุด (specific สุด)
    today_d = now.date()
    active_budget_rows = (VehicleBudget.query.filter(
        VehicleBudget.is_active.is_(True),
        VehicleBudget.start_date.isnot(None),
        VehicleBudget.end_date.isnot(None),
        VehicleBudget.start_date <= today_d,
        VehicleBudget.end_date >= today_d,
    ).order_by(VehicleBudget.start_date.desc(), VehicleBudget.id.desc()).all())
    budget_map = {}
    for br in active_budget_rows:
        budget_map.setdefault(br.department_id, br)

    all_depts = VehicleDepartment.query.filter_by(is_disable=0)\
                    .order_by(VehicleDepartment.name).all()

    central_items = []
    dept_items    = []
    for dept in all_depts:
        br = budget_map.get(dept.id)
        # Match budget_manage: show only depts that have a VehicleBudget row
        # for this month — skip zero-budget placeholders.
        if br is None:
            continue
        total = float(br.budget_amount)
        used  = float(br.used_amount)
        if dept.budget_type.name == 'central':
            central_items.append({
                'key':   dept.name,
                'label': dept.name,
                'total': total,
                'used':  used,
            })
        elif dept.budget_type.name == 'department':
            approver_name = ''
            if br.approver:
                approver_name = br.approver.full_name or br.approver.username
            dept_items.append({
                'key':      dept.name,
                'label':    dept.name,
                'total':    total,
                'used':     used,
                'approver': approver_name,
            })

    fuel_price = FuelPrice.get_for_date(get_bkk_time().date()) or float(SystemConfig.get('fuel_price', 0) or 0)

    # weekstrip badge — จำนวน booking ต่อวัน (ทุกสถานะ)
    day_counts = Counter(b.start_datetime.date().isoformat() for b in bookings)

    weekstrip = WeekStrip(value='', counts=dict(day_counts))

    return render_template('vehicle/admin/vehicle_admin.html',
                           bookings=bookings,
                           vehicles=vehicles,
                           drivers=drivers,
                           users_dept=users_dept,
                           central_items=central_items,
                           dept_items=dept_items,
                           fuel_price=fuel_price,
                           now=now,
                           weekstrip=weekstrip,
                           toast_region=ToastRegion())


# ─────────────────────────────────────────────
# Admin: แจ้ง Telegram สำหรับ booking ที่อนุมัติแล้ว
# ─────────────────────────────────────────────

@vehicle_bp.route('/vehicle/admin/booking/<int:booking_id>/notify', methods=['POST'])
@login_required
def admin_notify_booking(booking_id):
    # Telegram/LINE group แจ้งเตือนผ่านปุ่มนี้เท่านั้น (manual re-notify)
    # ไม่มี auto-notify ตามสถานะ — เพื่อให้ admin ควบคุมว่าจะส่งเมื่อไหร่
    if not is_vehicle_admin():
        return jsonify({'ok': False, 'msg': 'ไม่มีสิทธิ์'}), 403
    b = VehicleBooking.query.get_or_404(booking_id)
    if b.status != 'approved':
        return jsonify({'ok': False, 'msg': 'booking ไม่ได้อนุมัติ'}), 400
    notify_approved(b)
    return jsonify({'ok': True})


# Admin: ย้อนสถานะ booking → pending
# ─────────────────────────────────────────────

@vehicle_bp.route('/vehicle/admin/booking/<int:booking_id>/revert', methods=['POST'])
@login_required
def admin_revert_booking(booking_id):
    if not is_vehicle_admin():
        return jsonify({'ok': False, 'msg': 'ไม่มีสิทธิ์'}), 403
    b = VehicleBooking.query.get_or_404(booking_id)
    ok, msg = booking_svc.revert(b, actor_id=current_user.id)
    if not ok:
        return jsonify({'ok': False, 'msg': msg}), 400
    db.session.commit()
    return jsonify({'ok': True})


# ─────────────────────────────────────────────
# Admin: เปลี่ยนสถานะรถ (ส่งซ่อม / เสร็จซ่อม)
# ─────────────────────────────────────────────

@vehicle_bp.route('/vehicle/admin/vehicle/<int:vehicle_id>/repair', methods=['POST'])
@login_required
def admin_vehicle_repair(vehicle_id):
    if not is_vehicle_admin():
        return jsonify({'ok': False, 'msg': 'ไม่มีสิทธิ์'}), 403
    v = Vehicle.query.get_or_404(vehicle_id)
    v.status = 'maintenance'
    v.repair_note = request.form.get('repair_note', '')
    v.repair_started_at = get_bkk_time()
    db.session.commit()
    return jsonify({'ok': True})



@vehicle_bp.route('/vehicle/admin/vehicle/<int:vehicle_id>/fix-done', methods=['POST'])
@login_required
def admin_vehicle_fix_done(vehicle_id):
    if not is_vehicle_admin():
        return jsonify({'ok': False, 'msg': 'ไม่มีสิทธิ์'}), 403
    v = Vehicle.query.get_or_404(vehicle_id)
    v.status = 'active'
    v.repair_note = None
    v.repair_started_at = None
    db.session.commit()
    return jsonify({'ok': True, 'label': f'{v.brand} {v.model} ({v.license_plate})'})


# ─────────────────────────────────────────────
# Admin: Swap รถให้ booking
# ─────────────────────────────────────────────

@vehicle_bp.route('/vehicle/admin/booking/<int:booking_id>/swap', methods=['POST'])
@login_required
def admin_swap_vehicle(booking_id):
    if not is_vehicle_admin():
        return jsonify({'ok': False, 'msg': 'ไม่มีสิทธิ์'}), 403
    b = VehicleBooking.query.get_or_404(booking_id)
    new_vehicle_id = request.form.get('vehicle_id', type=int)
    if not new_vehicle_id:
        return jsonify({'ok': False, 'msg': 'ไม่ได้เลือกรถ'}), 400
    if not check_vehicle_active(new_vehicle_id):
        return jsonify({'ok': False, 'msg': 'รถคันนี้ไม่พร้อมใช้งาน (maintenance/inactive)'}), 400
    vconf = check_vehicle_conflict(new_vehicle_id, b.start_datetime, b.end_datetime, [b.id])
    if vconf:
        return jsonify({'ok': False, 'msg': f'รถคันนี้ถูกใช้ทับช่วงเวลานี้ (#{vconf.id})'}), 400
    b.assigned_vehicle_id = new_vehicle_id
    db.session.commit()
    v = Vehicle.query.get(new_vehicle_id)
    label = f'{v.brand} {v.model} ({v.license_plate})' if v else ''
    return jsonify({'ok': True, 'label': label})


# ─────────────────────────────────────────────
# Admin: รวมทริป (Merge)
# ─────────────────────────────────────────────

@vehicle_bp.route('/vehicle/admin/merge', methods=['POST'])
@login_required
def admin_merge():
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์', 'danger')
        return redirect(url_for('vehicle.index'))

    booking_ids         = request.form.getlist('booking_ids')
    assigned_vehicle_id = request.form.get('assigned_vehicle_id')
    driver_id           = request.form.get('driver_id') or None
    trip_group          = request.form.get('trip_group', '').strip()
    expense_type        = request.form.get('expense_type') or None
    central_category    = request.form.get('central_category') or None
    trip_department     = request.form.get('trip_department', '').strip()

    if not assigned_vehicle_id:
        return jsonify({'ok': False, 'msg': 'กรุณาเลือกรถที่จะใช้สำหรับทริปนี้'}), 400

    # ── เพิ่มงานเข้ากลุ่มที่มีอยู่แล้ว (2026-07-31) — งานเดิมในกลุ่มเป็นหลัก ไม่ถูกแตะ ──
    # แยกจากทาง "รวมทริปใหม่/แก้ไขกลุ่มเดิม" ด้านล่างด้วย new_ids (id ที่ยังไม่ใช่สมาชิกกลุ่ม
    # เดิม) — ครอบคลุมทั้งเคส "เพิ่มงานใหม่ล้วน" และเคสที่ resend สมาชิกเดิมมาปนโดยไม่ตั้งใจ
    # (new_ids จะกรองออกเอง เหลือแค่ตัวใหม่จริงๆ ไปที่ merge_into_group)
    existing_ids = ({b.id for b in VehicleBooking.query.filter_by(trip_group=trip_group).all()}
                     if trip_group else set())
    new_ids = [bid for bid in booking_ids if int(bid) not in existing_ids]

    if existing_ids and new_ids:
        ok, msg = booking_svc.merge_into_group(
            trip_group, new_ids,
            vehicle_id=assigned_vehicle_id, driver_id=driver_id,
            expense_type=expense_type, central_category=central_category,
            trip_department=trip_department,
        )
        if not ok:
            return jsonify({'ok': False, 'msg': msg}), 400
        db.session.commit()
        return jsonify({'ok': True, 'trip_group': trip_group})

    # ── รวมทริปใหม่ / แก้ไขทรัพยากรของกลุ่มเดิม (โค้ดเดิม — ไม่แตะ) ──────────
    if len(booking_ids) < 2:
        return jsonify({'ok': False, 'msg': 'กรุณาเลือกรายการอย่างน้อย 2 รายการเพื่อรวมทริป'}), 400

    # หมายเหตุ: ไม่บังคับเลือกคนขับตอน merge — สามารถ assign ทีหลังได้

    # สร้างชื่อกลุ่มอัตโนมัติถ้าไม่ได้กรอก
    if not trip_group:
        count  = db.session.query(VehicleBooking.trip_group)\
                           .filter(VehicleBooking.trip_group.isnot(None))\
                           .distinct().count()
        trip_group = f"TRP-{str(count + 1).zfill(3)}"

    # กำหนด status — ถ้างบกอง → waiting_approver
    new_status = 'waiting_approver' if expense_type == 'department' else 'approved'

    if not check_vehicle_active(assigned_vehicle_id):
        return jsonify({'ok': False, 'msg': 'รถคันนี้ไม่พร้อมใช้งาน (maintenance/inactive)'}), 400

    # conflict guard ก่อน commit merge จริง
    sel = [VehicleBooking.query.get(int(b)) for b in booking_ids]
    sel = [b for b in sel if b]
    if sel:
        m_start = min(b.start_datetime for b in sel)
        m_end   = max(b.end_datetime   for b in sel)
        vconf = check_vehicle_conflict(assigned_vehicle_id, m_start, m_end, booking_ids)
        if vconf:
            return jsonify({'ok': False, 'msg': f'รถถูกใช้ทับช่วงนี้แล้ว (#{vconf.id})'}), 400
        if driver_id:
            dconf = check_driver_conflict(driver_id, m_start, m_end, booking_ids)
            if dconf:
                return jsonify({'ok': False, 'msg': f'คนขับมีทริปทับช่วงนี้ (#{dconf.id})'}), 400

    # อัปเดตทุก booking ที่เลือก
    for bid in booking_ids:
        booking = VehicleBooking.query.get(int(bid))
        if booking:
            booking.trip_group          = trip_group
            booking.assigned_vehicle_id = int(assigned_vehicle_id)
            booking.status              = new_status
            booking.expense_type        = expense_type
            if driver_id and booking.need_driver:
                booking.driver_id = int(driver_id)

    db.session.commit()

    # แจ้งเตือน (Telegram + In-app) ทุก booking ใน group
    # Telegram ส่งผ่านปุ่ม btnNotify เท่านั้น (2026-06-07) — merge confirm ส่งแค่ in-app
    if new_status == 'waiting_approver':
        for bid in booking_ids:
            b = VehicleBooking.query.get(int(bid))
            if b:
                _n_merged(b, trip_group)               # In-app Event #7
                _n_forwarded(b)                        # In-app Event #4
    else:
        for bid in booking_ids:
            b = VehicleBooking.query.get(int(bid))
            if b:
                _n_merged(b, trip_group)               # In-app Event #7
                _n_admin_approved(b)                   # In-app Event #3
    db.session.commit()
    return jsonify({'ok': True, 'trip_group': trip_group})


# ─────────────────────────────────────────────
# Admin: เปลี่ยนรถ / แก้กลุ่มรายการเดี่ยว
# ─────────────────────────────────────────────

@vehicle_bp.route('/vehicle/admin/assign/<int:booking_id>', methods=['POST'])
@login_required
def admin_assign(booking_id):
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์', 'danger')
        return redirect(url_for('vehicle.index'))

    booking       = VehicleBooking.query.get_or_404(booking_id)
    trip_group    = request.form.get('trip_group', '').strip() or None
    action        = request.form.get('action', 'assign')
    assign_action = request.form.get('assign_action', 'approve')

    if action == 'ungroup':
        ok, msg = booking_svc.ungroup(booking)
        if not ok:
            return jsonify({'ok': False, 'msg': msg}), 400
        db.session.commit()
        flash(f'นำ #{booking_id} ออกจากกลุ่มทริปแล้ว', 'success')
        return jsonify({'ok': True})

    # ── ข้อ 1: ถ้าเป็นทริปร่วม (มี trip_group) ──────────────
    # รถและคนขับสืบทอดจากทริปหลักอัตโนมัติ ไม่ต้องกำหนดใหม่ (assign_resources ข้าม set+validate)
    is_join_trip = bool(trip_group)
    ok, msg = booking_svc.assign_resources(
        booking,
        vehicle_id=request.form.get('assigned_vehicle_id'),
        driver_id=request.form.get('driver_id') or None,
        trip_group=trip_group,
        expense_type=request.form.get('expense_type') or None,
        central_category=request.form.get('central_category') or None,
        trip_department=request.form.get('trip_department', '').strip(),
        is_join_trip=is_join_trip,
    )
    if not ok:
        return jsonify({'ok': False, 'msg': msg}), 400

    if assign_action == 'reject':
        # Telegram ส่งผ่านปุ่ม btnNotify เท่านั้น (2026-06-07) — confirm/reject ไม่ส่ง
        # notify (Event #6) อยู่ใน reject_from_pending() แล้ว (Phase 4, 2026-07-19)
        ok, msg = booking_svc.reject_from_pending(
            booking, reason=request.form.get('reject_reason', '').strip() or None)
        if not ok:
            return jsonify({'ok': False, 'msg': msg}), 400
        db.session.commit()
    else:
        # approve — guard budget + conflict รวมอยู่ใน approve_from_pending แล้ว
        # (เดิม admin_assign เช็ค conflict, approve_booking ไม่เช็ค — ตกลงให้รวมเข้าด้วยกัน)
        # Telegram ส่งผ่านปุ่ม btnNotify เท่านั้น (2026-06-07)
        # notify (Event #2/#3/#4) อยู่ใน approve_from_pending() แล้ว (Phase 4, 2026-07-19) —
        # notify_assigned ส่งเงื่อนไขเดิม (not is_join_trip and had_resources) เข้า service
        had_resources = bool(booking.assigned_vehicle_id or booking.driver_id)
        ok, msg = booking_svc.approve_from_pending(
            booking, skip_conflict_check=is_join_trip,
            notify_assigned=(not is_join_trip and had_resources))
        if not ok:
            return jsonify({'ok': False, 'msg': msg}), 400
        db.session.commit()

    return jsonify({'ok': True})

# ─────────────────────────────────────────────
# กรอกไมล์ (admin + superadmin)
# ─────────────────────────────────────────────


@adminfleet_bp.route('/api/vehicle/<int:vid>/history')
@login_required
def vehicle_history(vid):
    vehicle  = Vehicle.query.get_or_404(vid)
    bookings = VehicleBooking.query.filter(
        VehicleBooking.assigned_vehicle_id == vid,
        VehicleBooking.status == 'approved'
    ).order_by(VehicleBooking.start_datetime.desc()).limit(20).all()

    rows = []
    total_km = 0
    for b in bookings:
        m = b.mileage[0] if b.mileage else None
        dist = (m.odometer_end - m.odometer_start) if (m and m.odometer_end and m.odometer_start) else None
        if dist:
            total_km += dist
        rows.append({
            'id':          b.id,
            'date':        b.start_datetime.strftime('%d/%m/%Y'),
            'destination': b.destination,
            'driver':      b.driver.name if b.driver else '-',
            'distance':    dist,
            'odometer_end': m.odometer_end if m else None,
        })
    return jsonify({'vehicle': f"{vehicle.brand} {vehicle.model}", 'total_km': total_km, 'rows': rows})


# ══════════════════════════════════════════════════════
# Feature 5: Excel Export
# ══════════════════════════════════════════════════════

@adminfleet_bp.route('/admin/manage-fleet/service', methods=['POST'])
@login_required
def update_vehicle_service():
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์', 'danger')
        return redirect(url_for('adminfleet.manage_fleet'))

    vid     = int(request.form.get('vehicle_id'))
    vehicle = Vehicle.query.get_or_404(vid)

    svc_date = request.form.get('next_service_date', '').strip()
    svc_km   = request.form.get('next_service_km', '').strip()
    tax_date = request.form.get('tax_due_date', '').strip()

    vehicle.next_service_date = date.fromisoformat(svc_date) if svc_date else None
    vehicle.next_service_km   = int(svc_km) if svc_km else None
    vehicle.tax_due_date      = date.fromisoformat(tax_date) if tax_date else None
    db.session.commit()
    flash(f'อัปเดตวันนัดซ่อม/ต่อภาษี {vehicle.brand} {vehicle.model} เรียบร้อย', 'success')
    return redirect(url_for('adminfleet.manage_fleet'))

# ══════════════════════════════════════════════════════
# Feature 7: Merge Validation API (สำหรับ Drag & Drop Merge)
# ══════════════════════════════════════════════════════

@vehicle_bp.route('/api/check-merge', methods=['POST'])
@login_required
def api_check_merge():
    """
    ตรวจสอบ validity ก่อน merge จริง
    รับ: { booking_ids: [1,2,...], vehicle_id: 3 (optional) }
    คืน: { valid, errors: [], warnings: [], merged_range, total_pax, destinations }
    """
    if not is_vehicle_admin():
        return jsonify({'error': 'ไม่มีสิทธิ์'}), 403

    data        = request.get_json(force=True)
    booking_ids = [int(x) for x in data.get('booking_ids', [])]
    vehicle_id  = data.get('vehicle_id')

    if len(booking_ids) < 2:
        return jsonify({'valid': False, 'errors': ['ต้องเลือกอย่างน้อย 2 รายการ'], 'warnings': []}), 200

    bookings = [VehicleBooking.query.get(bid) for bid in booking_ids]
    bookings = [b for b in bookings if b]

    errors   = []
    warnings = []

    # ── คำนวณ merged time range ──────────────────────────────
    starts   = [b.start_datetime for b in bookings]
    ends     = [b.end_datetime   for b in bookings]
    merged_start = min(starts)
    merged_end   = max(ends)

    # ── ตรวจสอบ time overlap (warning ถ้าไม่ overlap) ────────
    # หา overlap จริง: ถ้าทุก pair overlap กัน → ok, ไม่งั้น warning
    has_overlap = False
    for i in range(len(bookings)):
        for j in range(i + 1, len(bookings)):
            a, b2 = bookings[i], bookings[j]
            if a.start_datetime < b2.end_datetime and a.end_datetime > b2.start_datetime:
                has_overlap = True
    if not has_overlap:
        warnings.append('ช่วงเวลาของรายการที่เลือกไม่ทับซ้อนกัน การรวมทริปอาจไม่สมเหตุสมผล')

    # ── ตรวจสอบปลายทาง (warning ถ้าต่างกัน) ─────────────────
    destinations = list(dict.fromkeys(b.destination for b in bookings))  # unique + ordered
    if len(destinations) > 1:
        warnings.append(f'ปลายทางต่างกัน: {", ".join(destinations)}')

    # ── รวม passengers ───────────────────────────────────────
    total_pax = sum(b.passenger_count for b in bookings)

    # ── ตรวจสอบรถ (ถ้าเลือกมาแล้ว) ───────────────────────────
    if vehicle_id:
        vehicle = Vehicle.query.get(int(vehicle_id))
        if vehicle:
            if total_pax > vehicle.capacity:
                errors.append(
                    f'จำนวนผู้โดยสารรวม ({total_pax} คน) เกินความจุรถ {vehicle.brand} {vehicle.model} ({vehicle.capacity} ที่นั่ง)'
                )
            conflict = check_vehicle_conflict(vehicle.id, merged_start, merged_end, booking_ids)
            if conflict:
                errors.append(
                    f'รถ {vehicle.brand} {vehicle.model} ({vehicle.license_plate}) '
                    f'มีการจองทับซ้อนในช่วงเวลานี้ (#{conflict.id})'
                )

    # ── ตรวจสอบ driver (ถ้าเลือกมาแล้ว) ──────────────────────
    driver_id = data.get('driver_id')
    if driver_id:
        conflict_d = check_driver_conflict(driver_id, merged_start, merged_end, booking_ids)
        if conflict_d:
            driver = Driver.query.get(int(driver_id))
            dname  = driver.name if driver else f'#{driver_id}'
            errors.append(
                f'คนขับ {dname} มีทริปอื่นทับซ้อนในช่วงเวลานี้ (#{conflict_d.id})'
            )

    # ── Format response ───────────────────────────────────────
    TH_MONTHS = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                 'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

    def fmt_dt(dt):
        return f"{dt.day} {TH_MONTHS[dt.month]} {dt.year + 543}  {dt.strftime('%H:%M')}"

    booking_summaries = []
    for b in bookings:
        booking_summaries.append({
            'id':         b.id,
            'booker':     b.user.full_name or b.user.username,
            'dept':       b.user.department or '–',
            'dest':       b.destination,
            'pax':        b.passenger_count,
            'start':      fmt_dt(b.start_datetime),
            'end':        fmt_dt(b.end_datetime),
            'need_driver': b.need_driver,
        })

    return jsonify({
        'valid':        len(errors) == 0,
        'errors':       errors,
        'warnings':     warnings,
        'merged_start': fmt_dt(merged_start),
        'merged_end':   fmt_dt(merged_end),
        'total_pax':    total_pax,
        'destinations': destinations,
        'bookings':     booking_summaries,
    })


# ── Booking data สำหรับ Admin page (JSON) ─────────────────

@vehicle_bp.route('/api/admin/bookings')
@login_required
def api_admin_bookings():
    """คืน booking list ล่าสุดสำหรับ admin page (ใช้ refresh หลัง merge)"""
    if not is_vehicle_admin():
        return jsonify({'error': 'ไม่มีสิทธิ์'}), 403

    bookings = VehicleBooking.query.order_by(VehicleBooking.created_at.desc()).all()
    result   = []
    for b in bookings:
        result.append({
            'id':         b.id,
            'booker':     b.user.full_name or b.user.username,
            'dept':       b.user.department or '–',
            'dest':       b.destination,
            'purpose':    b.purpose,
            'pax':        b.passenger_count,
            'start':      b.start_datetime.strftime('%d/%m/%y %H:%M'),
            'end':        b.end_datetime.strftime('%H:%M'),
            'start_iso':  b.start_datetime.isoformat(),
            'end_iso':    b.end_datetime.isoformat(),
            'status':     b.status,
            'trip_group': b.trip_group or '',
            'vehicle':    (f"{b.assigned_vehicle.brand} {b.assigned_vehicle.model} ({b.assigned_vehicle.license_plate})" if b.assigned_vehicle else ''),
            'driver':     (b.driver.name if b.driver else ''),
            'need_driver': b.need_driver,
            'detail_url': f'/vehicle/detail/{b.id}',
            'assign_url': f'/vehicle/admin/assign/{b.id}',
            'ungroup_url': f'/vehicle/admin/assign/{b.id}',
        })
    return jsonify(result)