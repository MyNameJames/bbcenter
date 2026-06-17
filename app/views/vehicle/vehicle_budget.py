from flask import render_template, request, redirect, url_for, flash, jsonify, session, current_app
from flask_login import login_required, current_user
from models import (db, get_bkk_time, User, Vehicle, VehicleBooking, VehicleMileage,
                    SystemConfig, VehicleBudget, VehicleBudgetLog, VehicleDepartment,
                    BudgetType, Notification)
from sqlalchemy import and_, extract, or_
from datetime import datetime, date
from calendar import monthrange
from views.core.notification_service import (
    notify_payment_confirmed    as _n_payment_confirmed,
)
import views.vehicle.vehicle_budget_service as budget_svc
from views.vehicle.vehicle_common import (
    vehicle_bp, adminfleet_bp, admincost_bp, driver_bp,
    is_vehicle_admin, _lookup_budget_for_booking, auto_generate_ot,
    EXPENSE_CATEGORIES, TH_MONTHS, _fmt_date_th,
    get_fuel_price, calc_fuel_cost,
)


def _handle_set_budget():
    dept        = request.form.get('department', '').strip()
    year        = int(request.form.get('year'))
    month       = int(request.form.get('month'))
    amount      = float(request.form.get('budget_amount', 0))
    budget_type = request.form.get('budget_type', 'department')
    approver_id = request.form.get('approver_id') or None
    if approver_id:
        approver_id = int(approver_id)

    bt_obj = BudgetType.query.filter_by(name=budget_type).first()
    if not bt_obj:
        flash('ไม่พบประเภทงบ กรุณาตรวจสอบข้อมูล', 'danger')
        return

    dept_obj = VehicleDepartment.query.filter_by(name=dept, budget_type_id=bt_obj.id).first()
    if not dept_obj:
        if budget_type == 'central':
            dept_obj = VehicleDepartment(name=dept, budget_type_id=bt_obj.id)
            db.session.add(dept_obj)
            db.session.flush()
        else:
            flash('ไม่พบกอง/แผนก กรุณาตรวจสอบข้อมูล', 'danger')
            return

    budget = VehicleBudget.query.filter_by(
        department_id=dept_obj.id, year=year, month=month, budget_type_id=bt_obj.id
    ).first()

    start_date_str = request.form.get('start_date', '').strip()
    end_date_str   = request.form.get('end_date', '').strip()
    start_date = date.fromisoformat(start_date_str) if start_date_str else None
    end_date   = date.fromisoformat(end_date_str)   if end_date_str   else None

    if budget:
        budget_svc.set_budget_amount(
            budget, amount,
            note=f'admin {current_user.username}: update budget {budget_type} {dept} {year}-{month:02d} → {amount}',
        )
        budget.start_date = start_date
        budget.end_date   = end_date
        if budget_type == 'department':
            budget.approver_id = approver_id
    else:
        budget = VehicleBudget(
            department_id=dept_obj.id, year=year, month=month,
            budget_amount=amount, budget_type_id=bt_obj.id,
            approver_id=approver_id if budget_type == 'department' else None,
            start_date=start_date, end_date=end_date
        )
        db.session.add(budget)
        db.session.flush()
        budget_svc.set_budget_amount(
            budget, amount,
            note=f'admin {current_user.username}: create budget {budget_type} {dept} {year}-{month:02d} = {amount}',
        )
    db.session.commit()
    type_label = "ส่วนกลาง" if budget_type == 'central' else "งานกอง"
    flash(f'ตั้งงบ{type_label} "{dept}" เดือน {month}/{year} = {amount:,.0f} บาท เรียบร้อย', 'success')


def _handle_top_up():
    try:
        bid    = int(request.form.get('budget_id'))
        delta  = float(request.form.get('delta', 0))
        ntext  = (request.form.get('note') or '').strip()
        if delta <= 0:
            raise ValueError('top-up ต้องเป็นจำนวนบวก')
        budget = VehicleBudget.query.get_or_404(bid)
        if not budget.is_active:
            raise ValueError(f'งบ "{budget.department.name}" ถูกปิดใช้งานอยู่ — เปิดใช้งานก่อน')
        new_total = float(budget.budget_amount or 0) + delta
        budget_svc.set_budget_amount(
            budget, new_total,
            note=f'top-up +{delta:,.0f} by {current_user.username}'
                 + (f' | {ntext}' if ntext else ''))
        db.session.commit()
        flash(f'เพิ่มงบ "{budget.department.name}" +{delta:,.0f} ฿ เรียบร้อย', 'success')
    except ValueError as e:
        db.session.rollback()
        flash(f'เพิ่มงบไม่สำเร็จ: {e}', 'danger')
    except Exception:
        db.session.rollback()
        current_app.logger.exception('budget_manage:top_up failed')
        flash('เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง', 'danger')


def _handle_manual_adjust():
    try:
        bid   = int(request.form.get('budget_id'))
        delta = float(request.form.get('delta', 0))
        ntext = (request.form.get('note') or '').strip()
        if not ntext:
            raise ValueError('ต้องระบุเหตุผล (note) สำหรับ manual adjust')
        budget = VehicleBudget.query.get_or_404(bid)
        if not budget.is_active:
            raise ValueError(f'งบ "{budget.department.name}" ถูกปิดใช้งานอยู่ — เปิดใช้งานก่อน')
        budget_svc.manual_adjust(
            budget, delta,
            note=f'manual_adjust by {current_user.username}: {ntext}')
        db.session.commit()
        sign = '+' if delta >= 0 else ''
        flash(f'ปรับยอด "{budget.department.name}" {sign}{delta:,.2f} ฿', 'success')
    except ValueError as e:
        db.session.rollback()
        flash(f'ปรับยอดไม่สำเร็จ: {e}', 'danger')
    except Exception:
        db.session.rollback()
        current_app.logger.exception('budget_manage:manual_adjust failed')
        flash('เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง', 'danger')


def _handle_toggle_active():
    try:
        bid    = int(request.form.get('budget_id'))
        target = request.form.get('to_active') == '1'
        budget = VehicleBudget.query.get_or_404(bid)
        log = budget_svc.set_active(
            budget, target,
            note=f'{"เปิด" if target else "ปิด"}ใช้งานโดย {current_user.username}',
        )
        db.session.commit()
        if log is None:
            flash(f'งบ "{budget.department.name}" อยู่ในสถานะที่ต้องการอยู่แล้ว', 'info')
        elif target:
            flash(f'เปิดใช้งานงบ "{budget.department.name}" เรียบร้อย', 'success')
        else:
            flash(f'ปิดใช้งานงบ "{budget.department.name}" — booking ใหม่จะถูกบล็อก', 'warning')
    except Exception:
        db.session.rollback()
        current_app.logger.exception('budget_manage:toggle_active failed')
        flash('เปลี่ยนสถานะไม่สำเร็จ เกิดข้อผิดพลาดภายในระบบ', 'danger')


def _handle_extend_period():
    try:
        bid       = int(request.form.get('budget_id'))
        start_str = (request.form.get('start_date') or '').strip()
        end_str   = (request.form.get('end_date') or '').strip()
        topup_str = (request.form.get('topup_delta') or '').strip()
        if not start_str or not end_str:
            raise ValueError('ต้องระบุวันเริ่มและวันสิ้นสุดช่วงงบ')
        new_start = date.fromisoformat(start_str)
        new_end   = date.fromisoformat(end_str)
        if new_end < new_start:
            raise ValueError('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม')
        budget = VehicleBudget.query.get_or_404(bid)
        budget.start_date = new_start
        budget.end_date   = new_end
        budget_svc.set_active(
            budget, True,
            note=f'extend_period {new_start}–{new_end} by {current_user.username}',
        )
        topup = float(topup_str) if topup_str else 0.0
        if topup > 0:
            new_total = float(budget.budget_amount or 0) + topup
            budget_svc.set_budget_amount(
                budget, new_total,
                note=f'extend_period top-up +{topup:,.0f} by {current_user.username}',
            )
        db.session.commit()
        msg = (f'นำงบ "{budget.department.name}" กลับมาใช้ '
               f'({new_start.strftime("%d/%m/%Y")}–{new_end.strftime("%d/%m/%Y")})')
        if topup > 0:
            msg += f' + เพิ่มงบ {topup:,.0f} ฿'
        flash(msg + ' เรียบร้อย', 'success')
    except ValueError as e:
        db.session.rollback()
        flash(f'นำงบกลับมาใช้ไม่สำเร็จ: {e}', 'danger')
    except Exception:
        db.session.rollback()
        current_app.logger.exception('budget_manage:extend_period failed')
        flash('เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง', 'danger')


def _handle_cancel_booking():
    try:
        bk_id   = int(request.form.get('booking_id'))
        booking = VehicleBooking.query.get_or_404(bk_id)
        if booking.status not in ('rejected', 'cancelled'):
            booking.status = 'cancelled'
        db.session.commit()
        flash(f'ยกเลิก booking #{bk_id} เรียบร้อย', 'success')
    except Exception:
        db.session.rollback()
        current_app.logger.exception('budget_manage:cancel_booking failed')
        flash('ยกเลิก booking ไม่สำเร็จ เกิดข้อผิดพลาดภายในระบบ', 'danger')


def _load_budget_rows(sel_year, sel_month):
    month_start = date(sel_year, sel_month, 1)
    month_end   = date(sel_year, sel_month, monthrange(sel_year, sel_month)[1])

    raw_budgets = VehicleBudget.query.join(VehicleBudget.department)\
                                     .order_by(VehicleDepartment.name).all()

    pending_bookings = (VehicleBooking.query
                        .outerjoin(VehicleMileage,
                                   VehicleMileage.booking_id == VehicleBooking.id)
                        .filter(VehicleBooking.status == 'approved',
                                VehicleBooking.expense_type.in_(['central', 'department']),
                                or_(VehicleMileage.id.is_(None),
                                    VehicleMileage.budget_deducted_at.is_(None)))
                        .order_by(VehicleBooking.start_datetime.desc())
                        .all())

    pending_count_map = {}
    for pb in pending_bookings:
        if pb.trip_department_id:
            key = pb.trip_department_id
            pending_count_map[key] = pending_count_map.get(key, 0) + 1

    budgets  = []
    archived = []
    for b in raw_budgets:
        pct        = round(min(float(b.used_amount) / float(b.budget_amount) * 100, 100), 1) if b.budget_amount > 0 else 0
        pkey       = b.department_id
        has_period = bool(b.start_date and b.end_date)
        active_for_month = (b.is_active and has_period
                            and b.start_date <= month_end and b.end_date >= month_start)
        if active_for_month:
            status_reason = ''
        elif not b.is_active:
            status_reason = 'closed'
        elif not has_period:
            status_reason = 'no_period'
        elif b.end_date < month_start:
            status_reason = 'expired'
        elif b.start_date > month_end:
            status_reason = 'future'
        else:
            status_reason = ''
        row = {
            'id':            b.id,
            'department':    b.department.name,
            'budget_amount': b.budget_amount,
            'used_amount':   b.used_amount,
            'remaining':     round(float(b.budget_amount) - float(b.used_amount), 2),
            'pct':           pct,
            'budget_type':   b.budget_type.name,
            'approver_id':   b.approver_id,
            'approver_name': (b.approver.full_name or b.approver.username) if b.approver else None,
            'start_date':    b.start_date.isoformat() if b.start_date else '',
            'end_date':      b.end_date.isoformat()   if b.end_date   else '',
            'start_date_th': _fmt_date_th(b.start_date) if b.start_date else '',
            'end_date_th':   _fmt_date_th(b.end_date)   if b.end_date   else '',
            'pending_count': pending_count_map.get(pkey, 0),
            'is_active':     b.is_active,
            'status_reason': status_reason,
        }
        (budgets if active_for_month else archived).append(row)

    central_budgets  = [b for b in budgets if b['budget_type'] == 'central']
    dept_budgets     = [b for b in budgets if b['budget_type'] == 'department']
    archived_budgets = sorted(archived, key=lambda x: x['end_date'] or '', reverse=True)

    pending_list = []
    for pb in pending_bookings:
        m = VehicleMileage.query.filter_by(booking_id=pb.id).first()
        pending_list.append({
            'id':           pb.id,
            'department':   pb.trip_department or '—',
            'expense_type': pb.expense_type or '—',
            'destination':  pb.destination or '—',
            'start':        pb.start_datetime,
            'user':         (pb.user.full_name or pb.user.username) if pb.user else '—',
            'has_mileage':  bool(m),
            'has_deduct':   bool(m and m.budget_deducted_at),
        })

    return central_budgets, dept_budgets, archived_budgets, pending_list


def _calc_budget_kpi(central_budgets, dept_budgets, sel_year, sel_month):
    _active_central = [b for b in central_budgets if b['is_active']]
    _active_dept    = [b for b in dept_budgets    if b['is_active']]
    total_central_budget  = sum(float(b['budget_amount']) for b in _active_central)
    total_dept_budget     = sum(float(b['budget_amount']) for b in _active_dept)
    total_central_used    = sum(float(b['used_amount'])   for b in _active_central)
    total_dept_used       = sum(float(b['used_amount'])   for b in _active_dept)
    total_central_pending = sum(b['pending_count']        for b in _active_central)
    total_dept_pending    = sum(b['pending_count']        for b in _active_dept)

    fuel_price = float(SystemConfig.get('fuel_price', '40'))

    personal_mileages = VehicleMileage.query.join(VehicleBooking).filter(
        VehicleBooking.expense_type == 'personal',
        VehicleMileage.personal_status == 1,
        extract('year',  VehicleMileage.personal_paid_at) == sel_year,
        extract('month', VehicleMileage.personal_paid_at) == sel_month,
    ).all()
    total_personal_received = 0.0
    for m in personal_mileages:
        if m.fuel_cost:
            total_personal_received += float(m.fuel_cost)
        elif m.odometer_end and m.odometer_start and m.booking.assigned_vehicle:
            dist = m.odometer_end - m.odometer_start
            rate = float(m.booking.assigned_vehicle.fuel_rate or 10)
            total_personal_received += round((dist / rate) * fuel_price, 2)

    personal_unpaid_mileages = VehicleMileage.query.join(VehicleBooking).filter(
        VehicleBooking.expense_type == 'personal',
        VehicleMileage.odometer_end.isnot(None),
        ((VehicleMileage.personal_status == 0) | (VehicleMileage.personal_status.is_(None))),
        extract('year',  VehicleMileage.actual_end) == sel_year,
        extract('month', VehicleMileage.actual_end) == sel_month,
    ).all()
    total_personal_unpaid_amount = 0.0
    for m in personal_unpaid_mileages:
        if m.fuel_cost:
            total_personal_unpaid_amount += float(m.fuel_cost)
        elif m.odometer_end and m.odometer_start and m.booking.assigned_vehicle:
            dist = m.odometer_end - m.odometer_start
            rate = float(m.booking.assigned_vehicle.fuel_rate or 10)
            total_personal_unpaid_amount += round((dist / rate) * fuel_price, 2)

    over_budget_rows = [b for b in (_active_central + _active_dept)
                        if float(b['used_amount']) > float(b['budget_amount']) > 0]

    total_cap = total_central_budget + total_dept_budget
    return {
        'central_budget':         total_central_budget,
        'dept_budget':            total_dept_budget,
        'total_budget':           total_cap,
        'central_used':           total_central_used,
        'dept_used':              total_dept_used,
        'total_used':             total_central_used + total_dept_used,
        'central_remaining':      total_central_budget - total_central_used,
        'dept_remaining':         total_dept_budget - total_dept_used,
        'total_remaining':        total_cap - (total_central_used + total_dept_used),
        'central_pending_count':  total_central_pending,
        'dept_pending_count':     total_dept_pending,
        'total_pending_count':    total_central_pending + total_dept_pending,
        'personal_received':      total_personal_received,
        'personal_unpaid_count':  len(personal_unpaid_mileages),
        'personal_unpaid_amount': total_personal_unpaid_amount,
        'over_budget_count':      len(over_budget_rows),
        'pct_of_cap':             ((total_central_used + total_dept_used) / total_cap * 100)
                                   if total_cap > 0 else 0,
    }


def _load_personal_rows(sel_year, sel_month, fuel_price):
    _personal_all = VehicleMileage.query.join(VehicleBooking).filter(
        VehicleBooking.expense_type == 'personal',
        VehicleMileage.odometer_end.isnot(None),
        or_(
            and_(VehicleMileage.personal_status == 1,
                 extract('year',  VehicleMileage.personal_paid_at) == sel_year,
                 extract('month', VehicleMileage.personal_paid_at) == sel_month),
            and_(or_(VehicleMileage.personal_status == 0,
                     VehicleMileage.personal_status.is_(None)),
                 extract('year',  VehicleMileage.actual_end) == sel_year,
                 extract('month', VehicleMileage.actual_end) == sel_month),
        ),
    ).order_by(VehicleMileage.actual_end.desc()).all()

    rows = []
    for pm in _personal_all:
        if pm.fuel_cost:
            pcost = float(pm.fuel_cost)
        elif pm.odometer_end and pm.odometer_start and pm.booking and pm.booking.assigned_vehicle:
            dist  = pm.odometer_end - pm.odometer_start
            rate  = float(pm.booking.assigned_vehicle.fuel_rate or 10)
            pcost = round((dist / rate) * fuel_price, 2)
        else:
            pcost = 0.0
        bk = pm.booking
        rows.append({
            'mileage_id':   pm.id,
            'booking_id':   bk.id if bk else None,
            'date':         pm.actual_end,
            'user':         (bk.user.full_name or bk.user.username) if (bk and bk.user) else '—',
            'destination':  (bk.destination if bk else '') or '—',
            'fuel_cost':    pcost,
            'is_paid':      (pm.personal_status == 1),
            'paid_at':      pm.personal_paid_at,
        })
    return rows


@adminfleet_bp.route('/admin/budget', methods=['GET', 'POST'])
@login_required
def budget_manage():
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์', 'danger')
        return redirect(url_for('vehicle.index'))

    if request.method == 'POST':
        action = request.form.get('action')
        _POST_HANDLERS = {
            'set_budget':     _handle_set_budget,
            'top_up':         _handle_top_up,
            'manual_adjust':  _handle_manual_adjust,
            'toggle_active':  _handle_toggle_active,
            'extend_period':  _handle_extend_period,
            'cancel_booking': _handle_cancel_booking,
        }
        handler = _POST_HANDLERS.get(action)
        if handler:
            handler()
        return redirect(url_for('adminfleet.budget_manage',
                                year=request.form.get('year') or '',
                                month=request.form.get('month') or ''))

    now       = get_bkk_time()
    sel_year  = int(request.args.get('year',  now.year))
    sel_month = int(request.args.get('month', now.month))

    central_budgets, dept_budgets, archived_budgets, pending_list = \
        _load_budget_rows(sel_year, sel_month)

    kpi = _calc_budget_kpi(central_budgets, dept_budgets, sel_year, sel_month)

    fuel_price    = float(SystemConfig.get('fuel_price', '40'))
    personal_rows = _load_personal_rows(sel_year, sel_month, fuel_price)

    central_dept_names = [cat['label'] for cat in EXPENSE_CATEGORIES['central']]
    dept_dept_names    = [d.name for d in VehicleDepartment.query
                          .filter(VehicleDepartment.is_disable == 0)
                          .join(VehicleDepartment.budget_type)
                          .filter(BudgetType.name == 'department')
                          .order_by(VehicleDepartment.name).all()]
    eligible_approvers = User.query.order_by(User.full_name).all()

    fiscal_year_start_ad = sel_year if sel_month >= 3 else sel_year - 1
    pivot = _build_budget_pivot(fiscal_year_start_ad)

    _TH_MONTHS = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

    return render_template('vehicle/admin/vehicle_budget.html',
                           central_budgets=central_budgets,
                           dept_budgets=dept_budgets,
                           archived_budgets=archived_budgets,
                           central_dept_names=central_dept_names,
                           dept_dept_names=dept_dept_names,
                           eligible_approvers=eligible_approvers,
                           kpi=kpi,
                           pending_list=pending_list,
                           personal_rows=personal_rows,
                           sel_year=sel_year, sel_month=sel_month,
                           month_label=f"{_TH_MONTHS[sel_month]} {sel_year+543}",
                           TH_MONTHS=_TH_MONTHS,
                           pivot=pivot,
                           fiscal_year_start_ad=fiscal_year_start_ad,
                           now=now)



def _build_budget_pivot(fiscal_year_start_ad):
    """Build fiscal-year (Mar→Feb) pivot for budget_manage page.

    Phase 7 (2026-05-22). Fiscal year = months [3..12] of `fiscal_year_start_ad`
    + months [1..2] of `fiscal_year_start_ad + 1`. Filter `is_active=True` only
    (inactive budgets excluded from pivot per design intent).

    Phase 2 (2026-05-22, redesign continuation): เพิ่ม `personal` row —
    sum fuel_cost ของ VehicleMileage ที่ expense_type='personal' + personal_status=1
    (admin ยืนยันรับเงินแล้ว) ภายใน fiscal year. Aggregate ตาม personal_paid_at.

    Returns dict:
      {
        'central':        { dept_id: { month_num: used_amount } },
        'central_labels': { dept_id: dept_name },
        'central_max':    float,           # max used cell (for heat scale)
        'dept':           { dept_id: { month_num: used_amount } },
        'dept_labels':    { dept_id: dept_name },
        'dept_max':       float,
        'personal':       { month_num: total_received },   # 1 row across fiscal year
        'personal_max':   float,
        'fiscal_months':  [(month, year_ad), ...],  # ordered Mar→Feb (12 tuples)
        'summary': {                                 # 2026-06-08: default pivot view
          'central':  {'budget','used','pct','count'},   # เพดาน+ใช้ไป รวมทั้งปีงบ
          'dept':     {'budget','used','pct','count'},
          'personal': {'used'},                          # ไม่มีเพดาน
        }
      }
    """
    fiscal_months = [(m, fiscal_year_start_ad) for m in range(3, 13)] \
                  + [(m, fiscal_year_start_ad + 1) for m in (1, 2)]

    # ── งบช่วงเวลา (2026-06-06): pivot ดึง "ยอดหักจริงต่อเดือน" จาก ledger
    #    used_amount เป็นยอดสะสมทั้งช่วงงบ (ข้ามเดือน) → break down ต่อเดือนจาก
    #    created_at ของ event หัก/คืน/ปรับ (net change_amount). set_budget/set_active = 0 ตัดออกแล้ว
    fy_start = datetime(fiscal_year_start_ad,     3, 1)
    fy_end   = datetime(fiscal_year_start_ad + 1, 3, 1)
    log_rows = (db.session.query(VehicleBudgetLog, VehicleBudget, BudgetType)
                .join(VehicleBudget, VehicleBudgetLog.budget_id == VehicleBudget.id)
                .join(BudgetType, VehicleBudget.budget_type_id == BudgetType.id)
                .filter(VehicleBudgetLog.event_type.in_(['deduct', 'refund', 'adjust']),
                        VehicleBudgetLog.created_at >= fy_start,
                        VehicleBudgetLog.created_at <  fy_end)
                .all())

    central, dept = {}, {}
    labels_c, labels_d = {}, {}
    for log, b, bt in log_rows:
        is_central = (bt.name == 'central')
        bucket = central if is_central else dept
        labels = labels_c if is_central else labels_d
        did = b.department_id
        mkey = log.created_at.month
        if did not in bucket:
            bucket[did] = {}
            labels[did] = b.department.name
        bucket[did][mkey] = bucket[did].get(mkey, 0.0) + float(log.change_amount or 0)

    max_c = max((v for row in central.values() for v in row.values() if v > 0), default=0)
    max_d = max((v for row in dept.values()    for v in row.values() if v > 0), default=0)

    # ── Personal row: aggregate ทุก mileage ที่ admin รับเงินแล้ว (personal_status=1)
    #    ภายใน fiscal year (group by month of personal_paid_at) — fy_start/fy_end นิยามด้านบนแล้ว
    personal_mileages = (VehicleMileage.query
                         .join(VehicleBooking)
                         .filter(VehicleBooking.expense_type == 'personal',
                                 VehicleMileage.personal_status == 1,
                                 VehicleMileage.personal_paid_at >= fy_start,
                                 VehicleMileage.personal_paid_at <  fy_end)
                         .all())
    fuel_price = float(SystemConfig.get('fuel_price', '40'))
    personal         = {}
    personal_by_user = {}  # { user_id: { month_num: float } }
    personal_user_labels = {}  # { user_id: str }
    for mi in personal_mileages:
        if not mi.personal_paid_at:
            continue
        if mi.fuel_cost:
            cost = float(mi.fuel_cost)
        elif mi.odometer_end and mi.odometer_start and mi.booking.assigned_vehicle:
            dist = mi.odometer_end - mi.odometer_start
            rate = float(mi.booking.assigned_vehicle.fuel_rate or 10)
            cost = round((dist / rate) * fuel_price, 2)
        else:
            cost = 0.0
        mkey = mi.personal_paid_at.month
        personal[mkey] = personal.get(mkey, 0.0) + cost
        uid = mi.booking.user_id
        if uid not in personal_by_user:
            personal_by_user[uid]    = {}
            u = mi.booking.user
            personal_user_labels[uid] = (u.full_name or u.username) if u else str(uid)
        personal_by_user[uid][mkey] = personal_by_user[uid].get(mkey, 0.0) + cost

    max_p = max((v for v in personal.values() if v > 0), default=0)

    # ── Fiscal-year summary per category (2026-06-08 redesign):
    #    default pivot view = 3 สรุปแถว (ส่วนกลาง/กอง/ส่วนตัว) เพดานรวม + ใช้ไป%
    #    used = sum ยอดหักจริงต่อเดือนทั้งปีงบ (จาก cells ที่ build ด้านบน)
    #    budget = sum เพดานของ VehicleBudget ที่ (year, month) อยู่ในปีงบนี้ ตามประเภท
    central_used_fy = sum(v for row in central.values() for v in row.values())
    dept_used_fy    = sum(v for row in dept.values()    for v in row.values())
    personal_used_fy = sum(personal.values())

    fy_set = set(fiscal_months)  # {(month, year_ad), ...}
    cap_rows = (db.session.query(VehicleBudget.budget_amount,
                                 VehicleBudget.year, VehicleBudget.month,
                                 BudgetType.name)
                .join(BudgetType, VehicleBudget.budget_type_id == BudgetType.id)
                .all())
    central_cap_fy = dept_cap_fy = 0.0
    for amt, yr, mo, btname in cap_rows:
        if (mo, yr) in fy_set:
            if btname == 'central':
                central_cap_fy += float(amt or 0)
            elif btname == 'department':
                dept_cap_fy += float(amt or 0)

    summary = {
        'central': {
            'budget': central_cap_fy,
            'used':   central_used_fy,
            'pct':    (central_used_fy / central_cap_fy * 100) if central_cap_fy > 0 else 0,
            'count':  len(central),
        },
        'dept': {
            'budget': dept_cap_fy,
            'used':   dept_used_fy,
            'pct':    (dept_used_fy / dept_cap_fy * 100) if dept_cap_fy > 0 else 0,
            'count':  len(dept),
        },
        'personal': {
            'used':   personal_used_fy,
        },
    }

    return {
        'central':        central,
        'central_labels': labels_c,
        'central_max':    max_c,
        'dept':           dept,
        'dept_labels':    labels_d,
        'dept_max':       max_d,
        'personal':             personal,
        'personal_max':         max_p,
        'personal_by_user':     personal_by_user,
        'personal_user_labels': personal_user_labels,
        'fiscal_months':        fiscal_months,
        'summary':              summary,
    }


# ══════════════════════════════════════════════════════
# Feature 3.1: Personal Reimbursement
# ══════════════════════════════════════════════════════

@adminfleet_bp.route('/admin/budget/personal', methods=['GET'])
@login_required
def budget_personal():
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์', 'danger')
        return redirect(url_for('vehicle.index'))

    now       = get_bkk_time()
    sel_year  = int(request.args.get('year',  now.year))
    sel_month = int(request.args.get('month', now.month))
    status_filter = request.args.get('status', 'all')  # all | pending | paid

    # ดึง mileage ที่ trip เป็น personal และปิดงานแล้ว (odometer_end มีค่า)
    q = VehicleMileage.query.join(VehicleBooking).filter(
        VehicleBooking.expense_type == 'personal',
        VehicleMileage.odometer_end.isnot(None),
        extract('year',  VehicleMileage.actual_end) == sel_year,
        extract('month', VehicleMileage.actual_end) == sel_month,
    )
    if status_filter == 'pending':
        q = q.filter(VehicleMileage.personal_status == 0)
    elif status_filter == 'paid':
        q = q.filter(VehicleMileage.personal_status == 1)

    mileages = q.order_by(VehicleMileage.actual_end.desc()).all()

    fuel_price = float(SystemConfig.get('fuel_price', '40'))
    rows = []
    total_pending = 0.0
    total_paid    = 0.0
    for m in mileages:
        b = m.booking
        distance = (m.odometer_end - m.odometer_start) if (m.odometer_end and m.odometer_start) else 0
        cost = calc_fuel_cost(b.assigned_vehicle, distance, fuel_price, m.fuel_cost)

        if m.personal_status == 0:
            total_pending += cost
        else:
            total_paid += cost

        rows.append({
            'mileage_id':   m.id,
            'booking_id':   b.id,
            'user_name':    b.user.full_name or b.user.username,
            'department':   b.trip_department or '—',
            'destination':  b.destination,
            'actual_end':   m.actual_end,
            'distance':     distance,
            'cost':         cost,
            'status':       m.personal_status,  # 0=pending, 1=paid
            'paid_at':      m.personal_paid_at,
            'paid_by':      (m.personal_paid_by.full_name or m.personal_paid_by.username) if m.personal_paid_by else None,
        })

    TH_MONTHS = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    return render_template('vehicle/admin/vehicle_budget_personal.html',
                           rows=rows,
                           total_pending=total_pending,
                           total_paid=total_paid,
                           sel_year=sel_year, sel_month=sel_month,
                           month_label=f"{TH_MONTHS[sel_month]} {sel_year+543}",
                           status_filter=status_filter,
                           now=now)



@adminfleet_bp.route('/admin/budget/personal/mark_paid', methods=['POST'])
@login_required
def budget_personal_mark_paid():
    if not is_vehicle_admin():
        return jsonify({'ok': False, 'msg': 'ไม่มีสิทธิ์'}), 403

    mileage_id = request.form.get('mileage_id', type=int)
    m = VehicleMileage.query.get_or_404(mileage_id)

    m.personal_status     = 1
    m.personal_paid_at    = get_bkk_time()
    m.personal_paid_by_id = current_user.id

    # ปิด sticky payment notifications ที่ค้างของ booking นี้ (ทั้งของ user และ admin)
    Notification.query.filter(
        Notification.booking_id == m.booking_id,
        Notification.category.in_(['payment', 'payment_admin']),
        Notification.is_read == False
    ).update({'is_read': True, 'is_sticky': False}, synchronize_session=False)

    # แจ้ง user ว่ายืนยันแล้ว
    _n_payment_confirmed(m.booking, m)
    db.session.commit()

    return jsonify({'ok': True})



@adminfleet_bp.route('/admin/budget/personal/mark_unpaid', methods=['POST'])
@login_required
def budget_personal_mark_unpaid():
    if not is_vehicle_admin():
        return jsonify({'ok': False, 'msg': 'ไม่มีสิทธิ์'}), 403

    mileage_id = request.form.get('mileage_id', type=int)
    m = VehicleMileage.query.get_or_404(mileage_id)

    m.personal_status     = 0
    m.personal_paid_at    = None
    m.personal_paid_by_id = None
    db.session.commit()

    return jsonify({'ok': True})


# ══════════════════════════════════════════════════════
# Feature 4: Vehicle History (API — ใช้ใน manage-fleet)
# ══════════════════════════════════════════════════════
