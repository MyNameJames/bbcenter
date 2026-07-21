"""
test_booking_workflow.py — Phase 5 #15 state machine tests (test-first)

Tests:
  Unit (no DB / app context needed):
  1  ALLOWED_TRANSITIONS ครอบทุก status เป็น key
  2  apply_transition invalid → (False, msg)
  3  apply_transition valid   → (True, None) + status ถูก set
  4  apply_transition ตั้ง updated_by เมื่อ actor_id ส่งมา
  5  apply_transition ไม่ตั้ง updated_by เมื่อ actor_id=None

  guard_budget (monkeypatch _lookup):
  6  expense_type=None/personal → ok=True (ไม่ต้องมีงบ)
  7  expense_type=central, _lookup คืน budget=None → ok=False + msg
  8  expense_type=central, _lookup คืน budget object → ok=True

  Route-level (admin_assign JSON endpoint):
  9  admin_assign approve central, no active budget → 400 {'ok': False}
  10 admin_assign approve central, active budget    → 200 {'ok': True}
  11 admin_assign approve personal (no budget type) → 200 {'ok': True} (ไม่เช็คงบ)
  12 admin_assign reject                            → 200 status=rejected
"""
import itertools
from datetime import datetime, timedelta, date

import pytest
from flask import Flask
from flask_login import LoginManager
from sqlalchemy.pool import StaticPool

from models import db, VehicleBooking, VehicleBudget, VehicleDepartment, BudgetType, User

_seq = itertools.count(1000)

# ─────────────────────────────────────────────────────────────
# Unit helpers — no app context needed
# ─────────────────────────────────────────────────────────────

def _mock_booking(status='pending', expense_type=None):
    class B:
        pass
    b = B()
    b.status       = status
    b.expense_type = expense_type
    b.updated_by   = None
    return b


# ─────────────────────────────────────────────────────────────
# Tests 1-5 — state machine unit (no DB)
# ─────────────────────────────────────────────────────────────

def test_1_allowed_transitions_covers_all_statuses():
    from domain.vehicle.workflow import ALLOWED_TRANSITIONS
    expected = {'pending', 'waiting_approver', 'approved', 'rejected', 'cancelled'}
    assert set(ALLOWED_TRANSITIONS.keys()) == expected


def test_2_apply_transition_invalid():
    from domain.vehicle.workflow import apply_transition
    b = _mock_booking('rejected')
    ok, msg = apply_transition(b, 'approved')
    assert ok is False
    assert msg


def test_2b_apply_transition_same_status_blocked():
    from domain.vehicle.workflow import apply_transition
    b = _mock_booking('pending')
    ok, msg = apply_transition(b, 'pending')
    assert ok is False


def test_3_apply_transition_valid():
    from domain.vehicle.workflow import apply_transition
    b = _mock_booking('pending')
    ok, msg = apply_transition(b, 'approved')
    assert ok is True
    assert msg is None
    assert b.status == 'approved'


def test_4_apply_transition_sets_updated_by():
    from domain.vehicle.workflow import apply_transition
    b = _mock_booking('pending')
    apply_transition(b, 'approved', actor_id=99)
    assert b.updated_by == 99


def test_5_apply_transition_no_actor_keeps_updated_by():
    from domain.vehicle.workflow import apply_transition
    b = _mock_booking('pending')
    b.updated_by = 7
    apply_transition(b, 'approved', actor_id=None)
    assert b.updated_by == 7  # ไม่แตะ


# ─────────────────────────────────────────────────────────────
# Tests 6-8 — guard_budget (monkeypatch)
# ─────────────────────────────────────────────────────────────

@pytest.fixture
def mini_app():
    a = Flask(__name__)
    a.config.update(
        SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        TESTING=True,
        SECRET_KEY='wf-test',
    )
    db.init_app(a)
    with a.test_request_context():
        db.create_all()
        yield a


def test_6_guard_budget_personal_skip(mini_app, monkeypatch):
    from domain.vehicle import workflow as wf
    called = []
    monkeypatch.setattr(wf, '_lookup_budget_for_booking', lambda *a, **kw: called.append(1) or (None, None))
    b = _mock_booking(expense_type=None)
    ok, msg = wf.guard_budget(b)
    assert ok is True
    assert not called  # ไม่เรียก lookup เลย


def test_7_guard_budget_no_active_budget(mini_app, monkeypatch):
    from domain.vehicle import workflow as wf
    monkeypatch.setattr(wf, '_lookup_budget_for_booking', lambda *a, **kw: (None, 'ส่วนกลาง'))
    b = _mock_booking(expense_type='central')
    ok, msg = wf.guard_budget(b)
    assert ok is False
    assert msg


def test_8_guard_budget_active_budget_ok(mini_app, monkeypatch):
    from domain.vehicle import workflow as wf

    class FakeBudget:
        id = 1
    monkeypatch.setattr(wf, '_lookup_budget_for_booking', lambda *a, **kw: (FakeBudget(), 'ส่วนกลาง'))
    b = _mock_booking(expense_type='central')
    ok, msg = wf.guard_budget(b)
    assert ok is True
    assert msg is None


# ─────────────────────────────────────────────────────────────
# Route-level fixture
# ─────────────────────────────────────────────────────────────

@pytest.fixture
def wf_app(monkeypatch):
    import views.core.telegram_service as _tg
    monkeypatch.setattr(_tg, '_send', lambda *a, **kw: None)

    from views.vehicle import vehicle_bp, adminfleet_bp

    a = Flask(__name__)
    a.config.update(
        SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        TESTING=True,
        SECRET_KEY='wf-route',
        SQLALCHEMY_ENGINE_OPTIONS={
            'connect_args': {'check_same_thread': False},
            'poolclass': StaticPool,
        },
    )
    db.init_app(a)
    lm = LoginManager()
    lm.init_app(a)

    @lm.user_loader
    def load_user(uid):
        return User.query.get(int(uid))

    a.register_blueprint(vehicle_bp)
    a.register_blueprint(adminfleet_bp)

    with a.app_context():
        db.create_all()
        yield a
        db.session.remove()


@pytest.fixture
def wf_client(wf_app):
    return wf_app.test_client()


def _admin_user(name='adm'):
    n = next(_seq)
    u = User(username=f'{name}{n}', role_vehicle='admin')
    db.session.add(u)
    db.session.flush()
    return u


def _booking(user_id, status='pending', expense_type=None, dept_id=None):
    b = VehicleBooking(
        user_id=user_id, status=status,
        expense_type=expense_type, trip_department_id=dept_id,
        start_datetime=datetime.now() + timedelta(days=2),
        end_datetime  =datetime.now() + timedelta(days=2, hours=8),
        destination='ทดสอบ', purpose='ทดสอบ', passenger_count=1,
        need_driver=False,   # ไม่ต้องการคนขับ → ข้าม driver guard ใน admin_assign
    )
    db.session.add(b)
    db.session.flush()
    return b


def _make_dept_budget(is_active=True):
    """สร้าง BudgetType + VehicleDepartment + VehicleBudget active อย่างละ 1"""
    n = next(_seq)
    bt = BudgetType(name=f'central-{n}')
    db.session.add(bt)
    db.session.flush()
    dept = VehicleDepartment(name=f'dept-{n}', budget_type_id=bt.id)
    db.session.add(dept)
    db.session.flush()
    today = date.today()
    bgt = VehicleBudget(
        budget_type_id=bt.id, department_id=dept.id,
        year=today.year, month=today.month,
        budget_amount=50000, used_amount=0,
        is_active=is_active,
        start_date=today.replace(day=1),
        end_date=(today.replace(day=28)),
    )
    db.session.add(bgt)
    db.session.commit()
    return bt, dept, bgt


def _login(client, uid):
    with client.session_transaction() as s:
        s['_user_id'] = str(uid)
        s['_fresh'] = True


# ─────────────────────────────────────────────────────────────
# Tests 9-12 — admin_assign route
# ─────────────────────────────────────────────────────────────

def test_9_admin_assign_approve_central_no_budget(wf_app, wf_client):
    """admin_assign approve central expense ที่ไม่มีงบ active → 400"""
    with wf_app.app_context():
        adm = _admin_user()
        bk  = _booking(adm.id, status='pending', expense_type='central')
        db.session.commit()
        adm_id = adm.id
        bk_id  = bk.id

    _login(wf_client, adm_id)
    res = wf_client.post(f'/vehicle/admin/assign/{bk_id}', data={
        'action':        'assign',
        'assign_action': 'approve',
        'expense_type':  'central',
    })
    assert res.status_code == 400
    data = res.get_json()
    assert data['ok'] is False


def test_10_admin_assign_approve_central_with_budget(wf_app, wf_client, monkeypatch):
    """admin_assign approve central expense ที่มีงบ active → 200"""
    import services.vehicle.booking_service as bs_mod
    # patch ที่ booking_service (Phase 2) เพราะ guard_budget ถูกเรียกจาก
    # approve_from_pending() ในนั้นแล้ว — ไม่ใช่จาก vehicle_admin ตรงๆ อีกต่อไป
    monkeypatch.setattr(bs_mod, 'guard_budget', lambda b: (True, None))

    with wf_app.app_context():
        bt, dept, bgt = _make_dept_budget(is_active=True)
        adm = _admin_user()
        bk  = _booking(adm.id, status='pending',
                        expense_type='central', dept_id=dept.id)
        db.session.commit()
        adm_id = adm.id
        bk_id  = bk.id

    _login(wf_client, adm_id)
    res = wf_client.post(f'/vehicle/admin/assign/{bk_id}', data={
        'action':        'assign',
        'assign_action': 'approve',
        'expense_type':  'central',
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['ok'] is True


def test_11_admin_assign_approve_personal_no_budget_check(wf_app, wf_client):
    """admin_assign approve personal → ไม่ต้องมีงบ → 200"""
    with wf_app.app_context():
        adm = _admin_user()
        bk  = _booking(adm.id, status='pending', expense_type='personal')
        db.session.commit()
        adm_id = adm.id
        bk_id  = bk.id

    _login(wf_client, adm_id)
    res = wf_client.post(f'/vehicle/admin/assign/{bk_id}', data={
        'action':        'assign',
        'assign_action': 'approve',
        'expense_type':  'personal',
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['ok'] is True


def test_12_admin_assign_reject(wf_app, wf_client):
    """admin_assign reject → 200, booking status=rejected"""
    with wf_app.app_context():
        adm = _admin_user()
        bk  = _booking(adm.id, status='pending')
        db.session.commit()
        adm_id = adm.id
        bk_id  = bk.id

    _login(wf_client, adm_id)
    res = wf_client.post(f'/vehicle/admin/assign/{bk_id}', data={
        'action':        'assign',
        'assign_action': 'reject',
        'reject_reason': 'ทดสอบปฏิเสธ',
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['ok'] is True

    with wf_app.app_context():
        bk = VehicleBooking.query.get(bk_id)
        assert bk.status == 'rejected'
