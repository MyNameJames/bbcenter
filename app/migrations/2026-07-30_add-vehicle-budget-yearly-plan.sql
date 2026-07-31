-- 2026-07-30: add-vehicle-budget-yearly-plan — new table `vehicle_budget_yearly_plan`
-- Reason: หน้า vehicle_budget.html เพิ่ม UI "เงินก้อนประจำปี" (เดิม mockup) ต้องการชั้นเงินก้อนใหญ่
--         เหนือ VehicleBudget ย่อยเดิม เพื่อกันตั้งงบย่อยรวมกันเกินเงินที่มีจริง — เก็บเพดานรวมทั้งปี
--         (total_amount) + เพดานที่แบ่งให้ส่วนกลาง (central_allocation) ต่อ fiscal_year เดียว
--         ส่วนกอง (dept_allocation) ไม่เก็บเป็น column — คำนวณจาก total - central เสมอ (ดู model @property)
-- Run: sqlite3 app/instance/portal.db < app/migrations/2026-07-30_add-vehicle-budget-yearly-plan.sql
-- Note: query/read-only รอบนี้ — ยังไม่มี mutation logic (ปุ่ม "ตั้งงบใหม่"/"แก้ไขก้อนเงิน" ยังเป็น mockup)
--       ไม่ seed ข้อมูล — ตารางว่างเปล่าหลัง migrate; view/template จัดการ empty state เอง

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS vehicle_budget_yearly_plan (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    fiscal_year         INTEGER      NOT NULL UNIQUE,
    total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
    central_allocation  NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at          DATETIME,
    updated_at          DATETIME
);

COMMIT;
