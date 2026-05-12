-- Migration: add vehicle_budget table
-- Date: 2026-04-26
-- Run: sqlite3 app/instance/portal.db < app/migrations/2026-04-26_add-vehicle-budget.sql
--
-- Reason: Approver for vehicle bookings is now managed per-budget-record
--         (VehicleBudget.approver_id) instead of per user role+department.

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS vehicle_budget (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          VARCHAR(100) NOT NULL,
    department    VARCHAR(100) NOT NULL,
    year          INTEGER      NOT NULL,
    month         INTEGER      NOT NULL,
    budget_amount REAL         NOT NULL DEFAULT 0,
    used_amount   REAL         NOT NULL DEFAULT 0,
    approver_id   INTEGER REFERENCES "user" (id)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_budget_dept_year_month
    ON vehicle_budget (department, year, month);

CREATE INDEX IF NOT EXISTS idx_vehicle_budget_approver
    ON vehicle_budget (approver_id);

COMMIT;
