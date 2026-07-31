"""
test_booking_service.py — services/vehicle/booking_service.py (Phase 2, 2026-07-19)

คลุม: approve (central/department/personal + budget guard + conflict guard),
reject, approver approve/reject, cancel (guards + role + un-merge), revert
(with/without deduct), assign_resources, ungroup — ตรงตาม Acceptance ของ Phase 2
"""
import itertools
from datetime import datetime, timedelta

import pytest
from flask import Flask
from sqlalchemy.pool import StaticPool

from models import (
    db, BudgetType, VehicleDepartment, VehicleBudget,
    VehicleBooking, VehicleMileage, User, Vehicle, Driver, Notification,
)
import services.vehicle.booking_service as bs

_seq = itertools.count(1)


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
        SECRET_KEY='test-booking-svc',
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


def _booking(session, user_id, *, status='pending', expense_type=None,
             dept_id=None, need_driver=False, driver_id=None,
             assigned_vehicle_id=None, trip_group=None, days=2):
    base = datetime.now().replace(second=0, microsecond=0) + timedelta(days=days)
    b = VehicleBooking(
        user_id=user_id, status=status, expense_type=expense_type,
        trip_department_id=dept_id, need_driver=need_driver,
        driver_id=driver_id, assigned_vehicle_id=assigned_vehicle_id,
        trip_group=trip_group,
        start_datetime=base, end_datetime=base + timedelta(hours=8),
        destination='ทดสอบ', purpose='ทดสอบ', passenger_count=1,
    )
    session.add(b)
    session.flush()
    return b


def _active_budget(session, *, expense_type='central', dept_name=None, is_active=True):
    """สร้าง BudgetType+VehicleDepartment+VehicleBudget active ครอบวันนี้-30วัน
    dept_name: ต้องตรงกับ booking.central_category สำหรับ expense_type='central'
    (_lookup_budget_for_booking หา dept ด้วยชื่อ ไม่ใช่ id สำหรับ central — ต่างจาก
    department ที่ใช้ trip_department_id ตรงๆ)"""
    n = next(_seq)
    bt = BudgetType.query.filter_by(name=expense_type).first()
    if not bt:
        bt = BudgetType(name=expense_type)
        session.add(bt)
        session.flush()
    dept = VehicleDepartment(name=dept_name or f'dept-bs-{n}', budget_type_id=bt.id)
    session.add(dept)
    session.flush()
    today = datetime.now().date()
    bgt = VehicleBudget(
        budget_type_id=bt.id, department_id=dept.id,
        year=today.year, month=today.month,
        budget_amount=50000, used_amount=0, is_active=is_active,
        start_date=today, end_date=today + timedelta(days=30),
    )
    session.add(bgt)
    session.commit()
    return bgt


def _mileage(session, booking_id, *, deducted=False, started=None):
    """started: True/False บังคับตรงๆ (odometer_start), None = default ตาม deducted
    (deducted=True → started=True โดยปริยาย เพราะหักงบได้ต้องออกรถก่อนเสมอในทางปฏิบัติ)"""
    if started is None:
        started = deducted
    m = VehicleMileage(booking_id=booking_id,
                       odometer_start=1000 if started else None,
                       budget_deducted_at=datetime.now() if deducted else None)
    session.add(m)
    session.commit()
    return m


def _vehicle(session, status='active'):
    n = next(_seq)
    v = Vehicle(brand='B', model='M', license_plate=f'PT-{n}', capacity=4,
               fuel_rate=10.0, status=status)
    session.add(v)
    session.flush()
    return v


def _driver(session):
    n = next(_seq)
    d = Driver(name=f'driver{n}', phone=f'080000{n:04d}', is_active=True)
    session.add(d)
    session.flush()
    return d


# ──────────────────────────────────────────────────────────────
# 1. Approve จาก pending (admin) — central/department/personal + budget + conflict
# ──────────────────────────────────────────────────────────────
def test_approve_central_with_budget_ok(session):
    admin = _user(session, role='admin')
    bgt = _active_budget(session, expense_type='central', dept_name='medical')
    bk = _booking(session, admin.id, status='pending', expense_type='central',
                  dept_id=bgt.department_id)
    bk.central_category = 'medical'
    session.commit()

    ok, msg = bs.approve_from_pending(bk)
    assert ok is True
    assert bk.status == 'approved'


def test_approve_department_ok_sets_waiting_approver(session):
    admin = _user(session, role='admin')
    bgt = _active_budget(session, expense_type='department')
    bk = _booking(session, admin.id, status='pending', expense_type='department',
                  dept_id=bgt.department_id)

    ok, msg = bs.approve_from_pending(bk)
    assert ok is True
    assert bk.status == 'waiting_approver'


def test_approve_personal_no_budget_needed_ok(session):
    """เดิม approve_booking() บล็อก personal เสมอ (bug — _lookup_budget_for_booking
    คืน (None,None) แล้วถูกตีความว่า 'ไม่มีงบ') guard_budget ใหม่เช็ค expense_type
    ก่อนเลย ไม่บล็อก personal อีกต่อไป"""
    admin = _user(session, role='admin')
    bk = _booking(session, admin.id, status='pending', expense_type='personal')

    ok, msg = bs.approve_from_pending(bk)
    assert ok is True
    assert bk.status == 'approved'


def test_approve_central_no_active_budget_blocked(session):
    admin = _user(session, role='admin')
    bk = _booking(session, admin.id, status='pending', expense_type='central')
    bk.central_category = 'medical'
    session.commit()

    ok, msg = bs.approve_from_pending(bk)
    assert ok is False
    assert bk.status == 'pending'


def test_approve_conflict_vehicle_blocked(session):
    """เดิม approve_booking() ไม่เช็ค conflict เลย — Phase 2 รวม conflict guard เข้ามา"""
    admin = _user(session, role='admin')
    veh = _vehicle(session)
    base = datetime.now() + timedelta(days=2)
    other = _booking(session, admin.id, status='approved', expense_type='personal',
                     assigned_vehicle_id=veh.id)
    other.start_datetime = base
    other.end_datetime = base + timedelta(hours=8)
    session.commit()

    bk = _booking(session, admin.id, status='pending', expense_type='personal',
                  assigned_vehicle_id=veh.id)
    bk.start_datetime = base + timedelta(hours=2)
    bk.end_datetime = base + timedelta(hours=10)
    session.commit()

    ok, msg = bs.approve_from_pending(bk)
    assert ok is False
    assert 'ทับ' in msg


def test_approve_skip_conflict_check_for_join_trip(session):
    """join trip (admin_assign ส่ง skip_conflict_check=True) ข้าม conflict check
    เพราะสืบทอดจากทริปหลักที่ตรวจสอบแล้ว — ตาม behavior เดิมของ admin_assign"""
    admin = _user(session, role='admin')
    veh = _vehicle(session)
    base = datetime.now() + timedelta(days=2)
    other = _booking(session, admin.id, status='approved', expense_type='personal',
                     assigned_vehicle_id=veh.id)
    other.start_datetime = base
    other.end_datetime = base + timedelta(hours=8)
    session.commit()

    bk = _booking(session, admin.id, status='pending', expense_type='personal',
                  assigned_vehicle_id=veh.id)
    bk.start_datetime = base
    bk.end_datetime = base + timedelta(hours=8)
    session.commit()

    ok, msg = bs.approve_from_pending(bk, skip_conflict_check=True)
    assert ok is True


# ──────────────────────────────────────────────────────────────
# 2. Reject จาก pending (admin)
# ──────────────────────────────────────────────────────────────
def test_reject_from_pending_ok(session):
    admin = _user(session, role='admin')
    bk = _booking(session, admin.id, status='pending')

    ok, msg = bs.reject_from_pending(bk, reason='ไม่เหมาะสม')
    assert ok is True
    assert bk.status == 'rejected'
    assert bk.reject_reason == 'ไม่เหมาะสม'


# ──────────────────────────────────────────────────────────────
# 3. Approver actions จาก waiting_approver
# ──────────────────────────────────────────────────────────────
def test_approver_approve_ok_sets_updated_by(session):
    owner = _user(session)
    bgt = _active_budget(session, expense_type='department')
    bk = _booking(session, owner.id, status='waiting_approver', expense_type='department',
                  dept_id=bgt.department_id)

    ok, msg = bs.approver_approve(bk, actor_id=999)
    assert ok is True
    assert bk.status == 'approved'
    assert bk.updated_by == 999


def test_approver_approve_no_budget_blocked(session):
    owner = _user(session)
    bk = _booking(session, owner.id, status='waiting_approver', expense_type='department')

    ok, msg = bs.approver_approve(bk, actor_id=999)
    assert ok is False
    assert bk.status == 'waiting_approver'


def test_approver_reject_ok_sets_updated_by(session):
    owner = _user(session)
    bk = _booking(session, owner.id, status='waiting_approver', expense_type='department')

    ok, msg = bs.approver_reject(bk, actor_id=999, reason='งบไม่พอ')
    assert ok is True
    assert bk.status == 'rejected'
    assert bk.updated_by == 999
    assert bk.reject_reason == 'งบไม่พอ'


# ──────────────────────────────────────────────────────────────
# 4. Assign resources (admin_assign) + ungroup
# ──────────────────────────────────────────────────────────────
def test_assign_resources_sets_fields(session):
    owner = _user(session)
    veh = _vehicle(session)
    drv = _driver(session)
    bk = _booking(session, owner.id, status='pending')

    ok, msg = bs.assign_resources(bk, vehicle_id=veh.id, driver_id=drv.id,
                                   expense_type='central', central_category='medical')
    assert ok is True
    assert bk.assigned_vehicle_id == veh.id
    assert bk.driver_id == drv.id
    assert bk.expense_type == 'central'


def test_assign_resources_need_driver_blocked(session):
    owner = _user(session)
    bk = _booking(session, owner.id, status='pending', need_driver=True)

    ok, msg = bs.assign_resources(bk, vehicle_id=None, driver_id=None)
    assert ok is False


def test_assign_resources_join_trip_skips_vehicle_set(session):
    owner = _user(session)
    veh = _vehicle(session)
    bk = _booking(session, owner.id, status='pending', need_driver=True)

    ok, msg = bs.assign_resources(bk, vehicle_id=veh.id, is_join_trip=True)
    assert ok is True
    assert bk.assigned_vehicle_id is None  # ข้าม set + validate เพราะ join trip


def test_ungroup_resets_status_vehicle_driver(session):
    """เดิมชื่อ test_ungroup_clears_trip_group_and_vehicle — signature เปลี่ยนคืน (ok,msg)
    (Phase 3.5, 2026-07-19) + เดิมไม่เคย assert status/driver_id เลยทั้งที่ ungroup() ควร
    reset ครบ 4 field (bug ที่ REQ-1 แก้ไปในตัว — เดิมไม่รีเซ็ต status/driver_id เลย)"""
    owner = _user(session)
    veh = _vehicle(session)
    driver = _driver(session)
    bk = _booking(session, owner.id, status='approved',
                  assigned_vehicle_id=veh.id, driver_id=driver.id, trip_group='TRP-001')

    ok, msg = bs.ungroup(bk)
    assert ok is True
    assert bk.status == 'pending'
    assert bk.trip_group is None
    assert bk.assigned_vehicle_id is None
    assert bk.driver_id is None


def test_ungroup_cascades_to_all_trip_mates(session):
    """REQ-1 (Phase 3.5, 2026-07-19): ungroup 1 คน → สมาชิกที่เหลือทั้งทริปกลับ pending หมด
    (all-or-nothing — ไม่มี partial case อีกต่อไป แม้ถอดคนที่ไม่ใช่ leader)"""
    admin = _user(session, role='admin')
    veh = _vehicle(session)
    a = _booking(session, admin.id, status='approved', assigned_vehicle_id=veh.id, trip_group='TRP-Z')
    b = _booking(session, admin.id, status='approved', assigned_vehicle_id=veh.id, trip_group='TRP-Z')
    c = _booking(session, admin.id, status='approved', assigned_vehicle_id=veh.id, trip_group='TRP-Z')
    session.commit()

    ok, msg = bs.ungroup(b)  # ถอด b (ไม่ใช่ leader ตัวแรก) ออก
    assert ok is True
    for bk in (a, b, c):
        assert bk.status == 'pending'
        assert bk.trip_group is None
        assert bk.assigned_vehicle_id is None


def test_ungroup_blocked_when_any_member_started(session):
    """REQ-1 (Phase 3.5, 2026-07-19): มีใครในทริปออกรถแล้ว (odometer_start) → block ungroup
    ทั้งกลุ่ม"""
    admin = _user(session, role='admin')
    veh = _vehicle(session)
    a = _booking(session, admin.id, status='approved', assigned_vehicle_id=veh.id, trip_group='TRP-W')
    b = _booking(session, admin.id, status='approved', assigned_vehicle_id=veh.id, trip_group='TRP-W')
    _mileage(session, a.id, started=True)
    session.commit()

    ok, msg = bs.ungroup(b)
    assert ok is False
    assert b.status == 'approved'  # ไม่เปลี่ยนเลย
    assert b.trip_group == 'TRP-W'


# ──────────────────────────────────────────────────────────────
# 5. Cancel — guards ตาม role + un-merge trip mates
# ──────────────────────────────────────────────────────────────
def test_cancel_owner_pending_ok(session):
    owner = _user(session)
    bk = _booking(session, owner.id, status='pending')

    ok, msg, info = bs.cancel(bk, actor_id=owner.id, is_owner=True, is_admin=False)
    assert ok is True
    assert bk.status == 'cancelled'
    assert info['prev_status'] == 'pending'


def test_cancel_owner_approved_blocked(session):
    """owner ยกเลิกได้เฉพาะ pending เท่านั้น — approved ต้องผ่าน admin"""
    owner = _user(session)
    bk = _booking(session, owner.id, status='approved')

    ok, msg, info = bs.cancel(bk, actor_id=owner.id, is_owner=True, is_admin=False)
    assert ok is False
    assert bk.status == 'approved'


def test_cancel_admin_approved_ok(session):
    owner = _user(session)
    admin = _user(session, role='admin')
    bk = _booking(session, owner.id, status='approved')

    ok, msg, info = bs.cancel(bk, actor_id=admin.id, is_owner=False, is_admin=True)
    assert ok is True
    assert bk.status == 'cancelled'


def test_cancel_budget_deducted_blocked(session):
    admin = _user(session, role='admin')
    bk = _booking(session, admin.id, status='approved')
    _mileage(session, bk.id, deducted=True)

    ok, msg, info = bs.cancel(bk, actor_id=admin.id, is_owner=False, is_admin=True)
    assert ok is False
    assert bk.status == 'approved'


def test_cancel_unmerges_trip_mates(session):
    admin = _user(session, role='admin')
    leader = _booking(session, admin.id, status='approved', trip_group='TRP-X')
    mate = _booking(session, admin.id, status='approved', trip_group='TRP-X')
    session.commit()

    ok, msg, info = bs.cancel(leader, actor_id=admin.id, is_owner=False, is_admin=True)
    assert ok is True
    assert mate.status == 'pending'
    assert mate.trip_group is None
    assert info['trip_mate_user_ids'] == [mate.user_id]


def test_cancel_blocked_when_trip_mate_has_started(session):
    """REQ-1 (Phase 3.5, 2026-07-19): มีใครในทริปออกรถแล้ว (odometer_start) → block cancel
    ทั้งทริป ไม่มี skip-per-mate อีกต่อไป (เดิมชื่อ test_cancel_skips_deducted_trip_mate —
    เช็ก budget_deducted_at + skip เฉพาะ mate นั้น ก่อน REQ-1 เปลี่ยน guard ให้เข้มขึ้น)"""
    admin = _user(session, role='admin')
    leader = _booking(session, admin.id, status='approved', trip_group='TRP-Y')
    mate = _booking(session, admin.id, status='approved', trip_group='TRP-Y')
    _mileage(session, mate.id, started=True)
    session.commit()

    ok, msg, info = bs.cancel(leader, actor_id=admin.id, is_owner=False, is_admin=True)
    assert ok is False
    assert leader.status == 'approved'  # ไม่เปลี่ยนเลย — ทั้งทริป block ไม่ใช่แค่ mate
    assert mate.status == 'approved'


# ──────────────────────────────────────────────────────────────
# 6. Revert — with/without deduct
# ──────────────────────────────────────────────────────────────
def test_revert_without_deduct_ok(session):
    admin = _user(session, role='admin')
    bk = _booking(session, admin.id, status='approved')
    bk.reject_reason = 'เดิมเคย reject'

    ok, msg = bs.revert(bk, actor_id=admin.id)
    assert ok is True
    assert bk.status == 'pending'
    assert bk.reject_reason is None
    assert bk.updated_by == admin.id


def test_revert_with_deduct_blocked(session):
    admin = _user(session, role='admin')
    bk = _booking(session, admin.id, status='approved')
    _mileage(session, bk.id, deducted=True)

    ok, msg = bs.revert(bk, actor_id=admin.id)
    assert ok is False
    assert bk.status == 'approved'


def test_revert_from_rejected_ok(session):
    admin = _user(session, role='admin')
    bk = _booking(session, admin.id, status='rejected')

    ok, msg = bs.revert(bk, actor_id=admin.id)
    assert ok is True
    assert bk.status == 'pending'


def test_revert_clears_vehicle_and_driver(session):
    """เดิม revert() เปลี่ยนแค่ status → pending แต่ไม่เคลียร์ assigned_vehicle_id/driver_id
    จริงในฐานข้อมูล (ฝั่ง JS patch UI ให้ดูเหมือนเคลียร์เฉยๆ) — booking ที่ย้อนแล้วต้องไม่มีรถ/
    คนขับติดค้างอยู่ (2026-07-31)"""
    admin = _user(session, role='admin')
    veh = _vehicle(session)
    drv = _driver(session)
    bk = _booking(session, admin.id, status='approved',
                  assigned_vehicle_id=veh.id, driver_id=drv.id)

    ok, msg = bs.revert(bk, actor_id=admin.id)
    assert ok is True
    assert bk.status == 'pending'
    assert bk.assigned_vehicle_id is None
    assert bk.driver_id is None


def test_revert_blocked_when_grouped(session):
    """revert เดี่ยวไม่รองรับ booking ที่อยู่ในกลุ่มทริป (trip_group set) — ไปทาง ungroup()
    แทน เพราะ ungroup cascade ทั้งกลุ่มถูกต้องกว่า ส่วน revert ตัวเดียวจะทิ้ง trip_group ค้าง
    ให้เพื่อนร่วมทริปที่เหลือชี้มาที่กลุ่มที่มีสมาชิก pending ปนอยู่ (2026-07-31)"""
    admin = _user(session, role='admin')
    veh = _vehicle(session)
    bk = _booking(session, admin.id, status='approved',
                  assigned_vehicle_id=veh.id, trip_group='TRP-G1')

    ok, msg = bs.revert(bk, actor_id=admin.id)
    assert ok is False
    assert bk.status == 'approved'
    assert bk.trip_group == 'TRP-G1'


# ──────────────────────────────────────────────────────────────
# 7. Phase 4 (2026-07-19) — notify ย้ายเข้า service แล้ว
# ──────────────────────────────────────────────────────────────
def test_approve_default_no_admin_assigned_event(session):
    """notify_assigned default False (ตรง behavior เดิมของ approve_booking() — ไม่เคยส่ง
    Event #2) — approve สำเร็จแต่ไม่มี notification event_key='assigned'"""
    admin = _user(session, role='admin')
    bk = _booking(session, admin.id, status='pending', expense_type='personal')

    ok, msg = bs.approve_from_pending(bk)
    assert ok is True
    assert Notification.query.filter_by(booking_id=bk.id, event_key='assigned').count() == 0
    assert Notification.query.filter_by(booking_id=bk.id, event_key='approved').count() >= 1


def test_approve_notify_assigned_true_sends_event_2(session):
    """notify_assigned=True (ตามที่ admin_assign() ส่งเข้ามาเมื่อ not is_join_trip and
    had_resources) → มี Event #2 (notify_admin_assigned) เพิ่มขึ้นมา"""
    admin = _user(session, role='admin')
    bk = _booking(session, admin.id, status='pending', expense_type='personal')

    ok, msg = bs.approve_from_pending(bk, notify_assigned=True)
    assert ok is True
    assert Notification.query.filter_by(booking_id=bk.id, event_key='assigned').count() == 1


def test_reject_from_pending_sends_notification(session):
    """rejected_by=None ส่งเข้า notify_rejected() โดยตั้งใจ (param ไม่ถูกใช้ใน body ของมันเลย
    — ดู comment ใน booking_service.py) ยังต้องสร้าง notification ได้ปกติ"""
    admin = _user(session, role='admin')
    bk = _booking(session, admin.id, status='pending')

    ok, msg = bs.reject_from_pending(bk, reason='ไม่เหมาะสม')
    assert ok is True
    n = Notification.query.filter_by(booking_id=bk.id, event_key='rejected').first()
    assert n is not None


def test_approver_approve_notifies_approver_self(session):
    """actor_id ถูก resolve เป็น User จริงข้างในแล้วส่งเข้า notify_approver_approved —
    approver ต้องปรากฏเป็นผู้รับ notification ด้วย (ไม่ใช่แค่ owner/admin)"""
    owner = _user(session)
    approver = _user(session, role='approver')
    bgt = _active_budget(session, expense_type='department')
    bk = _booking(session, owner.id, status='waiting_approver', expense_type='department',
                  dept_id=bgt.department_id)

    ok, msg = bs.approver_approve(bk, actor_id=approver.id)
    assert ok is True
    n = Notification.query.filter_by(booking_id=bk.id, user_id=approver.id,
                                      event_key='approved').first()
    assert n is not None


def test_cancel_notify_true_creates_notifications(session):
    """notify=True (default) — ตรง behavior เดิมของ vehicle_booking.py::cancel_booking()"""
    owner = _user(session)
    admin = _user(session, role='admin')
    bk = _booking(session, owner.id, status='approved')

    before = Notification.query.count()
    ok, msg, info = bs.cancel(bk, actor_id=admin.id, is_owner=False, is_admin=True)
    assert ok is True
    assert Notification.query.count() > before


# ──────────────────────────────────────────────────────────────
# 8. merge_into_group — เพิ่มงานเข้ากลุ่มที่มีอยู่แล้ว (2026-07-31)
#    งานเดิมในกลุ่มเป็นหลักเสมอ ไม่ถูกแตะ · งานใหม่ผ่าน guard_budget/apply_transition จริง
#    (ต่าง admin_merge() เดิมที่ตั้ง status ตรงไม่เช็คงบเลย — BUG-3, ยังคงอยู่เฉพาะ path เดิม)
# ──────────────────────────────────────────────────────────────
def test_merge_into_group_requires_existing_group(session):
    admin = _user(session, role='admin')
    veh = _vehicle(session)
    new_bk = _booking(session, admin.id, status='pending')

    ok, msg = bs.merge_into_group('TRP-NOPE', [new_bk.id], vehicle_id=veh.id)
    assert ok is False
    assert new_bk.status == 'pending'


def test_merge_into_group_adds_new_keeps_existing_untouched(session):
    admin = _user(session, role='admin')
    veh = _vehicle(session)
    drv = _driver(session)
    leader = _booking(session, admin.id, status='approved', expense_type='personal',
                      assigned_vehicle_id=veh.id, driver_id=drv.id, trip_group='TRP-A')
    mate = _booking(session, admin.id, status='approved', expense_type='personal',
                    assigned_vehicle_id=veh.id, driver_id=drv.id, trip_group='TRP-A')
    new_bk = _booking(session, admin.id, status='pending')
    session.commit()

    ok, msg = bs.merge_into_group('TRP-A', [new_bk.id], vehicle_id=veh.id,
                                   driver_id=drv.id, expense_type='personal')
    assert ok is True
    assert new_bk.status == 'approved'
    assert new_bk.trip_group == 'TRP-A'
    assert new_bk.assigned_vehicle_id == veh.id
    # งานเดิมเป็นหลัก — ไม่ถูกแตะเลย
    assert leader.status == 'approved'
    assert mate.status == 'approved'


def test_merge_into_group_department_sets_waiting_approver(session):
    admin = _user(session, role='admin')
    veh = _vehicle(session)
    bgt = _active_budget(session, expense_type='department')
    dept = VehicleDepartment.query.get(bgt.department_id)
    _booking(session, admin.id, status='waiting_approver', expense_type='department',
            assigned_vehicle_id=veh.id, trip_group='TRP-B', dept_id=bgt.department_id)
    new_bk = _booking(session, admin.id, status='pending')
    session.commit()

    ok, msg = bs.merge_into_group('TRP-B', [new_bk.id], vehicle_id=veh.id,
                                   expense_type='department', trip_department=dept.name)
    assert ok is True
    assert new_bk.status == 'waiting_approver'
    assert new_bk.trip_department_id == bgt.department_id


def test_merge_into_group_blocked_when_existing_started(session):
    """สมาชิกเดิมในกลุ่มออกรถแล้ว (odometer_start) → ห้ามเพิ่มงานใหม่เข้ากลุ่ม"""
    admin = _user(session, role='admin')
    veh = _vehicle(session)
    leader = _booking(session, admin.id, status='approved', expense_type='personal',
                      assigned_vehicle_id=veh.id, trip_group='TRP-C')
    _mileage(session, leader.id, started=True)
    new_bk = _booking(session, admin.id, status='pending')
    session.commit()

    ok, msg = bs.merge_into_group('TRP-C', [new_bk.id], vehicle_id=veh.id,
                                   expense_type='personal')
    assert ok is False
    assert new_bk.status == 'pending'
    assert new_bk.trip_group is None


def test_merge_into_group_vehicle_conflict_blocked(session):
    admin = _user(session, role='admin')
    veh = _vehicle(session)
    base = datetime.now() + timedelta(days=2)
    leader = _booking(session, admin.id, status='approved', expense_type='personal',
                      assigned_vehicle_id=veh.id, trip_group='TRP-D')
    leader.start_datetime = base
    leader.end_datetime = base + timedelta(hours=8)

    other = _booking(session, admin.id, status='approved', expense_type='personal',
                     assigned_vehicle_id=veh.id)
    other.start_datetime = base + timedelta(hours=2)
    other.end_datetime = base + timedelta(hours=10)

    new_bk = _booking(session, admin.id, status='pending')
    new_bk.start_datetime = base
    new_bk.end_datetime = base + timedelta(hours=8)
    session.commit()

    ok, msg = bs.merge_into_group('TRP-D', [new_bk.id], vehicle_id=veh.id,
                                   expense_type='personal')
    assert ok is False
    assert 'ทับ' in msg


def test_merge_into_group_budget_guard_blocked(session):
    """งานใหม่ expense_type=central แต่ไม่มีงบ active — guard_budget ต้อง block (ต่างจาก
    admin_merge() เดิมที่ตั้ง status ตรงไม่เช็คงบเลย — BUG-3 เดิม ยังไม่แก้เฉพาะ path เดิม)"""
    admin = _user(session, role='admin')
    veh = _vehicle(session)
    _booking(session, admin.id, status='approved', expense_type='personal',
            assigned_vehicle_id=veh.id, trip_group='TRP-E')
    new_bk = _booking(session, admin.id, status='pending')
    session.commit()

    ok, msg = bs.merge_into_group('TRP-E', [new_bk.id], vehicle_id=veh.id,
                                   expense_type='central', central_category='medical')
    assert ok is False
    assert new_bk.status == 'pending'


def test_cancel_notify_false_creates_no_notifications(session):
    """notify=False (ตามที่ vehicle_budget.py::_handle_cancel_booking() ส่งเข้ามา) — ต้องไม่มี
    notification เพิ่มเลย รักษา behavior เดิมที่ path นี้ไม่เคยแจ้งเตือนใครมาก่อน"""
    owner = _user(session)
    admin = _user(session, role='admin')
    bk = _booking(session, owner.id, status='approved')

    before = Notification.query.count()
    ok, msg, info = bs.cancel(bk, actor_id=admin.id, is_owner=False, is_admin=True, notify=False)
    assert ok is True
    assert Notification.query.count() == before
