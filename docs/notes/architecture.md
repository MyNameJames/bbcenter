# BBCenter V2 — System Architecture

> **อัปเดตล่าสุด:** 2026-07-19
> Symbol/route/model lookup → [INDEX.md](INDEX.md)
> Schema detail → [database/schema.md](database/schema.md)

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
│  app.py → 10 Blueprints                 │
│  auth / repair / maintenance / room     │
│  vehicle / adminfleet / admincost /     │
│  driver / fuel / core                   │
│  + APScheduler (notification_cron)      │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│ Layer 3.5: Vehicle Domain (Clean Arch   │
│ Phase 1-4, 2026-07-19)                  │
│ services/vehicle/*.py — use-case:       │
│   guard budget/conflict → state change  │
│   → notify (booking/mileage/budget_svc) │
│ domain/vehicle/*.py — pure logic:       │
│   workflow.py state machine,            │
│   fuel.py calc_fuel_cost — ห้าม import   │
│   flask หรือ query ORM เด็ดขาด            │
└──────────────────┬──────────────────────┘
                   │ SQLAlchemy ORM
┌──────────────────▼──────────────────────┐
│  Layer 4: Data                          │
│  SQLite (app/instance/portal.db)        │
│  models/ → 27 Tables (domain pkg)       │
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

### UI Component Layer (2026-06-29)

```
Controller → Component (app/components/) → Jinja macro → HTML
```

ปรัชญา BBCenter UI Framework: ทุก layer single-responsibility — Model=ข้อมูล, Controller=ประกอบ Component, Component=ถือ config+เลือก template, Jinja=render HTML เท่านั้น (ห้าม build HTML string ใน Python).

- `app/components/base.py` — `BaseComponent` (id/class_name/visible + `render()` ผ่าน `flask.render_template`)
- `app/components/table.py` — `Table`/`Column` = thin wrapper ครอบ macro `bb_table_v2`
- `app/components/badge.py` — `Badge`/`Status` = thin wrapper ครอบ macro `bb_badge`/`bb_status`/`bb_status_inline` (2026-06-29)
- `register_components(app)` (เรียกใน `app.py`) → jinja global `component(obj)` = `obj.render()`
- Controller สร้าง `Table(...)` ส่งเข้า template → `{{ component(table) }}`
- ข้อห้าม: Component **ห้าม** query DB / business logic / ตรวจ permission (Controller จัดการ)
- adopter แรก: cost `ot_expense_table`. ขยาย: เพิ่ม class ใหม่ใน `components/` ครอบ macro `_components/` เดิม
- **Cell Component (2026-06-29):** `Column(cell=lambda row: Component)` → render component (เช่น `Status`) ต่อ row ใน cell ได้ (Jinja เรียก Python callable) — ตารางมี badge/status ในตัว ไม่ต้องใช้ shell `bb_table`
- **Living Gallery** `/dev/components` (`templates/dev/components.html`) = render Python component จริงผ่าน `{{ component(obj) }}` → drift ไม่ได้ · absorb static `components-gallery.html` (CSS catalog) ครบแล้ว → **retired (2026-07-19)**, ไฟล์ถูกลบออกจาก repo

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

> Error logging (2026-06-11): ทุก `except Exception` ใน route → `current_app.logger.exception('<route> failed')` + flash ข้อความกลาง (ห้าม flash `str(e)`) → `app/logs/app.log` (rotate 1MB×5, config ใน app.py)
>
> Service-module logging (2026-06-12): module ที่รันนอก Flask request context (telegram_service, line_service, broadcast) ใช้ `_log = logging.getLogger(__name__)` ที่ top-of-file แทน `current_app.logger` — `_log.exception()` / `_log.warning()` ห้ามใช้ `print()` ใน production code เด็ดขาด

---

## Blueprints

รายละเอียด route ทั้งหมด → [INDEX_routes.md](INDEX_routes.md)

| Blueprint | File | หน้าที่ |
|-----------|------|---------|
| `auth_bp` | `auth_view.py` | login/logout/dashboard + user mgmt |
| `repair_bp` | `repair_view.py` | แจ้งซ่อม IT |
| `maintenance_bp` | `maintenance_view.py` | แจ้งซ่อมอาคาร + Excel export |
| `vehicle_bp` | `views/vehicle/` | จองรถ + admin approve + notification API |
| `adminfleet_bp` | `views/vehicle/` | จัดการรถ + งบ + personal reimbursement |
| `admincost_bp` | `views/vehicle/` | สรุปค่าใช้จ่าย + export |
| `driver_bp` | `views/vehicle/` | หน้าคนขับ + บันทึกไมล์ |
| `fuel_bp` | `views/vehicle/vehicle_fuel.py` | จัดการน้ำมัน + เบิกจ่าย (ย้ายจาก `views/fuel_view.py` เดิม — Phase 1 refactor, 2026-07-19; ชื่อ+URL เดิม) |
| `room_bp` | `room_view.py` | จองห้องประชุม |
| `core_bp` | `views/core/` | shared util ข้าม domain (`/dev/components` gallery, LINE webhook) |

> ขั้น 3 (2026-06-07): blueprints 4 ตัว def ใน `views/vehicle/vehicle_common.py`, routes กระจายตาม controller (booking/notification/history/admin/mileage/cost/budget/driver) — mapping เต็มที่ [INDEX §Blueprints](INDEX.md#-blueprints)

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

> 2026-06-11 (workflow review): เปลี่ยนเป็นตาราง transition ให้ตรง code จริง — เดิม diagram บอก central → waiting_approver ซึ่งผิด (เฉพาะ department เท่านั้นที่ผ่าน approver)

| จาก | ไป | ใคร / เงื่อนไข | Code path |
|---|---|---|---|
| pending | waiting_approver | admin approve + `expense_type=department` | `booking_service.approve_from_pending()` (**Phase 2, 2026-07-19** — เรียกจากทั้ง `approve_booking`+`admin_assign`; เดิม 2 path ซ้ำ รวมเป็นทางเดียวแล้ว) |
| pending | approved | admin approve + central/personal | `booking_service.approve_from_pending()` (**Phase 2, 2026-07-19** — `guard_budget()` เดียวกันทั้ง 2 route เดิม) |
| pending | rejected | admin reject | `booking_service.reject_from_pending()` (Phase 2 — ทางเดียว) |
| waiting_approver | approved / rejected | approver เฉพาะแผนกตัวเอง (เช็กงบ active) | `booking_service.approver_approve()`/`approver_reject()` (Phase 2) |
| pending/waiting_approver/approved | cancelled | owner: **pending เท่านั้น** (waiting_approver ตัดออกตั้งใจ 2026-06-20 — ดู [INDEX_code.md](INDEX_code.md)); admin: pending/waiting_approver/approved ทั้งหมด (ไม่มี time guard) — **block ทุกคน (รวม admin) ถ้ามีใครในทริปเดียวกันมี mileage start entry แล้ว** (`odometer_start` ไม่ null — เข้มกว่าเดิมที่เช็กแค่ `budget_deducted_at` ของตัวเอง, REQ-1 Phase 3.5 2026-07-19) | `booking_service.cancel()` — ทางเดียวทั้งระบบ (Phase 2 ย้ายจาก `cancel_booking` route · **ปิด DEBT-3 (REQ-2, Phase 3.5, 2026-07-19):** `budget_manage` action `cancel_booking` เรียก function นี้ตัวเดียวกันแล้ว ไม่มี path แยกเซ็ต `status='cancelled'` ตรงอีกต่อไป) |
| approved/waiting_approver/rejected | pending | admin revert (guard: ห้ามถ้ามี deduct; เคลียร์ reject_reason) | `admin_revert_booking` (**Phase 1, 2026-06-12** — เพิ่ม guard) |
| ทริปกลุ่ม (`trip_group`) — สมาชิกใดๆ | **ทั้งกลุ่มกลับ pending** | ungroup 1 งาน หรือ cancel งานใดในทริป → สมาชิกที่เหลือ**ทุกงาน**กลับ `pending` (reset รถ/คนขับ/`trip_group`) — all-or-nothing ไม่มี partial/skip case อีก · block ทั้งกลุ่มถ้ามีใครมี mileage start entry | `booking_service.ungroup()`/`cancel()` (**REQ-1, Phase 3.5, 2026-07-19** — เดิม `ungroup()` เคลียร์แค่ booking ตัวเดียวที่รับเข้ามาและไม่ครบ field ด้วย: ไม่เคย reset `status`/`driver_id` เลย) |
| pending/waiting_approver | rejected | **ระบบอัตโนมัติ** — เลยกำหนดวันเดินทาง (`start_datetime < now`), cron 08:10 BKK ทุกวัน ไม่ใช่ user action | `notification_cron.auto_reject_overdue_bookings()` เรียก `apply_transition()` ตรง (**ปิด DEBT-4, Phase 4, 2026-07-19** — เดิมเซ็ต `bk.status='rejected'` ตรงไม่ผ่าน gate เลย; ไม่เรียก `booking_service.reject_from_pending()` เพราะ notify คนละความหมาย — `notify_auto_rejected()` ไม่ใช่ `notify_rejected()`) |

สถานะย่อยของทริป (ไม่อยู่ใน `status`): `VehicleMileage.actual_start/actual_end` = กำลังเดินทาง/ปิดทริป → ปิดทริปจึงหักงบ. งบที่หักแล้ว**ไม่มีการคืนทุกกรณี** (REQ-2, Phase 3.5, 2026-07-19 — จารึก behavior เดิมเป็น spec ทางการ ดู [vehicle_product_spec.md](vehicle_product_spec.md) §9). **Phase 5 #15 (2026-06-12):** state machine กลางอยู่ใน `domain/vehicle/workflow.py` (ALLOWED_TRANSITIONS, guard_budget, apply_transition — ย้ายจาก `views/vehicle/vehicle_workflow.py` เดิม ใน Clean Architecture refactor Phase 1, 2026-07-19) — gaps จาก workflow review 2026-06-11 ปิดครบแล้ว

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

> **Phase 3, 2026-07-19:** flow ทั้งหมดข้างบน (จาก entry_type='end' เป็นต้นไป) รวมเป็นจุดเดียวแล้วที่ `services/vehicle/mileage_service.py::close_trip()` — เดิมกระจาย 3 จุด (`mileage_log()`/`driver_mileage()`/auto-close ทริปค้าง) เรียก logic เดียวกันซ้ำแยกกัน

⚠️ **ทุก mutation ต้องผ่าน `BudgetService`** (`services/vehicle/budget_service.py`) — ห้ามแก้ `VehicleBudget.used_amount` / `budget_amount` ตรงๆ
- 4 call sites: `mileage_log()`, `driver_mileage()`, `override_fuel()` (rededuct), `budget_manage()` POST (set_budget_amount)
- `vehicle_budget.used_amount` เป็น **cache** ของ `SUM(vehicle_budget_log.change_amount WHERE event_type != 'set_budget')` → verify ด้วย `BudgetService.verify_cache_integrity()`

---

## Notification Architecture (3 ช่องทาง)

> **Group broadcast dispatcher** (`core/broadcast.py`) รวม Telegram + LINE group ไว้ที่เดียว — import `notify_*` จาก `broadcast` (ไม่ใช่ `telegram_service` ตรงๆ) call site เดียวเด้งครบทั้ง 2 group channel. **Per-user DM** (LINE หา user รายคน) hook อยู่ใน `notification_service._create()` → mirror ทุก in-app event อัตโนมัติ
>
> **Phase 4, 2026-07-19:** flow ที่แตกเข้า service แล้ว (booking approve/reject/cancel, mileage OT) — ทั้ง in-app (`notification_service`) และ Telegram (`broadcast`) call site ย้ายจาก controller (`views/vehicle/*.py`) เข้า service function ท้ายสุด (หลัง guard/state-change, ก่อน commit ที่ controller ยังเป็นคนเรียก) แล้ว ไม่ใช่ controller เรียกตรงอีกต่อไปสำหรับ flow เหล่านี้ — flow ที่ยังไม่มี service รองรับ (merge, manual re-notify, ad-hoc booking) ยังเรียกจาก controller เหมือนเดิม

### 1. Telegram Bot
**Pattern:**
```python
delete_old_message(booking.telegram_message_id)
msg_id = _send(text)
booking.telegram_message_id = msg_id
db.session.commit()
```
ครอบคลุมเฉพาะ Vehicle (approved, forwarded, rejected, cancelled — Phase 9, 2026-05-22). เรียกผ่าน `broadcast.notify_*`

### 2. In-app Notification
**Pattern:**
```python
from views.core.notification_service import notify_*
notify_xxx(booking, ...)  # commit อยู่ใน _create()
```
ครอบคลุม Vehicle (Event #1-17) + Repair/Maintenance/Room (Event #18-24) + OT/Personal (#25-26) — 26+ functions; **Phase 5, 2026-06-12:** Repair (#18-20: created→admin / accepted,closed→owner) + Maintenance (#21-23: same pattern) + Room (#24: booked→owner) + Vehicle (#25: OT created→driver). **Phase 2b, 2026-06-15:** #25 เปลี่ยน recipient OT created→admin ทุกคน (ไม่ใช่ driver); #26 `notify_admin_personal_trip` (payment_admin/warning) — แจ้ง admin เมื่อปิดทริปส่วนตัว/ad-hoc; เรียกจาก `deduct_budget_for_trip()` ใน vehicle_common.py

> **Phase 2d, 2026-06-15 — Role-aware multi-recipient (in-app เท่านั้น, Telegram ไม่แตะ):** notify_* แต่ละ event แตกข้อความ **ตามบทบาทผู้รับ** (User/Admin/Approver/Driver) แล้วส่งหลายผู้รับใน 1 event. กลไกกลางอยู่ใน notification_service: `_emit(role_msgs)` (dict user_id→message, dedup) + resolver `_vehicle_admin_ids()`/`_booking_approver_ids()` (DeptApprover by dept)/`_booking_driver_uid()` (`Driver.linked_user`; ไม่มี account → `logger.warning`+skip) + `_pay_subtitle()`. **Approver + Driver ได้ in-app ครั้งแรก** (เดิม TG อย่างเดียว). **กฎ self-pay:** ย้าย OT ไป no_receipt → บรรทัด "ค่าล่วงเวลาสารถี" หายจากข้อความค่าเดินทางอัตโนมัติ (ผ่าน `_ot_total`+`_pay_subtitle`). **ไม่แตะ call site** — ทุกฟังก์ชันยังรับ `booking` เหมือนเดิม, ผู้รับ resolve ภายใน. Pattern นี้ทำงานคู่กับ Phase 2c feed (group by booking_id) → notification หลายบทบาทยุบเป็น 1 card/booking
>
> **Phase 2e, 2026-06-16 — Title freeze + subtitle เฉพาะ event (ข้อความเดียวทุก role):** เพิ่ม `Notification.title` (เก็บ title ตอนสร้าง แทน compute จาก `event_key` ตอน serialize) → `_create()`/`_emit()` รับ `title`; serializer `_notif_to_dict` ใช้ `n.title or _notif_title(n)` (fallback notif เก่า). 8 events (mileage start/end, forwarded, approver/admin approve, assigned, payment_required, budget_deducted, payment_confirmed) ปรับ title + subtitle ให้ชัดเจน (เลขไมล์/ทะเบียน/breakdown น้ำมัน-OT/ระยะทาง-ค่าใช้จ่าย); subtitle ตัด role-specific variant → ข้อความเดียวทุก recipient. `_budget_sub_label`/`_cost_lines` retired → `_pay_subtitle()`
Delivery: polled by `/api/notifications` + sticky for payment unpaid
Cron jobs (APScheduler, `notification_cron.init_scheduler()`):
- `check_payment_escalation()` — 08:00 BKK, personal payment overdue escalation
- `auto_reject_overdue_bookings()` — 08:10 BKK, reject pending/waiting_approver ที่เลยวันเดินทาง (Phase 2, 2026-06-12)

### 3. LINE Messaging API (2026-06-12 · flex 2026-06-18)
**Channel impl:** `core/line_service.py`
- plain text: `_push_group` / `_push_user` / `reply`
- **Flex Message (2026-06-18):** `_push_flex_group` / `_push_flex_user` / `reply_flex` — JSON bubble card (SCB-style)
- notify_* 5 ตัว ส่ง **Flex card** แทน plain text; ชื่อตรงกับ telegram_service (เรียกผ่าน broadcast.py)

**Group:** notify_* 5 ตัว เด้งเข้า `LINE_GROUP_ID` ผ่าน `broadcast.py` — ได้รับ Flex card
**Approver DM (2026-06-18):** `broadcast.notify_forwarded_to_approver` → เรียก `line_service.notify_approver_action_required_dm(booking)` → ส่ง Flex card + ปุ่ม **postback "อนุมัติ"** ไปหา approver รายคนที่ผูก LINE ไว้
**Postback approve (2026-06-18):** approver กดปุ่มใน LINE → `POST /line/webhook` event type=`postback` → `_approve_via_line()` ตรวจ (สิทธิ์ + สถานะ + deadline 1 วัน + budget) → approve → reply Flex card ยืนยัน. deadline = ต้องกดก่อน 1 วันก่อน start_datetime
**Per-user:** `_create()` ส่ง LINE DM plain text ให้ user ที่มี `User.line_user_id` (graceful skip ถ้า error)
**ผูกบัญชี** (`core/line_webhook.py`, blueprint `core_bp`): user เปิด `/line/link` → โค้ด 6 หลัก → พิมพ์ใน chat OA → webhook จับคู่ → set `line_user_id`
⚠️ webhook ต้อง public HTTPS reachable จาก LINE platform (dev: ngrok)
> **LINE Notify ตายแล้ว** (เม.ย. 2025) → ใช้ Messaging API (Official Account) เท่านั้น

---

## File Structure

```
bbcenter/
├── CLAUDE.md                    ← rules + reading strategy (auto-loaded)
├── app/
│   ├── app.py                   ← entry, register blueprints, init scheduler
│   ├── models/                  ← 27 tables แตกตาม domain (base/user/common/repair/
│   │                              maintenance/room/vehicle/vehicle_budget/vehicle_ot/
│   │                              vehicle_fuel) — __init__.py re-export ครบ
│   ├── ad_utils.py
│   ├── components/              ← UI component layer (base/table → macro bb_table_v2, 2026-06-29)
│   ├── domain/                  ← pure logic, ห้าม import flask (Clean Architecture, Phase 0-1, 2026-07-19)
│   │   └── vehicle/
│   │       ├── workflow.py      ← ALLOWED_TRANSITIONS/guard_budget/apply_transition (state machine กลาง)
│   │       └── fuel.py          ← calc_fuel_cost() (pure — get_fuel_price() ไม่ pure ย้ายไป services/ แล้ว)
│   ├── services/                ← use-case orchestration: guard → state change → notify (Phase 0-4, 2026-07-19)
│   │   └── vehicle/
│   │       ├── booking_service.py   ← approve/reject/cancel/revert/assign (gateway เดียวของ VehicleBooking.status)
│   │       ├── mileage_service.py   ← close_trip/auto_generate_ot/override_fuel_cost (gateway เดียวของ mileage flow)
│   │       └── budget_service.py    ← deduct/refund/top_up/manual_adjust (gateway เดียวของ VehicleBudget mutation)
│   ├── instance/portal.db       ← SQLite (gitignored)
│   ├── migrations/              ← manual .sql + migrations-index.md
│   ├── views/
│   │   ├── auth_view.py
│   │   ├── repair_view.py
│   │   ├── maintenance_view.py
│   │   ├── room_view.py
│   │   ├── core/               ← util ข้าม domain (ย้ายมา 2026-06-07)
│   │   │   ├── telegram_service.py
│   │   │   ├── line_service.py · broadcast.py · line_webhook.py  ← LINE + group dispatcher (2026-06-12)
│   │   │   ├── notification_service.py
│   │   │   └── notification_cron.py
│   │   └── vehicle/            ← vehicle domain controllers (ตัดจาก vehicle_view.py ขั้น 3, 2026-06-07)
│   │       ├── vehicle_common.py    ← blueprints(4) + shared constant/helper เท่านั้น (Phase 5, 2026-07-19:
│   │       │                          logic ทั้งหมดย้ายออกไป domain/services แล้ว ห้ามเพิ่ม logic ใหม่ที่นี่)
│   │       ├── vehicle_booking.py · vehicle_notification.py
│   │       ├── vehicle_admin.py · vehicle_mileage.py · vehicle_cost.py
│   │       ├── vehicle_budget.py · vehicle_driver.py    ← controllers ต่อ feature
│   │       └── vehicle_fuel.py      ← ย้ายจาก views/fuel_view.py เดิม (Phase 1, 2026-07-19 — fuel_bp ชื่อ/URL เดิม)
│   ├── templates/
│   │   ├── _shared/            ← partials กลาง (sidebar/header/navbar/notification_*) — ขั้น 4
│   │   ├── _components/        ← Jinja macros (_modal/kpi/badge/filter_bar/bb/ · render/ = components.py render layer)
│   │   ├── auth/, dashboard/, repair/, maintenance/, usermng/
│   │   ├── room/ + room/modals/room_*.html
│   │   └── vehicle/
│   │       ├── modals/vehicle_*.html (5 modals)    ← ขั้น 4
│   │       ├── admin/ (pages) + admin/modals/fuel_*.html
│   │       └── driver_home.html
│   └── static/                  ← asset แยกตาม domain (ขั้น 5, 2026-06-07)
│       ├── core/                ← shared ข้าม domain
│       │   ├── css/design-system.css (--vc-* tokens) · tokens · main · util · vercel · notification · components/*
│       │   └── js/{icons,format,http,main,notification}.js   ← shared ES modules
│       ├── vehicle/            ← css/vehicle_*.css + js/vehicle_*.js (prefix หน้าที่)
│       ├── repair/ · room/ · maintenance/ · dashboard/   ← css/<domain>.css + js/<domain>.js
│       ├── images/ (shared: icons/calendar-add.png, favicon, img-01) · fonts/
│       ├── uploads/{repair,maintenance,mileage}/
│       └── vendor/
└── docs/
    ├── design/                  ← wireframes, prototypes
    ├── mockups/                 ← canonical mockups
    └── notes/
        ├── INDEX.md             ← symbol/route lookup (Claude entry)
        ├── architecture.md      ← ไฟล์นี้
        ├── design_guideline.md  ← canonical design (อ่านก่อนแตะ UI)
        ├── future_features.md
        ├── task-lifecycle.md    ← template + สรุป/จบงาน flow
        ├── CHANGELOG.md         ← ประวัติ phase (ย้ายจากหัว INDEX/CLAUDE)
        ├── database/
        │   └── schema.md        ← Part 1 ปัจจุบัน + Part 2 history
        ├── doc/                 ← completed tasks
        ├── log/                 ← in-progress
        └── skills/
```

---

## Configuration (.env)

config ทั้งหมดอ่านจาก `app/.env` (gitignored) ผ่าน `python-dotenv` — template อยู่ที่ `app/.env.example` (commit ได้, ไม่มีค่าจริง)

| Key | จำเป็น | ใช้ที่ | หมายเหตุ |
|-----|--------|--------|----------|
| `FLASK_SECRET_KEY` | ✅ **fail-fast** | `app.py` | ไม่มี → `raise RuntimeError` (แอปไม่ boot) — ห้าม fallback ค่า default อีก |
| `FLASK_DEBUG` | — | `app.py` | `1`=เปิด (dev), `0`/ไม่ตั้ง=ปิด (prod) |
| `AD_SERVER` / `AD_DOMAIN` / `SEARCH_BASE` | ✅ | `ad_utils.py` | LDAP auth |
| `DEV_BYPASS` | — | `auth_view.py` | `1`=เปิด `/dev/login/<user>` (ห้าม prod) |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_GROUP_CHAT_ID` | — | `telegram_service.py` | ไม่มี → ข้าม notify เงียบๆ (graceful skip). **ถ้ารั่วต้อง revoke ผ่าน BotFather** |
| `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET` / `LINE_GROUP_ID` | — | `line_service.py` · `line_webhook.py` | ไม่มี → ข้าม LINE notify เงียบๆ. secret ใช้ verify webhook signature. **ถ้ารั่วต้อง reissue ใน LINE Developers Console** |

⚠️ ห้าม hardcode secret ใน source — ทุกค่าผ่าน `os.getenv()` เท่านั้น

**Secret guard (pre-commit hook):** `tools/git-hooks/pre-commit` บล็อก commit ถ้าเจอ secret pattern (Telegram token / hardcoded SECRET_KEY / credential) หรือเผลอ stage ไฟล์ `.env`
- เปิดใช้ครั้งเดียวต่อ clone: `git config core.hooksPath tools/git-hooks`
- ข้ามกรณีฉุกเฉิน: `git commit --no-verify`

---

## Testing

pytest + in-memory SQLite — รัน: `.venv/bin/python -m pytest` (deps: `requirements-dev.txt`)

**อัปเดต Phase 6, 2026-07-19** — Clean Architecture refactor (Phase 0-5) ขยาย test suite จาก 1 ไฟล์/13 case เป็น 8 ไฟล์/97 case (path เดิมของตารางนี้ก็ชี้ผิดไปแล้วด้วย — `vehicle_budget_service.py` ไม่มีอยู่จริงตั้งแต่ Phase 1):

| ไฟล์ | คลุม | case |
|------|------|------|
| `tests/conftest.py` | fixtures: in-memory DB + request context (current_user=anonymous) + factory `make_budget`/`make_mileage`; route-level fixtures `route_app`/`client`/`login` (StaticPool SQLite, monkeypatch telegram `_send`) |
| `tests/test_budget_service.py` | `services/vehicle/budget_service.py` — deduct(+idempotency), refund(+no-double), rededuct, set_budget, manual_adjust, set_active, verify_cache_integrity + invariant `used_amount == SUM(log≠set_budget)` | 13 |
| `tests/test_booking_service.py` | `services/vehicle/booking_service.py` (Phase 2) — approve(central/dept/personal+budget/conflict guard)/reject/approver approve-reject/cancel(guard+role+un-merge)/revert/assign_resources/ungroup + Phase 4 notify consolidation (notify=True/False lock) | 31 |
| `tests/test_mileage_service.py` | `services/vehicle/mileage_service.py` (Phase 3) — close_trip(+idempotency)/auto_generate_ot(+notify flag, Phase 5)/override_fuel_cost/get_fuel_price/get_distance_cap_km | 15 |
| `tests/test_booking_workflow.py` | `domain/vehicle/workflow.py` state machine (ALLOWED_TRANSITIONS/apply_transition, unit) + `admin_assign()` route-level (central/personal/reject) | 13 |
| `tests/test_booking_cancel_guards.py` | route-level guard: owner/admin cancel ตาม status, delete, revert, `budget_manage` action `cancel_booking` | 11 |
| `tests/test_auto_reject_cron.py` | `notification_cron.auto_reject_overdue_bookings()` — auto-reject เลยกำหนด + idempotent (ปิด DEBT-4, Phase 4) | 6 |
| `tests/test_stale_mileage_cron.py` | `notification_cron.check_stale_mileage()` (REQ-3, Phase 3.5) — เตือน driver งานค้างข้ามวัน | 5 |
| `tests/test_mileage_distance_cap.py` | REQ-3 (Phase 3.5) validation เพดานระยะทาง — block/confirm-bypass | 3 |

config: `pytest.ini` (`pythonpath=app`, `testpaths=tests`)

> เพิ่ม service/view ใหม่ที่แตะเงิน/สถานะ ควรเพิ่ม test คู่กัน (ตาม pattern ไฟล์ข้างบน)

---

## ⚙️ Maintenance Protocol

**เมื่อ architecture เปลี่ยน ไฟล์นี้ต้อง sync:**
- เพิ่ม/ลบ blueprint → Blueprints table
- เปลี่ยน auth flow → Layer 2
- เปลี่ยน notification pattern → Notification Architecture
- เพิ่ม external service → Layer 5
- เพิ่ม/เปลี่ยน env var → Configuration (.env) table
- เปลี่ยนโครงสร้าง folder → File Structure

**ไม่ต้อง sync ที่นี่ (ไปที่ INDEX.md แทน):**
- เพิ่ม route ใหม่ในบล็อกเดิม
- เพิ่ม function helper
- เพิ่ม template
