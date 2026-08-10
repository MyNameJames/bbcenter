"""
BudgetService — ทุก mutation ของ vehicle_budget.used_amount / budget_amount
ต้องผ่านที่นี่เท่านั้น เพื่อให้มี audit + idempotency + atomic update

ใช้ร่วมกับตาราง: vehicle_budget, vehicle_budget_log, vehicle_mileage
Migration: 2026-05-06_add-vehicle-budget-log.sql

จุดเรียกใช้:
- mileage_log()        : deduct_for_mileage()
- driver_mileage()     : deduct_for_mileage()
- override_fuel()      : rededuct_for_mileage()
- budget_manage() POST : set_budget_amount(), set_yearly_plan(), set_default_plan(), delete_budget()
"""
from decimal import Decimal
from sqlalchemy import func
from flask_login import current_user
from models import (
    db, VehicleBudget, VehicleBudgetLog, VehicleMileage,
    VehicleBooking, BudgetType, VehicleDepartment, get_bkk_time,
    VehicleBudgetYearlyPlan,
)

D0 = Decimal('0')


# ──────────────────────────────────────────────────────────────
# Internal: lock + apply
# ──────────────────────────────────────────────────────────────
def _lock_budget(budget_id: int) -> VehicleBudget:
    """SELECT FOR UPDATE — ป้องกัน lost-update เมื่อ 2 requests พร้อมกัน
    (SQLite ปัจจุบันไม่ล็อกระดับ row จริง แต่เผื่อ migrate Postgres)"""
    return (
        db.session.query(VehicleBudget)
        .filter(VehicleBudget.id == budget_id)
        .with_for_update()
        .one()
    )


def _apply(budget, event_type, change_amount, note, *,
           booking_id=None, mileage_id=None, reverses_log_id=None,
           snap=None, override_new_budget_amount=None):
    """อัปเดต cache + เขียน ledger row ใน transaction เดียวกัน"""
    change = Decimal(str(change_amount))
    budget.used_amount = (Decimal(str(budget.used_amount or 0)) + change).quantize(Decimal('0.01'))

    if override_new_budget_amount is not None:
        budget.budget_amount = Decimal(str(override_new_budget_amount))

    log = VehicleBudgetLog(
        budget_id=budget.id,
        event_type=event_type,
        change_amount=change,
        new_used_balance=budget.used_amount,
        new_budget_amount=budget.budget_amount,
        booking_id=booking_id,
        mileage_id=mileage_id,
        reverses_log_id=reverses_log_id,
        snap_distance=(snap or {}).get('distance'),
        snap_fuel_rate=(snap or {}).get('fuel_rate'),
        snap_fuel_price=(snap or {}).get('fuel_price'),
        note=note,
        created_by=getattr(current_user, 'id', None),
    )
    db.session.add(log)
    db.session.flush()
    return log


# ──────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────
def set_budget_amount(budget: VehicleBudget, new_amount, *, note: str):
    """ตั้ง/แก้เพดานงบ — log event_type='set_budget'"""
    budget = _lock_budget(budget.id)
    delta = Decimal(str(new_amount)) - Decimal(str(budget.budget_amount or 0))
    return _apply(
        budget, 'set_budget',
        change_amount=D0,                          # ไม่กระทบ used_amount
        note=note or f'set budget_amount → {new_amount}',
        override_new_budget_amount=new_amount,
    )


def deduct_for_mileage(mileage: VehicleMileage, budget: VehicleBudget,
                       amount, *, snap: dict, note: str = ''):
    """หักงบจาก mileage end — idempotent: เรียกซ้ำจะ no-op
    snap = {'distance':..., 'fuel_rate':..., 'fuel_price':...}"""
    if mileage.budget_deducted_at is not None:
        return None  # idempotent guard
    if Decimal(str(amount)) <= 0:
        return None

    budget = _lock_budget(budget.id)
    log = _apply(
        budget, 'deduct',
        change_amount=Decimal(str(amount)),
        note=note or f'deduct from mileage #{mileage.id}',
        booking_id=mileage.booking_id,
        mileage_id=mileage.id,
        snap=snap,
    )
    mileage.budget_deducted_at = get_bkk_time()
    mileage.last_budget_log_id = log.id
    return log


def refund_for_mileage(mileage: VehicleMileage, *, note: str = ''):
    """คืนเงินที่เคยหักจาก mileage นี้ — สร้าง reverse log แล้วเคลียร์ flag"""
    if mileage.last_budget_log_id is None:
        return None
    last = db.session.get(VehicleBudgetLog, mileage.last_budget_log_id)
    if last is None or last.event_type == 'refund':
        return None

    budget = _lock_budget(last.budget_id)
    rev = _apply(
        budget, 'refund',
        change_amount=-Decimal(str(last.change_amount)),  # กลับสัญลักษณ์
        note=note or f'refund mileage #{mileage.id}',
        booking_id=mileage.booking_id,
        mileage_id=mileage.id,
        reverses_log_id=last.id,
    )
    mileage.budget_deducted_at = None
    mileage.last_budget_log_id = None
    return rev


def rededuct_for_mileage(mileage: VehicleMileage, budget: VehicleBudget,
                         new_amount, *, snap: dict, note: str = ''):
    """ใช้ตอน override_fuel หรือแก้ odometer: refund เก่า → deduct ใหม่"""
    refund_for_mileage(mileage, note=note or 'rededuct: reverse old')
    return deduct_for_mileage(mileage, budget, new_amount, snap=snap,
                              note=note or 'rededuct: new amount')


def manual_adjust(budget: VehicleBudget, amount, *, note: str):
    """ปรับมือ (admin) — note บังคับใส่เหตุผล"""
    if not note:
        raise ValueError('manual_adjust requires note')
    budget = _lock_budget(budget.id)
    return _apply(budget, 'adjust', change_amount=Decimal(str(amount)), note=note)


def set_active(budget: VehicleBudget, active: bool, *, note: str = ''):
    """ปิด/เปิดใช้งาน budget — log event_type='set_active' หรือ 'set_inactive'
    ไม่กระทบ used_amount/budget_amount; ประวัติ + ledger ยังครบ"""
    budget = _lock_budget(budget.id)
    target = bool(active)
    if budget.is_active == target:
        return None  # no-op
    budget.is_active = target
    event = 'set_active' if target else 'set_inactive'
    return _apply(
        budget, event,
        change_amount=D0,
        note=note or f'{event} by admin',
    )


_MONEY_EVENT_TYPES = ('deduct', 'refund', 'adjust')


def delete_budget(budget: VehicleBudget):
    """ลบงบย่อยทิ้งถาวร (v2.29) — เฉพาะงบที่ไม่เคยมีการหักเงิน/ปรับยอดจริง กัน ledger สูญหาย
    บล็อกถ้ามี log event_type ที่กระทบเงินจริง (deduct/refund/adjust) เท่านั้น — set_budget
    (ตั้ง/แก้เพดาน) และ set_active/set_inactive (เปิด/ปิดใช้งาน) ไม่กระทบ used_amount จึงลบได้
    (bug fix 2026-08-07: เดิมเช็ก "event_type != 'set_budget'" ทำให้ set_active/set_inactive
    log เองก็บล็อกไปด้วย — งบที่เคยถูกปิดใช้งาน (ต้องมี set_inactive log เสมอ) จึงลบไม่ได้เลยสักก้อน
    ทั้งที่ไม่เคยมีธุรกรรมเงินจริงเกิดขึ้น) ลบ log ที่เหลือทั้งหมดคู่กับตัว budget เอง (ไม่ orphan log ค้าง)"""
    logs = VehicleBudgetLog.query.filter_by(budget_id=budget.id).all()
    if any(l.event_type in _MONEY_EVENT_TYPES for l in logs):
        raise ValueError('งบนี้เคยมีการหักเงิน/ปรับยอดแล้ว ลบไม่ได้ — ปิดใช้งานแทน')
    for l in logs:
        db.session.delete(l)
    db.session.delete(budget)


def delete_yearly_plan(plan: VehicleBudgetYearlyPlan):
    """ลบเงินก้อนประจำปีทิ้งถาวร (2026-08-07) พร้อมงบย่อยที่ผูกอยู่ทั้งหมด (cascade) — อนุญาต
    เฉพาะตอนใช้ไป 0 บาททั้งก้อน (ทุกงบย่อยที่ผูก yearly_plan_id นี้ used_amount == 0) แม้จะเคย
    ตั้ง/แก้เพดานงบย่อยไปแล้วก็ตาม (ตกลงกับผู้ใช้: เข้มน้อยกว่า delete_budget ที่บล็อกด้วย log
    event type — ที่นี่ยึด used_amount ปัจจุบันเป็นหลักเพราะเป็นการลบทั้งก้อนไม่ใช่ลบทีละงบ)
    ลบ VehicleBudgetLog ของทุกงบย่อยคู่กันไปด้วย (ไม่ orphan log ค้าง)"""
    sub_budgets = VehicleBudget.query.filter_by(yearly_plan_id=plan.id).all()
    if any(Decimal(str(b.used_amount or 0)) != D0 for b in sub_budgets):
        raise ValueError('เงินก้อนนี้มีงบย่อยที่ใช้ไปแล้ว ลบไม่ได้ — ปิดใช้งานงบย่อยนั้นแทน')
    for b in sub_budgets:
        for l in VehicleBudgetLog.query.filter_by(budget_id=b.id).all():
            db.session.delete(l)
        db.session.delete(b)
    db.session.delete(plan)


def set_yearly_plan(plan_id, fiscal_year: int, total_amount, central_allocation,
                     start_date, end_date, *, name='',
                     central_allocated_sum=0, dept_allocated_sum=0):
    """สร้าง/แก้ไข VehicleBudgetYearlyPlan (v2.26 — upsert ตาม plan_id ตรงๆ แทน fiscal_year ที่เลิก
    unique แล้ว. plan_id=None → สร้างแถวใหม่เสมอ; มีค่า → แก้ไขแถวเดิม).
    start_date/end_date เป็นช่วงเวลาของ plan เอง (เดิม implicit มี.ค.-ก.พ. ตอนนี้ admin เลือกเอง).
    dept_allocation คำนวณเป็น total - central เสมอ (ไม่ใช่ column, ดู model). บล็อกถ้าลดเพดาน
    ต่ำกว่าที่จัดสรรไปแล้วในงบย่อย (central_allocated_sum/dept_allocated_sum ส่งมาจาก view — filter
    VehicleBudget.yearly_plan_id ตรงๆ — กันเลขติดลบ/เข้าใจผิดเรื่องเงินที่จัดสรรไปแล้ว, ตกลงกับผู้ใช้
    2026-07-31). ไม่มี ledger table แยก (ต่างจาก VehicleBudget) เพราะเป็นค่าตั้งเป้าระดับปี ไม่ใช่
    transaction — ไม่มี note param.
    v2.28: `name` = free-text label (งบประจำปี vs งบพิเศษ) — optional, ไม่ validate เนื้อหา"""
    total_amount       = Decimal(str(total_amount))
    central_allocation = Decimal(str(central_allocation))
    if total_amount < 0 or central_allocation < 0:
        raise ValueError('จำนวนเงินต้องไม่ติดลบ')
    if central_allocation > total_amount:
        raise ValueError('ส่วนกลางต้องไม่เกินเงินก้อนทั้งปี')
    if end_date <= start_date:
        raise ValueError('วันสิ้นสุดต้องหลังวันเริ่มต้น')

    dept_allocation = total_amount - central_allocation
    if central_allocation < Decimal(str(central_allocated_sum)):
        raise ValueError(f'ส่วนกลางต้องไม่น้อยกว่า {float(central_allocated_sum):,.0f} บาท (จัดสรรไปแล้วในงบย่อย)')
    if dept_allocation < Decimal(str(dept_allocated_sum)):
        raise ValueError(f'ส่วนกองต้องไม่น้อยกว่า {float(dept_allocated_sum):,.0f} บาท (จัดสรรไปแล้วในงบย่อย)')

    plan = VehicleBudgetYearlyPlan.query.get(plan_id) if plan_id else None
    if plan:
        plan.total_amount       = total_amount
        plan.central_allocation = central_allocation
        plan.start_date         = start_date
        plan.end_date           = end_date
        plan.fiscal_year        = fiscal_year
        plan.name               = name or plan.name
    else:
        plan = VehicleBudgetYearlyPlan(
            fiscal_year=fiscal_year,
            total_amount=total_amount,
            central_allocation=central_allocation,
            start_date=start_date,
            end_date=end_date,
            name=name or None,
        )
        db.session.add(plan)
    return plan


def set_default_plan(plan_id: int):
    """ตั้ง plan เดียวให้เป็น default (auto-select เมื่อเข้า budget_manage โดยไม่มี ?plan_id=).
    v2.28 — invariant "มีได้แค่ 1 plan ที่ is_default=True": unset ของเก่าทั้งหมดก่อน แล้ว set ตัวใหม่
    ตัวเดียวใน transaction เดียวกัน. block ถ้า plan ที่เลือกไม่ครอบวันนี้ (start_date<=today<=end_date)
    — ป้องกัน default ไปเป็น plan ที่หมดอายุ/ยังไม่เริ่ม ต้องไปแก้ period ก่อนถึงตั้ง default ได้"""
    plan = VehicleBudgetYearlyPlan.query.get(plan_id)
    if not plan:
        raise ValueError('ไม่พบก้อนงบนี้')
    today = get_bkk_time().date()
    if not (plan.start_date <= today <= plan.end_date):
        raise ValueError('ตั้งเป็นค่าเริ่มต้นได้เฉพาะก้อนงบที่ครอบวันนี้ — ไปปรับช่วงเวลาก่อน')

    VehicleBudgetYearlyPlan.query.filter(
        VehicleBudgetYearlyPlan.id != plan.id
    ).update({'is_default': False})
    plan.is_default = True
    return plan


# ──────────────────────────────────────────────────────────────
# Verify (เรียกจาก cron รายเดือน — alert ถ้าไม่ตรง)
# ──────────────────────────────────────────────────────────────
def verify_cache_integrity():
    """คืน list ของ budget ที่ used_amount cache เพี้ยนจาก SUM(log)"""
    drift = []
    for b in VehicleBudget.query.all():
        s = db.session.query(
            func.coalesce(func.sum(VehicleBudgetLog.change_amount), 0)
        ).filter(
            VehicleBudgetLog.budget_id == b.id,
            VehicleBudgetLog.event_type != 'set_budget',
        ).scalar()
        if Decimal(str(s)) != Decimal(str(b.used_amount)):
            drift.append((b.id, b.used_amount, s))
    return drift


# ──────────────────────────────────────────────────────────────
# Budget lookup (ย้ายจาก views/vehicle/vehicle_common.py, Phase 2 — ปิด DEBT-1:
# domain/vehicle/workflow.py::guard_budget() เรียกใช้ function นี้ ต้องไม่ import จาก views)
# ──────────────────────────────────────────────────────────────
def _lookup_budget_for_booking(booking, on_date=None):
    """หา VehicleBudget ที่ booking จะหักงบ — งบ active (is_active=True) ที่ช่วง
    start_date–end_date ครอบ `on_date` (default = วันเริ่ม booking; deduct ส่งวันปิดทริป).
    คืน (budget, key_label) — budget=None ถ้าไม่พบงบ active ที่ครอบวันนั้น.
    overlap หลายก้อน → เอา start_date ล่าสุด (specific สุด)"""
    if booking.expense_type not in ('central', 'department'):
        return None, None
    d = on_date or (booking.start_datetime.date() if booking.start_datetime else None)
    if d is None:
        return None, None
    bt = BudgetType.query.filter_by(name=booking.expense_type).first()
    if not bt:
        return None, booking.expense_type

    if booking.expense_type == 'central':
        key_label = booking.central_category
        dept_obj = VehicleDepartment.query.filter_by(name=key_label).first() if key_label else None
    else:
        key_label = booking.trip_department or (booking.user.department if booking.user else None)
        if booking.trip_department_id:
            dept_obj = VehicleDepartment.query.get(booking.trip_department_id)
        elif key_label:
            dept_obj = VehicleDepartment.query.filter_by(name=key_label).first()
        else:
            dept_obj = None
    if not dept_obj:
        return None, key_label

    budget = (VehicleBudget.query.filter(
        VehicleBudget.department_id == dept_obj.id,
        VehicleBudget.budget_type_id == bt.id,
        VehicleBudget.is_active.is_(True),
        VehicleBudget.start_date.isnot(None),
        VehicleBudget.end_date.isnot(None),
        VehicleBudget.start_date <= d,
        VehicleBudget.end_date >= d,
    ).order_by(VehicleBudget.start_date.desc(), VehicleBudget.id.desc()).first())
    return budget, key_label
