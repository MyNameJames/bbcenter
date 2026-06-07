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


@admincost_bp.route('/vehicle/mileage/override-fuel', methods=['POST'])
@login_required
def override_fuel():
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์', 'danger')
        return redirect(url_for('vehicle.index'))
    booking_id = int(request.form.get('booking_id'))
    fuel_cost  = float(request.form.get('fuel_cost', 0))
    mileage = VehicleMileage.query.filter_by(booking_id=booking_id).first()
    if not mileage:
        mileage = VehicleMileage(booking_id=booking_id, noted_by=current_user.id)
        db.session.add(mileage)
    mileage.fuel_cost = fuel_cost

    # ถ้า mileage เคยถูกหักงบไปแล้ว → refund เก่า แล้ว deduct ใหม่ด้วยจำนวนใหม่
    if mileage.id and mileage.last_budget_log_id:
        booking = mileage.booking
        target_date = mileage.actual_end.date() if mileage.actual_end else date.today()
        if booking and booking.trip_department and booking.expense_type in ['central', 'department']:
            budget, _ = _lookup_budget_for_booking(booking, on_date=target_date)
            if budget:
                budget_svc.rededuct_for_mileage(
                    mileage, budget, fuel_cost,
                    snap={'distance': (mileage.odometer_end - mileage.odometer_start)
                          if (mileage.odometer_end and mileage.odometer_start) else None,
                          'fuel_rate': float(booking.assigned_vehicle.fuel_rate) if booking.assigned_vehicle else None,
                          'fuel_price': None},
                    note=f'override_fuel by {current_user.username} → {fuel_cost}',
                )

    db.session.commit()
    flash(f'Override ค่าน้ำมัน #{booking_id} เป็น {fuel_cost:,.2f} บาท เรียบร้อย', 'success')
    return redirect(request.referrer or url_for('admincost.cost_summary'))



@admincost_bp.route('/admin/cost', methods=['GET'])
@login_required
def cost_summary():
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์เข้าหน้านี้', 'danger')
        return redirect(url_for('vehicle.index'))

    now        = get_bkk_time()
    from_month = int(request.args.get('from_month', now.month))
    from_year  = int(request.args.get('from_year',  now.year))
    to_month   = int(request.args.get('to_month',   now.month))
    to_year    = int(request.args.get('to_year',    now.year))
    sel_driver = request.args.get('driver_id', type=int)
    sel_status = request.args.get('status', '')

    from_date = date(from_year, from_month, 1)
    to_date   = date(to_year + 1, 1, 1) if to_month == 12 else date(to_year, to_month + 1, 1)

    # KPI — query รวมทุก status
    base_q = DriverOT.query.filter(DriverOT.date >= from_date, DriverOT.date < to_date)
    if sel_driver:
        base_q = base_q.filter(DriverOT.driver_id == sel_driver)
    all_ots = base_q.all()

    kpi_records  = len(all_ots)
    kpi_hours    = round(sum(float(o.total_hours)  for o in all_ots), 2)
    kpi_total    = round(sum(float(o.total_amount) for o in all_ots), 2)
    kpi_pending  = round(sum(float(o.total_amount) for o in all_ots if o.status == 'pending'),  2)
    kpi_approved = round(sum(float(o.total_amount) for o in all_ots if o.status == 'approved'), 2)
    kpi_paid     = round(sum(float(o.total_amount) for o in all_ots if o.status == 'paid'),     2)
    count_pending  = sum(1 for o in all_ots if o.status == 'pending')
    count_approved = sum(1 for o in all_ots if o.status == 'approved')
    count_paid     = sum(1 for o in all_ots if o.status == 'paid')

    # Filtered list
    list_q = DriverOT.query.filter(DriverOT.date >= from_date, DriverOT.date < to_date)
    if sel_driver:
        list_q = list_q.filter(DriverOT.driver_id == sel_driver)
    if sel_status:
        list_q = list_q.filter(DriverOT.status == sel_status)
    ots = list_q.order_by(DriverOT.date.desc()).all()

    drivers      = Driver.query.order_by(Driver.name).all()
    rate_configs = OTRateConfig.query.filter_by(is_active=True).order_by(OTRateConfig.sort_order).all()

    range_label = TH_MONTHS[from_month] + ' ' + str(from_year + 543)
    if from_month != to_month or from_year != to_year:
        range_label += f" – {TH_MONTHS[to_month]} {to_year + 543}"

    return render_template('vehicle/admin/vehicle_cost.html',
        ots=ots, drivers=drivers, rate_configs=rate_configs,
        from_month=from_month, from_year=from_year,
        to_month=to_month, to_year=to_year,
        sel_driver=sel_driver, sel_status=sel_status,
        kpi_records=kpi_records, kpi_hours=kpi_hours,
        kpi_total=kpi_total, kpi_pending=kpi_pending,
        kpi_approved=kpi_approved, kpi_paid=kpi_paid,
        count_pending=count_pending, count_approved=count_approved, count_paid=count_paid,
        range_label=range_label, now=now,
    )



@admincost_bp.route('/admin/ot/<int:ot_id>/approve', methods=['POST'])
@login_required
def ot_approve(ot_id):
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์', 'danger')
        return redirect(url_for('vehicle.index'))
    ot = DriverOT.query.get_or_404(ot_id)
    if ot.status == 'pending':
        ot.status         = 'approved'
        ot.approved_by_id = current_user.id
        ot.approved_at    = get_bkk_time()
        db.session.commit()
        flash(f'อนุมัติ {ot.ot_number} เรียบร้อย', 'success')
    else:
        flash('สถานะไม่ถูกต้องสำหรับการอนุมัติ', 'warning')
    return redirect(request.referrer or url_for('admincost.cost_summary'))



@admincost_bp.route('/admin/ot/<int:ot_id>/mark_paid', methods=['POST'])
@login_required
def ot_mark_paid(ot_id):
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์', 'danger')
        return redirect(url_for('vehicle.index'))
    ot = DriverOT.query.get_or_404(ot_id)
    if ot.status == 'approved':
        ot.status     = 'paid'
        ot.paid_by_id = current_user.id
        ot.paid_at    = get_bkk_time()
        db.session.commit()
        flash(f'บันทึกการจ่าย {ot.ot_number} เรียบร้อย', 'success')
    else:
        flash('ต้องอนุมัติก่อนจึงจะบันทึกการจ่ายได้', 'warning')
    return redirect(request.referrer or url_for('admincost.cost_summary'))



@admincost_bp.route('/admin/ot/<int:ot_id>/edit', methods=['POST'])
@login_required
def ot_edit(ot_id):
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์', 'danger')
        return redirect(url_for('vehicle.index'))
    ot = DriverOT.query.get_or_404(ot_id)

    ot.driver_id = int(request.form.get('driver_id', ot.driver_id))
    ot.date      = datetime.strptime(request.form.get('date'), '%Y-%m-%d').date()
    ot.note      = request.form.get('note', '').strip() or None

    slot_labels = request.form.getlist('slot_label[]')
    slot_starts = request.form.getlist('slot_start[]')
    slot_ends   = request.form.getlist('slot_end[]')
    slot_rates  = request.form.getlist('slot_rate[]')
    slot_cfgids = request.form.getlist('slot_cfg_id[]')

    new_slots = []
    for i, label in enumerate(slot_labels):
        try:
            start  = slot_starts[i]; end = slot_ends[i]
            rate   = float(slot_rates[i])
            cfg_id = int(slot_cfgids[i]) if i < len(slot_cfgids) and slot_cfgids[i] else None
            sh, sm = map(int, start.split(':'))
            eh, em = map(int, end.split(':'))
            mins   = max(0, (eh * 60 + em) - (sh * 60 + sm))
            hrs    = round(mins / 60, 2)
            new_slots.append(DriverOTSlot(
                rate_config_id=cfg_id, slot_label=label,
                start_time=start, end_time=end,
                hours=hrs, rate=rate, amount=round(hrs * rate, 2),
            ))
        except (ValueError, IndexError):
            continue

    ot.slots        = new_slots
    ot.total_hours  = round(sum(float(s.hours)  for s in new_slots), 2)
    ot.total_amount = round(sum(float(s.amount) for s in new_slots), 2)
    db.session.commit()
    flash(f'แก้ไข {ot.ot_number} เรียบร้อย', 'success')
    return redirect(request.referrer or url_for('admincost.cost_summary'))



@admincost_bp.route('/admin/ot/<int:ot_id>/delete', methods=['POST'])
@login_required
def ot_delete(ot_id):
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์', 'danger')
        return redirect(url_for('vehicle.index'))
    ot = DriverOT.query.get_or_404(ot_id)
    ot_num = ot.ot_number
    db.session.delete(ot)
    db.session.commit()
    flash(f'ลบ {ot_num} เรียบร้อย', 'success')
    return redirect(request.referrer or url_for('admincost.cost_summary'))



@admincost_bp.route('/admin/ot/rate_config/update', methods=['POST'])
@login_required
def ot_rate_config_update():
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์', 'danger')
        return redirect(url_for('vehicle.index'))

    # Soft-delete existing rows the user removed in the modal
    for did in request.form.getlist('cfg_delete[]'):
        if did:
            cfg = OTRateConfig.query.get(int(did))
            if cfg:
                cfg.is_active = False

    # Update existing (cfg_id present) or create new (cfg_id == '')
    max_order = db.session.query(db.func.coalesce(db.func.max(OTRateConfig.sort_order), 0)).scalar()
    for cfg_id, label, start, end, rate, day in zip(
        request.form.getlist('cfg_id[]'),
        request.form.getlist('cfg_label[]'),
        request.form.getlist('cfg_start[]'),
        request.form.getlist('cfg_end[]'),
        request.form.getlist('cfg_rate[]'),
        request.form.getlist('cfg_day[]'),
    ):
        if not label or not start or not end or rate == '':
            continue
        day_val = int(day) if day not in ('', None) else None
        if cfg_id:
            cfg = OTRateConfig.query.get(int(cfg_id))
            if cfg:
                cfg.label = label; cfg.start_time = start
                cfg.end_time = end; cfg.rate = float(rate)
                cfg.day_of_week = day_val
        else:
            max_order += 10
            db.session.add(OTRateConfig(
                label=label, start_time=start, end_time=end,
                rate=float(rate), is_active=True, sort_order=max_order,
                day_of_week=day_val,
            ))
    db.session.commit()
    flash('อัปเดตอัตรา OT เรียบร้อย', 'success')
    return redirect(request.referrer or url_for('admincost.cost_summary'))

# ─────────────────────────────────────────────
# Driver View — หน้าคนขับ (mobile-friendly)
# ─────────────────────────────────────────────

@admincost_bp.route('/admin/cost/export')
@login_required
def cost_export():
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์', 'danger')
        return redirect(url_for('vehicle.index'))

    import io
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    except ImportError:
        flash('ไม่พบ openpyxl — รัน: pip install openpyxl', 'danger')
        return redirect(url_for('admincost.cost_summary'))

    from flask import send_file
    now        = get_bkk_time()
    from_month = int(request.args.get('from_month', now.month))
    from_year  = int(request.args.get('from_year',  now.year))
    to_month   = int(request.args.get('to_month',   now.month))
    to_year    = int(request.args.get('to_year',    now.year))
    sel_driver = request.args.get('driver_id', type=int)
    sel_status = request.args.get('status', '')

    from_date = date(from_year, from_month, 1)
    to_date   = date(to_year + 1, 1, 1) if to_month == 12 else date(to_year, to_month + 1, 1)

    q = DriverOT.query.filter(DriverOT.date >= from_date, DriverOT.date < to_date)
    if sel_driver:
        q = q.filter(DriverOT.driver_id == sel_driver)
    if sel_status:
        q = q.filter(DriverOT.status == sel_status)
    ots = q.order_by(DriverOT.date).all()

    wb  = openpyxl.Workbook()
    ws  = wb.active
    ws.title = f"OT {TH_MONTHS[from_month]}{from_year+543}"

    headers  = ['เลขที่','วันที่','คนขับ','Booking','สถานที่','ช่วงเวลา OT','ชม.','ยอด(฿)','สถานะ','หมายเหตุ']
    hdr_fill = PatternFill('solid', fgColor='4F46E5')
    hdr_font = Font(bold=True, color='FFFFFF', name='Sarabun')
    thin     = Side(style='thin', color='E4E4E7')
    border   = Border(left=thin, right=thin, top=thin, bottom=thin)
    ST_LABEL = {'pending':'รออนุมัติ','approved':'อนุมัติแล้ว','paid':'จ่ายแล้ว'}

    for ci, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=ci, value=h)
        cell.font      = hdr_font
        cell.fill      = hdr_fill
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border    = border

    total_hrs = total_amt = 0
    for ri, ot in enumerate(ots, 2):
        slot_str = ' | '.join(
            f"{s.slot_label} {s.start_time}–{s.end_time} ฿{s.rate}" for s in ot.slots
        )
        row_data = [
            ot.ot_number,
            ot.date.strftime('%d/%m/%Y'),
            ot.driver.name if ot.driver else '-',
            ot.booking.id if ot.booking else '-',
            ot.booking.destination if ot.booking else '-',
            slot_str,
            float(ot.total_hours),
            float(ot.total_amount),
            ST_LABEL.get(ot.status, ot.status),
            ot.note or '',
        ]
        total_hrs += float(ot.total_hours)
        total_amt += float(ot.total_amount)
        for ci, val in enumerate(row_data, 1):
            cell = ws.cell(row=ri, column=ci, value=val)
            cell.border    = border
            cell.alignment = Alignment(horizontal='center' if ci in [1,2,7,8,9] else 'left')
            if ri % 2 == 0:
                cell.fill = PatternFill('solid', fgColor='F7F7F8')

    tr = len(ots) + 2
    ws.cell(row=tr, column=6, value='รวม').font = Font(bold=True)
    ws.cell(row=tr, column=7, value=round(total_hrs, 2)).font = Font(bold=True)
    ws.cell(row=tr, column=8, value=round(total_amt, 2)).font = Font(bold=True)

    for ci, w in enumerate([14,12,18,10,24,36,8,12,12,20], 1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(ci)].width = w
    ws.row_dimensions[1].height = 22

    buf = io.BytesIO(); wb.save(buf); buf.seek(0)
    fname = f"driver_ot_{from_year}_{from_month:02d}.xlsx"
    return send_file(buf, as_attachment=True, download_name=fname,
                     mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')


# ══════════════════════════════════════════════════════
# Feature 6: Vehicle Service/Tax Date Update
# ══════════════════════════════════════════════════════
