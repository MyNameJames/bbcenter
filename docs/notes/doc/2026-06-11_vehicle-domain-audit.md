# Vehicle Domain Audit (Option C) — 2026-06-11

**สถานะ:** completed (read-only audit — ยังไม่แก้ code)
**ขอบเขต:** views/vehicle/* + fuel_view.py · templates/vehicle/* + _shared/_components · static/vehicle + core
**ที่มา:** subagent 3 ตัว (controllers / frontend / expense data-flow map)

---

## Part 1 — Controllers

### Critical (เงิน / permission / data loss)

1. `vehicle_mileage.py:109` + `vehicle_driver.py:290` — `auto_generate_ot()` flush แต่ commit อยู่เฉพาะ branch หักงบ → booking ที่ expense_type=None / skip-branch / personal trip_cost=0 ทำ **DriverOT rollback หายเงียบ** — fix: commit หลัง auto_generate_ot ทันที
2. `vehicle_admin.py:399-416` — `admin_merge` = **approve path ที่ 3** set status ตรงๆ ไม่เช็ก `_lookup_budget_for_booking()` → อนุมัติทริปไม่มีงบได้
3. `vehicle_admin.py:526-550` — `/api/vehicle/<vid>/history` **ไม่มี `is_vehicle_admin()`** — user ทั่วไปดึงประวัติทุกคันได้
4. `vehicle_notification.py:607-613` — `mark_all_read` ลบ sticky payment ด้วย (ขัดเจตนา `mark_one_read` ที่ block) — fix: exclude sticky
5. `vehicle_booking.py:198` — `delete_booking`: `VehicleMileage.booking_id` nullable=False + ไม่มี cascade → ลบ booking ที่มี mileage = IntegrityError + refund rollback (verify กับ DB จริงก่อนแก้)
6. `vehicle_mileage.py:42-46` — `mileage_log` POST ไม่เช็ก `booking.status` → ปิดทริป+หักงบให้ booking rejected/cancelled ได้

### Known gaps (ยืนยันยังอยู่ครบ 3)
- `vehicle_admin.py:503-517` admin_assign ไม่เช็กงบ · `vehicle_budget.py:224-241` refund_booking ไม่มี time guard/notify · `vehicle_admin.py:299-307` admin_revert ไม่มี guard/refund/notify

### Warning (เลือกเฉพาะตัวสำคัญ)
- `vehicle_mileage.py:145` + `vehicle_driver.py:330` — notify "หักงบแล้ว" อยู่นอก `if budget:` → แจ้งเท็จเมื่อ skip deduct
- `vehicle_mileage.py:309` — KPI query งบไม่ filter `is_active=True` + ใช้ year anchor ตรงๆ (ขัด active-period design)
- `vehicle_cost.py:83-96` — `override_fuel` หา budget ไม่เจอ → ไม่ rededuct เงียบๆ (ไม่มี flash)
- `vehicle_budget.py:119,205` — `top_up`/`extend_period` read-modify-write นอก lock → race บนเงิน; ควรมี `add_budget_amount(budget, delta)` ใน service
- `vehicle_budget.py:41-107` — `set_budget` ไม่มี try/except/rollback; `:126,150,216` flash `str(e)` (ต้องห้าม)
- `vehicle_admin.py:478-479` — `admin_assign` ทับ `trip_group`/`expense_type` เป็น None ถ้า form ไม่ส่ง
- `fuel_view.py:285-314` — edit/delete bill ที่อยู่ในใบเบิกแล้วได้ ไม่มี guard → ยอดใบเบิก/reserve เพี้ยน
- `vehicle_booking.py:182` — user ลบ booking สถานะ cancelled ของตัวเองได้ (ทำลาย audit row)
- `vehicle_common.py:85,91` — `_lookup_budget_for_booking` หา dept ไม่ filter `budget_type_id` → ชื่อชนข้าม type
- Error-handling pattern ขาดทั้งแถบ: mileage/driver/override_fuel/admin_merge/admin_assign/manage_fleet + **ทุก route ใน fuel_view.py**
- `vehicle_cost.py:148` vs `:445` — OT legacy status `pending/approved` หายจาก KPI/tab (export ยังรับ)

### Info
- `print()` debug ค้าง 7 จุดใน admin_merge · บรรทัดซ้ำ admin.py:484-485 · import header ~30 บรรทัด copy ทุกไฟล์ (ส่วนใหญ่ unused) · `TH_MONTHS` ประกาศซ้ำ 3 ที่ · dead vars ใน booking.py:451,475 · docstring stale ใน budget_service:8-14 · `api_check_merge` admin.py:609 `min([])` → 500 · fuel_view.py:331 เลขใบเบิกซ้ำได้

**Verdict:** budget mutation ผ่าน BudgetService 100% ✓ โครงสร้างหลัง split อ่านง่าย ✓ — จุดอ่อนคือความไม่ uniform: approve 3 path แต่ budget gate มี path เดียว, error pattern ครบเฉพาะ booking/budget

---

## Part 2 — Frontend (templates + CSS/JS)

### Rule violations
- `--ds-*` vars: ตายสนิทจริง ✓ · modals ทั้ง 9 ไฟล์ไม่มี inline script ✓
- **Legacy 3 ไฟล์หลุดมาตรฐานหนักสุด:** `vehicle_edit.html` (shadow-sm + border-top warning + radius 15px + inline script), `vehicle_book.html` (shadow-sm), `vehicle_budget_personal.html` (inline style 113 บรรทัด + inline script `markPaid/markUnpaid` :316-359 + hardcoded hex ทั้งหน้า)
- Shadow บน popover 6 จุด ค่าไม่ตรงกัน 4 แบบ (cost:651,808 · admin:184 · vehicle:374 · budget:520 · mileage:190) → ควรมี token `--vc-shadow-pop`
- Token หาย/อ้างผิด: `--vc-primary-ring` (vehicle.css:315,355 ที่ถูกคือ `--vc-accent-ring`), `--vc-bg-warn-subtle`/`--vc-border-warn` ไม่มีใน tokens.css, `--border-color` ไม่มีจริง
- Doc drift: CLAUDE.md บอก `--vc-border=#EAEAEA` แต่ tokens.css:27 = `#E5E7EB`

### Duplication (refactor candidates เรียงตามผลตอบแทน)
1. **ไม่มี base.html** — 12 หน้า vehicle เป็น full HTML doc, head/flash/sidebar ซ้ำ ×10 → สร้าง `_shared/base.html` + blocks
2. **KPI card 4 แบบ** ทั้งที่มี macro `_components/kpi.html` แต่ไม่มีใคร import (admin_fuel/budget_personal/cost/mileage)
3. **TH_MONTHS ×6 ใน Jinja + ×5 ใน JS** ทั้งที่ `core/js/format.js` มีแล้ว → Jinja global + import format.js
4. **format.js / http.js สร้างแล้วไม่มีใครใช้** — fmtBaht ×4, raw fetch ×17 จุด
5. Popover CSS โครงเดียวกัน 5 ชุด → `.vc-popover` utility · micro-label ~20 จุด → `.vc-microlabel` · status pill ต่อหน้าทั้งที่มี badge/pill macro

**Verdict:** หน้า admin ใหม่ (admin_fuel = gold standard) ยึด token ดีมาก — แก้ 3 ไฟล์ legacy + บังคับใช้ shared infra = consistency ~80%→95%

---

## Part 3 — Expense Data-flow Map (ต้นเหตุ "แก้หน้าหนึ่งต้องแก้อีกหน้า")

| Logic | จุดซ้ำ | สถานะ |
|---|---|---|
| **Trip fuel cost** `(distance/fuel_rate)*fuel_price` + override | **6 ที่ / 5 ไฟล์**: mileage.py:118,237 · budget.py:671 · driver.py:302 · booking.py:427 · notification_cron.py:25 | **DIVERGED** — ปัดเศษ/guard ไม่เท่ากัน |
| Override check `if m.fuel_cost > 0` | 6 ที่ | DIVERGED |
| Budget aggregation (KPI used/total) | 4 ที่: mileage.py:309-331 · budget.py:328-333 · budget.py:586-598 | DIVERGED — filter is_active ไม่เท่ากัน |
| Personal reimbursement sum | 3 ที่: budget.py:343,361,550 | loop recalc ซ้ำ |
| OT slot sum | 3 ที่: cost.py:272,300 · common.py:183 | SAME (copy) |
| Export recalc | mileage.py:495-514 | ซ้ำ formula #1 |

### แผน consolidation (เรียงลำดับ)
1. `calc_trip_fuel_cost(mileage, booking)` ใน `vehicle_budget_service.py` → migrate 6 call sites (สำคัญสุด — แก้ที่เดียวทุกหน้าอัปเดต)
2. `aggregate_budget_usage(...)` → migrate 3 จุด KPI
3. `aggregate_personal_costs(year, month, status)` → migrate 3 จุด
4. Export ใช้ #1 ซ้ำ
5. `sum_ot_slots(slots)` ใน vehicle_common.py

---

## ลำดับงานแนะนำ (แต่ละข้อ = 1 task ผ่าน /devloop)

1. **Hotfix Critical 6 ข้อ** (Part 1) — เริ่มจาก #3 permission, #1 OT lost-commit, #2 merge bypass
2. **`calc_trip_fuel_cost()` + migrate 6 call sites** + pytest — ตัดปัญหา "แก้หน้าหนึ่งต้องแก้อีกหน้า"
3. **Budget gate เดียว** — ยุบ approve 3 path (approve_booking / admin_assign / admin_merge) ให้ผ่าน helper เดียว
4. Error-handling pattern เติมให้ครบ mileage/admin/fuel routes
5. Frontend: refactor `vehicle_budget_personal.html` → `vehicle_edit/book.html` → base.html + shared macro
