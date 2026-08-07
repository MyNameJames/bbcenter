# งบประมาณ — Flexible Yearly Plan (งบพิเศษ + filter ปี/งบ)
**วันที่:** 2026-08-06
**สถานะ:** in-progress

## เป้าหมาย
Implement ตาม spec: [docs/notes/doc/2026-08-06_budget-flexible-plan.md](../doc/2026-08-06_budget-flexible-plan.md)
- Schema: `VehicleBudgetYearlyPlan` + `name`/`is_default`, `VehicleBudget` UniqueConstraint เพิ่ม `yearly_plan_id`
- Service: `set_yearly_plan()` รับ `name`, ฟังก์ชันใหม่ `set_default_plan()`
- Controller: default-plan priority, "ปี" filter, ตัด chip "กอง", tab ใหม่ "รายชื่องบใหญ่"
- Template: เก็บกวาด `yearlyPlanModal` WIP ที่ค้าง, chip ปี, tab list+radio default

## การตัดสินใจ
- ยืนยันจาก consult หลายรอบกับผู้ใช้แล้ว (ดู spec §0 ข้อค้นพบ) — ไม่แตะ logic หักงบ, ไม่ทำ plan_type enum, default เดียวทั้งระบบ

## ไฟล์ที่แก้ไข
- app/models/vehicle_budget.py — `name`/`is_default` (VehicleBudgetYearlyPlan) + UniqueConstraint เพิ่ม `yearly_plan_id` (ผ่าน db-helper)
- app/migrations/2026-08-06_vehicle-budget-yearly-plan-flexible.sql — ใหม่ (ผ่าน db-helper, **ยังไม่ได้รันกับ dev DB**)
- docs/notes/database/schema.md — sync Part 1+2 (v2.28, ผ่าน db-helper)
- app/migrations/migrations-index.md — เพิ่ม entry (ผ่าน db-helper)
- app/services/vehicle/budget_service.py — `set_yearly_plan(name=)` + `set_default_plan()` ใหม่
- tests/test_budget_service.py — เพิ่ม test set_yearly_plan(name) + set_default_plan (6 tests)
- app/views/vehicle/vehicle_budget.py — `_handle_set_default_plan()`, `_build_plan_list_rows()`, default-plan priority (C1), plan_year filter (C2), plan_options กรองด้วย plan_year
- app/templates/vehicle/admin/vehicle_budget.html — เก็บกวาด yearlyPlanModal WIP (T1), chip "ปี" (T2), ตัด chip "กอง" (T3), tab ใหม่ "รายชื่องบใหญ่"
- app/static/vehicle/js/vehicle_budget.js — initPlanYearChip, ตัด ddDept จาก initPivotFilter, set-default radio auto-submit, ypDeptPreview .value fix

## Bug fix รอบ 2 (2026-08-06, หลังผู้ใช้ทดสอบจริง)
- **`?year=&month=` 500 error:** ฟอร์ม "ตั้งเป็นค่าเริ่มต้น" (radio ใน "รายชื่องบใหญ่") ไม่มี hidden
  `year`/`month` — POST redirect (`int(request.form.get('year') or '')`) พังตอน submit ค่าว่าง
  → เพิ่ม hidden `year`/`month` ให้ฟอร์มนั้น ตรงกับฟอร์ม action อื่นทุกตัวในหน้านี้
- **"ตั้งงบใหม่" ไปแทนที่ของเก่า (ของเดิมหาย):** จุดที่เคยจดไว้เป็น "นอก scope" ด้านบน กลายเป็น bug จริงที่
  ผู้ใช้เจอ — แก้แล้ว: เพิ่ม `data-plan-mode="create"`/`"edit"` บนปุ่มทั้ง 3 (ตั้งงบใหม่/แก้ไขก้อนเงิน/
  ตั้งก้อนงบใหม่ในแท็บรายชื่องบใหญ่) + listener `initYearlyPlanModalMode()` ใน `vehicle_budget.js`
  (`show.bs.modal`) — `create` เคลียร์ `plan_id`+ทุก field ในฟอร์ม (รวม badge ปี), `edit` คืนค่าจาก
  snapshot ที่เก็บไว้ตอน init (จาก Jinja render ตอนโหลดหน้า)

## Docs sync checklist (ก่อน `จบงาน`)
- [ ] schema.md Part 1 + Part 2 (v2.28)
- [ ] migrations-index.md
- [ ] INDEX_code.md § Key Functions
- [ ] INDEX_ui.md § Templates
- [ ] INDEX_routes.md (ถ้ามี route param เปลี่ยน)

## Checklist devloop
- [x] 1 PLAN — scoped 5 field ครบ (อยู่ใน spec doc แล้ว) + log file นี้
- [x] 2 GUARD — db-helper (model+migration+schema.md) + เพิ่ม test ก่อน/คู่กับ service ใหม่ (set_default_plan validation logic)
- [x] 3 BUILD — schema, service (S1/S2), controller (C1-C4), template+JS (T1-T3)
- [x] 4 VERIFY — pytest เขียวทั้ง suite (18/18 ใน test_budget_service.py, ทั้งโปรเจกต์ exit 0) — **UI ยังไม่ได้ verify ใน browser จริง** (server เป็น process ผู้ใช้ ให้ผู้ใช้ทดสอบเอง ดู "ขั้นต่อไป")
- [x] 5 SYNC — schema.md/migrations-index.md (db-helper) + INDEX_code.md/INDEX_ui.md/INDEX_routes.md (manual) + checker agent รอบ 2 ผ่าน (เจอ 3 จุด line-ref เก่า/JS row หาย/header stale ระหว่างรอบแรก แก้ครบแล้ว)
- [x] 6 CLOSE — ย้าย log → doc/

## สรุปการทำงาน
**สถานะ:** completed (code) — pending: รัน migration บน dev DB + verify ใน browser (ผู้ใช้)
**วันที่เสร็จ:** 2026-08-06

### ขั้นต่อไป (ต้องให้ผู้ใช้ทำ)
1. รัน migration บน dev DB: `sqlite3 app/instance/portal.db < app/migrations/2026-08-06_vehicle-budget-yearly-plan-flexible.sql`
2. ทดสอบใน browser จริง (`/vehicle/admin/budget`): สร้างก้อนงบพิเศษซ้อนช่วงเวลากับงบประจำปี, ตั้ง default, ลอง chip "ปี"/"งบ"/"ประเภทงบ"
3. พิจารณาจุดนอก scope ที่เจอ (ดู "ไฟล์ที่แก้ไข" ด้านบน) — ปุ่ม "ตั้งงบใหม่"/"ตั้งก้อนงบใหม่" ไม่ reset `plan_id` ใน modal เดียวกัน อาจไปแก้ไข plan เดิมแทนสร้างใหม่โดยไม่ตั้งใจ
