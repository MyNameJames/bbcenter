# Budget Management System — Phase 1: Model Changes
**วันที่:** 2026-04-13
**สถานะ:** completed (Phase 3C และ Phase 4 เป็น future feature)

## เป้าหมาย
เพิ่ม fields ใน models.py สำหรับ budget management system:
- **1A:** `VehicleBudget.approver_id` — ระบุ approver ต่องบกองแต่ละงบ
- **1B:** `VehicleMileage.personal_status` / `personal_paid_at` / `personal_paid_by_id` — track การชำระเงินส่วนตัว

## การตัดสินใจ
- `personal_status` ใช้ Integer: 0=pending, 1=paid (ไม่ใช้ String)
- `approver_id` เป็น nullable FK → ใช้กับ department budget เท่านั้น, central ไม่ต้องมี
- ไม่มี migration tool → ต้องรัน ALTER TABLE เองใน SQLite

## SQL สำหรับ migrate (รัน manual ใน SQLite)
```sql
ALTER TABLE vehicle_budget ADD COLUMN approver_id INTEGER REFERENCES user(id);
ALTER TABLE vehicle_mileage ADD COLUMN personal_status INTEGER DEFAULT 0;
ALTER TABLE vehicle_mileage ADD COLUMN personal_paid_at DATETIME;
ALTER TABLE vehicle_mileage ADD COLUMN personal_paid_by_id INTEGER REFERENCES user(id);
```

## Phase 2 (Budget UI) — เพิ่มเติม

### การเปลี่ยนแปลงเพิ่มเติม
- เพิ่ม `start_date`, `end_date` ใน VehicleBudget (Date, nullable)
- ลบ `border-left` / `border-top` สีพิเศษออกจาก card/KPI (ตาม design preference)
- แยก datalist central vs department ใน modal
- Route auto-create VehicleDepartment(central) เมื่อไม่มีใน DB
- เพิ่ม `_fmt_date_th()` helper
- KPI strip 7 ใบ + stagger animation
- Migrate shell → `_sidebar.html` + `_header.html`

## Phase 3 (Personal Reimbursement Page) — เพิ่มเติม

### สิ่งที่ทำ
- เพิ่ม route `budget_personal()` → `GET /admin/budget/personal`
- เพิ่ม route `budget_personal_mark_paid()` → `POST /admin/budget/personal/mark_paid`
- เพิ่ม route `budget_personal_mark_unpaid()` → `POST /admin/budget/personal/mark_unpaid`
- สร้าง `app/templates/vehicle/admin/budget_personal.html` — ตาราง personal trip พร้อม AJAX mark received
- ปรับ copy ให้ถูกทิศ: องค์กรเป็นผู้ **รับเงิน** (ไม่ใช่จ่ายคืน) → badge "รับเงินแล้ว", ปุ่ม "บันทึกรับเงิน"

### Business logic
- Personal trip = พนักงานใช้รถเพื่อส่วนตัว ต้องจ่ายค่าน้ำมัน+คนขับ **ให้องค์กร**
- `personal_status=0` = รอรับเงิน, `personal_status=1` = รับเงินแล้ว
- `personal_paid_by` = admin ที่ยืนยันรับเงิน, `personal_paid_at` = วันที่รับ

## ไฟล์ที่แก้ไข (ทั้งหมด)
- `app/models.py` — VehicleBudget, VehicleMileage
- `app/views/vehicle_view.py` — budget_manage(), _fmt_date_th(), budget_personal(), mark_paid/unpaid
- `app/templates/vehicle/admin/budget_manage.html` — redesign ทั้งหมด
- `app/templates/vehicle/admin/budget_personal.html` — หน้าใหม่
- `CLAUDE.md` — เพิ่ม test credentials + design preferences

---

## Future Features (ยังไม่ได้ทำ)

### Phase 3C — Navigation link
เพิ่มปุ่ม/link จาก `budget_manage.html` ไปยัง `/admin/budget/personal`
- วางบริเวณ filter bar หรือ section header ของหน้า budget_manage
- ใช้ `ds-btn ds-btn-secondary ds-btn-sm` + icon `fa-solid fa-user-tag`
- URL: `url_for('adminfleet.budget_personal', year=sel_year, month=sel_month)`

### Phase 4 — Department Budget Approval Flow
เมื่อ `expense_type='department'` ให้ route booking ไปยัง approver ที่กำหนดใน `VehicleBudget`
- ตรวจ `VehicleBudget` ที่ active (start_date ≤ today ≤ end_date) ของกองนั้น
- ถ้ามี approver → status เปลี่ยนเป็น `waiting_approver` และแจ้ง Telegram
- approver อนุมัติได้เฉพาะ booking ของกองตัวเอง
- ต้องแก้ทั้ง booking flow + Telegram notification + approval page
