# INDEX — Key Functions + Database Models

> Part ของ INDEX.md แยก เพื่อ token budget — [กลับ hub](INDEX.md)
> **อัปเดตล่าสุด:** 2026-07-19

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

### Fuel cost helpers (ย้ายออกจาก vehicle_common.py — Clean Architecture Phase 1/3, 2026-07-19)
| Function | File | หน้าที่ |
|----------|------|---------|
| `get_fuel_price(on_date)` | [services/vehicle/mileage_service.py:47](../../app/services/vehicle/mileage_service.py#L47) | **ปิด DEBT-2 (Phase 3)** — query ORM (`FuelPrice`/`SystemConfig`) จึงอยู่ service ไม่ใช่ domain. ราคาน้ำมัน/ลิตร ณ วันที่ — `FuelPrice.get_for_date(date)` + fallback `SystemConfig['fuel_price']`; คืน `float`. `vehicle_common.py` re-export ชื่อเดิมไว้ |
| `calc_fuel_cost(vehicle, distance, fuel_price, override=None)` | [domain/vehicle/fuel.py:9](../../app/domain/vehicle/fuel.py#L9) | **ย้าย Phase 1 — pure function จริง อยู่ domain ได้** คำนวณค่าน้ำมัน — ใช้ `override` (mileage.fuel_cost) ถ้ามีค่า; ไม่งั้น `round((distance/fuel_rate)*fuel_price,2)`; คืน 0.0 ถ้าข้อมูลไม่ครบ; ใช้ร่วม mileage_log/driver_mileage/mileage_export/approver_inbox/budget_personal/notification_cron. `vehicle_common.py` re-export ชื่อเดิมไว้ |
| `_build_budget_subs()` | [vehicle_common.py](../../app/views/vehicle/vehicle_common.py) | **2026-06-14** — distinct หมวด/กอง จาก approved booking (central_category / trip_department) → `{central:[{key,label}], department:[...]}` สำหรับ cascade filter งบ; ย้ายมาจาก vehicle_mileage (DRY) ใช้ร่วม `mileage_log` + `cost_summary` |
| `_apply_budget_filter(q, budget_type, budget_sub)` | [vehicle_cost.py](../../app/views/vehicle/vehicle_cost.py) | **2026-06-14** — กรอง DriverOT ตามงบ (derive จาก booking ที่ผูก) — join `VehicleBooking` แล้ว filter `expense_type` (+ `central_category`/`trip_department` ตาม sub). standalone OT (booking_id=None) หลุดเมื่อ filter active. ใช้ร่วม `cost_summary` + `cost_export` |

### Business logic

> **Clean Architecture refactor (Phase 0-6, 2026-07-19):** business logic ที่แตะเงิน/สถานะเกือบทั้งหมดย้ายจาก controller (`views/vehicle/*.py`) เข้า `services/vehicle/*.py` (use-case orchestration) + `domain/vehicle/*.py` (pure logic) แล้ว — ตารางนี้ sync ใหม่ทั้งหมด (Phase 6) แถวที่เหลือ `vehicle_view.py` (ไฟล์ตายตั้งแต่ "ขั้น 3, 2026-06-07" ก่อนงาน refactor นี้) หา controller จริงจาก mapping ที่ [§Blueprints](INDEX.md#-blueprints) แทน

| Function | File:Line | หน้าที่ |
|----------|-----------|---------|
| `book_vehicle_simple()` | [vehicle_booking.py:57](../../app/views/vehicle/vehicle_booking.py#L57) | สร้าง booking + validate ห้ามข้ามวัน (นอก scope service refactor — ไม่มี service function รองรับ) |
| `cancel_booking()` (route) → `booking_service.cancel()` | [vehicle_booking.py:238](../../app/views/vehicle/vehicle_booking.py#L238) → [services/vehicle/booking_service.py:325](../../app/services/vehicle/booking_service.py#L325) | **Phase 2 (2026-07-19):** logic ทั้งหมดย้ายเข้า `booking_service.cancel()` — route เหลือ parse+call+flash. user ยกเลิกได้เฉพาะ `status=='pending'`; admin: pending/waiting_approver/approved ไม่มี time guard; **block ทุกคน (รวม admin) ถ้ามีใครในทริปเดียวกันมี mileage start entry** (`odometer_start` ไม่ null — เข้มกว่าเดิมที่เช็กแค่ `budget_deducted_at`, **REQ-1 Phase 3.5**); **trip-group cancel → reset สมาชิกที่เหลือทุกคนเป็น pending** (all-or-nothing, ไม่มี skip/partial แล้ว). notify (owner/admin/approver/driver/mate in-app) + Telegram ย้ายเข้า service เองแล้ว (**Phase 4**, param `notify=True` default — `budget_manage`'s `_handle_cancel_booking` ส่ง `notify=False` รักษา behavior เดิมที่ไม่เคยแจ้งเตือน). **ไม่มี refund งบทุกกรณี** (REQ-2, จารึกเป็น spec [vehicle_product_spec.md](vehicle_product_spec.md) §9) |
| `approve_booking()` (route) → `booking_service.approve_from_pending`/`reject_from_pending`/`approver_approve`/`approver_reject` | [vehicle_booking.py:411](../../app/views/vehicle/vehicle_booking.py#L411) → [services/vehicle/booking_service.py](../../app/services/vehicle/booking_service.py) | **Phase 2:** dispatch 4 use case (admin approve/reject × approver approve/reject) — logic ทั้งหมดอยู่ service, route เหลือ permission check + dispatch. เดิม 2 path ซ้ำกับ `admin_assign` (คนละ guard) รวมเป็นทางเดียวผ่าน `approve_from_pending()` แล้ว — budget guard เปลี่ยนจาก `_lookup_budget_for_booking()` ตรงเป็น `guard_budget()` (เช็ก expense_type ก่อน — ปิดบั๊ก personal ถูก block เสมอ) |
| `_lookup_budget_for_booking(booking, on_date=None)` | [services/vehicle/budget_service.py:183](../../app/services/vehicle/budget_service.py#L183) | **ย้ายจาก `vehicle_common.py` → `budget_service.py` (Phase 2, ปิด DEBT-1)** — helper หา `VehicleBudget` ที่ booking จะหักงบ: `is_active=True` ที่ `start_date <= on_date <= end_date` (`on_date` default = วันเริ่ม booking; deduct ส่งวันปิดทริป); overlap → `start_date` ล่าสุด; คืน `(budget, key_label)`, `None` ถ้าไม่พบ. `vehicle_common.py` ยัง re-export ชื่อเดิมไว้ (caller ไม่ต้องแก้ import) |
| `approver_inbox()` | [vehicle_booking.py:295](../../app/views/vehicle/vehicle_booking.py#L295) | approver ดูรายการรอแผนกตัวเอง + ประวัติ + งบ active-period + dict `fuel_costs` (`domain.vehicle.fuel.calc_fuel_cost` ผ่าน `get_fuel_price`) |
| `inject_approver_pending_count()` | [app.py](../../app/app.py) | context processor — badge จำนวน waiting_approver สำหรับ approver |
| `inject_admin_pending_tomorrow()` | [app.py](../../app/app.py) | context processor: `pending_count` = #VehicleBooking ที่ `status='pending'` + `start_datetime` ตกบนวันพรุ่งนี้ (BKK time) — badge "อนุมัติรถ" บน sidebar |
| `admin_assign()` (route) → `booking_service.assign_resources`/`approve_from_pending`/`reject_from_pending` | [vehicle_admin.py:517](../../app/views/vehicle/vehicle_admin.py#L517) → [services/vehicle/booking_service.py:211](../../app/services/vehicle/booking_service.py#L211) | **Phase 2:** assign รถ+คนขับ+guard budget/conflict รวมเข้า service เดียวกับ `approve_booking()` แล้ว. **Phase 4:** notify (Event #2/#3/#4) ย้ายเข้า `approve_from_pending()` — param `notify_assigned` ควบคุม Event #2 (เฉพาะ `admin_assign` ที่ assign resource ตรง ไม่ใช่ join-trip) |
| `guard_budget(booking)` | [domain/vehicle/workflow.py:30](../../app/domain/vehicle/workflow.py#L30) | **ย้ายจาก `vehicle_workflow.py` → `domain/vehicle/workflow.py` (Phase 1)** — เช็ค active budget ก่อน approve; expense_type ไม่ใช่ central/department → skip; คืน `(ok: bool, error_msg: str|None)` |
| `apply_transition(booking, to_status, actor_id=None)` | [domain/vehicle/workflow.py:46](../../app/domain/vehicle/workflow.py#L46) | **ย้ายจาก `vehicle_workflow.py` → `domain/vehicle/workflow.py` (Phase 1)** — เปลี่ยน status ถ้า `ALLOWED_TRANSITIONS` อนุญาต (รวม cron auto-reject แล้ว **ปิด DEBT-4, Phase 4**); ตั้ง updated_by ถ้า actor_id ส่งมา; ไม่ commit; คืน `(ok, msg)` — **gateway เดียวของ `VehicleBooking.status` ทั้งระบบ** ไม่มี route ไหนเซ็ตตรงอีกแล้ว |
| `_save_driver_image(field_name, prefix)` | [vehicle_admin.py:46](../../app/views/vehicle/vehicle_admin.py#L46) | เซฟรูปคนขับจาก `request.files` → `static/uploads/driver/` คืนชื่อไฟล์ หรือ `None`. ใช้ใน `manage_fleet` action `add_driver`/`edit_driver` |
| `mileage_log()` (route) → `_handle_mileage_post`/`_parse_mileage_filters` | [vehicle_mileage.py:336](../../app/views/vehicle/vehicle_mileage.py#L336) | **Phase 5:** แตก POST branch → `_handle_mileage_post()` + filter parsing → `_parse_mileage_filters()` (route เดิม 89 logic-line → 53). admin บันทึกไมล์ (POST) + dashboard KPI/breakdown/filter (GET, default = เดือนปัจจุบัน) หักงบผ่าน `mileage_service.close_trip()` (**Phase 3**) |
| `_calc_cost_ceiling(cutoff)` | [vehicle_mileage.py:213](../../app/views/vehicle/vehicle_mileage.py#L213) | ceiling (round-up-to-1000) ของ cost range-slider ใน `mileage_log()` |
| `mileage_export()` (route) → `_filter_and_calc_mileage_rows`/`_build_mileage_workbook` | [vehicle_mileage.py:506](../../app/views/vehicle/vehicle_mileage.py#L506) | **Phase 5:** แตกเป็น 2 helper (route เดิม 104 logic-line → 41) — `_filter_and_calc_mileage_rows()` คำนวณ+กรอง, `_build_mileage_workbook()` build openpyxl (mid-function import ตั้งใจ — ดู CLAUDE.md) |
| `driver_mileage()` (route) → `mileage_service.close_trip`/`auto_generate_ot` | [vehicle_driver.py:281](../../app/views/vehicle/vehicle_driver.py#L281) | คนขับบันทึกไมล์ + หักงบผ่าน `mileage_service.close_trip()` (**Phase 3**); notify (mileage_end/OT created) ย้ายเข้า service แล้ว (**Phase 4**) |
| `driver_home()` | [vehicle_driver.py:22](../../app/views/vehicle/vehicle_driver.py#L22) | driver dashboard — งานวันนี้/พรุ่งนี้ + `latest_odo` dict prefill เลขไมล์ออก |
| `override_fuel()` (route) → `mileage_service.override_fuel_cost()` | [vehicle_cost.py:69](../../app/views/vehicle/vehicle_cost.py#L69) → [services/vehicle/mileage_service.py:269](../../app/services/vehicle/mileage_service.py#L269) | **Phase 3:** logic ย้ายเข้า service — admin override `mileage.fuel_cost` + rededuct ผ่าน `budget_service.rededuct_for_mileage`. **BUG-2 ปิดแล้ว (Phase 3.5):** snap `fuel_price` ใช้ `get_fuel_price(target_date)` จริงแทน `None` |
| `budget_manage()` | [vehicle_budget.py:439](../../app/views/vehicle/vehicle_budget.py#L439) | POST action dispatch dict → `_handle_set_budget`/`_handle_top_up`/`_handle_manual_adjust`/`_handle_toggle_active`/`_handle_extend_period`/`_handle_cancel_booking`. **`_handle_cancel_booking` (ปิด DEBT-3, REQ-2, Phase 3.5)** เรียก `booking_service.cancel(notify=False)` แทนเซ็ต status ตรง — ได้ guard ครบเหมือน `cancel_booking()` route |
| `_build_budget_pivot()` (orchestrator) → `_build_central_dept_pivot`/`_build_personal_pivot`/`_build_pivot_summary` | [vehicle_budget.py:602](../../app/views/vehicle/vehicle_budget.py#L602) | **Phase 5:** แตกเป็น 3 helper ตาม sub-concern (route เดิม 103 logic-line → <40) — central/dept จาก `VehicleBudgetLog`, personal จาก mileage aggregate, summary รวมปีงบ |
| `BudgetService` (`services/vehicle/budget_service.py`) | [services/vehicle/budget_service.py](../../app/services/vehicle/budget_service.py) | **ย้ายกลับ `services/` (Phase 1)** — API กลาง: `deduct_for_mileage`/`refund_for_mileage`/`rededuct_for_mileage`/`set_budget_amount`/`manual_adjust`/`set_active`/`verify_cache_integrity`/`_lookup_budget_for_booking`. **gateway เดียวของ `VehicleBudget.used_amount`/`budget_amount`/`is_active` ทั้งระบบ** |
| `close_trip(booking, mileage, source)` | [services/vehicle/mileage_service.py:192](../../app/services/vehicle/mileage_service.py#L192) | **เดิมชื่อ `deduct_budget_for_trip()` ใน `vehicle_common.py` — ย้าย+รวม logic (Phase 3)** จาก 3 caller ซ้ำ (`mileage_log`/`driver_mileage`/`_auto_close_stale_trips`) เหลือจุดเดียว. `source` = ชื่อ caller → ใส่ log tag. notify (`_n_budget`/`_n_payment_required`/`_n_admin_personal`) อยู่ในนี้แล้ว (ทั้ง Phase 3 เดิม — ไม่ใช่ Phase 4 ย้าย) |
| `check_vehicle_conflict`/`check_driver_conflict`/`check_vehicle_active` | [services/vehicle/booking_service.py:65,81,96](../../app/services/vehicle/booking_service.py#L65) | **ย้ายจาก `vehicle_common.py` → `booking_service.py` (Phase 2); สำเนาเก่าใน vehicle_common.py ลบแล้ว (Phase 5)** — conflict/active guard ก่อน assign/merge/swap. ใช้ร่วม `admin_assign`/`admin_swap_vehicle`/`api_check_merge` (⚠️ `admin_merge` **ไม่เรียก** — BUG-3) |
| `_sync_user_vehicle_role(user_id)` | [vehicle_admin.py:28](../../app/views/vehicle/vehicle_admin.py#L28) | sync `user.role_vehicle` ตามบทบาทจริง: approver > driver > user. เรียกหลัง flush() ใน 5 fleet handlers |
| `auto_close_stale_trips(vehicle_id, new_odo_start, before_dt, exclude_booking_id, *, actor_id)` | [services/vehicle/mileage_service.py:233](../../app/services/vehicle/mileage_service.py#L233) | **เดิมชื่อ `_auto_close_stale_trips()` ใน `vehicle_common.py` — ย้าย (Phase 3), เลิก underscore prefix เพราะเป็น service public API แล้ว.** ปิดทริปค้างล่าสุด 1 ตัวของรถคันเดิมอัตโนมัติเมื่องานถัดไปบันทึกไมล์เริ่ม — เรียก `auto_generate_ot(notify=False)` + `close_trip()` (**Phase 5**: `notify=False` รักษา behavior เดิมที่ไม่เคยแจ้งเตือน OT ของทริป auto-close) |
| `_parse_ot_slots(form)` | [vehicle_cost.py:34](../../app/views/vehicle/vehicle_cost.py#L34) | แปลง `slot_cfg[]`/`slot_start[]`/`slot_end[]` จากฟอร์ม OT modal → `list[DriverOTSlot]`; ใช้ร่วม `ot_create`(L316)/`ot_edit`(L361) |
| `_wants_json()` | [vehicle_cost.py:63](../../app/views/vehicle/vehicle_cost.py#L63) | เช็ค header `X-Requested-With: fetch` (vehicle_ot.js) → OT row action ตอบ JSON แทน flash/redirect — ใช้ทุก row action (mark_paid/toggle_no_receipt/create/edit/delete/restore) |
| `_build_ot_by_expense(ots)` | [vehicle_cost.py](../../app/views/vehicle/vehicle_cost.py) | **2026-06-20** — รวม OT (live) ตามประเภทงาน (`_ot_budget_label(booking)` → label+sub) → list `{label, sub, amount, hours, count}` เรียงยอดมากสุด. ตอบ "OT มาจากงานส่วนไหนเยอะที่สุด"; standalone OT (booking=None) → กอง "—". เรียกใน `cost_summary` |
| `_personal_uncollected(ots)` | [vehicle_cost.py](../../app/views/vehicle/vehicle_cost.py) | **2026-06-20** — OT งานส่วนตัว (`expense_type=='personal'`) ที่ยังไม่เรียกเก็บ = `status=='unpaid'` + ไม่ใช่ `no_receipt`; คืน `(items, total)`. flag ให้ admin เห็น (มักจ่ายเองโดยไม่เรียกเก็บ) |
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
| `notify_mileage_not_closed()` | [notification_service.py:318](../../app/views/core/notification_service.py#L318) | **REQ-3 (Phase 3.5, 2026-07-19)** — เตือน driver คนเดียว (sticky, ไม่หมดอายุ) เมื่อ mileage มี `odometer_start` ไม่มี `odometer_end` และข้ามวันเดินทางไปแล้ว ≥1 วัน; เรียกจาก cron `check_stale_mileage()` (08:20 BKK) |
| `notify_budget_deducted()` | [notification_service.py:336](../../app/views/core/notification_service.py#L336) | **#7 central/dept** title `แจ้งหักงบส่วนกลาง` / sub `_pay_subtitle()` (2026-06-16 ข้อความเดียวทุก role owner+admin+approver) |
| `notify_payment_required()` | [notification_service.py:350](../../app/views/core/notification_service.py#L350) | **#7 personal** title `แจ้งร่วมบุญค่าเดินทาง` / sub `_pay_subtitle()` → owner(sticky) + admin(payment_admin) (2026-06-16 title+sub เดียวกันทุก role) |
| `notify_payment_reminder_user()` | [notification_service.py:375](../../app/views/core/notification_service.py#L375) | เตือนชำระ (cron, msg แตก น้ำมัน + OT) |
| `notify_payment_overdue_admin()` | [notification_service.py:394](../../app/views/core/notification_service.py#L394) | เตือน admin (cron, msg แตก น้ำมัน + OT) |
| `notify_admin_edited()` | [notification_service.py:414](../../app/views/core/notification_service.py#L414) | **Event #14** — แจ้ง owner เมื่อ admin แก้ไขข้อมูล booking (AJAX `admin_edit_booking`); `event_key='edited'` |
| `notify_user_cancelled()` | [notification_service.py:442](../../app/views/core/notification_service.py#L442) | **Event #16 (Phase 9, 2026-05-22)** — soft cancel multi-recipient; 5 role_labels (owner/admin/approver/driver/mate); icon `deleted` (trash); text แตก by role |
| `notify_auto_rejected()` | [notification_service.py:473](../../app/views/core/notification_service.py#L473) | **Event #17 (Phase 2, 2026-06-12)** — แจ้ง owner เมื่อระบบ auto-reject booking เลยวันเดินทาง; ntype=warning; icon=rejected. เรียกจาก `notification_cron.auto_reject_overdue_bookings()` (**ปิด DEBT-4, Phase 4** — ผ่าน `apply_transition()` แล้ว ไม่เซ็ต status ตรง) |
| `notify_repair_created/accepted/closed()` | [notification_service.py:505](../../app/views/core/notification_service.py#L505) | **Events #18-20 · Phase 2d (2026-06-15)** — created → **owner ยืนยัน + admin งานใหม่**; accepted → owner "Admin กำลังเข้าซ่อมแซม"; closed → **owner เสร็จ + admin งานถูกปิด** |
| `notify_maintenance_created/accepted/closed()` | [notification_service.py:560](../../app/views/core/notification_service.py#L560) | **Events #21-23 · Phase 2d** — pattern เดียวกับ Repair (owner+admin) |
| `notify_ot_created()` | [notification_service.py:618](../../app/views/core/notification_service.py#L618) | **Event #25 (Phase 2b, 2026-06-15)** — Vehicle OT: แจ้ง **admin ทุกคน** (เดิม driver) เมื่อ `auto_generate_ot()` สร้าง OT; category=status ntype=info. เรียกจากในตัว `mileage_service.auto_generate_ot()` เอง (**Phase 4** — param `notify=True` default, `auto_close_stale_trips()` ส่ง `notify=False`) |
| `notify_admin_personal_trip()` | [notification_service.py:638](../../app/views/core/notification_service.py#L638) | **Event #26 (Phase 2b, 2026-06-15)** — แจ้ง admin ทุกคนเมื่อปิดทริปส่วนตัว/ad-hoc; category=payment_admin ntype=warning; เรียกจาก `close_trip()` ใน `services/vehicle/mileage_service.py` (เดิมชื่อ `deduct_budget_for_trip()` ใน vehicle_common.py — ย้าย Phase 3) |
| `notify_room_booked()` | [notification_service.py:659](../../app/views/core/notification_service.py#L659) | **Event #24 · Phase 2d** — Room: "ยืนยันการจอง{room} วันที่… ตั้งแต่เวลา…ถึง… เรียบร้อยแล้ว" |
| `notify_payment_confirmed()` | [notification_service.py:675](../../app/views/core/notification_service.py#L675) | **#8** title `สรุปการเดินทาง` / sub `เดินทางด้วยรถ {รถ(ทะเบียน)} ระยะทาง {dist} กม. ใช้จ่ายทั้งหมด {total} บาท` (2026-06-16) → owner + admin |
| `check_payment_escalation()` | [notification_cron.py:28](../../app/views/core/notification_cron.py#L28) | cron job — personal payment overdue (08:00 BKK) |
| `auto_reject_overdue_bookings()` | [notification_cron.py:91](../../app/views/core/notification_cron.py#L91) | **cron job (Phase 2, 2026-06-12)** — reject pending/waiting_approver ที่ start_datetime < now; 08:10 BKK; idempotent; notify owner 1 ใบ |

### Frontend JS
| Function | File:Line | หน้าที่ |
|----------|-----------|---------|
| `openEventDetail()` | [vehicle/js/vehicle.js](../../app/static/vehicle/js/vehicle.js) | เปิด detail modal (single หรือ group อัตโนมัติ) |
| `openBookingModal(ds)` + `bk*` family | [vehicle/js/vehicle.js](../../app/static/vehicle/js/vehicle.js) | **Booking modal date/time/OT (2026-06-10)** — `bkRenderCal`/`bkSetDate`/`bkClearDate` (ปฏิทิน va-cal `#bk_cal_pop`), `bkBuildTimeLists`/`bkSelectTime`/`bkUpdateDuration` (time picker `.bk-timepick` → hidden `#bk_start_time`/`#bk_end_time`), `bkComputeOT`/`bkUpdateWarning` (อ่าน `window.OT_RATES`, overlap กับ band; วันอาทิตย์=300/วัน, นอกเวลา 08:00–17:00=20-40/ชม; gate ด้วย `#needDriver`), `bkCloseAllTimePops`, `bkBindBookingControls` (bind ครั้งเดียว module-load). `openBookingModal` reset date+เวลา 08:00–17:00 ทุกครั้ง; `initFlatpickr()` เลิกผูก `bk_date` (เหลือ noop); submit handler validate `#bk_date` เอง (hidden). const `BK_DOW_S`/`BK_MON_S`/`BK_TIMES`/`BK_WORK_START=480`/`BK_WORK_END=1020` |
| `VCMenus.init/enhanceDropdown/enhanceAutocomplete/enhanceAutocompleteSelect` | [core/js/dropdown.js](../../app/static/core/js/dropdown.js) | shared cmdk-style dropdown + autocomplete (see Design System > Component library). **3 components:** (1) `select[data-dropdown]` = non-searchable `vc-dd`; (2) `input[data-autocomplete list]` = searchable `vc-ac`, submits typed text; (3) `select[data-autocomplete]` = **searchable `vc-ac` แต่ `<select>` เป็น source of truth → submit `<option>` value (id) ไม่ใช่ label** (strict combobox, ใช้กับ `#sbApprover` ใน vehicle_budget.html — preset value ต้อง `dispatchEvent('change')` ให้ label sync). Auto-inits on load; load as module **after** page JS so initial `<select>.value` is read post page-side logic. |
| `renderVehicleRow(v, approvedToday)` + `renderVehicleJobBlock(v, group, idx, total, isMulti)` + `groupVehicleJobs(v, approvedToday)` | [vehicle/js/vehicle_admin.js](../../app/static/vehicle/js/vehicle_admin.js) | **Consolidate vehicleList+tripList → Case 10 chrome (2026-07)** — การ์ด "การใช้รถ" (`#vehicleList`) เดิมโชว์แค่สถานะรถสั้นๆ ตอนนี้รวม mileage/cost/OT/payment ที่เคยอยู่การ์ด "รายละเอียดการเดินทาง" (ลบทิ้งแล้ว) เข้ามาด้วย. `groupVehicleJobs()` = `.filter()` booking ของรถคันนั้น/วันนั้น + กรุ๊ปตาม `tripGroup` (merge ยุบเป็น 1 งาน — ต่างจาก `renderAfter()` เดิมที่กรุ๊ปข้ามทุกคัน). `renderVehicleRow()`: `v.dbStatus==='maintenance'` → thumb ส้ม + badge "กำลังซ่อม"; ไม่มีงานวันนั้น → thumb เทา + badge "ว่าง"; มีงาน → thumb เขียว + `renderVehicleJobBlock()` ต่องาน (multi-job ซ้อนบล็อก คั่น `mb-3`, header row `align-items-center`; single-job header row = ทะเบียน+corner, `align-items-start`). สถานะ/งาน (`renderVehicleJobBlock`): ไม่มีเลขไมล์=`อนุมัติแล้ว`(เหลือง) → มี `odoStart`=`ออกเดินทางแล้ว`(ฟ้า) → มี `odoEnd` ครบ=`สิ้นสุดการเดินทาง`(ฟ้า, ตั้งใจให้สีเดียวกับข้อก่อน) — มุมขวา header: จบงานแล้ว=payment (`tripBudgetTag()`/`markPaid()`), ยังไม่จบ=เวลาเดินทาง (`b.start`–`b.end`). ใช้ `.bb-buy-thumb`/`.bb-badge` (ดู [INDEX_ui.md § Design System](INDEX_ui.md)) แทน `.bb-avatar`/`.bb-status` เดิม. **ลบทิ้ง:** `renderAfter()`/`renderTripRow()` (เคย render การ์ด tripList แยก) + `getVehicleStatus()`/`isToday()` (status เดิมตัดสินจากเวลาปัจจุบัน ไม่ใช่เลขไมล์ — แทนที่ด้วย logic ใหม่ข้างต้น). **ผลข้างเคียง:** `openRepairModal()`/`fixDone()` ไม่มีปุ่มเรียกใช้จากที่ไหนในแอปแล้ว (ปุ่ม "ส่งซ่อม"/"เสร็จซ่อม" ถูกตัดออกตาม design ใหม่ — ตัดสินใจโดยผู้ใช้) |

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
| `notify_*` (5 ตัว) | [broadcast.py](../../app/views/core/broadcast.py) | รวม Telegram + LINE group ไว้ที่เดียว — import จากนี่แทน `telegram_service` ตรง. `_safe()` กัน 1 ช่องทางพังไม่ลามอีกช่องทาง. **Phase 4 (2026-07-19):** flow ที่แตกเข้า service แล้ว (booking approve/reject/cancel) เรียกจาก `services/vehicle/booking_service.py` ไม่ใช่ controller ตรงอีกต่อไป — เหลือ `admin_merge()`/`admin_notify_booking()` (ไม่มี service รองรับ, out of scope) ที่ยัง import ตรงจาก controller |

### LINE Messaging API (2026-06-12 · flex 2026-06-18)
| Function | File:Line | หน้าที่ |
|----------|-----------|---------|
| `_push()` / `_push_group()` / `_push_user()` | [line_service.py](../../app/views/core/line_service.py) | push plain text → target / group / user; graceful skip |
| `_push_flex()` / `_push_flex_group()` / `_push_flex_user()` | [line_service.py](../../app/views/core/line_service.py) | push Flex Message JSON → target / group / user |
| `reply()` / `reply_flex()` | [line_service.py](../../app/views/core/line_service.py) | ตอบ webhook event ด้วย replyToken (plain text / Flex) |
| `notify_*` (5 ตัว) | [line_service.py](../../app/views/core/line_service.py) | ชื่อตรงกับ telegram_service → group Flex card (SCB-style bubble) |
| `notify_approver_action_required_dm()` | [line_service.py](../../app/views/core/line_service.py) | ส่ง Flex card + ปุ่ม postback "อนุมัติ" ไปหา approver รายคนผ่าน DM |
| `build_approve_result_card()` | [line_service.py](../../app/views/core/line_service.py) | สร้าง Flex bubble ยืนยันการอนุมัติ (เรียกจาก postback handler) |
| `line_webhook()` | [line_webhook.py](../../app/views/core/line_webhook.py) | verify `X-Line-Signature` → handle: message (ผูกบัญชี) / postback (approve) / join+follow (log) |
| `_approve_via_line()` | [line_webhook.py](../../app/views/core/line_webhook.py) | postback approve: ตรวจสิทธิ์ + deadline 1 วัน + budget → approve + notify |
| `line_link()` | [line_webhook.py](../../app/views/core/line_webhook.py) | หน้า `/line/link` แสดงโค้ด 6 หลัก (gen ลง `User.line_link_code`) |

---

## 🧱 Database Models

**25 tables total** — รายละเอียดเต็ม: [database/schema.md](database/schema.md)

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
| `VehicleMileage` | [models/vehicle.py](../../app/models/vehicle.py) | + payment tracking (2026-04-23) · **+`mileage_open_reminder_at`** (2026-07-19, v2.22): guard กันแจ้งซ้ำ cron เตือน driver ปิดไมล์ค้าง — แยกจาก `last_reminder_at` |
| `SystemConfig` | [models/common.py](../../app/models/common.py) | key-value, มี `.get()`/`.set()` |
| `VehicleBudget` | [models/vehicle_budget.py](../../app/models/vehicle_budget.py) | unique(type, dept, year, month) + `is_active` toggle (2026-05-18) |
| `Notification` | [models/common.py](../../app/models/common.py) | + category/action_url/sticky (2026-04-23) + event_key/superseded_at (supersede, 2026-06-15) |
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

