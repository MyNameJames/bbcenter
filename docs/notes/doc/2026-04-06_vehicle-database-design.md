# Vehicle Database Design
> อัปเดตล่าสุด: 2026-04-06

---

## สรุปการออกแบบ Database (Vehicle System)

Session นี้ออกแบบและปรับปรุง database สำหรับระบบจองรถ โดยเพิ่มจาก 11 tables เป็น **16 tables**

---

## Lookup / Support Tables (4 tables)

### `budget_type`
| Field | Type | หมายเหตุ |
|-------|------|---------|
| `id` | Integer PK | |
| `name` | String(50) unique | seed: `central`, `department` |

### `expense_type`
| Field | Type | หมายเหตุ |
|-------|------|---------|
| `id` | Integer PK | |
| `name` | String(50) unique | seed: `central`, `department`, `personal` |

### `vehicle_department`
| Field | Type | หมายเหตุ |
|-------|------|---------|
| `id` | Integer PK | |
| `name` | String(100) unique | ชื่อแผนก |
| `budget_type_id` | FK → budget_type | ประเภทงบของแผนกนี้ |
| `is_disable` | Integer | 0=active, 1=disable |

### `system_config`
| Field | Type | หมายเหตุ |
|-------|------|---------|
| `key` | String(50) PK | |
| `value` | String(100) | เช่น `fuel_price` |

---

## Core Vehicle Tables (7 tables)

### `vehicle`
| Field | Type | หมายเหตุ |
|-------|------|---------|
| `id` | Integer PK | |
| `brand` | String(50) | ยี่ห้อ |
| `model` | String(50) | รุ่น |
| `license_plate` | String(20) unique | ทะเบียน |
| `capacity` | Integer | จำนวนที่นั่ง |
| `status` | String(20) | `active` / `maintenance` |
| `fuel_rate` | Numeric(6,2) | กม./ลิตร |
| `next_service_date` | Date | วันนัดเข้าศูนย์ (sync จาก service_log) |
| `next_service_km` | Integer | กม.เข้าศูนย์ถัดไป (sync จาก service_log) |
| `tax_due_date` | Date | วันต่อภาษีรถ |

### `driver`
| Field | Type | หมายเหตุ |
|-------|------|---------|
| `id` | Integer PK | |
| `name` | String(100) | |
| `phone` | String(20) | |
| `is_active` | Boolean | |
| `user_id` | FK → user | ผูก User account (optional) |

### `vehicle_booking` ⭐ (หัวใจหลัก)
| Field | Type | หมายเหตุ |
|-------|------|---------|
| `id` | Integer PK | |
| `user_id` | FK → user | ผู้จอง |
| `start_datetime` | DateTime | เวลาออก |
| `end_datetime` | DateTime | เวลากลับ |
| `destination` | String(200) | ปลายทาง |
| `purpose` | String(200) | วัตถุประสงค์ |
| `need_driver` | Boolean | ต้องการคนขับ |
| `passenger_count` | Integer | จำนวนคนตอนจอง |
| `driver_id` | FK → driver | คนขับที่ admin จัดให้ (1 คนเท่านั้น) |
| `status` | String(20) | `pending`/`approved`/`waiting_approver`/`rejected` |
| `created_at` | DateTime | |
| `updated_at` | DateTime | auto-update เมื่อมีการแก้ไข |
| `updated_by` | FK → user | ใคร approve/reject/แก้ล่าสุด |
| `trip_group` | Integer | รวมทริป: 1, 2, 3... |
| `assigned_vehicle_id` | FK → vehicle | รถที่ admin จัดให้ (1 คันเท่านั้น) |
| `telegram_message_id` | Integer | ID ข้อความ Telegram ล่าสุด |
| `expense_type_id` | FK → expense_type | 1=central / 2=department / 3=personal |
| `central_category` | String(50) | หมวดย่อย ถ้า expense_type=central |
| `trip_department_id` | FK → vehicle_department | แผนกที่รับผิดชอบ |
| `pickup_location` | String(200) | จุดขึ้นรถ |
| `snap_vehicle_plate` | String(20) | snapshot ทะเบียนรถ ณ วันที่ assign |
| `snap_driver_name` | String(100) | snapshot ชื่อคนขับ ณ วันที่ assign |
| `snap_department_name` | String(100) | snapshot ชื่อแผนก ณ วันที่ assign |

**Status flow:**
```
pending → approved (personal)
pending → waiting_approver → approved/rejected (central/department)
```

### `vehicle_mileage`
| Field | Type | หมายเหตุ |
|-------|------|---------|
| `id` | Integer PK | |
| `booking_id` | FK → vehicle_booking | |
| `odometer_start` / `odometer_end` | Integer | ไมล์ต้น/ปลาย |
| `actual_start` / `actual_end` | DateTime | เวลาออก/กลับจริง |
| `fuel_cost` | Numeric(10,2) | ค่าน้ำมัน (หรือ override) |
| `odometer_start_img` / `odometer_end_img` | String(255) | รูปหน้าปัดไมล์ |
| `refuel` | Boolean | เติมน้ำมันระหว่างทาง |
| `refuel_amount` | Numeric(10,2) | จำนวนเงินเติม |
| `refuel_img` | String(255) | รูปใบเสร็จเติมน้ำมัน |
| `noted_by` | FK → user | ใครบันทึก |

### `vehicle_budget`
| Field | Type | หมายเหตุ |
|-------|------|---------|
| `id` | Integer PK | |
| `budget_type_id` | FK → budget_type | 1=central / 2=department |
| `department_id` | FK → vehicle_department | central ชี้ row ที่ budget_type_id=1 |
| `year` | Integer | |
| `month` | Integer | |
| `budget_amount` | Numeric(12,2) | งบที่ตั้งไว้ |
| `used_amount` | Numeric(12,2) | ใช้ไปแล้ว |

UniqueConstraint: `(budget_type_id, department_id, year, month)`

### `vehicle_service_log`
| Field | Type | หมายเหตุ |
|-------|------|---------|
| `id` | Integer PK | |
| `vehicle_id` | FK → vehicle CASCADE | |
| `service_type` | String(30) | `oil_change`/`tire`/`battery`/`inspection`/`repair`/`other` |
| `service_date` | Date | วันที่เข้าซ่อม |
| `odometer` | Integer | ไมล์ตอนเข้าซ่อม |
| `cost` | Numeric(10,2) | ค่าใช้จ่าย |
| `vendor` | String(100) | ชื่ออู่/ศูนย์บริการ |
| `description` | Text | รายละเอียดงาน |
| `next_service_date` | Date | sync → vehicle.next_service_date |
| `next_service_km` | Integer | sync → vehicle.next_service_km |
| `noted_by` | FK → user | ใครบันทึก |

### `trip_passenger`
| Field | Type | หมายเหตุ |
|-------|------|---------|
| `id` | Integer PK | |
| `booking_id` | FK → vehicle_booking CASCADE | |
| `user_id` | FK → user | ใครขอ |
| `status` | String(20) | `pending`/`approved`/`rejected`/`cancelled` |
| `note` | String(200) | หมายเหตุจากผู้ขอ |
| `admin_note` | Text | เหตุผลจาก admin |
| `created_at` | DateTime | เวลาที่ขอ |
| `reviewed_at` | DateTime | เวลาที่ admin ตัดสินใจ |
| `reviewed_by` | FK → user | admin ที่ approve/reject |

UniqueConstraint: `(booking_id, user_id)` — ขอได้ 1 ครั้งต่อ booking

### `trip_expense_item`
| Field | Type | หมายเหตุ |
|-------|------|---------|
| `id` | Integer PK | |
| `booking_id` | FK → vehicle_booking CASCADE | |
| `expense_type` | String(30) | `toll`/`parking`/`food`/`other` |
| `amount` | Numeric(10,2) | จำนวนเงิน |
| `description` | String(200) | รายละเอียด |
| `receipt_img` | String(255) | รูปใบเสร็จ |
| `noted_by` | FK → user | ใครบันทึก |

---

## Other System Tables (5 tables)
| Table | หน้าที่ |
|-------|---------|
| `user` | login + roles ทุกระบบ, FK → vehicle_department |
| `notification` | in-app notification สำหรับ vehicle |
| `repair_ticket` | แจ้งซ่อม IT |
| `maintenance_ticket` | แจ้งซ่อมอาคาร |
| `room_booking` | จองห้องประชุม |

---

## Relationship Map

```
budget_type ──< vehicle_department
budget_type ──< vehicle_budget
expense_type ──< vehicle_booking

vehicle_department ──< user
vehicle_department ──< vehicle_booking (trip_department)
vehicle_department ──< vehicle_budget

vehicle ──< vehicle_booking (assigned_vehicle)
vehicle ──< vehicle_service_log

driver ──< vehicle_booking

vehicle_booking ──< vehicle_mileage
vehicle_booking ──< trip_passenger      (CASCADE delete)
vehicle_booking ──< trip_expense_item   (CASCADE delete)
vehicle_booking ──< notification
```

---

## ต้นทุนจริงต่อทริป

```
total_cost = mileage.fuel_cost + SUM(trip_expense_item.amount)
```

---

## Seed Data ที่ต้องใส่ตอน startup

```python
# budget_type
(1, 'central'), (2, 'department')

# expense_type
(1, 'central'), (2, 'department'), (3, 'personal')
```

---

## การเปลี่ยนแปลงสำคัญจาก version เดิม

| สิ่งที่เปลี่ยน | เหตุผล |
|---------------|--------|
| Float → Numeric(10,2) ทุก field เงิน | ป้องกัน floating point error |
| department string → FK | ป้องกัน typo, normalize ข้อมูล |
| expense_type string → FK | มี lookup table รองรับ |
| เพิ่ม snap_* fields | ป้องกันข้อมูลหายเมื่อแก้/ลบ master data |
| เพิ่ม updated_at / updated_by | audit trail ครบ |
| ตัด vehicle2 / driver2 | 1 booking = 1 รถ + 1 คนขับ |
| trip_group Integer | เลข 1,2,3 แทน "TRP-001" |
