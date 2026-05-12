# Frontend Design — ระบบจองรถ (Vehicle)

> สถานะ: 🔄 In Progress
> เริ่มต้น: 2026-04-09
> อ้างอิง: `vehicle.html`, `vehicle.js`, `vehicle.css`, `design-system.css`

---

## เป้าหมาย

ออกแบบและปรับปรุง Frontend ระบบจองรถทั้งหมด โดยเน้น **Mobile-first**

---

## Todo List (ทุกหน้าในระบบจองรถ)

| # | หน้า | Role | สถานะ |
|---|------|------|-------|
| 1 | `/vehicle` — หน้าหลัก Calendar + Modal จอง | USER | 🔄 In Progress |
| 2 | `/vehicle/history` — ประวัติการจอง | USER | ⏳ Pending |
| 3 | `/vehicle/edit/<id>` — แก้ไขการจอง | USER | ⏳ Pending |
| 4 | `/vehicle/admin` — จัดการทริป + Assign + Merge | ADMIN | ⏳ Pending |
| 5 | `/vehicle/mileage` — บันทึกไมล์ | ADMIN | ⏳ Pending |
| 6 | `/admin/manage-fleet` — จัดการรถและคนขับ | ADMIN | ⏳ Pending |
| 7 | `/admin/cost` — ค่าใช้จ่าย + Export | ADMIN | ⏳ Pending |
| 8 | `/admin/budget` — งบประมาณรายแผนก | ADMIN | ⏳ Pending |
| 9 | `/driver` — หน้าคนขับ | DRIVER | ⏳ Pending |

> หมายเหตุ: ตัดหน้า `/vehicle/detail/<id>` ออกจาก todo แล้ว เพราะมี popup (`#eventDetailModal`) ทำหน้าที่แทนได้ครบ

---

## หน้า `/vehicle` — UX Audit ผลการวิเคราะห์

### สิ่งที่มีอยู่แล้ว (ครบ ไม่ต้องแก้)

| Component | รายละเอียด |
|-----------|-----------|
| Calendar Grid | ปฏิทินรายเดือน custom JS + Toolbar prev/next/วันนี้ |
| Mobile collapse | scroll ลง → พับเหลือ 2 สัปดาห์, scroll ขึ้น → ขยาย |
| Mobile dot indicator | จุดสีบน cell ถ้ามี booking |
| Mobile list | คลิก cell → แสดงรายการของวันนั้นด้านล่าง |
| Modal จองรถ (#bookingModal) | ฟิลด์ครบ + Bootstrap 5 validation |
| Modal แก้ไข (#editBookingModal) | Flatpickr datetime + ฟิลด์ครบ |
| Modal รายละเอียด (#eventDetailModal) | single booking detail + actions |
| Modal ทริปร่วม (#groupDetailModal) | group members list |
| Modal More Events (#moreEventsModal) | รายการล้น cell บน mobile |

### ปัญหาที่พบและแผนแก้ไข

#### ✅ ตัดสินใจแล้ว

| ปัญหา | แนวทาง |
|-------|--------|
| ลบหน้า `/vehicle/detail/<id>` | ลบทิ้ง — popup ทำหน้าที่แทนได้ครบ |
| Mobile-list CSS ถูก comment ออก | ใช้ Bootstrap class จัดการ layout; เก็บแค่สี+font ใน CSS |
| Mobile scroll collapse หาย | นำกลับมา + เพิ่ม smooth animation |

#### ⏳ รอตัดสินใจ (ต้องดู prototype ก่อน)

| ปัญหา | ตัวเลือกที่ต้องแสดง |
|-------|-------------------|
| **Mobile list card hierarchy** | ต้องสร้าง prototype แสดง option ก่อน |
| **Calendar collapse animation** | ต้องแสดง option ก่อน (max-height / transform+opacity / etc.) |

---

## สิ่งที่ต้องทำต่อ (ขั้นตอนถัดไป)

1. ~~สร้าง HTML prototype~~ ✅ → `app/prototype-mobile-vehicle.html`
2. ~~แสดงตัวเลือก Calendar collapse animation~~ ✅ → อยู่ใน prototype แล้ว
3. **รอการตัดสินใจ** จากผู้ใช้ → implement จริงใน `vehicle.html` + `vehicle.css` + `vehicle.js`
4. **ลบ** `templates/vehicle/vehicle_detail.html` และ route `/vehicle/detail/<id>` ใน `vehicle_view.py`

---

## ข้อมูล Technical ที่เกี่ยวข้อง

### ไฟล์หลัก
| ไฟล์ | หน้าที่ |
|------|---------|
| `templates/vehicle/vehicle.html` | หน้าหลัก — Calendar + Modals ทั้งหมด |
| `static/js/vehicle.js` | Logic: renderCalendar, updateMobileList, collapse |
| `static/css/vehicle.css` | Styles: import design-system + component styles |
| `static/css/design-system.css` | Design tokens `--ds-*` ทั้งหมด |

### Design Tokens ที่ใช้
- Primary: `--ds-primary` (#4F46E5 Indigo-600)
- Status colors: `--ds-warning` (pending), `--ds-info` (waiting_approver), `--ds-success` (approved), `--ds-danger` (rejected)
- Font: Sarabun / IBM Plex Sans Thai

### Mobile Breakpoints
- `< 768px` — calendar compact + mobile list แสดง
- `< 992px` — sidebar ซ่อน, main-content เต็มจอ
