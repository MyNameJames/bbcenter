# Phase 1 — Drop Dead Columns (VehicleBooking)

**วันที่:** 2026-06-14 · **status:** completed
**roadmap:** [แผนรวม DB cleanup + เพิ่ม function] Phase 1

## งาน
Audit + ลบ column/table ที่ตายแล้วออกจาก VehicleBooking + ลบ ExpenseType model/table

## Audit ผล (28 columns)

| Column | ผล | เหตุผล |
|---|---|---|
| `expense_type_id` | ✂️ **ลบ** | FK to expense_type — ไม่เคย write ตลอดชีวิต; budget code มี comment "Bug fix: is NULL" ก่อน drop ออก |
| `snap_department_name` | ✂️ **ลบ** | เพิ่ม column ใน model แต่ไม่มี write path เลย — ตาย since day 1 |
| `contact_name` | ✂️ **ลบ** | เคยใช้ใน old vehicle_view.py, write path หายตอน refactor → vehicle_driver.py ไม่เคยเขียน |
| `ExpenseType` model + table | ✂️ **ลบ** | zero .query calls, ไม่มี seed ใช้จริง |
| ที่เหลือ 24 columns | ✅ **เก็บ** | ใช้งานจริงทุกตัว |

## ไฟล์ที่แก้

**Migration**
- `app/migrations/2026-06-14_drop-dead-columns.sql` — ALTER TABLE DROP COLUMN ×3 + DROP TABLE expense_type

**Models**
- `app/models/vehicle.py` — ลบ `expense_type_id`, `expense_type_ref`, `snap_department_name`, `contact_name` จาก VehicleBooking
- `app/models/vehicle_budget.py` — ลบ `ExpenseType` class ทั้งหมด
- `app/models/__init__.py` — ลบ `ExpenseType` จาก import + `__all__`

**Views**
- `app/views/vehicle/vehicle_budget.py` — simplify `pending_count_map` key เป็น `trip_department_id` (เดิมมี `expense_type_id` ที่ always NULL ทำให้ map ว่างเสมอ); ลบ `snap_department_name` fallback ใน personal export
- `app/views/vehicle/vehicle_notification.py` — ลบ `m.contact_name` fallback ใน mate name; ลบ `snap_department_name` fallback ใน forwarded stage

**Templates**
- `app/templates/vehicle/vehicle_driver.html` — ลบ `b.contact_name or` จาก requester_label (2 จุด)

**Docs (sync)**
- `app/migrations/migrations-index.md` — entry v2.18
- `docs/notes/database/schema.md` — Part 1 (ลบ 3 column + expense_type table section) + Part 2 (v2.18 entry + เหตุผล)
- `docs/notes/INDEX_code.md` — 27→26 tables; ลบแถว `ExpenseType`; bump note 2026-06-14

## Verify
- grep: ไม่มี reference เหลือใน codebase
- pytest: 48 passed
- checker: ผ่านหลัง fix INDEX_code.md (26 tables + ลบ ExpenseType row)
- **ยังไม่ได้รัน migration บน DB จริง** — รัน `sqlite3 app/instance/portal.db < app/migrations/2026-06-14_drop-dead-columns.sql` แล้วตรวจ `.schema vehicle_booking`

## Next
Phase 2b — Notification improvements (4 ข้อ): สีแยก status, OT→admin only, conditional fuel+OT notify, flat timeline feed
