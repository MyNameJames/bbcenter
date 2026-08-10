from flask import render_template, request, redirect, url_for, flash, jsonify, session, current_app
from flask_login import login_required, current_user
from models import (db, get_bkk_time, User, Vehicle, VehicleBooking, VehicleMileage,
                    SystemConfig, VehicleBudget, VehicleBudgetLog, VehicleDepartment,
                    BudgetType, Notification, VehicleBudgetYearlyPlan)
from sqlalchemy import and_, extract, func, or_
from datetime import datetime, date, timedelta
from calendar import monthrange
from views.core.notification_service import (
    notify_payment_confirmed    as _n_payment_confirmed,
)
import services.vehicle.budget_service as budget_svc
import services.vehicle.booking_service as booking_svc
from views.vehicle.vehicle_common import (
    vehicle_bp, adminfleet_bp, admincost_bp, driver_bp,
    is_vehicle_admin, _lookup_budget_for_booking,
    EXPENSE_CATEGORIES, TH_MONTHS, _fmt_date_th,
    get_fuel_price, calc_fuel_cost,
)


def _handle_set_budget():
    """v2.26: เลิกให้ admin เลือกช่วงเวลาของงบย่อยเอง — เลือก "ก้อนงบ" (yearly_plan_id) แทน
    แล้ว year/month (anchor) + start_date/end_date inherit จาก plan อัตโนมัติ (ดู ADR/schema v2.26).
    Uniqueness lookup เปลี่ยนจาก (dept, year, month, type) เป็น (dept, yearly_plan_id, type)"""
    dept        = request.form.get('department', '').strip()
    plan_id     = request.form.get('yearly_plan_id')
    amount      = float(request.form.get('budget_amount', 0))
    budget_type = request.form.get('budget_type', 'department')
    approver_id = request.form.get('approver_id') or None
    note_extra  = (request.form.get('note') or '').strip()
    if approver_id:
        approver_id = int(approver_id)

    plan = VehicleBudgetYearlyPlan.query.get(int(plan_id)) if plan_id else None
    if not plan:
        flash('กรุณาเลือกก้อนงบที่จะแตกงบย่อยนี้ออกมา', 'danger')
        return

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
        department_id=dept_obj.id, yearly_plan_id=plan.id, budget_type_id=bt_obj.id
    ).first()

    type_label = "ส่วนกลาง" if budget_type == 'central' else "งานกอง"

    # กันตั้งเพดานเกินวงเงินที่ plan จัดสรรไว้ให้ประเภทนี้ (redesign 2026-08-07 — เดิมไม่มีการเช็กเลย
    # แค่โชว์ progress bar เป็นข้อมูลประกอบ, ผู้ใช้ตัดสินใจให้บล็อกจริง) เทียบผลรวมงบย่อยอื่นในก้อนงบ
    # +ประเภทเดียวกัน (ไม่รวมตัวเอง ถ้าเป็นการแก้ไข) กับ central_allocation/dept_allocation
    pool = float(plan.central_allocation if budget_type == 'central' else plan.dept_allocation)
    others_total = db.session.query(func.sum(VehicleBudget.budget_amount)).filter(
        VehicleBudget.yearly_plan_id == plan.id,
        VehicleBudget.budget_type_id == bt_obj.id,
        VehicleBudget.id != (budget.id if budget else 0),
    ).scalar() or 0
    remaining = pool - float(others_total)
    if amount > remaining:
        flash(f'เกินวงเงิน{type_label}ของก้อนงบนี้ — เหลือจัดสรรได้อีก {remaining:,.0f} บาท', 'danger')
        return

    if budget:
        note = f'admin {current_user.username}: update budget {budget_type} {dept} plan#{plan.id} → {amount}'
        if note_extra:
            note += f' | {note_extra}'
        budget_svc.set_budget_amount(budget, amount, note=note)
        if budget_type == 'department':
            budget.approver_id = approver_id
    else:
        budget = VehicleBudget(
            department_id=dept_obj.id, budget_type_id=bt_obj.id,
            yearly_plan_id=plan.id,
            year=plan.start_date.year, month=plan.start_date.month,
            start_date=plan.start_date, end_date=plan.end_date,
            budget_amount=amount,
            approver_id=approver_id if budget_type == 'department' else None,
        )
        db.session.add(budget)
        db.session.flush()
        note = f'admin {current_user.username}: create budget {budget_type} {dept} plan#{plan.id} = {amount}'
        if note_extra:
            note += f' | {note_extra}'
        budget_svc.set_budget_amount(budget, amount, note=note)
    db.session.commit()
    flash(f'ตั้งงบ{type_label} "{dept}" (ก้อนงบ {plan.fiscal_year + 543}) = {amount:,.0f} บาท เรียบร้อย', 'success')


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


def _handle_delete_budget():
    """ลบงบย่อยทิ้งถาวร (v2.29) — เชื่อมปุ่ม icon delete ในตาราง 'งบปิดแล้ว'
    บล็อกที่ service layer ถ้างบนี้เคยมีการหักเงิน/ปรับยอดจริงแล้ว (ดู budget_svc.delete_budget)"""
    try:
        bid       = int(request.form.get('budget_id'))
        budget    = VehicleBudget.query.get_or_404(bid)
        dept_name = budget.department.name
        budget_svc.delete_budget(budget)
        db.session.commit()
        flash(f'ลบงบ "{dept_name}" เรียบร้อย', 'success')
    except ValueError as e:
        db.session.rollback()
        flash(f'ลบไม่สำเร็จ: {e}', 'danger')
    except Exception:
        db.session.rollback()
        current_app.logger.exception('budget_manage:delete_budget failed')
        flash('เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง', 'danger')


def _handle_delete_plan():
    """ลบเงินก้อนประจำปีทิ้งถาวร (v2.30) — เชื่อมปุ่ม icon delete ในแท็บ 'งบหลัก'
    บล็อกที่ service layer ถ้ามีงบย่อยที่ผูกก้อนนี้ใช้ไปแล้ว (ดู budget_svc.delete_yearly_plan) —
    ถ้าไม่บล็อก จะ cascade ลบงบย่อย + log ที่ผูกอยู่ทั้งหมดไปด้วย"""
    try:
        plan_id   = int(request.form.get('plan_id'))
        plan      = VehicleBudgetYearlyPlan.query.get_or_404(plan_id)
        plan_name = plan.name or f'ปีงบ {plan.fiscal_year + 543}'
        budget_svc.delete_yearly_plan(plan)
        db.session.commit()
        flash(f'ลบ "{plan_name}" เรียบร้อย', 'success')
    except ValueError as e:
        db.session.rollback()
        flash(f'ลบไม่สำเร็จ: {e}', 'danger')
    except Exception:
        db.session.rollback()
        current_app.logger.exception('budget_manage:delete_plan failed')
        flash('เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง', 'danger')


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
    """ปิด DEBT-3 (Phase 3.5, 2026-07-19): เรียก booking_svc.cancel() ทางเดียวกับ
    vehicle_booking.py::cancel_booking() แทนเซ็ต booking.status = 'cancelled' ตรง — ได้ guard
    ครบ (status/time/mileage start entry) + trip-mate un-merge cascade มาด้วยอัตโนมัติ (เดิม
    ไม่มีเลยทั้งคู่). เปลี่ยน behavior ตั้งใจ: เดิม status เป็น rejected/cancelled อยู่แล้ว =
    no-op เงียบๆ แต่ flash success — ตอนนี้ guard จะ block พร้อม error message ชัดเจนแทน

    notify=False (Phase 4, 2026-07-19): เส้นทางนี้ไม่เคยแจ้งเตือนใครมาก่อนเลย (ไม่มี notify
    import ในไฟล์นี้ด้วยซ้ำ) — cancel() ตอนนี้มี notify logic เต็ม (in-app + Telegram) แต่
    การรวม path ตอน Phase 3.5 ตั้งใจรวมแค่ guard/status ไม่ได้ตั้งใจให้ budget_manage ได้
    notify ใหม่มาด้วยเป็นผลพลอยได้ — คง gap เดิมไว้ผ่าน flag นี้"""
    try:
        bk_id   = int(request.form.get('booking_id'))
        booking = VehicleBooking.query.get_or_404(bk_id)
        ok, msg, info = booking_svc.cancel(booking, actor_id=current_user.id,
                                           is_owner=False, is_admin=True, notify=False)
        if not ok:
            flash(msg, 'warning')
            return
        db.session.commit()
        flash(f'ยกเลิก booking #{bk_id} เรียบร้อย', 'success')
    except Exception:
        db.session.rollback()
        current_app.logger.exception('budget_manage:cancel_booking failed')
        flash('ยกเลิก booking ไม่สำเร็จ เกิดข้อผิดพลาดภายในระบบ', 'danger')


def _handle_set_yearly_plan():
    """ตั้ง/แก้ไข VehicleBudgetYearlyPlan (v2.26 — plan มีช่วงเวลาของตัวเอง admin เลือกเอง
    แทน implicit มี.ค.-ก.พ. เดิม) — เชื่อม modal #yearlyPlanModal. plan_id ว่าง = สร้างใหม่,
    มีค่า = แก้ไข allocated-so-far หาโดย filter VehicleBudget.yearly_plan_id ตรงๆ (ง่ายกว่า
    pivot(fiscal_year) เดิมที่ต้อง compute ช่วงเดือนจาก march-hardcode)"""
    try:
        plan_id             = request.form.get('plan_id') or None
        name                = (request.form.get('name') or '').strip()
        start_date_str      = (request.form.get('start_date') or '').strip()
        end_date_str        = (request.form.get('end_date') or '').strip()
        # ypTotal/ypCentral เป็น type="text" + comma mask ฝั่ง client (2026-08-07) — strip comma
        # กันพลาดเผื่อ JS ไม่ทำงาน (float() ตรงๆ จะ ValueError ถ้ามี comma หลุดมา)
        total_amount        = float((request.form.get('total_amount') or '0').replace(',', ''))
        central_allocation  = float((request.form.get('central_allocation') or '0').replace(',', ''))
        if not start_date_str or not end_date_str:
            raise ValueError('ต้องระบุช่วงเวลาของเงินก้อนนี้')
        start_date = date.fromisoformat(start_date_str)
        end_date   = date.fromisoformat(end_date_str)
        fiscal_year = start_date.year

        central_allocated_sum = dept_allocated_sum = 0.0
        if plan_id:
            cap_rows = (db.session.query(VehicleBudget.budget_amount, BudgetType.name)
                        .join(BudgetType, VehicleBudget.budget_type_id == BudgetType.id)
                        .filter(VehicleBudget.yearly_plan_id == int(plan_id))
                        .all())
            for amt, btname in cap_rows:
                if btname == 'central':
                    central_allocated_sum += float(amt or 0)
                elif btname == 'department':
                    dept_allocated_sum += float(amt or 0)

        budget_svc.set_yearly_plan(
            int(plan_id) if plan_id else None,
            fiscal_year, total_amount, central_allocation, start_date, end_date,
            name=name,
            central_allocated_sum=central_allocated_sum,
            dept_allocated_sum=dept_allocated_sum,
        )
        db.session.commit()
        flash(f'ตั้ง "{name or ("เงินก้อนประจำปี " + str(fiscal_year + 543))}" เรียบร้อย', 'success')
    except ValueError as e:
        db.session.rollback()
        flash(f'บันทึกไม่สำเร็จ: {e}', 'danger')
    except Exception:
        db.session.rollback()
        current_app.logger.exception('budget_manage:set_yearly_plan failed')
        flash('เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง', 'danger')


def _handle_set_default_plan():
    """ตั้งก้อนงบให้เป็นค่าเริ่มต้น (v2.28) — เชื่อม radio ในตาราง 'รายชื่องบใหญ่'
    (tab ใหม่). บล็อกถ้า plan ไม่ครอบวันนี้ (ดู budget_svc.set_default_plan)"""
    try:
        plan_id = int(request.form.get('plan_id'))
        plan = budget_svc.set_default_plan(plan_id)
        db.session.commit()
        flash(f'ตั้ง "{plan.name or (str(plan.fiscal_year + 543))}" เป็นก้อนงบเริ่มต้นแล้ว', 'success')
    except ValueError as e:
        db.session.rollback()
        flash(f'ตั้งค่าเริ่มต้นไม่สำเร็จ: {e}', 'danger')
    except Exception:
        db.session.rollback()
        current_app.logger.exception('budget_manage:set_default_plan failed')
        flash('เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง', 'danger')


def _build_plan_list_rows(today):
    """List ทุก VehicleBudgetYearlyPlan พร้อมยอดจัดสรร/ใช้ไปต่อ plan — ใช้ในตาราง 'รายชื่องบใหญ่'
    (tab ใหม่ v2.28). allocated/used = SUM ของ VehicleBudget ที่ผูก yearly_plan_id นั้นตรงๆ (รวม
    central+dept). covers_today กำหนดว่า radio 'ตั้งเป็นค่าเริ่มต้น' กดได้ไหม (ดู set_default_plan)

    alloc_central/alloc_dept (2026-08-07): allocated แยกตาม budget_type — เดิม allocated รวมสอง
    ประเภทปนกัน ใช้เทียบ central_allocation/dept_allocation ของ plan (คนละวงเงิน) ไม่ได้ตรง ๆ
    เพิ่มไว้ให้ setBudgetModal (สร้างงบย่อยใหม่) โชว์วงเงินคงเหลือแยกประเภท + บล็อกเกินวงเงิน"""
    plans = VehicleBudgetYearlyPlan.query.order_by(VehicleBudgetYearlyPlan.start_date.desc()).all()
    if not plans:
        return []

    sum_rows = (db.session.query(
                    VehicleBudget.yearly_plan_id,
                    func.sum(VehicleBudget.budget_amount),
                    func.sum(VehicleBudget.used_amount))
                .filter(VehicleBudget.yearly_plan_id.isnot(None))
                .group_by(VehicleBudget.yearly_plan_id)
                .all())
    sums_by_plan = {pid: (float(b or 0), float(u or 0)) for pid, b, u in sum_rows}

    type_rows = (db.session.query(
                    VehicleBudget.yearly_plan_id,
                    BudgetType.name,
                    func.sum(VehicleBudget.budget_amount))
                .join(BudgetType, VehicleBudget.budget_type_id == BudgetType.id)
                .filter(VehicleBudget.yearly_plan_id.isnot(None))
                .group_by(VehicleBudget.yearly_plan_id, BudgetType.name)
                .all())
    alloc_by_type = {}
    for pid, type_name, total in type_rows:
        alloc_by_type.setdefault(pid, {'central': 0.0, 'department': 0.0})[type_name] = float(total or 0)

    rows = []
    for p in plans:
        allocated, used = sums_by_plan.get(p.id, (0.0, 0.0))
        by_type = alloc_by_type.get(p.id, {'central': 0.0, 'department': 0.0})
        rows.append({
            'plan':         p,
            'allocated':    allocated,
            'used':         used,
            'alloc_central': by_type['central'],
            'alloc_dept':    by_type['department'],
            'covers_today': p.start_date <= today <= p.end_date,
            'start_date_th': _fmt_date_th(p.start_date),
            'end_date_th':   _fmt_date_th(p.end_date),
        })
    return rows


def _build_pending_count_map(pending_bookings):
    """นับ pending booking (ยังไม่หักงบ) ต่อแผนก — key = trip_department_id (extract จาก
    _load_budget_rows ตอน Phase 5, logic เดิม 100%)"""
    pending_count_map = {}
    for pb in pending_bookings:
        if pb.trip_department_id:
            key = pb.trip_department_id
            pending_count_map[key] = pending_count_map.get(key, 0) + 1
    return pending_count_map


def _budget_row_dict(b, month_start, month_end, pending_count_map):
    """คำนวณ 1 row ของงบ (pct/status_reason/active_for_month) (extract จาก _load_budget_rows
    ตอน Phase 5, logic เดิม 100%) คืน (row: dict, active_for_month: bool)"""
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
        'pending_count':   pending_count_map.get(pkey, 0),
        'is_active':       b.is_active,
        'status_reason':   status_reason,
        'yearly_plan_id':  b.yearly_plan_id,  # v2.26 — ให้ปุ่ม "แก้ไข" ใน setBudgetModal preselect ก้อนงบเดิม
    }
    return row, active_for_month


def _build_pending_list(pending_bookings):
    """แปลง pending_bookings เป็น list ของ dict สำหรับแสดงผล (extract จาก _load_budget_rows
    ตอน Phase 5, logic เดิม 100%)"""
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
    return pending_list


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
    pending_count_map = _build_pending_count_map(pending_bookings)

    budgets  = []
    archived = []
    for b in raw_budgets:
        row, active_for_month = _budget_row_dict(b, month_start, month_end, pending_count_map)
        (budgets if active_for_month else archived).append(row)

    central_budgets  = [b for b in budgets if b['budget_type'] == 'central']
    dept_budgets     = [b for b in budgets if b['budget_type'] == 'department']
    archived_budgets = sorted(archived, key=lambda x: x['end_date'] or '', reverse=True)

    pending_list = _build_pending_list(pending_bookings)

    return central_budgets, dept_budgets, archived_budgets, pending_list


def _sum_personal_fuel_cost(mileages, fuel_price):
    """รวม fuel_cost ของ mileage list (override ถ้ามี ไม่งั้นคำนวณจาก odometer) (extract จาก
    _calc_budget_kpi ตอน Phase 5 — เดิม copy logic นี้ซ้ำ 2 จุด (received + unpaid) รวมเป็น
    helper เดียว behavior เดิม 100% ทุกจุด)"""
    total = 0.0
    for m in mileages:
        if m.fuel_cost:
            total += float(m.fuel_cost)
        elif m.odometer_end and m.odometer_start and m.booking.assigned_vehicle:
            dist = m.odometer_end - m.odometer_start
            rate = float(m.booking.assigned_vehicle.fuel_rate or 10)
            total += round((dist / rate) * fuel_price, 2)
    return total


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
    total_personal_received = _sum_personal_fuel_cost(personal_mileages, fuel_price)

    personal_unpaid_mileages = VehicleMileage.query.join(VehicleBooking).filter(
        VehicleBooking.expense_type == 'personal',
        VehicleMileage.odometer_end.isnot(None),
        ((VehicleMileage.personal_status == 0) | (VehicleMileage.personal_status.is_(None))),
        extract('year',  VehicleMileage.actual_end) == sel_year,
        extract('month', VehicleMileage.actual_end) == sel_month,
    ).all()
    total_personal_unpaid_amount = _sum_personal_fuel_cost(personal_unpaid_mileages, fuel_price)

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
    # เรียงค้างรับขึ้นก่อนเสมอ (ต้องตามให้ทัน) แล้วค่อยเรียงวันที่ล่าสุดก่อนในแต่ละกลุ่ม (2026-08-07,
    # ตัด status filter tab ออกจาก UI แล้ว — ใช้ sort แทนเพื่อให้ยังเห็นรายการค้างเด่นอยู่)
    epoch = datetime(1970, 1, 1)
    rows.sort(key=lambda r: (r['is_paid'], -(r['date'] - epoch).total_seconds() if r['date'] else 0))
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
            'set_budget':      _handle_set_budget,
            'top_up':          _handle_top_up,
            'manual_adjust':   _handle_manual_adjust,
            'toggle_active':   _handle_toggle_active,
            'extend_period':   _handle_extend_period,
            'cancel_booking':  _handle_cancel_booking,
            'set_yearly_plan': _handle_set_yearly_plan,
            'set_default_plan': _handle_set_default_plan,
            'delete_budget':   _handle_delete_budget,
            'delete_plan':     _handle_delete_plan,
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

    # "ก้อนงบ" ที่กำลังดู (v2.26 — เลิก compute fiscal_year_start_ad จาก sel_year/sel_month แบบ
    # march-hardcode แล้ว) — ลำดับความสำคัญ (v2.28): (1) ?plan_id= ที่ระบุมา (2) plan ที่
    # is_default=True และยังครอบวันนี้อยู่ (3) plan ใดๆ ที่ครอบวันนี้ (fallback เดิม)
    # (4) ไม่มีเลย → plan ล่าสุดที่มี (ยังไม่เคยตั้ง/ทุก plan หมดอายุแล้ว)
    today   = now.date()
    plan_id = request.args.get('plan_id', type=int)
    if plan_id:
        yearly_plan = VehicleBudgetYearlyPlan.query.get(plan_id)
    else:
        yearly_plan = (VehicleBudgetYearlyPlan.query
                       .filter(VehicleBudgetYearlyPlan.is_default.is_(True),
                               VehicleBudgetYearlyPlan.start_date <= today,
                               VehicleBudgetYearlyPlan.end_date   >= today)
                       .first())
        if not yearly_plan:
            yearly_plan = (VehicleBudgetYearlyPlan.query
                           .filter(VehicleBudgetYearlyPlan.start_date <= today,
                                   VehicleBudgetYearlyPlan.end_date   >= today)
                           .first())
    if not yearly_plan:
        yearly_plan = (VehicleBudgetYearlyPlan.query
                       .order_by(VehicleBudgetYearlyPlan.start_date.desc()).first())

    # รายชื่องบใหญ่ (tab ใหม่ v2.28) — list ทุก plan พร้อมยอดจัดสรร/ใช้ไป + covers_today
    # (ให้ radio 'ตั้งเป็นค่าเริ่มต้น' เปิด/ปิดใช้งาน) · ปี พ.ศ. ทั้งหมดที่มี plan ทับช่วงอยู่
    # (สำหรับ chip "ปี" — derive จาก start_date/end_date จริง ไม่ใช้ fiscal_year label ที่พิมพ์เอง)
    plan_list_rows = _build_plan_list_rows(today)
    plan_year_options = sorted({
        y + 543
        for row in plan_list_rows
        for y in range(row['plan'].start_date.year, row['plan'].end_date.year + 1)
    }, reverse=True)

    # รายการ plan ทั้งหมด (สำหรับ chip "งบ" เหนือตารางรวม) — v2.29: chip "ปี" เลิก navigate แล้ว
    # (filter ฝั่ง client แทน ดู initPlanYearChip ใน vehicle_budget.js) จึงต้องส่ง plan_options
    # แบบไม่กรองเสมอ — client ต้องมีตัวเลือกครบทุกปีอยู่ใน DOM ถึงจะซ่อน/โชว์เองได้
    plan_year = request.args.get('plan_year', type=int)  # เหลือไว้แค่ตั้งค่า default ตอน page-load
    plan_options = VehicleBudgetYearlyPlan.query.order_by(VehicleBudgetYearlyPlan.start_date.desc()).all()

    if yearly_plan:
        pivot    = _build_budget_pivot(yearly_plan)
        forecast = _calc_budget_forecast(pivot, central_budgets, dept_budgets, yearly_plan, now)
    else:
        # ยังไม่เคยตั้งก้อนงบเลยสักตัวในระบบ — ให้ zone ด้านบนแสดง empty state ล้วน ไม่มี pivot/forecast
        pivot = {
            'central': {}, 'central_labels': {}, 'central_max': 0,
            'dept': {}, 'dept_labels': {}, 'dept_max': 0,
            'personal': {}, 'personal_max': 0, 'personal_by_user': {}, 'personal_user_labels': {},
            'fiscal_months': [],
            'summary': {
                'central':  {'budget': 0, 'used': 0, 'pct': 0, 'count': 0},
                'dept':     {'budget': 0, 'used': 0, 'pct': 0, 'count': 0},
                'personal': {'used': 0},
            },
        }
        forecast = {
            'total_spent': 0, 'total_allocated': 0, 'spent_pct': 0, 'remaining_to_use': 0,
            'peak_month_label': None, 'peak_month_amount': None,
            'is_current_fy': False, 'compare_amount': 0, 'is_over': False, 'over_under_amount': 0,
            'exhaust_month_label': None, 'risk_count': 0, 'has_spending': False,
        }

    # fallback label ให้ modal "ตั้งงบใหม่" ตอนยังไม่มี plan เลยสักตัว (ปีปัจจุบันตามปฏิทิน)
    fallback_fiscal_year = now.year if now.month >= 3 else now.year - 1

    _TH_MONTHS = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

    return render_template('vehicle/admin/vehicle_budget.html',
                           forecast=forecast,
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
                           yearly_plan=yearly_plan,
                           plan_options=plan_options,
                           plan_list_rows=plan_list_rows,
                           plan_year_options=plan_year_options,
                           sel_plan_year=plan_year,
                           fallback_fiscal_year=fallback_fiscal_year,
                           now=now)



def _build_central_dept_pivot(fy_start, fy_end, plan_id):
    """งบช่วงเวลา (2026-06-06): pivot ดึง "ยอดหักจริงต่อเดือน" จาก ledger — used_amount เป็น
    ยอดสะสมทั้งช่วงงบ (ข้ามเดือน) → break down ต่อเดือนจาก created_at ของ event หัก/คืน/ปรับ
    (net change_amount). set_budget/set_active = 0 ตัดออกแล้ว (extract จาก _build_budget_pivot
    ตอน Phase 5, logic เดิม 100%)
    bug fix (2026-08-07): เดิม filter แค่ created_at อยู่ในช่วง fy_start–fy_end ของ plan เท่านั้น
    ไม่เช็ก yearly_plan_id — ถ้ามีก้อนงบอื่นที่ช่วงเวลาทับกัน (หรืองบเก่าที่ไม่ผูก plan ไหนเลย)
    log ของงบนั้นก็หลุดเข้ามาปนใน "ภาพรวมทั้งปี" ของก้อนงบที่กำลังดูอยู่ผิดๆ — เพิ่ม filter
    `VehicleBudget.yearly_plan_id == plan_id` ให้ตรงกับ cap_rows ใน _build_pivot_summary ที่กรอง
    ด้วย FK ตรงๆ อยู่แล้ว
    คืน (central, dept, labels_c, labels_d, max_c, max_d)"""
    log_rows = (db.session.query(VehicleBudgetLog, VehicleBudget, BudgetType)
                .join(VehicleBudget, VehicleBudgetLog.budget_id == VehicleBudget.id)
                .join(BudgetType, VehicleBudget.budget_type_id == BudgetType.id)
                .filter(VehicleBudgetLog.event_type.in_(['deduct', 'refund', 'adjust']),
                        VehicleBudgetLog.created_at >= fy_start,
                        VehicleBudgetLog.created_at <  fy_end,
                        VehicleBudget.yearly_plan_id == plan_id)
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
    return central, dept, labels_c, labels_d, max_c, max_d


def _build_personal_pivot(fy_start, fy_end):
    """Personal row: aggregate ทุก mileage ที่ admin รับเงินแล้ว (personal_status=1) ภายใน
    fiscal year (group by month of personal_paid_at) (extract จาก _build_budget_pivot ตอน
    Phase 5, logic เดิม 100%)
    คืน (personal, personal_by_user, personal_user_labels, max_p)"""
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
    return personal, personal_by_user, personal_user_labels, max_p


def _build_pivot_summary(central, dept, personal, plan):
    """Fiscal-year summary per category (2026-06-08 redesign): default pivot view = 3 สรุปแถว
    (ส่วนกลาง/กอง/ส่วนตัว) เพดานรวม + ใช้ไป% — used = sum ยอดหักจริงต่อเดือนทั้งปีงบ (จาก
    cells ที่ build แล้ว) · budget = sum เพดานของ VehicleBudget ที่ผูก yearly_plan_id นี้ตรงๆ
    (v2.26 — เดิม match (year,month) เข้าชุดปีงบที่ compute จาก march-hardcode, ตอนนี้ filter FK
    ตรงๆ ง่ายและถูกต้องกว่า)"""
    central_used_fy = sum(v for row in central.values() for v in row.values())
    dept_used_fy    = sum(v for row in dept.values()    for v in row.values())
    personal_used_fy = sum(personal.values())

    cap_rows = (db.session.query(VehicleBudget.budget_amount, BudgetType.name)
                .join(BudgetType, VehicleBudget.budget_type_id == BudgetType.id)
                .filter(VehicleBudget.yearly_plan_id == plan.id)
                .all())
    central_cap_fy = dept_cap_fy = 0.0
    for amt, btname in cap_rows:
        if btname == 'central':
            central_cap_fy += float(amt or 0)
        elif btname == 'department':
            dept_cap_fy += float(amt or 0)

    return {
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


def _build_budget_pivot(plan):
    """Build pivot for one VehicleBudgetYearlyPlan's period (was: hardcoded Mar→Feb window
    derived from a `fiscal_year_start_ad` int — v2.26 moved the period onto the plan itself,
    so this now walks `plan.start_date`..`plan.end_date` month by month, whatever length that
    actually is, instead of always assuming exactly 12 months starting in March).

    Phase 2 (2026-05-22, redesign continuation): เพิ่ม `personal` row —
    sum fuel_cost ของ VehicleMileage ที่ expense_type='personal' + personal_status=1
    (admin ยืนยันรับเงินแล้ว) ภายใน plan period. Aggregate ตาม personal_paid_at.

    Phase 5 (2026-07-19): แตกเป็น 3 helper ตาม sub-concern (central/dept จาก ledger,
    personal จาก mileage, summary aggregate) — ฟังก์ชันนี้เหลือแค่ orchestrate + ประกอบ dict

    Returns dict:
      {
        'central':        { dept_id: { month_num: used_amount } },
        'central_labels': { dept_id: dept_name },
        'central_max':    float,           # max used cell (for heat scale)
        'dept':           { dept_id: { month_num: used_amount } },
        'dept_labels':    { dept_id: dept_name },
        'dept_max':       float,
        'personal':       { month_num: total_received },   # 1 row across the plan period
        'personal_max':   float,
        'fiscal_months':  [(month, year_ad), ...],  # ordered plan.start_date → plan.end_date
        'summary': {                                 # 2026-06-08: default pivot view
          'central':  {'budget','used','pct','count'},   # เพดาน+ใช้ไป รวมทั้ง plan
          'dept':     {'budget','used','pct','count'},
          'personal': {'used'},                          # ไม่มีเพดาน
        }
      }
    """
    fy_start = datetime.combine(plan.start_date, datetime.min.time())
    fy_end   = datetime.combine(plan.end_date,   datetime.min.time()) + timedelta(days=1)

    fiscal_months = []
    y, m = plan.start_date.year, plan.start_date.month
    end_y, end_m = plan.end_date.year, plan.end_date.month
    while (y, m) <= (end_y, end_m):
        fiscal_months.append((m, y))
        m += 1
        if m > 12:
            m, y = 1, y + 1

    central, dept, labels_c, labels_d, max_c, max_d = _build_central_dept_pivot(fy_start, fy_end, plan.id)
    personal, personal_by_user, personal_user_labels, max_p = _build_personal_pivot(fy_start, fy_end)
    summary = _build_pivot_summary(central, dept, personal, plan)

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


def _calc_budget_forecast(pivot, central_budgets, dept_budgets, plan, now):
    """สรุป "ใช้ไปแล้ว" + คาดการณ์สิ้น plan สำหรับ UE mockup zone (เชื่อมของจริง 2026-07-30;
    v2.26: เทียบกับ plan.start_date/end_date ของ plan เอง แทน fiscal_year_start_ad + march-hardcode
    เดิม — รองรับ plan ที่ช่วงเวลาไม่ใช่ 12 เดือนพอดีด้วย ใช้ len(pivot['fiscal_months']) แทนคูณ 12 ตรงๆ).
    เทียบ run-rate กับ "จัดสรรแล้ว" (sum budget_amount ทั้ง plan) ไม่ใช่เงินก้อนทั้งปี — ต่อเนื่องกับ
    % ที่ใช้ใน section เงินก้อนประจำปีด้านบน (ตกลงกับผู้ใช้แล้ว). งบเสี่ยง = ใช้ไปแล้ว >80% ของ cap
    ตัวเอง ณ ตอนนี้ (ไม่ project รายงบ — ตกลงเลือกเกณฑ์ง่ายกว่าเพื่อลด false-positive)."""
    total_spent      = pivot['summary']['central']['used']   + pivot['summary']['dept']['used']
    total_allocated  = pivot['summary']['central']['budget'] + pivot['summary']['dept']['budget']
    spent_pct        = (total_spent / total_allocated * 100) if total_allocated > 0 else 0
    remaining_to_use = total_allocated - total_spent

    monthly_totals = {}
    for row in list(pivot['central'].values()) + list(pivot['dept'].values()):
        for mo, amt in row.items():
            monthly_totals[mo] = monthly_totals.get(mo, 0.0) + amt
    if monthly_totals:
        peak_month        = max(monthly_totals, key=monthly_totals.get)
        peak_month_label   = TH_MONTHS[peak_month]
        peak_month_amount  = monthly_totals[peak_month]
    else:
        peak_month_label = peak_month_amount = None

    today         = now.date()
    is_current_fy = (plan.start_date <= today <= plan.end_date)
    total_months  = len(pivot['fiscal_months']) or 12

    compare_amount = total_spent  # plan เก่า/อนาคต: เทียบยอดใช้จริงทั้ง plan (ไม่ project)
    exhaust_month_label = None
    if is_current_fy:
        elapsed_months = (today.year - plan.start_date.year) * 12 + (today.month - plan.start_date.month) + 1
        run_rate       = total_spent / elapsed_months if elapsed_months > 0 else 0
        compare_amount = run_rate * total_months  # plan ปัจจุบัน: project จบ plan จาก run-rate
        if run_rate > 0 and remaining_to_use > 0:
            months_left    = remaining_to_use / run_rate
            idx0            = (today.month - 1) + int(months_left)
            exhaust_month_label = TH_MONTHS[(idx0 % 12) + 1]
        elif run_rate > 0 and remaining_to_use <= 0:
            exhaust_month_label = 'แล้ว'

    is_over          = compare_amount > total_allocated
    over_under_amount = abs(compare_amount - total_allocated)

    risk_count = sum(1 for b in (central_budgets + dept_budgets) if b['is_active'] and b['pct'] > 80)

    return {
        'total_spent':          total_spent,
        'total_allocated':      total_allocated,
        'spent_pct':            spent_pct,
        'remaining_to_use':     remaining_to_use,
        'peak_month_label':     peak_month_label,
        'peak_month_amount':    peak_month_amount,
        'is_current_fy':        is_current_fy,
        'compare_amount':       compare_amount,
        'is_over':              is_over,
        'over_under_amount':    over_under_amount,
        'exhaust_month_label':  exhaust_month_label,
        'risk_count':           risk_count,
        'has_spending':         total_spent > 0,
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
