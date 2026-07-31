"""
test_ot_domain.py — domain/vehicle/ot.py (pure logic, ไม่แตะ DB)

คลุมกติกา OT ที่เจ้าของโปรเจกต์เคาะ:
  1. ทริป < 30 นาที ไม่คิด OT                                    (2026-07-27)
  2. เงินเป็นจำนวนเต็มบาท (เศษสตางค์ปัดทิ้ง)                      (2026-07-27)
  3. slot ต้องอยู่ในกรอบทริป + ทริปต้องยังผ่านเกณฑ์ข้อ 1          (2026-07-27/28)
  4. rate หน่วยเดียว = บาท/ชม. — build_slot() คิดเงินที่เดียวทั้งระบบ (2026-07-28)
  5. เงินคูณจากนาทีจริง ไม่ใช่ชั่วโมงที่ปัดแล้ว                     (2026-07-28)
"""
import pytest

from domain.vehicle.ot import (OT_MIN_TRIP_MINUTES, build_ot_specs, build_slot,
                               calc_slot_amount, calc_slot_hours, hm_to_min,
                               min_to_hm, slots_match_trip, trip_qualifies_for_ot)

ALL_DAY  = [('ทั้งวัน', '00:00', '24:00', 20, 1)]
EVENING  = [('หลังเลิกงาน', '17:00', '24:00', 20, 2)]


# ── กติกา 1: เกณฑ์ 30 นาที ───────────────────────────────────
@pytest.mark.parametrize('minutes, expected', [
    (1, False), (29, False), (30, True), (31, True), (480, True),
])
def test_trip_qualifies_at_30_min_boundary(minutes, expected):
    assert trip_qualifies_for_ot(600, 600 + minutes) is expected


def test_short_trip_produces_no_slots():
    """เคสจริงที่ทำให้ตั้งกฎนี้: ทริป 17:21-17:22 เคยได้ OT 0.02 ชม. = 0.40 บาท"""
    assert build_ot_specs(ALL_DAY, hm_to_min('17:21'), hm_to_min('17:22')) == []


def test_trip_exactly_at_threshold_produces_slots():
    specs = build_ot_specs(ALL_DAY, hm_to_min('17:00'), hm_to_min('17:30'))
    assert len(specs) == 1
    assert specs[0]['hours'] == 0.5


# ── กติกา 2: เงินเต็มบาท ─────────────────────────────────────
@pytest.mark.parametrize('minutes, rate, expected', [
    (1,   20,  0),    # 0.33 บาท → 0
    (30,  20, 10),
    (120, 20, 40),
    (91,  20, 30),    # 30.33 → 30
    (105, 20, 35),
])
def test_amount_is_whole_baht(minutes, rate, expected):
    amount = calc_slot_amount(minutes, rate)
    assert amount == expected
    assert isinstance(amount, int)


# ── กติกา 5: คูณจากนาทีจริง ไม่ใช่ชั่วโมงที่ปัดแล้ว ──────────────
def test_amount_uses_real_minutes_not_rounded_hours():
    """เคสจริง 2026-07-28: 1 นาที × 300 บาท/ชม. = 5 บาท
    เดิมปัด 0.0167 → 0.02 ชม. ก่อนคูณ ได้ 6 บาท (เกินจริง 20%)"""
    assert calc_slot_hours(1) == 0.02          # ตัวเลขแสดงผลยังปัดเหมือนเดิม
    assert calc_slot_amount(1, 300) == 5       # แต่เงินคิดจากนาทีจริง


def test_hours_field_is_display_only():
    slot = build_slot('วันอาทิตย์', '14:39', '14:40', 300)
    assert slot['minutes'] == 1
    assert slot['hours']   == 0.02
    assert slot['amount']  == 5


# ── กติกา 4: build_slot = จุดเดียวที่คิดเงิน ─────────────────
def test_build_slot_is_per_hour_regardless_of_config():
    """rate ทุกแถวหน่วยเดียว = บาท/ชม. — เดิมทาง manual ตีความ rate ที่ผูก
    day_of_week เป็นเหมาจ่ายรายวัน ทำให้ทริป 3 ชม. วันอาทิตย์ได้ 300 แทน 900"""
    assert build_slot('วันอาทิตย์', '09:00', '12:00', 300)['amount'] == 900


def test_build_slot_rejects_reversed_range():
    assert build_slot('เย็น', '19:00', '17:00', 20) is None
    assert build_slot('เย็น', '17:00', '17:00', 20) is None


def test_build_slot_accepts_2400_as_midnight():
    assert build_slot('ดึก', '22:00', '24:00', 20)['minutes'] == 120


def test_specs_carry_whole_baht_amounts():
    specs = build_ot_specs(EVENING, hm_to_min('16:00'), hm_to_min('19:30'))
    assert [s['amount'] for s in specs] == [50]      # 17:00-19:30 = 2.5 ชม. × 20
    assert specs[0]['start_time'] == '17:00'         # clip เข้าแบนด์
    assert specs[0]['end_time']   == '19:30'         # clip เข้าทริป


# ── กติกา 3: slot ต้องอยู่ในกรอบทริป ─────────────────────────
def test_slots_match_when_inside_trip():
    assert slots_match_trip([('17:00', '19:30')], hm_to_min('16:00'), hm_to_min('20:00'))


def test_slots_match_when_exactly_on_trip_edges():
    assert slots_match_trip([('16:00', '20:00')], hm_to_min('16:00'), hm_to_min('20:00'))


def test_slots_mismatch_when_wider_than_trip():
    """เคสจริง 2026-07-27: ทริป 15:59-16:00 แต่ slot 08:53-19:53 = จ่าย 220 บาทให้งาน 1 นาที"""
    assert not slots_match_trip([('08:53', '19:53')], hm_to_min('15:59'), hm_to_min('16:00'))


def test_slots_mismatch_when_any_one_slot_escapes():
    assert not slots_match_trip(
        [('17:00', '19:00'), ('19:00', '23:00')], hm_to_min('16:00'), hm_to_min('20:00'))


def test_no_slots_is_not_a_mismatch():
    assert slots_match_trip([], hm_to_min('15:59'), hm_to_min('16:00'))


def test_slots_mismatch_when_trip_no_longer_qualifies():
    """เคสจริง 2026-07-28: ทริป 14:39-14:40 slot ตรงกรอบเป๊ะจึงเคยรอดการตรวจ
    ทั้งที่ทริปสั้นกว่าเกณฑ์ 30 นาที → OT 6 บาทค้างอยู่ ไม่มีอะไรไปลบ"""
    assert not slots_match_trip(
        [('14:39', '14:40')], hm_to_min('14:39'), hm_to_min('14:40'))


# ── helper ───────────────────────────────────────────────────
def test_hm_round_trip():
    for hm in ('00:00', '08:53', '17:30', '23:59'):
        assert min_to_hm(hm_to_min(hm)) == hm


def test_band_end_2400_covers_to_midnight():
    specs = build_ot_specs(EVENING, hm_to_min('22:00'), hm_to_min('23:59'))
    assert specs[0]['end_time'] == '23:59'   # clip ที่ปลายทริป ไม่ใช่ 24:00


def test_threshold_constant_is_30():
    """กันแก้ค่าโดยไม่ตั้งใจ — เกณฑ์นี้ตกลงกับเจ้าของโปรเจกต์ไว้"""
    assert OT_MIN_TRIP_MINUTES == 30
