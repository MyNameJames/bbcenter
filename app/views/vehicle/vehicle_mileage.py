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


@vehicle_bp.route('/vehicle/mileage', methods=['GET', 'POST'])
@login_required
def mileage_log():
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์เข้าหน้านี้', 'danger')
        return redirect(url_for('vehicle.index'))

    if request.method == 'POST':
        booking_id = int(request.form.get('booking_id'))
        booking    = VehicleBooking.query.get_or_404(booking_id)
        entry_type = request.form.get('entry_type')

        mileage = VehicleMileage.query.filter_by(booking_id=booking_id).first()
        if not mileage:
            mileage = VehicleMileage(booking_id=booking_id, noted_by=current_user.id)
            db.session.add(mileage)

        upload_folder = os.path.join('static', 'uploads', 'mileage')
        os.makedirs(upload_folder, exist_ok=True)

        if entry_type == 'start':
            mileage.odometer_start = int(request.form.get('odometer_start', 0))
            mileage.actual_start   = datetime.strptime(request.form.get('actual_start'), '%Y-%m-%dT%H:%M')
            # รูปหน้าปัดก่อนออก
            img = request.files.get('odometer_start_img')
            if img and img.filename:
                fname = f"{int(time.time())}_start_{secure_filename(img.filename)}"
                img.save(os.path.join(upload_folder, fname))
                mileage.odometer_start_img = fname
            db.session.flush()
            _n_mileage_start(booking, mileage)   # Event #8
            flash(f'บันทึกเลขไมล์ก่อนออก #{booking_id} เรียบร้อย', 'success')

        elif entry_type == 'end':
            submitted_end_mileage = int(request.form.get('odometer_end', 0))
            # 🌟 เช็คว่าเลขไมล์ตอนจบ ต้องมากกว่าเลขไมล์ตอนเริ่ม
            # (ดักเผื่อกรณี mileage.odometer_start มีค่าอยู่แล้ว)
            if mileage.odometer_start is not None and submitted_end_mileage <= mileage.odometer_start:
                flash(f'❌ บันทึกไม่สำเร็จ! เลขไมล์ตอนจบ ({submitted_end_mileage}) ต้องมากกว่าเลขไมล์ตอนเริ่ม ({mileage.odometer_start})', 'danger')
                return redirect(url_for('vehicle.mileage_log')) # เด้งกลับไปให้กรอกใหม่
            
            # ถ้าเลขไมล์ถูกต้อง ค่อยเอาไปใส่ใน object
            mileage.odometer_end = submitted_end_mileage
            mileage.actual_end   = datetime.strptime(request.form.get('actual_end'), '%Y-%m-%dT%H:%M')
            # รูปหน้าปัดหลังกลับ
            img = request.files.get('odometer_end_img')
            if img and img.filename:
                fname = f"{int(time.time())}_end_{secure_filename(img.filename)}"
                img.save(os.path.join(upload_folder, fname))
                mileage.odometer_end_img = fname
            # เติมน้ำมันระหว่างทาง
            mileage.refuel = True if request.form.get('refuel') else False
            if mileage.refuel:
                refuel_amt = request.form.get('refuel_amount', '').strip()
                if refuel_amt:
                    mileage.refuel_amount = float(refuel_amt)
                refuel_img = request.files.get('refuel_img')
                if refuel_img and refuel_img.filename:
                    fname = f"{int(time.time())}_refuel_{secure_filename(refuel_img.filename)}"
                    refuel_img.save(os.path.join(upload_folder, fname))
                    mileage.refuel_img = fname
            # admin กรอกค่าน้ำมัน manual
            fuel = request.form.get('fuel_cost', '').strip()
            if fuel:
                mileage.fuel_cost = float(fuel)
            flash(f'บันทึกเลขไมล์หลังกลับ #{booking_id} เรียบร้อย', 'success')

        # Event #9 — แจ้งเมื่อปิดงาน
        if entry_type == 'end':
            _n_mileage_end(booking, mileage)

        db.session.commit()

        # สร้าง OT record อัตโนมัติเมื่อปิดงาน
        if entry_type == 'end':
            auto_generate_ot(booking, mileage)

        # หักงบอัตโนมัติ (รองรับทั้ง central และ department) + Events #10, #11, #12
        if entry_type == 'end':
            m2         = VehicleMileage.query.filter_by(booking_id=booking_id).first()
            distance   = (m2.odometer_end - m2.odometer_start) if (m2 and m2.odometer_end and m2.odometer_start) else None
            target_date = m2.actual_end.date() if (m2 and m2.actual_end) else get_bkk_time().date()
            fuel_price = FuelPrice.get_for_date(target_date) or float(SystemConfig.get('fuel_price', '40') or 40)
            trip_cost  = float(m2.fuel_cost) if (m2 and m2.fuel_cost and float(m2.fuel_cost) > 0) else \
                         (round((distance / float(booking.assigned_vehicle.fuel_rate)) * fuel_price, 2)
                          if distance and booking.assigned_vehicle and booking.assigned_vehicle.fuel_rate else 0)

            # หักงบ central/department — ผ่าน BudgetService (ledger + idempotent)
            if booking.trip_department and booking.expense_type in ['central', 'department'] and trip_cost > 0:
                # หางบ active ที่ช่วงเวลาครอบวันปิดทริป (date-range lookup — helper เดียวกับ approve)
                budget, _key_label = _lookup_budget_for_booking(booking, on_date=target_date)
                if budget:
                    budget_svc.deduct_for_mileage(
                        m2, budget, trip_cost,
                        snap={'distance': distance,
                              'fuel_rate': float(booking.assigned_vehicle.fuel_rate) if booking.assigned_vehicle else None,
                              'fuel_price': fuel_price},
                        note=f'mileage_log booking #{booking.id}',
                    )
                else:
                    current_app.logger.warning(
                        '[budget-deduct skip] booking #%s: ไม่พบงบ active ครอบวันปิดทริป '
                        '(expense_type=%s, key_label=%s, on_date=%s, trip_cost=%s)',
                        booking.id, booking.expense_type, _key_label, target_date, trip_cost,
                    )
                    flash(
                        f'⚠️ ปิดทริป #{booking.id} แล้ว แต่ไม่ได้หักงบ '
                        f'(ไม่พบงบ {booking.expense_type} ของ "{_key_label or "—"}" '
                        f'ที่เปิดใช้ครอบวันที่ {target_date.strftime("%d/%m/%Y")})',
                        'warning'
                    )
                _n_budget(booking, trip_cost, booking.expense_type)   # Event #10 / #11
                db.session.commit()
            elif booking.expense_type in ['central', 'department']:
                # trip_cost==0 หรือ trip_department ว่าง — log silent skip
                current_app.logger.warning(
                    '[budget-deduct skip] booking #%s: ข้ามการหักงบ '
                    '(trip_department=%s, expense_type=%s, trip_cost=%s)',
                    booking.id, booking.trip_department, booking.expense_type, trip_cost,
                )
                if trip_cost == 0:
                    flash(
                        f'⚠️ ปิดทริป #{booking.id} แล้ว แต่ไม่ได้หักงบ '
                        f'(trip_cost = 0 — ตรวจ fuel_cost หรือ vehicle.fuel_rate)',
                        'warning'
                    )

            # Event #12 — ต้องจ่ายส่วนตัว
            elif booking.expense_type == 'personal' and trip_cost > 0:
                _n_payment_required(booking, m2, trip_cost)
                db.session.commit()

        return redirect(url_for('vehicle.mileage_log'))

    # ── GET: Admin mileage dashboard ────────────────────────────
    today      = get_bkk_time().date()
    now        = get_bkk_time()
    fuel_price = FuelPrice.get_for_date(today) or float(SystemConfig.get('fuel_price', '40') or 40)

    # Filter params
    show_all     = request.args.get('show_all', '') == '1'
    f_date_start = request.args.get('date_start', '').strip()
    f_date_end   = request.args.get('date_end', '').strip()
    f_vehicle    = request.args.get('vehicle_id', type=int)
    f_driver     = request.args.get('driver_id', type=int)
    f_status     = request.args.get('status_filter', '').strip()   # complete|partial|none
    f_cost_min   = request.args.get('cost_min', type=float)
    f_cost_max   = request.args.get('cost_max', type=float)
    f_budget_type = request.args.get('budget_type', '').strip()   # central|department|personal
    f_budget_sub  = request.args.get('budget_sub', '').strip()    # central_category or trip_department
    f_booker      = request.args.get('booker_q', '').strip()

    # Default to current month when no dates given and not show_all
    if not show_all and not f_date_start and not f_date_end:
        f_date_start = today.replace(day=1).strftime('%Y-%m-%d')
        f_date_end   = today.strftime('%Y-%m-%d')

    # Base: approved bookings, past + today (ตัดอนาคต)
    cutoff = datetime.combine(today + timedelta(days=1), datetime.min.time())
    q = VehicleBooking.query.filter(
        VehicleBooking.status == 'approved',
        VehicleBooking.start_datetime < cutoff,
    )
    if f_date_start:
        try:
            q = q.filter(VehicleBooking.start_datetime >= datetime.strptime(f_date_start, '%Y-%m-%d'))
        except ValueError:
            pass
    if f_date_end:
        try:
            end_dt = datetime.strptime(f_date_end, '%Y-%m-%d') + timedelta(days=1)
            q = q.filter(VehicleBooking.start_datetime < end_dt)
        except ValueError:
            pass
    if f_vehicle:
        q = q.filter(VehicleBooking.assigned_vehicle_id == f_vehicle)
    if f_driver:
        q = q.filter(VehicleBooking.driver_id == f_driver)
    if f_budget_type in ('central', 'department', 'personal'):
        q = q.filter(VehicleBooking.expense_type == f_budget_type)
    if f_budget_sub and f_budget_type == 'central':
        q = q.filter(VehicleBooking.central_category == f_budget_sub)
    elif f_budget_sub and f_budget_type == 'department':
        q = q.filter(VehicleBooking.trip_department == f_budget_sub)
    if f_booker:
        like = f'%{f_booker}%'
        q = q.join(User, VehicleBooking.user_id == User.id).filter(
            or_(User.full_name.ilike(like), User.username.ilike(like))
        )

    bookings = q.order_by(VehicleBooking.start_datetime.desc()).all()

    def _compute_cost(b, m):
        """return (distance, fuel_cost, status_key)"""
        if not m:
            return (None, None, 'none')
        if m.odometer_start and m.odometer_end:
            d = m.odometer_end - m.odometer_start
            if m.fuel_cost and float(m.fuel_cost) > 0:
                c = float(m.fuel_cost)
            elif b.assigned_vehicle and b.assigned_vehicle.fuel_rate:
                td = m.actual_end.date() if m.actual_end else b.start_datetime.date()
                fp = FuelPrice.get_for_date(td) or fuel_price
                c = round((d / float(b.assigned_vehicle.fuel_rate)) * fp, 2)
            else:
                c = 0.0
            return (d, c, 'complete')
        if m.odometer_start:
            return (None, None, 'partial')
        return (None, None, 'none')

    # Pre-fetch all FuelBill mileages grouped by vehicle (for in-trip refuel detection)
    fuel_by_vehicle = {}
    for vid, mileage in (db.session.query(FuelBill.vehicle_id, FuelBill.mileage)
                                   .filter(FuelBill.mileage.isnot(None)).all()):
        fuel_by_vehicle.setdefault(vid, []).append(mileage)

    def _budget_info(b):
        et = (b.expense_type or '').strip()
        if et == 'central':
            return ('central', 'งบส่วนกลาง', (b.central_category or '').strip() or None)
        if et == 'department':
            sub = (b.trip_department or (b.user.department if b.user else '') or '').strip()
            return ('department', 'งบส่วนกอง', sub or None)
        if et == 'personal':
            return ('personal', 'งบส่วนตัว', None)
        return ('', '—', None)

    def _has_refuel_in_trip(b, m):
        if not (b.assigned_vehicle_id and m and m.odometer_start and m.odometer_end):
            return False
        bills = fuel_by_vehicle.get(b.assigned_vehicle_id, [])
        lo, hi = m.odometer_start, m.odometer_end
        return any(lo <= km <= hi for km in bills)

    rows = []
    for b in bookings:
        m = b.mileage[0] if b.mileage else None
        distance, fuel_cost, status_key = _compute_cost(b, m)

        # Apply status + cost filter
        if f_status and f_status != status_key:
            continue
        if f_cost_min is not None and (fuel_cost or 0) < f_cost_min:
            continue
        if f_cost_max is not None and (fuel_cost or 0) > f_cost_max:
            continue

        budget_type, budget_label, budget_sub = _budget_info(b)
        rows.append({
            'b': b, 'm': m,
            'distance': distance,
            'fuel_cost': fuel_cost,
            'status_key': status_key,
            'budget_type': budget_type,
            'budget_label': budget_label,
            'budget_sub': budget_sub,
            'has_refuel': _has_refuel_in_trip(b, m),
        })

    # ── Group rows by trip_group (representative = first row) ────
    display_rows = []
    seen_groups = set()
    for r in rows:
        tg = r['b'].trip_group
        if tg is None:
            display_rows.append({'kind': 'single', 'row': r, 'count': 1, 'members': [r]})
            continue
        if tg in seen_groups:
            continue
        seen_groups.add(tg)
        members = [x for x in rows if x['b'].trip_group == tg]
        display_rows.append({'kind': 'group', 'row': members[0], 'count': len(members), 'members': members})

    # ── Dashboard KPIs (year/month) ─────────────────────────────
    year_budgets = VehicleBudget.query.filter_by(year=now.year).all()
    total_budget    = sum(float(bu.budget_amount) for bu in year_budgets)
    total_used      = sum(float(bu.used_amount)   for bu in year_budgets)
    total_remaining = total_budget - total_used

    # Current month cost (all bookings completed in this month)
    month_trips = VehicleBooking.query.filter(
        VehicleBooking.status == 'approved',
        extract('year',  VehicleBooking.start_datetime) == now.year,
        extract('month', VehicleBooking.start_datetime) == now.month,
    ).all()
    month_total_cost = 0.0
    for b in month_trips:
        m = b.mileage[0] if b.mileage else None
        _, c, st = _compute_cost(b, m)
        if st == 'complete' and c:
            month_total_cost += c

    # Pending personal reimbursement
    pending_personal_count = VehicleMileage.query.join(VehicleBooking).filter(
        VehicleBooking.expense_type == 'personal',
        VehicleMileage.personal_status == 0,
        VehicleMileage.odometer_end.isnot(None),
    ).count()

    # Missing mileage (approved + past but no complete record)
    all_past = VehicleBooking.query.filter(
        VehicleBooking.status == 'approved',
        VehicleBooking.start_datetime < cutoff,
    ).all()
    missing_count = 0
    for b in all_past:
        m = b.mileage[0] if b.mileage else None
        _, _, st = _compute_cost(b, m)
        if st != 'complete':
            missing_count += 1

    # ── Per-vehicle × month breakdown (current year) ────────────
    vehicles_all = Vehicle.query.order_by(Vehicle.license_plate).all()
    drivers_all  = Driver.query.filter_by(is_active=True).order_by(Driver.name).all()
    booker_ids   = [uid for (uid,) in db.session.query(VehicleBooking.user_id).distinct().all()]
    bookers_all  = User.query.filter(User.id.in_(booker_ids)).order_by(User.full_name).all() if booker_ids else []

    # Budget sub-list: ดึง distinct ค่าที่มีจริงใน DB (approved ทั้งหมด ไม่ผูก filter หน้านี้)
    # label จาก EXPENSE_CATEGORIES ถ้ามี ไม่มี (เช่น 'งานโภชนาการ') ใช้ key เป็น label
    _central_labels = {c['key']: c['label'] for c in EXPENSE_CATEGORIES['central']}
    _dept_labels    = {c['key']: c['label'] for c in EXPENSE_CATEGORIES['department']}
    central_keys = [k for (k,) in db.session.query(VehicleBooking.central_category)
                    .filter(VehicleBooking.status == 'approved',
                            VehicleBooking.expense_type == 'central',
                            VehicleBooking.central_category.isnot(None),
                            VehicleBooking.central_category != '')
                    .distinct().order_by(VehicleBooking.central_category).all()]
    dept_keys = [k for (k,) in db.session.query(VehicleBooking.trip_department)
                 .filter(VehicleBooking.status == 'approved',
                         VehicleBooking.expense_type == 'department',
                         VehicleBooking.trip_department.isnot(None),
                         VehicleBooking.trip_department != '')
                 .distinct().order_by(VehicleBooking.trip_department).all()]
    budget_subs = {
        'central':    [{'key': k, 'label': _central_labels.get(k, k)} for k in central_keys],
        'department': [{'key': k, 'label': _dept_labels.get(k, k)} for k in dept_keys],
    }

    breakdown        = {v.id: [0.0]*12 for v in vehicles_all}
    breakdown_totals = [0.0]*12

    year_trips = VehicleBooking.query.filter(
        VehicleBooking.status == 'approved',
        extract('year', VehicleBooking.start_datetime) == now.year,
        VehicleBooking.assigned_vehicle_id.isnot(None),
    ).all()
    for b in year_trips:
        m = b.mileage[0] if b.mileage else None
        _, c, st = _compute_cost(b, m)
        if st != 'complete' or not c:
            continue
        mo_idx = b.start_datetime.month - 1
        if b.assigned_vehicle_id in breakdown:
            breakdown[b.assigned_vehicle_id][mo_idx] += c
            breakdown_totals[mo_idx] += c

    return render_template('vehicle/admin/vehicle_mileage.html',
        rows=rows,
        display_rows=display_rows,
        fuel_price=fuel_price,
        today=today,
        curr_year=now.year,
        curr_month=now.month,
        # KPIs
        month_total_cost=month_total_cost,
        total_budget=total_budget,
        total_used=total_used,
        total_remaining=total_remaining,
        pending_personal_count=pending_personal_count,
        missing_count=missing_count,
        # Breakdown
        vehicles_all=vehicles_all,
        drivers_all=drivers_all,
        bookers_all=bookers_all,
        budget_subs=budget_subs,
        breakdown=breakdown,
        breakdown_totals=breakdown_totals,
        # Filter echo
        f={'date_start': f_date_start, 'date_end': f_date_end,
           'vehicle_id': f_vehicle or '', 'driver_id': f_driver or '',
           'status_filter': f_status,
           'cost_min': f_cost_min if f_cost_min is not None else '',
           'cost_max': f_cost_max if f_cost_max is not None else '',
           'budget_type': f_budget_type,
           'budget_sub': f_budget_sub,
           'booker_q': f_booker,
           'show_all': show_all},
    )


# ─────────────────────────────────────────────
# Export Excel — mileage (admin)
# ─────────────────────────────────────────────

@vehicle_bp.route('/vehicle/mileage/export')
@login_required
def mileage_export():
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์', 'danger')
        return redirect(url_for('vehicle.index'))

    import io
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    except ImportError:
        flash('ไม่พบ openpyxl — รัน: pip install openpyxl', 'danger')
        return redirect(url_for('vehicle.mileage_log'))

    from flask import send_file
    today          = get_bkk_time().date()
    fallback_price = float(SystemConfig.get('fuel_price', '40') or 40)

    f_date_start = request.args.get('date_start', '').strip()
    f_date_end   = request.args.get('date_end', '').strip()
    f_vehicle    = request.args.get('vehicle_id', type=int)
    f_driver     = request.args.get('driver_id', type=int)
    f_status     = request.args.get('status_filter', '').strip()
    f_cost_min   = request.args.get('cost_min', type=float)
    f_cost_max   = request.args.get('cost_max', type=float)

    cutoff = datetime.combine(today + timedelta(days=1), datetime.min.time())
    q = VehicleBooking.query.filter(
        VehicleBooking.status == 'approved',
        VehicleBooking.start_datetime < cutoff,
    )
    if f_date_start:
        try: q = q.filter(VehicleBooking.start_datetime >= datetime.strptime(f_date_start, '%Y-%m-%d'))
        except ValueError: pass
    if f_date_end:
        try: q = q.filter(VehicleBooking.start_datetime < datetime.strptime(f_date_end, '%Y-%m-%d') + timedelta(days=1))
        except ValueError: pass
    if f_vehicle: q = q.filter(VehicleBooking.assigned_vehicle_id == f_vehicle)
    if f_driver:  q = q.filter(VehicleBooking.driver_id == f_driver)
    bookings = q.order_by(VehicleBooking.start_datetime.desc()).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"Mileage {today.strftime('%Y-%m')}"

    headers = ['Booking','ผู้จอง','รถ','ทะเบียน','คนขับ','ปลายทาง','วันเดินทาง',
               'ไมล์ออก','ไมล์กลับ','ระยะทาง(กม.)','ค่าน้ำมัน(฿)','สถานะ','ประเภท']
    hdr_fill = PatternFill('solid', fgColor='4F46E5')
    hdr_font = Font(bold=True, color='FFFFFF', name='Sarabun')
    thin = Side(style='thin', color='E4E4E7')
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    for ci, h in enumerate(headers, 1):
        c = ws.cell(row=1, column=ci, value=h)
        c.font = hdr_font; c.fill = hdr_fill
        c.alignment = Alignment(horizontal='center', vertical='center')
        c.border = border

    ST_LABEL  = {'complete':'ครบ','partial':'รอกลับ','none':'รอกรอก'}
    EXP_LABEL = {'central':'ส่วนกลาง','department':'หน่วยงาน','personal':'ส่วนตัว'}
    total_distance = 0.0
    total_fuel     = 0.0
    ri = 2
    for b in bookings:
        m = b.mileage[0] if b.mileage else None
        distance = fuel_cost = None
        status_key = 'none'
        if m and m.odometer_start and m.odometer_end:
            distance = m.odometer_end - m.odometer_start
            if m.fuel_cost and float(m.fuel_cost) > 0:
                fuel_cost = float(m.fuel_cost)
            elif b.assigned_vehicle and b.assigned_vehicle.fuel_rate:
                td = m.actual_end.date() if m.actual_end else b.start_datetime.date()
                fp = FuelPrice.get_for_date(td) or fallback_price
                fuel_cost = round(distance / float(b.assigned_vehicle.fuel_rate) * fp, 2)
            status_key = 'complete'
        elif m and m.odometer_start:
            status_key = 'partial'

        if f_status and f_status != status_key: continue
        if f_cost_min is not None and (fuel_cost or 0) < f_cost_min: continue
        if f_cost_max is not None and (fuel_cost or 0) > f_cost_max: continue

        if distance: total_distance += distance
        if fuel_cost: total_fuel += fuel_cost

        row_data = [
            f"BK-{b.id}",
            b.user.full_name or b.user.username,
            f"{b.assigned_vehicle.brand} {b.assigned_vehicle.model}" if b.assigned_vehicle else '-',
            b.assigned_vehicle.license_plate if b.assigned_vehicle else '-',
            b.driver.name if b.driver else '-',
            b.destination or '-',
            b.start_datetime.strftime('%d/%m/%Y'),
            m.odometer_start if m and m.odometer_start else None,
            m.odometer_end   if m and m.odometer_end   else None,
            distance,
            round(fuel_cost, 2) if fuel_cost else None,
            ST_LABEL.get(status_key, '-'),
            EXP_LABEL.get(b.expense_type or '', 'ไม่ระบุ'),
        ]
        for ci, val in enumerate(row_data, 1):
            c = ws.cell(row=ri, column=ci, value=val)
            c.border = border
            c.alignment = Alignment(horizontal='center' if ci in [1,7,8,9,10,11,12] else 'left')
            if ri % 2 == 0:
                c.fill = PatternFill('solid', fgColor='FAFAFA')
        ri += 1

    # Totals row
    tr = ri
    ws.cell(row=tr, column=9,  value='รวม').font = Font(bold=True)
    ws.cell(row=tr, column=10, value=round(total_distance, 2)).font = Font(bold=True)
    ws.cell(row=tr, column=11, value=round(total_fuel, 2)).font = Font(bold=True)

    col_widths = [10,22,18,14,16,28,12,12,12,14,14,12,14]
    for ci, w in enumerate(col_widths, 1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(ci)].width = w
    ws.row_dimensions[1].height = 22

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    fname = f"mileage_{today.strftime('%Y%m%d')}.xlsx"
    return send_file(buf, as_attachment=True, download_name=fname,
                     mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')


# ─────────────────────────────────────────────
# สรุปค่าใช้จ่าย (admin + superadmin)
# ─────────────────────────────────────────────
