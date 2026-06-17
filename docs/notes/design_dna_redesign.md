# DNA Redesign — Migration Spec (2026-06-17)

> **Reference page (ต้นแบบ):** [`vehicle/admin/vehicle_budget.html`](../../app/templates/vehicle/admin/vehicle_budget.html) + [`vehicle/css/vehicle_budget.css`](../../app/static/vehicle/css/vehicle_budget.css) §22
> Token canonical → [design_system.md](design_system.md) · skill → [bbcenter-design](../../.claude/skills/bbcenter-design/SKILL.md)

DNA ใหม่ (Zendenta-clean) — ใช้ migrate หน้าอื่นให้กลมกลืน. **ทำทีละหน้า** ตาม checklist §4

---

## 1. Binary rules (เปลี่ยนจาก DNA เดิม)

| มิติ | เก่า | **ใหม่** |
|---|---|---|
| accent/primary | `#014198` | **`#4059e6`** (`--vc-accent`/`--vc-primary`) |
| text หลัก | `#1C2E4A` | **`#162334`** (`--vc-fg`) |
| border | `#E5E7EB` | **`#f0f0f0`** (`--vc-border`) |
| radius | 4–8px | **6px** ทุกที่ (`--vc-radius-sm` = bootstrap `rounded-2`) |
| shadow | border-only | **border-only** (เหมือนเดิม) — เงาเฉพาะ modal |
| icon | สี/เทาปน | **monochrome `#9999b0`** (`--vc-icon`) บนวงกลม/tile `#f0f0f0` (`--vc-icon-bg`) — ห้ามหลากสี (ยกเว้น status pill) |
| ตัวเลข | Sarabun | **Manrope** ผ่าน `.vc-mono` (`--vc-font-mono`) — ต้องโหลด Manrope ใน `<head>` |
| ข้อความไทย | Sarabun | Sarabun (เหมือนเดิม) |
| layout/spacing | custom CSS | **Bootstrap utility** (`d-flex`/`justify-content-between`/`gap-2`/`pt-3`/...) เท่าที่ทำได้ |

**โหลด Manrope** (ต่อท้าย Sarabun ใน head ของหน้า):
```html
<link href="https://fonts.googleapis.com/css2?family=Sarabun:...&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
```
> หน้าที่ยังไม่โหลด Manrope → `.vc-mono` fallback Sarabun อัตโนมัติ (ไม่พัง). roll-out ทั้ง site = add link ทุก head (future)

---

## 2. Component cookbook (copy-paste)

### KPI strip (เลขใหญ่ซ้าย + bar 3 สี + legend ขวา)
icon = วงกลม monochrome · เลข = `.vc-mono` (Manrope) · bar segment สี: ส่วนกลาง=accent / กอง=amber / คงเหลือ=green
```html
<span class="budget-summary-icon"><i data-lucide="wallet" class="vc-icon-sm"></i></span>
<h1 class="budget-summary-used vc-mono">฿127,840</h1>
<span class="budget-summary-seg budget-summary-seg--central" style="width:43%"></span>
```

### Tabbar + toolbar บรรทัดเดียว (sticky)
- `.budget-tabbar` = `display:flex; align-items:flex-end; flex-wrap:nowrap; position:sticky; top:56px; z-index:4; background:var(--vc-bg)` (ใต้ `.vrc-topbar` 56px)
- tabs = `flex:1 1 auto; min-width:0; overflow-x:auto; overflow-y:hidden` (ย่อ+scroll, กัน jitter)
- toolbar = `flex:0 0 auto` (pin ขวา ไม่ตกบรรทัด)
```html
<div class="budget-tabbar d-flex align-items-end justify-content-between gap-3">
  <nav class="budget-tabs">…<button class="budget-tab is-active">…</button>…</nav>
  <div class="budget-toolbar d-flex align-items-center gap-2">…ปุ่ม secondary + primary…</div>
</div>
```
tab active = `color:var(--vc-accent)` + `border-bottom:2px solid var(--vc-accent)`

### Card (`.bcard`) + section divider dot
```html
<div class="bcard-section-head">
  <span class="bcard-section-dot bcard-section-dot--on"></span>   <!-- เขียว = ใช้งานอยู่ -->
  <span class="bcard-section-label">ใช้งานอยู่</span>
  <span class="bcard-section-count">4</span>
  <span class="bcard-section-line"></span>                       <!-- เส้นยาวเต็ม -->
</div>
<div class="bcard-grid">                                          <!-- auto-fill minmax(280px,1fr) -->
  <div class="bcard">
    <div class="bcard-head d-flex align-items-start gap-3">
      <span class="bcard-icon"><i data-lucide="users" class="vc-icon-sm"></i></span>
      <div class="bcard-id flex-grow-1">
        <div class="bcard-name">งานบริหารงานทั่วไป</div>
        <div class="bcard-amount vc-mono">฿12,508<span class="bcard-amount-cap">/55,000</span>
          <span class="bcard-pct is-ok">(22%)</span></div>     <!-- is-ok/is-warn/is-danger -->
      </div>
      <div class="vc-dropdown bcard-menu">⋯ menu</div>
    </div>
    <div class="bcard-divider"></div>
    <div class="bcard-meta">…ตั้งแต่วันที่ … – … · ผู้อนุมัติ…</div>
  </div>
</div>
```
- **inactive card** = `.bcard.bcard--off` (bg `--vc-sidebar-bg` + dashed border + font disable tone) + ปุ่ม `.bcard-activate`
- dot ไม่ได้ใช้งาน = `.bcard-section-dot--off` (กลวง border `--vc-fg-subtle`)

### Table (เมื่อ data เป็นรายการ ไม่ใช่ก้อน — เช่น ส่วนตัว)
- wrap = `border:1px solid var(--vc-border); border-radius:6px`
- thead bg = `#fafbfc` (`--vc-bg-subtle`), label uppercase เทา, `data-sortable-table` + `<th data-sort="text|num">` กดเรียง (JS `initSortableTables`)
- status = pill สี semantic, ⋯ menu ท้ายแถว

### Badge pill (status เก็บสี semantic)
ปกติ=green / เกือบเต็ม=amber / เกินงบ=red / ปิด=neutral — bg tint อ่อน + text เข้มเฉดเดียวกัน (`.vc-badge vc-badge-{success|warning|danger|neutral}`)

### Button
- primary = `.vc-btn.vc-btn-primary` (bg `--vc-accent`, text ขาว)
- secondary = `.vc-btn.vc-btn-secondary` (text `--vc-accent`, border `--vc-border`, bg ขาว)

### Icon tile
วงกลม/สี่เหลี่ยมมน `background:var(--vc-icon-bg); color:var(--vc-icon)` + `<i data-lucide>` ข้างใน — **monochrome เท่านั้น**

### Topbar page-title (global 2026-06-17)
หัวเรื่องหน้าอยู่ใน topbar ตัวใหญ่ `<h1 class="vrc-topbar-title">` (19px/700 `--vc-fg`) แทน breadcrumb — มาจาก `page_title` Jinja var (แบบ Zendenta). ตั้งใน `_shared/header.html` (shared) จึงทุกหน้าได้พร้อมกัน. `.vrc-topbar-crumb*` เดิมถูกลบ

### KPI strip "ใช้/ทั้งหมด" (`.fuel-kpi`, admin_fuel)
icon tile ซ้าย + label uppercase + เลข Manrope `.vc-mono` (ใช้ `<span class="fuel-kpi-cap">/ total`) + subtext "% · คงเหลือ". layout = bootstrap `.row.row-cols-md-3.g-0`, คั่น cell ด้วย `border-right`

---

## 3. Token ใหม่ที่เพิ่ม (tokens.css)
`--vc-icon` `#9999b0` · `--vc-icon-bg` `#f0f0f0` · `--vc-sidebar-bg` `#fafbfc` · `--vc-sidebar-active` `#e6ecfa` · `--vc-font-mono` = `'Manrope','Sarabun'`

---

## 4. Per-page migration checklist
ทำทีละหน้า — ห้าม big-bang:
```
- [ ] โหลด Manrope ใน <head> + เปลี่ยนตัวเลขเป็น .vc-mono
- [ ] radius ทุกที่ → 6px (--vc-radius-sm / rounded-2)
- [ ] ลบ box-shadow (ยกเว้น modal) → border #f0f0f0
- [ ] icon → monochrome --vc-icon บน tile --vc-icon-bg (ยกเว้น status pill)
- [ ] layout/spacing → bootstrap utility แทน custom CSS เท่าที่ทำได้
- [ ] sidebar bg/active → --vc-sidebar-bg / --vc-sidebar-active (ถ้าหน้านั้นมี)
- [ ] data ก้อน → card (.bcard) · data รายการ → table (header #fafbfc + sortable)
- [ ] เช็ก token global ไม่ทำให้หน้าเพี้ยน (accent/fg/border เปลี่ยนทั้งระบบแล้ว)
- [ ] sync INDEX_ui.md + design_system.md (Maintenance Protocol)
```

> **เหลือทำ (rollout):** หน้าอื่นยังเป็น DNA ผสม — token global เปลี่ยนสีให้แล้ว แต่ layout (card/tab/icon) ยังเป็นแบบเก่า. ค่อย migrate ทีละหน้าตาม checklist. `bbcenter-design` skill ยังชี้ `admin_fuel.html` เป็น reference เก่า — ควรอัปเดตชี้ `vehicle_budget.html` เมื่อ migrate หลายหน้าแล้ว
>
> **migrated 2026-06-17:** `admin_fuel.html` — 3-KPI strip `.fuel-kpi` (icon tile + Manrope + ใช้/ทั้งหมด), table flat. **Global:** topbar breadcrumb → page-title (`.vrc-topbar-title`) + Manrope load ทำที่ `header.html` แล้ว → กระทบทุกหน้าพร้อมกัน
