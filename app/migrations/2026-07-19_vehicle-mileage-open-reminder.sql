-- 2026-07-19: vehicle-mileage-open-reminder — เพิ่ม mileage_open_reminder_at ให้ตาราง vehicle_mileage
-- Reason: Phase 3.5 (Clean Architecture masterplan) REQ-3 — cron ใหม่แจ้งเตือน driver เมื่องานค้าง
--   คือกรณี VehicleMileage ถูกบันทึกเริ่มไมล์แล้ว (actual_start/odometer_start มีค่า) แต่ยังไม่ปิด
--   (actual_end/odometer_end ว่าง) ข้ามวันไปแล้ว ต้องมี field guard กันแจ้งซ้ำ
--   * ห้ามใช้ร่วมกับ last_reminder_at เพราะคนละเรื่องกัน:
--     last_reminder_at         = guard cron "เตือนจ่ายเงินส่วนตัว" (check_payment_escalation(), v2.2)
--     mileage_open_reminder_at = guard cron ใหม่ "เตือน driver ยังไม่ปิดไมล์" (REQ-3)
--     ใช้ field เดียวกัน = สอง cron เขียนทับ guard กัน ทำให้แจ้งซ้ำผิดจังหวะ/พลาดแจ้งเตือน
-- Semantics: NULL = ยังไม่เคยแจ้งเตือนเรื่องนี้ / มีค่า = แจ้งเตือนล่าสุดเมื่อไหร่ (guard กันแจ้งซ้ำวันเดียวกัน)
-- รันด้วย: sqlite3 app/instance/portal.db < app/migrations/2026-07-19_vehicle-mileage-open-reminder.sql

BEGIN TRANSACTION;

-- 1) กันแจ้งซ้ำ cron เตือน driver ปิดไมล์ค้าง (แยกจาก last_reminder_at)
ALTER TABLE vehicle_mileage ADD COLUMN mileage_open_reminder_at DATETIME;

COMMIT;

-- Verify (run manually after):
-- .schema vehicle_mileage
