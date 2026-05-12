# Flow การทำงานทุกระบบ — BBCenter V2

> สถานะ: ✅ Completed
> วันที่: 2026-04-06
> อ้างอิงจาก: auth_view.py, repair_view.py, maintenance_view.py, room_view.py, vehicle_view.py

---

## ระบบ Login / Auth (`auth_view.py`)

```
กรอก username + password
    ↓ check_ad_login() → LDAP
✅ Valid → หา User ใน DB → ถ้าไม่มีสร้างใหม่ → session (8 ชม.)
❌ Invalid → flash error
```

**Dashboard** — รวบรวม stats จากทุกระบบ (Repair/Maint/Vehicle/Room) render พร้อมกัน

**Manage Users** — superadmin เท่านั้น → แก้ role แต่ละคนต่อระบบ

---

## ระบบแจ้งซ่อม IT (`repair_view.py`)

**User:** แจ้งซ่อม → กรอก category, urgency, asset_tag, location, subject, รูป → บันทึก status=`pending`

**User (เจ้าของ):** แก้ไขได้ทุก field · ลบได้เฉพาะของตัวเอง

**Admin:**
- รับงาน: `pending` → `in_progress`
- ปิดงาน: `in_progress` → `done` (ต้องกรอก resolved_note)
- ดู Summary รายเดือน (pending / in_progress / done / urgent)

---

## ระบบแจ้งซ่อมอาคาร (`maintenance_view.py`)

Flow เหมือน Repair แต่มีเพิ่ม:
- ฟิลด์: contact_number, repair_cost, technician_type, scheduled_date, รูปหลังซ่อม
- Admin: Export Excel รายการทั้งหมด

---

## ระบบจองห้องประชุม (`room_view.py`)

**จอง:** เลือกห้อง (เล็ก/ใหญ่) + ชื่อเรื่อง + วันเวลาเริ่ม-สิ้นสุด
→ ตรวจ overlap → ถ้าชน → flash error "ถูกจองโดย [ชื่อ]"
→ ถ้าว่าง → บันทึก

**Calendar:** `GET /api/room/bookings` → JSON (FullCalendar) · สีต่างกันตามห้อง

**User เจ้าของ:** แก้ไข/ลบได้ (ตรวจ overlap ใหม่ทุกครั้งที่แก้)

---

## ระบบยานพาหนะ (`vehicle_view.py`) — ดูรายละเอียดเต็มที่

→ `notes/doc/2026-04-06_vehicle-booking-flow.md`

**Status Flow สรุป:**
```
pending → approved (Admin อนุมัติตรง)
pending → waiting_approver → approved (ผ่าน Approver แผนก)
pending/waiting_approver → rejected
```

---

## Telegram Notification Pattern (ทุกระบบที่รองรับ)

```
เกิด event → delete_old_message() → ส่งใหม่ → บันทึก telegram_message_id
```

---

## Permission Matrix

| Module | user | admin | approver | superadmin |
|--------|------|-------|----------|------------|
| Repair | แจ้ง, แก้/ลบของตัวเอง | เปลี่ยน status | — | ทุกอย่าง |
| Maintenance | แจ้ง, แก้/ลบของตัวเอง | เปลี่ยน status, export | — | ทุกอย่าง |
| Vehicle | จอง, แก้/ลบ pending ตัวเอง | approve, assign, ไมล์ | อนุมัติแผนกตัวเอง | ทุกอย่าง |
| Room | จอง, แก้/ลบของตัวเอง | — | — | ทุกอย่าง |
| Users | — | — | — | จัดการ roles |
