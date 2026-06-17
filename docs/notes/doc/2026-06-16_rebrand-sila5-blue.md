# Task C — Rebrand brand-blue → sila5 #014198 (unify)

**Date:** 2026-06-16
**Status:** completed
**Prev:** Task B (indigo drift cleanup) ทำให้ทุกสี accent อ้าง token → C เปลี่ยนที่ tokens.css จุดเดียว (+ drop fallback ที่เหลือ)

## Scope (5 fields)
- **[ไฟล์]:** tokens.css (blue family), vehicle_admin.css, vehicle_budget.css (drop `#0046FF` fallback), vehicle_zendenta.css (comment), design_system.md + INDEX_ui.md + CLAUDE.md (doc sync)
- **[ตำแหน่ง]:** tokens.css L39-62 blue family; admin L1233/1245/1273; budget L1432/1433/1435/1574/1579 fallback
- **[งาน]:** unify ทุก blue token (primary+accent+--vc-blue) → #014198 family; drop fallback `var(--vc-accent,#0046FF)`→`var(--vc-accent)`; sync doc
- **[ข้อจำกัด]:** font ไม่แตะ (เก็บ Sarabun body + Sukhumvit heading); `--vc-*` token เท่านั้น; ไม่แตะ vendor/logic
- **[output]:** grep zero stale-blue + doc sync + checker

## Decisions (ผู้ใช้ยืนยัน)
1. **Font** = เก็บปัจจุบัน (Sarabun body + Sukhumvit heading) → ไม่แตะ font เลย
2. **Color** = unify ทุก blue token เป็น #014198 family (primary/accent + --vc-blue เฉดเดียว)

## Color family (base #014198 = rgb 1,65,152)
| token | เดิม | ใหม่ |
|---|---|---|
| --vc-primary / --vc-accent | #0046FF | #014198 |
| --vc-primary-hover / --vc-accent-hover / --vc-blue-hover | #003AD6 / #1D4ED8 | #01357D |
| --vc-accent-dark | #00318F | #012E6A |
| --vc-accent-light | #d7e0f6 | #D9E2EF |
| --vc-accent-border | #B9CCFF | #B3C6E0 |
| --vc-accent-ring / --vc-accent-rgb | rgba(0,70,255) / 0,70,255 | rgba(1,65,152) / 1,65,152 |
| --vc-blue | #2563EB | #014198 |
| --vc-blue-bg / -border | rgba(37,99,235) | rgba(1,65,152) |
| --vc-blue-mid (dept 2-tone) | #8AABF5 | #6D92C4 |

## devloop checklist
- [x] 1 PLAN — scope + log
- [x] 2 GUARD — token/CSS-only, ไม่แตะเงิน/model → ผ่าน
- [x] 3 BUILD — tokens.css + admin/budget drop fallback + zendenta comment
- [x] 4 VERIFY — grep zero stale-blue (CSS เหลือแค่ comment ประวัติ) · visual = ผู้ใช้
- [x] 5 SYNC — design_system.md + INDEX_ui.md + CLAUDE.md + checker (no blocker; 2 flag เคลียร์: zendenta untracked=false alarm, CLAUDE date bump)
- [x] 6 CLOSE

## Watch (visual verify)
- --vc-blue เคยเป็น "info/approved" semantic + heading + ds-btn → ตอนนี้ = brand navy-blue. เช็ก badge "อนุมัติ" + heading ว่าไม่ทึบเกิน
- #014198 เข้ม → white text บนปุ่ม contrast ดี (AA ผ่าน)

## Files changed
- `app/static/core/css/tokens.css` — blue family → #014198 (primary/accent/blue + derived)
- `app/static/vehicle/css/vehicle_admin.css` — 3 fallback drop
- `app/static/vehicle/css/vehicle_budget.css` — 5 fallback drop
- `app/static/vehicle/css/vehicle_zendenta.css` — comment (untracked file)
- `docs/notes/design_system.md` — changelog + §1/§2 + 60-30-10
- `docs/notes/INDEX_ui.md` — § Design System highlights + zendenta row
- `CLAUDE.md` — Design Quick Rules + bump date 2026-06-16
