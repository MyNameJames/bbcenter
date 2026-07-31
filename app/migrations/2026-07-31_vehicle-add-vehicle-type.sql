-- 2026-07-31: vehicle-add-vehicle-type — เพิ่ม vehicle_type ให้ตาราง vehicle
-- Reason: addVehicleModal ("เพิ่มรถใหม่", vehicle_fleet.html) redesign เพิ่ม selector
--   "ประเภทรถ" เป็น radio-button chip group (3 ตัวเลือก) — ผู้ใช้ยืนยันว่าต้องเก็บ
--   เป็น DB column จริง ไม่ใช่ UI-only
-- Valid values ที่ UI ส่งมา (ไม่ enforce ที่ DB — validate ที่ UI/controller):
--   pickup | van | truck6
-- Existing rows: ไม่ backfill — nullable, รถเดิมเป็น NULL จนกว่าจะถูกแก้ไข
-- รันด้วย: sqlite3 app/instance/portal.db < app/migrations/2026-07-31_vehicle-add-vehicle-type.sql

BEGIN TRANSACTION;

-- 1) เพิ่มคอลัมน์ประเภทรถ (short-key string ตาม convention เดียวกับ vehicle.status)
ALTER TABLE vehicle ADD COLUMN vehicle_type VARCHAR(20);

COMMIT;

-- Verify (run manually after):
-- .schema vehicle
