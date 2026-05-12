# Task Lifecycle — รายละเอียด

> ขั้นตอน + template สำหรับ start/สรุปงาน/จบงาน
> เปิดเฉพาะเมื่อจะเริ่ม/ปิด task — ไม่ต้องโหลดทุก turn

---

## เมื่อเริ่ม Task ใหม่

สร้างไฟล์ log ทันที: `docs/notes/log/YYYY-MM-DD_[task-slug].md`

```markdown
# [ชื่อ Task]
**วันที่:** YYYY-MM-DD
**สถานะ:** in-progress

## เป้าหมาย
[อธิบายสิ่งที่ต้องทำ]

## การตัดสินใจ
[decision + เหตุผล]

## ไฟล์ที่แก้ไข
[list]

## Docs sync checklist (ก่อน `จบงาน`)
- [ ] INDEX.md
- [ ] schema-current.md (ถ้าแก้ model)
- [ ] evolution.md (ถ้าแก้ model — ต้องมีเหตุผล)
- [ ] migrations-index.md (ถ้ามี .sql ใหม่)
- [ ] architecture.md (ถ้ากระทบ system-level)
- [ ] file-map.md (ถ้าเพิ่ม/ลบไฟล์)
```

---

## เมื่อมีคำสั่ง `สรุปงาน`

### 1. เปิด Preview (Dev Bypass)
`http://localhost:5001/dev/login/pjatuporn` — ถ้า server ไม่รัน → start ก่อน

### 2. ให้ Skills ตรวจ
- `/frontend-design` — UI structure / consistency
- `/emil-design-eng` — animation / polish
- `/design-system` — token / naming compliance

### 3. Debug ใน Browser
- `preview_console_logs` — error/warning
- `preview_network` — เฉพาะถ้ามี JS fetch/AJAX/POST ใหม่ และ**ถามก่อนทุกครั้ง**

### 4. Usability Friction Finder
| หัวข้อ | คำถาม |
|---|---|
| UI Consistency | icon / spacing / สี สม่ำเสมอไหม? |
| Copy Clarity | label / placeholder / error ชัดไหม? |
| Interaction Flow | ขั้นตอนมากไปไหม? |
| Mobile | จอเล็กใช้งานได้ไหม? ล้นไหม? |
| Empty / Error States | ถ้าไม่มีข้อมูล/error แสดงอะไร? |
| Accessibility | contrast / keyboard trap |

### 5. Docs Sync Check
- [ ] INDEX.md (ถ้าเพิ่ม route/function/template)
- [ ] schema-current.md + evolution.md (ถ้าแก้ model)
- [ ] log file มี decision + ไฟล์ที่เปลี่ยน

### 6. รายงานผลรวม
```
🔍 Usability Friction Report
─────────────────────────────
📐 Frontend Design:   [ผล]
✨ Emil Design Eng:   [ผล]
🎨 Design System:     [ผล]
🐛 Debug / Console:   [ผล]
📚 Docs Sync:         [ผล]

❌ ปัญหาที่พบ: [รายละเอียด + ไฟล์:บรรทัด]
⚠️  ควรระวัง: [รายละเอียด]
✅ ผ่าน: [หัวข้อที่ไม่มีปัญหา]
```

---

## เมื่อมีคำสั่ง `จบงาน`

1. ตรวจ Maintenance Protocol — sync เอกสารครบไหม (spawn `checker` agent)
2. บันทึกสุดท้ายใน log file (status=`completed`)
3. ย้าย `docs/notes/log/` → `docs/notes/doc/`
4. แจ้งชื่อไฟล์ปลายทาง

Template สรุปท้าย log:
```markdown
## สรุปการทำงาน
**สถานะ:** completed
**วันที่เสร็จ:** YYYY-MM-DD

### สิ่งที่ทำ
- [รายการ]

### การตัดสินใจสำคัญ
- [decision + เหตุผล]

### ไฟล์ที่เปลี่ยนแปลงทั้งหมด
- [รายการ]

### Docs sync
- [x] INDEX.md
- [x] schema-current.md (ถ้าแก้ model)
- ...
```
