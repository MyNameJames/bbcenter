# Database Schema

> **Snapshot ของ models ณ 2026-06-15** — 26 tables (table list ครบ)
> 🗂️ **2026-06-07: `models.py` แตกเป็น package [`models/`](../../../app/models/) ตาม domain** (base/user/common/repair/maintenance/room/vehicle/vehicle_budget/vehicle_ot/vehicle_fuel). path `models.py` ในหัวข้อ ### ทั้งหมดด้านล่าง **ตายแล้ว** — class ย้ายไปไฟล์ domain (ดู mapping ที่ [INDEX.md §Database Models](../INDEX.md#-database-models)). โครง schema/column **ไม่เปลี่ยน** (refactor ย้าย class ล้วน ไม่แตะ DB)
> ⚠️ **DRIFT (ตรวจ 2026-06-02):** line-ref `models.py:NNN` ในหัวข้อ ### **ผิด 17/27 tables** ตั้งแต่ก่อน refactor + ตอนนี้ path เปลี่ยนเป็น package ด้วย → **ต้อง full re-sync (db-helper) ก่อนเชื่อ line ในไฟล์นี้** — table names + column + ภาพรวมยังถูก
> ส่วนบน = ตารางปัจจุบัน · ส่วนล่าง = ประวัติ + เหตุผลทุก version
> Migration files → [app/migrations/migrations-index.md](../../../app/migrations/migrations-index.md)

---

# Part 1 — Current Tables

## Lookup Tables (3)

### `budget_type` — [models.py:14](../../../app/models.py#L14)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `name` | String(50) unique | seed: `central`, `department` |

### `vehicle_department` — [models.py:36](../../../app/models.py#L36)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `name` | String(100) unique | ชื่อแผนก |
| `budget_type_id` | FK → budget_type | |
| `is_disable` | Integer | 0=active, 1=disable |

### `system_config` — [models.py:269](../../../app/models.py#L269)
| Field | Type | Note |
|-------|------|------|
| `key` | String(50) PK | เช่น `fuel_price` |
| `value` | String(100) | |

**Helpers:** `SystemConfig.get(key, default)` / `SystemConfig.set(key, value)`

---

## Core User & Auth (1)

### `user` — [models.py:49](../../../app/models.py#L49)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `username` | String(50) unique | LDAP username |
| `full_name` | String(100) | |
| `email` | String(120) | |
| `department` | String(100) | legacy string — display only |
| `department_id` | FK → vehicle_department | **canonical** |
| `role_repair` | String(20) | `user` / `admin` |
| `role_maintenance` | String(20) | `user` / `admin` |
| `role_vehicle` | String(20) | `user` / `admin` / `approver` |
| `role_room` | String(20) | `user` / `admin` |
| `is_superadmin` | Boolean | override ทุก role |
| `line_user_id` | String(64) unique nullable | LINE userId (จาก webhook ตอนผูกบัญชี) → push แจ้งเตือน LINE รายคน (v2.17) |
| `line_link_code` | String(6) nullable | โค้ด 6 หลักชั่วคราวสำหรับ flow ผูกบัญชี LINE ผ่าน chat — set line_user_id แล้วล้างค่านี้ (v2.17) |

---

## Repair (1)

### `repair_ticket` — [models.py:77](../../../app/models.py#L77)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `user_id` | FK → user | |
| `category` | String(50) | |
| `urgency` | String(20) | |
| `asset_tag` | String(50) | optional |
| `location` | String(100) | |
| `subject` | String(150) | |
| `image_file` | String(255) | |
| `status` | String(20) | default `pending` → `in_progress` → `done` |
| `created_at` | DateTime | |
| `resolved_note` | Text | |
| `resolved_at` | DateTime | |
| `updated_at` | DateTime | |

---

## Maintenance (1)

### `maintenance_ticket` — [models.py:105](../../../app/models.py#L105)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `user_id` | FK → user | |
| `category` | String(50) | ประปา, ไฟฟ้า, แอร์ |
| `urgency` | String(20) | |
| `location` | String(100) | |
| `contact_number` | String(20) | |
| `subject` | String(150) | |
| `image_file` | String(255) | |
| `status` | String(20) | |
| `created_at` | DateTime | |
| `resolved_note` | Text | |
| `resolved_at` | DateTime | |
| `updated_at` | DateTime | |
| `repair_cost` | Numeric(10,2) | |
| `technician_type` | String(20) | |
| `scheduled_date` | Date | |
| `image_after` | String(255) | |

---

## Vehicle (9)

### `vehicle` — [models.py:134](../../../app/models.py#L134)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `brand`, `model` | String(50) | |
| `license_plate` | String(20) unique | |
| `capacity` | Integer | ที่นั่งสูงสุด |
| `status` | String(20) | `active` / `maintenance` |
| `fuel_rate` | Numeric(6,2) | default 10.0 (กม./ลิตร) |
| `next_service_date` | Date | sync จาก service_log |
| `next_service_km` | Integer | sync จาก service_log |
| `tax_due_date` | Date | |
| `repair_note` | Text | |
| `repair_started_at` | DateTime | |

### `driver` — [models/vehicle.py:27](../../../app/models/vehicle.py#L27)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `name` | String(100) | |
| `phone` | String(20) | |
| `is_active` | Boolean | |
| `user_id` | FK → user | ผูก User account (optional) |
| `national_id` | String(20) | เลขบัตรประชาชน (2026-06-08) |
| `addr_line` | String(200) | บ้านเลขที่/หมู่/ถนน (2026-06-08) |
| `addr_subdistrict` | String(100) | ตำบล/แขวง (2026-06-08) |
| `addr_district` | String(100) | อำเภอ/เขต (2026-06-08) |
| `addr_province` | String(100) | จังหวัด (2026-06-08) |
| `addr_postal` | String(10) | รหัสไปรษณีย์ (2026-06-08) |
| `id_card_image` | String(255) | ไฟล์รูปบัตร ปชช. → `static/uploads/driver/` (2026-06-08) |
| `avatar_image` | String(255) | ไฟล์รูปโปรไฟล์ → `static/uploads/driver/` (2026-06-08) |

### `vehicle_booking` ⭐ — [models.py:167](../../../app/models.py#L167)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `user_id` | FK → user | ผู้จอง |
| `start_datetime`, `end_datetime` | DateTime | |
| `destination`, `purpose` | String(200) | |
| `need_driver` | Boolean | |
| `passenger_count` | Integer | |
| `driver_id` | FK → driver | คนขับที่ admin assign |
| `status` | String(20) | `pending` / `approved` / `waiting_approver` / `rejected` / `cancelled` (Phase 9, v2.12 — soft cancel via `cancel_booking()`; value used since 2026-05-18 ใน admin refund path) |
| `reject_reason` | String(500) nullable | เหตุผลที่ Admin/Approver ปฏิเสธ — แสดงใน UI และ Telegram (v2.3) |
| `created_at`, `updated_at` | DateTime | |
| `updated_by` | FK → user | ใคร approve/reject/แก้ล่าสุด |
| `trip_group` | Integer | รวมทริป (1, 2, 3...) |
| `assigned_vehicle_id` | FK → vehicle | |
| `telegram_message_id` | Integer | |
| `expense_type` | String(20) | legacy string — display/backward compat only |
| `central_category` | String(50) | ถ้า expense_type=central |
| `trip_department` | String(100) | legacy string |
| `trip_department_id` | FK → vehicle_department | **canonical** |
| `pickup_location` | String(200) | |
| `snap_vehicle_plate` | String(20) | **snapshot** เมื่อ assign |
| `snap_driver_name` | String(100) | **snapshot** |
| `is_ad_hoc` | Boolean NOT NULL default False | True = driver สร้างเองจาก /driver (งานนอกระบบ) — filter ออกจาก /vehicle calendar; ยังแสดงในหน้า admin (v2.11) |

**Relationships:** `passengers` (→ TripPassenger CASCADE), `extra_expenses` (→ TripExpenseItem CASCADE), `mileage` (→ VehicleMileage)

### `vehicle_mileage` — [models.py:230](../../../app/models.py#L230)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `booking_id` | FK → vehicle_booking | |
| `odometer_start`, `odometer_end` | Integer | |
| `actual_start`, `actual_end` | DateTime | |
| `fuel_cost` | Numeric(10,2) | default 0 — manual override ทำที่นี่ |
| `noted_by` | FK → user | |
| `created_at` | DateTime | |
| `odometer_start_img`, `odometer_end_img` | String(255) | รูปหน้าปัด |
| `refuel` | Boolean | |
| `refuel_amount` | Numeric(10,2) | |
| `refuel_img` | String(255) | |
| `personal_status` | Integer | 0=pending, 1=paid (สำหรับ expense_type=personal) |
| `personal_paid_at` | DateTime | |
| `personal_paid_by_id` | FK → user | admin ที่ยืนยันรับเงิน |
| `user_reported_paid` | Boolean | user แจ้งว่าจ่ายแล้ว (v2.2) |
| `user_reported_at` | DateTime | (v2.2) |
| `last_reminder_at` | DateTime | cron กันเตือนซ้ำ (v2.2) |
| `budget_deducted_at` | DateTime nullable | null = ยังไม่เคยหักงบ (idempotency, v2.8) |
| `last_budget_log_id` | FK → vehicle_budget_log nullable | tx ที่ active ใช้สำหรับ refund/rededuct (v2.8) |

### `vehicle_budget` — [models.py:297](../../../app/models.py#L297)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `budget_type_id` | FK → budget_type | central / department |
| `department_id` | FK → vehicle_department | central → ชี้ไป row budget_type_id=1 |
| `year` | Integer | **anchor** เดือนที่ตั้งงบ (v2.13: ไม่ใช้ใน lookup แล้ว — คงไว้สำหรับ UniqueConstraint + set_budget) |
| `month` | Integer | **anchor** (v2.13: เหมือน `year`) |
| `budget_amount` | Numeric(12,2) | งบที่ตั้งไว้ default 0 |
| `used_amount` | Numeric(12,2) | ใช้ไปแล้ว default 0 (cache ของ SUM(log.change_amount)) — v2.13: เป็นยอดสะสม**ทั้งช่วง** start–end (ข้ามเดือนได้) |
| `approver_id` | FK → user nullable | สำหรับ department budget เท่านั้น |
| `start_date` | Date nullable | **v2.13: active period** — วันเริ่มที่งบเปิดใช้ (เคยเป็น metadata; ตอนนี้กำหนดการแสดง + หักงบ) |
| `end_date` | Date nullable | **v2.13: active period** — วันสิ้นสุด. งบ active = `is_active=True AND start_date <= วันที่ <= end_date` |
| `is_active` | Boolean NOT NULL default True | False → block approve_booking + top_up/manual_adjust; KPI ไม่นับ; mileage deduct/refund ไม่ block (v2.9) |

**Constraint:** `UNIQUE(budget_type_id, department_id, year, month)`
**Props:** `.remaining`, `.percent_used`

> ตั้งแต่ v2.8: `used_amount` เป็น **cache** ของ `SUM(vehicle_budget_log.change_amount)` — ทุก mutation ต้องผ่าน `BudgetService` ที่ append row ใน `vehicle_budget_log` (ห้าม mutate `used_amount` ตรง)

### `vehicle_budget_log` — [models.py:611](../../../app/models.py#L611)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `budget_id` | FK → vehicle_budget **NOT NULL** | |
| `event_type` | String(20) NOT NULL | `set_budget`/`deduct`/`refund`/`override`/`adjust` |
| `change_amount` | Numeric(12,2) NOT NULL | signed: หัก=-, คืน=+, เพิ่มเพดาน=+ |
| `new_used_balance` | Numeric(12,2) NOT NULL | snapshot used_amount หลัง event |
| `new_budget_amount` | Numeric(12,2) NOT NULL | snapshot budget_amount หลัง event |
| `booking_id` | FK → vehicle_booking nullable | |
| `mileage_id` | FK → vehicle_mileage nullable | |
| `reverses_log_id` | FK → vehicle_budget_log (self) nullable | refund ชี้ไป deduct เดิม |
| `snap_distance` | Integer nullable | snapshot ระยะทาง (km) ตอน deduct |
| `snap_fuel_rate` | Numeric(8,2) nullable | snapshot fuel_rate ของรถ |
| `snap_fuel_price` | Numeric(8,2) nullable | snapshot ราคา/ลิตร |
| `note` | String(500) **NOT NULL** | required เหตุผล |
| `created_by` | FK → user nullable | |
| `created_at` | DateTime | |

**Indexes:** `ix_vbl_budget(budget_id)`, `ix_vbl_booking(booking_id)`, `ix_vbl_mileage(mileage_id)`
**Pattern:** เลียน `fuel_reserve_log` — append-only ledger; `vehicle_budget.used_amount` = cache ของ SUM(change_amount)

### `vehicle_service_log` — [models.py:382](../../../app/models.py#L382)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `vehicle_id` | FK → vehicle CASCADE | |
| `noted_by` | FK → user | |
| `service_type` | String(30) | `oil_change`/`tire`/`battery`/`inspection`/`repair`/`other` |
| `service_date` | Date | |
| `odometer` | Integer | |
| `cost` | Numeric(10,2) | |
| `vendor` | String(100) | |
| `description` | Text | |
| `next_service_date`, `next_service_km` | Date, Integer | sync ไปที่ vehicle |
| `created_at` | DateTime | |

### `dept_approver` — [models.py:410](../../../app/models.py#L410)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `user_id` | FK → user | ผู้อนุมัติ |
| `dept_id` | FK → vehicle_department | แผนกที่รับผิดชอบ |

**Constraint:** `UNIQUE(user_id, dept_id)` — ป้องกัน duplicate
**Indexes:** `idx_dept_approver_user`, `idx_dept_approver_dept`

### `trip_passenger` — [models.py:357](../../../app/models.py#L357)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `booking_id` | FK → vehicle_booking CASCADE | |
| `user_id` | FK → user | ใครขอ |
| `status` | String(20) | `pending`/`approved`/`rejected`/`cancelled` |
| `note` | String(200) | |
| `admin_note` | Text | |
| `created_at`, `reviewed_at` | DateTime | |
| `reviewed_by` | FK → user | |

**Constraint:** `UNIQUE(booking_id, user_id)`

### `trip_expense_item` — [models.py:409](../../../app/models.py#L409)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `booking_id` | FK → vehicle_booking CASCADE | |
| `noted_by` | FK → user | |
| `expense_type` | String(30) | `toll`/`parking`/`food`/`other` |
| `amount` | Numeric(10,2) | |
| `description` | String(200) | |
| `receipt_img` | String(255) | |
| `created_at` | DateTime | |

---

## Driver OT (3)

### `ot_rate_config` — [models.py:447](../../../app/models.py#L447)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `label` | String(50) | ชื่อ time band เช่น "เช้ามืด" |
| `start_time` | String(5) | เช่น "06:00" |
| `end_time` | String(5) | เช่น "08:00" หรือ "24:00" |
| `rate` | Numeric(8,2) | อัตรา OT ต่อชั่วโมง |
| `is_active` | Boolean | default True |
| `day_of_week` | Integer nullable | NULL=ใช้ทุกวัน (default), 0=Mon ... 6=Sun (Python `weekday()`) — `auto_generate_ot()` override per-วัน (v2.10) |
| `sort_order` | Integer | default 0 — ลำดับแสดงผล |

**Seed rows:** เช้ามืด (06:00–08:00, ฿20), หัวค่ำ (17:00–19:00, ฿20), วิกาล >19:00 (19:00–24:00, ฿40), วิกาล <06:00 (00:00–06:00, ฿40)

### `driver_ot` — [models.py:464](../../../app/models.py#L464)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `booking_id` | FK → vehicle_booking **nullable** | auto-OT: 1 record ต่อ 1 booking · NULL = manual standalone OT (v2.16) |
| `driver_id` | FK → driver | |
| `ot_number` | String(20) unique | running number เช่น "OT-2026-0001" |
| `date` | Date | วันที่เกิด OT |
| `total_hours` | Numeric(6,2) | ผลรวมจาก slots |
| `total_amount` | Numeric(10,2) | ผลรวมเงินจาก slots |
| `status` | String(20) | `unpaid` / `paid` (v2.15 — เลิกใช้ pending/approved) |
| `approved_by_id` | FK → user nullable | legacy — เลิกใช้หลังตัด approval (v2.15) |
| `approved_at` | DateTime nullable | legacy |
| `paid_by_id` | FK → user nullable | |
| `paid_at` | DateTime nullable | |
| `no_receipt` | Boolean default False | True = OT ไม่ต้องออกใบเสร็จ (tab "ผู้ใช้จ่ายเอง") (v2.15) |
| `is_deleted` | Boolean default False | soft delete → tab "ลบ" (v2.15) |
| `deleted_at` | DateTime nullable | (v2.15) |
| `note` | String(500) nullable | |
| `created_at` | DateTime | |
| `created_by_id` | FK → user nullable | |

**Relationships:** `slots` (→ DriverOTSlot CASCADE delete-orphan)
**Indexes:** `idx_driver_ot_booking`, `idx_driver_ot_driver`, `idx_driver_ot_status`

### `driver_ot_slot` — [models.py:493](../../../app/models.py#L493)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `driver_ot_id` | FK → driver_ot | |
| `rate_config_id` | FK → ot_rate_config nullable | |
| `slot_label` | String(50) | snapshot label ณ เวลาบันทึก |
| `start_time` | String(5) | เช่น "17:00" |
| `end_time` | String(5) | เช่น "19:00" |
| `hours` | Numeric(6,2) | จำนวนชั่วโมง |
| `rate` | Numeric(8,2) | snapshot อัตรา ณ เวลาบันทึก |
| `amount` | Numeric(10,2) | hours × rate |

**Indexes:** `idx_driver_ot_slot_ot`

---

## Fuel Management (5)

### `fuel_reimbursement` — [models.py:534](../../../app/models.py#L534)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `reimbursement_no` | String(50) | เลขใบเบิก เช่น "จ69-00164" |
| `source` | String(100) nullable | แหล่งเบิก เช่น "บางบาล" |
| `submitted_at` | Date nullable | วันส่งเรื่องเบิก |
| `received_at` | Date nullable | วันได้เงินคืน |
| `note` | String(500) nullable | |
| `created_by` | FK → user nullable | |
| `created_at`, `updated_at` | DateTime | |

**Relationships:** `bills` (→ FuelBill via `reimbursement_id`)
**Indexes:** `idx_fuel_reimbursement_no`

### `fuel_bill` — [models.py:510](../../../app/models.py#L510)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `bill_date` | Date | วันเติมน้ำมัน |
| `vehicle_id` | FK → vehicle | |
| `driver_id` | FK → driver | ผู้เติม |
| `amount` | Numeric(10,2) | จำนวนเงิน |
| `payment_method` | String(20) | `transfer` / `card` / `self` |
| `mileage` | Integer nullable | เลขไมล์ที่เติม |
| `note` | String(500) nullable | |
| `reimbursement_id` | FK → fuel_reimbursement nullable | null = ยังไม่รวมเข้าใบเบิก |
| `created_by` | FK → user nullable | |
| `created_at`, `updated_at` | DateTime | |

**Indexes:** `idx_fuel_bill_date`, `idx_fuel_bill_vehicle`, `idx_fuel_bill_driver`, `idx_fuel_bill_reimbursement`

### `fuel_price` — [models.py:553](../../../app/models.py#L553)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `effective_date` | Date unique | วันที่เริ่มมีผล |
| `price_per_liter` | Numeric(8,2) | ราคา/ลิตร |
| `note` | String(255) nullable | |
| `created_by` | FK → user nullable | |
| `created_at` | DateTime | |

**Helpers:** `FuelPrice.get_for_date(target_date)` — คืน price ของ effective_date ล่าสุดที่ ≤ target_date (float | None)
**Replaces:** `SystemConfig['fuel_price']` — เก็บประวัติเพื่อใช้คำนวณ retroactive mileage cost ได้แม่นยำ
**Indexes:** `idx_fuel_price_effective_date` (DESC)

### `fuel_reserve_config` — [models.py:577](../../../app/models.py#L577)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | **singleton row id=1** |
| `amount` | Numeric(12,2) | เงินสำรองคงเหลือ default 0 |
| `updated_at` | DateTime | |
| `updated_by` | FK → user nullable | |

**Helpers:** `FuelReserveConfig.get_amount()` — คืน float (0.0 ถ้าไม่มี row)

### `fuel_reserve_log` — [models.py:595](../../../app/models.py#L595)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `change_amount` | Numeric(12,2) | บวก/ลบ |
| `new_balance` | Numeric(12,2) | ยอดคงเหลือหลังปรับ |
| `note` | String(500) **NOT NULL** | required เหตุผลการปรับ |
| `created_by` | FK → user nullable | |
| `created_at` | DateTime | |

**Indexes:** `idx_fuel_reserve_log_created` (DESC)

---

## Room (1)

### `room_booking` — [models.py:215](../../../app/models.py#L215)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `user_id` | FK → user | |
| `room_name` | String(50) | "ห้อง 1", "ห้อง 2" |
| `title` | String(255) | |
| `start_time`, `end_time` | DateTime | overlap check ก่อน insert |
| `created_at` | DateTime | |

---

## Notification (1)

### `notification` — [models.py:332](../../../app/models.py#L332)
| Field | Type | Note |
|-------|------|------|
| `id` | Integer PK | |
| `user_id` | FK → user | |
| `booking_id` | FK → vehicle_booking | nullable |
| `title` | String(120) nullable | บรรทัดแรกของ notif card — freeze ตอนสร้าง (null = serializer fallback `_notif_title()`) (v2.20) |
| `message` | String(255) | |
| `ntype` | String(20) | `success`/`warning`/`danger`/`info` |
| `is_read` | Boolean | |
| `created_at` | DateTime | |
| `category` | String(20) | `status`/`mileage`/`budget`/`payment`/`payment_admin` (v2.2) |
| `action_url` | String(255) | fallback `/vehicle/detail/<booking_id>` (v2.2) |
| `is_sticky` | Boolean | ปักบนสุด (v2.2) |
| `expired_at` | DateTime | ไม่นับ badge ถ้าเกิน (v2.2) |
| `icon` | String(40) | FA class (v2.2) |
| `event_key` | String(40) nullable | ชนิด event แบบ stable (`booked`/`assigned`/`forwarded`/`approved`/`rejected`/`merged`/`mileage_start`/`mileage_end`/`budget`) — ใช้ระบุตัวตน event เพราะ icon string ชนกัน (v2.19) |
| `superseded_at` | DateTime nullable | เวลาที่ถูกแทนด้วย event ชนิดเดียวกันที่ใหม่กว่า (null = active/แสดงผล) (v2.19) |

**Indexes (manual SQL):**
- `idx_notif_user_unread(user_id, is_read)`
- `idx_notif_booking(booking_id)`
- `idx_notif_created(created_at DESC)`
- `idx_mileage_personal_status(personal_status)`

---

## ER Summary

```
budget_type      ──< vehicle_department
budget_type      ──< vehicle_budget

vehicle_department ──< user
vehicle_department ──< vehicle_booking (trip_department)
vehicle_department ──< vehicle_budget

vehicle ──< vehicle_booking (assigned_vehicle)
vehicle ──< vehicle_service_log       (CASCADE)

driver  ──< vehicle_booking
user    ──< driver (linked_user)

user               >──< vehicle_department : dept_approver (many-to-many)

vehicle_booking ──< vehicle_mileage
vehicle_booking ──< trip_passenger    (CASCADE)
vehicle_booking ──< trip_expense_item (CASCADE)
vehicle_booking ──< notification
vehicle_booking ──< driver_ot
vehicle_booking ──< vehicle_budget_log

vehicle_budget   ──< vehicle_budget_log
vehicle_mileage  ──< vehicle_budget_log
vehicle_mileage  ──> vehicle_budget_log (last_budget_log_id, idempotency)
vehicle_budget_log ──< vehicle_budget_log (reverses_log_id, self-ref)

driver      ──< driver_ot
driver_ot   ──< driver_ot_slot (CASCADE)
ot_rate_config ──< driver_ot_slot

vehicle            ──< fuel_bill
driver             ──< fuel_bill
fuel_reimbursement ──< fuel_bill
user ──< fuel_reimbursement (created_by)
user ──< fuel_price (created_by)
user ──< fuel_reserve_config (updated_by)
user ──< fuel_reserve_log (created_by)

user ──< repair_ticket
user ──< maintenance_ticket
user ──< room_booking
user ──< notification
```

---

## Seed Data (init DB)

```sql
INSERT INTO budget_type (id, name) VALUES (1, 'central'), (2, 'department');
```

---

# Part 2 — Version History

| Version | Date | Tables | Headline change |
|---------|------|--------|-----------------|
| v1.0 | 2026-03-10 | 11 | Initial schema — strings for dept/expense, 2 รถ/2 คนขับ hardcoded |
| v1.1 | 2026-03-13 | 11 | เพิ่ม `department_budget` (pre-refactor) |
| v2.0 | 2026-04-06 | 16 | Lookup tables + FK + snap_* + 2 รถ → 1 รถ |
| v2.1 | 2026-04-13 | 16 | `department_budget` → `vehicle_budget` (rename + refactor) |
| v2.2 | 2026-04-23 | 17 | `notification` enhance (5 fields) + `vehicle_mileage` payment (3 fields) + indexes |
| v2.3 | 2026-04-26 | 17 | `vehicle_booking` + `reject_reason` |
| v2.4 | 2026-04-26 | 18 | `vehicle_budget` new table — approver_id per-budget-record |
| v2.5 | 2026-04-28 | 18 | `dept_approver` new table — many-to-many User ↔ VehicleDepartment สำหรับ approver |
| v2.6 | 2026-05-03 | 21 | `ot_rate_config` + `driver_ot` + `driver_ot_slot` — ระบบ OT คนขับ |
| v2.7 | 2026-05-04 | 26 | 5 fuel tables — fuel_bill / fuel_reimbursement / fuel_price / fuel_reserve_config / fuel_reserve_log |
| v2.8 | 2026-05-06 | 27 | `vehicle_budget_log` (ledger) + `vehicle_mileage.budget_deducted_at`/`last_budget_log_id` |
| v2.9 | 2026-05-18 | 27 | `vehicle_budget` + `is_active` — toggle ปิดงบโดยรักษา audit/refund flow |
| v2.10 | 2026-05-18 | 27 | `ot_rate_config` + `day_of_week` — per-weekday OT rate override (NULL=ทุกวัน) |
| v2.11 | 2026-05-18 | 27 | `vehicle_booking` + `is_ad_hoc` + `contact_name` — ad-hoc trip (งานนอกระบบ) driver-created off-the-books |
| v2.12 | 2026-05-22 | 27 | `vehicle_booking.status` — doc-only: เพิ่ม `cancelled` ใน enum comment (Phase 9 `cancel_booking()`). ไม่มี schema change — value ถูกใช้ที่ vehicle_view.py:2858 ตั้งแต่ 2026-05-18 แล้ว |
| v2.13 | 2026-06-06 | 27 | `vehicle_budget` — **งบช่วงเวลา**: backfill `start_date`/`end_date` จาก year/month + index `ix_vb_active_period`. ไม่มี schema change (column มีอยู่แล้ว) แต่เปลี่ยน semantic — ดู [v2.13 detail](#v213--vehiclebudget-active-period-2026-06-06) |
| v2.14 | 2026-06-08 | 27 | `driver` + 8 profile fields (national_id, ที่อยู่ 5 ส่วน, id_card_image, avatar_image) |
| v2.15 | 2026-06-08 | 27 | `driver_ot` + `no_receipt`/`is_deleted`/`deleted_at` — paid-only flow + soft delete |
| v2.16 | 2026-06-09 | 27 | `driver_ot.booking_id` NOT NULL → nullable (table rebuild) — manual standalone OT |
| v2.17 | 2026-06-12 | 27 | `user` + `line_user_id`/`line_link_code` — LINE Messaging API (ช่องทางแจ้งเตือนที่ 3) |
| v2.18 | 2026-06-14 | 26 | `vehicle_booking` -3 dead columns (`expense_type_id`, `snap_department_name`, `contact_name`); `expense_type` table dropped |
| v2.19 | 2026-06-15 | 26 | `notification` + `event_key`/`superseded_at` — supersede กัน notif ชนิดเดียวกันต่อ booking สะสมซ้ำ |
| v2.20 | 2026-06-16 | 26 | `notification` + `title` — freeze title ตอนสร้าง notif (เดิม compute จาก event_key → แยก case ไม่ได้) |

---

## v1.0 — Initial (2026-03-10, commit `66bb616`)

**11 tables:** user, repair_ticket, maintenance_ticket, vehicle, driver, vehicle_booking, room_booking, vehicle_mileage, system_config, notification, shared_ride (unused)

### ปัญหาที่พบตอน review (2026-04-06)
*อ้างอิง: [doc/2026-04-06_database-design-review.md](../doc/2026-04-06_database-design-review.md)*

🔴 **Critical**
1. `vehicle_booking` มี 21 columns — mix 4 concerns (booking, assign, finance, notification)
2. `expense_type` NULL 51% (19/37) → หักงบไม่ได้
3. `assigned_vehicle2_id` + `driver2_id` hardcoded — expand ไม่ได้
4. `trip_group` เป็น string ลอย ๆ (`"TRP-001"`) — ไม่มี Trip table
5. `department_budget.department` ใช้ 2 ความหมายผสมกัน (ชื่อกอง vs ชื่อหมวด)

🟡 **Warning**
6. `vehicle` ไม่มี service history
7. ไม่มี Float → Decimal สำหรับเงิน (floating point risk)
8. ไม่มี audit trail (ใคร approve/reject เมื่อไหร่)
9. `shared_ride` table มี 0 records แต่ไม่เคยลบ

---

## v2.0 — Major Refactor (2026-04-06)

*อ้างอิง: [doc/2026-04-06_vehicle-database-design.md](../doc/2026-04-06_vehicle-database-design.md)*

### เพิ่มใหม่ (5 tables)
| Table | เหตุผล |
|-------|--------|
| `budget_type` | lookup — แทน string `'central'`/`'department'` ที่เปลี่ยนไม่สะดวก |
| `expense_type` | lookup — แทน string `'central'`/`'department'`/`'personal'` |
| `vehicle_department` | normalize department — กัน typo, มี `is_disable` |
| `vehicle_service_log` | แก้ปัญหา (6) vehicle ไม่มีประวัติซ่อม |
| `trip_passenger` | "ขอติดรถ" — เดิมไม่มี |
| `trip_expense_item` | ค่าใช้จ่ายเพิ่มเติม (ค่าทางด่วน, parking) — เดิมไม่มี |

### แก้ `vehicle_booking`
| Change | เหตุผล |
|--------|--------|
| ลบ `assigned_vehicle2_id`, `driver2_id` | 1 booking = 1 รถ (กฎธุรกิจใหม่) |
| เพิ่ม `expense_type_id` FK | แทน string + บังคับให้มีค่า |
| เพิ่ม `trip_department_id` FK | normalize |
| `trip_group` string → Integer | `"TRP-001"` → 1, 2, 3 |
| เพิ่ม `snap_vehicle_plate`, `snap_driver_name`, `snap_department_name` | ป้องกันข้อมูลหายเมื่อแก้/ลบ master |
| เพิ่ม `updated_at`, `updated_by` | audit trail |
| เพิ่ม `pickup_location`, `central_category` | ข้อมูล business เพิ่ม |
| เก็บ string fields (`expense_type`, `trip_department`) | **backward compat** — display only |

### แก้อื่น ๆ
- `Float` → `Numeric(10,2)` / `Numeric(12,2)` ทุก field เงิน → ป้องกัน floating point error
- DROP `shared_ride` — ไม่ใช้แล้ว
- `Driver.user_id` FK → User — link account

---

## v2.1 — Budget Refactor (2026-04-13)

*อ้างอิง: [log/2026-04-13_budget-management-phase1.md](../log/2026-04-13_budget-management-phase1.md)*

### Rename: `department_budget` → `vehicle_budget`
เหตุผล: ชื่อเดิมไม่ระบุว่าเป็นงบของระบบ vehicle (สับสนกับงบทั่วไปขององค์กร)

### Schema ใหม่
```python
vehicle_budget(
    budget_type_id  FK,     # แยกงบ central vs department ชัดเจน
    department_id   FK,     # central → ชี้ไปที่ department budget_type_id=1
    year, month     Integer,
    budget_amount, used_amount  Numeric,
    approver_id     FK (user),  # สำหรับ department budget
    start_date, end_date        # ช่วงใช้งบ (null = ทั้งเดือน)
)
UNIQUE(budget_type_id, department_id, year, month)
```

### แก้ปัญหาจาก v1
- แก้ (5) — field `department` 2 ความหมาย → แยก `budget_type_id` + `department_id`
- รองรับ approver per-department + time-window

---

## v2.2 — Notification Enhance (2026-04-23)

*Migration: [2026-04-23_notification-enhance.sql](../../../app/migrations/2026-04-23_notification-enhance.sql)*

### `notification` + 5 fields
| Field | เหตุผล |
|-------|--------|
| `category` | แยกประเภท (status/mileage/budget/payment/payment_admin) เพื่อ group ใน UI |
| `action_url` | คลิก notification แล้วไปที่ไหน (fallback `/vehicle/detail/<booking_id>`) |
| `is_sticky` | ปักบนสุด — ใช้กับ payment unpaid |
| `expired_at` | ไม่แสดง badge count ถ้าเกิน — กัน noise จาก notif เก่า |
| `icon` | FA icon class — ต่าง category ใช้ต่าง icon |

### `vehicle_mileage` + 3 fields (payment escalation)
| Field | เหตุผล |
|-------|--------|
| `user_reported_paid` | user กดแจ้งจ่ายแล้ว (ยังไม่ใช่ confirm จริง) |
| `user_reported_at` | timestamp เพื่อดู delay |
| `last_reminder_at` | cron กันเตือนซ้ำภายในช่วงเวลา |

### Indexes (performance)
- `idx_notif_user_unread(user_id, is_read)` — query badge count เร็วขึ้น
- `idx_notif_booking(booking_id)` — ดู notif ของ booking
- `idx_notif_created(created_at DESC)` — sort recent
- `idx_mileage_personal_status(personal_status)` — หา unpaid เร็วขึ้น

---

## v2.3 — Reject Reason (2026-04-26)

*Migration: [2026-04-26_vehicle-booking-reject-reason.sql](../../../app/migrations/2026-04-26_vehicle-booking-reject-reason.sql)*

### `vehicle_booking` + 1 field

| Field | เหตุผล |
|-------|--------|
| `reject_reason` | ให้ Admin และ Approver ระบุเหตุผลการปฏิเสธ และแสดงให้ผู้จองเห็นใน UI และ Telegram notification |

---

## v2.4 — VehicleBudget New Table (2026-04-26)

*Migration: [2026-04-26_add-vehicle-budget.sql](../../../app/migrations/2026-04-26_add-vehicle-budget.sql)*

### `vehicle_budget` — new table

| Field | เหตุผล |
|-------|--------|
| `name` | ชื่องบที่ Admin กำหนดเอง เช่น "งบ กอง ก" — ยืดหยุ่นกว่า FK ไป lookup table |
| `department` | plain string แทน FK → ไม่ต้อง pre-create แผนกใน `vehicle_department` |
| `year`, `month` | scope งบประมาณรายเดือน |
| `budget_amount`, `used_amount` | ติดตาม วงเงิน / ใช้ไปแล้ว |
| `approver_id` | **เหตุผลหลัก:** Approver ผูกกับ budget record แทนการใช้ `role_vehicle='approver'`+department — รองรับกรณีที่แต่ละงบมีผู้อนุมัติต่างกัน |

---

## v2.5 — DeptApprover Junction Table (2026-04-28)

*Migration: [2026-04-28_add-dept-approver.sql](../../../app/migrations/2026-04-28_add-dept-approver.sql)*

### `dept_approver` — new table

| Field | เหตุผล |
|-------|--------|
| `user_id` FK → user | ชี้ไปที่ User ที่ทำหน้าที่ approver |
| `dept_id` FK → vehicle_department | แผนกที่ user คนนั้นรับผิดชอบ approve |
| `UNIQUE(user_id, dept_id)` | ป้องกัน duplicate row |

**เหตุผลหลัก:** ระบบเดิมใช้ `role_vehicle='approver'` ร่วมกับ `user.department_id` เพื่อระบุว่า user คนนี้ approve ให้แผนกไหน — แต่ binding แบบ 1:1 นี้ไม่รองรับกรณีที่ approver คนเดียวต้องรับผิดชอบหลายแผนก Junction table นี้แก้ปัญหานั้นโดยตรง: 1 user สามารถมีหลาย row ใน `dept_approver` (คนละ dept_id) และ approver จะถูก match กับ booking ผ่าน `VehicleBooking.trip_department_id`

---

## v2.6 — Driver OT Tables (2026-05-03)

*Migration: [2026-05-03_add-ot-tables.sql](../../../app/migrations/2026-05-03_add-ot-tables.sql)*

### 3 new tables

**เหตุผลหลัก:** ระบบจัดการค่าล่วงเวลา (OT) คนขับรถ — แยก model ใหม่แทน `calc_ot()` on-the-fly เพื่อรองรับ approval workflow + audit trail

#### `ot_rate_config`
| Field | เหตุผล |
|-------|--------|
| `label`, `start_time`, `end_time` | กำหนด time band ที่ configurable โดย admin แทนการ hardcode ใน `calc_ot()` |
| `rate` | อัตราต่อชั่วโมงของแต่ละ band — แยกออกมาเพื่อแก้ได้โดยไม่ต้องแตะ code |
| `is_active` | ปิด/เปิด band ได้โดยไม่ต้องลบข้อมูล (กัน FK ขาด) |
| `sort_order` | ควบคุมลำดับแสดงผลใน UI |

#### `driver_ot`
| Field | เหตุผล |
|-------|--------|
| `booking_id` FK | ผูก OT เข้ากับ booking — 1 record ต่อ 1 ทริป |
| `driver_id` FK | ระบุคนขับที่ได้รับ OT |
| `ot_number` unique | running number สำหรับอ้างอิงในเอกสาร/การเงิน ("OT-2026-0001") |
| `total_hours`, `total_amount` | denormalized sum จาก slots — เพื่อ query เร็วโดยไม่ต้อง aggregate ทุกครั้ง |
| `status` (unpaid/paid) | จ่าย/ยังไม่จ่าย — v2.15 ตัด step อนุมัติ (เดิม pending/approved/paid) |
| `approved_by_id`, `approved_at` | **legacy** — audit trail การอนุมัติ; เลิกใช้ v2.15 (ไม่ลบ คอลัมน์เก็บประวัติเก่า) |
| `paid_by_id`, `paid_at` | audit trail การจ่ายเงิน |
| `no_receipt` | v2.15 — OT ที่ไม่ต้องออกใบเสร็จ (tab "ผู้ใช้จ่ายเอง") |
| `is_deleted`, `deleted_at` | v2.15 — soft delete (tab "ลบ") กู้คืนได้ |
| `created_by_id`, `created_at` | audit trail การสร้าง record |

#### `driver_ot_slot`
| Field | เหตุผล |
|-------|--------|
| `driver_ot_id` FK | หลาย slot ต่อ 1 OT record (1 ทริปอาจคร่อมหลาย time band) |
| `rate_config_id` FK nullable | ชี้ไป config ปัจจุบัน (nullable เพราะ config อาจถูกลบในอนาคต) |
| `slot_label`, `rate` | **snapshot** ณ เวลาบันทึก — กัน rate เปลี่ยนย้อนหลัง (เหมือน `snap_*` ใน vehicle_booking) |
| `hours`, `amount` | เก็บ pre-calculated ต่อ slot เพื่อ audit ได้ชัดเจน |

---

## v2.7 — Fuel Management Tables (2026-05-04)

*Migration: [2026-05-04_add-fuel-management.sql](../../../app/migrations/2026-05-04_add-fuel-management.sql)*

### 5 new tables

**เหตุผลหลัก:** หน้า `/admin/fuel` ใหม่ — admin บันทึกบิลค่าน้ำมันที่จ่ายให้คนขับจาก "เงินสำรอง" ที่ถืออยู่ แล้วรวมหลายบิลเข้าเป็นใบเบิก (พร้อมเลขใบเบิก) เพื่อขอเงินคืนจากแหล่งเบิก ตามเวิร์กโฟลว์ pay-now-claim-later

#### `fuel_bill`
| Field | เหตุผล |
|-------|--------|
| `bill_date` | วันที่เติมจริง — ใช้คู่กับ `FuelPrice.get_for_date()` ในการคำนวณย้อนหลัง |
| `vehicle_id`, `driver_id` FK | ระบุรถและคนขับที่ได้รับเงินค่าน้ำมัน |
| `amount` Numeric(10,2) | จำนวนเงินที่จ่ายให้คนขับจริง (อาจไม่ตรง mileage formula กรณีจ่ายเหมา) |
| `payment_method` | `transfer`/`card`/`self` — track ช่องทางจ่ายเงินเพื่อ reconcile กับ statement |
| `mileage` Integer nullable | เลขไมล์ตอนเติม — ใช้ cross-check กับ VehicleMileage |
| `reimbursement_id` FK nullable | null = ยังไม่รวมเข้าใบเบิก, มีค่า = batched แล้ว |
| `note`, `created_by`, `created_at`, `updated_at` | audit trail |

#### `fuel_reimbursement`
| Field | เหตุผล |
|-------|--------|
| `reimbursement_no` | เลขใบเบิกตามระบบเอกสารบริษัท เช่น "จ69-00164" |
| `source` | แหล่งเบิก (เช่น "บางบาล") — ระบุว่าจะไปขอเงินคืนจากที่ไหน |
| `submitted_at`, `received_at` | timeline 2 จุด — ส่งเรื่อง vs ได้เงินคืน เพื่อ track outstanding |
| `note`, `created_by`, `created_at`, `updated_at` | audit trail |
| `bills` (backref) | 1 ใบเบิก : N บิล — query งบทั้งใบได้ทีเดียว |

**ทำไมแยก FuelBill กับ FuelReimbursement?** Admin จ่ายเงินให้คนขับทันทีจากเงินสำรอง (1 บิล = 1 transaction) แต่การขอเงินคืนทำเป็น batch (รวมหลายบิลเข้าเป็น 1 ใบเบิก) ถ้ารวมเป็นตารางเดียวจะ denormalize และ track 2 timeline ในแถวเดียวกันไม่ได้

#### `fuel_price` — replaces `SystemConfig['fuel_price']`
| Field | เหตุผล |
|-------|--------|
| `effective_date` Date unique | วันที่เริ่มมีผล — lookup `latest WHERE effective_date <= target_date` |
| `price_per_liter` Numeric(8,2) | ราคา/ลิตร ณ ช่วงเวลานั้น |
| `note`, `created_by`, `created_at` | audit trail |

**ทำไมไม่ใช้ SystemConfig['fuel_price'] ต่อ?** SystemConfig เก็บค่าเดียว overwrite ทับ ทำให้คำนวณ mileage cost ย้อนหลังไม่ถูกต้อง (ราคาน้ำมันเปลี่ยนทุกสัปดาห์ ทริปเดือนก่อนต้องใช้ราคาเดือนก่อน) ตารางนี้เก็บประวัติเป็น row + helper `get_for_date()` ทำ lookup ได้ตรงเวลา

**Migration script:** copy ค่า `SystemConfig['fuel_price']` ปัจจุบันมาเป็น row แรก (effective_date = 2026-05-04) เพื่อ backward compat — admin ปรับ effective_date ย้อนหลังได้ทีหลัง SystemConfig key เก่ายังไม่ลบ (ปลอดภัยไว้ก่อน)

#### `fuel_reserve_config` (singleton)
| Field | เหตุผล |
|-------|--------|
| `id=1` (singleton) | เงินสำรองคงเหลือมีค่าเดียวในระบบ ใช้แถวเดียว query เร็ว |
| `amount` Numeric(12,2) | ยอดคงเหลือปัจจุบัน — denormalized สำหรับ display ที่ทุกหน้า |
| `updated_at`, `updated_by` | audit trail การปรับล่าสุด |

#### `fuel_reserve_log`
| Field | เหตุผล |
|-------|--------|
| `change_amount` | +/- จำนวนเงินที่ปรับ (เติมเงินสำรอง / จ่ายค่าน้ำมัน / ได้เงินคืน) |
| `new_balance` | snapshot ยอดหลังปรับ — กัน race condition + ตรวจย้อนได้แม้ amount ใน config เปลี่ยน |
| `note` **NOT NULL** | เหตุผลการปรับ — required เพื่อบังคับ admin ระบุที่มา (เติมเงินจากไหน, จ่ายให้บิลไหน) |
| `created_by`, `created_at` | audit trail |

**ทำไมแยก config กับ log?** config = current state (read fast), log = full history (write append-only) แยกเพื่อให้ display ไม่ต้อง aggregate และ audit trail ไม่หาย

---

## v2.8 — VehicleBudget Ledger Pattern (2026-05-06)

*Migration: [2026-05-06_add-vehicle-budget-log.sql](../../../app/migrations/2026-05-06_add-vehicle-budget-log.sql)*

### ปัญหาที่แก้
เดิม `vehicle_budget.used_amount` ถูก mutate ตรง ๆ ด้วย `+=`/`-=` ในหลายจุด (`mileage_log()`, `driver_mileage()`, override) ผลคือ:
- **Double-deduct** — ถ้า request ซ้อน หรือ user กดบันทึกซ้ำ ก็หักงบซ้ำได้
- **Refund ไม่ได้** — ไม่มี record บอกว่า "หักไปเท่าไร ตอนไหน" ทำให้คืนงบเมื่อยกเลิก/แก้ไขไมล์ไม่ได้แม่นยำ
- **ไม่มี audit trail** — ตรวจย้อนไม่ได้ว่าใครหัก, หักให้ booking ไหน, ตอนไหน

### Solution: Ledger Pattern (เลียน `fuel_reserve_log`)
ทุก mutation ของเงินต้อง append row ใน `vehicle_budget_log` ผ่าน `BudgetService` — `vehicle_budget.used_amount` กลายเป็น **cache ของ SUM(change_amount)**

#### `vehicle_budget_log` — new table
| Field | เหตุผล |
|-------|--------|
| `budget_id` FK NOT NULL | ผูกกับ vehicle_budget ที่ถูก mutate |
| `event_type` | `set_budget`/`deduct`/`refund`/`override`/`adjust` — ระบุชนิดของ event เพื่อ filter/report ได้ |
| `change_amount` Numeric(12,2) | signed: หัก=negative, คืน=positive — รวมกันได้เป็นยอด used_amount ปัจจุบัน |
| `new_used_balance` | snapshot used_amount หลัง event — กัน race condition + ตรวจย้อนได้ |
| `new_budget_amount` | snapshot budget_amount หลัง event — track การเปลี่ยนเพดานงบด้วย |
| `booking_id` FK nullable | link กลับไปทริปต้นเหตุ — null สำหรับ adjust/set_budget |
| `mileage_id` FK nullable | link ไป VehicleMileage row ที่ trigger — สำคัญสำหรับ idempotency |
| `reverses_log_id` FK self nullable | refund event ชี้ไป deduct event เดิม — audit chain ครบวง |
| `snap_distance`, `snap_fuel_rate`, `snap_fuel_price` | snapshot input ที่ใช้คำนวณ change_amount — ตรวจย้อนได้แม้ master เปลี่ยน |
| `note` String(500) **NOT NULL** | required เหตุผล (เหมือน fuel_reserve_log) — บังคับให้ทุก mutation มีคำอธิบาย |
| `created_by`, `created_at` | audit trail |

**Indexes:** `ix_vbl_budget`, `ix_vbl_booking`, `ix_vbl_mileage`

#### `vehicle_mileage` + 2 fields (idempotency)
| Field | เหตุผล |
|-------|--------|
| `budget_deducted_at` DateTime nullable | null = ยังไม่เคยหักงบ — ใช้ guard ป้องกัน double-deduct ถ้า user กดบันทึกซ้ำ (ตรวจก่อนหัก) |
| `last_budget_log_id` FK → vehicle_budget_log nullable | tx ที่ active — ใช้สำหรับ refund/rededuct: ถ้าแก้ mileage ให้ refund ผ่าน log นี้แล้ว deduct ใหม่ |

### Backfill (opening balance)
Migration สร้าง row `event_type='adjust'` 1 row ต่อ vehicle_budget ที่มี `used_amount <> 0 OR budget_amount <> 0` เพื่อให้ `SUM(change_amount) = used_amount` ปัจจุบัน — booking เก่าทั้งหมดถือเป็น "opening balance" (ไม่ rebuild ย้อนหลัง)

### Rollout
- ตาราง + ALTER + backfill — Phase 1 (this migration)
- เขียน `BudgetService.deduct()/refund()/override()/set_budget()` + เปลี่ยน `mileage_log()` + `driver_mileage()` ให้เรียกผ่าน service — Phase 2 (separate task)
- ห้าม mutate `used_amount` ตรงในโค้ดใหม่อีก — ทุกการเปลี่ยนต้องผ่าน `BudgetService`

---

## v2.9 — VehicleBudget is_active (2026-05-18)

*Migration: [2026-05-18_vehicle-budget-is-active.sql](../../../app/migrations/2026-05-18_vehicle-budget-is-active.sql)*

### `vehicle_budget` + 1 field

| Field | เหตุผล |
|-------|--------|
| `is_active` Boolean NOT NULL default True | Admin toggle ปิดงบรายแถวจาก Budget Manage page — `is_active=False` block `approve_booking()` (target budget นั้น) + block `budget_manage()` POST `top_up`/`manual_adjust` + ทำให้ KPI strip (`total_budget`/`total_used`/`total_remaining`/`pending_count`) ไม่นับ; **mileage deduct + refund flows ไม่ block** เพื่อให้ booking ที่ approved ไปแล้วยังปิดทริป + refund ได้ถูกต้อง การ toggle เองถูกบันทึกเป็น `vehicle_budget_log` row ด้วย `event_type='set_active'`/`'set_inactive'` (ไม่ต้องแก้ schema log table — `event_type` เป็น String(20) อยู่แล้ว) Default True + server_default `'1'` เพื่อให้ ALTER ADD COLUMN backfill row เดิมเป็น active โดยไม่ต้อง UPDATE แยก |

---

## v2.10 — OTRateConfig day_of_week (2026-05-18)

*Migration: [2026-05-18_ot-rate-config-day-of-week.sql](../../../app/migrations/2026-05-18_ot-rate-config-day-of-week.sql)*

### `ot_rate_config` + 1 field

| Field | เหตุผล |
|-------|--------|
| `day_of_week` Integer nullable | รองรับให้ admin config อัตรา OT แบบ override รายวัน (เช่น วันอาทิตย์เหมา 300 ฿/hr) โดยไม่ต้องแตะ code; semantics: `NULL`=applies to any day (พฤติกรรมเดิม weekday-agnostic), `0`=Monday ... `6`=Sunday (match Python `datetime.weekday()`); `auto_generate_ot()` ([vehicle_view.py:1644](../../../app/views/vehicle_view.py#L1644)) lookup rule: ถ้ามี row ที่ `day_of_week` ตรงกับ booking weekday → ใช้เฉพาะ override rows นั้น, ไม่ match → fallback ใช้ rows ที่ `day_of_week IS NULL`; nullable=True ทำให้ existing rows (เช้ามืด/หัวค่ำ/วิกาล) เป็น NULL อัตโนมัติ — ไม่ต้อง backfill UPDATE แยก |

---

## v2.11 — VehicleBooking Ad-hoc Trip (2026-05-18)

*Migration: [2026-05-18_vehicle-booking-ad-hoc.sql](../../../app/migrations/2026-05-18_vehicle-booking-ad-hoc.sql)*

### Feature codename: "ad-hoc trips" (งานนอกระบบ)

**บริบทธุรกิจ:** คนขับต้องการบันทึกทริปที่ไม่ได้จองล่วงหน้า — กดปุ่ม "+ งานนอกระบบ" จาก `/driver` page เพื่อสร้าง `VehicleBooking` ทันที (after-the-fact recording) ทริปประพฤติตัวเหมือน approved booking ปกติ ยกเว้นถูกซ่อนจาก calendar ที่ `/vehicle` (ซึ่งเป็น UI ของ upcoming booking requests) แต่ยังแสดงในหน้า admin (`vehicle_admin.html`, `approver_inbox.html`) เพื่อให้ admin assign expense_type / budget ภายหลังได้

### `vehicle_booking` + 2 fields

| Field | เหตุผล |
|-------|--------|
| `is_ad_hoc` Boolean NOT NULL default False | แยก driver-created on-the-fly trips ออกจาก pre-booked ปกติ; `vehicle.html` calendar filter `is_ad_hoc=False` (เพราะ calendar คือ upcoming booking requests ไม่ใช่ trip log), ส่วนหน้า admin (`vehicle_admin.html`, `approver_inbox.html`) ยังแสดงทั้งหมดเพื่อจัดการ expense_type/budget ทีหลัง; default False + server_default `'0'` เพื่อให้ ALTER ADD COLUMN backfill row เดิมเป็น booking ปกติโดยไม่ต้อง UPDATE แยก |
| `contact_name` String(100) nullable | ใน modal "+ งานนอกระบบ" dropdown "ผู้จอง/ผู้ติดต่อ" รองรับ 2 mode: (a) เลือกจาก existing users → `user_id` set ปกติ + `contact_name=NULL`; (b) พิมพ์ free-text ชื่อ (สำหรับ external visitor ที่ไม่อยู่ใน LDAP) → `user_id=current driver's user.id` (เพื่อ ownership/audit) + `contact_name='ชื่อที่พิมพ์'`; display layer ทุกที่ที่แสดง "ผู้จอง" prefer `contact_name` ก่อน fallback ไป `user.full_name` ถ้า NULL; nullable เพราะ booking ปกติไม่ใช้ field นี้ |

---

## v2.12 — VehicleBooking status `cancelled` documented (2026-05-22)

*No migration — doc-only change. ไม่มี .sql file.*

### Feature codename: Phase 9 cancel_booking()

**บริบทธุรกิจ:** Phase 9 เพิ่ม route `cancel_booking()` ให้ผู้จอง soft-cancel booking ของตัวเอง โดย set `status='cancelled'` (แทนการ DELETE row) เพื่อรักษา audit trail + refund flow ผ่าน `budget_service.refund_for_booking()` ค่า `'cancelled'` ถูกใช้จริงตั้งแต่ 2026-05-18 ใน admin refund path ([vehicle_view.py:2858](../../../app/views/vehicle_view.py#L2858)) แล้ว — แต่ enum comment ใน models.py ยังไม่ได้สะท้อนค่านี้

### `vehicle_booking.status` enum comment update

| Change | เหตุผล |
|--------|--------|
| เพิ่ม `cancelled` ใน inline enum comment (models.py L184) | Schema-level: column เป็น `String(20)` ไม่มี CHECK constraint → ไม่ต้อง ALTER. เป็น documentation sync ล้วน เพื่อให้ comment ตรงกับค่าที่ใช้จริง + บอก reader ว่า Phase 9 `cancel_booking()` คือ writer หลักของค่านี้สำหรับ user-initiated cancel. ไม่กระทบ DB, ไม่ต้อง migrate. |

---

## v2.13 — VehicleBudget active period (2026-06-06)

*Migration: [2026-06-06_budget-active-period-backfill.sql](../../../app/migrations/2026-06-06_budget-active-period-backfill.sql)*

### Feature codename: "งบช่วงเวลา" (active period budget)

**บริบทธุรกิจ:** เดิม `vehicle_budget` ผูก `year`+`month` แบบแข็ง (UniqueConstraint + lookup ตามเดือน) → งบ 1 ก้อน = 1 เดือน. พอขึ้นเดือนใหม่ที่ admin ยังไม่ตั้งงบ หน้า budget_manage ว่างเปล่า + การหักงบ/approve หา budget ของเดือนนั้นไม่เจอ → ทำงานไม่ได้ ต้องตั้งงบใหม่ทุกเดือน. เปลี่ยนให้ **ช่วงเวลา (`start_date`–`end_date`) + `is_active`** เป็นตัวกำหนดว่างบเปิดใช้หรือไม่ — งบ 1 ก้อนใช้ข้ามเดือนได้ + admin "เพิ่มเวลา" ขยาย end_date นำงบกลับมาใช้ได้

### ไม่มี schema change — semantic + backfill เท่านั้น

| Change | เหตุผล |
|--------|--------|
| Backfill `start_date` = วันแรกของเดือน anchor, `end_date` = วันสุดท้าย (WHERE null) | column มีอยู่แล้ว (nullable ตั้งแต่ v2.1). งบเดิม ~ทั้งหมด null → ถ้าปล่อยไว้จะตกไป section "คลังงบ" (ถือว่า no_period) หลัง deploy → หักงบ/approve พังทันที. backfill จาก year/month ให้งบเดิมยัง active ครอบเดือนตัวเอง ไม่พัง. Idempotent (WHERE null → รันซ้ำปลอดภัย) |
| Index `ix_vb_active_period` บน (department_id, budget_type_id, is_active, start_date, end_date) | รองรับ `_lookup_budget_for_booking()` ที่หางบ active ครอบวัน booking (date-range query) — เรียกทุกครั้งที่ approve + ปิดทริป |
| `start_date`/`end_date` semantic: metadata → **active period** | เคยเป็นแค่ข้อมูลแสดง. ตอนนี้กำหนดทั้งการแสดง (active-for-month overlap) + การหักงบ (`_lookup_budget_for_booking` หา `is_active=True AND start_date <= วันที่ <= end_date`). overlap หลายก้อน → start_date ล่าสุด |
| `year`/`month` → anchor (คงไว้) | เลิกใช้ใน lookup แต่ไม่ลบ — ยังเป็น UniqueConstraint(type,dept,year,month) (SQLite drop constraint ต้อง recreate table — เลี่ยง) + `set_budget` ยังตั้งงบรายเดือนตาม anchor. `used_amount` กลายเป็นยอดสะสมทั้งช่วง (ข้ามเดือน) — pivot×เดือน เลยดึงจาก `vehicle_budget_log.created_at` แทน used_amount |

**App-layer (ไม่ใช่ schema):** `_lookup_budget_for_booking(booking, on_date=None)` + 3 จุดหักงบใช้ helper ร่วม; `approve_booking` block ถ้า lookup คืน None; `budget_manage` GET แยก active-for-month vs `archived_budgets` + POST action `extend_period`; `_build_budget_pivot` ดึงจาก ledger. ดู [INDEX.md](../INDEX.md) § Key Functions

---

## v2.14 — Driver profile fields (2026-06-08)

*Migration: [2026-06-08_driver-profile-fields.sql](../../../app/migrations/2026-06-08_driver-profile-fields.sql)*

**บริบทธุรกิจ:** ตาราง `driver` เดิมเก็บแค่ ชื่อ/เบอร์/สถานะ/ผูก user — ไม่พอสำหรับออกใบเสร็จ/เอกสารค่าตอบแทนคนขับ (ต้องมีเลขบัตร ปชช. + ที่อยู่ตามทะเบียนบ้าน). หน้า `vehicle_fleet.html` redesign ฝั่งคนขับให้กดดู/แก้ profile เต็มได้ → เพิ่ม 8 column

| Field | เหตุผล |
|-------|--------|
| `national_id` String(20) | เลขบัตรประชาชน — header ใบเสร็จ. String ไม่ใช่ int (รักษาเลข 0 นำหน้า + ไม่ใช่ตัวเลขคำนวณ) |
| `addr_line` / `addr_subdistrict` / `addr_district` / `addr_province` / `addr_postal` | ที่อยู่แบบ **structured** (ไม่ใช่ text ก้อนเดียว) เพื่อ render ใบเสร็จที่แยกช่อง ต./อ./จ./ไปรษณีย์ ได้ตรง layout |
| `id_card_image` String(255) | ชื่อไฟล์รูปบัตร ปชช. เก็บใน `static/uploads/driver/` (pattern เดียวกับ mileage upload) |
| `avatar_image` String(255) | ชื่อไฟล์รูปโปรไฟล์ — แสดงเป็น avatar ใน list (fallback = ตัวอักษรย่อ) |

ทุก column **nullable** — คนขับเดิมไม่ต้อง backfill, ไม่กระทบ logic จอง/หักงบ. App: `add_driver`/`edit_driver` ใน `vehicle_admin.py` รับ field + `_save_driver_image()` helper

---

## v2.15 — Driver OT paid/soft-delete (2026-06-08)

*Migration: [2026-06-08_driver-ot-paid-softdelete.sql](../../../app/migrations/2026-06-08_driver-ot-paid-softdelete.sql)*

**บริบทธุรกิจ:** หน้า OT (`admincost` / `vehicle_cost.html`) เดิม workflow = `pending → approved → paid` (3 step ผ่าน admin อนุมัติก่อนจ่าย). แต่จริง ๆ admin ที่จ่ายเงิน = คนเดียวกับที่อนุมัติ → step อนุมัติซ้ำซ้อน. ตัดทิ้งเหลือ **จ่าย/ยังไม่จ่าย** + เพิ่ม 2 มิติใหม่: OT ที่ไม่ต้องออกใบเสร็จ และ soft delete (กู้คืนได้)

| Field | เหตุผล |
|-------|--------|
| `status` (เปลี่ยนความหมาย) | `pending`/`approved` → รวมเป็น `unpaid`; `paid` คงเดิม. backfill ใน migration. `approved_by_id`/`approved_at` กลายเป็น legacy (ไม่ลบ — SQLite DROP COLUMN ยุ่งยาก + เก็บประวัติเก่า) |
| `no_receipt` Boolean | tab "ผู้ใช้จ่ายเอง" = OT ที่ไม่ต้องออกใบเสร็จ. orthogonal กับ paid/unpaid — เป็น bucket แยก, filter ตัวเอง |
| `is_deleted` Boolean + `deleted_at` | soft delete → tab "ลบ" กู้คืนได้. `ot_delete` เปลี่ยนจาก hard delete เป็น set flag; ทุก tab ปกติ filter `is_deleted=False` |

App: `vehicle_cost.py` — `cost_summary` filter ตาม tab, KPI = ยอดรวม/ยังไม่จ่าย/จ่ายแล้ว (ไม่นับ deleted); `ot_mark_paid` จ่ายตรงจาก unpaid (ไม่ต้อง approved ก่อน); `ot_toggle_no_receipt` + `ot_restore` routes ใหม่; `auto_generate_ot` (vehicle_common.py) สร้างด้วย `status='unpaid'`. `ot_approve` route เลิกใช้

---

## v2.16 — Driver OT standalone (manual create) (2026-06-09)

*Migration: [2026-06-09_driver-ot-standalone.sql](../../../app/migrations/2026-06-09_driver-ot-standalone.sql)*

**บริบทธุรกิจ:** เดิม `DriverOT` สร้างได้ทางเดียว = auto ตอนคนขับปิดงาน (มี `booking` + งบเสมอ). เพิ่มปุ่ม **"เพิ่ม OT"** หน้า `admincost`/`vehicle_cost.html` ให้ admin สร้าง OT เองได้ (เช่น OT ที่ไม่ได้ผูกกับ booking ในระบบ) → **standalone** ไม่ผูก booking/ไม่หักงบ

| Field | เหตุผล |
|-------|--------|
| `booking_id` (NOT NULL → nullable) | manual OT ไม่มี booking ต้นทาง → `booking_id=None`. SQLite ไม่รองรับ drop-NOT-NULL ผ่าน ALTER → migration ใช้ table rebuild (create new + copy + drop + rename). ข้อมูลเดิมมี booking_id ครบ — copy ตรง ไม่มี data loss |

App: `vehicle_cost.py` — route `ot_create` (POST `/admin/ot/create`, standalone, AJAX/JSON); helper `_parse_ot_slots(form)` (แชร์กับ `ot_edit`); `next_ot_number(yr)` (vehicle_common.py — factor ออกจาก `auto_generate_ot`). `_ot_budget_label(None)` คืน `('—','')` อยู่แล้ว → template null-safe. UI: ปุ่ม `#addOtBtn` + modal `#addOtModal` (layout เหมือน edit), date เป็น va-cal datepicker, slot rows แบบ header (`cost-slot-head`)

---

## v2.17 — User LINE Messaging API (2026-06-12)

*Migration: [2026-06-12_user-line-id.sql](../../../app/migrations/2026-06-12_user-line-id.sql)*

**บริบทธุรกิจ:** เพิ่มช่องทางแจ้งเตือน LINE Messaging API เป็นช่องทางที่ 3 ต่อจาก Telegram + in-app notification. flow ผูกบัญชี = user พิมพ์โค้ด 6 หลัก (`line_link_code`) ใน chat ของ Official Account → webhook จับคู่ผู้ใช้ → set `line_user_id` แล้วล้างโค้ดทิ้ง → จากนั้น push แจ้งเตือนรายคนผ่าน `line_user_id` ได้

| Field | เหตุผล |
|-------|--------|
| `line_user_id` (String(64) unique nullable) | LINE userId ของผู้ใช้ ได้จาก webhook ตอนผูกบัญชี — ใช้เป็นปลายทาง push แจ้งเตือนรายคน. UNIQUE กัน 1 LINE account ผูกหลาย user. SQLite เพิ่ม UNIQUE column ผ่าน ALTER ไม่ได้ → migration สร้าง `CREATE UNIQUE INDEX ix_user_line_user_id` แยกแทน inline constraint |
| `line_link_code` (String(6) nullable) | โค้ด 6 หลักชั่วคราวสำหรับ flow ผูกบัญชี — generate ตอน user ขอผูก, ล้างเป็น NULL หลัง webhook จับคู่สำเร็จ |

---

## v2.18 — Drop dead columns (2026-06-14)

*Migration: [2026-06-14_drop-dead-columns.sql](../../../app/migrations/2026-06-14_drop-dead-columns.sql)*

**บริบทธุรกิจ:** ตรวจพบ 3 column ใน `vehicle_booking` ที่ไม่เคยถูกเขียน (NULL ทุกแถว) + 1 table (`expense_type`) ที่ไม่เคยถูก query เลยตลอดอายุระบบ. ลบทิ้งเพื่อลด schema noise + กัน developer เข้าใจผิดว่า field เหล่านี้ยังมีความหมาย

### `vehicle_booking` — ลบ 3 column

| Column | เหตุผลที่ลบ |
|--------|-------------|
| `expense_type_id` | FK ไปยัง `expense_type` table. เพิ่มใน v2.0 เพื่อเป็น canonical FK แทน string แต่ write path ไม่เคย implement — controller ทุกตัวใช้ `expense_type` (string) แทน budget code มี comment "Bug fix: expense_type_id เป็น NULL" และ workaround โดยไม่ set field นี้เลย ทำให้ NULL 100% ในทุกแถว |
| `snap_department_name` | snapshot field เพิ่มใน v2.0 พร้อม `snap_vehicle_plate`/`snap_driver_name` แต่ write path (ตอน admin assign) ไม่เคยเขียน `snap_department_name` → NULL ทุกแถวมาโดยตลอด |
| `contact_name` | เพิ่มใน v2.11 สำหรับ ad-hoc trips (external visitor ที่ไม่อยู่ใน LDAP) แต่ write path หายไประหว่าง refactor `vehicle_view.py` → package (2026-06-07) — controller ใหม่ไม่เคย set field นี้ → NULL ทุกแถว; display layer fallback logic ก็ถูก clean up พร้อมกัน |

### `expense_type` table — dropped

| เหตุผล | |
|--------|-|
| `ExpenseType` model defined ใน `vehicle_budget.py:18-23` แต่ grep พบ zero `.query` calls ตลอด codebase | ไม่มี controller อ่านหรือเขียนตาราง นอกจาก FK จาก `vehicle_booking.expense_type_id` ซึ่ง drop ไปแล้วด้านบน |
| Seed data (`central`/`department`/`personal`) ไม่ถูกใช้แม้แต่ใน lookup | ค่า expense_type ที่ใช้จริงเป็น string `'central'`/`'department'`/`'personal'` ใน `VehicleBooking.expense_type` (String column) โดยตรง |

**หมายเหตุ Model:** `ExpenseType` class และ relationship `expense_type_ref` ใน `VehicleBooking` ยังคงอยู่ใน `app/models/vehicle_budget.py` และ `app/models/vehicle.py` ตามลำดับ — ต้องลบทั้งสองในรอบ cleanup code (ไม่มีผลต่อ DB หลัง migration รัน; SQLAlchemy จะพยายาม reflect ตาราง `expense_type` ที่ไม่มีแล้วเมื่อ `db.create_all()` ซึ่ง safe เพราะ `create_all` ไม่ drop; แต่ควร clean up เร็ว ๆ นี้)

---

## v2.19 — Notification Supersede (2026-06-15)

*Migration: [2026-06-15_notification-supersede.sql](../../../app/migrations/2026-06-15_notification-supersede.sql)*

### `notification` + 2 fields

**เหตุผลหลัก:** ฟีเจอร์ "supersede" — กัน notification ชนิดเดียวกันของ booking เดิมสะสมซ้ำใน feed (เช่น booking ถูก assign/forward/approve หลายรอบ → เดิมได้ notif ใหม่ทุกครั้งทับกอง) เมื่อมี event ชนิดเดียวกันที่ใหม่กว่าเข้ามา ตัวเก่าถูก mark `superseded_at` แทนที่จะค้างใน feed

| Field | เหตุผล |
|-------|--------|
| `event_key` | ระบุชนิด event แบบ stable (`booked`/`assigned`/`forwarded`/`approved`/`rejected`/`merged`/`mileage_start`/`mileage_end`/`budget`) ใช้เป็น key จับคู่ supersede ต่อ booking — **ต้องแยกจาก `icon`** เพราะ icon string ชนกัน (เช่น `approved` กับ `payment_done` ใช้ icon `fa-solid fa-circle-check` เดียวกัน → icon ระบุตัวตน event ไม่ได้) |
| `superseded_at` | เวลาที่ถูกแทนด้วย event ชนิดเดียวกันที่ใหม่กว่า (null = ยัง active/แสดงผล) — กรอง `superseded_at IS NULL` ตอน render feed + นับ badge |

**Note:** ทั้งสอง column nullable → backfill ไม่จำเป็น (notif เก่าทั้งหมด `event_key=NULL`, `superseded_at=NULL` = active ตามเดิม). `db.create_all()` ไม่ ALTER ตารางเดิม → ต้องรัน `.sql` manual

---

## v2.20 — Notification Title (2026-06-16)

*Migration: [2026-06-16_notification-add-title.sql](../../../app/migrations/2026-06-16_notification-add-title.sql)*

### `notification` + 1 field

**เหตุผลหลัก:** freeze "title" (บรรทัดแรกของ notification card บน UI) ตอนสร้าง notification — เดิม title ถูก compute ตอน serialize จาก `event_key` (`_notif_title()` ใน `vehicle_notification.py`) ทำให้ title เป็น generic ต่อ event_key เดียวกัน และแยก case ไม่ได้ (เช่น admin-approve vs approver-approve ใช้ `event_key='approved'` เหมือนกัน). การ freeze title ตอนสร้างทำให้แต่ละ notification เก็บ title เฉพาะของมันเอง + รองรับ dynamic title (เช่น "อนุมัติงาน {purpose}")

| Field | เหตุผล |
|-------|--------|
| `title` | บรรทัดแรกของ notif card — freeze ตอนสร้างเพื่อให้ title เฉพาะต่อ notification (ไม่ใช่ generic ต่อ event_key) + รองรับ dynamic title. **nullable** เพราะ notification เก่าไม่มีค่า → serializer fallback ไปใช้ `_notif_title()` เดิมจาก event_key |

**Note:** column nullable → backfill ไม่จำเป็น (notif เก่าทั้งหมด `title=NULL` → serializer ใช้ `_notif_title()` fallback). `db.create_all()` ไม่ ALTER ตารางเดิม → ต้องรัน `.sql` manual

---

## Future Schema Changes (Planned)

*อ้างอิง: [future_features.md](../future_features.md)*

| Change | Module | Why |
|--------|--------|-----|
| `user_notification_pref` table | Auth | per-user preferences (toast/email/telegram × category) |
| Drop `assigned_vehicle2_id`, `driver2_id` | Vehicle | Future #7 — ลบ function รถ 2 คัน |
| Extend `notification` to Repair/Maintenance/Room | Cross-module | Future #8 — generalize FK booking_id |

---

## Maintenance Protocol

**ทุกครั้งที่แก้ [`models/`](../../../app/models/) (ไฟล์ domain ใดก็ตาม)** ต้องทำทั้งหมด:

1. **เขียน migration SQL** ใน `app/migrations/YYYY-MM-DD_<slug>.sql`
   - `BEGIN TRANSACTION;` ... `COMMIT;`
   - ALTER TABLE สำหรับ column ใหม่ (SQLite จำกัด — หลีกเลี่ยง DROP COLUMN)
   - CREATE INDEX ถ้า query pattern ต้องการ
   - Header comment: วัตถุประสงค์ + วันที่ + คำสั่งรัน
2. **อัปเดต Part 1 — Current Tables** ในไฟล์นี้ — เพิ่ม/แก้แถวของ model นั้น
3. **อัปเดต Part 2 — Version History** — เพิ่ม section v2.x ใหม่ พร้อม **เหตุผล** ทุก field
4. **อัปเดต [migrations-index.md](../../../app/migrations/migrations-index.md)** — เพิ่ม entry
5. **อัปเดต [INDEX.md](../INDEX.md)** Models section ถ้าเพิ่ม/ลบ model
6. **Run migration on dev DB** ก่อน commit

**Rule:** ถ้า field เพิ่มเข้ามาโดยไม่มีคำอธิบาย "ทำไม" ใน Part 2 → ถือว่างานยังไม่เสร็จ
