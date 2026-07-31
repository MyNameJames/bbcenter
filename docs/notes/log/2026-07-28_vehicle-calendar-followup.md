# vehicle.html follow-up — font size · รวม modal จอง/แก้ไข · แก้ popover bug

> **status:** in_progress · **เริ่ม:** 2026-07-28
> ปรึกษากับผู้ใช้ก่อนแล้ว (AskUserQuestion 3 ข้อ) — สรุปผล: (1) แก้เฉพาะจุดผิดชั้น ไม่เปลี่ยน baseline ระบบ
> (2) รวม modal ด้วย widget ของ book ทั้งหมด (3) โชว์ OT warning ตอนแก้ไขด้วย

## Scoped command (3 งาน)

### 1) Font size
```
[ไฟล์]     app/static/vehicle/css/vehicle_calendar.css
[ตำแหน่ง]  .event-card · .date-number · .bk-detail-text · .bk-datepick-btn · .bk-timepick-opt
[งาน]      ยกจาก 13-14px ขึ้น 14-15px ให้ตรง baseline ระบบ (.bb-table td=15 · .bb-cell-id=14 · .bb-menu-item=15)
[ข้อจำกัด] ไม่แตะ caption/badge จริง (cal-caption, vrc-m-*-meta, bk-detail-eyebrow ฯลฯ — ถูกอยู่แล้วตาม §3)
[output]   diff CSS
```

### 2) รวม modal จอง+แก้ไข
```
[ไฟล์]     app/templates/vehicle/modals/vehicle_book.html (แก้) · vehicle_edit.html (ลบ)
           app/templates/vehicle/vehicle.html (ตัด include + flatpickr) · app/static/vehicle/js/vehicle.js
[ตำแหน่ง]  #bookingModal/#bookingForm ทั้งก้อน · openBookingModal()/openEditBookingModal() ·
           editBookingForm submit handler (ลบ) · initFlatpickrInModal/_initThaiDatePicker/_bindTimeDuration (ลบ — dead หลังลบ edit modal)
[งาน]      ใช้ #bookingForm เดียวกันสร้าง+แก้ไข · เพิ่ม bkSetMode('create'|'edit') สลับปุ่ม/info-note/form.action ·
           เก็บ create URL ไว้ที่ data-create-action กัน action ค้างจาก edit ครั้งก่อน
[ข้อจำกัด] ห้ามแก้ route ฝั่ง server (field set ตรงกันอยู่แล้ว) · ห้ามลบ #detailEditSection ใน vehicle_detail.html (หน้า admin ใช้จริง)
[output]   diff template + JS, ทดสอบ create/edit/duplicate ครบ
```

### 3) Popover "+N รายการ" ไม่ปิดตอนเปิด detail modal
```
[ไฟล์]     app/static/vehicle/js/vehicle.js
[ตำแหน่ง]  function openEventDetail() — ต้นฟังก์ชัน
[งาน]      เพิ่มบรรทัดปิด popover ทุกตัวที่เปิดอยู่ ก่อนสร้าง modal content
[ข้อจำกัด] ใช้ selector เดิม [data-bs-toggle="popover"] ที่ระบบใช้อยู่แล้ว
[output]   diff 1 บรรทัด
```

## ข้อเท็จจริงที่เจอระหว่าง PLAN (กระทบแผน)

1. **`#detailEditSection`** ใน `vehicle_detail.html` มี id `editDest`/`editPurpose`/`editPax`/`editPickup` ชนกับ `vehicle_edit.html` เดิม — เป็น dead code ฝั่ง user page (ไม่มีปุ่มเรียก `openAdminEdit` ใน `vehicle.js`) แต่ **หน้า admin ใช้จริง** (`vehicle_admin.js::openAdminEdit/cancelAdminEdit/saveAdminEdit`) ผ่าน partial เดียวกัน → **ห้ามลบ partial นี้** ลบแค่ `vehicle_edit.html` พอ (แก้ id ชนไปโดยอัตโนมัติ)
2. flatpickr (CDN CSS+2 JS) กลายเป็น dead dependency หลังลบ edit modal → ตัดออกจาก `vehicle.html` ด้วย (อยู่ใน scope ของงานข้อ 2 ไม่ใช่ scope creep)
3. `.vc-icon-sm` ที่ใช้ทั่ว 3 modal **ไม่มีนิยาม CSS ที่ใช้งานได้จริงในหน้านี้แล้ว** (นิยามจริงอยู่ใน `design-system.css` แบบ comment ทิ้งไว้ และไฟล์นั้นไม่โหลดในหน้านี้ตั้งแต่ Phase 1) — icon ตกไปใช้ default ของ `.material-symbols-rounded` แทน — **นอก scope งานนี้** ไม่แก้ (จะเสนอแยกท้ายงาน)

## Checklist

- [x] 1 PLAN — scoped 3 งาน + log + สำรวจผลกระทบ
- [x] 2 GUARD — ไม่แตะ models/เงิน/สถานะ → ไม่ต้อง db-helper/test-first
- [x] 3 BUILD — ครบ 3 งาน (popover fix · font recalibrate 5 จุด · รวม modal + ตัด flatpickr dependency)
- [x] 4 VERIFY — `node --check` ผ่าน · jinja compile ผ่านทั้ง 4 template · pytest 148 passed
      ⏸ ผู้ใช้ทดสอบ UI จริงเอง (server เป็น process ของผู้ใช้)
- [ ] 5 SYNC — **defer ตามที่ผู้ใช้บอกไว้ก่อนหน้า** (รอ UI นิ่งก่อน sync INDEX_ui/guideline/CHANGELOG รวดเดียว)
- [ ] 6 CLOSE — รอ SYNC เสร็จ

## ผลลัพธ์ BUILD

1. **Popover bug** — `openEventDetail()` เพิ่ม 3 บรรทัดปิด popover ทุกตัวที่เปิดอยู่ ก่อนสร้าง modal
2. **Font size** — ยก 5 จุดจาก 13-14px → 14-15px: `.event-card` `.date-number` `.bk-detail-text` `.bk-datepick-btn` `.bk-timepick-opt` (คอมเมนต์เหตุผลไว้ในโค้ดทุกจุด)
3. **รวม modal** — `vehicle_edit.html` ลบทิ้ง · `#bookingForm` เดียวใช้ทั้งสร้าง+แก้ไข ผ่าน `bkSetMode('create'|'edit')` ใหม่ (สลับปุ่ม/หมายเหตุ/action) · `data-create-action` กัน action ค้าง · OT warning โชว์ตอนแก้ไขด้วยแล้ว (ใช้ widget เดียวกับสร้างใหม่ทั้งหมด) · ลบ flatpickr CDN (CSS+2 JS) ที่กลายเป็น dead dependency

## นอกขอบเขต (พบระหว่างทำ ไม่แก้ตอนนี้)

- `.vc-icon-sm` เป็น dead class ทั่ว `vehicle_calendar.css`/modal ทั้ง 3 (นิยามจริงอยู่ใน `design-system.css` แบบ comment ทิ้งไว้ ไฟล์นั้นไม่โหลดในหน้านี้) — ควรแทนด้วย class ที่มีนิยามจริงหรือ inline size (แยกงาน)
- `#detailEditSection` ใน `vehicle_detail.html` (ฝั่ง user page) เป็น markup ที่ไม่มี UI เปิดถึง — พิจารณาซ่อนด้วย `{% if is_vehicle_admin %}` ให้ชัดเจนว่าเป็นของ admin (แยกงาน)
- `openDuplicateModal()` ตั้ง `needDriver.checked` **หลัง** เรียก `openBookingModal()` (ซึ่ง trigger OT-warning คำนวณไปแล้วรอบหนึ่งด้วยค่า default) — ลำดับเดิมตั้งแต่ก่อนงานนี้ ไม่ใช่สิ่งที่เพิ่งเกิด แก้ตามแพทเทิร์นเดียวกับที่แก้ใน `openEditBookingModal()` ได้ถ้าต้องการ (แยกงาน)
