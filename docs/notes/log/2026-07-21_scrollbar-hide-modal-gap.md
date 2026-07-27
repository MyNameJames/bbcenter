# Scrollbar ซ่อนทุกหน้า + แก้ modal gap

**วันที่:** 2026-07-21
**สถานะ:** completed

## เป้าหมาย
ซ่อน scrollbar ทุกหน้า (global) + ไม่ให้เกิดช่องว่างขวาจอเวลาเปิด Bootstrap modal
(Bootstrap เติม body padding-right ชดเชย scrollbar ที่ถูกซ่อนไปแล้ว)

## การตัดสินใจ
- **Root cause:** โปรเจกต์มี 2 ระบบ CSS ขนาน — legacy (`design-system.css`) กับ UE ใหม่
  (`components.css`, ใช้ผ่าน `_base_ue.html` → `vehicle_mileage.html`, และ
  `vehicle_admin.html`/`vehicle_cost.html`/`vehicle_budget.html`). scrollbar-hide rule
  ถูกก็อปซ้ำ 3 ไฟล์ (`tokens.css`/`components.css`/`design-system.css`) แต่ modal-gap fix
  (แก้ไว้ตั้งแต่ 2026-06-08) มีอยู่แค่ใน `design-system.css` — ระบบ UE เลยไม่มี fix, เห็น gap จริง
- **แก้:** รวม scrollbar-hide + modal-gap fix เข้า `tokens.css` เป็น single source
  (`token source (single)` อยู่แล้วตาม INDEX_ui.md) แล้วให้อีก 2 ไฟล์ `@import` แทนก็อป —
  `design-system.css` มี `@import url('./tokens.css')` อยู่แล้ว (ลบ local copy ออกพอ)
  · `components.css` เพิ่ม `@import url('./tokens.css')` ใหม่ (ไม่เคย import มาก่อน)
- ไม่แตะ `tokens.css`-only consumer (`login.html`) เพิ่มเติม เพราะไม่มี modal ในหน้านั้น
  อยู่แล้ว — ไม่มีผลกระทบ แค่ inherit fix แบบเงียบๆ
- ไม่ยุ่ง `scrollbar-gutter: stable` (comment ปิดไว้ใน source เดิมอยู่แล้ว ก่อนเริ่มงานนี้) —
  ลบ comment/code ที่ตายแล้วออกตอนย้าย ไม่ carry dead code ไปด้วย

## ไฟล์ที่แก้ไข
- `app/static/core/css/tokens.css` — เพิ่ม modal-open/backdrop fix ต่อจาก scrollbar-hide block (canonical เดียว)
- `app/static/core/css/design-system.css` — ลบ scrollbar-hide + modal fix ที่ซ้ำ (ใช้ผ่าน `@import` เดิมแทน)
- `app/static/core/css/components.css` — ลบ scrollbar-hide ที่ซ้ำ, เพิ่ม `@import url('./tokens.css')`
- `docs/notes/INDEX_ui.md` — sync § Design System (Token source / Component entry / components.css entry)

## Docs sync checklist
- [x] INDEX_ui.md § Design System — 3 จุด (token source, design-system.css entry, components.css entry)
- [ ] schema.md — N/A (ไม่แตะ model)
- [ ] migrations-index.md — N/A
- [ ] architecture.md — N/A (ไม่กระทบ system-level flow)

## รอ verify
- pytest (CSS-only, ไม่คาดว่ากระทบ แต่รอ confirm รันตาม protocol)
- Browser: เปิด modal หน้า `vehicle_mileage.html` (admin), `vehicle_admin.html`,
  `vehicle_cost.html`, `vehicle_budget.html` (bb-* ระบบ, เพิ่งแก้) + หน้า legacy 1 หน้า
  (เช่น `vehicle/vehicle.html`) เช็คว่ายังไม่ regress — server แยก process ผู้ใช้ทดสอบเอง
