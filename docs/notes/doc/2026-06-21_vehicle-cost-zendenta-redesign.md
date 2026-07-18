# Spec: Redesign `vehicle_cost.html` → Zendenta layer (2026-06-21)

> **ผู้ทำ:** Sonnet (implementer) · **เป้าหมาย:** ทำให้หน้า `app/templates/vehicle/admin/vehicle_cost.html`
> มี look/feel เหมือน `docs/mockup/zendenta_sales.html`
> **บังคับเดินผ่าน skill `devloop`** (PLAN→GUARD→BUILD→VERIFY→SYNC→CLOSE)
> spec นี้ self-contained — อ่านจบทำได้เลย ไม่ต้องเดา

---

## 0. Context (อ่านก่อน)

หน้านี้ = จัดการค่าล่วงเวลา (OT) ของคนขับรถ: filter ตามสถานะ/ช่วงเดือน, ตารางรายการ OT,
pivot รายเดือน, modal เพิ่ม/แก้/ตั้งอัตรา/ใบเสร็จ

**สถานะ design ปัจจุบัน:** ใช้ design-system รุ่นก่อน Zendenta (`vc-card` `vc-table` `vc-badge` `.cost-summary` custom)
sidebar + header migrate เป็น zen แล้ว (ผ่าน `_shared/`)

**เป้าหมายอารมณ์ (design intent):** "ข้อมูลเด่น chrome เงียบ" — ตารางโปร่งหายใจได้,
ตัวเลขเงิน Manrope หนาเด่น, สถานะ = tint pill นุ่ม, accent `#4059e6` ใช้น้อยจุด, ไม่มีเงา/เส้นหนา

**กฎกลาง:** อ้าง `docs/notes/zendenta_migration.md` + `CLAUDE.md §Zendenta layer`

---

## 1. ⛔ HARD CONSTRAINTS — ห้ามทำเด็ดขาด

1. **ห้ามแตะ backend** — `views/`, `models/`, route, Jinja logic (`{% if %}` `{% for %}` `url_for`), JSON blob `#otCostData`
2. **ห้ามเปลี่ยน/ลบ id และ `data-*` ใดๆ** ที่อยู่ใน §3 (JS เกาะอยู่ — พลาด = หน้าพัง)
3. **ห้ามเปลี่ยนชื่อ class ที่ JS query** (§3) — ถ้าจะเปลี่ยนหน้าตา = **แก้ CSS ของ class เดิม** ไม่ใช่ rename
4. **ห้ามใส่ class ลง `<table>`:** `table-hover` `table-light` `table-dark` `table-striped` `table-bordered` และ **ห้ามใส่ class ที่ `<thead>`** (CSS จัดการผ่าน `.data-table thead th`)
5. **ห้ามใช้ Bootstrap component สำเร็จรูปที่มีสี/เงาของตัวเอง:** `.btn`/`.btn-primary` เปล่า, `.badge` เปล่า, `.nav-tabs`, `.card` — ใช้ zen class แทน (`.btn-zen` `.badge-pill` ฯลฯ)
6. **ห้ามเพิ่ม shadow** (ยกเว้น modal), ห้ามเพิ่ม `--ds-*`, ใช้ `--vc-*` token เท่านั้น
7. **icon = lucide** (`<i data-lucide="...">`) เทา mono — ห้ามเปลี่ยนเป็น Font Awesome
8. content **ไม่ fluid**, พื้น `#fff`

---

## 2. ✅ Zen components ที่มีอยู่แล้ว (ใน `app/static/core/css/main.css` — ใช้ได้เลย ห้ามสร้างซ้ำ)

main.css โหลดผ่าน `_shared/header.html` ทุกหน้า (หลัง design-system.css → override) — หน้านี้ include header แล้ว ใช้ได้ทันที

| class | ใช้ทำ | นิยาม (main.css) |
|---|---|---|
| `.kpi-tile` | icon tile เทา 46px radius 12 + icon mono | L133 |
| `.kpi-num` | เลขใหญ่ Manrope 800 tabular | L145 |
| `.data-table` | ตาราง Zendenta (ใช้คู่ `class="table data-table mb-0"`) | L157 |
| `.badge-pill` + tint | สถานะ pill | L291 |
| `.b-full` เขียว · `.b-unpaid` แดง-ชมพู · `.b-partial` ม่วง · `.b-neutral` เทา · `.b-accent` น้ำเงิน · `.b-warning` ส้ม | tint สถานะ | L303-308 |
| `.zen-tab` / `.zen-tabs` / `.zen-tab-count` | tab underline accent (`.active`) | L314-349 |
| `.zen-search` | search input พื้นเทา ไม่มีกรอบ | L354 |
| `.btn-zen` | ปุ่มหลัก `#4059e6` radius 10 (มีแล้ว!) | L396 |
| `.zen-card` | card หุ้ม (ถ้าต้องการ) | L123 |

**badge mapping (สถานะ OT ปัจจุบัน → tint):**
- จ่ายแล้ว (`vc-badge-success`) → `.badge-pill .b-full`
- ยังไม่จ่าย (`vc-badge-blue`) → `.badge-pill .b-unpaid` (แดง-ชมพู = ต้อง action) **หรือ** `.b-accent` (น้ำเงิน) — เลือก `.b-unpaid` ให้ "ค้างจ่าย" สะดุดตา
- ผู้ใช้จ่ายเอง / ลบแล้ว (`vc-badge-neutral`) → `.badge-pill .b-neutral`

---

## 3. 🔒 JS HOOK INVENTORY — ห้าม rename/ลบ (จาก `app/static/vehicle/js/vehicle_ot.js`)

**id (getElementById):**
```
otCostData costResults costTabs statusInput filterForm exportLink
costFilterBtn costFilterSheet costFilterClear filterBudgetType filterBudgetSub filterBudgetSubWrap
editModalTitle editDriverId editDate editNote editOtForm editSlotsContainer editOtModal
addOtForm addDate addSlotsContainer addOtModal addOtBtn
addRateBtn rateConfigContainer rateConfigForm
printAllBtn receiptPrintBtn receiptHost receiptPreviewCount receiptPreviewModal
```

**class ที่ JS query (querySelector/closest):**
```
.cost-chip   (#costTabs .cost-chip — toggle .is-active)   ← restyle CSS เท่านั้น
.cost-action-more  .cost-action-menu  .cost-menu-toggle
.cost-slot-row  .js-slot-cfg  .js-slot-start  .js-slot-end  .js-slot-hint  .js-slot-remove
.cost-rate-row  .js-rate-remove
.js-cost-action  .budget-date-btn  .budget-date-btn--filled
```

**data-* attributes:**
```
[data-cost-action] [data-cost-menu] [data-status] [data-confirm] [data-col-full]
[data-datepick] [data-datepick-btn] [data-datepick-label] [data-datepick-input]
[data-datepick-pop] [data-datepick-required]
[data-cal-dow] [data-cal-days] [data-cal-title] [data-cal-prev] [data-cal-next] [data-date]
```

**state class (JS toggle — เก็บไว้ ถ้า restyle ต้อง restyle state เดิม):**
```
.is-active  .is-loading  .is-portal  .is-removed  .is-invalid  .is-zero
```

**⚠️ AJAX swap anchor (CRITICAL):** JS fetch หน้าเดิม → swap innerHTML ของ `#costResults`,
แทน `#costTabs` และ `#otCostData` → **โครง 3 ก้อนนี้ต้องคงขอบเขต/​id เดิม** (เนื้อในแก้ได้ เพราะ re-render จาก template เดียวกัน)

---

## 4. Files in scope

| ไฟล์ | ทำอะไร |
|---|---|
| `app/templates/vehicle/admin/vehicle_cost.html` | swap markup presentation (table/badge/header/summary) |
| `app/static/vehicle/css/vehicle_cost.css` | restyle `.cost-chip` → underline, `.cost-summary`(ถ้าเก็บ), slot tint, filter sheet zen |
| `app/static/core/css/main.css` | **เพิ่มเฉพาะ** `.vc-avatar` (+ optional `.btn-zen-outline`) |

**ห้ามแตะ:** `vehicle_ot.js`, `vehicle_admin.css`, `vehicle.css`, `vehicle_fuel.css`, print/receipt CSS (`.cost-print-* .rcpt-* .cost-receipt-*` ใน vehicle_cost.css — เป็น layout ใบเสร็จ)

---

## 5. Section-by-section redesign

### 5.1 `<head>` (L1-18) — ไม่แตะ
main.css โหลดผ่าน header include แล้ว ใช้ zen class ได้เลย

### 5.2 Page header + action buttons (L46-72)
**ปัจจุบัน:** `.cost-header` custom flex + ปุ่ม `vc-btn vc-btn-primary/secondary`
**🔴 จุดสำคัญ — title ซ้ำ:** `_shared/header.html` (topbar) render `<h1>{{ page_title }}</h1>` = "ค่าล่วงเวลา" อยู่แล้ว
แต่ `.cost-header` L50 มี `<h1>ค่าล่วงเวลา</h1>` อีก → **โชว์ชื่อซ้ำ 2 ที่** (zendenta โชว์ที่ topbar เดียว)
**ทำ:**
- **ลบ `<h1>` + `<h6>subtitle` ใน `.cost-header` ทิ้ง** (L49-52) — เหลือเฉพาะแถวปุ่ม action
  - subtitle "อนุมัติ · บันทึกการจ่าย · ออกใบเสร็จคนขับ" ถ้าอยากเก็บ → ย้ายเป็น `page_section` ของ header หรือ drop (เป็น meta ไม่จำเป็น)
- wrapper ปุ่ม → Bootstrap utility: `<div class="d-flex justify-content-end flex-wrap gap-2 mb-4">`
- ปุ่ม **เพิ่ม OT** (`#addOtBtn`) → `class="btn-zen"` (เก็บ id!)
- ปุ่มรอง (พิมพ์ / Excel / ตั้งค่าอัตรา) → `class="btn-zen-outline"` (ดู §6) — เก็บ `#printAllBtn` `#exportLink`
- **ลบ** `.cost-header` `.cost-header-actions` rule ใน vehicle_cost.css (แทนด้วย utility)

### 5.3 Status chips (L74-97) — restyle CSS เท่านั้น (JS เกาะ)
**ห้าม:** rename `.cost-chip` / `.cost-tabs` / `#costTabs` / `data-status` / `.is-active`
**ทำใน vehicle_cost.css:** restyle `.cost-chip` จาก pill → **underline tab** ตาม `.zen-tab`:
```css
.cost-chip {
  border: 0; background: 0; padding: 10px 2px; margin-right: 18px;
  font-size: 14px; font-weight: 600; color: var(--vc-fg-subtle);
  border-bottom: 2px solid transparent; cursor: pointer;
}
.cost-chip:hover { color: var(--vc-fg); }
.cost-chip.is-active { color: var(--vc-accent); border-bottom-color: var(--vc-accent); }
.cost-tabs { display: flex; border-bottom: 1px solid var(--vc-border); margin-bottom: 12px; }
.cost-chip-cnt {           /* นับใน tab — pill เล็ก */
  font-size: 11px; background: #f1f3f7; color: var(--vc-fg-muted);
  border-radius: 99px; padding: 1px 7px; margin-left: 4px;
}
.cost-chip.is-active .cost-chip-cnt { background: var(--vc-accent-light); color: var(--vc-accent); }
```

### 5.4 Filter popover (L99-181) — restyle CSS เท่านั้น
**ห้าม:** แตะ id/`data-*` ใน sheet (cascade JS เกาะ) — `#costFilterBtn #costFilterSheet #filterBudgetType` ฯลฯ
**ทำ:** ปุ่ม `.cost-filter-btn` → ใช้ `btn-zen-outline` look; input ใน sheet ให้ใช้ token zen (radius 10, พื้นเทา `#f6f7f9` ตอน rest) — ปรับใน vehicle_cost.css เท่าที่ทำให้กลมกลืน ไม่ต้องรื้อโครง

### 5.5 Summary → KPI strip (L188-207)
**ปัจจุบัน:** `.cost-summary` (dot + label + value) ใน `vc-card`
**ทำ:** rebuild เป็น **inline KPI strip** (mockup style) — `.cost-summary` ไม่ใช่ JS hook (ปลอดภัย rebuild):
```html
<div class="d-flex align-items-center gap-4 flex-wrap mb-4">
  <div class="d-flex align-items-center gap-3">
    <span class="kpi-tile"><i data-lucide="wallet"></i></span>
    <div>
      <div class="text-muted" style="font-size:13px">ยังไม่จ่าย</div>
      <div class="d-flex align-items-center gap-2">
        <span class="kpi-num vc-mono">฿{{ '{:,.0f}'.format(kpi_unpaid) }}</span>
        <span class="text-muted" style="font-size:12px">{{ counts.unpaid }} รายการ</span>
      </div>
    </div>
  </div>
  <div class="vr"></div>
  <div class="d-flex align-items-center gap-3">
    <span class="kpi-tile"><i data-lucide="circle-check-big"></i></span>
    <div>
      <div class="text-muted" style="font-size:13px">จ่ายแล้ว</div>
      <div class="d-flex align-items-center gap-2">
        <span class="kpi-num vc-mono">฿{{ '{:,.0f}'.format(kpi_paid) }}</span>
        <span class="text-muted" style="font-size:12px">{{ counts.paid }} รายการ</span>
      </div>
    </div>
  </div>
</div>
```
(เก็บ Jinja `kpi_unpaid`/`kpi_paid`/`counts` เดิม) → ลบ `.cost-summary*` CSS ที่ไม่ใช้แล้ว
> **`.vr` caveat:** Bootstrap `.vr` ใช้ `currentColor opacity .25` → อาจเข้มเกิน. ถ้าเส้นคั่นดูหนา ให้ override
> `.vr{ color: var(--vc-border); opacity: 1; }` หรือใช้ `<div class="border-start align-self-stretch">` แทน (แบบ mockup L142)

### 5.6 Rate reference strip (L209-226) — แตะน้อย
คงโครง `.cost-rate-ref` ปรับสี/spacing ให้ muted กลมกลืน (quiet meta strip) — ไม่ต้องรื้อ

### 5.7 Main OT table (L228-354) — หัวใจของงาน
**ทำใน template:**
- `<table class="vc-table mb-0" id="otTable">` → `<table class="table data-table mb-0" id="otTable">` (เก็บ id)
- คอลัมน์ **คนขับ** เพิ่ม avatar initials:
```html
<td>
  <span class="d-flex align-items-center gap-2">
    <span class="vc-avatar">{{ (ot.driver.name if ot.driver else '?')[0] }}</span>
    <span>
      <span class="vc-td-strong d-block">{{ ot.driver.name if ot.driver else '—' }}</span>
      {% if ot.driver and ot.driver.user and ot.driver.user.phone %}
      <span class="vc-td-muted" style="font-size:var(--vc-text-xs)">{{ ot.driver.user.phone }}</span>
      {% endif %}
    </span>
  </span>
</td>
```
- **badge สถานะ** (L286-296) → `.badge-pill .b-*` (mapping §2). ตัด `.vc-badge-dot` ออก:
```html
{% if ot.is_deleted %}        <span class="badge-pill b-neutral">ลบแล้ว</span>
{% elif ot.no_receipt %}      <span class="badge-pill b-neutral">ผู้ใช้จ่ายเอง</span>
{% elif ot.status == 'paid' %}<span class="badge-pill b-full">จ่ายแล้ว</span>
{% else %}                    <span class="badge-pill b-unpaid">ยังไม่จ่าย</span>{% endif %}
```
- ยอดเงิน `<td class="vc-td-num vc-td-strong vc-mono">` คงไว้ (ตัวเลข Manrope ตรง DNA แล้ว)
- **action group + overflow menu** (L297-348) — `.cost-action-*` JS เกาะ → **ห้าม rename** แค่ปล่อยให้ icon mono ตามเดิม (เป็น lucide แล้ว)
- **slot tag** (L274-283): `.cost-slot-morning/evening/night` remap สีให้เข้า tint family (ดู §6)

### 5.8 Pivot table (L371-432)
- `<table class="vc-table mb-0">` → `<table class="table data-table mb-0">`
- คอลัมน์ sticky `.vc-pivot-td-sticky` — **เก็บไว้** (`position:sticky` Bootstrap ไม่มี) ; ตรวจว่า bg ยังตรง (`var(--vc-bg)`)
- header card (L373-377) layout → utility `d-flex align-items-center justify-content-between p-3 border-bottom`

### 5.9 Expense table (L434-473) — เสร็จแล้ว
ใช้ `class="table data-table mb-0"` อยู่แล้ว → **verify อย่างเดียว** ไม่ต้องแก้

### 5.10 Modals ×4 (L480-781) — restyle chrome (เก็บ JS hook ทั้งหมด)
**⚠️ mockup ไม่มี modal** → derive จาก DNA (no-shadow ยกเว้น modal OK, hairline, btn-zen, radius, icon-tile header)
**ห้ามแตะ:** `[data-datepick]`+ลูก (calendar), `#editSlotsContainer #addSlotsContainer #rateConfigContainer`,
`.cost-slot-head .cost-total-box .cost-rate-row[data-cfg-id]` + name arrays (`cfg_label[]` ฯลฯ),
`.js-rate-remove #addRateBtn`, `#receiptHost #receiptPrintBtn`, `.modal`/`data-bs-*` (bootstrap modal JS)
**ทำ (chrome เท่านั้น):**
- header icon (`<i data-lucide>` ใน `.modal-title`) → ครอบด้วย tile mono **ขนาด 40px** (ใช้ `.repair-modal-icon` pattern: 40×40 radius-sm `var(--vc-icon-bg)` + `var(--vc-icon)`) — **ห้ามใช้ `.kpi-tile`** (46px ใหญ่ไปสำหรับ modal)
- ปุ่ม footer `vc-btn-primary` → `btn-zen` ; `vc-btn-secondary` คงไว้ (หรือ `btn-zen-outline`)
- `.modal-header`/`.modal-footer` divider = hairline `var(--vc-border)`, radius modal = 11px
- input ใน modal (`.vc-input .vc-select`) — คงไว้ (design-system) ไม่ต้องรื้อ; เน้นแค่ปุ่ม+header ให้เป็น zen

---

## 6. CSS ใหม่ที่ต้องเพิ่ม

### 6a. `.vc-avatar` → เพิ่มใน `main.css` (component กลาง — ยังไม่มี)
```css
/* ── Avatar (initials circle) — Zendenta row identity ── */
.vc-avatar {
  width: 30px; height: 30px; flex-shrink: 0;
  border-radius: 50%;
  background: var(--vc-accent-light); color: var(--vc-accent);
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--vc-font-mono); font-weight: 700; font-size: 12px;
}
```

### 6b. `.btn-zen-outline` → เพิ่มใน `main.css` (ปุ่มรอง ตาม mockup L168)
```css
/* ── Button — Zendenta secondary (outline) ── */
.btn-zen-outline {
  display: inline-flex; align-items: center; gap: 8px;
  background: #fff; color: var(--vc-fg-muted);
  border: 1px solid var(--vc-border); border-radius: 10px;
  font-size: 14px; font-weight: 600; padding: 8px 14px;
}
.btn-zen-outline:hover { background: #f6f7f9; color: var(--vc-fg); }
.btn-zen-outline svg { width: 16px; height: 16px; }
```

### 6c. slot tag tint remap → ใน `vehicle_cost.css`
ปรับ `.cost-slot-morning/evening/night` ให้ใช้ tint family เดียวกับ badge-pill (พื้นอ่อน + text เฉดเดียว):
เช้า → `.b-warning` (ส้มอ่อน) · เย็น/หัวค่ำ → `.b-partial` (ม่วง) · ดึก → `.b-accent` (น้ำเงิน) — ใช้สีจาก main.css L303-308

---

## 7. ✅ Bootstrap-first — ใช้ตรงไหน / ตรงไหนต้อง custom (สรุปกฎ)

**ใช้ Bootstrap utility (เป็นหลักทั้งหน้า):**
spacing/margin (`mb-4 p-3 gap-3 pt-2`) · flex (`d-flex align-items-center justify-content-between flex-wrap`) ·
เส้นคั่น KPI (`.vr`) · ตาราง responsive (`.table-responsive`) · จัดเลข (`text-end text-muted small`)

**ต้อง custom (Bootstrap ทำให้ไม่เหมือน target) — ใช้ zen class:**

| จุด | Bootstrap ล้วนจะผิดยังไง | ใช้แทน |
|---|---|---|
| ตาราง | `.table` มี border รอบ + hover เทา + padding แน่น | `class="table data-table mb-0"` (ห้าม modifier) |
| badge | `.badge bg-*` ทึบ ตัวหนา | `.badge-pill .b-*` |
| chips/tabs | `.nav-tabs` กล่องมีกรอบ | restyle `.cost-chip` → underline (§5.3) |
| ปุ่มหลัก | `.btn-primary` โทน/​radius ต่าง | `.btn-zen` |
| ปุ่มรอง | `.btn-outline-*` สี/radius ต่าง | `.btn-zen-outline` (§6b) |
| เลข KPI | ไม่มี utility | `.kpi-num .vc-mono` |
| icon tile | ไม่มี | `.kpi-tile` |
| avatar | ไม่มี | `.vc-avatar` (§6a) |
| search | `.form-control` ขาวมีกรอบ | `.zen-search` |
| sticky col (pivot) | ไม่มี | `.vc-pivot-td-sticky` (คงไว้) |

---

## 8. VERIFY (preview tool ใช้ไม่ได้ — server :5001 เป็น user process)
ผู้ใช้เทสใน browser เอง → ส่ง checklist ให้ผู้ใช้กด:
- [ ] filter chips สลับสถานะได้ (AJAX swap ไม่ค้าง) + นับเลขถูก
- [ ] popover ตัวกรอง เปิด/ปิด + cascade งบ type→sub ทำงาน
- [ ] ปุ่ม เพิ่ม OT / แก้ไข / mark paid / overflow menu / ลบ-กู้คืน ทำงานครบ
- [ ] modal เพิ่ม/แก้ OT: datepicker เปิดได้, เพิ่ม/ลบ slot, ยอดรวมคำนวณ, บันทึกได้
- [ ] modal ตั้งอัตรา: เพิ่ม/ลบ band, บันทึก
- [ ] ใบเสร็จ preview + พิมพ์ (print layout ต้องไม่เพี้ยน)
- [ ] ตาราง/badge/KPI/avatar หน้าตาตรง mockup, ไม่มีเงา, ไม่มี border แปลก
- [ ] responsive: ตาราง scroll-x บนจอแคบ

## 9. SYNC docs (Maintenance Protocol — ทำก่อน CLOSE)
- `docs/notes/INDEX_ui.md` §Templates + §Design System — note cost migrate เป็น zen
- `docs/notes/zendenta_migration.md` — ตาราง section: เพิ่ม `.vc-avatar` ✅, `.btn-zen-outline` ✅, แก้ `.btn-zen` ⬜→✅ (มีอยู่แล้ว), mark `vehicle_cost` ✅ ใน "ลำดับ migrate"
- ถ้าเพิ่ม class ใน main.css → update ตาราง "main.css สถานะ section"

## 10. ลำดับทำ
```
0. AUDIT — อ่าน vehicle_cost.css + vehicle_ot.js ยืนยัน hook (§3) ก่อนแตะ
1. main.css: + .vc-avatar + .btn-zen-outline
2. header/ปุ่ม → utility + btn-zen (§5.2)
3. summary → kpi strip (§5.5)
4. status chips → restyle underline (§5.3)
5. main table → data-table + avatar + badge-pill + slot tint (§5.7, §6c)
6. pivot → data-table + sticky (§5.8)
7. filter popover restyle (§5.4)
8. modals ×4 → zen chrome (§5.10)
9. VERIFY (§8) → SYNC (§9)
```

**Golden rule:** ถ้าไม่แน่ใจว่า class/id ไหน JS เกาะ → **restyle CSS ของ class เดิม อย่า rename** เด็ดขาด

---

## 11. 🎨 Design review notes (senior UX/UI) — judgment calls

ประเด็นที่กระทบ "ความเหมือน zendenta" — default = recommendation ของ designer (ปรับได้):

1. **Title ซ้ำ → ลบที่ cost-header** (บังคับ, §5.2) — นี่คือ bug ความสะอาด ไม่ใช่ option

2. **สี badge "ยังไม่จ่าย" = แดง-ชมพู (`.b-unpaid`)** — _ตรง zendenta (UNPAID = แดง-ชมพู)_ แต่ในหน้า finance ที่มีหลายแถวค้างจ่าย แดงทั้งคอลัมน์ = "alarm fatigue"
   - **Default:** เก็บ `.b-unpaid` (faithful) — ✅ แนะนำ ถ้าเป้าหมายคือ "เหมือน zendenta" เป๊ะ
   - **ทางเลือก:** ใช้ `.b-accent` (น้ำเงิน-กลาง) สำหรับ "ยังไม่จ่าย" ปกติ แล้วเก็บแดงไว้เฉพาะ "เกินกำหนด" — เงียบกว่า แต่ออกจาก mockup

3. **slot tag 3 สี (เช้า/เย็น/ดึก)** — ขัดหลัก "chrome เงียบ" เล็กน้อย (สีเยอะในคอลัมน์เดียว)
   - **Default:** เก็บ 3 tint แต่ทำให้อ่อนลง (tint family §6c) — ✅ เพราะสี = ข้อมูล (ช่วงเวลา) ผู้ใช้ใช้จริง
   - ถ้าอยากเงียบสุด → neutral หมด + เขียนเวลากำกับ (เสียการสแกนช่วงด้วยสี)

4. **Avatar คนขับ** — ใน ledger เรียงตามวันที่ คนขับซ้ำหลายแถว → วงกลม initial ซ้ำ อาจเป็น noise มากกว่าช่วยสแกน
   - **Default:** เก็บ avatar (zendenta DNA, ช่วยจับ "ใคร" เร็ว) — ✅ แต่ถ้ารู้สึกรก ตัดได้ไม่กระทบ JS

5. **ไม่มี free-text search** — zendenta toolbar มีช่องค้นหา หน้านี้มีแค่ chips + filter popover
   - **Default:** ไม่เพิ่มรอบนี้ (ต้องเขียน JS filter ใหม่ = scope creep) → ใส่ future_features.md
   - ถ้าต้องการ → `.zen-search` + client filter แบบ `vehicle_mileage.js applySearch`

6. **Rate reference strip** (§5.6) — band เหนือ table เพิ่มความหนาแน่นบนสุด
   - **Default:** เก็บแต่ทำ muted (quiet meta) — ✅

7. **Empty state `.vc-empty`** (L357-364) — align ให้ icon เป็น tile mono เฉดเดียวกับ `.kpi-tile` เพื่อ consistency

> ข้อ 2/4/5 = ตัดสินใจเชิง product/taste — ถ้าไม่ระบุ Sonnet ใช้ **Default (faithful to zendenta)** ทุกข้อ
