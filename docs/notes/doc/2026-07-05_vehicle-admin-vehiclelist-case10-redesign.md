# Vehicle Admin — vehicleList redesign (Case 10 chrome) + design system tweaks
**วันที่:** 2026-07-05
**สถานะ:** in-progress

## เป้าหมาย
1. ปรับ padding/design เล็กๆ ใน design system: `.bb-sidebar-link.sub`, `.bb-search`, `.bb-btn`/`.bb-filter-btn` radius
2. ออกแบบ Case 16 (Vehicle usage list) ใน `bootstrap-cases-gallery.html` ผ่าน `/bootstrap-guide` — วนหลายรอบจนได้ design ที่ต้องการ (โครง Case 10 + ข้อมูลรถ 5 สถานะ + multi-job)
3. รวมการ์ด "การใช้รถ" (`#vehicleList`) กับการ์ด "รายละเอียดการเดินทาง" (`#tripList`, ลบทิ้ง) เข้าเป็นหน้าเดียวใน `vehicle_admin.html`/`.js`
4. เอา design จาก gallery (Case 16) ไปแทนที่ของจริงใน `#vehicleList` — ทิศทาง gallery → production เท่านั้น ห้าม reverse

## การตัดสินใจ
- **thumb สีเขียว/เทา/ส้ม + `.bb-badge`** (ไม่ใช้ `.bb-avatar`/`.bb-status`) — user เลือก design v1 (ต่อยอด Case 10) กลับมาแทนที่ design ที่ sync จากโค้ดจริงในรอบก่อน
- **5 สถานะเท่านั้น** (ว่าง/อนุมัติแล้ว/ออกเดินทางแล้ว/สิ้นสุดการเดินทาง/กำลังซ่อม) — ตัดสถานะที่ 6 "ยกเลิก (ไม่บันทึกไมล์)" ที่เคยเพิ่มเข้ามาเองออก เพราะไม่ได้อยู่ใน spec ที่ user ขอ
- **ทะเบียนไม่คลิก = Swap** — ตัดออกตามที่ user สั่ง (ไม่ได้อยู่ใน spec)
- **ปุ่ม "ส่งซ่อม"/"เสร็จซ่อม" ถูกตัดออก** — ผลข้างเคียงจริง: `openRepairModal()`/`fixDone()` ไม่มีจุดเรียกใช้จาก UI ที่ไหนในแอปแล้ว (แจ้ง user แล้ว ยังไม่มีคำตอบว่าจะย้ายไปหน้าไหน)
- **`.bb-buy-thumb`/`.bb-buy-item` promote เข้า `components.css`** (จาก demo-only CSS ใน gallery) เพราะใช้จริงในหน้า production แล้ว
- **มุมขวา header เปลี่ยนความหมายตามสถานะ**: ว่าง/ซ่อม = ไม่มีเลย, อนุมัติแล้ว/ออกเดินทางแล้ว = เวลาเดินทาง, สิ้นสุดการเดินทาง = หักงบกลาง/หักงบกอง(static) หรือปุ่ม "เรียกเก็บ"→"จ่ายแล้ว"

## ไฟล์ที่แก้ไข
- `app/static/core/css/components.css` — `.bb-sidebar-link.sub` padding, `.bb-search`, `.bb-btn`/`.bb-filter-btn` radius, ใหม่ `.bb-buy-thumb`/`.bb-buy-item`
- `app/static/core/bootstrap-cases-gallery.html` — Case 16 (หลายรอบ iterate)
- `.claude/skills/bootstrap-guide/SKILL.md` — case index sync ตาม Case 16
- `app/templates/vehicle/admin/vehicle_admin.html` — ลบ `#sectionAfter`/`#tripList`/`#afterCount`; card col-4 เปลี่ยนเป็นโครง Case 10
- `app/static/vehicle/js/vehicle_admin.js` — ลบ `renderAfter/renderTripRow/getVehicleStatus/isToday`; เพิ่ม `groupVehicleJobs`; เขียนใหม่ `renderVehicleRow/renderVehicleJobBlock`

## Docs sync checklist (ก่อน `จบงาน`)
- [x] INDEX_ui.md § Design System (`components.css` entry)
- [x] INDEX_ui.md § Templates (`vehicle_admin.html` entry)
- [x] INDEX_code.md § Frontend JS (`vehicle_admin.js` entry ใหม่ทั้งแถว)
- [ ] schema.md — ไม่เกี่ยว (ไม่มีการแก้ model)
- [ ] migrations-index.md — ไม่เกี่ยว
- [ ] architecture.md — ไม่แตะ (checker ยืนยันว่าไม่มี flow นี้อยู่แล้ว ไม่ต้อง correct)

## สรุปการทำงาน
**สถานะ:** completed
**วันที่เสร็จ:** 2026-07-05

### สิ่งที่ทำ
- แก้ padding `.bb-sidebar-link.sub`, redesign `.bb-search`/`.bb-btn`/`.bb-filter-btn` (radius, border, bg)
- ออกแบบ Case 16 ใน gallery ผ่าน `/bootstrap-guide` วนหลายรอบ (v1 → sync กับโค้ดจริง → revert กลับ v1 + โครง Case 10 เต็มรูปแบบ) จนได้ design สุดท้ายที่ user ยืนยัน
- Consolidate การ์ด "การใช้รถ" + "รายละเอียดการเดินทาง" เป็นการ์ดเดียว ลบ `#sectionAfter` ทิ้ง
- Port design จาก gallery Case 16 → production จริงใน `vehicle_admin.html`/`.js` (ทิศทางเดียว ไม่ reverse)
- promote `.bb-buy-thumb`/`.bb-buy-item` เป็น shared component ใน `components.css`
- รัน pytest verify (47 passed, 1 failed — failure เป็นของเดิมก่อน session นี้ ไม่เกี่ยวกับที่แก้ ยืนยันด้วย git diff scope)
- spawn `checker` agent ตรวจ Maintenance Protocol เทียบเฉพาะไฟล์ที่แก้ session นี้ (ไม่รวม diff เดิมที่ค้างอยู่ก่อน) → sync เอกสารตามที่ checker แจ้ง

### การตัดสินใจสำคัญ
- ดูหัวข้อ "การตัดสินใจ" ด้านบน (ตัดสถานะที่ 6, ตัด Swap-click, ตัดปุ่มซ่อม, thumb สีเขียว/เทา/ส้มแทน avatar)

### ไฟล์ที่เปลี่ยนแปลงทั้งหมด
- `app/static/core/css/components.css`
- `app/static/core/bootstrap-cases-gallery.html`
- `.claude/skills/bootstrap-guide/SKILL.md`
- `app/templates/vehicle/admin/vehicle_admin.html`
- `app/static/vehicle/js/vehicle_admin.js`
- `docs/notes/INDEX_ui.md`
- `docs/notes/INDEX_code.md`

### Docs sync
- [x] INDEX_ui.md § Design System
- [x] INDEX_ui.md § Templates
- [x] INDEX_code.md § Frontend JS
- [x] schema.md — ไม่เกี่ยว (ยืนยันแล้ว)
- [x] migrations-index.md — ไม่เกี่ยว
- [x] architecture.md — ไม่เกี่ยว (checker ยืนยัน ไม่มี flow นี้อยู่แล้วให้ correct)

### ค้างไว้ — ยังไม่ตัดสินใจ
- `openRepairModal()`/`fixDone()` + modal `#repairModal` ไม่มีปุ่มเรียกใช้จาก UI ที่ไหนแล้ว — รอ user ตัดสินใจว่าจะย้ายจุดเรียกไปหน้าอื่น (เช่น "รถและคนขับ") หรือปล่อยไว้แบบนี้
- doc-stats.sh แจ้งว่า `CLAUDE.md`/`INDEX_routes.md`/`INDEX_code.md`/`schema.md`/`architecture.md` เกิน budget อยู่แล้วก่อน session นี้ (ไม่ใช่ผลจาก session นี้ — เกินมาเยอะมากอยู่แล้ว) และ `INDEX_ui.md` ใกล้เต็ม budget (48161/50000 tokens) — เป็นหนี้เอกสารเดิมที่สะสมมานาน แนะนำแยกเป็นงาน "split เอกสารใหญ่" ต่างหาก ไม่ใช่ scope ของ session นี้
- pytest `test_owner_cancel_waiting_approver_ok` แดงอยู่ — เป็นของเดิมก่อน session นี้ (ไม่เกี่ยวกับไฟล์ที่แก้) ควรมีคน follow-up แยก
