# INDEX — Routes

> Part ของ INDEX.md แยก เพื่อ token budget — [กลับ hub](INDEX.md)
> **อัปเดตล่าสุด:** 2026-08-07

---

## 🛣️ Routes (all paths)

### auth
| Method | Path | File:Line | Function |
|--------|------|-----------|----------|
| GET/POST | `/login` | [auth_view.py:13](../../app/views/auth_view.py#L13) | `login()` |
| GET | `/dev/login/<username>` | [auth_view.py:57](../../app/views/auth_view.py#L57) | `dev_login()` — **dev bypass** |
| GET | `/dev/components` | [app.py:57](../../app/app.py#L57) | `dev_components()` — **Living Gallery** (2026-06-29): render Python component จริง (`Table`/`Badge`/`Status`) ผ่าน `{{ component(obj) }}` → `dev/components.html`. drift ไม่ได้ — canonical เดียวตั้งแต่ static gallery ถูกลบออกจาก repo (**retired 2026-07-19**) |
| GET | `/logout` | [auth_view.py:74](../../app/views/auth_view.py#L74) | `logout()` |
| GET | `/dashboard` | [auth_view.py:172](../../app/views/auth_view.py#L172) | `dashboard()` — **Action Hub** (2026-06-16): ทุก role เห็นหน้าเดียวกัน = Quick Actions (สร้างใหม่) + คำขอของฉัน (รวมทุก service + ปุ่มทำซ้ำ) + วันนี้ของฉัน. ไม่มี admin KPI strip แล้ว. helper `_build_my_requests()` / `_build_today_items()` |
| GET | `/manage_users` | [auth_view.py:182](../../app/views/auth_view.py#L182) | `manage_users()` — superadmin |
| POST | `/update_user/<id>` | [auth_view.py:193](../../app/views/auth_view.py#L193) | `update_user()` — superadmin |

### repair
| Method | Path | File:Line |
|--------|------|-----------|
| GET/POST | `/repair` | [repair_view.py:45](../../app/views/repair_view.py#L45) — query `?copy_from=<id>` (ทำซ้ำ: prefill ฟอร์ม owner-only) / `?new=1` (เปิดฟอร์มเปล่า) — **2026-06-16** |
| GET/POST | `/repair/edit/<id>` | [repair_view.py:86](../../app/views/repair_view.py#L86) |
| POST | `/repair/delete/<id>` | [repair_view.py:112](../../app/views/repair_view.py#L112) |
| POST | `/repair/update_status/<id>` | [repair_view.py:128](../../app/views/repair_view.py#L128) |

### maintenance
| Method | Path | File:Line |
|--------|------|-----------|
| GET/POST | `/maintenance` | [maintenance_view.py:60](../../app/views/maintenance_view.py#L60) — query `?copy_from=<id>` (ทำซ้ำ: prefill ฟอร์ม owner-only) / `?new=1` (เปิดฟอร์มเปล่า) — **2026-06-16** |
| GET/POST | `/maintenance/edit/<id>` | [maintenance_view.py:92](../../app/views/maintenance_view.py#L92) |
| POST | `/maintenance/delete/<id>` | [maintenance_view.py:118](../../app/views/maintenance_view.py#L118) |
| POST | `/maintenance/update_status/<id>` | [maintenance_view.py:134](../../app/views/maintenance_view.py#L134) |
| GET | `/maintenance/export_excel` | [maintenance_view.py:204](../../app/views/maintenance_view.py#L204) |

### vehicle (user)
| Method | Path | File:Line |
|--------|------|-----------|
| GET | `/vehicle` | [vehicle_booking.py:29](../../app/views/vehicle/vehicle_booking.py#L29) — `index()`. query `?copy_from=<id>` (ทำซ้ำ: JS เปิด modal จองรถ prefill จาก `window.BOOKINGS`) / `?new=1` (เปิด modal เปล่า) — handler ใน vehicle.js **2026-06-16** |
| POST | `/vehicle/book` | [vehicle_booking.py:57](../../app/views/vehicle/vehicle_booking.py#L57) | `book_vehicle_simple()` |
| GET/POST | `/vehicle/edit/<id>` | [vehicle_booking.py:128](../../app/views/vehicle/vehicle_booking.py#L128) | `edit_booking()`. **2026-08-05:** รับ `note` เพิ่ม (ผูก `#eventDetailModal` redesign — `VehicleBooking.note` คอลัมน์ใหม่) |
| POST | `/vehicle/delete/<id>` | [vehicle_booking.py:174](../../app/views/vehicle/vehicle_booking.py#L174) — ลบ booking (hard delete). owner: pending/rejected เท่านั้น; admin: ทุกสถานะ ยกเว้นถ้ามี `mileage.budget_deducted_at` → blocked (กัน ledger orphan) **2026-06-12** |
| POST | `/vehicle/cancel/<id>` | [vehicle_booking.py:238](../../app/views/vehicle/vehicle_booking.py#L238) — route parse+call เท่านั้น ตั้งแต่ **Phase 2 (2026-07-19)** — logic ทั้งหมดอยู่ใน `booking_service.cancel()`: user ยกเลิกได้เฉพาะ `status=='pending'`; admin: pending/waiting_approver/approved ไม่มี time guard; **block ทุกคน (รวม admin) ถ้ามีใครในทริปเดียวกันมี mileage start entry แล้ว** (`odometer_start` ไม่ null — เข้มกว่าเดิมที่เช็กแค่ `budget_deducted_at`, **REQ-1 Phase 3.5**); **trip-group cancel → reset สมาชิกที่เหลือทุกคนเป็น pending** (all-or-nothing ไม่มี skip/partial อีกต่อไป, REQ-1); notify (owner/admin/approver/driver/mate in-app) + Telegram อยู่ใน `booking_service.cancel()` เองแล้ว (**Phase 4**, param `notify=True` default). **ไม่มี refund งบทุกกรณี** (REQ-2, จารึกเป็น spec ทางการใน [vehicle_product_spec.md](vehicle_product_spec.md) §9) |
| GET | `/vehicle/detail/<id>` | [vehicle_booking.py:272](../../app/views/vehicle/vehicle_booking.py#L272) — **2026-06-07: redirect → `/vehicle?detail=<id>`** (detail page ลบ, แสดงผ่าน modal `vehicle/modals/vehicle_detail.html` + JS deeplink); เก็บ permission check |
| GET | `/api/vehicle/bookings` | [vehicle_booking.py:358](../../app/views/vehicle/vehicle_booking.py#L358) |
| GET | `/api/custom-bookings` | [vehicle_booking.py:382](../../app/views/vehicle/vehicle_booking.py#L382) |
| POST | `/vehicle/approve/<id>` | [vehicle_booking.py:411](../../app/views/vehicle/vehicle_booking.py#L411) — dispatch 4 use case (admin approve/reject × approver approve/reject) → `booking_service.approve_from_pending`/`reject_from_pending`/`approver_approve`/`approver_reject` (**Phase 2, 2026-07-19** — เดิม 2 path ซ้ำกับ `admin_assign`, รวมเป็นทางเดียวผ่าน service แล้ว) |
| GET | `/vehicle/approver` | [vehicle_booking.py:295](../../app/views/vehicle/vehicle_booking.py#L295) — approver inbox รายการรอแผนกตัวเอง + budget เดือนปัจจุบัน |

> **2026-06-07:** `/vehicle/history` + `/vehicle/history/feed` (booking_history/history_feed) **ลบแล้ว** — feature เลิกใช้, `vehicle_history.py` + template ลบ, sidebar link "ประวัติการจอง" ออก

### vehicle (admin — shared `/vehicle/admin/*`)
| Method | Path | File:Line |
|--------|------|-----------|
| GET | `/vehicle/admin` | [vehicle_admin.py:342](../../app/views/vehicle/vehicle_admin.py#L342) — `admin_trips()` |
| POST | `/vehicle/admin/booking/<id>/notify` | [vehicle_admin.py:428](../../app/views/vehicle/vehicle_admin.py#L428) — `admin_notify_booking()` manual re-send ปุ่มเดียว ไม่มี service รองรับ (out of scope Clean Architecture refactor — narrow scope ที่ตกลงกัน Phase 4) |
| POST | `/vehicle/admin/booking/<id>/revert` | [vehicle_admin.py:445](../../app/views/vehicle/vehicle_admin.py#L445) — `admin_revert_booking()` → `booking_service.revert()` (**Phase 2**). Guard: ห้ามถ้ามี `mileage.budget_deducted_at`; ห้ามถ้า `trip_group` set (**2026-07-31** — ไปทาง `ungroup()` แทน); source ∈ {approved, waiting_approver, rejected} เท่านั้น; เคลียร์ reject_reason + **`assigned_vehicle_id`/`driver_id`** (**2026-07-31**, เดิมเปลี่ยนแค่ status) + set updated_by; คืน JSON `{ok, msg}`. UI trigger: ปุ่ม ghost ใน `#assignModal` (`vehicle_admin.js::triggerRevertFromModal()`, **2026-07-31** — เดิม route มีแต่ไม่มีปุ่มเรียก) |
| POST | `/vehicle/admin/vehicle/<id>/repair` | [vehicle_admin.py:462](../../app/views/vehicle/vehicle_admin.py#L462) — `admin_vehicle_repair()` |
| POST | `/vehicle/admin/vehicle/<id>/fix-done` | [vehicle_admin.py:476](../../app/views/vehicle/vehicle_admin.py#L476) — `admin_vehicle_fix_done()` |
| POST | `/vehicle/admin/driver/<id>/toggle-active` | [vehicle_admin.py:489](../../app/views/vehicle/vehicle_admin.py#L489) — `admin_driver_toggle_active()` — **เพิ่ม 2026-08-05** สลับ `Driver.is_active` ทันที (ปุ่มสถานะในตาราง manage_fleet คอลัมน์คนขับ ไม่ต้องเปิด modal) — mirror pattern `admin_vehicle_fix_done`, plain attribute ไม่ใช่ money/workflow เลยไม่ผ่าน service (ADR 0001) |
| GET | `/vehicle/admin/driver-week` | [vehicle_admin.py:314](../../app/views/vehicle/vehicle_admin.py#L314) — `admin_driver_week()` — **เพิ่ม 2026-08-05** AJAX สลับสัปดาห์ "งานในสัปดาห์" (chevron ซ้าย-ขวา คอลัมน์คนขับ manage_fleet) `?week_start=YYYY-MM-DD` → `{ok, weekStart, label, drivers:{id:[status×7]}}` ผ่าน `_compute_driver_week_status()` — ดู INDEX_code.md § Key Functions |
| POST | `/vehicle/admin/booking/<id>/swap` | [vehicle_admin.py:504](../../app/views/vehicle/vehicle_admin.py#L504) — `admin_swap_vehicle()`. **2026-06-20:** เพิ่ม `check_vehicle_conflict` guard (block 400 ถ้ารถทับช่วงเวลา) |
| POST | `/vehicle/admin/merge` | [vehicle_admin.py:529](../../app/views/vehicle/vehicle_admin.py#L529) — `admin_merge()` รวมทริป. **2026-06-20:** เพิ่ม conflict guard ก่อน commit. **2026-07-31:** แยก 2 ทางด้วย `new_ids` (id ที่ยังไม่ใช่สมาชิก `trip_group` เดิม) — มี id ใหม่จริง + กลุ่มเดิมมีสมาชิกอยู่แล้ว → `booking_svc.merge_into_group()` (งานเดิมไม่ถูกแตะ, ผ่าน `guard_budget()`/`apply_transition()` จริง); ไม่งั้น = ทาง "รวมทริปใหม่/แก้ไขกลุ่มเดิม" เดิม (ไม่ถูกแตะ). ⚠️ **BUG-3 (พบ Phase 4, 2026-07-19, ยังไม่แก้ — เฉพาะทาง "รวมทริปใหม่" เดิมเท่านั้น)**: เซ็ต `booking.status` ตรง ไม่ผ่าน `apply_transition()`/`booking_service.*` เลย — ไม่เคยเรียก `guard_budget()` ต่างจาก approve path อื่นทุกจุด (central/personal merge ได้ `status='approved'` ทันทีไม่เช็คงบ) ดู [masterplan Bug Log](log/2026-07-19_clean_architecture_masterplan.md) |
| POST | `/vehicle/admin/assign/<id>` | [vehicle_admin.py:635](../../app/views/vehicle/vehicle_admin.py#L635) — `admin_assign()` → `booking_service.assign_resources()`+`approve_from_pending()`/`reject_from_pending()` (**Phase 2/4**). **2026-06-20:** conflict guard เฉพาะทริปอิสระที่ approve; **2026-06-21:** `check_vehicle_active` guard |
| POST | `/vehicle/admin/edit/<id>` | [vehicle_booking.py:170](../../app/views/vehicle/vehicle_booking.py#L170) | `admin_edit_booking()` — **2026-06-21** AJAX admin แก้ข้อมูลจอง (start/end datetime, destination, purpose, pax, pickup**, note — เพิ่ม 2026-08-05**). Block ถ้า status ∈ {in_progress, completed, cancelled}. คืน JSON `{ok, msg}` |
| GET/POST | `/vehicle/mileage` | [vehicle_mileage.py:344](../../app/views/vehicle/vehicle_mileage.py#L344) — `mileage_log()` (POST branch → `_handle_mileage_post()`, **Phase 5**; POST รองรับ `entry_type='both'` เพิ่มด้วย — ดู INDEX_code.md) |
| GET | `/vehicle/mileage/export` | [vehicle_mileage.py:508](../../app/views/vehicle/vehicle_mileage.py#L508) — `mileage_export()` Excel export ตาม filter (แตก `_filter_and_calc_mileage_rows`/`_build_mileage_workbook`, **Phase 5**). Query param ที่รับ: `date_start`/`date_end`/`vehicle_id`/`driver_id`/`status_filter` (**ตัด `cost_min`/`cost_max` ออกแล้ว 2026-07-27**) |
| GET | `/api/admin/bookings` | [vehicle_admin.py:865](../../app/views/vehicle/vehicle_admin.py#L865) — `api_admin_bookings()` |
| POST | `/api/check-merge` | [vehicle_admin.py:756](../../app/views/vehicle/vehicle_admin.py#L756) — `api_check_merge()` (**DEBT-5** — 75 logic-line เกิน 60, legacy ตั้งใจไม่แตะ) |

### adminfleet (`/admin/manage-fleet`, `/admin/budget`)
| Method | Path | File:Line |
|--------|------|-----------|
| GET/POST | `/admin/manage-fleet` | [vehicle_admin.py:278](../../app/views/vehicle/vehicle_admin.py#L278) — `manage_fleet()` |
| POST | `/admin/manage-fleet/service` | [vehicle_admin.py:731](../../app/views/vehicle/vehicle_admin.py#L731) — `update_vehicle_service()` |
| GET | `/api/vehicle/<vid>/history` | [vehicle_admin.py:700](../../app/views/vehicle/vehicle_admin.py#L700) — `vehicle_history()` |
| GET/POST | `/admin/budget` | [vehicle_budget.py:612](../../app/views/vehicle/vehicle_budget.py#L612) — `budget_manage()` (POST action dispatch dict → `_handle_set_budget`/`_handle_top_up`/`_handle_manual_adjust`/`_handle_toggle_active`/`_handle_extend_period`/`_handle_cancel_booking`/`_handle_set_yearly_plan`/`_handle_set_default_plan`/`_handle_delete_budget`/`_handle_delete_plan` **(v2.30 — เพิ่ม `delete_plan`: ลบ `VehicleBudgetYearlyPlan` ทิ้งถาวรพร้อม cascade งบย่อยที่ผูกอยู่ ผ่าน `budget_svc.delete_yearly_plan()`, ปุ่ม icon delete ในแท็บ "งบหลัก")**; `_handle_cancel_booking` → `booking_service.cancel(notify=False)`, **ปิด DEBT-3, Phase 3.5**. GET params: `?plan_id=` (v2.28) — `?plan_year=` server-side filter ตัดออกแล้ว v2.29 (chip "ปี" filter ฝั่ง client แทน)) |
| GET | `/admin/budget/personal` | [vehicle_budget.py:937](../../app/views/vehicle/vehicle_budget.py#L937) — `budget_personal()` |
| POST | `/admin/budget/personal/mark_paid` | [vehicle_budget.py:1003](../../app/views/vehicle/vehicle_budget.py#L1003) — `budget_personal_mark_paid()` |
| POST | `/admin/budget/personal/mark_unpaid` | [vehicle_budget.py:1031](../../app/views/vehicle/vehicle_budget.py#L1031) — `budget_personal_mark_unpaid()` |

### admincost
| Method | Path | File:Line |
|--------|------|-----------|
| POST | `/vehicle/mileage/override-fuel` | [vehicle_cost.py:72](../../app/views/vehicle/vehicle_cost.py#L72) |
| GET | `/admin/cost` | [vehicle_cost.py:198](../../app/views/vehicle/vehicle_cost.py#L198) — tab `''`(live)/unpaid/paid/self_paid/deleted + KPI ยอดรวม/ยังไม่จ่าย/จ่ายแล้ว (ไม่นับ deleted) + col งบ per row. **2026-06-14:** query param `budget_type`/`budget_sub` → filter งบ (derive จาก booking ผ่าน `_apply_budget_filter`, กระทบทั้ง KPI + table) (**DEBT-5** — 61 logic-line เกิน 60, legacy ตั้งใจไม่แตะ) |
| GET | `/admin/ot/slip` | [vehicle_cost.py:314](../../app/views/vehicle/vehicle_cost.py#L314) — JSON, คนขับ+เดือนเดียว (ทุกสถานะ ไม่กรอง paid/unpaid) ให้แท็บ "ใบจ่ายจริง" render list+receipt preview (page contract redesign, 2026-08-08, view-only) |
| POST | `/admin/ot/<id>/mark_paid` | [vehicle_cost.py:274](../../app/views/vehicle/vehicle_cost.py#L274) — toggle จ่าย/ไม่จ่าย |
| POST | `/admin/ot/<id>/toggle_no_receipt` | [vehicle_cost.py:299](../../app/views/vehicle/vehicle_cost.py#L299) — tab ผู้ใช้จ่ายเอง |
| POST | `/admin/ot/create` | [vehicle_cost.py:319](../../app/views/vehicle/vehicle_cost.py#L319) — manual standalone OT (booking_id=None, ไม่หักงบ) |
| POST | `/admin/ot/<id>/edit` | [vehicle_cost.py:361](../../app/views/vehicle/vehicle_cost.py#L361) |
| POST | `/admin/ot/<id>/delete` | [vehicle_cost.py:385](../../app/views/vehicle/vehicle_cost.py#L385) — soft delete |
| POST | `/admin/ot/<id>/restore` | [vehicle_cost.py:403](../../app/views/vehicle/vehicle_cost.py#L403) — กู้คืนจาก tab ลบ |
| POST | `/admin/ot/rate_config/update` | [vehicle_cost.py:495](../../app/views/vehicle/vehicle_cost.py#L495) — บันทึกอัตรา OT ทั้งชุดจากแท็บ "ตั้งค่า OT" (2026-08-08). `cfg_delete[]` = soft-delete (`is_active=False`) เหมือน `rateConfigModal` เดิม — ลบแล้วลบเลย ไม่มี toggle เปิดกลับ (ตัดสินใจ 2026-08-08) · block band ข้ามเที่ยงคืนผ่าน `_reject_midnight_crossing` (กัน bug B2 ซ้ำ) · ตอบ JSON เมื่อเป็น AJAX |
| GET | `/admin/cost/export` | [vehicle_cost.py:469](../../app/views/vehicle/vehicle_cost.py#L469) — filter ตาม tab status + งบ (`budget_type`/`budget_sub`) เดียวกับ `/admin/cost` (**DEBT-5** — 88 logic-line เกิน 60, legacy ตั้งใจไม่แตะ) |

### driver
| Method | Path | File:Line |
|--------|------|-----------|
| GET | `/driver` | [vehicle_driver.py:22](../../app/views/vehicle/vehicle_driver.py#L22) — `driver_home()` ส่ง `latest_odo` (MAX odometer ต่อรถ) เข้า template |
| POST | `/driver/ad-hoc-trip` | [vehicle_driver.py:130](../../app/views/vehicle/vehicle_driver.py#L130) — `driver_ad_hoc_trip()` งานนอกระบบ driver สร้างเอง (collapse UI, strict contact_user_id) + บันทึกเลขไมล์ออกทันที (แตก `_create_ad_hoc_booking`/`_create_ad_hoc_mileage_start`, **Phase 5**) |
| POST | `/driver/change-vehicle` | [vehicle_driver.py:174](../../app/views/vehicle/vehicle_driver.py#L174) — `driver_change_vehicle()` เปลี่ยนรถฉุกเฉินก่อนออก (swap + เช็ก active + ไม่ชนคิว approved; block ถ้าบันทึกไมล์ออกแล้ว) |
| POST | `/driver/mileage` | [vehicle_driver.py:281](../../app/views/vehicle/vehicle_driver.py#L281) — `driver_mileage()` (POST branch → `mileage_svc.close_trip`/`sync_ot_for_trip`, notify อยู่ใน service แล้ว **Phase 3/4**) |

### room
| Method | Path | File:Line |
|--------|------|-----------|
| GET | `/room` | [room_view.py:16](../../app/views/room_view.py#L16) — query `?copy_from=<id>` (ทำซ้ำ: JS เปิด modal prefill ห้อง+หัวข้อ) / `?new=1` (เปิด modal เปล่า) — handler ใน room.js **2026-06-16** |
| POST | `/room/book` | [room_view.py:23](../../app/views/room_view.py#L23) |
| POST | `/room/edit/<id>` | [room_view.py:58](../../app/views/room_view.py#L58) |
| POST | `/room/delete/<id>` | [room_view.py:96](../../app/views/room_view.py#L96) |
| GET | `/api/room/bookings` | [room_view.py:111](../../app/views/room_view.py#L111) |

### fuel (vehicle admin only)
| Method | Path | File:Line | Function |
|--------|------|-----------|----------|
| GET | `/admin/fuel` | [vehicle_fuel.py:113](../../app/views/vehicle/vehicle_fuel.py#L113) | `admin_fuel()` — KPI + bills + reimbursements + pivot |
| POST | `/admin/fuel/bill` | [vehicle_fuel.py:255](../../app/views/vehicle/vehicle_fuel.py#L255) | `create_bill()` |
| POST | `/admin/fuel/bill/<id>/edit` | [vehicle_fuel.py:287](../../app/views/vehicle/vehicle_fuel.py#L287) | `edit_bill()` |
| POST | `/admin/fuel/bill/<id>/delete` | [vehicle_fuel.py:308](../../app/views/vehicle/vehicle_fuel.py#L308) | `delete_bill()` |
| POST | `/admin/fuel/reimbursement` | [vehicle_fuel.py:322](../../app/views/vehicle/vehicle_fuel.py#L322) | `create_reimbursement()` — รวมบิลที่เลือก |
| POST | `/admin/fuel/reimbursement/<id>/edit` | [vehicle_fuel.py:358](../../app/views/vehicle/vehicle_fuel.py#L358) | `edit_reimbursement()` |
| POST | `/admin/fuel/reimbursement/<id>/receive` | [vehicle_fuel.py:373](../../app/views/vehicle/vehicle_fuel.py#L373) | `receive_reimbursement()` — mark ได้เงิน |
| POST | `/admin/fuel/reimbursement/<id>/delete` | [vehicle_fuel.py:384](../../app/views/vehicle/vehicle_fuel.py#L384) | `delete_reimbursement()` — detach bills back to รอเบิก |
| POST | `/admin/fuel/reserve` | [vehicle_fuel.py:400](../../app/views/vehicle/vehicle_fuel.py#L400) | `adjust_reserve()` — +/- with required note |
| POST | `/admin/fuel/price` | [vehicle_fuel.py:435](../../app/views/vehicle/vehicle_fuel.py#L435) | `add_price()` — effective-dated upsert |
| POST | `/admin/fuel/price/<id>/delete` | [vehicle_fuel.py:465](../../app/views/vehicle/vehicle_fuel.py#L465) | `delete_price()` |
| POST | `/admin/fuel/annual-budget` | [vehicle_fuel.py:479](../../app/views/vehicle/vehicle_fuel.py#L479) | `set_annual_budget()` — SystemConfig['fuel_annual_budget'] |
| GET | `/api/fuel/bill-by-mileage` | [vehicle_fuel.py:495](../../app/views/vehicle/vehicle_fuel.py#L495) | `api_bill_by_mileage()` — phase 3 mileage badge lookup |
| GET | `/admin/fuel/export/excel` | [vehicle_fuel.py:516](../../app/views/vehicle/vehicle_fuel.py#L516) | `export_excel()` — 3 sheets (บิล/ใบเบิก/Pivot) honoring filters (**DEBT-5, Phase 5, 2026-07-19** — 154 logic-line เกิน 60 ตั้งใจไม่แตะ legacy, optional/future) |

### notification API (in vehicle_bp)
| Method | Path | File:Line |
|--------|------|-----------|
| GET | `/api/notifications` | [vehicle_notification.py:74](../../app/views/vehicle/vehicle_notification.py#L74) — returns `{groups[], items[], sticky[], unread, unread_payment, badge}` (hybrid: booking→groups, solo→items; filter `superseded_at IS NULL`). per-notif dict มี `title` (display บรรทัดแรก จาก `_notif_title()` map event_key→ไทยสั้น, 2026-06-15) |
| POST | `/api/notifications/read-all` | [vehicle_notification.py:141](../../app/views/vehicle/vehicle_notification.py#L141) |
| POST | `/api/notifications/<id>/read` | [vehicle_notification.py:150](../../app/views/vehicle/vehicle_notification.py#L150) |
| POST | `/api/payment/report/<mileage_id>` | [vehicle_notification.py:166](../../app/views/vehicle/vehicle_notification.py#L166) |
| POST | `/api/payment/report-by-booking/<id>` | [vehicle_notification.py:183](../../app/views/vehicle/vehicle_notification.py#L183) |

### core (LINE — `core_bp`)
| Method | Path | File:Line | Function |
|--------|------|-----------|----------|
| POST | `/line/webhook` | [line_webhook.py](../../app/views/core/line_webhook.py) | `line_webhook()` — verify signature → message: ผูกบัญชีโค้ด 6 หลัก · **postback: approve booking ผ่าน LINE** (`_approve_via_line`) |
| GET | `/line/link` | [line_webhook.py](../../app/views/core/line_webhook.py) | `line_link()` — หน้าโค้ด 6 หลักผูกบัญชี LINE (login required) |

---

