# Vehicle Admin — DURING Section Redesign
**วันที่:** 2026-04-23
**สถานะ:** completed
**วันที่เสร็จ:** 2026-04-23

## เป้าหมาย
ปรับ UI ของ DURING · Vehicles section ให้ตรงกับ mockup ที่ผู้ใช้ส่งมา

## การตัดสินใจ
- บรรทัดที่ 1: ทะเบียนรถ (bold) + ชื่อรถ (muted) บรรทัดเดียว
- ไม่มี bell icon (ตามที่ผู้ใช้ระบุ)
- Detail line: `{driver} → {dest}` truncate ด้วย ellipsis ผ่าน `<span>` wrapper
- Available state: ⊙ Available สีเขียว inline (แทน badge pill)
- Icon: วงกลม (border-radius: 50%), ดำเมื่อ inuse/reserved (vs-icon-active)
- ลบ status badge pill + dead CSS (.vs-plate, .vs-status-*) ออก

## สรุปการทำงาน

### สิ่งที่ทำ
- Redesign `renderVehicleRow()` ตาม mockup
- เพิ่ม `.vs-name-sub` span สำหรับชื่อรถ (font-weight 400, muted color)
- แก้ ellipsis bug บน flex container ด้วย `<span>` wrapper ใน `.vs-detail`
- ลบ dead CSS: `.vs-plate`, `.vs-status`, `.vs-status-*`

### การตัดสินใจสำคัญ
- `text-overflow: ellipsis` ไม่ทำงานบน flex container โดยตรง → ต้องใช้ `<span>` ที่มี `min-width: 0; overflow: hidden; text-overflow: ellipsis` เป็น flex child แทน

### ไฟล์ที่เปลี่ยนแปลงทั้งหมด
- `app/static/js/vehicle_admin.js` — `renderVehicleRow()`
- `app/static/css/vehicle_admin.css` — VEHICLE STATUS section
