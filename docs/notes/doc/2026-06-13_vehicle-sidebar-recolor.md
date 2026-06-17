# 2026-06-13 — Recolor sidebar + vehicle.html (blue theme + van hero)

status: completed

## Scope (5-field)
- [ไฟล์]: tokens.css, components/sidebar.css, design-system.css, vehicle_fuel.css, vehicle/vehicle.html, vehicle/css/vehicle.css
- [ตำแหน่ง]: token block / .sidebar+.sb-* / .ds-btn-primary / .vc-btn-primary / desktop title block (L45-51) / new .vrc-hero
- [งาน]:
  1. พื้น app = ขาว (body ไม่มี bg อยู่แล้ว = ไม่ต้องแก้)
  2. sidebar bg = `--vc-accent-light` #EEF2FF
  3. เมนู active bg = midpoint blue↔accent-light = `#8AABF5` (token ใหม่ `--vc-blue-mid`)
  4. icon + text label เมนู = `--vc-blue` #2563EB
  5. ปุ่ม primary ทุกอัน (.ds-btn-primary + .vc-btn-primary) = `--vc-blue`
  6. hero banner + รถ vehicle.png (ตำแหน่ง A) บน vehicle.html
- [ข้อจำกัด]: --vc-* tokens เท่านั้น, no shadow, ห้าม inline script ใน template
- [output]: แก้ code จริง + sync docs

## GUARD
- ไม่แตะ models / เงิน / สถานะ → ไม่ต้อง db-helper, ไม่ต้อง test-first. งาน CSS/template ล้วน

## Decisions / notes
- active item text ยังเป็น `--vc-blue` บน bg `#8AABF5` → contrast ~2:1 (ต่ำกว่า AA) — ทำตาม spec ผู้ใช้, flag ให้ดู browser
- vehicle.png = 2.5MB → เสนอ optimize ภายหลัง (นอก scope)
- `.btn-primary-custom` (vehicle.css L84) legacy — ไม่แตะ (ไม่ใช้ใน vehicle.html)

## Checklist
- [x] 1 PLAN
- [x] 2 GUARD
- [x] 3 BUILD
- [x] 4 VERIFY (pytest 42 passed; UI ผู้ใช้ทดสอบ browser เอง)
- [x] 5 SYNC (INDEX_ui rows + date bump + checker ผ่าน)
- [x] 6 CLOSE

## Files changed
- app/static/core/css/tokens.css — เพิ่ม `--vc-blue-mid: #8AABF5`
- app/static/core/css/components/sidebar.css — recolor bg/item/icon/group/sub/active/dot
- app/static/core/css/design-system.css — `.ds-btn-primary` → `--vc-blue`
- app/static/vehicle/css/vehicle_fuel.css — `.vc-btn-primary` → `--vc-blue`
- app/static/core/css/vercel.css — เพิ่ม `.vrc-hero*` block
- app/templates/vehicle/vehicle.html — desktop title → `.vrc-hero` + `<img vehicle.png>`
- docs/notes/INDEX_ui.md — sync 4 rows + date 2026-06-13

## Follow-ups (นอก scope)
- vehicle.png = 2.5MB → ควร optimize/resize (เสนอ)
- active item text contrast ~2:1 (ตาม spec) → ดู browser, ถ้าจางไปสลับ text เป็นขาว
- tokens.css L34 commented `/* --vc-fg: #006EDB; */` — dead (มีอยู่เดิม ไม่ใช่งานนี้)
