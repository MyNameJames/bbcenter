# Future Features

> รายการ feature ที่ยังไม่ได้ทำ — เพิ่มที่นี่เมื่อมีการสั่งว่า "ไว้เป็น future feature"

---

## รายการ

| # | Feature | Module | บริบท / หมายเหตุ | วันที่บันทึก |
|---|---------|--------|------------------|-------------|
| 1 | Telegram notify สำหรับ dept approver | Vehicle | แจ้งเตือน approver ระดับแผนกเมื่อมี booking ใหม่ที่ต้องอนุมัติ | 2026-04-18 |
| 2 | Badge notification system | Vehicle Admin | แสดงจำนวน pending bookings บน sidebar / header icon | 2026-04-18 |
| 3 | OT cost feature | Vehicle | คำนวณค่าล่วงเวลาสำหรับคนขับ | 2026-04-18 |
| 4 | Emil micro-interaction polish | Vehicle Admin | animation 6 จุด: card hover lift, status dot pulse, approve ripple, week chip slide, group collapse ease, action button press | 2026-04-18 |
| 5 | notifyDept — แจ้ง Telegram แผนก (A-1) | Vehicle Admin | ปุ่ม "แจ้ง Telegram" ในส่วน AFTER / renderTripRow สำหรับ expense_type='department' ยังเป็น placeholder ต้องสร้าง endpoint + fetch + toast | 2026-04-19 |
| 6 | แสดงชื่อผู้ประสานงานกองใน assign modal | Vehicle Admin | กองที่ไม่มี approver_id ใน VehicleBudget จะไม่แสดงชื่อ — ควรเพิ่ม UI บอกว่า "ยังไม่ได้ตั้ง" หรือ fallback ค้นจาก User.role_vehicle='approver' | 2026-04-19 |
| 7 | ลบ function รถ 2 คัน | Vehicle | กฎหลัก: ไม่อนุมัติรถ 2 คันต่อ booking — ให้ลบ assigned_vehicle2_id, driver2_id, vehicle2Label และ route/template ที่เกี่ยวข้องทั้งหมด | 2026-04-19 |
| 8 | In-App Notification — Repair / Maintenance / Room | Repair, Maintenance, Room | ขยาย notification system ไปโมดูลอื่น (ตอนนี้ทำเฉพาะ Vehicle) — ใช้ notification_service.py เป็น base, เพิ่ม `notify_*` functions ตามแต่ละโมดูล | 2026-04-23 |
| 9 | Notification preferences per-user | Auth | ให้ user เลือกว่าจะรับ notification แบบไหน (toast/email/telegram) per-category — เพิ่ม table `user_notification_pref` | 2026-04-23 |
| 10 | รายชื่อผู้อนุมัติแต่ละงบส่วนกอง (Manage Fleet) | Vehicle Admin | ใน `/admin/manage-fleet` เพิ่มส่วนแสดง/จัดการรายชื่อผู้อนุมัติ (approver) ของแต่ละ VehicleBudget ส่วนกอง — ตอนนี้เก็บแค่ `approver_id` ต่อ 1 กอง อาจต้องรองรับหลายคน | 2026-04-24 |
| 11 | AJAX / Response Pattern documentation | CLAUDE.md | document Flask response pattern ที่ใช้จริง (jsonify format, flash+redirect, error response) เพื่อให้ AI ไม่ต้องเดา format | 2026-04-25 |
| 12 | Naming Convention section ใน CLAUDE.md | CLAUDE.md | explicit rule สำหรับ blueprint naming, view function naming, template file naming convention | 2026-04-25 |

---

## วิธีใช้

| 13 | Phase 5.3 — ลบ inline `style=""` ใน templates | Frontend | ไฟล์ที่มีมากสุด: `mileage_admin.html` (112 จุด, ส่วนใหญ่เป็น dynamic Jinja values เช่น width/color จาก data), `design_system_reference.html` (86, token swatches), `dashboard.html` (73). กลยุทธ์: สร้าง CSS class สำหรับ patterns ที่ซ้ำ (font-size/color combos), คง dynamic width/color ที่ขึ้นกับ Jinja data ไว้เป็น inline | 2026-05-16 |
| 14 | budget_manage — Personal pivot (deferred จาก Phase 7) | Vehicle Admin | Phase 7 redesign (2026-05-22) ทำได้แค่ central + dept pivots จาก `VehicleBudget` table. **Personal pivot ทำไม่ได้ตรงๆ** เพราะ `BudgetType` enum มีแค่ `central`/`department` (ไม่มี `personal`). Personal data จริงอยู่ที่ `VehicleMileage.personal_paid_at` + `expense_type='self'`. ถ้าจะทำต้อง: (a) decide rows = ต่อ user หรือต่อ dept (b) aggregate `VehicleMileage.fuel_cost` (override) หรือ compute จาก distance/fuel_rate*price (c) filter `personal_status=1` (d) group by `extract('month', personal_paid_at)` + fiscal year mapping เดิม. ใช้ pattern `_build_budget_pivot()` เป็น template, query mileage แทน | 2026-05-22 |

- เมื่อมีคำสั่ง **"ไว้เป็น future feature"** → เพิ่มแถวในตารางด้านบน
- ระบุ Module, บริบท, และวันที่บันทึกทุกครั้ง
