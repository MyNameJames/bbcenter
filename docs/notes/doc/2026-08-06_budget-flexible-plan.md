# งบประมาณ — Flexible Yearly Plan (งบพิเศษ + filter ปี/งบ)

> **สร้าง:** 2026-08-06 · **สถานะ:** พร้อมมอบหมาย (ผู้วางแผนไม่ใช่ผู้ทำ — เกิดจากบทสนทนา consult ล้วนๆ ยังไม่แตะ code)
> **หน้า:** `vehicle_budget.html` — [app/templates/vehicle/admin/vehicle_budget.html](../../../app/templates/vehicle/admin/vehicle_budget.html) + [app/views/vehicle/vehicle_budget.py](../../../app/views/vehicle/vehicle_budget.py) + [app/services/vehicle/budget_service.py](../../../app/services/vehicle/budget_service.py) + [app/models/vehicle_budget.py](../../../app/models/vehicle_budget.py)
> **อ่านก่อนเริ่ม:** [vehicle_product_spec.md](../vehicle_product_spec.md) · [design_guideline.md](../design_guideline.md) · [.claude/rules/vehicle-domain.md](../../../.claude/rules/vehicle-domain.md) · [CHEATSHEET.md](../../../app/components/CHEATSHEET.md)

---

## 0. บริบท — ทำไมต้องทำ

ตอนนี้ "เงินก้อนประจำปี" (`VehicleBudgetYearlyPlan`) ผูกกับความเข้าใจ "1 ปีงบ = 1 ก้อน" (label auto-gen จาก `fiscal_year`, WIP modal ปัจจุบันมีข้อความ "สร้างงบประจำปีได้ปีละ 1 ครั้ง" ค้างอยู่ — **ข้อความนี้ผิด ต้องลบ**) เจ้าของต้องการเปิดให้สร้าง **"งบพิเศษ"** แยกจากงบประจำปีได้ทุกเมื่อ (เช่น ทริปดูงานต่างประเทศ ตั้งช่วงเวลาของตัวเอง หักงบของตัวเอง แยกจากงบประจำปีปกติ) โดยไม่ต้องมีตารางใหม่ — ใช้โครง `VehicleBudgetYearlyPlan` → `VehicleBudget` เดิมได้เลย (ยืนยันจากอ่าน schema จริงแล้ว — ดู §1 ข้อจำกัด/ข้อค้นพบ)

**ข้อค้นพบสำคัญระหว่าง consult (จำเป็นต้องรู้ก่อนแตะโค้ด):**
- `set_yearly_plan()` ไม่มี check "1 ปี 1 plan" อยู่แล้ว (`fiscal_year` เลิก UNIQUE ตั้งแต่ v2.26) → สร้าง plan ใหม่ได้อิสระโดยไม่ต้องแก้ service layer
- `_lookup_budget_for_booking()` เลือก budget ที่ `start_date` ล่าสุดเมื่อซ้อนกัน → งบพิเศษที่สร้างทีหลังจะถูกหักก่อนงบประจำปีอัตโนมัติในช่วงที่ทับกัน **ไม่ต้องแก้ logic หักงบเลย**
- `_build_budget_pivot()` เดินตาม `plan.start_date..end_date` เป็นเดือนๆ อยู่แล้ว (ไม่ล็อก 12 เดือน) → plan สั้นๆ ไม่พัง แค่คอลัมน์น้อยลง
- ตัวที่ **ชนจริง** คือ `VehicleBudget.__table_args__` UniqueConstraint (บรรทัด 64 ใน [models/vehicle_budget.py](../../../app/models/vehicle_budget.py)) `(budget_type_id, department_id, year, month)` — ไม่มี `yearly_plan_id` ร่วม → ถ้าแผนกเดียวกันมีทั้งงบประจำปีและงบพิเศษตกเดือนเดียวกัน insert จะชน ต้องแก้ (ดู §2)

---

## 1. ข้อจำกัดร่วม (ห้ามละเมิด — ทุก task)

1. **Budget mutation ทุกจุดผ่าน `budget_service.py` เท่านั้น** — ห้ามแก้ `used_amount`/`budget_amount`/`is_active` ตรงๆ ใน controller (`.claude/rules/vehicle-domain.md`)
2. **ห้ามแตะ logic หักงบ (`deduct_for_mileage`/`_lookup_budget_for_booking`)** — งานนี้ scope แค่ schema เสริม + UI filter/list ตามที่ยืนยันแล้วว่า logic เดิมรองรับอยู่แล้ว
3. **Design:** ใช้ `--bb-*` token + component จาก CHEATSHEET.md · ตาราง = `data-table` · ห้าม inline `<script>` ใน modal (JS อยู่ใน `.js`)
4. **Architecture:** ADR 0001 — logic แตะเงิน/สถานะห้ามอยู่ controller ต้องอยู่ service
5. **SQLite:** เปลี่ยน UniqueConstraint ต้อง rebuild ตาราง (SQLite ไม่รองรับ `DROP CONSTRAINT` ตรงๆ) — pattern เดียวกับ v2.26 migration ที่เคยทำมาก่อน

---

## 2. Schema changes (migration ใหม่)

### 2.1 `vehicle_budget_yearly_plan` — เพิ่ม 2 คอลัมน์

| Field | ชนิด | ค่าเริ่มต้น | เหตุผล |
|---|---|---|---|
| `name` | String(100) nullable | prefill ฟอร์ม = `"งบประมาณประจำปี "` (แก้ได้) | แยก "งบพิเศษ ทริป X" ออกจาก "งบประมาณประจำปี" — ตอนนี้ label auto-gen จาก `fiscal_year` เท่านั้น แยกไม่ได้ |
| `is_default` | Boolean NOT NULL default False | — | Plan ที่จะถูกเลือกอัตโนมัติเมื่อเข้าหน้าโดยไม่ระบุ `?plan_id=` — ตั้งได้แค่ 1 plan ที่ `is_default=True` ในคราวเดียว (บังคับที่ service layer ไม่ใช่ DB constraint) |

### 2.2 `vehicle_budget` — แก้ UniqueConstraint

```
เดิม: UniqueConstraint('budget_type_id', 'department_id', 'year', 'month')
ใหม่: UniqueConstraint('budget_type_id', 'department_id', 'year', 'month', 'yearly_plan_id')
```

**เหตุผล:** แผนกเดียวกัน+ประเภทเดียวกัน+เดือนเดียวกัน แต่อยู่คนละ plan (ประจำปี vs พิเศษ) ต้องสร้างได้ทั้งคู่ — ยืนยันกับเจ้าของแล้วว่าให้นับเป็นคนละ record แยกกันเสมอ (ดู consult §1)

**ผลข้างเคียงที่ต้องรู้:** งบเก่าก่อน v2.26 ที่ `yearly_plan_id IS NULL` — SQL (SQLite/Postgres) ถือว่า NULL แต่ละแถวไม่เท่ากันเอง unique constraint จึงไม่ชนกันเองอยู่แล้ว ไม่กระทบข้อมูลเก่า

**Migration file:** `app/migrations/2026-08-XX_vehicle-budget-yearly-plan-flexible.sql` (ตาม convention ต้องมี entry ใน [migrations-index.md](../../../app/migrations/migrations-index.md) + [schema.md](../database/schema.md) Part 1+2 — ดู §6)

---

## 3. Service layer (`budget_service.py`)

### Task S1 — `set_yearly_plan()` รับ `name`

```
[ไฟล์]     app/services/vehicle/budget_service.py
[ตำแหน่ง]  set_yearly_plan() (บรรทัด 162)
[งาน]      เพิ่ม param `name: str = ''` → set ใน insert/update ทั้ง 2 branch (plan เดิม/ใหม่)
[ข้อจำกัด] ไม่เปลี่ยน signature เดิมของ param อื่น (positional ต้องยังเรียกจากที่เดิมได้)
[output]   plan.name ถูกบันทึกตามที่ admin กรอกในฟอร์ม
```

### Task S2 — เพิ่ม `set_default_plan()`

```
[ไฟล์]     app/services/vehicle/budget_service.py
[ตำแหน่ง]  ใหม่ ต่อจาก set_yearly_plan() (~หลังบรรทัด 209)
[งาน]      รับ plan_id → validate start_date<=today<=end_date (raise ValueError ถ้าไม่ครอบวันนี้)
           → unset is_default ของ plan อื่นทั้งหมด → set plan นี้ True
[ข้อจำกัด] ทำใน 1 transaction เดียว (query update .is_default=False ทั้งตาราง ก่อน set True ตัวที่เลือก)
[output]   มี plan เดียวที่ is_default=True เสมอ (หรือไม่มีเลยถ้ายังไม่เคยตั้ง)
```

---

## 4. Controller (`views/vehicle/vehicle_budget.py`)

### Task C1 — Default plan ตอนเข้าหน้าไม่ระบุ `plan_id`

```
[ไฟล์]     app/views/vehicle/vehicle_budget.py
[ตำแหน่ง]  budget_manage() บรรทัด 534–547 (logic เลือก yearly_plan ปัจจุบัน)
[งาน]      ลำดับความสำคัญใหม่: (1) ?plan_id= ที่ระบุมา (2) plan ที่ is_default=True ถ้ายังครอบวันนี้อยู่
           (3) fallback เดิม (plan ที่ครอบวันนี้ เรียง start_date desc) (4) ไม่มีเลย → empty state เดิม
[ข้อจำกัด] ไม่เปลี่ยน behavior เดิมของ (3)/(4) — เพิ่มแค่เช็ค is_default แทรกก่อน
[output]   เข้าหน้าเปล่าๆ (ไม่มี ?plan_id) → เห็น plan ที่ admin ตั้ง default ไว้ (ถ้ายัง valid)
```

### Task C2 — "ปี" filter (chip ใหม่ นำหน้า "งบ")

```
[ไฟล์]     app/views/vehicle/vehicle_budget.py
[ตำแหน่ง]  budget_manage() ใกล้บรรทัด 548 (plan_options query)
[งาน]      derive รายการปี (พ.ศ.) ทั้งหมดที่มี plan ทับช่วงอยู่ — distinct ปีจาก
           range(plan.start_date.year, plan.end_date.year+1) ของทุก plan (ปีปฏิทิน ไม่ใช่ label fiscal_year)
           รับ ?year= จาก query string → filter plan_options เหลือเฉพาะ plan ที่ overlap ปีที่เลือก
[ข้อจำกัด] ใช้ start_date/end_date จริงเท่านั้น ห้ามอิง fiscal_year label (พิมพ์เองพลาดได้)
[output]   chip "ปี 2569" → เห็นทั้ง "งบประจำปี 2568" (จบ ก.พ.69) และ "งบประจำปี 2569" (เริ่มมี.ค.69)
```

### Task C3 — ตัด "กอง" chip (`ddPivotDept`)

```
[ไฟล์]     app/views/vehicle/vehicle_budget.py + vehicle_budget.html
[ตำแหน่ง]  py: บรรทัด 524 (dept_dept_names) + 584 (ส่งเข้า template) · html: บรรทัด 59–63 (ue_chip_dd 'กอง')
[งาน]      ลบ chip "กอง" ทั้ง query var (ถ้าไม่ใช้ที่อื่นแล้ว) และ template block
[ข้อจำกัด] เช็คก่อนว่า dept_dept_names ไม่ได้ใช้จุดอื่นในไฟล์เดียวกัน (ถ้าใช้ที่อื่น อย่าลบ var แค่ไม่ render chip)
[output]   เหลือ 3 chip: ปี → งบ → ประเภทงบ
```

### Task C4 — Tab ใหม่ "รายชื่องบใหญ่"

```
[ไฟล์]     app/views/vehicle/vehicle_budget.py
[ตำแหน่ง]  budget_manage() — เพิ่ม query ใหม่ต่อจาก plan_options
[งาน]      list ทุก VehicleBudgetYearlyPlan พร้อม sum จัดสรรแล้ว/ใช้ไป ต่อ plan
           (สูตรเดียวกับที่ _handle_set_yearly_plan ใช้เช็ค allocated-so-far — บรรทัด 244–254 — generalize เป็น loop ทุก plan)
[ข้อจำกัด] ไม่ query ซ้ำกับ pivot ของ plan ที่เลือกอยู่ (คนละ concern — อันนี้คือ list ภาพรวมทุก plan)
[output]   ตาราง: ชื่องบ / ช่วงเวลา / เงินทั้งก้อน / จัดสรรแล้ว / ใช้ไป / [radio ตั้ง default]
```

---

## 5. Template (`vehicle_budget.html`)

### Task T1 — แก้ `yearlyPlanModal` (เก็บกวาด WIP ที่ค้างอยู่)

```
[ไฟล์]     app/templates/vehicle/admin/vehicle_budget.html
[ตำแหน่ง]  ~บรรทัด 969–1140 (yearlyPlanModal ทั้งบล็อก — มี WIP ค้างจากรอบก่อน)
[งาน]      1) ลบข้อความ "สามารถสร้างงบประจำปี ได้ปีละ 1 ครั้ง" (ผิด ขัดกับ direction นี้)
           2) เพิ่ม field "ชื่องบ" ที่ผูก name="name" จริง (ไม่ใช่ name="total_amount" ที่ชนกับ field เงินก้อน — bug ใน WIP ปัจจุบัน)
              prefill value="งบประมาณประจำปี " ตอนสร้างใหม่
           3) ลบ input ช่วงวันที่แบบแยก วัน/เดือน/ปี (6 ช่อง name="central_allocation" ซ้ำ — ของ WIP ค้าง ผิดทั้งหมด)
              เหลือ date-picker เดิม (bb-dp, บรรทัด ~1027 เดิม) ที่ผูก field จริงอยู่แล้ว
           4) ลบ input "เงินประจำปี"/"งบส่วนกลาง"/"งบส่วนกอง" ชุดซ้ำที่ WIP เพิ่มมา (ชุดเดิมด้านล่างมีอยู่แล้วสมบูรณ์กว่า — มี hint ยอดจัดสรรแล้ว)
[ข้อจำกัด] ก่อนแก้ ต้องดู diff เดิมทั้งก้อนก่อน (ผู้ใช้ทำ WIP ค้างไว้หลายจุด อย่าเดา ต้องอ่านทั้ง modal ก่อนตัดสินใจว่าอันไหนเก็บอันไหนทิ้ง)
[output]   modal เดียว ไม่มี field ซ้ำ ไม่มีข้อความขัดแย้งกับ flow ใหม่
```

### Task T2 — Chip ใหม่ "ปี" (นำหน้า "งบ")

```
[ไฟล์]     app/templates/vehicle/admin/vehicle_budget.html
[ตำแหน่ง]  บรรทัด 35–48 (ue_chip_dd 'เลือกก้อนงบ')
[งาน]      เพิ่ม ue_chip_dd ใหม่ id='ddYearFilter' นำหน้า ddYearlyPlan — radio single-select
           ต่อ event 'ue-chip:change' → navigate ?year= (คล้าย initYearlyPlanChip เดิม)
[ข้อจำกัด] ue_chip_dd/ue_chip_opt component เดิม (จาก _components/bb/ue_chip.html) ไม่ต้องสร้างใหม่
[output]   เลือกปี → ddYearlyPlan เหลือเฉพาะ plan ที่ overlap ปีนั้น
```

### Task T3 — Tab ใหม่ "รายชื่องบใหญ่" + radio ตั้ง default

```
[ไฟล์]     app/templates/vehicle/admin/vehicle_budget.html
[ตำแหน่ง]  บรรทัด 138–143 (tab2_tabs list) + เพิ่ม section เนื้อหา tab ใหม่
[งาน]      เพิ่ม tab value ใหม่ (เช่น 'plans') + ตาราง list plan (จาก Task C4)
           แต่ละแถวมี radio "ตั้งเป็นค่าเริ่มต้น" — disabled ถ้า NOT (start_date<=today<=end_date)
[ข้อจำกัด] ตาราง = data-table (ห้าม table-striped ฯลฯ) · radio ต้องมี tooltip อธิบายว่าทำไม disabled (ตาม guideline accessibility)
[output]   เห็นทุก plan ในระบบ (ประจำปี+พิเศษ) พร้อมตั้ง default ได้จากตรงนี้
```

---

## 6. Maintenance Protocol — sync ก่อนปิดงาน

| แก้ | ต้องอัปเดต |
|---|---|
| column ใหม่ (`name`, `is_default`) + constraint เปลี่ยน | `app/migrations/2026-08-XX_*.sql` + `migrations-index.md` + `schema.md` Part 1 (ตาราง) + Part 2 (v2.28 entry พร้อมเหตุผล) |
| function ใหม่ (`set_default_plan`) | `INDEX_code.md` § Key Functions |
| route/query param ใหม่ (`?year=`) | `INDEX_routes.md` ถ้ามี route เปลี่ยน signature |
| template เปลี่ยนโครง (tab ใหม่, chip ใหม่) | `INDEX_ui.md` § Templates |
| ลบ chip "กอง" | เช็ค `design_guideline.md` ว่ามีอ้างอิงถึงไหม (ไม่คิดว่ามี แต่เช็คให้ชัวร์) |

**ก่อน mark เสร็จ:** spawn `checker` agent (บังคับตาม CLAUDE.md)

---

## 7. นอก scope รอบนี้ (อย่าเพิ่งทำ)

- ❌ ไม่แตะ logic หักงบ/`_lookup_budget_for_booking` — ยืนยันแล้วว่ารองรับ multi-plan อยู่แล้ว
- ❌ ไม่ทำ "ประเภท plan" เป็น enum/column แยก (annual/special) — ตามที่เจ้าของยืนยัน ใช้ `name` free-text พอ
- ❌ ไม่ทำ multi-default (default ต่อแผนก) — 1 default ทั้งระบบพอสำหรับรอบนี้ ถ้าต้องการละเอียดกว่านี้ค่อยคุยรอบหน้า
- ❌ ไม่แก้ reskin 5 modal เดิม (setBudget/topUp/adjust/extend/refund) — ค้างจากงานก่อนหน้า (ดู comment บรรทัด 4–6 ของไฟล์) ไม่ใช่ scope งานนี้

---

## 8. ลำดับแนะนำ

```
2 (schema) ──> S1, S2 (service) ──> C1..C4 (controller) ──> T1..T3 (template)
```

ทำ schema+service ก่อนเสมอ (ฐานของทุกอย่างข้างบน) แล้วค่อย controller→template ตามลำดับ — T1 (เก็บกวาด WIP) ทำแยกได้เลยตั้งแต่ต้นถ้าอยากเคลียร์ก่อน ไม่ต้องรอ schema ใหม่ (แค่ลบของเดิมที่ผิดออก ไม่เพิ่ม field ใหม่ในขั้นนั้น)
