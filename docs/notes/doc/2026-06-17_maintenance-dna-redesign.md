# maintenance.html — DNA redesign (compliance)

> สถานะ: completed · 2026-06-17

## Scoped Command
- **[ไฟล์]**: `app/templates/maintenance/maintenance.html` + `app/static/maintenance/css/maintenance.css`
- **[ตำแหน่ง]**: header (47–67), KPI (70–140), status badge (234), technician badge (272–274), 4 modals (351–609)
- **[งาน]**: DNA compliance — (1) ลบ in-body header h1/h6 → action bar (2) KPI `.vc-kpi-group` → `.fuel-kpi` strip (3) status `vc-badge-blue` → `vc-badge-warning`, technician `vc-badge-blue` → neutral (4) 4 modal: inline style → `.vc-modal`, bootstrap form → DNA form class, ลบ emoji ใน `<option>`, `by_category` chip ลบ inline style
- **[ข้อจำกัด]**: `--vc-*` tokens · no shadow · reuse `.fuel-kpi` (ห้ามแก้ core) · ใช้ form class ที่มี style จริงเท่านั้น · ไม่แตะ backend/JS
- **[output]**: maintenance กลมกลืน DNA เท่า repair/admin_fuel

## Checklist
- [x] 1 PLAN
- [x] 2 GUARD — template+CSS เท่านั้น → ไม่ต้อง db-helper/test
- [x] 3 BUILD
- [x] 4 VERIFY — static เช็ก: ไม่มี form-control/form-select/form-label/input-group/emoji/vc-badge-blue ค้าง · form vocab (vc-form-* / vc-required / vc-form-hint) มี style จริง (form_group.css + vehicle_fuel.css ที่ maintenance โหลด) · browser ผู้ใช้ดูเอง
- [x] 5 SYNC — INDEX_ui.md (maintenance entry) + design_dna_redesign.md (migrated d)
- [x] 6 CLOSE

## ไฟล์ที่แก้
- `app/templates/maintenance/maintenance.html` — header→action bar · KPI→`.fuel-kpi` · 4 modal de-bootstrap · badge-blue→warning/neutral
- `docs/notes/INDEX_ui.md` · `docs/notes/design_dna_redesign.md` — sync
- maintenance.css: ไม่เปลี่ยน (ไม่มี orphan)

## หมายเหตุ
form vocab = `vc-form-*` (form_group.css กลาง) ต่างจาก mileage ที่ใช้ `vc-label` (mileage.css). เหลือหน้า room.html + vehicle.html (zendenta normalize)
