# INDEX — Key Functions + Database Models

> Part ของ INDEX.md แยก เพื่อ token budget — [กลับ hub](INDEX.md)
> **อัปเดตล่าสุด:** 2026-06-12

---

## 🔧 Key Functions (non-route)

### Permission helpers
| Function | File:Line |
|----------|-----------|
| `is_vehicle_admin()` | [views/vehicle/vehicle_common.py](../../app/views/vehicle/vehicle_common.py) |
| `is_repair_admin()` | [repair_view.py:14](../../app/views/repair_view.py#L14) |
| `is_maintenance_admin()` | [maintenance_view.py:14](../../app/views/maintenance_view.py#L14) |

### Business logic

> ⚠️ **ขั้น 3 (2026-06-07):** path `vehicle_view.py:NNN` ในตารางนี้ **ตายแล้ว** — หา controller จาก mapping ที่ [§Blueprints](#-blueprints) (route group → file). helpers (`_lookup_budget_for_booking`/`auto_generate_ot`/`_fmt_date_th`) → `vehicle_common.py`; `_build_budget_pivot` → `vehicle_budget.py`. line number เป็น approximate

| Function | File:Line | หน้าที่ |
|----------|-----------|---------|
| `book_vehicle_simple()` | [vehicle_view.py:83](../../app/views/vehicle_view.py#L83) | สร้าง booking + validate ห้ามข้ามวัน |
| `cancel_booking()` | [vehicle_booking.py:218](../../app/views/vehicle/vehicle_booking.py#L218) | soft cancel. owner: status ∈ {pending, waiting_approver}; admin: +approved; time guard `now < start_datetime`; **ไม่มี refund งบ** (งบหักตอนปิดทริปเท่านั้น); multi-recipient notify (priority cascade dedup) + Telegram + `status='cancelled'`. **2026-06-12: ถอด refund_for_booking, แก้ owner guard** |
| `approve_booking()` | [vehicle_view.py:527](../../app/views/vehicle_view.py#L527) | approve/reject + status flow + reject_reason. **2026-05-18:** check budget ก่อน approve (admin + approver path) ผ่าน `_lookup_budget_for_booking()`. **2026-06-06 (งบช่วงเวลา):** block ถ้า lookup คืน `None` (ไม่มีงบ active ครอบวันเดินทาง) → flash danger + return |
| `_lookup_budget_for_booking(booking, on_date=None)` | [vehicle_view.py:482](../../app/views/vehicle_view.py#L482) | helper หา `VehicleBudget` ที่ booking จะหักงบ. **2026-06-06 (งบช่วงเวลา):** เปลี่ยนจาก year/month → date-range — หางบ `is_active=True` ที่ `start_date <= on_date <= end_date` (`on_date` default = วันเริ่ม booking; deduct ส่งวันปิดทริป); overlap → `start_date` ล่าสุด; คืน `(budget, key_label)`, `None` ถ้าไม่พบ. ใช้ร่วมทั้ง approve + 3 จุดหักงบ (mileage_log/driver_mileage/override_fuel) |
| `approver_inbox()` | [vehicle_booking.py:358](../../app/views/vehicle/vehicle_booking.py#L358) | approver ดูรายการรอแผนกตัวเอง + ประวัติ + งบ active-period (`is_active` + `start_date<=today<=end_date`, mirror `_lookup_budget_for_booking`). **2026-06-10:** เพิ่ม dict `fuel_costs` (override `mileage.fuel_cost` ไม่งั้น `(odoEnd-odoStart)/fuel_rate*fuel_price` ผ่าน `FuelPrice.get_for_date`; trip ไม่ปิด=0) สำหรับ fuel badge. ctx: pending, history, budgets, fuel_costs |
| `inject_approver_pending_count()` | [app.py](../../app/app.py) | context processor — badge จำนวน waiting_approver สำหรับ approver |
| `inject_admin_pending_tomorrow()` | [app.py](../../app/app.py) | **2026-05-23** — context processor: `pending_count` = #VehicleBooking ที่ `status='pending'` + `start_datetime` ตกบนวันพรุ่งนี้ (BKK time, `get_bkk_time() + 1d` → date range `time.min..time.max`). คำนวณเฉพาะ vehicle admin/superadmin — ใช้สำหรับ badge "อนุมัติรถ" บน sidebar |
| `admin_assign()` | [vehicle_view.py:832](../../app/views/vehicle_view.py#L832) | assign รถ+คนขับ + snap_* |
| `_save_driver_image(field_name, prefix)` | [vehicle_admin.py:34](../../app/views/vehicle/vehicle_admin.py#L34) | **2026-06-08 (driver profile)** — เซฟรูปคนขับจาก `request.files` → `static/uploads/driver/` (ชื่อไฟล์ `{timestamp}_{prefix}_{secure_filename}`) คืนชื่อไฟล์ หรือ `None` ถ้าไม่ส่งมา. ใช้ใน `manage_fleet` action `add_driver`/`edit_driver` (avatar_image + id_card_image; edit ไม่ส่งไฟล์ = เก็บของเดิม) |
| `mileage_log()` | [vehicle_view.py:1063](../../app/views/vehicle_view.py#L1063) | admin บันทึกไมล์ + หักงบผ่าน BudgetService + dashboard KPI/breakdown/filter; default filter = เดือนปัจจุบัน (show_all=1 เพื่อดูทั้งหมด). **Phase 5.8 (2026-05-17)**: filter เพิ่ม `budget_type` + `budget_sub` (chained dependent dropdown, pattern เดียวกับ `updateExpSubDropdown` ใน vehicle-admin.js — JS rebuild `<option>` ด้วย `innerHTML` จาก `window.EXPENSE_CATS` (= `budget_subs` ที่ route query distinct `central_category`+`trip_department` จาก approved bookings **ทั้งหมดใน DB** ไม่ผูก filter หน้านี้ — map label จาก `EXPENSE_CATEGORIES` ถ้าไม่เจอ key ใช้ key เป็น label เอง เช่น `งานโภชนาการ`; **2026-06-08**) เมื่อ type เปลี่ยน) + `booker_q` (User.full_name/username ilike + `<datalist>`); render_template ส่ง `bookers_all`/`budget_subs` เพิ่ม. **Phase 5.7 (2026-05-17)**: enrich rows ด้วย `budget_type/budget_label/budget_sub` (จาก `expense_type`/`central_category`/`trip_department`) + `has_refuel` (FuelBill range match: `vehicle_id` + `odo_start ≤ mileage ≤ odo_end`); group rows ที่ `trip_group` เดียวกัน → `display_rows` (representative=row แรก) → ส่ง template เพิ่ม; ลบ `refuel_keys` set lookup เดิม |
| `mileage_export()` | [vehicle_view.py:1332](../../app/views/vehicle_view.py#L1332) | Export Excel ตาม filter ปัจจุบัน |
| `driver_mileage()` | [vehicle_view.py:1165](../../app/views/vehicle_view.py#L1165) | คนขับบันทึกไมล์ + หักงบผ่าน BudgetService |
| `driver_home()` | [vehicle_driver.py:36](../../app/views/vehicle/vehicle_driver.py#L36) | driver dashboard — งานวันนี้/พรุ่งนี้ + `latest_odo` dict: เลขไมล์ล่าสุดต่อรถ `MAX(COALESCE(odometer_end, odometer_start))` (join VehicleMileage→VehicleBooking, group by `assigned_vehicle_id`) → template ใช้ prefill เลขไมล์ออก; ส่ง `vehicles`/`users` ให้ modal งานนอกระบบ + dropdown เปลี่ยนรถฉุกเฉิน (`driver_change_vehicle`) |
| `override_fuel()` | [vehicle_view.py:1531](../../app/views/vehicle_view.py#L1531) | admin override `mileage.fuel_cost` + auto refund/rededuct ผ่าน BudgetService |
| `budget_manage()` | [vehicle_budget.py:34](../../app/views/vehicle/vehicle_budget.py#L34) | ตั้ง/แก้เพดานงบ — log ผ่าน `BudgetService`; POST actions: `set_budget` / `top_up` / `manual_adjust` / **`cancel_booking`** (เปลี่ยนจาก `refund_booking` 2026-06-12, ไม่ refund งบ แค่ flip status) / **`toggle_active`** (2026-05-18) / **`extend_period`** (2026-06-06). `top_up` + `manual_adjust` block ถ้า budget inactive. KPI sum filter `is_active=True`. **Phase 7 (2026-05-22):** + `_build_budget_pivot(fiscal_year_start_ad)` helper. **2026-06-08:** `_build_budget_pivot` คืน key `summary` เพิ่ม — `{central,dept: budget/used/pct/count · personal: used}` รวมทั้งปีงบ (budget = sum เพดาน VehicleBudget ที่ (year,month) ∈ fiscal_months ตามประเภท) สำหรับ pivot สรุป 3 แถว. **2026-06-06 (งบช่วงเวลา):** GET เลิก filter year/month → ดึงงบทั้งหมด แยกเป็น active-for-month (is_active + ช่วง start–end overlap เดือนที่เลือก) → `central_budgets`/`dept_budgets` vs `archived_budgets` (section "คลังงบ" ด้านล่าง + `status_reason` closed/expired/future/no_period). `extend_period` = ตั้ง start–end ใหม่ + `set_active(True)` + optional top-up (นำงบจากคลังกลับมาใช้). |
| `_build_budget_pivot()` | [vehicle_view.py:3456](../../app/views/vehicle_view.py#L3456) (helper หลัง `budget_manage()`) | Phase 7 helper — รับ AD year ที่เป็น "ปีเริ่ม มี.ค." → return dict `{central, central_labels, central_max, dept, dept_labels, dept_max, personal, personal_max, fiscal_months: [(m,y)×12]}`. **2026-06-06 (งบช่วงเวลา):** central/dept source เปลี่ยนจาก `VehicleBudget.used_amount` ต่อ (dept,month) → sum `VehicleBudgetLog` (event `deduct`/`refund`/`adjust`) group by month(`created_at`) ภายในปีงบ (used_amount เป็นยอดสะสมข้ามเดือน — ใช้ ledger break down ต่อเดือนแทน); personal row คงเดิม. Used by `budget_manage()`. |
| `BudgetService` | [views/vehicle/vehicle_budget_service.py](../../app/views/vehicle/vehicle_budget_service.py) | API กลาง: `deduct_for_mileage` / `refund_for_mileage` / `rededuct_for_mileage` / `set_budget_amount` / `manual_adjust` / **`set_active`** (2026-05-18) / `verify_cache_integrity`. **2026-06-12: ลบ `refund_for_booking` ออก** — งบไม่คืนตอน cancel/reject; `refund_for_mileage` ยังอยู่ (ใช้โดย `rededuct_for_mileage` ← `override_fuel`) |
| `calc_ot()` | [vehicle_view.py:1023](../../app/views/vehicle_view.py#L1023) | คำนวณ OT |
| `_parse_ot_slots(form)` | [vehicle_cost.py:34](../../app/views/vehicle/vehicle_cost.py#L34) | แปลง `slot_cfg[]`/`slot_start[]`/`slot_end[]` จากฟอร์ม OT modal → `list[DriverOTSlot]` — derive label/rate จาก `OTRateConfig` (snapshot ลง slot) + คำนวณ hours/amount; ใช้ร่วม `ot_create` + `ot_edit` |
| `_wants_json()` | [vehicle_cost.py:63](../../app/views/vehicle/vehicle_cost.py#L63) | เช็ค header `X-Requested-With: fetch` (vehicle_ot.js) → OT row action ตอบ JSON แทน flash/redirect — ใช้ทุก row action (mark_paid/toggle_no_receipt/create/edit/delete/restore) |
| `get_bkk_time()` | [models/base.py:9](../../app/models/base.py#L9) | Thai time (UTC+7, naive) — อยู่กับ `db` ใน base.py |

### Notification
| Function | File:Line | หน้าที่ |
|----------|-----------|---------|
| `_create()` | [notification_service.py:44](../../app/views/core/notification_service.py#L44) | สร้าง in-app notif |
| `_ot_total()` | [notification_service.py:81](../../app/views/core/notification_service.py#L81) | รวมค่า OT สารถีของ booking (ตัด is_deleted + no_receipt) — ใช้ใน 3 payment notif แตกค่าเดินทาง = น้ำมัน + OT |
| `notify_booking_created()` | [notification_service.py:95](../../app/views/core/notification_service.py#L95) | user สร้าง booking |
| `notify_admin_assigned()` | [notification_service.py:108](../../app/views/core/notification_service.py#L108) | admin assign รถ |
| `notify_admin_approved()` | [notification_service.py:125](../../app/views/core/notification_service.py#L125) | admin approve |
| `notify_forwarded_to_approver()` | [notification_service.py:140](../../app/views/core/notification_service.py#L140) | ส่งต่อ approver แผนก |
| `notify_approver_approved()` | [notification_service.py:153](../../app/views/core/notification_service.py#L153) | approver แผนก approve |
| `notify_rejected()` | [notification_service.py:168](../../app/views/core/notification_service.py#L168) | reject |
| `notify_merged_into_group()` | [notification_service.py:182](../../app/views/core/notification_service.py#L182) | รวม trip |
| `notify_mileage_started/ended()` | [notification_service.py:195,208](../../app/views/core/notification_service.py#L195) | บันทึกไมล์ |
| `notify_budget_deducted()` | [notification_service.py:222](../../app/views/core/notification_service.py#L222) | หักงบสำเร็จ |
| `notify_payment_required()` | [notification_service.py:241](../../app/views/core/notification_service.py#L241) | personal ต้องชำระ (msg แตก น้ำมัน + OT) |
| `notify_payment_reminder_user()` | [notification_service.py:260](../../app/views/core/notification_service.py#L260) | เตือนชำระ (cron, msg แตก น้ำมัน + OT) |
| `notify_payment_overdue_admin()` | [notification_service.py:279](../../app/views/core/notification_service.py#L279) | เตือน admin (cron, msg แตก น้ำมัน + OT) |
| `notify_user_cancelled()` | [notification_service.py:326](../../app/views/core/notification_service.py#L326) | **Event #16 (Phase 9, 2026-05-22)** — soft cancel multi-recipient; 5 role_labels (owner/admin/approver/driver/mate); icon `deleted` (trash); text แตก by role |
| `notify_payment_confirmed()` | [notification_service.py:358](../../app/views/core/notification_service.py#L358) | admin ยืนยันรับเงิน |
| `check_payment_escalation()` | [notification_cron.py:28](../../app/views/core/notification_cron.py#L28) | cron job |

### Frontend JS
| Function | File:Line | หน้าที่ |
|----------|-----------|---------|
| `openEventDetail()` | [vehicle/js/vehicle.js](../../app/static/vehicle/js/vehicle.js) | เปิด detail modal (single หรือ group อัตโนมัติ) |
| `openBookingModal(ds)` + `bk*` family | [vehicle/js/vehicle.js](../../app/static/vehicle/js/vehicle.js) | **Booking modal date/time/OT (2026-06-10)** — `bkRenderCal`/`bkSetDate`/`bkClearDate` (ปฏิทิน va-cal `#bk_cal_pop`), `bkBuildTimeLists`/`bkSelectTime`/`bkUpdateDuration` (time picker `.bk-timepick` → hidden `#bk_start_time`/`#bk_end_time`), `bkComputeOT`/`bkUpdateWarning` (อ่าน `window.OT_RATES`, overlap กับ band; วันอาทิตย์=300/วัน, นอกเวลา 08:00–17:00=20-40/ชม; gate ด้วย `#needDriver`), `bkCloseAllTimePops`, `bkBindBookingControls` (bind ครั้งเดียว module-load). `openBookingModal` reset date+เวลา 08:00–17:00 ทุกครั้ง; `initFlatpickr()` เลิกผูก `bk_date` (เหลือ noop); submit handler validate `#bk_date` เอง (hidden). const `BK_DOW_S`/`BK_MON_S`/`BK_TIMES`/`BK_WORK_START=480`/`BK_WORK_END=1020` |
| `VCMenus.init/enhanceDropdown/enhanceAutocomplete/enhanceAutocompleteSelect` | [core/js/dropdown.js](../../app/static/core/js/dropdown.js) | shared cmdk-style dropdown + autocomplete (see Design System > Component library). **3 components:** (1) `select[data-dropdown]` = non-searchable `vc-dd`; (2) `input[data-autocomplete list]` = searchable `vc-ac`, submits typed text; (3) `select[data-autocomplete]` = **searchable `vc-ac` แต่ `<select>` เป็น source of truth → submit `<option>` value (id) ไม่ใช่ label** (strict combobox, ใช้กับ `#sbApprover` ใน vehicle_budget.html — preset value ต้อง `dispatchEvent('change')` ให้ label sync). Auto-inits on load; load as module **after** page JS so initial `<select>.value` is read post page-side logic. |

### Telegram
| Function | File:Line |
|----------|-----------|
| `_send()` | [telegram_service.py:19](../../app/views/core/telegram_service.py#L19) |
| `delete_old_message()` | [telegram_service.py:35](../../app/views/core/telegram_service.py#L35) |
| `notify_approved()` | [telegram_service.py:92](../../app/views/core/telegram_service.py#L92) |
| `notify_forwarded_to_approver()` | [telegram_service.py:112](../../app/views/core/telegram_service.py#L112) |
| `notify_approver_approved()` | [telegram_service.py:131](../../app/views/core/telegram_service.py#L131) |
| `notify_rejected()` | [telegram_service.py:150](../../app/views/core/telegram_service.py#L150) |
| `notify_cancelled()` | [telegram_service.py:164](../../app/views/core/telegram_service.py#L164) | **Phase 9 (2026-05-22)** — 🚫 ยกเลิกการจอง · delete_old + send + save_id |

---

## 🧱 Database Models

**27 tables total** — รายละเอียดเต็ม: [database/schema.md](database/schema.md)

> **2026-06-07:** `models.py` แตกเป็น package `models/` ตาม domain (re-export ครบ — `from models import X` เดิมใช้ได้ทุกตัว) คอลัมน์ "ไฟล์" ชี้ไฟล์ domain ที่ class นั้นอยู่ (line ดู §schema.md)

| Model | ไฟล์ | หมายเหตุ |
|-------|------|---------|
| `BudgetType` | [models/vehicle_budget.py](../../app/models/vehicle_budget.py) | lookup: central/department |
| `ExpenseType` | [models/vehicle_budget.py](../../app/models/vehicle_budget.py) | lookup: central/department/personal |
| `VehicleDepartment` | [models/vehicle_budget.py](../../app/models/vehicle_budget.py) | แผนก + budget_type |
| `User` | [models/user.py](../../app/models/user.py) | 4 role fields + is_superadmin |
| `RepairTicket` | [models/repair.py](../../app/models/repair.py) | |
| `MaintenanceTicket` | [models/maintenance.py](../../app/models/maintenance.py) | |
| `Vehicle` | [models/vehicle.py](../../app/models/vehicle.py) | fuel_rate, next_service_*, tax_due_date |
| `Driver` | [models/vehicle.py](../../app/models/vehicle.py) | link to User · **+profile (2026-06-08):** national_id, addr_line/subdistrict/district/province/postal, id_card_image, avatar_image → upload `static/uploads/driver/` |
| `VehicleBooking` | [models/vehicle.py](../../app/models/vehicle.py) | ⭐ หัวใจหลัก — snap_* fields |
| `RoomBooking` | [models/room.py](../../app/models/room.py) | |
| `VehicleMileage` | [models/vehicle.py](../../app/models/vehicle.py) | + payment tracking (2026-04-23) |
| `SystemConfig` | [models/common.py](../../app/models/common.py) | key-value, มี `.get()`/`.set()` |
| `VehicleBudget` | [models/vehicle_budget.py](../../app/models/vehicle_budget.py) | unique(type, dept, year, month) + `is_active` toggle (2026-05-18) |
| `Notification` | [models/common.py](../../app/models/common.py) | + category/action_url/sticky (2026-04-23) |
| `TripPassenger` | [models/vehicle.py](../../app/models/vehicle.py) | CASCADE delete |
| `VehicleServiceLog` | [models/vehicle.py](../../app/models/vehicle.py) | sync → vehicle.next_service_* |
| `DeptApprover` | [models/vehicle_budget.py](../../app/models/vehicle_budget.py) | junction: User many-to-many VehicleDepartment (approver) |
| `TripExpenseItem` | [models/vehicle.py](../../app/models/vehicle.py) | toll/parking/food/other |
| `OTRateConfig` | [models/vehicle_ot.py](../../app/models/vehicle_ot.py) | อัตรา OT แต่ละ time band + seed 4 rows + `day_of_week` per-weekday override (NULL=ทุกวัน, v2.10) |
| `DriverOT` | [models/vehicle_ot.py](../../app/models/vehicle_ot.py) | 1 OT record ต่อ 1 booking — paid/unpaid + no_receipt + soft-delete (v2.15 ตัด approval) |
| `DriverOTSlot` | [models/vehicle_ot.py](../../app/models/vehicle_ot.py) | time slot แต่ละช่วงใน OT record — snapshot rate |
| `FuelBill` | [models/vehicle_fuel.py](../../app/models/vehicle_fuel.py) | บิลค่าน้ำมันเดี่ยว → vehicle/driver, link to FuelReimbursement |
| `FuelReimbursement` | [models/vehicle_fuel.py](../../app/models/vehicle_fuel.py) | ใบเบิกรวม 1:N FuelBill — `submitted_at` / `received_at` |
| `FuelPrice` | [models/vehicle_fuel.py](../../app/models/vehicle_fuel.py) | ราคา/ลิตรตามช่วงเวลา — `get_for_date()` (replaces SystemConfig['fuel_price']) |
| `FuelReserveConfig` | [models/vehicle_fuel.py](../../app/models/vehicle_fuel.py) | เงินสำรอง singleton (id=1) — `get_amount()` |
| `FuelReserveLog` | [models/vehicle_fuel.py](../../app/models/vehicle_fuel.py) | ประวัติการปรับเงินสำรอง — note required |
| `VehicleBudgetLog` | [models/vehicle_budget.py](../../app/models/vehicle_budget.py) | **ledger** ของ vehicle_budget — ทุก mutation ต้องผ่าน BudgetService (2026-05-06) |

---

