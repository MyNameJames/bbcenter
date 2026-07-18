# Cell Component — Status/Badge ใน cell ของ Table

> status: completed · 2026-06-29

## Scoped Command
- **[ไฟล์]**: แก้ `app/components/table.py` (Column +field `cell`) · `app/app.py` (demo status column) · `app/templates/dev/components.html` (โชว์) · docs (ลบ limitation note)
- **[ตำแหน่ง]**: `Column.to_cfg()` · `_bb_cell` ใช้ `col.render(row)` เดิม (ไม่แตะ macro)
- **[งาน]**: ให้ `Column(cell=lambda row: Component)` → map เป็น cfg `render` = callable คืน `.render()` → `bb_table_v2` เรียก `{{ col.render(row) }}` ได้เลย (Jinja เรียก Python callable ได้) → ตารางมี badge/status ได้ในตัว
- **[ข้อจำกัด]**: ไม่แตะ macro `bb_table_v2` · component ห้าม query/permission · cell = callable คืน BaseComponent
- **[output]**: `/dev/components` ตาราง vehicle มีคอลัมน์สถานะ render ผ่าน Status

## Checklist
- [x] 1 PLAN
- [x] 2 GUARD — ไม่แตะ model/เงิน → ไม่ต้อง test-first
- [x] 3 BUILD
- [x] 4 VERIFY — test_client: 3 `<td>` มี `bb-status-inline` (is-ok/is-wr) ใน `<tr>` ของตาราง
- [x] 5 SYNC — INDEX_ui (limitation → Cell Component) · architecture · table.py docstring
- [x] 6 CLOSE

## ผล
Cell Component เสร็จ — `Column(cell=lambda row: Component)` ทำให้ Table มี badge/status ในตัว. แก้ limitation เดิมโดยไม่แตะ macro (Jinja เรียก Python callable ได้). ตาราง custom-cell migrate เข้า `Table` ได้แล้ว step ถัดไป: migrate ตารางจริง (mileage/booking) หรือ component ตัวถัดไป (Button)

## insight
limitation เดิม ("Python ส่ง render macro ไม่ได้") จริงๆ แก้ได้ใน Python layer ล้วน — Jinja เรียก Python callable ได้ ไม่ต้องแก้ macro
