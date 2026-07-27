# รวม Case 17 (bootstrap gallery mockup) เข้า mileageModal จริง

**วันที่:** 2026-07-22
**สถานะ:** completed

## เป้าหมาย
เอาดีไซน์ Case 17 (bootstrap-cases-gallery.html) มาต่อยอด `#mileageModal` จริงใน
`vehicle/admin/vehicle_mileage.html` — ให้ admin กรอกเลขไมล์ออก+กลับพร้อมกันได้ในคำขอเดียว
(เดิมต้องแยก 2 ขั้นตอน) + เพิ่มบรรทัดโทร/งบ + โชว์ breakdown ค่า OT (แยกตาม
`OTRateConfig` slot จริง)/ค่าใช้จ่ายรวม เฉพาะทริปที่ปิดแล้วเท่านั้น

## ปรับเพิ่มเติมรอบ 2 (2026-07-22, หลังผู้ใช้ทดสอบจริง) — ไม่มีแก้ Python
1. **`bb-timeline` marker** — ตัด `.bb-avatar`(user icon) ของ stop 1 ออก เปลี่ยนเป็น `.bb-tl-dot`
   เหมือน stop 2/3 ให้ marker style สม่ำเสมอทั้ง 3 stop (ตัด `padding-left:2rem` inline ที่เคยกัน
   พื้นที่ให้ avatar ออกด้วย)
2. **ไอคอนรถใน `#mmAvatar`** — `data-lucide="bike"` (two_wheeler) → `data-lucide="bus"` — เพิ่ม
   mapping ใหม่ `'bus': 'directions_bus'` ใน `core/js/ms-icons.js` (ตามรอย `'car': 'directions_car'`
   เดิม); แก้เฉพาะไอคอนใน modal เท่านั้น ไม่แตะไอคอน `bike` ในแถวตาราง/การ์ด (คนละจุด คนละ scope
   ที่ผู้ใช้ขอ)
3. **Modal scrollable** — root cause: modal ใช้ Bootstrap `.modal-dialog-scrollable` แต่ inner
   wrapper เป็น custom class `.bb-modal-body` ไม่ใช่ Bootstrap `.modal-body` ที่ CSS
   `.modal-dialog-scrollable .modal-body{overflow-y:auto}` อ้างถึง → เพิ่ม class `modal-body`
   ควบคู่ `bb-modal-body` (`class="bb-modal-body modal-body"`) ให้ scroll mechanism ทำงานจริง
   โดยไม่ต้องแตะ `components.css` กลาง (กันกระทบหน้าอื่นที่ใช้ `.bb-modal-body`)
4. **เลขไมล์ออก/กลับแก้ได้ทั้งคู่เสมอ** (เดิมช่วง state partial/complete ล็อก `mmOdoStart`
   ไว้แก้ไม่ได้) — `openMileage()` ไม่ผูก disabled/required กับ state อีกต่อไป, submit handler
   ตัดสินใจ `entry_type` จากค่าที่กรอกจริง (`start`/`end`/`both`) แทนค่าที่ set ไว้ตอนเปิด modal.
   เพื่อไม่ให้แก้ไขเลขไมล์ทับเวลาจริงด้วย `now()`, เปลี่ยน `data-actual-start`/`data-actual-end`
   จาก HH:MM อย่างเดียว → datetime-local เต็ม (`YYYY-MM-DDTHH:MM`, ทั้ง 2 จุดใน template) แล้ว
   pre-fill hidden field จากค่านี้โดยตรง — `now()` fallback คนละจุดกัน: `mmActualStart`
   เติมตอนเปิด modal ถ้ายังไม่มีค่าจริง, `mmActualEnd` เติมทีหลังใน submit handler เฉพาะตอน
   entry_type เป็น end/both และยังว่างอยู่ — เพิ่ม
   helper `timeOnly()` แยกเอาแค่ HH:MM มาโชว์ในบรรทัด OT/เส้น bar. เพิ่ม guard กันกรอกแค่เลขไมล์
   กลับทั้งที่ไม่มีเลขไมล์ออกเลย (ทั้งในฟอร์มและใน record เดิม)
   **ผลข้างเคียงที่ทราบแล้ว (ยอมรับ ไม่แก้เพิ่ม):** เพราะทั้ง 2 ช่องกรอกพร้อมกันได้เสมอ
   `entry_type` จะกลายเป็น `'both'` แทบทุกครั้งที่แก้ไข record ที่มี odometer_start อยู่แล้ว
   (ไม่ใช่แค่ตอนสร้างใหม่) → `_handle_mileage_start()` (auto_close_stale_trips + แจ้งเตือน
   "เริ่มต้นเดินทาง") จะถูกเรียกซ้ำได้เมื่อแก้ไข record ที่ปิดไปแล้ว — ไม่กระทบความถูกต้องของเงิน/OT
   (`close_trip`/`auto_generate_ot` ยัง idempotent ที่ layer service เหมือนเดิม) แค่อาจเห็น
   notification "เริ่มต้นเดินทาง" ซ้ำได้ถ้าแก้เลขไมล์ทีหลัง

### Verify
- `node --check` ผ่าน (syntax JS) · div tag balance เช็กแล้วสมดุล (43/43) · pytest suite
  ทั้งหมดยังผ่านครบ 100 (ไม่มีแก้ Python รอบนี้ จึงเป็นแค่ regression sanity check)

## การตัดสินใจ
- **entry_type ใหม่ `'both'`** — แยกจาก `'start'`/`'end'` เดิม เพื่อไม่แตะ behavior เดิมของ
  driver ฝั่ง `/driver/mileage` (คนละ route/JS) และไม่แตะ 2-step ปกติของ admin เอง
- **end == start ยังไม่อนุญาต** (ยืนยันกับผู้ใช้แล้ว) — ใช้ validation เดิม
  (`submitted_end <= mileage.odometer_start` → reject) ไม่ผ่อนเป็น `>=`
- **All-or-nothing สำหรับ `'both'`** — เช็ก end>start จากฟอร์มดิบก่อนแตะ `mileage` object เลย
  (กัน flash "บันทึกไมล์ออกสำเร็จ" ค้างจาก `_handle_mileage_start` ทั้งที่ end ยังไม่ผ่าน) +
  `db.session.rollback()` ซ้ำเป็น safety net ถ้า `_handle_mileage_end` ยัง fail ทีหลังจากเหตุอื่น
  (เช่น distance cap). **แก้จากดีไซน์แรก:** ตอนแรกคิดว่าแค่ไม่เรียก `db.session.commit()` ก็พอ
  (รอ teardown rollback เอง) — เขียน test แล้วพบว่า `route_app` fixture ใช้ app_context
  ยาวครอบทั้ง test ทำให้ flush ไม่ถูก rollback อัตโนมัติระหว่าง request ในเทสต์ (แต่ใน
  production request จริงน่าจะ rollback ที่ teardown_appcontext ตามปกติ) — เปลี่ยนเป็น
  rollback ชัดเจนแทนเพื่อไม่พึ่งพฤติกรรม implicit ที่พิสูจน์ยาก
- **Stop 2 (ช่วงเวลา/ค่า OT) ซ่อนทั้งหมดถ้าไม่มี OT slot เลย** (ยืนยันกับผู้ใช้แล้ว) — ไม่โชว์
  placeholder ว่าง
- **Stop 2/3 โชว์เฉพาะ state==='complete'** (ปิดทริปแล้ว) — เพราะข้อมูล OT/cost เป็นของที่
  `close_trip()`/`auto_generate_ot()` คำนวณ+commit ไปแล้วจริง ไม่ใช่ preview ก่อน submit
  (research พบว่าไม่มีกลไก preview อยู่ก่อนแล้ว — ดูบทสนทนา Case 17 ก่อนหน้า)
- OT แสดงเป็น **หลายบรรทัดตาม slot จริง** (`DriverOTSlot.slot_label/rate/amount`) ไม่ใช่ rate
  เดียวคงที่ตามที่ mockup Case 17 สมมติไว้ตอนแรก (โมเดลจริงมี time-band หลายช่วงได้)

## ไฟล์ที่แก้ไข
- `tests/test_mileage_both_entry.py` (ใหม่ — GUARD ก่อนแก้ logic เงิน/สถานะ)
- `app/views/vehicle/vehicle_mileage.py` (`_handle_mileage_post`, `_compute_mileage_cost`,
  `_build_mileage_rows`, `mileage_log` GET handler)
- `app/templates/vehicle/admin/vehicle_mileage.html` (data-attributes ×2 blocks + modal body)
- `app/static/vehicle/js/vehicle_mileage.js` (`openMileage`, submit handler)

## Docs sync checklist (ก่อน `จบงาน`)
- [x] INDEX_code.md — sync `_handle_mileage_post`/`_compute_mileage_cost`/`_build_mileage_rows`/`mileage_log` + แก้ line ref `mileage_export` ที่ drift (523→567) + bump header date
- [x] INDEX_ui.md — sync `vehicle_mileage.html`/`vehicle_mileage.js` (แก้ miscount "3 บรรทัด"→"2 บรรทัดใหม่" ตาม checker)
- [x] INDEX_routes.md — แก้ line ref `mileage_log()` (336→386) + note entry_type='both' + bump header date
- [x] INDEX.md (hub) — bump header date ให้ตรงกับ sub-index
- [ ] schema.md — ไม่แตะ model ไม่ต้อง sync (N/A)
- [ ] architecture.md — ไม่กระทบ system-level (N/A)
- [ ] migrations-index.md — ไม่มี .sql ใหม่ (N/A)

## สรุปการทำงาน
**สถานะ:** completed
**วันที่เสร็จ:** 2026-07-22

### สิ่งที่ทำ
- เขียน `tests/test_mileage_both_entry.py` ก่อนแก้ logic เงิน/สถานะ (GUARD) — เจอบั๊กจริงระหว่างเทส
  (ดูการตัดสินใจ all-or-nothing ด้านบน) แก้แล้วก่อน implement ต่อ
- `_handle_mileage_post()` เพิ่ม `entry_type='both'` — admin กรอกเลขไมล์ออก+กลับพร้อมกันได้
  ในคำขอเดียว พร้อม pre-check + rollback ให้ all-or-nothing จริง
- `_compute_mileage_cost()` คืนเพิ่ม `fuel_price` (4-tuple) — อัปเดตครบทั้ง 4 call site
- OT query เปลี่ยนจาก summed-hours เป็น query `DriverOT` เต็ม object ให้ดึง slot breakdown
  (label/rate/amount ต่อ time-band) ได้จริง
- Modal restructure เป็น 3 stop (รายละเอียด/ช่วงเวลา-OT/ค่าใช้จ่ายทั้งหมด) — 2 stop หลังซ่อนจนกว่า
  ทริปจะปิดแล้วจริง (ไม่ใช่ preview ก่อน submit)
- pytest ทั้ง suite ผ่าน 100 (เดิม 97 + ใหม่ 3)
- spawn `checker` → เจอ line ref drift 2 จุด + header date ค้าง 3 ไฟล์ + miscount คำอธิบาย 1 จุด
  → แก้ครบแล้ว

### การตัดสินใจสำคัญ
ดูหัวข้อ "การตัดสินใจ" ด้านบน (entry_type='both' แยก route เดิม, end==start ห้าม,
all-or-nothing ผ่าน rollback ไม่ใช่แค่ skip commit, stop OT ซ่อนถ้าไม่มี slot, OT หลายบรรทัด
ตาม slot จริงไม่ใช่ rate เดียว)

### ไฟล์ที่เปลี่ยนแปลงทั้งหมด
- `tests/test_mileage_both_entry.py` (ใหม่)
- `app/views/vehicle/vehicle_mileage.py`
- `app/templates/vehicle/admin/vehicle_mileage.html`
- `app/static/vehicle/js/vehicle_mileage.js`
- `docs/notes/INDEX_code.md`
- `docs/notes/INDEX_ui.md`
- `docs/notes/INDEX_routes.md`
- `docs/notes/INDEX.md`

### Docs sync
- [x] INDEX_code.md
- [x] INDEX_ui.md
- [x] INDEX_routes.md
- [x] INDEX.md
- [ ] schema.md — N/A (ไม่แตะ model)

### Follow-up ที่ยังไม่แก้ (นอก scope งานนี้)
- **Doc token budget เกิน 6 ไฟล์** (CLAUDE.md/INDEX_routes/INDEX_code/INDEX_ui/schema/architecture)
  — เป็นมาก่อนงานนี้ ไม่ใช่งานนี้ทำให้เกิน ต้อง split section ที่โตที่สุดแยกเป็นงานต่างหาก
  (ดู `bash tools/doc-stats.sh`)
- Bar เทียบเวลา regular/OT ใน stop 2 ยังไม่ได้ verify ด้วยตาจริงในเบราว์เซอร์ (server รันแยกเป็น
  process ผู้ใช้ — ต้องให้ผู้ใช้เปิดดูเองที่ `/vehicle/mileage`)
