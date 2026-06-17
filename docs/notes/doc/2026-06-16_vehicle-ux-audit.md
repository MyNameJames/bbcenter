# Vehicle UX Audit — BBCenter V2

> **วันที่:** 2026-06-16 · **มุมมอง:** senior product designer
> **ขอบเขต:** vehicle flows ทั้งหมด (8 flow + notification)
> **มิติที่เน้น:** (1) Cognitive load / clarity (2) Flow / friction (3) Microcopy / feedback
> **สถานะ:** audit อย่างเดียว — ยังไม่แก้ code · ทุก finding มี file:line อ้างอิงที่เปิดอ่านจริง
> *Visual consistency (shadow/hex/radius) อยู่ใน Appendix แบบสั้น — ไม่ใช่หัวใจรอบนี้*

---

## 1. Executive Summary

Vehicle domain ทำงานครบและ flow หลักออกแบบมาดี (validation inline, calendar ชัด, การ์ด
collapse, KPI สี) แต่มี **ภาระทางความคิด (cognitive load)** สะสมอยู่ 3 แหล่งหลัก:

1. **ภาษางบไม่ตรงกันทั้งระบบ** — งบประเภทเดียวถูกเรียก 4 ชื่อคนละหน้า ผู้ใช้ต้องแปลในหัวว่า
   "งบส่วนกอง = หน่วยงาน = ส่วนกอง = งานกอง" คือก้อนเดียวกัน
2. **จังหวะเงินถูกซ่อน** — การหักงบจริงเกิดตอน "ปิดไมล์" และ override ค่าน้ำมันเป็นการ
   refund+หักใหม่จริง แต่ทั้งสองจุดไม่มี confirmation และ flash ไม่บอกว่าเงินขยับ
3. **ค่าใช้จ่ายมองไม่เห็นก่อนตัดสินใจ** — approver/admin กดอนุมัติโดยไม่เห็นงบที่จะลด, ค่า OT
   คำนวณหลังจบทริปเท่านั้น ผู้จองไม่รู้ล่วงหน้าว่าจะโดนค่าล่วงเวลา

**Top 5 ที่ควรแก้ก่อน (เรียงตาม impact):**

| # | ปัญหา | severity | ที่ |
|---|---|---|---|
| 1 | งบ 3 ประเภทใช้ชื่อ 4 แบบไม่ตรงกันทุกหน้า | P0 | cost/mileage/budget/admin |
| 2 | หักงบจริงตอนปิดไมล์ — ไม่มี confirm, flash ไม่บอกว่าหักเงิน | P0 | mileage_log / driver_mileage |
| 3 | admin assign เลือกประเภทงบได้แต่ไม่บังคับ → ข้าม budget guard ได้ | P0 | admin_assign |
| 4 | override ค่าน้ำมัน = refund+หักใหม่จริง แต่เป็นลิงก์เล็ก ไม่มี confirm | P0 | override_fuel |
| 5 | ค่า OT / งบที่จะลด มองไม่เห็นก่อนกดอนุมัติ/ก่อนจอง | P1 | booking / approver / cost |

---

## 2. Method

ใช้ Nielsen heuristics เฉพาะที่เกี่ยวกับ 3 มิติที่เลือก:

- **Visibility of system status** — กดแล้วเกิดอะไร? เงินขยับไหม? งบเหลือเท่าไร?
- **Recognition > recall** — ต้องจำอะไรข้ามหน้าไหม
- **Match real world** — ศัพท์ตรงกับที่ผู้ใช้พูดจริงไหม
- **Error prevention** — กันพลาดก่อน vs ปล่อยพลาดแล้วแจ้ง
- **Consistency** — ปุ่ม/สถานะ/ภาษา เหมือนกันทั้ง domain ไหม
- **Help & feedback** — success/error ชัดไหม, confirm ก่อน action เสี่ยงไหม, undo ได้ไหม

**Severity:**
- **P0** = ทำให้กรอกผิด / เงินผิด / พลาดขั้นตอนได้จริง (กระทบ data หรือเงิน)
- **P1** = ทำงานเสร็จได้แต่เสีย effort / คิดเยอะเกินจำเป็น
- **P2** = polish / nice-to-have

---

## 3. Findings per Flow

### 3.1 Booking (user จองรถ)
ไฟล์: [vehicle_book.html](app/templates/vehicle/modals/vehicle_book.html) · [vehicle_booking.py](app/views/vehicle/vehicle_booking.py)

| # | finding | ทำไมเป็นภาระ | ข้อเสนอ | ที่ | sev |
|---|---|---|---|---|---|
| B1 | คำเตือนค่าล่วงเวลาโผล่ **หลัง** เลือกวัน/เวลา | user ตัดสินใจเลือกเวลาไปแล้วค่อยรู้ว่ามีค่า OT ต้องถอยกลับมาคิดใหม่ | โชว์ช่วงเวลาที่ "ไม่มี OT" (08:00–17:00) เป็น hint ตั้งแต่ก่อนเลือก + เปลี่ยนสีช่องเวลาเมื่อเข้าเขต OT | [vehicle_book.html:98-101](app/templates/vehicle/modals/vehicle_book.html#L98) | P1 |
| B2 | submit แล้ว modal ปิด + redirect ทั้งหน้า + flash บนสุด | บนจอยาว flash อาจอยู่นอกจอ → user ไม่มั่นใจว่าส่งสำเร็จ อาจกดซ้ำ | scroll ไป flash อัตโนมัติ หรือใช้ toast ค้างมุมจอ (มี notification.js อยู่แล้ว) | [vehicle_booking.py:110](app/views/vehicle/vehicle_booking.py#L110) | P1 |
| B3 | toggle "ต้องการพนักงานขับรถ" default = เปิด | ผู้ที่ขับเองต้องจำมาปิดทุกครั้ง | คงไว้ได้ แต่เพิ่ม sub-label อธิบายผลของแต่ละสถานะ | [vehicle_book.html:144-147](app/templates/vehicle/modals/vehicle_book.html#L144) | P2 |
| B4 | ผู้จองไม่ได้เลือกประเภทงบเลย — admin มาใส่ทีหลัง | ถูกต้องตาม flow (admin เป็นคนรู้งบ) — **ไม่ใช่ปัญหา** แต่ควรสื่อให้ user รู้ว่า "ค่าใช้จ่ายจัดการโดยแอดมิน" ชัดขึ้น | คง note "แอดมินจะจัดสรร..." ไว้ ดีแล้ว | [vehicle_book.html:151-160](app/templates/vehicle/modals/vehicle_book.html#L151) | — |

### 3.2 Approver (อนุมัติงบกอง)
ไฟล์: [vehicle_approver.html](app/templates/vehicle/vehicle_approver.html) · [vehicle_booking.py:330-544](app/views/vehicle/vehicle_booking.py#L330)

| # | finding | ทำไมเป็นภาระ | ข้อเสนอ | ที่ | sev |
|---|---|---|---|---|---|
| A1 | badge "ค่าน้ำมันที่ใช้ในทริป" แสดง **฿0** ตอนรออนุมัติ (ยังไม่มีไมล์) | badge บอกราคาที่ยังไม่เกิด → approver เข้าใจผิดว่าทริปนี้ฟรี/ถูก | ซ่อน badge ตอน pending หรือเปลี่ยน label เป็น "ประมาณการ" + คำนวณจากระยะทางคาดการณ์ | [vehicle_booking.py:373-381](app/views/vehicle/vehicle_booking.py#L373), [vehicle_approver.html:110-113](app/templates/vehicle/vehicle_approver.html#L110) | P1 |
| A2 | กด "อนุมัติ" = POST ทันที ไม่มี confirm | กดพลาดแล้วอนุมัติเลย (ปุ่มอยู่ติดปุ่มปฏิเสธ) | confirm เบา ๆ หรือ undo toast 5 วิ | [vehicle_approver.html:162-170](app/templates/vehicle/vehicle_approver.html#L162) | P1 |
| A3 | เห็นงบรวมของกอง (การ์ดบน) แต่ไม่เห็นว่าอนุมัติใบนี้แล้วงบเหลือเท่าไร | ต้องคำนวณในหัว: เหลือ − ค่าทริปนี้ | แสดง "อนุมัติแล้วเหลือ ฿X" ใต้ปุ่มอนุมัติแต่ละใบ | [vehicle_approver.html:56-77](app/templates/vehicle/vehicle_approver.html#L56) | P1 |
| A4 | reject reason = free text ไม่มีตัวเลือกสำเร็จรูป | เหตุผลไม่สม่ำเสมอ + ผู้จองอ่านแล้วงง | เพิ่ม chip เหตุผลที่ใช้บ่อย (งบหมด/ซ้ำซ้อน/ข้อมูลไม่ครบ) + ช่องเสริม | [vehicle_approver.html:178-180](app/templates/vehicle/vehicle_approver.html#L178) | P2 |

### 3.3 Admin approval & assign
ไฟล์: [vehicle_admin.html](app/templates/vehicle/admin/vehicle_admin.html) · [vehicle_admin.py](app/views/vehicle/vehicle_admin.py)

| # | finding | ทำไมเป็นภาระ | ข้อเสนอ | ที่ | sev |
|---|---|---|---|---|---|
| M1 | `expense_type` เป็น optional ตอน assign — ถ้าเว้นว่าง จะข้าม `guard_budget` แล้ว status=approved | ทริปอาจ approved โดยไม่ผูกงบ → ตอนปิดไมล์ไม่หักงบ เงินหาย/รายงานเพี้ยน | บังคับเลือกประเภทงบก่อน approve (validate เหมือนที่ validate คนขับ) | [vehicle_admin.py:477,496-501](app/views/vehicle/vehicle_admin.py#L477) | **P0** |
| M2 | งบ 3 ประเภทไม่มีคำอธิบาย/แยกสายตาในฟอร์ม assign | admin ต้องจำว่าทริปแบบไหนเข้างบไหน | dropdown แสดงงบคงเหลือต่อประเภท + ตัวอย่างใช้งานสั้น ๆ | vehicle_admin.html (assign panel) | P1 |
| M3 | merge mode / advanced filter ซ่อนหลังปุ่ม | discovery ต่ำ — admin ใหม่ไม่รู้ว่ารวมทริปได้ | คง pattern ได้ แต่ใส่ tooltip/hint ครั้งแรก | [vehicle_admin.py:376](app/views/vehicle/vehicle_admin.py#L376) | P2 |
| M4 | ไม่มี undo หลัง assign (ต้อง revert ทีละ step) | แก้ผิดต้องวนหลายคลิก; revert ถูก block ถ้าหักงบแล้ว | คงไว้ (มี `admin_revert_booking` แล้ว) แต่ทำปุ่ม revert ให้เห็นง่ายขึ้นในการ์ด | [vehicle_admin.py:304-318](app/views/vehicle/vehicle_admin.py#L304) | P2 |

### 3.4 Mileage / ปิดทริป
ไฟล์: [vehicle_mileage.py](app/views/vehicle/vehicle_mileage.py) · [vehicle_mileage.html](app/templates/vehicle/admin/vehicle_mileage.html)

| # | finding | ทำไมเป็นภาระ | ข้อเสนอ | ที่ | sev |
|---|---|---|---|---|---|
| L1 | **หักงบจริงเกิดตอน entry_type=end** แต่ flash บอกแค่ "บันทึกเลขไมล์หลังกลับเรียบร้อย" | admin ไม่รู้ว่าจังหวะนี้คือจังหวะตัดเงินจากงบ → ไม่ระวัง/ไม่ตรวจก่อน | flash บอกยอดที่หัก: "ปิดทริป + หักงบ ฿X จาก[งบ Y]" + confirm ก่อนถ้า > เพดาน | [vehicle_mileage.py:266-271](app/views/vehicle/vehicle_mileage.py#L266), flash [:93](app/views/vehicle/vehicle_mileage.py#L93) | **P0** |
| L2 | สถานะ "รอกรอก / รอกลับ / ครบ" เป็นศัพท์เฉพาะ | ผู้ใช้ใหม่เดาไม่ออกว่าต่างกันยังไง | เพิ่ม tooltip: รอกรอก=ยังไม่บันทึกไมล์ออก, รอกลับ=ออกแล้วยังไม่ปิด, ครบ=จบทริป | [vehicle_mileage.py:403](app/views/vehicle/vehicle_mileage.py#L403) | P1 |
| L3 | กระบวนการ 2 ขั้น (บันทึกออก → กลับมาตาราง → หาใบเดิม → บันทึกกลับ) | ทริปเยอะ ๆ หาใบเดิมยาก เสี่ยงกรอกผิดคัน | จัดกลุ่ม/เน้นสี "รอกลับ" ให้เด่น + ปุ่มลัดจากการ์ดทริปไปบันทึกกลับ | [vehicle_mileage.py:257-262](app/views/vehicle/vehicle_mileage.py#L257) | P1 |

### 3.5 Driver home & ad-hoc
ไฟล์: [vehicle_driver.py](app/views/vehicle/vehicle_driver.py) · [vehicle_driver.html](app/templates/vehicle/vehicle_driver.html)

| # | finding | ทำไมเป็นภาระ | ข้อเสนอ | ที่ | sev |
|---|---|---|---|---|---|
| D1 | งานนอกระบบ (ad-hoc) **auto-approve ทันที** ไม่มี admin ตรวจ | เสี่ยงงบเกิน/รถชนคิว (มีเช็ค clash แค่ตอนเปลี่ยนรถ ไม่ใช่ตอนสร้าง) | คง auto-approve (ออกแบบมาเพื่อความเร็ว) แต่ flag ให้ admin เห็นชัดว่า "งานนอกระบบรอใส่งบ" + ค้าง notification | [vehicle_driver.py:119](app/views/vehicle/vehicle_driver.py#L119) | **P0** |
| D2 | flash หลังสร้าง ad-hoc บอก "ไปบันทึกเลขไมล์ออกในการ์ดได้เลย" | ดี — มี next-step ชัด **ตัวอย่างที่ควรเลียนแบบ** | นำ pattern นี้ไปใช้ flash จุดอื่น | [vehicle_driver.py:150-152](app/views/vehicle/vehicle_driver.py#L150) | — |
| D3 | flash ปิดงาน = "ปิดงานเรียบร้อย" (ไม่บอกว่าหักงบ) | เหมือน L1 — คนขับไม่รู้ว่าตอนนี้ระบบหักงบกอง/ส่วนกลางแล้ว | เพิ่มยอดที่หัก (ถ้าเกี่ยวข้องกับคนขับ) หรืออย่างน้อยบอก "ทริปนี้บันทึกค่าใช้จ่ายแล้ว" | [vehicle_driver.py:245,283-288](app/views/vehicle/vehicle_driver.py#L245) | P1 |

### 3.6 Budget management
ไฟล์: [vehicle_budget.py](app/views/vehicle/vehicle_budget.py) · [vehicle_budget_service.py](app/views/vehicle/vehicle_budget_service.py) · [vehicle_budget.html](app/templates/vehicle/admin/vehicle_budget.html)

| # | finding | ทำไมเป็นภาระ | ข้อเสนอ | ที่ | sev |
|---|---|---|---|---|---|
| G1 | ledger ใช้ event code ดิบ: `deduct / refund / set_budget / manual_adjust / set_active` | ถ้าโชว์ดิบในหน้า user อ่านไม่รู้เรื่อง (ปัจจุบันยังไม่โชว์ ledger เต็มในหน้า — ควรกันไว้ก่อนเพิ่ม) | เตรียม label map ไทยก่อนเปิด ledger ให้ user เห็น: หัก/คืน/ตั้งงบ/ปรับมือ/ปิดงบ | [vehicle_budget_service.py:73-117](app/views/vehicle/vehicle_budget_service.py#L73) | P2 |
| G2 | modal manual_adjust อธิบายชัดว่า "ไม่ใช่การคืนเงินจริง...บันทึกใน ledger" | **ตัวอย่าง microcopy ที่ดีมาก** — กัน admin เข้าใจผิด | ใช้เป็นมาตรฐานข้อความเตือนสำหรับ action เงินอื่น | [vehicle_budget.html:1083](app/templates/vehicle/admin/vehicle_budget.html#L1083) | — |

### 3.7 Fuel management
ไฟล์: [admin_fuel.html](app/templates/vehicle/admin/admin_fuel.html)

| # | finding | ทำไมเป็นภาระ | ข้อเสนอ | ที่ | sev |
|---|---|---|---|---|---|
| F1 | KPI มี meta อธิบายดี ("วงเงินที่ admin ถือไว้สำรองจ่ายคนขับ", "หลังหักบิลค้างเบิก เฉพาะเงินสด") | **ตัวอย่างที่ดี** — ลด cognitive load ด้วยคำอธิบายใต้ตัวเลข | นำ pattern meta-under-number ไปใช้ KPI หน้าอื่น (budget/cost) | [admin_fuel.html:85,102](app/templates/vehicle/admin/admin_fuel.html#L85) | — |
| F2 | คำว่า "บิล" vs "ใบเบิก" vs "เงินสำรอง" ต้องเข้าใจความสัมพันธ์ | flow บิล→รวมเป็นใบเบิก→ได้เงิน เป็น 3 สถานะที่ผูกกัน | เพิ่ม mini-diagram/stepper อธิบาย lifecycle ของบิล 1 ครั้งบนหัวหน้า | [admin_fuel.html:54](app/templates/vehicle/admin/admin_fuel.html#L54) | P2 |

### 3.8 Cost / OT
ไฟล์: [vehicle_cost.py](app/views/vehicle/vehicle_cost.py) · [vehicle_cost.html](app/templates/vehicle/admin/vehicle_cost.html)

| # | finding | ทำไมเป็นภาระ | ข้อเสนอ | ที่ | sev |
|---|---|---|---|---|---|
| C1 | **override ค่าน้ำมัน = refund เก่า + หักใหม่จริง** แต่ trigger เป็นลิงก์/ฟอร์มเล็ก ไม่มี confirm | กดเปลี่ยนตัวเลขแล้วเงินขยับทันที ไม่มีจังหวะทบทวน (ต่างจาก cancel_booking ที่มี confirm) | confirm พร้อมแสดง "จะคืน ฿เก่า แล้วหัก ฿ใหม่" ก่อนยืนยัน | [vehicle_cost.py:65-97](app/views/vehicle/vehicle_cost.py#L65) | **P0** |
| C2 | OT คำนวณ **หลัง** ปิดทริปเท่านั้น (auto_generate_ot ตอน end) | ทั้งผู้จองและ approver ไม่เห็นค่า OT ก่อนตัดสินใจ | แสดงประมาณการ OT ในใบจอง/หน้าอนุมัติ (ใช้ ot_rates ที่ส่งไป frontend อยู่แล้ว) | [vehicle_mileage.py:267](app/views/vehicle/vehicle_mileage.py#L267) | P1 |
| C3 | "ผู้ใช้จ่ายเอง" (no_receipt) ซ้อนความหมายกับงบ "ส่วนตัว/จ่ายเอง" | คำว่า "จ่ายเอง" 2 ความหมาย — งบส่วนตัว vs OT ไม่ออกใบเสร็จ | แยกคำ: งบ→"งบส่วนตัว", OT→"ไม่เบิก/ไม่ออกใบเสร็จ" | [vehicle_cost.py:115,285](app/views/vehicle/vehicle_cost.py#L115) | P1 |
| C4 | OT rate config: `day_of_week` = เหมาจ่ายรายวัน, ไม่งั้นคูณชั่วโมง — toggle ซ่อนใน logic | admin ตั้ง rate ไม่รู้ว่าจะถูกคูณ ชม. หรือเหมา | ในฟอร์ม config แสดงชัด "โหมด: เหมารายวัน / ตามชั่วโมง" | [vehicle_cost.py:48-49](app/views/vehicle/vehicle_cost.py#L48) | P2 |
| C5 | mark_paid / toggle_no_receipt = action ทันที | จ่าย/ไม่จ่าย toggle ได้ (กลับได้) → ความเสี่ยงต่ำ | คงไว้ได้ — แค่ใส่ flash ยืนยันที่มีอยู่แล้ว ดีพอ | [vehicle_cost.py:248,273](app/views/vehicle/vehicle_cost.py#L248) | — |

---

## 4. Cross-cutting Findings

### X1 — ภาษางบไม่ตรงกัน (P0, กระทบทุกหน้า)
งบประเภทเดียวถูกเรียกหลายชื่อในแต่ละหน้า ผู้ใช้ต้องแปลในหัวเองว่าเป็นก้อนเดียวกัน:

| ประเภท | mileage แถว | mileage export | cost/OT | budget flash | code comment |
|---|---|---|---|---|---|
| central | งบส่วนกลาง | ส่วนกลาง | ส่วนกลาง | ส่วนกลาง | central |
| department | **งบส่วนกอง** | **หน่วยงาน** | **ส่วนกอง** | **งานกอง** | งานกอง |
| personal | **งบส่วนตัว** | **ส่วนตัว** | **จ่ายเอง** | — | — |

อ้างอิง: [vehicle_mileage.py:44-46](app/views/vehicle/vehicle_mileage.py#L44), [:404](app/views/vehicle/vehicle_mileage.py#L404) · [vehicle_cost.py:111-115](app/views/vehicle/vehicle_cost.py#L111) · [vehicle_budget.py:78](app/views/vehicle/vehicle_budget.py#L78) · [vehicle_common.py:48](app/views/vehicle/vehicle_common.py#L48)

**ข้อเสนอ:** กำหนด canonical label 3 คำ (เช่น `ส่วนกลาง / ส่วนกอง / ส่วนตัว`) เป็น constant
เดียวใน `vehicle_common.py` แล้วทุกหน้า import จากที่เดียว — แก้ครั้งเดียวคุมทั้งระบบ (ตรงกับกฎ DRY
ใน CLAUDE.md)

### X2 — คำว่า "จ่ายเอง" overload (P1)
3 จุดใช้คำใกล้กันคนละความหมาย: งบ "จ่ายเอง/ส่วนตัว" ([vehicle_cost.py:115](app/views/vehicle/vehicle_cost.py#L115)),
OT "ผู้ใช้จ่ายเอง" ([vehicle_cost.py:285](app/views/vehicle/vehicle_cost.py#L285)),
fuel "ผู้โดยสารจ่ายเอง" ([admin_fuel.html:128](app/templates/vehicle/admin/admin_fuel.html#L128)) →
รวมศัพท์ให้สื่อความหมายต่างกันชัด

### X3 — จังหวะเงินไม่มี feedback/confirm สม่ำเสมอ (P0/P1)
- มี confirm ดี: `cancel_booking` refund มี JS confirm + อธิบาย ledger ([vehicle_budget.js:196](app/static/vehicle/js/vehicle_budget.js#L196))
- **ไม่มี confirm:** ปิดไมล์หักงบ (L1), override ค่าน้ำมัน (C1)
- **ข้อเสนอ:** มาตรฐานเดียว — ทุก action ที่ทำให้ `used_amount` ขยับต้อง (ก) confirm ถ้าเป็น
  จำนวนมาก/refund (ข) flash บอกยอดที่ขยับเสมอ

### X4 — notification 3 ช่องทางไม่สม่ำเสมอ (P1)
Telegram (group), in-app, flash — แต่ละ event เลือกช่องทางต่างกัน (เช่น merge ส่งแค่ in-app,
Telegram ต้องกดปุ่ม btnNotify เอง [vehicle_admin.py:421](app/views/vehicle/vehicle_admin.py#L421)) →
user อาจพลาดข่าวขึ้นกับว่าเปิดช่องไหน **ข้อเสนอ:** ทำตารางมาตรฐาน event × ช่องทาง แล้วบังคับให้
status change สำคัญ (approve/reject/cancel) ส่งครบทั้ง in-app เสมอ

---

## 5. Prioritized Backlog

| P | id | งาน | effort | คุ้มสุด |
|---|---|---|---|---|
| **P0** | X1 | รวม label งบเป็น constant เดียวใน vehicle_common | S | ⭐ low effort, กระทบทั้งระบบ |
| **P0** | M1 | บังคับเลือกประเภทงบก่อน approve ใน admin_assign | S | ⭐ กัน data เพี้ยน |
| **P0** | L1/D3 | flash ปิดไมล์บอกยอดหักงบ + confirm ถ้าเกินเพดาน | M | ⭐ |
| **P0** | C1 | confirm override ค่าน้ำมัน (แสดงคืน-เก่า/หัก-ใหม่) | S | ⭐ |
| P1 | A1 | ซ่อน/เปลี่ยน label fuel badge ตอน pending | S | |
| P1 | A3 | แสดงงบคงเหลือหลังอนุมัติในใบ approver | M | |
| P1 | C2 | ประมาณการ OT ในใบจอง/หน้าอนุมัติ | M | |
| P1 | B1 | hint ช่วงเวลาไม่มี OT ก่อนเลือก | M | |
| P1 | L2/L3 | tooltip สถานะ + ปุ่มลัด "บันทึกกลับ" | S | |
| P1 | X2 | แยกคำ "จ่ายเอง" 3 จุด | S | |
| P1 | X4 | ตารางมาตรฐาน notification event × ช่องทาง | M | |
| P2 | B2,A2,A4,M2,M3,M4,G1,F2,C4 | polish ตามตารางด้านบน | — | |

**Quick wins (P0+S effort):** X1, M1, C1 — ทำได้เร็วและกัน bug เงิน/data ได้มากสุด

**ตัวอย่าง pattern ที่ดีอยู่แล้ว (ใช้เป็นต้นแบบขยายไปหน้าอื่น):** D2 (flash บอก next step),
F1 (meta ใต้ KPI), G2 (warning อธิบายผลกระทบเงิน)

---

## 6. Appendix — Visual Consistency (หมายเหตุสั้น, นอกขอบเขตหลัก)

จาก audit design-system (อ้างอิงรอบสำรวจ 2026-06-16) — ฝาก backlog แยก ไม่ใช่รอบนี้:
- shadow ค้างผิดกฎ "no shadow": `vehicle_admin.css:184`, `vehicle_cost.css:651,808`, `vehicle_mileage.css:190`, `vehicle_budget.css:482`
- hardcoded hex แทน token: `vehicle_cost.css` (~28 จุด)
- radius นอกสเกล (10/16px): `vehicle.css:1086,1295`
- font-weight 800 (เกิน 600): `vehicle_admin.css:392`, `vehicle_fuel.css`
- `--ds-*` legacy: ✅ ลบครบแล้ว ไม่พบ

---

## หมายเหตุการนำไปทำต่อ

ทุก finding มี file:line — หยิบไปเป็น Scoped Command (5 field ตาม CLAUDE.md) ได้ทันที
แนะนำเริ่มจาก **X1 → M1 → C1 → L1** (P0 ทั้งหมด, effort น้อย, กัน bug เงิน/data)
การแก้แต่ละข้อที่แตะ logic เงิน (L1, C1, M1) ต้องผ่าน devloop GUARD: เขียน/ขยาย test ก่อนแก้
