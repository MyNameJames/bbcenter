# Fuel Management Page — หน้าจัดการค่าน้ำมัน (Admin)
**วันที่:** 2026-05-04
**สถานะ:** in-progress (Phase 1-3 ✓ เสร็จ, Phase 4 รอทำ)

---

## เป้าหมาย

สร้างหน้า `/admin/fuel` สำหรับ vehicle admin ใช้บันทึกค่าน้ำมัน + จัดการเงินสำรอง + รวมบิลส่งเบิก + ตามรอยจนได้เงินคืน

### Flow การทำงาน (จาก user)
```
คนขับเติมน้ำมัน
   → เอาบิลมาเบิกเงินกับ admin
   → admin จ่ายเงินจากเงินสำรอง
   → admin กรอกบิลในระบบ (status: รอเบิก)
   → admin รวมหลายบิลเป็น 1 ใบเบิก (status: อนุมัติ)
   → admin กรอกเลขใบเบิก
   → admin นำใบเบิกไปเบิกเงินกับต้นสังกัด
   → admin ได้เงินคืน → mark received_at (status: ได้เงิน)
```

### Status (computed, ไม่เก็บ column)
- **รอเบิก** = `bill.reimbursement_id IS NULL`
- **อนุมัติ** = `reimbursement_id NOT NULL` AND `received_at IS NULL`
- **ได้เงิน** = `received_at NOT NULL`

---

## Requirement สรุป (จากการถามตอบ user)

| ข้อ | คำตอบ |
|---|---|
| Permission | vehicle admin only (`is_vehicle_admin()`) |
| รถ / ผู้เติม | ต้องเลือกจาก Vehicle / Driver ในระบบ (ไม่ free text) |
| ช่องทางชำระ | radio 3 ตัว: เงินโอน / ตัดบัตร / จ่ายเอง |
| transfer + self → หักเงินสำรอง, card → ไม่หัก | |
| เงินสำรอง | config ในหน้า admin + บันทึกประวัติ adjustment + **note required** |
| ราคาน้ำมัน/ลิตร | ตาราง time-effective — ใช้คำนวณ fuel_cost ใน mileage_log (Phase 3) |
| แก้/ลบบิล | ทุกสถานะแก้ได้ (กระทบใบเบิกที่ส่งไปแล้วก็ยอม) |
| เลขใบเบิก | user กรอกเอง (ไม่ generate อัตโนมัติ) |
| Filter | ปี / เดือน / รถ / พนักงาน |
| Export | Excel + PDF |
| Mobile | ใช้บางครั้ง (ฟอร์มกรอกบิลที่ปั๊ม) |
| แนบรูปสลิป | **ไม่ต้องการ** |
| Match กับ mileage | ถ้า `(vehicle_id, mileage)` ตรงกับ FuelBill row → badge "เติมน้ำมัน" ในหน้า mileage |
| คงเหลือตอนนั้น | compute on-the-fly (ไม่ snapshot ลง column) |

---

## Layout (locked, ใช้ Bootstrap row/col)

```
┌─ KPI Row ─────────────────────────────────────┐
│ เงินสำรอง │ คงเหลือ │ ใช้ไป │ งบทั้งปี │ ใช้แล้ว │ คงเหลืองบ │
└───────────────────────────────────────────────┘
┌─ Collapsible: Pivot รถ × เดือน ───────────────┐
└───────────────────────────────────────────────┘
┌─ row ─────────────────────────────────────────┐
│ ┌─ col-8 ─────────────┐ ┌─ col-4 ──────────┐ │
│ │ Card: บิลเบิก       │ │ Card: ใบเบิกรวม  │ │
│ └─────────────────────┘ └──────────────────┘ │
└───────────────────────────────────────────────┘
```

---

## Phase 1 — DB + Backend ✓ (2026-05-04 เสร็จ + ทดสอบ)

### 5 ตารางใหม่ (models.py:510-595)

| Table | หน้าที่ |
|---|---|
| `fuel_bill` | บิลเดี่ยว — date, vehicle_id, driver_id, amount, payment_method, mileage, FK→reimbursement |
| `fuel_reimbursement` | ใบเบิกรวม — reimbursement_no, source, submitted_at, received_at (1:N FuelBill) |
| `fuel_price` | ราคา/ลิตร time-effective — `get_for_date(target_date)` static method |
| `fuel_reserve_config` | เงินสำรอง singleton id=1 — `get_amount()` static method |
| `fuel_reserve_log` | ประวัติ adjustment — note **NOT NULL** (force reason) |

### Migration
- `app/migrations/2026-05-04_add-fuel-management.sql` — 5 CREATE TABLE + 7 indexes + seed FuelPrice จาก SystemConfig['fuel_price']
- Run: `sqlite3 app/instance/portal.db < ...sql`
- Backup: `portal.db.backup-2026-05-04`
- DB seeded: reserve_config id=1 amount=0, fuel_price 1 row (40 บาท/ลิตร migrated)

### Blueprint `fuel_bp` — 13 routes

| Method | Path | Function |
|---|---|---|
| GET | `/admin/fuel` | `admin_fuel()` — KPI + bills + reimbursements + pivot |
| POST | `/admin/fuel/bill` | `create_bill()` |
| POST | `/admin/fuel/bill/<id>/edit` | `edit_bill()` |
| POST | `/admin/fuel/bill/<id>/delete` | `delete_bill()` |
| POST | `/admin/fuel/reimbursement` | `create_reimbursement()` — รวมบิลที่เลือก |
| POST | `/admin/fuel/reimbursement/<id>/edit` | `edit_reimbursement()` |
| POST | `/admin/fuel/reimbursement/<id>/receive` | `receive_reimbursement()` — mark ได้เงิน |
| POST | `/admin/fuel/reimbursement/<id>/delete` | `delete_reimbursement()` — detach bills back to รอเบิก |
| POST | `/admin/fuel/reserve` | `adjust_reserve()` — +/- with required note |
| POST | `/admin/fuel/price` | `add_price()` — effective-dated upsert |
| POST | `/admin/fuel/price/<id>/delete` | `delete_price()` |
| POST | `/admin/fuel/annual-budget` | `set_annual_budget()` — SystemConfig['fuel_annual_budget'] |
| GET | `/api/fuel/bill-by-mileage` | `api_bill_by_mileage()` — Phase 3 mileage badge lookup |

### Template Phase 1 stub
- `app/templates/vehicle/admin/admin_fuel.html` — standalone HTML (no base)
- มีโครงสร้าง KPI + pivot collapsible + col-8/col-4 ครบ
- **ยังไม่มี form modal** — ใช้ DevTools fetch() ทดสอบได้
- Fix: ลบ `{% extends %}` 2 บรรทัดที่ทำให้ `TemplateRuntimeError: extended multiple times`

### ไฟล์ที่แก้ไข Phase 1
- `app/models.py` (+5 models, lines 510-595)
- `app/views/fuel_view.py` **ใหม่**
- `app/templates/vehicle/admin/admin_fuel.html` **ใหม่**
- `app/migrations/2026-05-04_add-fuel-management.sql` **ใหม่**
- `app/app.py` — register `fuel_bp`

### Docs sync checklist Phase 1
- [x] INDEX.md — Blueprints + Routes + Models + Templates
- [x] schema-current.md — 5 tables added (count 21→26)
- [x] evolution.md — v2.7 entry with reasons
- [x] migrations-index.md — new row
- [x] checker agent verified 8/8 ✓

---

## Phase 2 — UI หลัก (pending)

### Goal
เปลี่ยน Phase 1 stub เป็นหน้าจริงที่ใช้งานได้:
- ใช้ shared `_sidebar.html` + `_header.html` (extends pattern เดียวกับหน้า admin อื่น)
- KPI cards ใช้ design tokens (`--ds-*`) + spacing ตาม design system
- Modal form ทุก action (ไม่ใช้ inline form หน้าหลัก)
- Filter bar (ปี/เดือน/รถ/พนักงาน)
- Mobile-friendly (modal full-screen ที่ < 992px)

### ไฟล์ที่จะสร้าง/แก้
- `app/templates/vehicle/admin/admin_fuel.html` — **rebuild** ทั้งหมด
- `app/templates/vehicle/admin/fuel-modal-bill.html` — modal กรอก/แก้บิล
- `app/templates/vehicle/admin/fuel-modal-reimbursement.html` — modal รวมบิล + edit
- `app/templates/vehicle/admin/fuel-modal-reserve.html` — modal ปรับเงินสำรอง + ดูประวัติ
- `app/templates/vehicle/admin/fuel-modal-price.html` — modal ตั้งราคาน้ำมัน + ประวัติ
- `app/static/css/fuel_admin.css` — page-specific styles
- `app/static/js/fuel_admin.js` — modal control, checkbox summary, filter, AJAX
- Update INDEX.md (Templates + Design System CSS/JS)
- Add link ใน `_sidebar.html` (section admin) → `/admin/fuel` ไอคอน `fa-gas-pump`

### Components — ลำดับ implement
1. **KPI cards (6 ใบ)** — ใช้ `.card` + `.ds-number-md`
   - Layer A (เงินสำรอง): เงินสำรอง / คงเหลือ / ใช้ไป
   - Layer B (งบรายปี): งบทั้งปี / ใช้แล้ว / คงเหลืองบ
   - Color: คงเหลือ = `ds-text-success` ถ้า > 0, `ds-text-danger` ถ้า ≤ 0
   - กดปุ่ม "ตั้งค่า" บน card "เงินสำรอง" → เปิด modal reserve
   - กดปุ่ม "ตั้งค่า" บน card "งบทั้งปี" → modal เล็กกรอกตัวเลข

2. **Filter bar** — inline ใน card header หรือ sticky bar
   - ปี: dropdown 5 ปีย้อนหลัง + ปัจจุบัน
   - เดือน: 1-12 + "ทั้งปี" (default = ทั้งปี)
   - รถ: select จาก Vehicle (มี "ทั้งหมด")
   - พนักงาน: select จาก Driver (มี "ทั้งหมด")
   - ปุ่ม "ล้าง filter"
   - Submit แบบ GET (URL params) เพื่อให้ bookmark ได้

3. **Bill table (col-8)**
   - Header buttons: `+ บิลใหม่`, `รวมบิลที่เลือก` (disabled ถ้าไม่เลือก/ไม่ใช่สถานะ "รอเบิก"), `Export Excel`, `Export PDF`
   - Columns: ☐ checkbox | วันที่ | รถ | ผู้เติม | จำนวน | ช่องทาง | ไมล์ | คงเหลือตอนนั้น | สถานะ | actions (✏️ ลบ)
   - Status badge: รอเบิก = warning, อนุมัติ = accent, ได้เงิน = success
   - คลิก row → ไม่ทำอะไร (กัน click พลาด); ปุ่ม edit/delete ชัดเจน
   - Empty state: "ยังไม่มีบิลในช่วงที่เลือก" + ปุ่ม "+ บิลใหม่"

4. **Reimbursement table (col-4)**
   - Columns: เลขใบเบิก | วันส่ง | วันได้เงิน | จำนวนบิล | รวมเงิน | สถานะ
   - คลิก row → expand inline แสดง bill list ของใบเบิกนั้น (accordion)
   - Action buttons: "บันทึกได้เงิน" (ถ้ายังไม่ได้รับ), "✏️ แก้ไข", "ลบ" (detach bills)
   - Empty: "ยังไม่มีใบเบิก"

5. **Pivot collapsible**
   - 12 columns (เดือน) × N rows (รถ); footer = sum ต่อเดือน
   - Heatmap subtle (Phase 4 จะ polish)
   - Default collapsed (ไม่แสดงตอนเปิดหน้า)

### Modal specs

**Modal บิลใหม่ (`#fuelBillModal`)** — ใช้ทั้ง create + edit
| Field | Type | Required | Default |
|---|---|---|---|
| วันที่ | date | ✓ | today |
| รถ | select Vehicle (license_plate + brand+model) | ✓ | — |
| ผู้เติม | select Driver (active only) | ✓ | — |
| จำนวนเงิน | number step=0.01 | ✓ | — |
| ช่องทาง | radio (เงินโอน / ตัดบัตร / จ่ายเอง) | ✓ | เงินโอน |
| เลขไมล์ | number | optional | — |
| หมายเหตุ | textarea | optional | — |

- Submit → POST `/admin/fuel/bill` (create) or `/admin/fuel/bill/<id>/edit`
- ปุ่ม "ลบ" ใน edit mode → confirm dialog → POST delete

**Modal รวมบิล (`#fuelReimbModal`)**
- แสดง list บิลที่ checked (read-only) + total
- กรอก: เลขใบเบิก* (required), แหล่งเบิก, วันที่ส่ง (default today), หมายเหตุ
- Submit → POST `/admin/fuel/reimbursement` พร้อม `bill_ids[]`
- Validate frontend: ทุกบิลต้อง status = รอเบิก เท่านั้น

**Modal เงินสำรอง (`#fuelReserveModal`)**
- แสดง current amount เด่นๆ
- Form: change_amount (signed: + เพิ่ม / - ลด), note* (required)
- ตารางประวัติ 20 รายการล่าสุด: change | new_balance | note | by | when
- Submit → POST `/admin/fuel/reserve`

**Modal ราคาน้ำมัน (`#fuelPriceModal`)**
- ตารางประวัติ: effective_date | price/liter | note | by | actions (delete)
- Form ใหม่: effective_date* + price_per_liter* + note
- Submit → POST `/admin/fuel/price`
- Delete → POST `/admin/fuel/price/<id>/delete` พร้อม confirm

### Mobile UX
- Sidebar collapse < 992px (เหมือนหน้าอื่น)
- Modal `modal-fullscreen-lg-down` (Bootstrap class)
- Filter bar → stack column < 768px
- Bill table → horizontal scroll; reimbursement card → collapse ขึ้นไปอยู่บน bill (col-12 ทั้งสอง stacked)

### Acceptance Criteria
- [ ] หน้าโหลดได้ ไม่ error ใน console
- [ ] KPI ทั้ง 6 แสดงค่าถูก (cross-check กับ DB query manual)
- [ ] +บิลใหม่ → save → reload → row ใหม่ขึ้น
- [ ] แก้บิล → save → ค่าใหม่แสดงถูก
- [ ] ลบบิล → confirm → row หาย, KPI re-calc
- [ ] Checkbox 2 บิล "รอเบิก" → ปุ่มรวมบิลเปิด → save → 2 บิลเปลี่ยนเป็น "อนุมัติ" + ใบเบิกใหม่ขึ้นทางขวา
- [ ] บันทึกได้เงิน → ใบเบิก + บิลทั้งหมดเป็น "ได้เงิน" + เงินสำรอง KPI re-calc
- [ ] ลบใบเบิก → บิลกลับเป็น "รอเบิก"
- [ ] ปรับเงินสำรอง +5000 พร้อม note → KPI เพิ่ม + ประวัติบันทึก
- [ ] เพิ่มราคาน้ำมัน 2026-05-10 = 42 → ตารางประวัติแสดง
- [ ] Filter ปี/เดือน/รถ/คนขับ → table filter ถูกต้อง + URL params bookmark ได้
- [ ] Mobile: modal full-screen, sidebar collapse OK

### กฎ design (ตาม CLAUDE.md / design_system.md)
- No shadow → border only
- Radius 4–6px
- Icons: `fa-solid` ทุก field เทคนิค (วันที่/ไมล์/รถ/คนขับ/เงิน)
- ห้าม inline `<script>` ใน modal — JS ไป `fuel_admin.js`
- Bootstrap utility classes ก่อน custom CSS
- Sarabun font (default ของระบบ)

---

## Phase 3 — Integration กับ mileage (pending)

### Goal
เชื่อม FuelPrice + FuelBill กับหน้า mileage_admin

### Tasks
1. **เปลี่ยน fuel_price source ใน vehicle_view.py 5 จุด**
   ```
   794:  fuel_price = float(SystemConfig.get('fuel_price', 0) or 0)
   1124: fuel_price = float(SystemConfig.get('fuel_price', '40'))
   1152: fuel_price = float(SystemConfig.get('fuel_price', '40'))
   1338: fuel_price = float(SystemConfig.get('fuel_price', '40'))
   1582: (cost_export — ตรวจหาเพิ่ม)
   ```
   เปลี่ยนเป็น:
   ```python
   from models import FuelPrice
   fuel_price = FuelPrice.get_for_date(target_date) or float(SystemConfig.get('fuel_price', '40'))
   ```
   `target_date` ที่ใช้:
   - `mileage_log()` per-row: `m.actual_end.date() if m.actual_end else b.start_datetime.date()`
   - Aggregations: ใช้ค่าราคาเฉลี่ยถ่วงน้ำหนักย้อนหลังตามจริง (per-row lookup ไม่ใช้ค่าเดียว)

2. **Mileage page badge "เติมน้ำมัน"**
   - **Approach:** pre-compute set ใน view function (ไม่ query ใน template loop)
     ```python
     refuel_keys = {(b.vehicle_id, b.mileage)
                    for b in FuelBill.query.with_entities(
                        FuelBill.vehicle_id, FuelBill.mileage
                    ).filter(FuelBill.mileage.isnot(None)).all()}
     ```
   - ส่งเข้า template, lookup `(vehicle_id, odometer_end) in refuel_keys`
   - แสดง badge `<span class="ds-badge ds-badge-info">⛽ เติมน้ำมัน</span>` ข้างเลขไมล์
   - Badge tooltip: "มีบิลค่าน้ำมันที่เลขไมล์นี้" + click → link ไป `/admin/fuel?...`

3. **VehicleMileage.refuel field cohabit**
   - field เดิม `VehicleMileage.refuel/refuel_amount/refuel_img` — ยัง keep (ใช้ตอน driver กรอกระหว่างทาง)
   - FuelBill = official record ของ admin
   - ทั้งคู่อยู่ร่วมกันได้ — driver_mileage UX ไม่กระทบ

4. **Cleanup**
   - เก็บ `SystemConfig['fuel_price']` ไว้เป็น fallback (อย่าลบ — backward compat)
   - **ตัดสินใจ:** keep fuel_price form ใน `budget_manage.html` (ใช้แก้ค่า fallback) หรือเอาออก → user decide ตอน Phase 3

### ไฟล์ที่จะแก้
- `app/views/vehicle_view.py` — 5 จุด + import FuelPrice
- `app/templates/vehicle/admin/mileage_admin.html` — เพิ่ม badge logic + pre-compute set
- (อาจ) `app/templates/vehicle/admin/budget_manage.html` — ลบ fuel_price form ถ้าไม่ใช้

### กฎ
- Maintenance Protocol: budget deduction 2 จุด (`mileage_log()` + `driver_mileage()`) **ต้องแก้คู่กันเสมอ**
- Test edge case: ถ้า FuelPrice ยังไม่มี row ใดเลย → fallback 40 (avoid None × float)
- Spawn `notifee` agent หลังแก้ — เพราะกระทบ budget calculation
- Spawn `guide-vehicle` agent หา line ปัจจุบันก่อนแก้ (vehicle_view.py ~1900 lines, line numbers อาจ shift)

### Acceptance Criteria
- [ ] บันทึกไมล์เก่า (วันที่ย้อนหลัง 3 เดือน) ใช้ราคาน้ำมัน ณ วันนั้นจริง
- [ ] บันทึกไมล์ใหม่วันนี้ ใช้ราคาล่าสุด
- [ ] หน้า mileage_admin row ที่ตรงกับ FuelBill mileage → badge "⛽ เติมน้ำมัน" ขึ้น
- [ ] ลบ FuelPrice ทุก row → fallback ไป SystemConfig['fuel_price'] = 40 ไม่ error
- [ ] driver_mileage flow ยังทำงานเหมือนเดิม (regression test)
- [ ] Cost export Excel ราคาน้ำมัน per-row ถูกต้อง

---

## Phase 4 — Export + Pivot polish (pending)

### Tasks
1. **Excel export** — `GET /admin/fuel/export/excel?<filters>`
   - openpyxl (ใช้แล้วในโปรเจกต์)
   - 3 sheets:
     - **บิล** — วันที่ | รถ | ผู้เติม | จำนวน | ช่องทาง | ไมล์ | สถานะ | เลขใบเบิก
     - **ใบเบิก** — เลขใบเบิก | แหล่งเบิก | วันส่ง | วันได้เงิน | จำนวนบิล | รวมเงิน
     - **Pivot** — รถ (row) × เดือน 1-12 (col) — มี header "รวมทั้งปี" คอลัมน์สุดท้าย
   - Filename: `fuel_<year>_<month>_<vehicle>_<date>.xlsx`
   - Format ตาม `mileage_export()` pattern (vehicle_view.py:1175)
   - Header style: bg `#F4F4F5` + bold; numeric col → number format `#,##0.00`

2. **PDF export** — `GET /admin/fuel/export/pdf?<filters>`
   - Render HTML print-friendly (ไม่ใช้ weasyprint) — ผู้ใช้กด Ctrl+P เอง
   - Template: `vehicle/admin/admin_fuel_print.html`
     - Logo + ชื่อหน่วยงาน + ช่วงข้อมูล (ปี/เดือน/รถ)
     - KPI summary 6 ตัวเลข
     - ตารางบิล + ตารางใบเบิก
     - Footer: ผู้พิมพ์ + วันที่พิมพ์ + เลขหน้า
   - CSS `@media print { ... }`: hide sidebar/header, font-size ~11px, no page-break inside row

3. **Pivot รถ × เดือน** — polish
   - Sticky first column (รถ) — `position: sticky; left: 0`
   - Color heatmap ตามจำนวนเงิน (background: linear scale ของ `--ds-accent-light` → `--ds-accent`)
   - Footer row: รวมต่อเดือน
   - Right column: "รวมทั้งปี" ต่อรถ
   - Click cell → filter table (vehicle_id + month) → drill-down เหมือน mileage page

### ไฟล์ที่จะสร้าง/แก้
- `app/views/fuel_view.py` — เพิ่ม `export_excel()` + `export_pdf()` + helper `_filtered_query()` reuse
- `app/templates/vehicle/admin/admin_fuel_print.html` **ใหม่**
- `app/static/css/fuel_admin.css` — pivot styles + print media query
- `app/static/js/fuel_admin.js` — pivot drill-down (click cell → set filter URL)

### Acceptance Criteria
- [ ] Excel โหลดได้ + เปิดใน Microsoft Excel + Numbers + LibreOffice
- [ ] Excel filter ที่ส่งใน URL ตรงกับข้อมูลที่ออก
- [ ] Excel header มี style + numeric format ถูก
- [ ] PDF print แล้วไม่มี sidebar/header รบกวน + page-break เหมาะสม
- [ ] Pivot heatmap แสดงสีถูกตามค่า (high = darker)
- [ ] Click cell ใน pivot → filter ตารางบิลด้านล่าง

---

## Phase 5 — Polish + Future (optional, after Phase 4)

### Possible improvements
1. **Notification ตอนได้เงินคืน** — แจ้ง admin ว่าใบเบิก X ได้เงินคืนแล้ว (เก็บประวัติ)
2. **Auto-suggest เลขใบเบิก** — ดูจากใบเบิกล่าสุดในแหล่งเดียวกัน (เช่น "บางบาล" → จ69-00164 → suggest จ69-00165)
3. **Bulk import บิล** — paste จาก Excel (CSV) เพื่อนำเข้าเร็ว
6. **Budget alert** — ถ้า used > 80% ของ annual budget → แสดง warning
7. **Vehicle-level budget** — ให้มีการแจ้งในการใช้ร
8. **Reserve auto-sync** — เมื่อใบเบิกได้เงินคืน → reserve เพิ่มอัตโนมัติเท่าจำนวนบิลใน reimbursement

> เก็บไว้ใน `future_features.md` (ไม่ implement ตอนนี้) เมื่อ Phase 4 เสร็จ

---

## Decisions / สิ่งที่ต้องระวัง

1. **`is_vehicle_admin()` ซ้ำ** — duplicated ใน fuel_view.py (line 32) เพราะ blueprint แยกไฟล์ + ไม่อยาก import จาก vehicle_view.py (~1900 lines). อาจ refactor เป็น `auth_helpers.py` ทีหลัง — ตอนนี้ยอม

2. **คงเหลือตอนนั้น (balance_after)** — compute โดย iterate bills เรียงตามวันที่ chronologically, deduct เฉพาะ payment_method ที่ depletes reserve (transfer/self). ไม่ snapshot ลง column เพราะถ้าแก้ย้อนหลัง drift หมด

3. **`SystemConfig['fuel_price']` keep alive** — Phase 3 ไม่ลบ key เก่า ใช้เป็น fallback เพื่อ backward compat

4. **Migration rerun safety** — ใช้ `CREATE TABLE IF NOT EXISTS` แต่ INSERT seed ไม่กัน duplicate → ถ้า rerun จะ fail ที่ INSERT (transaction rollback). เคยเกิด — บนเครื่อง dev ครั้งแรก. แก้: เพิ่ม `INSERT OR IGNORE` ในรอบหน้า ถ้าต้องการ idempotent

5. **No telegram/notification ในหน้านี้** — admin internal use, ไม่ต้องแจ้งใคร

6. **Annual budget config** — ใช้ `SystemConfig['fuel_annual_budget']` (ไม่สร้าง column ใหม่ใน FuelReserveConfig) เพื่อหลีกเลี่ยง migration เพิ่ม

7. **payment_method semantics**
   - `transfer` (เงินโอน) → admin โอนเงินจากเงินสำรองให้คนขับ → reserve **ลด**
   - `card` (ตัดบัตร) → ใช้บัตรเครดิตบริษัท ตัดตรง → reserve **ไม่กระทบ**
   - `self` (จ่ายเอง) → คนขับจ่ายก่อน admin จ่ายคืนภายหลัง → reserve **ลด** (เหมือน transfer)
   - การคำนวณ `reserve_used` ใน admin_fuel() ใช้ `_depletes_reserve(method)` ที่ return True สำหรับ transfer/self

8. **Edit/Delete กระทบ Reimbursement** — แก้/ลบบิลที่อยู่ใน reimbursement ที่ส่งไปแล้ว (status=อนุมัติ/ได้เงิน) จะทำให้ยอดรวมในใบเบิกผิด — user ยอมรับความเสี่ยงนี้แล้ว แต่ Phase 2 อาจเตือนผ่าน confirm dialog ก่อนแก้

---

## Progress Log

| Date | Phase | Status | หมายเหตุ |
|---|---|---|---|
| 2026-05-04 | 1.1 — DB models + migration | ✓ done | db-helper agent gen + sync 4 docs |
| 2026-05-04 | 1.2 — Blueprint fuel_view.py | ✓ done | 13 routes |
| 2026-05-04 | 1.3 — Register fuel_bp | ✓ done | app.py |
| 2026-05-04 | 1.4 — INDEX.md sync | ✓ done | checker agent verified 8/8 |
| 2026-05-04 | 1.5 — Migration applied | ✓ done | DB seeded, backup created |
| 2026-05-04 | 1.6 — Bug fix template extends | ✓ done | ลบ duplicate `{% extends %}` |
| 2026-05-05 | 2.0 — Design direction = Vercel | ✓ done | user confirm A2+B1+C1 (vc namespace + Lucide global + Geist Mono global) |
| 2026-05-05 | 2.1 — `--vc-*` tokens foundation | ✓ done | append section 8 ใน design-system.css + utility `.vc-mono/.vc-caption/.vc-icon*/.vc-scope` |
| 2026-05-05 | 2.2 — Lucide + Geist Mono CDN | ✓ done | เพิ่มใน `_header.html` (preconnect + auto createIcons on DOMContentLoaded) |
| 2026-05-05 | 2.3 — KPI cards (6 ใบ) | ✓ done | สร้าง `fuel_admin.css` + rebuild `admin_fuel.html` (sidebar/header shell + 2× vc-card×3 cells, Geist Mono numbers, Lucide icons wallet/target/etc.). Bills/reimb/pivot ยัง stub รอ 2.4–2.7. เพิ่ม sidebar link `bi-fuel-pump` |
| 2026-05-05 | 2.4 — Bill table | ✓ done | เพิ่ม `.vc-card-head/.vc-table/.vc-badge/.vc-empty` ใน fuel_admin.css. Rebuild bills card: card-head with merge/Excel/บิลใหม่ buttons (disabled→2.6/2.7), checkbox col (disabled→2.6), 48px row, mono numbers right-align, payment-method neutral badge, status pill with dot (warning/blue/success), kebab actions, empty state with CTA. Thai date format DD MMM YYYY+543 |
| 2026-05-05 | 2.5 — Reimbursement table | ✓ done | list-card pattern (col-4 แคบ ใช้ table ปกติไม่เหมาะ). เพิ่ม `.vc-list/.vc-collapse/.vc-table-sm/.vc-meta-grid/.vc-action-row` ใน fuel_admin.css. Each rb = `<details>` row: head shows เลข+status pill, meta `วันส่ง · N บิล · ฿total`, chevron rotate 180°. Body: compact bills table + meta-grid (แหล่ง/วันส่ง/วันได้เงิน/note) + actions (บันทึกได้เงิน/แก้ไข/ลบ disabled→2.6). Empty state ชี้ผู้ใช้ไปใช้ปุ่ม "รวมบิล" ในตารางซ้าย |
| 2026-05-05 | 2.6 — Modals × 5 + JS | ✓ done | เพิ่ม fuel_admin.css §16-20 (form input/radio segmented/modal skin/history). สร้าง 5 modals: `fuel-modal-{bill,reimbursement,reserve,price,budget}.html` + `fuel_admin.js` (215 lines). Wire data-* attrs ใน admin_fuel.html (bill rows, reimb action buttons, KPI ตั้งค่า, header price button). JS: checkbox→merge enable, kebab→edit prefill, reimb receive/edit/delete via dynamic form, reserve live preview, Lucide re-init on `shown.bs.modal` |
| 2026-05-05 | 2.7 — Filter bar + Pivot polish | ✓ done | filter bar GET form (year/month/vehicle/driver) + auto-submit JS. Pivot รถ×เดือน table (heatmap cell, sticky first col, footer sum, total col). docs synced |
| 2026-05-06 | 3.1 — FuelPrice integration 5 จุด | ✓ done | vehicle_view.py L794/1125/1153/1347/1838 ใช้ `FuelPrice.get_for_date()` + fallback SystemConfig['fuel_price']. Per-row aggregation ใน mileage_log/export ใช้ `td = m.actual_end.date() or b.start_datetime.date()` |
| 2026-05-06 | 3.2 — Badge "⛽ เติมน้ำมัน" mileage_admin | ✓ done | refuel_keys set pre-computed ใน mileage_log() L1294-1296 + lookup ใน mileage_admin.html L388-396 (.mlg-badge inline style); link ไป `/admin/fuel?vehicle_id=...` |
| 2026-05-06 | 3.3 — driver_mileage cohabit | ✓ done | VehicleMileage.refuel/refuel_amount/refuel_img keep ไว้ (driver กรอกระหว่างทาง) — FuelBill = official admin record |
| 2026-05-06 | 3.4 — Bug fix budget month | ✓ done | mileage_log L1131 + driver_mileage L1848: เปลี่ยน `now2.year/month` → `target_date.year/month` เพื่อให้บันทึกย้อนหลังหักงบเดือนที่ trip จบจริง ไม่ใช่เดือนปัจจุบัน. notifee verified safe |
| 2026-05-06 | 3.5 — Verification | ✓ done | user ทดสอบ 6 acceptance criteria ใน browser ผ่านหมด |
| 2026-05-06 | 3.6 — Cleanup decision | keep | budget_manage.html fuel_price form **เก็บไว้** (Option C). Risk: 2 ที่ตั้งค่าราคา (budget_manage = SystemConfig fallback / fuel admin = FuelPrice table) — user อาจสับสน, ค่าใน budget_manage จะใช้เฉพาะตอน FuelPrice empty หรือ get_for_date คืน None |
| 2026-05-06 | 4.1 — Excel export | ✓ done | `export_excel()` route fuel_view.py:499. Helper `_read_filters()`/`_filtered_bills_query()` ใช้ร่วม `admin_fuel()` reduce duplication. 3 sheets (บิล/ใบเบิก/Pivot) honor year/month/vehicle/driver filter. Wire ปุ่ม Excel ใน admin_fuel.html (เดิม disabled). Filename `fuel_<year>_<month>_<vehicle>_<date>.xlsx`. INDEX.md sync (route count 13→14) |
| — | 4.2 — PDF print template | skipped | user ข้ามไปทำ 4.3 ก่อน |
| 2026-05-06 | 4.3 — Pivot drill-down click | ✓ done | (heatmap/sticky/footer/total col ทำเสร็จใน 2.7) เพิ่ม `<a class="vc-pivot-link">` ครอบ value + row-total + col-total → URL filter (year+vehicle+month preserved) + `#billsCard` anchor scroll. `id="billsCard"` ติดบน bills card. CSS `.vc-pivot-link` + `:has()` hover boost ใน fuel_admin.css. ไม่ใช้ JS — middle-click/bookmark ทำงานได้ |
| — | 5 — Future improvements | optional | เก็บใน future_features.md |

---

## Test credentials
- `pjatuporn` / `Animajamelove072` (admin)
- Bypass: `http://localhost:5001/dev/login/pjatuporn`
- URL: `http://localhost:5001/admin/fuel`
