# Vehicle UI Overhaul — Design System + Icon Migration
**วันที่:** 2026-04-11
**สถานะ:** in-progress

## เป้าหมาย
1. เปลี่ยน visual style ทั้งหมดของ Vehicle section ให้เป็น Soft Minimalist
2. แยก modal ออกจาก vehicle.html เป็นไฟล์ย่อย
3. รวม JS ทั้งหมดไว้ใน vehicle.js
4. เปลี่ยน icon library เป็น Bootstrap Icons

## การตัดสินใจ

### Design Direction
- **เลือก:** Soft Minimalist (neutral gray bg + white cards + near-black CTA)
- **เหตุผล:** สอดคล้องกับ The Money Things aesthetic ที่ผู้ใช้อ้างอิง
- **Primary color:** เปลี่ยนจาก Indigo → Blue-600 (#2563EB)

### Icon Library
- **ทดลอง Themify Icons** → ยกเลิก เพราะผู้ใช้ต้องการกลับมาใช้ Bootstrap Icons
- **สรุป:** ใช้ Bootstrap Icons (`bi bi-*`) เป็นมาตรฐาน
- **Custom icon:** `calendar-add.png` แทน `bi-calendar3` ในทุกจุด

### Modal Extraction
- แยก 5 modals ออกจาก vehicle.html (807 บรรทัด → ~145 บรรทัด)
- ตั้งชื่อ prefix `vehicle-modal-*`
- JS ทั้งหมดย้ายไป vehicle.js — ลบ PATCH block (230 บรรทัด) ที่ซ้ำซ้อน

### Sidebar Breakpoint
- ลอง 1200px → ผู้ใช้ขอกลับ 992px (Bootstrap default)

## ไฟล์ที่แก้ไข
- `app/static/css/design-system.css` — token colors
- `app/static/css/vehicle.css` — sidebar, responsive, btn styles
- `app/static/js/vehicle.js` — JS consolidation + icon update
- `app/templates/_sidebar.html` — icon migration
- `app/templates/_header.html` — icon migration + breakpoint class
- `app/templates/vehicle/vehicle.html` — modal extraction
- `app/templates/vehicle/vehicle-modal-book.html` — new file
- `app/templates/vehicle/vehicle-modal-edit.html` — new file
- `app/templates/vehicle/vehicle-modal-detail.html` — new file
- `app/templates/vehicle/vehicle-modal-group.html` — new file
- `app/templates/vehicle/vehicle-modal-more-events.html` — new file
- `app/static/images/icons/calendar-add.png` — new custom icon

## Gotchas ที่พบ
- `ti-building` ไม่มีใน Themify → ใช้ `ti-briefcase` แทน
- Themify ต้องการ 2 class พร้อมกัน: `ti` + `ti-iconname`
- CDN Themify ที่ถูกต้อง: `https://unpkg.com/@icon/themify-icons/themify-icons.css`
