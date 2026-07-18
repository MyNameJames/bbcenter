# repair.html — DNA redesign (compliance)

> สถานะ: completed · 2026-06-17

## Scoped Command
- **[ไฟล์]**: `app/templates/repair/repair.html` + `app/static/repair/css/repair.css`
- **[ตำแหน่ง]**: page header (51–62), KPI strip (66–125), status badge (192), modal icons (280/396/441) · CSS: `.repair-modal-icon*`, `.repair-kpi-5`, `.repair-header`
- **[งาน]**: ทำให้ตรง DNA Zendenta-clean — (1) ลบ in-body header h1/h6 (ซ้ำ topbar page-title) (2) KPI `.vc-kpi-group.repair-kpi-5` → `.fuel-kpi` strip (3) icon modal mono (ลบ variant `--warning/--blue/--success`) (4) status `vc-badge-blue` → `vc-badge-warning`
- **[ข้อจำกัด]**: `--vc-*` tokens · no shadow · ห้ามแก้ core class `.fuel-kpi` (reuse) · Manrope global แล้ว (ไม่เพิ่ม link) · ไม่แตะ backend/JS logic
- **[output]**: หน้า repair กลมกลืน DNA เท่า admin_fuel/vehicle_budget

## Checklist
- [x] 1 PLAN — scoped 5 field + log file
- [x] 2 GUARD — แตะแค่ template+CSS, ไม่มี model/เงิน/สถานะ → ไม่ต้อง db-helper/test-first
- [x] 3 BUILD
- [x] 4 VERIFY — static เช็ก: ไม่มี ref ค้าง (.repair-kpi-5/repair-modal-icon--), vc-badge-warning + .fuel-kpi/.is-danger + vehicle_fuel.css โหลดที่ /repair (repair.html:16) ครบ · browser ผู้ใช้ดูเอง (server 5001)
- [x] 5 SYNC — INDEX_ui.md (entry + class inventory) + design_dna_redesign.md + checker PASS
- [x] 6 CLOSE

## ไฟล์ที่แก้
- `app/templates/repair/repair.html` — ลบ in-body header → action bar · KPI → `.fuel-kpi` strip · modal icon mono (3 จุด) · badge-blue → warning
- `app/static/repair/css/repair.css` — ลบ `.repair-kpi-5` + 3 icon variant · `.repair-modal-icon` → mono tile
- `docs/notes/INDEX_ui.md` · `docs/notes/design_dna_redesign.md` — sync

## หมายเหตุ (ส่งต่อหน้าถัดไป)
maintenance.html (ถัดไป) reuse pattern ได้: KPI `.fuel-kpi`, badge-blue → warning, ลบ in-body header. zendenta normalize อยู่ที่ vehicle.html
