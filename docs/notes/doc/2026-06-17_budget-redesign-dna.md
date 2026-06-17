# Task: Redesign vehicle_budget — DNA ใหม่ (Zendenta-clean)

> status: **in-progress** · 2026-06-17

## Scoped Command
- **[ไฟล์]**: `app/static/core/css/tokens.css` (global token) · `app/static/vehicle/css/vehicle_budget.css` · `app/templates/vehicle/admin/vehicle_budget.html`
- **[ตำแหน่ง]**: token block (สี/font) · budget summary bar + tabs + central/dept panels + archived removal
- **[งาน]**: เปลี่ยน DNA → accent #4059e6, fg #162334, border #f0f0f0, radius 6px, no shadow (ยกเว้น modal), icon monochrome #9999b0 บน #f0f0f0, Manrope สำหรับตัวเลข, KPI strip + bar 3 สี (ส่วนกลาง/กอง/คงเหลือ), tab underline + toolbar (เลือกเดือน/ตั้งงบใหม่) บรรทัดเดียว overflow-x auto, central/dept = card grid แบ่ง section ใช้งานอยู่/ไม่ได้ใช้งาน, ส่วนตัว = คง table, ตัด tab คลังงบ
- **[ข้อจำกัด]**: global token · Bootstrap utilities (d-flex/justify-content/pt-3/...) แทน custom layout · ไม่แตะ model/เงิน/service/view (.py) · ไทย=Sarabun เลข=Manrope
- **[output]**: หน้า vehicle_budget ตรง mockup v3 + tab/toolbar บรรทัดเดียว

## Decisions (locked)
- ส่วนตัว = table (sortable, header #fafbfc) · คลังงบ = ตัด tab → inactive cards ใช้ archived_budgets filter budget_type
- bar segment 3 = คงเหลือ (เดิม personal) · sizing เทียบ total_budget
- inactive card: bg #fafbfc + font disable tone + ปุ่ม "เปิดการใช้งาน"
- radius: ใช้ 6px (--vc-radius-sm) บนหน้านี้ — ไม่แตะ radius token global

## Checklist
- [x] 1 PLAN
- [x] 2 GUARD — ไม่แตะ model/เงิน/service/view → skip (UI only)
- [x] 3 BUILD — tokens → css → html
- [x] 4 VERIFY — ผู้ใช้ยืนยัน browser "ผ่านหมดแล้ว" (2026-06-17)
- [x] 5 SYNC — CLAUDE.md (design + date) · tokens.css header · design_system.md (token table + philosophy + font + ลิงก์ DNA doc) · INDEX_ui.md (budget entry + token highlights + CSS row) — checker ผ่าน
- [x] 6 CLOSE — งานหลักเสร็จ

## Follow-up (หลัง user verify)
- **Tabbar fix** — แตก 2 แถว → row เดียว (ลบ mobile column rule + nowrap + tabs shrink/scroll + toolbar pin ขวา)
- **Tabbar sticky** — `position:sticky; top:56px; z-index:4; bg ทึบ` (ตรึงใต้ `.vrc-topbar` 56px ตอนเลื่อนหน้า) + tabs `overflow-y:hidden` กัน jitter
- **Step B = DNA migration doc** — สร้าง `docs/notes/design_dna_redesign.md` (binary rules + component cookbook + per-page checklist) + ลิงก์จาก design_system.md
- เหลือ: rollout DNA หน้าอื่นทีละหน้าตาม checklist (token global เปลี่ยนสีให้แล้ว แต่ layout ยังเก่า)

## Docs synced
- `CLAUDE.md` — Design Quick Rules + อัปเดตล่าสุด 2026-06-17
- `docs/notes/design_system.md` — Updated line + Style + philosophy table + token tables (fg/border/primary/accent/blue + icon/sidebar) + font allowlist
- `docs/notes/INDEX_ui.md` — vehicle_budget.html entry (DNA redesign), token highlights (accent/primary/rgb/font), CSS row §22, zendenta note hex

## Files touched
- `app/static/core/css/tokens.css` — primary/accent #4059e6, fg #162334, border #f0f0f0, +icon/sidebar tokens, font-mono → Manrope, header date
- `app/static/vehicle/css/vehicle_budget.css` — seg/legend สี (central/dept/remain), §22 card layout + tabbar + section dot + icon monochrome
- `app/templates/vehicle/admin/vehicle_budget.html` — head โหลด Manrope, summary bar (personal→คงเหลือ), tabbar+toolbar บรรทัดเดียว, ตัด tab archived, central/dept → card grid (macro budget_card + budget_card_off), section ใช้งานอยู่/ไม่ได้ใช้งาน
- `CLAUDE.md` — Design Quick Rules อัปเดต DNA ใหม่

## Notes / out-of-scope
- Manrope โหลดเฉพาะ head ของ vehicle_budget.html — หน้าอื่น fallback Sarabun (--vc-font-mono). ถ้าจะใช้ Manrope ทั้ง site → add link ใน head ทุก template (future)
- token global เปลี่ยน → ทุกหน้าเปลี่ยนสีตาม (sidebar/ปุ่ม/accent) — ต้องเช็กหน้าอื่นไม่เพี้ยน
