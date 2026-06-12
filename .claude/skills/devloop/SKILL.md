---
name: devloop
description: >
  BBCenter development loop — บังคับทุกงานแก้/เพิ่ม code ให้ผ่าน 6 ขั้น
  PLAN→GUARD→BUILD→VERIFY→SYNC→CLOSE. ใช้ทุกครั้งที่เริ่ม task ที่จะแก้ไฟล์ใน
  app/ (code, template, CSS/JS, model) — ไม่ว่าผู้ใช้จะพิมพ์ /devloop,
  "เริ่มงาน", "ทำ feature", "แก้ bug", หรือสั่งแก้ code ตรงๆ ก็ตาม
  ยกเว้นงานอ่านอย่างเดียว/ตอบคำถาม ไม่ต้องใช้
---

# devloop — Development Loop ของ BBCenter

ทำไมต้องมี loop: โปรเจกต์นี้พังง่ายที่ 2 จุด — (1) logic เงิน/สถานะ (budget, approve, refund)
ที่ผิดแล้วเงินหาย และ (2) เอกสาร (INDEX/schema) ที่ drift จาก code แล้วทำให้ task ถัดไป
เผา token หาของไม่เจอ ทุกขั้นใน loop มีไว้กันสองอย่างนี้

ทำตามลำดับ ห้ามข้ามขั้น ถ้าขั้นไหน fail → กลับไปแก้ก่อน ไม่ไปขั้นถัดไป

## 1. PLAN — ก่อนแตะ code

- ตรวจ Scoped Command 5 field: `[ไฟล์] [ตำแหน่ง] [งาน] [ข้อจำกัด] [output]`
  ขาด field ไหน → ถามทีละ field จนครบ (กฎจาก CLAUDE.md ข้อ 7)
- หา symbol/route จาก [docs/notes/INDEX.md](../../../docs/notes/INDEX.md) ก่อนเสมอ —
  ห้าม glob/grep นำ ไฟล์ใหญ่ใน views/vehicle/ → spawn `guide-vehicle`
- สร้าง log file: `docs/notes/log/YYYY-MM-DD_<slug>.md`
  (template ใน [task-lifecycle.md](../../../docs/notes/task-lifecycle.md))

## 2. GUARD — ประเมินความเสี่ยงก่อนเขียน

| ถ้างานแตะ | ต้องทำก่อน BUILD |
|---|---|
| `app/models/` | spawn `db-helper` (gen migration + sync schema.md) |
| เงิน/สถานะ: budget, mileage deduct/refund, approve/reject/cancel | เขียนหรือขยาย test ใน `tests/` **ก่อน** แก้ code — ระบบนี้เคยมี gap จาก path ที่ไม่ได้ test |
| `VehicleBudget.used_amount/budget_amount/is_active` | ห้ามแก้ตรง — ผ่าน `vehicle_budget_service.py` เท่านั้น |
| logic ที่แสดงผลหลายหน้า (ค่าใช้จ่าย, KPI) | เช็กว่ามี helper/service กลางไหม — ถ้าคำนวณซ้ำ 2 ที่ ให้รวมเป็นที่เดียวก่อน ไม่ copy เพิ่มที่ที่สาม |

## 3. BUILD — เขียนตาม scope เท่านั้น

- ทำเฉพาะที่อยู่ใน `[งาน]` — เจอของควรแก้นอก scope → จดใน log file แล้วเสนอท้ายงาน ไม่แก้เลย
- Design: `--vc-*` tokens เท่านั้น (`--ds-*` ตายแล้ว) · no shadow · ห้าม inline `<script>` ใน template
- Error handling: `except Exception` → `current_app.logger.exception('<route> failed')` + flash ข้อความกลาง ห้าม flash `str(e)`

## 4. VERIFY — พิสูจน์ว่าทำงาน

- รัน `.venv/bin/python -m pytest` (แจ้งผู้ใช้ก่อนรัน bash ตามกฎโปรเจกต์)
- แตะ UI → ทำขั้น `สรุปงาน` ตาม task-lifecycle.md (skills ตรวจ design + console)
  — server port 5001 เป็น process ของผู้ใช้ ให้ผู้ใช้ทดสอบใน browser เอง
- test แดง = งานยังไม่เสร็จ รายงานตรงๆ ห้าม mark ผ่าน

## 5. SYNC — เอกสารต้องตาม code

- ไล่ตาราง Maintenance Protocol ใน CLAUDE.md ทีละแถว (route→INDEX_routes,
  model→schema.md Part1+2, template→INDEX_ui, ฯลฯ)
- spawn `checker` agent ยืนยัน — checker เจอของขาด → กลับมา sync ก่อน

## 6. CLOSE — ปิดงาน

- log file: status=`completed` + สรุป + รายการไฟล์ที่แก้
- ย้าย `docs/notes/log/...` → `docs/notes/doc/` แล้วแจ้ง path ผู้ใช้

## Quick checklist (copy ลง log file ตอน PLAN)

```markdown
- [ ] 1 PLAN — scoped 5 field ครบ + log file
- [ ] 2 GUARD — db-helper / test-first / service กลาง
- [ ] 3 BUILD — ใน scope + design rules
- [ ] 4 VERIFY — pytest เขียว + สรุปงาน (ถ้าแตะ UI)
- [ ] 5 SYNC — Maintenance Protocol + checker ผ่าน
- [ ] 6 CLOSE — log → doc/
```
