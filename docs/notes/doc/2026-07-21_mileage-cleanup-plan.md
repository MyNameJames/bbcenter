# Mileage Admin — Cleanup + KPI Plan (ระดับ 0 + 1)

> **สร้าง:** 2026-07-21 · **สถานะ:** พร้อมมอบหมาย (ผู้วางแผนไม่ใช่ผู้ทำ)
> **หน้า:** `mileage_log` — [app/views/vehicle/vehicle_mileage.py](../../../app/views/vehicle/vehicle_mileage.py) + [app/templates/vehicle/admin/vehicle_mileage.html](../../../app/templates/vehicle/admin/vehicle_mileage.html) + [app/static/vehicle/js/vehicle_mileage.js](../../../app/static/vehicle/js/vehicle_mileage.js)
> **อ่านก่อนเริ่ม:** [vehicle_product_spec.md](../vehicle_product_spec.md) (North Star) · [design_guideline.md](../design_guideline.md) · [CHEATSHEET.md](../../../app/components/CHEATSHEET.md)

---

## 0. บริบท — ทำไมต้องทำ

หลัง commit `803d857 Mileage UE redesign` template ถูกออกแบบใหม่ แต่ **controller + JS ยังคำนวณ/อ้างของเก่าที่ template ไม่ render แล้ว** (ยืนยันด้วย grep 2026-07-21 — ไม่มี ref เหล่านี้ใน `vehicle_mileage.html` เลย):

| # | สิ่งที่ค้าง | อยู่ที่ | template ใช้? |
|---|---|---|---|
| C1 | KPI 6 ตัว: `month_total_cost` `total_budget` `total_used` `total_remaining` `pending_personal_count` `missing_count` | controller `_calc_mileage_kpi()` → ส่งเข้า template ครบ | ❌ ไม่ใช้เลย |
| C2 | `breakdown` / `breakdown_totals` (ค่าน้ำมันรายคัน × 12 เดือน) | controller `_build_vehicle_breakdown()` | ❌ ไม่ใช้เลย |
| C3 | Bulk selection: `summaryStrip` `modeAll` `modeSelected` `selCount` `selDistance` `selCost` `sumAllCount` `sumAllDistance` | JS `recalcSummary()` / `calcAllSummary()` | ❌ element ไม่มีใน DOM |

**นอกจากค้างแล้ว JS ยังมี bug ซ่อน** (จะไม่ทำงานถึงจะเอา element กลับมา): `recalcSummary()` อ่าน `cb.checked` / `cb.disabled` (native input API) แต่ checkbox จริงเป็น `<span class="bb-check-box">` ที่ใช้ class `.is-on` / `.is-disabled` — และ `checkAll` / row-click handler **ไม่เคยเรียก** `recalcSummary()` เลย

**มติเจ้าของ (2026-07-21):**
- C3 → **ทำ summary strip ให้ครบ** (ไม่ลบ)
- C1 → **โชว์ทั้ง 4 ตัว**: `missing_count` · `pending_personal_count` · `month_total_cost` · `total_remaining` (+ คง "ค่าน้ำมันรวม live" เดิม)
- C2 (breakdown) → **นอก scope รอบนี้** (เป็นระดับ 2 / analytics) — ดู §5

---

## 1. ข้อจำกัดร่วม (ห้ามละเมิด — ทุก task)

1. **North Star:** หน้านี้ = execution + cost view (Phase 4). ค่าน้ำมัน/ระยะทางนับจาก **representative (leader) row เท่านั้น** — ห้ามนับทุก booking row (double-count, spec §4). โครงเดิมถูกอยู่แล้ว อย่าไปแก้ให้ผิด
2. **Design:** ใช้ design token `--bb-*` + component `bb_*` (จาก [CHEATSHEET.md](../../../app/components/CHEATSHEET.md)) เท่านั้น. ตาราง = `data-table` ห้าม `table-striped/hover/bordered`. ห้าม `border-left` สีพิเศษบน KPI/card. ห้าม inline `<script>` ใน template (JS อยู่ใน `.js`)
3. **Architecture:** logic แตะเงิน/สถานะ = ห้ามเขียนใน controller (ADR 0001). งานนี้ **ไม่แตะ** logic หักงบ/OT เลย — แค่ display + filter param เพิ่ม จึงอยู่ใน controller/template/js ได้
4. **JS contract:** element id ที่ JS อ้างอยู่แล้วต้องตั้งชื่อให้ตรงเป๊ะ (ดู §2 task 0A.1) — ผิดตัวอักษรเดียว = strip ไม่ทำงาน

---

## 2. งานระดับ 0 — เก็บกวาด selection ให้ครบ

### Task 0A.1 — เพิ่ม Summary Strip (template)

```
[ไฟล์]  app/templates/vehicle/admin/vehicle_mileage.html
[ตำแหน่ง] แทนที่ Zone 1 KPI เดิม (บรรทัด ~173–179 — block <div class="row g-0 pt-3 pb-3"> ที่มี bb_kpi ค่าน้ำมันรวมตัวเดียว)
[งาน]   สร้าง summary strip 2 โหมด + ต่อด้วยแถว KPI cards (task 1A.1)
[ข้อจำกัด] element id ต้องตรง JS contract ด้านล่างเป๊ะ · ใช้ bb-* tokens
[output] strip แสดงยอด "ที่กรอง" (modeAll) และสลับเป็นยอด "ที่เลือก" (modeSelected) เมื่อติ๊ก checkbox
```

**JS contract — id ที่ต้องมี (JS อ้างอยู่แล้ว ห้ามเปลี่ยนชื่อ):**
- container: `id="summaryStrip"` (JS toggle class `.is-selected`)
- โหมดปกติ: `id="modeAll"` (แสดง `id="sumAllCount"` ทริป · `id="sumAllDistance"` กม. · `id="sumAllCost"` บาท)
- โหมดเลือก: `id="modeSelected"` (แสดง `id="selCount"` · `id="selDistance"` · `id="selCost"`) + ปุ่มล้าง `onclick="clearSelection()"`

> `sumAllCost` เดิมมีอยู่แล้วใน 173–179 (JS `calcAllSummary` fill) — ย้ายเข้า strip. `sumAllCount`/`sumAllDistance` เพิ่มใหม่ (JS มี `if(elN)`/`if(elD)` guard อยู่แล้ว จึงปลอดภัยถ้ายังไม่ครบ แต่รอบนี้ให้ใส่ครบ)

### Task 0A.2 — แก้ JS อ่าน state ให้ตรง component (bug fix)

```
[ไฟล์]  app/static/vehicle/js/vehicle_mileage.js
[ตำแหน่ง] function recalcSummary() (บรรทัด ~302–345)
[งาน]   เปลี่ยนการอ่าน native checkbox API → class ของ bb-check-box span
[ข้อจำกัด] setCheck() เขียน .is-on อยู่แล้ว — อ่านต้องตรงกัน
[output] เลือก checkbox → summary strip อัปเดตจำนวน/ระยะทาง/ค่าน้ำมันถูกต้อง
```

จุดแก้ (ทุกจุดใน `recalcSummary`):
- `cb.checked` → `cb.classList.contains('is-on')` (บรรทัด ~307, ~336, ~339)
- `!cb.disabled` → `!cb.classList.contains('is-disabled')` (บรรทัด ~330)
- `$checkAll` เป็น `<span class="bb-check-box">` ไม่ใช่ native input → `$checkAll.indeterminate` / `$checkAll.checked` (บรรทัด ~328–344) ใช้ไม่ได้:
  - "ครบทุกแถว" → `setCheck($checkAll, true)`
  - "บางแถว/ไม่มี" → `setCheck($checkAll, false)` (indeterminate: ข้ามได้ หรือ toggle class `.is-indeterminate` ถ้าจะทำ visual — ตรวจ CSS ก่อนว่ามี rule รองรับไหม ไม่มีก็ข้าม)

### Task 0A.3 — เรียก recalcSummary() หลัง toggle (bug fix)

```
[ไฟล์]  app/static/vehicle/js/vehicle_mileage.js
[ตำแหน่ง] bindResults() — checkAll handler (~589–596) + row-click handler (~598–604)
[งาน]   เพิ่ม recalcSummary() ท้าย handler ทั้งสอง(หลัง setCheck)
[ข้อจำกัด] อย่าเรียกใน setCheck() เอง (setCheck ใช้ตอน init ด้วย)
[output] ติ๊ก/ล้าง แถวเดียวหรือ checkAll → strip สลับโหมด + ยอดอัปเดตทันที
```

**AC รวม Task 0A:** ติ๊กแถว → strip เปลี่ยนเป็น "เลือก N · ระยะทาง · ค่าน้ำมัน" ของที่เลือก · ล้างหมด → กลับโหมดยอดรวมที่กรอง · checkAll ติ๊ก/ล้างทุกแถวที่ครบ (ข้ามแถว `.is-disabled`)

---

## 3. งานระดับ 1 — KPI zone (actionable)

### Task 1A.1 — เพิ่ม 4 KPI cards (template)

```
[ไฟล์]  app/templates/vehicle/admin/vehicle_mileage.html
[ตำแหน่ง] ต่อจาก summary strip (task 0A.1) ใน Zone 1 เดิม
[งาน]   4 KPI cards ด้วย bb_kpi (ดู CHEATSHEET signature)
[ข้อจำกัด] responsive: desktop 4-col, mobile stack. remaining < 0 = โทน danger (แดง)
[output] แสดงตัวเลขจาก controller vars (ส่งมาครบแล้ว ไม่ต้องแก้ _calc_mileage_kpi)
```

| Card | var (มีแล้ว) | icon | คลิก? |
|---|---|---|---|
| ค่าน้ำมันเดือนนี้ | `month_total_cost` | `calendar` | — |
| งานยังกรอกไมล์ไม่ครบ | `missing_count` | `alert-triangle` | ✅ → filter incomplete (1A.2) |
| รอยืนยันจ่ายส่วนตัว | `pending_personal_count` | `wallet` | ✅ → filter pending_personal (1A.2) |
| งบคงเหลือทั้งปี | `total_remaining` | `piggy-bank` | — (แดงถ้า < 0 = ปิด gap A2 in-place) |

> **A2 (เตือนงบเกิน)** ปิดด้วยการ์ด remaining โทนแดงเมื่อ < 0 — ไม่ทำ banner แยก (รายก้อนดูที่หน้า "งบประมาณ")

### Task 1A.2 — filter param ให้ KPI คลิกกรองได้ (controller)

```
[ไฟล์]  app/views/vehicle/vehicle_mileage.py
[ตำแหน่ง] _parse_mileage_filters() (~275) + _build_mileage_rows() (~151) + mileage_log() f dict (~387)
[งาน]   รองรับ 2 filter ใหม่: status='incomplete' และ pending_personal=1
[ข้อจำกัด] เกณฑ์ต้องตรงกับที่ _calc_mileage_kpi นับ (ตัวเลข KPI = จำนวนแถวหลังกรอง)
[output] คลิก KPI → หน้ากรองเหลือเฉพาะกลุ่มนั้น
```

- **incomplete** (= missing): ใน `_build_mileage_rows` บรรทัด ~156 `if f_status and f_status != status_key` — เพิ่มเคส: ถ้า `f_status == 'incomplete'` ผ่านเฉพาะ `status_key in ('none','partial')`
- **pending_personal**: parse param ใหม่ใน `_parse_mileage_filters` + filter ใน `_build_mileage_rows` = `b.expense_type=='personal' and m and m.odometer_end is not None and m.personal_status == 0` (เกณฑ์เดียวกับ `_calc_mileage_kpi` บรรทัด 230–234) + เพิ่มใน `f={...}` dict (~387) เพื่อ persist

### Task 1A.3 — wire KPI click (template + js)

```
[ไฟล์]  vehicle_mileage.html (hidden input + data attr) + vehicle_mileage.js
[ตำแหน่ง] form#filterForm เพิ่ม <input hidden name="pending_personal"> · KPI card เพิ่ม data-*
[งาน]   คลิก card → set filter ที่เกี่ยว → runFilter() (AJAX เดิม)
[ข้อจำกัด] ใช้ runFilter() ที่มีอยู่ ห้ามเขียน fetch ใหม่ · ตาม pattern bindStatusTabs (~131)
[output] missing → statusFilter='incomplete' + runFilter · pending → pending_personal='1' + runFilter
```

- status tabs (optional): เพิ่ม tab "ยังไม่ครบ" value `incomplete` ที่ `tab2_tabs` (~46) ให้ UI สอดคล้องเวลากรองจาก KPI
- ปุ่มล้าง filter (`clearBtn` ~250) ต้อง reset `pending_personal` ด้วย

**AC รวม Task 1A:** KPI 4 ใบแสดงเลขถูก · คลิก "งานยังไม่ครบ" → เห็นเฉพาะ none+partial · คลิก "รอเก็บเงินส่วนตัว" → เห็นเฉพาะ personal ที่ปิดทริปแล้วยังไม่เก็บ · remaining < 0 เป็นแดง · ล้าง filter คืนค่าปกติ

---

## 4. ลำดับแนะนำ + dependency

```
0A.1 (strip markup) ─┐
                     ├─> 0A.2 (js อ่าน .is-on) ─> 0A.3 (js เรียก recalc) ─> ✅ selection ครบ
1A.1 (kpi markup) ───┘
1A.2 (controller filter) ─> 1A.3 (wire click) ─> ✅ kpi actionable
```

- ทำ **0A ก่อน 1A** ได้ หรือทำ markup (0A.1+1A.1) รวดเดียวเพราะอยู่ block เดียวกัน แล้วค่อยตาม js/controller
- ทดสอบด้วย dev login `http://localhost:5001/dev/login/pjatuporn` → `/vehicle/mileage`

---

## 5. นอก scope รอบนี้ (อย่าเพิ่งทำ)

- **C2 breakdown** (ค่าน้ำมันรายคัน × เดือน) — เป็น analytics ระดับ 2. ถ้ายังไม่ทำ chart รอบนี้ → **ตัด `_build_vehicle_breakdown()` + 2 var ที่ส่งเข้า template ออกก่อน** (หยุดคำนวณเปล่า) แล้วบันทึกใน [future_features.md](../future_features.md) ว่าจะทำ chart utilization; **หรือ** คงไว้ถ้าจะทำต่อทันที — ตัดสินใจกับเจ้าของก่อนแตะ
- รายงานวางแผนปี (spec §7.2)
- ❌ อย่าเพิ่ม: ให้ user กรอกไมล์เอง / self-service / นับ cost จากทุก row

---

## 6. Maintenance Protocol — sync ก่อนปิดงาน

| แก้ | ต้องอัปเดต |
|---|---|
| template โครง KPI/strip เปลี่ยน | [INDEX_ui.md](../INDEX_ui.md) § Templates |
| filter param ใหม่ (incomplete/pending_personal) | comment ในโค้ด + (ถ้ามี page doc ของ mileage) |
| ถ้าตัด `_build_vehicle_breakdown` | [INDEX_code.md](../INDEX_code.md) § Key Functions |
| ถ้าสร้าง component ใหม่ (strip เป็น bb-* ใหม่) | [CHEATSHEET.md](../../../app/components/CHEATSHEET.md) + section ใน `/dev/components` |

**ก่อน mark เสร็จ:** spawn `checker` agent (verify Maintenance Protocol) — บังคับตาม CLAUDE.md
