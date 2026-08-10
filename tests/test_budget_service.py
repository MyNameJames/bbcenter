"""
Tests สำหรับ services/vehicle/budget_service.py — core money/ledger logic

คลุม: deduct (+idempotency), refund (+no-double-refund), rededuct,
set_budget_amount, manual_adjust, set_active,
verify_cache_integrity และ invariant: used_amount == SUM(log ที่ไม่ใช่ set_budget)
"""
from datetime import date, timedelta
from decimal import Decimal

import pytest

from models import db, VehicleBudgetLog, VehicleBudgetYearlyPlan
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


# ──────────────────────────────────────────────────────────────
# set_yearly_plan (v2.28: name param)
# ──────────────────────────────────────────────────────────────
def test_set_yearly_plan_creates_with_name(session):
    plan = bs.set_yearly_plan(
        None, 2569, 500000, 200000,
        date(2026, 3, 1), date(2027, 2, 28), name='งบพิเศษ ทริปดูงานต่างประเทศ',
    )
    session.commit()

    assert plan.id is not None
    assert plan.name == 'งบพิเศษ ทริปดูงานต่างประเทศ'


def test_set_yearly_plan_update_keeps_old_name_when_blank(session):
    plan = bs.set_yearly_plan(
        None, 2569, 500000, 200000,
        date(2026, 3, 1), date(2027, 2, 28), name='งบประมาณประจำปี 2569',
    )
    session.commit()

    bs.set_yearly_plan(
        plan.id, 2569, 600000, 250000,
        date(2026, 3, 1), date(2027, 2, 28), name='',
    )
    session.commit()

    assert plan.name == 'งบประมาณประจำปี 2569'   # ไม่ถูกเขียนทับด้วยค่าว่าง
    assert plan.total_amount == Decimal('600000')


# ──────────────────────────────────────────────────────────────
# set_default_plan
# ──────────────────────────────────────────────────────────────
def _make_plan(session, start_date, end_date, name='plan'):
    p = VehicleBudgetYearlyPlan(
        fiscal_year=start_date.year, total_amount=100000, central_allocation=50000,
        start_date=start_date, end_date=end_date, name=name,
    )
    session.add(p)
    session.commit()
    return p


def test_set_default_plan_covering_today_succeeds(session):
    today = date.today()
    plan = _make_plan(session, today - timedelta(days=10), today + timedelta(days=10))

    bs.set_default_plan(plan.id)
    session.commit()

    assert plan.is_default is True


def test_set_default_plan_rejects_out_of_range_plan(session):
    today = date.today()
    plan = _make_plan(session, today + timedelta(days=5), today + timedelta(days=20))  # ยังไม่เริ่ม

    with pytest.raises(ValueError):
        bs.set_default_plan(plan.id)
    assert plan.is_default is False


def test_set_default_plan_unsets_previous_default(session):
    today = date.today()
    plan_a = _make_plan(session, today - timedelta(days=10), today + timedelta(days=10), name='a')
    plan_b = _make_plan(session, today - timedelta(days=1), today + timedelta(days=1), name='b')

    bs.set_default_plan(plan_a.id)
    session.commit()
    bs.set_default_plan(plan_b.id)
    session.commit()

    assert plan_a.is_default is False
    assert plan_b.is_default is True


# ──────────────────────────────────────────────────────────────
# delete_budget (v2.29 — hard delete, เฉพาะงบที่ไม่เคยหักเงินจริง)
# ──────────────────────────────────────────────────────────────
def test_delete_budget_removes_row_when_never_used(session, make_budget):
    b = make_budget(budget_amount=1000, used_amount=0)
    bid = b.id

    bs.delete_budget(b)
    session.commit()

    from models import VehicleBudget
    assert VehicleBudget.query.get(bid) is None


def test_delete_budget_allows_when_only_set_budget_log(session, make_budget):
    b = make_budget(budget_amount=1000, used_amount=0)
    bs.set_budget_amount(b, 2000, note='แก้เพดานก่อนลบ')
    session.commit()
    bid = b.id

    bs.delete_budget(b)
    session.commit()

    from models import VehicleBudget
    assert VehicleBudget.query.get(bid) is None
    assert VehicleBudgetLog.query.filter_by(budget_id=bid).count() == 0


def test_delete_budget_blocks_when_has_deduct_log(session, make_budget, make_mileage):
    b = make_budget(used_amount=0)
    _, m = make_mileage()
    bs.deduct_for_mileage(m, b, 350, snap=SNAP)
    session.commit()
    bid = b.id

    with pytest.raises(ValueError):
        bs.delete_budget(b)

    from models import VehicleBudget
    assert VehicleBudget.query.get(bid) is not None
    assert VehicleBudgetLog.query.filter_by(budget_id=bid).count() == 1


def test_delete_budget_blocks_when_has_adjust_log(session, make_budget):
    b = make_budget(used_amount=0)
    bs.manual_adjust(b, 100, note='ปรับมือ')
    session.commit()
    bid = b.id

    with pytest.raises(ValueError):
        bs.delete_budget(b)

    from models import VehicleBudget
    assert VehicleBudget.query.get(bid) is not None


def test_delete_budget_allows_when_only_set_active_log(session, make_budget):
    """งบที่เคยถูกปิดใช้งาน (toggle_active) แต่ไม่เคยหักเงินจริง — ต้องลบได้ (bug 2026-08-07:
    เดิม guard เช็ก event_type != 'set_budget' ทำให้ set_active/set_inactive log เองก็บล็อกไปด้วย
    ทั้งที่ไม่ใช่ธุรกรรมเงินจริง — งบปิดแล้วทุกก้อนจึงลบไม่ได้เลยสักก้อน)"""
    b = make_budget(used_amount=0)
    bs.set_active(b, False, note='ปิดใช้งาน')
    session.commit()
    bid = b.id

    bs.delete_budget(b)
    session.commit()

    from models import VehicleBudget
    assert VehicleBudget.query.get(bid) is None
    assert VehicleBudgetLog.query.filter_by(budget_id=bid).count() == 0


# ──────────────────────────────────────────────────────────────
# delete_yearly_plan (2026-08-07 — cascade ลบงบย่อยที่ผูกอยู่, อนุญาตเมื่อใช้ไป 0 บาททั้งก้อน
# แม้จะเคยจัดสรรงบย่อยไปแล้วก็ตาม)
# ──────────────────────────────────────────────────────────────
def test_delete_yearly_plan_removes_plan_when_never_used(session):
    plan = _make_plan(session, date(2026, 1, 1), date(2026, 12, 31))
    pid = plan.id

    bs.delete_yearly_plan(plan)
    session.commit()

    assert VehicleBudgetYearlyPlan.query.get(pid) is None


def test_delete_yearly_plan_cascades_sub_budgets_when_used_zero(session, make_budget):
    plan = _make_plan(session, date(2026, 1, 1), date(2026, 12, 31))
    b1 = make_budget(budget_amount=1000, used_amount=0)
    b2 = make_budget(budget_amount=2000, used_amount=0)
    b1.yearly_plan_id = plan.id
    b2.yearly_plan_id = plan.id
    session.commit()
    bs.set_budget_amount(b1, 1500, note='แก้เพดาน')  # set_budget log ไม่นับเป็น "ใช้ไป"
    session.commit()
    pid, b1id, b2id = plan.id, b1.id, b2.id

    bs.delete_yearly_plan(plan)
    session.commit()

    from models import VehicleBudget
    assert VehicleBudgetYearlyPlan.query.get(pid) is None
    assert VehicleBudget.query.get(b1id) is None
    assert VehicleBudget.query.get(b2id) is None
    assert VehicleBudgetLog.query.filter_by(budget_id=b1id).count() == 0


def test_delete_yearly_plan_blocks_when_any_sub_budget_used(session, make_budget, make_mileage):
    from models import VehicleBudget
    plan = _make_plan(session, date(2026, 1, 1), date(2026, 12, 31))
    b1 = make_budget(budget_amount=1000, used_amount=0)
    b1.yearly_plan_id = plan.id
    session.commit()
    _, m = make_mileage()
    bs.deduct_for_mileage(m, b1, 350, snap=SNAP)
    session.commit()
    pid = plan.id

    with pytest.raises(ValueError):
        bs.delete_yearly_plan(plan)

    assert VehicleBudgetYearlyPlan.query.get(pid) is not None
    assert VehicleBudget.query.get(b1.id) is not None
