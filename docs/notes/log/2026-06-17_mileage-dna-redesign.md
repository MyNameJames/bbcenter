# Task: redesign vehicle_mileage.html ตาม DNA (2026-06-17)

status: in-progress
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
- [ ] 3 BUILD
- [ ] 4 VERIFY — ผู้ใช้ทดสอบ browser (server เป็น process ผู้ใช้)
- [ ] 5 SYNC — INDEX_ui + design_dna_redesign + checker
- [ ] 6 CLOSE

## Decisions (user confirm)
- chip active → accent #4059e6 tint
- subtitle "ติดตามไมล์ออก-กลับ…" → ลบทิ้ง

## Reuse
- form labels → .vc-label / .vc-required / .vc-label-meta (vehicle_fuel.css โหลดอยู่)
- modal body layout → mlg-* class ใหม่ (ไม่มี modal cookbook)

## Files changed
(จะอัปเดตตอน CLOSE)
