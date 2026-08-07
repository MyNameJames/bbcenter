# Mockup — vehicle_cost.html (UE shell proposal)

**วันที่:** 2026-08-06
**สถานะ:** in-progress

## เป้าหมาย
สร้าง standalone mockup (`app/static/core/mockup-vehicle-cost.html`) proposal layout สำหรับ redesign
`app/templates/vehicle/admin/vehicle_cost.html` ให้ตรง UE shell (`_base_ue.html` + `bb-*`) เหมือนหน้าที่
migrate ไปแล้ว (`vehicle_mileage.html`, `vehicle_fleet.html`, `vehicle_admin.html`) — ยังไม่แตะไฟล์จริง
ตาม convention `redesign_migration_pattern.md` §"mockup แยกไฟล์ทำตอนมี concept ใหม่ที่ยังไม่มีโค้ดรองรับ"
(bulk batch-pay ยังไม่เคยมี UI ในระบบ)

Component ที่ demo: `tab2` (status tabs) · `ue-chip`/`ue-chip-dd` (toolbar filter) · `bb-table` +
`bb-check-box` (รายการ OT เลือกได้หลายแถว) · selection-aware summary strip (pattern จาก
`vehicle_mileage.html` `#summaryStrip`) · bulk action bar (บันทึกการจ่าย/พิมพ์ใบเสร็จ/ย้ายจ่ายเอง)

## การตัดสินใจ
- ใช้ token/class จริงจาก `components.css`/`ue.css` (copy ค่าเข้าไฟล์ standalone ตรงๆ) ไม่ประดิษฐ์ class ใหม่
- ไม่รวม `ot_pivot`/"OT แยกตามประเภทงาน" section เดิมเข้า mockup — ของเดิมสองส่วนนี้เสนอแยกเป็น tab/section
  รองทีหลัง ไม่ยัดหน้าเดียว (ตัดสินใจระหว่างคุยกับผู้ใช้ก่อนเข้า BUILD)
- ยังไม่ implement bulk-pay backend — mockup มีแค่ front-end demo (checkbox toggle → summary/action bar เปลี่ยน)

## ไฟล์ที่แก้ไข
- `app/static/core/mockup-vehicle-cost.html` (ใหม่ — standalone, ไม่ผูก app)
- `app/templates/vehicle/admin/vehicle_cost.html` (real migration — Step 0-1-2, 2026-08-06)

## Progress — Real migration (2026-08-06, หลัง mockup approve)
ทำตาม `redesign_migration_pattern.md`:
- **Step 0:** grep `{% include %}` → เจอแค่ `_shared/sidebar.html` + `_shared/header.html` (ทั้งคู่ถูกลบตอน
  migrate) ไม่มี partial อื่นที่ share กับหน้าอื่น → ไม่มีความเสี่ยงข้าม scope
- **Step 1:** ลบ DOCTYPE/head/body + CSS link ทั้งหมด (`design-system.css`/`vehicle_admin.css`/`vehicle.css`/
  `vehicle_cost.css`/`vehicle_fuel.css`) + `{% extends '_base_ue.html' %}`
- **Step 2:** ย้ายเข้า 5 block (`title`/`page_title`/`content`/`modals`/`scripts`) — `TH_MONTHS`/`TH_DAYS`
  ย้ายมา top-level ระหว่าง block (pattern เดียวกับ `vehicle_mileage.html`) ให้ทั้ง `content`+`modals` เห็นได้
- ตรวจ: `jinja2.Environment.get_template()` parse ผ่าน + render จริงผ่าน `/admin/cost` ไม่มี server error/
  console error — เห็นข้อมูลจริงครบ (KPI/ตาราง/pivot)
- **ผลข้างเคียงที่ตั้งใจปล่อยไว้ (ไม่ใช่ bug):** legacy class `cost-*`/`vc-*`/`btn-zen*` ไม่มี CSS backing แล้ว
  (หน้าดูไม่มีสไตล์) + `data-lucide` icon บางตัว render เพี้ยนเพราะ `ms-icons.js` ไม่มี mapping ครบ — ตรงกับที่
  pattern เตือนไว้ล่วงหน้า ("audit rule" เป็นเฟสถัดไป ไม่ได้อยู่ scope step 1-2)

**สถานะ:** resume แล้ว (ผู้ใช้สั่ง "แก้เลย") — audit rule เสร็จ ดูสรุปด้านล่าง

## Progress — Audit rule (2026-08-06)
เช็คทุก legacy class ผ่าน skill `component-guide` + grep `vehicle_ot.js` หา JS-hook ที่ห้ามเปลี่ยนชื่อ ก่อนแก้:

**Migrate เป็น `.bb-*` (ไม่มี JS ผูก class ตรงๆ — ปลอดภัย 100%):**
- `zen-card`→`bb-card`, `vc-empty*`→`bb-empty*`, `badge-pill b-full/b-unpaid/b-neutral`→`bb-status is-ok/is-wr/is-neutral`
- `vc-avatar`→`bb-avatar`, `vc-td-strong/-muted/-num`→`bb-cell-strong/-muted/-num`, `vc-table-actions`→`bb-table-actions`, `vc-mono`→`bb-num`
- `cost-slot-tag` สี morning/evening/night → `bb-badge is-wr/is-accent/is-info` (สี semantic ที่มีอยู่แล้ว)
- `btn-zen`→`bb-btn is-pri`, `btn-zen-outline`→`bb-btn is-sec`, `vc-btn vc-btn-ghost vc-btn-icon vc-btn-sm`→`bb-btn is-ghost is-icon is-sm`
- `cost-kpi-strip` (2 การ์ด custom) → `bb-kpi is-ghost` ×2 จริง
- `cost-rate-ref` (แถบอ้างอิงเรทเล็กๆ) → `bb-badge is-neutral` list
- Modal form field: `vc-form-group/-row/vc-label/vc-input/vc-select/vc-textarea` → `bb-field`/`bb-label`/`bb-input`
- `vc-modal` (dead class, CSS ไม่โหลดแล้ว) → ลบทิ้ง เหลือ bootstrap `.modal-content` เปล่า (pattern เดียวกับ `assignModal` ใน `vehicle_admin.html`)
- ทุก `data-lucide` → `<span class="material-symbols-rounded">` ตรง (21 ไอคอน) — เพิ่ม `ms-icons.js` MAP 4 entry (`printer`/`receipt-text`/`rotate-ccw`/`undo-2`, เลือกชื่อ Material Symbols มาตรฐานสูงสุด ไม่เดา) + เปลี่ยน lucide source name 4 ตัวให้ตรง MAP เดิมแทน (`settings-2`→`settings`, `grid-2x2-check`→`check-circle`, `user-round-check`→`user`, `ellipsis-vertical`→`more-vertical`)

**คง class/id เดิมไว้ (component-guide = "missing", ไม่มี bb-* เทียบเท่า + grep เจอ JS hook ตรงๆ ใน `vehicle_ot.js`):**
- status tabs: คง `#costTabs`/`.cost-chip`/`data-status` (dual-class กับ `.tab2-tab`/`.active` ให้ visual มาจาก tab2 CSS+ink-slide JS โดยไม่แตะ logic เดิม)
- filter popover: คง `#costFilterBtn`/`#costFilterSheet`/`#costFilterClear`/`#filterBudgetType(Wrap)`/`#filterBudgetSub(Wrap)` (dual-class กับ `.ue-chip`/`.ue-chip-pop` **ไม่ใส่** `data-ue-chip-*` กัน `bb-components.js` auto-init ชนกับ toggle เดิม)
- `.cost-slot-row`/`.cost-rate-row` (editor rows), `.cost-action-more`/`.cost-menu-toggle`/`.cost-action-menu`/`.cost-action-item`, `.budget-datepick`/`.va-cal*` (date picker — core CSS ported จาก `vehicle_admin.css` เพราะไม่ได้โหลดไฟล์นั้นแล้ว), `.cost-receipt-*`/`.rcpt-*` (JS generate HTML string ตรงๆ ด้วยชื่อ class พวกนี้)
- ทั้งหมด retokenize CSS จาก `--vc-*`/`--vc-space-*` เป็น `--bb-*`/px literal ย้ายเข้า scoped `<style>` ใน `{% block head %}` (126 declaration, brace-balance เช็คผ่านสคริปต์)

**Verify:**
- `jinja2.Environment.get_template()` parse ผ่าน 2 รอบ (หลัง shell migrate + หลัง audit rule)
- grep เช็คไม่มี `vc-*`/`btn-zen*`/`zen-*`/`badge-pill`/`data-lucide` เหลือค้าง (ยกเว้น `vc-pivot-td-sticky`/`vc-pivot-row-summary` — เช็คแล้วว่าไม่เคยมี CSS backing เอง แม้ในไฟล์เดิม ไม่ใช่ regression)
- `.venv/bin/python -m pytest` → **exit 0, all green** (ไม่แตะ Python logic เลย เป็น UI-only change)
- ⚠️ **live browser verify ไม่สำเร็จ** — dev server (`localhost:5001`, user's own process) ต่อไม่ติดตอนตรวจ ต้องให้ผู้ใช้เปิดเองแล้วดู `/admin/cost` — จุดที่ควรเช็กเป็นพิเศษ: filter popover เปิด/ปิด, date picker ใน add/edit OT modal, row action overflow menu, receipt print preview, tab2 underline slide ตอนสลับ status tab

## ไฟล์ที่เปลี่ยนแปลงทั้งหมด
- `app/templates/vehicle/admin/vehicle_cost.html` (shell migration + audit rule)
- `app/static/core/js/ms-icons.js` (เพิ่ม 4 MAP entry)
- `app/static/core/mockup-vehicle-cost.html` (mockup ใหม่ — standalone)
- `docs/notes/INDEX_ui.md` (3 จุด: entry `vehicle_cost.html`, ลบออกจาก loader list `vehicle.css`, flag `vehicle_cost.css` ORPHAN)
- `docs/notes/design_guideline.md` (§14 drift ledger เพิ่มแถว `cost`)

## Docs sync — เสร็จแล้ว
- [x] `INDEX_ui.md` § Templates
- [x] `INDEX_ui.md` § Design System (orphan flag + loader list)
- [x] `design_guideline.md` §14 drift ledger
- [ ] **ค้าง:** live browser verify (server ต่อไม่ติด — รอผู้ใช้ยืนยันเอง)

## Docs sync checklist (ก่อน `จบงาน` — ตรวจกับ checker แล้ว 2026-08-06, ยังไม่แก้เพราะงาน code ยังไม่จบ)
- [ ] `INDEX_ui.md` § Templates — เพิ่มบันทึก shell migration ในแถว `vehicle_cost.html` (pattern เดียวกับ
      `vehicle_fleet.html`/`vehicle_admin.html`) + ลิงก์ประวัติ `INDEX_ui_history.md`
- [ ] `INDEX_ui.md` § Design System — `vehicle_cost.css` ต้อง flag เป็น **ORPHAN** (ไม่มี template โหลดแล้ว,
      pattern เดียวกับ `vehicle_mileage.css`) + ลบ `vehicle_cost.html` ออกจาก loader list ของ `vehicle.css`
- [ ] `design_guideline.md` §14 drift ledger — เพิ่มแถว `cost` (ย้ายออกจาก "ที่เหลือทั้งหมด" catch-all) สถานะ
      `_base_ue.html` ✅ แต่ legacy class ยังไม่ retokenize
- [ ] ไม่ต้อง sync สำหรับ `mockup-vehicle-cost.html` — mockup แยกไฟล์แบบเดียวกับ `mockup-vehicle-admin.html`
      ไม่ถูก index (เช็คแล้ว เฉพาะ `mockup-orders.html`/`mockup-bb-v2*`/`mockup-ubereats-marketing.html` ที่ถูก
      อ้างใน design_guideline.md เพราะเป็น canonical design-system reference ไม่ใช่ proposal รายหน้า)
