"""
mileage_service.py — close-trip / budget-deduct / OT-generate flow (Phase 3, 2026-07-19)

รวม flow "ปิดทริป + หักงบ" ที่เดิมกระจาย 4 จุด (mileage_log/driver_mileage/
_auto_close_stale_trips เรียก deduct_budget_for_trip ร่วมกัน + override_fuel เรียก
budget_svc.rededuct_for_mileage ตรงแยกเส้นทาง) มารวมไฟล์เดียว — ย้ายจาก
views/vehicle/vehicle_common.py เนื้อ logic เดิม 100% ยกเว้นกลไก (ตกลงกับเจ้าของโปรเจกต์
Phase 3 checkpoint 2026-07-19):

- flash()/current_user แยกออกจากฟังก์ชัน — คืนค่าให้ route จัดการแทน (ต่างจากของเดิมที่
  deduct_budget_for_trip()/auto_generate_ot() เรียก flash()/current_user ตรงในตัว) เพื่อให้
  test เป็น unit-test style ได้เหมือน booking_service.py (Phase 2) — เป็นการเปลี่ยนกลไก
  ไม่ใช่ business logic: เงื่อนไข/ข้อความ flash ทุกจุดเหมือนเดิมทุกตัวอักษร แค่ย้ายจาก
  "เรียก flash() ในนี้" เป็น "คืน [(text, category), ...] ให้ route flash เอง"
- ปิด DEBT-2: get_fuel_price() ย้ายมาจาก domain/vehicle/fuel.py (query ORM
  FuelPrice/SystemConfig — ไม่ใช่ pure logic ผิดกฎ domain ของ ADR 0001)
  calc_fuel_cost() เป็น pure function จริง ยังอยู่ domain ต่อได้ ไม่ย้าย

Idempotency: budget_deducted_at (VehicleMileage) เป็น flag เดียวที่คุม — เซ็ต/เคลียร์ใน
budget_service.py เท่านั้น (deduct_for_mileage/refund_for_mileage) — ไฟล์นี้ไม่แตะ flag
ตรง เรียกผ่าน budget_svc เสมอ. override_fuel_cost() ไม่ idempotent โดยเจตนา (correction
mechanism — เรียกกี่ครั้งก็ rededuct ใหม่ทุกครั้งตาม behavior เดิม)

Phase 4 (2026-07-19): auto_generate_ot() รับ notify=True (default) — ส่ง notify_ot_created
หลังสร้างสำเร็จ (ย้ายมาจาก vehicle_mileage.py/vehicle_driver.py caller เดิมที่เรียกไม่มี
เงื่อนไข นอกจาก ot ต้องไม่ None). auto_close_stale_trips() เรียกผ่าน notify=False — เดิม
ไม่เคยแจ้งเตือน OT ของทริปที่ auto-close มาก่อนเลย (ผลลัพธ์ auto_generate_ot() ถูกทิ้งไปตรงๆ
ไม่เคยเช็ก) รักษา gap เดิมไว้ผ่าน flag แทนที่จะ silent-add เหมือน cancel()'s notify param
"""
import logging

from models import (db, get_bkk_time, FuelPrice, SystemConfig, VehicleMileage,
                    VehicleBooking, DriverOT, DriverOTSlot, OTRateConfig)
from domain.vehicle.fuel import calc_fuel_cost
import services.vehicle.budget_service as budget_svc
from services.vehicle.budget_service import _lookup_budget_for_booking
from views.core.notification_service import (
    notify_budget_deducted      as _n_budget,
    notify_payment_required     as _n_payment_required,
    notify_admin_personal_trip  as _n_admin_personal,
    notify_ot_created           as _n_ot_created,
)

_log = logging.getLogger(__name__)


def get_fuel_price(on_date) -> float:
    """ราคาน้ำมัน/ลิตร ณ วันที่ on_date — fallback จาก SystemConfig['fuel_price']
    ย้ายจาก domain/vehicle/fuel.py (DEBT-2 — query ORM ไม่ใช่ pure logic)"""
    return FuelPrice.get_for_date(on_date) or float(SystemConfig.get('fuel_price', '40') or 40)


def get_distance_cap_km() -> float:
    """เพดานระยะทางต่อทริป (กม.) — fallback 1000 ถ้าไม่มี SystemConfig ตั้งไว้ (ยังไม่มี UI
    ให้ตั้งค่า ตอนนี้ fallback ค่าเดียว — เจ้าของ confirm default 1000 กม., Phase 3.5,
    2026-07-19). ใช้กัน validation กรอกไมล์ผิดพลาด (REQ-3) — confirm ผ่านได้ ไม่ hard block"""
    return float(SystemConfig.get('mileage_distance_cap_km', '1000') or 1000)


def next_ot_number(yr):
    """รหัส OT ถัดไปของปี yr → 'OT-2026-0001' — ใช้ทั้ง auto_generate_ot + manual ot_create"""
    last = DriverOT.query.filter(DriverOT.ot_number.like(f'OT-{yr}-%')) \
                         .order_by(DriverOT.id.desc()).first()
    seq  = (int(last.ot_number.split('-')[-1]) + 1) if last else 1
    return f'OT-{yr}-{seq:04d}'


def _select_rate_configs_for_weekday(rate_configs, weekday):
    """Per-weekday override: ถ้ามี rate row ตรง weekday ของทริป → ใช้เฉพาะแถวนั้น
    ไม่งั้น fallback เป็น weekday-agnostic rows (day_of_week IS NULL). weekday: 0=Mon..6=Sun
    (extract จาก auto_generate_ot ตอน Phase 3 correction — เกิน 60 บรรทัด, logic เดิม 100%)"""
    day_rows = [c for c in rate_configs if c.day_of_week == weekday]
    return day_rows if day_rows else [c for c in rate_configs if c.day_of_week is None]


def _build_ot_slots(rate_configs, trip_start_min, trip_end_min):
    """คำนวณ overlap ของแต่ละ rate config band กับช่วงเวลาทริป (นาทีนับจาก 00:00) →
    list[DriverOTSlot] (extract จาก auto_generate_ot ตอน Phase 3 correction — logic เดิม 100%)"""
    new_slots = []
    for cfg in rate_configs:
        h, m   = cfg.start_time.split(':')
        band_s = int(h) * 60 + int(m)
        h, m   = cfg.end_time.split(':')
        band_e = 1440 if cfg.end_time == '24:00' else int(h) * 60 + int(m)

        ov_s = max(trip_start_min, band_s)
        ov_e = min(trip_end_min, band_e)
        ov   = max(0, ov_e - ov_s)
        if ov == 0:
            continue

        hrs    = round(ov / 60, 2)
        rate   = float(cfg.rate)
        new_slots.append(DriverOTSlot(
            rate_config_id=cfg.id,
            slot_label=cfg.label,
            start_time=f"{ov_s // 60:02d}:{ov_s % 60:02d}",
            end_time  =f"{ov_e // 60:02d}:{ov_e % 60:02d}",
            hours=hrs, rate=rate,
            amount=round(hrs * rate, 2),
        ))
    return new_slots


def auto_generate_ot(booking, mileage, *, actor_id, notify=True):
    """Auto-generate DriverOT + DriverOTSlots เมื่อปิดงาน (entry_type='end').
    Idempotent — ถ้า DriverOT สำหรับ booking นี้มีอยู่แล้วจะ skip ทันที
    actor_id = created_by_id (เดิมเรียก current_user.id ตรง — แยกเป็น param ให้ test ได้)
    notify=True (default, Phase 4, 2026-07-19) → ส่ง notify_ot_created หลังสร้างสำเร็จ —
    auto_close_stale_trips() ส่ง notify=False (ดู module docstring)"""
    if not booking.need_driver or not booking.driver_id:
        return None
    if not mileage or not mileage.actual_start or not mileage.actual_end:
        return None
    if DriverOT.query.filter_by(booking_id=booking.id).first():
        return None  # already generated — idempotent

    rate_configs = OTRateConfig.query.filter_by(is_active=True).order_by(OTRateConfig.sort_order).all()
    if not rate_configs:
        return None

    rate_configs = _select_rate_configs_for_weekday(rate_configs, mileage.actual_end.weekday())
    if not rate_configs:
        return None

    trip_s = mileage.actual_start.hour * 60 + mileage.actual_start.minute
    trip_e = mileage.actual_end.hour * 60 + mileage.actual_end.minute
    if trip_e <= trip_s:
        return None  # invalid same-day end

    new_slots = _build_ot_slots(rate_configs, trip_s, trip_e)
    if not new_slots:
        return None

    ot = DriverOT(
        booking_id   =booking.id,
        driver_id    =booking.driver_id,
        ot_number    =next_ot_number(mileage.actual_end.year),
        date         =mileage.actual_end.date(),
        total_hours  =round(sum(float(s.hours)  for s in new_slots), 2),
        total_amount =round(sum(float(s.amount) for s in new_slots), 2),
        status       ='unpaid',
        created_at   =get_bkk_time(),
        created_by_id=actor_id,
    )
    ot.slots = new_slots
    db.session.add(ot)
    db.session.flush()  # ไม่ commit เอง — ให้ caller ที่เรียก commit() ครอบ transaction ไว้
    if notify:
        _n_ot_created(booking, ot)
    return ot


def _deduct_central_or_department(booking, mileage, trip_cost, distance, fuel_price, target_date, source):
    """หักงบ branch central/department (trip_cost>0) — หา budget แล้ว deduct หรือ flash
    เตือนถ้าไม่พบ/เกินเพดาน → คืน [(text, category), ...] (extract จาก close_trip ตอน
    Phase 3 correction — เกิน 60 บรรทัด, logic เดิม 100%)"""
    flash_messages = []
    budget, _key_label = _lookup_budget_for_booking(booking, on_date=target_date)
    if budget:
        budget_svc.deduct_for_mileage(
            mileage, budget, trip_cost,
            snap={'distance': distance,
                  'fuel_rate': float(booking.assigned_vehicle.fuel_rate) if booking.assigned_vehicle else None,
                  'fuel_price': fuel_price},
            note=f'{source} booking #{booking.id}',
        )
        if float(budget.remaining) < 0:
            _log.warning(
                '[budget-over] booking #%s budget #%s remaining=%.2f',
                booking.id, budget.id, float(budget.remaining))
            flash_messages.append((
                f'⚠️ งบ "{_key_label or budget.id}" ใช้เกินเพดานแล้ว '
                f'(เกิน {abs(float(budget.remaining)):,.2f} บาท) — โปรดเติมงบหรือตรวจสอบ',
                'warning'))
    else:
        _log.warning(
            '[budget-deduct skip] booking #%s (%s): ไม่พบงบ active ครอบวันปิดทริป '
            '(expense_type=%s, key_label=%s, on_date=%s, trip_cost=%s)',
            booking.id, source, booking.expense_type, _key_label, target_date, trip_cost,
        )
        flash_messages.append((
            f'⚠️ ปิดทริป #{booking.id} แล้ว แต่ไม่ได้หักงบ '
            f'(ไม่พบงบ {booking.expense_type} ของ "{_key_label or "—"}" '
            f'ที่เปิดใช้ครอบวันที่ {target_date.strftime("%d/%m/%Y")})',
            'warning'))
    _n_budget(booking, trip_cost, booking.expense_type)
    db.session.commit()
    return flash_messages


def close_trip(booking, mileage, source):
    """หักงบ / แจ้งจ่ายส่วนตัวเมื่อปิดทริป. source = ชื่อ route caller (ใส่ใน note/log).
    เดิมชื่อ deduct_budget_for_trip (views/vehicle/vehicle_common.py) — logic เดิม 100%
    เปลี่ยนแค่กลไก flash(): คืน flash_messages ให้ route flash เอง แทนเรียก flash() ตรง
    ในนี้ (มติ Phase 3 checkpoint — testability)
    คืน dict: {'trip_cost': float, 'flash_messages': [(text, category), ...]}"""
    flash_messages = []
    if not mileage:
        return {'trip_cost': 0, 'flash_messages': flash_messages}

    distance    = (mileage.odometer_end - mileage.odometer_start) if (mileage.odometer_end and mileage.odometer_start) else None
    target_date = mileage.actual_end.date() if mileage.actual_end else get_bkk_time().date()
    fuel_price  = get_fuel_price(target_date)
    trip_cost   = calc_fuel_cost(booking.assigned_vehicle, distance, fuel_price, mileage.fuel_cost)

    if booking.trip_department and booking.expense_type in ('central', 'department') and trip_cost > 0:
        flash_messages = _deduct_central_or_department(
            booking, mileage, trip_cost, distance, fuel_price, target_date, source)
    elif booking.expense_type in ('central', 'department'):
        _log.warning(
            '[budget-deduct skip] booking #%s (%s): ข้ามการหักงบ '
            '(trip_department=%s, expense_type=%s, trip_cost=%s)',
            booking.id, source, booking.trip_department, booking.expense_type, trip_cost,
        )
        if trip_cost == 0:
            flash_messages.append((
                f'⚠️ ปิดทริป #{booking.id} แล้ว แต่ไม่ได้หักงบ '
                f'(trip_cost = 0 — ตรวจ fuel_cost หรือ vehicle.fuel_rate)',
                'warning'))
    elif booking.expense_type == 'personal' and trip_cost > 0:
        _n_payment_required(booking, mileage, trip_cost)
        db.session.commit()

    # แจ้ง admin สำหรับทริปส่วนตัว + ad-hoc (admin ต้องเห็นเพื่อยืนยันการชำระ/ตรวจสอบ)
    if trip_cost > 0 and (booking.expense_type == 'personal' or booking.is_ad_hoc):
        _n_admin_personal(booking, trip_cost)
        db.session.commit()

    return {'trip_cost': trip_cost, 'flash_messages': flash_messages}


def auto_close_stale_trips(vehicle_id, new_odo_start, before_dt, exclude_booking_id, *, actor_id):
    """ปิดทริปค้าง (มี odo_start ไม่มี odo_end) ของรถคันนี้ที่เริ่มก่อน before_dt
    โดยใช้ new_odo_start เป็น odo_end หักงบ + gen OT ให้ทริปที่ปิด.
    ปิดเฉพาะทริปค้างล่าสุด 1 ตัว (odo_start ใหม่ต่อจากทริปก่อนหน้าทันที).
    เดิมชื่อ _auto_close_stale_trips (vehicle_common.py) — logic เดิม 100%
    คืน [(text, category), ...] จาก close_trip() ภายใน ให้ route flash เอง (เดิมไม่มี
    flash ของตัวเอง มีแค่ logger.warning เมื่อ skip)"""
    if not vehicle_id or new_odo_start is None:
        return []
    stale = (VehicleMileage.query
             .join(VehicleBooking, VehicleMileage.booking_id == VehicleBooking.id)
             .filter(VehicleBooking.assigned_vehicle_id == vehicle_id,
                     VehicleBooking.id != exclude_booking_id,
                     VehicleBooking.status == 'approved',
                     VehicleMileage.odometer_start.isnot(None),
                     VehicleMileage.odometer_end.is_(None),
                     VehicleMileage.actual_start < before_dt)
             .order_by(VehicleMileage.actual_start.desc())
             .first())
    if not stale:
        return []
    if new_odo_start <= stale.odometer_start:
        _log.warning(
            '[auto-close skip] mileage #%s: new_odo %s <= start %s',
            stale.id, new_odo_start, stale.odometer_start)
        return []
    sb = stale.booking
    stale.odometer_end = new_odo_start
    stale.actual_end   = sb.end_datetime
    db.session.flush()
    auto_generate_ot(sb, stale, actor_id=actor_id, notify=False)
    result = close_trip(sb, stale, source='auto_close')
    _log.info('[auto-close] booking #%s closed by odo %s', sb.id, new_odo_start)
    return result['flash_messages']


def override_fuel_cost(mileage, new_fuel_cost, *, actor_username):
    """Override ค่าน้ำมัน field มือ + rededuct งบถ้าเคยหักไปแล้ว (ไม่สร้าง deduct ครั้งแรก
    — ตาม behavior เดิมของ override_fuel() route ทุกจุด)
    เดิมอยู่ใน views/vehicle/vehicle_cost.py::override_fuel() ตรง — ย้าย business logic
    ส่วนนี้เข้า service, route เหลือ parse form + เรียกนี้ + commit + flash

    BUG-2 (พบ Phase 3, แก้ Phase 3.5, 2026-07-19): snap fuel_price ใช้ราคาจริงจาก
    get_fuel_price(target_date) แทน None เดิม — ledger ของการ override มีข้อมูลราคาน้ำมัน
    อ้างอิงไว้ audit ได้ (ไม่กระทบยอดเงินที่หัก — ยังใช้ new_fuel_cost ตรงจากฟอร์มเหมือนเดิม
    เป็นตัวหักงบ ไม่ผ่าน calc_fuel_cost())"""
    mileage.fuel_cost = new_fuel_cost
    if mileage.id and mileage.last_budget_log_id:
        booking = mileage.booking
        target_date = mileage.actual_end.date() if mileage.actual_end else get_bkk_time().date()
        if booking and booking.trip_department and booking.expense_type in ['central', 'department']:
            budget, _ = _lookup_budget_for_booking(booking, on_date=target_date)
            if budget:
                budget_svc.rededuct_for_mileage(
                    mileage, budget, new_fuel_cost,
                    snap={'distance': (mileage.odometer_end - mileage.odometer_start)
                          if (mileage.odometer_end and mileage.odometer_start) else None,
                          'fuel_rate': float(booking.assigned_vehicle.fuel_rate) if booking.assigned_vehicle else None,
                          'fuel_price': get_fuel_price(target_date)},
                    note=f'override_fuel by {actor_username} → {new_fuel_cost}',
                )
