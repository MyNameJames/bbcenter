# Claude Context & Documentation Restructure
**วันที่:** 2026-04-24
**สถานะ:** completed
**วันที่เสร็จ:** 2026-04-24

## เป้าหมาย
ปรับโครงสร้างเอกสาร + CLAUDE.md ให้ Claude ทำงานได้เร็วขึ้น ใช้ token น้อยลง และมีกลไก "ต้องอัปเดต" เมื่อ codebase เปลี่ยน

### 6 สิ่งที่ user ขอ
1. ให้ Claude รู้ว่าอะไรอยู่ตรงไหน (token-efficient)
2. อัปเดต log ทุก action
3. DB evolution จาก v1 → ปัจจุบัน + เหตุผล
4. จัดโครงสร้างไฟล์ใหม่
5. ปรับ CLAUDE.md ให้ตรงโครงสร้างใหม่
6. แนะนำ subagent ที่ควรมีเพิ่ม

### กฎหลักที่ user ย้ำ
**ทุกครั้งที่มีการเปลี่ยน code/structure → ต้องอัปเดตไฟล์พื้นฐานเหล่านี้ตามด้วย**
→ จะใส่เป็น rule ใน CLAUDE.md ให้ Claude บังคับทำเอง

---

## การตัดสินใจ

### D1: แบ่งเอกสารเป็น 3 tier
- **Tier 1 (always load):** `CLAUDE.md` — กฎ + pointer
- **Tier 2 (on demand):** `docs/notes/INDEX.md` — map ของทุก symbol/file/route
- **Tier 3 (deep dive):** ไฟล์เฉพาะทางใน `docs/notes/database/`, `doc/`, `log/`

เหตุผล: Claude อ่าน Tier 1 เสมอ (context อัตโนมัติ) → ใช้ Tier 2 เมื่อต้อง locate symbol → Tier 3 เมื่อต้อง deep understanding เท่านั้น

### D2: ไม่ใส่ source code ใน INDEX
INDEX.md จะมีแค่ `file:line` + 1 บรรทัดอธิบาย → Claude อ่านแล้ว Read เฉพาะจุดที่ต้องการได้ทันที ไม่ต้อง glob/grep

### D3: DB evolution เอามาจาก git log + log files
git log + `docs/notes/log/2026-04-06_db-improvements.md` + log files อื่น ๆ → reconstruct timeline

### D4: ลบ docs/notes/claude.md (ซ้ำ CLAUDE.md root)
confirmed by user

### D5: เพิ่ม "Maintenance Protocol" ใน CLAUDE.md
เงื่อนไขบังคับ: ทุกการ เพิ่ม/แก้/ลบ ต้อง trigger อัปเดตไฟล์ใด — ระบุ cross-reference ชัดเจน

---

## ไฟล์ที่แก้ไข / สร้างใหม่
(อัปเดตระหว่างทำงาน)

### สร้างใหม่
- `docs/notes/log/2026-04-24_claude-context-restructure.md` (ไฟล์นี้)
- `docs/notes/INDEX.md`
- `docs/notes/file-map.md`
- `docs/notes/database/schema-current.md`
- `docs/notes/database/evolution.md`
- `docs/notes/database/migrations-index.md`

### แก้ไข
- `CLAUDE.md` (เพิ่ม maintenance protocol + reading strategy)
- `docs/notes/architecture.md` (sync กับปัจจุบัน)

### ลบ
- `docs/notes/claude.md` (ซ้ำกับ root) ✅

---

## สรุปการทำงาน

### สิ่งที่ทำ
1. **Phase 1** — สร้าง log file นี้
2. **Phase 2** — สร้าง `INDEX.md` (route/function/model lookup) + `file-map.md`
3. **Phase 3** — สร้าง `database/schema-current.md` + `evolution.md` (v1→v2.2 + เหตุผลทุก change) + `migrations-index.md`
4. **Phase 4** — ลบ `docs/notes/claude.md` ที่ซ้ำ
5. **Phase 5** — rewrite `architecture.md` (sync กับปัจจุบัน) + rewrite `CLAUDE.md` (เพิ่ม Reading Strategy + Maintenance Protocol)
6. **Phase 6** — recommend subagents (รายงานใน response)

### การตัดสินใจสำคัญ
- **Tier system:** CLAUDE.md (auto) → INDEX.md (lookup) → deep files (on-demand) → ลด token
- **Maintenance Protocol ฝังใน CLAUDE.md** — บังคับ sync เอกสารก่อน mark task เสร็จ (แก้ปัญหา doc drift)
- **Evolution.md เก็บ "เหตุผล" ทุก field** — ไม่ใช่แค่ what changed แต่ why — ใช้ตอน debate/revisit design
- **ลบ claude.md ตัวเล็ก** — เก็บ root CLAUDE.md ไว้อย่างเดียว
- **ไม่ใส่ source code ใน INDEX** — แค่ `file:line` + 1 บรรทัด เพื่อให้ Claude `Read` เฉพาะจุด

### ไฟล์ที่เปลี่ยนแปลงทั้งหมด
**สร้างใหม่:**
- `docs/notes/log/2026-04-24_claude-context-restructure.md`
- `docs/notes/INDEX.md`
- `docs/notes/file-map.md`
- `docs/notes/database/schema-current.md`
- `docs/notes/database/evolution.md`
- `docs/notes/database/migrations-index.md`

**แก้ไข:**
- `CLAUDE.md` (เพิ่ม Reading Strategy + Maintenance Protocol)
- `docs/notes/architecture.md` (sync + เพิ่ม Maintenance Protocol + notification arch)

**ลบ:**
- `docs/notes/claude.md` (ซ้ำซ้อน)

**Subagents สร้าง (`.claude/agents/`):**
- `checker.md` — doc sync checker
- `db-helper.md` — migration + docs sync ใน call เดียว
- `guide-vehicle.md` — navigator ใน vehicle_view.py
- `notifee.md` — notification flow auditor

(ยกเลิก persona-user / persona-admin ตาม user confirm)

### Docs sync
- [x] INDEX.md (ไฟล์ใหม่)
- [x] schema-current.md (reflect models.py ปัจจุบัน)
- [x] evolution.md (v1.0 → v2.2 + เหตุผล)
- [x] migrations-index.md (มี 1 entry)
- [x] architecture.md (rewrite)
- [x] file-map.md (ไฟล์ใหม่)
- [x] CLAUDE.md (Maintenance Protocol)
