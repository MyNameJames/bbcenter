# หน้างบประมาณ — แก้ filter + แก้ลบงบปิดแล้ว + เพิ่มลบก้อนงบ
**วันที่:** 2026-08-07
**สถานะ:** completed

## เป้าหมาย
แก้ 3 ปัญหาที่ผู้ใช้รายงานในหน้า `vehicle_budget.html`:
1. chip filter ใน `bb-ml-toolbar-row` (ปี/งบ/ประเภทงบ) กดแล้วข้อมูลไม่ filter ตาม
2. งบที่ปิดใช้งานแล้ว (used_amount=0) ลบไม่ได้
3. แท็บ "งบหลัก" ต้องการปุ่ม icon delete สำหรับลบก้อนงบที่ไม่ได้ใช้งาน

## การตัดสินใจ

**1. Filter chip (root cause):** `initUeChipDd` (`bb-components.js`) portal popover ไป
`document.body` ตอนเปิด (กัน overflow clip) — event `ue-chip:change` ยิงตอน dropdown ยังเปิดอยู่
(คลิก checkbox/radio ก่อนปิด panel) ทำให้ input หลุดออกจาก `dd` subtree ไปแล้ว ณ ตอนนั้น
`dd.querySelector(...)` ใน `initYearlyPlanChip`/`initPlanYearChip`/`initPivotFilter`
(`vehicle_budget.js`) จึงหาไม่เจอเสมอ — ต่างจากหน้า mileage ที่ query ผ่าน `<form>` +
`form=""` attribute (ownerForm binding ใน `initUeChipDd`) แต่ toolbar หน้า budget ไม่มี `<form>`
ครอบเลย ใช้ `<div class="bb-ml-toolbar-row">` เฉยๆ
**แก้:** capture `pop` (`[data-ue-chip-pop]`) ไว้ตอน init ครั้งเดียว query จาก reference นั้นแทน
`dd` เสมอ — ไม่ต้องแก้ template (ไม่ต้องเพิ่ม `<form>`), แก้แค่ JS

**2. ลบงบปิดแล้วไม่ได้ (root cause):** `budget_service.py::delete_budget()` เดิม block ถ้ามี log
`event_type != 'set_budget'` — แต่ `toggle_active` (ปิดใช้งาน) เขียน log `set_inactive` เสมอ ซึ่งไม่ใช่
`'set_budget'` ทำให้งบปิดแล้วทุกก้อนติด guard นี้เสมอ ทั้งที่ไม่เคยมีธุรกรรมเงินจริง
**แก้:** เปลี่ยนเงื่อนไข block เป็นเช็กเฉพาะ event ที่กระทบเงินจริง (`deduct`/`refund`/`adjust`)

**3. เพิ่มลบก้อนงบ (แท็บ "งบหลัก"):** เพิ่ม action ใหม่ `delete_plan` →
`budget_svc.delete_yearly_plan(plan)` — cascade ลบงบย่อย (`VehicleBudget`) + log ที่ผูก
`yearly_plan_id` นี้ทั้งหมด เงื่อนไขที่ผู้ใช้เลือก (ถามผ่าน AskUserQuestion): **อนุญาตลบได้ตอนใช้ไป
0 บาททั้งก้อน (`used_amount == 0` ทุกงบย่อย) แม้จะเคยจัดสรร/ตั้งเพดานงบย่อยไปแล้วก็ตาม** — เข้มน้อย
กว่า `delete_budget()` ที่เช็ก log event type เพราะเป็นการลบทั้งก้อนไม่ใช่ลบทีละงบ ปุ่ม delete
ในแถวซ่อนไว้ฝั่ง client ถ้า `row.used > 0` (server ยัง block ซ้ำอีกชั้นอยู่ดี)

## ไฟล์ที่แก้ไข
- `app/services/vehicle/budget_service.py` — แก้ guard `delete_budget()` + เพิ่ม `delete_yearly_plan()`
- `app/views/vehicle/vehicle_budget.py` — เพิ่ม `_handle_delete_plan()` + ลงทะเบียน action `delete_plan`
- `app/templates/vehicle/admin/vehicle_budget.html` — เพิ่มปุ่ม icon delete ในแท็บ "งบหลัก"
- `app/static/vehicle/js/vehicle_budget.js` — แก้ 3 chip listener (capture `pop` reference) +
  เพิ่ม confirm handler `data-confirm-delete-plan`
- `tests/test_budget_service.py` — เพิ่ม 4 test (guard fix 1 + delete_yearly_plan 3)
- `docs/notes/INDEX_routes.md`, `docs/notes/INDEX_code.md`, `docs/notes/INDEX_ui.md` — sync

## ผลทดสอบ
`.venv/bin/python -m pytest` → 175 passed (เดิม 171 ก่อนเพิ่ม test, +4 test ใหม่)

## หมายเหตุ
ยังไม่ได้ทดสอบใน browser จริง (dev server เป็น process ของผู้ใช้เอง ไม่ผ่าน preview tool ของ
session นี้) — ผู้ใช้ควรลองกด chip filter + ลบงบปิดแล้ว + ลบก้อนงบในแท็บ "งบหลัก" อีกรอบก่อนถือว่าจบ
