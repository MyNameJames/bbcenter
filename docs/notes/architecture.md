# BBCenter V2 — System Architecture

> **อัปเดตล่าสุด:** 2026-04-24
> Symbol/route/model lookup → [INDEX.md](INDEX.md)
> Schema detail → [database/schema-current.md](database/schema-current.md)

---

## Overview

BBCenter V2 = Internal Portal ขององค์กร, Flask monolithic, 4 ระบบหลัก
**Repair IT** · **Building Maintenance** · **Vehicle Booking** · **Room Booking**

---

## Layer Architecture

```
┌─────────────────────────────────────────┐
│  Layer 1: Client                        │
│  Browser → Bootstrap 5 + Jinja2         │
│  FullCalendar (Room), fetch() API       │
└──────────────────┬──────────────────────┘
                   │ HTTP Request
┌──────────────────▼──────────────────────┐
│  Layer 2: Authentication                │
│  Flask-Login + LDAP (ad_utils.py)       │
│  Session TTL: 8 ชั่วโมง                 │
│  Dev bypass: /dev/login/<username>      │
└──────────────────┬──────────────────────┘
                   │ Authenticated Request
┌──────────────────▼──────────────────────┐
│  Layer 3: Application (Flask)           │
│  app.py → 8 Blueprints                  │
│  auth / repair / maintenance / room     │
│  vehicle / adminfleet / admincost / driver │
│  + APScheduler (notification_cron)      │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│  Layer 3.5: Business Services           │
│  app/services/budget_service.py         │
│    • ledger ของ VehicleBudget — ทุก     │
│      mutation ผ่านที่นี่เท่านั้น        │
└──────────────────┬──────────────────────┘
                   │ SQLAlchemy ORM
┌──────────────────▼──────────────────────┐
│  Layer 4: Data                          │
│  SQLite (app/instance/portal.db)        │
│  models.py → 17 Tables                  │
│  static/uploads/ (รูปภาพ)               │
│  migrations/ (manual .sql)              │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│  Layer 5: External Services             │
│  Telegram Bot (telegram_service.py)     │
│  In-app Notifications (notification_service.py) │
└─────────────────────────────────────────┘
```

---

## Request Lifecycle

```
Browser
  → Flask Route
  → @login_required (redirect ถ้ายังไม่ login)
  → Permission Check (role / is_superadmin / approver)
  → Business Logic
  → SQLAlchemy ORM → SQLite
  → [Side effects]: Telegram notify + In-app notification
  → Jinja2 Render / JSON Response
```

---

## Blueprints

รายละเอียด route ทั้งหมด → [INDEX.md § Routes](INDEX.md#-routes-all-paths)

| Blueprint | File | หน้าที่ |
|-----------|------|---------|
| `auth_bp` | `auth_view.py` | login/logout/dashboard + user mgmt |
| `repair_bp` | `repair_view.py` | แจ้งซ่อม IT |
| `maintenance_bp` | `maintenance_view.py` | แจ้งซ่อมอาคาร + Excel export |
| `vehicle_bp` | `vehicle_view.py` | จองรถ + admin approve + notification API |
| `adminfleet_bp` | `vehicle_view.py` | จัดการรถ + งบ + personal reimbursement |
| `admincost_bp` | `vehicle_view.py` | สรุปค่าใช้จ่าย + export |
| `driver_bp` | `vehicle_view.py` | หน้าคนขับ + บันทึกไมล์ |
| `room_bp` | `room_view.py` | จองห้องประชุม |

---

## Permission Matrix

| Module | user | admin | approver | superadmin |
|--------|------|-------|----------|------------|
| Repair | แจ้งซ่อม, แก้/ลบของตัวเอง | เปลี่ยน status, summary | — | ทุกอย่าง |
| Maintenance | แจ้งซ่อม, แก้/ลบของตัวเอง | เปลี่ยน status, export | — | ทุกอย่าง |
| Vehicle | จอง, ดูของตัวเอง | approve, assign, บันทึกไมล์ | approve เฉพาะแผนกตัวเอง | ทุกอย่าง |
| Room | จอง, แก้/ลบของตัวเอง | — | — | ทุกอย่าง |
| Users | — | — | — | จัดการ roles ทุก user |

---

## Vehicle Booking Status Flow

```
                    ┌─────────┐
                    │ pending │
                    └────┬────┘
                         │ Admin approve
            ┌────────────┴────────────┐
            │ expense_type=personal   │ expense_type=central/department
            ▼                         ▼
       ┌──────────┐          ┌────────────────────┐
       │ approved │          │ waiting_approver   │
       └──────────┘          └─────────┬──────────┘
                                       │ Approver (แผนกตัวเอง)
                                ┌──────┴──────┐
                                ▼             ▼
                           ┌──────────┐  ┌──────────┐
                           │ approved │  │ rejected │
                           └──────────┘  └──────────┘
```

---

## Mileage & Budget Flow

```
booking approved
    → Admin/Driver บันทึก entry_type='start' (ไมล์ต้น)
    → Admin/Driver บันทึก entry_type='end' (ไมล์ปลาย)
    → distance = odometer_end - odometer_start
    → fuel_cost = (distance / fuel_rate) * fuel_price
      (mileage.fuel_cost มีค่า → override)
    → ถ้า expense_type ∈ {central, department}
        → BudgetService.deduct_for_mileage(mileage, budget, fuel_cost, snap=...)
            • lock budget row (SELECT FOR UPDATE)
            • INSERT vehicle_budget_log (event_type='deduct', signed change_amount, snap)
            • UPDATE vehicle_budget.used_amount (cache)
            • SET vehicle_mileage.budget_deducted_at + last_budget_log_id  ← idempotent
        → notify_budget_deducted()
```

⚠️ **ทุก mutation ต้องผ่าน `BudgetService`** — ห้ามแก้ `VehicleBudget.used_amount` / `budget_amount` ตรงๆ
- 4 call sites: `mileage_log()`, `driver_mileage()`, `override_fuel()` (rededuct), `budget_manage()` POST (set_budget_amount)
- Cancel/reject หลัง mileage แล้ว → ควรเรียก `BudgetService.refund_for_booking()` (pending wire-up ใน `approve_booking` reject path / `delete_booking`)
- `vehicle_budget.used_amount` เป็น **cache** ของ `SUM(vehicle_budget_log.change_amount WHERE event_type != 'set_budget')` → verify ด้วย `BudgetService.verify_cache_integrity()`

---

## Notification Architecture (2 ช่องทาง)

### 1. Telegram Bot
**Pattern:**
```python
delete_old_message(booking.telegram_message_id)
msg_id = _send(text)
booking.telegram_message_id = msg_id
db.session.commit()
```
ครอบคลุมเฉพาะ Vehicle (approved, forwarded, rejected, cancelled — Phase 9, 2026-05-22)

### 2. In-app Notification
**Pattern:**
```python
from views.notification_service import notify_*
notify_xxx(booking, ...)  # commit อยู่ใน _create()
```
ครอบคลุมเฉพาะ Vehicle (16+ functions ใน notification_service.py — Event #16 `notify_user_cancelled` เพิ่ม Phase 9, 2026-05-22 สำหรับ multi-recipient cancel-after-approve)
Delivery: polled by `/api/notifications` + sticky for payment unpaid
Cron escalation: `notification_cron.check_payment_escalation()` (APScheduler)

---

## File Structure

```
bbcenter/
├── CLAUDE.md                    ← rules + reading strategy (auto-loaded)
├── app/
│   ├── app.py                   ← entry, register blueprints, init scheduler
│   ├── models.py                ← 17 tables
│   ├── ad_utils.py
│   ├── instance/portal.db       ← SQLite (gitignored)
│   ├── migrations/              ← manual .sql
│   ├── views/
│   │   ├── auth_view.py
│   │   ├── repair_view.py
│   │   ├── maintenance_view.py
│   │   ├── vehicle_view.py      ← 4 blueprints (~1900 lines)
│   │   ├── room_view.py
│   │   ├── telegram_service.py
│   │   ├── notification_service.py
│   │   └── notification_cron.py
│   ├── templates/
│   │   ├── _sidebar.html, _header.html
│   │   ├── _notification_panel.html, _notification_toast.html
│   │   ├── auth/, dashboard/, repair/, maintenance/, room/, usermng/
│   │   └── vehicle/
│   │       ├── vehicle-modal-*.html (5 modals)
│   │       ├── admin/ (5 pages)
│   │       └── driver_home.html
│   └── static/
│       ├── css/design-system.css    ← --ds-* tokens
│       ├── css/vehicle.css, vehicle_admin.css, notification.css
│       ├── js/vehicle.js, notification.js
│       ├── js/core/{icons,format,http}.js         ← shared ES modules (Phase 4.0)
│       ├── js/pages/{vehicle-admin,repair,approver-inbox}.js  ← per-page ES modules
│       ├── images/icons/calendar-add.png
│       ├── uploads/{repair,maintenance,mileage}/
│       └── vendor/
└── docs/
    ├── design/                  ← wireframes, prototypes
    └── notes/
        ├── INDEX.md             ← symbol/route lookup (Claude entry)
        ├── file-map.md          ← path → purpose
        ├── architecture.md      ← ไฟล์นี้
        ├── design_system.md
        ├── future_features.md
        ├── database/
        │   ├── schema-current.md
        │   ├── evolution.md
        │   └── migrations-index.md
        ├── doc/                 ← completed tasks
        ├── log/                 ← in-progress
        └── skills/
```

---

## ⚙️ Maintenance Protocol

**เมื่อ architecture เปลี่ยน ไฟล์นี้ต้อง sync:**
- เพิ่ม/ลบ blueprint → Blueprints table
- เปลี่ยน auth flow → Layer 2
- เปลี่ยน notification pattern → Notification Architecture
- เพิ่ม external service → Layer 5
- เปลี่ยนโครงสร้าง folder → File Structure

**ไม่ต้อง sync ที่นี่ (ไปที่ INDEX.md แทน):**
- เพิ่ม route ใหม่ในบล็อกเดิม
- เพิ่ม function helper
- เพิ่ม template
