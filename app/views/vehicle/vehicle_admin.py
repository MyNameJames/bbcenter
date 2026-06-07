from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session, current_app
from flask_login import login_required, current_user
from models import db, get_bkk_time, User, Vehicle, VehicleBooking, Driver, VehicleMileage, SystemConfig, VehicleBudget, VehicleBudgetLog, VehicleDepartment, BudgetType, Notification, DeptApprover, OTRateConfig, DriverOT, DriverOTSlot, FuelPrice, FuelBill, RepairTicket, MaintenanceTicket, RoomBooking
from sqlalchemy import and_, extract, or_, func
from datetime import datetime, date, timedelta
from views.core.telegram_service import (notify_approved, notify_forwarded_to_approver, notify_approver_approved, notify_rejected,
                                    notify_cancelled            as tg_notify_cancelled)
from views.core.notification_service import (
    notify_booking_created      as _n_booking_created,
    notify_admin_assigned       as _n_admin_assigned,
    notify_admin_approved       as _n_admin_approved,
    notify_forwarded_to_approver as _n_forwarded,
    notify_approver_approved    as _n_approver_approved,
    notify_rejected             as _n_rejected,
    notify_merged_into_group    as _n_merged,
    notify_mileage_started      as _n_mileage_start,
    notify_mileage_ended        as _n_mileage_end,
    notify_budget_deducted      as _n_budget,
    notify_payment_required     as _n_payment_required,
    notify_admin_deleted        as _n_admin_deleted,
    notify_payment_confirmed    as _n_payment_confirmed,
    notify_user_cancelled       as _n_user_cancelled,
)
import views.vehicle.vehicle_budget_service as budget_svc
import os, time
from werkzeug.utils import secure_filename
from views.vehicle.vehicle_common import (
    vehicle_bp, adminfleet_bp, admincost_bp, driver_bp,
    is_vehicle_admin, _lookup_budget_for_booking, auto_generate_ot,
    EXPENSE_CATEGORIES, TH_MONTHS, _fmt_date_th,
)


@adminfleet_bp.route('/admin/manage-fleet', methods=['GET', 'POST'])
@login_required
def manage_fleet():
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์เข้าหน้านี้', 'danger')
        return redirect(url_for('vehicle.index'))

    if request.method == 'POST':
        action = request.form.get('action')

        if action == 'add_vehicle':
            new_vehicle = Vehicle(
                brand         = request.form.get('brand'),
                model         = request.form.get('model'),
                license_plate = request.form.get('license_plate'),
                capacity      = int(request.form.get('capacity')),
                fuel_rate     = float(request.form.get('fuel_rate') or 10)
            )
            db.session.add(new_vehicle)
            db.session.commit()
            flash(f"เพิ่มรถ {new_vehicle.brand} {new_vehicle.model} สำเร็จ!", 'success')

        elif action == 'add_driver':
            new_driver = Driver(
                name      = request.form.get('name'),
                phone     = request.form.get('phone'),
                is_active = bool(request.form.get('is_active')),
                user_id   = request.form.get('user_id') or None
            )
            db.session.add(new_driver)
            db.session.commit()
            flash(f"เพิ่มพนักงานขับรถ {new_driver.name} สำเร็จ!", 'success')

        elif action == 'edit_vehicle':
            vid     = int(request.form.get('vehicle_id'))
            vehicle = Vehicle.query.get_or_404(vid)
            vehicle.brand         = request.form.get('brand')
            vehicle.model         = request.form.get('model')
            vehicle.license_plate = request.form.get('license_plate')
            vehicle.capacity      = int(request.form.get('capacity'))
            vehicle.status        = request.form.get('status', 'active')
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

        elif action == 'delete_vehicle':
            vid     = int(request.form.get('vehicle_id'))
            vehicle = Vehicle.query.get_or_404(vid)
            db.session.delete(vehicle)
            db.session.commit()
            flash('ลบรถออกจากระบบแล้ว', 'success')

        elif action == 'edit_driver':
            did    = int(request.form.get('driver_id'))
            driver = Driver.query.get_or_404(did)
            driver.name      = request.form.get('name')
            driver.phone     = request.form.get('phone')
            driver.is_active = True if request.form.get('is_active') else False
            driver.user_id   = request.form.get('user_id') or None
            db.session.commit()
            flash(f"อัปเดตข้อมูลคนขับ {driver.name} สำเร็จ!", 'success')

        elif action == 'delete_driver':
            did    = int(request.form.get('driver_id'))
            driver = Driver.query.get_or_404(did)
            db.session.delete(driver)
            db.session.commit()
            flash('ลบพนักงานขับรถออกจากระบบแล้ว', 'success')

        # ── CRUD: DeptApprover ──────────────────────────────────
        elif action == 'add_approver':
            uid = int(request.form.get('approver_user_id'))
            did = int(request.form.get('approver_dept_id'))
            exists = DeptApprover.query.filter_by(user_id=uid, dept_id=did).first()
            if exists:
                flash('ผู้อนุมัติคนนี้ถูกเพิ่มในกองนั้นแล้ว', 'warning')
            else:
                db.session.add(DeptApprover(user_id=uid, dept_id=did))
                db.session.commit()
                flash('เพิ่มผู้อนุมัติเรียบร้อยแล้ว', 'success')

        elif action == 'delete_approver':
            aid = int(request.form.get('approver_id'))
            row = DeptApprover.query.get_or_404(aid)
            db.session.delete(row)
            db.session.commit()
            flash('ลบผู้อนุมัติออกจากกองแล้ว', 'success')

        return redirect(url_for('adminfleet.manage_fleet'))

    vehicles  = Vehicle.query.order_by(Vehicle.id).all()
    drivers   = Driver.query.order_by(Driver.id).all()
    users     = User.query.order_by(User.full_name).all()
    depts     = (VehicleDepartment.query
                 .filter_by(is_disable=0)
                 .order_by(VehicleDepartment.name).all())
    approvers = (DeptApprover.query
                 .join(DeptApprover.dept)
                 .order_by(VehicleDepartment.name).all())

    odo_rows = (db.session.query(
            VehicleBooking.assigned_vehicle_id,
            func.max(VehicleMileage.odometer_end))
        .join(VehicleMileage, VehicleMileage.booking_id == VehicleBooking.id)
        .filter(VehicleBooking.assigned_vehicle_id.isnot(None),
                VehicleMileage.odometer_end.isnot(None))
        .group_by(VehicleBooking.assigned_vehicle_id).all())
    vehicle_odometers = {vid: odo for vid, odo in odo_rows}

    now_dt      = datetime.now()
    month_start = now_dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    job_rows = (db.session.query(VehicleBooking.driver_id, func.count(VehicleBooking.id))
        .filter(VehicleBooking.driver_id.isnot(None),
                VehicleBooking.start_datetime >= month_start,
                VehicleBooking.status == 'approved')
        .group_by(VehicleBooking.driver_id).all())
    driver_jobs = {did: cnt for did, cnt in job_rows}

    return render_template('vehicle/admin/vehicle_fleet.html',
                           vehicles=vehicles, drivers=drivers, users=users,
                           depts=depts, approvers=approvers,
                           vehicle_odometers=vehicle_odometers,
                           driver_jobs=driver_jobs,
                           now=datetime.now())


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

    now = datetime.utcnow() + timedelta(hours=7)
    budget_rows = VehicleBudget.query.filter_by(year=now.year, month=now.month).all()
    budget_map  = {br.department_id: br for br in budget_rows}

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

    fuel_price = FuelPrice.get_for_date(date.today()) or float(SystemConfig.get('fuel_price', 0) or 0)

    return render_template('vehicle/admin/vehicle_admin.html',
                           bookings=bookings,
                           vehicles=vehicles,
                           drivers=drivers,
                           users_dept=users_dept,
                           central_items=central_items,
                           dept_items=dept_items,
                           fuel_price=fuel_price,
                           now=now)


# ─────────────────────────────────────────────
# Admin: แจ้ง Telegram สำหรับ booking ที่อนุมัติแล้ว
# ─────────────────────────────────────────────

@vehicle_bp.route('/vehicle/admin/booking/<int:booking_id>/notify', methods=['POST'])
@login_required
def admin_notify_booking(booking_id):
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
    b.status = 'pending'
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
    v.repair_started_at = datetime.utcnow() + timedelta(hours=7)
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

    import sys
    print(f'[DEBUG admin_merge] booking_ids={booking_ids} vehicle={assigned_vehicle_id} driver={driver_id} trip_group={trip_group!r} expense_type={expense_type}', file=sys.stderr, flush=True)

    if len(booking_ids) < 2:
        print(f'[DEBUG admin_merge] BLOCKED: need >= 2 booking_ids, got {len(booking_ids)}', file=sys.stderr, flush=True)
        return jsonify({'ok': False, 'msg': 'กรุณาเลือกรายการอย่างน้อย 2 รายการเพื่อรวมทริป'}), 400

    if not assigned_vehicle_id:
        print(f'[DEBUG admin_merge] BLOCKED: no assigned_vehicle_id', file=sys.stderr, flush=True)
        return jsonify({'ok': False, 'msg': 'กรุณาเลือกรถที่จะใช้สำหรับทริปนี้'}), 400

    # หมายเหตุ: ไม่บังคับเลือกคนขับตอน merge — สามารถ assign ทีหลังได้

    # สร้างชื่อกลุ่มอัตโนมัติถ้าไม่ได้กรอก
    if not trip_group:
        count  = db.session.query(VehicleBooking.trip_group)\
                           .filter(VehicleBooking.trip_group.isnot(None))\
                           .distinct().count()
        trip_group = f"TRP-{str(count + 1).zfill(3)}"

    # กำหนด status — ถ้างบกอง → waiting_approver
    new_status = 'waiting_approver' if expense_type == 'department' else 'approved'
    print(f'[DEBUG admin_merge] trip_group={trip_group!r} expense_type={expense_type} new_status={new_status} updating {len(booking_ids)} bookings', file=sys.stderr, flush=True)

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
            print(f'[DEBUG admin_merge]   updated booking #{booking.id} → status={new_status}', file=sys.stderr, flush=True)
        else:
            print(f'[DEBUG admin_merge]   booking #{bid} NOT FOUND', file=sys.stderr, flush=True)

    db.session.commit()
    print(f'[DEBUG admin_merge] commit OK', file=sys.stderr, flush=True)

    # แจ้งเตือน (Telegram + In-app) ทุก booking ใน group
    if new_status == 'waiting_approver':
        for bid in booking_ids:
            b = VehicleBooking.query.get(int(bid))
            if b:
                notify_forwarded_to_approver(b)        # Telegram
                _n_merged(b, trip_group)               # In-app Event #7
                _n_forwarded(b)                        # In-app Event #4
    else:
        for bid in booking_ids:
            b = VehicleBooking.query.get(int(bid))
            if b:
                notify_approved(b)                     # Telegram
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

    booking              = VehicleBooking.query.get_or_404(booking_id)
    assigned_vehicle_id  = request.form.get('assigned_vehicle_id')
    assigned_vehicle2_id = request.form.get('assigned_vehicle2_id') or None
    driver_id            = request.form.get('driver_id') or None
    trip_group           = request.form.get('trip_group', '').strip() or None
    action               = request.form.get('action', 'assign')
    assign_action        = request.form.get('assign_action', 'approve')

    if action == 'ungroup':
        booking.trip_group           = None
        booking.assigned_vehicle_id  = None
        booking.assigned_vehicle2_id = None
        db.session.commit()
        flash(f'นำ #{booking_id} ออกจากกลุ่มทริปแล้ว', 'success')
    else:
        # ── ข้อ 1: ถ้าเป็นทริปร่วม (มี trip_group) ──────────────
        # รถและคนขับสืบทอดจากทริปหลักอัตโนมัติ ไม่ต้องกำหนดใหม่
        is_join_trip = bool(trip_group)

        if not is_join_trip:
            # validate คนขับเฉพาะกรณีไม่ใช่ทริปร่วม
            if booking.need_driver and not driver_id and not booking.driver_id:
                return jsonify({'ok': False, 'msg': f'รายการ #{booking_id} ขอคนขับ กรุณาเลือกคนขับด้วย'}), 400
            # กำหนดรถและคนขับเฉพาะทริปอิสระ
            if assigned_vehicle_id:
                booking.assigned_vehicle_id  = int(assigned_vehicle_id)
            booking.assigned_vehicle2_id = int(assigned_vehicle2_id) if assigned_vehicle2_id else None
            if driver_id:
                booking.driver_id  = int(driver_id)

        booking.trip_group       = trip_group
        booking.expense_type     = request.form.get('expense_type') or None
        booking.central_category = request.form.get('central_category') or None
        trip_dept = request.form.get('trip_department', '').strip()
        booking.trip_department  = trip_dept or booking.user.department or None

        trip_dept = request.form.get('trip_department', '').strip()
        booking.trip_department = trip_dept or booking.user.department or None
        if booking.trip_department:
            dept_obj = VehicleDepartment.query.filter_by(name=booking.trip_department).first()
            if dept_obj:
                booking.trip_department_id = dept_obj.id

        if assign_action == 'reject':
            booking.status = 'rejected'
            booking.reject_reason = request.form.get('reject_reason', '').strip() or None
            db.session.flush()
            # คืนงบถ้าเคยหักแล้ว (no-op ถ้ายังไม่เคยหัก — ปกติ reject ตอน assign จะยังไม่มี mileage)
            budget_svc.refund_for_booking(
                booking,
                note=f'reject by admin {current_user.username} (assign): {booking.reject_reason or "—"}',
            )
            notify_rejected(booking, current_user)                 # Telegram
            _n_rejected(booking, current_user, by_approver=False)  # In-app Event #6
            db.session.commit()
        else:
            # approve — ถ้างบกอง → ส่ง Approver อัตโนมัติ
            if not is_join_trip and (booking.assigned_vehicle_id or booking.driver_id):
                _n_admin_assigned(booking)                         # In-app Event #2
            if booking.expense_type == 'department':
                booking.status = 'waiting_approver'
                db.session.flush()
                notify_forwarded_to_approver(booking)              # Telegram
                _n_forwarded(booking)                              # In-app Event #4
            else:
                booking.status = 'approved'
                db.session.flush()
                notify_approved(booking)                           # Telegram
                _n_admin_approved(booking)                         # In-app Event #3
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
            # capacity check
            if total_pax > vehicle.capacity:
                errors.append(
                    f'จำนวนผู้โดยสารรวม ({total_pax} คน) เกินความจุรถ {vehicle.brand} {vehicle.model} ({vehicle.capacity} ที่นั่ง)'
                )
            # overlap check — รถคันนี้ถูกใช้ในช่วงเวลาที่ merge แล้วไหม?
            conflict = VehicleBooking.query.filter(
                VehicleBooking.assigned_vehicle_id == vehicle.id,
                VehicleBooking.status.in_(['approved', 'waiting_approver']),
                VehicleBooking.id.notin_(booking_ids),
                VehicleBooking.start_datetime < merged_end,
                VehicleBooking.end_datetime   > merged_start,
            ).first()
            if conflict:
                errors.append(
                    f'รถ {vehicle.brand} {vehicle.model} ({vehicle.license_plate}) '
                    f'มีการจองทับซ้อนในช่วงเวลานี้ (#{conflict.id})'
                )

    # ── ตรวจสอบ driver (ถ้าเลือกมาแล้ว) ──────────────────────
    driver_id = data.get('driver_id')
    if driver_id:
        conflict_d = VehicleBooking.query.filter(
            VehicleBooking.driver_id == int(driver_id),
            VehicleBooking.status.in_(['approved', 'waiting_approver']),
            VehicleBooking.id.notin_(booking_ids),
            VehicleBooking.start_datetime < merged_end,
            VehicleBooking.end_datetime   > merged_start,
        ).first()
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