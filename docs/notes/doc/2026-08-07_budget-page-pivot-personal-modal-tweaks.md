# หน้างบประมาณ — แก้ pivot scope + เงินรับคืน + comma ใน yearlyPlanModal
**วันที่:** 2026-08-07
**สถานะ:** completed

## เป้าหมาย
แก้ไขเพิ่มเติมหลังรอบก่อนหน้า ([2026-08-07_budget-page-filter-delete-fixes.md](2026-08-07_budget-page-filter-delete-fixes.md)):
1. "ภาพรวมทั้งปี" ต้องแสดงเฉพาะงบที่อยู่ในก้อนงบนั้น + เพิ่มแถว "เงินรับคืน" ใต้ "รวมทั้งหมด"
2. แท็บ "เงินรับคืน" ตัดแถวหัว (จำนวนรายการ/฿รับแล้ว-ค้าง) + filter tab ออก เรียงค้างรับขึ้นก่อน+วันที่ล่าสุดก่อน
3. `yearlyPlanModal` number input ใส่ comma คั่นหลักระหว่างพิมพ์

## การตัดสินใจ

**1a. Pivot scope bug (root cause):** `_build_central_dept_pivot()` เดิม filter
`VehicleBudgetLog.created_at` อยู่ในช่วงวันที่ของ plan เท่านั้น ไม่เช็ก `VehicleBudget.yearly_plan_id`
— งบที่ผูกก้อนงบอื่นแต่ log เกิดในช่วงวันเวลาเดียวกัน (ก้อนงบทับซ้อนกัน) หลุดเข้ามาปนผิดๆ
**แก้:** เพิ่ม param `plan_id` filter ด้วย FK ตรงๆ ให้ตรงกับ `_build_pivot_summary`/cap_rows ที่ทำถูก
อยู่แล้ว — เพิ่ม `tests/test_budget_pivot.py` คุม regression

**1b.** เพิ่ม tbody แถว "เงินรับคืน" ใน `#pivotMockupTable` ต่อจาก "รวมทั้งหมด" — ผูก
`pivot.personal`/`pivot.summary.personal.used` ที่มีอยู่แล้วแต่ไม่เคยแสดงในตารางนี้ (แสดงแค่ใน tab
"เงินรับคืน" แยก) ไม่ผูก filter "ประเภทงบ" (ไม่ใช่ central/dept)

**2.** ตัดแถวหัว + `<nav class="bb-tabs">` filter ออกจาก `sectionPersonal` ตามคำขอ — ลบ JS listener
`[data-personal-filter]` ที่กลายเป็น dead code ไปด้วย ย้าย logic "ให้เห็นรายการค้างเด่น" จาก UI filter
ไปเป็น sort ใน `_load_personal_rows()`: `rows.sort(key=lambda r: (r['is_paid'], -date_epoch))`

**3.** `#ypTotal`/`#ypCentral`/`#ypDeptPreview` เปลี่ยนจาก `type="number"` (browser ไม่ยอมให้พิมพ์ comma)
เป็น `type="text" inputmode="numeric"` + JS mask (`bindMoneyInputFormat`, คง caret position ระหว่าง
พิมพ์) ต้อง strip comma ก่อน submit เสมอ (`stripComma`) ทั้ง client (submit handler) และ server
(`_handle_set_yearly_plan`, กันเผื่อ JS ไม่ทำงาน — backend เดิม parse ด้วย `float()` ตรงๆ จะ
`ValueError` ถ้ามี comma หลุดมา)

## ไฟล์ที่แก้ไข
- `app/views/vehicle/vehicle_budget.py` — `_build_central_dept_pivot(plan_id)`, `_load_personal_rows()` sort, `_handle_set_yearly_plan()` comma-strip
- `app/templates/vehicle/admin/vehicle_budget.html` — pivot table แถวใหม่, ตัดส่วนหัว+filter nav ของ personal section, yearlyPlanModal input type
- `app/static/vehicle/js/vehicle_budget.js` — ลบ personal-filter listener, เพิ่ม comma-mask helpers
- `tests/test_budget_pivot.py` — ใหม่ (2 test)
- `docs/notes/INDEX_code.md`, `docs/notes/INDEX_ui.md` — sync

## ผลทดสอบ
`.venv/bin/python -m pytest` → 177 passed (เดิม 175 + เพิ่ม 2 test ใหม่)

## หมายเหตุ
ยังไม่ได้ทดสอบใน browser จริง (dev server เป็น process ของผู้ใช้เอง) — ผู้ใช้ควรลองแท็บ "ภาพรวมทั้งปี"
(เช็กแถวเงินรับคืนใหม่ + ตัวเลขไม่มีงบก้อนอื่นปน), แท็บ "เงินรับคืน" (เรียงลำดับ), และ modal
"ตั้งและแก้ไขงบประมาณ" (พิมพ์ตัวเลขดู comma) ก่อนถือว่าจบ
