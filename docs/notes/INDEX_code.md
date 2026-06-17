# INDEX — Key Functions + Database Models

> Part ของ INDEX.md แยก เพื่อ token budget — [กลับ hub](INDEX.md)
> **อัปเดตล่าสุด:** 2026-06-14

---

## 🔧 Key Functions (non-route)

### Permission helpers
| Function | File:Line |
|----------|-----------|
| `is_vehicle_admin()` | [views/vehicle/vehicle_common.py](../../app/views/vehicle/vehicle_common.py) |
| `require_vehicle_admin` | [vehicle_common.py](../../app/views/vehicle/vehicle_common.py) | **Phase 5 #15 (2026-06-12)** — decorator: block route ถ้าไม่ใช่ vehicle admin (flash + redirect vehicle.index) |
| `is_repair_admin()` | [repair_view.py:14](../../app/views/repair_view.py#L14) |
| `is_maintenance_admin()` | [maintenance_view.py:14](../../app/views/maintenance_view.py#L14) |

### Home / Action Hub helpers (auth_view.py — 2026-06-16)
| Function | File:Line | หน้าที่ |
|----------|-----------|---------|
| `_build_my_requests(user, limit=12)` | [auth_view.py:93](../../app/views/auth_view.py#L93) | รวมคำขอของ user ทุก service (vehicle/repair/maintenance/room) → list of dict normalized `{service, icon, title, subtitle, status_label, status_color, created_at, repeat_url}` เรียง `created_at` desc. status map ผ่าน `_VEHICLE_STATUS`/`_TICKET_STATUS`; room ไม่มี status → label จากเวลา (กำลังจะถึง/ผ่านแล้ว); `repeat_url` = `<svc>.index?copy_from=<id>` |
| `_build_today_items(user)` | [auth_view.py:140](../../app/views/auth_view.py#L140) | รายการของ user ที่มีกำหนดวันนี้ (จองรถ approved + จองห้อง) เรียงตามเวลาเริ่ม → `{icon, title, meta, time}` |

### Fuel cost helpers (vehicle_common.py — 2026-06-12)
| Function | File | หน้าที่ |
|----------|------|---------|
| `get_fuel_price(on_date)` | [vehicle_common.py](../../app/views/vehicle/vehicle_common.py) | ราคาน้ำมัน/ลิตร ณ วันที่ — `FuelPrice.get_for_date(date)` + fallback `SystemConfig['fuel_price']`; คืน `float` |
| `calc_fuel_cost(vehicle, distance, fuel_price, override=None)` | [vehicle_common.py](../../app/views/vehicle/vehicle_common.py) | คำนวณค่าน้ำมัน — ใช้ `override` (mileage.fuel_cost) ถ้ามีค่า; ไม่งั้น `round((distance/fuel_rate)*fuel_price,2)`; คืน 0.0 ถ้าข้อมูลไม่ครบ; ใช้ร่วม mileage_log/driver_mileage/mileage_export/approver_inbox/budget_personal |
| `_build_budget_subs()` | [vehicle_common.py](../../app/views/vehicle/vehicle_common.py) | **2026-06-14** — distinct หมวด/กอง จาก approved booking (central_category / trip_department) → `{central:[{key,label}], department:[...]}` สำหรับ cascade filter งบ; ย้ายมาจาก vehicle_mileage (DRY) ใช้ร่วม `mileage_log` + `cost_summary` |
| `_apply_budget_filter(q, budget_type, budget_sub)` | [vehicle_cost.py](../../app/views/vehicle/vehicle_cost.py) | **2026-06-14** — กรอง DriverOT ตามงบ (derive จาก booking ที่ผูก) — join `VehicleBooking` แล้ว filter `expense_type` (+ `central_category`/`trip_department` ตาม sub). standalone OT (booking_id=None) หลุดเมื่อ filter active. ใช้ร่วม `cost_summary` + `cost_export` |

### Business logic

> ⚠️ **ขั้น 3 (2026-06-07):** path `vehicle_view.py:NNN` ในตารางนี้ **ตายแล้ว** — หา controller จาก mapping ที่ [§Blueprints](#-blueprints) (route group → file). helpers (`_lookup_budget_for_booking`/`auto_generate_ot`/`_fmt_date_th`) → `vehicle_common.py`; `_build_budget_pivot` → `vehicle_budget.py`. line number เป็น approximate

| Function | File:Line | หน้าที่ |
|----------|-----------|---------|
| `book_vehicle_simple()` | [vehicle_view.py:83](../../app/views/vehicle_view.py#L83) | สร้าง booking + validate ห้ามข้ามวัน |
| `cancel_booking()` | [vehicle_booking.py:268](../../app/views/vehicle/vehicle_booking.py#L268) | soft cancel. owner: status ∈ {pending, waiting_approver}; admin: +approved; time guard `now < start_datetime`; **ไม่มี refund งบ** (งบหักตอนปิดทริปเท่านั้น); multi-recipient notify (priority cascade dedup) + Telegram + `status='cancelled'`. **2026-06-12: ถอด refund_for_booking, แก้ owner guard** |
| `approve_booking()` | [vehicle_view.py:527](../../app/views/vehicle_view.py#L527) | approve/reject + status flow + reject_reason. **2026-05-18:** check budget ก่อน approve (admin + approver path) ผ่าน `_lookup_budget_for_booking()`. **2026-06-06 (งบช่วงเวลา):** block ถ้า lookup คืน `None` (ไม่มีงบ active ครอบวันเดินทาง) → flash danger + return |
| `_lookup_budget_for_booking(booking, on_date=None)` | [vehicle_common.py:81](../../app/views/vehicle/vehicle_common.py#L81) | helper หา `VehicleBudget` ที่ booking จะหักงบ. **2026-06-06 (งบช่วงเวลา):** เปลี่ยนจาก year/month → date-range — หางบ `is_active=True` ที่ `start_date <= on_date <= end_date` (`on_date` default = วันเริ่ม booking; deduct ส่งวันปิดทริป); overlap → `start_date` ล่าสุด; คืน `(budget, key_label)`, `None` ถ้าไม่พบ. ใช้ร่วมทั้ง approve + 3 จุดหักงบ (mileage_log/driver_mileage/override_fuel) |
| `approver_inbox()` | [vehicle_booking.py:358](../../app/views/vehicle/vehicle_booking.py#L358) | approver ดูรายการรอแผนกตัวเอง + ประวัติ + งบ active-period (`is_active` + `start_date<=today<=end_date`, mirror `_lookup_budget_for_booking`). **2026-06-10:** เพิ่ม dict `fuel_costs` (override `mileage.fuel_cost` ไม่งั้น `(odoEnd-odoStart)/fuel_rate*fuel_price` ผ่าน `FuelPrice.get_for_date`; trip ไม่ปิด=0) สำหรับ fuel badge. ctx: pending, history, budgets, fuel_costs |
| `inject_approver_pending_count()` | [app.py](../../app/app.py) | context processor — badge จำนวน waiting_approver สำหรับ approver |
| `inject_admin_pending_tomorrow()` | [app.py](../../app/app.py) | **2026-05-23** — context processor: `pending_count` = #VehicleBooking ที่ `status='pending'` + `start_datetime` ตกบนวันพรุ่งนี้ (BKK time, `get_bkk_time() + 1d` → date range `time.min..time.max`). คำนวณเฉพาะ vehicle admin/superadmin — ใช้สำหรับ badge "อนุมัติรถ" บน sidebar |
| `admin_assign()` | [vehicle_admin.py:449](../../app/views/vehicle/vehicle_admin.py#L449) | assign รถ+คนขับ + snap_*. **Phase 5 #15 (2026-06-12):** เพิ่ม `guard_budget()` check ก่อน approve path — block 400 ถ้าไม่มีงบ active ครอบวันเดินทาง (gap เดิมไม่เคยเช็ค) |
| `guard_budget(booking)` | [vehicle_workflow.py](../../app/views/vehicle/vehicle_workflow.py) | **Phase 5 #15 (2026-06-12)** — เช็ค active budget ก่อน approve; expense_type ไม่ใช่ central/department → skip; คืน `(ok: bool, error_msg: str|None)` |
| `apply_transition(booking, to_status, actor_id=None)` | [vehicle_workflow.py](../../app/views/vehicle/vehicle_workflow.py) | **Phase 5 #15 (2026-06-12)** — เปลี่ยน status ถ้า ALLOWED_TRANSITIONS อนุญาต; ตั้ง updated_by ถ้า actor_id ส่งมา; ไม่ commit; คืน `(ok, msg)` |
| `_save_driver_image(field_name, prefix)` | [vehicle_admin.py:25](../../app/views/vehicle/vehicle_admin.py#L25) | **2026-06-08 (driver profile)** — เซฟรูปคนขับจาก `request.files` → `static/uploads/driver/` (ชื่อไฟล์ `{timestamp}_{prefix}_{secure_filename}`) คืนชื่อไฟล์ หรือ `None` ถ้าไม่ส่งมา. ใช้ใน `manage_fleet` action `add_driver`/`edit_driver` (avatar_image + id_card_image; edit ไม่ส่งไฟล์ = เก็บของเดิม) |
| `mileage_log()` | [vehicle_mileage.py:312](../../app/views/vehicle/vehicle_mileage.py#L312) | admin บันทึกไมล์ + หักงบผ่าน BudgetService + dashboard KPI/breakdown/filter; default filter = เดือนปัจจุบัน (show_all=1 เพื่อดูทั้งหมด). **Phase 5.8 (2026-05-17)**: filter เพิ่ม `budget_type` + `budget_sub` (chained dependent dropdown, pattern เดียวกับ `updateExpSubDropdown` ใน vehicle-admin.js — JS rebuild `<option>` ด้วย `innerHTML` จาก `window.EXPENSE_CATS` (= `budget_subs` ที่ route query distinct `central_category`+`trip_department` จาก approved bookings **ทั้งหมดใน DB** ไม่ผูก filter หน้านี้ — map label จาก `EXPENSE_CATEGORIES` ถ้าไม่เจอ key ใช้ key เป็น label เอง เช่น `งานโภชนาการ`; **2026-06-08**) เมื่อ type เปลี่ยน) + `booker_q` (User.full_name/username ilike + `<datalist>`); render_template ส่ง `bookers_all`/`budget_subs` เพิ่ม. **Phase 5.7 (2026-05-17)**: enrich rows ด้วย `budget_type/budget_label/budget_sub` (จาก `expense_type`/`central_category`/`trip_department`) + `has_refuel` (FuelBill range match: `vehicle_id` + `odo_start ≤ mileage ≤ odo_end`); group rows ที่ `trip_group` เดียวกัน → `display_rows` (representative=row แรก) → ส่ง template เพิ่ม; ลบ `refuel_keys` set lookup เดิม |
| `mileage_export()` | [vehicle_mileage.py:420](../../app/views/vehicle/vehicle_mileage.py#L420) | Export Excel ตาม filter ปัจจุบัน |
| `driver_mileage()` | [vehicle_driver.py:303](../../app/views/vehicle/vehicle_driver.py#L303) | คนขับบันทึกไมล์ + หักงบผ่าน BudgetService |
| `driver_home()` | [vehicle_driver.py:36](../../app/views/vehicle/vehicle_driver.py#L36) | driver dashboard — งานวันนี้/พรุ่งนี้ + `latest_odo` dict: เลขไมล์ล่าสุดต่อรถ `MAX(COALESCE(odometer_end, odometer_start))` (join VehicleMileage→VehicleBooking, group by `assigned_vehicle_id`) → template ใช้ prefill เลขไมล์ออก; ส่ง `vehicles`/`users` ให้ modal งานนอกระบบ + dropdown เปลี่ยนรถฉุกเฉิน (`driver_change_vehicle`) |
| `override_fuel()` | [vehicle_cost.py:53](../../app/views/vehicle/vehicle_cost.py#L53) | admin override `mileage.fuel_cost` + auto refund/rededuct ผ่าน BudgetService |
| `budget_manage()` | [vehicle_budget.py:404](../../app/views/vehicle/vehicle_budget.py#L404) | ตั้ง/แก้เพดานงบ — log ผ่าน `BudgetService`; POST actions: `set_budget` / `top_up` / `manual_adjust` / **`cancel_booking`** (เปลี่ยนจาก `refund_booking` 2026-06-12, ไม่ refund งบ แค่ flip status) / **`toggle_active`** (2026-05-18) / **`extend_period`** (2026-06-06). `top_up` + `manual_adjust` block ถ้า budget inactive. KPI sum filter `is_active=True`. **Phase 7 (2026-05-22):** + `_build_budget_pivot(fiscal_year_start_ad)` helper. **2026-06-08:** `_build_budget_pivot` คืน key `summary` เพิ่ม — `{central,dept: budget/used/pct/count · personal: used}` รวมทั้งปีงบ (budget = sum เพดาน VehicleBudget ที่ (year,month) ∈ fiscal_months ตามประเภท) สำหรับ pivot สรุป 3 แถว. **2026-06-06 (งบช่วงเวลา):** GET เลิก filter year/month → ดึงงบทั้งหมด แยกเป็น active-for-month (is_active + ช่วง start–end overlap เดือนที่เลือก) → `central_budgets`/`dept_budgets` vs `archived_budgets` (section "คลังงบ" ด้านล่าง + `status_reason` closed/expired/future/no_period). `extend_period` = ตั้ง start–end ใหม่ + `set_active(True)` + optional top-up (นำงบจากคลังกลับมาใช้). |
| `_build_budget_pivot()` | [vehicle_budget.py:470](../../app/views/vehicle/vehicle_budget.py#L470) (helper หลัง `budget_manage()`) | Phase 7 helper — รับ AD year ที่เป็น "ปีเริ่ม มี.ค." → return dict `{central, central_labels, central_max, dept, dept_labels, dept_max, personal, personal_max, fiscal_months: [(m,y)×12]}`. **2026-06-06 (งบช่วงเวลา):** central/dept source เปลี่ยนจาก `VehicleBudget.used_amount` ต่อ (dept,month) → sum `VehicleBudgetLog` (event `deduct`/`refund`/`adjust`) group by month(`created_at`) ภายในปีงบ; personal row คงเดิม. **Phase 5 (2026-06-12):** เพิ่ม 2 key `personal_by_user: { user_id: { month_num: float } }` + `personal_user_labels: { user_id: str }` สำหรับ per-user breakdown. Used by `budget_manage()`. |
| `BudgetService` | [views/vehicle/vehicle_budget_service.py](../../app/views/vehicle/vehicle_budget_service.py) | API กลาง: `deduct_for_mileage` / `refund_for_mileage` / `rededuct_for_mileage` / `set_budget_amount` / `manual_adjust` / **`set_active`** (2026-05-18) / `verify_cache_integrity`. **2026-06-12: ลบ `refund_for_booking` ออก** — งบไม่คืนตอน cancel/reject; `refund_for_mileage` ยังอยู่ (ใช้โดย `rededuct_for_mileage` ← `override_fuel`) |
| `deduct_budget_for_trip(booking, m2, source)` | [vehicle_common.py](../../app/views/vehicle/vehicle_common.py) | **2026-06-13** — helper กลาง หักงบ/แจ้งจ่ายส่วนตัวหลังปิดทริป (รวม `_deduct_budget_for_trip`+`_driver_deduct_budget` เดิม). `source` = ชื่อ route caller → ใส่ใน BudgetLog.note + log tag. ใช้ร่วม `mileage_log` + `driver_mileage` |
| `calc_ot()` | [vehicle_view.py:1023](../../app/views/vehicle_view.py#L1023) | คำนวณ OT |
| `_parse_ot_slots(form)` | [vehicle_cost.py:34](../../app/views/vehicle/vehicle_cost.py#L34) | แปลง `slot_cfg[]`/`slot_start[]`/`slot_end[]` จากฟอร์ม OT modal → `list[DriverOTSlot]` — derive label/rate จาก `OTRateConfig` (snapshot ลง slot); **amount**: `cfg.day_of_week is not None` → flat fee = rate (ไม่คูณชั่วโมง); `day_of_week is None` → hourly = hrs × rate; ใช้ร่วม `ot_create` + `ot_edit` |
| `_wants_json()` | [vehicle_cost.py:63](../../app/views/vehicle/vehicle_cost.py#L63) | เช็ค header `X-Requested-With: fetch` (vehicle_ot.js) → OT row action ตอบ JSON แทน flash/redirect — ใช้ทุก row action (mark_paid/toggle_no_receipt/create/edit/delete/restore) |
| `get_bkk_time()` | [models/base.py:9](../../app/models/base.py#L9) | Thai time (UTC+7, naive) — อยู่กับ `db` ใน base.py |

### Notification
| Function | File:Line | หน้าที่ |
|----------|-----------|---------|
| `_create()` | [notification_service.py:45](../../app/views/core/notification_service.py#L45) | สร้าง in-app notif + **mirror LINE DM** ให้ user ที่มี `line_user_id` (2026-06-12, graceful skip). **Title freeze (2026-06-16):** รับ `title` → เก็บลง `Notification.title` (บรรทัดแรก UI card) ตอนสร้าง แทน compute ตอน serialize → แต่ละ notif เก็บ title เฉพาะของมัน + รองรับ dynamic ("อนุมัติงาน {purpose}") + แยก case ที่ event_key ชนกันได้. **Supersede (2026-06-15):** รับ `event_key` — ถ้ามี `booking_id` + `event_key` + ไม่ sticky → `UPDATE` notif เดิม (user+booking+event_key, `superseded_at IS NULL`) ตั้ง `superseded_at=now` ก่อน add อันใหม่ → กัน event ชนิดเดียวสะสมซ้ำต่อ booking (เหลือล่าสุด). `event_key` ใช้แทน icon เพราะ icon string ชนกัน (approved/payment_done = check icon เดียวกัน). ฝั่งอ่าน `api_notifications` filter `superseded_at IS NULL` (notifs + unread) |
| `_ot_total()` | [notification_service.py:105](../../app/views/core/notification_service.py#L105) | รวมค่า OT สารถีของ booking (ตัด is_deleted + no_receipt) — ใช้ใน payment/budget notif แตกค่าเดินทาง = น้ำมัน + OT; **เป็นกลไกกฎ self-pay**: ย้าย OT ไป no_receipt → บรรทัด OT หายอัตโนมัติ |
| **Phase 2d helpers (2026-06-15)** | [notification_service.py:120-183](../../app/views/core/notification_service.py#L120) | `_vehicle_admin_ids()`, `_booking_approver_ids()` (DeptApprover by dept), `_booking_driver_uid()` (`Driver.linked_user`; ไม่มี account → `logger.warning`+None), `_emit()` (dict user_id→msg, dedup/skip None; รับ `title` ส่งต่อทุก recipient — 2026-06-16), `_pay_subtitle()` (subtitle ค่าเดินทาง format ตามองค์ประกอบ: ทั้งคู่ "ทั้งหมด X (น้ำมัน:f + OT:o)" / น้ำมันเดียว / OT เดียว — 2026-06-16). **Retired 2026-06-16:** `_budget_sub_label()` + `_cost_lines()` ลบ (notif ใช้ `_pay_subtitle` แทน) |
| `notify_booking_created()` | [notification_service.py:201](../../app/views/core/notification_service.py#L201) | **Phase 2d multi-recipient** — owner "จองสำเร็จ รอ admin" + admin "มีจองใหม่ วันที่… โดย…" |
| `notify_admin_assigned()` | [notification_service.py:215](../../app/views/core/notification_service.py#L215) | **#2/#5** title `มีการปรับเปลี่ยนรถ` / sub `ปรับเปลี่ยนรถเป็น รถ {brand model (ทะเบียน)}` (2026-06-16 ข้อความเดียวทุก role — owner+admin+driver); `event_key='assigned'` → reassign รอบใหม่ supersede รอบเก่า |
| `notify_admin_approved()` | [notification_service.py:227](../../app/views/core/notification_service.py#L227) | **#6** title `อนุมัติงาน {purpose}` / sub `{คนขับ} → {destination}` (2026-06-16); `event_key='approved'` (title freeze แยกจาก approver_approved) |
| `notify_forwarded_to_approver()` | [notification_service.py:239](../../app/views/core/notification_service.py#L239) | **#3** title `ส่งต่อให้ผู้ประสานงาน` / sub `อยู่ระหว่างการรอผู้ประสานงานกองอนุมัติ` (2026-06-16 ข้อความเดียวทุก role) |
| `notify_approver_approved()` | [notification_service.py:251](../../app/views/core/notification_service.py#L251) | **#4** title `ส่งต่อให้ผู้ประสานงาน` / sub `ผู้ประสานงานกองอนุมัติเรียบร้อย` (2026-06-16 ข้อความเดียวทุก role); `event_key='approved'` |
| `notify_rejected()` | [notification_service.py:266](../../app/views/core/notification_service.py#L266) | reject → owner (ไม่ multi) |
| `notify_merged_into_group()` | [notification_service.py:281](../../app/views/core/notification_service.py#L281) | รวม trip |
| `notify_mileage_started/ended()` | [notification_service.py:295,306](../../app/views/core/notification_service.py#L295) | **#1/#2** title `เริ่มต้น/สิ้นสุดการเดินทาง` / sub `เลขไมล์เริ่มต้น/สิ้นสุด {odometer} km` (2026-06-16) → owner+admin+driver |
| `notify_budget_deducted()` | [notification_service.py:317](../../app/views/core/notification_service.py#L317) | **#7 central/dept** title `แจ้งหักงบส่วนกลาง` / sub `_pay_subtitle()` (2026-06-16 ข้อความเดียวทุก role owner+admin+approver) |
| `notify_payment_required()` | [notification_service.py:331](../../app/views/core/notification_service.py#L331) | **#7 personal** title `แจ้งร่วมบุญค่าเดินทาง` / sub `_pay_subtitle()` → owner(sticky) + admin(payment_admin) (2026-06-16 title+sub เดียวกันทุก role) |
| `notify_payment_reminder_user()` | [notification_service.py:356](../../app/views/core/notification_service.py#L356) | เตือนชำระ (cron, msg แตก น้ำมัน + OT) |
| `notify_payment_overdue_admin()` | [notification_service.py:375](../../app/views/core/notification_service.py#L375) | เตือน admin (cron, msg แตก น้ำมัน + OT) |
| `notify_user_cancelled()` | [notification_service.py:423](../../app/views/core/notification_service.py#L423) | **Event #16 (Phase 9, 2026-05-22)** — soft cancel multi-recipient; 5 role_labels (owner/admin/approver/driver/mate); icon `deleted` (trash); text แตก by role |
| `notify_payment_confirmed()` | [notification_service.py:656](../../app/views/core/notification_service.py#L656) | **#8** title `สรุปการเดินทาง` / sub `เดินทางด้วยรถ {รถ(ทะเบียน)} ระยะทาง {dist} กม. ใช้จ่ายทั้งหมด {total} บาท` (2026-06-16) → owner + admin |
| `notify_auto_rejected()` | [notification_service.py:454](../../app/views/core/notification_service.py#L454) | **Event #17 (Phase 2, 2026-06-12)** — แจ้ง owner เมื่อระบบ auto-reject booking เลยวันเดินทาง; ntype=warning; icon=rejected |
| `notify_repair_created/accepted/closed()` | [notification_service.py:486](../../app/views/core/notification_service.py#L486) | **Events #18-20 · Phase 2d (2026-06-15)** — created → **owner ยืนยัน + admin งานใหม่**; accepted → owner "Admin กำลังเข้าซ่อมแซม"; closed → **owner เสร็จ + admin งานถูกปิด** |
| `notify_maintenance_created/accepted/closed()` | [notification_service.py:541](../../app/views/core/notification_service.py#L541) | **Events #21-23 · Phase 2d** — pattern เดียวกับ Repair (owner+admin) |
| `notify_room_booked()` | [notification_service.py:640](../../app/views/core/notification_service.py#L640) | **Event #24 · Phase 2d** — Room: "ยืนยันการจอง{room} วันที่… ตั้งแต่เวลา…ถึง… เรียบร้อยแล้ว" |
| `notify_ot_created()` | [notification_service.py](../../app/views/core/notification_service.py) | **Event #25 (Phase 2b, 2026-06-15)** — Vehicle OT: แจ้ง **admin ทุกคน** (เดิม driver) เมื่อ auto_generate_ot() สร้าง OT; category=status ntype=info |
| `notify_admin_personal_trip()` | [notification_service.py](../../app/views/core/notification_service.py) | **Event #26 (Phase 2b, 2026-06-15)** — แจ้ง admin ทุกคนเมื่อปิดทริปส่วนตัว/ad-hoc; category=payment_admin ntype=warning; เรียกจาก `deduct_budget_for_trip()` ใน vehicle_common.py |
| `check_payment_escalation()` | [notification_cron.py:28](../../app/views/core/notification_cron.py#L28) | cron job — personal payment overdue (08:00 BKK) |
| `auto_reject_overdue_bookings()` | [notification_cron.py:91](../../app/views/core/notification_cron.py#L91) | **cron job (Phase 2, 2026-06-12)** — reject pending/waiting_approver ที่ start_datetime < now; 08:10 BKK; idempotent; notify owner 1 ใบ |

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

### Broadcast dispatcher (group — 2026-06-12)
| Function | File:Line | หน้าที่ |
|----------|-----------|---------|
| `notify_*` (5 ตัว) | [broadcast.py](../../app/views/core/broadcast.py) | รวม Telegram + LINE group ไว้ที่เดียว — controller import จากนี่แทน `telegram_service`. `_safe()` กัน 1 ช่องทางพังไม่ลามอีกช่องทาง |

### LINE Messaging API (2026-06-12)
| Function | File:Line | หน้าที่ |
|----------|-----------|---------|
| `_push()` / `_push_group()` / `_push_user()` | [line_service.py](../../app/views/core/line_service.py) | push text → target / group (`LINE_GROUP_ID`) / user (`line_user_id`); graceful skip |
| `reply()` | [line_service.py](../../app/views/core/line_service.py) | ตอบ event ด้วย replyToken (ใช้ใน webhook) |
| `notify_*` (5 ตัว) | [line_service.py](../../app/views/core/line_service.py) | ชื่อตรงกับ telegram_service → group push (plain text, no HTML) |
| `line_webhook()` | [line_webhook.py](../../app/views/core/line_webhook.py) | verify `X-Line-Signature` (HMAC-SHA256) → ผูกบัญชีผ่านโค้ด 6 หลัก + log groupId |
| `line_link()` | [line_webhook.py](../../app/views/core/line_webhook.py) | หน้า `/line/link` แสดงโค้ด 6 หลัก (gen ลง `User.line_link_code`) |

---

## 🧱 Database Models

**26 tables total** — รายละเอียดเต็ม: [database/schema.md](database/schema.md)

> **2026-06-07:** `models.py` แตกเป็น package `models/` ตาม domain (re-export ครบ — `from models import X` เดิมใช้ได้ทุกตัว) คอลัมน์ "ไฟล์" ชี้ไฟล์ domain ที่ class นั้นอยู่ (line ดู §schema.md)
> **2026-06-14:** `ExpenseType` model + `expense_type` table ลบออก (Phase 1 — ไม่เคยใช้งานจริง)

| Model | ไฟล์ | หมายเหตุ |
|-------|------|---------|
| `BudgetType` | [models/vehicle_budget.py](../../app/models/vehicle_budget.py) | lookup: central/department |
| `VehicleDepartment` | [models/vehicle_budget.py](../../app/models/vehicle_budget.py) | แผนก + budget_type |
| `User` | [models/user.py](../../app/models/user.py) | 4 role fields + is_superadmin · **+LINE (2026-06-12, v2.17):** line_user_id (unique), line_link_code (โค้ด 6 หลักผูกบัญชี) |
| `RepairTicket` | [models/repair.py](../../app/models/repair.py) | |
| `MaintenanceTicket` | [models/maintenance.py](../../app/models/maintenance.py) | |
| `Vehicle` | [models/vehicle.py](../../app/models/vehicle.py) | fuel_rate, next_service_*, tax_due_date |
| `Driver` | [models/vehicle.py](../../app/models/vehicle.py) | link to User · **+profile (2026-06-08):** national_id, addr_line/subdistrict/district/province/postal, id_card_image, avatar_image → upload `static/uploads/driver/` |
| `VehicleBooking` | [models/vehicle.py](../../app/models/vehicle.py) | ⭐ หัวใจหลัก — snap_* fields |
| `RoomBooking` | [models/room.py](../../app/models/room.py) | |
| `VehicleMileage` | [models/vehicle.py](../../app/models/vehicle.py) | + payment tracking (2026-04-23) |
| `SystemConfig` | [models/common.py](../../app/models/common.py) | key-value, มี `.get()`/`.set()` |
| `VehicleBudget` | [models/vehicle_budget.py](../../app/models/vehicle_budget.py) | unique(type, dept, year, month) + `is_active` toggle (2026-05-18) |
| `Notification` | [models/common.py](../../app/models/common.py) | + category/action_url/sticky (2026-04-23) + event_key/superseded_at (supersede, 2026-06-15) |
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

