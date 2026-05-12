# CLAUDE.md Token Optimization — ตัด CLAUDE.md ให้กระชับ
**วันที่:** 2026-04-25
**สถานะ:** completed

## เป้าหมาย
ลดขนาด CLAUDE.md (โหลดอัตโนมัติทุก turn) เพื่อประหยัด token ต่อ turn

## การตัดสินใจ
- **ย้าย Task Lifecycle (template + สรุปงาน 6 ขั้นตอน + จบงาน) → `docs/notes/task-lifecycle.md`**
  เหตุผล: ส่วนนี้ใช้เฉพาะตอน start/ปิด task ไม่จำเป็นต้องอยู่ใน context ทุก turn
- **ลบ Project Structure tree** — ซ้ำกับ file-map.md
- **ย่อ AI Rules / Stack / Gotchas / Design / Subagents** ให้เป็น bullet สั้น
- **ไม่ลบ Maintenance Protocol table** — ใช้บ่อยที่สุด ต้องอยู่ใน context

## สรุปการทำงาน

### สิ่งที่ทำ
- ตัด CLAUDE.md จาก **288 → 120 บรรทัด** (~58% reduction, 8KB → 6KB)
- สร้าง `docs/notes/task-lifecycle.md` — เก็บ template เริ่ม task + ขั้นตอน `สรุปงาน` + `จบงาน`
- อัปเดต `docs/notes/file-map.md` — เพิ่ม task-lifecycle.md ในตาราง docs/

### ไฟล์ที่เปลี่ยนแปลงทั้งหมด
- `CLAUDE.md` — ตัดและจัดโครงใหม่
- `docs/notes/task-lifecycle.md` — ไฟล์ใหม่
- `docs/notes/file-map.md` — เพิ่ม task-lifecycle.md entry, อัปเดตวันที่

### Docs sync
- [x] file-map.md — เพิ่ม task-lifecycle.md
- [x] INDEX.md (ไม่กระทบ — ไม่แก้ route/function/template)
- [x] schema-current.md (ไม่แก้ model — ข้าม)
- [x] evolution.md (ไม่แก้ model — ข้าม)
- [x] migrations-index.md (ไม่มี SQL — ข้าม)
- [x] architecture.md (ไม่กระทบ system — ข้าม)

## หมายเหตุ
- Workflow tips สำหรับใช้ AI ประหยัด token (one task one session, บอกไฟล์เป้าหมายชัด, "ตอบสั้น", spawn subagent) — สื่อสารกับผู้ใช้แล้วในบทสนทนา ไม่ได้ใส่ใน CLAUDE.md เพื่อรักษาขนาดไฟล์
