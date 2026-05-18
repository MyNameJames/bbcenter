-- 2026-05-18: vehicle-budget-is-active — add is_active toggle to vehicle_budget
-- Reason: ใหม่ feature "ปิดงบ" — admin toggle budget row inactive ผ่าน Budget Manage page
--   * Inactive budgets เก็บ used_amount + vehicle_budget_log เดิมครบ (audit trail ไม่แตะ)
--   * Block flows: approve_booking() (target budget), budget_manage() POST top_up + manual_adjust
--   * KPI strip (total_budget/total_used/total_remaining/pending_count) filter is_active=True
--   * Mileage deduct + refund ไม่ block — booking ที่ออกไปแล้วต้องปิดทริป/คืนงบได้ต่อ
-- Default 1 (TRUE) เพื่อให้ทุก row ที่มีอยู่ usable ต่อ ไม่ต้อง backfill UPDATE แยก
-- nullable=False + server_default='1' รองรับ SQLite ALTER ADD COLUMN กับ row เดิม
--
-- Run: sqlite3 app/instance/portal.db < app/migrations/2026-05-18_vehicle-budget-is-active.sql
-- Verify: sqlite3 app/instance/portal.db ".schema vehicle_budget"

BEGIN TRANSACTION;

-- 1) Add is_active column with default TRUE (existing rows backfill = 1)
ALTER TABLE vehicle_budget ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1;

COMMIT;
