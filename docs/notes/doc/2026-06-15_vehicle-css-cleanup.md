# Log — vehicle.html CSS cleanup

> status: **completed** · 2026-06-15

## ผลสุดท้าย
- ลบ `body.zd .cal-toolbar-center` + `.cal-toolbar-right` (dead) ใน vehicle_zendenta.css ✓
- แก้ comment stale ใน vehicle.html (prototype→prod) ✓
- checker flag `openBookingModal` → ตรวจแล้ว expose ผ่าน `Object.assign(window,{...})` บรรทัด 1059 = ปกติ
- INDEX_ui ไม่ต้อง sync (ไม่อ้าง selector ที่ลบ)

## Scope (5 field)
- [ไฟล์]: `app/templates/vehicle/vehicle.html` + `app/static/vehicle/css/vehicle_zendenta.css` (vehicle-only)
- [ตำแหน่ง]: CSS ที่หน้านี้โหลด
- [งาน]: ตัด CSS ที่ไม่ใช้ + ใช้ bootstrap แทน custom ที่แทนได้ เฉพาะหน้า vehicle.html
- [ข้อจำกัด]: `--vc-*` tokens, no shadow, ห้ามแตะ rule ใน shared CSS (เสี่ยงพังหน้าอื่น)
- [output]: diff + รายงาน

## GUARD — ผลสำรวจ
- `vehicle.css` / `vehicle_admin.css` / `vehicle_fuel.css` = **shared** (room, dashboard, repair, maintenance, vehicle admin) → ลบ rule ไม่ได้
- `vehicle_admin.css` → `va-cal-*` ใช้ใน `vehicle.js` (mini calendar booking modal) → จำเป็น
- `vehicle_zendenta.css` = vehicle-only เท่านั้น (`body.zd` มีแค่ vehicle.html)

## BUILD
1. `vehicle_zendenta.css` — ลบ dead selector `.cal-toolbar-center` + `.cal-toolbar-right` (ยืนยันไม่มีใน HTML/JS)
2. `vehicle.html` — แก้ comment stale (theme prod แล้ว ไม่ใช่ prototype "ลบได้")

## ที่ทำไม่ได้ในรอบนี้ (เสนอผู้ใช้)
- ลบ dead rule ใน shared CSS ต้อง audit ทุกหน้า — เกิน scope "เฉพาะ vehicle.html"
- `.cal-toolbar` ตั้ง grid 1fr/auto/1fr แต่เหลือ child เดียว (`cal-toolbar-left`) → over-specified แต่การแก้กระทบ layout = ต้อง verify ใน browser
