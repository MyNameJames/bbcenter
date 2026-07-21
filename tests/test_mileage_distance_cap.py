"""
test_mileage_distance_cap.py — REQ-3 (Phase 3.5, 2026-07-19): validation เพดานระยะทาง

confirm ผ่านได้ ไม่ hard block (ตกลงกับเจ้าของโปรเจกต์) — backend block เฉพาะเมื่อเกิน
เพดาน (default 1000 กม., SystemConfig key mileage_distance_cap_km) และไม่มี
confirm_distance=1 มาด้วย (safety net เผื่อ JS confirm ฝั่ง frontend ถูกข้าม)

Tests:
  1  เกินเพดาน + ไม่มี confirm_distance → block, ไม่บันทึก odometer_end
  2  เกินเพดาน + confirm_distance=1     → ผ่าน, บันทึกสำเร็จ
  3  ไม่เกินเพดาน                        → ผ่านปกติ ไม่ต้อง confirm
"""
from datetime import datetime, timedelta

from models import db, VehicleBooking, VehicleMileage, User
from conftest import login


def _user(username, role='user') -> User:
    u = User(username=username, role_vehicle=role)
    db.session.add(u)
    db.session.flush()
    return u


def _booking_with_start(user_id, *, odo_start=1000) -> VehicleBooking:
    base = datetime.now().replace(second=0, microsecond=0) - timedelta(hours=1)
    bk = VehicleBooking(
        user_id=user_id, status='approved',
        start_datetime=base, end_datetime=base + timedelta(hours=8),
        destination='dest', purpose='purpose', passenger_count=1,
    )
    db.session.add(bk)
    db.session.flush()
    m = VehicleMileage(booking_id=bk.id, odometer_start=odo_start, actual_start=base)
    db.session.add(m)
    db.session.commit()
    return bk


def test_distance_over_cap_blocked_without_confirm(client):
    admin = _user('u_dcap_a', role='admin')
    bk = _booking_with_start(admin.id, odo_start=1000)
    login(client, admin.id)

    r = client.post('/vehicle/mileage', data={
        'booking_id': str(bk.id),
        'entry_type': 'end',
        'odometer_end': '3000',  # +2000 กม. เกินเพดาน default 1000
        'actual_end': datetime.now().strftime('%Y-%m-%dT%H:%M'),
    }, follow_redirects=False)

    assert r.status_code == 302
    m = VehicleMileage.query.filter_by(booking_id=bk.id).first()
    assert m.odometer_end is None  # ยังไม่บันทึก — ถูก block


def test_distance_over_cap_passes_with_confirm(client):
    admin = _user('u_dcap_b', role='admin')
    bk = _booking_with_start(admin.id, odo_start=1000)
    login(client, admin.id)

    r = client.post('/vehicle/mileage', data={
        'booking_id': str(bk.id),
        'entry_type': 'end',
        'odometer_end': '3000',
        'actual_end': datetime.now().strftime('%Y-%m-%dT%H:%M'),
        'confirm_distance': '1',
    }, follow_redirects=False)

    assert r.status_code == 302
    m = VehicleMileage.query.filter_by(booking_id=bk.id).first()
    assert m.odometer_end == 3000  # บันทึกสำเร็จ


def test_distance_under_cap_no_confirm_needed(client):
    admin = _user('u_dcap_c', role='admin')
    bk = _booking_with_start(admin.id, odo_start=1000)
    login(client, admin.id)

    r = client.post('/vehicle/mileage', data={
        'booking_id': str(bk.id),
        'entry_type': 'end',
        'odometer_end': '1100',  # +100 กม. ไม่เกินเพดาน
        'actual_end': datetime.now().strftime('%Y-%m-%dT%H:%M'),
    }, follow_redirects=False)

    assert r.status_code == 302
    m = VehicleMileage.query.filter_by(booking_id=bk.id).first()
    assert m.odometer_end == 1100
