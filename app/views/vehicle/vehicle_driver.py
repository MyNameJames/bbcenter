from flask import render_template, request, redirect, url_for, flash, session, current_app
from flask_login import login_required, current_user
from models import db, get_bkk_time, User, Vehicle, VehicleBooking, Driver, VehicleMileage
from sqlalchemy import func
from datetime import datetime, timedelta
from views.core.notification_service import (
    notify_booking_created      as _n_booking_created,
    notify_mileage_started      as _n_mileage_start,
    notify_mileage_ended        as _n_mileage_end,
)
import os, time
from werkzeug.utils import secure_filename
from views.vehicle.vehicle_common import (
    vehicle_bp, adminfleet_bp, admincost_bp, driver_bp,
    is_vehicle_admin,
)
import services.vehicle.mileage_service as mileage_svc


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
                           latest_odo=latest_odo,
                           distance_cap=mileage_svc.get_distance_cap_km())


# ─────────────────────────────────────────────
# งานนอกระบบ — driver สร้าง booking เอง (ad-hoc)
# auto-status=approved, driver_id=self, start=now
# end ตอนหลัง driver กรอกไมล์ขากลับ → จบงาน
# expense_type=NULL → admin มาเลือกที่หลัง
# is_ad_hoc=True → ซ่อนจากหน้าปฏิทิน /vehicle
# ─────────────────────────────────────────────

def _create_ad_hoc_booking(driver, contact_user_id, destination, purpose, vehicle):
    """สร้าง VehicleBooking แบบ ad-hoc (driver ออกงานนอกระบบ) (extract จาก driver_ad_hoc_trip
    ตอน Phase 5, logic เดิม 100%) — flush แต่ไม่ commit ให้ caller คุม transaction
    คืน (booking, now) — now ใช้ต่อเป็น actual_start ของ mileage"""
    now = get_bkk_time()
    end_placeholder = now.replace(hour=23, minute=59, second=0, microsecond=0)

    booking = VehicleBooking(
        user_id             = contact_user_id,
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
    return booking, now


def _create_ad_hoc_mileage_start(booking, odo_start_raw, now):
    """บันทึกเลขไมล์ออกทันที (ad-hoc = ออกรถเลย) — สร้าง VehicleMileage start record
    (extract จาก driver_ad_hoc_trip ตอน Phase 5, logic เดิม 100%)
    คืน mileage หรือ None ถ้าไม่ได้กรอกเลขไมล์"""
    if not odo_start_raw:
        return None
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
    return mileage


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

    booking, now = _create_ad_hoc_booking(driver, int(contact_user_id_raw), destination, purpose, vehicle)
    mileage = _create_ad_hoc_mileage_start(booking, odo_start_raw, now)
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


def _driver_handle_start(booking, mileage, upload_folder):
    mileage.odometer_start = int(request.form.get('odometer_start', 0))
    mileage.actual_start   = datetime.strptime(request.form.get('actual_start'), '%Y-%m-%dT%H:%M')
    img = request.files.get('odometer_start_img')
    if img and img.filename:
        fname = f"{int(time.time())}_start_{secure_filename(img.filename)}"
        img.save(os.path.join(upload_folder, fname))
        mileage.odometer_start_img = fname
    db.session.flush()
    stale_msgs = mileage_svc.auto_close_stale_trips(
        booking.assigned_vehicle_id, mileage.odometer_start, mileage.actual_start,
        booking.id, actor_id=current_user.id)
    for msg, cat in stale_msgs:
        flash(msg, cat)
    _n_mileage_start(booking, mileage)
    flash('บันทึกเลขไมล์ก่อนออกเรียบร้อย', 'success')


def _driver_handle_end(booking, mileage, upload_folder):
    submitted_end = int(request.form.get('odometer_end', 0))
    if mileage.odometer_start is not None and submitted_end <= mileage.odometer_start:
        flash(
            f'❌ บันทึกไม่สำเร็จ! เลขไมล์ตอนจบ ({submitted_end}) '
            f'ต้องมากกว่าเลขไมล์ตอนเริ่ม ({mileage.odometer_start})',
            'danger',
        )
        return False
    # REQ-3 (Phase 3.5, 2026-07-19): เพดานระยะทาง — confirm ผ่านได้ ไม่ hard block (ตกลง
    # กับเจ้าของโปรเจกต์) — JS ถาม confirm() ก่อนแล้วเซ็ต confirm_distance=1 ให้ปกติ เกิด
    # ที่นี่เฉพาะกรณี JS ถูกข้าม/ปิดไป (safety net)
    if mileage.odometer_start is not None:
        distance = submitted_end - mileage.odometer_start
        cap = mileage_svc.get_distance_cap_km()
        if distance > cap and request.form.get('confirm_distance') != '1':
            flash(
                f'⚠️ ระยะทาง {distance:,} กม. เกินเพดานปกติ ({cap:,.0f} กม.) — '
                f'กรุณาตรวจสอบเลขไมล์แล้วยืนยันอีกครั้งถ้าถูกต้อง',
                'warning',
            )
            return False
    mileage.odometer_end = submitted_end
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
    return True



@driver_bp.route('/driver/mileage', methods=['POST'])
@login_required
def driver_mileage():
    driver = Driver.query.filter_by(user_id=current_user.id).first()
    if not driver:
        flash('ไม่พบข้อมูลคนขับ', 'danger')
        return redirect(url_for('driver.driver_home'))

    booking_id = int(request.form.get('booking_id'))
    booking    = VehicleBooking.query.get_or_404(booking_id)

    if booking.driver_id != driver.id:
        flash('คุณไม่มีสิทธิ์บันทึกทริปนี้', 'danger')
        return redirect(url_for('driver.driver_home'))

    entry_type    = request.form.get('entry_type')
    mileage       = VehicleMileage.query.filter_by(booking_id=booking_id).first()
    upload_folder = os.path.join('static', 'uploads', 'mileage')
    os.makedirs(upload_folder, exist_ok=True)

    if not mileage:
        mileage = VehicleMileage(booking_id=booking_id, noted_by=current_user.id)
        db.session.add(mileage)

    if entry_type == 'start':
        _driver_handle_start(booking, mileage, upload_folder)
    elif entry_type == 'end':
        if not _driver_handle_end(booking, mileage, upload_folder):
            return redirect(url_for('driver.driver_home'))
        _n_mileage_end(booking, mileage)

    db.session.commit()

    if entry_type == 'end':
        # notify_ot_created อยู่ใน auto_generate_ot() แล้ว (Phase 4, 2026-07-19)
        mileage_svc.auto_generate_ot(booking, mileage, actor_id=current_user.id)
        m2 = VehicleMileage.query.filter_by(booking_id=booking_id).first()
        result = mileage_svc.close_trip(booking, m2, source='driver_mileage')
        for msg, cat in result['flash_messages']:
            flash(msg, cat)

    return redirect(url_for('driver.driver_home'))


