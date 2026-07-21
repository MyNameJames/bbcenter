"""
Tests สำหรับ services/vehicle/budget_service.py — core money/ledger logic

คลุม: deduct (+idempotency), refund (+no-double-refund), rededuct,
set_budget_amount, manual_adjust, set_active,
verify_cache_integrity และ invariant: used_amount == SUM(log ที่ไม่ใช่ set_budget)
"""
from decimal import Decimal

import pytest

from models import db, VehicleBudgetLog
import services.vehicle.budget_service as bs
from conftest import SNAP


def D(x):
    return Decimal(str(x))


def logs_for(budget):
    return (VehicleBudgetLog.query
            .filter_by(budget_id=budget.id)
            .order_by(VehicleBudgetLog.id).all())


def ledger_sum(budget):
    """SUM(change) ยกเว้น set_budget — ต้องเท่ากับ used_amount เสมอ (invariant)"""
    return sum((D(l.change_amount) for l in logs_for(budget)
                if l.event_type != 'set_budget'), D(0))


# ──────────────────────────────────────────────────────────────
# deduct
# ──────────────────────────────────────────────────────────────
def test_deduct_increases_used_and_writes_log(make_budget, make_mileage):
    b = make_budget(budget_amount=1000, used_amount=0)
    _, m = make_mileage()

    log = bs.deduct_for_mileage(m, b, 350, snap=SNAP)

    assert log is not None
    assert D(b.used_amount) == D(350)
    assert log.event_type == 'deduct'
    assert D(log.change_amount) == D(350)
    # idempotency flags ถูกตั้ง
    assert m.budget_deducted_at is not None
    assert m.last_budget_log_id == log.id
    # snap ถูกเก็บ
    assert log.snap_distance == 100
    # created_by = None (anonymous ใน test)
    assert log.created_by is None


def test_deduct_is_idempotent(make_budget, make_mileage):
    b = make_budget(used_amount=0)
    _, m = make_mileage()

    bs.deduct_for_mileage(m, b, 350, snap=SNAP)
    again = bs.deduct_for_mileage(m, b, 350, snap=SNAP)  # เรียกซ้ำ

    assert again is None
    assert D(b.used_amount) == D(350)            # ไม่หักซ้ำ
    assert len(logs_for(b)) == 1


def test_deduct_zero_or_negative_is_noop(make_budget, make_mileage):
    b = make_budget(used_amount=0)
    _, m = make_mileage()

    assert bs.deduct_for_mileage(m, b, 0, snap=SNAP) is None
    assert bs.deduct_for_mileage(m, b, -50, snap=SNAP) is None
    assert D(b.used_amount) == D(0)
    assert logs_for(b) == []


# ──────────────────────────────────────────────────────────────
# refund
# ──────────────────────────────────────────────────────────────
def test_refund_reverses_deduct(make_budget, make_mileage):
    b = make_budget(used_amount=0)
    _, m = make_mileage()
    bs.deduct_for_mileage(m, b, 350, snap=SNAP)

    rev = bs.refund_for_mileage(m)

    assert rev is not None
    assert rev.event_type == 'refund'
    assert D(rev.change_amount) == D(-350)
    assert D(b.used_amount) == D(0)              # คืนครบ
    assert m.budget_deducted_at is None          # flags เคลียร์
    assert m.last_budget_log_id is None


def test_refund_without_prior_deduct_is_noop(make_budget, make_mileage):
    make_budget()
    _, m = make_mileage()
    assert bs.refund_for_mileage(m) is None


def test_no_double_refund(make_budget, make_mileage):
    b = make_budget(used_amount=0)
    _, m = make_mileage()
    bs.deduct_for_mileage(m, b, 350, snap=SNAP)
    bs.refund_for_mileage(m)

    assert bs.refund_for_mileage(m) is None      # refund ซ้ำ = no-op
    assert D(b.used_amount) == D(0)


# ──────────────────────────────────────────────────────────────
# rededuct (override_fuel / แก้ odometer)
# ──────────────────────────────────────────────────────────────
def test_rededuct_replaces_amount(make_budget, make_mileage):
    b = make_budget(used_amount=0)
    _, m = make_mileage()
    bs.deduct_for_mileage(m, b, 350, snap=SNAP)

    bs.rededuct_for_mileage(m, b, 500, snap=SNAP)

    assert D(b.used_amount) == D(500)            # = ยอดใหม่ ไม่ใช่ 350+500
    assert m.budget_deducted_at is not None
    # ledger: deduct(+350), refund(-350), deduct(+500) → sum 500
    assert ledger_sum(b) == D(500)


# ──────────────────────────────────────────────────────────────
# set_budget_amount
# ──────────────────────────────────────────────────────────────
def test_set_budget_amount_changes_cap_not_used(make_budget):
    b = make_budget(budget_amount=1000, used_amount=300)

    log = bs.set_budget_amount(b, 2000, note='เพิ่มเพดาน')

    assert D(b.budget_amount) == D(2000)
    assert D(b.used_amount) == D(300)            # ไม่กระทบ used
    assert log.event_type == 'set_budget'
    assert D(log.change_amount) == D(0)
    # set_budget ไม่ถูกนับใน ledger_sum
    assert ledger_sum(b) == D(0)


# ──────────────────────────────────────────────────────────────
# manual_adjust
# ──────────────────────────────────────────────────────────────
def test_manual_adjust_requires_note(make_budget):
    b = make_budget()
    with pytest.raises(ValueError):
        bs.manual_adjust(b, 100, note='')


def test_manual_adjust_changes_used(make_budget):
    b = make_budget(used_amount=0)
    bs.manual_adjust(b, 100, note='ตั้งต้น')      # ทุก mutation ผ่าน service

    log = bs.manual_adjust(b, -40, note='ปรับแก้')

    assert log.event_type == 'adjust'
    assert D(b.used_amount) == D(60)
    assert ledger_sum(b) == D(60)                 # invariant คงอยู่


# ──────────────────────────────────────────────────────────────
# set_active
# ──────────────────────────────────────────────────────────────
def test_set_active_toggle_and_noop(make_budget):
    b = make_budget(is_active=True)

    off = bs.set_active(b, False)
    assert off is not None
    assert off.event_type == 'set_inactive'
    assert b.is_active is False

    # toggle ค่าเดิม = no-op
    assert bs.set_active(b, False) is None

    on = bs.set_active(b, True)
    assert on.event_type == 'set_active'
    assert b.is_active is True

    # ไม่กระทบ used_amount
    assert ledger_sum(b) == D(0)


# ──────────────────────────────────────────────────────────────
# verify_cache_integrity
# ──────────────────────────────────────────────────────────────
def test_verify_cache_integrity_clean(make_budget, make_mileage):
    b = make_budget(used_amount=0)
    _, m = make_mileage()
    bs.deduct_for_mileage(m, b, 350, snap=SNAP)

    assert bs.verify_cache_integrity() == []


def test_verify_cache_integrity_detects_drift(make_budget, make_mileage):
    b = make_budget(used_amount=0)
    _, m = make_mileage()
    bs.deduct_for_mileage(m, b, 350, snap=SNAP)

    # จงใจทำ cache เพี้ยน (จำลอง bug ที่แก้ used_amount ตรงๆ)
    b.used_amount = D(999)
    db.session.commit()

    drift = bs.verify_cache_integrity()
    assert len(drift) == 1
    assert drift[0][0] == b.id                   # (budget_id, cached, real_sum)
