# ระบบจองรถ — Flow การทำงานอย่างละเอียด

> สถานะ: ✅ Completed
> วันที่: 2026-04-06
> อ้างอิงจาก: `vehicle_view.py`, `vehicle.html`, `vehicle_detail.html`, `vehicle_mileage.html`

---

## ภาพรวม: ผู้ใช้ในระบบนี้มี 4 ประเภท

| Role | เข้าถึงได้ที่ | ทำอะไรได้ |
|------|--------------|-----------|
| **user** | `/vehicle` | จองรถ, ดู/แก้/ลบของตัวเอง |
| **admin** (หรือ superadmin) | `/vehicle`, `/vehicle/admin`, `/vehicle/mileage`, `/admin/manage-fleet`, `/admin/cost` | อนุมัติ, assign รถ, บันทึกไมล์, จัดการ fleet, ดูค่าใช้จ่าย |
| **approver** | `/vehicle/detail/<id>` | อนุมัติ/ปฏิเสธ เฉพาะแผนกตัวเอง |
| **driver** (คนขับที่ผูก User) | `/driver` | ดูทริปที่ได้รับมอบหมาย, บันทึกไมล์ |

---

## STEP 1: Login เข้าระบบ

```
เปิด browser → / (root)
    ↓
ยังไม่ login → redirect → /login
    ↓
กรอก username + password (Windows AD credentials)
    ↓
Flask ส่งไป check_ad_login() → LDAP server
    ↓
✅ Valid → ค้นหา User ใน DB
    ├─ ยังไม่มี → สร้างใหม่อัตโนมัติ (full_name, email, department จาก AD)
    └─ มีแล้ว → ใช้ข้อมูลเดิม
    ↓
login_user() → session (TTL 8 ชม.) → redirect → /dashboard
❌ Invalid → flash "User หรือ Password ไม่ถูกต้อง"
```

---

## STEP 2: Dashboard → เข้าระบบจองรถ

```
/dashboard
    ↓
sidebar: คลิก "จองรถ" หรือ "ยานพาหนะ"
    ↓
GET /vehicle → vehicle.html
```

---

## STEP 3: หน้าหลัก `/vehicle` — สิ่งที่เห็นและทำได้

### 3.1 ปฏิทินการจอง (Calendar View)

หน้าแรกที่โหลดขึ้นมาคือ **ปฏิทินรายเดือน** แสดง booking ทั้งหมดในระบบ โดยดึงจาก `window.BOOKINGS` (inject จาก Jinja2)

**ปุ่มบน Toolbar:**

| ปุ่ม | การทำงาน |
|------|---------|
| `‹` (prev) | เลื่อนปฏิทินไปเดือนก่อนหน้า (JS เท่านั้น ไม่ reload) |
| ชื่อเดือน | แสดงเดือน/ปีปัจจุบัน |
| `›` (next) | เลื่อนปฏิทินไปเดือนถัดไป |
| **วันนี้** | กลับมาที่วันปัจจุบัน |

**บน Cell วันในปฏิทิน:**
- มี booking → แสดง chip สีตาม status (เหลือง=pending, ฟ้า=waiting_approver, เขียว=approved)
- คลิก chip → เปิด popup แสดงรายละเอียดของ booking วันนั้น

---

### 3.2 ปุ่ม "จองรถ" → เปิด Modal

**บน Mobile:** ปุ่ม `+ จองรถ` ที่ด้านบนรายการ
**บน Desktop:** คลิกบน cell ของวันที่ต้องการ

**Modal จองรถ — ฟิลด์ที่กรอก:**

| ฟิลด์ | ชนิด | Validate |
|-------|------|---------|
| วันและเวลาออกเดินทาง | datetime-local | ต้องกรอก |
| วันและเวลากลับ | datetime-local | ต้องมากกว่าเวลาไป + ต้องเป็นวันเดียวกัน (ห้ามข้ามวัน) |
| ปลายทาง | text | ต้องกรอก |
| วัตถุประสงค์ | text | ต้องกรอก |
| จำนวนผู้โดยสาร | number | default=1 |
| ต้องการคนขับ | checkbox | default=off |
| จุดขึ้นรถ | text | optional |

**ปุ่มใน Modal:**

| ปุ่ม | Action | ผลลัพธ์ |
|------|--------|---------|
| **ยืนยันการจอง** | POST `/vehicle/book` | สร้าง VehicleBooking (status=`pending`) → flash success → reload |
| **ยกเลิก** / `✕` | ปิด Modal | ไม่มีการเปลี่ยนแปลง |

**Validation ที่ server:**
- `start >= end` → flash error "เวลากลับต้องมากกว่าเวลาไป"
- `start.date() != end.date()` → flash warning "ไม่สามารถจองข้ามวันได้"

---

## STEP 4: สถานะหลังจองเสร็จ — รอ Admin

หลัง submit booking ใหม่จะมี status = **`pending`** ระบบจะแสดงใน Calendar สีเหลือง

**สิ่งที่ User ทำได้กับ booking ของตัวเองที่ status=`pending`:**

### 4.1 แก้ไข Booking

คลิก chip ใน calendar → popup → คลิกปุ่ม **✏️ แก้ไข**
→ GET `/vehicle/edit/<id>` → หน้า `vehicle_edit.html`

**Condition ที่แก้ไขได้:**
- เป็นเจ้าของ booking เท่านั้น
- status ต้องเป็น `pending` เท่านั้น (ถ้าถูกดำเนินการแล้ว → flash warning)

**ฟิลด์ที่แก้ไขได้:** วันเวลาไป-กลับ, ปลายทาง, วัตถุประสงค์, จำนวนผู้โดยสาร, ต้องการคนขับ, จุดขึ้นรถ

**ปุ่ม:**
| ปุ่ม | Action | ผลลัพธ์ |
|------|--------|---------|
| **บันทึก** | POST `/vehicle/edit/<id>` | อัปเดต DB → flash success → redirect /vehicle |
| **ยกเลิก** | link → `/vehicle` | ไม่บันทึก |

### 4.2 ลบ Booking

คลิก chip → popup → ปุ่ม **🗑️ ลบ** → confirm dialog
→ POST `/vehicle/delete/<id>`

**สิทธิ์การลบ:**
| ผู้ลบ | ลบได้ status ไหน |
|-------|----------------|
| User เจ้าของ | `pending`, `rejected` เท่านั้น |
| Admin | ทุก status |

ถ้า User พยายามลบ `approved` หรือ `waiting_approver` → flash warning "ไม่สามารถลบได้ กรุณาติดต่อ Admin"

### 4.3 ดูรายละเอียด

คลิก **🔍 รายละเอียด** → GET `/vehicle/detail/<id>` → `vehicle_detail.html`

แสดงข้อมูลครบ: ผู้จอง, รถที่ assigned, วันเวลา, ปลายทาง, วัตถุประสงค์, คนขับ, จำนวนคน, status badge

**ปุ่ม ย้อนกลับ** → `history.back()` (JS)

---

## STEP 5: Admin อนุมัติ — `/vehicle/admin`

Admin เข้าหน้า `/vehicle/admin` → เห็น booking ทั้งหมด แยกตาม status

### 5.1 Assign + อนุมัติรายการเดี่ยว

สำหรับแต่ละ booking ที่ status=`pending`:

**ฟิลด์ที่ Admin กรอก:**

| ฟิลด์ | หมายเหตุ |
|-------|----------|
| รถหลัก (assigned_vehicle_id) | dropdown จาก Vehicle ที่ status='active' |
| รถสำรอง (assigned_vehicle2_id) | optional, รถคันที่ 2 |
| คนขับหลัก (driver_id) | dropdown จาก Driver ที่ is_active=True |
| คนขับสำรอง (driver2_id) | optional |
| กลุ่มทริป (trip_group) | optional, เช่น TRP-001 |
| ประเภทค่าใช้จ่าย (expense_type) | `central` / `department` / `personal` |
| หมวดย่อย (central_category) | แสดงเฉพาะถ้า expense_type=central |
| แผนกที่รับผิดชอบ (trip_department) | default=แผนกผู้จอง |

**ปุ่ม Action:**

| ปุ่ม | action value | ผลลัพธ์ |
|------|-------------|---------|
| **✅ อนุมัติ** | `approve` | status → `approved` + notify_approved() → Telegram |
| **⏩ ส่งต่อ Approver** | `forward` | status → `waiting_approver` + notify_forwarded_to_approver() → Telegram |
| **❌ ปฏิเสธ** | `reject` | status → `rejected` + notify_rejected() → Telegram |
| **นำออกจากกลุ่ม** | `ungroup` | ล้าง trip_group, vehicle, vehicle2 |

POST ไปที่ `/vehicle/admin/assign/<id>`

### 5.2 รวมทริป (Merge)

เมื่อมี booking หลายรายการที่ต้องการให้ใช้รถคันเดียวกัน:

1. Admin **tick checkbox** หน้า booking ที่ต้องการรวม (ต้องเลือกอย่างน้อย 2 รายการ)
2. เลือก **รถ** (บังคับ) และ **คนขับ** (ถ้ามีรายการที่ขอคนขับ)
3. กรอก **ชื่อกลุ่ม** หรือปล่อยว่าง (ระบบสร้างให้อัตโนมัติ TRP-001, TRP-002 ...)
4. เลือก action:

| ปุ่ม | ผลลัพธ์ |
|------|---------|
| **รวมและอนุมัติ** | ทุก booking → status=`approved`, trip_group=ชื่อกลุ่ม + notify แต่ละคน |
| **รวมและส่ง Approver** | ทุก booking → status=`waiting_approver` + notify แต่ละคน |

POST ไปที่ `/vehicle/admin/merge`

**Validation:**
- เลือกน้อยกว่า 2 → flash warning
- ไม่เลือกรถ → flash warning
- มีรายการขอคนขับแต่ไม่เลือกคนขับ → flash warning บอกจำนวน

---

## STEP 6: Telegram Notification Pattern

**ทุกครั้งที่ status เปลี่ยน** ระบบจะ:

```
delete_old_message(booking.telegram_message_id)  ← ลบข้อความเก่า
    ↓
ส่งข้อความใหม่ไป Telegram group/channel
    ↓
บันทึก telegram_message_id ใหม่ → DB
```

**Functions ใน telegram_service.py:**

| Function | เรียกเมื่อ |
|---------|-----------|
| `notify_approved(booking)` | Admin อนุมัติตรง |
| `notify_forwarded_to_approver(booking)` | Admin ส่งต่อ Approver |
| `notify_approver_approved(booking, user)` | Approver อนุมัติ |
| `notify_rejected(booking, user)` | ใครก็ตาม reject |

**In-App Notification** (นอกจาก Telegram):
- สร้าง `Notification` record ให้ user ผู้จองทุกครั้ง
- แสดงใน header แบบ bell icon + badge นับจำนวน unread
- API: `GET /api/notifications` → JSON
- ปุ่ม **อ่านทั้งหมด** → POST `/api/notifications/read-all`
- คลิกรายการ → POST `/api/notifications/<id>/read`

---

## STEP 7: Approver อนุมัติ

**เงื่อนไข:** `role_vehicle = 'approver'` และ `department == booking.user.department`

หลัง Admin forward → booking status = `waiting_approver`
Approver ได้รับ Telegram notification → คลิก link → `/vehicle/detail/<id>`

**ส่วน UI ที่เห็นในหน้า detail (เฉพาะ Approver แผนกเดียวกัน):**

```
┌─────────────────────────────────┐
│ ส่วนจัดการสำหรับผู้อนุมัติ     │
│                                 │
│  รายการนี้รอการอนุมัติจากคุณ   │
│                                 │
│  [✅ อนุมัติให้เดินทาง]  [❌ ไม่อนุมัติ]  │
└─────────────────────────────────┘
```

| ปุ่ม | action | ผลลัพธ์ |
|------|--------|---------|
| **✅ อนุมัติให้เดินทาง** | `approve` | status → `approved` + notify_approver_approved() + in-app notif |
| **❌ ไม่อนุมัติ** | `reject` | status → `rejected` + notify_rejected() + in-app notif |

POST ไปที่ `/vehicle/approve/<id>`

**Validation ที่ Server:**
- booking.status ≠ `waiting_approver` → flash warning
- Approver ต่างแผนก → flash danger "อนุมัติได้เฉพาะแผนกเดียวกัน"

---

## STEP 8: บันทึกไมล์ — `/vehicle/mileage` (Admin)

หลัง approved → Admin เข้าบันทึกไมล์จริงของการเดินทาง

หน้านี้แสดง **เฉพาะ booking ที่ status=`approved`**

### 8.1 บันทึกไมล์ก่อนออก (entry_type = 'start')

| ฟิลด์ | หมายเหตุ |
|-------|----------|
| เลขไมล์ก่อนออก (odometer_start) | ตัวเลข |
| เวลาออกจริง (actual_start) | datetime |
| รูปหน้าปัด (odometer_start_img) | อัปโหลดไฟล์ → `static/uploads/mileage/` |

**ปุ่ม:** บันทึกไมล์ก่อนออก → POST `/vehicle/mileage` (entry_type='start')

### 8.2 บันทึกไมล์หลังกลับ (entry_type = 'end')

| ฟิลด์ | หมายเหตุ |
|-------|----------|
| เลขไมล์หลังกลับ (odometer_end) | ต้องมากกว่า odometer_start |
| เวลากลับจริง (actual_end) | datetime |
| รูปหน้าปัด (odometer_end_img) | อัปโหลดไฟล์ |
| เติมน้ำมันระหว่างทาง (refuel) | checkbox |
| → จำนวนลิตร (refuel_amount) | แสดงถ้า refuel=true |
| → รูปสลิปน้ำมัน (refuel_img) | แสดงถ้า refuel=true |
| ค่าน้ำมัน manual (fuel_cost) | ถ้ากรอก → override formula |

**Validation:**
- odometer_end ≤ odometer_start → flash error ❌ ไม่บันทึก

**หลัง entry_type='end' บันทึกสำเร็จ → ระบบหักงบอัตโนมัติ:**

```python
# trigger เฉพาะเมื่อ
entry_type == 'end'
AND booking.trip_department มีค่า
AND booking.expense_type IN ['central', 'department']

# คำนวณ
distance = odometer_end - odometer_start
fuel_price = SystemConfig.get('fuel_price')  # default 40 บาท/ลิตร
fuel_cost = mileage.fuel_cost  OR  (distance / fuel_rate) * fuel_price

# หัก
DepartmentBudget.used_amount += fuel_cost
```

---

## STEP 9: คนขับบันทึกไมล์ — `/driver` (Driver Role)

**เงื่อนไข:** User ต้องผูกกับ Driver record (`Driver.user_id = current_user.id`)

ถ้าไม่ได้ผูก → flash warning "บัญชียังไม่ได้ผูกกับพนักงานขับรถ" → redirect /vehicle

### 9.1 หน้า Driver Home

แสดงทริปที่ approved และ driver_id หรือ driver2_id เป็นตัวเอง

**ปุ่มต่อ Booking แต่ละรายการ:**

| ปุ่ม | ทำงาน |
|------|-------|
| **บันทึกไมล์ก่อนออก** | form กรอก odometer_start + actual_start + รูปหน้าปัด |
| **ปิดงาน (บันทึกไมล์กลับ)** | form กรอก odometer_end + actual_end + รูปหน้าปัด + refuel |

POST ไปที่ `/driver/mileage`

**Logic เหมือนกับ Admin บันทึกไมล์ทุกอย่าง** รวมถึงหักงบประมาณเมื่อ entry_type='end'

---

## STEP 10: หน้าประวัติ `/vehicle/history`

แสดง **เฉพาะ booking ของ user ปัจจุบัน** เรียงล่าสุดก่อน

**Filter ที่ทำได้:**

| ตัวกรอง | Query param | ผลลัพธ์ |
|---------|------------|---------|
| ทั้งหมด | ไม่มี | ทุก booking ของ user |
| รออนุมัติ | `?status=pending` | เฉพาะ pending |
| อนุมัติแล้ว | `?status=approved` | เฉพาะ approved |
| ไม่อนุมัติ | `?status=rejected` | เฉพาะ rejected |

---

## STEP 11: Admin — จัดการ Fleet `/admin/manage-fleet`

Admin เท่านั้น

### 11.1 จัดการรถ

| ปุ่ม/Action | form action value | ผลลัพธ์ |
|------------|-------------------|---------|
| **+ เพิ่มรถ** | `add_vehicle` | สร้าง Vehicle ใหม่ |
| **✏️ แก้ไข** | `edit_vehicle` | อัปเดต brand, model, plate, capacity, status, fuel_rate |
| **🗑️ ลบ** | `delete_vehicle` | ลบ Vehicle |

ฟิลด์รถ: brand, model, license_plate (unique), capacity, status (active/maintenance), fuel_rate

### 11.2 จัดการคนขับ

| ปุ่ม/Action | form action value | ผลลัพธ์ |
|------------|-------------------|---------|
| **+ เพิ่มคนขับ** | `add_driver` | สร้าง Driver ใหม่ |
| **✏️ แก้ไข** | `edit_driver` | อัปเดต name, phone, is_active, user_id |
| **🗑️ ลบ** | `delete_driver` | ลบ Driver |

ฟิลด์คนขับ: ชื่อ, เบอร์โทร, สถานะ (active), ผูกกับ User account (optional)

---

## STEP 12: Admin — ค่าใช้จ่าย `/admin/cost`

### 12.1 ตั้งราคาน้ำมัน

กรอกราคาน้ำมัน (บาท/ลิตร) → POST `/admin/cost` (action=save_fuel_price)
บันทึกใน `SystemConfig` key='fuel_price'
**ค่า default = 40 บาท/ลิตร**

### 12.2 ดูสรุปค่าใช้จ่าย

Filter ได้: ปี, เดือน, ประเภทค่าใช้จ่าย

แสดงตารางรายการทุกทริปที่ approved พร้อม:
- ระยะทาง (km)
- ค่าน้ำมัน (คำนวณหรือ override)
- OT คนขับ:
  - วันอาทิตย์ → flat 300 บาท
  - จันทร์-เสาร์ หลัง 16:00 → 20 บาท/ชม
- รวมค่าใช้จ่าย

### 12.3 Export Excel

ปุ่ม **Export** → GET `/admin/cost/export` → ดาวน์โหลดไฟล์ .xlsx

---

## STEP 13: Admin — งบประมาณ `/admin/budget`

### ตั้งงบประมาณรายแผนก

กรอก: แผนก, ปี, เดือน, จำนวนเงิน, ประเภทงบ (central/department)
→ POST `/admin/budget` (action=set_budget)

ถ้ามีอยู่แล้ว → อัปเดต
ถ้ายังไม่มี → สร้างใหม่

**Unique constraint:** `(department, year, month, budget_type)` — ตั้งได้แผนกละ 1 budget ต่อเดือนต่อประเภท

แสดง: งบตั้ง, ใช้ไปแล้ว, คงเหลือ, % การใช้งาน

---

## Status Flow สรุป

```
[User จอง]
    ↓
 pending  ←─────────────────────── (แก้ไขได้ / ลบได้)
    ↓
[Admin ดำเนินการ]
    ├──── approve ──────────────→  approved  ✅
    ├──── forward ──────────────→  waiting_approver  ⏳
    │                                  ↓
    │                         [Approver (แผนกเดียวกัน)]
    │                              ├── approve → approved ✅
    │                              └── reject  → rejected ❌
    └──── reject  ──────────────→  rejected   ❌

[หลัง approved]
    ↓
Admin/Driver บันทึก odometer_start (ก่อนออก)
    ↓
Admin/Driver บันทึก odometer_end (หลังกลับ)
    ↓
หักงบประมาณอัตโนมัติ (ถ้า expense_type=central/department)
```

---

## ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|------|---------|
| `views/vehicle_view.py` | Business logic ทั้งหมด (1,374 lines) |
| `views/telegram_service.py` | ส่ง Telegram notification |
| `templates/vehicle/vehicle.html` | หน้าหลัก + Calendar + Modal จอง |
| `templates/vehicle/vehicle_edit.html` | หน้าแก้ไข booking |
| `templates/vehicle/vehicle_detail.html` | รายละเอียด + Approver panel |
| `templates/vehicle/vehicle_mileage.html` | Admin บันทึกไมล์ |
| `templates/vehicle/vehicle_history.html` | ประวัติการจองของ user |
| `templates/vehicle/driver_home.html` | หน้าคนขับ |
| `templates/vehicle/admin/vehicle_admin.html` | Admin จัดการทริป |
| `templates/vehicle/admin/admin_manage_fleet.html` | จัดการรถ/คนขับ |
| `templates/vehicle/admin/vehicle_cost.html` | สรุปค่าใช้จ่าย |
| `templates/vehicle/admin/budget_manage.html` | จัดการงบประมาณ |
