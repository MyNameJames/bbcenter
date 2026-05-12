# Admin Mileage Page — หน้าบันทึกเลขไมล์ (Admin)
**วันที่:** 2026-04-24
**สถานะ:** in-progress

## เป้าหมาย
สร้างหน้า `/vehicle/mileage` สำหรับ admin ให้มี:
- Dashboard KPI (งบทั้งปี / ใช้ไปแล้ว / คงเหลือ / รอเบิก personal)
- ตาราง per-vehicle monthly breakdown (12 เดือน ปีปัจจุบัน)
- Filter bar (วันที่, รถ, คนขับ, สถานะ, ช่วงค่าน้ำมัน)
- ตาราง booking (เรียงวันนี้ → ย้อนหลัง, ไม่แสดงอนาคต, group ด้วย date header)
- Checkbox เลือกหลายแถว + summary bar คำนวณระยะทางรวม/ค่าน้ำมันรวมของที่เลือก
- Modal 3 state (ไม่มี record → กรอกออก, มี start → กรอกกลับ + realtime preview, complete → summary)
- Export Excel ตาม filter ปัจจุบัน
- Missing mileage alert (นับรายการที่ยังไม่กรอก)
- Cell drill-down: คลิก cell ใน breakdown table → filter ตาราง booking

## การตัดสินใจ
- **URL คงเดิม `/vehicle/mileage`** — เพราะ sidebar link ผูกอยู่แล้ว + route เดิมเป็น admin-only อยู่แล้ว
- **ย้าย template ไป `vehicle/admin/mileage_admin.html`** — ตรงกับ admin pattern อื่น, ลบของเดิมทิ้ง
- **ไม่แตะ POST logic** — flow บันทึกไมล์/หักงบ/notify ยังทำงานเหมือนเดิม เพียงเพิ่ม GET filter + dashboard
- **CSS เพิ่มใน `vehicle_admin.css`** (ไม่สร้างไฟล์ใหม่) — consistent กับ admin pages อื่น
- **JS ไฟล์ใหม่ `static/js/mileage_admin.js`** — แยกออกจาก vehicle_admin.js เพราะ logic modal + realtime calc + checkbox summary ใหญ่
- **openpyxl มีแล้ว** (requirements.txt) — reuse pattern จาก `cost_export()`

## ไฟล์ที่แก้ไข
- `app/views/vehicle_view.py` — update `mileage_log()` + เพิ่ม `mileage_export()`
- `app/templates/vehicle/admin/mileage_admin.html` — **ใหม่**
- `app/templates/vehicle/vehicle_mileage.html` — **ลบ**
- `app/static/js/mileage_admin.js` — **ใหม่**
- `app/static/css/vehicle_admin.css` — เพิ่ม style สำหรับหน้านี้

## Docs sync checklist
- [x] INDEX.md — Routes + Key Functions + Templates + Design System (JS) + วันที่อัปเดต
- [x] schema-current.md (ไม่แก้ model — ข้าม)
- [x] evolution.md (ไม่แก้ model — ข้าม)
- [x] migrations-index.md (ไม่มี SQL — ข้าม)
- [x] architecture.md (ไม่กระทบ system-level — ข้าม)
- [x] file-map.md — เพิ่ม mileage_admin.html, mileage_admin.js; ลบ vehicle_mileage.html

## รายละเอียดที่ทำ

### Backend (`app/views/vehicle_view.py`)
1. **`mileage_log()` [L908]** — POST logic เดิมไม่แตะ; rewrite GET ทั้งหมด:
   - รับ filter params: `date_start`, `date_end`, `vehicle_id`, `driver_id`, `status_filter`, `cost_min`, `cost_max`
   - กรอง past + today เท่านั้น (ตัดอนาคต) — ใช้ `cutoff = today + 1 day`
   - คำนวณ row-level: distance, fuel_cost (manual override → formula `(distance/fuel_rate)*fuel_price`), status_key
   - Apply status + cost filter หลังคำนวณ (เพราะ fuel_cost เป็น computed)
   - Aggregate KPIs: month_total_cost, total_budget/used/remaining (year), pending_personal_count, missing_count
   - Per-vehicle × month (12-cell array) breakdown สำหรับปีปัจจุบัน
   - Render `vehicle/admin/mileage_admin.html`
2. **`mileage_export()` [L1175]** — Excel export ด้วย openpyxl, sync filter จาก query string

### Template (`app/templates/vehicle/admin/mileage_admin.html`)
ใช้ design-system + sidebar/_header pattern เดียวกับ admin pages อื่น
- Header: back btn → `vehicle.admin_trips`, title, subtitle, missing pill, breakdown toggle, export
- KPI cards 4 ใบ (เดือนนี้ / งบทั้งปี / ใช้ไปแล้ว / คงเหลือ)
- Breakdown table: รถ × 12 เดือน + คอลัมน์ "รวม" + แถว "รวม"; cell คลิกได้ (drill-down)
- Filter bar: 7 fields + กรอง/รีเซต
- Summary strip: 2 mode (ทั้งหมด vs ที่เลือก) — toggle อัตโนมัติเมื่อ check
- Bookings table: date-group header, checkbox, 12 columns, status badge
- Modal 3-state: start / end + realtime preview / complete summary

### JS (`app/static/js/mileage_admin.js`)
- `openMileage()` — เปิด modal เลือก state ตาม odometer_start/end ของ row
- `recalcEndPreview()` — realtime คำนวณตอนพิมพ์ end mileage + validate end > start
- `recalcSummary()` — sum distance + fuel_cost ของ row ที่ check; toggle summary mode
- `drillDown()` — คลิก breakdown cell → set vehicle_id + date_start/end ใน URL
- `clearSelection()`, `toggleBreakdown()`, sync export link

### CSS (`app/static/css/vehicle_admin.css`)
เพิ่ม namespace `.mlg-*` 500+ บรรทัด — ตาม design tokens ห้าม shadow ห้าม colored border-left
- `.mlg-kpi-card`, `.mlg-panel`, `.mlg-breakdown-table` (cell hot/used)
- `.mlg-filter` (CSS grid responsive)
- `.mlg-summary` (selected mode → accent bg)
- `.mlg-table` + `.mlg-date-group` + `.mlg-badge-{complete,partial,none}`
- `.mlg-modal` 3-state + preview + refuel + timestamp
- `@keyframes mlg-pulse` (partial badge), `@keyframes mlg-fade` (state transition)

## Features ที่ทำสำเร็จ
- [x] Dashboard 4 KPI (เดือนนี้ / งบทั้งปี / ใช้ไปแล้ว / คงเหลือ + pending personal)
- [x] Per-vehicle × month breakdown table + cell hot threshold + drill-down
- [x] Filter bar 7 fields (date range, vehicle, driver, status, cost min/max)
- [x] Booking table เรียงวันนี้ → ย้อน, group by date, ไม่แสดงอนาคต
- [x] Checkbox selection + summary bar คำนวณระยะ/ค่าน้ำมันรวม (เลือกได้เฉพาะ status=ครบ)
- [x] Modal 3-state พร้อม realtime preview + validation (end > start)
- [x] Export Excel (sync filter)
- [x] Missing mileage alert (header pill)
- [x] Breakdown panel toggle
- [x] Status badge (ครบ/รอกลับ pulse/รอกรอก)

## หมายเหตุ
- POST logic + notification flow + budget deduction **ไม่แตะ** — ทำงานเหมือนเดิม
- ลบ `vehicle/vehicle_mileage.html` (template เก่า) เพราะ route ชี้ไป template ใหม่แล้ว
- URL `/vehicle/mileage` คงเดิม → sidebar link ไม่ต้องแก้
- ยังไม่ได้ test ใน browser (ผู้ใช้รัน server เอง)

