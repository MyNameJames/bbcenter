# manage-fleet — #addDriverModal redesign + driver table real-data binding

> Task log ตาม [task-lifecycle.md](../task-lifecycle.md) — เขียนหลังจบงาน (session ทำต่อเนื่องหลายรอบ ไม่ได้เปิด log ตั้งแต่ต้นตามที่ผู้ใช้ขอ "ไม่ต้อง sync จนจบงาน")

## เป้าหมาย

Redesign `#addDriverModal` ใน [vehicle_fleet.html](../../../app/templates/vehicle/admin/vehicle_fleet.html) (เพิ่ม/แก้ไขคนขับ) ให้ตรง design ใหม่ (mockup ภาพ) + เชื่อมข้อมูลจริง, ปรับตาราง "คนขับ" (badge user account, สถานะ, งานในสัปดาห์) ให้ผูกข้อมูลจริงแทน mockup/placeholder

## สิ่งที่ทำ

1. **Avatar upload circle** (`.profile-upload`) — แก้บั๊ก 2 จุด: input ไม่มี `name="avatar_image"` (เลือกรูปแล้วไม่เคย submit) + inline `<script>` เดิม `reader` ถูกอ้างนอก scope (ปุ่มลบรูปไม่เคยทำงาน) → ย้าย logic ไป `vehicle_fleet.js` (`setAvatarPreview`/`bindAvatarUpload`) พร้อม prefill รูปเดิมตอน edit. retokenize CSS จาก hex literal เป็น `--bb-*` ทั้งหมด (radius = `pill` ตาม §5 avatar)
2. **รูปบัตรประชาชน** — สร้างใหม่เป็น dropzone (`#idcardDropzone`, ว่าง) ↔ uploaded-card (`#idcardUploadCard`, มีไฟล์ + progress bar จำลอง) toggle จริง ผูกกับ `id_card_image` — ลบ input ซ้ำเดิม (`ed_idcard_file`) + ลบ `avatarDropzone`/`uploadCard` mockup เดิมที่ข้อความผิด (เขียนว่า "รูปโปรไฟล์" ทั้งที่อยู่ใต้ section บัตรประชาชน). custom CSS เฉพาะหน้านี้ (ตัดสินใจโดยผู้ใช้ — ไม่ formalize เข้า `Upload()` component, ดู [design_guideline.md §14](../design_guideline.md))
3. **Preview modal รูปบัตร** (`#idcardPreviewModal`) — คลิก uploaded-card เปิดดูรูปเต็มจอ กว้างพอดีจอ ปุ่มปิดลอยมุมภาพ. หน้านี้ modal อื่นไม่มี backdrop มืดของ Bootstrap อยู่แล้ว (convention เดิม) → ใส่ overlay มืดของตัวเอง (`data-bs-backdrop="false"` + CSS background ตรงๆ) กัน modal ซ้อนดูเป็นชั้นเดียวกัน
4. **ลบ switch "สถานะใช้งาน"** ออกจาก modal → ย้ายเป็นปุ่มคลิกตรงคอลัมน์ "สถานะ" ในตาราง (`.mf-driver-toggle-active`, หน้าตาเดิมทุกอย่าง) — AJAX ใหม่ `admin_driver_toggle_active()` (mirror pattern `admin_vehicle_fix_done`, ไม่ผ่าน service เพราะเป็น plain attribute ไม่ใช่เงิน/status-transition ตาม ADR 0001)
5. **Badge user account** (คอลัมน์ "ข้อมูลคนขับ") — จาก hardcode `@kthikorn` → ผูก `d.linked_user.username` จริง ซ่อน badge ถ้ายังไม่ผูก account
6. **"งานในสัปดาห์"** — คืน mockup (CSS มีอยู่แล้วแต่ markup เคยหาย) แล้วต่อข้อมูลจริง: `_compute_driver_week_status()` join `VehicleBooking`→`VehicleMileage`→`DriverOT` ต่อวัน. งาน = `status='approved'` (ครอบ `is_ad_hoc=True` ด้วย — ตั้ง approved ตรงตอน insert) + representative row เท่านั้น (`assigned_vehicle_id` ไม่ว่าง ตาม [vehicle_product_spec.md](../vehicle_product_spec.md) — รถ/คนขับ/ไมล์/OT ผูกที่ row แรกของทริปเท่านั้น). Priority ต่อวัน: ขับจริง+OT (`is-wr` ส้ม) > ขับจริง (`is-on` ดำ) > มีงานไม่ได้ขับ (`is-info` ฟ้า ใหม่) > ไม่มีงาน (`off` เทาจาง). วันอนาคตของสัปดาห์ = `off` เสมอ. chevron ซ้าย-ขวา ทำงานจริง (AJAX `admin_driver_week()`) — ทุกแถวคุมสัปดาห์เดียวกันร่วมกัน (ไม่ใช่ต่อแถว)
7. **บั๊กที่แก้ระหว่างทาง:** JS date-math ใช้ `d.toISOString()` หลัง `setDate()` — แปลง UTC ก่อน slice ทำให้วันเพี้ยนไป 1 วันเมื่อ browser timezone ICT (+7) → กด "next" แล้วเหมือนไม่ขยับ (ตกกลับมาอยู่วันเสาร์ของสัปดาห์เดิม) แก้ด้วยการ build ISO string จาก local `getFullYear/getMonth/getDate` เอง (`toIsoDate()`)

## การตัดสินใจสำคัญ

- **Avatar/id-card upload widget = custom CSS เฉพาะหน้า ไม่ยกเป็น canonical component** — ผู้ใช้เลือกเองระหว่างทำงาน (มี `Upload()` component ใกล้เคียงใน CHEATSHEET แต่ไม่มี progress-bar state + ไม่รองรับ prefill ไฟล์เดิม) บันทึกไว้ใน design_guideline.md §14 กันเข้าใจผิดว่าเป็น drift ที่ไม่ตั้งใจ
- **Driver status toggle ไม่ผ่าน service layer** — เป็น plain boolean attribute (`Driver.is_active`) ไม่ใช่เงิน/status-transition ตาม ADR 0001 → เขียนตรงใน controller ได้ (ยืนยันจาก guide-vehicle agent lookup)
- **"งานในสัปดาห์" query อยู่ใน controller ตรงๆ ไม่ผ่าน service** — เป็นหน้าอ่าน/แสดงล้วนตาม ADR 0001 (ไม่มี mutation)

## ไฟล์ที่เปลี่ยนแปลงทั้งหมด

- [app/templates/vehicle/admin/vehicle_fleet.html](../../../app/templates/vehicle/admin/vehicle_fleet.html) — modal redesign, preview modal ใหม่, table binding
- [app/static/vehicle/js/vehicle_fleet.js](../../../app/static/vehicle/js/vehicle_fleet.js) — avatar/idcard upload logic, status toggle, week nav
- [app/views/vehicle/vehicle_admin.py](../../../app/views/vehicle/vehicle_admin.py) — `_week_bounds`/`_format_week_label`/`_compute_driver_week_status` ใหม่, route `admin_driver_toggle_active`/`admin_driver_week` ใหม่, `_fleet_add_driver`/`_fleet_edit_driver` ตัด `is_active` ออก

## Verify

- `py_compile` + Jinja parse ผ่านทุกรอบแก้
- `pytest` ทั้งชุด exit 0 (ทุกรอบ)
- Smoke test เฉพาะกิจ (scratch script, ลบทิ้งแล้ว) ยิง route จริงผ่าน test client ยืนยัน `_compute_driver_week_status()` คืนค่าถูกต้องครบ 3 state (`on`/`wr`/`info`) + prev/next week navigation ทำงานถูกต้องหลังแก้ timezone bug
- ผู้ใช้ทดสอบเองใน browser จริง (server แยก process, ไม่ได้ผ่าน preview tool) — confirm จบงานแล้ว

## สรุปการทำงาน
**สถานะ:** completed
**วันที่เสร็จ:** 2026-08-05

### Docs sync
- [x] INDEX_routes.md — 2 route ใหม่ + แก้ line number ที่เลื่อนจากฟังก์ชันใหม่ 3 ตัว
- [x] INDEX_code.md — Key Functions เพิ่ม `_week_bounds`/`_format_week_label`/`_compute_driver_week_status`/`admin_driver_toggle_active`/`admin_driver_week` + แก้ line number `admin_assign`/`admin_merge` ที่เลื่อน
- [x] INDEX_ui.md — template + JS entry อัปเดตละเอียด
- [x] design_guideline.md §14 — บันทึก decision "custom CSS ไม่ยก component"
- [ ] schema.md — ไม่แตะ model/column เลยรอบนี้ (ไม่ต้อง sync)
- [ ] migrations — ไม่มี
