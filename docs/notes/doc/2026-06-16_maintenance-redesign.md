# Task: redesign maintenance.html (mirror repair redesign)

status: completed
date: 2026-06-16

## Scoped Command
- [ไฟล์]: app/templates/maintenance/maintenance.html · app/static/maintenance/css/maintenance.css · app/static/maintenance/js/maintenance.js
- [ตำแหน่ง]: page header + DataTables footer/pagination
- [งาน]: mirror repair redesign — (1) header budget style (`fw-bold text-accent` h1 + `text-muted text-header`), (2) custom pagination pill accent + go-to-page, (3) re-init lucide icons on draw (เดิมไม่มี → icon ในหน้า 2+ หาย)
- [ข้อจำกัด]: `--vc-*` tokens · no shadow (ยกเว้น focus ring) · no inline script · scope `#maintenanceTable_wrapper`
- [output]: maintenance redesigned

## Decisions
- DRY: นี่คือ copy #2 ของ pagination pattern (repair = #1). กฎโปรเจกต์ extract ที่ copy #3 → ยอม duplicate ตอนนี้, ถ้ามีหน้า #3 ค่อย extract เป็น shared component
- maintenance.js เป็น classic script (ไม่ใช่ ES module) → เพิ่ม local `reinitIcons()` + `buildGotoPage()` แทน import

## Checklist
- [x] 3 BUILD — header + pagination + reinitIcons
- [x] 5 SYNC — INDEX_ui.md (3 entries)
- [x] 6 CLOSE — log → doc/

## Files changed
- app/templates/maintenance/maintenance.html — header → budget style
- app/static/maintenance/css/maintenance.css — ลบ title/subtitle, + pagination/goto styles
- app/static/maintenance/js/maintenance.js — reinitIcons() + renderGotoPage(), pageLength:10
- docs/notes/INDEX_ui.md — 3 entries synced
