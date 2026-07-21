# ADR 0001 — Clean Architecture Layers (domain / services / views)

> **วันที่:** 2026-07-19 · **สถานะ:** Accepted
> **อ้างอิง:** [2026-07-19_clean_architecture_masterplan.md](../log/2026-07-19_clean_architecture_masterplan.md) (work order เต็ม, Phase 0–6)

---

## บริบท (Context)

BBCenter V2 ยังไม่ขึ้น production จริง — เป็นหน้าต่างสุดท้ายที่รื้อโครงได้โดยไม่มี migration/downtime cost

ปัญหาปัจจุบัน:
1. Business logic เกือบทั้งหมดอยู่ใน controller (`views/vehicle/*.py` ไฟล์ละ 200–700 LOC) — มี service layer แค่ budget ตัวเดียว
2. Logic approve ซ้ำ 2 path (`approve_booking` + `admin_assign`) — แตะเงิน+สถานะแต่ test ไม่ได้
3. Side effect (notify) เรียกจาก controller — ลืมเรียก = เงียบหาย
4. Test ครอบเฉพาะ `vehicle_budget_service.py` เพราะส่วนอื่นแยก logic ออกจาก route ไม่ได้
5. ไฟล์ขยะ/ทับซ้อน/doc drift สะสม

**เป้าหมาย:** ทุก domain ใช้โครงเดียวกับที่ budget พิสูจน์แล้ว — mutation gateway เดียว, logic เป็น pure/service function ที่ test ได้, controller ผอม

---

## การตัดสินใจ (Decision)

### 1. โครงสร้าง target

```
app/
  domain/<domain>/    (pure logic)      ← ห้าม import flask เด็ดขาด
  services/<domain>/  (use cases)       ← orchestrate: ตรวจ → เปลี่ยน state → side effect
  views/<domain>/     (controllers)     ← parse request → เรียก service → flash/redirect เท่านั้น
  models/              (SQLAlchemy)      ← โครงสร้างข้อมูล
```

**Dependency Rule:** ชั้นในห้ามรู้จักชั้นนอก — `views` → `services` → `domain` (ลูกศรพึ่งพาชี้เข้าเสมอ) `models` เป็น data structure ใช้ได้จากทุกชั้น ไม่ใช่ layer ที่มี business logic

Package convention ตาม `views/` เดิม: ระดับ root (`app/domain/`, `app/services/`) ไม่ต้องมี `__init__.py` (namespace package ตาม `app/views/` ที่ไม่มีเช่นกัน) — ระดับ domain subfolder (`app/domain/vehicle/`, `app/services/vehicle/`) มี `__init__.py` เสมอ ตาม `app/views/vehicle/__init__.py` และ `app/views/core/__init__.py`

### 2. Import Rules (บังคับ)

| Layer | ห้าม | อนุญาต |
|---|---|---|
| `domain/<domain>/*.py` | `import flask` หรือสิ่งใดใน flask stack (`request`/`session`/`current_app`/`flash`/`g`) เด็ดขาด · query/commit ORM โดยตรง | pure function: รับ argument → คืนค่า ไม่มี I/O side effect · import `models` ได้เฉพาะใช้เป็น type (ไม่ query) |
| `services/<domain>/*.py` | แตะ `flask.request` ตรงๆ (รับ argument ที่ view parse มาแล้วเท่านั้น) · `current_app.logger` (service ต้อง testable นอก request context) | query/commit ORM · เรียก `domain/<domain>/` function · เรียก notify/side-effect (หลัง commit สำเร็จ) · logger ใช้ `logging.getLogger(__name__)` ที่ top-of-file |
| `views/**.py` | query ORM ที่ mutate หรือ query ซับซ้อน (join/filter หลายเงื่อนไข) นอกเหนือ read-only list/get อย่างง่าย | `Model.query.get(id)` / `Model.query.filter_by(...).all()` เพื่อส่งต่อ service · parse request/form · เรียก service function · `flash`/`redirect`/`jsonify` |

เหตุผลของกฎ `services/` ห้ามใช้ `current_app.logger`: pattern นี้ยึดตาม CLAUDE.md § Logger pattern ที่ module-level service (`telegram_service`, `line_service`, `broadcast`) ใช้ `logging.getLogger(__name__)` อยู่แล้ว — ขยายกฎเดียวกันให้ `services/<domain>/` ทุกตัว เพื่อให้เรียก service function จาก test/script นอก request context ได้โดยไม่ error

### 3. Reverse note — มติ 2026-06-07

**ADR นี้ reverse มติวันที่ 2026-06-07** ที่ยุบโฟลเดอร์ `services/` เข้า `views/vehicle/` (บันทึกใน [architecture.md](../architecture.md) § File Structure: `vehicle_budget_service.py ← ย้ายจาก services/ (services/ ถูกลบ)` และ [views/core/__init__.py](../../../app/views/core/__init__.py): `core = util ข้าม domain เท่านั้น. budget_service (vehicle business logic) อยู่ที่ views/vehicle/vehicle_budget_service.py ไม่ใช่ที่นี่`)

**เหตุผลตอนนั้น (2026-06-07):** มี service เดียวทั้งระบบ (`vehicle_budget_service.py`) — การมีโฟลเดอร์ `services/` แยกต่างหากสำหรับไฟล์เดียวเป็น over-engineering เก็บรวมไว้ใน domain folder (`views/vehicle/`) ประหยัด indirection ได้โดยไม่เสียอะไร

**เหตุผลที่ reverse ตอนนี้ (2026-07-19):** เงื่อนไข "มีตัวเดียวพอ" ที่เป็นฐานของมติเดิมไม่จริงอีกต่อไป — แผน Phase 1–4 ของ masterplan จะเพิ่ม service มากกว่า 1 ตัวต่อ domain (`budget_service.py`, `booking_service.py`, `mileage_service.py`) บวก pure domain logic แยกต่างหาก (`workflow.py` state machine, `fuel.py` formula) การคงทุกอย่างไว้ใน `views/vehicle/` ต่อไปจะทำให้ controller โตกว่าเดิมและ pure logic กับ service logic ปนกัน (`vehicle_workflow.py` ที่เป็น pure state machine อยู่ปนกับ controller files ที่ import flask) แยก `domain/` ออกจาก `services/` ให้ทดสอบ pure logic ได้โดยไม่ต้อง mock flask/db เลย ขณะที่ `services/` ยัง orchestrate การ commit + side effect ตามเดิม

---

## ผลกระทบ (Consequences)

- Phase 0 (เอกสารนี้) สร้างแค่โครง — ADR + folder เปล่า (`app/domain/vehicle/`, `app/services/vehicle/`) ยังไม่ย้ายไฟล์ ยังไม่มี logic ใหม่
- Phase 1 เป็นต้นไปจะย้ายไฟล์ที่มีอยู่เข้าโครงนี้ (ย้ายอย่างเดียว ห้ามแก้ logic ระหว่างย้าย)
- `views/vehicle/vehicle_budget_service.py` จะย้ายไป `services/vehicle/budget_service.py` (Phase 1) — เอกสารที่อ้าง path เดิม (CLAUDE.md, architecture.md, INDEX_code.md) ต้อง sync ที่ Phase 6
- Blueprint/URL ไม่เปลี่ยน — ADR นี้แตะเฉพาะ internal code organization
