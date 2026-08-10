-- 2026-08-07: ot-rate-config-rate-type — เพิ่ม rate_type ให้ตาราง ot_rate_config
--   + ซ่อมข้อมูล band ที่ตั้งค่าไว้แล้วใช้งานไม่ได้จริง (band 5 วันอาทิตย์ · band 6 กลางคืน)
--
-- Reason (บั๊กเงินจริง 2 ตัวที่ active อยู่ ตรวจพบ 2026-08-07):
--   B1) band "วันอาทิตย์" ตั้ง start_time='00:00' end_time='00:00' rate=300 day_of_week=6
--       → build_ot_specs() (app/domain/vehicle/ot.py) คำนวณ band_e = 0 (ไม่ใช่ 1440 เพราะ
--         '00:00' ไม่ตรงเงื่อนไข end_time=='24:00') → ov_e > ov_s เป็นเท็จเสมอ → ไม่มี slot
--       → OT วันอาทิตย์ = 0 บาท และเพราะ _select_rate_configs_for_weekday() เจอ band ของ
--         weekday แล้วจะไม่ fallback ไป band ทั่วไป → วันอาทิตย์ไม่ได้แม้แต่เรท 20 บาท/ชม.
--       แก้ end_time เป็น '24:00' เฉยๆ ไม่ได้ เพราะจะกลายเป็น 300 บาท × ชั่วโมงจริง
--       (ทริป 5 ชม. = 1,500 บาท) ทั้งที่เจตนาคือ "เหมาทั้งวัน 300" → ต้องมี rate_type
--   B2) band "เลยเกินไป" 19:00–06:00 (end < start = ข้ามเที่ยงคืน) → minutes ติดลบ
--       → build_slot() คืน None → ไม่เคยสร้าง slot ได้เลย (ยืนยัน: 0 แถวใน driver_ot_slot
--         ที่ rate_config_id=6) และ band 3/4 ที่เขียนถูก (แยก 2 ท่อน) ดันถูกปิดไป
--       → ช่วง 19:00–06:00 ไม่ได้ OT เลย
--       ระบบห้ามจองข้ามวันอยู่แล้ว (book_vehicle_simple) → ทริปจบในวันเดียวเสมอ
--       → band ข้ามเที่ยงคืนไม่มีความหมาย แยก 2 ท่อนคือรูปแบบที่ถูกต้อง
--
-- Semantics ของ rate_type:
--   'hourly'   = บาท/ชั่วโมง — amount = (นาทีที่ทับ band / 60) × rate   [เดิม, default]
--   'flat_day' = เหมาจ่ายต่อ "วัน" — amount = rate เต็มจำนวน ไม่คูณเวลา
--                และคิดครั้งเดียวต่อ (คนขับ, วันที่, band) แม้ขับหลายทริปในวันนั้น
--                ทริปที่ 2+ ของวันเดียวกันได้ slot ที่ amount=0 (เก็บประวัติว่าขับจริง
--                แต่ไม่คิดเงินซ้ำ) — ดู claimed_flat_configs() ใน
--                app/services/vehicle/mileage_service.py
--
-- Backfill: แถวเดิมทั้งหมด → 'hourly' (พฤติกรรมเดิม 100% ไม่มีอะไรเปลี่ยนค่า)
--           ยกเว้น band "วันอาทิตย์" ที่ตั้งใจเป็นเหมาจ่ายมาตั้งแต่ต้น → 'flat_day'
--
-- ผลกับข้อมูลเดิม: OT ที่คำนวณไปแล้วไม่ถูกแตะ (DriverOTSlot เก็บ amount เป็น snapshot)
--   OT-2026-0008 (7 มิ.ย. 69, วันอาทิตย์, 300 บาท) ยังถูกต้องอยู่ — ถูกสร้างก่อน refactor
--   2026-07-28 ตอนที่สูตรยังตีความ day_of_week เป็นเหมาจ่าย
--
-- รันด้วย: sqlite3 app/instance/portal.db < app/migrations/2026-08-07_ot-rate-config-rate-type.sql

BEGIN TRANSACTION;

-- 1) คอลัมน์ใหม่ — หน่วยของ rate
ALTER TABLE ot_rate_config ADD COLUMN rate_type VARCHAR(10) DEFAULT 'hourly';

-- 2) backfill กัน NULL ค้าง (SQLite เติม DEFAULT ให้แถวเดิมอยู่แล้ว)
UPDATE ot_rate_config SET rate_type = 'hourly' WHERE rate_type IS NULL;

-- 3) B1 — band วันอาทิตย์: ประกาศเป็นเหมาจ่ายรายวัน + ขยายช่วงให้ครอบทั้งวันจริง
--    ('24:00' คือรูปแบบที่ hm_to_min()/build_ot_specs() รองรับสำหรับเที่ยงคืนปลายวัน)
UPDATE ot_rate_config
   SET rate_type = 'flat_day', start_time = '00:00', end_time = '24:00'
 WHERE label = 'วันอาทิตย์' AND day_of_week = 6;

-- 4) B2 — คืนชีพ band กลางคืนที่เขียนถูก (แยก 2 ท่อน) แล้วปิดตัวที่ข้ามเที่ยงคืน
UPDATE ot_rate_config SET is_active = 1
 WHERE label IN ('วิกาล (หลัง 19:00)', 'วิกาล (ก่อน 06:00)');
UPDATE ot_rate_config SET is_active = 0
 WHERE label = 'เลยเกินไป' AND start_time = '19:00' AND end_time = '06:00';

COMMIT;

-- Verify (run manually after):
-- SELECT id, label, start_time, end_time, rate, day_of_week, is_active, rate_type
--   FROM ot_rate_config ORDER BY sort_order;
--   คาดหวัง: วันอาทิตย์ = 00:00–24:00 flat_day is_active=1
--            วิกาล 2 แถว is_active=1 · "เลยเกินไป" is_active=0
--            ที่เหลือ rate_type='hourly'
