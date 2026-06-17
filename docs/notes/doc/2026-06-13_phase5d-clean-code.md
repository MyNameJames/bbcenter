# Phase 5d — Clean Code: Split 4 giant functions + DRY merge
**วันที่:** 2026-06-13
**สถานะ:** completed

## เป้าหมาย
แยก function ขนาดใหญ่ใน vehicle layer ให้ ≤60 logic lines ตาม CLAUDE.md Clean Code Rules
และ merge budget-deduct helper ที่ซ้ำกัน (DRY rule) พร้อมเพิ่ม test coverage

## การตัดสินใจ

**Phase 5d — dispatch table + extraction:**
- `manage_fleet()` 151L → 25L: แยก 8 action handlers `_fleet_*()` + `_load_fleet_data()`
- `cancel_booking()` 112L → 37L: แยก `_build_cancel_recipients()` + `_send_cancel_notifications()`
- `driver_mileage()` 129L → 35L: แยก `_driver_handle_start/end()` + `_driver_deduct_budget()`
- `cost_summary()` 117L → 38L: แยก `_calc_ot_kpi()` + `_build_ot_pivot()`

**Option B — DRY merge (ตามผล devloop ตรวจงาน):**
- `_deduct_budget_for_trip` (vehicle_mileage) และ `_driver_deduct_budget` (vehicle_driver) เหมือนกัน 95%
- รวมเป็น `deduct_budget_for_trip(booking, m2, source)` ใน `vehicle_common.py`
- `source` parameter ใส่ใน BudgetLog.note + logger tag (เดิมต่างกันแค่ตรงนี้)
- เขียน 6 GUARD tests ก่อน implement ตาม devloop GUARD rule

## ไฟล์ที่แก้ไข

### Phase 5d
- `app/views/vehicle/vehicle_cost.py` — +`_calc_ot_kpi`, +`_build_ot_pivot`
- `app/views/vehicle/vehicle_admin.py` — +8 `_fleet_*` handlers, +`_load_fleet_data`
- `app/views/vehicle/vehicle_booking.py` — +`_build_cancel_recipients`, +`_send_cancel_notifications`
- `app/views/vehicle/vehicle_driver.py` — +`_driver_handle_start/end`, (−`_driver_deduct_budget` ในขั้น B)

### DRY merge (ขั้น B)
- `app/views/vehicle/vehicle_common.py` — +`deduct_budget_for_trip(booking, m2, source)`
- `app/views/vehicle/vehicle_mileage.py` — ลบ `_deduct_budget_for_trip` + cleanup imports
- `app/views/vehicle/vehicle_driver.py` — ลบ `_driver_deduct_budget` + cleanup imports
- `tests/test_deduct_budget_for_trip.py` — NEW: 6 tests (test-first)

### Docs
- `docs/notes/INDEX_code.md` — เพิ่ม `deduct_budget_for_trip`, แก้ line refs 3 จุด
- `docs/notes/INDEX_routes.md` — แก้ stale refs 5 จุด (รวม manage-fleet → vehicle_admin.py)

## ผล
- pytest: 48/48 passed (เพิ่มจาก 42 → +6 tests)
- checker ผ่าน 2 รอบ
