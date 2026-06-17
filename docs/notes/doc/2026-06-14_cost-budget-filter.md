# Phase 2a — Filter งบ ในหน้า Cost/OT

**วันที่:** 2026-06-14 · **status:** completed
**roadmap:** [แผนรวม DB cleanup + เพิ่ม function] Phase 2a (เริ่มก่อน — เล็ก/ปลอดภัย)

## งาน
เพิ่มตัวกรองงบ (budget_type → sub cascade) ในหน้า cost/OT ให้เหมือนหน้า mileage
— OT บันทึก record-only ไม่หักงบอยู่แล้ว, หน้า cost มี `_ot_budget_label` derive งบจาก booking แล้ว
เหลือแค่ "ตัวกรอง"

## ไฟล์ที่แก้

**Code**
- `app/views/vehicle/vehicle_common.py` — เพิ่ม `_build_budget_subs()` (ย้ายจาก vehicle_mileage, DRY)
- `app/views/vehicle/vehicle_mileage.py` — ลบ local `_build_budget_subs` → import จาก common; ตัด `EXPENSE_CATEGORIES` ที่ไม่ใช้แล้วออกจาก import
- `app/views/vehicle/vehicle_cost.py` — เพิ่ม `_apply_budget_filter(q, budget_type, budget_sub)` (join VehicleBooking → filter); `cost_summary` + `cost_export` อ่าน `budget_type`/`budget_sub` args; ส่ง `budget_subs`/`sel_budget_type`/`sel_budget_sub`/`filter_active` เข้า template; import `VehicleBooking` + `_build_budget_subs`
- `app/static/vehicle/js/vehicle_ot.js` — เพิ่ม IIFE `bindBudgetFilter` (cascade budget_type→budget_sub, อ่าน `window.EXPENSE_CATS`)

**Template**
- `app/templates/vehicle/admin/vehicle_cost.html` — เพิ่ม `#filterBudgetType` + `#filterBudgetSub` (`#filterBudgetSubWrap`) ใน `#costFilterSheet`; data injection `window.EXPENSE_CATS` + `window.COST_FILTER_SUB`; export link เพิ่ม budget args; ลบ inline `filter_active` (ใช้จาก view)

**Docs (sync)**
- `INDEX_code.md` — เพิ่มแถว `_build_budget_subs()` + `_apply_budget_filter()`; bump date
- `INDEX_ui.md` — note 2026-06-14 ที่ row vehicle_cost.html + JS; bump date
- `INDEX_routes.md` — note budget param ที่ `/admin/cost` + export; bump date

## Behavior
- filter งบ active → กรองทั้ง KPI + table (query-level) · standalone OT (booking_id=None) หลุดเมื่อ filter active (ไม่มีงบ — ถูกต้อง)
- pivot รายปี ไม่กระทบ (overview, ไม่ผูก filter เดิมอยู่แล้ว)

## Verify
- syntax/import OK · `pytest` 48 passed · render `/admin/cost`, `/admin/cost?budget_type=department`, `?budget_type=central&budget_sub=medical`, `/vehicle/mileage` → 200 (department byte น้อยลง = กรองจริง)
- checker (Maintenance Protocol) → ผ่านหลังเติม `_apply_budget_filter` row + bump dates
- **ค้างฝั่ง browser:** cascade dropdown + AJAX filter → ผู้ใช้ทดสอบบน :5001 เอง

## Next
Phase 1 (audit VehicleBooking) → Phase 2b (notification: ungroup feed, สีแยก status, OT→admin, เงื่อนไข personal/ad-hoc)
