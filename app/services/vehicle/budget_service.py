"""
BudgetService — ทุก mutation ของ vehicle_budget.used_amount / budget_amount
ต้องผ่านที่นี่เท่านั้น เพื่อให้มี audit + idempotency + atomic update

ใช้ร่วมกับตาราง: vehicle_budget, vehicle_budget_log, vehicle_mileage
Migration: 2026-05-06_add-vehicle-budget-log.sql

จุดเรียกใช้:
- mileage_log()        : deduct_for_mileage()
- driver_mileage()     : deduct_for_mileage()
- override_fuel()      : rededuct_for_mileage()
- budget_manage() POST : set_budget_amount()
"""
from decimal import Decimal
from sqlalchemy import func
from flask_login import current_user
from models import (
    db, VehicleBudget, VehicleBudgetLog, VehicleMileage,
    VehicleBooking, BudgetType, VehicleDepartment, get_bkk_time,
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
