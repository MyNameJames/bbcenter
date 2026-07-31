# vehicle_budget.html migrate — Phase 1: shell + token

> **status:** in_progress · **เริ่ม:** 2026-07-29
> ref: [design_guideline.md §13 Z0 · §14 adoption](../design_guideline.md) · [redesign_migration_pattern.md](../redesign_migration_pattern.md) · precedent: [2026-07-28_vehicle-shell-token.md](2026-07-28_vehicle-shell-token.md) (vehicle.html) · [2026-07-29_vehicle-fleet-shell-token.md](2026-07-29_vehicle-fleet-shell-token.md) (vehicle_fleet.html)

## Scope (เฟส 1 เท่านั้น)

| ชั้น | จาก | เป็น |
|---|---|---|
| shell | standalone `<html>` + `_shared/header.html`+`_shared/sidebar.html` | `{% extends '_base_ue.html' %}` |
| token | `--bb-*` (ทำไปแล้วเกือบหมดตั้งแต่ bb-* migration 2026-07-05 — ดู INDEX_ui.md) | เช็ก residual เท่านั้น ไม่ reskin ใหม่ |

**ต่างจาก 2 precedent ก่อนหน้า:** หน้านี้ผ่าน "token/component" migration มาแล้วรอบหนึ่ง (2026-07-05, ลบ `vehicle_budget.css` เดิม → `bb-*` ล้วน) เหลือแค่ "shell" (extends) ที่ยังไม่ทำ — ไม่ใช่ full `--vc-*`→`--bb-*` swap แบบ vehicle.html/vehicle_fleet.html

**ยังไม่ทำ (เฟสถัดไป — component/icon):** แปลง `data-lucide` → Material Symbols ตรงๆ (36+ จุดในไฟล์ + ที่ inject จาก `vehicle_budget.js`), reskin ปฏิทิน pivot table (sticky-col+heat), ลบ `initIcons`/`bindModalReinit` (core/js/icons.js) ที่กลายเป็น dead code หลัง extends (เพราะ header2.html stub `window.lucide` no-op — ms-icons.js คุม icon แทน)

## ตัดสินใจ

1. **ตัด vendor links ที่ base ให้แล้ว** — bootstrap.min.css / fontawesome / bootstrap-icons / Google Fonts (Sarabun+Inter) / `components.css` / `gallery.css` — grep ยืนยันไม่มี `fa-`/`bi-` class ใช้ในไฟล์
2. **เก็บ `core/css/components/dropdown.css` ไว้ต่อ** ใน `{% block head %}` (ตาม comment เดิมในไฟล์ + precedent vehicle.html/vehicle_driver.html) — `#sbApprover` ใช้ `data-autocomplete` ต้องการ CSS นี้ตรงๆ, `_base_ue.html`/`ue.css` ไม่มี rule นี้ให้
3. **page_title** — hardcode `<h1 style="font-size:1.625rem...">งบประมาณ</h1>` → `{% block page_title %}งบประมาณ{% endblock %}` (ue.css คุม 38px/800 ให้ผ่าน `h1.page-title`, ตรง pattern vehicle_admin.html/vehicle_fleet.html)
4. **ลบ flash `.bb-callout` block เดิมทิ้ง** — `_base_ue.html` แปลง flash → toast ให้อัตโนมัติก่อน `{% block content %}` (`data-bb-toast-flashes`), ไม่ต้องมี custom block ซ้ำ
5. **scripts** — ตัด jquery + bootstrap.bundle (base ให้แล้ว), เหลือ `vehicle_budget.js` (module) + `dropdown.js` (module) ใน `{% block scripts %}`
6. **sidebar: ไม่ต้อง set `active_menu`** — `sidebar2.html` ตรวจ active จาก `request.endpoint.startswith('adminfleet.budget')` เองแล้ว (ผูกไว้ในกลุ่ม "จัดการรถ" อยู่แล้ว)
7. **ห้าม rename/แตะ id·data-attribute ที่ `vehicle_budget.js` ผูก** — `setBudgetModal`/`budgetTopUpModal`/`budgetAdjustModal`/`extendBudgetModal`/`budgetRefundModal`, `sbBudgetType`/`sbDept`/`sbAmount`/`sbStartDate`/`sbEndDate`/`sbDeptListActive`/`sbDeptListCentral`/`sbDeptListDept`/`sbApprover`/`approverRow`/`sbTitle`/`sbDeptLabel`/`sbNoticeText`/`sbSubmitText`, `data-budget-tab`/`data-budget-panel`, `data-personal-filter`/`data-personal-row`, `data-datepick*`, `data-dropdown*`/`data-bind`, `data-confirm-toggle`/`data-confirm-pay`/`data-pick-booking`/`data-refund-submit`, `data-sortable-table`/`data-sort`
8. **ไม่แตะ icon (`data-lucide`)** — เฟสถัดไป (component), ปล่อยให้ ms-icons.js (จาก header2.html) แปลงให้อัตโนมัติเหมือน vehicle_admin.html/vehicle_fleet.html ตอน extends ใหม่ๆ
9. **ไม่แตะ 3 macro ในไฟล์** (`budget_card`/`budget_card_off`/`bcard_section_head`) — logic เดิมทั้งหมด

## Token map ที่ใช้

ไม่มี — token ส่วนใหญ่เป็น `--bb-*` อยู่แล้วจาก migration 2026-07-05 (ดู INDEX_ui.md row `vehicle_budget.html`). เฟสนี้ไม่ swap token เพิ่ม แค่ grep เช็ก residual `--vc-*`/`--ds-*` ตอน BUILD

## Checklist

- [x] 1 PLAN — scoped 5 field + log file
- [x] 2 GUARD — ไม่แตะ models / ไม่แตะ logic เงิน-สถานะ (shell/token = presentation ล้วน) → ไม่ต้อง db-helper / test-first
- [x] 3 BUILD — rewrite ทั้งไฟล์ (extends `_base_ue.html`, ลบ vendor link ซ้ำ/flash block เดิม/wrapper divs, เก็บ dropdown.css, ย้าย title→block page_title, scripts เหลือ vehicle_budget.js+dropdown.js). Sanity check: `{% block %}` 6/6 · `{% macro %}` 3/3 · `{% if %}` 36/36 · `{% for %}` 24/24 balance ครบ, grep residual `--vc-*`/`--ds-*`/`bb-sidebar-main`/`container-xxl`/`active_menu` = ว่าง (ไม่เหลือ), 5 modal id (`setBudgetModal`/`budgetTopUpModal`/`budgetAdjustModal`/`extendBudgetModal`/`budgetRefundModal`) ยังอยู่ครบ
- [ ] 4 VERIFY — ผู้ใช้ทดสอบบน localhost:5001 (server เป็น process ของผู้ใช้)
- [ ] 5 SYNC — INDEX_ui.md · guideline §14 adoption · CHANGELOG
- [ ] 6 CLOSE — log → doc/

## Follow-up (component — tab restructure, 2026-07-29 ต่อเนื่อง)

ผู้ใช้ขอต่อ: สร้าง tab เหมือน `vehicle_admin.html`/`vehicle_fleet.html` (tab2 component) แทน `.bb-tabs` เดิม — เปลี่ยนจาก 4 tab แบ่งตาม budget_type (ตารางรวม/ส่วนกลาง/ส่วนกอง/ส่วนตัว) เป็น 4 tab แบ่งตาม status (ตารางรวม/**กำลังใช้งาน**/**ไม่ได้ใช้งานแล้ว**/ร่วมบุญส่วนตัว)

ยืนยันกับผู้ใช้ 2 จุดก่อนแก้ (AskUserQuestion):
1. **grouping ภายใน tab ใหม่** — เลือก "แยก sub-section ส่วนกลาง/ส่วนกอง เหมือนเดิม" (ไม่ใช่รวม grid เดียวปนกัน) — central active + dept active มาไว้ tab "กำลังใช้งาน" เดียวกัน แต่ยังมี `bcard_section_head` คั่นแยกประเภทเหมือนเดิม (central_off + dept_off ก็เช่นกันใน tab "ไม่ได้ใช้งานแล้ว")
2. **tab component** — เลือกเปลี่ยนเป็น tab2 จริง (`_shared/tab2.html` + `tab2_tabs()`) ไม่ใช่แค่เปลี่ยน label บน `.bb-tabs` เดิม

**เปลี่ยน:**
- เพิ่ม `{% include '_shared/tab2.html' %}` + `{% from '_shared/tab2.html' import tab2_tabs %}` ต้น `{% block content %}`
- tab bar: `.bb-tabs`/`.bb-tab` → `<div id="budgetTab2Wrap">{{ tab2_tabs([...]) }}</div>` ค่า `value`: `pivot`/`active`/`inactive`/`personal`
- panel: ลบ wrapper `<div class="budget-panels">` + class `budget-panel`/`role=tabpanel`/`hidden` attr เดิมทั้งหมด → แต่ละ `<section>` ใช้ `data-budget-panel="<value>"` + toggle ด้วย `.d-none` (ตรง pattern fleet.js) แทน
- id เปลี่ยน: `tabPanelCentral`/`tabPanelDept`/`sectionCentral`/`sectionDept` → ลบทิ้ง (ไม่มี JS ผูกตรง id พวกนี้ ปลอดภัย ยืนยันด้วย grep), เพิ่ม `tabPanelActive`/`tabPanelInactive` ใหม่; `tabPanelPivot`/`tabPanelPersonal` คงชื่อเดิม
- เนื้อหา "Section 1: ส่วนกลาง"+"Section 2: ส่วนกอง" เดิม (central active/off + dept active/off ในคนละ tab) → reorganize ใหม่: active ทั้งคู่ไปอยู่ `#tabPanelActive` (label section head เปลี่ยนจาก "ใช้งานอยู่"→"ส่วนกลาง"/"ส่วนกอง" เพราะ status สื่อผ่าน tab แล้ว), off ทั้งคู่ไปอยู่ `#tabPanelInactive` (label "ไม่ได้ใช้งาน"→"ส่วนกลาง"/"ส่วนกอง" เช่นกัน) — เพิ่ม empty state ใหม่ให้ `#tabPanelInactive` กรณีไม่มีงบ off เลยทั้ง 2 ประเภท (เดิมไม่มีเพราะ off เป็นแค่ sub-section ไม่เคยว่างทั้ง panel)
- **ไม่แตะ 3 macro** (`budget_card`/`budget_card_off`/`bcard_section_head`) — ตาม GUARD เดิม
- `vehicle_budget.js` `initBudgetTabs()`: query เปลี่ยนจาก `[data-budget-tab]`+`.is-on`+`aria-selected` → `#budgetTab2Wrap .tab2-tab`+`.active` (ตรง tab2 contract); panel toggle จาก `p.hidden` → `p.classList.toggle('d-none', …)`

**Sanity check:** `{% block %}` 6/6 · `{% macro %}` 3/3 · `{% if %}` 38/38 · `{% for %}` 24/24 · `<section>` 7/7 balance ครบ; tab `value` (pivot/active/inactive/personal) ตรงกับ section `data-budget-panel` ครบ 4 คู่; grep ยืนยันไม่เหลือ `tabPanelCentral`/`tabPanelDept`/`budget-panels`/`data-budget-tab` (จุดที่ยังเจอ `bb-tabs` คือ sub-filter ในตัว personal panel เอง — ของเดิม ไม่ใช่ main tab ไม่ได้แตะ)

## ไฟล์ที่แก้

- `app/templates/vehicle/admin/vehicle_budget.html` — rewrite (shell) + restructure tab (component)
- `app/static/vehicle/js/vehicle_budget.js` — `initBudgetTabs()` เปลี่ยนมาผูก tab2 contract
