# Migrate room.html design → vehicle.html (v2.1 bb-*)
**วันที่:** 2026-08-05
**สถานะ:** completed

## เป้าหมาย
Migrate `room/room.html` + modal (book/edit/detail) + `room.js` + `room.css` ให้ใช้ design/shell/token เดียวกับ `vehicle/vehicle.html` (extends `_base_ue.html`, `bb-*` token, Material Symbols icon) แทนของเก่า (standalone shell, `vc-*` token, Lucide icon)

## การตัดสินใจ (confirm กับ user แล้วทุกข้อ)
- Shell: room.html → `{% extends '_base_ue.html' %}` (header2/sidebar2)
- CSS: ตัด `design-system.css`/`vehicle_admin.css`/`vehicle_fuel.css`/`vehicle.css` ออก
- Token: `vc-btn/vc-card/vc-badge` → `bb-btn/bb-card` (คง `room-badge`/`room-*` custom class แต่ผูก token ใหม่)
- Toolbar: custom grid → Bootstrap flex utility
- **Modal merge:** room_book.html + room_edit.html → modal เดียว (`#bookingModal`, `bkSetMode('create'|'edit')`) ตาม pattern `vehicle_book.html` — ลบ `room_edit.html`
- **Date/time field:** raw `<input>` → component `DateField`/`TimeRangeField` (`app/components/CHEATSHEET.md`)
- **room.js scope รวมด้วย** — icon/class ฝังใน JS-generated HTML (list มือถือ, event card, detail actions) ต้องแก้ตาม ไม่งั้นไม่ consistent จริง

### Icon mapping (Lucide → Material Symbols, confirm กับ user)
| เดิม (Lucide) | ใหม่ (Material Symbols) | จุดที่ใช้ |
|---|---|---|
| chevron-left/right | chevron_left/chevron_right | toolbar nav |
| calendar | calendar_month | ปุ่มวันนี้มือถือ |
| plus | add | ปุ่มจองห้อง |
| check | check | ปุ่มบันทึก (edit mode) |
| arrow-right | arrow_forward | ปุ่มส่งคำขอ (create mode) |
| info | info | info note |
| people-roof | **mindfulness** | avatar หัว modal detail + book (reuse ตาม pattern vehicle ที่ใช้ icon เดียวกันซ้ำ 2 modal) |
| door-open | **add_home** | แถวห้อง/สถานที่ (detail) + field room_name (book) |
| clock | **schedule** | แถวเวลา (detail) |
| file-text | **sell** | แถวหัวข้อประชุม (detail) + field title (book) |
| pencil | **edit** | หัว modal แก้ไข (ลบแล้ว-รวม modal) / ปุ่มแก้ไข list มือถือ / ปุ่มแก้ไข detail |
| trash-2 | **delete** | ปุ่มยกเลิก detail |
| user | **face** | ผู้จอง (list มือถือ + detail booker block) |
| calendar-x | **event_busy** | empty state ไม่มีการจอง |

## ไฟล์ที่แก้ไข
- `app/views/room_view.py` — เพิ่ม DateField/TimeRangeField instance ส่งเข้า template
- `app/templates/room/room.html` — extends `_base_ue.html`
- `app/templates/room/modals/room_book.html` — redesign header + รวม create/edit
- `app/templates/room/modals/room_detail.html` — redesign header/rows
- `app/templates/room/modals/room_edit.html` — **ลบ** (รวมเข้า room_book.html)
- `app/static/room/js/room.js` — bb-* class + Material Symbols + รวม booking modal logic
- `app/static/room/css/room.css` — token vc-* → bb-*

## Docs sync checklist (ก่อน `จบงาน`)
- [x] INDEX_ui.md § room templates + room.css + pages/room.js
- [x] INDEX_ui_history.md (append entry ใหม่ต่อท้ายทั้ง 3 section)

## VERIFY
- `.venv/bin/python -m pytest -q` → เขียวทั้งชุด (0 failed) — ไม่มี test ครอบคลุม room route ตรงๆ
- Smoke-render `room/room.html` ผ่าน Flask test client (blueprint ย่อย + fake user + 1 RoomBooking row) → status 200, ไม่มี Jinja error, component(date_field)/component(time_range_field) render ผ่าน
- grep ยืนยัน 0 จุดเหลือ `data-lucide`/`vc-btn`/`vc-card`/`vc-badge` ใน room templates/JS
- Browser check (server 5001 = user process, ทดสอบเองผ่าน `/dev/login/pjatuporn?next=/room`) — **รอผู้ใช้ยืนยัน**
- spawn `checker` agent → ผ่านทุกจุด (ดูสรุปด้านล่าง)

## สรุปการทำงาน
**สถานะ:** completed
**วันที่เสร็จ:** 2026-08-05

### สิ่งที่ทำ
- room.html: standalone shell → `{% extends '_base_ue.html' %}` (header2/sidebar2), toolbar → Bootstrap flex utility, card/badge → `bb-card`/`bb-badge`
- CSS head: ตัด `design-system.css`/`vehicle_admin.css`/`vehicle_fuel.css`/`vehicle.css` → เพิ่ม `tokens.css`/`badge.css`/`vehicle_calendar.css`(ใหม่ — base grid/mobile-list/`.bk-*` ที่ room ไม่เคยมีเอง มาจาก vehicle.css เดิม)/`room.css`
- room_book.html + room_edit.html รวมเป็นไฟล์เดียว (`room_book.html`, `bkSetMode('create'\|'edit')`) ตาม `vehicle_book.html` — ลบ `room_edit.html`; header redesign เป็น eyebrow+avatar; date/time เปลี่ยนจาก raw input → `DateField`/`TimeRangeField` component (เพิ่ม instance ใน `room_view.py::index()`)
- room_detail.html: header redesign (eyebrow+avatar สีตาม room kind), icon แถวรายละเอียดเปลี่ยนเป็น Material Symbols
- room.js: ตัด `core/icons.js` import + flatpickr, ผูก DateField/TimeRangeField component API, รวม booking modal logic (create+edit เดียวกัน), icon/class ทั้งหมด → Material Symbols/`bb-*`
- room.css: token `vc-*` → `bb-*` ทั้งไฟล์, ลบ `.cal-toolbar*`/`.room-detail-dot`/`.calendar-header-cell` (ย้ายไป utility/vehicle_calendar.css)
- ระหว่างทางพบ regression ที่แก้ก่อน commit: (1) ลืมโหลด `vehicle_calendar.css` แทน `vehicle.css` ที่ตัดออก — แก้แล้วก่อน verify; (2) ลบ `openDuplicateModal`/`?copy_from=` deep-link ไปเฉยๆ ทั้งที่ dashboard.html "ทำซ้ำ" ผูกอยู่ (`auth_view.py`) — เพิ่มกลับแล้ว

### การตัดสินใจสำคัญ
- Icon mapping 4 ตัวที่ไม่มี precedent ตรงจาก vehicle (mindfulness/add_home/schedule/sell) — confirm กับ user ผ่าน AskUserQuestion ก่อนลงมือ (ดูตารางด้านบน)
- Modal header pattern: redesign เต็มตาม vehicle_book/vehicle_detail (ไม่ใช่แค่สลับ icon) — confirm กับ user
- room_book.html + room_edit.html รวมเป็น modal เดียว ตาม vehicle pattern — confirm กับ user
- room.js รวมอยู่ใน scope งานนี้ (ไม่ใช่แค่ template) — confirm กับ user

### ไฟล์ที่เปลี่ยนแปลงทั้งหมด
- `app/views/room_view.py`
- `app/templates/room/room.html`
- `app/templates/room/modals/room_book.html`
- `app/templates/room/modals/room_detail.html`
- `app/templates/room/modals/room_edit.html` (ลบ)
- `app/static/room/js/room.js`
- `app/static/room/css/room.css`
- `app/static/vehicle/css/vehicle_calendar.css` (header comment — ระบุว่า room.html ใช้ร่วมแล้ว)
- `docs/notes/INDEX_ui.md`, `docs/notes/INDEX_ui_history.md`

### Docs sync
- [x] INDEX_ui.md
- [x] INDEX_ui_history.md
- [x] checker agent ยืนยันผ่าน (INDEX_routes.md/schema.md/INDEX.md/architecture.md/CHEATSHEET.md ยืนยัน out-of-scope ถูกต้อง)

---

## ส่วนเพิ่มเติม (2026-08-05, ต่อเนื่องวันเดียวกัน) — ลบ `room.css` ทั้งไฟล์

**คำขอ:** user ให้ตรวจว่า `room.css` มีอะไรที่ "ใช้ของที่มีอยู่แล้ว" แทนได้ แล้วลบไฟล์ทิ้ง

**ตรวจแล้วพบว่าทุก class มี component กลางใน `components.css`/`vehicle_calendar.css` ให้ใช้แทนได้หมด:**
- `.room-badge(--small/--large)` + `.room-dot` → `bb-badge is-info`(เล็ก)/`is-wr`(ใหญ่) ตรงๆ — สี match กันเป๊ะอยู่แล้ว (`bb-badge.is-info`/`.is-wr` ใช้ `--bb-info-bg`/`--bb-wr-bg` เหมือนที่ room.css เคย custom เอง), ตัด dot ตกแต่งทิ้งเพราะสี badge สื่อพอแล้ว
- `.event-card.room-small/.room-large` → inline `style="background:var(--bb-info-bg);color:var(--bb-info-tx)"` ตรงใน `pages/room.js` (ไม่มี tone variant ของ `.event-card` กลางให้ใช้ แต่ inline token ก็ไม่ต้องพึ่งไฟล์แยก)
- `.room-list-dot(--small/--large)` → `bb-avatar` + inline size/สี (component เดียวกับที่ใช้ทั่วระบบ)
- `#detailStatusAvatar[data-kind]` → set `el.style.background/color` ตรงใน JS แทน CSS attribute-selector
- `.room-mobile-empty` → `.vrc-m-empty/-empty-icon/-empty-title/-empty-sub` **มีอยู่แล้ว** ใน `vehicle_calendar.css` (room.html โหลดอยู่แล้ว) — pattern/icon (`event_busy`) เดียวกับที่ `pages/vehicle.js` ใช้อยู่แล้ว ไม่ต้องสร้างใหม่
- `.room-legend{flex-wrap:wrap}` → Bootstrap utility class `flex-wrap` ตรงๆ ใน template

**ผล:** `room.html` เหลือโหลด CSS แค่ `tokens.css`+`badge.css`+`vehicle/css/vehicle_calendar.css` (เหมือน `vehicle.html` เป๊ะ) — room ไม่มี CSS ของตัวเองอีกต่อไป

**ไฟล์ที่แก้เพิ่ม:** `app/templates/room/room.html`, `app/templates/room/modals/room_detail.html`, `app/static/room/js/room.js`, ลบ `app/static/room/css/room.css`

**VERIFY:** pytest เขียว (0 failed) + smoke-render `/room` ผ่าน test client ยืนยัน `room/css/room.css` ไม่ถูกอ้างอิงในหน้าแล้ว + badge class ใหม่ขึ้นจริง

**checker (รอบ 2, ยืนยันการลบ `room.css`):** ผ่านครบ — เจอ 1 จุด stale เดิม (ไม่เกี่ยวกับงานนี้) คือ `docs/notes/database/schema.md` แถว `room_booking` ยังชี้ `app/models.py:215` (path เก่าก่อนแตก `models/` package 2026-06-07) — **แก้แล้ว** → ชี้ `app/models/room.py:7` ตามจริง

## สรุปการทำงาน (final)
**สถานะ:** completed
**วันที่เสร็จ:** 2026-08-05

ทั้งงาน migrate room.html→vehicle.html design + งานลบ room.css + แก้ stale link ใน schema.md เสร็จครบ — docs sync ผ่าน checker 2 รอบ ไม่มีของค้าง
