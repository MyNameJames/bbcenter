"""
test_fuel_service — เงินสำรองรายคน + โควตารถต่อเดือน
(spec: docs/notes/log/2026-08-10_fuel-reserve-redesign.md §7 "Test ที่ต้องมีอย่างน้อย")

สมการที่ทุก test ต้องยืนยัน:
    วงเงินสำรอง = คงเหลือ + ใช้ไปแล้ว + ทำเรื่องเบิกแล้ว
"""
import itertools
from datetime import date
from decimal import Decimal

import pytest

from models import (
    ExpenseHolder, FuelBill, FuelReimbursement, FuelReserveLog,
    ReimbursementSettlement, ReimbursementSource, VehicleQuota,
)
from services.vehicle import fuel_service as svc

_uid = itertools.count(101)   # user_id ไม่ซ้ำ (expense_holder.user_id unique)


# ──────────────────────────────────────────────────────────────
# Factories
# ──────────────────────────────────────────────────────────────
@pytest.fixture
def make_holder(session):
    def _make(float_amount=20000, is_active=True):
        h = ExpenseHolder(user_id=next(_uid),
                          float_amount=Decimal(str(float_amount)),
                          is_active=is_active)
        session.add(h)
        session.commit()
        return h
    return _make


@pytest.fixture
def make_rb(session):
    def _make(status='draft', source_id=None, no='จ69-0001'):
        rb = FuelReimbursement(reimbursement_no=no, status=status, source_id=source_id)
        session.add(rb)
        session.commit()
        return rb
    return _make


@pytest.fixture
def make_bill(session):
    def _make(amount=1000, method='reserve', holder=None, vehicle_id=1,
              bill_date=date(2026, 8, 5), rb=None, driver_id=1):
        b = FuelBill(
            bill_date=bill_date,
            vehicle_id=vehicle_id,
            driver_id=driver_id,
            amount=Decimal(str(amount)),
            payment_method=method,
            category='fuel',
            paid_by_holder_id=(holder.id if (holder is not None and method == 'reserve') else None),
            reimbursement_id=(rb.id if rb is not None else None),
        )
        session.add(b)
        session.commit()
        return b
    return _make


@pytest.fixture
def make_quota(session):
    def _make(vehicle_id=1, kind='card', limit_amount=5000,
              effective_from=date(2026, 1, 1), source_id=None):
        q = VehicleQuota(vehicle_id=vehicle_id, kind=kind, source_id=source_id,
                         limit_amount=Decimal(str(limit_amount)),
                         effective_from=effective_from)
        session.add(q)
        session.commit()
        return q
    return _make


def assert_invariant(holder):
    """§1.ก — วงเงินสำรอง = คงเหลือ + ใช้ไปแล้ว + ทำเรื่องเบิกแล้ว"""
    k = svc.holder_kpi(holder)
    assert k['float_amount'] == k['balance'] + k['used'] + k['submitted']
    return k


# ──────────────────────────────────────────────────────────────
# 1. สมการเงินสำรอง ทุก state transition
# ──────────────────────────────────────────────────────────────
def test_invariant_holds_through_every_transition(session, make_holder, make_bill, make_rb):
    h = make_holder(float_amount=20000)

    # เริ่มต้น — ยังไม่มีบิล
    k = assert_invariant(h)
    assert k['balance'] == Decimal('20000')

    # ควักเงินจ่าย 5,000 → "ใช้ไปแล้ว"
    bill = make_bill(amount=5000, holder=h)
    k = assert_invariant(h)
    assert (k['used'], k['submitted'], k['balance']) == (
        Decimal('5000'), Decimal('0'), Decimal('15000'))

    # ใส่ในใบเบิกร่าง — ยังไม่ได้ส่งเรื่อง เงินยังนับเป็น "ใช้ไปแล้ว"
    rb = make_rb(status='draft')
    bill.reimbursement_id = rb.id
    session.commit()
    k = assert_invariant(h)
    assert (k['used'], k['submitted']) == (Decimal('5000'), Decimal('0'))

    # ส่งเรื่อง → snapshot settlement → ย้ายไป "ทำเรื่องเบิกแล้ว"
    rb.status = 'submitted'
    session.add(ReimbursementSettlement(reimbursement_id=rb.id, holder_id=h.id,
                                        amount=Decimal('5000')))
    session.commit()
    k = assert_invariant(h)
    assert (k['used'], k['submitted'], k['balance']) == (
        Decimal('0'), Decimal('5000'), Decimal('15000'))

    # ได้เงินคืน → หลุดจาก "ทำเรื่องเบิกแล้ว" → ไหลกลับ "คงเหลือ" เอง (derived)
    st = ReimbursementSettlement.query.filter_by(reimbursement_id=rb.id, holder_id=h.id).one()
    st.settled_at = date(2026, 8, 20)
    rb.status = 'received'
    session.commit()
    k = assert_invariant(h)
    assert (k['used'], k['submitted'], k['balance']) == (
        Decimal('0'), Decimal('0'), Decimal('20000'))


# ──────────────────────────────────────────────────────────────
# 2. ใบเบิกใบเดียว บิล 2 คน → คืนทีละคน
# ──────────────────────────────────────────────────────────────
def test_two_holders_one_reimbursement_settle_separately(session, make_holder, make_bill, make_rb):
    a = make_holder(float_amount=20000)
    b = make_holder(float_amount=10000)
    rb = make_rb(status='submitted')

    make_bill(amount=10000, holder=a, rb=rb)
    make_bill(amount=5000, holder=b, rb=rb)
    session.add_all([
        ReimbursementSettlement(reimbursement_id=rb.id, holder_id=a.id, amount=Decimal('10000')),
        ReimbursementSettlement(reimbursement_id=rb.id, holder_id=b.id, amount=Decimal('5000')),
    ])
    session.commit()

    ka, kb = assert_invariant(a), assert_invariant(b)
    assert (ka['submitted'], ka['balance']) == (Decimal('10000'), Decimal('10000'))
    assert (kb['submitted'], kb['balance']) == (Decimal('5000'), Decimal('5000'))

    # คืนเงินให้ A คนเดียว → B ต้องไม่ขยับ
    ReimbursementSettlement.query.filter_by(holder_id=a.id).one().settled_at = date(2026, 8, 20)
    session.commit()

    ka, kb = assert_invariant(a), assert_invariant(b)
    assert (ka['submitted'], ka['balance']) == (Decimal('0'), Decimal('20000'))
    assert (kb['submitted'], kb['balance']) == (Decimal('5000'), Decimal('5000'))


# ──────────────────────────────────────────────────────────────
# 3. โควตาบัตรข้ามเดือน — บิล 31 ก.ค. ไม่กินโควตา ส.ค.
# ──────────────────────────────────────────────────────────────
def test_card_quota_does_not_leak_across_months(session, make_quota, make_bill):
    make_quota(vehicle_id=1, kind='card', limit_amount=5000, effective_from=date(2026, 1, 1))
    make_bill(amount=4000, method='card', vehicle_id=1, bill_date=date(2026, 7, 31))

    jul = svc.quota_status(1, 'card', 2026, 7)
    aug = svc.quota_status(1, 'card', 2026, 8)
    assert (jul['used'], jul['remaining']) == (Decimal('4000'), Decimal('1000'))
    assert (aug['used'], aug['remaining']) == (Decimal('0'), Decimal('5000'))


def test_card_quota_error_blocks_over_limit_only(session, make_quota, make_bill):
    make_quota(vehicle_id=1, kind='card', limit_amount=5000, effective_from=date(2026, 1, 1))
    make_bill(amount=4000, method='card', vehicle_id=1, bill_date=date(2026, 8, 3))

    assert svc.card_quota_error(1, date(2026, 8, 10), 1000) is None      # พอดีวงเงิน
    assert svc.card_quota_error(1, date(2026, 8, 10), 1500) is not None  # เกิน → block
    assert svc.card_quota_error(2, date(2026, 8, 10), 99999) is None     # รถไม่ได้ตั้งโควตา → ไม่ block


# ──────────────────────────────────────────────────────────────
# 4. แก้วงเงิน = insert แถวใหม่ → เดือนย้อนหลังต้องไม่เปลี่ยน
# ──────────────────────────────────────────────────────────────
def test_quota_change_is_effective_dated(session, make_quota):
    make_quota(vehicle_id=1, kind='card', limit_amount=5000, effective_from=date(2026, 1, 1))
    make_quota(vehicle_id=1, kind='card', limit_amount=8000, effective_from=date(2026, 8, 1))

    assert svc.quota_limit(1, 'card', 2026, 7) == Decimal('5000')
    assert svc.quota_limit(1, 'card', 2026, 8) == Decimal('8000')
    assert svc.quota_limit(1, 'card', 2026, 9) == Decimal('8000')
    assert svc.quota_limit(1, 'card', 2025, 12) is None   # ก่อนตั้งโควตา = ยังไม่มี


# ──────────────────────────────────────────────────────────────
# 5. บิล card/self ไม่กระทบ KPI เงินสำรอง แต่ยังนับในมิติน้ำมัน
# ──────────────────────────────────────────────────────────────
def test_card_and_self_bills_never_touch_reserve_kpi(session, make_holder, make_bill):
    h = make_holder(float_amount=20000)
    make_bill(amount=3000, method='reserve', holder=h)
    make_bill(amount=2000, method='card')
    make_bill(amount=1000, method='self')

    k = assert_invariant(h)
    assert (k['used'], k['balance']) == (Decimal('3000'), Decimal('17000'))

    # มิติน้ำมัน (pivot) นับทุกใบ รวม card + self
    all_bills = sum(Decimal(str(b.amount)) for b in FuelBill.query.all())
    assert all_bills == Decimal('6000')


def test_kpi_is_empty_when_user_is_not_a_holder(session):
    k = svc.holder_kpi(svc.get_holder(999))
    assert k['has_holder'] is False
    assert k['balance'] == Decimal('0')


# ──────────────────────────────────────────────────────────────
# บรรทัดโควตาใน KPI bar — เหลือมากสุด 2 อันดับ คละบัตร/แหล่งเบิก (D3)
# ──────────────────────────────────────────────────────────────
def test_quota_lines_returns_top_two_remaining(session, make_quota, make_bill):
    src = ReimbursementSource(name='วัดพระธรรมกาย')
    session.add(src)
    session.commit()

    make_quota(vehicle_id=1, kind='card', limit_amount=5000)
    make_quota(vehicle_id=2, kind='card', limit_amount=3000)
    make_quota(vehicle_id=3, kind='source', limit_amount=4000, source_id=src.id)
    make_quota(vehicle_id=4, kind='card', limit_amount=1000)
    make_bill(amount=1000, method='card', vehicle_id=4, bill_date=date(2026, 8, 2))  # เหลือ 0 → ตัดทิ้ง

    lines = svc.quota_lines(2026, 8, top=2)
    assert [(l['vehicle_id'], l['remaining']) for l in lines] == [
        (1, Decimal('5000')), (3, Decimal('4000'))]


def test_source_quota_counts_only_bills_in_that_source(session, make_quota, make_bill, make_rb):
    src_a = ReimbursementSource(name='DCI')
    src_b = ReimbursementSource(name='วัดพระธรรมกาย')
    session.add_all([src_a, src_b])
    session.commit()

    make_quota(vehicle_id=1, kind='source', limit_amount=5000, source_id=src_b.id)
    rb_b = make_rb(status='submitted', source_id=src_b.id, no='จ69-0002')
    rb_a = make_rb(status='submitted', source_id=src_a.id, no='จ69-0003')
    make_bill(amount=2000, vehicle_id=1, rb=rb_b, bill_date=date(2026, 8, 4))
    make_bill(amount=1500, vehicle_id=1, rb=rb_a, bill_date=date(2026, 8, 4))
    make_bill(amount=900, vehicle_id=1, bill_date=date(2026, 8, 4))   # ยังไม่เข้าใบเบิก

    st = svc.quota_status(1, 'source', 2026, 8, source_id=src_b.id)
    assert (st['used'], st['remaining']) == (Decimal('2000'), Decimal('3000'))


# ──────────────────────────────────────────────────────────────
# Phase 2 — holder mutations (create/set_float/top_up/adjust_float/count_cash)
# ทุก action บังคับ note (D8) + ต้อง log ทุกครั้ง
# ──────────────────────────────────────────────────────────────
def test_create_holder_writes_log_and_blocks_duplicate(session):
    h = svc.create_holder(user_id=501, float_amount=15000, note='ตั้งเจ้าหน้าที่คนใหม่', actor_id=1)
    assert h.float_amount == Decimal('15000')
    logs = FuelReserveLog.query.filter_by(holder_id=h.id).all()
    assert len(logs) == 1 and logs[0].log_type == 'set_float'

    with pytest.raises(ValueError):
        svc.create_holder(user_id=501, float_amount=1000, note='ซ้ำ', actor_id=1)


def test_create_holder_requires_note(session):
    with pytest.raises(ValueError):
        svc.create_holder(user_id=502, float_amount=1000, note='', actor_id=1)


def test_set_float_updates_amount_and_logs_delta(session, make_holder):
    h = make_holder(float_amount=10000)
    svc.set_float(h, 15000, note='ปรับวงเงินประจำไตรมาส', actor_id=1)
    assert h.float_amount == Decimal('15000')
    log = FuelReserveLog.query.filter_by(holder_id=h.id).order_by(FuelReserveLog.id.desc()).first()
    assert log.log_type == 'set_float' and log.change_amount == Decimal('5000')

    with pytest.raises(ValueError):
        svc.set_float(h, 20000, note='', actor_id=1)


def test_top_up_adds_to_float_and_rejects_non_positive(session, make_holder):
    h = make_holder(float_amount=10000)
    svc.top_up(h, 3000, note='เติมรอบเดือน', actor_id=1)
    assert h.float_amount == Decimal('13000')
    log = FuelReserveLog.query.filter_by(holder_id=h.id).order_by(FuelReserveLog.id.desc()).first()
    assert log.log_type == 'top_up' and log.change_amount == Decimal('3000')

    with pytest.raises(ValueError):
        svc.top_up(h, 0, note='ศูนย์ไม่ได้', actor_id=1)
    with pytest.raises(ValueError):
        svc.top_up(h, -100, note='ติดลบไม่ได้', actor_id=1)


def test_count_cash_never_mutates_float_amount(session, make_holder, make_bill):
    h = make_holder(float_amount=20000)
    make_bill(amount=3000, holder=h)   # used=3000 → balance=17000

    variance = svc.count_cash(h, counted_amount=16500, note='นับเงินสิ้นวัน', actor_id=1)
    assert variance == Decimal('-500')
    assert h.float_amount == Decimal('20000')   # ไม่ถูกแตะ

    log = FuelReserveLog.query.filter_by(holder_id=h.id, log_type='count').first()
    assert log is not None and log.change_amount == Decimal('-500')

    with pytest.raises(ValueError):
        svc.count_cash(h, counted_amount=100, note='', actor_id=1)


def test_count_then_adjust_two_step_reconciliation_keeps_invariant(session, make_holder, make_bill):
    """นับเงินจริง → เจอส่วนต่าง → กด adjust แยกอีกขั้น (auditable 2 ขั้น ไม่รวบ)
    หลัง adjust สมการ §1.ก ต้องยังจริง"""
    h = make_holder(float_amount=20000)
    make_bill(amount=3000, holder=h)   # balance ควรเป็น 17000

    variance = svc.count_cash(h, counted_amount=16500, note='นับเงินสิ้นวัน', actor_id=1)
    assert variance == Decimal('-500')

    svc.adjust_float(h, variance, note='ปรับตามผลนับเงินจริง 16,500', actor_id=1)
    k = assert_invariant(h)
    assert k['balance'] == Decimal('16500')

    log = FuelReserveLog.query.filter_by(holder_id=h.id, log_type='adjust').first()
    assert log is not None and log.change_amount == Decimal('-500')

    with pytest.raises(ValueError):
        svc.adjust_float(h, 0, note='ศูนย์ไม่ได้', actor_id=1)
    with pytest.raises(ValueError):
        svc.adjust_float(h, 100, note='', actor_id=1)


def test_second_holder_kpi_is_independent(session, make_holder, make_bill):
    """เพิ่มเจ้าหน้าที่คนที่ 2 → KPI แยกกันคนละบัญชี (P2 DoD)"""
    a = make_holder(float_amount=20000)
    b = svc.create_holder(user_id=601, float_amount=8000, note='เจ้าหน้าที่คนที่ 2', actor_id=1)

    make_bill(amount=5000, holder=a)
    svc.top_up(b, 2000, note='เติมให้คนที่ 2', actor_id=1)

    ka, kb = assert_invariant(a), assert_invariant(b)
    assert (ka['float_amount'], ka['used'], ka['balance']) == (Decimal('20000'), Decimal('5000'), Decimal('15000'))
    assert (kb['float_amount'], kb['used'], kb['balance']) == (Decimal('10000'), Decimal('0'), Decimal('10000'))

    rows = {r['holder'].id: r for r in svc.all_holder_kpis()}
    assert rows[a.id]['balance'] == Decimal('15000')
    assert rows[b.id]['balance'] == Decimal('10000')


# ──────────────────────────────────────────────────────────────
# Phase 3 — บิลใหม่ (validate §4.5) + attach บิลเข้าใบเบิก
# ──────────────────────────────────────────────────────────────
def _bill_kwargs(**over):
    kw = dict(bill_date=date(2026, 8, 5), vehicle_id=1, driver_id=1, amount=1000,
              method='reserve', category='fuel', liters=None, mileage=None,
              note=None, paid_by_holder_id=None, actor_id=1)
    kw.update(over)
    return kw


def test_create_bill_requires_driver(session):
    with pytest.raises(ValueError):
        svc.create_bill(**_bill_kwargs(driver_id=None))


def test_create_bill_card_blocked_over_quota(session, make_quota):
    make_quota(vehicle_id=1, kind='card', limit_amount=5000, effective_from=date(2026, 1, 1))
    svc.create_bill(**_bill_kwargs(method='card', amount=4000))
    with pytest.raises(ValueError):
        svc.create_bill(**_bill_kwargs(method='card', amount=1500))
    # พอดีวงเงินที่เหลือ (1000) ต้องผ่าน
    bill, warnings = svc.create_bill(**_bill_kwargs(method='card', amount=1000))
    assert bill.id and warnings == []


def test_create_bill_card_without_quota_config_is_not_blocked(session):
    bill, warnings = svc.create_bill(**_bill_kwargs(vehicle_id=99, method='card', amount=999999))
    assert bill.id


def test_create_bill_forces_null_holder_for_card_and_self(session, make_holder):
    h = make_holder()
    bill, _ = svc.create_bill(**_bill_kwargs(method='card', paid_by_holder_id=h.id))
    assert bill.paid_by_holder_id is None
    bill2, _ = svc.create_bill(**_bill_kwargs(method='self', paid_by_holder_id=h.id))
    assert bill2.paid_by_holder_id is None


def test_create_bill_reserve_assigns_given_holder(session, make_holder):
    h = make_holder()
    bill, _ = svc.create_bill(**_bill_kwargs(method='reserve', paid_by_holder_id=h.id))
    assert bill.paid_by_holder_id == h.id


def test_create_bill_mileage_below_latest_is_blocked(session, make_holder):
    h = make_holder()
    svc.create_bill(**_bill_kwargs(mileage=10000, bill_date=date(2026, 8, 1), paid_by_holder_id=h.id))
    with pytest.raises(ValueError):
        svc.create_bill(**_bill_kwargs(mileage=9999, bill_date=date(2026, 8, 5), paid_by_holder_id=h.id))


def test_create_bill_mileage_jump_over_2000_warns_but_does_not_block(session, make_holder):
    h = make_holder()
    svc.create_bill(**_bill_kwargs(mileage=10000, bill_date=date(2026, 8, 1), paid_by_holder_id=h.id))
    bill, warnings = svc.create_bill(**_bill_kwargs(mileage=13000, bill_date=date(2026, 8, 5),
                                                     paid_by_holder_id=h.id))
    assert bill.id
    assert any('กระโดด' in w for w in warnings)


def test_create_bill_non_fuel_category_does_not_require_mileage(session, make_holder):
    h = make_holder()
    bill, warnings = svc.create_bill(**_bill_kwargs(category='toll', amount=50,
                                                     mileage=None, liters=None, paid_by_holder_id=h.id))
    assert bill.id and bill.category == 'toll'


def test_create_bill_reserve_without_holder_is_blocked(session):
    """review 2026-08-10 #2 — บิล reserve ที่ไม่เลือกผู้สำรองจ่าย ต้อง block ตั้งแต่สร้าง
    (เดิมหลุดผ่านได้ ทำให้ยอดหายจาก settlement เงียบๆ ตอน submit)"""
    with pytest.raises(ValueError):
        svc.create_bill(**_bill_kwargs(method='reserve', paid_by_holder_id=None))


def test_update_bill_excludes_self_from_mileage_and_quota_check(session, make_quota):
    make_quota(vehicle_id=1, kind='card', limit_amount=5000, effective_from=date(2026, 1, 1))
    bill, _ = svc.create_bill(**_bill_kwargs(method='card', amount=4000, mileage=10000))
    # แก้ไขบิลเดิมด้วยค่าที่เหมือนเดิม (การเทียบไมล์/โควตาต้องไม่เอาตัวเองมานับ) ต้องไม่ error
    svc.update_bill(bill, **_bill_kwargs(method='card', amount=4000, mileage=10000, actor_id=1))
    assert bill.amount == Decimal('4000')


def test_self_bill_never_touches_holder_kpi(session, make_holder):
    h = make_holder(float_amount=20000)
    svc.create_bill(**_bill_kwargs(method='self', amount=500))
    k = assert_invariant(h)
    assert k['used'] == Decimal('0')   # self ไม่กระทบ KPI เงินสำรอง (แต่เข้า pivot — นับทุกใบ)
    assert FuelBill.query.filter_by(payment_method='self').count() == 1


# ──────────────────────────────────────────────────────────────
# Phase 3 — attach บิลเข้าใบเบิก draft
# ──────────────────────────────────────────────────────────────
def test_attach_bills_blocked_when_reimbursement_not_draft(session, make_bill, make_rb):
    rb = make_rb(status='submitted')
    b = make_bill(amount=1000)
    with pytest.raises(ValueError):
        svc.attach_bills_to_reimbursement([b.id], rb, actor_id=1)


def test_attach_bills_only_attaches_eligible_bills(session, make_bill, make_rb):
    rb = make_rb(status='draft')
    reserve_bill = make_bill(amount=1000, method='reserve')
    card_bill = make_bill(amount=1000, method='card')
    already_attached = make_bill(amount=1000, method='reserve')
    already_attached.reimbursement_id = 999999  # fake — treated as "already attached"
    session.commit()

    svc.attach_bills_to_reimbursement(
        [reserve_bill.id, card_bill.id, already_attached.id], rb, actor_id=1)

    assert reserve_bill.reimbursement_id == rb.id
    assert card_bill.reimbursement_id is None          # method ผิด ไม่ถูกดึงเข้า
    assert already_attached.reimbursement_id == 999999  # ถูกใช้ไปแล้ว ไม่ถูกแตะ


def test_attach_bills_warns_when_source_quota_exceeded(session, make_bill, make_rb, make_quota):
    src_id = 7
    make_quota(vehicle_id=1, kind='source', limit_amount=3000, source_id=src_id,
              effective_from=date(2026, 1, 1))
    rb = make_rb(status='draft', source_id=src_id)
    b1 = make_bill(amount=2000, method='reserve', bill_date=date(2026, 8, 3))
    b2 = make_bill(amount=1500, method='reserve', bill_date=date(2026, 8, 4))

    warnings = svc.attach_bills_to_reimbursement([b1.id, b2.id], rb, actor_id=1)

    assert warnings   # เกิน 3000 → มี warning แต่ยัง attach ให้ (soft warn ไม่ block)
    assert b1.reimbursement_id == rb.id
    assert b2.reimbursement_id == rb.id


def test_create_draft_with_bills_creates_and_attaches(session, make_bill):
    b = make_bill(amount=1000, method='reserve')
    rb = svc.create_draft_with_bills([b.id], reimbursement_no='จ69-9999',
                                     source_id=None, note='', actor_id=1)
    assert rb.status == 'draft'
    assert b.reimbursement_id == rb.id


# ──────────────────────────────────────────────────────────────
# Phase 4 — ส่งเรื่อง (snapshot settlement) + ได้เงิน + คืนเงินรายคน + ล็อก (D9)
# ──────────────────────────────────────────────────────────────
def test_submit_reimbursement_snapshots_settlement_per_holder(session, make_holder, make_bill, make_rb):
    a = make_holder(float_amount=20000)
    b = make_holder(float_amount=10000)
    rb = make_rb(status='draft')
    make_bill(amount=6000, holder=a, rb=rb)
    make_bill(amount=4000, holder=a, rb=rb)
    make_bill(amount=3000, holder=b, rb=rb)

    svc.submit_reimbursement(rb, amount_requested=None, actor_id=1)

    assert rb.status == 'submitted'
    assert rb.submitted_at is not None
    assert rb.amount_requested == Decimal('13000')

    st_a = ReimbursementSettlement.query.filter_by(reimbursement_id=rb.id, holder_id=a.id).one()
    st_b = ReimbursementSettlement.query.filter_by(reimbursement_id=rb.id, holder_id=b.id).one()
    assert st_a.amount == Decimal('10000') and st_a.settled_at is None
    assert st_b.amount == Decimal('3000') and st_b.settled_at is None

    ka, kb = assert_invariant(a), assert_invariant(b)
    assert (ka['used'], ka['submitted']) == (Decimal('0'), Decimal('10000'))
    assert (kb['used'], kb['submitted']) == (Decimal('0'), Decimal('3000'))


def test_submit_reimbursement_blocks_when_not_draft_or_empty(session, make_holder, make_bill, make_rb):
    rb_empty = make_rb(status='draft', no='จ69-0010')
    with pytest.raises(ValueError):
        svc.submit_reimbursement(rb_empty, amount_requested=None, actor_id=1)

    a = make_holder()
    rb = make_rb(status='draft', no='จ69-0011')
    make_bill(amount=1000, holder=a, rb=rb)
    svc.submit_reimbursement(rb, amount_requested=None, actor_id=1)
    with pytest.raises(ValueError):
        svc.submit_reimbursement(rb, amount_requested=None, actor_id=1)   # ส่งซ้ำไม่ได้


def test_submit_reimbursement_ignores_non_reserve_bills_in_settlement(session, make_holder, make_bill, make_rb):
    """ใบเบิกเดิม (legacy) อาจมีบิล card/self ปนอยู่ — ไม่มี holder ไม่ควรเข้า settlement"""
    a = make_holder(float_amount=20000)
    rb = make_rb(status='draft')
    make_bill(amount=1000, holder=a, rb=rb, method='reserve')
    make_bill(amount=500, rb=rb, method='card')

    svc.submit_reimbursement(rb, amount_requested=None, actor_id=1)

    assert rb.amount_requested == Decimal('1000')
    assert ReimbursementSettlement.query.filter_by(reimbursement_id=rb.id).count() == 1


def test_bills_locked_after_submit(session, make_holder, make_bill, make_rb):
    a = make_holder()
    rb = make_rb(status='draft')
    bill = make_bill(amount=1000, holder=a, rb=rb)
    svc.submit_reimbursement(rb, amount_requested=None, actor_id=1)

    with pytest.raises(ValueError):
        svc.update_bill(bill, **_bill_kwargs(amount=2000, actor_id=1))
    with pytest.raises(ValueError):
        svc.delete_bill(bill, actor_id=1)
    with pytest.raises(ValueError):
        svc.detach_bill(bill, actor_id=1)


def test_receive_reimbursement_requires_submitted(session, make_rb):
    rb = make_rb(status='draft')
    with pytest.raises(ValueError):
        svc.receive_reimbursement(rb, amount_received=1000, received_at=date(2026, 8, 20), actor_id=1)

    rb.status = 'submitted'
    session.commit()
    svc.receive_reimbursement(rb, amount_received=1000, received_at=date(2026, 8, 20), actor_id=1)
    assert rb.status == 'received'
    assert rb.amount_received == Decimal('1000')


def test_settle_holder_blocked_before_received(session, make_holder, make_bill, make_rb):
    """review 2026-08-10 #1 — คืนเงินไม่ได้จนกว่าใบเบิกจะ 'ได้เงินคืน' จริง (status='received')
    ไม่งั้น balance จะไหลกลับ 'คงเหลือ' ทั้งที่เงินยังไม่เข้า (probe ยืนยันแล้วว่า balance ผิด)"""
    h = make_holder(float_amount=20000)
    rb = make_rb(status='draft')
    make_bill(amount=5000, holder=h, rb=rb)
    svc.submit_reimbursement(rb, amount_requested=None, actor_id=1)
    st = ReimbursementSettlement.query.filter_by(reimbursement_id=rb.id, holder_id=h.id).one()

    assert rb.status == 'submitted'
    with pytest.raises(ValueError):
        svc.settle_holder(st, settled_at=date(2026, 8, 20), actor_id=1)

    svc.receive_reimbursement(rb, amount_received=5000, received_at=date(2026, 8, 20), actor_id=1)
    svc.settle_holder(st, settled_at=date(2026, 8, 20), actor_id=1)
    k = assert_invariant(h)
    assert k['balance'] == Decimal('20000')


def test_submit_reimbursement_blocks_orphan_reserve_bill(session, make_bill, make_rb):
    """review 2026-08-10 #2 — defense-in-depth: บิล reserve ที่ไม่มี holder (เช่นข้อมูลเก่าก่อนแก้)
    ต้อง block ตอน submit ไม่ใช่เงียบหายจากยอดเบิก"""
    rb = make_rb(status='draft')
    orphan = make_bill(amount=2000, method='reserve', holder=None, rb=rb)
    assert orphan.paid_by_holder_id is None
    with pytest.raises(ValueError):
        svc.submit_reimbursement(rb, amount_requested=None, actor_id=1)


def test_settle_holder_two_holders_settle_separately(session, make_holder, make_bill, make_rb):
    a = make_holder(float_amount=20000)
    b = make_holder(float_amount=10000)
    rb = make_rb(status='draft')
    make_bill(amount=10000, holder=a, rb=rb)
    make_bill(amount=5000, holder=b, rb=rb)
    svc.submit_reimbursement(rb, amount_requested=None, actor_id=1)
    svc.receive_reimbursement(rb, amount_received=15000, received_at=date(2026, 8, 20), actor_id=1)

    st_a = ReimbursementSettlement.query.filter_by(reimbursement_id=rb.id, holder_id=a.id).one()
    st_b = ReimbursementSettlement.query.filter_by(reimbursement_id=rb.id, holder_id=b.id).one()

    svc.settle_holder(st_a, settled_at=date(2026, 8, 20), actor_id=1)
    ka, kb = assert_invariant(a), assert_invariant(b)
    assert (ka['submitted'], ka['balance']) == (Decimal('0'), Decimal('20000'))
    assert (kb['submitted'], kb['balance']) == (Decimal('5000'), Decimal('5000'))

    with pytest.raises(ValueError):
        svc.settle_holder(st_a, settled_at=date(2026, 8, 21), actor_id=1)   # settle ซ้ำไม่ได้

    svc.settle_holder(st_b, settled_at=date(2026, 8, 22), actor_id=1)
    kb = assert_invariant(b)
    assert (kb['submitted'], kb['balance']) == (Decimal('0'), Decimal('10000'))


def test_delete_draft_reimbursement_blocked_once_submitted(session, make_holder, make_bill, make_rb):
    a = make_holder()
    rb = make_rb(status='draft')
    bill = make_bill(amount=1000, holder=a, rb=rb)
    svc.submit_reimbursement(rb, amount_requested=None, actor_id=1)
    with pytest.raises(ValueError):
        svc.delete_draft_reimbursement(rb, actor_id=1)


def test_delete_draft_reimbursement_detaches_bills(session, make_bill, make_rb):
    rb = make_rb(status='draft')
    bill = make_bill(amount=1000, method='reserve', rb=rb)
    svc.delete_draft_reimbursement(rb, actor_id=1)
    assert bill.reimbursement_id is None
    assert FuelReimbursement.query.get(rb.id) is None


def test_update_reimbursement_meta_blocked_once_submitted(session, make_holder, make_bill, make_rb):
    a = make_holder()
    rb = make_rb(status='draft')
    make_bill(amount=1000, holder=a, rb=rb)
    svc.update_reimbursement_meta(rb, reimbursement_no='จ69-9998', source_id=None, note='x', actor_id=1)
    assert rb.reimbursement_no == 'จ69-9998'

    svc.submit_reimbursement(rb, amount_requested=None, actor_id=1)
    with pytest.raises(ValueError):
        svc.update_reimbursement_meta(rb, reimbursement_no='จ69-0000', source_id=None, note='', actor_id=1)


# ──────────────────────────────────────────────────────────────
# Phase 5 — fleet config: ตั้งโควตารถ (insert-only, effective-dated)
# ──────────────────────────────────────────────────────────────
def test_set_vehicle_quota_inserts_when_none_exists(session):
    q = svc.set_vehicle_quota(1, 'card', 5000, None, actor_id=1,
                              effective_from=date(2026, 8, 1))
    assert q is not None
    assert svc.quota_limit(1, 'card', 2026, 8) == Decimal('5000')


def test_set_vehicle_quota_noop_when_unchanged(session):
    svc.set_vehicle_quota(1, 'card', 5000, None, actor_id=1, effective_from=date(2026, 8, 1))
    before = VehicleQuota.query.filter_by(vehicle_id=1, kind='card').count()
    q = svc.set_vehicle_quota(1, 'card', 5000, None, actor_id=1, effective_from=date(2026, 8, 15))
    after = VehicleQuota.query.filter_by(vehicle_id=1, kind='card').count()
    assert q is None
    assert before == after == 1


def test_set_vehicle_quota_change_inserts_new_row_old_months_unaffected(session):
    svc.set_vehicle_quota(1, 'card', 5000, None, actor_id=1, effective_from=date(2026, 1, 1))
    q = svc.set_vehicle_quota(1, 'card', 8000, None, actor_id=1, effective_from=date(2026, 8, 1))
    assert q is not None
    assert svc.quota_limit(1, 'card', 2026, 7) == Decimal('5000')   # เดือนเก่าไม่เปลี่ยน (P5 DoD)
    assert svc.quota_limit(1, 'card', 2026, 8) == Decimal('8000')
    assert VehicleQuota.query.filter_by(vehicle_id=1, kind='card').count() == 2   # insert ไม่ใช่ update


def test_set_vehicle_quota_blank_amount_is_noop(session):
    q = svc.set_vehicle_quota(1, 'card', '', None, actor_id=1, effective_from=date(2026, 8, 1))
    assert q is None
    assert VehicleQuota.query.filter_by(vehicle_id=1, kind='card').count() == 0


# ──────────────────────────────────────────────────────────────
# review 2026-08-10 #8 — แหล่งเบิก CRUD
# ──────────────────────────────────────────────────────────────
def test_create_source_blocks_duplicate_name(session):
    svc.create_source('วัดพระธรรมกาย', is_default=False, actor_id=1)
    with pytest.raises(ValueError):
        svc.create_source('วัดพระธรรมกาย', is_default=False, actor_id=1)


def test_create_source_default_unsets_previous_default(session):
    a = svc.create_source('DCI', is_default=True, actor_id=1)
    b = svc.create_source('วัดพระธรรมกาย', is_default=True, actor_id=1)
    assert ReimbursementSource.query.get(a.id).is_default is False
    assert ReimbursementSource.query.get(b.id).is_default is True


def test_toggle_source_active_blocks_when_default(session):
    a = svc.create_source('DCI', is_default=True, actor_id=1)
    with pytest.raises(ValueError):
        svc.toggle_source_active(a, actor_id=1)


def test_toggle_source_active_flips_flag(session):
    a = svc.create_source('วัดพระธรรมกาย', is_default=False, actor_id=1)
    svc.toggle_source_active(a, actor_id=1)
    assert a.is_active is False
    svc.toggle_source_active(a, actor_id=1)
    assert a.is_active is True


def test_delete_source_blocked_when_referenced_by_reimbursement(session, make_rb):
    a = svc.create_source('วัดพระธรรมกาย', is_default=False, actor_id=1)
    make_rb(status='draft', source_id=a.id)
    with pytest.raises(ValueError):
        svc.delete_source(a, actor_id=1)


def test_delete_source_blocked_when_referenced_by_quota(session, make_quota):
    a = svc.create_source('วัดพระธรรมกาย', is_default=False, actor_id=1)
    make_quota(vehicle_id=1, kind='source', source_id=a.id, limit_amount=5000)
    with pytest.raises(ValueError):
        svc.delete_source(a, actor_id=1)


def test_delete_source_succeeds_when_unreferenced(session):
    a = svc.create_source('วัดพระธรรมกาย', is_default=False, actor_id=1)
    svc.delete_source(a, actor_id=1)
    assert ReimbursementSource.query.get(a.id) is None
