# Task: redesign repair.html อิง vehicle_budget.html + pagination accent

status: completed
date: 2026-06-16

## Scoped Command
- [ไฟล์]: app/templates/repair/repair.html · app/static/repair/css/repair.css · app/static/repair/js/repair.js
- [ตำแหน่ง]: page header (เดิม .repair-header/.repair-title/.repair-subtitle) + DataTables footer/pagination
- [งาน]:
  1. header → budget style (`fw-bold text-accent` h1 + `text-muted text-header` subtitle)
  2. pagination แบบภาพ ref (วงกลม prev/next · เลขหน้า · ellipsis · go-to-page + ปุ่ม "ไป") สี accent
  3. polish ทั่วไปให้กลมกลืน design system
- [ข้อจำกัด]: `--vc-*` tokens เท่านั้น · no shadow (ยกเว้น focus ring) · no inline script/style · DataTables เดิม (client-side, tickets ทั้งก้อน)
- [output]: หน้า repair redesigned + custom pagination

## Checklist (devloop)
- [x] 1 PLAN — scoped 5 field + log file
- [x] 2 GUARD — UI only, ไม่แตะ money/model → ไม่ต้อง test-first / db-helper
- [x] 3 BUILD
- [x] 4 VERIFY — UI change, ผู้ใช้ทดสอบ browser (preview server เป็น process ผู้ใช้); ไม่แตะ Python → pytest ไม่ครอบคลุม
- [x] 5 SYNC — INDEX_ui.md (template + CSS/JS) + checker ผ่าน
- [x] 6 CLOSE — log → doc/

## Files changed (final)
- app/templates/repair/repair.html — header → budget style
- app/static/repair/css/repair.css — ลบ .repair-title/.repair-subtitle, simplify .repair-header, + pagination/goto styles
- app/static/repair/js/repair.js — renderGotoPage()
- docs/notes/INDEX_ui.md — 3 entries synced

## Decisions
- คง DataTables (search/sort/responsive ใช้ได้อยู่), restyle pagination ผ่าน CSS แทน server-side paging
- go-to-page สร้างใน repair.js (no inline script) append เข้า `.dataTables_paginate` (rebuild ทุก draw)
- prev/next chevron ผ่าน `::before` (font-size:0 ซ่อน text จาก th.json)

## Files changed
- (pending)
