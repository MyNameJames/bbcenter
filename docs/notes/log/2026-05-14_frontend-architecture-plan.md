# Frontend Architecture Plan — BBCenter V2

> **Status:** Planning (in-progress)
> **Created:** 2026-05-14
> **Owner:** James + Claude (Senior Frontend Architect mode)
> **Goal:** ปรับ Flask + Jinja + Bootstrap 5 stack ปัจจุบันให้ Modular, Maintainable, Scalable โดย**ไม่เปลี่ยน stack**

---

## 1. Executive Summary

| ประเด็น | สรุป |
|---|---|
| Stack | คงเดิม: Flask + Jinja2 + Bootstrap 5 + Vanilla JS |
| Build tool | **ไม่ใช้** — ES modules + CSS `@import` (Flask serve static ตรง) |
| Namespace | **Unify ไป `--vc-*` ทั้งหมด** — retire `--ds-*` หลัง migrate เสร็จ |
| JS migration | **Parallel** — คงไฟล์เก่า + สร้าง `features/` ขนาน, migrate ทีละไฟล์ |
| Phasing | 5 phase, ทำตามลำดับ, ห้าม big-bang |

---

## 2. Pain Points + Root Cause

| Pain | Root cause |
|---|---|
| CSS ซ้ำ/ขัด | 2 namespace ปนกัน (`--ds-*` Indigo + `--vc-*` Black) · per-page CSS ข้าม import (`vehicle_admin.css` → `fuel_admin.css`) |
| JS ก้อนใหญ่ | `vehicle.js` รวมทุก modal · function global · ไม่มี module system |
| Template ซ้ำ | KPI / filter / table / modal shell **copy-paste** ทุกหน้า · Jinja macro ใช้ไม่เต็ม |
| ไม่มี standard | ไม่มี component library · naming convention ไม่ชัด · icon mix (FA + Lucide) |

---

## 3. Target Architecture — 4 Layer

```
┌───────────────────────────────────────────────────────┐
│ LAYER 1 — TOKENS  (static/css/tokens.css)             │
│   --vc-* (canonical)  ·  --ds-* (legacy, frozen)      │
└────────────────────┬──────────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────────┐
│ LAYER 2 — BASE  (static/css/base/)                    │
│   reset · typography · layout (app-shell/sidebar)     │
└────────────────────┬──────────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────────┐
│ LAYER 3 — COMPONENTS                                  │
│   CSS: static/css/components/{card,button,badge,kpi,  │
│        table,form,modal,filter,empty,pill,icon,toast} │
│   Jinja: templates/_components/{kpi,filter_bar,       │
│          table_shell,modal_shell,badge,empty_state}   │
│   JS: static/js/core/{http,modal,toast,icons,form,    │
│       format}                                          │
└────────────────────┬──────────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────────┐
│ LAYER 4 — PAGES  (compose L3, page-specific only)     │
│   CSS: static/css/pages/{vehicle,vehicle-admin,fuel-  │
│        admin,repair,driver,mileage-admin,ot}.css      │
│   Templates: templates/{module}/...                   │
│   JS: static/js/features/{vehicle,vehicle-admin,...}/ │
│       + static/js/pages/{page}.js (entry)             │
└───────────────────────────────────────────────────────┘
```

**Dependency rule:** L4 → L3 → L2 → L1 (ขาขึ้นเท่านั้น, ห้ามวนกลับ, ห้าม L4 → L4)

---

## 4. Folder Structure (target)

### CSS
```
app/static/css/
├── tokens.css                ← --vc-* canonical + --ds-* legacy (frozen)
├── main.css                  ← @import ทุก base + components
│
├── base/
│   ├── reset.css
│   ├── typography.css
│   └── layout.css
│
├── components/
│   ├── card.css
│   ├── button.css
│   ├── badge.css
│   ├── kpi.css
│   ├── table.css
│   ├── form.css
│   ├── modal.css
│   ├── filter.css
│   ├── empty.css
│   ├── pill.css
│   ├── icon.css
│   └── toast.css
│
└── pages/
    ├── vehicle.css
    ├── vehicle-admin.css
    ├── fuel-admin.css
    ├── repair.css
    ├── driver.css
    ├── mileage-admin.css
    └── ot.css
```

### JS
```
app/static/js/
├── core/
│   ├── http.js               fetch + CSRF + error
│   ├── modal.js              open/close + lucide re-init
│   ├── toast.js
│   ├── icons.js              lucide.createIcons() wrapper
│   ├── form.js               serialize + validate
│   └── format.js             number/date/currency Thai
│
├── features/
│   ├── vehicle/
│   │   ├── index.js          entry
│   │   ├── booking.js
│   │   ├── calendar.js
│   │   ├── detail.js
│   │   └── edit.js
│   ├── vehicle-admin/
│   ├── fuel-admin/
│   ├── mileage-admin/
│   ├── repair/
│   ├── driver/
│   ├── ot-admin/
│   └── notification/
│
└── pages/
    ├── vehicle.js            import 'features/vehicle/index.js'
    ├── vehicle-admin.js
    └── ...
```

### Templates
```
app/templates/
├── _base.html                ← <html><head> + slot
├── _components/              ← Jinja macros (reusable)
│   ├── kpi.html
│   ├── filter_bar.html
│   ├── table_shell.html
│   ├── modal_shell.html
│   ├── badge.html
│   └── empty_state.html
├── _sidebar.html             (เดิม)
├── _header.html              (เดิม)
└── {module}/                 (เดิม — compose macros)
```

---

## 5. Naming Convention

| Layer | Pattern | ตัวอย่าง |
|---|---|---|
| Token | `--vc-{role}-{variant}` | `--vc-primary`, `--vc-border-strong` |
| Component (BEM) | `.vc-{block}__{element}--{mod}` | `.vc-card__head--sticky` |
| Page override | `.{page}-{custom}` | `.driver-cta`, `.va-week-nav` |
| Utility | `.vc-{prop}-{val}` | `.vc-mono`, `.vc-icon-sm` |
| JS state | `.is-{state}` | `.is-open`, `.is-active` (JS toggle, CSS react) |
| JS hook | `data-{action}` | `data-modal="bill"`, `data-tab="today"` |

**JS-CSS contract:**
- JS อ่าน DOM ผ่าน `data-*` เท่านั้น (ห้าม `.vc-*`)
- CSS react state ผ่าน `.is-*` (JS toggle)

---

## 6. Separation of Concerns — 3 กฎเหล็ก

1. **Template ไม่มี inline `<script>`** (ขยายกฎ vehicle modal เดิมให้ครอบทุกหน้า)
2. **Template ไม่มี inline `style=""`** (ตาม repair.html refactor 2026-05-14)
3. **CSS ไม่ select `[data-*]` ที่ JS เปลี่ยน** — JS toggle `.is-*` แทน

---

## 7. Component Library (Layer 3 spec)

### Atoms (CSS only)
| Component | File | Variant |
|---|---|---|
| button | `components/button.css` | primary/secondary/ghost/danger · sm/md/lg |
| badge | `components/badge.css` | success/warning/danger/info/neutral/accent |
| pill | `components/pill.css` | waiting/ontrip/done/upcoming (driver flow) |
| icon | `components/icon.css` | sm/md/lg (Lucide stroke 1.5) |

### Molecules (CSS + Jinja macro)
| Component | CSS | Macro |
|---|---|---|
| KPI card | `components/kpi.css` | `_components/kpi.html` → `{{ kpi.card(label, value, hint, icon, tone) }}` |
| Filter bar | `components/filter.css` | `_components/filter_bar.html` → `{{ fb.bar(filters) }}` |
| Table shell | `components/table.css` | `_components/table_shell.html` → `{{ ts.wrap(title, body) }}` |
| Modal shell | `components/modal.css` | `_components/modal_shell.html` → `{{ ms.open(id, title) }}` |
| Empty state | `components/empty.css` | `_components/empty_state.html` → `{{ e.show(icon, title, desc) }}` |
| Form group | `components/form.css` | `_components/form.html` → `{{ f.text(name, label, ...) }}` |

### Core JS modules
| Module | API |
|---|---|
| `core/http.js` | `get(url, params)`, `post(url, data)`, `del(url)` — auto CSRF + JSON parse + error toast |
| `core/modal.js` | `open(id)`, `close(id)`, auto `lucide.createIcons()` on `shown.bs.modal` |
| `core/toast.js` | `success(msg)`, `error(msg)`, `info(msg)` |
| `core/icons.js` | `initIcons(scope=document)` — wrapper รอบ `lucide.createIcons()` |
| `core/form.js` | `serialize(form)`, `validate(form, rules)` |
| `core/format.js` | `thb(n)`, `km(n)`, `date(d)`, `time(d)` (Thai BE year) |

---

## 8. Migration Roadmap — 5 Phase

| Phase | งาน | Risk | Estimate | Status |
|---|---|---|---|---|
| **0. Audit** | Map `--ds-*`/`--vc-*` usage · list duplicate markup · spot CSS coupling | Low | 1 session | ✅ Done (2026-05-14) — [audit](2026-05-14_frontend-audit.md) |
| **0.5. P0 bug fixes** | typo `--vc-bg-card` · duplicate `design-system.css` load · ลบ `vehicle_calendar.html` dead route | Low | 1 session | ✅ Done (2026-05-14) |
| **1. Token unify** | สร้าง `tokens.css` แยก · ย้าย `--ds-*` + `--vc-*` ไปไฟล์เดียว · เพิ่ม `--vc-accent` (Indigo) | Low | 1 session | ✅ Done (2026-05-14) |
| **2. Component library** | สร้าง 8 macro + 8 component CSS · เพิ่มเข้า `/design-system` reference · ยังไม่บังคับใช้ | Low | 2-3 sessions | ⏳ Next |
| **3. Migrate pages** | ทีละหน้า: `fuel-admin` → `vehicle-admin` → `mileage-admin` → `repair` → `driver` → `vehicle` → `ot` | Mid (regress risk) | 7 sessions × 1 page | — |
| **4. JS modularize** | ทีละ feature: แตก `vehicle.js` → `features/vehicle/*.js` ใช้ ES modules · `<script type="module">` | Mid | 6-7 sessions | — |
| **5. Cleanup** | ลบ `--ds-*` · ลบ CSS coupling เก่า · ลบ inline `style`/`<script>` ที่เหลือ · เพิ่ม lint rule | Low | 1-2 sessions | — |

**Order rationale:**
- Phase 0-1: ไม่เสี่ยง (audit + backward compat alias)
- Phase 2: เพิ่มของใหม่ ไม่แตะของเก่า
- Phase 3: เลือก `fuel-admin` ก่อนเพราะใหม่สุด + อ้างอิงเป็น `vc-*` อยู่แล้ว (ง่ายสุด) จากนั้นไล่ตาม dependency
- Phase 4: หลัง CSS เสถียร JS modularize ปลอดภัย
- Phase 5: cleanup เมื่อแน่ใจว่าไม่มี usage ของเก่าหลงเหลือ

---

## 9. Phase 0 — Audit Checklist

ก่อนเริ่ม Phase 1 ต้องได้ output:

### 9.1 Token usage
- [x] List ทุกไฟล์ที่อ้าง `--ds-*` (CSS + inline + JS) — see [audit log §1.1](2026-05-14_frontend-audit.md)
- [x] List ทุกไฟล์ที่อ้าง `--vc-*`
- [x] Mapping — see [design_system.md §14](../design_system.md) migration cheatsheet
- [x] **Decision (2026-05-14):** `--ds-*` และ `--vc-*` คงเป็น **separate definitions** ใน tokens.css (ไม่ alias). docs ทุกตัวบอก "use `--vc-*` only in new code"; Phase 5 cleanup ลบ Part A เลย

### 9.2 CSS coupling
- [ ] List per-page CSS · ดู `@import` หรือ class ที่ depend ข้ามไฟล์
- [ ] Map: page → CSS files loaded · spot duplicate
- [ ] Mark page CSS ที่ใช้ Vercel namespace แล้ว (พร้อม migrate ก่อน)

### 9.3 Template duplication
- [ ] Grep KPI card markup ทั้งหมด · count variants
- [ ] Grep filter bar markup
- [ ] Grep table shell markup
- [ ] Grep modal structure
- [ ] Output: candidate macro list + arg signature

### 9.4 JS structure
- [ ] List ทุก JS file + LoC + function count
- [ ] Spot global variables / global event listeners
- [ ] Identify cross-file dependency (zero now? hidden by globals?)
- [ ] Per-feature plan: `vehicle.js` → break into N modules

### 9.5 Inline violations
- [ ] Grep `<script>` ใน templates (excluding `_header.html`)
- [ ] Grep `style="..."` ใน templates
- [ ] Output: cleanup TODO list (Phase 5)

**Audit ทำผ่าน Explore agent** (token-efficient, isolated context)

---

## 10. Example — Before/After

### KPI Card

**Before** (`mileage_admin.html`):
```html
<div class="va-kpi-card">
  <div class="va-kpi-label">บันทึกเดือนนี้</div>
  <div class="va-kpi-value vc-mono">128</div>
  <div class="va-kpi-hint">รายการ</div>
</div>
```

**After** (macro):
```jinja
{% import '_components/kpi.html' as kpi %}
{{ kpi.card(label="บันทึกเดือนนี้", value=128, hint="รายการ", icon="clipboard-list") }}
```

**Macro definition** (`templates/_components/kpi.html`):
```jinja
{% macro card(label, value, hint=None, icon=None, tone='default') %}
<div class="vc-kpi-card vc-kpi-card--{{ tone }}">
  {% if icon %}<i data-lucide="{{ icon }}" class="vc-icon-sm"></i>{% endif %}
  <div class="vc-kpi-card__label">{{ label }}</div>
  <div class="vc-kpi-card__value vc-mono">{{ value }}</div>
  {% if hint %}<div class="vc-kpi-card__hint">{{ hint }}</div>{% endif %}
</div>
{% endmacro %}
```

### JS feature module

**Before** (`vehicle.js` line 660):
```js
function openEventDetail(eventId) { /* 200 lines */ }
```

**After** (`features/vehicle/detail.js`):
```js
import { open as openModal } from '../../core/modal.js';
import { get } from '../../core/http.js';

export async function openEventDetail(eventId) {
  const data = await get(`/api/vehicle/booking/${eventId}`);
  // render then:
  openModal('eventDetailModal');
}
```

Page entry (`pages/vehicle.js`):
```js
import { openEventDetail } from '../features/vehicle/detail.js';
window.openEventDetail = openEventDetail; // ระหว่าง migrate (Phase 4)
```

---

## 11. Decisions Locked (2026-05-14)

| Item | Decision |
|---|---|
| Build tool | ไม่ใช้ — ES modules + CSS `@import` |
| Namespace | Unify `--vc-*` (retire `--ds-*` ใน Phase 5) |
| JS migration | Parallel (เก่า + ใหม่ co-exist ระหว่าง migrate) |
| Naming | BEM-lite `.vc-{block}__{el}--{mod}` + `.is-{state}` + `data-{action}` |
| Icon | Lucide เป็นหลัก, Font Awesome legacy ทยอยเลิก (Phase 3) |
| First migrate target | `fuel-admin` (Vercel namespace อยู่แล้ว, ง่ายสุด) |

---

## 12. Open Questions (ต้อง decide ก่อนเข้า Phase 2)

- [ ] Lucide vs Font Awesome — เก็บทั้งคู่หรือเลิก FA? (กระทบ token cost + bundle)
- [ ] Sarabun + Geist Mono — เก็บทั้ง 2 font หรือเลือกอันเดียว?
- [ ] CSS `@import` vs `<link>` หลายไฟล์ — performance trade-off (HTTP/2 ok แต่ FCP)
- [ ] Lint tool — เพิ่ม `stylelint` + `prettier` หรือไม่? (ขัด no-build policy?)
- [ ] Macro naming — `{{ kpi.card() }}` หรือ `{{ c.kpi_card() }}` (centralized)?

---

## 13. Success Metrics

| Metric | Before | Target (after Phase 5) |
|---|---|---|
| CSS files loaded per page | 3-5 | 2 (`main.css` + `pages/{page}.css`) |
| Duplicate markup (KPI/filter/table) | 7+ instances | 1 macro × 7 calls |
| JS file size (`vehicle.js`) | ~1900 lines | <300 lines/module × 4-5 modules |
| Inline `<script>` in templates | unknown count | 0 |
| Inline `style=""` in templates | unknown count | 0 |
| Namespace count | 2 (`--ds-` + `--vc-`) | 1 (`--vc-`) |

---

## 14. Out of Scope

- Migration ไป SPA (React/Vue) — ไม่ทำ
- Server-side rendering library อื่นๆ (Astro, Eleventy) — ไม่ทำ
- Backend refactor (`vehicle_view.py` 1900 lines) — แยก plan ต่างหาก
- Test framework (Cypress, Playwright) — แยก plan ต่างหาก

---

## 15. Next Step

✅ Phase 0 done → see [2026-05-14_frontend-audit.md](2026-05-14_frontend-audit.md)
✅ Phase 0.5 done — 3 P0 bug fixes + ลบ `vehicle_calendar.html` + dead route
✅ Phase 1 done — `tokens.css` split out (937→718 lines ใน design-system.css), เพิ่ม `--vc-accent` (Indigo) ใน Vercel namespace

✅ Phase 2 done (2026-05-14) — Component Library:
- `app/static/css/components/` 8 ไฟล์: `kpi.css`, `filter_bar.css`, `badge.css`, `pill.css`, `empty_state.css`, `form_group.css`, `table_shell.css`, `modal_shell.css`
- `app/templates/_components/` 7 macros ใหม่: `kpi.html`, `filter_bar.html`, `badge.html`, `pill.html`, `empty_state.html`, `form_group.html`, `table_shell.html` (modal มีอยู่แล้ว: `_modal.html`)
- `design-system.css` @import chain → tokens.css + components/*.css (1 entry point, 8 child loads)
- ย้าย KPI strip (93–175) + filter bar (982–1050) จาก `fuel_admin.css` ไป `components/kpi.css` + `components/filter_bar.css` — ลด `fuel_admin.css` 1,220 → 1,059 lines
- ย้าย KPI 6-cell variant + tone--purple/warn จาก `budget_admin.css` ไป `components/kpi.css` — ลด 24 lines
- เหลือ `repair.css` กับ extension `.vc-kpi-group.repair-kpi-5` (page-specific layout) — ไม่ย้าย
- ยังไม่บังคับ migrate page templates → Phase 3

**Phase 3 — Migrate pages:**

✅ Phase 3.1 done (2026-05-14) — fuel-admin + skill alignment:
- พบ Phase 2 macros ใช้ BEM (`vc-badge--success`, `vc-empty__title`) แต่ production templates + `/bbcenter-design` skill ใช้ flat (`vc-badge-success`, `vc-empty-title`) → 2 vocab parallel กัน
- **Decision: align macros + component CSS → flat vocab** (skill = canonical truth, แก้ macro/CSS ปลอดภัยกว่าแก้ template visual)
- แก้ `components/badge.css` → flat tones `-neutral/-warning/-blue/-success/-danger` + `.vc-badge-dot` + `.vc-badge-xs`
- แก้ `components/empty_state.css` → flat `.vc-empty-icon/-title/-desc` + `--compact`, ลบ dashed border (ใช้ผ่าน lucide icon-circle pattern แทน)
- แก้ macros: `badge.html` (new `dot=True` flag, lucide icons), `empty_state.html` (lucide default + `desc` แทน `hint`), `kpi.html` (lucide default, `icon_kind='fa'` opt-in)
- ลบ duplicate `.vc-badge*` (lines 339–392) + `.vc-empty*` (lines 395–433) จาก `fuel_admin.css` — รวมแล้วลดอีก ~95 lines
- migrate `admin_fuel.html` 2 empty-state blocks → `empty_state` macro (1 with caller for CTA, 1 plain)
- **เก็บ KPI/filter/pivot ใน `admin_fuel.html` เป็น raw HTML** — page นี้ยังเป็น canonical reference สำหรับ `/bbcenter-design` skill workflow §5.1 (copy fuel → new page); macro action="…" inline HTML ทำให้ readability แย่ลง
- update `/bbcenter-design` SKILL.md → เพิ่ม §2.0 "Macro shorthand (optional)" + macro inventory table + revision note ใน §6 self-check #6

✅ Phase 3.2 done (2026-05-14) — vehicle-admin:
- ตัว template ส่วนใหญ่ JS-driven → ไม่มี macro migration value (KPI cells มี `<span id>` สำหรับ JS inject, empty states render ผ่าน JS innerHTML)
- **Real Phase 3 wins:** ลบ HEX violations + unify badge/empty vocab กับ skill
- `vehicle_admin.css`: ลบ `.bl-badge` + `.badge-pending/-approver/-approved/-rejected/-cancel/-group` (6 HEX colors) + `.bl-empty` → ใช้ `components/badge.css` + `components/empty_state.css` แทน
- `vehicle_admin.js`: update `STATUS_BADGE` map → `vc-badge-{warning|blue|success|danger} vc-badge-dot`; 4 innerHTML spots → `vc-badge ${sb.cls}` / `vc-badge-solid vc-badge-dot` ("งานรวม") / `vc-badge-xs` (sub-item nested) / `vc-empty` + `vc-empty-icon/-title` + lucide (2 empty states + lucide.createIcons() เรียก)
- เก็บ `.bl-selected` + `.bl-notify-selected` (bulk-action states) เป็น page-specific และเปลี่ยน hardcoded `#EFF6FF` → `var(--vc-blue-bg)` token
- Re-add `.vc-badge-solid` ใน `components/badge.css` (เคยลบใน Phase 3.1) สำหรับ emphasis "X งานรวม"
- CSS link order: FA + bootstrap-icons มีอยู่แล้ว ไม่ต้องแก้
- Cross-page impact: `.badge-*` classes ยังคงอยู่ใน `vehicle.css` (user-facing page) + `approver_inbox.html` (inline `<style>`) — out of scope รอ Phase 3.3 / 3.4

✅ Phase 3.3 done (2026-05-14) — mileage-admin:
- Template (`mileage_admin.html`) แต่เดิม migrate ไป `vc-*` ครบแล้วใน 2026-05-13 (KPI/filter/table/badge/empty) — งาน Phase 3 จึงเป็น CSS cleanup + inline HEX
- `mileage_admin.css` stripped 1095 → ~35 lines:
  - **ลบ ~30 dead class blocks:** `.mlg-page-header/-kpi-row/-kpi-card/-kpi-label/-kpi-value*/-kpi-unit/-kpi-sub/-btn-ghost/-btn-primary/-btn-export/-missing-pill/-panel-pill/-badge-complete/-badge-partial/-badge-none/-month-current-pill/-panel/-panel-header*/-breakdown-desktop/-breakdown-mobile/-breakdown-table/-bd-cell/-col-total/-bd-total-row/-month-pager/-pager-btn/-pager-label/-month-page*/-month-list/-month-row*/-mr-name/-mr-plate/-filter*/-summary/-summary-mode/-dot/-summary-selected/-summary-clear/-table/-col-check/-col-id/-num/-edit-btn/-empty/-empty-title/-empty-sub/-modal-eyebrow` + duplicate `ds-alert*` (มี global ใน design-system.css ตั้งแต่บรรทัด 601)
  - **ลบ modal/state styling ส่วนใหญ่** (`.mlg-modal`, `.mlg-info-grid`, `.mlg-info-item`, `.mlg-state-title`, `.mlg-summary-box/-green/-green-bold`, `.mlg-preview*`, `.mlg-timestamp-box`, `.mlg-refuel-box` bg-amber) — template inline `var(--vc-*)` ครบทุกค่า, page-level CSS ซ้ำซ้อน
  - **เก็บ page-only:** `.mlg-row` (transition), `.mlg-row-check` (cursor+disabled state), `.mlg-col-dest` (truncate 150px), `.mlg-complete-row` (modal summary divider, tokenized), `.mlg-refuel-box .form-check` (reset margin), responsive `.mlg-info-grid` mobile
- `mileage_admin.html` inline HEX: `#DC2626` → `var(--vc-red)` (3 จุด — required asterisks + error message), `var(--ds-accent)` → `var(--vc-fg)` (1 จุด — manual cost emphasis)
- ผลลัพธ์: page inherits `vc-modal/vc-table/vc-card/vc-filter-bar/vc-kpi/vc-badge/vc-empty` จาก `fuel_admin.css` + `components/` ครบ; ไม่มี HEX/shadow violations เหลือใน mileage page

✅ Phase 3.7 done (2026-05-15) — ot (vehicle_cost):
- `vehicle_cost.css`: แก้ `--ds-text-2xl/sm` → `--vc-text-*` (2 violations); HEX print section (`#09090B/#71717A/#3F3F46/#E4E4E7`) → `var(--vc-fg/fg-subtle/fg-muted/border)`; เพิ่ม `.cost-action-group`
- `vehicle_cost.html`: ลบ `style="width:20px;height:20px;"` icon; `style="display:inline;"` ×3 → `.d-inline`; `style="display:inline-flex;gap:4px;"` → `.cost-action-group`
- ไม่มี JS violations (ot_admin.js เป็น IIFE + data-* hooks อยู่แล้ว; print receipt JS inline styles เป็น edge case รอ Phase 5)

**Phase 3.8+ — pages ที่เหลือ (next):**
- approver-inbox
- ใช้ macros อย่างน้อยที่ empty states + เลือก KPI/filter macros ตามความเหมาะสม
- ลบ duplicate CSS ใน per-page files ตามที่ component CSS coverage แล้ว
- `approver_inbox.html` มี inline `<style>` + `.badge-approved/-rejected` — needs badge vocab unification
- `vehicle.css`/`vehicle.js` (user-facing booking list) ยังใช้ `.badge-*` family — unify ทีหลัง
- update reference page ใหม่ — เพิ่ม component playground
