# งบประมาณ — Simplify action columns + งบหลัก tab + filter chip tweak
**วันที่:** 2026-08-06
**สถานะ:** completed

## เป้าหมาย
ตามคำสั่งผู้ใช้ (ข้อความละเอียดพร้อม field/label ชัดเจน):
1. tab "งบที่ใช้อยู่" — action column เหลือ icon แก้ไข + toggle เปิด/ปิด (ตัด "ปรับยอดใช้ไป" ออกจาก UI, ตัด trigger top-up แยก — top-up ยังกดถึงได้ผ่าน tab ในตัว setBudgetModal เดิม)
2. tab "งบปิดแล้ว" — action column เหลือ icon ลบจริง (ใหม่ ยังไม่เคยมี) + toggle เปิด/ปิด (แทน extendBudgetModal เดิม)
3. tab "รายชื่องบใหญ่" → เปลี่ยนชื่อ "งบหลัก" — ตัด header row (ชื่อ+badge+ปุ่มสร้าง) ออก, ช่วงเวลาเป็น "1 มี.ค. 69 - 28 ก.พ. 70", เพิ่ม action icon แก้ไข ต่อแถว (ก่อน radio default)
4. chip "ปี" (ddPlanYear) เลิก navigate — filter ตัวเลือกใน chip "งบ" (ddYearlyPlan) ฝั่ง client แทน; ddYearlyPlan label เหลือแค่ชื่อ ตัด (start–end) ออก ยังคง navigate เป็น filter จริงเหมือนเดิม

## การตัดสินใจ
- "ลบงบ" ใหม่ทั้งหมด (ไม่เคยมีมาก่อน แต่ mockup delete icon เคยอยู่ใน UI) — บล็อกถ้ามี ledger event นอกจาก set_budget (กันลบงบที่หักเงินจริงไปแล้ว) — ตรงกับ ADR budget mutation ต้องผ่าน service
- top-up ไม่ใช่ trigger แยกอีกต่อไปในตาราง — setBudgetModal มี internal tab (sbModeTabs, data-sb-mode) อยู่แล้วที่สลับ set/topup ในโมดัลเดียว ไม่ต้องสร้างอะไรใหม่ แค่ลบปุ่มซ้ำ
- toggle ใช้ปุ่ม 2 สถานะ (ไม่ใช่ switch component ใหม่ — ไม่มีใน CHEATSHEET, ไม่อยากเพิ่ม component ใหม่โดยไม่ผ่าน design review) ใช้ data-confirm-toggle เดิม ย้ายจาก dropdown menu ออกมาเป็นปุ่มเดี่ยว

## จุดนอก scope ที่เจอระหว่างทำ (ไม่แก้ — จดไว้เสนอ)
- `extendBudgetModal` (template ~835-925) + `wireModal('extendBudgetModal', ...)` (vehicle_budget.js:64) +
  `_handle_extend_period()`/`action=extend_period` dispatch (vehicle_budget.py) **ไม่มีอะไร trigger แล้ว**
  หลังเปลี่ยน "งบปิดแล้ว" tab เป็น toggle ธรรมดา — เป็น dead code ที่เกิดจากงานนี้ตรงๆ แต่ไม่ลบตอนนี้
  เพราะ diff ก้อนนี้ใหญ่แล้ว เสี่ยงพลาดตัดแท็ก HTML กลางโมดัลยาว — แนะนำลบเป็นงาน cleanup แยกทีหลัง

## ไฟล์ที่แก้ไข
- app/services/vehicle/budget_service.py — `delete_budget()` ใหม่ (บล็อกถ้ามี ledger event นอกจาก `set_budget`)
- tests/test_budget_service.py — 4 test ใหม่ (never-used, only-set_budget-log, blocks-on-deduct, blocks-on-adjust)
- app/views/vehicle/vehicle_budget.py — `_handle_delete_budget()` + dispatch, `plan_options` เลิกกรอง `?plan_year=` server-side, `_build_plan_list_rows()` เพิ่ม `start_date_th`/`end_date_th`
- app/templates/vehicle/admin/vehicle_budget.html — action column ย่อ (งบที่ใช้อยู่/งบปิดแล้ว), แท็บ "รายชื่องบใหญ่"→"งบหลัก" (ตัด header, เพิ่ม action col, format ช่วงเวลาไทย), `ddYearlyPlan` option เขียนมือ (data-plan-year-start/end), `yearlyPlanModal` trigger ทุกจุดเพิ่ม `data-plan-*`
- app/static/vehicle/js/vehicle_budget.js — `initYearlyPlanModalMode()` เขียนใหม่ (data-attribute driven), `initPlanYearChip()` เขียนใหม่ (client-side filter แทน navigate), `initPivotFilter()`/action column เดิมไม่แตะเพิ่ม, listener `data-confirm-delete` ใหม่
- docs/notes/INDEX_code.md, INDEX_ui.md, INDEX_routes.md — sync line ref + v2.29 notes

## Docs sync checklist (ก่อน `จบงาน`)
- [x] INDEX_code.md (delete_budget ใหม่, line ref ที่ขยับ)
- [x] INDEX_ui.md (template + JS เปลี่ยนโครง)
- [x] INDEX_routes.md (line ref ขยับ)

## Checklist devloop
- [x] 1 PLAN — log file นี้ (scoped fields มาครบจากข้อความผู้ใช้)
- [x] 2 GUARD — delete = เงิน/สถานะ → เขียน test ก่อน implement (4 test ผ่านก่อน commit logic)
- [x] 3 BUILD — ครบ 4 ข้อ (action column ×2 tab, งบหลัก redesign, chip client-filter)
- [x] 4 VERIFY — pytest ทั้ง suite เขียว (exit 0), py_compile + node --check + jinja parse ผ่านหมด — **UI ยังไม่ได้ verify ใน browser จริง (ผู้ใช้ทดสอบเอง)**
- [x] 5 SYNC — INDEX_code/ui/routes.md ครบ, checker ยืนยันสะอาด (เจอแค่ off-by-1 line ref เล็กน้อย แก้แล้ว + drift เก่าที่ไม่เกี่ยวกับรอบนี้ 2 จุดใน INDEX_routes.md ปล่อยไว้ตามคำแนะนำ checker)
- [x] 6 CLOSE — log → doc/
