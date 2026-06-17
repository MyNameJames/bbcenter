# Sidebar redesign → "Zendenta" reference look

- **วันที่:** 2026-06-13
- **status:** completed
- **scope:** CSS-only restyle ของ `_shared/sidebar.html` ให้ตรงภาพอ้างอิง (Zendenta dashboard)

## Decision ผู้ใช้
1. ตัด การ์ด context ใต้ brand (ไม่เพิ่ม)
2. คง collapsible group "จัดการรถ"
3. Section label คงภาษาไทย (สไตล์ uppercase-จาง)

## Scoped Command
- [ไฟล์] `app/static/core/css/components/sidebar.css`
- [ตำแหน่ง] `.sb-section-label`, `.sb-item:hover`, `.sb-item.active`(+`::before`), `.sb-item--sub:hover`, `.sb-item--sub.active`(+`::before`), `.sb-group.has-active-child .sb-group-toggle`, dot `::after`, header comment
- [งาน] active left-bar + label เทาจางไร้เส้นคั่น + hover neutral
- [ข้อจำกัด] `--vc-*` เท่านั้น, no shadow, ไม่แตะ HTML/JS, ไม่เปลี่ยน anim group
- [output] diff + checklist

## Checklist
- [x] 1 PLAN — scoped 5 field ครบ + log file
- [x] 2 GUARD — CSS-only, ไม่แตะ model/เงิน → ไม่ต้อง db-helper/test
- [x] 3 BUILD — แก้ sidebar.css 5 จุด
- [x] 4 VERIFY — CSS only (ไม่ pytest); ผู้ใช้เช็ก browser
- [x] 5 SYNC — INDEX_ui.md (entry Sidebar) + checker ผ่าน
- [x] 6 CLOSE — log → doc/

## ไฟล์ที่แก้
- `app/static/core/css/components/sidebar.css` (restyle 5 จุด)
- `docs/notes/INDEX_ui.md` (entry Sidebar § Design System)

## สรุป
restyle sidebar ให้ตรงภาพ Zendenta — CSS-only:
1. section-label: ลบเส้นคั่น + uppercase + tracking-wide + .68rem
2. hover: ฟ้า → neutral (--vc-bg-hover/--vc-fg)
3. active: --vc-blue → --vc-accent + ::before left-bar 3px indigo (เมนู + sub)
4. group active-child + collapsed dot: --vc-blue → --vc-accent
5. header comment rev2
checker ผ่าน · ไม่มี logic เปลี่ยน → ไม่ต้อง pytest · ผู้ใช้เช็ก browser ตาม checklist
