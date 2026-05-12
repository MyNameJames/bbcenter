# Design System Rebuild — Vercel-inspired Light + Indigo
**วันที่:** 2026-04-11
**สถานะ:** completed
**วันที่เสร็จ:** 2026-04-12

## เป้าหมาย
สร้าง design system ใหม่ทั้งหมด โดยใช้หน้า Vehicle admin เป็น reference แรก
ย้าย CSS/JS ของ `vehicle_admin.html` ออกจาก inline มาเป็น static files พร้อม migrate token ใหม่ทั้งหมด

## สรุปการทำงาน

### สิ่งที่ทำ
- สร้าง `app/static/css/design-system.css` ใหม่ทั้งหมด (Vercel-inspired Light + Indigo)
- สร้าง `docs/notes/design_system.md` — reference document 13 sections ครบ
- อัปเดต `CLAUDE.md` — เพิ่ม rule ก่อนรัน bash/browser + icon rules ทั้งหมด
- สร้าง `docs/design/vehicle-new-design.html` — standalone mockup ใช้ design system ใหม่
- สร้าง `app/static/css/vehicle_admin.css` — extract + migrate จาก inline style
- สร้าง `app/static/js/vehicle_admin.js` — extract + replace emoji → FA icons
- อัปเดต `app/templates/vehicle/admin/vehicle_admin.html` — ลบ inline style/script ทั้งหมด

### การตัดสินใจสำคัญ
- **Vercel-inspired Light Mode**: no shadow, extra-light borders (`#EFEFEF`), tight radius 4–6px, Zinc text palette
- **Token naming**: ใช้ `--ds-accent` แทน `--ds-primary` เพื่อหลีกเลี่ยง conflict กับ Bootstrap `--bs-primary`
- **Bootstrap `.card` as base**: ใช้ `!important` override เพื่อ force design system โดยไม่เปลี่ยน class ใน template
- **FA icons mandatory**: ทุก technical field ต้องมี `fa-solid` icon นำหน้า (clock, location-dot, users, car, id-card ฯลฯ)
- **Sarabun เดียว**: ลบ Prompt ออกทั้งหมด
- **`showToast()` ใช้ `innerHTML`**: รองรับ FA icon HTML string
- **`setExpType(el)`**: ส่ง `this` แทน `event` global เพื่อ compatibility

### Future improvements (จาก Design Engineering Review)
- `transition: all` → specific properties (5 จุด)
- `.booking-card:active` scale `.99` → `.97`
- `max-height` animation → `opacity + transform`
- `width` animation (budget bar) → `scaleX()`
- Bottom sheet easing → iOS-like `cubic-bezier(0.32, 0.72, 0, 1)`
- เพิ่ม `:active` scale บน `.chip`, `.exp-tab`, `.nav-btn`
- Hover states guard ด้วย `@media (hover: hover) and (pointer: fine)`
- เพิ่ม `@media (prefers-reduced-motion: reduce)` block

## ไฟล์ที่เปลี่ยนแปลงทั้งหมด
- `app/static/css/design-system.css` — เขียนใหม่ทั้งหมด
- `app/static/css/vehicle_admin.css` — ✨ ใหม่
- `app/static/js/vehicle_admin.js` — ✨ ใหม่
- `app/templates/vehicle/admin/vehicle_admin.html` — ลบ inline ~870 บรรทัด
- `docs/notes/design_system.md` — ✨ ใหม่
- `docs/design/vehicle-new-design.html` — mockup reference
- `CLAUDE.md` — เพิ่ม rule 4 + Design Standards + Icon rules
- `~/.claude/projects/.../memory/feedback_computer_use.md` — ✨ ใหม่
