# Mileage Admin — Cleanup + KPI (execute plan)
**วันที่:** 2026-07-21
**สถานะ:** completed

## เป้าหมาย
ทำตาม [2026-07-21_mileage-cleanup-plan.md](../doc/2026-07-21_mileage-cleanup-plan.md) — งานระดับ 0 (summary strip selection ครบ + JS bug fix) และระดับ 1 (KPI 4 cards คลิกกรองได้) บนหน้า `mileage_log`

## การตัดสินใจ
- ตามมติเจ้าของในแผน: C3 ทำครบ (ไม่ลบ), C1 โชว์ 4 ตัว (missing/pending_personal/month_total_cost/total_remaining), C2 (breakdown) นอก scope — **ยังไม่แตะ `_build_vehicle_breakdown()`/`breakdown`/`breakdown_totals` เลย** (คงไว้เหมือนเดิมทุกอย่าง รอเจ้าของตัดสินใจตาม plan §5)
- ทำตามลำดับ: 0A.1+1A.1 (markup รวด block เดียว) → 0A.2 → 0A.3 → 1A.2 → 1A.3 (ตรงตาม dependency graph ในแผน §4)
- Summary strip mode-toggle ใช้ inline `style.display` ตรงๆ ไม่ใช้ Bootstrap class `d-flex`/`d-none` — เพราะ Bootstrap utility เหล่านั้นมี `!important` จะทับ JS ที่เซ็ต `element.style.display` ไม่ได้ (พบระหว่างออกแบบ markup, ไม่ได้อยู่ในแผนต้นฉบับ แต่จำเป็นเพื่อให้ JS ที่มีอยู่แล้วทำงานถูก)
- KPI card ที่คลิกกรองได้ (`missing_count`/`pending_personal_count`) ห่อด้วย `<div data-kpi-filter role="button" tabindex="0">` รอบ `bb_kpi` เพราะ macro `bb_kpi` (raw Jinja macro, ไม่ใช่ Python component) ไม่รับ id/data attr — เพิ่ม keyboard handler (Enter/Space) เองด้วยเพราะประกาศ `role="button"` ต้องรองรับ keyboard
- "งบคงเหลือทั้งปี" แดงเมื่อ < 0 → ทำที่ inline style บน value span เท่านั้น (ไม่แก้ `bb_kpi` macro กลาง เพราะกระทบทุกหน้าที่ใช้ร่วม)

## ไฟล์ที่แก้ไข
**Code:**
- [app/templates/vehicle/admin/vehicle_mileage.html](../../../app/templates/vehicle/admin/vehicle_mileage.html) — summary strip (`#summaryStrip`/`#modeAll`/`#modeSelected`) + 4 KPI action cards + tab "ยังไม่ครบ" + hidden input `pending_personal`
- [app/static/vehicle/js/vehicle_mileage.js](../../../app/static/vehicle/js/vehicle_mileage.js) — แก้ `recalcSummary()` อ่าน `.is-on`/`.is-disabled`, เพิ่มเรียกใน `bindResults()`, เพิ่ม `bindKpiFilters()`, clearBtn reset `pending_personal`
- [app/views/vehicle/vehicle_mileage.py](../../../app/views/vehicle/vehicle_mileage.py) — `_parse_mileage_filters`/`_build_mileage_rows`/`mileage_log()` รองรับ filter `incomplete`/`pending_personal`

**Docs sync:**
- [docs/notes/INDEX_code.md](../INDEX_code.md) § Key Functions — แก้ line number ที่ shift (350/210/523) + note filter ใหม่ + bump วันที่
- [docs/notes/INDEX_ui.md](../INDEX_ui.md) § Templates + § Design System — เพิ่มย่อหน้าอธิบาย Zone 1 ใหม่ใน entry `vehicle_mileage.html` + addendum ใน entry `vehicle_mileage.js` (พร้อม flag ว่า phase history เก่าก่อน `803d857` ล้าสมัยแล้ว) + bump วันที่
- [app/components/CHEATSHEET.md](../../../app/components/CHEATSHEET.md) — แก้ typo pre-existing (`KPI variant: card|plain` → `card|ghost`, ตรงกับ macro จริง)

## Docs sync checklist (ก่อน `จบงาน`)
- [x] INDEX_ui.md § Templates + § Design System
- [x] INDEX_code.md § Key Functions (line number sync)
- [x] comment ในโค้ดสำหรับ filter param ใหม่ (incomplete/pending_personal)
- [x] ตัดสินใจเรื่อง C2 breakdown → **ไม่ตัดสินใจ ตามแผน (นอก scope, คงโค้ดเดิมไว้)**
- [x] spawn checker agent ก่อนปิดงาน — พบ 3 จุดเล็กน้อย (INDEX_ui.md js entry ไม่ sync, วันที่ header ค้าง, CHEATSHEET drift) แก้ครบแล้ว

## สรุปการทำงาน
**สถานะ:** completed
**วันที่เสร็จ:** 2026-07-21

### สิ่งที่ทำ
- Task 0A.1+1A.1: summary strip 2 โหมด (ghost KPI) + 4 KPI action cards (markup เดียวกัน Zone 1)
- Task 0A.2: แก้ `recalcSummary()` อ่าน `.bb-check-box` component ผิด (native `.checked`/`.disabled` → `.classList.contains()`)
- Task 0A.3: เรียก `recalcSummary()` ท้าย checkAll/row-click handler ที่ขาดไปเดิม
- Task 1A.2: controller filter `status=incomplete` (none+partial) + `pending_personal=1` เกณฑ์ตรงกับ `_calc_mileage_kpi`
- Task 1A.3: wire KPI card คลิก → filter (reuse `runFilter()` เดิม, ไม่มี fetch ใหม่) + clearBtn reset
- pytest: 97 passed, 0 failed (exit code 0)
- spawn `checker` agent verify Maintenance Protocol → พบ 3 จุดเล็กน้อย แก้ครบ

### การตัดสินใจสำคัญ
- ดูหัวข้อ "การตัดสินใจ" ด้านบน

### ไฟล์ที่เปลี่ยนแปลงทั้งหมด
- app/templates/vehicle/admin/vehicle_mileage.html
- app/static/vehicle/js/vehicle_mileage.js
- app/views/vehicle/vehicle_mileage.py
- docs/notes/INDEX_code.md
- docs/notes/INDEX_ui.md
- app/components/CHEATSHEET.md

### Docs sync
- [x] INDEX_code.md
- [x] INDEX_ui.md
- [x] CHEATSHEET.md (unrelated drift fix, low-risk)
- [ ] **ยังไม่ทำ (flag เป็น background task แยก):** INDEX_ui.md เกิน token budget (50,966/50,000) + entry `vehicle_mileage.js` มี phase history ที่ล้าสมัย (pre-`803d857`) — เป็นปัญหาเชิงระบบก่อนหน้างานนี้ ไม่ใช่ scope ของ mileage-cleanup-plan → spawn task แยกไว้แล้ว (task_74204e92)

### ค้างให้ผู้ใช้ทำ
- **ทดสอบ UI จริงใน browser** (`http://localhost:5001/dev/login/pjatuporn` → `/vehicle/mileage`) — server แยก process, agent ใช้ preview tool ไม่ได้: ติ๊ก checkbox → strip สลับโหมด/ตัวเลขถูกไหม, คลิก KPI "งานยังไม่ครบ"/"รอยืนยันจ่ายส่วนตัว" → filter ถูกกลุ่มไหม, remaining < 0 → แดงไหม (ถ้าไม่มีเคสติดลบตอนนี้ อาจต้องรอข้อมูลจริง), mobile responsive (4-col desktop / stack มือถือ)
