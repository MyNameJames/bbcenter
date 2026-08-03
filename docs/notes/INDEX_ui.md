# INDEX — Templates + Design System

> Part ของ INDEX.md แยก เพื่อ token budget — [กลับ hub](INDEX.md)
> **อัปเดตล่าสุด:** 2026-08-03
>
> **2026-07-31 — ประวัติแยกออกไปแล้ว:** ไฟล์นี้เคยโต 220KB (~62.9K tok) เพราะทุกแถวสะสมประวัติ `Phase N (วันที่)` ไว้ตลอดกาล → ย้ายไป [INDEX_ui_history.md](INDEX_ui_history.md) แบบ verbatim (53 sections ไม่ตัดทิ้ง) เหลือ ~11.5K tok. แต่ละแถวมีลิงก์ `[ประวัติ →]` กลับไปหาของเดิม.
> **กฎต่อจากนี้:** แถวในไฟล์นี้ = "ไฟล์นี้คืออะไร + class/ID หลัก ณ ปัจจุบัน" เท่านั้น — ประวัติการเปลี่ยนแปลงลง history file หรือ [CHANGELOG.md](CHANGELOG.md) อย่าสะสมกลับเข้ามาอีก

---

## 🎨 Templates

> **2026-06-07 (ขั้น 4):** partials กลางย้าย → `templates/_shared/` (sidebar/header/navbar/notification_panel/notification_toast). modal instances → `<domain>/modals/` + prefix ชื่อ: `vehicle/modals/vehicle_*.html` · `room/modals/room_*.html` · `vehicle/admin/modals/fuel_*.html`. ชื่อ/path `*-modal-*.html` ในตารางด้านล่าง = **ชื่อเก่า** → map: `vehicle-modal-detail` = `vehicle/modals/vehicle_detail.html` (ตัด `vehicle-modal-` ออก, prefix `vehicle_`); เช่นเดียวกับ room/fuel. `_components/` (macro) **ไม่ย้าย**

**Shared partials** (include ทุกหน้า):
| Partial | File |
|---------|------|
| `_shared/sidebar.html` | [app/templates/_shared/sidebar.html](../../app/templates/_shared/sidebar.html) — `active_menu` keys: `dashboard` `vehicle` `repair` `room` `admin` `mileage` `fleet` `cost` `budget` `fuel` `approver` (`history` ลบ 2026-06-07). **Icons: Lucide** (`data-lucide="..."`) — load via `_header.html`. [ประวัติ →](INDEX_ui_history.md#_sharedsidebarhtml) |
| `_shared/header.html` | [app/templates/_shared/header.html](../../app/templates/_shared/header.html) [ประวัติ →](INDEX_ui_history.md#_sharedheaderhtml) |
| `_shared/notification_panel.html` | [app/templates/_shared/notification_panel.html](../../app/templates/_shared/notification_panel.html) — bell button `#notifBellBtn`: `ds-btn-icon` → `zen-iconbtn` (Zendenta 2026-06-19). dropdown panel + JS เดิมครบ. |
| `_shared/notification_toast.html` | [app/templates/_shared/notification_toast.html](../../app/templates/_shared/notification_toast.html) |
| `_shared/navbar.html` | [app/templates/_shared/navbar.html](../../app/templates/_shared/navbar.html) — legacy navbar (4 includes) |
| `_shared/sidebar2.html` + `_shared/header2.html` | **UE-redesign chrome (2026-07-11)** — port จาก `static/core/mockup-orders.html` แต่ role-based จริง (D1). include ผ่าน `_base_ue.html`. `sidebar2` = role sections + active-by-endpoint + Material Symbols icons; `header2` = topbar minimal + `notification_panel` จริง + **stub `window.lucide`** (ไม่โหลด Lucide) + โหลด `core/js/ms-icons.js`. ขยายไปหน้าอื่นใน phase ถัดไป |
| `_base_ue.html` | **UE redesign base layout (Phase 1.5, 2026-07-11)** — หน้าที่ redesign แบบ mockup-orders.html → `{% extends '_base_ue.html' %}`. ให้: head (bootstrap/fa/bi/fonts/components.css/gallery.css/ue.css) + `.ml2-frame` → include header2 + body-row(include sidebar2 + `main.ml2-content`) + flash→toast bridge + base scripts (jquery/bootstrap/`ue-motion.js`/`bb-components.js`). **blocks:** `title`·`head`·`page_title`(h1 แสดงเมื่อมีข้อความ ผ่าน `self.page_title()`)·`content`·`modals`·`scripts`. First adopter: `vehicle/admin/vehicle_mileage.html` |
| `_components/*.html` | Reusable Jinja macros (Phase 2 + 3) — see § Design System > Component library. Files: `kpi.html` (`kpi_cell` accepts `icon_kind='lucide'\|'fa'`, default lucide), `filter_bar.html`, `badge.html` (`badge(text, tone, dot=False, icon='', size='')`, lucide), `pill.html`, `empty_state.html` (`empty_state(title, desc, icon, compact)`, lucide, `{% call %}` for CTA), `form_group.html`, `table_shell.html`, `_modal.html`. Phase 3 aligned to flat vocab matching `/bbcenter-design` skill. **subfolder:** `_components/bb/` = `.bb-*` macro (**ue_chip** [Uber-style filter chip · `.ue-chip*` toggle+dropdown · 2026-07-11 · ดู § Design System]/table/daterange/**combo [ประวัติ →](INDEX_ui_history.md#_componentshtml) |

**Dashboard templates:**
| File | ใช้สำหรับ |
|------|----------|
| `auth/login.html` | **หน้า login** [ประวัติ →](INDEX_ui_history.md#authloginhtml) |
| `core/line_link.html` | **ผูกบัญชี LINE** (2026-06-12) — หน้า `/line/link` (`core_bp.line_link`): vc-scope shell (sidebar + header) แสดงโค้ด 6 หลัก (`User.line_link_code`) + 3 ขั้นตอนแอด Official Account; state `is_linked` → การ์ดยืนยัน. Bootstrap util + vc-* tokens (ไม่มี CSS แยก) |
| `dashboard/dashboard.html` | landing page หลัง login — **Action Hub** [ประวัติ →](INDEX_ui_history.md#dashboarddashboardhtml) |

**Repair templates:**
| File | ใช้สำหรับ |
|------|----------|
| `repair/repair.html` | ระบบแจ้งซ่อมไอที — **vc-scope shell** [ประวัติ →](INDEX_ui_history.md#repairrepairhtml) |
| `maintenance/maintenance.html` | แจ้งซ่อมอาคารสถานที่ — **vc-scope shell** [ประวัติ →](INDEX_ui_history.md#maintenancemaintenancehtml) |

**Room templates:**
| File | ใช้สำหรับ |
|------|----------|
| `room/room.html` | ปฏิทินจองห้องประชุม — **vc-scope shell** [ประวัติ →](INDEX_ui_history.md#roomroomhtml) |
| `room/room-modal-book.html` | `#bookingModal` — เลือกห้อง/หัวข้อ/วันที่/ช่วงเวลา + duration preview |
| `room/room-modal-edit.html` | `#editBookingModal` — แก้ไขห้อง/หัวข้อ/วันเวลา (flatpickr) |
| `room/room-modal-detail.html` | `#eventDetailModal` — ดูรายละเอียด + แก้ไข/ยกเลิก (เฉพาะ owner) |

**Vehicle templates:**
| File | ใช้สำหรับ |
|------|----------|
| `vehicle/vehicle.html` | หน้าจองหลัก. [ประวัติ →](INDEX_ui_history.md#vehiclevehiclehtml) |
| `vehicle/vehicle_edit.html` | แก้ไข booking |
| `vehicle/vehicle_approver.html` *(เดิม approver_inbox.html)* | Approver inbox — budget card + 3 tabs (รออนุมัติ/อนุมัติแล้ว/ปฏิเสธ) + accordion cards + inline reject form. [ประวัติ →](INDEX_ui_history.md#vehiclevehicle_approverhtml-เดิม-approver_inboxhtml) |
| `vehicle/admin/vehicle_mileage.html` | บันทึกเลขไมล์ (admin) — ประวัติ vc-scope/legacy ก่อน bb-* migrate → [CHANGELOG.md](CHANGELOG.md#vehicleadminvehicle_mileagehtml-บันทึกเลขไมล์-admin). **🎨 P1 ".bb-*" redesign (2026-06-28):** หน้านี้เป็น **first adopter** ของ `core/css/components.css` (`.bb-*` component library) — `<link>` เพิ่มเข้า `<head>` พร้อม Inter font (Google Fonts). Layout = Pattern P1 "List/Ledger": KPI strip (`.bb-kpi.is-ghost` × 3 + `#modeSelected` swap) → sticky toolbar `.mlg-toolbar` (`.bb-tabs/.bb-tab.is-on` row 1 + `.bb-search` row 2) → table (`.bb-table` + `.bb-th.sortable` + `.bb-sort-icon`) → status pills (`.bb-status.is-ok/.is-wr/.is-neutral` + `.bb-dot`) → action (`.bb-icon-btn`). modal shell คง Bootstrap: buttons → `.bb-btn.is-pri/.is-ghost`, inputs → `.bb-input/.bb-label/.bb-hint.is-error`. Legacy removed: `zen-tabs/zen-tab/zen-search/data-table/badge-pill.b-*/kpi-tile/kpi-num/sort-icon/vc-btn-*`. JS selectors: `.zen-tab`→`.bb-tab`, `'active'`→`'is-on'`, `.data-table`→`.bb-table`, `.sort-icon i`→`.bb-sort-icon [data-lucide]`. [ประวัติ →](INDEX_ui_history.md#vehicleadminvehicle_mileagehtml) |
| `vehicle/vehicle_driver.html` *(เดิม driver_home.html)* | หน้าคนขับ — **Vercel namespace** [ประวัติ →](INDEX_ui_history.md#vehiclevehicle_driverhtml-เดิม-driver_homehtml) |
| `vehicle/modals/vehicle_book.html` *(เดิม vehicle-modal-book.html, ย้าย→modals/ ขั้น 4 2026-06-07)* | `#bookingModal`. [ประวัติ →](INDEX_ui_history.md#vehiclemodalsvehicle_bookhtml-เดิม-vehicle-modal-bookhtml-ย้ายmodals-ขั้น-4-2026-06-07) |
| `vehicle/vehicle-modal-edit.html` | `#editBookingModal`. [ประวัติ →](INDEX_ui_history.md#vehiclevehicle-modal-edithtml) |
| `vehicle/vehicle-modal-detail.html` | `#eventDetailModal` — **shared** modal ผูกทั้ง `vehicle.html` (user, `pages/vehicle.js` → `openEventDetail()`, CSS `vehicle_calendar.css`) และ `vehicle/admin/vehicle_admin.html` (admin, `vehicle_admin.js` → `openAdminBookingDetail()`/`openAdminEdit()`/`cancelAdminEdit()`/`saveAdminEdit()`, **ไม่โหลด CSS ของ `.bk-detail-*` เลย**). แก้ไฟล์นี้ต้องเช็กทั้ง 2 ฝั่ง. **2026-08-03 (user-facing scope):** ตัดปุ่มปิด X (CSS ใน `vehicle_calendar.css`) ตาม [modal_pattern.md](modal_pattern.md) — footer โชว์ปุ่ม "ปิด" fallback เสมอเมื่อไม่มี action อื่น ทั้ง 2 ฝั่ง (`openEventDetail()` + `openAdminBookingDetail()`) แทนยุบ footer หายแบบเดิม. `#detailEditSection` **ยังใช้งานจริงฝั่ง admin — ไม่ใช่ dead code**, เก็บไว้. [ประวัติ →](INDEX_ui_history.md#vehiclevehicle-modal-detailhtml) |
| `vehicle/vehicle-modal-group.html` | *(merged into vehicle-modal-detail.html)* |
| `vehicle/vehicle-modal-more-events.html` | `#moreEventsModal`. **Phase 2 (2026-05-17):** ลบ class `shadow` + inline `border-radius:14px`; outer wrapper → `bk-modal-dialog-sm` + `bk-modal-content` (reuse จาก vehicle.css) |
| `vehicle/admin/vehicle_admin.html` | admin dashboard — ประวัติ vc-scope/legacy ก่อน bb-* migrate → [CHANGELOG.md](CHANGELOG.md#vehicleadminvehicle_adminhtml-admin-dashboard). **bb-* migration (2026-07-05):** ลบ legacy CSS ทั้งหมด (`design-system.css`/`vehicle.css`/`vehicle_fuel.css`/`vehicle_admin.css`) → เหลือ `core/css/components.css`+`gallery.css` (`bb-*`) ล้วน. Booking cards/vehicle status rows/trip rows (`vehicle_admin.js`) → `bb-card`/`bb-badge`/`bb-status`/`bb-btn`/`bb-avatar`. 4 modal inner markup → `bb-modal-*`/`bb-field`/`bb-seg`/`bb-callout` (Bootstrap `.modal.fade` shell คงเดิม). Toast → `ToastRegion()`+`bbToast()` แทน `.adm-toast`. ตาม pattern [redesign_migration_pattern.md](redesign_migration_pattern.md). [ประวัติ →](INDEX_ui_history.md#vehicleadminvehicle_adminhtml) |
| `vehicle/admin/vehicle_fleet.html` (เดิม `admin_manage_fleet.html`) | จัดการรถ + คนขับ + ตารางผู้อนุมัติประจำกอง (view-only); add/edit รถ+คนขับ รวมเป็น modal เดียวต่อโดเมน (`#addVehicleModal`/`#addDriverModal`, ดู [modal_pattern.md](modal_pattern.md)) — service/tax date (เฉพาะ edit) อยู่ใน `#avServiceSection` ภายใน `#addVehicleModal`. CSS `vehicle/css/vehicle_fleet.css` · JS `vehicle/js/vehicle_fleet.js`. [ประวัติ →](INDEX_ui_history.md#vehicleadminvehicle_fleethtml-เดิม-admin_manage_fleethtml) |
| `vehicle/admin/vehicle_cost.html` | จัดการค่าล่วงเวลา (OT) คนขับ — KPI (3 cell raw), filter bar (date range/driver GET), table + status tabs (vc-tab/vc-tab-count), edit modal (slot rows dynamic), rate config modal (rate rows dynamic), print receipt (`@media print`). [ประวัติ →](INDEX_ui_history.md#vehicleadminvehicle_costhtml) |
| `vehicle/admin/vehicle_budget.html` | จัดการงบ — ประวัติ vc-scope/legacy ก่อน bb-* migrate → [CHANGELOG.md](CHANGELOG.md#vehicleadminvehicle_budgethtml-จัดการงบ). **bb-* migration (2026-07-05):** ลบ legacy CSS ทั้งหมด (รวม `vehicle_budget.css`) → `bb-*` ล้วน + เพิ่ม `<link>` ตรงถึง `core/css/components/dropdown.css` (sbApprover autocomplete พึ่ง CSS นี้ทางอ้อมผ่าน `design-system.css` เดิม). Summary card/tab bar/pivot table/personal section/5 modal → `bb-card`/`bb-tabs`/`bb-badge`/`bb-modal-*` (pivot table sticky-col+heat ไม่มี bb-* เทียบเท่า → ใช้ `table data-table` + inline token แทน). datepicker (`va-cal`) reskin เป็น `.bb-dp`/`.bb-cal-*` แต่ JS logic เดิมไม่แตะ. ตาม pattern [redesign_migration_pattern.md](redesign_migration_pattern.md). **card→table redesign (2026-08-03):** tab "งบที่ใช้อยู่"/"งบปิดแล้ว" เปลี่ยนจาก `budget_card`/`budget_card_off` macro (card grid) เป็นตาราง `bb-table` เดียว (คอลัมน์ ประเภท ขึ้นหน้าสุด เป็น `bb-badge is-ok`(ส่วนกลาง)/`is-info`(ส่วนกอง), ลบคอลัมน์ avatar, action ย้ายเข้า `bb-ml-dd` dropdown ในแถว) — macro `budget_card`/`budget_card_off`/`bcard_section_head` ถูกลบ (dead code หลัง redesign) · tab ปิดแล้วเพิ่ม action icon bin ลบงบ (mockup ยังไม่ผูก logic) |
| `vehicle/admin/budget_personal.html` | personal reimbursement |
| `vehicle/admin/admin_fuel.html` | **Phase 2.3–2.7 + 3 + 4.1/4.3** — Vercel shell, 6 KPI cells (raw), filter bar (year/month/vehicle/driver GET — raw), Bills data table (Excel export link, anchor `#billsCard`), Reimbursements accordion, **Pivot รถ×เดือน** (heatmap, sticky col, footer sum, **drill-down → Bills filter year+vehicle+month**), **5 modals (bill/reimb/reserve/price/budget)** + JS controller. **Phase 3:** empty states use `empty_state` macro; KPI/filter/table kept raw as canonical reference for `/bbcenter-design`. [ประวัติ →](INDEX_ui_history.md#vehicleadminadmin_fuelhtml) |
| `vehicle/admin/fuel-modal-bill.html` | Bill create/edit/delete modal — date/vehicle/driver/amount/payment radio segmented/mileage/note. `#fuelBillModal` |
| `vehicle/admin/fuel-modal-reimbursement.html` | Reimbursement create/edit modal — bill list summary + เลขใบเบิก/แหล่ง/วันส่ง/note. `#fuelReimbModal` |
| `vehicle/admin/fuel-modal-reserve.html` | Reserve adjust modal — current summary + signed change + note (required) + history 20. `#fuelReserveModal` |
| `vehicle/admin/fuel-modal-price.html` | Fuel price modal — add new + history with delete. `#fuelPriceModal` |
| `vehicle/admin/fuel-modal-budget.html` | Annual budget modal — single number input + summary. `#fuelBudgetModal` |

**กฎสำคัญ:** modal ห้ามมี inline `<script>` — JS อยู่ใน `pages/vehicle.js` ทั้งหมด

---

## 🎨 Design System

> 🎨 **กฎ design = [design_guideline.md](design_guideline.md) (canonical เดียว · v2.1 2026-07-21 "ink คือโครง เขียวคือสัญญาณ").** ส่วนนี้คือ **file map ของ asset เก่า (`--vc-*` legacy)** เท่านั้น — ใช้ดูว่าไฟล์ CSS/JS อยู่ไหน ไม่ใช่กฎ design. design ใหม่/redesign → ยึด guideline
>
> ✅ **v2.1 (Batch 0-3 · 2026-07-21) — `components.css` = canonical ตัวเดียว:** [ประวัติ →](INDEX_ui_history.md#design-system-v21-batch-0-3)

> **2026-06-07 (ขั้น 5):** asset ย้าย → `static/<domain>/{css,js}/` + `static/core/` (shared). ชื่อ `css/X.css` / `js/pages/X.js` ใน 2 ตารางด้านล่าง = **เก่า** → mapping:
> - **core/** (shared): `design-system` `tokens` `main` `util` `vercel` `notification` `components/*` (css) · `icons` `format` `http` `main` `notification` (js)
> - **vehicle/** (prefix `vehicle_`): `vehicle.css`(base) · `fuel_admin`→`vehicle_fuel` · `budget_manage`→`vehicle_budget` · `mileage_admin`→`vehicle_mileage` · `manage_fleet`→`vehicle_fleet` · `driver`→`vehicle_driver` · `approver_inbox`→`vehicle_approver` · `vehicle_admin`/`vehicle_cost` คงชื่อ (js: `-`→`_`, `ot-admin`→`vehicle_ot`). หมายเหตุ: `activity_timeline`/`vehicle_history` css+js ลบ 2026-06-07 (dead)
> - **repair/room/maintenance/dashboard/**: `<domain>.css` + `<domain>.js` · images = shared คง `static/images/`

**Token source (single):** [app/static/core/css/tokens.css](../../app/static/core/css/tokens.css) — 2026-05-14 split out (Phase 1)
- `--vc-*` **canonical** (Vercel-Black + Indigo accent) — ใช้ใน code ทุกที่ เพิ่ม `--vc-z-*`/`--vc-sidebar-width`/`--vc-header-height` ใน Phase 5.1; **2026-06-10:** font หลัก + ปุ่ม primary เปลี่ยนจากดำ `#111827` → กรมท่า/navy `#1C2E4A` (`--vc-fg` + `--vc-primary`, hover `#26405F`) — กระทบ text หลัก, `ds-btn-primary`, `vc-btn-primary`, sidebar logo box ทั้งระบบ; **Phase 3 vehicle user-facing (2026-05-17)** เพิ่ม `--vc-purple-bg` (`rgba(121,40,202,.10)`) + `--vc-purple-border` (`rgba(121,40,202,.25)`) ใต้ `--vc-purple` สำหรับ `vc-status-dot--group`
- `--ds-*` **RETIRED** (Phase 5.1, 2026-05-16) — ลบ Part A ออกครบแล้ว; `var(--ds-*)` ต้องไม่มีใน codebase; ถ้าเจอ = bug (vehicle user-facing Phase 4 2026-05-17 — `pages/vehicle.js` cleared 14 จุด; เหลือ `pages/vehicle-admin.js` L344/L369 ใน admin page)
- `@import`-ed by `design-system.css` + `components.css` (ทุกหน้าทั้ง 2 ระบบ legacy/bb-* โหลดผ่าน transitively). **scrollbar-hide + modal-open/backdrop fix consolidate (2026-07-21):** ย้ายมารวมที่นี่จุดเดียว (เดิมซ้ำ 3 ไฟล์: tokens/components/design-system — `components.css` มี scrollbar-hide แต่ขาด modal fix ทำให้เห็น gap ตอนเปิด modal บนหน้า bb-* เช่น `vehicle_mileage.html`); ไฟล์อื่นแก้ไม่ต้องก็อปซ้ำ ให้ `@import` จากที่นี่

**Component entry:** [app/static/core/css/design-system.css](../../app/static/core/css/design-system.css) — typography + components + `.vc-mono/-caption/-icon*/-scope` utilities (no token defs anymore). `@import`s `tokens.css` + every file in `components/`. [ประวัติ →](INDEX_ui_history.md#design-systemcss-component-entry)

**Component library (Phase 2, 2026-05-14):**
| Component | CSS | Macro | Notes |
|-----------|-----|-------|-------|
| KPI strip | [components/kpi.css](../../app/static/core/css/components/kpi.css) | [_components/kpi.html](../../app/templates/_components/kpi.html) | `kpi_group(cols=3\|4\|6)` + `kpi_cell(label,value,unit,icon,meta,tone)`. Tones: muted/success/danger/blue/warn. Extracted from `fuel_admin.css`+`budget_admin.css`. (4-col added 2026-05-18 for admin_fuel KPI group A. `--purple` retired Phase 8, 2026-05-22.) |
| Filter bar | [components/filter_bar.css](../../app/static/core/css/components/filter_bar.css) | [_components/filter_bar.html](../../app/templates/_components/filter_bar.html) | `filter_bar()` wraps a `<form>`; `filter_select`/`filter_date` for fields. Extracted from `fuel_admin.css §21`. |
| Badge | [components/badge.css](../../app/static/core/css/components/badge.css) | [_components/badge.html](../../app/templates/_components/badge.html) | `.vc-badge` + tones `-neutral/-warning/-blue/-success/-danger/-solid`, `.vc-badge-dot` left dot, `.vc-badge-xs` small. `-solid` = inverted black-fg/white-bg for strong emphasis (re-added Phase 3.2 for "X งานรวม" pill). (Page-local `.vc-badge-purple` ลบ Phase 8, 2026-05-22 — markup zero usage.) Phase 3 aligned to flat vocab matching `/bbcenter-design` skill. |
| Pill | [components/pill.css](../../app/static/core/css/components/pill.css) | [_components/pill.html](../../app/templates/_components/pill.html) | Rounded chip for filter tabs/segmented. `.is-active`, tones `accent/success/danger`. |
| Empty state | [components/empty_state.css](../../app/static/core/css/components/empty_state.css) | [_components/empty_state.html](../../app/templates/_components/empty_state.html) | `empty_state(title, desc, icon, compact)` — lucide icon. Use `{% call %}…{% endcall %}` for CTA button. Phase 3 aligned to flat vocab (`vc-empty-title/-desc/-icon`). |
| Form group | [components/form_group.css](../../app/static/core/css/components/form_group.css) | [_components/form_group.html](../../app/templates/_components/form_group.html) | `form_input/form_select/form_group(call)`. States `.has-error/.is-disabled`. |
| Table shell | [components/table_shell.css](../../app/static/core/css/components/table_shell.css) | [_components/table_shell.html](../../app/templates/_components/table_shell.html) | `.vc-table-shell` wrapper + `.vc-table` skin. |
| Modal | [components/modal_shell.css](../../app/static/core/css/components/modal_shell.css) | [_components/_modal.html](../../app/templates/_components/_modal.html) | Bootstrap-based macro (predates Phase 2) + new tokenized helpers (`.vc-modal-section/-divider`). |
| Pivot table | [components/pivot.css](../../app/static/core/css/components/pivot.css) | (no macro — used inline as `<details class="vc-card vc-pivot-wrap">`) | `.vc-pivot-wrap/-summary/-scroll/-table/-th-sticky/-td-sticky/-cell/-cell-empty/-total-col/-link` + `--cell-heat` (0-100 heat scale, accent blue at low opacity via `rgba(var(--vc-accent-rgb), …)`, 2026-06-16; เดิม indigo). Collapsed via `<details>` + `vc-collapse-chevron` rotation. [ประวัติ →](INDEX_ui_history.md#pivot-table) |
| Dropdown + Autocomplete | [components/dropdown.css](../../app/static/core/css/components/dropdown.css) | (no macro — JS hook `data-dropdown` / `data-autocomplete`; JS: [core/js/dropdown.js](../../app/static/core/js/dropdown.js)) | [ประวัติ →](INDEX_ui_history.md#dropdown-autocomplete) |
| UE foundation CSS | [core/css/ue.css](../../app/static/core/css/ue.css) | (no macro — โหลดผ่าน `_base_ue.html` หลัง components.css) | [ประวัติ →](INDEX_ui_history.md#ue-foundation-css) |
| UE motion JS | (no CSS) | (no macro — JS: [core/js/ue-motion.js](../../app/static/core/js/ue-motion.js)) | **Phase 1.5 (2026-07-11)** — `window.ueMotion` (pattern เดียวกับ `bbToast`): `countUp(el,target,{format,duration})` · `staggerRows(scope,{rows,dots,step,cap})` · `showSkeleton(container,{count})` + `REDUCE`/`sleep`/`SKEL_MIN_MS`. generic/parameterized — page JS เรียกใช้ (mileage: `countUp(elC,c,{format:fmt})` ฯลฯ). classic script โหลด "ก่อน" page JS (ผ่าน `_base_ue.html`). |
| UE Chip (Uber-style filter chip) | [core/css/ue.css](../../app/static/core/css/ue.css) § CHIP | [_components/bb/ue_chip.html](../../app/templates/_components/bb/ue_chip.html) | [ประวัติ →](INDEX_ui_history.md#ue-chip-uber-style-filter-chip) |
| Combo + Daterange popover (shared behavior) | (scoped ใน `components.css`/`ue.css`) | [_components/bb/combo.html](../../app/templates/_components/bb/combo.html) / [_components/bb/daterange.html](../../app/templates/_components/bb/daterange.html) | [ประวัติ →](INDEX_ui_history.md#combo-daterange-popover-shared-behavior) |
| MS icon transform (Lucide→Material Symbols) | (no CSS — sizing via page CSS) | (no macro — JS: [core/js/ms-icons.js](../../app/static/core/js/ms-icons.js)) | [ประวัติ →](INDEX_ui_history.md#ms-icon-transform-lucidematerial-symbols) |
| Sidebar | [components/sidebar.css](../../app/static/core/css/components/sidebar.css) | (template: `_sidebar.html`) | `.sidebar` + `.sb-brand/-logo(-icon,-text)/-close/-nav/-section-label/-item(.active)/-icon/-label/-badge/-footer/-logout`. Defines `--sidebar-width`. [ประวัติ →](INDEX_ui_history.md#sidebar) |

Total: 9 component CSS files + 8 macros (7 new in Phase 2 + 1 pre-existing `_modal.html`).

**Highlights:**
- `--vc-accent` `#4059e6` (indigo, 2026-06-17 redesign; เดิม `#014198` sila5) = `--vc-primary` — active states + focus ring + selected/today (legacy alias `--ds-accent` ยังมีใน tokens.css Part A — ห้ามอ้างใน code ใหม่)
- `--vc-accent-rgb` `64, 89, 230` (2026-06-17) — channel triplet สำหรับ `rgba(var(--vc-accent-rgb), …)` ที่ต้องคุม opacity (pivot heat-tint, link hover bg). **Indigo drift cleanup (2026-06-16):** rebrand 2026-06-14 แก้แค่ token แต่ component CSS ยัง hardcode indigo เก่า — ไล่แก้ครบ: `pivot.css` (heat-tint rgba `79,70,229`→`var(--vc-accent-rgb)` + drop fallback `#4F46E5`), `vehicle_budget.css` (central→`--vc-accent`, dept `#818cf8`→`--vc-blue-mid`), `vehicle_mileage.css` + `vehicle.css` (drop indigo fallback, focus ring→`--vc-accent-ring`). grep zero-drift ผ่าน
- `--vc-primary` `#4059e6` (indigo, 2026-06-17 redesign; เดิม `#014198` sila5) — primary CTA · `--vc-blue` unify เข้า brand เฉดเดียว · text = navy `#162334` (`--vc-fg`) · `--vc-border` `#f0f0f0` · `--vc-radius-md` 8px (card) · redesign ใช้ 6px (`--vc-radius-sm` = rounded-2) · **+token** `--vc-icon` `#9999b0` / `--vc-icon-bg` `#f0f0f0` / `--vc-sidebar-bg` `#fafcfc` (2026-06-19 Zendenta; เดิม `#fafbfc`) / `--vc-sidebar-active` `#e6ecfa`
- Shadow: ไม่มี (border only) — ยกเว้น modal
- **`--bb-n700` `#4A4A4A`** (components.css `:root`, 2026-07-22) — เติมช่องว่างใน neutral scale เดิม (`n50/100/200/300/500`) สำหรับ text บนพื้น tint (`n50`/`n100`) ที่เข้มกว่า `mut`; adopter แรก = `.ue-chip` base text
- Font: ไทย = Sarabun (`--vc-font-sans`, โหลด global ใน `_header.html`); [ประวัติ →](INDEX_ui_history.md#font-stack-sarabun-inter)
- `.vc-scope` = opt-in body class for pages using `--vc-*` foundation
- **🎨 `main.css` = Zendenta layer** — [core/css/main.css](../../app/static/core/css/main.css) rewrite จาก legacy login CSS → design layer. โหลดผ่าน `_shared/header.html` **หลัง** `design-system.css` = override. ครอบ app layout `.main-content` · `.sidebar-*` · `.zen-card` · `.kpi-tile` · `.data-table`. [ประวัติ →](INDEX_ui_history.md#maincss)

- **🖼️ `/dev/components` = visual reference (canonical):** render component จริงทุกตัวผ่าน `{{ component(obj) }}` (drift ไม่ได้; static `components-gallery.html` retired 2026-07-19). **rule: อยากได้ component → เปิด `/dev/components` ก่อน · มีแล้ว copy · ไม่มี แจ้งกลับเพื่อเพิ่ม** (ห้ามสร้าง `.bb-*` ใหม่เองมั่ว). ต้อง sync ทุกครั้งที่เพิ่ม/แก้ component ใน components.css
- **🎨 `components.css` = Component library (canonical)** — [core/css/components.css](../../app/static/core/css/components.css) prefix `.bb-*` + token `--bb-*`. `:root` ของทั้งระบบอยู่ที่ไฟล์นี้ที่เดียว. [ประวัติ →](INDEX_ui_history.md#componentscss)

**Per-page CSS:**
| File | ใช้กับ |
|------|--------|
| `vehicle.css` | หน้า user vehicle + history (calendar ถูกลบใน Phase 0.5). โหลดโดย `room.html`/`vehicle_driver.html`/`vehicle_approver.html`/`admin_fuel.html`/`vehicle_cost.html`/`vehicle_budget_personal.html`/`dashboard.html`/`repair.html`/`maintenance.html`/`line_link.html` — **ไม่ใช่ `vehicle.html`** (หน้านั้นโหลด `vehicle_calendar.css` แทน — ดูแถวถัดไป). [ประวัติ →](INDEX_ui_history.md#vehiclecss) |
| `vehicle/css/vehicle_calendar.css` | **`vehicle.html` only** (ปฏิทิน user-facing) — `--bb-*` ล้วน, โหลดท้ายสุดเสมอ. **2026-08-03:** `.mobile-indicator.is-empty` (visibility:hidden slot กัน calendar-cell มือถือสูงไม่เท่ากัน) · `.vrc-m-evt*` (card/dot/status) ลบทิ้ง → `.vrc-m-list` ใช้ `bb-card`/`bb-avatar`/`bb-subtext`/`bb-status`/`bb-badge` จาก `core/css/components.css` แทน (เหลือแค่ `.vrc-m-evt-toggle`/`.vrc-m-evt-sub-row`/`.vrc-m-evt-sub-title`/`.vrc-m-evt-sub-meta` เดิมสำหรับ group collapse — `.vrc-m-evt-sub-time`/`.vrc-m-evt-sub-body` ลบเพิ่ม (dead หลัง sub-row เปลี่ยน markup ให้ตรง adminPreviewCards)) · `.bk-detail-footer:has(#detailActions:empty)` + `.bk-detail-content .bk-close` ลบ (ดู `vehicle-modal-detail.html`) |
| `vehicle_zendenta.css` *(ใหม่ 2026-06-14)* | **`vehicle.html` only** — vehicle theme (scope `body.zd`, link ต่อท้าย). **calendar restyle "ภาพ 2"**: `.cal-toolbar` grid `1fr auto 1fr` → `#currentMonthLabel` กลางเสมอ (+ `.cal-month-label`); `.calendar-grid-head` พื้นใส + `.calendar-header-cell`; `.date-number` มุมขวาบน (`align-self:flex-end`); **today = เลขปกติ** (ลบวงกลม base), **selected = เลขวงกลมน้ำเงินทึบ** (วงกลมเดียว); `.calendar-cell.other-month` opacity .5; `.event-card` pill. [ประวัติ →](INDEX_ui_history.md#vehicle_zendentacss-ใหม่-2026-06-14) |
| `vehicle_driver.css` *(เดิม driver.css)* | **`/driver` only** [ประวัติ →](INDEX_ui_history.md#vehicle_drivercss-เดิม-drivercss) |
| `vehicle_admin.css` | admin dashboard + budget pages. [ประวัติ →](INDEX_ui_history.md#vehicle_admincss) |
| `fuel_admin.css` | **Vercel namespace** — fuel page only. Page-specific only now (Phase 2 moved KPI+filter → `components/`; Phase 3 moved badge+empty-state → `components/badge.css` + `components/empty_state.css`; **Phase 7 (2026-05-22)** moved §22 pivot table → `components/pivot.css`). Sections: page shell, header, card, btn, table, list+collapse+meta-grid, form input/segmented radio/modal Bootstrap-override skin/history scroll table. §22 = comment pointer only. |
| `vehicle/css/vehicle_mileage.css` | **RETIRED** — ไม่มี template โหลดแล้ว (superseded โดย bb-* migration ของ `vehicle_mileage.html`, ยืนยันด้วย grep 2026-07-05) — ประวัติเต็ม → [CHANGELOG.md](CHANGELOG.md#vehiclecssvehicle_mileagecss-retired) |
| `vehicle_cost.css` | **`/admin/cost` only** — OT page. Pure `--vc-*` (Phase 3.7). Classes: `.cost-header/-title/-subtitle/-header-actions`, `.cost-rate-banner/-banner-title/-rate-pills/-rate-pill`, `.vc-tabs/.vc-tab/.vc-tab-count` (tab bar), `.cost-slot-tag/-morning/-evening/-night/-slot-rate` (time band chips), `.cost-table-footer/-meta/-total`, `.cost-slot-row/-row-field/-row-remove/-row-hint`, `.cost-total-box/-label/-hours/-amount`, `.cost-slot-add-btn`, `.cost-range-chip`, `.cost-action-group` (inline-flex gap-1 for row actions), `.cost-print-*` (receipt @media print). [ประวัติ →](INDEX_ui_history.md#vehicle_costcss) |
| `maintenance.css` | **`/maintenance` only** (2026-05-17) — `vc-scope` page. Classes: `.maintenance-header/-header-actions`, `.maintenance-resolved-note` (truncate with tooltip). ใช้ `--vc-*` ทั้งหมด, zero HEX. **Redesign (2026-06-16):** ลบ `.maintenance-title/.maintenance-subtitle` (header ใช้ utility class); + custom DataTables pagination scoped `#maintenanceTable_wrapper` (pill วงกลม accent, prev/next chevron `::before`) + `.maintenance-goto/-label/-select/-btn` (copy #2 ของ pattern — ถ้าหน้า #3 ใช้ → extract shared component). |
| `repair.css` | **`/repair` only** [ประวัติ →](INDEX_ui_history.md#repaircss) |
| `vehicle_approver.css` *(เดิม approver_inbox.css)* | **`/vehicle/approver` only** [ประวัติ →](INDEX_ui_history.md#vehicle_approvercss-เดิม-approver_inboxcss) |
| `room.css` | **`/room` only** [ประวัติ →](INDEX_ui_history.md#roomcss) |
| `manage_fleet.css` (ไฟล์จริง `vehicle_fleet.css`) | **`/admin/manage-fleet` only** [ประวัติ →](INDEX_ui_history.md#manage_fleetcss-ไฟล์จริง-vehicle_fleetcss) |
| `budget_manage.css` | **RETIRED** — ไม่มี template โหลดแล้ว (superseded โดย bb-* migration ของ `vehicle_budget.html`, ยืนยันด้วย grep 2026-07-05) — ประวัติเต็ม → [CHANGELOG.md](CHANGELOG.md#budget_managecss-retired) |
| `dashboard.css` | **`/dashboard` only** [ประวัติ →](INDEX_ui_history.md#dashboardcss) |
| `notification.css` | notification panel + toast. [ประวัติ →](INDEX_ui_history.md#notificationcss) |
| `vercel.css` | **Vercel-style refresh Phase 6.0** [ประวัติ →](INDEX_ui_history.md#vercelcss) |
| `util.css` | **orphan ตั้งแต่ 2026-06-16** — ยังถูก include ที่อื่นไหมให้เช็กก่อนลบ. (`main.css` **กลับมาใช้แล้ว 2026-06-19** = Zendenta layer โหลดทุกหน้าผ่าน `_header.html` — ดู § Design System บรรทัด main.css entry) |
| `auth/css/login.css` | **หน้า login** (2026-06-16) — Sneat-style card, `--vc-*` tokens เท่านั้น, no shadow→border. คลาส `login-card/login-brand/login-field/login-input/login-toggle/login-btn/login-flash/login-dots` (`login-row/login-remember/login-forgot` ลบ 2026-06-17) |
| `auth/js/login.js` | **หน้า login** (2026-06-16) — IIFE toggle แสดง/ซ่อน password (สลับ icon-eye / icon-eye-off) |

**Core JS modules** (`app/static/core/js/`, Phase 4.0 — 2026-05-15; ย้ายจาก `js/core/` ขั้น 5, 2026-06-07):
| File | Exports |
|------|---------|
| `core/icons.js` | `initIcons(scope?)` — guarded `lucide.createIcons()`; ส่ง `Element` เพื่อจำกัด scope (modal-only re-init); `bindModalReinit()` — re-render on `shown.bs.modal` (auto-scope ไป `e.target`) |
| `core/format.js` | `thb(n)`, `km(n)`, `number(n)`, `thaiDate(d, {abbr})`, `thaiTime(d)` — Thai BE year + locale formatting |
| `core/http.js` | `get(url, params)`, `post(url, data)`, `del(url)` — auto JSON parse, CSRF from `<meta name="csrf-token">`, throws `HttpError` on non-2xx |

**ที่ยังไม่สร้าง** (จะเพิ่มเมื่อ feature module ต้องการ): `core/modal.js`, `core/toast.js`, `core/form.js`

**Per-page JS:**
| File | โหลดใน |
|------|--------|
| `pages/vehicle.js` | vehicle templates (รวม modals ทั้งหมด). **2026-08-03:** `createCell()` render `.mobile-indicator` slot เสมอ (`.is-empty` เมื่อ 0 event) · `updateMobileList()` การ์ด bb-card (`STATUS_TONE`/`BB_STATUS_TONE`/`BB_STATUS_ICON` consts ใหม่ต่อ status) ตรงกับ `adminPreviewCards` (`ptCardSingle`/`ptCardGroup` ใน `vehicle_admin.js`) ทุกจุดยกเว้น budget/checkbox/ปุ่ม action — title=ชื่อผู้จอง, subtext=เส้นทาง (`pickup → dest`), meta=`_mlTripMeta()` (pax+เวลา+duration ตาม `ptTripMeta`), บรรทัดคนขับ·ทะเบียน (`_mlPlate()`) แทน budget line · helper ใหม่ `_mlDurLabel()`/`_mlPlate()`/`_mlTripMeta()` (ก่อนฟังก์ชัน `updateMobileList()`) · `openEventDetail()` footer เพิ่มปุ่ม "ปิด" fallback เมื่อไม่มี action. [ประวัติ →](INDEX_ui_history.md#pagesvehiclejs) |
| `pages/vehicle-admin.js` *(ไฟล์จริง `vehicle/js/vehicle_admin.js`)* | admin dashboard (Phase 4.3, 2026-05-15) — ES module (`type="module"`); imports `initIcons` จาก `core/icons.js`. **2026-08-03:** `openAdminBookingDetail()` เพิ่มปุ่ม "ปิด" fallback ใน footer เมื่อ `!canEdit` (booking completed/cancelled) — คู่กับการตัดปุ่ม X ออกจาก `#eventDetailModal` ที่ share กับ `pages/vehicle.js` (ดู `vehicle-modal-detail.html`). [ประวัติ →](INDEX_ui_history.md#pagesvehicle-adminjs) |
| `vehicle/js/vehicle_mileage.js` | admin mileage page (Phase 4.5, 2026-05-15; renamed จาก `pages/mileage-admin.js` ใน prefix migration 2026-06-07) — ES module (`type="module"`); modal 3-state (start/end/complete), realtime cost preview, checkbox summary, export-link sync. Exposes `openMileage()`, `goEditEnd()`, `clearSelection()` ไป `window.*` สำหรับ legacy `onclick=""` ใน template (3 จุด). `window.MLG_FUEL_PRICE` injection คงเดิม. [ประวัติ →](INDEX_ui_history.md#vehiclejsvehicle_mileagejs) |
| `pages/fuel-admin.js` | fuel page (Phase 4.6, 2026-05-15) — ES module (`type="module"`); imports `initIcons`/`bindModalReinit` จาก `core/icons.js`. 5-modal controller (bill/reimb/reserve/price/budget), checkbox→merge, kebab→edit, lucide re-init on shown.bs.modal, `wireFilterBar` (auto-submit GET on select change). ลบ IIFE + DOMContentLoaded guard (module deferred). ไม่มี `onclick=""` → ไม่ต้อง window expose. [ประวัติ →](INDEX_ui_history.md#pagesfuel-adminjs) |
| `pages/maintenance.js` | maintenance page (2026-05-17) — legacy script (ไม่ใช่ ES module เพราะต้องรอ jQuery+DataTable global); DataTable init (langUrl จาก `#pageData[data-dt-lang]`), auto-open form modal เมื่อ `data-edit-mode="true"`, modal:รับงาน/ปิดงาน handlers (populate จาก `data-ticket-*`), delete confirmation, Export Excel. ไม่มี `onclick=""` → ไม่ต้อง window expose. **Redesign (2026-06-16):** `reinitIcons()` (re-render Lucide รายการในหน้า 2+) + `renderGotoPage(table)` (go-to-page control) เรียกทุก DataTable `draw`; เพิ่ม `pageLength: 10`. |
| `pages/repair.js` | repair page (Phase 4.2, 2026-05-15) — ES module (`type="module"`); imports `initIcons`/`bindModalReinit` from `core/icons.js`. ลบ `$(document).ready()` wrapper (module deferred). DataTable init + lucide re-init on draw, modal:รับงาน/ปิดงาน handlers, auto-open edit modal, tooltips, upload zone. jQuery+bootstrap+DataTable ยังใช้ผ่าน global. **Redesign (2026-06-16):** `renderGotoPage(table)` สร้าง go-to-page control (label+select+ปุ่ม "ไป") append เข้า `.dataTables_paginate` แล้ว refresh ทุก draw (DataTables ล้าง innerHTML ทุก redraw → re-attach). |
| `pages/notification.js` | ทุกหน้าที่มี notification panel — โหลดจาก `_header.html` (Phase 4.9, 2026-05-16). ES module (`type="module"`); polling `/api/notifications` ทุก 30 วิ, dropdown panel ( [ประวัติ →](INDEX_ui_history.md#pagesnotificationjs) |
| `pages/ot-admin.js` | vehicle_cost.html (Phase 4.8, 2026-05-16) — ES module (`type="module"`); imports `initIcons` จาก `core/icons.js`. Edit modal slot row builder + recompute, print receipt (single/all), filter auto-submit. Pure data-attr delegation (no `onclick=""`) → ไม่ต้อง window expose. ลบ IIFE + DOMContentLoaded wrapper (module deferred). [ประวัติ →](INDEX_ui_history.md#pagesot-adminjs) |
| `pages/approver-inbox.js` | approver_inbox.html (Phase 4.1, 2026-05-15) — ES module (`type="module"`); functions: `switchTab()`, `showRejectForm(id)`, `hideRejectForm(id)`, chevron rotation. Exposes to `window.*` สำหรับ legacy `onclick=""` ใน template |
| `pages/driver-home.js` *(ไฟล์จริง `vehicle/js/vehicle_driver.js`)* | vehicle_driver.html (Phase 4.4, 2026-05-15) — ES module (`type="module"`); imports `initIcons` จาก `core/icons.js`. Tab switching (`.driver-tabs__btn`), accordion (`[data-card-toggle]`), `actual_start/end` timestamp on submit (`[data-driver-form] [data-actual-now]`), upload zone visual feedback (`[data-upload-input]`). ไม่มี `onclick=""` → ไม่ต้อง window expose. [ประวัติ →](INDEX_ui_history.md#pagesdriver-homejs-ไฟล์จริง-vehiclejsvehicle_driverjs) |
| `pages/budget-admin.js` | budget_manage.html (Phase 4.10, 2026-05-16; Phase 5.8, 2026-05-18) — ES module (`type="module"`); imports `initIcons`/`bindModalReinit` จาก `core/icons.js`. Dropdown action menus (data-attr delegation), 3 modal data-bind wirings (topUp/adjust/refund), refund row picker. **Phase 5.8:** ย้าย `setBudgetModal` `show.bs.modal` handler จาก inline `<script>` ใน template → module (swap datalist central/dept, approver pre-select, retitle+relabel, `approverRow.hidden` toggle, `initIcons(modal)` after innerHTML swap). ลบ IIFE wrapper + local `initLucide` + duplicate lucide CDN จาก template. ไม่มี `onclick=""` → ไม่ต้อง window expose. [ประวัติ →](INDEX_ui_history.md#pagesbudget-adminjs) |
| `pages/room.js` | room.html (2026-05-17) — ES module (`type="module"`); imports `initIcons`/`bindModalReinit` จาก `core/icons.js`. Calendar render (vc-scope grid) + mobile list + 3 modal flow (book/edit/detail) + flatpickr (edit modal). `roomKind(room)` → 'small'/'large' จากชื่อห้อง (เล็ก/ใหญ่). Exposes `openEventDetail`/`openEditBookingModal`/`openBookingModal` + `eventDetailModal` getter ไป `window.*` สำหรับ inline `onclick=""` ใน JS-rendered HTML. Pattern ถอดมาจาก `pages/vehicle.js` (ตัด groups/drivers/vehicles ออก). [ประวัติ →](INDEX_ui_history.md#pagesroomjs) |
| `pages/manage-fleet.js` (ไฟล์จริง `vehicle_fleet.js`) | vehicle_fleet.html (Phase 6.2, 2026-05-17) — plain IIFE (no ES module — uses legacy `defer` script tag + Bootstrap Modal globals). Bind 6 modals on `show.bs.modal` (add/edit vehicle รวม 1 modal, delete vehicle, add/edit driver รวม 1 modal, delete driver, driver detail, vehicle history), fetch `/api/vehicle/{id}/history` (loading/content swap). Refresh Lucide icons on `shown.bs.modal` (catches dynamically inserted icon `<i>`). [ประวัติ →](INDEX_ui_history.md#pagesmanage-fleetjs-ไฟล์จริง-vehicle_fleetjs) |
| `pages/dashboard.js` | dashboard.html (2026-05-17) — ES module (`type="module"`); imports `initIcons`/`bindModalReinit` จาก `core/icons.js`. Live clock (`#liveClock`) — `Intl.DateTimeFormat` th-TH weekday+date + time, refresh 30s. ไม่มี `onclick=""` → ไม่ต้อง window expose. |
| `main.js` | **orphan ตั้งแต่ 2026-06-16** — login.html เลิกใช้ (ย้ายไป `auth/js/login.js`). jQuery IIFE legacy form validation |

**Icon libraries:**
- Font Awesome (`fa-solid` / `fa-regular`) — global default ใช้อยู่ทุกหน้า
- Lucide Icons (line, stroke 1.5px) — โหลด global ใน `_header.html` (CDN unpkg). ใช้: `<i data-lucide="fuel"></i>`. หลัง DOM update เรียก `window.lucide.createIcons()`. ใช้สำหรับ Vercel namespace (Phase 2 fuel page)

---

> Patterns ที่ซ้ำซาก (booking status, telegram, in-app notify, budget mutation) → ดู CLAUDE.md § Gotchas
> Maintenance Protocol → ดู CLAUDE.md
