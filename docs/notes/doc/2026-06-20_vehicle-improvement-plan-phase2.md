# Vehicle Improvement Plan — Phase 2 (Flow Gaps) — 2026-06-20

> **ผู้วาง:** BA/Architect session · **เป้า:** implementer (sonnet effort high) ทำตามได้โดยไม่ต้องเดา
> **ต่อจาก:** [Phase 1](2026-06-20_vehicle-improvement-plan.md) (6 งาน) · บริบท: [vehicle_product_spec.md](../vehicle_product_spec.md)
> **กฎบังคับ:** CLAUDE.md Clean Code (logger ไม่ใช่ print · ≤60 บรรทัด/ฟังก์ชัน · DRY) + Flask Response Pattern (AJAX→jsonify; เช็ค `res.ok && data.ok` ก่อน patch UI) + Design (zendenta: lucide icon, `vc-*` token, ห้าม table-hover/striped)
> **หลัง implement:** sync เอกสารตาม Maintenance Protocol (ระบุท้ายแต่ละงาน)

จาก flow-gap analysis 7 ข้อ — **ข้อ 5 = ไม่ทำ** (ปล่อยงานไม่อนุมัติไว้เฉยๆ ตามที่ตัดสินใจ)

ลำดับแนะนำ: **#7 → #4 → #1 → #3+#6 → #2** (เรียง effort ต่ำ→สูง; #2 ซับซ้อนสุด)

---

## งาน #1 — ลบ TripPassenger (orphan / dead feature)

### ยืนยันแล้ว
`grep -rn "TripPassenger\|\.passengers\|trip_passenger"` ทั้ง app → **0 reference** นอก `models/` + docs. ไม่มี route/template ใช้ → ลบได้ปลอดภัย

### Scoped Command
```
[ไฟล์] app/models/vehicle.py · app/models/__init__.py · app/migrations/ (sql ใหม่) · schema.md · INDEX_code.md
[ตำแหน่ง] vehicle.py:141-160 (class) · __init__.py:19,47
[งาน] ลบ model TripPassenger + re-export + DROP TABLE
[ข้อจำกัด] db-helper subagent ถูกปิด session นี้ → gen migration manual; backref `passengers` ต้องลบด้วย
[output] ลบ class + import + __all__ entry + sql DROP + sync 2 docs
```

### ขั้นตอน (ตามลำดับ — สำคัญ)
**1.1** [models/vehicle.py](../../../app/models/vehicle.py) — ลบทั้ง class `TripPassenger` (line 141-160 รวม comment block 138-140)
- backref `passengers` อยู่ใน class นี้เอง (line 156 `backref='passengers'`) → ลบทั้ง class = backref หายเอง ไม่ต้องแก้ VehicleBooking

**1.2** [models/__init__.py](../../../app/models/__init__.py):
- ลบ `TripPassenger,` ออกจาก import block (line 19)
- ลบ `'TripPassenger',` ออกจาก `__all__` (line 47 — อยู่บรรทัดเดียวกับ VehicleServiceLog/TripExpenseItem, ลบเฉพาะ token)

**1.3** ตรวจ import ตกค้าง — grep ยืนยันอีกรอบหลังลบ:
```bash
grep -rn "TripPassenger" app/ | grep -v "\.pyc"
```
ต้องเหลือ 0 (ถ้ามีใน vehicle_view.py legacy หรือ __init__ อื่น → ลบ)

**1.4** Migration `app/migrations/2026-06-20_drop-trip-passenger.sql`:
```sql
-- ลบ trip_passenger (orphan feature ไม่เคยต่อ flow — Phase 2, 2026-06-20)
DROP TABLE IF EXISTS trip_passenger;
```
+ เพิ่มบรรทัดใน [migrations-index.md](../../../app/migrations/migrations-index.md)

### DB / Docs sync
- schema.md: ลบ section `trip_passenger` (Part 1) + เพิ่ม Part 2 row (v2.21 drop) + อัปเดต table count (26→25)
- INDEX_code.md §Database Models: ลบแถว `TripPassenger`
- ER summary ใน schema.md: ลบ `vehicle_booking ──< trip_passenger`

### Edge cases
- `passive_deletes=True` + `ondelete='CASCADE'` บน FK → DROP TABLE ไม่กระทบ vehicle_booking (FK อยู่ฝั่ง trip_passenger)
- ถ้า DB จริงมี row → DROP ทิ้งเลย (user ยืนยัน "เอาออก")

---

## งาน #2 — Admin Edit Booking ผ่าน eventDetailModal

### ⚠️ Pre-existing bug ที่ต้องแก้ก่อน (สำคัญ!)
`openAdminBookingDetail()` ([vehicle_admin.js:1366](../../../app/static/vehicle/js/vehicle_admin.js#L1366)) อ้าง element id **`single*`** (`singleStatusBadge`/`singleDateLine`/`singlePlate`/`singleBooker`/`singlePurpose`/`singleDest`/`singlePax`/`singleActions` ฯลฯ) — **แต่ [eventDetailModal](../../../app/templates/vehicle/modals/vehicle_detail.html) ใช้ id `detail*`** (`detailStatusPill`/`detailDateLine`/`detailPlate`/`detailDriver`/`detailTime`/`detailMembersList`/`detailActions`).
→ ปัจจุบันคลิก booking ในหน้า admin = **JS crash** (`getElementById('singleStatusBadge')` = null → `.className` throw). modal ใช้ไม่ได้จริง

### ⚠️ Modal shared — ห้ามพังหน้า user
`vehicle_detail.html` ถูก include ทั้งหน้า admin (`vehicle_admin.js` → `openAdminBookingDetail`) **และ** หน้า user (`vehicle.js` → `openEventDetail`). **implementer ต้องอ่าน `openEventDetail()` ใน vehicle.js ก่อน** เพื่อ:
1. ใช้เป็น reference การ map id `detail*` ที่ถูกต้อง
2. ยืนยันว่า edit section ใหม่ (hidden default) ไม่กระทบ user flow

### Scoped Command
```
[ไฟล์] vehicle_detail.html (เพิ่ม edit form section) · vehicle_admin.js (fix openAdminBookingDetail + edit logic) · vehicle_booking.py (route admin_edit_booking ใหม่) · vehicle_admin.html (BOOKINGS_DATA + editUrl)
[ตำแหน่ง] vehicle_detail.html ใต้ bk-detail-footer · vehicle_admin.js:1366 + เพิ่ม submit · vehicle_booking.py ใกล้ edit_booking (line 124)
[งาน] คลิก va-list → eventDetailModal แสดง detail (fix id) + ปุ่ม "แก้ไข" (admin) → toggle เป็น edit form → submit → route admin แก้ booking detail ได้ทุกสถานะ
[ข้อจำกัด] modal shared กับ user — edit section hidden default, ไม่ render ปุ่มแก้ไขในหน้า user; backend admin-only + block ถ้า budget_deducted; AJAX jsonify
[output] modal section + JS 2 ฟังก์ชัน + route + data injection
```

### 2.1 Backend — route ใหม่ `admin_edit_booking` ใน [vehicle_booking.py](../../../app/views/vehicle/vehicle_booking.py)
วางใกล้ `edit_booking` (line 124). แยก route ไม่แก้ `edit_booking` เดิม (owner+pending):
```python
@vehicle_bp.route('/vehicle/admin/edit/<int:booking_id>', methods=['POST'])
@login_required
def admin_edit_booking(booking_id):
    if not is_vehicle_admin():
        return jsonify({'ok': False, 'msg': 'ไม่มีสิทธิ์'}), 403
    booking = VehicleBooking.query.get_or_404(booking_id)
    # ห้ามแก้ถ้าหักงบแล้ว (กัน cost/ระยะทางเพี้ยนหลัง ledger)
    if any(m.budget_deducted_at for m in booking.mileage):
        return jsonify({'ok': False, 'msg': 'แก้ไม่ได้ — ทริปนี้หักงบแล้ว'}), 400
    try:
        start_dt = datetime.strptime(request.form.get('start_datetime'), '%Y-%m-%dT%H:%M')
        end_dt   = datetime.strptime(request.form.get('end_datetime'),   '%Y-%m-%dT%H:%M')
        if start_dt >= end_dt:
            return jsonify({'ok': False, 'msg': 'เวลากลับต้องมากกว่าเวลาไป'}), 400
        if start_dt.date() != end_dt.date():
            return jsonify({'ok': False, 'msg': 'ห้ามจองข้ามวัน'}), 400
        booking.start_datetime  = start_dt
        booking.end_datetime    = end_dt
        booking.destination     = request.form.get('destination')
        booking.purpose         = request.form.get('purpose')
        booking.passenger_count = int(request.form.get('passenger_count', 1))
        booking.need_driver     = request.form.get('need_driver') == 'on'
        booking.pickup_location = request.form.get('pickup_location', '').strip() or None
        booking.updated_by      = current_user.id
        db.session.commit()
        return jsonify({'ok': True})
    except Exception:
        db.session.rollback()
        current_app.logger.exception('admin_edit_booking failed')
        return jsonify({'ok': False, 'msg': 'เกิดข้อผิดพลาด กรุณาลองใหม่'}), 500
```
> `datetime` import มีแล้ว (line 6)

### 2.2 Data injection — [vehicle_admin.html](../../../app/templates/vehicle/admin/vehicle_admin.html) BOOKINGS_DATA (~line 413)
เพิ่ม field ใน object (ใกล้ `assignUrl`):
```javascript
    editUrl:     {{ url_for('vehicle.admin_edit_booking', booking_id=b.id) | tojson }},
    pickup:      {{ (b.pickup_location or '') | tojson }},
```
> `dest`/`purpose`/`pax`/`needDriver`/`startIso`/`endIso` มีอยู่แล้ว

### 2.3 Modal — [vehicle_detail.html](../../../app/templates/vehicle/modals/vehicle_detail.html) เพิ่ม edit section (hidden default) ก่อน `</div>` ปิด `bk-detail-content` (หลัง bk-detail-footer line 55)
```html
{# ── Admin edit form (hidden default — toggle จาก JS เฉพาะหน้า admin) ── #}
<div id="detailEditForm" class="bk-detail-edit" hidden>
    <div class="bk-detail-divider"></div>
    <div class="vc-form-group">
        <label class="vc-label">วันเวลา</label>
        <div class="vc-form-row vc-form-row-2">
            <input type="datetime-local" class="vc-input" id="editStart">
            <input type="datetime-local" class="vc-input" id="editEnd">
        </div>
    </div>
    <div class="vc-form-group"><label class="vc-label">ปลายทาง</label>
        <input type="text" class="vc-input" id="editDest"></div>
    <div class="vc-form-group"><label class="vc-label">จุดประสงค์</label>
        <input type="text" class="vc-input" id="editPurpose"></div>
    <div class="vc-form-row vc-form-row-2">
        <div class="vc-form-group"><label class="vc-label">จำนวนคน</label>
            <input type="number" class="vc-input" id="editPax" min="1"></div>
        <div class="vc-form-group"><label class="vc-label">จุดขึ้นรถ</label>
            <input type="text" class="vc-input" id="editPickup"></div>
    </div>
    <label class="vc-check"><input type="checkbox" id="editNeedDriver"> ต้องการคนขับ</label>
    <div class="d-flex justify-content-end gap-2 pt-2">
        <button type="button" class="vc-btn vc-btn-secondary" onclick="cancelEditBooking()">ยกเลิก</button>
        <button type="button" class="vc-btn vc-btn-primary" onclick="submitEditBooking()">บันทึก</button>
    </div>
</div>
```

### 2.4 JS — [vehicle_admin.js](../../../app/static/vehicle/js/vehicle_admin.js) แก้ `openAdminBookingDetail` (line 1366) + เพิ่ม 3 ฟังก์ชัน
**ก) fix id mismatch** — เปลี่ยนทุก `single*` → `detail*` ให้ตรง eventDetailModal. **อ่าน `openEventDetail` ใน vehicle.js เป็น reference id ที่ถูกต้อง** แล้ว map:
- `singleStatusLabel` → `detailStatusText`, `singleDateLine` → `detailDateLine`, `singleTime` → `detailTime`, `singlePlate` → `detailPlate`, `singleDriver` → `detailDriver`, `singleDriverLine` → `detailDriverLine`
- members/booker/purpose/dest/pax: eventDetailModal ใช้ `detailMembersList` (tile) — populate ตาม pattern openEventDetail (ดู reference)
- `singleActions` → `detailActions`

**ข) เพิ่มปุ่ม "แก้ไข" ใน detailActions** (เฉพาะ booking ที่แก้ได้):
```javascript
    // ใน openAdminBookingDetail หลัง populate detail:
    const canEdit = b.status !== 'cancelled' && b.status !== 'rejected';
    document.getElementById('detailActions').innerHTML = canEdit
        ? `<button type="button" class="vc-btn vc-btn-secondary" onclick="openEditBooking(${b.id})">
               <i data-lucide="pencil" class="vc-icon-sm"></i> แก้ไขข้อมูลจอง</button>`
        : '';
    initIcons();
```

**ค) เพิ่ม 3 ฟังก์ชัน** (ใกล้ openAdminBookingDetail) + expose ใน `Object.assign(window,{...})` (line 1450):
```javascript
let _editingBookingId = null;
function openEditBooking(id) {
    const b = bookings.find(x => x.id === id);
    if (!b) return;
    _editingBookingId = id;
    document.getElementById('editStart').value   = b.startIso.slice(0,16);
    document.getElementById('editEnd').value     = b.endIso.slice(0,16);
    document.getElementById('editDest').value    = b.dest || '';
    document.getElementById('editPurpose').value = b.purpose || '';
    document.getElementById('editPax').value     = b.pax || 1;
    document.getElementById('editPickup').value  = b.pickup || '';
    document.getElementById('editNeedDriver').checked = !!b.needDriver;
    document.getElementById('detailEditForm').hidden = false;
    document.getElementById('detailActions').innerHTML = '';
}
function cancelEditBooking() {
    document.getElementById('detailEditForm').hidden = true;
    _editingBookingId = null;
}
async function submitEditBooking() {
    const b = bookings.find(x => x.id === _editingBookingId);
    if (!b) return;
    const fd = new FormData();
    fd.append('start_datetime', document.getElementById('editStart').value);
    fd.append('end_datetime',   document.getElementById('editEnd').value);
    fd.append('destination',    document.getElementById('editDest').value);
    fd.append('purpose',        document.getElementById('editPurpose').value);
    fd.append('passenger_count',document.getElementById('editPax').value);
    fd.append('pickup_location',document.getElementById('editPickup').value);
    if (document.getElementById('editNeedDriver').checked) fd.append('need_driver','on');
    const res = await fetch(b.editUrl, { method:'POST', body:fd });
    const data = await res.json();
    if (!res.ok || !data.ok) { showToast(data.msg || 'แก้ไขไม่สำเร็จ'); return; }
    patchBooking(_editingBookingId, {
        startIso: fd.get('start_datetime'), endIso: fd.get('end_datetime'),
        dest: fd.get('destination'), purpose: fd.get('purpose'),
        pax: parseInt(fd.get('passenger_count')), pickup: fd.get('pickup_location'),
        needDriver: document.getElementById('editNeedDriver').checked,
        start: fd.get('start_datetime').slice(11,16), end: fd.get('end_datetime').slice(11,16),
    });
    showToast('✓ แก้ไขข้อมูลจองแล้ว');
    cancelEditBooking();
    adminDetailModal.hide();
    renderAll();
}
```
+ ต้อง reset `detailEditForm.hidden = true` ทุกครั้งที่เปิด modal (กัน state ค้าง) — เพิ่มต้น `openAdminBookingDetail`

### Edge cases
- modal shared: edit form `hidden` default → user (`openEventDetail`) ไม่เห็น (vehicle.js ไม่เรียก openEditBooking)
- booking ที่หักงบแล้ว → backend block 400; frontend ก็ควรซ่อนปุ่มถ้า `b.odoEnd !== null` (มี `odoEnd` ใน BOOKINGS_DATA)
- start/end datetime-local format = `YYYY-MM-DDTHH:MM` → `startIso.slice(0,16)` ตรง
- ทริปร่วม (trip_group): แก้เวลา 1 booking อาจทำ group เวลาเพี้ยน → **decision: ปุ่มแก้ไขแสดงเฉพาะ booking เดี่ยว (b.tripGroup == null)** เพิ่มเงื่อนไข `canEdit && !b.tripGroup`

### Docs sync
- INDEX_routes.md: + `/vehicle/admin/edit/<id>` (admin_edit_booking)
- INDEX_code.md: + `admin_edit_booking`
- INDEX_ui.md: vehicle_detail.html (edit section), vehicle_admin.js (edit funcs)

---

## งาน #3 + #6 — Approver fuel badge: แสดงสถานะ/ยอดเกิน แทน ฿0

### Concept (รวม user ข้อ 3+6)
- ทริปอนุมัติแล้ว → อยู่ tab "อนุมัติแล้ว" (มีอยู่แล้ว) · ค่าใช้จ่ายอัปเดตหลังเดินทาง · ถ้าทริปไม่เกิด = 0 (พฤติกรรมปัจจุบันถูกแล้ว)
- ปัญหา: **tab รออนุมัติ** badge โชว์ `฿0` (เพราะยังไม่เดินทาง = ไม่มี odometer) → ทำให้เข้าใจผิด
- ต้องการ: pending → ไม่โชว์ ฿0 แต่โชว์ **สถานะ "ยังไม่เดินทาง"** + ถ้างบกองเกิน → โชว์ยอดเกิน

### ปัจจุบัน
- `approver_inbox()` ([vehicle_booking.py:332](../../../app/views/vehicle/vehicle_booking.py#L332)) ส่ง `fuel_costs` (คำนวณจาก odometer — pending = 0) + `budgets` (งบ active ของ approver)
- [vehicle_approver.html](../../../app/templates/vehicle/vehicle_approver.html) badge `฿{{ fuel_costs.get(b.id,0) }}` ที่ pending (line 110-113), approved (226-229), rejected (293-296)

### Scoped Command
```
[ไฟล์] vehicle_approver.html (badge logic) · vehicle_booking.py (approver_inbox — ส่ง over-budget info ถ้าต้องการ)
[ตำแหน่ง] approver.html line 110-113 (pending badge); 226-229 (approved)
[งาน] pending: ฿0 → "ยังไม่เดินทาง"; complete: โชว์ค่าจริง; งบกองเกิน → โชว์ยอดเกิน
[ข้อจำกัด] ไม่แตะ schema; logic ใน template (Jinja) พอ; reuse budgets ที่ส่งอยู่แล้ว
[output] แก้ badge 3 จุด + (optional) ส่ง budget remaining
```

### การแก้ (template-only — ง่ายสุด)
แทน badge ที่ pending (line 110-113):
```html
{% set fc = fuel_costs.get(b.id, 0) | float %}
<span class="ac-fuel-badge" title="ค่าน้ำมัน (อัปเดตหลังเดินทาง)">
    <i data-lucide="fuel" class="vc-icon-sm"></i>
    {% if fc > 0 %}฿{{ '{:,.0f}'.format(fc) }}{% else %}ยังไม่เดินทาง{% endif %}
</span>
```
- tab "อนุมัติแล้ว" (line 226-229): ใช้ logic เดียวกัน — ถ้า `fc>0` โชว์ค่าจริง (อัปเดตหลังเดินทาง ✓), ไม่งั้น "ยังไม่เดินทาง"
- tab "ปฏิเสธ" (line 293-296): ปฏิเสธไม่เกิดทริป → เปลี่ยนเป็นซ่อน badge หรือ "—"

### ส่วน "งบกองเกินไปเท่าไหร่" (เชื่อม budgets ที่ส่งอยู่แล้ว)
Budget card บนหน้า (line 56-77) แสดง used/total + % แล้ว. เพิ่มแถบเตือนถ้าเกิน — ใน loop `{% for budget in budgets %}` หลัง budget-progress:
```html
{% set over = (budget.used_amount | float) - (budget.budget_amount | float) %}
{% if over > 0 %}
<div class="budget-card-over text-danger">
    <i data-lucide="triangle-alert" class="vc-icon-sm"></i>
    เกินงบ ฿{{ '{:,.0f}'.format(over) }}
</div>
{% endif %}
```
> `.budget-card-over` เพิ่ม CSS เล็กใน vehicle_approver.css (สี danger, font sm)

### Edge cases
- `fuel_costs` คำนวณจาก `m.odometer_start/end` (approver_inbox line 376) → pending ไม่มี mileage = 0 = "ยังไม่เดินทาง" ✓
- ข้อ 6 behavior (cost อัปเดตหลังเดินทางใน tab อนุมัติแล้ว) มีอยู่แล้ว — งานนี้แค่ทำให้ "0" สื่อความหมายถูก

### Docs sync
- INDEX_ui.md: vehicle_approver.html (badge logic + over-budget)

---

## งาน #4 — Block assign รถ maintenance (server-side)

### ปัจจุบัน
- Frontend filter แล้ว: `modalVehSel` filter `dbStatus==='active'` ([vehicle_admin.js:979](../../../app/static/vehicle/js/vehicle_admin.js#L979)); swap filter maintenance ([line 1273](../../../app/static/vehicle/js/vehicle_admin.js#L1273))
- **แต่ backend ไม่เช็ค** — `admin_assign`/`admin_merge`/`admin_swap_vehicle` รับ vehicle_id อะไรก็ได้ (CLAUDE.md: ห้าม trust frontend)

### Scoped Command
```
[ไฟล์] app/views/vehicle/vehicle_common.py (helper) + vehicle_admin.py (3 จุด)
[ตำแหน่ง] helper ใกล้ check_vehicle_conflict (Phase 1 งาน #1); enforce admin_assign/admin_merge/admin_swap_vehicle
[งาน] block ถ้า assigned vehicle.status != 'active'
[ข้อจำกัด] รวมกับ conflict guard Phase 1 (helper ชุดเดียวกัน); AJAX jsonify 400
[output] helper check_vehicle_active + เรียก 3 จุด
```

### Helper (vehicle_common.py — วางต่อจาก check_vehicle_conflict ของ Phase 1)
```python
def check_vehicle_active(vehicle_id):
    """คืน True ถ้ารถ active (assign ได้). False = maintenance/ไม่พบ"""
    if not vehicle_id:
        return True  # ไม่ได้เลือกรถ = ไม่บล็อกที่นี่
    v = Vehicle.query.get(int(vehicle_id))
    return bool(v and v.status == 'active')
```

### เรียกใช้ (3 จุด — pattern เดียวกับ Phase 1 conflict guard, รวม block เดียวกันได้)
**admin_assign** ([vehicle_admin.py:444](../../../app/views/vehicle/vehicle_admin.py#L444)) — ใน path ที่ set assigned_vehicle (not is_join_trip, line 473):
```python
        if assigned_vehicle_id and not check_vehicle_active(assigned_vehicle_id):
            return jsonify({'ok': False, 'msg': 'รถคันนี้อยู่ระหว่างซ่อม ไม่สามารถจัดงานได้'}), 400
```
**admin_merge** ([line 378](../../../app/views/vehicle/vehicle_admin.py#L378)) — หลัง validate assigned_vehicle_id (line 394):
```python
    if not check_vehicle_active(assigned_vehicle_id):
        return jsonify({'ok': False, 'msg': 'รถคันนี้อยู่ระหว่างซ่อม'}), 400
```
**admin_swap_vehicle** ([line 358](../../../app/views/vehicle/vehicle_admin.py#L358)) — หลัง validate new_vehicle_id (line 366):
```python
    if not check_vehicle_active(new_vehicle_id):
        return jsonify({'ok': False, 'msg': 'รถคันนี้อยู่ระหว่างซ่อม'}), 400
```
> import `check_vehicle_active` เพิ่มใน import block vehicle_admin.py (line 18-22)

### Edge cases
- รถถูกส่งซ่อม **หลัง** assign ไปแล้ว → booking เดิมยังผูกรถ maintenance (ไม่ retroactive) — ยอมรับได้ (admin เห็นใน vehicle status panel + swap ได้); งานนี้กันแค่ assign ใหม่
- `Vehicle` import มีใน vehicle_common.py แล้ว (line 3)

### Docs sync
- INDEX_code.md: + `check_vehicle_active`

---

## งาน #7 — Auto role sync (driver / approver)

### Concept (จาก user)
- ผูก Driver กับ user → `user.role_vehicle` `'user'` → `'driver'`
- ตั้ง user เป็น approver กอง (DeptApprover) → `user.role_vehicle` `'user'` → `'approver'`

### ⚠️ Decisions (อยู่ใน plan — implementer ทำตาม)
1. **เปลี่ยนเฉพาะถ้าค่าเดิมเป็น `'user'`** — ห้าม downgrade admin (`role_vehicle=='admin'` หรือ `is_superadmin`) เด็ดขาด
2. **Reverse:** ลบ driver link / ลบ approver → คืนเป็น `'user'` **เฉพาะถ้าปัจจุบันเป็น role ที่ตรง** (driver→user เมื่อลบ driver link; approver→user เมื่อลบ DeptApprover แถวสุดท้ายของ user นั้น) + ต้องไม่ใช่ admin
3. **Conflict (เป็นทั้ง driver + approver):** `role_vehicle` เก็บค่าเดียว → **priority: approver > driver** (approver มีสิทธิ์อนุมัติงบ สำคัญกว่า). ถ้า user เป็น approver อยู่แล้ว การผูก driver ไม่ downgrade เป็น driver

### Scoped Command
```
[ไฟล์] app/views/vehicle/vehicle_admin.py (helper + 4 จุด: add/edit/delete driver, add/delete approver)
[ตำแหน่ง] _fleet_add_driver(50) · _fleet_edit_driver(97) · _fleet_delete_driver(119) · _fleet_add_approver(126) · _fleet_delete_approver(137)
[งาน] sync user.role_vehicle ตาม driver link / approver assignment
[ข้อจำกัด] ห้าม downgrade admin/superadmin; priority approver>driver; helper เดียว DRY
[output] helper _sync_user_vehicle_role(user_id) + เรียก 5 จุด
```

### Helper (vehicle_admin.py — ใกล้ top หลัง _save_driver_image)
```python
def _sync_user_vehicle_role(user_id):
    """ตั้ง user.role_vehicle ตามบทบาทจริง: approver > driver > user.
    ไม่แตะ admin/superadmin. เรียกหลังเพิ่ม/ลบ driver link หรือ DeptApprover."""
    if not user_id:
        return
    user = User.query.get(int(user_id))
    if not user or user.is_superadmin or user.role_vehicle == 'admin':
        return
    is_approver = DeptApprover.query.filter_by(user_id=user.id).first() is not None
    is_driver   = Driver.query.filter_by(user_id=user.id).first() is not None
    if is_approver:
        user.role_vehicle = 'approver'
    elif is_driver:
        user.role_vehicle = 'driver'
    else:
        user.role_vehicle = 'user'
    # commit ทำที่ caller (อยู่ใน handler ที่ commit อยู่แล้ว)
```
> `User` import มีแล้ว (vehicle_admin.py line 3); `Driver`/`DeptApprover` ก็มี

### เรียกใช้ (ก่อน `db.session.commit()` ในแต่ละ handler)
- `_fleet_add_driver` (line 50): หลัง `db.session.add(d)` + `flush()` → `_sync_user_vehicle_role(d.user_id)` — **ต้อง flush ก่อนเพื่อให้ query เห็น driver ใหม่**
- `_fleet_edit_driver` (line 97): จับ `old_uid = driver.user_id` ก่อนแก้ → หลัง set user_id ใหม่ + flush → `_sync_user_vehicle_role(old_uid)` (เผื่อ unlink) + `_sync_user_vehicle_role(driver.user_id)`
- `_fleet_delete_driver` (line 119): จับ `uid = driver.user_id` ก่อน delete → หลัง `db.session.delete(driver)` + flush → `_sync_user_vehicle_role(uid)`
- `_fleet_add_approver` (line 126): หลัง `db.session.add(DeptApprover(...))` + flush → `_sync_user_vehicle_role(uid)`
- `_fleet_delete_approver` (line 137): จับ `uid = row.user_id` ก่อน delete → หลัง delete + flush → `_sync_user_vehicle_role(uid)`

> **สำคัญ:** handler เดิม `db.session.commit()` ทันที — ต้องเพิ่ม `db.session.flush()` ก่อนเรียก helper (เพื่อให้ query approver/driver เห็นการเปลี่ยน) แล้วค่อย commit ตามเดิม

### Edge cases
- user เป็น admin → helper return ทันที (ไม่แตะ)
- ลบ approver แถวเดียวจากหลายกอง → helper เช็ค `DeptApprover.filter_by(user_id)` ยังมีแถวอื่นไหม → ถ้ามี = ยัง approver
- driver มีหลาย row ผูก user เดียว (ไม่ควรเกิด แต่กัน) → `.first()` พอ
- **Backfill ข้อมูลเดิม (one-time):** user ที่ผูก driver/approver อยู่แล้วก่อนมี feature นี้ → role ยังเป็น 'user'. แนะนำ script backfill หรือ migration หมายเหตุ (ดู Docs)

### Docs sync
- INDEX_code.md: + `_sync_user_vehicle_role`
- architecture.md: อัปเดต role model — `role_vehicle` ค่าใหม่ `'driver'`/`'approver'` ถูก auto-set (เดิม schema บอก user/admin/approver — เพิ่ม driver + ระบุ auto-sync)
- schema.md user table: `role_vehicle` comment + `'driver'` ในชุดค่า

---

## สรุป DB Impact รวม (Phase 2)
| งาน | DB |
|---|---|
| #1 TripPassenger | **DROP TABLE trip_passenger** (migration) |
| #2 admin edit | ไม่แตะ schema |
| #3+#6 approver badge | ไม่แตะ schema |
| #4 maintenance block | ไม่แตะ schema |
| #7 role sync | ไม่แตะ schema (เปลี่ยนค่าใน column เดิม) |

## เอกสาร sync รวม (หลังจบทั้ง Phase 2)
- `schema.md`: drop trip_passenger (table count 26→25, +Part 2 v2.21) · user.role_vehicle comment
- `INDEX_code.md`: −TripPassenger · +admin_edit_booking, check_vehicle_active, _sync_user_vehicle_role
- `INDEX_routes.md`: +`/vehicle/admin/edit/<id>`
- `INDEX_ui.md`: vehicle_detail.html (edit), vehicle_admin.js (edit), vehicle_approver.html (badge)
- `architecture.md`: role model auto-sync
- `migrations-index.md`: +2026-06-20_drop-trip-passenger.sql

## ⚠️ implementer ต้องอ่านก่อนแก้
1. **`openEventDetail()` ใน vehicle.js** — reference id `detail*` ที่ถูกต้อง (งาน #2 — openAdminBookingDetail ปัจจุบัน id ผิด)
2. โครง `.bk-detail-*` CSS ใน vehicle.css — งาน #2 edit form ใช้ token เดียวกัน
3. ยืนยัน Phase 1 งาน #1 (check_vehicle_conflict) implement หรือยัง — งาน #4 helper อยู่ไฟล์เดียวกัน
4. `manage_users` (auth_view.py) — ตั้ง role_vehicle ได้ค่าอะไรบ้าง (งาน #7 — รองรับ 'driver' ใน dropdown ไหม)
