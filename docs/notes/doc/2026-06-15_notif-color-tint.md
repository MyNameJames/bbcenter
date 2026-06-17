# notif-color-tint — ใส่สี notification panel

> status: completed · 2026-06-15

## ไฟล์ที่แก้
- `app/static/core/css/notification.css` — design pass (ดู follow-up)
- `app/static/core/js/notification.js` — inner icon เลิก inline 22px → base 28px
- `docs/notes/INDEX_ui.md` — sync row notification.css + แก้ drift line 148

## Follow-up (2026-06-15) — design direction ใหม่ตาม user
ผู้ใช้ตัดสิน: **(1) keep group** (drift แก้ที่ doc), **(2) ไม่ใส่สี connector** + brief ใหม่: icon ตรงกัน (size/stroke/spacing), ใช้ `--vc-fg` หลัก เน้นด้วย `--vc-accent`
- **Revert tint หลากสี** → monochrome: `.notif-icon-*` ไม่ map สี ntype แล้ว, icon = `--vc-fg-muted` base; emphasis = accent ที่ unread dot/text (เดิม)
- **Icon uniform:** 28px container + 14px glyph + `stroke-width 1.75` ทุกระดับ (inner เลิก inline 22px)
- **Timeline align:** `.notif-timeline--notifs` padding-left 30px → inner icon-node/text align ใต้ parent column (icon center x=44, text x=68); connector recalc center-to-center (left:14, top:23, bottom:-23)
- **Drift แก้แล้ว:** INDEX_ui line 148 จาก "flat feed/ลบ renderGroup" → "hybrid grouped+solo (ใช้งานจริง)"

## พบระหว่างทาง (นอก scope ไม่แก้)
- **doc drift:** INDEX_ui line 148 บอก Phase 2b "ลบ renderGroup/toggleGroup/state.expanded → flat feed" แต่ notification.js จริงยังเป็น grouped (renderGroup/renderInnerNotif/toggleGroup ครบ) → code ไม่ตรง doc — ต้องเลือกว่า keep grouped (แก้ doc) หรือ flat จริง (แก้ JS)
- `.notif-stage` + `.notif-timeline-item` = dead CSS (ไม่มีใน JS/template)

## Scoped Command
- [ไฟล์]: app/static/core/css/notification.css
- [ตำแหน่ง]: `.notif-cat-icon.notif-icon-*` (พื้น icon) + `.notif-inner` (timeline)
- [งาน]: ใส่ tint อ่อนพื้น icon ตาม ntype + ทำ timeline connector/dot สีตามสถานะ
- [ข้อจำกัด]: `--vc-*` tokens เท่านั้น (ใช้ `*-bg`/`*-border` ที่มี), no shadow, tint อ่อน (Vercel light), CSS only ไม่แตะ JS
- [output]: diff CSS + สรุป

## Checklist
- [x] 1 PLAN — scoped 5 field + log
- [ ] 2 GUARD — แตะแค่ CSS, ไม่ใช่เงิน/model → ไม่ต้อง db-helper/test-first
- [ ] 3 BUILD — CSS notification.css
- [ ] 4 VERIFY — design rules + user ทดสอบ browser (server 5001 = user process)
- [ ] 5 SYNC — INDEX_ui.md § Design System
- [ ] 6 CLOSE — log → doc/

## หมายเหตุ
- `.notif-stage` = dead CSS (ไม่มีใน JS/template) — ไม่แตะ
- timeline ที่ render จริง = `.notif-inner` ในกลุ่ม booking ที่ expand
