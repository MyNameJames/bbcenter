-- 2026-08-06: vehicle-budget-yearly-plan-flexible — allow multiple "envelope" plans
--   (annual + ad-hoc "special budget" e.g. a one-off overseas study-trip budget) to coexist
-- Reason: org wants to create ad-hoc special budgets (own start/end period, own deduction)
--   alongside the regular annual plan without a new table — reuse the existing
--   VehicleBudgetYearlyPlan -> VehicleBudget layering (confirmed safe during design consult,
--   see docs/notes/doc/2026-08-06_budget-flexible-plan.md §0-§2). Deliberately NOT adding a
--   plan_type enum column — `name` stays free text (owner decision, out-of-scope §7).
--
--   1) vehicle_budget_yearly_plan gets 2 new columns:
--      - name: free-text label so admin can tell "งบประมาณประจำปี 2569" apart from
--        "งบพิเศษ ทริปดูงานต่างประเทศ". Simple ADD COLUMN — no rebuild needed.
--      - is_default: marks the single plan that budget_manage auto-selects when no ?plan_id=
--        is given. App-level invariant "at most one is_default=True at a time" is enforced in
--        the service layer (set_default_plan()), NOT a DB constraint. Simple ADD COLUMN.
--
--   2) vehicle_budget's UniqueConstraint changes from
--        (budget_type_id, department_id, year, month)
--      to
--        (budget_type_id, department_id, year, month, yearly_plan_id)
--      Before this, department+type+month was globally unique (1 row). Now a department can
--      have BOTH a regular annual budget row AND an ad-hoc special-budget row landing in the
--      same calendar month, distinguished by which yearly_plan_id (parent envelope) they
--      belong to — these must be separate VehicleBudget rows, not a constraint violation.
--      Legacy rows where yearly_plan_id IS NULL are unaffected: SQL treats each NULL as
--      distinct for uniqueness purposes, so they never collided before and still won't.
--
-- SQLite caveat: changing a UNIQUE constraint requires a full table rebuild (SQLite has no
--   "ALTER TABLE ... DROP CONSTRAINT" support) — same recreate-and-copy technique used in
--   2026-07-31_vehicle-budget-yearly-plan-period-fk.sql for vehicle_budget_yearly_plan. Only
--   vehicle_budget needs the rebuild here; the two new yearly_plan columns are plain ADD COLUMN.
--
-- Backfill: is_default = 0 for all existing plan rows (server_default handles new rows too,
--   set explicitly here for clarity). name stays NULL for existing plans — no default text,
--   admin fills it in via the UI on next edit.
--
-- Run: sqlite3 app/instance/portal.db < app/migrations/2026-08-06_vehicle-budget-yearly-plan-flexible.sql

BEGIN TRANSACTION;

-- 1) vehicle_budget_yearly_plan: add name (free text label) + is_default (auto-select flag)
ALTER TABLE vehicle_budget_yearly_plan ADD COLUMN name VARCHAR(100);
ALTER TABLE vehicle_budget_yearly_plan ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT 0;

-- Explicit backfill for clarity (server_default already covers this for existing rows)
UPDATE vehicle_budget_yearly_plan SET is_default = 0 WHERE is_default IS NULL;
-- name intentionally left NULL for existing rows — admin fills in via UI on next edit

-- 2) Rebuild vehicle_budget: widen UniqueConstraint to include yearly_plan_id so a department
--    can hold both an annual budget row and a special-budget row in the same month
ALTER TABLE vehicle_budget RENAME TO vehicle_budget_old;

CREATE TABLE vehicle_budget (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_type_id   INTEGER       NOT NULL REFERENCES budget_type(id),
    department_id    INTEGER       NOT NULL REFERENCES vehicle_department(id),
    year             INTEGER       NOT NULL,
    month            INTEGER       NOT NULL,
    budget_amount    NUMERIC(12,2) DEFAULT 0,
    used_amount      NUMERIC(12,2) DEFAULT 0,
    approver_id      INTEGER       REFERENCES user(id),
    yearly_plan_id   INTEGER       REFERENCES vehicle_budget_yearly_plan(id),
    start_date       DATE,
    end_date         DATE,
    is_active        BOOLEAN       NOT NULL DEFAULT 1,
    UNIQUE (budget_type_id, department_id, year, month, yearly_plan_id)
);

INSERT INTO vehicle_budget
    (id, budget_type_id, department_id, year, month, budget_amount, used_amount,
     approver_id, yearly_plan_id, start_date, end_date, is_active)
SELECT
    id, budget_type_id, department_id, year, month, budget_amount, used_amount,
    approver_id, yearly_plan_id, start_date, end_date, is_active
FROM vehicle_budget_old;

DROP TABLE vehicle_budget_old;

-- Recreate indexes that existed on the old table (lost on rebuild — same caveat as the v2.26
-- migration that rebuilt vehicle_budget_yearly_plan)
CREATE INDEX IF NOT EXISTS ix_vb_yearly_plan ON vehicle_budget(yearly_plan_id);
CREATE INDEX IF NOT EXISTS ix_vb_active_period
    ON vehicle_budget(department_id, budget_type_id, is_active, start_date, end_date);

COMMIT;

-- Verify (run manually after):
-- .schema vehicle_budget_yearly_plan
-- .schema vehicle_budget
-- SELECT id, name, is_default FROM vehicle_budget_yearly_plan;
