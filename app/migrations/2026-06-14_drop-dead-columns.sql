-- 2026-06-14: drop-dead-columns — Drop 3 unused columns from vehicle_booking + drop expense_type table
-- Reason:
--   expense_type_id  — FK to expense_type, never written by any controller (always NULL); budget code had
--                      "Bug fix: expense_type_id is NULL" and worked around it entirely via expense_type string
--   snap_department_name — snapshot field added to model but write path never implemented (always NULL)
--   contact_name     — added for ad-hoc trips (v2.11) but write path lost during refactor; always NULL in prod
--   expense_type table — ExpenseType model defined in vehicle_budget.py:18-23, zero .query calls in codebase
--
-- SQLite 3.35+ supports ALTER TABLE DROP COLUMN.
-- All three columns were verified NULL in every existing row (no controller ever wrote to them).
-- FK vehicle_booking.expense_type_id is dropped first, so no FK constraint remains before DROP TABLE.
--
-- Run:  sqlite3 app/instance/portal.db < app/migrations/2026-06-14_drop-dead-columns.sql
-- Verify:
--   sqlite3 app/instance/portal.db ".schema vehicle_booking"
--   sqlite3 app/instance/portal.db ".schema expense_type"

BEGIN TRANSACTION;

-- 1) Drop dead columns from vehicle_booking
--    (SQLite 3.35+ required; column must be NULL-only with no indexes/triggers depending on it)
ALTER TABLE vehicle_booking DROP COLUMN expense_type_id;
ALTER TABLE vehicle_booking DROP COLUMN snap_department_name;
ALTER TABLE vehicle_booking DROP COLUMN contact_name;

-- 2) Drop expense_type table
--    FK vehicle_booking.expense_type_id has been removed above, so no remaining FK references this table.
DROP TABLE IF EXISTS expense_type;

COMMIT;
