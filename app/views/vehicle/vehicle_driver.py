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


@driver_bp.route('/driver')
@login_required
def driver_home():
    # หา Driver record ที่ผูกกับ user นี้
    driver = Driver.query.filter_by(user_id=current_user.id).first()
    if not driver:
        flash('บัญชีของคุณยังไม่ได้ผูกกับพนักงานขับรถ กรุณาติดต่อ Admin', 'warning')
        return redirect(url_for('vehicle.index'))

    # ดึงทริปที่ approved และคนขับคือตัวเอง
    bookings = VehicleBooking.query.filter(
        VehicleBooking.status == 'approved',
        VehicleBooking.driver_id == driver.id
    ).order_by(VehicleBooking.start_datetime.desc()).all()

    today_start    = get_bkk_time().replace(hour=0,  minute=0,  second=0,  microsecond=0)
    today_end      = get_bkk_time().replace(hour=23, minute=59, second=59, microsecond=0)
    tomorrow_start = today_start + timedelta(days=1)
    tomorrow_end   = today_end   + timedelta(days=1)

    # สำหรับ modal "งานนอกระบบ" + dropdown เปลี่ยนรถฉุกเฉิน
    vehicles = Vehicle.query.filter_by(status='active').order_by(Vehicle.id).all()
    users    = User.query.order_by(User.full_name).all()

    # เลขไมล์ล่าสุดต่อรถ — MAX(odometer_end | odometer_start) จากทุกทริปของรถคันนั้น
    odo_rows = (db.session.query(
                    VehicleBooking.assigned_vehicle_id,
                    func.max(func.coalesce(VehicleMileage.odometer_end, VehicleMileage.odometer_start)))
                .join(VehicleMileage, VehicleMileage.booking_id == VehicleBooking.id)
                .filter(VehicleBooking.assigned_vehicle_id.isnot(None))
                .group_by(VehicleBooking.assigned_vehicle_id)
                .all())
    latest_odo = {vid: odo for vid, odo in odo_rows if odo is not None}

    return render_template('vehicle/vehicle_driver.html',
                           driver=driver,
                           bookings=bookings,
                           today_start=today_start,
                           today_end=today_end,
                           tomorrow_start=tomorrow_start,
                           tomorrow_end=tomorrow_end,
                           vehicles=vehicles,
                           users=users,
                           latest_odo=latest_odo)


# ─────────────────────────────────────────────
# งานนอกระบบ — driver สร้าง booking เอง (ad-hoc)
# auto-status=approved, driver_id=self, start=now
# end ตอนหลัง driver กรอกไมล์ขากลับ → จบงาน
# expense_type=NULL → admin มาเลือกที่หลัง
# is_ad_hoc=True → ซ่อนจากหน้าปฏิทิน /vehicle
# ─────────────────────────────────────────────

@driver_bp.route('/driver/ad-hoc-trip', methods=['POST'])
@login_required
def driver_ad_hoc_trip():
    driver = Driver.query.filter_by(user_id=current_user.id).first()
    if not driver:
        flash('ไม่พบข้อมูลคนขับ', 'danger')
        return redirect(url_for('driver.driver_home'))

    contact_user_id_raw = request.form.get('contact_user_id', '').strip()
    vehicle_id_raw      = request.form.get('vehicle_id', '').strip()
    purpose             = request.form.get('purpose', '').strip()
    destination         = request.form.get('destination', '').strip()
    odo_start_raw       = request.form.get('odometer_start', '').strip()

    if not vehicle_id_raw or not destination:
        flash('กรุณาเลือกรถและกรอกสถานที่เดินทางไป', 'warning')
        return redirect(url_for('driver.driver_home'))

    # strict — ผู้จองต้องเป็น user ในระบบ (autocompleteselect)
    if not contact_user_id_raw:
        flash('กรุณาเลือกผู้จอง', 'warning')
        return redirect(url_for('driver.driver_home'))

    vehicle = Vehicle.query.get(int(vehicle_id_raw))
    if not vehicle:
        flash('ไม่พบรถที่เลือก', 'danger')
        return redirect(url_for('driver.driver_home'))

    now = get_bkk_time()
    end_placeholder = now.replace(hour=23, minute=59, second=0, microsecond=0)

    booking = VehicleBooking(
        user_id             = int(contact_user_id_raw),
        start_datetime      = now,
        end_datetime        = end_placeholder,
        destination         = destination,
        purpose             = purpose or 'งานนอกระบบ',
        passenger_count     = 1,
        need_driver         = True,
        driver_id           = driver.id,
        assigned_vehicle_id = vehicle.id,
        status              = 'approved',
        is_ad_hoc           = True,
        snap_vehicle_plate  = vehicle.license_plate,
        snap_driver_name    = driver.name,
    )
    db.session.add(booking)
    db.session.flush()
    _n_booking_created(booking)   # แจ้ง admin → มาเลือก expense_type ที่หลัง

    # บันทึกเลขไมล์ออกทันที (ad-hoc = ออกรถเลย) — สร้าง VehicleMileage start record
    mileage = None
    if odo_start_raw:
        mileage = VehicleMileage(
            booking_id     = booking.id,
            odometer_start = int(odo_start_raw),
            actual_start   = now,
            noted_by       = current_user.id,
        )
        img = request.files.get('odometer_start_img')
        if img and img.filename:
            upload_folder = os.path.join('static', 'uploads', 'mileage')
            os.makedirs(upload_folder, exist_ok=True)
            fname = f"{int(time.time())}_start_{secure_filename(img.filename)}"
            img.save(os.path.join(upload_folder, fname))
            mileage.odometer_start_img = fname
        db.session.add(mileage)
        db.session.flush()
        _n_mileage_start(booking, mileage)   # Event #8

    db.session.commit()

    if mileage:
        flash(f'สร้างงานนอกระบบ + บันทึกเลขไมล์ออกเรียบร้อย (BK-{booking.id:04d})', 'success')
    else:
        flash(f'สร้างงานนอกระบบเรียบร้อย (BK-{booking.id:04d}) ไปบันทึกเลขไมล์ออกในการ์ดได้เลย', 'success')
    return redirect(url_for('driver.driver_home'))



# ─────────────────────────────────────────────
# เปลี่ยนรถฉุกเฉิน — driver swap รถก่อนออกเท่านั้น (ยังไม่บันทึกไมล์ออก)
# เช็ก: รถ active + ไม่ชนคิว booking approved ช่วงเวลาทับ
# ─────────────────────────────────────────────
@driver_bp.route('/driver/change-vehicle', methods=['POST'])
@login_required
def driver_change_vehicle():
    driver = Driver.query.filter_by(user_id=current_user.id).first()
    if not driver:
        flash('ไม่พบข้อมูลคนขับ', 'danger')
        return redirect(url_for('driver.driver_home'))

    booking = VehicleBooking.query.get_or_404(int(request.form.get('booking_id')))
    if booking.driver_id != driver.id:
        flash('คุณไม่มีสิทธิ์แก้ทริปนี้', 'danger')
        return redirect(url_for('driver.driver_home'))

    # เปลี่ยนได้เฉพาะก่อนออก — ถ้าบันทึกไมล์ออกแล้ว block
    m = VehicleMileage.query.filter_by(booking_id=booking.id).first()
    if m and m.odometer_start is not None:
        flash('ออกรถไปแล้ว เปลี่ยนรถไม่ได้', 'warning')
        return redirect(url_for('driver.driver_home'))

    vehicle = Vehicle.query.get(int(request.form.get('vehicle_id', 0)))
    if not vehicle or vehicle.status != 'active':
        flash('รถที่เลือกไม่พร้อมใช้งาน', 'warning')
        return redirect(url_for('driver.driver_home'))

    if vehicle.id != booking.assigned_vehicle_id:
        # เช็คว่าง — ชนกับ booking approved คันเดียวกันที่เวลาทับ
        clash = VehicleBooking.query.filter(
            VehicleBooking.id != booking.id,
            VehicleBooking.assigned_vehicle_id == vehicle.id,
            VehicleBooking.status == 'approved',
            VehicleBooking.start_datetime < booking.end_datetime,
            VehicleBooking.end_datetime   > booking.start_datetime,
        ).first()
        if clash:
            flash(f'รถ {vehicle.license_plate} ถูกใช้งานช่วงเวลานี้แล้ว (BK-{clash.id:04d})', 'warning')
            return redirect(url_for('driver.driver_home'))

        booking.assigned_vehicle_id = vehicle.id
        booking.snap_vehicle_plate  = vehicle.license_plate
        db.session.commit()
        flash(f'เปลี่ยนรถเป็น {vehicle.license_plate} เรียบร้อย', 'success')

    return redirect(url_for('driver.driver_home'))


@driver_bp.route('/driver/mileage', methods=['POST'])
@login_required
def driver_mileage():
    driver = Driver.query.filter_by(user_id=current_user.id).first()
    if not driver:
        flash('ไม่พบข้อมูลคนขับ', 'danger')
        return redirect(url_for('driver.driver_home'))

    booking_id = int(request.form.get('booking_id'))
    booking    = VehicleBooking.query.get_or_404(booking_id)

    # ตรวจสอบว่าทริปนี้เป็นของคนขับคนนี้จริง
    if booking.driver_id != driver.id:
        flash('คุณไม่มีสิทธิ์บันทึกทริปนี้', 'danger')
        return redirect(url_for('driver.driver_home'))

    entry_type = request.form.get('entry_type')
    mileage    = VehicleMileage.query.filter_by(booking_id=booking_id).first()
    if not mileage:
        mileage = VehicleMileage(booking_id=booking_id, noted_by=current_user.id)
        db.session.add(mileage)

    upload_folder = os.path.join('static', 'uploads', 'mileage')
    os.makedirs(upload_folder, exist_ok=True)

    if entry_type == 'start':
        mileage.odometer_start = int(request.form.get('odometer_start', 0))
        mileage.actual_start   = datetime.strptime(request.form.get('actual_start'), '%Y-%m-%dT%H:%M')
        img = request.files.get('odometer_start_img')
        if img and img.filename:
            fname = f"{int(time.time())}_start_{secure_filename(img.filename)}"
            img.save(os.path.join(upload_folder, fname))
            mileage.odometer_start_img = fname
        db.session.flush()
        _n_mileage_start(booking, mileage)   # Event #8
        flash('บันทึกเลขไมล์ก่อนออกเรียบร้อย', 'success')

    elif entry_type == 'end':
        submitted_end_mileage = int(request.form.get('odometer_end', 0))
        # 🌟 เช็คว่าเลขไมล์ตอนจบ ต้องมากกว่าเลขไมล์ตอนเริ่ม
        # (ดักเผื่อกรณี mileage.odometer_start มีค่าอยู่แล้ว)
        if mileage.odometer_start is not None and submitted_end_mileage <= mileage.odometer_start:
            flash(f'❌ บันทึกไม่สำเร็จ! เลขไมล์ตอนจบ ({submitted_end_mileage}) ต้องมากกว่าเลขไมล์ตอนเริ่ม ({mileage.odometer_start})', 'danger')
            return redirect(url_for('driver.driver_home')) # เด้งกลับไปให้กรอกใหม่
        
        # ถ้าเลขไมล์ถูกต้อง ค่อยเอาไปใส่ใน object
        mileage.odometer_end = submitted_end_mileage
        mileage.actual_end   = datetime.strptime(request.form.get('actual_end'), '%Y-%m-%dT%H:%M')
        img = request.files.get('odometer_end_img')
        if img and img.filename:
            fname = f"{int(time.time())}_end_{secure_filename(img.filename)}"
            img.save(os.path.join(upload_folder, fname))
            mileage.odometer_end_img = fname
        mileage.refuel = True if request.form.get('refuel') else False
        if mileage.refuel:
            amt = request.form.get('refuel_amount', '').strip()
            if amt:
                mileage.refuel_amount = float(amt)
            ri = request.files.get('refuel_img')
            if ri and ri.filename:
                fname = f"{int(time.time())}_refuel_{secure_filename(ri.filename)}"
                ri.save(os.path.join(upload_folder, fname))
                mileage.refuel_img = fname
        flash('ปิดงานเรียบร้อย', 'success')

    # Event #9 — แจ้งเมื่อปิดงาน
    if entry_type == 'end':
        _n_mileage_end(booking, mileage)

    db.session.commit()

    # สร้าง OT record อัตโนมัติเมื่อปิดงาน
    if entry_type == 'end':
        auto_generate_ot(booking, mileage)

    # ── หักงบประมาณอัตโนมัติเมื่อปิดงาน + Events #10, #11, #12 ──
    if entry_type == 'end':
        m2       = VehicleMileage.query.filter_by(booking_id=booking_id).first()
        distance = (m2.odometer_end - m2.odometer_start) if (m2 and m2.odometer_end and m2.odometer_start) else None
        target_date = m2.actual_end.date() if (m2 and m2.actual_end) else get_bkk_time().date()
        fuel_price = FuelPrice.get_for_date(target_date) or float(SystemConfig.get('fuel_price', '40') or 40)

        if m2 and m2.fuel_cost and float(m2.fuel_cost) > 0:
            trip_cost = float(m2.fuel_cost)
        elif distance and booking.assigned_vehicle and booking.assigned_vehicle.fuel_rate:
            trip_cost = round((distance / float(booking.assigned_vehicle.fuel_rate)) * fuel_price, 2)
        else:
            trip_cost = 0

        # หัก central/department — ผ่าน BudgetService (ledger + idempotent)
        if booking.trip_department and booking.expense_type in ['central', 'department'] and trip_cost > 0:
            # หางบ active ที่ช่วงเวลาครอบวันปิดทริป (date-range lookup — helper เดียวกับ approve)
            budget, _key_label = _lookup_budget_for_booking(booking, on_date=target_date)
            if budget:
                budget_svc.deduct_for_mileage(
                    m2, budget, trip_cost,
                    snap={'distance': distance,
                          'fuel_rate': float(booking.assigned_vehicle.fuel_rate) if booking.assigned_vehicle else None,
                          'fuel_price': fuel_price},
                    note=f'driver_mileage booking #{booking.id}',
                )
            else:
                current_app.logger.warning(
                    '[budget-deduct skip] booking #%s (driver): ไม่พบงบ active ครอบวันปิดทริป '
                    '(expense_type=%s, key_label=%s, on_date=%s, trip_cost=%s)',
                    booking.id, booking.expense_type, _key_label, target_date, trip_cost,
                )
                flash(
                    f'⚠️ ปิดทริปแล้ว แต่ไม่ได้หักงบ '
                    f'(ไม่พบงบ {booking.expense_type} ของ "{_key_label or "—"}" '
                    f'ที่เปิดใช้ครอบวันที่ {target_date.strftime("%d/%m/%Y")})',
                    'warning'
                )
            _n_budget(booking, trip_cost, booking.expense_type)   # Event #10 / #11
            db.session.commit()
        elif booking.expense_type in ['central', 'department']:
            current_app.logger.warning(
                '[budget-deduct skip] booking #%s (driver): ข้ามการหักงบ '
                '(trip_department=%s, expense_type=%s, trip_cost=%s)',
                booking.id, booking.trip_department, booking.expense_type, trip_cost,
            )
            if trip_cost == 0:
                flash(
                    f'⚠️ ปิดทริปแล้ว แต่ไม่ได้หักงบ '
                    f'(trip_cost = 0 — ตรวจ fuel_cost หรือ vehicle.fuel_rate)',
                    'warning'
                )

        # ต้องจ่ายส่วนตัว
        elif booking.expense_type == 'personal' and trip_cost > 0:
            _n_payment_required(booking, m2, trip_cost)   # Event #12
            db.session.commit()

    return redirect(url_for('driver.driver_home'))


