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


@vehicle_bp.route('/vehicle')
@login_required
def index():
    # ad-hoc (driver-created off-the-books) ซ่อนจากปฏิทินผู้ใช้
    bookings  = (VehicleBooking.query
                 .filter(VehicleBooking.is_ad_hoc == False)
                 .order_by(VehicleBooking.created_at.desc()).all())
    vehicles  = Vehicle.query.filter_by(status='active').order_by(Vehicle.id).all()
    drivers   = Driver.query.filter_by(is_active=True).order_by(Driver.id).all()
    return render_template(
        'vehicle/vehicle.html',
        bookings=bookings,
        vehicles=vehicles,
        drivers=drivers,
        expense_categories=EXPENSE_CATEGORIES,
        total_vehicles=len(vehicles),
        page_section='บริการ',
        page_title='ปฏิทินการจองรถ',
        # Phase 9 (2026-05-22) — `canCancel` gating needs admin + now
        now=datetime.now(),
        is_vehicle_admin=is_vehicle_admin(),
    )


# ─────────────────────────────────────────────
# จองรถแบบใหม่ — ไม่ต้องเลือกรถ admin กำหนดให้
# ─────────────────────────────────────────────

@vehicle_bp.route('/vehicle/book', methods=['POST'])
@login_required
def book_vehicle_simple():
    try:
        start_str = request.form.get('start_datetime', '').strip()
        end_str   = request.form.get('end_datetime',   '').strip()

        if not start_str or not end_str:
            flash('กรุณาเลือกวัน-เวลาไปและกลับให้ครบ', 'warning')
            return redirect(url_for('vehicle.index'))

        start_dt        = datetime.strptime(start_str, '%Y-%m-%dT%H:%M')
        end_dt          = datetime.strptime(end_str,   '%Y-%m-%dT%H:%M')
        destination      = request.form.get('destination')
        purpose          = request.form.get('purpose')
        passenger_count  = int(request.form.get('passenger_count', 1))
        need_driver      = request.form.get('need_driver') == 'on'
        pickup_location  = request.form.get('pickup_location', '').strip()

        if start_dt < datetime.now():
            flash('ไม่สามารถจองย้อนหลังได้ กรุณาเลือกวันเวลาในอนาคต', 'warning')
            return redirect(url_for('vehicle.index'))

        if start_dt >= end_dt:
            flash('เวลากลับต้องมากกว่าเวลาไป', 'danger')
            return redirect(url_for('vehicle.index'))

        # ── ข้อ 5: ห้ามจองข้ามวัน ─────────────────────────────
        if start_dt.date() != end_dt.date():
            flash('ไม่สามารถจองข้ามวันได้ กรุณาเลือกวันเริ่มและสิ้นสุดเป็นวันเดียวกัน', 'warning')
            return redirect(url_for('vehicle.index'))

        new_booking = VehicleBooking(
            user_id         = current_user.id,
            start_datetime  = start_dt,
            end_datetime    = end_dt,
            destination     = destination,
            purpose         = purpose,
            passenger_count = passenger_count,
            need_driver     = need_driver,
            status          = 'pending',
            pickup_location = pickup_location or None,
        )
        db.session.add(new_booking)
        db.session.flush()
        _n_booking_created(new_booking)
        db.session.commit()
        flash(f'ส่งคำขอจองรถเรียบร้อยแล้ว (#{ new_booking.id }) รอ Admin พิจารณา', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'เกิดข้อผิดพลาด: {str(e)}', 'danger')

    return redirect(url_for('vehicle.index'))



# ─────────────────────────────────────────────
# แก้ไขการจอง
# ─────────────────────────────────────────────

@vehicle_bp.route('/vehicle/edit/<int:booking_id>', methods=['GET', 'POST'])
@login_required
def edit_booking(booking_id):
    booking = VehicleBooking.query.get_or_404(booking_id)

    if current_user.id != booking.user_id:
        flash('คุณไม่มีสิทธิ์แก้ไขรายการนี้', 'danger')
        return redirect(url_for('vehicle.index'))

    # อนุญาตแก้ไขได้เฉพาะสถานะ pending เท่านั้น
    if booking.status != 'pending':
        flash('ไม่สามารถแก้ไขได้ เนื่องจากคำขอนี้ถูกดำเนินการแล้ว', 'warning')
        return redirect(url_for('vehicle.index'))

    if request.method == 'POST':
        try:
            booking.start_datetime  = datetime.strptime(request.form.get('start_datetime'), '%Y-%m-%dT%H:%M')
            booking.end_datetime    = datetime.strptime(request.form.get('end_datetime'),   '%Y-%m-%dT%H:%M')
            booking.destination     = request.form.get('destination')
            booking.purpose         = request.form.get('purpose')
            booking.passenger_count = int(request.form.get('passenger_count', 1))
            booking.need_driver     = True if request.form.get('need_driver') else False
            booking.pickup_location = request.form.get('pickup_location', '').strip() or None

            db.session.commit()
            flash('อัปเดตข้อมูลการจองเรียบร้อยแล้ว', 'success')
            return redirect(url_for('vehicle.index'))
        except Exception as e:
            db.session.rollback()
            flash(f'เกิดข้อผิดพลาด: {str(e)}', 'danger')

    start_str = booking.start_datetime.strftime('%Y-%m-%dT%H:%M')
    end_str   = booking.end_datetime.strftime('%Y-%m-%dT%H:%M')
    return render_template('vehicle/vehicle_edit.html', booking=booking, start_str=start_str, end_str=end_str)


# ─────────────────────────────────────────────
# ลบการจอง
# ─────────────────────────────────────────────

@vehicle_bp.route('/vehicle/delete/<int:booking_id>', methods=['POST'])
@login_required
def delete_booking(booking_id):
    booking = VehicleBooking.query.get_or_404(booking_id)

    # Admin ลบได้ทุกสถานะ แต่ User ทั่วไปลบได้เฉพาะ pending และ rejected
    if not is_vehicle_admin() and current_user.id != booking.user_id:
        flash('คุณไม่มีสิทธิ์ลบรายการนี้', 'danger')
        return redirect(url_for('vehicle.index'))

    if not is_vehicle_admin() and booking.status in ('approved', 'waiting_approver'):
        flash('ไม่สามารถลบคำขอที่อยู่ในระหว่างดำเนินการหรืออนุมัติแล้วได้ กรุณาติดต่อ Admin', 'warning')
        return redirect(url_for('vehicle.index'))

    try:
        # ถ้า admin ลบของคนอื่น → แจ้งเตือน user (Event #15)
        should_notify = is_vehicle_admin() and current_user.id != booking.user_id
        snap = (booking.id, booking.user_id, booking.destination)

        # คืนงบก่อนลบ (อ่าน booking.mileage ได้ก่อน cascade) — no-op ถ้ายังไม่เคยหัก
        budget_svc.refund_for_booking(
            booking,
            note=f'delete booking #{booking.id} by {current_user.username}',
        )
        db.session.flush()

        db.session.delete(booking)
        db.session.flush()
        if should_notify:
            _n_admin_deleted(snap[0], snap[1], snap[2], current_user)
        db.session.commit()
        flash('ยกเลิกและลบรายการจองเรียบร้อยแล้ว', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'เกิดข้อผิดพลาดในการลบ: {str(e)}', 'danger')

    return redirect(url_for('vehicle.index'))


# ─────────────────────────────────────────────
# Phase 9 (2026-05-22) — Cancel booking (soft, status='cancelled')
# C1: User+Admin can cancel pending/waiting_approver/approved bookings
# Time guard: must be BEFORE booking.start_datetime
# ─────────────────────────────────────────────

@vehicle_bp.route('/vehicle/cancel/<int:booking_id>', methods=['POST'])
@login_required
def cancel_booking(booking_id):
    """C1 — Soft cancel approved/pending/waiting_approver booking. Row kept for audit."""
    booking = VehicleBooking.query.get_or_404(booking_id)

    # Permission: owner OR admin
    is_owner = (current_user.id == booking.user_id)
    is_admin = is_vehicle_admin()
    if not (is_owner or is_admin):
        flash('คุณไม่มีสิทธิ์ยกเลิกการจองนี้', 'danger')
        return redirect(url_for('vehicle.index'))

    # Status guard
    if booking.status not in ('pending', 'waiting_approver', 'approved'):
        flash(f'ยกเลิกไม่ได้ — สถานะปัจจุบันคือ {booking.status}', 'warning')
        return redirect(url_for('vehicle.detail_booking', booking_id=booking_id))

    # Time guard — block หลัง trip start
    if datetime.now() >= booking.start_datetime:
        flash('ทริปเริ่มแล้ว ไม่สามารถยกเลิกได้ — ติดต่อ Admin หากจำเป็น', 'warning')
        return redirect(url_for('vehicle.detail_booking', booking_id=booking_id))

    try:
        prev_status = booking.status

        # ── Refund budget (idempotent — no-op ถ้ายังไม่เคยหัก)
        refunds = budget_svc.refund_for_booking(
            booking,
            note=f'cancel booking #{booking.id} by {current_user.username}',
        )
        db.session.flush()

        # ── Build recipient sets BEFORE status flip
        # Priority cascade (highest → lowest): owner > admin > approver > driver > mate
        # ทุก lower-priority set จะ discard user_id ที่อยู่ใน higher-priority set แล้ว
        # → ทุก user_id ได้รับ notification เพียง 1 ใบเท่านั้น (role_label = highest priority)
        already_notified = set()
        already_notified.add(current_user.id)  # canceler never notifies themselves

        # 1) Owner (priority #1) — only if admin cancels someone else's booking
        owner_notify_id = booking.user_id if (is_admin and not is_owner) else None
        if owner_notify_id and owner_notify_id not in already_notified:
            already_notified.add(owner_notify_id)
        else:
            owner_notify_id = None  # ป้องกัน double-notify ถ้า owner = canceler

        # 2) Admin user_ids (priority #2)
        admin_user_ids = {u.id for u in User.query.filter(
            or_(User.role_vehicle == 'admin', User.is_superadmin.is_(True))
        ).all()}
        admin_user_ids -= already_notified
        already_notified |= admin_user_ids

        # 3) Approver user_ids (priority #3) — only if booking went through approver flow
        approver_user_ids = set()
        if booking.trip_department_id and prev_status in ('waiting_approver', 'approved'):
            apv_rows = DeptApprover.query.filter_by(
                dept_id=booking.trip_department_id).all()
            approver_user_ids = {r.user_id for r in apv_rows} - already_notified
            already_notified |= approver_user_ids

        # 4) Driver-as-user (priority #4) — if driver.user_id linked
        driver_user_id = None
        if booking.driver_id and booking.driver and booking.driver.user_id:
            cand = booking.driver.user_id
            if cand not in already_notified:
                driver_user_id = cand
                already_notified.add(cand)

        # 5) Trip mates (priority #5) — other user_ids in same trip_group
        trip_mate_user_ids = set()
        if booking.trip_group:
            mate_rows = VehicleBooking.query.filter(
                VehicleBooking.trip_group == booking.trip_group,
                VehicleBooking.id != booking.id,
            ).all()
            trip_mate_user_ids = {m.user_id for m in mate_rows if m.user_id} - already_notified
            already_notified |= trip_mate_user_ids

        # ── Notify (in-app) — ลำดับตาม priority
        if owner_notify_id:
            _n_user_cancelled(user_id=owner_notify_id, booking=booking,
                              cancelled_by=current_user, role_label='owner')

        for uid in admin_user_ids:
            _n_user_cancelled(user_id=uid, booking=booking,
                              cancelled_by=current_user, role_label='admin')

        for uid in approver_user_ids:
            _n_user_cancelled(user_id=uid, booking=booking,
                              cancelled_by=current_user, role_label='approver')

        if driver_user_id:
            _n_user_cancelled(user_id=driver_user_id, booking=booking,
                              cancelled_by=current_user, role_label='driver')

        for uid in trip_mate_user_ids:
            _n_user_cancelled(user_id=uid, booking=booking,
                              cancelled_by=current_user, role_label='mate')

        # ── Soft cancel — flip status, row kept
        booking.status = 'cancelled'
        booking.updated_by = current_user.id

        # ── Telegram — delete old (approved/assigned msg) + send cancel
        # Pattern matches approve_booking — let exception abort txn (consistent w/ project convention)
        tg_notify_cancelled(booking, current_user)

        db.session.commit()

        if refunds:
            flash(f'ยกเลิกการจอง #{booking_id} เรียบร้อย · คืนงบ {len(refunds)} รายการ', 'success')
        else:
            flash(f'ยกเลิกการจอง #{booking_id} เรียบร้อย', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'ยกเลิกไม่สำเร็จ: {e}', 'danger')

    return redirect(url_for('vehicle.index'))


# ─────────────────────────────────────────────
# รายละเอียดทริป
# ─────────────────────────────────────────────

@vehicle_bp.route('/vehicle/detail/<int:booking_id>')
@login_required
def detail_booking(booking_id):
    booking = VehicleBooking.query.get_or_404(booking_id)

    _is_dept_approver = DeptApprover.query.filter_by(
        user_id=current_user.id, dept_id=booking.trip_department_id
    ).first() is not None
    if (not is_vehicle_admin()
            and not _is_dept_approver
            and not current_user.is_superadmin
            and current_user.id != booking.user_id):
        flash('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้', 'danger')
        return redirect(url_for('vehicle.index'))

    drivers = Driver.query.filter_by(is_active=True).all()
    return render_template('vehicle/vehicle_detail.html',
                           booking=booking, drivers=drivers,
                           is_dept_approver=_is_dept_approver)


# ─────────────────────────────────────────────
# Approver Inbox
# ─────────────────────────────────────────────

@vehicle_bp.route('/vehicle/approver')
@login_required
def approver_inbox():
    my_rows = DeptApprover.query.filter_by(user_id=current_user.id).all()
    if not my_rows and not current_user.is_superadmin:
        flash('คุณไม่มีสิทธิ์เข้าถึงหน้านี้', 'danger')
        return redirect(url_for('vehicle.index'))

    my_dept_ids = [r.dept_id for r in my_rows]

    pending = (VehicleBooking.query
               .filter(
                   VehicleBooking.status == 'waiting_approver',
                   VehicleBooking.trip_department_id.in_(my_dept_ids)
               )
               .order_by(VehicleBooking.start_datetime.asc())
               .all())

    history = (VehicleBooking.query
               .filter(
                   VehicleBooking.status.in_(['approved', 'rejected']),
                   VehicleBooking.trip_department_id.in_(my_dept_ids),
                   VehicleBooking.updated_by == current_user.id
               )
               .order_by(VehicleBooking.updated_at.desc())
               .limit(20)
               .all())

    from models import get_bkk_time
    today = get_bkk_time().date()
    budgets = (VehicleBudget.query
               .filter(
                   VehicleBudget.approver_id == current_user.id,
                   VehicleBudget.year == today.year,
                   VehicleBudget.month == today.month
               )
               .all())

    return render_template('vehicle/approver_inbox.html',
                           pending=pending, history=history,
                           budgets=budgets,
                           active_menu='approver')


# ─────────────────────────────────────────────
# API ปฏิทิน
# ─────────────────────────────────────────────

@vehicle_bp.route('/api/vehicle/bookings')
@login_required
def api_bookings():
    bookings = VehicleBooking.query.filter(
        VehicleBooking.status.in_(['pending', 'waiting_approver', 'approved']),
        VehicleBooking.is_ad_hoc == False
    ).all()

    events = []
    for b in bookings:
        color = '#198754' if b.status == 'approved' else ('#0dcaf0' if b.status == 'waiting_approver' else '#ffc107')
        vehicle_label = f"{b.assigned_vehicle.brand} {b.assigned_vehicle.model}" if b.assigned_vehicle else "รอกำหนดรถ"
        events.append({
            'id':    b.id,
            'title': f"{b.destination} ({b.user.full_name or b.user.username})",
            'start': b.start_datetime.isoformat() if b.start_datetime else None,
            'end':   b.end_datetime.isoformat()   if b.end_datetime   else None,
            'color': color,
            'url':   url_for('vehicle.detail_booking', booking_id=b.id)
        })
    return jsonify(events)



@vehicle_bp.route('/api/custom-bookings')
@login_required
def custom_bookings():
    bookings = VehicleBooking.query.filter(
        VehicleBooking.status.in_(['pending', 'waiting_approver', 'approved']),
        VehicleBooking.is_ad_hoc == False
    ).all()

    events = []
    for b in bookings:
        color = '#198754' if b.status == 'approved' else ('#0dcaf0' if b.status == 'waiting_approver' else '#ffc107')
        vehicle_label = f"{b.assigned_vehicle.brand} {b.assigned_vehicle.model}" if b.assigned_vehicle else "รอกำหนดรถ"
        events.append({
            'id':       b.id,
            'booker':   b.user.full_name or b.user.username,
            'title':    b.destination,
            'start':    b.start_datetime.isoformat() if b.start_datetime else None,
            'end':      b.end_datetime.isoformat()   if b.end_datetime   else None,
            'dest':     b.destination,
            'pax':      b.passenger_count,
            'booker':   b.user.full_name or b.user.username,
            'status':   b.status,
            'url':   url_for('vehicle.detail_booking', booking_id=b.id),
        })
    return jsonify(events)
# ─────────────────────────────────────────────
# Budget lookup helper — ใช้ใน approve_booking เพื่อ check is_active
# ─────────────────────────────────────────────

@vehicle_bp.route('/vehicle/approve/<int:booking_id>', methods=['POST'])
@login_required
def approve_booking(booking_id):
    booking   = VehicleBooking.query.get_or_404(booking_id)
    action    = request.form.get('action')
    driver_id = request.form.get('driver_id')

    acted_as_approver = False
    try:
        if is_vehicle_admin() and booking.status == 'pending':
            if action == 'approve':
                # Block ถ้าไม่มีงบ active ที่ช่วงเวลาครอบวันเดินทางนี้
                _bgt, _kl = _lookup_budget_for_booking(booking)
                if _bgt is None:
                    flash(
                        'อนุมัติไม่ได้ — ไม่มีงบที่เปิดใช้ครอบวันเดินทางนี้'
                        + (f' (หมวด {_kl})' if _kl else '')
                        + ' — กรุณาตั้งงบหรือเพิ่มเวลาช่วงงบที่หน้าจัดการงบประมาณก่อน',
                        'danger'
                    )
                    return redirect(url_for('vehicle.detail_booking', booking_id=booking.id))
                if driver_id: booking.driver_id = driver_id
                if booking.expense_type == 'department':
                    if booking.trip_department_id is None:
                        dept_name = booking.trip_department or booking.user.department
                        if dept_name:
                            dept = VehicleDepartment.query.filter_by(name=dept_name).first()
                            if dept:
                                booking.trip_department_id = dept.id
                    booking.status = 'waiting_approver'
                    db.session.flush()
                    notify_forwarded_to_approver(booking)    # Telegram
                    _n_forwarded(booking)                    # In-app Event #4
                    db.session.commit()
                    flash(f'อนุมัติแล้ว — รอผู้ประสานงานแผนก {booking.user.department} ยืนยัน', 'info')
                else:
                    booking.status = 'approved'
                    db.session.flush()
                    notify_approved(booking)                 # Telegram
                    _n_admin_approved(booking)               # In-app Event #3
                    db.session.commit()
                    flash('อนุมัติการจองรถเรียบร้อย', 'success')
            elif action == 'reject':
                booking.status = 'rejected'
                booking.reject_reason = request.form.get('reject_reason', '').strip() or None
                db.session.flush()
                # คืนงบถ้า mileage เคยปิด+หักไปแล้ว (no-op ถ้ายังไม่เคยหัก)
                budget_svc.refund_for_booking(
                    booking,
                    note=f'reject by admin {current_user.username}: {booking.reject_reason or "—"}',
                )
                notify_rejected(booking, current_user)       # Telegram
                _n_rejected(booking, current_user, by_approver=False)  # In-app Event #6
                db.session.commit()
                flash('ไม่อนุมัติการจองรถ', 'danger')

        elif DeptApprover.query.filter_by(user_id=current_user.id).first():
            acted_as_approver = True
            if booking.status != 'waiting_approver':
                flash('รายการนี้ไม่ได้อยู่ในสถานะรอคุณอนุมัติ', 'warning')
                return redirect(url_for('vehicle.approver_inbox'))

            my_dept_ids = [r.dept_id for r in DeptApprover.query.filter_by(user_id=current_user.id).all()]
            if booking.trip_department_id not in my_dept_ids:
                flash('คุณสามารถอนุมัติได้เฉพาะแผนกที่คุณรับผิดชอบเท่านั้น', 'danger')
                return redirect(url_for('vehicle.approver_inbox'))

            if action == 'approve':
                # Block ถ้าไม่มีงบ active ที่ช่วงเวลาครอบวันเดินทางนี้ (approver path)
                _bgt, _kl = _lookup_budget_for_booking(booking)
                if _bgt is None:
                    flash(
                        'อนุมัติไม่ได้ — ไม่มีงบที่เปิดใช้ครอบวันเดินทางนี้'
                        + (f' (หมวด {_kl})' if _kl else '')
                        + ' — กรุณาตั้งงบหรือเพิ่มเวลาช่วงงบที่หน้าจัดการงบประมาณก่อน',
                        'danger'
                    )
                    return redirect(url_for('vehicle.approver_inbox'))
                booking.status = 'approved'
                booking.updated_by = current_user.id
                db.session.flush()
                notify_approver_approved(booking, current_user)   # Telegram
                _n_approver_approved(booking, current_user)       # In-app Event #5
                db.session.commit()
                flash('อนุมัติการเดินทางเรียบร้อยแล้ว', 'success')
            elif action == 'reject':
                booking.status = 'rejected'
                booking.updated_by = current_user.id
                booking.reject_reason = request.form.get('reject_reason', '').strip() or None
                db.session.flush()
                # คืนงบถ้า mileage เคยปิด+หักไปแล้ว (no-op ถ้ายังไม่เคยหัก)
                budget_svc.refund_for_booking(
                    booking,
                    note=f'reject by approver {current_user.username}: {booking.reject_reason or "—"}',
                )
                notify_rejected(booking, current_user)            # Telegram
                _n_rejected(booking, current_user, by_approver=True)  # In-app Event #6
                db.session.commit()
                flash('ปฏิเสธการเดินทางนี้แล้ว', 'danger')
        else:
            flash('คุณไม่มีสิทธิ์ทำรายการนี้', 'danger')
    except Exception as e:
        db.session.rollback()
        flash(f'เกิดข้อผิดพลาด: {str(e)}', 'danger')

    if acted_as_approver:
        return redirect(url_for('vehicle.approver_inbox'))
    return redirect(url_for('vehicle.detail_booking', booking_id=booking.id))


# ─────────────────────────────────────────────
# Notifications API
# ─────────────────────────────────────────────
