-- 2026-05-18: ot-rate-config-day-of-week — add per-weekday override column to ot_rate_config
-- Reason: รองรับ override อัตรา OT รายวัน (เช่น วันอาทิตย์เหมา 300 ฿/hr)
--   * NULL = applies to any day of week (default behaviour — backward compat)
--   * 0=Monday ... 6=Sunday (matches Python datetime.weekday())
--   * auto_generate_ot() (vehicle_view.py:1644) lookup logic:
--       - ถ้ามี row ที่ day_of_week ตรงกับ booking weekday → ใช้เฉพาะ row override นั้น
--       - ถ้าไม่มี match → fallback ใช้ row ที่ day_of_week IS NULL (rows ปัจจุบันทั้งหมด)
-- nullable=True ไม่ต้อง backfill — existing rows จะเป็น NULL = weekday-agnostic อัตโนมัติ
--
-- Run: sqlite3 app/instance/portal.db < app/migrations/2026-05-18_ot-rate-config-day-of-week.sql
-- Verify: sqlite3 app/instance/portal.db ".schema ot_rate_config"

BEGIN TRANSACTION;

-- 1) Add day_of_week column (nullable, NULL = any day)
ALTER TABLE ot_rate_config ADD COLUMN day_of_week INTEGER NULL;

COMMIT;
