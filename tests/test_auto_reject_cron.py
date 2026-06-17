"""
test_auto_reject_cron.py — Phase 2 GUARD tests (test-first)

Tests:
  1  pending booking เมื่อวาน          → rejected + reason + notification 1 ใบ
  2  waiting_approver booking เมื่อวาน  → rejected
  3  pending booking พรุ่งนี้           → ไม่แตะ (ยังไม่เลย)
  4  approved booking เมื่อวาน         → ไม่แตะ
  5  rejected booking เมื่อวาน         → ไม่แตะ (idempotent)
  6  รันซ้ำ 2 ครั้ง                     → ไม่ reject ซ้ำ (idempotent)
"""
from datetime import timedelta

import pytest

from models import db, VehicleBooking, Notification, User, get_bkk_time


# ─── helpers ──────────────────────────────────────────────────────

def _user(username) -> User:
    u = User(username=username)
    db.session.add(u)
    db.session.flush()
    return u


def _booking(user_id, status, *, days=-1) -> VehicleBooking:
    """days<0 = past, days>0 = future"""
    now = get_bkk_time()
    base = (now + timedelta(days=days)).replace(second=0, microsecond=0)
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


def _run_cron(app):
    """Import + call the cron function directly (no scheduler)."""
    from views.core.notification_cron import auto_reject_overdue_bookings
    auto_reject_overdue_bookings(app)


# ─── tests ────────────────────────────────────────────────────────

def test_pending_past_gets_rejected(app):
    """pending booking ที่ start_datetime เมื่อวาน → rejected + reason + 1 notification"""
    u = _user('arc_u1')
    bk = _booking(u.id, 'pending', days=-1)
    bk_id = bk.id
    db.session.commit()

    notif_before = Notification.query.count()
    _run_cron(app)

    bk = VehicleBooking.query.get(bk_id)
    assert bk.status == 'rejected'
    assert bk.reject_reason is not None and len(bk.reject_reason) > 0
    assert Notification.query.count() == notif_before + 1
    n = Notification.query.filter_by(booking_id=bk_id).first()
    assert n is not None
    assert n.user_id == u.id


def test_waiting_approver_past_gets_rejected(app):
    """waiting_approver booking เมื่อวาน → rejected"""
    u = _user('arc_u2')
    bk = _booking(u.id, 'waiting_approver', days=-1)
    bk_id = bk.id
    db.session.commit()

    _run_cron(app)

    bk = VehicleBooking.query.get(bk_id)
    assert bk.status == 'rejected'


def test_future_pending_not_touched(app):
    """pending booking พรุ่งนี้ → status คงเดิม"""
    u = _user('arc_u3')
    bk = _booking(u.id, 'pending', days=1)
    bk_id = bk.id
    db.session.commit()

    _run_cron(app)

    assert VehicleBooking.query.get(bk_id).status == 'pending'


def test_approved_past_not_touched(app):
    """approved booking เมื่อวาน → ไม่ถูก reject (ทริปเกิดจริง รอปิดทริป)"""
    u = _user('arc_u4')
    bk = _booking(u.id, 'approved', days=-1)
    bk_id = bk.id
    db.session.commit()

    _run_cron(app)

    assert VehicleBooking.query.get(bk_id).status == 'approved'


def test_already_rejected_not_touched(app):
    """rejected booking → status คงเดิม, ไม่สร้าง notification ซ้ำ"""
    u = _user('arc_u5')
    bk = _booking(u.id, 'rejected', days=-1)
    bk_id = bk.id
    db.session.commit()

    notif_before = Notification.query.count()
    _run_cron(app)

    assert VehicleBooking.query.get(bk_id).status == 'rejected'
    assert Notification.query.count() == notif_before  # ไม่มี notification เพิ่ม


def test_idempotent_double_run(app):
    """รัน cron 2 ครั้ง → rejected แค่ครั้งเดียว, notification ไม่เพิ่มรอบสอง"""
    u = _user('arc_u6')
    bk = _booking(u.id, 'pending', days=-1)
    bk_id = bk.id
    db.session.commit()

    _run_cron(app)
    notif_after_first = Notification.query.count()

    _run_cron(app)  # second run — idempotent

    assert VehicleBooking.query.get(bk_id).status == 'rejected'
    assert Notification.query.count() == notif_after_first  # ไม่เพิ่ม
