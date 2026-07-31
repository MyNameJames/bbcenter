"""
test_mileage_filters.py — _query_mileage_bookings() (หน้า /vehicle/mileage)

โฟกัส filter 2 ตัวที่เพิ่ม 2026-07-28: วันในสัปดาห์ (multi-select) + "มี OT"
ทั้งคู่กรองที่ SQL ไม่ใช่ post-process → ต้องยิงกับ DB จริง (in-memory) ถึงจะเชื่อได้
โดยเฉพาะ strftime('%w') ที่เป็น syntax ของ SQLite เอง
"""
from datetime import datetime

import pytest

from models import DriverOT, VehicleBooking, db
from views.vehicle.vehicle_mileage import WEEKDAY_CHIPS, _query_mileage_bookings

CUTOFF = datetime(2026, 12, 31)

# 2026-06-08 = จันทร์ (ยืนยันกับ strftime แล้ว) → +1 วัน = อังคาร, +6 = อาทิตย์
MONDAY  = datetime(2026, 6,  8, 9, 0)
TUESDAY = datetime(2026, 6,  9, 9, 0)
SUNDAY  = datetime(2026, 6, 14, 9, 0)


def _filters(**over):
    """dict เปล่าตามรูปแบบ _parse_mileage_filters() — override เฉพาะที่เทสต์สนใจ"""
    base = {
        'date_start': '', 'date_end': '', 'vehicle_ids': [], 'driver_ids': [],
        'budget_types': [], 'budget_subs': [], 'weekdays': [], 'has_ot': False,
    }
    base.update(over)
    return base


@pytest.fixture
def make_booking(app):
    def _make(start_datetime, with_ot=False, ot_deleted=False, **cols):
        bk = VehicleBooking(
            user_id=1, status='approved',
            start_datetime=start_datetime,
            end_datetime=start_datetime.replace(hour=17),
            destination='ปลายทางทดสอบ', purpose='ทดสอบ', passenger_count=1,
            **cols,
        )
        db.session.add(bk)
        db.session.flush()
        if with_ot:
            db.session.add(DriverOT(
                booking_id=bk.id, driver_id=1, date=start_datetime.date(),
                ot_number=f'OT-TEST-{bk.id}', total_hours=2, total_amount=40,
                is_deleted=ot_deleted,
            ))
        db.session.commit()
        return bk
    return _make


# ── filter วันในสัปดาห์ ──────────────────────────────────────
def test_weekday_filter_keeps_only_that_day(make_booking):
    mon = make_booking(MONDAY)
    make_booking(TUESDAY)
    assert [b.id for b in _query_mileage_bookings(CUTOFF, _filters(weekdays=['1']))] == [mon.id]


def test_weekday_filter_is_multi_select(make_booking):
    mon = make_booking(MONDAY)
    tue = make_booking(TUESDAY)
    make_booking(SUNDAY)
    got = {b.id for b in _query_mileage_bookings(CUTOFF, _filters(weekdays=['1', '2']))}
    assert got == {mon.id, tue.id}


def test_sunday_is_zero_not_seven(make_booking):
    """SQLite strftime('%w') นับ 0=อาทิตย์ (ไม่ใช่ Python weekday() ที่ 6=อาทิตย์)"""
    sun = make_booking(SUNDAY)
    make_booking(MONDAY)
    assert [b.id for b in _query_mileage_bookings(CUTOFF, _filters(weekdays=['0']))] == [sun.id]


def test_no_weekday_selected_returns_all(make_booking):
    make_booking(MONDAY)
    make_booking(TUESDAY)
    assert len(_query_mileage_bookings(CUTOFF, _filters())) == 2


def test_weekday_chip_values_cover_all_seven_days():
    assert sorted(v for v, _ in WEEKDAY_CHIPS) == ['0', '1', '2', '3', '4', '5', '6']


# ── filter "มี OT" ───────────────────────────────────────────
def test_has_ot_filter_keeps_only_bookings_with_ot(make_booking):
    with_ot = make_booking(MONDAY, with_ot=True)
    make_booking(TUESDAY)
    assert [b.id for b in _query_mileage_bookings(CUTOFF, _filters(has_ot=True))] == [with_ot.id]


def test_has_ot_ignores_soft_deleted_ot(make_booking):
    """OT ที่ถูกย้ายไปแท็บ 'ลบ' ไม่นับว่ามี OT"""
    make_booking(MONDAY, with_ot=True, ot_deleted=True)
    assert _query_mileage_bookings(CUTOFF, _filters(has_ot=True)) == []


def test_has_ot_off_returns_all(make_booking):
    make_booking(MONDAY, with_ot=True)
    make_booking(TUESDAY)
    assert len(_query_mileage_bookings(CUTOFF, _filters(has_ot=False))) == 2


# ── chip filter multi-select (radio → checkbox, 2026-07-28) ──
def test_budget_types_multi_select(make_booking):
    central = make_booking(MONDAY, expense_type='central')
    dept    = make_booking(MONDAY, expense_type='department')
    make_booking(MONDAY, expense_type='personal')
    got = {b.id for b in _query_mileage_bookings(
        CUTOFF, _filters(budget_types=['central', 'department']))}
    assert got == {central.id, dept.id}


def test_budget_subs_or_across_two_columns(make_booking):
    """central → central_category · department → trip_department
    ติ๊กงบทั้งสองประเภทพร้อมกัน = หมวดที่ติ๊กต้องแมตช์ column ไหนก็ได้ (OR ไม่ใช่ if/elif)"""
    a = make_booking(MONDAY, expense_type='central',    central_category='ซ่อมบำรุง')
    b = make_booking(MONDAY, expense_type='department', trip_department='กองคลัง')
    make_booking(MONDAY, expense_type='central', central_category='อบรม')
    got = {x.id for x in _query_mileage_bookings(CUTOFF, _filters(
        budget_types=['central', 'department'], budget_subs=['ซ่อมบำรุง', 'กองคลัง']))}
    assert got == {a.id, b.id}


def test_budget_subs_without_type_checks_both_columns(make_booking):
    """ไม่ได้ติ๊กประเภทงบ = ไม่รู้ว่าหมวดหมายถึง column ไหน → เทียบทั้งสอง"""
    a = make_booking(MONDAY, central_category='ซ่อมบำรุง')
    make_booking(MONDAY, central_category='อบรม')
    got = _query_mileage_bookings(CUTOFF, _filters(budget_subs=['ซ่อมบำรุง']))
    assert [x.id for x in got] == [a.id]


def test_no_budget_filter_returns_all(make_booking):
    make_booking(MONDAY, expense_type='central')
    make_booking(MONDAY, expense_type='personal')
    assert len(_query_mileage_bookings(CUTOFF, _filters())) == 2


# ── ใช้ร่วมกัน ───────────────────────────────────────────────
def test_weekday_and_has_ot_combine_as_and(make_booking):
    mon_ot = make_booking(MONDAY,  with_ot=True)
    make_booking(MONDAY)                      # จันทร์ แต่ไม่มี OT
    make_booking(TUESDAY, with_ot=True)       # มี OT แต่ไม่ใช่จันทร์
    got = _query_mileage_bookings(CUTOFF, _filters(weekdays=['1'], has_ot=True))
    assert [b.id for b in got] == [mon_ot.id]
