# Task B — Fix indigo color drift (rebrand cleanup)

**Date:** 2026-06-16
**Status:** completed
**Plan:** ~/.claude/plans/color-rgb-1-65-152-elegant-snowglobe.md

## Scope (5 fields)
- **[ไฟล์]:** tokens.css, components/pivot.css, vehicle/css/vehicle_budget.css, vehicle/css/vehicle_mileage.css, docs/notes/design_system.md
- **[ตำแหน่ง]:** indigo hardcode — pivot L123/175/176/180/184, budget L1129-1130/1156-1157, mileage L163, doc §2 L61/68/90
- **[งาน]:** แทน hardcoded indigo (#4F46E5, rgba 79,70,229, #818cf8) ด้วย token; เพิ่ม `--vc-accent-rgb` channel token; sync doc §2 ให้ตรง tokens.css
- **[ข้อจำกัด]:** `--vc-*` token เท่านั้น, drop fallback hex, dept→`--vc-blue-mid`, ไม่แตะ vendor, CSS-only ไม่แตะ logic
- **[output]:** grep zero-drift + doc sync

## Decisions
1. drop fallback `var(--vc-accent, #4F46E5)` → `var(--vc-accent)`
2. dept `#818cf8` → `var(--vc-blue-mid)` (#8AABF5)

## devloop checklist
- [x] 1 PLAN — scope + log
- [x] 2 GUARD — CSS-only, ไม่แตะเงิน/model → ผ่าน
- [x] 3 BUILD — 6 ไฟล์ (5 CSS + 2 doc)
- [x] 4 VERIFY — grep zero drift (เหลือแค่ comment ประวัติ tokens.css:46) · visual = ผู้ใช้เช็ก browser
- [x] 5 SYNC — INDEX_ui.md + design_system.md §2 + checker ผ่าน (no blocker)
- [x] 6 CLOSE

## Files changed
- `app/static/core/css/tokens.css` — +`--vc-accent-rgb: 0, 70, 255`
- `app/static/core/css/components/pivot.css` — 5 จุด (heat-tint rgba + drop fallback)
- `app/static/vehicle/css/vehicle_budget.css` — 4 จุด (central→accent, dept→blue-mid)
- `app/static/vehicle/css/vehicle_mileage.css` — L163 drop fallback
- `app/static/vehicle/css/vehicle.css` — 2 จุด focus ring →`--vc-accent-ring` (เจอเพิ่มตอน VERIFY, undefined `--vc-primary-ring` + indigo fallback = active bug)
- `docs/notes/design_system.md` — §2 token table + 60-30-10 sync (5 ค่า) + แถว `--vc-accent-rgb`
- `docs/notes/INDEX_ui.md` — § Design System bullet + pivot row note

## Scope note
- VERIFY เจอ vehicle.css 2 จุดที่ Explore/plan พลาด (focus ring indigo, `--vc-primary-ring` undefined) → แก้เพิ่มเพื่อให้ผ่าน grep zero-drift gate ที่ผู้ใช้อนุมัติ
- design_system.md §2 60-30-10 table แก้เพิ่มจาก plan (section เดียวกัน ค่า stale เดียวกัน — sync ให้ครบ)

## Out-of-scope findings
- vehicle_budget.css L1132/1158 danger dept `#f87171` (red-400 hardcode) → รวมเป็น `--vc-red-mid` รอบหน้า
- design_system.md §16 Q1 + §1.5/§13 terminology "indigo accent" ล้าสมัย → doc-pass แยก
- vendor/fontawesome มี rgba(79,70,229) → third-party ห้ามแตะ
