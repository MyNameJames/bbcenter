"""
test_stale_mileage_cron.py — REQ-3 (Phase 3.5, 2026-07-19) check_stale_mileage cron

เตือน driver เมื่อบันทึกไมล์เริ่มแล้วแต่ยังไม่ปิด ข้ามวันเดินทางไปแล้ว — ส่วนเสริม
auto_close_stale_trips ของ Phase 3 (ปิดอัตโนมัติเมื่อรถคันเดียวกันมีงานใหม่บันทึกไมล์เริ่ม)

Tests:
  1  เริ่มไมล์เมื่อวาน ยังไม่ปิด มี driver          → แจ้งเตือน 1 ใบ + ตั้ง mileage_open_reminder_at
  2  trip_date วันนี้ (ยังไม่ข้ามวัน)                → ไม่แจ้ง
  3  แจ้งไปแล้ววันนี้ (mileage_open_reminder_at)     → ไม่แจ้งซ้ำ (idempotent)
  4  odometer_end ไม่ None (ปิดแล้ว)                 → ไม่ใช่ candidate เลย
  5  booking ไม่มี driver_id                          → ไม่แจ้ง ไม่ error
"""
from datetime import timedelta

from models import db, VehicleBooking, VehicleMileage, Driver, User, Notification, get_bkk_time


# ─── helpers ──────────────────────────────────────────────────────

def _user(username) -> User:
    u = User(username=username)
    db.session.add(u)
    db.session.flush()
    return u


def _driver_with_user(username) -> Driver:
    u = _user(username)
    d = Driver(name=f'driver-{username}', phone='0800000000', user_id=u.id, is_active=True)
    db.session.add(d)
    db.session.flush()
    return d


def _booking(user_id, *, driver_id=None, days=-1) -> VehicleBooking:
    """days<0 = เมื่อวาน/อดีต, days=0 = วันนี้"""
    now = get_bkk_time()
    base = (now + timedelta(days=days)).replace(second=0, microsecond=0)
    bk = VehicleBooking(
        user_id=user_id, driver_id=driver_id, status='approved',
        start_datetime=base, end_datetime=base + timedelta(hours=8),
        destination='dest', purpose='purpose', passenger_count=1,
    )
    db.session.add(bk)
    db.session.flush()
    return bk


def _mileage(booking_id, *, odo_start=1000, odo_end=None, actual_start=None,
             reminder_at=None) -> VehicleMileage:
    m = VehicleMileage(
        booking_id=booking_id, odometer_start=odo_start, odometer_end=odo_end,
        actual_start=actual_start, mileage_open_reminder_at=reminder_at,
    )
    db.session.add(m)
    db.session.flush()
    return m


def _run_cron(app):
    """Import + call the cron function directly (no scheduler)."""
    from views.core.notification_cron import check_stale_mileage
    check_stale_mileage(app)


# ─── tests ────────────────────────────────────────────────────────

def test_open_trip_past_day_with_driver_notified(app):
    """เริ่มไมล์เมื่อวาน ยังไม่ปิด มี driver → แจ้งเตือน 1 ใบ + ตั้ง mileage_open_reminder_at"""
    owner  = _user('sm_u1')
    driver = _driver_with_user('sm_d1')
    bk = _booking(owner.id, driver_id=driver.id, days=-1)
    m = _mileage(bk.id, actual_start=bk.start_datetime)
    bk_id, m_id = bk.id, m.id
    db.session.commit()

    notif_before = Notification.query.count()
    _run_cron(app)

    assert Notification.query.count() == notif_before + 1
    n = Notification.query.filter_by(booking_id=bk_id).first()
    assert n is not None
    assert n.user_id == driver.user_id
    assert VehicleMileage.query.get(m_id).mileage_open_reminder_at is not None


def test_trip_today_not_notified(app):
    """trip_date วันนี้ (ยังไม่ข้ามวัน) → ไม่แจ้ง"""
    owner  = _user('sm_u2')
    driver = _driver_with_user('sm_d2')
    bk = _booking(owner.id, driver_id=driver.id, days=0)
    _mileage(bk.id, actual_start=bk.start_datetime)
    db.session.commit()

    notif_before = Notification.query.count()
    _run_cron(app)
    assert Notification.query.count() == notif_before


def test_already_reminded_today_not_duplicated(app):
    """แจ้งไปแล้ววันนี้ (mileage_open_reminder_at = ตอนนี้) → ไม่แจ้งซ้ำ"""
    owner  = _user('sm_u3')
    driver = _driver_with_user('sm_d3')
    bk = _booking(owner.id, driver_id=driver.id, days=-1)
    _mileage(bk.id, actual_start=bk.start_datetime, reminder_at=get_bkk_time())
    db.session.commit()

    notif_before = Notification.query.count()
    _run_cron(app)
    assert Notification.query.count() == notif_before


def test_closed_trip_not_notified(app):
    """odometer_end ไม่ None (ปิดแล้ว) → ไม่ใช่ candidate เลย"""
    owner  = _user('sm_u4')
    driver = _driver_with_user('sm_d4')
    bk = _booking(owner.id, driver_id=driver.id, days=-1)
    _mileage(bk.id, odo_end=1100, actual_start=bk.start_datetime)
    db.session.commit()

    notif_before = Notification.query.count()
    _run_cron(app)
    assert Notification.query.count() == notif_before


def test_no_driver_not_notified_no_error(app):
    """booking ไม่มี driver_id → ไม่แจ้ง ไม่ error"""
    owner = _user('sm_u5')
    bk = _booking(owner.id, driver_id=None, days=-1)
    _mileage(bk.id, actual_start=bk.start_datetime)
    db.session.commit()

    notif_before = Notification.query.count()
    _run_cron(app)  # ไม่ error
    assert Notification.query.count() == notif_before
