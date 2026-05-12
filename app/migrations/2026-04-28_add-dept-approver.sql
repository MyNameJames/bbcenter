-- Migration: add dept_approver junction table
-- Date: 2026-04-28
-- Run: sqlite3 app/instance/portal.db < app/migrations/2026-04-28_add-dept-approver.sql
--
-- Reason: Replaces string-based role_vehicle='approver' logic with a proper
--         many-to-many junction table (User <-> VehicleDepartment).
--         An approver can now be assigned to multiple departments, and is
--         matched to a booking via VehicleBooking.trip_department_id.

BEGIN TRANSACTION;

-- ── 1. New table ──
CREATE TABLE IF NOT EXISTS dept_approver (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES "user" (id),
    dept_id INTEGER NOT NULL REFERENCES vehicle_department (id),
    CONSTRAINT uq_dept_approver UNIQUE (user_id, dept_id)
);

-- ── 2. Indexes ──
CREATE INDEX IF NOT EXISTS idx_dept_approver_user
    ON dept_approver (user_id);

CREATE INDEX IF NOT EXISTS idx_dept_approver_dept
    ON dept_approver (dept_id);

COMMIT;

-- Verify (run manually after):
-- .schema dept_approver
