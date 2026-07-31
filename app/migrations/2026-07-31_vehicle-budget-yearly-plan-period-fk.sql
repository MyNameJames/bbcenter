-- 2026-07-31: vehicle-budget-yearly-plan-period-fk — explicit date range on the yearly plan
--   + FK link from vehicle_budget to its parent yearly plan
-- Reason: the org's fiscal-year boundary was HARDCODED to "starts March 1" in application code
--   (fiscal_year_start_ad = sel_year if sel_month >= 3 else sel_year - 1, in
--   views/vehicle/vehicle_budget.py) — brittle if the org ever changes its fiscal calendar.
--   Moving the period onto the plan itself (start_date/end_date columns) removes the hardcoding
--   and lets each plan carry its own period (still expected ~12 months in practice, not DB-enforced).
--   Since fiscal_year is no longer the real identity of a plan (a plan's identity is now its own
--   row id + explicit date range), the UNIQUE constraint on fiscal_year is dropped — it becomes a
--   plain display label (still populated, typically start_date's year).
--   vehicle_budget.yearly_plan_id lets each monthly/dept sub-budget link explicitly to the plan it
--   was carved from, instead of being grouped only by an implicit matching fiscal_year value.
--
-- THIS IS A SECOND MIGRATION FILE DATED 2026-07-31 — see also
--   2026-07-31_vehicle-add-vehicle-type.sql (unrelated change, same day)
--
-- SQLite caveat: dropping a UNIQUE constraint requires a full table rebuild (SQLite has no
--   "ALTER TABLE ... DROP CONSTRAINT" / "DROP COLUMN"-style support for constraints) — steps 1-4
--   below do the recreate-and-copy dance for vehicle_budget_yearly_plan.
--
-- NOT NULL caveat: the app-level model marks start_date/end_date NOT NULL for all rows going
--   forward. There may already be an existing row in vehicle_budget_yearly_plan from earlier this
--   session (created with only fiscal_year/total_amount/central_allocation set, no dates yet).
--   Rather than leaving those columns nullable at the DB level (which would silently drift from
--   the model's nullable=False), this migration backfills any pre-existing row using the *same*
--   implicit rule that used to live in application code (start = Mar 1 of fiscal_year, end = the
--   day before Mar 1 of fiscal_year+1, which lands on Feb 28/29 correctly via SQLite's date()) —
--   so the rebuilt table can declare both columns NOT NULL immediately with no orphaned NULLs.
--   This backfill is a ONE-TIME convenience for pre-existing rows only; it is not how new plans
--   are expected to be created going forward (new plans set start_date/end_date explicitly).
--
-- Run: sqlite3 app/instance/portal.db < app/migrations/2026-07-31_vehicle-budget-yearly-plan-period-fk.sql

BEGIN TRANSACTION;

-- 1) Rebuild vehicle_budget_yearly_plan: add start_date/end_date (NOT NULL, backfilled below),
--    drop UNIQUE on fiscal_year (recreate-and-copy — SQLite limitation, see header)
ALTER TABLE vehicle_budget_yearly_plan RENAME TO vehicle_budget_yearly_plan_old;

CREATE TABLE vehicle_budget_yearly_plan (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    fiscal_year         INTEGER       NOT NULL,               -- no longer UNIQUE — display label only
    total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
    central_allocation  NUMERIC(12,2) NOT NULL DEFAULT 0,
    start_date          DATE          NOT NULL,
    end_date            DATE          NOT NULL,
    created_at          DATETIME,
    updated_at          DATETIME
);

-- 2) Copy existing rows, backfilling start_date/end_date from the old implicit march-year rule
--    (one-time convenience for pre-existing rows — see NOT NULL caveat in header)
INSERT INTO vehicle_budget_yearly_plan
    (id, fiscal_year, total_amount, central_allocation, start_date, end_date, created_at, updated_at)
SELECT
    id, fiscal_year, total_amount, central_allocation,
    fiscal_year || '-03-01'                             AS start_date,
    date((fiscal_year + 1) || '-03-01', '-1 day')        AS end_date,
    created_at, updated_at
FROM vehicle_budget_yearly_plan_old;

DROP TABLE vehicle_budget_yearly_plan_old;

-- 3) Add FK column on vehicle_budget → vehicle_budget_yearly_plan (nullable: legacy sub-budgets
--    created before this feature are NOT backfilled — admin deactivates them manually per product
--    decision; new sub-budgets set this explicitly at creation time from a plan dropdown)
ALTER TABLE vehicle_budget ADD COLUMN yearly_plan_id INTEGER REFERENCES vehicle_budget_yearly_plan(id);

-- 4) Index to support lookups/joins by plan (admin UI will list sub-budgets per plan)
CREATE INDEX IF NOT EXISTS ix_vb_yearly_plan ON vehicle_budget(yearly_plan_id);

COMMIT;

-- Verify (run manually after):
-- .schema vehicle_budget_yearly_plan
-- .schema vehicle_budget
-- SELECT id, fiscal_year, start_date, end_date FROM vehicle_budget_yearly_plan;
