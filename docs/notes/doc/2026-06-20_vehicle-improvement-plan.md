# Vehicle Improvement Plan — 6 งาน (2026-06-20)

> **ผู้วาง:** BA/Architect session · **เป้า:** implementer (sonnet effort high) ทำตามได้โดยไม่ต้องเดา
> **อ้างอิงบริบท:** [vehicle_product_spec.md](../vehicle_product_spec.md) · gap analysis session 2026-06-20
> **กฎบังคับทุกงาน:** CLAUDE.md Clean Code (logger ไม่ใช่ print · ≤60 บรรทัด/ฟังก์ชัน · DRY · `flash` generic error) + Flask Response Pattern (AJAX→jsonify, form→flash+redirect)
> **หลัง implement:** sync เอกสารตาม Maintenance Protocol (INDEX_code/INDEX_routes/schema ตามที่ระบุท้ายแต่ละงาน)

ลำดับแนะนำ: **#2 → #1 → #5 → #3 → #6 → #4** (เรียงตาม effort ต่ำ→สูง; #4 ซับซ้อนสุด ทำท้าย)

---

## งาน #1 — Conflict / Capacity Validation (server-side enforce)

### ปัญหา
Logic เช็ครถ/คนขับซ้อนเวลา + capacity **มีอยู่แล้ว** ใน `api_check_merge()` ([vehicle_admin.py:583-701](../../../app/views/vehicle/vehicle_admin.py#L583)) — แต่เป็นแค่ **frontend pre-check** (drag-drop modal เรียกก่อน merge) **ไม่ enforce** ตอน mutate จริง 3 จุด:
- `admin_assign()` ([vehicle_admin.py:444](../../../app/views/vehicle/vehicle_admin.py#L444)) — assign รถ/คนขับเดี่ยว = **ไม่เช็คเลย**
- `admin_merge()` ([vehicle_admin.py:378](../../../app/views/vehicle/vehicle_admin.py#L378)) — เชื่อ frontend
- `admin_swap_vehicle()` ([vehicle_admin.py:358](../../../app/views/vehicle/vehicle_admin.py#L358)) — เปลี่ยนรถ = ไม่เช็ค

### Scoped Command
```
[ไฟล์] app/views/vehicle/vehicle_common.py (helper ใหม่) + vehicle_admin.py (เรียกใช้ 3 จุด + refactor api_check_merge)
[ตำแหน่ง] vehicle_common.py: เพิ่มหลัง _lookup_budget_for_booking() (~line 142)
[งาน] extract conflict/capacity check เป็น helper กลาง + enforce server-side
[ข้อจำกัด] reuse logic เดิมจาก api_check_merge (ห้ามเขียน query ซ้ำ); helper คืน (ok: bool, msg: str|None); AJAX endpoints → jsonify 400
[output] helper 3 ตัว + เรียกใน 3 route + api_check_merge เรียก helper แทน inline
```

### ขั้นตอน
**1.1** เพิ่ม helper ใน `vehicle_common.py` (ใส่ `VehicleBooking`, `Vehicle` ใน import ที่มีอยู่แล้ว):

```python
def check_vehicle_conflict(vehicle_id, start_dt, end_dt, exclude_booking_ids=None):
    """คืน VehicleBooking ที่ใช้รถคันนี้ทับช่วง [start,end) (approved/waiting_approver)
    หรือ None ถ้าว่าง. exclude = id ที่ไม่นับ (ตัวเอง + เพื่อนร่วมทริป)."""
    if not vehicle_id:
        return None
    q = VehicleBooking.query.filter(
        VehicleBooking.assigned_vehicle_id == int(vehicle_id),
        VehicleBooking.status.in_(['approved', 'waiting_approver']),
        VehicleBooking.start_datetime < end_dt,
        VehicleBooking.end_datetime   > start_dt,
    )
    if exclude_booking_ids:
        q = q.filter(VehicleBooking.id.notin_([int(x) for x in exclude_booking_ids]))
    return q.first()


def check_driver_conflict(driver_id, start_dt, end_dt, exclude_booking_ids=None):
    """เหมือน check_vehicle_conflict แต่เช็คคนขับ"""
    if not driver_id:
        return None
    q = VehicleBooking.query.filter(
        VehicleBooking.driver_id == int(driver_id),
        VehicleBooking.status.in_(['approved', 'waiting_approver']),
        VehicleBooking.start_datetime < end_dt,
        VehicleBooking.end_datetime   > start_dt,
    )
    if exclude_booking_ids:
        q = q.filter(VehicleBooking.id.notin_([int(x) for x in exclude_booking_ids]))
    return q.first()
```

**1.2** ใน `admin_assign()` — หลังบล็อก set `booking.trip_department_id` (≈line 489) **ก่อน** `if assign_action == 'reject'` (line 491), เพิ่ม guard เฉพาะ path approve + ทริปอิสระ (ไม่ใช่ ungroup, ไม่ใช่ join trip):

```python
        # งาน #1: conflict guard (เฉพาะทริปอิสระที่กำลัง approve)
        if assign_action != 'reject' and not is_join_trip:
            exclude = [booking.id]
            vconf = check_vehicle_conflict(booking.assigned_vehicle_id,
                                           booking.start_datetime, booking.end_datetime, exclude)
            if vconf:
                return jsonify({'ok': False, 'msg':
                    f'รถคันนี้ถูกใช้ทับช่วงเวลานี้แล้ว (#{vconf.id})'}), 400
            dconf = check_driver_conflict(booking.driver_id,
                                          booking.start_datetime, booking.end_datetime, exclude)
            if dconf:
                return jsonify({'ok': False, 'msg':
                    f'คนขับมีทริปอื่นทับช่วงเวลานี้ (#{dconf.id})'}), 400
```
> import `check_vehicle_conflict, check_driver_conflict` เพิ่มใน import block จาก vehicle_common (line 18-22)

**1.3** ใน `admin_merge()` — หลังคำนวณ `merged` range (merge ใช้ booking หลายตัว: ต้องคำนวณ min start / max end จาก booking_ids ก่อน) **ก่อน** loop อัปเดต (line 410):

```python
    # งาน #1: conflict guard ก่อน commit merge จริง
    sel = [VehicleBooking.query.get(int(b)) for b in booking_ids]
    sel = [b for b in sel if b]
    m_start = min(b.start_datetime for b in sel)
    m_end   = max(b.end_datetime   for b in sel)
    vconf = check_vehicle_conflict(assigned_vehicle_id, m_start, m_end, booking_ids)
    if vconf:
        return jsonify({'ok': False, 'msg': f'รถถูกใช้ทับช่วงนี้แล้ว (#{vconf.id})'}), 400
    if driver_id:
        dconf = check_driver_conflict(driver_id, m_start, m_end, booking_ids)
        if dconf:
            return jsonify({'ok': False, 'msg': f'คนขับมีทริปทับช่วงนี้ (#{dconf.id})'}), 400
```

**1.4** ใน `admin_swap_vehicle()` (line 358) — หลัง validate `new_vehicle_id` (line 366) ก่อน set:

```python
    vconf = check_vehicle_conflict(new_vehicle_id, b.start_datetime, b.end_datetime, [b.id])
    if vconf:
        return jsonify({'ok': False, 'msg': f'รถคันนี้ถูกใช้ทับช่วงเวลานี้ (#{vconf.id})'}), 400
```

**1.5** Refactor `api_check_merge()` — แทน inline conflict query (line 642-664) ด้วย `check_vehicle_conflict`/`check_driver_conflict` (DRY; capacity check คงไว้ inline). คง response shape เดิม

### Edge cases
- ทริปร่วม (join trip / merge) ใช้รถคันเดียวกัน = **ถูกต้อง** → ต้อง exclude `booking_ids`/group members ไม่งั้นจะ false-positive ชนตัวเอง
- `assigned_vehicle_id` ยังไม่กำหนด (None) → helper คืน None (ไม่บล็อก)
- ข้อ 1 ไม่แตะ `book_vehicle_simple` (user ไม่เลือกรถ — ไม่มี conflict)

### DB / Docs
- ❌ ไม่แตะ schema · เพิ่ม index แนะนำ (optional perf): `vehicle_booking(assigned_vehicle_id, start_datetime)`, `vehicle_booking(driver_id, start_datetime)`
- sync: INDEX_code.md §Key Functions เพิ่ม `check_vehicle_conflict`/`check_driver_conflict`

---

## งาน #2 — Cancel Permission (user ก่อนอนุมัติ / admin ทุกเวลา)

### ⚠️ Assumption (ยืนยันก่อนถ้าผิด)
"User cancel ได้ก่อนอนุมัติรถเท่านั้น" ตีความเป็น **status='pending' เท่านั้น** (ก่อน admin assign/forward — เพราะ `admin_assign`/`admin_merge` เปลี่ยน status เป็น `approved`/`waiting_approver` ทันทีที่จัดรถ). เดิม user cancel ได้ `pending` + `waiting_approver`.

### ปัจจุบัน
`cancel_booking()` ([vehicle_booking.py:266-300](../../../app/views/vehicle/vehicle_booking.py#L266)):
- line 276: `if not is_admin and booking.status not in ('pending', 'waiting_approver'):`
- line 282: `if get_bkk_time() >= booking.start_datetime:` ← บล็อก **ทุกคนรวม admin**

### Scoped Command
```
[ไฟล์] app/views/vehicle/vehicle_booking.py
[ตำแหน่ง] cancel_booking() line 276 + line 282
[งาน] user cancel เฉพาะ pending; admin cancel ทุก status cancellable + ข้าม time guard
[ข้อจำกัด] คง soft-cancel (status='cancelled') + notification flow เดิม; ไม่แตะ _build_cancel_recipients
[output] แก้ 2 เงื่อนไข
```

### การแก้
line 276 เปลี่ยนเป็น:
```python
    if not is_admin and booking.status != 'pending':
        flash('ยกเลิกได้เฉพาะก่อนที่ Admin จะจัดรถ — ติดต่อ Admin หากต้องการยกเลิก', 'warning')
        return redirect(url_for('vehicle.detail_booking', booking_id=booking_id))
```
line 282 เปลี่ยนเป็น (admin ข้าม time guard):
```python
    if not is_admin and get_bkk_time() >= booking.start_datetime:
        flash('ทริปเริ่มแล้ว ไม่สามารถยกเลิกได้ — ติดต่อ Admin หากจำเป็น', 'warning')
        return redirect(url_for('vehicle.detail_booking', booking_id=booking_id))
```
> line 279 (`if booking.status not in ('pending','waiting_approver','approved')`) **คงไว้** — เป็น guard ขั้นสุดท้ายกัน cancel ซ้ำ/rejected สำหรับทุก role

### Edge cases
- admin cancel `approved` ที่หักงบแล้ว → spec บอกงบหักตอนปิดทริป (mileage) ซึ่งเกิดหลัง start; admin cancel ก่อน start = ยังไม่หักงบ ปลอดภัย. แต่ **กันไว้:** เพิ่มเช็ค `any(m.budget_deducted_at for m in booking.mileage)` → บล็อก (เหมือน `delete_booking` line 180)
- frontend: ปุ่ม cancel ใน vehicle.js gate ด้วย `canCancel` (ดู index ctx `now`/`is_vehicle_admin`) — sync เงื่อนไขให้ user เห็นปุ่มเฉพาะ pending

### DB / Docs
- ❌ ไม่แตะ schema
- sync: INDEX_code.md `cancel_booking` note + vehicle_product_spec.md §9 (cancel rule)

---

## งาน #3 — Over-budget Warning (ไม่แตะ DB)

### ปัญหา
`BudgetService.deduct_for_mileage()` ([vehicle_budget_service.py:84](../../../app/views/vehicle/vehicle_budget_service.py#L84)) หัก `used_amount` เรื่อยๆ **ไม่เช็คเพดาน** → `remaining` ติดลบเงียบ admin ไม่รู้

### Scoped Command
```
[ไฟล์] app/views/vehicle/vehicle_common.py
[ตำแหน่ง] deduct_budget_for_trip() — หลัง budget_svc.deduct_for_mileage() (≈line 156-162)
[งาน] หลังหักงบ ถ้า budget.remaining < 0 → flash warning + logger.warning (เตือน admin ที่ปิดทริป)
[ข้อจำกัด] ไม่ block การหัก (CLAUDE.md: deduct ไม่ block); ไม่เพิ่ม column/notif type; ใช้ property budget.remaining ที่มีอยู่
[output] เพิ่ม ~6 บรรทัดหลัง deduct
```

### การแก้
ใน `deduct_budget_for_trip()`, ภายใน `if budget:` block หลังเรียก `budget_svc.deduct_for_mileage(...)`:
```python
            budget_svc.deduct_for_mileage(... เดิม ...)
            # งาน #3: เตือนถ้างบเกินเพดาน (ไม่บล็อก — แค่ให้ admin เห็น)
            if float(budget.remaining) < 0:
                current_app.logger.warning(
                    '[budget-over] booking #%s budget #%s remaining=%.2f',
                    booking.id, budget.id, float(budget.remaining))
                flash(
                    f'⚠️ งบ "{_key_label or budget.id}" ใช้เกินเพดานแล้ว '
                    f'(เกิน {abs(float(budget.remaining)):,.2f} บาท) — โปรดเติมงบหรือตรวจสอบ',
                    'warning')
```
> ยืนยัน `VehicleBudget.remaining` เป็น property (schema.md §vehicle_budget "Props: .remaining"). ถ้าไม่มี → ใช้ `float(budget.budget_amount) - float(budget.used_amount)`

### Edge cases
- `deduct_for_mileage` คืน None (idempotent / amount≤0) → `budget.used_amount` ไม่เปลี่ยน, remaining เดิม → เช็คยังปลอดภัย (ไม่ false alarm เพราะถ้าเคยเกินก็เกินจริง)
- ทำเฉพาะ central/department (personal ไม่หักงบ — อยู่คนละ branch)

### DB / Docs
- ❌ ไม่แตะ schema · sync: INDEX_code.md `deduct_budget_for_trip` note

---

## งาน #4 — Auto-close ทริปเปิดค้าง (ใช้ odo_start งานถัดไป = odo_end งานค้าง)

### Concept (จาก user)
ทริปที่กรอกไมล์ออก (odo_start) แล้วไม่ปิด (ไม่กรอก odo_end) → เมื่อ**กรอกไมล์ออกของงานถัดไปของรถคันเดียวกัน** ให้เอาเลขไมล์ออกใหม่นั้นเป็น **เลขปิด (odo_end)** ของทริปค้าง แล้วปิดงบทริปค้างให้อัตโนมัติ

### จุดที่กรอก odo_start (2 ที่)
- admin: `_handle_mileage_start()` ([vehicle_mileage.py:50](../../../app/views/vehicle/vehicle_mileage.py#L50))
- driver: `driver_mileage()` ([vehicle_driver.py:303](../../../app/views/vehicle/vehicle_driver.py#L303)) — **อ่านไฟล์นี้ก่อนแก้** เพื่อหาจุด set odometer_start

### Scoped Command
```
[ไฟล์] app/views/vehicle/vehicle_common.py (helper) + vehicle_mileage.py + vehicle_driver.py (เรียก)
[ตำแหน่ง] helper ใหม่ใน vehicle_common ใกล้ deduct_budget_for_trip; เรียกหลัง set odometer_start ใน 2 จุด
[งาน] auto-close ทริปค้างของรถคันเดียวกันด้วย odo_start ใหม่ + หักงบ/gen OT ทริปค้าง
[ข้อจำกัด] DRY helper เดียวใช้ทั้ง admin+driver; reuse deduct_budget_for_trip + auto_generate_ot; skip ถ้า odo ไม่สมเหตุสมผล
[output] helper _auto_close_stale_trips() + เรียก 2 จุด
```

### Helper (vehicle_common.py)
```python
def _auto_close_stale_trips(vehicle_id, new_odo_start, before_dt, exclude_booking_id):
    """ปิดทริปค้าง (มี odo_start ไม่มี odo_end) ของรถ vehicle_id ที่เริ่มก่อน before_dt
    โดยใช้ new_odo_start เป็น odo_end. หักงบ + gen OT ให้ทริปที่ปิด.
    เรียกตอนกรอกไมล์ออกของงานถัดไป (admin + driver)."""
    if not vehicle_id or new_odo_start is None:
        return
    stale_rows = (VehicleMileage.query
                  .join(VehicleBooking, VehicleMileage.booking_id == VehicleBooking.id)
                  .filter(VehicleBooking.assigned_vehicle_id == vehicle_id,
                          VehicleBooking.id != exclude_booking_id,
                          VehicleBooking.status == 'approved',
                          VehicleMileage.odometer_start.isnot(None),
                          VehicleMileage.odometer_end.is_(None),
                          VehicleMileage.actual_start < before_dt)
                  .all())
    for sm in stale_rows:
        if new_odo_start <= sm.odometer_start:
            current_app.logger.warning(
                '[auto-close skip] mileage #%s: new_odo %s <= start %s',
                sm.id, new_odo_start, sm.odometer_start)
            continue
        sb = sm.booking
        sm.odometer_end = new_odo_start
        sm.actual_end   = sb.end_datetime   # ใช้เวลานัดกลับเป็น actual_end
        db.session.flush()
        ot = auto_generate_ot(sb, sm)
        deduct_budget_for_trip(sb, sm, source='auto_close')
        current_app.logger.info('[auto-close] booking #%s closed by odo %s',
                                 sb.id, new_odo_start)
```
> `deduct_budget_for_trip` commit เองภายใน — ระวัง order; เรียก **หลัง** flush

### จุดเรียก (admin) — ใน `_handle_mileage_start()` หลัง `db.session.flush()` (line 58) ก่อน notify:
```python
    _auto_close_stale_trips(booking.assigned_vehicle_id,
                            mileage.odometer_start, mileage.actual_start, booking.id)
```
> import เพิ่มใน vehicle_mileage.py import block (line 14-19)

### จุดเรียก (driver)
อ่าน `driver_mileage()` หาจุด set `mileage.odometer_start` + `actual_start` → เรียก helper เดียวกันหลัง flush

### Edge cases (สำคัญ — implementer ตรวจครบ)
1. รถใหม่ยังไม่ assign (`assigned_vehicle_id=None`) → helper return ทันที (ไม่ค้นได้)
2. `new_odo_start <= stale.odometer_start` (เลขไมล์ไม่ก้าวหน้า/คนละคันจริง) → skip + log (ไม่หักงบมั่ว)
3. หลายทริปค้าง → ปิดทุกตัวที่ start ก่อน before_dt; แต่ละตัวใช้ odo เดียวกัน → ทริปที่ค้างเก่าสุดควรปิดก่อน. **ปรับ:** order_by `actual_start.asc()` + ปิดเฉพาะตัวล่าสุด (1 ตัว) ปลอดภัยกว่า — *decision: ปิดเฉพาะทริปค้างล่าสุด 1 ตัว* (กัน 2 ทริปได้ odo_end เท่ากันผิด). เปลี่ยน `.all()` → `.order_by(VehicleMileage.actual_start.desc()).first()` แล้วเอาเป็น list 1 ตัว
4. `actual_end = sb.end_datetime` → ถ้า booking ข้ามเวลาแปลก auto_generate_ot จะ guard เอง (trip_e<=trip_s → skip)
5. idempotency: ทริปที่ปิดแล้วจะไม่เข้า query รอบหน้า (odo_end ไม่ None)

> **Decision เลือก edge #3:** ปิดเฉพาะ **ทริปค้างล่าสุด 1 ตัว** ของรถคันนั้น (เพราะ odo_start ใหม่ = odo ต่อจากทริปก่อนหน้าทันที). แก้ helper ให้ใช้ `.order_by(...desc()).first()`

### DB / Docs
- ❌ ไม่แตะ schema · sync: INDEX_code.md เพิ่ม `_auto_close_stale_trips`; vehicle_product_spec.md §A3 (ปิด dead-end ทริปค้าง)

---

## งาน #5 — Trip-group Cancel → reset members เป็น pending

### Concept (จาก user)
"ถ้า trip group ถูก cancel ให้ย้อนกลับเป็น pending ให้หมด"

### ⚠️ Assumption
booking ที่ถูกสั่ง cancel → `cancelled` (ตามเจตนา user ที่กดยกเลิก). **สมาชิกอื่น**ใน trip_group → กลับ `pending` + เคลียร์การจัดสรร (un-merge) เพื่อให้ admin จัดใหม่ — ไม่ถูกลากไป cancelled ตามทั้งกลุ่ม

### ปัจจุบัน
`cancel_booking()` set `status='cancelled'` (line 290) แต่ **ไม่แตะ trip_group members** (มีแค่ notify mate)

### Scoped Command
```
[ไฟล์] app/views/vehicle/vehicle_booking.py
[ตำแหน่ง] cancel_booking() try-block หลัง set booking.status='cancelled' (≈line 290) ก่อน commit
[งาน] ถ้า booking.trip_group → members อื่นกลับ pending + เคลียร์ assigned_vehicle_id/driver_id/trip_group; booking เองเคลียร์ trip_group
[ข้อจำกัด] ไม่ reset member ที่หักงบแล้ว (budget_deducted_at) — flash เตือนแทน; reuse notify mate เดิม
[output] เพิ่ม ~10 บรรทัด
```

### การแก้
ใน try-block หลัง `booking.status = 'cancelled'`:
```python
        # งาน #5: cancel สมาชิกทริปร่วม → reset เป็น pending (un-merge)
        if booking.trip_group:
            mates = VehicleBooking.query.filter(
                VehicleBooking.trip_group == booking.trip_group,
                VehicleBooking.id != booking.id,
            ).all()
            for mb in mates:
                if any(m.budget_deducted_at for m in mb.mileage):
                    continue  # หักงบแล้ว — ไม่ reset (กัน ledger เพี้ยน)
                mb.status              = 'pending'
                mb.assigned_vehicle_id = None
                mb.driver_id           = None
                mb.trip_group          = None
            booking.trip_group = None  # ตัวที่ cancel ออกจากกลุ่มด้วย
```
> วางหลัง `_send_cancel_notifications` (line 289) เพื่อให้ mate ยังได้ notify ก่อน reset (notify อ่าน trip_group)

### Edge cases
- group เหลือสมาชิกเดียวหลัง reset → ปกติ (กลับเป็น booking เดี่ยว pending)
- member หักงบแล้ว → ข้าม + ควร flash เตือน admin ว่ามีบางตัว reset ไม่ได้
- ลำดับ: notify mate (ใช้ trip_group) **ก่อน** เคลียร์ trip_group — ห้ามสลับ

### DB / Docs
- ❌ ไม่แตะ schema · sync: INDEX_code.md `cancel_booking` note; vehicle_product_spec.md §5 (กฎ leader cancel — ปิด dead-end)

---

## งาน #6 — OT Attribution Analytics (งานไหน OT เยอะ + personal ที่ยังไม่เรียกเก็บ)

### บริบท (จาก user — สำคัญ)
ตอนนี้ **ไม่จัดสรรงบ OT** → ใช้งบกลาง admin จ่าย. 3-4 เดือนหลัง OT พุ่งขึ้น งบกลางอาจไม่พอ. ต้องการ **เก็บข้อมูล**ว่า OT มาจาก**งานส่วนไหนเยอะสุด** เพื่อบริหารให้ลงตัว + **flag OT งานส่วนตัว (personal) ที่ควรเรียกเก็บจาก user** (ปัจจุบัน admin ไม่ทันสังเกต → จ่ายเองบ่อย). **ช่วงนี้ = เก็บข้อมูล ยังไม่ auto-charge**

### ฐานข้อมูลที่มีอยู่ (ไม่ต้องเพิ่ม DB)
- `DriverOT.booking_id` → `booking.expense_type` (central/department/personal) + sub (`central_category`/`trip_department`)
- `_apply_budget_filter()` ([vehicle_cost.py:15](../../../app/views/vehicle/vehicle_cost.py#L15)) join + filter by expense ทำได้แล้ว
- `_ot_budget_label()` ([vehicle_cost.py:105](../../../app/views/vehicle/vehicle_cost.py#L105)) คืน (label, sub) ต่อ OT แล้ว

### Scoped Command
```
[ไฟล์] app/views/vehicle/vehicle_cost.py (+ template vehicle/admin/vehicle_cost.html)
[ตำแหน่ง] cost_summary() (line 183); helper ใหม่ใกล้ _build_ot_pivot()
[งาน] (a) summary OT by expense_type+sub (งานไหนเยอะ) (b) flag personal OT ที่ยังไม่เรียกเก็บ
[ข้อจำกัด] derive จาก DriverOT.booking (ไม่แตะ schema); standalone OT (booking_id=None)='ไม่ระบุ'; ตาราง zendenta data-table; lucide icon
[output] helper 2 ตัว + context เพิ่ม + UI section ในหน้า cost
```

### Helper (vehicle_cost.py)
```python
def _build_ot_by_expense(ots):
    """รวม OT (live) ตามประเภทงาน → list เรียงยอดมากสุด.
    ใช้ตอบ 'OT มาจากงานส่วนไหนเยอะที่สุด'."""
    agg = {}  # key=(et, sub_label) → {amount, hours, count}
    for o in ots:
        if o.is_deleted:
            continue
        label, sub = _ot_budget_label(o.booking)  # ('ส่วนกลาง'/'ส่วนกอง'/'จ่ายเอง'/'—', sub)
        key = (label, sub or '')
        a = agg.setdefault(key, {'amount': 0.0, 'hours': 0.0, 'count': 0})
        a['amount'] += float(o.total_amount)
        a['hours']  += float(o.total_hours)
        a['count']  += 1
    rows = [{'label': k[0], 'sub': k[1], **v} for k, v in agg.items()]
    return sorted(rows, key=lambda r: r['amount'], reverse=True)


def _personal_uncollected(ots):
    """OT ของงานส่วนตัว (personal) ที่ยังไม่เรียกเก็บ = unpaid + ไม่ใช่ no_receipt.
    flag ให้ admin เห็น (ปัจจุบันมักจ่ายเองโดยไม่เรียกเก็บ)."""
    items = [o for o in ots
             if not o.is_deleted and o.booking
             and o.booking.expense_type == 'personal'
             and o.status == 'unpaid' and not o.no_receipt]
    total = round(sum(float(o.total_amount) for o in items), 2)
    return items, total
```

### เรียกใน `cost_summary()` (หลัง `kpi = _calc_ot_kpi(...)` line 207)
```python
    ot_by_expense           = _build_ot_by_expense(kpi['live'])
    uncollected, uncoll_sum = _personal_uncollected(kpi['live'])
```
เพิ่มใน `render_template(...)`:
```python
        ot_by_expense=ot_by_expense,
        uncollected_count=len(uncollected), uncollected_sum=uncoll_sum,
```

### UI (vehicle_cost.html)
- การ์ด/ตารางใหม่ "OT แยกตามประเภทงาน" — column: ประเภท · หมวด/กอง · ชม. · ยอด · จำนวน (เรียงยอดมากสุด)
- แถบเตือน "OT งานส่วนตัวที่ยังไม่เรียกเก็บ: {uncollected_count} รายการ ({uncollected_sum} บาท)" — ลิงก์ filter `budget_type=personal&status=unpaid`
- กฎ table: `class="table data-table mb-0"` (ห้าม table-hover/striped/bordered — CLAUDE.md) · icon lucide

### Edge cases
- standalone OT (`booking_id=None`) → `_ot_budget_label(None)` คืน `('—','')` → กอง "ไม่ระบุ"
- ใช้ `kpi['live']` (ตัด is_deleted แล้ว) — สอดคล้อง pivot เดิม

### DB / Docs
- ❌ ไม่แตะ schema · sync: INDEX_code.md เพิ่ม `_build_ot_by_expense`/`_personal_uncollected`; INDEX_ui.md (vehicle_cost.html section ใหม่)

---

## สรุป DB Impact รวม
**ทั้ง 6 งาน — ไม่มี migration / ไม่เพิ่ม column / ไม่เพิ่มตาราง**
- index แนะนำ (optional, perf เท่านั้น): `vehicle_booking(assigned_vehicle_id, start_datetime)`, `vehicle_booking(driver_id, start_datetime)` — ทำเมื่อ conflict check ช้า

## เอกสารที่ต้อง sync หลังจบ (รวม)
- `INDEX_code.md` §Key Functions: + `check_vehicle_conflict`, `check_driver_conflict`, `_auto_close_stale_trips`, `_build_ot_by_expense`, `_personal_uncollected`; แก้ note `cancel_booking`, `deduct_budget_for_trip`
- `INDEX_ui.md`: vehicle_cost.html section ใหม่
- `vehicle_product_spec.md`: §5 (leader cancel), §9 (cancel rule), §A3 (ทริปค้าง) — ปิด dead-end ที่ระบุใน gap analysis
- `INDEX_routes.md`: ไม่มี route ใหม่ (ทุกงานแก้ใน route เดิม) — ไม่ต้อง sync

## ⚠️ จุดที่ implementer ต้องอ่านโค้ดเพิ่มก่อนแก้
1. `driver_mileage()` (vehicle_driver.py) — หาจุด set odometer_start สำหรับงาน #4
2. ยืนยัน `VehicleBudget.remaining` เป็น property จริง (models/vehicle_budget.py) สำหรับงาน #3
3. `vehicle_cost.html` โครงปัจจุบัน — หาที่วาง section งาน #6
4. `vehicle.js` — ปุ่ม cancel gating สำหรับงาน #2 (frontend sync)
