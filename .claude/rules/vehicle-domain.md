---
paths:
  - "app/views/vehicle/**"
  - "app/services/vehicle/**"
  - "app/domain/vehicle/**"
  - "app/models/vehicle*.py"
  - "app/templates/vehicle/**"
  - "app/static/vehicle/**"
---

## Vehicle domain gotchas

- Budget mutation: ห้ามแก้ `VehicleBudget.used_amount` / `budget_amount` / `is_active` ตรงๆ — ทุก mutation ต้องผ่าน `app/services/vehicle/budget_service.py` (ย้ายกลับมาที่ `services/` ใน Clean Architecture refactor Phase 1, 2026-07-19 — เดิมเคยย้ายไป `views/vehicle/` ตอน 2026-06-07 เพราะตอนนั้นมี service เดียวทั้งระบบ ตอนนี้ทุก domain มี service ของตัวเองแล้วจึงย้ายกลับ; core = util ข้าม domain เท่านั้น เพื่อ ledger + idempotency)
  - **Deduct/override** 4 call sites: `mileage_log()`, `driver_mileage()`, `override_fuel()`, `budget_manage()` POST
  - **Refund** — `refund_for_booking()` ถูกลบออกแล้ว (Phase 1, 2026-06-12) เพราะงบหักที่ mileage ไม่ใช่ approve; admin ยกเลิก approved booking ผ่าน `budget_manage` action `cancel_booking` เท่านั้น
  - **`set_active(budget, active)`** (2026-05-18) — toggle ปิด/เปิดใช้งาน → log `set_active`/`set_inactive`; `is_active=False` block `approve_booking` (admin + approver paths ผ่าน `_lookup_budget_for_booking()`) + `top_up` + `manual_adjust`; ไม่ block mileage deduct/refund (booking เก่าปิดทริปได้); KPI sum filter `is_active=True`
- **งบช่วงเวลา (active period, 2026-06-06):** การหางบ "เลิกใช้ year/month" — `_lookup_budget_for_booking(booking, on_date=None)` หางบ `is_active=True AND start_date <= on_date <= end_date` (default on_date = วันเริ่ม booking; ตอนหักงบส่งวันปิดทริป). overlap → start_date ล่าสุด. ใช้ร่วม approve + 3 จุดหักงบ (mileage_log/driver_mileage/override_fuel). `approve_booking` block ถ้าคืน `None`. `budget_manage` แยกงบ active-for-month vs `archived_budgets` (section "คลังงบ") + action `extend_period` (ตั้ง start–end ใหม่ + เปิด is_active). `year`/`month` = anchor (UniqueConstraint + set_budget); pivot×เดือน ดึงจาก `vehicle_budget_log.created_at`
- Mileage formula: `fuel_cost = (distance / vehicle.fuel_rate) * fuel_price` (override ถ้า `mileage.fuel_cost` มีค่า)
- Fuel reserve depletion (2026-05-18): `_depletes_reserve(method)` = `method == 'transfer'` (เงินสด เบิกจากกองกลาง) **เท่านั้น** — `card`=บัตรส่วนกลาง, `self`=ผู้โดยสารจ่ายเอง (เก็บประวัติ ไม่หัก reserve). กระทบ `reserve_used` + `balance_after` ใน admin_fuel.html
- `is_vehicle_admin()` = `role_vehicle=='admin' OR is_superadmin`; approver เห็นเฉพาะแผนกตัวเอง
- ห้ามจองข้ามวัน — validate ใน `book_vehicle_simple()` ([views/vehicle/vehicle_booking.py](app/views/vehicle/vehicle_booking.py))
- `EXPENSE_CATEGORIES` ใน `views/vehicle/vehicle_common.py` — แก้ที่เดียวอัปเดต dropdown
- `snap_*` ใน vehicle_booking — ป้องกันข้อมูลหายเมื่อแก้ master
