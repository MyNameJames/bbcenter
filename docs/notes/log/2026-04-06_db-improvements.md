# งานปรับปรุง Database Schema

> สถานะ: 🔄 In Progress
> เริ่มต้น: 2026-04-06
> อัปเดตล่าสุด: 2026-04-06
> อ้างอิง: `notes/doc/2026-04-06_database-design-review.md`

---

## เป้าหมาย

ปรับปรุง schema ของ BBCenter V2 ตามผลวิเคราะห์จาก DB Design Review โดยแบ่งเป็น 2 ระยะ

---

## ระยะสั้น — ทำได้ทันที (ไม่กระทบโค้ดมาก)

- [ ] **DROP TABLE shared_ride** — ตารางว่าง 0 records ไม่มีใน models.py
- [ ] **สร้าง `vehicle_service_log`** — เก็บประวัติการซ่อม/เปลี่ยนน้ำมัน/ต่อภาษีรถ
- [ ] **สร้าง `booking_status_log`** — Audit trail การเปลี่ยน status ว่าใครเปลี่ยน เมื่อไหร่
- [ ] **แก้ไข `department_budget`** — แยก concept ระหว่าง central (หมวดค่าใช้จ่าย) กับ department (ชื่อกอง)

## ระยะยาว — Refactor ใหญ่

- [ ] **สร้าง `trip` table** — แทน trip_group string ที่ลอยอยู่ใน vehicle_booking
- [ ] **สร้าง `trip_vehicle` table** — แก้ปัญหา hardcode vehicle2/driver2
- [ ] **สร้าง `booking_expense` table** — แยก financial info ออกจาก vehicle_booking
- [ ] **บังคับ `expense_type`** — validate ตอน book และตอน admin approve (51% เป็น NULL)

---

## สิ่งที่ทำไปแล้ว

- [x] วิเคราะห์ schema เทียบกับ DB จริง → บันทึกใน `doc/2026-04-06_database-design-review.md`
- [x] ระบุปัญหาทั้งหมด 9 จุด (Critical 5, Warning 4)

---

## หมายเหตุ / สิ่งที่ต้องระวัง

- ไม่มี migration tool → ต้องจัดการ `db.create_all()` และ ALTER TABLE เอง
- ตาราง `vehicle_booking` มีข้อมูลจริง 37 records อย่าลบ column ที่ใช้งานอยู่โดยไม่ migrate ข้อมูลก่อน
- `shared_ride` ก่อน DROP ต้องยืนยันว่าไม่มีโค้ดอ้างถึงแล้วจริงๆ
