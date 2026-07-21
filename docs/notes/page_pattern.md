# Page Pattern — มาตรฐานเขียน 1 หน้า (BBCenter Component Framework)

> **เป้าหมาย:** คนมาทำต่อเปิดหน้าไหนก็เข้าใจทันที เพราะทุกหน้าเขียนโครงเดียวกัน
> clean-code rules (≤60 บรรทัด/func, logger, ห้าม print) → [CLAUDE.md](../../CLAUDE.md) (ไม่เขียนซ้ำที่นี่)
> design/UI → [design_guideline.md](design_guideline.md) · component API → [INDEX_ui.md](INDEX_ui.md) § Design System

---

## 0. กฎทอง — 1 layer 1 หน้าที่

```
Domain     → pure logic ล้วน (คำนวณ/state machine) ห้าม import flask/query ORM
Service    → business logic ที่แตะเงิน/สถานะ: guard → เปลี่ยน state → side effect (notify)
Model      → ดึง/แก้ข้อมูล (ORM เท่านั้น ห้าม SQL ดิบ)
Controller → parse request → เรียก service (ถ้ามี) → ประกอบ component → render/flash
Component  → ถือ config + render macro (ห้าม query DB / business logic / permission)
Jinja      → แสดง HTML เท่านั้น (for/if/include/macro)
```

อ่านโค้ดไล่จากบนลงล่างได้เสมอ: domain/service → model → controller → template **ห้ามให้ layer หนึ่งทำงานแทนอีก layer**

> **Clean Architecture refactor (2026-07-19):** Domain/Service เป็นชั้นใหม่จาก [ADR 0001](adr/0001-clean-architecture-layers.md) — **ใช้เมื่อ controller function มี business logic ที่แตะเงิน/สถานะ** (approve/reject/cancel/deduct budget ฯลฯ). หน้า/route ที่แค่ **อ่าน/แสดงข้อมูลล้วน** (เช่น `cost_summary()` ในตัวอย่าง §3.1 ด้านล่าง) ยัง query model ตรงใน controller ได้ปกติ ไม่ต้องผ่าน service — ดูตัวอย่างจริง: `app/services/vehicle/booking_service.py` (approve/reject/cancel/assign), `mileage_service.py` (close_trip/OT), `budget_service.py` (deduct/refund/top_up)

---

## 1. ไฟล์ของ 1 หน้า (naming)

หน้า `<domain>` 1 หน้า ปกติแตะ 3-4 ไฟล์ ชื่อต้องเดาได้:

| layer | path | ตัวอย่าง |
|---|---|---|
| Model | `app/models/<domain>.py` | `models/vehicle.py` |
| Controller | `app/views/<domain>/<domain>_<feature>.py` | `views/vehicle/vehicle_cost.py` |
| Template | `app/templates/<domain>/<domain>_<page>.html` | `templates/vehicle/admin/vehicle_cost.html` |
| CSS/JS | `app/static/<domain>/{css,js}/<domain>_<page>.{css,js}` | `static/vehicle/css/vehicle_cost.css` |

> view function: `<action>_<noun>` (`book_vehicle`, `cancel_booking`) หรือ `admin_<noun>` · blueprint `<domain>_bp`

---

## 2. Model — ข้อมูลอยู่ที่นี่

- query ง่ายๆ เรียกตรงใน controller ได้: `DriverOT.query.filter_by(status='unpaid').all()`
- query ซับซ้อน / ใช้ซ้ำ ≥2 ที่ → ทำเป็น helper (`@staticmethod`/`@classmethod` ใน model หรือ helper ใน `services/<domain>/*.py`) อย่า copy filter ซ้ำ — **ห้าม** เพิ่ม logic ใหม่ใน `vehicle_common.py` (เหลือแค่ blueprint def + shared constant ตั้งแต่ Phase 5, 2026-07-19)
- **ห้าม** raw SQL string · **ห้าม** render HTML / สร้าง component ใน model
- mutation งบ/สถานะ (`VehicleBudget`/`VehicleBooking.status`) → ผ่าน service เท่านั้น (`services/vehicle/budget_service.py`/`booking_service.py`) ไม่แก้ field ตรง — ดู §0

---

## 3. Controller — โครงมาตรฐาน

### 3.1 GET (แสดงหน้า)

```python
@admincost_bp.route('/admin/cost')
@login_required
def cost_summary():
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์', 'danger')
        return redirect(url_for('vehicle.index'))

    rows  = _query_ot(request.args)          # 1) model ดึงข้อมูล
    table = Table(data=rows, columns=[       # 2) ประกอบ component
        Column(key='label',  label='ประเภทงาน'),
        Column(key='amount', label='ยอด (฿)', align='end', fmt='฿{:,.0f}'),
    ])
    return render_template('vehicle/admin/vehicle_cost.html',  # 3) render
        ot_table=table)
```

ลำดับในตัว GET เสมอ: **(1) เช็กสิทธิ์ → (2) ดึงข้อมูล → (3) ประกอบ component → (4) render** อ่านปุ๊บรู้เรื่อง

### 3.2 POST (1 ฟังก์ชัน = 1 action)

```python
@admincost_bp.route('/admin/ot/<int:ot_id>/mark_paid', methods=['POST'])
@login_required
def ot_mark_paid(ot_id):
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์', 'danger')
        return redirect(url_for('vehicle.index'))
    ot = DriverOT.query.get_or_404(ot_id)
    try:
        _toggle_paid(ot)                     # logic แยกเป็น helper
        db.session.commit()
        flash(f'บันทึก {ot.ot_number} เรียบร้อย', 'success')
    except Exception:
        current_app.logger.exception('ot_mark_paid failed')
        flash('เกิดข้อผิดพลาด กรุณาลองใหม่', 'danger')
    return redirect(request.referrer or url_for('admincost.cost_summary'))
```

- POST หลาย action → **แตกเป็นฟังก์ชันต่อ action** ไม่ใช่ if-branch ยาวในฟังก์ชันเดียว
- error: `logger.exception(...)` + flash ข้อความกลาง — **ห้าม** `flash(str(e))`

### 3.2b POST ที่แตะเงิน/สถานะ → ผ่าน service (ตัวอย่างจริง, ตัด/ย่อจาก `vehicle_booking.py`)

```python
@vehicle_bp.route('/vehicle/cancel/<int:booking_id>', methods=['POST'])
@login_required
def cancel_booking(booking_id):
    booking  = VehicleBooking.query.get_or_404(booking_id)
    is_owner = (current_user.id == booking.user_id)
    is_admin = is_vehicle_admin()
    if not (is_owner or is_admin):
        flash('คุณไม่มีสิทธิ์ยกเลิกการจองนี้', 'danger')
        return redirect(url_for('vehicle.index'))

    try:
        # guard + state change + notify ทั้งหมดอยู่ใน service — route ไม่รู้รายละเอียด
        ok, msg, info = booking_svc.cancel(booking, actor_id=current_user.id,
                                           is_owner=is_owner, is_admin=is_admin)
        if not ok:
            flash(msg, 'warning')
            return redirect(url_for('vehicle.detail_booking', booking_id=booking_id))
        db.session.commit()
        flash(f'ยกเลิกการจอง #{booking_id} เรียบร้อย', 'success')
    except Exception:
        db.session.rollback()
        current_app.logger.exception('cancel_booking failed')
        flash('เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง', 'danger')
    return redirect(url_for('vehicle.index'))
```

- ต่างจาก §3.2 ตรงที่ **controller ไม่มี business logic เลย** — parse+permission check → เรียก service ตัวเดียว → flash ตาม `(ok, msg)` ที่ service คืนมา → commit
- service function (`services/<domain>/*.py`) รับผิดชอบ: guard (เช่น เช็คสถานะ/สิทธิ์/เพดานงบ) → เปลี่ยน state (`apply_transition`/mutate field) → side effect (notify, หลัง flush) — controller **ไม่ commit เองใน service**, commit ยังเป็นหน้าที่ route เสมอ
- ห้ามให้ service import `flask.request`/`flash()`/`current_user` ตรง — รับ `actor_id`/param ที่ต้องใช้เป็น argument (ดู `booking_service.cancel(actor_id=...)`)

### 3.3 AJAX/fetch → jsonify (ไม่ใช่ redirect)

```python
if _wants_json():
    return jsonify(ok=True, msg='สำเร็จ')       # 200
    # หรือ jsonify(ok=False, msg='...'), 400
```
รายละเอียด pattern (client เช็ก `res.ok && data.ok`) → [CLAUDE.md](../../CLAUDE.md) § Flask Response Pattern

---

## 4. Component — สร้างใน controller ส่งเข้า template

- ตารางข้อมูลล้วน → `Table` + `Column` ([components/table.py](../../app/components/table.py))
- ซ่อนตามสิทธิ์ → `Table(visible=is_vehicle_admin())` (controller สั่ง component ไม่รู้เอง)
- cell มี badge/ปุ่ม → ยังใช้ shell macro `bb_table` ใน template (limitation ปัจจุบัน)
- option เต็ม → [INDEX_ui.md](INDEX_ui.md) § Design System

---

## 5. Jinja page — แสดงอย่างเดียว

> โปรเจกต์นี้ **ไม่ใช้** `{% extends base.html %}` — แต่ละหน้าเป็น full HTML doc แล้ว `{% include '_shared/...' %}` (sidebar/header). โครงนี้คือมาตรฐาน คัดลอกจากหน้าที่มีอยู่:

```jinja
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ชื่อหน้า - BBCenter</title>
    {# vendor (bootstrap/fontawesome) + fonts + core/css + หน้าตัวเอง #}
    <link href="{{ url_for('static', filename='core/css/design-system.css') }}" rel="stylesheet">
    <link href="{{ url_for('static', filename='core/css/components.css') }}" rel="stylesheet">
    <link href="{{ url_for('static', filename='vehicle/css/vehicle_list.css') }}" rel="stylesheet">
</head>
<body>
    {% set active_menu = 'fleet' %}
    {% include '_shared/sidebar.html' %}

    <main class="main-content vc-scope">
        {% set page_section = 'ผู้ดูแลระบบ' %}
        {% set page_title = 'รายการรถ' %}
        {% include '_shared/header.html' %}

        <div class="container-xxl px-4 pt-3 pb-5">
            {# flash messages block (คัดลอกจากหน้าที่มีอยู่) #}

            {# component สร้างเสร็จจาก controller — หน้าแค่เรียกแสดง #}
            {{ component(vehicle_table) }}
        </div>
    </main>

    <script src="{{ url_for('static', filename='vendor/bootstrap/js/bootstrap.bundle.min.js') }}"></script>
    <script type="module" src="{{ url_for('static', filename='vehicle/js/vehicle_list.js') }}"></script>
</body>
</html>
```

- partial กลาง → `{% include '_shared/...' %}` · widget ซ้ำ → macro ใน `_components/`
- **ห้าม** คำนวณ/query/business logic ใน template
- **inline `<script>`:** ได้เฉพาะ *data injection* ผ่าน `| tojson` (เช่น `window.OPTS = {{ data | tojson }}`) — **ห้าม** เขียน logic/event ใน inline script (อยู่ใน `.js` module)
- design: `--vc-*`/`.bb-*` tokens เท่านั้น · ตาราง `data-table`/`.bb-table` (ห้าม Bootstrap `table-*`)

---

## 6. Checklist ก่อน mark เสร็จ

```
[ ] Model: ไม่มี HTML/component · query ซ้ำ extract เป็น helper
[ ] Business logic แตะเงิน/สถานะ → อยู่ใน services/<domain>/*.py ไม่ inline ใน controller (ดู §0/§3.2b)
[ ] Controller: GET เรียงตามลำดับ (สิทธิ์→ดึง→ประกอบ→render) · 1 func 1 action
[ ] Controller: error = logger.exception + flash generic (ไม่ flash str(e))
[ ] Component: config อยู่ใน controller ไม่ใช่ template
[ ] Jinja: ไม่มี logic · {{ component(x) }} · tokens ถูก · ไม่มี inline script
[ ] ทุก func ≤60 บรรทัด + ชื่อ verb_noun (CLAUDE.md Clean Code)
[ ] sync docs ตาม Maintenance Protocol (CLAUDE.md)
```

---

## 7. ตัวอย่างเต็ม end-to-end (หน้าใหม่ "รายการรถ")

**model** — `models/vehicle.py` (มี Vehicle อยู่แล้ว, query ใน controller)

**controller** — `views/vehicle/vehicle_admin.py`
```python
@adminfleet_bp.route('/admin/vehicles')
@login_required
def vehicle_list():
    if not is_vehicle_admin():
        flash('คุณไม่มีสิทธิ์', 'danger')
        return redirect(url_for('vehicle.index'))

    vehicles = Vehicle.query.order_by(Vehicle.license_plate).all()
    table = Table(data=vehicles, info=True, columns=[
        Column(key='license_plate', label='ทะเบียน'),
        Column(key='brand',         label='ยี่ห้อ'),
        Column(key='fuel_rate',     label='กม./ลิตร', align='end', fmt='{:,.1f}'),
    ])
    return render_template('vehicle/admin/vehicle_list.html', vehicle_table=table)
```

**template** — `templates/vehicle/admin/vehicle_list.html`
(full HTML doc ตามโครง § 5 — `<head>` + links → `{% include '_shared/sidebar.html' %}` → `<main>` + header → `{{ component(vehicle_table) }}` → scripts)

จบ — 3 ไฟล์ แต่ละไฟล์ทำหน้าที่เดียว คนต่อเปิดดูเข้าใจใน 30 วินาที
