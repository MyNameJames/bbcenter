# BBCenter V2 — Project Rules

> **อัปเดตล่าสุด:** 2026-04-25

## 📖 Reading Strategy

1. CLAUDE.md (ไฟล์นี้) — โหลดอัตโนมัติ
2. [INDEX.md](docs/notes/INDEX.md) — เปิดเมื่อต้องหา route/symbol/template
3. Deep-dive — อ่านเฉพาะไฟล์ที่ INDEX ชี้ไป

**ห้าม glob/grep หา function/route ก่อน** — เปิด INDEX.md ก่อน ถ้าไม่มี = INDEX outdated → อัปเดตหลังค้นเจอ

**Entry docs (เปิดเฉพาะที่จำเป็น):**
- Routes/symbols/models/templates/CSS-JS → [INDEX.md](docs/notes/INDEX.md)
- DB schema + history → [schema.md](docs/notes/database/schema.md) (Part 1=ปัจจุบัน, Part 2=history+เหตุผล)
- Migration .sql → [migrations-index.md](app/migrations/migrations-index.md)
- System flows → [architecture.md](docs/notes/architecture.md)
- Task lifecycle (template, สรุปงาน, จบงาน) → [task-lifecycle.md](docs/notes/task-lifecycle.md)
- Design detail → [design_system.md](docs/notes/design_system.md)
- Pending features → [future_features.md](docs/notes/future_features.md)
- Token budget check → `bash tools/doc-stats.sh`

---

## ⚙️ Maintenance Protocol — สำคัญที่สุด

**แก้ code/structure → ต้อง sync เอกสาร** ก่อน mark task เสร็จ

| เมื่อแก้ | ต้องอัปเดต |
|---|---|
| route ใหม่ | INDEX.md § Routes |
| function สำคัญ | INDEX.md § Key Functions |
| model/column | schema.md (Part 1 ตาราง + Part 2 เหตุผล) + INDEX.md § Database Models |
| SQL migration | `app/migrations/YYYY-MM-DD_<slug>.sql` + `app/migrations/migrations-index.md` + schema.md Part 2 |
| blueprint | INDEX.md § Blueprints + architecture.md |
| template | INDEX.md § Templates |
| CSS/JS file | INDEX.md § Design System |
| auth/notification pattern | architecture.md |
| folder ระดับโครงสร้าง | INDEX.md § File Map + architecture.md |
| doc โต / โครงสร้าง doc เปลี่ยน | run `bash tools/doc-stats.sh` ถ้าเกิน budget → split section ที่โตที่สุด |

**Rule:** แก้ code แต่ไม่ sync เอกสาร = ยังไม่เสร็จ

---

## AI Rules

1. ไม่แน่ใจ 95% → ถามก่อน อย่าเดาแล้ว implement ยาว
2. หาสาเหตุจริง ไม่ใช่แก้อาการ
3. ทำเฉพาะที่ขอ ไม่ over-engineer
4. ก่อนรัน bash/click browser → แจ้ง+confirm; ไม่รู้ชื่อไฟล์ → ถาม อย่า glob/grep เอง
5. คำสั่ง "ไว้เป็น future feature" → เพิ่มใน [future_features.md](docs/notes/future_features.md) ทันที (ไม่ implement)
6. ก่อน mark เสร็จ → ตรวจ Maintenance Protocol
7. **Scoped Command Template** — ทุก request ที่ขอแก้/เพิ่ม code ต้องมีครบ 5 field นี้ก่อนลงมือ:
   ```
   [ไฟล์]: path ของไฟล์ที่แก้
   [ตำแหน่ง]: บรรทัด หรือ CSS selector / block ที่แก้
   [งาน]: สิ่งที่ต้องทำ
   [ข้อจำกัด]: constraint (เช่น no shadow, ใช้ design tokens)
   [output]: รูปแบบคำตอบที่ต้องการ
   ```
   ถ้า field ใดขาด → ถามทีละ field จนครบ แล้วค่อยลงมือทำ

---

## Stack (Quick Ref)

Flask · SQLite + SQLAlchemy · LDAP auth · Jinja2 + Bootstrap 5 · Telegram + in-app + APScheduler notify · `--ds-*` design tokens

รายละเอียด → [architecture.md](docs/notes/architecture.md)

---

## Gotchas — สิ่งที่ลืมบ่อย

**Business logic**
- Budget mutation: ห้ามแก้ `VehicleBudget.used_amount` / `budget_amount` ตรงๆ — ทุก mutation ต้องผ่าน `app/services/budget_service.py` (เพื่อ ledger + idempotency)
  - **Deduct/override** 4 call sites: `mileage_log()`, `driver_mileage()`, `override_fuel()`, `budget_manage()` POST
  - **Refund** (`refund_for_booking()`) 4 call sites: `delete_booking()` (ก่อน cascade), `approve_booking()` admin reject + approver reject, `admin_assign()` reject
- Mileage formula: `fuel_cost = (distance / vehicle.fuel_rate) * fuel_price` (override ถ้า `mileage.fuel_cost` มีค่า)
- `is_vehicle_admin()` = `role_vehicle=='admin' OR is_superadmin`; approver เห็นเฉพาะแผนกตัวเอง
- ห้ามจองข้ามวัน — validate ใน `book_vehicle_simple()` ([vehicle_view.py:83](app/views/vehicle_view.py#L83))
- Thai time: `get_bkk_time()` = UTC+7 ([models.py:8](app/models.py#L8))

**DB**
- ไม่มี migration tool → `db.create_all()` (ตารางใหม่) / ALTER manual ผ่าน `.sql`
- `EXPENSE_CATEGORIES` ต้น vehicle_view.py — แก้ที่เดียวอัปเดต dropdown
- `snap_*` ใน vehicle_booking — ป้องกันข้อมูลหายเมื่อแก้ master

**Misc**
- Session: 8 ชั่วโมง · Upload: `app/static/uploads/{repair|maintenance|mileage}/`

**Telegram pattern**
```python
delete_old_message(booking.telegram_message_id)
msg_id = _send(text)
booking.telegram_message_id = msg_id; db.session.commit()
```

**In-app notify:** `from views.notification_service import notify_*` — commit ทำใน `_create()`

---

## Design Quick Rules

- Vercel-inspired light, accent `#4F46E5`
- **No shadow** → ใช้ border (`var(--ds-border)` = `#E4E4E7`)
- Radius 4–6px
- Icons: Font Awesome (`fa-solid` นำหน้าทุก field เทคนิค)
- **No `border-left/top` สีพิเศษ** บน card/KPI (ดู AI-generated)
- Vehicle modal: ไฟล์แยกใน `vehicle-modal-*.html`, **ห้ามมี inline `<script>`** — JS อยู่ใน vehicle.js

รายละเอียด → [design_system.md](docs/notes/design_system.md)

---

## 🤖 Subagents — Claude spawn เองตามเงื่อนไข

| Agent | Spawn เมื่อ |
|---|---|
| `checker` | หลังแก้ code ก่อน `จบงาน` — verify Maintenance Protocol |
| `db-helper` | ก่อนแก้ `models.py` — gen migration + sync DB docs |
| `guide-vehicle` | หา symbol ใน `vehicle_view.py` (~1900 lines) — return `file:line` แทนโหลดเต็ม |
<!-- | `notifee` | แก้ booking/approve/mileage/budget — audit `notify_*` + Telegram pattern | -->

ถ้า INDEX.md ตอบได้แล้ว → ไม่ต้อง spawn `guide-vehicle`. Subagent ไม่เห็น conversation — prompt ต้องครบ

---

## Test Credentials (Dev Only)

`pjatuporn` / `Animajamelove072` (admin) · Bypass: `http://localhost:5001/dev/login/pjatuporn`
