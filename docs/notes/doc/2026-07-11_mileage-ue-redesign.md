# Log — Phase 1: mileage redesign "ถึงอารมณ์" mockup-orders.html

**วันที่:** 2026-07-11 · **status:** ✅ completed

## เป้าหมาย
Redesign `vehicle/admin/vehicle_mileage.html` ให้ "ถึงอารมณ์" `static/core/mockup-orders.html`
(Uber Eats Merchant style) — เป็น Phase 1 ของแผน redesign BBCenter ทั้งระบบ (fork ใหม่จาก mockup เขียว)

## Change Manifest ที่ทำ (user อนุมัติทั้งหมด)
- **A bug/correctness** — A1 page-title `คำสั่งซื้อ`→`{{ page_title }}` · A2 sidebar2 route จริง+active role-based · A3 notification จริง · A4 header topbar minimal (user โชว์ที่ sidebar)
- **B motion** — B1 frameIn · B2 KPI count-up+bump · B3 row stagger · B4 skeleton on filter · B5 flash→toast · B6 dotPop · B7 button micro
- **C type** — C2 Inter 400-800 · C3 KPI 26/800
- **D1** = sidebar2 เป็น chrome จริง role-based · **D2** = Material Symbols ทั้งหน้า (รวม sidebar/header/component)

## ไฟล์ที่แก้
| ไฟล์ | สรุป |
|---|---|
| `app/templates/vehicle/admin/vehicle_mileage.html` | motion CSS (`.ml2-*` keyframes inline) · A1 title · B5 flash→toast bridge · C2 Inter · D2 MS icon sizing CSS · empty icon → `note_stack` |
| `app/templates/_shared/sidebar2.html` | rewrite role-based (port `bb_sidebar` logic) + Material Symbols + biz-switch user จริง |
| `app/templates/_shared/header2.html` | notification จริง (`notification_panel`) + stub `window.lucide` (ไม่โหลด Lucide) + โหลด `ms-icons.js` |
| `app/static/vehicle/js/vehicle_mileage.js` | count-up/bump (`calcAllSummary`) · `staggerRows()` · `showSkeleton()`+`SKEL_MIN_MS` (`runFilter`) · `updateSortIcons` set MS ligature |
| `app/static/core/js/ms-icons.js` | **ไฟล์ใหม่** — Lucide→Material Symbols runtime transform (MutationObserver) |
| `docs/notes/INDEX_ui.md` | sync: mileage entry + sidebar2/header2 row + ms-icons.js § Design System + bump วันที่ |

## Decisions / tradeoffs
- Motion CSS อยู่ inline `<style>` ของ mileage (page-scoped `.ml2-*`) — promote เข้า shared เมื่อ Phase 2+
- **D2 contained:** ไม่แตะ shared macro / `bb-components.js` → หน้า finance/`layout.html` คง Lucide เดิม (ไม่ regression)
  - กลไก: หน้านี้ไม่โหลด Lucide จริง (stub) → `ms-icons.js` แปลง `[data-lucide]`→MS span, คง attr `data-lucide` ให้ combo/sort เดิมทำงาน
- icon sizing คุมด้วย CSS ตาม context (bb-* เดิม size ผ่าน `svg` ซึ่งไม่ apply กับ span) — ปรับตาม feedback: filter-btn/clear/daterange/combo/tooltip

## devloop checklist
- [x] 1 PLAN — scope map + log
- [x] 2 GUARD — ไม่แตะเงิน/model/route → ไม่ต้อง test-first/db-helper (UI/motion เท่านั้น)
- [x] 3 BUILD — Chunk 1 (motion) → 2 (chrome) → 3 (icon)
- [x] 4 VERIFY — user browser test ผ่านทุก chunk (pytest ไม่จำเป็น — ไม่แตะ `.py`)
- [x] 5 SYNC — INDEX_ui.md + checker ผ่าน (เพิ่ม ms-icons.js entry + bump วันที่)
- [x] 6 CLOSE — log → doc/

## Phase 1.5 — Foundation promote → shared (✅ 2026-07-11)
ยก page-scoped ของ mileage ขึ้น shared + สร้าง base template (parity: mileage เหมือนเดิมทุกอย่าง — verify ผ่าน)
| ไฟล์ใหม่/แก้ | สรุป |
|---|---|
| `core/css/ue.css` (ใหม่) | TOKENS(green) · SHELL(`.ml2-*`+page-title) · MOTION(keyframes+classes) · ICON-SIZING(MS) — แทน inline `<style>` |
| `core/js/ue-motion.js` (ใหม่) | `window.ueMotion`: `countUp`/`staggerRows`/`showSkeleton` (generic, parameterized) |
| `templates/_base_ue.html` (ใหม่) | base layout: head+chrome(header2/sidebar2)+shell+flash→toast+base scripts · blocks title/head/page_title/content/modals/scripts |
| `vehicle_mileage.html` | refactor → `{% extends '_base_ue.html' %}` (เหลือ block content/modals/scripts) |
| `vehicle_mileage.js` | เรียก `window.ueMotion` แทน local helpers |
| `INDEX_ui.md` | sync: mileage note + `_base_ue.html` row + ue.css/ue-motion.js § Design System · checker ผ่าน |

## Next phases (แผน)
- **Phase 2** (ถูกลงแล้ว เพราะมี base): หน้า admin table อื่น (vehicle_admin/budget/cost/admin_fuel/manage_users) → `{% extends '_base_ue.html' %}` + วาง `.bb-*` content (copy pattern จาก mileage)
- Phase 3: approver/driver/edit/modal · dashboard/login (standalone ไม่มี chrome)
- Phase 4 (deferred): ฝั่งบริการ vehicle/room/repair/maintenance (Uber Eats เต็มรูป)
- Optional cleanup: rename `.ml2-*` → `.ue-*` (cosmetic) · generalize `#sumAllCost` → class · ย้าย resource loads ออกจาก header2 → base head

## Add-on — ue_chip component (✅ 2026-07-11)
Uber-style filter chip (จาก ScreenRecording ที่ user ส่ง) — component กลางของระบบ UE
| ไฟล์ | สรุป |
|---|---|
| `_components/bb/ue_chip.html` (ใหม่) | `ue_chip` (toggle) · `ue_chip_dd` (dropdown shell `{% call %}`) · `ue_chip_opt` — namespace `.ue-chip*` กัน collision `.bb-chip` เดิม |
| `core/css/ue.css` § CHIP | pill 2px border · active เขียว `--bb-accent-dk:#0B7A3E` + MS icon fill · panel portal · opt |
| `core/js/bb-components.js` | `initUeChipToggle` + `initUeChipDd` (portal→body fixed · live no-apply · radio→label เข้า chip / checkbox→badge · clear ขวา header) |
| `dev/components.html` | demo `#uechip` (inline chip CSS + bb-components.js) |
| `INDEX_ui.md` | § Design System row "UE Chip" + subfolder list · checker ผ่าน |
Spec (user): border 2px · radio→เอา label ที่เลือกใส่ chip (ยกเว้น default) · active→icon fill · live (ไม่มีปุ่มใช้) · clear ขวา header
