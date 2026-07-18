---
name: bootstrap-guide
description: >
  BBCenter — จัด layout ด้วย Bootstrap utility (spacing/flex/responsive) ตาม
  design_guideline.md §4·§8·§9·§13. คลัง case อยู่ที่
  app/static/core/bootstrap-cases-gallery.html (ดูด้วยตา) · case index อยู่ในไฟล์นี้.
  ใช้เมื่อผู้ใช้ขอปรับ layout / แบ่งโซน / เพิ่ม py-pt / flex-grow-shrink / ทำ
  responsive desktop→mobile (เช่น table→card) หรือสั่งเพิ่ม/เรียก case.
  Triggers:
  - "/bootstrap-guide" / "จัด layout" / "แบ่งโซน" / "ทำเป็น card ตอนมือถือ"
  - "ใช้ case <N>" / "case ไหนดี"
  - "บรรทัด X–Y เพิ่ม case ..." (เพิ่ม case ใหม่)
---

# bootstrap-guide — คลัง case จัด layout ด้วย Bootstrap utility

**หน้าที่:** ผู้ใช้ขอปรับ/จัด layout → เลือก case ที่ตรง → เอา markup ไปใช้.
canonical = `docs/notes/design_guideline.md` §4 (spacing) · §8 (bootstrap) · §9 (responsive) · §13 (layout pattern).
skill นี้ = **implement guideline ให้ตรงรสนิยมผู้ใช้** (สะสม case) — ไม่ตั้งกฎแข่ง guideline

- **คลัง case (ดูด้วยตา + markup copy):** `app/static/core/bootstrap-cases-gallery.html`
- **case index (เลือกเร็ว · token ถูก):** ตารางด้านล่างในไฟล์นี้

## ⛔ Guard — บังคับทุกครั้ง (กันเปลือง token)

1. **อ่าน case index ก่อน** (ตารางล่าง) เลือก case ที่ตรง → **Read เฉพาะช่วงบรรทัดของ case นั้น** ใน gallery HTML (`offset`+`limit` ตามคอลัมน์ "บรรทัด")
2. **ห้าม Read gallery ทั้งไฟล์** — อ่านเฉพาะ case ที่ใช้
3. ทุก layout ยึด utility ก่อน (§8: ทำได้ด้วย utility 1 ตัว → ห้ามเขียน CSS) · spacing = token 8pt (§4)
4. ผู้ใช้บอก "ใช้ case N" → ไป Read case N ตรงๆ ไม่ต้องเดา · ไม่บอก → **คิดเองจากคอลัมน์ "เมื่อไหร่ใช้"**
5. เลือกไม่ได้แน่ใจ 95% → เสนอ 2 case ให้เลือก อย่าเดายาว

## CASE INDEX

> เพิ่ม case = เพิ่มแถวนี้ + section ใน gallery HTML · เลข case เรียงต่อเนื่อง ห้ามใช้เลขซ้ำ

| # | ชื่อ | เมื่อไหร่ใช้ | utility หลัก | บรรทัด (gallery) |
|---|---|---|---|---|
| 1 | Section spacing | แบ่งหลายโซนในหน้าเดียว (summary→toolbar→content) | `.mb-4` / `.py-4` | 67–85 |
| 2 | Toolbar P1 | หน้า list: tabs ซ้าย · search+primary ขวา บรรทัดเดียว sticky | `.d-flex .justify-content-between .align-items-center .flex-wrap` | 88–111 |
| 3 | KPI summary strip | สรุปตัวเลขเหลือบก่อนตาราง (ghost ≤⅕ จอ) | `.row .g-3` `.col-6 .col-md-3` | 114–134 |
| 4 | Content grow + fixed | 2-pane/master-detail: ฝั่งยืด + ฝั่งกว้างคงที่ | `.flex-grow-1` / `.flex-shrink-0` | 137–154 |
| 5 | Table → Card (mobile) | ตารางกว้างอ่านยากบนมือถือ → desktop=table, mobile=card | `.d-none .d-md-table` / `.d-md-none` | 157–178 |
| 6 | Focus form column | หน้า form/อ่าน: จำกัดกว้าง ~600px จัดกลาง | `.mx-auto` + `max-width` | 181–195 |
| 7 | Shipment tracking card | การ์ดติดตามพัสดุ/ทริป: เลขที่+เวลา+badge สถานะ, timeline ต้นทาง→ปลายทาง พร้อม address+contact+package ย่อย | `.d-flex` / `.bb-timeline` / `.bg-light .rounded-3` | 198–289 |
| 8 | Trip card (layout Case 7 + data mileage) | ใช้โครง Case 7 (header 2 บรรทัด+date/time+badge+icon+timeline) แต่ map ด้วยข้อมูล `<tr data-booking … data-plate …>` (mileage) เหลือ timeline stop เดียว | `.bb-card` / `.bb-timeline` (marker = icon ใน `.bb-avatar`) | 292–386 |
| 9 | Trip card → mileage entry form (modal) | copy Case 8 มาทำ modal กรอกเลขไมล์ — sub-card เปลี่ยนจากเลข static เป็น 2 `bb-field` input (ออก/กลับ) + action bar ยกเลิก/บันทึกชิดขวา | `.bb-field` / `.row .g-2` / `.d-flex .justify-content-end` | 394–507 |
| 10 | Buying history list card | การ์ดสรุปประวัติ/รายการล่าสุด (order/transaction): header title+dropdown ช่วงเวลา, list รายการคั่นเส้นประ แต่ละแถว thumbnail+ชื่อ+เวลา+badge สถานะ+meta 2 บรรทัด | `.card` / `.dropdown` / `.d-flex` (+ `bb-status` is-ok/wr/dg) | 514–632 |
| 11 | Booking trip card — responsive (mobile stack ↔ desktop col-8/col+col-4) | การ์ดสรุป booking 1 ใบ markup ชุดเดียวใช้ทั้งมือถือ+desktop, breakpoint เดียว `lg` — header = `bb-avatar`(bike, สีตาม status)+เวลา→ชื่อใหญ่+meta ซ้าย, ขวาบน = `{{ r.deduct_label }}`(text ปกติ สี mut, ครอบ `{% if m %}`)+ปุ่ม "แก้ไข" ปุ่มเดียว (ตัด "ย้อนกลับ" ออกแล้ว) ใช้ `flex-column flex-lg-row`+`align-self-end align-self-lg-auto` (มือถือตกใต้ชื่อชิดขวา, desktop ขวาบนแถวเดียว) แทน `bb-status` เดิม, เส้นประคั่นก่อน row. เนื้อหา 2 บล็อก `col-12 col-lg`(ต้นทาง=คนขับ/รถ/งบ)+`col-12 col-lg-4`(เริ่มเดินทาง=เลขไมล์/น้ำมัน/OT, breakdown coins/fuel/OT ไม่มี deduct label ซ้ำแล้ว) — มือถือ stack เต็มความกว้าง, desktop แบ่ง col+col-4 แทน timeline แนวตั้ง. เดิมเคยเป็น full-page redesign (header+tabs+ปุ่ม) — ตัด chrome ออกหมดแล้ว (2026-07) เหลือแค่การ์ด · mobile compact ทำแล้ว (2026-07) · single-booking เท่านั้น — งานรวม (merge หลาย booking) แยกไป **Case 13** | `.bb-card` / `.bb-avatar`(status-color) / `row` + `col-12 col-lg`/`col-12 col-lg-4` | 637–804 |
| 12 | Booking trip card (Case 7 layout + mileage/fuel data) | การ์ดสรุป booking เต็ม 1 ใบ — โครง Case 7 (header+avatar+timeline 2 stop) แทนที่ข้อมูล shipment ด้วยคนขับ/รถ/งบ (ต้นทาง) + เลขไมล์/น้ำมัน/OT/deduct label (ปลายทาง) — ต่างจาก Case 8 ตรงมี 2 stop ไม่ใช่ 1 · status สื่อผ่านสี avatar (`--bb-{status}-bg/-tx`) แทน badge แยก · **ที่มาของ Case 11** (mobile-native timeline, ก่อนขยายเป็น responsive 2 คอลัมน์) · single-booking เท่านั้น — งานรวมมือถือแยกไป **Case 14** | `.bb-card` / `.bb-timeline` / `.bb-avatar` (status-color + coins marker) / `.d-flex.flex-column.gap-1` (fuel/OT group) | 807–970 |
| 13 | Booking trip card — group (desktop, ต่อยอด Case 11) | การ์ดสรุป "งานรวม" (merge หลาย booking เป็นทริปเดียว — ต้องอนุมัติแล้วเท่านั้นถึง merge ได้) เวอร์ชัน desktop โครง `row col-12 col-lg-8` เดียวกับ Case 11. Header: avatar `merge` สีเขียวคงที่ (`--bb-ok-bg/-tx`, ไม่ไล่ status เพราะ merge ได้เฉพาะ approved) + เวลารวมทั้งกลุ่ม (เริ่มต้นสุด–สิ้นสุดสุด) + ชื่อรถใหญ่ติด `bb-badge` is-ok(`layers`) "N งานรวม" + meta คนขับ(ชื่อต้น)/pax รวม/งบ แทน purpose→dest · ขวาบนเหลือปุ่มเดียว (แก้ไข) — ตัด shuffle แยกงานทั้งหมดออกแล้ว (ซ้ำกับ shuffle รายคน) ไม่มี chevron (เนื้อหาโชว์ตลอด). เนื้อหา: คอลัมน์ `col-12 col-lg` เปลี่ยนจากคนขับ/รถ/งบเดี่ยว → list รายการต่อคน 2 บรรทัด (บรรทัด 1 ชื่อใหญ่, บรรทัด 2 clock ช่วงเวลา|users pax|purpose→ปลายทาง) คั่นเส้นประ แต่ละคนมีปุ่ม shuffle แยกงานเดี่ยว (`data-booking-id`) · `col-12 col-lg-4` เริ่มเดินทาง เหมือน Case 11 ทุกจุด (breakdown มัยเลจ/น้ำมัน/OT หรือ `bb-empty` ถ้ายังไม่เริ่ม) — ต้องเพิ่ม `.bb-badge.is-ok` ใน components.css ตอน implement จริง (demo ใช้ inline style ไปก่อน) | `.bb-card` / `.bb-avatar`(merge, is-ok) / `row` + `col-12 col-lg`/`col-12 col-lg-4` | 973–1177 |
| 14 | Booking trip card — group (มือถือ, ต่อยอด Case 12) | คู่มือถือของ Case 13 — ต่อยอด Case 12 (mobile-native ตั้งต้น ไม่ใช่ Case 11 responsive). Header ตัด `#BK-24`+บรรทัด pax|purpose→dest ออก เหลือเวลารวมทั้งกลุ่ม + "รวม N รายการ" · avatar `merge`/เขียวเหมือน Case 13 · ไม่มีปุ่มที่ header เลย (ตัดทั้งแยกงานทั้งหมด+แก้ไขกลุ่ม — แยกงานทั้งหมดซ้ำกับปุ่มแยกงานรายคน). เนื้อหา: list รายการต่อคน 2 บรรทัด (บรรทัด 1 icon `arrow-right-to-line`+ชื่อใหญ่, บรรทัด 2 clock ช่วงเวลา|users pax|purpose→ปลายทาง) คั่นด้วย `gap` เท่านั้น (ตัดเส้นประระหว่างรายการออกแล้ว ให้ตรงกับ Case 13) แต่ละคนมีปุ่ม shuffle แยกงานเดี่ยว ตามด้วย `bb-timeline` เดิมของ Case 12 ทั้งก้อนไม่เปลี่ยน (ต้นทาง คนขับ/รถ/งบ + ปลายทาง เลขไมล์/น้ำมัน/OT รวมของกลุ่ม) + เพิ่ม fallback `bb-empty` ที่ปลายทางถ้ายังไม่มี `m` (เดิม Case 12 ไม่มี fallback นี้) | `.bb-card` / `.bb-timeline` / `.bb-avatar`(merge, is-ok) | 1180–1391 |
| 15 | Week strip — day name top, date row-aligned | header title+dropdown เดือน (pill พื้น `--bb-n50`) + week strip เท่านั้น (2026-07 v3: ตัด "Daily Stress Trends"+วงแหวน progress+สถิติ peak/lowest ออกหมด) — ลูกศรซ้าย/ขวา, วันที่ 7 วัน เรียง 3 บรรทัด: ชื่อวันบน→เลขวันกลาง (active=วงกลม `.bb-avatar` สี `--bb-accent-i`)→indicator ล่าง (mockup จุด/แท่งสั้น/แท่งยาว reuse threshold task-count เดิม แต่ใช้แทน "ระดับ stress รายวัน"). เลขวันทุกวันห่อด้วยกล่อง `height:2rem` centered ให้แนวนอนตรงกัน (กัน active day เอียงเพราะ avatar วงกลมสูงกว่า text ปกติ) | `.bb-card` / `.bb-avatar` | 1393–1510 |
| 16 | Vehicle usage list — โครง Case 10 + ข้อมูลจริง (5 สถานะ) | โครง/class เอามาจาก **Case 10 ทั้งหมด**: การ์ด `card border-0 shadow-sm rounded-4` + `card-body p-4` + title `h3.h6.fw-bold.mb-3`+`hr` (Title "Buying History"→"การใช้รถ", ตัด dropdown) + `bb-buy-list`/`bb-buy-item`/`bb-buy-thumb`(3rem) — **ไม่ใช่** `.bb-avatar`/`.bb-card-head` ของ container จริงในหน้า vehicle_admin (ของจริงยังไม่ได้แก้ตาม, ทำแค่ gallery ก่อน). thumb: ไม่มี modifier=เทา, `is-ok`=เขียว, `is-wr`=ส้ม. **5 สถานะ** (ไม่มีสถานะที่ 6 "ยกเลิก" — ตัดออกแล้ว, ไม่มีทะเบียนคลิก=Swap — ตัดออกแล้ว): **1.ยังไม่อนุมัติ**(thumb เทา, ไม่มี header ขวา, badge "ว่าง" เขียว, เลขไมล์ "-", ไม่มีค่าใช้จ่าย) → **2.อนุมัติแล้ว**(thumb เขียว, มุมขวา=เวลาเดินทาง, badge เหลือง "อนุมัติแล้ว", เลขไมล์ "-") → **3.ออกเดินทางแล้ว**(thumb เขียว, มุมขวา=เวลาเดินทาง, badge ฟ้า "ออกเดินทางแล้ว", เลขไมล์ "เริ่ม→(ยังไม่สิ้นสุดการเดินทาง)") → **4.เดินทางเสร็จสิ้น**(thumb เขียว, **มุมขวา(เดิม=เวลา)เปลี่ยนเป็น** ข้อความ "หักงบกลาง"/"หักงบกอง"(static) หรือปุ่ม "เรียกเก็บ"→"จ่ายแล้ว", badge ฟ้า "สิ้นสุดการเดินทาง"(สีเดียวกับข้อ 3 ตั้งใจ), เลขไมล์เต็มช่วง, ค่าใช้จ่าย "N บาท"(ไม่ใช่ ฿N)+`bb-badge` "OT: N บาท" เฉพาะมี OT) → **5.รถซ่อมอยู่**(thumb ส้ม wrench, ไม่มี header ขวาเลย, badge "กำลังซ่อม" ส้ม, แถวเลขไมล์แทนที่ด้วย "ดำเนินการ : เทอร์โบเสีย"). **รถคันเดียวมี 2 งาน/วัน** (ตัวอย่าง 4งจ-5567): ทะเบียนแสดงครั้งเดียว (text ธรรมดา ไม่คลิก) ด้านล่างซ้อน 2 บล็อกต่องาน (แต่ละบล็อกเหลือแค่ "งานที่ N" header row `align-items-center`, ไม่มีคนขับ/ปลายทาง) คั่น `mb-3`. **rev.2:** ตัดแถวรายละเอียดงาน (คนขับ·ปลายทาง) ออกทุกแถว + ตัดปุ่ม "ส่งซ่อม"(แถวว่าง)/"เสร็จซ่อม"(แถวซ่อม) ออก — 2 แถวนี้เหลือแค่ทะเบียนบรรทัดเดียว ไม่มี header ขวา. **rev.3:** label "รอเดินทาง"→"อนุมัติแล้ว", "เสร็จสิ้น"→"สิ้นสุดการเดินทาง" · เงิน ฿N → N บาท ทั้งหมด · multi-job header `align-items-start`→`center`, spacing `mb-2`→`mb-3`. Bootstrap utility ล้วน ไม่มี custom CSS เพิ่ม | `.card` / `.bb-buy-thumb` / `.bb-badge` | 1389–1565 |

## Flow — เรียกใช้ case

```
ผู้ใช้: "จัด toolbar หน้า cost ให้ tabs ซ้าย ปุ่มเพิ่มขวา"
1. อ่าน index → ตรง Case 2 (Toolbar P1)
2. Read gallery บรรทัด 84–109 → ดึง markup
3. ปรับ class ให้เข้าหน้าจริง → เสนอ/ใส่
```
ผู้ใช้บอก "ใช้ case 5" → Read บรรทัด 153–176 ตรงๆ

## Flow — เพิ่ม case ใหม่ (ผู้ใช้ให้ช่วงบรรทัด)

```
ผู้ใช้: "บรรทัด 197–197 เพิ่ม case: sidebar ยุบเป็น icon-only ตอน md"
1. หาเลข case ถัดไป (max+1) จาก index
2. เพิ่ม <section id="caseN"> ที่ตำแหน่งที่บอก (ก่อน </main>) + ลิงก์ใน nav ซ้าย
3. เพิ่มแถวใน CASE INDEX ข้างบน (ชื่อ · เมื่อไหร่ใช้ · utility · บรรทัดใหม่)
4. อัปเดตบรรทัดของ case ที่ถัดจากจุดแทรก (shift ตามจำนวนบรรทัดที่เพิ่ม)
5. ตอบกลับ: "เพิ่มเป็น Case #N แล้ว (บรรทัด A–B)"
```

**สำคัญ:** ทุกครั้งที่เพิ่ม/ลบ case ต้อง **แก้เลขบรรทัดในคอลัมน์สุดท้ายให้ตรง** (เพราะ case หลังจุดแทรกจะเลื่อน) — ไม่งั้น Read ผิดช่วง = เปลือง token

## รสนิยม / การเรียนรู้

case = สิ่งที่ผู้ใช้ approve แล้ว. เมื่อผู้ใช้ปรับ layout จนพอใจ ("ยอดขึ้นบน · สถานะ chip มุมขวา") → เสนอบันทึกเป็น case ใหม่ให้ (ผู้ใช้ยืนยันช่วงบรรทัด).
- case เยอะขึ้นเรื่อยๆ → เป็นระยะ **distill case ที่คล้ายกันเป็นกฎ/variant เดียว** (กัน gallery บวม + Read หนัก)
- case ห้ามขัด guideline §4/§8/§9 — ถ้าจะแหก ต้องบอกเหตุผลใน desc ของ case
