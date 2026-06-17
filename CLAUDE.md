# BBCenter V2 — Project Rules

> **อัปเดตล่าสุด:** 2026-06-17 · ประวัติ phase/changelog ทั้งหมด → [CHANGELOG.md](docs/notes/CHANGELOG.md)

## 📖 Reading Strategy

1. CLAUDE.md (ไฟล์นี้) — โหลดอัตโนมัติ
2. [INDEX.md](docs/notes/INDEX.md) — เปิดเมื่อต้องหา route/symbol/template
3. Deep-dive — อ่านเฉพาะไฟล์ที่ INDEX ชี้ไป

**ห้าม glob/grep หา function/route ก่อน** — เปิด INDEX.md ก่อน ถ้าไม่มี = INDEX outdated → อัปเดตหลังค้นเจอ

**Entry docs (เปิดเฉพาะที่จำเป็น):**
- Nav hub (blueprints + file map) → [INDEX.md](docs/notes/INDEX.md)
- Routes ทุก path → [INDEX_routes.md](docs/notes/INDEX_routes.md)
- Functions + DB models → [INDEX_code.md](docs/notes/INDEX_code.md)
- Templates + Design System → [INDEX_ui.md](docs/notes/INDEX_ui.md)
- DB schema + history → [schema.md](docs/notes/database/schema.md) (Part 1=ปัจจุบัน, Part 2=history+เหตุผล)
- Migration .sql → [migrations-index.md](app/migrations/migrations-index.md)
- System flows → [architecture.md](docs/notes/architecture.md)
- Task lifecycle (template, สรุปงาน, จบงาน) → [task-lifecycle.md](docs/notes/task-lifecycle.md)
- Design detail → [design_system.md](docs/notes/design_system.md)
- DNA redesign 2026-06-17 (migration spec + component cookbook) → [design_dna_redesign.md](docs/notes/design_dna_redesign.md)
- Pending features → [future_features.md](docs/notes/future_features.md)
- Token budget check → `bash tools/doc-stats.sh`

---

## ⚙️ Maintenance Protocol — สำคัญที่สุด

**แก้ code/structure → ต้อง sync เอกสาร** ก่อน mark task เสร็จ

| เมื่อแก้ | ต้องอัปเดต |
|---|---|
| route ใหม่ | INDEX_routes.md |
| function สำคัญ | INDEX_code.md § Key Functions |
| model/column | schema.md (Part 1 ตาราง + Part 2 เหตุผล) + INDEX_code.md § Database Models |
| SQL migration | `app/migrations/YYYY-MM-DD_<slug>.sql` + `app/migrations/migrations-index.md` + schema.md Part 2 |
| blueprint | INDEX.md § Blueprints + architecture.md |
| template | INDEX_ui.md § Templates |
| CSS/JS file | INDEX_ui.md § Design System |
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

## 🧹 Clean Code Rules — บังคับทุก function ใหม่

กฎเหล่านี้ **บังคับใช้ทันที** เมื่อเขียน/แก้ code — ไม่ต้องรอให้ผู้ใช้สั่ง

### ❌ ห้ามเด็ดขาด

| ห้าม | ทำแทนด้วย |
|------|----------|
| `print(...)` ทุกกรณี | `current_app.logger.exception/warning/info()` (ใน Flask context) · `logging.getLogger(__name__)` (service module) |
| `import X` กลางฟังก์ชัน | ย้ายขึ้น top-of-file เสมอ |
| Copy import block จากไฟล์อื่น | import เฉพาะที่ไฟล์นี้ใช้จริง |
| `flash(str(e), 'danger')` | `logger.exception(...)` + `flash('เกิดข้อผิดพลาด กรุณาลองใหม่', 'danger')` |
| Formula/pattern เดิม copy ครั้งที่ 3 | extract helper ใน `vehicle_common.py` ก่อนเขียนซ้ำ |
| [DEBUG ...] หรือ debug comment ค้างใน code | ลบก่อน mark เสร็จ |

### ✅ Function ใหม่ทุกตัว — checklist ก่อน submit

```
[ ] ≤ 60 บรรทัด (นับเฉพาะ logic, ไม่นับ docstring)
    — ถ้าเกิน: แตก helper หรืออธิบายว่าทำไมจำเป็น
[ ] ทำงานอย่างเดียว (Single Responsibility)
    — ถ้ามี POST action หลาย branch → แตกฟังก์ชันต่อ action
[ ] ชื่อสื่อ verb+noun: `_calc_fuel_cost()`, `_lookup_budget()`, ไม่ใช่ `process()` / `handle()`
[ ] import เฉพาะที่ใช้ — ห้าม copy import block ยาว
[ ] error: `logger.exception()` → flash generic → return/redirect
[ ] ไม่มี magic number → ใช้ constant หรือ config
```

### กฎ DRY — ตรวจก่อนเขียน

1. ก่อนเขียน formula ค่าใช้จ่าย/คำนวณ → เช็ก `vehicle_common.py` ว่ามี helper แล้วหรือยัง
2. Fuel cost formula — **ห้าม inline** ใช้ `calc_fuel_cost(vehicle, distance, fuel_price, override=None)` จาก `vehicle_common.py` (extracted 2026-06-12)
3. FuelPrice fallback — **ห้าม inline** ใช้ `get_fuel_price(on_date)` จาก `vehicle_common.py` (extracted 2026-06-12)

### Logger pattern ตาม context

```python
# ใน Flask route / service ที่เรียกจาก route (current_app ใช้ได้)
current_app.logger.exception('route_name failed')   # error + traceback
current_app.logger.warning('ข้อความ %s', var)        # warning ไม่มี traceback

# ใน module-level service (telegram_service, line_service, broadcast)
_log = logging.getLogger(__name__)   # บรรทัดแรกของไฟล์ หลัง import
_log.exception('send error')
_log.warning('config missing: %s', key)
```

---

## Stack (Quick Ref)

Flask · SQLite + SQLAlchemy · LDAP auth · Jinja2 + Bootstrap 5 · Telegram + in-app + APScheduler notify · `--vc-*` design tokens (canonical) — `--ds-*` **retired** (Phase 5.1, 2026-05-16): ลบครบแล้ว ห้ามเพิ่มใหม่เด็ดขาด

รายละเอียด → [architecture.md](docs/notes/architecture.md)

---

## Gotchas — สิ่งที่ลืมบ่อย

**Business logic**
- Budget mutation: ห้ามแก้ `VehicleBudget.used_amount` / `budget_amount` / `is_active` ตรงๆ — ทุก mutation ต้องผ่าน `app/views/vehicle/vehicle_budget_service.py` (vehicle domain service — ย้ายจาก `services/` 2026-06-07; core = util ข้าม domain เท่านั้น เพื่อ ledger + idempotency)
  - **Deduct/override** 4 call sites: `mileage_log()`, `driver_mileage()`, `override_fuel()`, `budget_manage()` POST
  - **Refund** — `refund_for_booking()` ถูกลบออกแล้ว (Phase 1, 2026-06-12) เพราะงบหักที่ mileage ไม่ใช่ approve; admin ยกเลิก approved booking ผ่าน `budget_manage` action `cancel_booking` เท่านั้น
  - **`set_active(budget, active)`** (2026-05-18) — toggle ปิด/เปิดใช้งาน → log `set_active`/`set_inactive`; `is_active=False` block `approve_booking` (admin + approver paths ผ่าน `_lookup_budget_for_booking()`) + `top_up` + `manual_adjust`; ไม่ block mileage deduct/refund (booking เก่าปิดทริปได้); KPI sum filter `is_active=True`
- **งบช่วงเวลา (active period, 2026-06-06):** การหางบ "เลิกใช้ year/month" — `_lookup_budget_for_booking(booking, on_date=None)` หางบ `is_active=True AND start_date <= on_date <= end_date` (default on_date = วันเริ่ม booking; ตอนหักงบส่งวันปิดทริป). overlap → start_date ล่าสุด. ใช้ร่วม approve + 3 จุดหักงบ (mileage_log/driver_mileage/override_fuel). `approve_booking` block ถ้าคืน `None`. `budget_manage` แยกงบ active-for-month vs `archived_budgets` (section "คลังงบ") + action `extend_period` (ตั้ง start–end ใหม่ + เปิด is_active). `year`/`month` = anchor (UniqueConstraint + set_budget); pivot×เดือน ดึงจาก `vehicle_budget_log.created_at`
- Mileage formula: `fuel_cost = (distance / vehicle.fuel_rate) * fuel_price` (override ถ้า `mileage.fuel_cost` มีค่า)
- Fuel reserve depletion (2026-05-18): `_depletes_reserve(method)` = `method == 'transfer'` (เงินสด เบิกจากกองกลาง) **เท่านั้น** — `card`=บัตรส่วนกลาง, `self`=ผู้โดยสารจ่ายเอง (เก็บประวัติ ไม่หัก reserve). กระทบ `reserve_used` + `balance_after` ใน admin_fuel.html
- `is_vehicle_admin()` = `role_vehicle=='admin' OR is_superadmin`; approver เห็นเฉพาะแผนกตัวเอง
- ห้ามจองข้ามวัน — validate ใน `book_vehicle_simple()` ([views/vehicle/vehicle_booking.py](app/views/vehicle/vehicle_booking.py))
- Thai time: `get_bkk_time()` = UTC+7, คืน naive datetime ([models/base.py:9](app/models/base.py#L9))
- **models เป็น package แล้ว (2026-06-07):** `models.py` แตกเป็น `models/` ตาม domain (base/user/common/repair/maintenance/room/vehicle/vehicle_budget/vehicle_ot/vehicle_fuel). `db` + `get_bkk_time` อยู่ `base.py`; `__init__.py` re-export ครบ → `from models import X` เดิมใช้ได้ทุกตัว แก้/เพิ่ม model → ไปไฟล์ domain ที่ตรง แล้วเพิ่มชื่อใน `__init__.py __all__`

**DB**
- ไม่มี migration tool → `db.create_all()` (ตารางใหม่) / ALTER manual ผ่าน `.sql`
- `EXPENSE_CATEGORIES` ใน `views/vehicle/vehicle_common.py` — แก้ที่เดียวอัปเดต dropdown
- `snap_*` ใน vehicle_booking — ป้องกันข้อมูลหายเมื่อแก้ master

**Misc**
- Session: 8 ชั่วโมง · Upload: `app/static/uploads/{repair|maintenance|mileage}/`

**Telegram pattern**
```python
delete_old_message(booking.telegram_message_id)
msg_id = _send(text)
booking.telegram_message_id = msg_id; db.session.commit()
```

**In-app notify:** `from views.core.notification_service import notify_*` — commit ทำใน `_create()`

---

## Flask Response Pattern

**Regular form POST** → `flash(msg, category)` + `redirect(url_for(...))`

**AJAX/fetch request** → `jsonify({'ok': True, 'msg': '...'})` (200) หรือ `jsonify({'ok': False, 'msg': '...'})` (400/403/404)

**Error handling ใน route:**
```python
except Exception:
    current_app.logger.exception('<route_name> failed')
    flash('เกิดข้อผิดพลาด กรุณาลองใหม่', 'danger')
    return redirect(url_for(...))
```

**JS ฝั่ง client:**
```javascript
const res  = await fetch(url, { method: 'POST', body: fd });
const data = await res.json();
if (!res.ok || !data.ok) { showToast(data.msg, 'danger'); return; }
// patch UI
```
ห้าม patch UI ก่อนเช็ก `res.ok` + `data.ok` — เดิมเคย patch ทันทีแล้ว UI โชว์สถานะปลอมเมื่อ server ตอบ 400

---

## Naming Conventions

**Blueprint:** `<domain>_bp` → ลงทะเบียนใน `app.py` ด้วย prefix `/vehicle`, `/room`, ฯลฯ

**View function:** `<action>_<noun>` (เช่น `book_vehicle_simple`, `cancel_booking`) หรือ `admin_<noun>` สำหรับ admin-only route

**Template:** `templates/<domain>/` + `templates/<domain>/admin/` + `templates/<domain>/modals/` — ชื่อไฟล์ใช้ `vehicle_<name>.html` ไม่ใช่ `<name>_vehicle.html`

**Static:** `static/<domain>/css/<domain>_<page>.css`, `static/<domain>/js/<domain>_<page>.js`

**Model:** PascalCase ตาม domain (เช่น `VehicleBooking`, `VehicleBudget`) — ไฟล์อยู่ใน `models/<domain>.py`

---

## Design Quick Rules

- Light, primary + accent `#4059e6` (indigo, 2026-06-17 redesign; เดิม `#014198`/`#0046FF`/navy) · text = navy `#162334` (`--vc-fg`)
- **No shadow** (ยกเว้น modal) → ใช้ border (`var(--vc-border)` = `#f0f0f0`)
- Radius 6px (`--vc-radius-sm`, = bootstrap `rounded-2`)
- **ตัวเลข = Manrope** (ผ่าน `.vc-mono` / `--vc-font-mono`) · ข้อความไทย = Sarabun · icon monochrome `#9999b0` (`--vc-icon`) บนวงกลม/tile `#f0f0f0` (`--vc-icon-bg`)
- Icons: Font Awesome (`fa-solid` นำหน้าทุก field เทคนิค)
- **No `border-left/top` สีพิเศษ** บน card/KPI (ดู AI-generated)
- Vehicle modal: ไฟล์แยกใน `vehicle/modals/vehicle_*.html` (ขั้น 4, 2026-06-07; เดิม `vehicle-modal-*.html`), **ห้ามมี inline `<script>`** — JS อยู่ใน vehicle.js · partials กลางอยู่ `templates/_shared/` · macro อยู่ `templates/_components/`

รายละเอียด → [design_system.md](docs/notes/design_system.md)

---

## 🤖 Subagents — Claude spawn เองตามเงื่อนไข

| Agent | Spawn เมื่อ |
|---|---|
| `checker` | หลังแก้ code ก่อน `จบงาน` — verify Maintenance Protocol |
| `db-helper` | ก่อนแก้ `models/` (เดิม `models.py`) — gen migration + sync DB docs |
| `guide-vehicle` | หา symbol ใน `views/vehicle/` controllers (ตัดจาก vehicle_view.py ขั้น 3 — แต่ละไฟล์ 200-700 LOC). หา controller จาก [INDEX §Blueprints](docs/notes/INDEX.md#-blueprints) mapping ก่อน; spawn เมื่อต้องเจาะไฟล์ใหญ่ (notification/budget/admin) |

ถ้า INDEX.md ตอบได้แล้ว → ไม่ต้อง spawn `guide-vehicle`. Subagent ไม่เห็น conversation — prompt ต้องครบ

---

## Test Credentials (Dev Only)

`pjatuporn` / `Animajamelove072` (admin) · Bypass: `http://localhost:5001/dev/login/pjatuporn`
