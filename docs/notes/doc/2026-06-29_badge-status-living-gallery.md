# Badge/Status component + Living gallery scaffold

> status: completed · 2026-06-29

## Scoped Command
- **[ไฟล์]**: ใหม่ `app/templates/_components/bb/badge.html` · `_components/render/_badge.html` · `_components/render/_status.html` · `app/components/badge.py` · `app/templates/dev/components.html` · แก้ `app/components/__init__.py` · `app/app.py` (route `/dev/components`)
- **[ตำแหน่ง]**: gallery section 10 (Badge) + 11 (Status) เป็น spec ของ markup
- **[งาน]**: (1) แตก markup `.bb-badge`/`.bb-status`/`.bb-status-inline` จาก gallery → macro · (2) Python class `Badge`/`Status` ครอบ macro · (3) ตั้ง living gallery `/dev/components` render component จริง (Table/Badge/Status) ผ่าน `{{ component(obj) }}`
- **[ข้อจำกัด]**: markup ต้องตรง gallery เป๊ะ · ไม่แตะ static gallery (canonical) · ไม่สร้าง `.bb-*` class ใหม่ · component ห้าม query/permission
- **[output]**: โค้ด + `/dev/components` แสดง badge/status เหมือน gallery

## Checklist
- [x] 1 PLAN
- [x] 2 GUARD — ไม่แตะ model/เงิน → ไม่ต้อง test-first
- [x] 3 BUILD
- [x] 4 VERIFY — test_client GET /dev/components = 200, markup `.bb-badge/.bb-status/.bb-status-inline/.bb-table` ตรง gallery ครบ
- [x] 5 SYNC — INDEX_routes.md · INDEX_ui.md · architecture.md · checker ผ่าน (แก้ line anchor + วันที่)
- [x] 6 CLOSE

## ผล
Badge/Status component (macro + Python class) เสร็จ render ตรง gallery เป๊ะ. Living Gallery `/dev/components` render Table/Badge/Status จริง → drift ไม่ได้. step ถัดไป: Cell Component (Status ในตาราง) → migrate ตารางที่มี badge เข้า Table

## หมายเหตุ
- static `components-gallery.html` = CSS catalog (canonical เดิม, อ้างใน design_guideline/INDEX_ui) → คงไว้
- living gallery = render Python component จริง, โตทีละตัว จน absorb static ได้แล้วค่อย retire static
- Cell Component (Status ในตาราง) = step ถัดไป ยังไม่ทำ
