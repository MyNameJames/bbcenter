# Database Design Review — BBCenter V2

> สถานะ: ✅ Completed
> วันที่: 2026-04-06
> อ้างอิงจาก: ข้อมูลจริงใน portal.db + models.py

---

## สถานะ DB ปัจจุบัน (ข้อมูลจริง)

| ตาราง | จำนวน records | หมายเหตุ |
|-------|-------------|---------|
| user | 7 | - |
| vehicle | 6 | ทุกคัน fuel_rate = 10.0 (ไม่เคยแก้ไข) |
| driver | 4 | ผูก user_id แค่ 1 คน |
| vehicle_booking | 37 | pending=11, approved=25, waiting=1 |
| vehicle_mileage | 3 | บันทึกไมล์แล้วแค่ 3 จาก 25 approved |
| department_budget | 6 | - |
| notification | - | - |
| shared_ride | **0** | ไม่มีข้อมูล และไม่มีใน models.py |

---

## ปัญหาที่พบใน Schema ปัจจุบัน

### 🔴 Critical — ส่งผลต่อ Data Integrity

**1. `vehicle_booking` มี 21 columns — ทำหลายหน้าที่เกินไป**

ปัจจุบัน 1 ตารางเก็บ 4 เรื่องผสมกัน:
- ข้อมูลการจอง (destination, purpose, passenger_count)
- การ assign รถ (assigned_vehicle_id, assigned_vehicle2_id, driver_id, driver2_id)
- ข้อมูลการเงิน (expense_type, central_category, trip_department)
- Notification (telegram_message_id)

**2. `expense_type` เป็น NULL ใน 19/37 records (51%)**

```sql
-- ข้อมูลจริง
expense_type = NULL   → 19 records
expense_type = central → 12
expense_type = department → 3
expense_type = personal → 3
```
การที่ booking ไม่มี expense_type ทำให้หักงบประมาณไม่ได้เลย

**3. รถ 2 คัน + คนขับ 2 คน Hardcoded ใน booking**

```sql
assigned_vehicle_id   -- รถคัน 1
assigned_vehicle2_id  -- รถคัน 2 (hardcoded!)
driver_id             -- คนขับคน 1
driver2_id            -- คนขับคน 2 (hardcoded!)
```
ถ้าต้องการรถ 3 คัน ต้องแก้ทั้ง schema + โค้ด

**4. `trip_group` เป็นแค่ string ลอยๆ ไม่มี Trip table**

```sql
trip_group = 'TRP-001'  -- ข้อมูลจริงในหลาย records
trip_group = 'TRP-21'   -- เลขกระโดด ไม่ consistent
```
ไม่มีที่เก็บข้อมูลกลางของทริป เช่น ใครเป็นคนสร้าง, สถานะรวม

**5. `department_budget` ใช้ field `department` สองความหมาย**

```sql
-- budget_type = 'department' → department = ชื่อกอง (ถูก)
'กองสนับสนุนและบริการ', 'กองวิชาการ'

-- budget_type = 'central' → department = ชื่อหมวด (ผิด concept!)
'รายการเดินรถ Monk Chat', 'ป่วย/หาหมอ'
```
ควรแยก field ให้ชัดเจน

---

### 🟡 Warning — ส่งผลต่อ Feature ในอนาคต

**6. `vehicle` ไม่มี Service History**

```sql
next_service_date  = NULL (ทุกคัน)
next_service_km    = NULL (ทุกคัน)
tax_due_date       = NULL (ทุกคัน)
```
เก็บแค่ "ครั้งถัดไป" ไม่มี log ประวัติการซ่อม/เปลี่ยนน้ำมัน

**7. `shared_ride` ตายแล้ว (0 records, ไม่อยู่ใน models.py)**

ควรจัดการให้ชัด: ใช้หรือลบ

**8. ไม่มี Status Change Log**

ไม่รู้ว่าใครเปลี่ยน status เมื่อไหร่ ไม่มี audit trail

**9. Driver ไม่มี `department`**

คนขับ 3 ใน 4 คนไม่ผูกกับ User (user_id = NULL) ทำให้ไม่รู้สังกัด

---

## แนวทางการแก้ไข

---

### ✅ แนวทาง A: ปรับ Schema ขั้นต่ำ (แนะนำก่อน)
> เพิ่ม/แก้ที่จำเป็น ไม่ยุ่งกับโครงสร้างใหญ่

#### A1. บังคับ `expense_type` ในการจอง
เพิ่ม NOT NULL ไม่ได้ (มีข้อมูลเดิม) แต่ควร validate ตอน book และตอน admin approve

#### A2. เพิ่มตาราง `vehicle_service_log`
```sql
CREATE TABLE vehicle_service_log (
    id          INTEGER PRIMARY KEY,
    vehicle_id  INTEGER NOT NULL REFERENCES vehicle(id),
    service_type VARCHAR(50),   -- 'oil_change' | 'tire' | 'tax' | 'general'
    service_date DATE NOT NULL,
    odometer_km  INTEGER,
    cost         REAL,
    note         TEXT,
    next_service_date DATE,
    next_service_km   INTEGER,
    recorded_by  INTEGER REFERENCES user(id),
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### A3. เพิ่มตาราง `booking_status_log`
```sql
CREATE TABLE booking_status_log (
    id          INTEGER PRIMARY KEY,
    booking_id  INTEGER NOT NULL REFERENCES vehicle_booking(id),
    from_status VARCHAR(20),
    to_status   VARCHAR(20) NOT NULL,
    changed_by  INTEGER REFERENCES user(id),
    note        TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### A4. แยก `central_budget_category` ออกจาก `department_budget`
```sql
-- เพิ่ม column ใหม่
ALTER TABLE department_budget ADD COLUMN category_name VARCHAR(100);

-- central → department = ชื่อกอง (เหมือน department type), category_name = หมวดค่าใช้จ่าย
-- department → department = ชื่อกอง, category_name = NULL
```

---

### ✅ แนวทาง B: Refactor ขั้นกลาง (ระยะยาว)
> แก้ปัญหา hardcode vehicle2/driver2 และสร้าง Trip entity

#### B1. สร้างตาราง `trip` แยกออกมา
```sql
CREATE TABLE trip (
    id           INTEGER PRIMARY KEY,
    code         VARCHAR(20) UNIQUE,  -- TRP-001
    status       VARCHAR(20),         -- planned | active | completed
    created_by   INTEGER REFERENCES user(id),
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    note         TEXT
)
```

#### B2. สร้างตาราง `trip_vehicle` (many-to-many)
```sql
CREATE TABLE trip_vehicle (
    id         INTEGER PRIMARY KEY,
    trip_id    INTEGER NOT NULL REFERENCES trip(id),
    vehicle_id INTEGER NOT NULL REFERENCES vehicle(id),
    driver_id  INTEGER REFERENCES driver(id),
    sort_order INTEGER DEFAULT 1  -- รถคันที่ 1, 2, 3...
)
```
แล้วลบ `assigned_vehicle_id`, `assigned_vehicle2_id`, `driver_id`, `driver2_id`, `trip_group` ออกจาก vehicle_booking

#### B3. แยก Financial Info ออกจาก `vehicle_booking`
```sql
CREATE TABLE booking_expense (
    id               INTEGER PRIMARY KEY,
    booking_id       INTEGER UNIQUE REFERENCES vehicle_booking(id),
    expense_type     VARCHAR(20) NOT NULL,  -- central | department | personal
    central_category VARCHAR(50),
    trip_department  VARCHAR(100),
    budget_id        INTEGER REFERENCES department_budget(id)
)
```

---

## สรุปแนะนำ — ควรทำอะไรก่อน

| ลำดับ | งาน | ความยาก | ผลที่ได้ |
|-------|-----|---------|---------|
| 1 | **DROP TABLE shared_ride** | ง่าย | ทำความสะอาด DB |
| 2 | **เพิ่ม `vehicle_service_log`** | ง่าย | ติดตาม service รถได้ |
| 3 | **เพิ่ม `booking_status_log`** | ง่าย | Audit trail |
| 4 | **แก้ `department_budget` กรณี central** | กลาง | Data ชัดเจนขึ้น |
| 5 | **สร้าง `trip` + `trip_vehicle`** | ยาก | แก้ปัญหา hardcode 2 คัน |
| 6 | **แยก `booking_expense`** | ยาก | Separation of concerns |

---

## Schema ปัจจุบันที่ตรงกัน (ไม่ต้องแก้)

| ตาราง | สถานะ |
|-------|-------|
| user | ✅ ครบถ้วน |
| vehicle (columns) | ✅ ครบ แต่ข้อมูลว่าง |
| driver | ✅ ใช้งานได้ |
| vehicle_booking | ⚠️ ใหญ่เกินไป แต่ใช้งานได้ |
| vehicle_mileage | ✅ ครบถ้วน |
| room_booking | ✅ ครบถ้วน |
| repair_ticket | ✅ ครบถ้วน |
| maintenance_ticket | ✅ ครบถ้วน |
| notification | ✅ ครบถ้วน |
| system_config | ✅ ครบถ้วน |
| department_budget | ⚠️ concept central/department ปนกัน |
| shared_ride | ❌ ควรลบ |
