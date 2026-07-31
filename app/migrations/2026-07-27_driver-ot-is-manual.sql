-- 2026-07-27: driver-ot-is-manual — เพิ่ม is_manual ให้ตาราง driver_ot
-- Reason: ค่า OT ถูกสร้างอัตโนมัติตอนปิดทริป (auto_generate_ot) และเดิม idempotent ต่อ booking
--   → ถ้าแอดมินแก้เวลาทริปทีหลัง ค่า OT ไม่เคยถูกคำนวณใหม่
--   เคสจริง: ทริป 15:59–16:00 (1 นาที) แต่ OT ค้างที่ 11 ชม. = 220 บาท
--   2026-07-27 เพิ่ม sync_ot_for_trip() ใน app/services/vehicle/mileage_service.py
--   ให้คำนวณ OT ใหม่เมื่อเวลาทริปเปลี่ยน
--   is_manual = guard: OT ที่แอดมินสร้างเอง (ot_create) หรือแก้เอง (ot_edit)
--   ที่ app/views/vehicle/vehicle_cost.py จะถูกตั้ง True
--   → sync_ot_for_trip() จะไม่คำนวณทับ แต่ขึ้นคำเตือนให้คนตรวจแทน
--   (พฤติกรรมเดียวกับ OT ที่ status='paid')
-- Semantics: 0/False = auto-generated (sync_ot_for_trip คำนวณใหม่ได้)
--            1/True  = แอดมินสร้าง/แก้เอง (ห้ามคำนวณทับ ให้เตือนแทน)
-- Backfill: แถวเดิมทั้งหมด → 0 โดยเจตนา — ถือว่า OT ที่มีอยู่เป็น auto ทั้งหมด
--           เพื่อให้ logic recompute เข้าไปแก้ข้อมูลที่ผิดอยู่ได้
-- รันด้วย: sqlite3 app/instance/portal.db < app/migrations/2026-07-27_driver-ot-is-manual.sql

BEGIN TRANSACTION;

-- 1) guard กัน sync_ot_for_trip() คำนวณทับ OT ที่แอดมินตั้งค่าเอง
ALTER TABLE driver_ot ADD COLUMN is_manual BOOLEAN DEFAULT 0;

-- 2) backfill แถวเดิม → 0 (auto-generated) ให้ recompute logic เข้าไปแก้ค่าที่ผิดได้
--    (SQLite เติม DEFAULT ให้แถวเดิมอยู่แล้ว — statement นี้กัน NULL ค้างไว้ให้ชัวร์)
UPDATE driver_ot SET is_manual = 0 WHERE is_manual IS NULL;

COMMIT;

-- Verify (run manually after):
-- .schema driver_ot
-- SELECT is_manual, COUNT(*) FROM driver_ot GROUP BY is_manual;   -- ควรได้ 0 = ทุกแถว
