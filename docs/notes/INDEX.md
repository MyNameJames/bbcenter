# INDEX — จุดเริ่มต้นของ Claude

> **Claude: อ่านไฟล์นี้ก่อนเสมอ** เมื่อต้องหา symbol/route/feature แทนการ glob/grep
> ทุกคอลัมน์ `file:line` คลิกเปิดได้เลย
> **อัปเดตล่าสุด:** 2026-05-18 (**approver-inbox Phase 5.11 mobile redesign**: `vehicle/approver_inbox.html` + `approver_inbox.css` ปรับเป็น mobile-first — `.approver-wrap` 560px center; pending card header เปลี่ยนเป็น `BK-{id:04d}` mono + status badge (department text หาย); body restructure ใหม่เป็น `.ac-fields` 2-col CSS grid (6 fields: ผู้จอง/วันที่/เวลา/ปลายทาง=full-width/วัตถุประสงค์/ผู้โดยสาร) ทุก label มี Lucide icon นำหน้า (user/calendar/clock/map-pin/target/users); Font Awesome → Lucide ทุกจุด (รวม circle-x/circle-check/chevron-down/credit-card/message-square-x); tabs underline → pill style (`.inbox-tabs` gray container + `.inbox-tab.active` white); action buttons เป็น `.ac-action-row` 2-col (approve black solid / reject red outline); reject form ใช้ `.ac-reject-cancel` + `.btn-reject-confirm`; approved/rejected tabs ใช้ pattern เดียวกัน. JS handler names เดิม — `pages/approver-inbox.js` ไม่ต้องแก้) · **budget Phase 5.9 toggle is_active**: เพิ่ม column `vehicle_budget.is_active BOOLEAN NOT NULL DEFAULT 1` (migration `2026-05-18_vehicle-budget-is-active.sql`); `budget_service.py` เพิ่ม `set_active(budget, active)` → log event `set_active`/`set_inactive` (ไม่กระทบ used_amount); `vehicle_view.py` เพิ่ม `_lookup_budget_for_booking()` helper + check is_active ใน `approve_booking` admin+approver path + block `top_up`/`manual_adjust` เมื่อ inactive + POST action `toggle_active` + KPI sum filter active; `budget_manage.html` dropdown item "ปิด/เปิดใช้งานงบนี้" (form POST) + badge "ปิดใช้งาน" + `.vc-bcard--inactive` (opacity+stripe); `budget_manage.css` เพิ่ม `.vc-bcard--inactive` + `.vc-dropdown-item.is-danger` + `.vc-dropdown-divider` + `.vc-dropdown-form`. ไม่ block mileage deduct/refund — booking เก่าปิดทริปได้) · **budget Phase 5.8 Vercel spacing redesign**: `budget_manage.html` — rename `fuel-*` page classes → `budget-*`; ลบ inline `style=""` 18 จุด → semantic classes (`.budget-flash-stack/-kpi-strip/-grid/-grid--last/-empty-block/-filter-month/-refund-scroll/-refund-hint/-empty-icon/-modal-mono/-modal-alert*`, `.vc-bcard-approver`); inline `<script>` setBudgetModal handler → `pages/budget-admin.js`; `display:none` → `hidden`; rename `budget_admin.css` → `budget_manage.css` (โหลดเดี่ยว แทน fuel_admin+budget_admin); section-hdr `:first-of-type` looser top; `title=""` ครบทุกปุ่ม; responsive ≤575px stack) · **vehicle-admin Phase 6.1 UX features**: week strip volume dots (1=sm, 2-3=md 15px, 4+=lg 25px) — `.va-week-day-dot--sm/--md/--lg` + `title="N รายการ"`; assignModal — conflict warning under each select (FN#2, helpers `findConflict()` + `ACTIVE_STATUSES`), driver dropdown workload suffix "• N งานวันนี้" (FN#5, helper `driverDayCount()`); budget bar tone `.va-budget--{ok|warn|danger}` + `<p.va-budget-warn>` (FN#6, <20% amber, <10% red); fix legacy `--ds-success/warning/danger` → `--vc-green/amber/red` in `updateModalBudget()`. New template nodes: `#vehConflictWarn` `#drvConflictWarn` `#modalBudgetWarn`) · maintenance redesign: BBCenter V2 redesign `maintenance/maintenance.html` — vc-scope shell, form → modal, 5-cell KPI (admin), vc-table+DataTable, vc-badge statuses, Lucide icons; สร้าง `maintenance.css` + `pages/maintenance.js`) · Phase 0.5 + 1 + 2 + 3 frontend refactor: ลบ dead `vehicle_calendar.html` + route `/vehicle/calendar` · fix typo `--vc-bg-card` → `--vc-bg` · ลบ duplicate `design-system.css` load · **Phase 1**: แยก tokens ออกเป็น `app/static/css/tokens.css`, เพิ่ม `--vc-accent` Indigo · **Phase 2**: สร้าง `app/static/css/components/*.css` 8 ไฟล์ + `app/templates/_components/*.html` 7 macros; ย้าย KPI+filter จาก fuel_admin.css/budget_admin.css ไป components/ · **Phase 3.1 (fuel-admin)**: align macros + component CSS ให้ตรงกับ skill `bbcenter-design` (flat vocab `vc-badge-warning`, `vc-empty-title`, lucide icons), ลบ duplicate badge+empty จาก `fuel_admin.css`, migrate `admin_fuel.html` empty states → macro, update `/bbcenter-design` SKILL.md เพิ่ม §2.0 macro shorthand · **Phase 3.2 (vehicle-admin)**: ลบ `.bl-badge`/`.badge-pending`/`.badge-approver`/`.badge-approved`/`.badge-rejected`/`.badge-cancel`/`.badge-group`/`.bl-empty` จาก `vehicle_admin.css` (6 HEX violations + page-specific empty), update `vehicle_admin.js` STATUS_BADGE map + 4 innerHTML spots → `vc-badge-warning|blue|success|danger|neutral|solid` + `vc-empty` + `vc-empty-icon/-title` + lucide; re-add `vc-badge-solid` ใน `components/badge.css` สำหรับ "งานรวม" emphasis · **Phase 3.3 (mileage-admin)**: stripped `mileage_admin.css` 1095 → ~35 lines (ลบ ~30 dead `.mlg-kpi*/-btn*/-panel*/-breakdown*/-month*/-filter*/-table*/-empty*/-summary` blocks + duplicate `ds-alert*` + modal/state styling ที่ template inlines แล้ว); fix `mileage_admin.html` inline HEX `#DC2626`→`var(--vc-red)` ×3 + `var(--ds-accent)`→`var(--vc-fg)` ×1 · **Phase 3.4 (repair)**: migrate empty state → `empty_state` macro (`{% call %}`); เปลี่ยน `repair.css` `--ds-*` ทั้งหมด → `--vc-*` + HEX icon bg/border → `--vc-amber/blue/green-bg/border` · **Phase 3.5 (driver)**: 2 empty states → macro; ลบ inline `style=""` ทั้งหมด → `.driver-flash-alert/-plate/-unset`; ลบ dead `§1/.driver-page/.driver-container` + `§11/.driver-empty*` + `§13` icon overrides; `#D4D4D4` → `var(--vc-border-hover)` · **Phase 3.6 (vehicle user-facing)**: `STATUS_BADGE` map → `vc-badge-dot`; ลบ `.badge-approved/.badge-pending/.badge-approver` CSS; `vehicle-modal-book.html` info card `badge-pending` → `.bk-info-note`; `--ds-border`/`#111827` → `--vc-*` ใน bk-modal · **Phase 3.7 (ot/vehicle_cost)**: `--ds-text-2xl/sm` → `--vc-text-*`; HEX print section → `var(--vc-fg/fg-muted/fg-subtle/border)`; เพิ่ม `.cost-action-group`; ลบ inline `style=""` 4 จุดใน template · **Phase 3.8 (approver-inbox)**: ลบ inline `<style>` 197 lines + `<script>` → `approver_inbox.css` + `approver_inbox.js`; badge-waiting/approved/rejected → `vc-badge-dot`; 3 empty states → `vc-empty`; ลบ inline `style=""` ทั้งหมด · **Phase 4.0 (core JS)**: สร้าง `app/static/js/core/{icons,format,http}.js` เป็น ES modules — foundation สำหรับ feature module migration (Phase 4.1+). ยังไม่สร้าง `modal/toast/form` (รอ feature ต้องการ) · **Phase 4.1 pilot (approver-inbox)**: `approver_inbox.js` → `pages/approver-inbox.js` ES module; template `<script type="module">`; window expose สำหรับ legacy `onclick=""` · **Phase 4.1.5 (sidebar extract)**: ย้าย `.sidebar/.sb-*` (+ ลบ legacy `.menu-item/.brand-logo/.sidebar-menu`) จาก `vehicle.css` → `components/sidebar.css` + เพิ่มเข้า `design-system.css` @import → approver_inbox sidebar กลับมาทำงาน (และทุก page ได้ฟรี); vehicle.css 618 → 460 lines · **Phase 4.2 (repair)**: `repair.js` → `pages/repair.js` ES module; imports `initIcons`/`bindModalReinit` จาก `core/icons.js`; ลบ `$(document).ready()` wrapper · **Phase 4.3 (vehicle-admin)**: `vehicle_admin.js` (1141 lines) → `pages/vehicle-admin.js` ES module; imports `initIcons` จาก `core/icons.js`; `lucide.createIcons()` → `initIcons()` (3 จุด); expose 20+ funcs ไป `window.*` สำหรับ legacy `onclick` ใน template + JS-rendered HTML strings · **Phase 4.4 (driver-home)**: extract inline `<script>` (67 lines) → `pages/driver-home.js` ES module; ลบ duplicate lucide CDN (มาจาก `_header.html` แล้ว); ไม่มี `onclick=""` → ไม่ต้อง window expose · **Phase 4.5 (mileage-admin)**: `mileage_admin.js` (279 lines) → `pages/mileage-admin.js` ES module; ลบ IIFE wrapper; expose `openMileage/goEditEnd/clearSelection` ผ่าน `Object.assign(window, …)` · **Phase 4.6 (fuel-admin)**: `fuel_admin.js` (424 lines) → `pages/fuel-admin.js` ES module; enhance `core/icons.js` `initIcons(scope?)` + `bindModalReinit` ส่ง `e.target` เป็น scope; ลบ IIFE + local `initIcons` + DOMContentLoaded guard; ไม่มี `onclick=""` → ไม่ต้อง window expose · **Phase 4.7 (vehicle)**: `vehicle.js` (790 lines) → `pages/vehicle.js` ES module; expose `openEventDetail`/`openEditBookingModal`/`openMoreEvents`/`openBookingModal` + modal instances (`eventDetailModal`/`moreEventsModal`) ผ่าน `Object.defineProperty` getter; ย้าย `?pay=<id>` deep-link IIFE จาก `vehicle.html` เข้า module (ลบ retry loop — in-module ไม่ต้อง `typeof` check); ลบ DOMContentLoaded wrapper · **Phase 4.8 (ot-admin)**: `ot_admin.js` (213 lines) → `pages/ot-admin.js` ES module; imports `initIcons` จาก `core/icons.js`; ลบ IIFE + DOMContentLoaded wrapper; pure data-attr delegation → ไม่ต้อง window expose · **Phase 4.9 (notification)**: `notification.js` (453 lines) → `pages/notification.js` ES module; โหลดจาก `_header.html` → ทุกหน้า; ลบ IIFE + `window.__notifInit` guard (module เรียกครั้งเดียว); Font Awesome icons → ไม่ใช้ `core/icons.js`; ไม่มี `onclick=""` → ไม่ต้อง window expose · **Phase 4.10 (budget-admin)**: `budget_admin.js` (98 lines) → `pages/budget-admin.js` ES module; imports `initIcons`/`bindModalReinit` จาก `core/icons.js`; ลบ IIFE + local `initLucide` + duplicate lucide CDN; ไม่มี `onclick=""` → ไม่ต้อง window expose. `main.js` (login เท่านั้น) **kept legacy** — jQuery IIFE, isolated page → Phase 4.x migration complete; `app/static/js/` ตอนนี้แค่ `core/` + `pages/` + `main.js` (legacy) · **Phase 5.5 (lucide self-host + API fix, 2026-05-16)**: (1) download `lucide@1.16.0` UMD → `app/static/vendor/lucide/lucide.min.js` (392KB); `_header.html` script src CDN → local + ลบ `defer`. (2) **lucide v1.x breaking API**: `createIcons()` ต้องส่ง `{ icons }` (ไม่ auto-include เหมือน v0.x) → update `core/icons.js` `initIcons()` ส่ง `{ icons: l.icons \|\| l }` + inline DOMContentLoaded listener ใน `_header.html`. (3) Bug fix `pages/vehicle-admin.js`: `renderBefore()` 9 callers (toggleBeforeExpand/setFilter/groupMode/notifyMode toggles) populate innerHTML แต่ไม่ตามด้วย `initIcons()` → เพิ่ม `initIcons()` end of `renderBefore()` (อาการ: collapsed บน initial load → user คลิก expand → icon ค้าง `<i>`) · **Phase 5.1 (token retirement, 2026-05-16)**: `--ds-*` Part A ลบออกจาก `tokens.css` ครบแล้ว; migrate `var(--ds-*)` → `var(--vc-*)` ใน CSS 3 ไฟล์ (design-system/notification/vehicle) + templates 4 ไฟล์; เพิ่ม `--vc-z-*`/`--vc-sidebar-width`/`--vc-header-height` ใน Part B; lint rule ใน tokens.css header; CLAUDE.md updated · **Phase 5.2**: CSS coupling audit — clean (ไม่มี cross-page dependency); design-system.css @import chain ถูกต้อง · **Phase 5.3** (inline `style=""` cleanup): defer → future_features.md (112 จุดใน mileage_admin.html เป็น dynamic Jinja values) · **Phase 5.4 polish (vehicle-admin, 2026-05-16)**: icon FOUC fix (`[data-lucide]:not(svg)` reserve 14×14), week navigator redesign (กรอบ+padding+responsive ≤575px), booking row 2-line → **spacious card** (ลบ `.bl-row-top/.bl-meta-dest/.bl-dot/.bl-actions` → เพิ่ม `.bl-body/.bl-row-head/.bl-meta-chip/.bl-row-assigned/.bl-row-actions` + แสดง vehicle/driver row เมื่อ approved), `.va-list` flex+gap, HEX cleanup 13 จุด → tokens (`--vc-{red\|green\|blue\|amber}-{bg\|border}`) → **zero HEX** ใน vehicle_admin.css. `renderSingleRow()` rewritten + `bl-actions` → `bl-row-actions` ใน group row · **vehicle user-facing Phase 1 (2026-05-17)**: เริ่ม redesign `vehicle/vehicle.html` ไป BBCenter V2 — viewport `maximum-scale=1.0`; ลบ DataTables CSS + IBM Plex Sans Thai; CSS link เพิ่ม `design-system.css` + `vehicle_admin.css`; `<main>` ใส่ `vc-scope`; flash `alert` → `ds-alert` ใน `vc-stack`; toolbar 3 ปุ่ม → `vc-btn vc-btn-ghost vc-btn-icon` + Lucide chevron-left/right + `vc-btn-secondary` "วันนี้"; calendar wrapper `card h-100` → `vc-card`; mobile "จองรถ" → `vc-btn-primary` + Lucide plus · **vehicle user-facing Phase 2 (2026-05-17)**: redesign 4 modals — `book/edit/detail/more-events` — `bi-*`/`fa-*` icons → Lucide; footer buttons → `vc-btn vc-btn-secondary/primary` + `title=""`; ลบ `shadow` + inline `border-radius:14px` ใน more-events; ลบ inline style 9 จุดใน detail → 8 classes (`bk-detail-header-dot/title/date/divider/info/row/icon/text/section-label`); เพิ่ม `bk-modal-dialog-sm` + `bk-duration-preview` ใน `vehicle.css`; `initFlatpickr()` เพิ่ม `updateDuration()` closure (compute end−start → "ระยะเวลา X ชม. Y นาที", bind change ทั้ง bkStart/bkEnd). **vehicle user-facing Phase 3 (2026-05-17)**: ds-status-dot refactor — `.ds-status-dot*` (5 variants) → `.vc-status-dot*` ใน `design-system.css` §7 + hex literals 5 ชุด → tokens (`--vc-{amber|blue|green|red|purple}-bg` + foreground); เพิ่ม `--vc-purple-bg`/`--vc-purple-border` ใน tokens.css (สำหรับ group dot). `pages/vehicle.js` STATUS_ICON FA strings → Lucide names (clock/send/circle-check/circle-x); 5 จุดที่ใช้ class swap → `vc-status-dot` + `<i data-lucide="..." class="vc-icon-sm">` (group→users, single→${iconName}, detail header→${headerIconName} via `outerHTML` swap, members→user); `import { initIcons, bindModalReinit }` จาก `core/icons.js` + เรียก `bindModalReinit()` (detail modal re-init on show) + `initIcons(content)` ปลาย `updateMobileList`. `vehicle-modal-detail.html` initial header dot → vc-status-dot + Lucide circle-check. **vehicle user-facing Phase 4 (2026-05-17)**: cleanup + UX polish เสร็จ — (a) `var(--ds-text-heading|text-muted|border)` 14 จุดใน `pages/vehicle.js` HTML strings → `var(--vc-fg|fg-muted|border)` (Phase 5.1 violation cleared); HEX `#f3f4f6`/`#2563EB` → tokens; `EVENT_CARD_STYLE` 5 statuses × 3 HEX → tokens (`--vc-{amber|blue|green|red}-{bg|border}` + `--vc-bg-subtle/--vc-border/--vc-fg-muted` สำหรับ completed). (b) FA/BI icons ทั้งฉบับ → Lucide (~17 จุด: empty state calendar-x, group card truck/user/clock/pencil/chevron-down/arrow-up-right, single card user/clock/map-pin/pencil, openMoreEvents user, members list users/arrow-right/map-pin, footer actions pencil/trash-2, popover users); inline-style buttons → `vc-btn vc-btn-ghost vc-btn-icon vc-btn-sm` หรือ `vc-btn-secondary/danger` + `title=""`; "งานรวม" HEX badge → `vc-badge vc-badge-blue`. (c) **UX polish**: เพิ่ม keydown listener (← → เปลี่ยนเดือน, T = วันนี้; skip ถ้า focus input/modal); เพิ่ม `shown.bs.popover` listener → `initIcons` ทุก `.popover` (เพราะ popover async ไม่ใช่ modal); `createCell` เพิ่ม `role="gridcell"` + `aria-label="{day} {th-month} {buddhist-year}"` + `aria-current="date"` ถ้า today. (d) `vehicle.html` calendar grid: `role="grid"` + `aria-label` (อธิบาย shortcut) + header row `role="row"` + cells `role="columnheader" aria-label="{full day name}"` + body `role="rowgroup"`

---

## 🗺️ Navigation — ถามอะไร ไปที่ไหน

| ถาม | ไปที่ |
|-----|------|
| Schema ตอนนี้ + ประวัติ DB | [database/schema.md](database/schema.md) (Part 1=ปัจจุบัน, Part 2=history+เหตุผล) |
| Route / Function / Template / CSS class | Section ด้านล่างในไฟล์นี้ |
| System flow / architecture | [architecture.md](architecture.md) |
| งานที่ทำแล้ว / กำลังทำ | [doc/](doc/) · [log/](log/) |
| Feature backlog | [future_features.md](future_features.md) |
| Migration .sql ทั้งหมด | [app/migrations/migrations-index.md](../../app/migrations/migrations-index.md) |

---

## 📁 File Map (Top-level)

```
app/
  app.py · models.py · ad_utils.py
  instance/portal.db        SQLite (gitignored)
  migrations/*.sql          manual migrations + migrations-index.md
  views/                    8 blueprints (auth/repair/maintenance/vehicle/room/fuel)
  services/budget_service.py
  templates/                Jinja2 — see § Templates
  static/css|js|images/icons|uploads/{repair,maintenance,mileage}|vendor/{bootstrap,fontawesome,...}
docs/notes/
  INDEX.md (ไฟล์นี้) · architecture.md · design_system.md · task-lifecycle.md · future_features.md
  database/schema.md        ← Part 1 ปัจจุบัน + Part 2 history
  doc/ (completed) · log/ (in-progress) · skills/
```

---

## 🚀 Blueprints

| Blueprint | File | URL prefix | จำนวน route |
|-----------|------|------------|-------------|
| `auth_bp` | [app/views/auth_view.py](../../app/views/auth_view.py) | `/` | 6 |
| `repair_bp` | [app/views/repair_view.py](../../app/views/repair_view.py) | `/repair` | 4 |
| `maintenance_bp` | [app/views/maintenance_view.py](../../app/views/maintenance_view.py) | `/maintenance` | 5 |
| `vehicle_bp` | [app/views/vehicle_view.py](../../app/views/vehicle_view.py) | `/vehicle`, `/api` | ~24 |
| `adminfleet_bp` | [app/views/vehicle_view.py](../../app/views/vehicle_view.py) | `/admin/*` | 8 |
| `admincost_bp` | [app/views/vehicle_view.py](../../app/views/vehicle_view.py) | `/admin/cost`, `/vehicle/mileage/override-fuel` | 3 |
| `driver_bp` | [app/views/vehicle_view.py](../../app/views/vehicle_view.py) | `/driver` | 2 |
| `room_bp` | [app/views/room_view.py](../../app/views/room_view.py) | `/room`, `/api/room` | 5 |
| `fuel_bp` | [app/views/fuel_view.py](../../app/views/fuel_view.py) | `/admin/fuel`, `/admin/fuel/export`, `/api/fuel` | 14 |

---

## 🛣️ Routes (all paths)

### auth
| Method | Path | File:Line | Function |
|--------|------|-----------|----------|
| GET/POST | `/login` | [auth_view.py:12](../../app/views/auth_view.py#L12) | `login()` |
| GET | `/dev/login/<username>` | [auth_view.py:58](../../app/views/auth_view.py#L58) | `dev_login()` — **dev bypass** |
| GET | `/logout` | [auth_view.py:74](../../app/views/auth_view.py#L74) | `logout()` |
| GET | `/dashboard` | [auth_view.py:81](../../app/views/auth_view.py#L81) | `dashboard()` |
| GET | `/manage_users` | [auth_view.py:195](../../app/views/auth_view.py#L195) | `manage_users()` — superadmin |
| POST | `/update_user/<id>` | [auth_view.py:206](../../app/views/auth_view.py#L206) | `update_user()` — superadmin |

### repair
| Method | Path | File:Line |
|--------|------|-----------|
| GET/POST | `/repair` | [repair_view.py:45](../../app/views/repair_view.py#L45) |
| GET/POST | `/repair/edit/<id>` | [repair_view.py:86](../../app/views/repair_view.py#L86) |
| POST | `/repair/delete/<id>` | [repair_view.py:112](../../app/views/repair_view.py#L112) |
| POST | `/repair/update_status/<id>` | [repair_view.py:128](../../app/views/repair_view.py#L128) |

### maintenance
| Method | Path | File:Line |
|--------|------|-----------|
| GET/POST | `/maintenance` | [maintenance_view.py:59](../../app/views/maintenance_view.py#L59) |
| GET/POST | `/maintenance/edit/<id>` | [maintenance_view.py:92](../../app/views/maintenance_view.py#L92) |
| POST | `/maintenance/delete/<id>` | [maintenance_view.py:118](../../app/views/maintenance_view.py#L118) |
| POST | `/maintenance/update_status/<id>` | [maintenance_view.py:134](../../app/views/maintenance_view.py#L134) |
| GET | `/maintenance/export_excel` | [maintenance_view.py:204](../../app/views/maintenance_view.py#L204) |

### vehicle (user)
| Method | Path | File:Line |
|--------|------|-----------|
| GET | `/vehicle` | [vehicle_view.py:63](../../app/views/vehicle_view.py#L63) |
| POST | `/vehicle/book` | [vehicle_view.py:81](../../app/views/vehicle_view.py#L81) |
| GET/POST | `/vehicle/edit/<id>` | [vehicle_view.py:136](../../app/views/vehicle_view.py#L136) |
| POST | `/vehicle/delete/<id>` | [vehicle_view.py:175](../../app/views/vehicle_view.py#L175) |
| GET | `/vehicle/detail/<id>` | [vehicle_view.py:210](../../app/views/vehicle_view.py#L210) |
| GET | `/api/vehicle/bookings` | [vehicle_view.py:233](../../app/views/vehicle_view.py#L233) |
| GET | `/api/custom-bookings` | [vehicle_view.py:255](../../app/views/vehicle_view.py#L255) |
| POST | `/vehicle/approve/<id>` | [vehicle_view.py:282](../../app/views/vehicle_view.py#L282) |
| GET | `/vehicle/history` | [vehicle_view.py:521](../../app/views/vehicle_view.py#L521) |
| GET | `/vehicle/approver` | [vehicle_view.py:239](../../app/views/vehicle_view.py#L239) — approver inbox รายการรอแผนกตัวเอง + budget เดือนปัจจุบัน |

### vehicle (admin — shared `/vehicle/admin/*`)
| Method | Path | File:Line |
|--------|------|-----------|
| GET | `/vehicle/admin` | [vehicle_view.py:619](../../app/views/vehicle_view.py#L619) |
| POST | `/vehicle/admin/booking/<id>/notify` | [vehicle_view.py:681](../../app/views/vehicle_view.py#L681) |
| POST | `/vehicle/admin/booking/<id>/revert` | [vehicle_view.py:695](../../app/views/vehicle_view.py#L695) |
| POST | `/vehicle/admin/vehicle/<id>/repair` | [vehicle_view.py:709](../../app/views/vehicle_view.py#L709) |
| POST | `/vehicle/admin/vehicle/<id>/fix-done` | [vehicle_view.py:722](../../app/views/vehicle_view.py#L722) |
| POST | `/vehicle/admin/booking/<id>/swap` | [vehicle_view.py:738](../../app/views/vehicle_view.py#L738) |
| POST | `/vehicle/admin/merge` | [vehicle_view.py:757](../../app/views/vehicle_view.py#L757) |
| POST | `/vehicle/admin/assign/<id>` | [vehicle_view.py:832](../../app/views/vehicle_view.py#L832) |
| GET/POST | `/vehicle/mileage` | [vehicle_view.py:1063](../../app/views/vehicle_view.py#L1063) |
| GET | `/vehicle/mileage/export` | [vehicle_view.py:1430](../../app/views/vehicle_view.py#L1430) — Excel export ตาม filter |
| GET | `/api/admin/bookings` | [vehicle_view.py:1841](../../app/views/vehicle_view.py#L1841) |
| POST | `/api/check-merge` | [vehicle_view.py:1719](../../app/views/vehicle_view.py#L1719) |

### adminfleet (`/admin/manage-fleet`, `/admin/budget`)
| Method | Path | File:Line |
|--------|------|-----------|
| GET/POST | `/admin/manage-fleet` | [vehicle_view.py:613](../../app/views/vehicle_view.py#L613) |
| POST | `/admin/manage-fleet/service` | [vehicle_view.py:2114](../../app/views/vehicle_view.py#L2114) |
| GET | `/api/vehicle/<vid>/history` | [vehicle_view.py:1552](../../app/views/vehicle_view.py#L1552) |
| GET/POST | `/admin/budget` | [vehicle_view.py:1278](../../app/views/vehicle_view.py#L1278) |
| GET | `/admin/budget/personal` | [vehicle_view.py:1435](../../app/views/vehicle_view.py#L1435) |
| POST | `/admin/budget/personal/mark_paid` | [vehicle_view.py:1505](../../app/views/vehicle_view.py#L1505) |
| POST | `/admin/budget/personal/mark_unpaid` | [vehicle_view.py:1532](../../app/views/vehicle_view.py#L1532) |

### admincost
| Method | Path | File:Line |
|--------|------|-----------|
| POST | `/vehicle/mileage/override-fuel` | [vehicle_view.py:1632](../../app/views/vehicle_view.py#L1632) |
| GET/POST | `/admin/cost` | [vehicle_view.py:1552](../../app/views/vehicle_view.py#L1552) |
| GET | `/admin/cost/export` | [vehicle_view.py:2178](../../app/views/vehicle_view.py#L2178) |

### driver
| Method | Path | File:Line |
|--------|------|-----------|
| GET | `/driver` | [vehicle_view.py:1139](../../app/views/vehicle_view.py#L1139) |
| POST | `/driver/mileage` | [vehicle_view.py:1165](../../app/views/vehicle_view.py#L1165) |

### room
| Method | Path | File:Line |
|--------|------|-----------|
| GET | `/room` | [room_view.py:16](../../app/views/room_view.py#L16) |
| POST | `/room/book` | [room_view.py:23](../../app/views/room_view.py#L23) |
| POST | `/room/edit/<id>` | [room_view.py:58](../../app/views/room_view.py#L58) |
| POST | `/room/delete/<id>` | [room_view.py:96](../../app/views/room_view.py#L96) |
| GET | `/api/room/bookings` | [room_view.py:111](../../app/views/room_view.py#L111) |

### fuel (vehicle admin only)
| Method | Path | File:Line | Function |
|--------|------|-----------|----------|
| GET | `/admin/fuel` | [fuel_view.py:112](../../app/views/fuel_view.py#L112) | `admin_fuel()` — KPI + bills + reimbursements + pivot |
| POST | `/admin/fuel/bill` | [fuel_view.py:238](../../app/views/fuel_view.py#L238) | `create_bill()` |
| POST | `/admin/fuel/bill/<id>/edit` | [fuel_view.py:270](../../app/views/fuel_view.py#L270) | `edit_bill()` |
| POST | `/admin/fuel/bill/<id>/delete` | [fuel_view.py:291](../../app/views/fuel_view.py#L291) | `delete_bill()` |
| POST | `/admin/fuel/reimbursement` | [fuel_view.py:305](../../app/views/fuel_view.py#L305) | `create_reimbursement()` — รวมบิลที่เลือก |
| POST | `/admin/fuel/reimbursement/<id>/edit` | [fuel_view.py:341](../../app/views/fuel_view.py#L341) | `edit_reimbursement()` |
| POST | `/admin/fuel/reimbursement/<id>/receive` | [fuel_view.py:356](../../app/views/fuel_view.py#L356) | `receive_reimbursement()` — mark ได้เงิน |
| POST | `/admin/fuel/reimbursement/<id>/delete` | [fuel_view.py:367](../../app/views/fuel_view.py#L367) | `delete_reimbursement()` — detach bills back to รอเบิก |
| POST | `/admin/fuel/reserve` | [fuel_view.py:383](../../app/views/fuel_view.py#L383) | `adjust_reserve()` — +/- with required note |
| POST | `/admin/fuel/price` | [fuel_view.py:418](../../app/views/fuel_view.py#L418) | `add_price()` — effective-dated upsert |
| POST | `/admin/fuel/price/<id>/delete` | [fuel_view.py:448](../../app/views/fuel_view.py#L448) | `delete_price()` |
| POST | `/admin/fuel/annual-budget` | [fuel_view.py:462](../../app/views/fuel_view.py#L462) | `set_annual_budget()` — SystemConfig['fuel_annual_budget'] |
| GET | `/api/fuel/bill-by-mileage` | [fuel_view.py:478](../../app/views/fuel_view.py#L478) | `api_bill_by_mileage()` — phase 3 mileage badge lookup |
| GET | `/admin/fuel/export/excel` | [fuel_view.py:499](../../app/views/fuel_view.py#L499) | `export_excel()` — 3 sheets (บิล/ใบเบิก/Pivot) honoring filters |

### notification API (in vehicle_bp)
| Method | Path | File:Line |
|--------|------|-----------|
| GET | `/api/notifications` | [vehicle_view.py:350](../../app/views/vehicle_view.py#L350) |
| POST | `/api/notifications/read-all` | [vehicle_view.py:449](../../app/views/vehicle_view.py#L449) |
| POST | `/api/notifications/<id>/read` | [vehicle_view.py:458](../../app/views/vehicle_view.py#L458) |
| POST | `/api/payment/report/<mileage_id>` | [vehicle_view.py:474](../../app/views/vehicle_view.py#L474) |
| POST | `/api/payment/report-by-booking/<id>` | [vehicle_view.py:495](../../app/views/vehicle_view.py#L495) |

---

## 🔧 Key Functions (non-route)

### Permission helpers
| Function | File:Line |
|----------|-----------|
| `is_vehicle_admin()` | [vehicle_view.py:56](../../app/views/vehicle_view.py#L56) |
| `is_repair_admin()` | [repair_view.py:14](../../app/views/repair_view.py#L14) |
| `is_maintenance_admin()` | [maintenance_view.py:14](../../app/views/maintenance_view.py#L14) |

### Business logic
| Function | File:Line | หน้าที่ |
|----------|-----------|---------|
| `book_vehicle_simple()` | [vehicle_view.py:83](../../app/views/vehicle_view.py#L83) | สร้าง booking + validate ห้ามข้ามวัน |
| `approve_booking()` | [vehicle_view.py:380](../../app/views/vehicle_view.py#L380) | approve/reject + status flow + reject_reason. **2026-05-18:** check `is_active` ก่อน approve (ทั้ง admin + approver path) — ถ้า budget inactive → flash danger + return; ใช้ helper `_lookup_budget_for_booking()` |
| `_lookup_budget_for_booking()` | [vehicle_view.py:341](../../app/views/vehicle_view.py#L341) | helper หา `VehicleBudget` row ของ booking (start_datetime year/month + budget_type_id + department_id); คืน `(budget, key_label)` |
| `approver_inbox()` | [vehicle_view.py:241](../../app/views/vehicle_view.py#L241) | approver ดูรายการรอแผนกตัวเอง + ประวัติ + VehicleBudget เดือนปัจจุบัน (ctx: pending, history, budgets) |
| `inject_approver_pending_count()` | [app.py](../../app/app.py) | context processor — badge จำนวน waiting_approver สำหรับ approver |
| `admin_assign()` | [vehicle_view.py:832](../../app/views/vehicle_view.py#L832) | assign รถ+คนขับ + snap_* |
| `mileage_log()` | [vehicle_view.py:1063](../../app/views/vehicle_view.py#L1063) | admin บันทึกไมล์ + หักงบผ่าน BudgetService + dashboard KPI/breakdown/filter; default filter = เดือนปัจจุบัน (show_all=1 เพื่อดูทั้งหมด). **Phase 5.8 (2026-05-17)**: filter เพิ่ม `budget_type` + `budget_sub` (chained dependent dropdown, pattern เดียวกับ `updateExpSubDropdown` ใน vehicle-admin.js — JS rebuild `<option>` ด้วย `innerHTML` จาก `window.EXPENSE_CATS` (= `budget_subs` ที่ route extract เฉพาะค่าที่ปรากฎจริงใน rows ที่ filter แล้ว — ไม่ใช่ static `EXPENSE_CATEGORIES` ทั้งหมด) เมื่อ type เปลี่ยน) + `booker_q` (User.full_name/username ilike + `<datalist>`); render_template ส่ง `bookers_all`/`budget_subs` เพิ่ม. **Phase 5.7 (2026-05-17)**: enrich rows ด้วย `budget_type/budget_label/budget_sub` (จาก `expense_type`/`central_category`/`trip_department`) + `has_refuel` (FuelBill range match: `vehicle_id` + `odo_start ≤ mileage ≤ odo_end`); group rows ที่ `trip_group` เดียวกัน → `display_rows` (representative=row แรก) → ส่ง template เพิ่ม; ลบ `refuel_keys` set lookup เดิม |
| `mileage_export()` | [vehicle_view.py:1332](../../app/views/vehicle_view.py#L1332) | Export Excel ตาม filter ปัจจุบัน |
| `driver_mileage()` | [vehicle_view.py:1165](../../app/views/vehicle_view.py#L1165) | คนขับบันทึกไมล์ + หักงบผ่าน BudgetService |
| `override_fuel()` | [vehicle_view.py:1531](../../app/views/vehicle_view.py#L1531) | admin override `mileage.fuel_cost` + auto refund/rededuct ผ่าน BudgetService |
| `budget_manage()` | [vehicle_view.py:2106](../../app/views/vehicle_view.py#L2106) | ตั้ง/แก้เพดานงบ — log ผ่าน `BudgetService`; POST actions: `set_budget` / `top_up` / `manual_adjust` / `refund_booking` / **`toggle_active`** (2026-05-18). `top_up` + `manual_adjust` block ถ้า budget inactive. KPI sum filter `is_active=True`. |
| `BudgetService` | [services/budget_service.py](../../app/services/budget_service.py) | API กลาง: deduct/refund/rededuct/set_budget_amount/manual_adjust + **set_active** (2026-05-18, log event `set_active`/`set_inactive`) + verify_cache_integrity |
| `calc_ot()` | [vehicle_view.py:1023](../../app/views/vehicle_view.py#L1023) | คำนวณ OT |
| `get_bkk_time()` | [models.py:8](../../app/models.py#L8) | Thai time (UTC+7) |

### Notification
| Function | File:Line | หน้าที่ |
|----------|-----------|---------|
| `_create()` | [notification_service.py:44](../../app/views/notification_service.py#L44) | สร้าง in-app notif |
| `notify_booking_created()` | [notification_service.py:86](../../app/views/notification_service.py#L86) | user สร้าง booking |
| `notify_admin_assigned()` | [notification_service.py:99](../../app/views/notification_service.py#L99) | admin assign รถ |
| `notify_admin_approved()` | [notification_service.py:116](../../app/views/notification_service.py#L116) | admin approve |
| `notify_forwarded_to_approver()` | [notification_service.py:131](../../app/views/notification_service.py#L131) | ส่งต่อ approver แผนก |
| `notify_approver_approved()` | [notification_service.py:144](../../app/views/notification_service.py#L144) | approver แผนก approve |
| `notify_rejected()` | [notification_service.py:159](../../app/views/notification_service.py#L159) | reject |
| `notify_merged_into_group()` | [notification_service.py:173](../../app/views/notification_service.py#L173) | รวม trip |
| `notify_mileage_started/ended()` | [notification_service.py:186,199](../../app/views/notification_service.py#L186) | บันทึกไมล์ |
| `notify_budget_deducted()` | [notification_service.py:213](../../app/views/notification_service.py#L213) | หักงบสำเร็จ |
| `notify_payment_required()` | [notification_service.py:232](../../app/views/notification_service.py#L232) | personal ต้องชำระ |
| `notify_payment_reminder_user()` | [notification_service.py:248](../../app/views/notification_service.py#L248) | เตือนชำระ (cron) |
| `notify_payment_overdue_admin()` | [notification_service.py:264](../../app/views/notification_service.py#L264) | เตือน admin (cron) |
| `notify_payment_confirmed()` | [notification_service.py:310](../../app/views/notification_service.py#L310) | admin ยืนยันรับเงิน |
| `check_payment_escalation()` | [notification_cron.py:28](../../app/views/notification_cron.py#L28) | cron job |

### Frontend JS
| Function | File:Line | หน้าที่ |
|----------|-----------|---------|
| `openEventDetail()` | [pages/vehicle.js](../../app/static/js/pages/vehicle.js) | เปิด detail modal (single หรือ group อัตโนมัติ) |

### Telegram
| Function | File:Line |
|----------|-----------|
| `_send()` | [telegram_service.py:19](../../app/views/telegram_service.py#L19) |
| `delete_old_message()` | [telegram_service.py:35](../../app/views/telegram_service.py#L35) |
| `notify_approved()` | [telegram_service.py:92](../../app/views/telegram_service.py#L92) |
| `notify_forwarded_to_approver()` | [telegram_service.py:112](../../app/views/telegram_service.py#L112) |
| `notify_approver_approved()` | [telegram_service.py:131](../../app/views/telegram_service.py#L131) |
| `notify_rejected()` | [telegram_service.py:150](../../app/views/telegram_service.py#L150) |

---

## 🧱 Database Models

**27 tables total** — รายละเอียดเต็ม: [database/schema-current.md](database/schema-current.md)

| Model | Line | หมายเหตุ |
|-------|------|---------|
| `BudgetType` | [models.py:14](../../app/models.py#L14) | lookup: central/department |
| `ExpenseType` | [models.py:25](../../app/models.py#L25) | lookup: central/department/personal |
| `VehicleDepartment` | [models.py:36](../../app/models.py#L36) | แผนก + budget_type |
| `User` | [models.py:49](../../app/models.py#L49) | 4 role fields + is_superadmin |
| `RepairTicket` | [models.py:77](../../app/models.py#L77) | |
| `MaintenanceTicket` | [models.py:105](../../app/models.py#L105) | |
| `Vehicle` | [models.py:134](../../app/models.py#L134) | fuel_rate, next_service_*, tax_due_date |
| `Driver` | [models.py:154](../../app/models.py#L154) | link to User |
| `VehicleBooking` | [models.py:167](../../app/models.py#L167) | ⭐ หัวใจหลัก — snap_* fields |
| `RoomBooking` | [models.py:215](../../app/models.py#L215) | |
| `VehicleMileage` | [models.py:230](../../app/models.py#L230) | + payment tracking (2026-04-23) |
| `SystemConfig` | [models.py:269](../../app/models.py#L269) | key-value, มี `.get()`/`.set()` |
| `VehicleBudget` | [models.py:297](../../app/models.py#L297) | unique(type, dept, year, month) + `is_active` toggle (2026-05-18) |
| `Notification` | [models.py:332](../../app/models.py#L332) | + category/action_url/sticky (2026-04-23) |
| `TripPassenger` | [models.py:357](../../app/models.py#L357) | CASCADE delete |
| `VehicleServiceLog` | [models.py:382](../../app/models.py#L382) | sync → vehicle.next_service_* |
| `DeptApprover` | [models.py:410](../../app/models.py#L410) | junction: User many-to-many VehicleDepartment (approver) |
| `TripExpenseItem` | [models.py:424](../../app/models.py#L424) | toll/parking/food/other |
| `OTRateConfig` | [models.py:447](../../app/models.py#L447) | อัตรา OT แต่ละ time band + seed 4 rows + `day_of_week` per-weekday override (NULL=ทุกวัน, v2.10) |
| `DriverOT` | [models.py:464](../../app/models.py#L464) | 1 OT record ต่อ 1 booking — approval + audit trail |
| `DriverOTSlot` | [models.py:493](../../app/models.py#L493) | time slot แต่ละช่วงใน OT record — snapshot rate |
| `FuelBill` | [models.py:510](../../app/models.py#L510) | บิลค่าน้ำมันเดี่ยว → vehicle/driver, link to FuelReimbursement |
| `FuelReimbursement` | [models.py:534](../../app/models.py#L534) | ใบเบิกรวม 1:N FuelBill — `submitted_at` / `received_at` |
| `FuelPrice` | [models.py:553](../../app/models.py#L553) | ราคา/ลิตรตามช่วงเวลา — `get_for_date()` (replaces SystemConfig['fuel_price']) |
| `FuelReserveConfig` | [models.py:577](../../app/models.py#L577) | เงินสำรอง singleton (id=1) — `get_amount()` |
| `FuelReserveLog` | [models.py:595](../../app/models.py#L595) | ประวัติการปรับเงินสำรอง — note required |
| `VehicleBudgetLog` | [models.py:611](../../app/models.py#L611) | **ledger** ของ vehicle_budget — ทุก mutation ต้องผ่าน BudgetService (2026-05-06) |

---

## 🎨 Templates

**Shared partials** (include ทุกหน้า):
| Partial | File |
|---------|------|
| `_sidebar.html` | [app/templates/_sidebar.html](../../app/templates/_sidebar.html) — `active_menu` keys: `dashboard` `history` `vehicle` `repair` `room` `admin` `mileage` `fleet` `cost` `budget` `fuel` `approver`. **Icons: Lucide** (`data-lucide="..."`) — load via `_header.html` |
| `_header.html` | [app/templates/_header.html](../../app/templates/_header.html) |
| `_notification_panel.html` | [app/templates/_notification_panel.html](../../app/templates/_notification_panel.html) |
| `_notification_toast.html` | [app/templates/_notification_toast.html](../../app/templates/_notification_toast.html) |
| `_components/*.html` | Reusable Jinja macros (Phase 2 + 3) — see § Design System > Component library. Files: `kpi.html` (`kpi_cell` accepts `icon_kind='lucide'\|'fa'`, default lucide), `filter_bar.html`, `badge.html` (`badge(text, tone, dot=False, icon='', size='')`, lucide), `pill.html`, `empty_state.html` (`empty_state(title, desc, icon, compact)`, lucide, `{% call %}` for CTA), `form_group.html`, `table_shell.html`, `_modal.html`. Phase 3 aligned to flat vocab matching `/bbcenter-design` skill. |

**Dashboard templates:**
| File | ใช้สำหรับ |
|------|----------|
| `dashboard/dashboard.html` | landing page หลัง login — **Vercel shell** (2026-05-17 redesign จาก hero-style ออก): `_sidebar` + `_header` shell, `dash-header` page title + live clock subtitle (no hero), admin alert banner (`dash-alert`), 4-cell KPI strip `dash-kpi` (admin only — IT/อาคาร/รถ/ห้อง), "รายการของฉัน" 4-card grid (`dash-mine`), "บริการทั้งหมด" 4-service card grid (`dash-svc`), 4 recent cards (IT/อาคาร/**จองรถ — อนุมัติแล้ว วันพรุ่งนี้**/ห้องวันนี้) ใช้ `vc-card + vc-card-head + vc-table + vc-badge` + `empty_state` macro, superadmin banner (`dash-superadmin` — black inverted card). View `auth.dashboard()` ส่ง `recent_vehicle = approved + start_datetime ∈ tomorrow`. Loads `dashboard.css` + `pages/dashboard.js` (ES module). Animation: stagger fade-up `dash-fade.d-{1..5}` (60ms delay, `cubic-bezier(0.23,1,0.32,1)`, 280ms, `prefers-reduced-motion: opacity-only`). |

**Repair templates:**
| File | ใช้สำหรับ |
|------|----------|
| `repair/repair.html` | ระบบแจ้งซ่อมไอที — **vc-scope shell** (2026-05-13 redesign): `repair-header` pattern, 5-cell KPI (admin only), `vc-table` + `vc-card-head`, DataTable (langUrl via data attr), 3 modals (repairFormModal/acceptModal/closeModal), `vc-badge`/`vc-btn`, Lucide icons. Loads `repair.css` + `pages/repair.js` (Phase 4.2 — `type="module"`). **Phase 3.4 (2026-05-15):** empty state migrated → `{% call empty_state(icon='wrench') %}` macro with CTA button caller; ลบ inline `style="width:20px;height:20px;"`. **Phase 4.2 (2026-05-15):** script → ES module `pages/repair.js`. |
| `maintenance/maintenance.html` | แจ้งซ่อมอาคารสถานที่ — **vc-scope shell** (2026-05-17 redesign): `maintenance-header` pattern, 5-cell KPI (admin only), `vc-table` + DataTable (langUrl via `#pageData` data attr), 4 modals (maintenanceFormModal/acceptModal/closeModal/exportModal), ฟอร์มแจ้งซ่อม → modal (create + edit mode, auto-open เมื่อ `edit_ticket`), `vc-badge`/`vc-btn`, Lucide icons. Loads `maintenance.css` + `pages/maintenance.js` (legacy script — jQuery+DataTable ยังใช้ global). |

**Room templates:**
| File | ใช้สำหรับ |
|------|----------|
| `room/room.html` | ปฏิทินจองห้องประชุม — **vc-scope shell** (2026-05-17 redesign): sidebar + `_header.html` + `room-header` pattern, custom calendar grid (reuse `vehicle.css` calendar styles) + mobile list section (เหมือน `vehicle/vehicle.html`); ลบ FullCalendar + DataTables; แทน room badges สี เล็ก=blue / ใหญ่=amber ผ่าน tokens; data injection (`window.BOOKINGS`/`window.ROOM_CHOICES`); 3 modals: book/edit/detail. Loads `room.css` + `pages/room.js` (ES module). |
| `room/room-modal-book.html` | `#bookingModal` — เลือกห้อง/หัวข้อ/วันที่/ช่วงเวลา + duration preview |
| `room/room-modal-edit.html` | `#editBookingModal` — แก้ไขห้อง/หัวข้อ/วันเวลา (flatpickr) |
| `room/room-modal-detail.html` | `#eventDetailModal` — ดูรายละเอียด + แก้ไข/ยกเลิก (เฉพาะ owner) |

**Vehicle templates:**
| File | ใช้สำหรับ |
|------|----------|
| `vehicle/vehicle.html` | หน้าจองหลัก. **Phase 4.7 (2026-05-15):** script → ES module `<script type="module" src="js/pages/vehicle.js">`; ลบ inline `<script>` pay-deeplink IIFE (ย้ายเข้า module). **Phase 1 user-facing redesign (2026-05-17):** เริ่ม migrate ไป BBCenter V2 — viewport `maximum-scale=1.0`; ลบ DataTables CSS + IBM Plex Sans Thai; เพิ่ม `design-system.css` + `vehicle_admin.css` ใน link order; `<main>` ใส่ `vc-scope`; flash `alert alert-{cat}` → `ds-alert` ใน `vc-stack`; toolbar 3 ปุ่ม (prev/next/today) → `vc-btn vc-btn-ghost vc-btn-icon` + Lucide chevron-left/right + `vc-btn-secondary` "วันนี้"; calendar wrapper `card h-100` → `vc-card`; mobile "จองรถ" `btn btn-dark` → `vc-btn-primary` + Lucide plus. **Phase 2 (2026-05-17):** modals 4 ไฟล์ + duration preview เสร็จ (ดู modal rows ด้านล่าง). **Phase 3 (2026-05-17):** ds-status-dot/STATUS_ICON refactor เสร็จ — ดู `design-system.css` §7 + `pages/vehicle.js` row ด้านล่าง. **Phase 4 (2026-05-17):** เสร็จครบ — token cleanup + Lucide migration (~17 icons) + UX polish: calendar `role="grid"` + columnheader/gridcell ARIA + `aria-label` Buddhist year + `aria-current="date"`; keyboard nav (← → / T) ใน vehicle.js (skip input/modal); popover `shown.bs.popover` listener + `initIcons` |
| `vehicle/vehicle_history.html` | ประวัติ |
| `vehicle/vehicle_edit.html` | แก้ไข booking |
| `vehicle/approver_inbox.html` | Approver inbox — budget card + 3 tabs (รออนุมัติ/อนุมัติแล้ว/ปฏิเสธ) + accordion cards + inline reject form. **Phase 3.8 (2026-05-15):** ลบ inline `<style>` (197 lines) → `approver_inbox.css`; ลบ inline `<script>` → `approver_inbox.js`; `.badge-waiting/.badge-approved/.badge-rejected` → `vc-badge vc-badge-warning/success/danger vc-badge-dot`; 3 empty states → `vc-empty/vc-empty-icon/vc-empty-title`; ลบ inline `style=""` ทุกจุด (dynamic width คง). **Phase 4.1 (2026-05-15):** script → ES module `<script type="module" src="js/pages/approver-inbox.js">`. **Phase 5.11 mobile redesign (2026-05-18):** restructure ให้เป็น mobile-first layout — `.approver-wrap` max-width 560px center; pending card header เปลี่ยนจาก department text → `BK-{id:04d}` mono + status badge; body `.ac-fields` 2-col CSS grid (`.ac-field` icon+label+value pattern, `.ac-field-full` for ปลายทาง/เหตุผล); 6 fields = ผู้จอง/วันที่/เวลา/ปลายทาง/วัตถุประสงค์/ผู้โดยสาร; Font Awesome icons → Lucide (user/calendar/clock/map-pin/target/users/circle-x/circle-check/message-square-x/credit-card/chevron-down); tabs underline → pill style (gray container + active = white surface); approve/reject buttons เป็น 2-col `.ac-action-row` ใช้ `.btn-approve-action` (black primary) + `.btn-reject-action` (red outline); reject form revamp with `.ac-reject-cancel`/`.btn-reject-confirm`; approved/rejected tabs ใช้ field grid pattern เดียวกัน. |
| `vehicle/admin/mileage_admin.html` | บันทึกเลขไมล์ (admin) — **vc-scope shell** (2026-05-13): `fuel-header` pattern, 4-cell KPI (`va-kpi-card` + `vc-kpi-group.va-kpi-4`), `vc-filter-bar`, checkbox summary strip (`vc-card`), `vc-table` + `vc-card-head`, lucide icons, `vc-badge`/`vc-btn` (ลบ breakdownPanel/monthPager แล้ว). Loads `fuel_admin.css` + `mileage_admin.css` (page-only row+modal styles). **Phase 3.3 (2026-05-14):** inline HEX `#DC2626` → `var(--vc-red)` (3 จุด), `var(--ds-accent)` → `var(--vc-fg)` (1 จุด). **Phase 4.5 (2026-05-15):** script → ES module `<script type="module" src="js/pages/mileage-admin.js">`. **Phase 5.9 (2026-05-17):** จัด layout `vc-filter-bar` ใหม่เป็น 4 หมวด — ช่วงเวลา (calendar) / ค้นหา (search) / งบประมาณ (wallet) / สถานะ+ค่าใช้จ่าย (sliders) → แต่ละหมวดมี `<h4 class="mlg-filter-section-title">` + Lucide icon + เส้นคั่นล่าง; section body wrap แนวนอน, mobile ≤575.98px stack 100%; actions row (กรอง/preset) แยกแถวล่างมีเส้นคั่นบน. เพิ่ม class ใน `mileage_admin.css`: `.mlg-filter-bar/-section/-section-title/-section-body/-filter-date/-num/-actions-row`; ลบ inline `style="background-image:none"` 4 จุด → ย้ายเข้า CSS. **Phase 5.8 (2026-05-17):** เพิ่ม 2 filter ใน `vc-filter-bar` — (1) "ผู้จอง" `<input list="bookersList">` + `<datalist>` (autocomplete native, server filter ilike); (2) "งบ" + "หมวด/กอง" — chained dropdown (type=ส่วนกลาง/ส่วนกอง/ส่วนตัว; sub โผล่เฉพาะ central/department, ซ่อนเมื่อ personal/ว่าง); JS rebuild sub options ด้วย `innerHTML` จาก `window.EXPENSE_CATS` + `window.MLG_FILTER_SUB` (pattern ลอกมาจาก `updateExpSubDropdown` ใน vehicle-admin.js). **Phase 5.7 (2026-05-17):** redesigned `<vc-table>` — 14 columns (Booking/งบ/ผู้จอง/ทะเบียน/คนขับ/เติมน้ำมัน/ปลายทาง/ไมล์ออก/ไมล์กลับ/ระยะ/ค่าน้ำมัน/สถานะ/action); column "งบ" แสดง type (`ส่วนกลาง/ส่วนกอง/ส่วนตัว`) + sub (หมวด/แผนก) — personal ไม่มี sub; column "เติมน้ำมัน" `vc-badge-blue` ถ้า FuelBill mileage อยู่ใน [odo_start, odo_end] ของ trip (link ไป admin_fuel); ทะเบียน=license_plate only, คนขับ=ชื่อแรก only; loop `display_rows` แทน `rows` → trip รวม (`trip_group` เดียวกัน) เหลือ 1 row + badge `+N` หลัง BK-id + ผู้จองแสดง "งานร่วม N รายการ" (representative=ตัวแรก). **Phase 5.6 (2026-05-17):** `#summaryStrip` redesigned for mobile — ลบ Bootstrap `row`/`col-12` + `d-flex` บน card, ลบ inline `style=""` ทั้ง block; ใช้ `.mlg-summary-strip/-mode/-mode--hidden/-item/-label/-icon/-clear` (ใน `mileage_admin.css`); ใน mobile ≤767.98px → items stack 100% width + ซ่อน `.vc-dot-sep` + clear button full width. IDs/JS contract คงเดิม (`#modeAll`/`#modeSelected`/`#sumAllDistance`/`#sumAllCost`/`#selCount`/`#selDistance`/`#selCost`/`clearSelection()`). |
| `vehicle/driver_home.html` | หน้าคนขับ — **Vercel namespace** (2026-05-08, rev2): `<body class="vc-scope">` + lucide icons only (no Font Awesome). Header + segmented tabs (วันนี้/พรุ่งนี้, no "ย้อนหลัง"), accordion cards (`[data-card]` open one→close others within active panel), inline mileage form (no modal), upload zone (no separate camera button), CTA black `--vc-primary`. Tomorrow tab read-only with "เริ่มงานได้ในวันที่ …" note. Refuel UI removed. **Phase 3.5 (2026-05-15):** 2 empty states → `{{ empty_state(...) }}` macro; ลบ inline `style=""` ทั้งหมด (flash alert → `driver-flash-alert`, plate span → `driver-plate`, unset span → `driver-unset`). **Phase 4.4 (2026-05-15):** ลบ inline `<script>` (67 lines) + duplicate lucide CDN → ES module `<script type="module" src="js/pages/driver-home.js">`; lucide CDN+init มาจาก `_header.html` แล้ว. |
| `vehicle/vehicle-modal-book.html` | `#bookingModal`. **Phase 3.6 (2026-05-15):** ลบ `badge-pending` ออกจาก info card → ใช้ `.bk-info-note` แทน. **Phase 2 user-facing redesign (2026-05-17):** 7 `bi-*` + `bi-arrow-right-circle-fill` → Lucide (folder-plus/check-circle-2/arrow-right/info); footer 2 ปุ่ม `btn-secondary/btn-dark rounded-2` → `vc-btn vc-btn-secondary/vc-btn-primary` + `title=""`; เพิ่ม `<div id="bk_duration_preview" class="bk-duration-preview" aria-live="polite">` ใต้ช่วงเวลา (JS compute end−start) |
| `vehicle/vehicle-modal-edit.html` | `#editBookingModal`. **Phase 2 (2026-05-17):** `bi-pencil-square` → Lucide `pencil`; `bi-check-circle-fill` → Lucide `check`; footer 2 ปุ่ม → `vc-btn vc-btn-secondary/vc-btn-primary` + `title=""` |
| `vehicle/vehicle-modal-detail.html` | `#eventDetailModal` (single + group รวมใน modal เดียว). **Phase 2 (2026-05-17):** 3 info icons (clock/truck/person) `bi-*` → Lucide; ลบ `card border-0 rounded-2` (เหลือ `bk-modal-content`); ลบ inline style 9 จุด → 8 classes ใหม่ใน vehicle.css (`bk-detail-*`). **Phase 3 (2026-05-17):** initial `ds-status-dot ds-status-dot--approved` → `vc-status-dot vc-status-dot--approved`; FA `fa-regular fa-circle-check` → Lucide `data-lucide="circle-check"`. Header icon ถูก JS swap ผ่าน `outerHTML` ใน `openEventDetail()` (vehicle.js) + `bindModalReinit()` แปลง Lucide เป็น svg ตอน `shown.bs.modal` |
| `vehicle/vehicle-modal-group.html` | *(merged into vehicle-modal-detail.html)* |
| `vehicle/vehicle-modal-more-events.html` | `#moreEventsModal`. **Phase 2 (2026-05-17):** ลบ class `shadow` + inline `border-radius:14px`; outer wrapper → `bk-modal-dialog-sm` + `bk-modal-content` (reuse จาก vehicle.css) |
| `vehicle/admin/vehicle_admin.html` | admin dashboard — **Vercel shell** (`.vc-scope`), 4-cell KPI strip (รออนุมัติ/ส่ง Approver/อนุมัติ/ปฏิเสธ), week navigator (dark active fill), 2-col split: Bookings+Trips (col-8) / Vehicle status grid (col-4 sticky), 4 modals: `#assignModal` `#swapModal` `#repairModal` `#revertModal`. Reuses shared primitives: `.vc-kpi-*` (components/kpi.css), `.vc-badge-*` + `.vc-empty-*` (components/badge.css + empty_state.css — Phase 3.2), `.vc-card/.vc-btn/.vc-modal/.vc-form-*` (design-system.css). Lucide icons. KPI cells kept raw HTML (canonical per `/bbcenter-design`); status badges + empty states rendered by JS now emit `vc-badge-{warning\|blue\|success\|danger\|neutral\|solid} vc-badge-dot` + `vc-empty` + `vc-empty-icon/-title` + lucide icons. **Phase 4.3 (2026-05-15):** script → ES module `<script type="module" src="js/pages/vehicle-admin.js">`. **Phase 5.1 align (2026-05-15):** ลบ `fuel_admin.css` link (ไม่ใช้); `vc-icon` → `vc-icon-sm` ×6; ลบ `pe-1 mb-1` ×2 ใน modal label; เพิ่ม `title=""` ทุก control button (week-nav, merge/notify ×4, ftab ×5, btn-close ×4, adm-exp-tab ×3, modal-footer ×8, expand toggle ×1). **Phase 5.2 inline-style purge (2026-05-16):** ลบ inline `style="color:var(--vc-green)"` ที่ L157 (`<i data-lucide="circle-check">` ใน collapsed-bar) → ใช้ CSS rule; แทน inline `style="margin-top/-bottom"` ที่ L274 → class `.va-exp-sub-group`. **Phase 5.3 JS audit (2026-05-16):** `pages/vehicle-admin.js` — L863 `<i class="fa-brands fa-telegram">` → `<i data-lucide="send" class="vc-icon-sm">` + `initIcons(btn)` (rule 4); L929 plain `<p style="--ds-text-muted">` empty → `<div class="vc-empty"> + vc-empty-icon + vc-empty-title` (rule 5); L933-935 swap-veh-status inline HEX `#DCFCE7/#16A34A/#EDE9FE/#4338CA` → `vc-badge vc-badge-{blue\|neutral\|success} vc-badge-dot` (rule 9). **Phase 6 UX polish (2026-05-16):** L260 "EXPENSE TYPE" → "ประเภทค่าใช้จ่าย" (Thai consistency); ลบ dead comment L130 `beforeCount`; เพิ่ม `<div class="va-page-header-actions"></div>` slot ใน page header (§1 skill template alignment, `:empty { display: none; }` กัน blank space). **Phase 6.1 UX features (2026-05-17):** 3 new modal nodes — `#vehConflictWarn` (after `#modalVehSel`) + `#drvConflictWarn` (after `#modalDrvSel`) ใช้ `.va-conflict-warn` แสดง "ซ้อนเวลากับ #N (HH:MM-HH:MM · ...)" เมื่อ `findConflict()` เจอ; `<p.va-budget-warn>` ใน `.va-budget-bar` แสดงข้อความเตือนงบ. |
| `vehicle/admin/admin_manage_fleet.html` | จัดการรถ + คนขับ + ตารางผู้อนุมัติประจำกอง (view-only); service/tax date อยู่ใน edit modal. **Phase 6.2 redesign (2026-05-17):** Vercel `vc-scope` shell, layout `mf-grid` 2fr/1fr (col-8 Vehicles · col-4 Drivers+Approvers stacked), vc-card/vc-table/vc-badge/vc-form-*, Lucide icons แทน bi-*; row icons → `.mf-icon-btn` (scale 0.94 active 80ms); modals → `vc-modal` + dialog enter 200ms `cubic-bezier(0.23, 1, 0.32, 1)`; row stagger 40ms via `.mf-stagger`; ลบ inline `<style>` + `<script>` → `css/manage_fleet.css` + `js/pages/manage-fleet.js`; respects `prefers-reduced-motion`. |
| `vehicle/admin/vehicle_cost.html` | จัดการค่าล่วงเวลา (OT) คนขับ — KPI (3 cell raw), filter bar (date range/driver GET), table + status tabs (vc-tab/vc-tab-count), edit modal (slot rows dynamic), rate config modal (rate rows dynamic), print receipt (`@media print`). Loads `vehicle_cost.css` + `pages/ot-admin.js`. **Phase 3.7 (2026-05-15):** ลบ inline `style="display:inline;"` ×3 → `.d-inline`; `style="display:inline-flex;gap:4px;"` → `.cost-action-group`; ลบ `style="width:20px;height:20px;"` จาก empty-state lucide icon. **Phase 4.8 (2026-05-16):** script → ES module `<script type="module" src="js/pages/ot-admin.js">`. **Phase 5.10 (2026-05-18):** ลบ `<link>` `fuel_admin.css` (ไม่ใช้แล้ว); rename `fuel-header/-title/-subtitle/-header-actions/-range-chip` → `cost-*` (CSS มีอยู่แล้ว); fix bug: JS template literal (`${opts}/${st}/${en}`) หลุดมาเป็น HTML ใน `#rateConfigModal` body → ลบทิ้ง; redesign `#rateConfigModal` body ใหม่ — static `vc-form-row` × N → `#rateConfigContainer` + `.cost-rate-row` × N (6-col grid label/day/start/end/rate/×) + `#addRateBtn` (เพิ่มแถวใหม่ส่ง `cfg_id[]=""`) + `.js-rate-remove` (existing → confirm + append `cfg_delete[]`; new → drop DOM); inputs `cfg_start[]`/`cfg_end[]` text → `<input type="time">`. **เพิ่ม per-weekday override:** column `cfg_day[]` (`<select>` ทุกวัน/จันทร์–อาทิตย์, value `""`=NULL หรือ `0..6`) + rate banner pill ใส่ `.cost-rate-pill--day` (amber) + day-label prefix (`TH_DAYS`) เมื่อ day-specific; backend `auto_generate_ot()` override logic: ถ้ามี row ที่ `day_of_week == booking.weekday()` → ignore weekday-agnostic rows. |
| `vehicle/admin/budget_manage.html` | จัดการงบ. **Phase 4.10 (2026-05-16):** script → ES module `<script type="module" src="js/pages/budget-admin.js">`; ลบ duplicate lucide CDN (มาจาก `_header.html` แล้ว). **Phase 5.8 polish (2026-05-18):** Vercel spacing pass — `fuel-*` classes (header/title/subtitle/header-actions) → `budget-*`; ลบ inline `style=""` 18 จุด → semantic classes (`.budget-flash-stack/-kpi-strip/-grid/-grid--last/-empty-block/-filter-month/-refund-scroll/-refund-hint/-empty-icon/-modal-mono/-modal-alert/-modal-alert--flush`, `.vc-bcard-approver`); inline `<script>` setBudgetModal handler → `pages/budget-admin.js`; `display:none` → `hidden` attr; `<i style="width:20px;height:20px;">` → `.budget-empty-icon`; ทุก `<button>` มี `title=""` ครบตามกฎ §0; section header รับ `:first-of-type` spacing; โหลด `budget_manage.css` แทน `fuel_admin.css`+`budget_admin.css`. **Phase 5.9 (2026-05-18):** budget card dropdown เพิ่ม divider + form POST item "ปิดใช้งานงบนี้" / "เปิดใช้งานงบนี้" (action=`toggle_active` + hidden year/month/budget_id/to_active); `<div class="vc-bcard">` รับ `{% if not b.is_active %}vc-bcard--inactive{% endif %}`; เพิ่ม badge "ปิดใช้งาน" (`vc-badge-neutral vc-badge-dot` + `power-off` icon) ใน head เมื่อ inactive. |
| `vehicle/admin/budget_personal.html` | personal reimbursement |
| `vehicle/admin/admin_fuel.html` | **Phase 2.3–2.7 + 3 + 4.1/4.3** — Vercel shell, 6 KPI cells (raw), filter bar (year/month/vehicle/driver GET — raw), Bills data table (Excel export link, anchor `#billsCard`), Reimbursements accordion, **Pivot รถ×เดือน** (heatmap, sticky col, footer sum, **drill-down → Bills filter year+vehicle+month**), **5 modals (bill/reimb/reserve/price/budget)** + JS controller. **Phase 3:** empty states use `empty_state` macro; KPI/filter/table kept raw as canonical reference for `/bbcenter-design`. **Phase 4.6 (2026-05-15):** script → ES module `<script type="module" src="js/pages/fuel-admin.js">`. |
| `vehicle/admin/fuel-modal-bill.html` | Bill create/edit/delete modal — date/vehicle/driver/amount/payment radio segmented/mileage/note. `#fuelBillModal` |
| `vehicle/admin/fuel-modal-reimbursement.html` | Reimbursement create/edit modal — bill list summary + เลขใบเบิก/แหล่ง/วันส่ง/note. `#fuelReimbModal` |
| `vehicle/admin/fuel-modal-reserve.html` | Reserve adjust modal — current summary + signed change + note (required) + history 20. `#fuelReserveModal` |
| `vehicle/admin/fuel-modal-price.html` | Fuel price modal — add new + history with delete. `#fuelPriceModal` |
| `vehicle/admin/fuel-modal-budget.html` | Annual budget modal — single number input + summary. `#fuelBudgetModal` |

**กฎสำคัญ:** modal ห้ามมี inline `<script>` — JS อยู่ใน `pages/vehicle.js` ทั้งหมด

---

## 🎨 Design System

**Token source (single):** [app/static/css/tokens.css](../../app/static/css/tokens.css) — 2026-05-14 split out (Phase 1)
- `--vc-*` **canonical** (Vercel-Black + Indigo accent) — ใช้ใน code ทุกที่ เพิ่ม `--vc-z-*`/`--vc-sidebar-width`/`--vc-header-height` ใน Phase 5.1; **Phase 3 vehicle user-facing (2026-05-17)** เพิ่ม `--vc-purple-bg` (`rgba(121,40,202,.10)`) + `--vc-purple-border` (`rgba(121,40,202,.25)`) ใต้ `--vc-purple` สำหรับ `vc-status-dot--group`
- `--ds-*` **RETIRED** (Phase 5.1, 2026-05-16) — ลบ Part A ออกครบแล้ว; `var(--ds-*)` ต้องไม่มีใน codebase; ถ้าเจอ = bug (vehicle user-facing Phase 4 2026-05-17 — `pages/vehicle.js` cleared 14 จุด; เหลือ `pages/vehicle-admin.js` L344/L369 ใน admin page)
- `@import`-ed by `design-system.css` (everyone loads it transitively)

**Component entry:** [app/static/css/design-system.css](../../app/static/css/design-system.css) — typography + components + `.vc-mono/-caption/-icon*/-scope` utilities (no token defs anymore). `@import`s `tokens.css` + every file in `components/`. **Phase 3 vehicle user-facing (2026-05-17)**: §7 STATUS DOT — rename `.ds-status-dot` + 5 variants (pending/approver/approved/rejected/group) → `.vc-status-dot*`; HEX literals 10 ค่า → `var(--vc-{amber|blue|green|red|purple}-bg)` + foreground. Markup pattern เปลี่ยนเป็น `<i data-lucide="..." class="vc-icon-sm">` แทน Font Awesome.

**Component library (Phase 2, 2026-05-14):**
| Component | CSS | Macro | Notes |
|-----------|-----|-------|-------|
| KPI strip | [components/kpi.css](../../app/static/css/components/kpi.css) | [_components/kpi.html](../../app/templates/_components/kpi.html) | `kpi_group(cols=3\|4\|6)` + `kpi_cell(label,value,unit,icon,meta,tone)`. Tones: muted/success/danger/blue/purple/warn. Extracted from `fuel_admin.css`+`budget_admin.css`. (4-col added 2026-05-18 for admin_fuel KPI group A.) |
| Filter bar | [components/filter_bar.css](../../app/static/css/components/filter_bar.css) | [_components/filter_bar.html](../../app/templates/_components/filter_bar.html) | `filter_bar()` wraps a `<form>`; `filter_select`/`filter_date` for fields. Extracted from `fuel_admin.css §21`. |
| Badge | [components/badge.css](../../app/static/css/components/badge.css) | [_components/badge.html](../../app/templates/_components/badge.html) | `.vc-badge` + tones `-neutral/-warning/-blue/-success/-danger/-solid`, `.vc-badge-dot` left dot, `.vc-badge-xs` small. `-solid` = inverted black-fg/white-bg for strong emphasis (re-added Phase 3.2 for "X งานรวม" pill). Page-local extension `.vc-badge-purple` in `budget_manage.css` (Phase 5.8). Phase 3 aligned to flat vocab matching `/bbcenter-design` skill. |
| Pill | [components/pill.css](../../app/static/css/components/pill.css) | [_components/pill.html](../../app/templates/_components/pill.html) | Rounded chip for filter tabs/segmented. `.is-active`, tones `accent/success/danger`. |
| Empty state | [components/empty_state.css](../../app/static/css/components/empty_state.css) | [_components/empty_state.html](../../app/templates/_components/empty_state.html) | `empty_state(title, desc, icon, compact)` — lucide icon. Use `{% call %}…{% endcall %}` for CTA button. Phase 3 aligned to flat vocab (`vc-empty-title/-desc/-icon`). |
| Form group | [components/form_group.css](../../app/static/css/components/form_group.css) | [_components/form_group.html](../../app/templates/_components/form_group.html) | `form_input/form_select/form_group(call)`. States `.has-error/.is-disabled`. |
| Table shell | [components/table_shell.css](../../app/static/css/components/table_shell.css) | [_components/table_shell.html](../../app/templates/_components/table_shell.html) | `.vc-table-shell` wrapper + `.vc-table` skin. |
| Modal | [components/modal_shell.css](../../app/static/css/components/modal_shell.css) | [_components/_modal.html](../../app/templates/_components/_modal.html) | Bootstrap-based macro (predates Phase 2) + new tokenized helpers (`.vc-modal-section/-divider`). |
| Sidebar | [components/sidebar.css](../../app/static/css/components/sidebar.css) | (template: `_sidebar.html`) | `.sidebar` + `.sb-brand/-logo(-icon,-text)/-close/-nav/-section-label/-item(.active)/-icon/-label/-badge/-footer/-logout`. Defines `--sidebar-width: 250px`. **Moved Phase 4.1.5 (2026-05-15)** from `vehicle.css` so every page (incl. approver_inbox ที่ไม่โหลด vehicle.css) ได้ sidebar styles ฟรีผ่าน `design-system.css` @import. |

Total: 9 component CSS files + 8 macros (7 new in Phase 2 + 1 pre-existing `_modal.html`).

**Highlights:**
- `--vc-accent` `#4F46E5` (Indigo) — active states + focus ring (legacy alias `--ds-accent` ยังมีใน tokens.css Part A — ห้ามอ้างใน code ใหม่)
- `--vc-primary` `#000` — primary CTA · `--vc-border` `#EAEAEA` · `--vc-radius-md` 8px (card)
- Shadow: ไม่มี (border only)
- Mono: Geist Mono via `.vc-mono`
- `.vc-scope` = opt-in body class for pages using `--vc-*` foundation

**Per-page CSS:**
| File | ใช้กับ |
|------|--------|
| `vehicle.css` | หน้า user vehicle + history (calendar ถูกลบใน Phase 0.5). **Phase 3.6 (2026-05-15):** ลบ `.badge-approved/.badge-pending/.badge-approver` (3 HEX blocks); `--ds-border`→`--vc-border` + `#111827`→`var(--vc-fg)` ใน bk-modal; เพิ่ม `.bk-info-note` (amber token). **Phase 4.1.5 (2026-05-15):** ลบ sidebar section + legacy `.menu-item`/`.brand-logo`/`.sidebar-menu`/`.menu-section` (158 lines, 618 → 460); ย้ายไป `components/sidebar.css` |
| `driver.css` | **`/driver` only** (2026-05-08, **rev2 → Vercel namespace**) — uses `--vc-*` tokens (matches `fuel_admin.css` standard), body wrapped in `.vc-scope`. Classes: `.driver-flash-alert/-plate/-unset/-header/-title/-subtitle/-header-meta/-tabs(__btn,__count)/-card(__head,__id,__summary,__chevron,__body, .is-open, --readonly)/-meta(__item,__icon,__label,__value)/-summary(__row,__label,__value)/-form(__title)/-upload(.has-file,__icon,__label,__hint)/-cta/-pill(--waiting,--ontrip,--done,--upcoming)/-done-summary/-readonly-note/-panel(.is-active)`. Mono font (Geist Mono) for BK-id, KPI numbers, inputs. Black primary CTA via `--vc-primary`. **Phase 3.5 (2026-05-15):** ลบ dead `.driver-page/-container` (§1), `.driver-empty*` (§11 — ใช้ macro แทน), icon overrides scoped to `.driver-page` (§13); แทน `#D4D4D4` → `var(--vc-border-hover)`; เพิ่ม `.driver-flash-alert/-plate/-unset`. |
| `vehicle_admin.css` | admin dashboard + budget pages. **Rewritten 2026-05-07** for Vercel shell. **Phase 3.2 (2026-05-14):** ลบ `.bl-badge`/`.badge-pending`-`.badge-group`/`.bl-empty` (รวม 6 HEX colors) → page ใช้ `components/badge.css` + `components/empty_state.css` แทน. **Phase 5.0 (2026-05-16):** redesign booking row 2-line layout. **Phase 5.4 polish (2026-05-16):** (1) icon FOUC fix — `.vc-scope [data-lucide]:not(svg)` reserve 14×14 ก่อน lucide swap; (2) week navigator: padding ใน bar, borders แต่ละ day cell, hover/active border, today marker top-right, mobile breakpoint ≤575px; (3) booking row redesign 2-line → **spacious card** — `.bl-body/.bl-row-head/.bl-name/.bl-head-spacer/.bl-dept-pill/.bl-row-meta(+.bl-meta-chip/.bl-meta-text)/.bl-row-assigned(+.bl-assigned-chip/.bl-assigned-label, only when approved/forwarded & has vehicle/driver)/.bl-row-actions/.bl-group-sub` ลบ `.bl-row-top/.bl-meta-dest/.bl-dot/.bl-actions`; (4) `.va-list` ใช้ flex-column + gap แทน `.card mb-2`; (5) cleanup HEX literals 13 จุด → tokens (`.vs-icon-maintenance/.pts-exp-*/.pts-btn-paid/.pts-btn-telegram/.va-approver-info/.va-budget-track/.va-modal-warning/.bl-ico-approve|reject:hover` → `--vc-{red\|green\|blue\|amber}-{bg\|border}`); (6) trip detail box bg subtle + radius; (7) action icon buttons 36×36 default with `var(--vc-red\|green-bg)` hover. Depends on `components/kpi.css` + `components/filter_bar.css` + `components/badge.css` + `components/empty_state.css` (Phase 2+3 primitives) + `design-system.css`. **Zero HEX** ทั้งไฟล์ตอนนี้. Mobile breakpoints ≤767px (list actions 36px tap target, modal compact) and ≤575px (vehicle row + filter tab + week navigator compact). **Phase 6.1 (2026-05-17):** เพิ่ม week-day-dot variants `.va-week-day-dot--sm` (4×4 dot) / `--md` (15×4 bar) / `--lg` (25×4 bar) + active state inverts to `var(--vc-bg)`; budget bar tone modifiers `.va-budget--warn` (amber fill) / `--danger` (red fill); `.va-budget-warn` ข้อความเตือนใต้ bar (amber/red bg+border); `.va-conflict-warn` warning box ใต้ select ใน modal (amber). |
| `fuel_admin.css` | **Vercel namespace** — fuel page only. Page-specific only now (Phase 2 moved KPI+filter → `components/`; Phase 3 moved badge+empty-state → `components/badge.css` + `components/empty_state.css`). Sections: page shell, header, card, btn, table, list+collapse+meta-grid, form input/segmented radio/modal Bootstrap-override skin/history scroll table, **§22 pivot table** (`.vc-pivot-*`, heatmap via `--cell-heat`, `.vc-pivot-link` drill-down with `:focus-visible` + `:has()` hover boost) |
| `mileage_admin.css` | mileage admin page only. **Phase 3.3 (2026-05-14):** stripped from 1095 → ~35 lines — removed ~30 dead class blocks (`.mlg-page-header/-kpi-*/-btn-*/-missing-pill/-panel-pill/-badge*/-month-current-pill/-panel*/-breakdown-*/-bd-*/-month-pager/-pager-*/-month-page*/-month-row*/-mr-*/-filter*/-summary except summary-box/-table*/-col-check/-col-id/-num/-edit-btn/-empty*/-modal-eyebrow` + duplicate `ds-alert*` + most `.mlg-modal/-info-grid/-info-item/-state-title/-summary-box/-preview/-timestamp-box/-refuel-box` styling that template inlines via `var(--vc-*)`) → page now inherits `vc-modal/vc-table/vc-card/vc-filter-bar/vc-kpi/vc-badge/vc-empty` from `fuel_admin.css` + `components/`. Page-only: `.mlg-row/-row-check/-col-dest/-complete-row/-refuel-box .form-check`. **Phase 5.6 (2026-05-17):** เพิ่ม summary-strip block — `.mlg-summary-strip/-mode/-mode--hidden/-item/-icon/-clear` + `@media (max-width: 767.98px)` (wrap items 100%, hide `.vc-dot-sep`, dashed bottom border, full-width clear button). **Phase 5.7 (2026-05-17):** เพิ่ม classes รองรับคอลัมน์ใหม่ — `.mlg-col-bk` (mono BK-id), `.mlg-group-badge` (`+N` chip), `.mlg-budget-label/-budget-sub` (2-line budget cell, ellipsis ที่ 140px), `.mlg-row--group` (subtle bg + ไม่ hover-flash), `.mlg-group-label` (icon+text "งานร่วม"), `.mlg-refuel-link` (no underline), `.mlg-date-cell` (ย้าย inline style ของ date separator มา CSS). |
| `vehicle_cost.css` | **`/admin/cost` only** — OT page. Pure `--vc-*` (Phase 3.7). Classes: `.cost-header/-title/-subtitle/-header-actions`, `.cost-rate-banner/-banner-title/-rate-pills/-rate-pill`, `.vc-tabs/.vc-tab/.vc-tab-count` (tab bar), `.cost-slot-tag/-morning/-evening/-night/-slot-rate` (time band chips), `.cost-table-footer/-meta/-total`, `.cost-slot-row/-row-field/-row-remove/-row-hint`, `.cost-total-box/-label/-hours/-amount`, `.cost-slot-add-btn`, `.cost-range-chip`, `.cost-action-group` (inline-flex gap-1 for row actions), `.cost-print-*` (receipt @media print). **Phase 5.10 (2026-05-18):** เพิ่ม `.cost-rate-row` (6-col grid label/day/start/end/rate/×, vc-bg-subtle bg) / `.cost-rate-row-field` / `.cost-rate-row-day` / `.cost-rate-row-remove` (32×32 icon button) / `.cost-rate-row.is-removed` (opacity .4 + pointer-events none for soft-deleted existing rows) + mobile ≤575px breakpoint; rate banner: `.cost-rate-pill--day` (amber bg/border, `--vc-amber-bg/-border/--vc-amber`) + `.cost-rate-pill-day` (label chip "อาทิตย์" prefix). |
| `maintenance.css` | **`/maintenance` only** (2026-05-17) — `vc-scope` page. Classes: `.maintenance-header/-title/-subtitle/-header-actions`, `.maintenance-resolved-note` (truncate with tooltip). ใช้ `--vc-*` ทั้งหมด, zero HEX. |
| `repair.css` | **`/repair` only** (2026-05-14) — `vc-scope` page. Classes: `.repair-header/-title/-subtitle/-header-actions`, `.repair-kpi-5` (5-col grid, responsive), `.repair-modal-icon(--warning/--blue/--success)`, `.repair-modal-title/-subtitle`, `.repair-form-section-label`, `.repair-info-box/-info-avatar/.repair-dashed`, `.repair-upload-zone`, `.resolved-note-cell`, `.repair-flash-wrap`, `.repair-kpi-card`, `.repair-time-sub`, `.repair-category-sub`, `.repair-reporter-name`, `.repair-select`, `.repair-input-lg`, `.repair-textarea`, `.repair-required`, `.repair-note-hint`. **Phase 3.4 (2026-05-15):** เปลี่ยน `--ds-*` ทั้งหมด → `--vc-*`; แทน HEX `#FFFBEB/#FDE68A` → `--vc-amber-bg/border`, `#EFF6FF/#BFDBFE` → `--vc-blue-bg/border`, `#F0FDF4/#BBF7D0` → `--vc-green-bg/border`. ไม่มี `--ds-*` เหลือ. |
| `approver_inbox.css` | **`/vehicle/approver` only** (Phase 3.8, 2026-05-15; mobile redesign Phase 5.11, 2026-05-18) — ใช้ `--vc-*` ทั้งหมด. Classes: `.approver-wrap` (max-width 560px center), `.approver-flash`, **budget block** `.budget-card/-card-row/-card-left/-card-icon/-card-name/-card-amount/-card-total/-card-used/-card-sep/-progress/-bar`, **tabs (pill)** `.inbox-tabs/.inbox-tab(.active)`, **card** `.approver-card`, **header** `.ac-header/-header-row/-header-right/-ref/-meta/-meta-sep/-chevron(.rotated)/-body`, **fields** `.ac-fields/-field/-field-full/-field-label/-field-value/-reject-reason`, **actions** `.ac-action-row/-action-form/.btn-approve-action/.btn-reject-action`, **reject form** `.ac-reject-wrap/-reject-input/-reject-cancel/.btn-reject-confirm`. Mobile breakpoint ≤380px (compact fields + buttons). |
| `room.css` | **`/room` only** (2026-05-17) — `vc-scope` page. Classes: `.room-legend`, `.room-badge(--small/--large)` + `.room-dot`, `.event-card.room-small/.event-card.room-large` (override calendar event color per room), `.room-list-dot(--small/--large)`, `.room-detail-dot(--small/--large)`, `.room-mobile-empty`. Reuse `vehicle.css` calendar grid. Zero HEX (tokens only). |
| `manage_fleet.css` | **`/admin/manage-fleet` only** (Phase 6.2, 2026-05-17) — `vc-scope` page. Classes: `.mf-header/-title/-subtitle`, `.mf-grid` (2fr/1fr → 1fr ≤1199px), `.mf-col-right`, `.mf-plate/-name-line(-primary/-sub)/-cap/-odo-unit`, `.mf-username-chip/-dept-chip`, `.mf-actions/-icon-btn(--danger)` (28×28, scale 0.94 active 80ms), `.mf-stagger` (row enter 40ms cascade, `cubic-bezier(0.23,1,0.32,1)`), `.mf-driver-row(-main/-name/-meta/-jobs)`, `.mf-approver-row(-name/-meta)`, `.mf-readonly-note`, `.mf-switch-row`, `.mf-hist-total(-label/-value/-unit)`, `.mf-spin/-hist-loading/-distance-pos`. Custom easings `--mf-ease-out/-in-out` scoped on `.vc-scope`. Modal dialog enter `translateY(8px) scale(0.97)` → `0/1` 200ms ease-out (Emil: never `scale(0)`). Respects `prefers-reduced-motion` (animation off, opacity-only). Zero HEX. |
| `budget_manage.css` | **`/admin/budget` only** (Phase 5.8, 2026-05-18 — renamed from `budget_admin.css`) — `vc-scope` page. Classes: `.budget-header/-title/-subtitle/-header-actions`, stack helpers `.budget-flash-stack/-kpi-strip/-grid/-grid--last/-empty-block`, `.budget-filter-month` (calendar chip), `.vc-section-hdr(-icon[.is-purple]/-title/-count/-actions)` (`:first-of-type` looser top), `.vc-bcard(-head/-name[.is-purple]/-actions/-date/-row/-pct[.is-warn/-danger]/-amounts/-rem[.is-success/-warn/-danger]/-approver)` + **`.vc-bcard--inactive`** (Phase 5.9 — opacity 0.65 + repeating diagonal stripe), `.vc-progress[.is-warn/-danger/-purple]`, `.vc-btn-purple`, `.vc-badge-purple` (tokens `--vc-purple-bg/-border`), `.vc-dropdown(-menu[.is-open]/-item[.is-danger]/-divider/-form)` (no shadow; Phase 5.9 — danger tone + form-wrapped POST item), `.budget-refund-scroll/-refund-hint` + `[data-pick-booking].is-picked`, `.budget-personal-row`, `.budget-modal-mono/-modal-alert/-modal-alert--flush`, `.budget-empty-icon`. Responsive ≤575px stacks page+section header actions full-width. Zero HEX (one purple `#6420A8` hover only — Vercel purple-700). |
| `dashboard.css` | **`/dashboard` only** (2026-05-17) — `vc-scope` landing page. Classes: `.dash-header/-title/-subtitle`, `.dash-section/-section-label`, `.dash-grid-{2,3,4}` (responsive: 4→2→1, 3→1, 2→1), `.dash-mine(-icon/-body/-title/-desc/-chev)` (linkable my-ticket row with chevron translateX hover), `.dash-svc(-head/-icon/-title/-desc/-foot/-cta)` (service card with arrow translateX hover), `.dash-kpi(-label/-value(-muted)/-meta)` (admin KPI), `.dash-alert` (amber banner), `.dash-superadmin(-info/-icon/-title/-desc)` (black inverted card + inverted vc-btn), `.dash-recent-card .dash-recent-sub/-time`, `.dash-fade.d-{1..5}` (stagger entrance — 60ms delay, `cubic-bezier(0.23,1,0.32,1)`, 280ms, scale 0.995 + translateY 6px; `prefers-reduced-motion: opacity-only`). Zero HEX (tokens only). No shadow (border-hover on interactive). |
| `notification.css` | notification panel + toast |
| `main.css`, `util.css` | common utilities |

**Core JS modules** (`app/static/js/core/`, Phase 4.0 — 2026-05-15):
| File | Exports |
|------|---------|
| `core/icons.js` | `initIcons(scope?)` — guarded `lucide.createIcons()`; ส่ง `Element` เพื่อจำกัด scope (modal-only re-init); `bindModalReinit()` — re-render on `shown.bs.modal` (auto-scope ไป `e.target`) |
| `core/format.js` | `thb(n)`, `km(n)`, `number(n)`, `thaiDate(d, {abbr})`, `thaiTime(d)` — Thai BE year + locale formatting |
| `core/http.js` | `get(url, params)`, `post(url, data)`, `del(url)` — auto JSON parse, CSRF from `<meta name="csrf-token">`, throws `HttpError` on non-2xx |

**ที่ยังไม่สร้าง** (จะเพิ่มเมื่อ feature module ต้องการ): `core/modal.js`, `core/toast.js`, `core/form.js`

**Per-page JS:**
| File | โหลดใน |
|------|--------|
| `pages/vehicle.js` | vehicle templates (รวม modals ทั้งหมด). **Phase 3.6 (2026-05-15):** `STATUS_BADGE` map → `vc-badge vc-badge-{warning|blue|success|danger|neutral} vc-badge-dot`; ลบ `badge rounded-pill` wrapper + inline `style="font-size:..."`. **Phase 4.7 (2026-05-15):** legacy `vehicle.js` (790 lines) → `pages/vehicle.js` ES module (`type="module"`); ลบ DOMContentLoaded wrapper (module deferred); expose `openEventDetail`/`openEditBookingModal`/`openMoreEvents`/`openBookingModal` ผ่าน `Object.assign(window, …)` + `eventDetailModal`/`moreEventsModal` ผ่าน `Object.defineProperty` getter (late binding); ย้าย `?pay=<id>` deep-link IIFE จาก `vehicle.html` เข้า module. **Phase 2 user-facing (2026-05-17):** `initFlatpickr()` เพิ่ม `updateDuration()` closure (compute end−start, bind `change` ทั้ง bkStart/bkEnd, output "ระยะเวลา X ชม. Y นาที" ใน `#bk_duration_preview`). **Phase 3 user-facing (2026-05-17):** `import { initIcons, bindModalReinit } from '../core/icons.js'` + `bindModalReinit()` module-top; `STATUS_ICON` map: FA strings → Lucide names (clock/send/circle-check/circle-x); 4 จุดที่ `ds-status-dot` → `vc-status-dot` (group avatar / single dot / detail header / members); FA `<i class="fa-...">` → `<i data-lucide="..." class="vc-icon-sm">` (users/${iconName}/circle-check/user); `updateMobileList` ปลาย: `initIcons(content)`; `openEventDetail` header icon: `outerHTML` swap (รักษา `id="detailHeaderIcon"` + bindModalReinit แปลง Lucide → svg ตอน shown.bs.modal); ลบ `headerDot.style.cssText='width:44px;...'` → ใช้ class `.bk-detail-header-dot`. **Phase 4 user-facing (2026-05-17):** cleanup ครบทุกอย่าง — `var(--ds-text-heading|text-muted|border)` 14 จุด → `var(--vc-fg|fg-muted|border)`; HEX 8 จุด (popover `#f3f4f6`/`#2563EB`, EVENT_CARD_STYLE 5 statuses) → tokens; ~17 FA/BI icons → Lucide (empty state calendar-x, group card truck/user/clock/pencil/chevron-down/arrow-up-right, single card user/clock/map-pin/pencil, openMoreEvents user, members list users/arrow-right/map-pin, footer actions pencil/trash-2, popover users); inline-HEX buttons → `vc-btn` variants; "งานรวม" badge → `vc-badge vc-badge-blue`; `createCell` ARIA (role=gridcell + aria-label + aria-current). เพิ่ม module-top `shown.bs.popover` listener + keydown handler (← →/T) |
| `pages/vehicle-admin.js` | admin dashboard (Phase 4.3, 2026-05-15) — ES module (`type="module"`); imports `initIcons` จาก `core/icons.js`. booking + trip list rendering, vehicle status grid, 4 modal handlers (assign/swap/repair/revert), week navigator, KPI counters, bulk merge + notify selectors. Exposes to `window.*` (20+ funcs: shiftWeek, openAssignModal, openSwapModal, fixDone, submitAssign, etc.) สำหรับ legacy `onclick=""` ใน template + JS-rendered HTML. **Phase 3.2:** emits `vc-badge-{warning\|blue\|success\|danger\|neutral\|solid} vc-badge-dot` + `vc-empty`. **Phase 5.4 polish (2026-05-16):** `renderSingleRow()` rewritten → spacious card layout (`.bl-body` flex-col, `.bl-row-head` w/ booker+dept+badge, `.bl-row-meta` w/ time+dest+pax chips, `.bl-row-assigned` shown when approved/waiting_approver/forwarded & has vehicle/driver, `.bl-row-actions` right-aligned with `stopPropagation`); `renderGroupRow` action class rename `.bl-actions` → `.bl-row-actions`; remove redundant `mb-2` (uses `.va-list` flex+gap). **Phase 6.1 (2026-05-17):** new helpers `ACTIVE_STATUSES` Set + `driverDayCount(driverId, dateStr, excludeBookingId)` + `findConflict(b, 'vehicleId'\|'driverId', resourceId)` + `updateConflictWarnings()`; `renderWeekNav()` count-based dot class (`--sm/--md/--lg`) + title tooltip; `openAssignModal()` driver dropdown suffix "• N งานวันนี้" + Thai placeholder "— เลือกคนขับ —"; `checkAssignReady()` now also calls `updateConflictWarnings()` (vehicle/driver select onchange both trigger); `updateModalBudget()` rewritten — tone classes `va-budget--{ok\|warn\|danger}` (remPct based: ≥20% ok, ≥10% warn, <10%/rem≤0 danger), shows `#modalBudgetWarn` text "งบเหลือน้อย (N% · X บ.)" or "งบหมดแล้ว". **Token fix Phase 5.1 followup**: `--ds-success/warning/danger` literals in `updateModalBudget()` → CSS-driven via tone classes (no inline color). |
| `pages/mileage-admin.js` | admin mileage page (Phase 4.5, 2026-05-15) — ES module (`type="module"`); modal 3-state (start/end/complete), realtime cost preview, checkbox summary, export-link sync. Exposes `openMileage()`, `goEditEnd()`, `clearSelection()` ไป `window.*` สำหรับ legacy `onclick=""` ใน template (3 จุด). `window.MLG_FUEL_PRICE` injection คงเดิม. |
| `pages/fuel-admin.js` | fuel page (Phase 4.6, 2026-05-15) — ES module (`type="module"`); imports `initIcons`/`bindModalReinit` จาก `core/icons.js`. 5-modal controller (bill/reimb/reserve/price/budget), checkbox→merge, kebab→edit, lucide re-init on shown.bs.modal, `wireFilterBar` (auto-submit GET on select change). ลบ IIFE + DOMContentLoaded guard (module deferred). ไม่มี `onclick=""` → ไม่ต้อง window expose. |
| `pages/maintenance.js` | maintenance page (2026-05-17) — legacy script (ไม่ใช่ ES module เพราะต้องรอ jQuery+DataTable global); DataTable init (langUrl จาก `#pageData[data-dt-lang]`), auto-open form modal เมื่อ `data-edit-mode="true"`, modal:รับงาน/ปิดงาน handlers (populate จาก `data-ticket-*`), delete confirmation, Export Excel. ไม่มี `onclick=""` → ไม่ต้อง window expose. |
| `pages/repair.js` | repair page (Phase 4.2, 2026-05-15) — ES module (`type="module"`); imports `initIcons`/`bindModalReinit` from `core/icons.js`. ลบ `$(document).ready()` wrapper (module deferred). DataTable init + lucide re-init on draw, modal:รับงาน/ปิดงาน handlers, auto-open edit modal, tooltips, upload zone. jQuery+bootstrap+DataTable ยังใช้ผ่าน global |
| `pages/notification.js` | ทุกหน้าที่มี notification panel — โหลดจาก `_header.html` (Phase 4.9, 2026-05-16). ES module (`type="module"`); polling `/api/notifications` ทุก 30 วิ, dropdown panel (group by booking + 3 tabs all/unread/payment + sticky payment), toast desktop only (event สำคัญ + ภายใน 45s). ลบ IIFE wrapper + `window.__notifInit` guard (module เรียกครั้งเดียวอยู่แล้ว). ไม่มี `onclick=""` → ไม่ต้อง window expose. ใช้ Font Awesome (ไม่ใช้ lucide → ไม่ import จาก `core/icons.js`). |
| `pages/ot-admin.js` | vehicle_cost.html (Phase 4.8, 2026-05-16) — ES module (`type="module"`); imports `initIcons` จาก `core/icons.js`. Edit modal slot row builder + recompute, print receipt (single/all), filter auto-submit. Pure data-attr delegation (no `onclick=""`) → ไม่ต้อง window expose. ลบ IIFE + DOMContentLoaded wrapper (module deferred). **Phase 5.10 (2026-05-18):** เพิ่ม `buildRateRow()` builder สำหรับ rate config modal (`#rateConfigContainer` + `#addRateBtn`) ที่ include `cfg_day[]` `<select>` (ทุกวัน + TH_DAYS 7 ตัว, default ""=NULL) + delegated click handler `.js-rate-remove` (existing row [`data-cfg-id`] → confirm + append hidden `<input name="cfg_delete[]" value="...">` to form + grey out via `.is-removed`; new row → drop DOM); call `initIcons()` after append. |
| `pages/approver-inbox.js` | approver_inbox.html (Phase 4.1, 2026-05-15) — ES module (`type="module"`); functions: `switchTab()`, `showRejectForm(id)`, `hideRejectForm(id)`, chevron rotation. Exposes to `window.*` สำหรับ legacy `onclick=""` ใน template |
| `pages/driver-home.js` | driver_home.html (Phase 4.4, 2026-05-15) — ES module (`type="module"`); imports `initIcons` จาก `core/icons.js`. Tab switching (`.driver-tabs__btn`), accordion (`[data-card-toggle]`), `actual_start/end` timestamp on submit (`[data-driver-form] [data-actual-now]`), upload zone visual feedback (`[data-upload-input]`). ไม่มี `onclick=""` → ไม่ต้อง window expose. |
| `pages/budget-admin.js` | budget_manage.html (Phase 4.10, 2026-05-16; Phase 5.8, 2026-05-18) — ES module (`type="module"`); imports `initIcons`/`bindModalReinit` จาก `core/icons.js`. Dropdown action menus (data-attr delegation), 3 modal data-bind wirings (topUp/adjust/refund), refund row picker. **Phase 5.8:** ย้าย `setBudgetModal` `show.bs.modal` handler จาก inline `<script>` ใน template → module (swap datalist central/dept, approver pre-select, retitle+relabel, `approverRow.hidden` toggle, `initIcons(modal)` after innerHTML swap). ลบ IIFE wrapper + local `initLucide` + duplicate lucide CDN จาก template. ไม่มี `onclick=""` → ไม่ต้อง window expose. |
| `pages/room.js` | room.html (2026-05-17) — ES module (`type="module"`); imports `initIcons`/`bindModalReinit` จาก `core/icons.js`. Calendar render (vc-scope grid) + mobile list + 3 modal flow (book/edit/detail) + flatpickr (edit modal). `roomKind(room)` → 'small'/'large' จากชื่อห้อง (เล็ก/ใหญ่). Exposes `openEventDetail`/`openEditBookingModal`/`openBookingModal` + `eventDetailModal` getter ไป `window.*` สำหรับ inline `onclick=""` ใน JS-rendered HTML. Pattern ถอดมาจาก `pages/vehicle.js` (ตัด groups/drivers/vehicles ออก). |
| `pages/manage-fleet.js` | admin_manage_fleet.html (Phase 6.2, 2026-05-17) — plain IIFE (no ES module — uses legacy `defer` script tag + Bootstrap Modal globals). Bind 5 modals on `show.bs.modal` (edit/delete vehicle, edit/delete driver, vehicle history), fetch `/api/vehicle/{id}/history` (loading/content swap). Refresh Lucide icons on `shown.bs.modal` (catches dynamically inserted icon `<i>`). |
| `pages/dashboard.js` | dashboard.html (2026-05-17) — ES module (`type="module"`); imports `initIcons`/`bindModalReinit` จาก `core/icons.js`. Live clock (`#liveClock`) — `Intl.DateTimeFormat` th-TH weekday+date + time, refresh 30s. ไม่มี `onclick=""` → ไม่ต้อง window expose. |
| `main.js` | login.html only — **kept legacy** (jQuery IIFE form validation, ไม่มี shared modules ให้ใช้, isolated page) |

**Reference page:** `/design-system` (superadmin) → [design_system_reference.html](../../app/templates/design_system_reference.html)

**Icon libraries:**
- Font Awesome (`fa-solid` / `fa-regular`) — global default ใช้อยู่ทุกหน้า
- Lucide Icons (line, stroke 1.5px) — โหลด global ใน `_header.html` (CDN unpkg). ใช้: `<i data-lucide="fuel"></i>`. หลัง DOM update เรียก `window.lucide.createIcons()`. ใช้สำหรับ Vercel namespace (Phase 2 fuel page)

---

> Patterns ที่ซ้ำซาก (booking status, telegram, in-app notify, budget mutation) → ดู CLAUDE.md § Gotchas
> Maintenance Protocol → ดู CLAUDE.md
