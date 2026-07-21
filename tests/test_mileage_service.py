"""
test_mileage_service.py — services/vehicle/mileage_service.py (Phase 3, 2026-07-19)

คลุม: close_trip() (เดิมชื่อ deduct_budget_for_trip — ย้ายจาก tests/test_deduct_budget_for_trip.py
เดิม 6 case, แปลง get_flashed_messages() → return-value assertion ตาม signature ใหม่ที่คืนค่า
แทน flash() ตรง), close_trip() idempotency ผ่าน budget_service จริง (ไม่ mock — พิสูจน์
budget_deducted_at guard), auto_generate_ot() idempotent skip, override_fuel_cost()
(สร้างครั้งแรกไม่ได้/rededuct เมื่อเคยหักแล้ว — behavior เดิมจาก override_fuel() route)
"""
import itertools
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from flask import Flask
from sqlalchemy.pool import StaticPool

from models import (
    db, BudgetType, VehicleDepartment, VehicleBudget,
    VehicleBooking, VehicleMileage, User, Vehicle, Driver, DriverOT,
    OTRateConfig, Notification,
)
import services.vehicle.mileage_service as ms

_seq = itertools.count(1)
MOD = 'services.vehicle.mileage_service'


# ──────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────
@pytest.fixture
def app():
    app = Flask(__name__)
    app.config.update(
        SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        TESTING=True,
        SECRET_KEY='test-mileage-svc',
        SQLALCHEMY_ENGINE_OPTIONS={
            'connect_args': {'check_same_thread': False},
            'poolclass': StaticPool,
        },
    )
    db.init_app(app)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()


@pytest.fixture
def session(app):
    return db.session


# ──────────────────────────────────────────────────────────────
# Factories
# ──────────────────────────────────────────────────────────────
def _user(session, role='user'):
    n = next(_seq)
    u = User(username=f'u{n}', role_vehicle=role, department=f'dept{n}')
    session.add(u)
    session.flush()
    return u


def _vehicle(session, fuel_rate=10.0):
    n = next(_seq)
    v = Vehicle(brand='B', model='M', license_plate=f'PT-{n}', capacity=4,
               fuel_rate=fuel_rate, status='active')
    session.add(v)
    session.flush()
    return v


def _driver(session):
    n = next(_seq)
    d = Driver(name=f'driver{n}', phone=f'080000{n:04d}', is_active=True)
    session.add(d)
    session.flush()
    return d


def _booking(session, user_id, vehicle, *, expense_type='central',
             trip_department='กองทดสอบ', need_driver=False, driver_id=None,
             is_ad_hoc=False, days=2):
    base = datetime.now().replace(second=0, microsecond=0) + timedelta(days=days)
    b = VehicleBooking(
        user_id=user_id, status='approved', expense_type=expense_type,
        trip_department=trip_department, assigned_vehicle_id=vehicle.id if vehicle else None,
        need_driver=need_driver, driver_id=driver_id, is_ad_hoc=is_ad_hoc,
        start_datetime=base, end_datetime=base + timedelta(hours=8),
        destination='ทดสอบ', purpose='ทดสอบ', passenger_count=1,
    )
    session.add(b)
    session.flush()
    return b


def _mileage(session, booking, *, odo_start=1000, odo_end=1100,
             actual_end=None, fuel_cost=None, last_log_id=None):
    m = VehicleMileage(
        booking_id=booking.id,
        odometer_start=odo_start, odometer_end=odo_end,
        actual_start=booking.start_datetime,
        actual_end=actual_end or booking.start_datetime + timedelta(hours=8),
        fuel_cost=fuel_cost,
        last_budget_log_id=last_log_id,
    )
    session.add(m)
    session.commit()
    return m


def _active_budget(session, *, expense_type='central', dept_name=None, is_active=True):
    """สร้าง BudgetType+VehicleDepartment+VehicleBudget active ครอบวันนี้±30วัน"""
    n = next(_seq)
    bt = BudgetType.query.filter_by(name=expense_type).first()
    if not bt:
        bt = BudgetType(name=expense_type)
        session.add(bt)
        session.flush()
    dept = VehicleDepartment(name=dept_name or f'dept-ms-{n}', budget_type_id=bt.id)
    session.add(dept)
    session.flush()
    today = datetime.now().date()
    bgt = VehicleBudget(
        budget_type_id=bt.id, department_id=dept.id,
        year=today.year, month=today.month,
        budget_amount=50000, used_amount=0, is_active=is_active,
        start_date=today - timedelta(days=1), end_date=today + timedelta(days=30),
    )
    session.add(bgt)
    session.commit()
    return bgt


# ──────────────────────────────────────────────────────────────
# 1. close_trip() — mock-based (ย้ายจาก tests/test_deduct_budget_for_trip.py เดิม)
# ──────────────────────────────────────────────────────────────
def test_none_mileage_is_noop(session):
    """mileage=None → คืนทันที {'trip_cost': 0, 'flash_messages': []}, ไม่เรียก DB/notify"""
    u = _user(session)
    v = _vehicle(session)
    bk = _booking(session, u.id, v)
    with patch(f'{MOD}.budget_svc') as mock_svc, \
         patch(f'{MOD}._n_budget') as mock_nb:
        result = ms.close_trip(bk, None, source='mileage_log')
        mock_svc.deduct_for_mileage.assert_not_called()
        mock_nb.assert_not_called()
    assert result == {'trip_cost': 0, 'flash_messages': []}


def test_central_with_budget_deducts(session):
    """central + budget found + trip_cost>0 → deduct เรียกครั้งเดียว, _n_budget เรียก"""
    u = _user(session)
    v = _vehicle(session)
    bk = _booking(session, u.id, v, expense_type='central')
    m = _mileage(session, bk)
    mock_budget = MagicMock()

    with patch(f'{MOD}.calc_fuel_cost', return_value=350.0), \
         patch(f'{MOD}.get_fuel_price', return_value=35.0), \
         patch(f'{MOD}._lookup_budget_for_booking', return_value=(mock_budget, 'central')), \
         patch(f'{MOD}.budget_svc') as mock_svc, \
         patch(f'{MOD}._n_budget') as mock_nb:
        result = ms.close_trip(bk, m, source='mileage_log')
        mock_svc.deduct_for_mileage.assert_called_once()
        mock_nb.assert_called_once_with(bk, 350.0, 'central')
    assert result['trip_cost'] == 350.0
    assert result['flash_messages'] == []


def test_source_appears_in_deduct_note(session):
    """note kwarg ที่ส่งเข้า deduct_for_mileage ต้องมี source string"""
    u = _user(session)
    v = _vehicle(session)
    mock_budget = MagicMock()

    for source in ('mileage_log', 'driver_mileage'):
        bk = _booking(session, u.id, v)
        m = _mileage(session, bk)
        with patch(f'{MOD}.calc_fuel_cost', return_value=100.0), \
             patch(f'{MOD}.get_fuel_price', return_value=35.0), \
             patch(f'{MOD}._lookup_budget_for_booking', return_value=(mock_budget, 'central')), \
             patch(f'{MOD}.budget_svc') as mock_svc, \
             patch(f'{MOD}._n_budget'):
            ms.close_trip(bk, m, source=source)
            call_kwargs = mock_svc.deduct_for_mileage.call_args[1]
            assert source in call_kwargs['note'], f"source '{source}' not in note"


def test_central_no_budget_flashes_warning(session):
    """ไม่พบ budget → flash_messages มีคำเตือน; _n_budget ยังเรียก (record attempt)"""
    u = _user(session)
    v = _vehicle(session)
    bk = _booking(session, u.id, v)
    m = _mileage(session, bk)

    with patch(f'{MOD}.calc_fuel_cost', return_value=350.0), \
         patch(f'{MOD}.get_fuel_price', return_value=35.0), \
         patch(f'{MOD}._lookup_budget_for_booking', return_value=(None, 'ไม่มีงบ')), \
         patch(f'{MOD}.budget_svc') as mock_svc, \
         patch(f'{MOD}._n_budget') as mock_nb:
        result = ms.close_trip(bk, m, source='mileage_log')
        mock_svc.deduct_for_mileage.assert_not_called()
        mock_nb.assert_called_once()
    assert any('ไม่ได้หักงบ' in msg for msg, cat in result['flash_messages'])


def test_central_zero_cost_flashes_skip(session):
    """trip_cost=0 → skip branch; flash_messages มีคำเตือน zero-cost ไม่ deduct/notify"""
    u = _user(session)
    v = _vehicle(session)
    bk = _booking(session, u.id, v)
    m = _mileage(session, bk)

    with patch(f'{MOD}.calc_fuel_cost', return_value=0.0), \
         patch(f'{MOD}.get_fuel_price', return_value=35.0), \
         patch(f'{MOD}.budget_svc') as mock_svc, \
         patch(f'{MOD}._n_budget') as mock_nb:
        result = ms.close_trip(bk, m, source='mileage_log')
        mock_svc.deduct_for_mileage.assert_not_called()
        mock_nb.assert_not_called()
    assert any('trip_cost = 0' in msg for msg, cat in result['flash_messages'])


def test_personal_triggers_payment_notification(session):
    """personal + trip_cost>0 → _n_payment_required เรียก, ไม่ deduct"""
    u = _user(session)
    v = _vehicle(session)
    bk = _booking(session, u.id, v, expense_type='personal', trip_department=None)
    m = _mileage(session, bk)

    with patch(f'{MOD}.calc_fuel_cost', return_value=200.0), \
         patch(f'{MOD}.get_fuel_price', return_value=35.0), \
         patch(f'{MOD}.budget_svc') as mock_svc, \
         patch(f'{MOD}._n_payment_required') as mock_np:
        ms.close_trip(bk, m, source='driver_mileage')
        mock_svc.deduct_for_mileage.assert_not_called()
        mock_np.assert_called_once_with(bk, m, 200.0)


# ──────────────────────────────────────────────────────────────
# 2. close_trip() idempotency — integration (ไม่ mock budget_svc) พิสูจน์
#    budget_deducted_at guard จริงจาก budget_service.py
# ──────────────────────────────────────────────────────────────
def test_close_trip_idempotent_second_call_no_double_deduct(session):
    """เรียก close_trip ซ้ำ 2 ครั้งกับ mileage เดิม → หักงบแค่ครั้งเดียว (budget_deducted_at guard)"""
    u = _user(session)
    v = _vehicle(session, fuel_rate=10.0)
    bgt = _active_budget(session, expense_type='central', dept_name='กองทดสอบ')
    bk = _booking(session, u.id, v, expense_type='central', trip_department='กองทดสอบ')
    bk.central_category = 'กองทดสอบ'
    session.commit()
    m = _mileage(session, bk, odo_start=1000, odo_end=1100)

    result1 = ms.close_trip(bk, m, source='mileage_log')
    assert result1['trip_cost'] > 0
    used_after_first = float(bgt.used_amount)
    assert used_after_first > 0
    assert m.budget_deducted_at is not None

    result2 = ms.close_trip(bk, m, source='mileage_log')
    assert float(bgt.used_amount) == used_after_first  # ไม่หักซ้ำ


# ──────────────────────────────────────────────────────────────
# 3. auto_generate_ot() — idempotent skip
# ──────────────────────────────────────────────────────────────
def test_auto_generate_ot_idempotent_skip(session):
    """DriverOT มีอยู่แล้วสำหรับ booking นี้ → skip ทันที ไม่สร้างซ้ำ"""
    u = _user(session)
    v = _vehicle(session)
    d = _driver(session)
    bk = _booking(session, u.id, v, need_driver=True, driver_id=d.id)
    m = _mileage(session, bk)
    existing = DriverOT(booking_id=bk.id, driver_id=d.id, ot_number='OT-TEST-0001',
                        date=datetime.now().date(), total_hours=1, total_amount=100,
                        status='unpaid', created_by_id=u.id)
    session.add(existing)
    session.commit()

    result = ms.auto_generate_ot(bk, m, actor_id=u.id)
    assert result is None


def test_auto_generate_ot_no_driver_needed_is_noop(session):
    """need_driver=False → คืน None ทันที ไม่พยายามคำนวณ OT"""
    u = _user(session)
    v = _vehicle(session)
    bk = _booking(session, u.id, v, need_driver=False)
    m = _mileage(session, bk)
    result = ms.auto_generate_ot(bk, m, actor_id=u.id)
    assert result is None


def _ot_rate_config(session):
    """1 แถวครอบทั้งวัน (day_of_week=None) — ให้ทริปช่วงไหนก็ตกในแบนด์นี้เสมอ"""
    c = OTRateConfig(label='ทั้งวัน', start_time='00:00', end_time='24:00',
                     rate=100, is_active=True, sort_order=1)
    session.add(c)
    session.commit()
    return c


# ──────────────────────────────────────────────────────────────
# 3b. auto_generate_ot() — Phase 4 (2026-07-19): notify=True/False
# ──────────────────────────────────────────────────────────────
def test_auto_generate_ot_default_notifies_admin(session):
    """notify=True (default) — สร้าง OT สำเร็จแล้วต้องมี notify_ot_created ไปหา admin
    (Phase 4 — ย้าย _n_ot_created เข้ามาจาก vehicle_mileage.py/vehicle_driver.py caller เดิม)

    pin start_datetime = 08:00 (ไม่ใช้ค่า default จาก datetime.now() ตรงๆ): auto_generate_ot()
    เทียบ trip_s/trip_e จากแค่ .hour/.minute ไม่สนวันที่ (logic เดิม Phase 3 ไม่แตะ) — ถ้ารัน
    test หลัง 16:00 actual_end (+8h) จะข้ามเที่ยงคืนแล้ว trip_e<=trip_s ทำให้ ot=None เสมอ
    (checker เจอ flaky bug นี้ระหว่างตรวจ Phase 4)"""
    admin = _user(session, role='admin')
    v = _vehicle(session)
    d = _driver(session)
    _ot_rate_config(session)
    bk = _booking(session, admin.id, v, need_driver=True, driver_id=d.id)
    bk.start_datetime = bk.start_datetime.replace(hour=8, minute=0, second=0, microsecond=0)
    session.commit()
    m = _mileage(session, bk)

    ot = ms.auto_generate_ot(bk, m, actor_id=admin.id)
    assert ot is not None
    n = Notification.query.filter_by(booking_id=bk.id, user_id=admin.id).first()
    assert n is not None
    assert ot.ot_number in n.message


def test_auto_generate_ot_notify_false_suppresses_notification(session):
    """notify=False (auto_close_stale_trips() ส่งแบบนี้ — เดิมไม่เคยแจ้งเตือน OT ของทริป
    auto-close มาก่อน) — สร้าง OT สำเร็จแต่ไม่มี Notification เกิดขึ้นเลย
    pin start_datetime = 08:00 — เหตุผลเดียวกับ test ก่อนหน้า (กัน flaky ข้ามเที่ยงคืน)"""
    admin = _user(session, role='admin')
    v = _vehicle(session)
    d = _driver(session)
    _ot_rate_config(session)
    bk = _booking(session, admin.id, v, need_driver=True, driver_id=d.id)
    bk.start_datetime = bk.start_datetime.replace(hour=8, minute=0, second=0, microsecond=0)
    session.commit()
    m = _mileage(session, bk)

    before = Notification.query.count()
    ot = ms.auto_generate_ot(bk, m, actor_id=admin.id, notify=False)
    assert ot is not None
    assert Notification.query.count() == before


# ──────────────────────────────────────────────────────────────
# 4. override_fuel_cost() — สร้างครั้งแรกไม่ได้ / rededuct เมื่อเคยหักแล้ว
#    (behavior เดิมจาก views/vehicle/vehicle_cost.py::override_fuel())
# ──────────────────────────────────────────────────────────────
def test_override_fuel_cost_first_time_no_deduct(session):
    """mileage ยังไม่เคยหักงบ (last_budget_log_id=None) → ไม่เรียก rededuct เลย
    (quirk เดิม: override_fuel สร้างการหักงบครั้งแรกไม่ได้ ทำได้แค่แก้ไข) แต่ field
    fuel_cost ยังถูกเซ็ตเสมอ"""
    u = _user(session)
    v = _vehicle(session)
    bk = _booking(session, u.id, v, expense_type='central')
    m = _mileage(session, bk, last_log_id=None)

    with patch(f'{MOD}.budget_svc') as mock_svc:
        ms.override_fuel_cost(m, 500.0, actor_username='tester')
        mock_svc.rededuct_for_mileage.assert_not_called()
    assert float(m.fuel_cost) == 500.0


def test_override_fuel_cost_rededucts_when_previously_deducted(session):
    """mileage เคยหักงบแล้วจริง (ผ่าน close_trip ก่อน) → override เรียก rededuct_for_mileage
    พร้อม note ที่มี actor_username + snap fuel_price = ราคาจริง (BUG-2 fix, Phase 3.5,
    2026-07-19 — เดิม hardcode None เสมอ ตอนนี้ใช้ get_fuel_price(target_date) จริง)"""
    u = _user(session)
    v = _vehicle(session, fuel_rate=10.0)
    _active_budget(session, expense_type='central', dept_name='กองทดสอบ')
    bk = _booking(session, u.id, v, expense_type='central', trip_department='กองทดสอบ')
    bk.central_category = 'กองทดสอบ'
    session.commit()
    m = _mileage(session, bk, odo_start=1000, odo_end=1100)

    ms.close_trip(bk, m, source='mileage_log')  # setup: หักงบจริงครั้งแรก
    assert m.last_budget_log_id is not None

    with patch(f'{MOD}.budget_svc') as mock_svc:
        ms.override_fuel_cost(m, 999.0, actor_username='tester')
        mock_svc.rededuct_for_mileage.assert_called_once()
        call_kwargs = mock_svc.rededuct_for_mileage.call_args[1]
        assert 'tester' in call_kwargs['note']
        assert call_kwargs['snap']['fuel_price'] == 40.0  # SystemConfig fallback (ไม่ mock)
    assert float(m.fuel_cost) == 999.0


# ──────────────────────────────────────────────────────────────
# 5. get_fuel_price() — DEBT-2 ย้ายมาจาก domain/vehicle/fuel.py
# ──────────────────────────────────────────────────────────────
def test_get_fuel_price_fallback_to_system_config(session):
    """ไม่มี FuelPrice record ของวันนั้น → fallback SystemConfig['fuel_price'] default 40"""
    price = ms.get_fuel_price(datetime.now().date())
    assert price == 40.0


# ──────────────────────────────────────────────────────────────
# 6. get_distance_cap_km() — REQ-3 (Phase 3.5, 2026-07-19)
# ──────────────────────────────────────────────────────────────
def test_get_distance_cap_km_fallback_default(session):
    """ไม่มี SystemConfig ตั้งไว้ → fallback 1000 (ตกลงกับเจ้าของโปรเจกต์)"""
    cap = ms.get_distance_cap_km()
    assert cap == 1000.0
