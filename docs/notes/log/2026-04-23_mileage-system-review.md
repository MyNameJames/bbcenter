# สรุประบบบันทึกเลขไมล์
**วันที่:** 2026-04-23
**สถานะ:** completed

## เป้าหมาย
อ่านและสรุปข้อมูลระบบบันทึกเลขไมล์จาก notes ทั้งหมดในโปรเจกต์

## สรุปที่พบ

### ผู้บันทึกได้ 2 บทบาท
| ผู้บันทึก | URL | Python Route |
|-----------|-----|--------------|
| Admin | `/vehicle/mileage` | `mileage_log()` |
| Driver | `/driver` | `driver_mileage()` |

> Budget deduction เกิดที่ **2 จุด** — ต้องแก้ทั้งคู่เสมอ

### Flow การบันทึก
- `entry_type='start'`: odometer_start + actual_start + รูปหน้าปัด
- `entry_type='end'`: odometer_end + actual_end + รูปหน้าปัด + refuel (optional) + fuel_cost manual (optional)
- Trigger หักงบ: `end` + `expense_type in ['central', 'department']`

### สูตรคำนวณ
```python
fuel_cost = mileage.fuel_cost  OR  (distance / vehicle.fuel_rate) * fuel_price
```
ค่า fuel_price default = 40 บาท/ลิตร (เก็บใน SystemConfig)

### แสดงผล AFTER Section
- มีไมล์ → ds-status-dot--approved + แสดงตัวเลข
- ไม่มีไมล์ → ds-status-dot--pending + "รอกรอกไมล์"
- personal → ปุ่ม "รับเงินแล้ว"
- department → ปุ่ม "แจ้ง Telegram" (placeholder)

## ไฟล์ที่อ่าน
- `docs/notes/doc/2026-04-06_vehicle-booking-flow.md` — STEP 8, 9 (บันทึกไมล์ admin/driver)
- `docs/notes/doc/2026-04-19_vehicle-admin-system-reference.md` — Feature 13, markPaid
- `docs/notes/doc/2026-04-19_vehicle-admin-after-section.md` — AFTER section data fields
