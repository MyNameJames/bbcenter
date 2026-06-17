"""
test_deduct_budget_for_trip.py — GUARD tests (test-first) for the merged helper.

Tests FAIL until deduct_budget_for_trip is added to vehicle_common.py.
After implementation, all tests should PASS.

Covers:
  1  m2=None → no-op
  2  central + budget found + cost>0 → deduct_for_mileage called, _n_budget called
  3  source arg → appears in note kwarg of deduct_for_mileage
  4  central + no budget → flash warning, _n_budget still called (notify attempt)
  5  central + trip_cost=0 → skip branch, flash zero-cost warning
  6  personal + cost>0 → _n_payment_required called, no deduct
"""
from datetime import datetime
from unittest.mock import MagicMock, patch

from models import db, VehicleBooking, VehicleMileage, Vehicle

MOD = 'views.vehicle.vehicle_common'


# ─── Factories ──────────────────────────────────────────────────

def _vehicle(session):
    v = Vehicle(brand='B', model='M', license_plate='TP-001', capacity=4, fuel_rate=10.0)
    session.add(v)
    session.flush()
    return v


def _booking(session, vehicle, expense_type='central', trip_department='กองทดสอบ'):
    bk = VehicleBooking(
        user_id=1,
        start_datetime=datetime(2026, 6, 10, 8, 0),
        end_datetime=datetime(2026, 6, 10, 17, 0),
        destination='t', purpose='t', passenger_count=1,
        expense_type=expense_type,
        trip_department=trip_department,
        assigned_vehicle_id=vehicle.id,
    )
    session.add(bk)
    session.flush()
    return bk


def _mileage(session, booking):
    m = VehicleMileage(
        booking_id=booking.id,
        odometer_start=1000, odometer_end=1100,
        actual_end=datetime(2026, 6, 10, 17, 0),
    )
    session.add(m)
    session.commit()
    return m


# ─── Tests ──────────────────────────────────────────────────────

def test_none_m2_is_noop(app):
    """m2=None → helper returns immediately, no DB or notify calls."""
    from views.vehicle.vehicle_common import deduct_budget_for_trip

    v = _vehicle(db.session)
    bk = _booking(db.session, v)
    with patch(f'{MOD}.budget_svc') as mock_svc, \
         patch(f'{MOD}._n_budget') as mock_nb:
        deduct_budget_for_trip(bk, None, source='mileage_log')
        mock_svc.deduct_for_mileage.assert_not_called()
        mock_nb.assert_not_called()


def test_central_with_budget_deducts(app):
    """expense_type=central + budget found + trip_cost>0 → deduct called, _n_budget called."""
    from views.vehicle.vehicle_common import deduct_budget_for_trip

    v = _vehicle(db.session)
    bk = _booking(db.session, v, expense_type='central')
    m = _mileage(db.session, bk)
    mock_budget = MagicMock()

    with patch(f'{MOD}.calc_fuel_cost', return_value=350.0), \
         patch(f'{MOD}.get_fuel_price', return_value=35.0), \
         patch(f'{MOD}._lookup_budget_for_booking', return_value=(mock_budget, 'central')), \
         patch(f'{MOD}.budget_svc') as mock_svc, \
         patch(f'{MOD}._n_budget') as mock_nb:
        deduct_budget_for_trip(bk, m, source='mileage_log')
        mock_svc.deduct_for_mileage.assert_called_once()
        mock_nb.assert_called_once_with(bk, 350.0, 'central')


def test_source_appears_in_deduct_note(app):
    """note kwarg passed to deduct_for_mileage must contain the source string."""
    from views.vehicle.vehicle_common import deduct_budget_for_trip

    v = _vehicle(db.session)
    mock_budget = MagicMock()

    for source in ('mileage_log', 'driver_mileage'):
        bk = _booking(db.session, v)
        m = _mileage(db.session, bk)
        with patch(f'{MOD}.calc_fuel_cost', return_value=100.0), \
             patch(f'{MOD}.get_fuel_price', return_value=35.0), \
             patch(f'{MOD}._lookup_budget_for_booking', return_value=(mock_budget, 'central')), \
             patch(f'{MOD}.budget_svc') as mock_svc, \
             patch(f'{MOD}._n_budget'):
            deduct_budget_for_trip(bk, m, source=source)
            call_kwargs = mock_svc.deduct_for_mileage.call_args[1]
            assert source in call_kwargs['note'], f"source '{source}' not in note"


def test_central_no_budget_flashes_warning(app):
    """No budget found → flash warning; _n_budget still called (record attempt)."""
    from views.vehicle.vehicle_common import deduct_budget_for_trip
    from flask import get_flashed_messages

    v = _vehicle(db.session)
    bk = _booking(db.session, v)
    m = _mileage(db.session, bk)

    with patch(f'{MOD}.calc_fuel_cost', return_value=350.0), \
         patch(f'{MOD}.get_fuel_price', return_value=35.0), \
         patch(f'{MOD}._lookup_budget_for_booking', return_value=(None, 'ไม่มีงบ')), \
         patch(f'{MOD}.budget_svc') as mock_svc, \
         patch(f'{MOD}._n_budget') as mock_nb:
        deduct_budget_for_trip(bk, m, source='mileage_log')
        mock_svc.deduct_for_mileage.assert_not_called()
        mock_nb.assert_called_once()
    msgs = get_flashed_messages()
    assert any('ไม่ได้หักงบ' in msg for msg in msgs)


def test_central_zero_cost_flashes_skip(app):
    """trip_cost=0 → skip branch; flash zero-cost warning, no deduct or notify."""
    from views.vehicle.vehicle_common import deduct_budget_for_trip
    from flask import get_flashed_messages

    v = _vehicle(db.session)
    bk = _booking(db.session, v)
    m = _mileage(db.session, bk)

    with patch(f'{MOD}.calc_fuel_cost', return_value=0.0), \
         patch(f'{MOD}.get_fuel_price', return_value=35.0), \
         patch(f'{MOD}.budget_svc') as mock_svc, \
         patch(f'{MOD}._n_budget') as mock_nb:
        deduct_budget_for_trip(bk, m, source='mileage_log')
        mock_svc.deduct_for_mileage.assert_not_called()
        mock_nb.assert_not_called()
    msgs = get_flashed_messages()
    assert any('trip_cost = 0' in msg for msg in msgs)


def test_personal_triggers_payment_notification(app):
    """expense_type=personal + trip_cost>0 → _n_payment_required called, no deduct."""
    from views.vehicle.vehicle_common import deduct_budget_for_trip

    v = _vehicle(db.session)
    bk = _booking(db.session, v, expense_type='personal', trip_department='')
    m = _mileage(db.session, bk)

    with patch(f'{MOD}.calc_fuel_cost', return_value=200.0), \
         patch(f'{MOD}.get_fuel_price', return_value=35.0), \
         patch(f'{MOD}.budget_svc') as mock_svc, \
         patch(f'{MOD}._n_payment_required') as mock_np:
        deduct_budget_for_trip(bk, m, source='driver_mileage')
        mock_svc.deduct_for_mileage.assert_not_called()
        mock_np.assert_called_once_with(bk, m, 200.0)
