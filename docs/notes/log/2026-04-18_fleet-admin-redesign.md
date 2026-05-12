# Fleet Admin Redesign — ก่อน / ขณะ / หลัง
**วันที่:** 2026-04-18
**สถานะ:** in-progress

## เป้าหมาย
Redesign หน้า `อนุมัติการจองรถ` (Fleet Admin) ทั้งหมด จาก Kanban 3 column เป็น layout ใหม่ที่แบ่งตาม workflow จริงของ admin

## Layout Overview
- **Desktop:** Left (Booking List) | Right (Vehicle Status)
- **Mobile:** Stack ล่าง (Bootstrap col)
- **Week nav:** Redesign เป็น rounded square pill style

## 3 Sections

### ก่อน — Booking List
- List view + Filter tab: ทั้งหมด / รออนุมัติ / ส่ง Approver / อนุมัติแล้ว / ปฏิเสธ
- Collapse logic: วันปัจจุบันและก่อนหน้า → collapse "อนุมัติแล้ว 7/7" | วันถัดไป → expanded
- Multi-select grouping (เฉพาะ รออนุมัติ)
- "ย้อนเป็นรออนุมัติ" → confirm dialog → row กลับมา checkbox ได้
- Modal: รถ, คนขับ, expense type, วัตถุประสงค์ → Confirm & Telegram

| Status | Actions |
|--------|---------|
| รออนุมัติ | อนุมัติ + ปฏิเสธ + checkbox |
| ส่ง Approver | แก้ไข (modal) |
| อนุมัติแล้ว | แก้ไข + ย้อนเป็นรออนุมัติ |
| ปฏิเสธ | แก้ไข (modal) |

### ขณะ — Vehicle Status (Right panel)
- List 7 คัน, icon mock, filter ตามวันที่เลือก
- Swap modal: เลือกเฉพาะ "ว่าง" และ "จองแล้วยังไม่ออก"
- ส่งซ่อม modal: วันที่ + หมายเหตุ + ปุ่มเสร็จซ่อม + alert

| Status | Actions |
|--------|---------|
| ว่าง | — |
| ใช้งานอยู่ | Swap |
| จองแล้ว (ยังไม่ออก) | Swap + เวลา/ปลายทาง |
| ส่งซ่อม | เสร็จซ่อม + alert |

### หลัง — Post-trip Summary
- Filter ตามวันที่เลือก
- Row layout (2 lines):
  ```
  สุนทร พรมแดน  [ส่วนกอง · กองบริหาร]              ฿505
  ไมล์: 12,450→12,495 ··· 45กม.×฿5 + น้ำมัน฿280  [ปุ่ม]
  ```

| Expense | Action | หลัง Action |
|---------|--------|------------|
| ส่วนกลาง | ไม่มีปุ่ม | timestamp อัตโนมัติ |
| ส่วนกอง | แจ้ง Telegram | badge "จ่ายแล้ว" + จ่ายเมื่อ 18/4/2569 |
| ส่วนตัว | รับเงินแล้ว (admin only) | badge "จ่ายแล้ว" + จ่ายเมื่อ 18/4/2569 |

## Future Features (ไม่ทำตอนนี้)
- Badge เตือนใน notification เมื่อยังไม่กรอกไมล์
- ค่าโอที
- Telegram notify ไปที่คนอนุมัติแต่ละกอง (ส่วนกอง)
- **[#10 — 2026-04-24]** รายชื่อผู้อนุมัติแต่ละงบส่วนกองใน `/admin/manage-fleet` — แสดง/จัดการ approver ต่อ VehicleBudget (ปัจจุบัน `approver_id` รองรับแค่ 1 คน อาจต้องรองรับหลายคนในอนาคต)

## การตัดสินใจ
- "ย้อนเป็นรออนุมัติ" = Manual (กดปุ่ม + confirm dialog) เพราะมีผลต่อ Telegram ที่แจ้งไปแล้ว
- Swap = เลือกได้เฉพาะ "ว่าง" และ "จองแล้วยังไม่ออก"
- Collapse "ก่อน" = อัตโนมัติตามวันปัจจุบัน (ไม่ใช่ manual)

## ไฟล์ที่แก้ไข
- [ ] app/templates/vehicle/admin/vehicle_admin.html
- [ ] app/static/css/vehicle_admin.css
- [ ] app/static/js/vehicle_admin.js
