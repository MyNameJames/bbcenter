# Mileage Redesign Plan — handoff (executor: Sonnet high)

> ⚠️ **redesign เสร็จแล้ว — doc นี้เป็น historical record** (mockup ต้นฉบับ `mockup-mileage.html` + `components-gallery.html` ลบออกจาก repo แล้ว 2026-07-19; design ปัจจุบัน → `design_guideline.md`)
> **เป้าหมายเดิม:** apply design จาก `mockup-mileage.html` (ลบแล้ว) → `app/templates/vehicle/admin/vehicle_mileage.html`
> **reference:** `design_guideline.md §12-13` · living gallery `/dev/components`
> **สถานะ components.css:** อัปเดตแล้ว (modal responsive 500px+sheet · bb_daterange Stripe-style) — **อย่า re-add**

---

## Scope & Constraints

- redesign **UI หน้าเดียว** (`vehicle_mileage.html`) — ไม่แตะ route/query/business logic
- **คง JS contract ครบ**: ทุก id, `data-*` บน `<tr>`, ฟังก์ชัน (`openMileage/goEditEnd/clearSelection/runFilter/bindResults/calcAllSummary` ฯลฯ)
- `_shared/sidebar.html` + `_shared/header.html` = partial กลาง **ห้ามแก้ในงานนี้** (sidebar/topbar ใน mockup เป็นแค่ context)
- CSS ใหม่ทั้งหมด → `vehicle/css/vehicle_mileage.css` prefix `mlg-` · ห้ามเพิ่ม token นอก `--bb-*`
- vehicle domain: อ่าน `vehicle_product_spec.md` ก่อน (North Star) — งานนี้เป็น UI ล้วน ไม่กระทบ demand data

## Decisions (locked)

1. **tooltip เติมน้ำมัน = เพิ่ม backend field** — controller ใส่ odometer ตอนเติมลง row dict (เช่น `r.refuel_odo`) → tooltip "เติมน้ำมัน · เลขไมล์ NNN"
2. **mobile = dual-render** — loop `display_rows` ซ้ำเป็น card list, toggle ด้วย CSS (table >768px · card ≤768px)
3. **budget_label (ส่วนกลาง/กอง/ตัว) หายจากตาราง = รับได้** — ผู้จอง sub-line เหลือ `budget_sub` อย่างเดียว

---

## 🧩 Component reuse audit — ใช้ของเดิมให้หมด

**มีแล้ว (reuse ตรงๆ · หลายตัวหน้านี้ใช้อยู่แล้ว):**

| UI element | component | หมายเหตุ |
|---|---|---|
| KPI strip | `.bb-kpi.is-ghost` | ✅ หน้าใช้อยู่แล้ว |
| badge "รอกรอก N" / group +1 | `.bb-badge.is-accent` | ✅ |
| toolbar / card | `.bb-card` + `.bb-card-body` | ✅ |
| status tabs | `.bb-tabs` / `.bb-tab` / `.bb-tab-count` | ✅ ใช้อยู่ |
| search | `.bb-search` | ✅ ใช้อยู่ |
| **date range** | macro `bb_daterange` + `core/js/bb-daterange.js` | ✅ มีแล้ว — แทน va-cal |
| Export / Filter btn | `.bb-btn.is-sec` | ✅ |
| table | macro `bb_table` (shell) + `.bb-table` | ✅ ใช้อยู่ |
| sortable header | `.bb-th.sortable` + `.bb-sort-icon` | ✅ |
| checkbox | `.bb-check-box` | ✅ |
| cell | `.bb-cell-strong/.bb-cell-num/.bb-cell-muted` | ✅ |
| status pill | `.bb-status.is-ok/.is-wr/.is-neutral` + `.bb-dot` | ✅ |
| action / fuel icon | `.bb-icon-btn` | ✅ (fuel = +tint นิดเดียว) |
| pagination | `.bb-pag` / `.bb-pg` | ✅ |
| empty | `.bb-empty` | ✅ ใช้อยู่ |
| modal shell | `.bb-modal*` + `.bb-modal-sheet-handle` (responsive) | ✅ เพิ่งอัปเดต — desktop 500px / mobile sheet |
| field/label/input | `.bb-field/.bb-label/.bb-input/.bb-hint` | ✅ ใช้อยู่ |

**component กลางใหม่ (promote เข้า `components.css` แล้ว 2026-06-29 — ใช้ `bb-*` ไม่มี `mlg-`):**

| component กลาง | ใช้ที่ |
|---|---|
| `.bb-tabs-scroll` (wrapper) | tabs ไม่บีบ (desktop+mobile) |
| `.bb-table-scroll` (wrapper) + `.bb-table{min-width;nowrap}` | table ไม่บีบ col |
| `.bb-subtext` | sub-line ในเซลล์ / caption |
| `.bb-tooltip` + `.bb-tooltip-pop` | tooltip เติมน้ำมัน |
| `.bb-summary` + `-top/-name/-meta/-line` | trip-summary (mobile card + modal body) |
| `.bb-section-head` + `.bb-section-title` | หัวข้อ section ใน modal |
| `.bb-field-head` + `.bb-field-meta` | label + meta (ไมล์ออกล่าสุด) |
| `.bb-stats` + `.bb-stat-label/-val` | stats inline (mobile card) |
| `.bb-statbar` + `-item/-label/-val` | mobile summary 3-up |
| `.bb-icon-btn.is-accent` | fuel icon tint |
| `.bb-card-foot` | card action area |

**auto-calc box:** หน้าเดิมมี `mlg-preview` อยู่แล้ว → reuse/restyle ไม่ต้องสร้างใหม่

> หลัง audit + promote: งานส่วนใหญ่ = **เอา component มาต่อ** ไม่เขียน CSS ใหม่เลย (ของกลางครบแล้ว). page-CSS `mlg-*` ที่เหลือ = แทบไม่มี — ถ้าจำเป็นจริงค่อยใช้ `mlg-` เฉพาะที่ไม่ generic

---

## Phases

### Phase 0 — เตรียม
- อ่าน spec + เปิด mockup/gallery เทียบ · ย้าย `m-*` (mockup) → `mlg-*` ใน `vehicle_mileage.css`

### Phase 1 — Toolbar (เสี่ยงสุด = date)
- tabs: ครอบ `.mlg-tabs-wrap` (JS เดิมไม่แตะ)
- date: แทน `#dateRangeGroup`(va-cal×2) + `#datePreset` → `{{ bb_daterange(start=f.date_start, end=f.date_end, preset=..., align='right') }}`
  - ⚠️ JS: ลบ `bindDateRangePickers()`+`bindDatePreset()` → `el.addEventListener('bb-daterange:change', e => runFilter())` · `e.detail.{start,end}` เซ็ต hidden `date_start/date_end` แล้ว · preset `all`/ว่าง = เคลียร์ `show_all`
  - โหลด `core/js/bb-daterange.js` (module) แทน va-cal
- export/adv/search: คงเดิม

### Phase 2 — Table 14→11 col (+ Phase 4 data-* คู่กัน)
- ครอบ `.mlg-xscroll` + `min-width:1080px` + `nowrap`
- column spec ใหม่: ลบ "งบ" · แยก รถ(ทะเบียน)|คนขับ(ชื่อต้น) · รวม ไมล์ออก→กลับ(+ระยะ sub) · เติมน้ำมัน=icon+tooltip · ผู้จอง sub=`budget_sub`
- **คง data-\* เดิมครบ** + **เพิ่ม** `data-plate` `data-driver` `data-budget-sub` `data-refuel-odo` (modal+tooltip ใช้)
- tooltip: `mlg-tip` ครอบ `bb-icon-btn` + `mlg-tip-pop` ("เติมน้ำมัน · เลขไมล์ {{ r.refuel_odo }}")
- **backend:** controller เพิ่ม `refuel_odo` ใน row dict (เลขไมล์ตอนเติม จาก FuelBill ใน trip) — แตะ backend จุดเดียว

### Phase 3 — Mobile card list (dual-render)
- loop `display_rows` ซ้ำ → `.bb-card` + `mlg-trip-sum` (ผู้เดินทาง|budget_sub / ทะเบียน(คนขับ)→ปลายทาง) + `mlg-trip-stats` + foot ปุ่มเปลี่ยนตามสถานะ (รอกรอก→กรอกไมล์ออก·is-pri / รอกลับ→กรอกไมล์กลับ·is-pri / ครบ→แก้ไข·is-sec)
- toggle: table `d-none d-md-block` / card-list `d-md-none` (หรือ `@media`)
- card foot ปุ่มเรียก `openMileage()` เดียวกัน (element มี data-booking)
- mobile summary = `mlg-ph-kpi` (3-up)

### Phase 4 — Modal (Bootstrap shell → bb-modal look + responsive)
- **คง Bootstrap modal JS** — restyle `.modal-content`→`.bb-modal` look + เพิ่ม `.bb-modal-sheet-handle` + bottom-sheet `@media ≤576px` (เลียน components.css)
- header: `#mmBookingId` sub = "BK-NNN · HH:MM–HH:MM"
- body: แทน `mlg-info-grid` ด้วย **`mlg-trip-sum`** (pattern เดียวกับ card)
  - ⚠️ JS `openMileage()`: เปลี่ยนจาก set `mmUser/mmTime/mmVehicle/mmDest` → set field trip-sum (name/budget_sub/plate/driver/dest) จาก data-* ใหม่
- state title → `mlg-state-head` + meta "ไมล์ออกล่าสุด {{data-odo-start}}"
- คง id ภายในครบ (`formStart/formEnd/stateComplete` + 28 id)
- reuse `mlg-preview` (auto-calc) เดิม

### Phase 5 — Cleanup + Verify + Sync
- ลบ CSS ตาย: `va-cal*`, `mlg-datepick*`, `mlg-date-*`, `vc-filter-select` (ถ้าเลิกใช้), `mlg-info-*`
- offline: jinja compile + `node --check vehicle_mileage.js`
- user เทส browser: date filter · sort · select-all · search · modal 3 states · mobile card · responsive
- **Maintenance Protocol:** sync `INDEX_ui.md` (mileage entry) · `design_guideline §12` (bb-modal responsive + bb_daterange preset) · spawn `checker`

---

## ลำดับ + ความเสี่ยง
1. **Phase 2+4 คู่กัน** (data-* เชื่อมกัน) →
2. **Phase 1** (date — เสี่ยงสุด, แยกเทสหนัก) →
3. **Phase 3** (mobile) →
4. **Phase 5**

**risk สูง:** date filter rewire (va-cal→bb_daterange event) · modal info→trip-sum (JS populate) · คง data-* ครบ
**backend แตะจุดเดียว:** `refuel_odo` ใน row dict (decision 1)
