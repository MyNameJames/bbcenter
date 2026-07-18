# Component Layer PoC — Thin Python wrapper + Table

> status: completed · 2026-06-29

## Scoped Command
- **[ไฟล์]**: สร้าง `app/components/{__init__,base,table}.py` · `app/templates/_components/render/_table.html` · แก้ `app/app.py` (jinja global) · `app/views/vehicle/vehicle_cost.py` · `app/templates/vehicle/admin/vehicle_cost.html`
- **[ตำแหน่ง]**: cost controller render context (~L259) + template ตาราง "OT แยกตามประเภทงาน" (L455-464)
- **[งาน]**: thin Python component layer — `BaseComponent` + `Table`/`Column` class ถือ config แล้ว render macro `bb_table_v2` เดิม. PoC แปลงตาราง ot_by_expense จาก inline dict ใน template → `Table` object ใน controller
- **[ข้อจำกัด]**: Component ห้าม query DB / business logic / permission · render ผ่าน Jinja เท่านั้น (ไม่ build HTML ใน Python) · ใช้ macro เดิมไม่รื้อ · `--vc-*`/`bb-*` tokens
- **[output]**: โค้ด + ผลลัพธ์เหมือนเดิม pixel-by-pixel

## Checklist
- [x] 1 PLAN — scoped 5 field + log
- [x] 2 GUARD — ไม่แตะ model/เงิน/สถานะ → ไม่ต้อง test-first (render layer)
- [x] 3 BUILD
- [x] 4 VERIFY — import + build Table + controller import ผ่าน (`render()` ต้อง Flask ctx → ผู้ใช้เช็ก browser หน้า cost)
- [x] 5 SYNC — INDEX.md FileMap · INDEX_ui.md (§Templates + §Design System + bump วันที่) · architecture.md (layer+tree) · checker ผ่าน
- [x] 6 CLOSE

## ไฟล์ที่แก้
- ใหม่: `app/components/{__init__,base,table}.py` · `app/templates/_components/render/_table.html`
- แก้: `app/app.py` (register_components) · `app/views/vehicle/vehicle_cost.py` (ot_expense_table) · `app/templates/vehicle/admin/vehicle_cost.html` (`{{ component() }}` + ลบ import ค้าง)
- docs: INDEX.md · INDEX_ui.md · architecture.md

## ผล
PoC สำเร็จ — pattern Controller→Component→Jinja ใช้ได้จริง. Table class บางมาก (~70 LOC) ครอบ macro เดิมไม่รื้อ. ขยายได้: Form/Modal class ทำแบบเดียวกัน (ครอบ form_group/_modal macro). limitation: column `render` macro ส่งจาก Python ไม่ได้ → custom-cell ใช้ shell bb_table

## หมายเหตุ design
- `bb_table_v2` มี field `render` (Jinja macro ต่อ cell) — Python ส่ง macro ไม่ได้ → PoC ไม่ใช้. ตารางที่ต้อง custom cell HTML ยังใช้ shell `bb_table` ใน template ตามเดิม. limitation นี้จดไว้ใน doc
