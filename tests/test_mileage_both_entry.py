"""
test_mileage_both_entry.py — entry_type='both' (Case 17 merge, 2026-07-22): admin กรอกเลขไมล์
ออก+กลับพร้อมกันในคำขอเดียว (เฉพาะหน้า admin `/vehicle/mileage` — driver ฝั่ง
`/driver/mileage` คนละ route/JS ไม่ถูกแตะ ยังคง 2 ขั้นตอนแยกเหมือนเดิม)

Tests:
  1  entry_type='both' + end > start ถูกต้อง → บันทึกทั้ง odometer_start/end ในคำขอเดียว
  2  entry_type='both' + end == start → block ทั้งหมด (all-or-nothing — ไม่ commit แม้แต่
     odometer_start เพราะ view ยังไม่เรียก db.session.commit() ถ้า end validation ไม่ผ่าน)
  3  entry_type='start' อย่างเดียว (ไม่ส่ง odometer_end) ยังทำงานเหมือนเดิม (regression)
"""
from datetime import datetime

from models import db, VehicleBooking, VehicleMileage, User
from conftest import login


def _admin(username) -> User:
    u = User(username=username, role_vehicle='admin')
    db.session.add(u)
    db.session.commit()
    return u


def _fresh_booking(user_id) -> VehicleBooking:
    """Booking ที่ยังไม่มี VehicleMileage เลย (state='none' ฝั่ง JS)"""
    bk = VehicleBooking(
        user_id=user_id, status='approved',
        start_datetime=datetime(2026, 7, 20, 8, 0),
        end_datetime=datetime(2026, 7, 20, 10, 0),
        destination='dest', purpose='purpose', passenger_count=1,
    )
    db.session.add(bk)
    db.session.commit()
    return bk


def test_both_entry_saves_start_and_end_together(client):
    admin = _admin('u_both_a')
    bk = _fresh_booking(admin.id)
    login(client, admin.id)

    r = client.post('/vehicle/mileage', data={
        'booking_id': str(bk.id),
        'entry_type': 'both',
        'odometer_start': '1000',
        'odometer_end': '1100',
        'actual_start': '2026-07-20T08:00',
        'actual_end': '2026-07-20T10:00',
    }, follow_redirects=False)

    assert r.status_code == 302
    m = VehicleMileage.query.filter_by(booking_id=bk.id).first()
    assert m is not None
    assert m.odometer_start == 1000
    assert m.odometer_end == 1100


def test_both_entry_blocked_when_end_equals_start(client):
    admin = _admin('u_both_b')
    bk = _fresh_booking(admin.id)
    login(client, admin.id)

    r = client.post('/vehicle/mileage', data={
        'booking_id': str(bk.id),
        'entry_type': 'both',
        'odometer_start': '1000',
        'odometer_end': '1000',  # เท่ากัน — ต้องไม่ผ่าน (ยืนยันกับผู้ใช้แล้วว่าห้ามเท่ากัน)
        'actual_start': '2026-07-20T08:00',
        'actual_end': '2026-07-20T10:00',
    }, follow_redirects=False)

    assert r.status_code == 302
    m = VehicleMileage.query.filter_by(booking_id=bk.id).first()
    # all-or-nothing: ไม่ commit เลยทั้ง start และ end เพราะ validation end ไม่ผ่าน
    assert m is None or m.odometer_start is None


def test_start_only_entry_still_works(client):
    admin = _admin('u_both_c')
    bk = _fresh_booking(admin.id)
    login(client, admin.id)

    r = client.post('/vehicle/mileage', data={
        'booking_id': str(bk.id),
        'entry_type': 'start',
        'odometer_start': '1000',
        'actual_start': '2026-07-20T08:00',
    }, follow_redirects=False)

    assert r.status_code == 302
    m = VehicleMileage.query.filter_by(booking_id=bk.id).first()
    assert m.odometer_start == 1000
    assert m.odometer_end is None
