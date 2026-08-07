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
| 2026-05-18 | [2026-05-18_vehicle-budget-is-active.sql](2026-05-18_vehicle-budget-is-active.sql) | `vehicle_budget` (+is_active) | [v2.9](../../docs/notes/database/schema.md#v29--vehiclebudget-isactive-2026-05-18) |
| 2026-05-18 | [2026-05-18_ot-rate-config-day-of-week.sql](2026-05-18_ot-rate-config-day-of-week.sql) | `ot_rate_config` (+day_of_week) | [v2.10](../../docs/notes/database/schema.md#v210--otrateconfig-dayofweek-2026-05-18) |
| 2026-05-18 | [2026-05-18_vehicle-booking-ad-hoc.sql](2026-05-18_vehicle-booking-ad-hoc.sql) | `vehicle_booking` (+is_ad_hoc, +contact_name) | [v2.11](../../docs/notes/database/schema.md#v211--vehiclebooking-ad-hoc-trip-2026-05-18) |
| 2026-06-06 | [2026-06-06_budget-active-period-backfill.sql](2026-06-06_budget-active-period-backfill.sql) | `vehicle_budget` (backfill `start_date`/`end_date` จาก year/month + index `ix_vb_active_period`) — ไม่มี schema change | [v2.13](../../docs/notes/database/schema.md#v213--vehiclebudget-active-period-2026-06-06) |
| 2026-06-08 | [2026-06-08_driver-profile-fields.sql](2026-06-08_driver-profile-fields.sql) | `driver` (+8 fields: national_id, addr_line/subdistrict/district/province/postal, id_card_image, avatar_image) | [v2.14](../../docs/notes/database/schema.md#v214--driver-profile-fields-2026-06-08) |
| 2026-06-08 | [2026-06-08_driver-ot-paid-softdelete.sql](2026-06-08_driver-ot-paid-softdelete.sql) | `driver_ot` (+`no_receipt`, +`is_deleted`, +`deleted_at`; backfill status pending/approved → unpaid) — ตัด approval, soft delete | [v2.15](../../docs/notes/database/schema.md#v215--driver-ot-paid-softdelete-2026-06-08) |
| 2026-06-09 | [2026-06-09_driver-ot-standalone.sql](2026-06-09_driver-ot-standalone.sql) | `driver_ot` (`booking_id` NOT NULL → nullable, table rebuild) — รองรับ manual standalone OT | [v2.16](../../docs/notes/database/schema.md#v216--driver-ot-standalone-2026-06-09) |
| 2026-06-12 | [2026-06-12_user-line-id.sql](2026-06-12_user-line-id.sql) | `user` (+line_user_id, +line_link_code, unique index `ix_user_line_user_id`) — LINE Messaging API | [v2.17](../../docs/notes/database/schema.md#v217--user-line-messaging-api-2026-06-12) |
| 2026-06-14 | [2026-06-14_drop-dead-columns.sql](2026-06-14_drop-dead-columns.sql) | `vehicle_booking` (-expense_type_id, -snap_department_name, -contact_name); `expense_type` table dropped | [v2.18](../../docs/notes/database/schema.md#v218--drop-dead-columns-2026-06-14) |
| 2026-06-15 | [2026-06-15_notification-supersede.sql](2026-06-15_notification-supersede.sql) | `notification` (+event_key, +superseded_at) — supersede กัน notif ชนิดเดียวกันสะสมซ้ำ | [v2.19](../../docs/notes/database/schema.md#v219--notification-supersede-2026-06-15) |
| 2026-06-16 | [2026-06-16_notification-add-title.sql](2026-06-16_notification-add-title.sql) | `notification` (+title) — freeze title ตอนสร้าง notif (เดิม compute จาก event_key) | [v2.20](../../docs/notes/database/schema.md#v220--notification-title-2026-06-16) |
| 2026-06-20 | [2026-06-20_drop-trip-passenger.sql](2026-06-20_drop-trip-passenger.sql) | `trip_passenger` table dropped — feature "ขอติดรถ" ตัดออก; ทดแทนด้วย trip_group linking | [v2.21](../../docs/notes/database/schema.md#v221--drop-trip-passenger-2026-06-20) |
| 2026-07-19 | [2026-07-19_vehicle-mileage-open-reminder.sql](2026-07-19_vehicle-mileage-open-reminder.sql) | `vehicle_mileage` (+mileage_open_reminder_at) — guard กันแจ้งซ้ำ cron เตือน driver ปิดไมล์ค้างข้ามวัน (Phase 3.5 REQ-3) | [v2.22](../../docs/notes/database/schema.md#v222--vehiclemileage-open-reminder-guard-2026-07-19) |
| 2026-07-27 | [2026-07-27_driver-ot-is-manual.sql](2026-07-27_driver-ot-is-manual.sql) | `driver_ot` (+is_manual, backfill แถวเดิม → 0) — guard กัน `sync_ot_for_trip()` คำนวณทับ OT ที่แอดมินสร้าง/แก้เอง | [v2.23](../../docs/notes/database/schema.md#v223--driverot-ismanual-guard-2026-07-27) |
| 2026-07-30 | [2026-07-30_add-vehicle-budget-yearly-plan.sql](2026-07-30_add-vehicle-budget-yearly-plan.sql) | `vehicle_budget_yearly_plan` (new) — เพดานเงินก้อนใหญ่ทั้งปี + แบ่งส่วนกลาง/ส่วนกอง รองรับ UI "เงินก้อนประจำปี" | [v2.24](../../docs/notes/database/schema.md#v224--vehiclebudgetyearlyplan-new-table-2026-07-30) |
| 2026-07-31 | [2026-07-31_vehicle-add-vehicle-type.sql](2026-07-31_vehicle-add-vehicle-type.sql) | `vehicle` (+vehicle_type) — ประเภทรถ (pickup/van/truck6) รองรับ selector chip ใน addVehicleModal redesign | [v2.25](../../docs/notes/database/schema.md#v225--vehicle-vehicletype-2026-07-31) |
| 2026-07-31 | [2026-07-31_vehicle-budget-yearly-plan-period-fk.sql](2026-07-31_vehicle-budget-yearly-plan-period-fk.sql) | `vehicle_budget_yearly_plan` (+start_date, +end_date NOT NULL, DROP UNIQUE on fiscal_year — table rebuild, backfill from old march-year rule), `vehicle_budget` (+yearly_plan_id FK nullable, +index) | [v2.26](../../docs/notes/database/schema.md#v226--vehiclebudgetyearlyplan-explicit-period--vehiclebudget-fk-link-2026-07-31) |
| 2026-08-05 | [2026-08-05_vehicle-booking-add-note.sql](2026-08-05_vehicle-booking-add-note.sql) | `vehicle_booking` (+note) | [v2.27](../../docs/notes/database/schema.md#v227--vehiclebooking-note-2026-08-05) |
| 2026-08-06 | [2026-08-06_vehicle-budget-yearly-plan-flexible.sql](2026-08-06_vehicle-budget-yearly-plan-flexible.sql) | `vehicle_budget_yearly_plan` (+name, +is_default), `vehicle_budget` (UniqueConstraint ขยายรวม `yearly_plan_id` — table rebuild, reindex `ix_vb_yearly_plan`+`ix_vb_active_period`) | [v2.28](../../docs/notes/database/schema.md#v228--vehiclebudgetyearlyplan-flexible-name--is_default--vehiclebudget-uniqueconstraint-ขยาย-2026-08-06) |

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
