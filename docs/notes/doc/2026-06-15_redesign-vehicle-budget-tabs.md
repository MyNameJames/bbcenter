# Redesign vehicle_budget.html — tab layout + summary card

> status: **completed** · 2026-06-15

## Scope (5 field)
- **[ไฟล์]** `app/templates/vehicle/admin/vehicle_budget.html` · `app/static/vehicle/css/vehicle_budget.css` · `app/static/vehicle/js/vehicle_budget.js`
- **[ตำแหน่ง]** summary card (เดิม line 65-168) + pivot card + 4 budget-section → tab layout
- **[งาน]**
  1. แบ่ง section เป็น tab: ตารางรวม(pivot) / ส่วนกลาง / ส่วนกอง / ส่วนตัว / งบที่ไม่ได้ใช้แล้ว
  2. redesign budget-summary card ตามภาพ (2-col: เลขใหญ่ซ้าย · bar+legend ขวา)
  3. tab pivot → ซ่อน filter + add
  4. tab bar = เส้นยาวเต็ม container
- **[ข้อจำกัด]** `--vc-*` tokens · no shadow · ห้าม inline `<script>` · ไม่แตะ logic เงิน/route
- **[output]** redesigned page, ผู้ใช้ทดสอบใน browser (port 5001 user process)

## Decisions (ถามผู้ใช้ 2026-06-15)
- filter (เดือน/ปี) ย้ายออกจาก summary card → toolbar ใต้ tab; ซ่อนทั้ง toolbar ตอน tab pivot
- default active tab = ตารางรวม (pivot)
- summary bar ใช้สีตามภาพ (เขียว/เหลือง/แดง) — map: ส่วนกลาง=เขียว, ส่วนกอง=เหลือง, ส่วนตัว=แดง

## GUARD
- แตะเฉพาะ presentation (template/CSS/JS) — ไม่มี model / ไม่มี logic เงิน/สถานะ → ไม่ต้อง db-helper / test-first

## Checklist
- [x] 1 PLAN — scoped 5 field + log file
- [x] 2 GUARD — presentation only (ไม่มี model/logic เงิน)
- [x] 3 BUILD — tab + summary + toolbar
- [x] 4 VERIFY — Jinja parse OK; ผู้ใช้ทดสอบ browser (server 5001 user process)
- [x] 5 SYNC — INDEX_ui.md row vehicle_budget.html append entry 2026-06-15
- [x] 6 CLOSE — log → doc/

## ไฟล์ที่แก้
- `app/templates/vehicle/admin/vehicle_budget.html` — summary card 2-col, tab nav, toolbar, ห่อ 5 panel, ลบ add button จาก central/dept section header
- `app/static/vehicle/css/vehicle_budget.css` — §20 (summary grid, seg/legend สี green/amber/red, tabs, toolbar, panels)
- `app/static/vehicle/js/vehicle_budget.js` — IIFE `initBudgetTabs`
- `docs/notes/INDEX_ui.md` — sync

## หมายเหตุ
- summary stack bar เปลี่ยน semantics: เดิม = สัดส่วนงบใช้ไป/เพดาน (central+dept over track) → ใหม่ = composition ค่าใช้จ่าย 3 หมวด (central/dept/personal). ถ้าต้องการ track "เหลือ" แบบเดิมแจ้งได้
- CSS เดิม `.budget-summary-head/-title/-filter` กลายเป็น dead (markup ลบ filter ออกจาก summary) — ไม่ลบเพื่อกัน scope creep

## Round 2 (2026-06-16) — ปรับตามภาพ ref เพิ่ม 7 ข้อ
1. summary ลบ `vc-card` → ไม่ใช่ card (CSS §21A: bg transparent, border 0, padding ลด)
2. `.budget-summary-grid` ชิดซ้ายไม่เต็มจอ (breakdown width 340px; mobile 100%)
3. ลบ `.budget-summary-signals` footer ออกจาก template
4. `.budget-tabs` underline เต็มจอถึง sidebar (`margin-inline:-1rem` negate container px-3) + border 4px
5. `.budget-tab` เพิ่ม class `text-header fw-bold`
6. 4 budget-table image-style (box-shadow + radius) — DESIGN-OVERRIDE ตามผู้ใช้สั่ง "ไม่ต้องสนใจกฏ"
7. sortable header: `data-sortable-table` + `<th data-sort>` + JS IIFE `initSortableTables` (parse ฿/,/% → num, localeCompare ไทย, caret ⇅/↑/↓)

- CSS §21 (vehicle_budget.css) · INDEX_ui.md sync round 2
- VERIFY: Jinja parse OK; ผู้ใช้ทดสอบ browser
- หมายเหตุ underline 4px เต็มจอ: ทำงานเมื่อ container-xxl = 100% (viewport < 1400px); ถ้าจอ ≥1400 container อาจ center → ไม่ชนขอบ (ถ้าเจอแจ้งได้ จะเปลี่ยนเป็น full-bleed แบบ vw)

## Round 3 (2026-06-16) — ปรับ 4 ข้อ
1. revert underline → กลับเป็นเดิม (1px line + active 2px); ลบ §21B
2. ลบ `.budget-toolbar` (filter + add) ออกหมด — CSS §20D + JS toolbar/addBtns refs ลบครบ
3. ลบ `.fuel-header-actions` (ปุ่มเปิด budgetRefundModal)
4. page header เป็นสไตล์ vehicle.html: `<h2 fw-bold text-accent pt-3>` + `<h6 text-muted>`

### ผลกระทบ (functional) — แจ้งผู้ใช้แล้ว
- **ไม่มี filter เดือน/ปี** บนหน้า (อยู่ใน toolbar ที่ถูกลบ) → เปลี่ยนเดือนไม่ได้จาก UI; default เดือนปัจจุบัน (ปรับผ่าน query string `?month=&year=` ได้)
- **สร้างงบใหม่**: ไม่มีปุ่ม "ตั้งงบ" แล้ว → ทำได้ผ่าน dropdown "แก้เพดานงบ" ของแถวที่มีอยู่เท่านั้น (`setBudgetModal` ยังเข้าถึงได้ 3 จุด)
- **`budgetRefundModal`** (ยกเลิกการจองที่ยังไม่ปิดทริป): ไม่มี trigger แล้ว (เหลือ markup ใน DOM) — ถ้าต้องใช้ ต้องเพิ่มปุ่มกลับ
- VERIFY: Jinja parse OK · INDEX_ui.md sync round 3
