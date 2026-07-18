# Future Features

> รายการ feature ที่ยังไม่ได้ทำ — เพิ่มที่นี่เมื่อมีการสั่งว่า "ไว้เป็น future feature"

---

## รายการ

| # | Feature | Module | บริบท / หมายเหตุ | วันที่บันทึก |
|---|---------|--------|------------------|-------------|
| 1 | Telegram notify สำหรับ dept approver | Vehicle | แจ้งเตือน approver ระดับแผนกเมื่อมี booking ใหม่ที่ต้องอนุมัติ | 2026-04-18 |
| 2 | Badge notification system | Vehicle Admin | แสดงจำนวน pending bookings บน sidebar / header icon | 2026-04-18 |
| 3 | OT cost feature | Vehicle | คำนวณค่าล่วงเวลาสำหรับคนขับ | 2026-04-18 |
| 5 | notifyDept — แจ้ง Telegram แผนก (A-1) | Vehicle Admin | ปุ่ม "แจ้ง Telegram" ในส่วน AFTER / renderTripRow สำหรับ expense_type='department' ยังเป็น placeholder ต้องสร้าง endpoint + fetch + toast | 2026-04-19 |
| 9 | Notification preferences per-user | Auth | ให้ user เลือกว่าจะรับ notification แบบไหน (toast/email/telegram) per-category — เพิ่ม table `user_notification_pref` | 2026-04-23 |
| 10 | รายชื่อผู้อนุมัติแต่ละงบส่วนกอง (Manage Fleet) | Vehicle Admin | ใน `/admin/manage-fleet` เพิ่มส่วนแสดง/จัดการรายชื่อผู้อนุมัติ (approver) ของแต่ละ VehicleBudget ส่วนกอง — ตอนนี้เก็บแค่ `approver_id` ต่อ 1 กอง อาจต้องรองรับหลายคน | 2026-04-24 |
| 11 | Flag badge สรุปงานสัปดาห์ใน topbar | Header / Core | ใน `_shared/header.html` แสดง pill `<flag> N/M` (สีเขียว=ครบ, แดง=ค้าง) นับงานที่ assigned ในอาทิตย์ปัจจุบัน vs เสร็จแล้ว — ต้องการ model "task" หรือ aggregate จาก request types ที่มีอยู่ + endpoint ส่ง context ให้ header include | 2026-06-19 |
| 14 | Demand heatmap (ฝั่ง user) | Vehicle | spec [§7.1](vehicle_product_spec.md) — ปฏิทินแสดงวันใช้รถมาก/น้อยจากการนับ**คำขอ/วัน** (≠ ปฏิทินรถว่าง ซึ่งเป็น anti-pattern §8). **Decision 2026-06-28: ฝั่ง user คงเป็น calendar เดิมไปก่อน ไม่แตะ** — heatmap = future enhancement; ออกแบบให้ "บอกข้อมูล" ไม่ "ชี้นำพฤติกรรม" (กัน demand เทียม) | 2026-06-28 |
| 15 | รายงานวางแผนประจำปี + Analytics surface | Vehicle Admin / Org | spec [§7.2 + §2](vehicle_product_spec.md) — สรุป demand + utilization รถ + ภาระคนขับ + cost (น้ำมัน/OT/งบ) รายเดือน/ปี เพื่อประเมินรถ+งบอนาคต. ปัจจุบัน demand/execution data เก็บครบแต่ **write-only ยังไม่มี surface ใช้** (§4 demand vs execution) | 2026-06-28 |
| 16 | จัด IA หน้า admin รอบ lifecycle | Vehicle Admin | redesign: จัดเมนู/layout admin รอบ **Inbox → จัดสรร → ปิดงาน → วิเคราะห์** แทน 5 หน้า flat น้ำหนักเท่ากัน + ยก analytics (#15) เป็น first-class — แก้ pain "admin ไม่รู้ควรโฟกัสตรงไหน" + ใช้พื้นที่จอ ≥1440 อย่างมีโครง | 2026-06-28 |

---

## วิธีใช้

| 13 | Phase 5.3 — ลบ inline `style=""` ใน templates | Frontend | ไฟล์ที่มีมากสุด: `mileage_admin.html` (112 จุด, ส่วนใหญ่เป็น dynamic Jinja values เช่น width/color จาก data), `design_system_reference.html` (86, token swatches), `dashboard.html` (73). กลยุทธ์: สร้าง CSS class สำหรับ patterns ที่ซ้ำ (font-size/color combos), คง dynamic width/color ที่ขึ้นกับ Jinja data ไว้เป็น inline | 2026-05-16 |

- เมื่อมีคำสั่ง **"ไว้เป็น future feature"** → เพิ่มแถวในตารางด้านบน
- ระบุ Module, บริบท, และวันที่บันทึกทุกครั้ง
