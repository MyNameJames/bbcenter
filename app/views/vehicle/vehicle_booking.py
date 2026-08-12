from flask import render_template, request, redirect, url_for, flash, jsonify, session, current_app
from flask_login import login_required, current_user
from models import (db, get_bkk_time, Vehicle, VehicleBooking, Driver,
                    VehicleBudget, DeptApprover, OTRateConfig)
from datetime import datetime, date
from components import DateField, TimeRangeField, KPI
from views.core.notification_service import (
    notify_booking_created      as _n_booking_created,
    notify_admin_deleted        as _n_admin_deleted,
)
from views.vehicle.vehicle_common import (
    vehicle_bp, adminfleet_bp, admincost_bp, driver_bp,
    is_vehicle_admin,
    EXPENSE_CATEGORIES, TH_MONTHS, _fmt_date_th,
    get_fuel_price, calc_fuel_cost,
)
import services.vehicle.booking_service as booking_svc


@vehicle_bp.route('/vehicle')
@login_required
def index():
    # ad-hoc (driver-created off-the-books) ซ่อนจากปฏิทินผู้ใช้
    bookings  = (VehicleBooking.query
                 .filter(VehicleBooking.is_ad_hoc == False)
                 .order_by(VehicleBooking.created_at.desc()).all())
    vehicles  = Vehicle.query.filter_by(status='active').order_by(Vehicle.id).all()
    drivers   = Driver.query.filter_by(is_active=True).order_by(Driver.id).all()
    # OT rate config → ใช้คำนวณคำเตือนค่าล่วงเวลาสารถีใน booking modal (frontend)
    ot_rates  = [
        {'label': c.label, 'start': c.start_time, 'end': c.end_time,
         'rate': float(c.rate), 'dow': c.day_of_week}
        for c in OTRateConfig.query.filter_by(is_active=True)
                                   .order_by(OTRateConfig.sort_order).all()
    ]
    date_field = DateField('date', label='วันที่เดินทาง :',
                            placeholder='เลือกวันที่เดินทาง', id='bk_date_field')
    time_range_field = TimeRangeField(start='08:00', end='17:00', step=15,
                                       label='ช่วงเวลาเดินทาง', show_duration=True,
                                       id='bk_timerange_field')
    return render_template(
        'vehicle/vehicle.html',
        bookings=bookings,
        vehicles=vehicles,
        drivers=drivers,
        ot_rates=ot_rates,
        expense_categories=EXPENSE_CATEGORIES,
        total_vehicles=len(vehicles),
        page_section='บริการ',
        page_title='ปฏิทินการจองรถ',
        # Phase 9 (2026-05-22) — `canCancel` gating needs admin + now
        now=get_bkk_time(),
        is_vehicle_admin=is_vehicle_admin(),
        date_field=date_field,
        time_range_field=time_range_field,
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
        note             = request.form.get('note', '').strip()

        if start_dt < get_bkk_time():
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
            note            = note or None,
        )
        db.session.add(new_booking)
        db.session.flush()
        _n_booking_created(new_booking)
        db.session.commit()
        flash(f'ส่งคำขอจองรถเรียบร้อยแล้ว (#{ new_booking.id }) รอ Admin พิจารณา', 'success')
    except Exception:
        db.session.rollback()
        current_app.logger.exception('book_vehicle_simple failed')
        flash('เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง', 'danger')

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
            booking.note            = request.form.get('note', '').strip() or None

            db.session.commit()
            flash('อัปเดตข้อมูลการจองเรียบร้อยแล้ว', 'success')
            return redirect(url_for('vehicle.index'))
        except Exception:
            db.session.rollback()
            current_app.logger.exception('edit_booking failed')
            flash('เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง', 'danger')

    start_str = booking.start_datetime.strftime('%Y-%m-%dT%H:%M')
    end_str   = booking.end_datetime.strftime('%Y-%m-%dT%H:%M')
    return render_template('vehicle/vehicle_edit.html', booking=booking, start_str=start_str, end_str=end_str)


# ─────────────────────────────────────────────
# Admin แก้ไขการจอง (AJAX)
# ─────────────────────────────────────────────

@vehicle_bp.route('/vehicle/admin/edit/<int:booking_id>', methods=['POST'])
@login_required
def admin_edit_booking(booking_id):
    if not is_vehicle_admin():
        return jsonify({'ok': False, 'msg': 'ไม่มีสิทธิ์'}), 403
    booking = VehicleBooking.query.get_or_404(booking_id)
    if booking.status in ('in_progress', 'completed', 'cancelled'):
        return jsonify({'ok': False, 'msg': f'ไม่สามารถแก้ไขได้ (สถานะ: {booking.status})'}), 400
    try:
        start_str = request.form.get('start_datetime', '').strip()
        end_str   = request.form.get('end_datetime',   '').strip()
        if start_str:
            booking.start_datetime = datetime.strptime(start_str, '%Y-%m-%dT%H:%M')
        if end_str:
            booking.end_datetime = datetime.strptime(end_str, '%Y-%m-%dT%H:%M')
        if booking.start_datetime >= booking.end_datetime:
            return jsonify({'ok': False, 'msg': 'วันเริ่มต้นต้องก่อนวันสิ้นสุด'}), 400
        booking.destination     = request.form.get('destination', booking.destination)
        booking.purpose         = request.form.get('purpose',     booking.purpose)
        pax = request.form.get('passenger_count', '').strip()
        if pax:
            booking.passenger_count = int(pax)
        booking.pickup_location = request.form.get('pickup_location', '').strip() or None
        booking.note            = request.form.get('note', '').strip() or None
        db.session.commit()
        return jsonify({'ok': True, 'msg': 'อัปเดตข้อมูลการจองแล้ว'})
    except Exception:
        db.session.rollback()
        current_app.logger.exception('admin_edit_booking failed')
        return jsonify({'ok': False, 'msg': 'เกิดข้อผิดพลาด กรุณาลองใหม่'}), 500


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

    # ห้ามลบถ้ามีการหักงบแล้ว (ป้องกัน ledger ชี้ row ที่หายไป)
    if any(m.budget_deducted_at for m in booking.mileage):
        flash('ไม่สามารถลบการจองที่หักงบแล้ว — ติดต่อ Admin หากต้องการยกเลิก', 'warning')
        return redirect(url_for('vehicle.index'))

    try:
        # ถ้า admin ลบของคนอื่น → แจ้งเตือน user (Event #15)
        should_notify = is_vehicle_admin() and current_user.id != booking.user_id
        snap = (booking.id, booking.user_id, booking.destination)

        db.session.delete(booking)
        db.session.flush()
        if should_notify:
            _n_admin_deleted(snap[0], snap[1], snap[2], current_user)
        db.session.commit()
        flash('ยกเลิกและลบรายการจองเรียบร้อยแล้ว', 'success')
    except Exception:
        db.session.rollback()
        current_app.logger.exception('delete_booking failed')
        flash('ลบรายการไม่สำเร็จ เกิดข้อผิดพลาดภายในระบบ', 'danger')

    return redirect(url_for('vehicle.index'))


# ─────────────────────────────────────────────
# Phase 9 (2026-05-22) — Cancel booking (soft, status='cancelled')
# C1: User+Admin can cancel pending/waiting_approver/approved bookings
# Time guard: must be BEFORE booking.start_datetime
# ─────────────────────────────────────────────

@vehicle_bp.route('/vehicle/cancel/<int:booking_id>', methods=['POST'])
@login_required
def cancel_booking(booking_id):
    booking  = VehicleBooking.query.get_or_404(booking_id)
    is_owner = (current_user.id == booking.user_id)
    is_admin = is_vehicle_admin()

    if not (is_owner or is_admin):
        flash('คุณไม่มีสิทธิ์ยกเลิกการจองนี้', 'danger')
        return redirect(url_for('vehicle.index'))

    try:
        # notify (in-app owner/admin/approver/driver/trip-mate + Telegram) อยู่ใน
        # booking_svc.cancel() แล้ว (Phase 4, 2026-07-19 — เดิม build recipients + ส่งเองตรงนี้)
        ok, msg, info = booking_svc.cancel(booking, actor_id=current_user.id,
                                           is_owner=is_owner, is_admin=is_admin)
        if not ok:
            flash(msg, 'warning')
            return redirect(url_for('vehicle.detail_booking', booking_id=booking_id))

        db.session.commit()
        flash(f'ยกเลิกการจอง #{booking_id} เรียบร้อย', 'success')
    except Exception:
        db.session.rollback()
        current_app.logger.exception('cancel_booking failed')
        flash('ยกเลิกไม่สำเร็จ เกิดข้อผิดพลาดภายในระบบ', 'danger')

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

    # detail page ถูกลบ (2026-06-07) → redirect ไปปฏิทิน + เปิด detail modal ผ่าน ?detail=
    return redirect(url_for('vehicle.index', detail=booking_id))


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

    today = get_bkk_time().date()
    # งบช่วงเวลา (active period) — year/month เป็น anchor เลิกใช้กรองตรงๆ
    # ต้องกรอง is_active + start_date<=today<=end_date (mirror _lookup_budget_for_booking)
    budgets = (VehicleBudget.query
               .filter(
                   VehicleBudget.approver_id == current_user.id,
                   VehicleBudget.is_active.is_(True),
                   VehicleBudget.start_date.isnot(None),
                   VehicleBudget.end_date.isnot(None),
                   VehicleBudget.start_date <= today,
                   VehicleBudget.end_date >= today,
               )
               .all())

    budget_kpis = [{
        'name': b.department.name,
        'kpis': [
            KPI('งบทั้งหมด', f'฿{float(b.budget_amount):,.0f}'),
            KPI('ใช้ไปแล้ว', f'฿{float(b.used_amount):,.0f}'),
            KPI('คงเหลือ', f'฿{float(b.remaining):,.0f}'),
        ],
    } for b in budgets]

    fuel_costs = {}
    for bk in (pending + history):
        m = bk.mileage[0] if bk.mileage else None
        if m and m.odometer_start is not None and m.odometer_end is not None:
            distance = m.odometer_end - m.odometer_start
            fp = get_fuel_price(bk.start_datetime.date())
            fuel_costs[bk.id] = calc_fuel_cost(bk.assigned_vehicle, distance, fp, m.fuel_cost)
        else:
            fuel_costs[bk.id] = 0

    return render_template('vehicle/vehicle_approver.html',
                           pending=pending, history=history,
                           budgets=budgets, budget_kpis=budget_kpis,
                           fuel_costs=fuel_costs,
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
                # notify (Event #3/#4) อยู่ใน approve_from_pending() แล้ว (Phase 4, 2026-07-19)
                # Telegram: manual-only ตามปุ่มแจ้งเตือน (ยึด pattern admin_assign, 2026-06-07)
                ok, msg = booking_svc.approve_from_pending(booking, driver_id=driver_id)
                if not ok:
                    flash(msg, 'danger')
                    return redirect(url_for('vehicle.detail_booking', booking_id=booking.id))
                if booking.status == 'waiting_approver':
                    flash(f'อนุมัติแล้ว — รอผู้ประสานงานแผนก {booking.user.department} ยืนยัน', 'info')
                else:
                    flash('อนุมัติการจองรถเรียบร้อย', 'success')
                db.session.commit()
            elif action == 'reject':
                # notify (Event #6) อยู่ใน reject_from_pending() แล้ว (Phase 4, 2026-07-19)
                ok, msg = booking_svc.reject_from_pending(
                    booking, reason=request.form.get('reject_reason', '').strip() or None)
                if not ok:
                    flash(msg, 'danger')
                    return redirect(url_for('vehicle.detail_booking', booking_id=booking.id))
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
                # notify (Event #5) อยู่ใน approver_approve() แล้ว (Phase 4, 2026-07-19)
                ok, msg = booking_svc.approver_approve(booking, actor_id=current_user.id)
                if not ok:
                    flash(msg, 'danger')
                    return redirect(url_for('vehicle.approver_inbox'))
                db.session.commit()
                flash('อนุมัติการเดินทางเรียบร้อยแล้ว', 'success')
            elif action == 'reject':
                # notify (Event #6) อยู่ใน approver_reject() แล้ว (Phase 4, 2026-07-19)
                ok, msg = booking_svc.approver_reject(
                    booking, actor_id=current_user.id,
                    reason=request.form.get('reject_reason', '').strip() or None)
                if not ok:
                    flash(msg, 'danger')
                    return redirect(url_for('vehicle.approver_inbox'))
                db.session.commit()
                flash('ปฏิเสธการเดินทางนี้แล้ว', 'danger')
        else:
            flash('คุณไม่มีสิทธิ์ทำรายการนี้', 'danger')
    except Exception:
        db.session.rollback()
        current_app.logger.exception('approve_booking failed')
        flash('เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง', 'danger')

    if acted_as_approver:
        return redirect(url_for('vehicle.approver_inbox'))
    return redirect(url_for('vehicle.detail_booking', booking_id=booking.id))


# ─────────────────────────────────────────────
# Notifications API
# ─────────────────────────────────────────────
