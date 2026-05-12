# Migrations Index

> Index ของ `.sql` migration files ทั้งหมดใน folder นี้
> ทุกไฟล์รันแบบ manual: `sqlite3 app/instance/portal.db < <file>`
> ก่อน commit ต้องเทสบน dev DB + verify ด้วย `.schema <table>`

---

## Migration Files

| Date | File | Tables affected | Linked version |
|------|------|-----------------|----------------|
| 2026-04-23 | [2026-04-23_notification-enhance.sql](2026-04-23_notification-enhance.sql) | `notification` (+5 fields), `vehicle_mileage` (+3 fields), indexes | [v2.2](../../docs/notes/database/schema.md#v22--notification-enhance-2026-04-23) |
| 2026-04-26 | [2026-04-26_vehicle-booking-reject-reason.sql](2026-04-26_vehicle-booking-reject-reason.sql) | `vehicle_booking` (+reject_reason) | [v2.3](../../docs/notes/database/schema.md#v23--reject-reason-2026-04-26) |
| 2026-04-26 | [2026-04-26_add-vehicle-budget.sql](2026-04-26_add-vehicle-budget.sql) | `vehicle_budget` (new) | [v2.4](../../docs/notes/database/schema.md#v24--vehiclebudget-new-table-2026-04-26) |
| 2026-04-28 | [2026-04-28_add-dept-approver.sql](2026-04-28_add-dept-approver.sql) | `dept_approver` (new) | [v2.5](../../docs/notes/database/schema.md#v25--deptapprover-junction-table-2026-04-28) |
| 2026-05-03 | [2026-05-03_add-ot-tables.sql](2026-05-03_add-ot-tables.sql) | `ot_rate_config`, `driver_ot`, `driver_ot_slot` (3 new) | [v2.6](../../docs/notes/database/schema.md#v26--driver-ot-tables-2026-05-03) |
| 2026-05-04 | [2026-05-04_add-fuel-management.sql](2026-05-04_add-fuel-management.sql) | `fuel_bill`, `fuel_reimbursement`, `fuel_price`, `fuel_reserve_config`, `fuel_reserve_log` (5 new) | [v2.7](../../docs/notes/database/schema.md#v27--fuel-management-tables-2026-05-04) |
| 2026-05-06 | [2026-05-06_add-vehicle-budget-log.sql](2026-05-06_add-vehicle-budget-log.sql) | `vehicle_budget_log` (new ledger), `vehicle_mileage` (+budget_deducted_at, +last_budget_log_id), backfill opening balance | [v2.8](../../docs/notes/database/schema.md#v28--vehiclebudget-ledger-pattern-2026-05-06) |

---

## Migration Template

```sql
-- YYYY-MM-DD: <slug> — <one-line purpose>
-- Reason: <why this change exists>

BEGIN TRANSACTION;

-- 1) <step name>
ALTER TABLE foo ADD COLUMN bar TEXT;

-- 2) <step name>
CREATE INDEX ix_foo_bar ON foo(bar);

COMMIT;
```

**Run command:**
```bash
sqlite3 app/instance/portal.db < app/migrations/YYYY-MM-DD_<slug>.sql
```

**Verify:**
```bash
sqlite3 app/instance/portal.db ".schema <table>"
```

---

## Rules

- ใช้ `BEGIN TRANSACTION;` ... `COMMIT;` เสมอ — atomic
- SQLite **ไม่รองรับ DROP COLUMN / ALTER COLUMN TYPE** — ใช้ recreate-and-copy ถ้าจำเป็น
- ทุกไฟล์ต้องมี header comment: วันที่ + วัตถุประสงค์ + reason
- ถ้ามี backfill data → ทำใน transaction เดียวกับ schema change
- ตั้งชื่อไฟล์: `YYYY-MM-DD_<kebab-case-slug>.sql`
