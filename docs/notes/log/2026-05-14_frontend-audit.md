# Frontend Audit — Phase 0 Output

> **Status:** Complete
> **Created:** 2026-05-14
> **Scope:** Audit ก่อนเริ่ม Phase 1 ตาม [frontend-architecture-plan.md](2026-05-14_frontend-architecture-plan.md) § 9
> **Method:** 3 Explore agents (CSS / Template / JS) — read-only

---

## TL;DR — สถานการณ์จริง

| Metric | Number |
|---|---|
| CSS files | 12 (3 ว่าง/Bootstrap-only) |
| `--ds-*` token refs | 482 ใน 7 ไฟล์ |
| `--vc-*` token refs | 943 ใน 7 ไฟล์ |
| Mixed-namespace files | 2 (`repair.css`, `vehicle_cost.css`) |
| JS files | 9 — total ~3,500 LoC |
| Biggest JS | `vehicle_admin.js` 1,139 LoC, 53 global functions |
| Inline `<script>` violations | 17 (in 14 templates) — 11 feature logic, 6 data injection (legit) |
| Inline `style=""` instances | ~490 (~55 = display toggle ที่แปลงเป็น class ได้ทันที) |
| Duplicate markup hotspots | badges 39 · form-group 39+ · KPI 8 · filter bar 2 |
| Existing macros | `_modal.html` (มีอยู่แต่ใช้ไม่ครบ — vehicle-modal-* 4 ไฟล์ไม่ใช้) |

---

## 1. CSS Audit

### 1.1 Token usage by file

| File | `--ds-*` | `--vc-*` | สถานะ |
|---|---:|---:|---|
| design-system.css | 309 | 75 | Token source (Section 1 = `--ds-*`, Section 8 = `--vc-*`) |
| fuel_admin.css | 0 | 334 | Vercel primitives — เป็น dependency ของ admin pages |
| vehicle_admin.css | 0 | 171 | **ต้อง load หลัง fuel_admin.css** |
| driver.css | 0 | 163 | Pure `--vc-*` |
| budget_admin.css | 0 | 102 | Depend on fuel_admin.css |
| vehicle_cost.css | 2 | 84 | **Mixed** (เกือบทั้งหมด `--vc-*`) |
| notification.css | 90 | 0 | Pure `--ds-*` |
| vehicle.css | 42 | 0 | Pure `--ds-*` legacy |
| repair.css | 16 | 14 | **Mixed** — เกือบเท่ากัน เสี่ยงสับสน |
| main.css, util.css, mileage_admin.css | 0 | 0 | Bootstrap-only / empty |

### 1.2 Token equivalence map (`--ds-*` → `--vc-*`)

**Identical** (rename safe):
- `--ds-space-*` ≡ `--vc-space-*` (4–48px ครบ)
- `--ds-radius-*` ≡ `--vc-radius-*`
- `--ds-text-*` (typography scale) ≈ `--vc-text-*`

**Same value, different name** (alias direct):
- `--ds-bg-page` (#FAFAFA) = `--vc-bg-subtle`
- `--ds-bg-surface` (#FFFFFF) = `--vc-bg`
- `--ds-text-heading` (#09090B) ≈ `--vc-fg` (#000000)

**Different value** (ต้อง decide — เก็บค่าไหน):
- `--ds-accent` (#4F46E5 Indigo) ↔ ❌ ไม่มี vc equivalent (vc primary = #000)
- `--ds-border` (#EFEFEF) vs `--vc-border` (#EAEAEA) — ห่าง 5 unit
- `--ds-border-strong` (#E4E4E7) vs `--vc-border-hover` (#999999) — ต่างมาก ใช้คนละ semantic
- `--ds-success` (#16A34A) vs `--vc-green` (#0F9D58)
- `--ds-warning` (#D97706) vs `--vc-amber` (#F5A623)
- `--ds-danger` (#DC2626) vs `--vc-red` (#EE0000)
- `--ds-text-body` (#3F3F46) vs `--vc-fg-muted` (#666666)

### 1.3 Coupling bugs

| Issue | File | Severity |
|---|---|---|
| **Load order wrong** | `vehicle_admin.html` loads `vehicle_admin.css` BEFORE `fuel_admin.css` — depends on `.vc-kpi-cell` defined in fuel_admin | 🔴 High (works by accident) |
| **Duplicate stylesheet** | `driver_home.html` loads `design-system.css` ซ้ำ 2 ครั้ง | 🟡 Medium |
| **Undefined var** | `vehicle_admin.css:77` references `var(--vc-bg-card)` — never defined | 🟡 Medium (typo for `--vc-bg`?) |
| **Cross-file class deps** | `budget_admin.css`, `vehicle_admin.css` → `fuel_admin.css` (.vc-*) | 🟠 Architecture smell |
| **Mixed namespace per file** | `repair.css` (16 ds + 14 vc) · `vehicle_cost.css` (2 ds + 84 vc) | 🟡 Hard to reason |

### 1.4 Duplicate concept inventory

| Concept | Class variants | Where |
|---|---|---|
| Page header | `.fuel-header`, `.driver-header`, `.cost-header`, `.repair-header`, `.va-page-header`, `.budget-header` | 6 ไฟล์ |
| KPI card | `.vc-kpi-group/cell/label/value`, `.va-kpi-card`, `.ds-stat` | fuel_admin, vehicle_admin, repair, design-system |
| Button | `.ds-btn-*`, `.vc-btn-*`, Bootstrap `.btn` | design-system, fuel_admin |
| Badge | `.ds-badge-*`, `.vc-badge-*`, `.badge-pending/approved/group` | design-system, fuel_admin, vehicle.css |
| Table | `.ds-table`, `.vc-table`, `.vc-table-sm` | design-system, fuel_admin, vehicle.css |
| Form input | `.ds-input/select/textarea`, `.vc-input/select/textarea` | design-system, fuel_admin |
| Empty state | `.ds-empty`, `.vc-empty` | design-system, fuel_admin |
| Modal | `.vc-modal`, `.va-modal-*` | fuel_admin, vehicle_admin |
| Filter bar | `.vc-filter-bar`, `.va-filter-tabs` | fuel_admin, vehicle_admin |

---

## 2. Template Audit

### 2.1 Inline `<script>` violations (17 instances, 14 files)

**Feature logic — ต้อง migrate ไป `.js` (11 violations):**

| File:line | Purpose | Target |
|---|---|---|
| [vehicle/vehicle_history.html:853](../../../app/templates/vehicle/vehicle_history.html#L853) | Live search filter | `features/vehicle/history.js` |
| [vehicle/approver_inbox.html:563](../../../app/templates/vehicle/approver_inbox.html#L563) | Tabs + reject form + chevron | `features/vehicle/approver_inbox.js` |
| [room/room.html:259](../../../app/templates/room/room.html#L259) | Flatpickr + DataTable + FullCalendar | `static/js/room.js` |
| [vehicle/vehicle_edit.html:78](../../../app/templates/vehicle/vehicle_edit.html#L78) | Flatpickr init | `static/js/vehicle_edit.js` |
| [vehicle/vehicle.html:176](../../../app/templates/vehicle/vehicle.html#L176) | Auto-open modal via `?pay=id` | `features/vehicle/index.js` |
| [vehicle/vehicle_calendar.html:100,130](../../../app/templates/vehicle/vehicle_calendar.html#L100) | FullCalendar + mobile toggle | `static/js/vehicle_calendar.js` (+ note: INDEX บอก calendar ลบทิ้งได้) |
| [vehicle/driver_home.html:326](../../../app/templates/vehicle/driver_home.html#L326) | Lucide + tabs + accordion | `static/js/driver_home.js` (มี driver.css อยู่แล้ว) |
| [usermng/manage_users.html:162](../../../app/templates/usermng/manage_users.html#L162) | DataTable + modal pre-fill | `static/js/manage_users.js` |
| [dashboard/dashboard.html:1108](../../../app/templates/dashboard/dashboard.html#L1108) | Live clock | `static/js/dashboard.js` |
| [maintenance/maintenance.html:594](../../../app/templates/maintenance/maintenance.html#L594) | DataTable + accept/close modal | `static/js/maintenance.js` |
| [vehicle/admin/admin_manage_fleet.html:839](../../../app/templates/vehicle/admin/admin_manage_fleet.html#L839) | Edit modal pre-fill | `static/js/admin_manage_fleet.js` |
| [vehicle/admin/budget_personal.html:315](../../../app/templates/vehicle/admin/budget_personal.html#L315) | markPaid/Unpaid AJAX | `static/js/budget_personal.js` |
| [vehicle/admin/budget_manage.html:715](../../../app/templates/vehicle/admin/budget_manage.html#L715) | Modal state sync | `static/js/budget_admin.js` (มีอยู่แล้ว — ย้ายมารวม) |

**Data injection — เก็บไว้ (legit, 6 violations):**

| File:line | Variable | Reason |
|---|---|---|
| vehicle.html:108 | `window.IS_ADMIN`, `EXPENSE_CATEGORIES`, `VEHICLES`, `DRIVERS` | Jinja2 → JS |
| vehicle/admin/mileage_admin.html:673 | `window.MLG_FUEL_PRICE` | Jinja2 → JS |
| vehicle/admin/vehicle_admin.html:425 | `window.BOOKINGS_DATA` | Jinja2 loop → JS |
| auth/login.html:105 | (form/vendor init) | ตรวจอีกครั้ง |

**Standard ที่จะใช้ Phase 5:** ใส่ comment marker `{# Data Injection — required #}` แล้วบังคับว่าไฟล์ template เหลือเฉพาะ data injection block เดียว ตอนท้ายไฟล์

### 2.2 Inline `style=""` (~490 instances)

| Category | Count | Migration path |
|---|---:|---|
| Display toggle (`display:none/flex`) | ~55 | → `.d-none` / `.d-flex` (Bootstrap utility) — **quick win** |
| Color/background `var(--...)` | ~210 | → `.text-*` / `.bg-*` utility |
| Font-size | ~120 | → `.fs-*` utility |
| Layout (padding/margin/width) | ~85 | → Bootstrap spacing utility |
| Border (dashed, custom) | ~20 | → new utility class |
| CSS custom property `--cell-heat` | dynamic | ✅ Legit — heatmap value per row |

**Quick win:** สแกน `style="display:` แล้วแทน `class="d-none"`/`d-flex` ทันที — ไม่เปลี่ยน behavior

### 2.3 Markup duplication (macro candidates)

**Priority order:**

| Macro | Instances | Files | Effort | ROI |
|---|---:|---|---|---|
| `_badge.html` | 39 | dashboard, repair, fuel_admin, budget_manage, mileage_admin, vehicle_cost | Low | 🔴 High |
| `_form_group.html` | 39+ | repair, budget_manage, fuel-modal-*, vehicle_admin, vehicle_cost | Low | 🔴 High |
| `_kpi_card.html` | 8 | repair, budget_personal, mileage_admin, vehicle_admin | Low | 🟡 Medium |
| `_filter_bar.html` | 2 | admin_fuel, mileage_admin | Low | 🟡 Future |
| Use existing `_modal.html` | 4 vehicle-modal-* | vehicle/ | Low | 🟡 Medium |
| `_empty_state.html` | 12 | driver_home, design_system_reference | Low | 🟢 Low |
| `_table_shell.html` | 10+ | repair, dashboard, maintenance, room, manage_users, vehicle/admin/* | Mid | 🟡 Medium |

---

## 3. JS Audit

### 3.1 File inventory

| File | LoC | Functions | Pattern | Loaded by |
|---|---:|---:|---|---|
| **vehicle_admin.js** | **1,139** | **53** | 🔴 Global scope | vehicle_admin.html |
| **vehicle.js** | **790** | **20** | 🔴 Global scope | vehicle.html |
| notification.js | 453 | 18 | ✅ IIFE | _header.html (global) |
| fuel_admin.js | 424 | 18 | ✅ IIFE | admin_fuel.html |
| mileage_admin.js | 279 | 8 | ✅ IIFE | mileage_admin.html |
| ot_admin.js | 213 | 7 | ✅ IIFE | vehicle_cost.html |
| budget_admin.js | 98 | 2 | ✅ IIFE | budget_manage.html |
| repair.js | 79 | 0 | jQuery ready | repair.html |
| main.js | 59 | 3 | jQuery | login.html |

**Insight:** ไฟล์ใหม่ทั้งหมดใช้ IIFE — เฉพาะ `vehicle.js` + `vehicle_admin.js` (ของเก่า) ที่ยัง global scope

### 3.2 Cross-file dependencies + duplicate concerns

**Cross-file global functions (called from inline `onclick=""`):**

| Function | Defined | Called from |
|---|---|---|
| `openEventDetail(id)` | vehicle.js:660 | vehicle_admin.js (9× ใน HTML strings ที่ render) |
| `openEditBookingModal(id)` | vehicle.js:748 | vehicle_admin.js (2×) |
| `openAssignModal(...)` | vehicle_admin.js:670 | inline `onclick` ใน HTML |
| `showToast(msg)` | vehicle_admin.js:1100 | internal (20+ calls) |

**Duplicate concerns (พร้อมแยก `core/`):**

| Concern | Duplicated in | Consolidate to |
|---|---|---|
| `lucide.createIcons()` re-init | fuel_admin:20, ot_admin:86,105, repair:17, vehicle_admin:1130, budget_admin:8-13 (6 places) | `core/icons.js` |
| `bootstrap.Modal` init (mixed `new` vs `getOrCreateInstance`) | vehicle.js:89-92, vehicle_admin.js:718, fuel_admin.js × 4, ot_admin.js:108 | `core/modal.js` |
| `fetch + FormData` wrappers | vehicle_admin (11×), fuel_admin (4×), notification (5×) | `core/http.js` |
| Format helpers (Baht/Num/Money) | vehicle_admin `fmtBaht/fmtNum`, fuel_admin `fmtMoney`, mileage_admin `fmt`, ot_admin `toLocaleString` | `core/format.js` |
| Toast | vehicle_admin:1100 `showToast`, notification:247 own version | `core/toast.js` |
| Form serialization | manual `.value` reads ทุกไฟล์ | `core/form.js` |
| CSRF | ❌ ไม่มี — Flask inject ผ่าน form อย่างเดียว | (ดู Flask CSRF config) |

**Shared window globals (จาก template):**
`BOOKINGS_DATA`, `VEHICLES_DATA`, `DRIVERS_DATA`, `BUDGETS_DATA`, `FUEL_PRICE`/`MLG_FUEL_PRICE`, `SERVER_NOW`, `IS_ADMIN`, `EXPENSE_CATEGORIES`

### 3.3 Decomposition proposal (เฉพาะ 2 ไฟล์ใหญ่)

**`vehicle.js` (790 LoC) →**
- `features/vehicle/calendar.js` (~280 — render, cell click, mobile collapse)
- `features/vehicle/booking-modal.js` (~120 — form validation, flatpickr)
- `features/vehicle/detail-modal.js` (~180 — openEventDetail, group/single logic)
- `features/vehicle/mobile-list.js` (~150 — day view)
- `features/vehicle/event-card.js` (~80 — card rendering)
- `core/vehicle-utils.js` (~constants: TH_MONTHS, STATUS_*)

**`vehicle_admin.js` (1,139 LoC) →**
- `features/vehicle-admin/booking-section.js` (~280 — renderBefore + rows)
- `features/vehicle-admin/grouping.js` (~180 — merge/split UI)
- `features/vehicle-admin/approval-modal.js` (~200 — openAssignModal flow)
- `features/vehicle-admin/vehicle-status.js` (~80 — renderDuring)
- `features/vehicle-admin/trip-summary.js` (~140 — renderAfter)
- `features/vehicle-admin/actions.js` (~120 — revert/swap/repair)
- `core/vehicle-admin-utils.js` (~constants + helpers)

**`fuel_admin.js` (424 LoC) →**
- `features/fuel/bill-manager.js` (~120)
- `features/fuel/reimburse-manager.js` (~100)
- `features/fuel/reserve-modal.js` (~40)
- `features/fuel/price-budget-modals.js` (~50)
- `features/fuel/bill-selection.js` (~50)

---

## 4. Critical Findings (ต้องแก้ก่อน Phase 1)

### 🔴 P0 — Bug ที่มีอยู่ในระบบตอนนี้

1. **CSS load order ผิดใน `vehicle_admin.html`** — load `vehicle_admin.css` ก่อน `fuel_admin.css` แม้ตัวแรก depend on ตัวหลัง (works by cascade accident)
2. **Undefined CSS var** `--vc-bg-card` ที่ `vehicle_admin.css:77` — น่าจะ typo ของ `--vc-bg`
3. **Duplicate stylesheet load** `design-system.css` × 2 ใน `driver_home.html`

### 🟠 P1 — Architectural debt

4. **2 namespace ปะปนใน 2 ไฟล์** (`repair.css`, `vehicle_cost.css`) — Decision per plan: unify ไป `--vc-*` แต่ต้อง map 7 token pairs ที่ค่าต่างกันก่อน (border, success, warning, danger, body text)
5. **No `--vc-accent-indigo`** — ถ้า unify ไป `--vc-*` แต่ Indigo (#4F46E5) ใช้อยู่จริงในระบบเก่า ต้องตัดสินใจ: เก็บเป็น `--vc-accent` หรือเลิกเลย
6. **Inline scripts 11 violations** ใน templates — ผิดกฎ CLAUDE.md
7. **2 global-scope JS files** (`vehicle.js` + `vehicle_admin.js`) คิดเป็น 55% ของ JS ทั้งระบบ — ทุก `onclick=""` ต้อง refactor

### 🟡 P2 — Easy wins

8. **~55 inline `display:none/flex`** → `.d-none`/`.d-flex` (เปลี่ยนเฉยๆ ไม่ break)
9. **Vehicle modals 4 ไฟล์ไม่ใช้ `_modal.html` macro** ทั้งที่มี macro อยู่แล้ว
10. **Lucide re-init 6 places** → core/icons.js

---

## 5. Decisions — **resolved (2026-05-14)**

| # | Decision | **Outcome** |
|---|---|---|
| 1 | `--ds-accent` Indigo เก็บใน `--vc-*` มั้ย? | ✅ **A** — promoted to `--vc-accent` ใน tokens.css Part B (used for focus ring / sidebar active / secondary CTA). `--vc-primary` = pure black ยังเป็น CTA หลัก |
| 2 | Token pairs ที่ค่าต่างเก็บค่าไหน? | ✅ **A** — ใช้ค่า `--vc-*` (Vercel palette) ทั้งหมด · `--ds-*` คงค่าเดิมใน Part A เป็น **frozen legacy** · ห้าม alias / mix · มี migration map ที่ [design_system.md §14](../design_system.md) |
| 3 | Fix bug 3 ตัว ทำตอนไหน? | ✅ **A** — done ใน Phase 0.5 (typo `--vc-bg-card`, duplicate `design-system.css` load, ลบ `vehicle_calendar.html`) |
| 4 | `vehicle_calendar.html` ลบเลย? | ✅ **A** — ลบไปแล้ว Phase 0.5 |
| 5 | Migrate target แรก? | ✅ **A** — เริ่ม `fuel-admin` ตาม plan; Phase 3.1/3.2/3.3 = fuel/vehicle/mileage admin done |

---

## 6. Phase 1 — ✅ done (2026-05-14)

ทำไปแล้ว:
1. ✅ แยก `tokens.css` ออกจาก `design-system.css`
2. ✅ ไม่ alias — `--ds-*` กับ `--vc-*` เป็น separate definitions · เพิ่ม `--vc-accent` Indigo
3. ✅ Fix P0 bugs (load order, typo, duplicate)
4. ✅ ไม่แตะ markup / JS

**Actual:** 1 session per plan
