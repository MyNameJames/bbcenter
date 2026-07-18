# Task: redesign vehicle_mileage.html ตาม DNA (2026-06-17)

status: completed
owner: Claude (devloop) · plan by Rose

## Scoped Command
- [ไฟล์] app/templates/vehicle/admin/vehicle_mileage.html · app/static/vehicle/css/vehicle_mileage.css
- [ตำแหน่ง] page header (:46-51) · modal #mileageModal (:418-721) · chips/radius ใน CSS
- [งาน] 5 step ตามแผน Rose (ลบ header, ย้าย inline style modal→CSS, normalize radius 6px, chip active=accent, sync docs)
- [ข้อจำกัด] token --vc-* เท่านั้น · radius 6px · no shadow ใน body · **ห้ามแตะ id 28 ตัว** · **ห้ามใส่ display ใน CSS class ที่ JS toggle** (#fePreview #feRefuelWrap #cManualRow .mlg-state $modeAll $modeSel #feOdoErr)
- [output] diff 2 ไฟล์ + sync docs

## Checklist
- [x] 1 PLAN — scoped ครบ + log file
- [x] 2 GUARD — ไม่แตะ model/เงิน/สถานะ = UI ล้วน ไม่ต้อง db-helper/test-first
- [x] 3 BUILD
- [ ] 4 VERIFY — รอผู้ใช้ทดสอบ browser (server port 5001 เป็น process ผู้ใช้, preview ใช้ไม่ได้)
- [x] 5 SYNC — INDEX_ui (template + CSS row) + design_dna_redesign migrated list + checker (เจอ 2 จุดขาด → แก้แล้ว)
- [x] 6 CLOSE

## หมายเหตุ git
- modal CSS classes อยู่ใน HEAD แล้ว (committed 303896b) — งาน session นี้ = rewire HTML ให้ใช้ class (de-inline) + chip accent
- ไม่มี duplicate class (grep ยืนยัน)

## Decisions (user confirm)
- chip active → accent #4059e6 tint
- subtitle "ติดตามไมล์ออก-กลับ…" → ลบทิ้ง

## Reuse
- form labels → .vc-label / .vc-required / .vc-label-meta (vehicle_fuel.css โหลดอยู่)
- modal body layout → mlg-* class ใหม่ (ไม่มี modal cookbook)

## Files changed
- app/templates/vehicle/admin/vehicle_mileage.html — ลบ header h1/h6, de-inline modal → mlg-* class (-146/+89)
- app/static/vehicle/css/vehicle_mileage.css — .mlg-chip.is-active → --vc-accent
- app/static/vehicle/css/vehicle_budget.css — .budget-personal-tab.is-active → --vc-accent
- docs/notes/INDEX_ui.md — template row + CSS row DNA note
- docs/notes/design_dna_redesign.md — migrated list +mileage

## Follow-up: Summary → KPI (ผู้ใช้ขอเพิ่ม)
- ย้าย `vc-card mlg-summary-strip` ขึ้นบนสุด (เหนือ toolbar, นอก #mlgResults) + แปลงเป็น KPI
- #modeAll: label "ระยะรวมทั้งหมด" / value "X km / N รายการ" / meta "ค่าน้ำมันรวม Y ฿" — reuse .vc-kpi-* + .mlg-kpi-icon tile
- count #sumAllCount = JS-driven (calcAllSummary set rows.length) เพราะอยู่นอก AJAX region
- ไฟล์: vehicle_mileage.html · vehicle_mileage.css (ลบ .mlg-summary-mode/-item/-label/-icon/-clear → .mlg-kpi*) · vehicle_mileage.js · INDEX_ui.md
- ตรวจ: orphan class ไม่เหลือ, ids ครบ, JS อ้างครบ
