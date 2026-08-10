"""
ot.py — OT slot calculation (pure logic, ไม่แตะ ORM/flask)

**build_slot() = จุดเดียวในระบบที่คิดเงิน OT** — คู่ขนานกับ calc_fuel_cost() ใน fuel.py
ทุกทางที่สร้าง DriverOTSlot ต้องเรียกผ่านนี่ 100% ห้าม inline สูตรเอง:
  · ระบบสร้างเองตอนปิดทริป → build_ot_specs() (services/vehicle/mileage_service.py)
  · แอดมินกรอกเองในโมดัล    → views/vehicle/vehicle_cost.py::_parse_ot_slots()
  · preview ฝั่ง client      → static/vehicle/js/vehicle_ot.js (สูตรเดียวกัน คนละภาษา)
เดิม 2 ทางแรกคิดคนละสูตร: ทาง manual ตีความ rate ที่ผูก day_of_week เป็น "เหมาจ่ายทั้งวัน"
แต่ทาง auto คูณชั่วโมงจริง — ทริปเดียวกันได้เงินคนละยอด (แก้ 2026-07-28)

กติกา OT ที่เจ้าของโปรเจกต์เคาะ:
1. ทริปสั้นกว่า OT_MIN_TRIP_MINUTES (30 นาที) → ไม่คิด OT เลย (2026-07-27)
   เดิมทริป 1 นาทีก็ได้ slot 0.02 ชม. = 0.40 บาท ซึ่งไม่มีความหมายทางบัญชี
2. เงินปัดเป็นจำนวนเต็มบาท (เศษสตางค์ = 0) — หน้าจอแสดงเลขเต็มบาทอยู่แล้ว (2026-07-27)
3. slot ต้องอยู่ในกรอบเวลาทริปเสมอ + ทริปต้องยังผ่านเกณฑ์ข้อ 1 → slots_match_trip()
   ใช้ตรวจ OT เก่าที่เวลาทริปถูกแก้ทีหลัง (auto_generate_ot idempotent จึงไม่คำนวณใหม่)
4. หน่วยของ rate อยู่ที่ `OTRateConfig.rate_type` (2026-08-07 — เดิม 2026-07-28 บังคับ
   รายชั่วโมงอย่างเดียว): `hourly` = บาท/ชม. · `flat_day` = เหมาจ่ายรายวัน
   `day_of_week` ยังเป็นแค่ตัวเลือกว่าวันนั้นใช้ชุดอัตราไหน (ดู _select_rate_configs_for_weekday)
   **ไม่ได้แปลว่าเหมาจ่าย** — ต้องตั้ง rate_type='flat_day' เองถึงจะเหมา
5. เงินคูณจาก **นาทีจริง** ไม่ใช่ชั่วโมงที่ปัดทศนิยม 2 ตำแหน่งแล้ว — เดิมทริป 1 นาที
   × 300 บาท/ชม. ได้ 6 บาทแทนที่จะเป็น 5 เพราะปัด 0.0167 → 0.02 ก่อนคูณ (2026-07-28)
   `hours` ที่เก็บลง slot จึงเป็นตัวเลขไว้ **แสดงผล** เท่านั้น ห้ามเอาไปคูณเงินต่อ
6. `flat_day` = เหมาจ่ายต่อ **วัน** ไม่ใช่ต่อทริป (เจ้าของเคาะ 2026-08-07) — คนขับคนเดียว
   ขับหลายทริปในวันเดียวได้เงินก้อนนี้ครั้งเดียว. domain ไม่รู้ว่า "เก็บไปแล้วหรือยัง"
   (เป็น state ใน DB) → caller ส่ง `claimed_flat_ids` เข้ามา แล้ว build_ot_specs() จะสร้าง
   slot ที่ `charge=False` (amount=0) ให้ทริปที่ 2+ เอง — เก็บประวัติว่าขับ แต่ไม่คิดเงินซ้ำ
"""

OT_MIN_TRIP_MINUTES = 30
"""ทริปที่สั้นกว่านี้ไม่คิด OT (เจ้าของโปรเจกต์เคาะ 2026-07-27)"""

RATE_HOURLY   = 'hourly'
RATE_FLAT_DAY = 'flat_day'
"""หน่วยของ OTRateConfig.rate — ดูกติกา 6"""


def hm_to_min(hm: str) -> int:
    """'17:30' → 1050. '24:00' → 1440 (rate band ใช้แทนเที่ยงคืนของวันถัดไป)"""
    h, m = hm.split(':')
    return int(h) * 60 + int(m)


def min_to_hm(minutes: int) -> str:
    """1050 → '17:30'"""
    return f'{minutes // 60:02d}:{minutes % 60:02d}'


def trip_qualifies_for_ot(trip_start_min: int, trip_end_min: int) -> bool:
    """ทริปยาวพอจะคิด OT ไหม — กติกา 1"""
    return (trip_end_min - trip_start_min) >= OT_MIN_TRIP_MINUTES


def calc_slot_hours(minutes: int) -> float:
    """นาที → ชั่วโมงสำหรับ **แสดงผล** (2 ตำแหน่ง) — ห้ามเอาไปคูณเงิน ดูกติกา 5"""
    return round(minutes / 60, 2)


def calc_slot_amount(minutes: int, rate: float, rate_type: str = RATE_HOURLY) -> int:
    """ค่า OT ของช่วงหนึ่ง เป็นจำนวนเต็มบาท — กติกา 2 + 5 + 6

    hourly   → คูณจากนาทีจริงแล้วค่อยปัด (เทียบ calc_fuel_cost: ระยะทางจริง ÷ อัตรา × ราคา)
    flat_day → คืน rate เต็มจำนวน ไม่สนใจว่าทับ band กี่นาที (เหมาจ่าย)
    """
    if rate_type == RATE_FLAT_DAY:
        return int(round(float(rate)))
    return int(round((minutes / 60) * float(rate)))


def build_slot(label, start_time: str, end_time: str, rate, config_id=None,
               rate_type: str = RATE_HOURLY, charge: bool = True):
    """1 ช่วง OT → dict พร้อม hours/amount ที่คิดแล้ว — **จุดเดียวที่คิดเงิน OT ในระบบ**
    คืน None ถ้าช่วงเวลาไม่ถูกต้อง (end <= start)

    start_time/end_time = 'HH:MM' ('24:00' = เที่ยงคืน ใช้ในปลายของ rate band)
    charge=False → สร้าง slot ตามปกติแต่ amount=0 ใช้กับ flat_day ที่เก็บเงินไปแล้วใน
      ทริปก่อนหน้าของวันเดียวกัน (กติกา 6) — เก็บประวัติว่าขับจริง แต่ไม่คิดเงินซ้ำ
    """
    start_min = hm_to_min(start_time)
    end_min   = 1440 if end_time == '24:00' else hm_to_min(end_time)
    minutes   = end_min - start_min
    if minutes <= 0:
        return None
    return {
        'config_id':  config_id,
        'label':      label,
        'start_time': start_time,
        'end_time':   end_time,
        'minutes':    minutes,
        'hours':      calc_slot_hours(minutes),
        'rate':       float(rate),
        'rate_type':  rate_type,
        'amount':     calc_slot_amount(minutes, rate, rate_type) if charge else 0,
    }


def build_ot_specs(rate_bands, trip_start_min: int, trip_end_min: int,
                   claimed_flat_ids=frozenset()) -> list[dict]:
    """overlap ของแต่ละ rate band กับช่วงทริป → list[dict] (เงินคิดที่ build_slot)
    rate_bands = [(label, start_time, end_time, rate, config_id, rate_type), ...]
    (tuple ไม่ใช่ ORM object — domain ห้ามรู้จัก model). คืน [] ถ้าทริปสั้นเกินเกณฑ์

    claimed_flat_ids = config_id ของ band แบบ flat_day ที่ "คนขับคนนี้ วันนี้" เก็บเงินไปแล้ว
      จากทริปก่อนหน้า → slot ที่ออกมาจะ amount=0 (กติกา 6) caller เป็นคน query มาให้
    """
    if not trip_qualifies_for_ot(trip_start_min, trip_end_min):
        return []

    specs = []
    for label, start_time, end_time, rate, config_id, rate_type in rate_bands:
        band_s = hm_to_min(start_time)
        band_e = 1440 if end_time == '24:00' else hm_to_min(end_time)

        ov_s = max(trip_start_min, band_s)
        ov_e = min(trip_end_min, band_e)
        if ov_e <= ov_s:
            continue
        charge = not (rate_type == RATE_FLAT_DAY and config_id in claimed_flat_ids)
        slot = build_slot(label, min_to_hm(ov_s), min_to_hm(ov_e), rate, config_id,
                          rate_type=rate_type, charge=charge)
        if slot:
            specs.append(slot)
    return specs


def slots_match_trip(slot_times, trip_start_min: int, trip_end_min: int) -> bool:
    """OT ที่บันทึกไว้ยังสอดคล้องกับเวลาทริปปัจจุบันไหม — กติกา 3
    slot_times = [(start_time, end_time), ...] จาก DriverOTSlot ที่บันทึกไว้

    False = ค่า OT ก้อนนี้คำนวณจากเวลาทริปคนละชุดกับที่เก็บอยู่ตอนนี้ → เชื่อตัวเลขไม่ได้
      · slot หลุดกรอบทริป (เคสจริง 2026-07-27: ทริป 15:59-16:00 แต่ slot 08:53-19:53
        = 11 ชม. → จ่าย 220 บาทให้งาน 1 นาที)
      · ทริปถูกแก้จนไม่ผ่านเกณฑ์ 30 นาทีแล้ว แต่ยังมี slot ค้างอยู่ — เคสนี้ slot อยู่ใน
        กรอบทริปพอดีจึงเคยรอดการตรวจ (เคสจริง 2026-07-28: ทริป 14:39-14:40 = 6 บาท)
    """
    if not slot_times:
        return True  # ไม่มี slot = ไม่มีอะไรให้ขัดกัน
    if not trip_qualifies_for_ot(trip_start_min, trip_end_min):
        return False
    return all(
        trip_start_min <= hm_to_min(s) and hm_to_min(e) <= trip_end_min
        for s, e in slot_times
    )
