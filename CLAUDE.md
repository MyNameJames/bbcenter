# BBCenter V2 — Project Rules

> **อัปเดตล่าสุด:** 2026-06-28 · ประวัติ phase/changelog ทั้งหมด → [CHANGELOG.md](docs/notes/CHANGELOG.md)

## 📖 Reading Strategy

1. CLAUDE.md (ไฟล์นี้) — โหลดอัตโนมัติ
2. [INDEX.md](docs/notes/INDEX.md) — เปิดเมื่อต้องหา route/symbol/template
3. Deep-dive — อ่านเฉพาะไฟล์ที่ INDEX ชี้ไป

**ห้าม glob/grep หา function/route ก่อน** — เปิด INDEX.md ก่อน ถ้าไม่มี = INDEX outdated → อัปเดตหลังค้นเจอ

**🚦 Vehicle domain — บังคับ:** ก่อนสร้าง/เพิ่ม/แก้ function หรือทำความเข้าใจระบบ vehicle → **อ่าน [vehicle_product_spec.md](docs/notes/vehicle_product_spec.md) ก่อนเสมอ** (North Star: "ระบบบริหารทรัพยากรยานพาหนะ" ไม่ใช่ booking self-service · demand > availability · ห้ามทำลายข้อมูล demand) — ฝ่าฝืน = เสี่ยง scope drift ผิดเจตนา product

**🎨 Design — บังคับ:** ก่อนออกแบบ/แก้ UI · CSS · template ใดๆ → **อ่าน [design_guideline.md](docs/notes/design_guideline.md) ก่อนเสมอ** (canonical เดียว · ของเก่า design_system/dna/zendenta = ลบแล้ว 2026-06-28). **v2.1 (2026-07-21) "ink คือโครง เขียวคือสัญญาณ"** — ฐาน monochrome: **ปุ่มหลัก/active/text = ink `#000000`** · เขียวโผล่แค่ 2 จุด: **พื้น tint `#EAFBF2`** + **ลิงก์/ghost `#0B7A3E`** (`#06C167` = fill ชิ้นเล็กเท่านั้น 2.38:1) · Sarabun+Inter · **px** · เงาดำ · radius binary `8`/`pill` · weight เพดาน 800 · `:root` อยู่ที่ `components.css` ที่เดียว. หน้าเก่าที่ยังไม่ migrate → drift ledger = **guideline §14**; migrate **ทีละหน้า ไม่มี deadline**

**🧩 Component — บังคับ:** ก่อนใช้/เลือก UI component (Python wrapper รอบ macro) → **อ่าน [CHEATSHEET.md](app/components/CHEATSHEET.md) ก่อนเสมอ** (ประตูเดียว · signature + ตัวอย่าง copy-paste 28 export). **ห้าม glob/grep `app/components/`** — เปิด cheatsheet หา component → ถ้าไม่มี = ยังไม่ทำ. gallery มองด้วยตา → `/dev/components`

**🏛️ Architecture — บังคับ:** ก่อนเพิ่ม/แก้ logic ที่แตะ **เงิน/สถานะ** (approve/reject/cancel/deduct/หักงบ ฯลฯ) → **อ่าน [ADR 0001](docs/notes/adr/0001-clean-architecture-layers.md) ก่อนเสมอ** (Clean Architecture layering, 2026-07-19). กฎ: `domain/<domain>/` = pure logic ห้าม import flask · `services/<domain>/` = orchestrate (query+commit+notify หลัง commit) · `views/` = parse→service→flash/redirect ผอม. **logic แตะเงิน/สถานะห้ามเขียนใน controller** — ไปที่ service · ทุก status transition ผ่าน `domain/vehicle/workflow.py::apply_transition` เท่านั้น. หน้า **อ่าน/แสดงล้วน** query model ตรงใน controller ได้ ไม่ต้องผ่าน service (เกณฑ์เต็ม → [page_pattern.md](docs/notes/page_pattern.md))

**Entry docs (เปิดเฉพาะที่จำเป็น):**
- 🚦 Vehicle product North Star (อ่านก่อนแตะ vehicle) → [vehicle_product_spec.md](docs/notes/vehicle_product_spec.md)
- Nav hub (blueprints + file map) → [INDEX.md](docs/notes/INDEX.md)
- Routes ทุก path → [INDEX_routes.md](docs/notes/INDEX_routes.md)
- Functions + DB models → [INDEX_code.md](docs/notes/INDEX_code.md)
- Templates + Design System → [INDEX_ui.md](docs/notes/INDEX_ui.md) — ประวัติย้อนหลังแยกไป [INDEX_ui_history.md](docs/notes/INDEX_ui_history.md) (เปิดเฉพาะตอนต้องรู้เหตุผลย้อนหลัง)
- DB schema + history → [schema.md](docs/notes/database/schema.md) (Part 1=ปัจจุบัน, Part 2=history+เหตุผล)
- Migration .sql → [migrations-index.md](app/migrations/migrations-index.md)
- System flows → [architecture.md](docs/notes/architecture.md)
- Task lifecycle (template, สรุปงาน, จบงาน) → [task-lifecycle.md](docs/notes/task-lifecycle.md)
- 🏛️ **Architecture layering / ADR (อ่านก่อนแตะ logic เงิน/สถานะ — domain/service/view)** → [ADR 0001](docs/notes/adr/0001-clean-architecture-layers.md)
- 🧱 **Page Pattern (อ่านก่อนเขียนหน้าใหม่ — โครง model→controller→component→jinja)** → [page_pattern.md](docs/notes/page_pattern.md)
- 🎨 **Design Guideline (อ่านก่อนแตะ UI/CSS/template ทุกครั้ง — canonical)** → [design_guideline.md](docs/notes/design_guideline.md)
- Design legacy เก่า (design_system / design_dna_redesign / zendenta_migration) = **ลบแล้ว 2026-06-28** → guideline เป็น canonical เดียว
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
| component ใหม่/แก้ signature (`app/components/`) | `app/components/CHEATSHEET.md` (signature + ตัวอย่าง) + เพิ่ม section ใน `/dev/components` gallery |
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
   - งาน vehicle: ก่อนลงมือ → อ่าน [vehicle_product_spec.md](docs/notes/vehicle_product_spec.md) เช็ก North Star + anti-patterns (§8) ก่อนเสมอ
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

รายละเอียด → [architecture.md](docs/notes/architecture.md)

---

## Gotchas — สิ่งที่ลืมบ่อย

- Thai time: `get_bkk_time()` = UTC+7, คืน naive datetime ([models/base.py:9](app/models/base.py#L9))
- **models เป็น package แล้ว (2026-06-07):** `models.py` แตกเป็น `models/` ตาม domain (base/user/common/repair/maintenance/room/vehicle/vehicle_budget/vehicle_ot/vehicle_fuel). `db` + `get_bkk_time` อยู่ `base.py`; `__init__.py` re-export ครบ → `from models import X` เดิมใช้ได้ทุกตัว แก้/เพิ่ม model → ไปไฟล์ domain ที่ตรง แล้วเพิ่มชื่อใน `__init__.py __all__`

**DB**
- ไม่มี migration tool → `db.create_all()` (ตารางใหม่) / ALTER manual ผ่าน `.sql`

**Misc**
- Session: 8 ชั่วโมง · Upload: `app/static/uploads/{repair|maintenance|mileage}/`

**Telegram pattern**
```python
delete_old_message(booking.telegram_message_id)
msg_id = _send(text)
booking.telegram_message_id = msg_id; db.session.commit()
```

**In-app notify:** `from views.core.notification_service import notify_*` — commit ทำใน `_create()`

> Backend Python conventions (Clean Code Rules, Flask Response Pattern) → auto-loads from `.claude/rules/backend-python.md` when editing `app/views/**`, `app/services/**`, `app/domain/**`. Vehicle-domain gotchas (budget/mileage/fuel) → `.claude/rules/vehicle-domain.md`. Design rules → `.claude/rules/design.md`.

---

## Naming Conventions

**Blueprint:** `<domain>_bp` → ลงทะเบียนใน `app.py` ด้วย prefix `/vehicle`, `/room`, ฯลฯ

**View function:** `<action>_<noun>` (เช่น `book_vehicle_simple`, `cancel_booking`) หรือ `admin_<noun>` สำหรับ admin-only route

**Template:** `templates/<domain>/` + `templates/<domain>/admin/` + `templates/<domain>/modals/` — ชื่อไฟล์ใช้ `vehicle_<name>.html` ไม่ใช่ `<name>_vehicle.html`

**Static:** `static/<domain>/css/<domain>_<page>.css`, `static/<domain>/js/<domain>_<page>.js`

**Model:** PascalCase ตาม domain (เช่น `VehicleBooking`, `VehicleBudget`) — ไฟล์อยู่ใน `models/<domain>.py`

---

## 🤖 Subagents — Claude spawn เองตามเงื่อนไข

`checker`/`db-helper`/`guide-vehicle` spawn อัตโนมัติตามเงื่อนไขใน frontmatter ของแต่ละไฟล์ (`.claude/agents/*.md`) — ไม่ต้องรอสั่ง

**guide-vehicle:** เช็ก [INDEX §Blueprints](docs/notes/INDEX.md#-blueprints) หา controller ก่อนเสมอ — ตอบได้แล้วไม่ต้อง spawn. Subagent ไม่เห็น conversation เดิม — prompt ต้องครบทุกอย่างที่ต้องรู้

---

## Test Credentials (Dev Only)

`pjatuporn` / `Animajamelove072` (admin) · Bypass: `http://localhost:5001/dev/login/pjatuporn`
