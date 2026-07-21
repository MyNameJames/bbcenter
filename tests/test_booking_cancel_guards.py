"""
test_booking_cancel_guards.py — Phase 1 GUARD tests (test-first)

Written BEFORE implementing code changes.
Tests marked *NEW* FAIL before implementation; PASS after.
Regression tests (no mark) should PASS both before and after.

Tests:
  1  owner cancel pending                      → cancelled, no budget log
  2  owner cancel waiting_approver             → cancelled
  3  owner cancel approved                     → blocked  *NEW*
  4  admin cancel approved (other's booking)   → cancelled
  5  cancel after start_datetime               → blocked (time guard, existing)
  6  delete with budget_deducted_at != null    → blocked  *NEW*
  7  owner delete pending                      → booking deleted
  8  admin reject pending                      → rejected, no budget log
  9A revert booking with deducted mileage      → 400       *NEW*
  9B revert approved (no deduct)               → pending
  10 budget_manage action=cancel_booking       → cancelled, no budget log  *NEW*
"""
from datetime import datetime, timedelta

from models import db, VehicleBooking, VehicleMileage, VehicleBudgetLog, User
from conftest import login


# ─── DB factories ──────────────────────────────────────────────
def _user(username, role='user') -> User:
    u = User(username=username, role_vehicle=role)
    db.session.add(u)
    db.session.flush()
    return u


def _booking(user_id, status, *, days=1) -> VehicleBooking:
    base = datetime.now().replace(second=0, microsecond=0) + timedelta(days=days)
    bk = VehicleBooking(
        user_id=user_id,
        start_datetime=base,
        end_datetime=base + timedelta(hours=8),
        destination='dest', purpose='purpose',
        passenger_count=1, status=status,
    )
    db.session.add(bk)
    db.session.flush()
    return bk


def _add_deducted_mileage(bk: VehicleBooking) -> VehicleMileage:
    m = VehicleMileage(booking_id=bk.id, budget_deducted_at=datetime.now())
    db.session.add(m)
    db.session.flush()
    return m


def _add_started_mileage(bk: VehicleBooking) -> VehicleMileage:
    """mileage start entry เท่านั้น (ไม่หักงบ) — ใช้ทดสอบ REQ-1 guard (Phase 3.5)"""
    m = VehicleMileage(booking_id=bk.id, odometer_start=1000)
    db.session.add(m)
    db.session.flush()
    return m


def _log_count() -> int:
    return VehicleBudgetLog.query.count()


# ─── Tests ─────────────────────────────────────────────────────

def test_owner_cancel_pending_ok(client):
    """owner cancel pending → cancelled, no new VehicleBudgetLog"""
    owner = _user('u_cpo')
    bk = _booking(owner.id, 'pending')
    before = _log_count()
    login(client, owner.id)

    r = client.post(f'/vehicle/cancel/{bk.id}', follow_redirects=False)

    assert r.status_code == 302
    bk = VehicleBooking.query.get(bk.id)
    assert bk.status == 'cancelled'
    assert _log_count() == before


def test_owner_cancel_waiting_approver_blocked(client):  # BUG-1 — เดิมชื่อ _ok, assert ผิด
    """owner cancel waiting_approver → blocked (สถานะไม่เปลี่ยน)
    ตัดสิทธิ์นี้ออกตั้งใจเมื่อ 2026-06-20 (ดู INDEX_code.md:39 changelog) — user ยกเลิกได้
    เฉพาะก่อน admin จัดรถ (status='pending') เท่านั้น ก่อนหน้านี้ test เขียนไว้ผิด (คาดหวัง
    behavior เก่าก่อน 2026-06-20) ยืนยันกับเจ้าของโปรเจกต์แล้วว่า code ถูก ไม่ใช่ test"""
    owner = _user('u_cwa')
    bk = _booking(owner.id, 'waiting_approver')
    login(client, owner.id)

    r = client.post(f'/vehicle/cancel/{bk.id}', follow_redirects=False)

    assert r.status_code == 302
    bk = VehicleBooking.query.get(bk.id)
    assert bk.status == 'waiting_approver'  # ไม่เปลี่ยน — block ไม่ใช่ cancel


def test_owner_cancel_approved_blocked(client):  # *NEW* — FAILS before guard
    """owner cancel approved → blocked: status must remain approved"""
    owner = _user('u_cap')
    bk = _booking(owner.id, 'approved')
    login(client, owner.id)

    r = client.post(f'/vehicle/cancel/{bk.id}', follow_redirects=False)

    assert r.status_code == 302
    bk = VehicleBooking.query.get(bk.id)
    assert bk.status == 'approved'  # must NOT become 'cancelled'


def test_admin_cancel_approved_other_user_ok(client):
    """admin can cancel approved booking of another user → cancelled"""
    owner = _user('u_acao')
    admin = _user('u_acaa', role='admin')
    bk = _booking(owner.id, 'approved')
    login(client, admin.id)

    r = client.post(f'/vehicle/cancel/{bk.id}', follow_redirects=False)

    assert r.status_code == 302
    bk = VehicleBooking.query.get(bk.id)
    assert bk.status == 'cancelled'


def test_cancel_after_start_blocked(client):
    """cancel after start_datetime → blocked for both owner and admin"""
    owner = _user('u_cas')
    admin = _user('u_cas_a', role='admin')
    bk = _booking(owner.id, 'pending', days=-1)  # past booking
    bk_id = bk.id

    login(client, owner.id)
    client.post(f'/vehicle/cancel/{bk_id}')
    assert VehicleBooking.query.get(bk_id).status == 'pending'

    login(client, admin.id)
    client.post(f'/vehicle/cancel/{bk_id}')
    assert VehicleBooking.query.get(bk_id).status == 'pending'


def test_delete_with_deducted_mileage_blocked(client):  # *NEW* — FAILS before guard
    """admin delete booking with budget_deducted_at → blocked: booking must survive"""
    owner = _user('u_ddm')
    admin = _user('u_ddm_a', role='admin')
    bk = _booking(owner.id, 'approved')
    _add_deducted_mileage(bk)
    bk_id = bk.id
    login(client, admin.id)

    r = client.post(f'/vehicle/delete/{bk_id}', follow_redirects=False)

    assert r.status_code == 302
    assert VehicleBooking.query.get(bk_id) is not None  # booking NOT deleted


def test_owner_delete_pending_ok(client):
    """owner delete pending booking → row removed from DB"""
    owner = _user('u_odp')
    bk = _booking(owner.id, 'pending')
    bk_id = bk.id
    login(client, owner.id)

    r = client.post(f'/vehicle/delete/{bk_id}', follow_redirects=False)

    assert r.status_code == 302
    assert VehicleBooking.query.get(bk_id) is None


def test_admin_reject_pending_no_refund_log(client):
    """admin reject pending booking → rejected, no new VehicleBudgetLog"""
    owner = _user('u_arp')
    admin = _user('u_arp_a', role='admin')
    bk = _booking(owner.id, 'pending')
    before = _log_count()
    login(client, admin.id)

    r = client.post(
        f'/vehicle/approve/{bk.id}',
        data={'action': 'reject', 'reject_reason': 'test'},
        follow_redirects=False,
    )

    assert r.status_code == 302
    bk = VehicleBooking.query.get(bk.id)
    assert bk.status == 'rejected'
    assert _log_count() == before  # no refund budget log


def test_revert_booking_deducted_returns_400_clean_returns_pending(client):  # *NEW* — Part A FAILS
    """revert with deducted mileage → 400; revert approved (no deduct) → pending"""
    owner = _user('u_rev')
    admin = _user('u_rev_a', role='admin')
    login(client, admin.id)

    # Part A: booking with budget_deducted_at must return 400
    bk_ded = _booking(owner.id, 'approved')
    _add_deducted_mileage(bk_ded)
    r = client.post(f'/vehicle/admin/booking/{bk_ded.id}/revert')
    assert r.status_code == 400
    assert VehicleBooking.query.get(bk_ded.id).status == 'approved'

    # Part B: clean approved booking → pending
    bk_clean = _booking(owner.id, 'approved')
    r2 = client.post(f'/vehicle/admin/booking/{bk_clean.id}/revert')
    assert r2.status_code == 200
    assert r2.get_json()['ok'] is True
    assert VehicleBooking.query.get(bk_clean.id).status == 'pending'


def test_budget_manage_cancel_booking_action(client):  # *NEW* — FAILS before rename
    """budget_manage POST action=cancel_booking → booking cancelled, no budget log"""
    from models import BudgetType, VehicleDepartment, VehicleBudget
    admin = _user('u_bmc_a', role='admin')
    owner = _user('u_bmc')

    bt = BudgetType(name='central-bmc-t')
    db.session.add(bt)
    db.session.flush()
    dept = VehicleDepartment(name='dept-bmc-t', budget_type_id=bt.id)
    db.session.add(dept)
    db.session.flush()
    budget = VehicleBudget(
        budget_type_id=bt.id, department_id=dept.id,
        year=2026, month=6,
        budget_amount=1000, used_amount=0, is_active=True,
    )
    db.session.add(budget)

    bk = _booking(owner.id, 'approved')
    db.session.commit()
    before = _log_count()
    login(client, admin.id)

    r = client.post('/admin/budget', data={
        'action': 'cancel_booking',
        'booking_id': str(bk.id),
        'year': '2026',
        'month': '6',
    }, follow_redirects=False)

    assert r.status_code == 302
    bk = VehicleBooking.query.get(bk.id)
    assert bk.status == 'cancelled'
    assert _log_count() == before  # no budget ledger change


def test_budget_manage_cancel_booking_blocked_when_started(client):  # *NEW* (Phase 3.5)
    """budget_manage POST action=cancel_booking บน booking ที่มี mileage start entry แล้ว
    → block, status ไม่เปลี่ยน — ปิด DEBT-3 เต็มรูป (REQ-2): เรียก booking_svc.cancel()
    ตัวเดียวกับ path อื่นทั้งหมด จึงได้ guard เดียวกัน (เดิม _handle_cancel_booking() ไม่มี
    guard อะไรเลยนอกจากกัน double-flip status)"""
    admin = _user('u_bmc_b_a', role='admin')
    owner = _user('u_bmc_b')
    bk = _booking(owner.id, 'approved')
    _add_started_mileage(bk)
    db.session.commit()
    login(client, admin.id)

    r = client.post('/admin/budget', data={
        'action': 'cancel_booking',
        'booking_id': str(bk.id),
        'year': '2026',
        'month': '6',
    }, follow_redirects=False)

    assert r.status_code == 302
    bk = VehicleBooking.query.get(bk.id)
    assert bk.status == 'approved'  # ไม่เปลี่ยน — ถูก block
