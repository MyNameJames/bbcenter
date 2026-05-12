# Mobile Calendar Dot Indicator + Booking Form Validation
**วันที่:** 2026-04-12
**สถานะ:** completed

## เป้าหมาย
1. แก้ไข dot/indicator ใต้ date-number ในปฏิทิน mobile หายไป
2. ทำให้ทุกช่องใน booking modal เป็น required (รวม pickup_location)
3. ลบ allow_join field ออกจากระบบ
4. เพิ่ม check icon animation เมื่อกรอก field ถูกต้อง

## การตัดสินใจ

### Dot Indicator
- สาเหตุจริง: `position: absolute` บน `.mobile-indicator` แต่ parent ไม่มี `position: relative` → dot หลุดออกนอก flow
- สาเหตุที่ 2: `--primary` → `--ds-primary` ซึ่งไม่มีใน design-system.css → dot ไม่มีสี
- แก้: เพิ่ม `position: relative` บน `.calendar-cell` ใน mobile media query, dot ใช้ `bottom: 6px; left: 50%; transform: translateX(-50%)`, เปลี่ยน `--primary` → `--ds-accent`

### Valid Icon
- เดิมใช้ `background-image` override → animate ไม่ได้ใน CSS (snap เสมอ)
- แก้: ใช้ `<i class="bk-valid-icon">` element จริง + `position: absolute` ใน `bk-field-wrap`
- Animation: `opacity(0→1)` + `scale(0.6→1)` 150ms `ease-out`
- Live validation: trigger จาก `input`/`change` event ต่อ field
- Modal open: dispatch check ให้ field ที่มี default value (passenger_count=1)

### allow_join
- ไม่มีใน model เลย → ลบออกจาก `vehicle_view.py` ปลอดภัย

## สรุปการทำงาน
**สถานะ:** completed
**วันที่เสร็จ:** 2026-04-12

### สิ่งที่ทำ
- แก้ dot indicator mobile: position + สี
- ลบ `allow_join = False` ออกจาก booking creation
- เพิ่ม `required` + invalid-feedback ให้ pickup_location
- เปลี่ยน valid icon จาก background-image → `<i>` element จริงพร้อม animation
- เพิ่ม live validation per-field + modal open trigger สำหรับ default values
- smooth border-color transition 150ms

### ไฟล์ที่เปลี่ยนแปลงทั้งหมด
- `app/static/css/vehicle.css`
- `app/static/js/vehicle.js`
- `app/templates/vehicle/vehicle-modal-book.html`
- `app/views/vehicle_view.py`
