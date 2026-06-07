-- 2026-06-06: budget-active-period-backfill — เปลี่ยน vehicle_budget เป็น "งบช่วงเวลา"
-- Reason: งบเดิมผูก year/month แบบแข็ง (1 งบ = 1 เดือน) → ขึ้นเดือนใหม่ที่ยังไม่ตั้งงบ
--   หน้า budget_manage ว่าง + หักงบ/approve หา budget ไม่เจอ. เปลี่ยนให้ active period
--   (start_date–end_date + is_active) เป็นตัวกำหนดการแสดง/หักงบ ข้ามเดือนได้
--   * start_date/end_date มี column อยู่แล้ว (nullable) — migration นี้แค่ BACKFILL ไม่ใช่ schema change
--   * งบเดิม start/end = NULL ~ทั้งหมด → set จาก year/month (วันแรก–วันสุดท้ายของเดือน anchor)
--     เพื่อให้งบเดิมยัง active ครอบเดือนตัวเอง ไม่ตกไป section "คลังงบ" หลัง deploy
--   * year/month คงไว้เป็น anchor (เดือนที่ตั้งงบ) — UniqueConstraint(type,dept,year,month) ไม่แตะ
--   * Idempotent: WHERE start_date IS NULL OR end_date IS NULL → รันซ้ำปลอดภัย
--
-- Run: sqlite3 app/instance/portal.db < app/migrations/2026-06-06_budget-active-period-backfill.sql
-- Verify: sqlite3 app/instance/portal.db "SELECT id,year,month,start_date,end_date FROM vehicle_budget LIMIT 5;"

BEGIN TRANSACTION;

-- 1) Backfill start_date = วันแรกของเดือน anchor (เฉพาะ row ที่ยังไม่กำหนด)
UPDATE vehicle_budget
SET start_date = date(printf('%04d-%02d-01', year, month))
WHERE start_date IS NULL;

-- 2) Backfill end_date = วันสุดท้ายของเดือน anchor
UPDATE vehicle_budget
SET end_date = date(printf('%04d-%02d-01', year, month), '+1 month', '-1 day')
WHERE end_date IS NULL;

-- 3) Index รองรับ _lookup_budget_for_booking() (หางบ active ครอบ date)
CREATE INDEX IF NOT EXISTS ix_vb_active_period
    ON vehicle_budget(department_id, budget_type_id, is_active, start_date, end_date);

COMMIT;
