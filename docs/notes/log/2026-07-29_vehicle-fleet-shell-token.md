# vehicle_fleet.html migrate — Phase 1: shell + token

> **status:** in_progress · **เริ่ม:** 2026-07-29
> ref: [design_guideline.md §13 Z0 · §14 adoption](../design_guideline.md) · [redesign_migration_pattern.md](../redesign_migration_pattern.md) · precedent: [2026-07-28_vehicle-shell-token.md](2026-07-28_vehicle-shell-token.md) (vehicle.html)

## Scope (เฟส 1 เท่านั้น)

| ชั้น | จาก | เป็น |
|---|---|---|
| shell | standalone `<html>` + `_shared/sidebar.html`+`header.html` + `main.vc-scope` | `{% extends '_base_ue.html' %}` |
| token | `--vc-*` ใน `vehicle_fleet.css` (ไฟล์ page-exclusive) | `--bb-*` |

**ยังไม่ทำ (เฟสถัดไป — "component"):** reskin modal 8 ตัว/table/card → `bb-*` (ทั้งหน้ายังพึ่ง `design-system.css`/`vehicle_admin.css`/`vehicle_fuel.css` สำหรับ `.vc-btn`/`.vc-card`/`.vc-modal`/`.vc-form-*`/`.vc-table`)

## ตัดสินใจ

1. **เก็บ `design-system.css` + `vehicle_admin.css` + `vehicle_fuel.css` ไว้ชั่วคราว** (ตาม precedent vehicle.html 2026-07-28)
   เหตุ: 3 ไฟล์นี้คือที่มาจริงของ `.vc-btn`/`.vc-card`/`.vc-modal`/`.vc-form-*`/`.vc-table` ที่หน้านี้ใช้เต็มหน้า — ตัดตอนนี้ = หน้าเปลือยทั้งหน้า ไม่ใช่แค่ chrome
   `vehicle_fuel.css` เจอว่า share กับ `repair.html`/`maintenance.html` (`.fuel-kpi` strip) ด้วย — ไม่ใช่ fuel-only ตามชื่อ → ไม่แตะไฟล์จริง
2. **ตัด `vehicle.css`** — grep ในหน้าไม่เจอการใช้ class calendar (`calendar-cell`/`event-card`/`date-number`)
3. **ตัด vendor links** (bootstrap/fontawesome/bootstrap-icons/Google Fonts Sarabun) — base โหลดให้ครบ; ไม่เจอการใช้ FA/bootstrap-icons class ในหน้านี้ (icon ทั้งหมดเป็น `data-lucide`)
4. **token swap ในที่ที่ `vehicle_fleet.css` โดยตรง** (ไม่สร้างไฟล์ใหม่แบบ `vehicle_calendar.css`) — เพราะ `.mf-*` เป็น page-exclusive ไม่ share กับหน้าอื่น (ต่างจาก `vehicle.css` ที่ share 12 หน้า)
5. **`--mf-ease-out`/`--mf-ease-in-out`** เดิม scope บน `.vc-scope` (จะหายไปพร้อม wrapper — ตาม pattern doc "class scoping เก่าค้างบน wrapper ต้องลบ") → inline เป็นค่า literal cubic-bezier ตรงทุกจุดที่ใช้
6. **`.mf-header`/`.mf-title`/`.mf-subtitle` CSS block ลบทิ้ง** — ตรวจแล้วไม่มี markup ในหน้าใช้ class นี้เลย (dead code เดิม, หน้าใช้ Bootstrap utility + text-accent/text-muted แทน)
7. **subtitle "จัดการรถ · คนขับ · ผู้อนุมัติประจำกอง"** ย้ายเข้า `{% block content %}` เป็น `<p class="text-muted mb-3">` ธรรมดา — base `page_title` block รับแค่ h1 ไม่มี slot subtitle (ตาม vehicle_admin.html reference)
8. **`TH_MONTHS` Jinja var ตัดทิ้ง** — ตรวจทั้งไฟล์ไม่มีจุดใช้งาน (dead)
9. **ห้าม rename class** ที่ `vehicle_fleet.js` ผูก (`mf-driver-row`, id ทั้งหมด: `ev_*`/`dv_*`/`ed_*`/`dd_*`/`hist*`) — ไม่แตะ id/class ใดๆ ใน markup เนื้อหา

## Token map ที่ใช้ (สอบจาก tokens.css จริง — ไม่เดา)

| `--vc-*` (ค่าเดิม) | ใหม่ |
|---|---|
| `bg` (#FFF) / `bg-subtle` (#f5f8fb) | `var(--bb-n0)` / `var(--bb-n50)` |
| `border` (#f0f0f0) / `border-hover` (#999) | `var(--bb-n200)` / `var(--bb-n400)` |
| `fg` (#162334) / `fg-muted` (#6B7280) / `fg-subtle` (#9CA3AF) | `var(--bb-str)` / `var(--bb-mut)` / `var(--bb-n500)` |
| `red` (#DC2626, text/border ใช้) | `var(--bb-dg-tx)` (#C81E1E, AA) |
| `accent` (indigo, ใช้กับลิงก์ `.mf-current-file`) | `var(--bb-accent-dk)` (ลิงก์ตาม §2 map — ไม่ใช่ ink) |
| `radius-xs` (4px, ใช้กับ chip/icon-btn — กดได้) | `var(--bb-r-pill)` (binary radius §5) |
| `radius-sm` (6px, ใช้กับ card/img/container — กดไม่ได้) | `var(--bb-r-surface)` (8px) |
| `space-2/3/4/5/6` | literal px (ค่าเท่าเดิมเป๊ะ — scale เหมือนกันทั้งสองระบบ) |
| `text-xs/sm/md/lg` (12/13/16/18) | literal px ตรง (ไม่ reskin size รอบนี้) |
| `tracking-wide` (.02em, ใช้กับ caps-label) | `0.04em` (ค่าใหม่ตาม §3 caps-label spec — ไม่ใช่ literal เดิม) |
| `font-mono` (Manrope) | `'Inter','Sarabun',sans-serif` (ตัวเลข = Inter ตาม §3) |
| `--mf-ease-out`/`--mf-ease-in-out` (custom, scope บน `.vc-scope`) | inline `cubic-bezier(...)` literal |

## Checklist

- [x] 1 PLAN — scoped 5 field + log file
- [x] 2 GUARD — ไม่แตะ models / ไม่แตะ logic เงิน-สถานะ → ไม่ต้อง db-helper / test-first
- [x] 3 BUILD
- [~] 4 VERIFY — เสนอรัน pytest แล้วผู้ใช้ไม่ confirm (ไปต่องานถัดไปแทน) — ไม่ได้แตะ .py เลยความเสี่ยง regression ต่ำ; ตรวจด้วยตาต้องผู้ใช้เปิด localhost:5001 เอง (server เป็น process ของผู้ใช้)
- [x] 5 SYNC — ครบทุกรอบ (shell+token / title fix / tab / table redesign / mockup / table-promoted-to-real 2026-07-30 / addVehicleModal wired 2026-07-31) — ยืนยันด้วย checker 3 รอบก่อนหน้า + รอบนี้เพิ่ม: INDEX_ui.md Templates row + § Design System/JS row (คลาส list อัปเดตตาม CSS cleanup จริง, เพิ่มสรุป addVehicleModal wiring) · CHANGELOG (2 entry ใหม่ 07-30/07-31) · `docs/notes/INDEX.md` banner bump · `schema.md`/`INDEX_code.md`/`migrations-index.md` (ผ่าน db-helper สำหรับ `vehicle_type`) · `future_features.md` #18 (Avatar component gap — ยังค้าง ไม่เกี่ยวกับรอบนี้)

**หมายเหตุนอก scope ที่แก้ไปด้วยรอบนี้ (เดิม pre-existing, บันทึกไว้ว่า "ไม่แตะ" แต่ต้องแก้เพราะกำลังเขียนแถวเดียวกันอยู่แล้ว):** `INDEX_ui.md:141`/`:174` row key เก่า `manage_fleet.css`/`pages/manage-fleet.js` → เพิ่มวงเล็บ "(ไฟล์จริง `vehicle_fleet.css`/`.js`)" กำกับไว้ (ไม่ rename key ตรงๆ เพราะไม่รู้ว่ามีที่อื่น link มา anchor นี้กี่จุด — เสี่ยงพังลิงก์ข้ามไฟล์ ถ้าจะ rename จริงควรทำแยกเป็นงานของตัวเอง)
- [ ] 6 CLOSE — log → doc/ (component-reskin ครบทุกชิ้นแล้ว incl. addVehicleModal — แต่ยังไม่เคย verify ในเบราว์เซอร์จริงสักรอบเดียวตลอด arc นี้ ไม่กล้าปิดจนกว่าผู้ใช้ยืนยันว่าเห็นจริงแล้วโอเค)

## Follow-up (เฟส 2 — component, เริ่ม 2026-07-29 ต่อเนื่อง)

ผู้ใช้ขอต่อ: เปลี่ยน font title (แก้แล้ว — ดูด้านล่าง) + tab "รถ/คนขับ" แทน layout 2 คอลัมน์เดิม (ผู้อนุมัติรวมเข้า tab คนขับ) ดู BUILD ถัดไปในไฟล์นี้

- **Title font bug (2026-07-29):** `design-system.css:73` มี `h1,h2,h3{font-family:...!important}` ทับ `.page-title` ของ base (หน้าที่เลิกโหลด `design-system.css` แล้วไม่โดน) → เพิ่ม scoped override ใน `{% block head %}` ของ `vehicle_fleet.html` ดึงกลับ Sarabun
- **Tab รถ/คนขับ (2026-07-29, BUILD เสร็จ):** ยืนยันกับผู้ใช้แล้ว — tab แทน layout 2 คอลัมน์เดิมทั้งหมด (ไม่ใช่แค่เพิ่ม filter) · ผู้อนุมัติรวมอยู่ใน tab คนขับ (ต่อจาก driver list, ไม่ merge เป็นการ์ดเดียว — แค่ stack เต็มความกว้างแทน sidebar column เดิม)
  - Markup: `{% include '_shared/tab2.html' %}` + `tab2_tabs([...])` (pattern ตรงจาก `vehicle_admin.html`) ผูก `#fleetTabWrap` · เนื้อหาเดิมย้ายเข้า `#fleetPanelVehicles` (active default) / `#fleetPanelDrivers.d-none` (มี driver-card + approver-card ซ้อนกัน)
  - JS: เพิ่ม `bindFleetTabs()` ท้าย `vehicle_fleet.js` (IIFE เดิม) — pattern เดียวกับ `bindTab2Tabs()` ใน `vehicle_admin.js`: toggle `.active` บน tab + toggle `.d-none` บน panel ที่ตรง `data-tab`
  - CSS: ลบ `.mf-grid`/`.mf-col-right` ทิ้ง (dead หลัง layout เปลี่ยน) จาก `vehicle_fleet.css`
  - ไม่ได้แตะ: เนื้อหาใน card ทั้ง 3 (vehicle table/driver list/approver list) — ย้ายที่อยู่เฉยๆ ไม่ reskin

- **Vehicle table mockup — คอลัมน์ใหม่ (2026-07-29):** ผู้ใช้ระบุ 6 คอลัมน์ตรงๆ: รูปรถ / ข้อมูลรถ (ทะเบียน+ยี่ห้อ/รุ่น รวมคอลัมน์เดียว) / ที่นั่ง / ไมล์ล่าสุด / สถานะ / icon edit
  - **รูปรถ = placeholder ไอคอน ไม่ใช่รูปจริง** — `Vehicle` model ไม่มี field เก็บรูป (ต่างจาก `Driver.avatar_image`) → ใช้ `.mf-avatar` (class เดิมที่ driver list ใช้อยู่แล้ว) + icon `car` แทนทุกแถว ไม่มี fallback เป็นรูปจริง เพราะไม่มีข้อมูลให้ fallback จาก. ถ้าต้องการรูปจริงในอนาคต = ต้องเพิ่ม DB column ก่อน (ยังไม่ implement — เป็น mockup เท่านั้น)
  - **ทะเบียน+ยี่ห้อ/รุ่น รวมเป็น "ข้อมูลรถ" คอลัมน์เดียว** — plate บรรทัดบน (`.mf-plate`) + brand/model บรรทัดล่าง (`.mf-name-sub`, รวม string เดียวไม่แยก primary/sub แล้ว) → `.mf-name-primary` เลยเป็น dead ลบออกจาก CSS
  - **actions เหลือแค่ปุ่มแก้ไข 1 ปุ่ม** (ตัด "ประวัติการใช้งาน"/"ลบ" ออกจากตาราง) — **modal `vehicleHistoryModal`/`deleteVehicleModal` + JS handler ที่ผูกกับมันยังอยู่ครบ ไม่ได้ลบ** แค่ไม่มี trigger button ชี้ไปแล้ว (unreachable, ไม่ error เพราะ JS ฟัง `show.bs.modal` event ของ modal เอง ไม่ได้ผูกที่ปุ่ม) — ผู้ใช้ต้องยืนยันว่าจะเอา 2 action นี้กลับไปไว้ที่ไหน (เช่น ในปุ่มแก้ไข/เมนู) หรือทิ้งจริงๆ ก่อนลบ modal ทิ้ง

- **Mockup เทียบ `.bb-table` (2026-07-29):** ผู้ใช้ขอเพิ่มต่อ — สร้างตาราง mockup คอลัมน์ชุดเดียวกัน "เหมือนหน้า vehicle_admin.html" วางไว้เหนือตารางจริงใน `#fleetPanelVehicles`
  - **ตัดสินใจสำคัญ: ไม่ใช้ `Table()`/`Column()` object** (ซึ่งเป็นทางที่ CLAUDE.md บังคับสำหรับหน้าใหม่/redesign) — เหตุผล: คอลัมน์ "รูปรถ" ต้องการ Avatar-style cell แต่ตรวจ `app/components/CHEATSHEET.md` แล้วไม่มี Avatar component ในระบบ (list เต็ม 22 component ไม่มี) ลองดู `Column.cell` mechanism (`app/components/table.py`) พบว่าต้อง return object ที่มี `.render()` — จะทำ ad-hoc shim class เองได้ทางเทคนิค แต่ `app/components/base.py` เขียนชัดใน docstring ว่า **"ห้าม: build HTML string ใน Python"** ซึ่ง shim แบบนั้นจะผิดหลักการนี้ตรงๆ → ตาม audit-rule ของ `redesign_migration_pattern.md` ("ไม่เจอ match → ห้ามสร้าง component ใหม่เองมั่ว ใส่ลิสต์ missing แล้วหยุด") เลยเลือก **hand-write raw HTML ตรงในเทมเพลต** แทน (ไม่ import macro `_components/bb/*` ก็จริงแต่ไม่ได้ผูก data จริงเลย เป็น static preview ล้วน) — สอดคล้องกับที่ `vehicle_admin.html` เองก็มี `.bb-avatar` raw markup อยู่หลายจุดโดยไม่ผ่าน object เช่นกัน (ดูตัวอย่างจริงที่ `assignModalAvatar`)
  - **Missing component ที่ควรบันทึกไว้: Avatar** — ถ้าจะทำ "รูปรถ" แบบผูกข้อมูลจริงในอนาคต ต้อง (1) เพิ่ม DB column เก็บรูปใน `Vehicle` model ก่อน (ตอนนี้ไม่มี) และ (2) สร้าง Avatar component เข้า `app/components/` + `CHEATSHEET.md` + gallery ก่อน ไม่ควร hand-code ต่อไปเรื่อยๆ
  - ตรวจ markup อ้างอิงจริงจาก macro source ก่อนเขียน (`_components/bb/table.html`, `badge.html`, `button.html`) ไม่ได้เดา class — `.bb-table`/`.bb-cell-strong`/`.bb-cell-sub`/`.bb-cell-num`/`.bb-status-inline.is-ok|is-wr`/`.bb-btn.is-sec.is-icon`/`.bb-avatar` ตรงกับที่ macro จริง render
  - ข้อมูลจำลอง 3 แถว เขียนตรงเป็น literal HTML ไม่ loop จาก `vehicles` จริง ไม่แตะ controller/DB เลย

- **Mockup polish จาก screenshot ผู้ใช้ (2026-07-29 ต่อเนื่อง):** (1) ขยาย `.bb-avatar` ใน mockup 30px→48px — scope ผ่าน `#fleetMockupTable .bb-avatar` ใน `{% block head %}`, **ไม่แก้ base rule ใน components.css** เพราะ share กับ `assignModal` (vehicle_admin.html) (2) แถวสถานะ "ซ่อมบำรุง" (Hyundai H1) ใส่ class `is-wr` บน `.bb-avatar` → ใช้ tone variant ที่มีอยู่แล้วจริงใน `components.css:344` (`--bb-wr-bg`/`--bb-wr-tx` = ส้ม/amber) ไม่ได้ประดิษฐ์สีใหม่ ไม่ผิดกฎ "ห้าม hex literal"/"ห้าม token ใหม่" (3) เพิ่มปุ่ม "เพิ่มรถในระบบ" (icon `local_shipping`, `.bb-btn.is-pri`) เป็น toolbar ลอยเหนือ mockup table ไม่มี card/border/header ตรงตาม pattern `vehicle_admin.html` ผูก `data-bs-target="#addVehicleModal"` จริง (ทำงานได้ ไม่ใช่ตัวอย่างเปล่า). **⚠️ ค้าง:** ตอนนี้มี "เพิ่มรถ" 2 ปุ่มซ้ำในแท็บเดียว (ปุ่มเดิมใน card-head ของตารางจริงด้านล่างยังไม่ตัดออก) — ถามผู้ใช้แล้ว 2 ครั้งยังไม่ได้คำตอบว่าจะเก็บ/ตัดปุ่มไหน รอ confirm ก่อนแก้ต่อ

- **Mockup ตารางคนขับ — คอลัมน์ใหม่ (2026-07-29 ต่อเนื่อง):** ผู้ใช้ขอ mockup ปุ่ม+table ฝั่ง tab คนขับ pattern เดียวกับ tab รถ — 5 คอลัมน์: รูปคน / ข้อมูลคนขับ(ชื่อ-นามสกุล+เบอร์โทร รวมคอลัมน์) / งานในสัปดาห์ / สถานะ / icon แก้ไข
  - **"งานในสัปดาห์"** = ส่ง reference screenshot มา (7 วงกลม S/M/T/W/T/F/S ต่อแถว + เลื่อนดูสัปดาห์ก่อนได้) — ไม่มี component ที่ตรงในระบบ hand-code ใหม่เป็น `.fleet-week`/`.fleet-day` (scoped ใน `{% block head %}`) **แต่เปลี่ยนสีจากฟ้าในภาพต้นฉบับ → ink** (ตาม design_guideline v2.1 doctrine "active = ink ไม่ใช่ฟ้า/เขียว" — ยังไม่ได้ถามผู้ใช้ยืนยันเรื่องสีนี้ ถ้าอยากได้ฟ้าจริงๆ ต้องแจ้ง). ปุ่มเลื่อนสัปดาห์ก่อน/ถัดไปเป็นแค่ UI ตกแต่ง ไม่ผูก logic (mockup)
  - ปุ่ม "เพิ่มคนขับในระบบ" (icon `person_add`) toolbar เดียวกับแบบฝั่งรถ ผูก `#addDriverModal` จริง — เจอปัญหาซ้ำแบบเดิม (ปุ่มเดิมในตารางจริงยังอยู่)
  - ใช้ class ร่วม `.fleet-mockup` (ทั้ง 2 ตาราง) แทน id เดี่ยว เพื่อให้ CSS ขยาย `.bb-avatar` ใช้ซ้ำได้ไม่ต้อง duplicate rule

- **Driver mockup polish รอบ 2 (2026-07-29 ต่อเนื่อง):** (1) icon avatar `user-round`→`face` (Material Symbols ตรงๆ ตามที่ผู้ใช้ระบุชื่อ icon เป๊ะ) (2) `.fleet-week` restructure เป็น 2 แถวซ้อน — แถวบน `.fleet-week-nav-row` (ลูกศร+label ช่วงวันที่ "26 ก.ค. – 1 ส.ค. 2569" ตัวเลขปีพ.ศ. mock ทุกแถวเหมือนกัน) แถวล่าง `.fleet-week-days` (เดิม) (3) label สถานะ: `ใช้งาน`→`พร้อมขับรถ`, `ปิดใช้งาน`→แยกเป็น 2 ค่า `ลาป่วย`/`ลากิจ` (เพิ่มแถวที่ 4 "สมหญิง มีสุข" ให้เห็นครบทั้ง 2 ค่า ไม่ใช่โชว์แค่ค่าเดียว) — tone ยังคง `is-neutral` เดิม (ลาไม่ใช่ danger/warning)

- **Driver mockup polish รอบ 3 (2026-07-29 ต่อเนื่อง):** (1) ย้ายลูกศร ‹/› จากแถว label มาอยู่ข้าง `.fleet-week-days` แทน (label ช่วงวันที่อยู่บรรทัดบนเดี่ยวๆ ไม่มีลูกศรแล้ว) — `.fleet-week-nav-row` เปลี่ยนชื่อเป็น `.fleet-week-days-row` (ครอบลูกศร+วงกลมแทน) (2) เพิ่ม tone ที่ 3 ให้ `.fleet-day`: `is-wr` (ส้ม `--bb-wr` fill เหมือน `is-on` แต่คนละสี ไม่ใช่ tint บาง) = วันที่มี OT, `is-on` (ดำ) = มาทำงานปกติ, ไม่มี class = วันหยุด — ใส่ 1 วัน OT ตัวอย่างต่อแถว (สมชาย=อังคาร, วิชัย=พุธ) ยกเว้น 2 แถวลา (ไม่มีวันทำงานเลย ก็เลยไม่มี OT)

- **Icon convention fix (2026-07-29 ต่อเนื่อง):** ผู้ใช้ทักว่า mockup ทั้ง 2 ตารางใช้ `data-lucide` (shim) แทนที่จะเขียน Material Symbols ตรงๆ ตาม design_guideline.md §7 ("เขียนตรงๆ ดีกว่า" — target ใหม่ของโค้ดใหม่ ตั้งแต่ 2026-07-28) — สาเหตุเดิม: กลัวเดาชื่อ MS ผิด เลยเลือกทาง lucide ที่มั่นใจกว่า. แก้โดยเช็ก `MAP` จริงใน `core/js/ms-icons.js` (ไม่เดา) แล้วแปลงทุกจุดใน mockup เป็น `<span class="material-symbols-rounded">`: `car`→`directions_car`, `check-circle`→`check_circle`, `clock`→`schedule`, `pencil`→`edit`, `chevron-left`→`chevron_left`, `chevron-right`→`chevron_right`, `circle`→`circle` (ไม่อยู่ใน MAP แต่ fallback `-`→`_` ตรงกับชื่อ MS จริงพอดีเพราะไม่มีขีด). ใช้ pattern bare `<i data-lucide="x"></i>` (ไม่มี `class`) เป็นตัวแยก scope กับตารางจริง/modal เดิมที่ใส่ `class="vc-icon-sm"` เสมอ → `replace_all` ปลอดภัย ไม่กระทบของเดิม (verify: grep `vc-icon-sm` ยังครบ 5+ จุดเดิม). **กฎต่อจากนี้ในไฟล์นี้:** โค้ดใหม่ = Material Symbols ตรงๆ เสมอ ไม่ใช้ `data-lucide` shim แล้ว

- **Mockup widget: redesign addVehicleModal (2026-07-29 ต่อเนื่อง):** ผู้ใช้ขอ "ลองออกแบบ" แบบ exploratory ("เป็น widget") — ตีความว่าอยากเห็น preview ลอยอยู่ในหน้าเลย (ไม่ต้องกด trigger เปิด modal) เหมือน pattern mockup ตารางที่ทำมาตลอด ไม่ใช่แก้ modal จริง
  - ใช้ `.bb-modal` เปล่าๆ (ไม่มี `.bb-modal-overlay` ครอบ) เป็น static card — เช็ก CSS จริงก่อนแล้วพบว่า `.bb-modal` เองมี width/bg/radius/shadow ครบอยู่แล้ว (ไม่ต้องพึ่ง overlay) ใช้แบบ standalone ได้ปลอดภัย
  - field ครบตาม modal จริงทุกตัว (ยี่ห้อ/รุ่น/ทะเบียน/ที่นั่ง/สิ้นเปลือง/สถานะ) แค่จัดกลุ่ม 2 คอลัมน์ใหม่ + เพิ่ม avatar icon header ให้ดูเป็น "widget" มากขึ้น (ยืม pattern จาก `assignModal` ใน `vehicle_admin.html`)
  - `.bb-field`/`.bb-label`/`.bb-modal-head/-body/-foot`/`.bb-input` ทุกตัวเช็ก CSS จริงก่อนใช้ ไม่ได้เดา class

- **addVehicleModal widget redesign รอบ 2 — ตาม bookingModal (2026-07-29 ต่อเนื่อง):** ผู้ใช้ชี้ไปดู `vehicle/modals/vehicle_book.html` (`#bookingModal`) เป็นต้นแบบเป๊ะๆ พร้อม spec ละเอียด (header 3 บรรทัด/เส้นประ/col-grid/stepper/chip dropdown)
  - **Header** copy pattern ตรงจาก bookingModal/assignModal (`#แบบฟอร์ม` eyebrow + ชื่อใหญ่ + subtitle, inline `style=""`) — จงใจไม่แก้เป็น scoped class เพราะเป็น established pattern จริงในโค้ด 2 หน้าอยู่แล้ว ไม่ใช่ของที่ควร "ปรับปรุง"
  - **เส้นประ:** `.bk-divider` ตัวจริงอยู่ใน `vehicle_calendar.css` (เวอร์ชันปัจจุบัน ใช้ `--bb-n300` แล้ว) แต่หน้านี้ไม่โหลดไฟล์นั้น (ตัดตอน shell+token phase เพราะเป็น calendar-specific) → สร้าง `.fleet-divider` เองใน head style แทน (ค่าเดียวกันเป๊ะ ไม่ pull ทั้งไฟล์)
  - **Stepper (ที่นั่ง):** ยืม `.ui-stepper`/`.step-btn`/`.step-value` markup จาก `vehicle_book.html` ตรงๆ **แต่เปลี่ยน hex literal เดิม (`#dee2e6`/`#111827`/ฯลฯ) เป็น `--bb-*` token** (ผิดกฎ "ห้าม hex literal" ในไฟล์ต้นฉบับ — ไม่แก้ไฟล์นั้น แค่ไม่ copy นิสัยมาที่ใหม่). ผูก JS จริง (`bindFleetCapacityStepper()` ท้าย `vehicle_fleet.js`) — กดได้จริง ไม่ใช่ตกแต่งเปล่า (ต่างจาก week-nav arrow ที่ยังเป็น mockup เฉยๆ)
  - **Chip dropdown (ประเภทรถ/สถานะเริ่มต้น):** copy markup จาก `_components/bb/ue_chip.html` (`ue_chip_dd`/`ue_chip_opt`) **ตรงตาม data-attribute ทุกตัว** (`data-ue-chip-dd/-btn/-pop/-badge/-clear/-body`) โดยไม่ import macro (คง static-mockup intent) — เหตุผลที่ต้องตรงเป๊ะ: `core/js/bb-components.js` (โหลดผ่าน `_base_ue.html` อยู่แล้ว) auto-init popover จาก attribute พวกนี้ **ยังไม่ได้ verify ในเบราว์เซอร์จริงว่า popover เปิด-ปิดทำงาน** — ถ้าไม่ทำงานแปลว่า markup มีจุดพลาดหรือ page ยังขาด dependency อะไรบางอย่าง ต้อง debug ต่อ
  - icon `expand_more`/`remove`/`add` เขียน Material Symbols ตรงๆ ทั้งหมด (ตามกฎใหม่ที่เพิ่งบันทึกไว้)

- **Mockup table → ใช้จริง + ผูกข้อมูลจริง (2026-07-30):** ผู้ใช้ขอเอา `.bb-table` mockup ทั้ง 2 ตาราง (รถ/คนขับ) มาแทนตารางจริงเดิม (`vc-card`/`vc-table`/`vc-list`) แล้วผูก Jinja loop จาก `vehicles`/`drivers` จริง (มาจาก `_load_fleet_data()` ใน `vehicle_admin.py` — ไม่ต้อง spawn subagent หา เพราะรู้ไฟล์อยู่แล้ว อ่านตรงด้วย Read/Grep)
  - **รถ:** ลบตาราง `vc-card`/`vc-table` เดิมทิ้งทั้งก้อน, ย้าย toolbar+`.bb-table` (เดิม id `fleetMockupTable`) ไปเป็นตารางจริงเดียว (id `fleetVehicleTable`, class `.fleet-mockup`→`.fleet-table`) — คอลัมน์ผูกตรง: avatar tone `is-wr` เมื่อ `v.status != 'active'` (สอดคล้อง badge logic เดิม ไม่ใช่ exact-match `== 'maintenance'` กันกรณี status เป็นอย่างอื่น/None), ปุ่มแก้ไขผูก `data-*` ชุดเดิมทั้งหมด (id/brand/model/plate/capacity/fuel-rate/status/svc-date/svc-km/tax-date) ตรงกับที่ `editVehicleModal`'s `show.bs.modal` handler ใน `vehicle_fleet.js` อ่านอยู่แล้ว — ไม่ต้องแก้ JS ฝั่งนี้
  - **คนขับ:** ลบ `vc-card`+`vc-list` เดิมทิ้ง (การ์ด "ผู้อนุมัติ" ข้างล่างไม่แตะ), ย้าย toolbar+`.bb-table` (เดิม id `fleetMockupDriverTable`) เป็นตารางจริง (id `fleetDriverTable`) — `data-*` ทั้งชุดย้ายจาก `<div class="mf-driver-row">` (เดิม) ไปที่ `<tr>` แทน, action cell ขยายจาก 1 ปุ่ม (edit) เป็น 3 ปุ่ม (view/edit/delete) เพื่อไม่ทำฟังก์ชัน "ดูข้อมูล"/"ลบ" หายไปจากของเดิม (mockup spec ตอนแรกมีแค่ edit เพราะเป็นแค่ตัวอย่าง ไม่ใช่ scope สุดท้าย)
  - **🐛 บั๊กที่จับได้ก่อน ship:** ตอนแรก copy class `mf-driver-row` ไปใส่ `<tr>` ตรงๆ เพื่อให้ `driverRowOf()` (`vehicle_fleet.js`) ยังหา row ได้ — แต่ `.mf-driver-row` ใน CSS เดิมเป็น `display:flex` (ออกแบบมาสำหรับ `<div>` เดิม) ถ้าใส่บน `<tr>` จะพัง table layout (td กลายเป็น flex item หลุด column) → เปลี่ยนชื่อ class บน `<tr>` เป็น `.fleet-driver-row` (hook เปล่า ไม่มี CSS ผูก) แทน + แก้ `driverRowOf()` ให้ query selector ใหม่ตาม
  - **CSS cleanup ตามหลัง (`vehicle_fleet.css`):** ลบ `.mf-plate`/`.mf-name-line`/`.mf-name-sub`/`.mf-cap`/`.mf-odo-unit`/`.mf-actions`/`.mf-icon-btn`(+states)/`.mf-icon-btn--danger`/`.mf-driver-row`/`.mf-driver-main`/`.mf-driver-name`/`.mf-driver-meta`/`.mf-driver-jobs`/`.mf-driver-side` (dead หลังตารางเก่าถูกลบ) — **เก็บ** `.mf-avatar`(+img/-initials/-lg)/`.mf-username-chip`/`.mf-dept-chip` ไว้ เพราะ `driverDetailModal`/Approvers card (ยังไม่แตะ) ใช้อยู่จริง
  - **"งานในสัปดาห์" ยังไม่ผูกข้อมูลจริง — โชว์ "—"**: ตรวจ `_load_fleet_data()` แล้วพบว่า `driver_jobs` มีแค่ `{driver_id: count}` (จำนวน booking อนุมัติแล้ว/เดือน) ไม่ใช่ schedule รายวัน — ไม่มี data source ให้ผูก per-day on/off/OT จริงได้เลย ตัดสินใจไม่เดา/ไม่สร้าง fake data ในตารางที่บอกว่า "จริง" แล้ว (จะหลอก admin ว่า driver ทำงานวันที่ไม่ได้ทำ) → โชว์ `—` (muted) แทนทุกแถว, เก็บ column header ไว้ (ของจริงจะมาทีหลัง), CSS `.fleet-week`/`.fleet-day` เก็บไว้เผื่อใช้ต่อ (ไม่ลบ) ไม่ implement logic เพิ่ม เพราะต้องตัดสินใจ business rule ก่อน (นิยาม "OT" ของวัน = อะไร, ปุ่มเลื่อนสัปดาห์ก่อน/หลัง = ต้องมี query แยกต่อสัปดาห์) — **รอ scope แยกจากผู้ใช้ก่อนทำต่อ**
  - **สถานะคนขับ — ตัดสินใจ default:** mockup เดิมโชว์ 3 label (`พร้อมขับรถ`/`ลาป่วย`/`ลากิจ`) แต่ `Driver.is_active` เป็น boolean เก็บได้แค่ 2 สถานะจริง (2 แถว mockup "ลาป่วย"/"ลากิจ" เป็นแค่ตัวอย่างโชว์ label ทั้งคู่ ไม่ใช่ 2 state จริงที่แยกกันได้) → ตารางจริง map `is_active=True`→`พร้อมขับรถ` (is-ok), `False`→`ไม่พร้อมขับรถ` (is-neutral, ปฏิเสธตรงไปตรงมา ไม่เดาว่าลาประเภทไหน) — ถ้าต้องแยก ลากิจ/ลาป่วย จริง ต้องเพิ่ม field ใหม่ใน `Driver` model ก่อน (ยังไม่ implement)
  - **ปุ่ม "เพิ่ม" ซ้ำ (ค้างจากรอบก่อน) แก้เองโดยอัตโนมัติ:** ปัญหาเดิมที่ถามผู้ใช้ 2 ครั้งไม่ได้คำตอบ (มี "เพิ่มรถ"/"เพิ่มคนขับ" ซ้ำ 2 ปุ่มต่อแท็บ) หายไปเองเพราะปุ่มซ้ำอยู่ใน card-head ของตารางเก่าที่ถูกลบทั้งก้อนรอบนี้ — เหลือปุ่มเดียว/แท็บ (toolbar เดิมของ mockup)
  - **ไม่ได้แตะ (ยังค้างเหมือนเดิม):** `vehicleHistoryModal`/`deleteVehicleModal` ยัง unreachable จากตาราง (pre-existing ก่อนรอบนี้, ไม่ใช่สิ่งที่ผู้ใช้ขอแก้รอบนี้) · addVehicleModal widget preview (บรรทัดใต้ตารางรถ) ยังเป็นแค่ preview ไม่ได้ผูกแทน `#addVehicleModal` จริง (pending คนละงาน — เจอ session hit API limit ระหว่างพยายามทำรอบก่อนหน้า ยังไม่เริ่มใหม่)
  - **แถมเจอบั๊กเดิม (ข้างทาง, แก้เพราะอยู่ในบล็อกที่ต้องเขียนใหม่พอดี):** driver empty-state icon เดิมใช้ `data-lucide="user-round"` ซึ่งไม่มีใน `MAP` ของ `ms-icons.js` → fallback `user_round` (ไม่ใช่ glyph name จริงของ Material Symbols, จะ render เป็นกล่อง/ว่างเปล่า) เปลี่ยนเป็น `group` (มีจริงใน MAP, ใช้ที่อื่นในไฟล์นี้ด้วยอยู่แล้ว)

- **`#addVehicleModal` — wired ใช้จริง ตาม `#bookingModal` pattern (2026-07-31):** ก่อนลงมือถามผู้ใช้ก่อนว่าต้องเปลี่ยน/เพิ่มอะไรบ้าง (investigate-only, ยังไม่แก้) — เจอ 3 กลุ่มปัญหา (wrapper ซ้อน `.bb-modal`/`.modal-content` กัน double chrome, bug field-name/submit-type ในตัว widget เอง, id ชนกันของ stepper) รายงานครบแล้วผู้ใช้ตอบทีเดียว 6 ข้อ → ลงมือทั้งหมด
  - **โครง:** ตัด `vc-modal` ทิ้ง ใช้ `.card.modal-content.border-0` + `modal-dialog-centered` (ไม่ `-lg`) ตรงตาม bookingModal เป๊ะ (ผู้ใช้สั่งให้เช็คแล้วทำตาม ไม่ใช่แค่แรงบันดาลใจ) — `card-body`/`card-footer bg-white border-top-0` แทน `.bb-modal-body`/`.bb-modal-foot` เดิม (ได้ footer ขาวไม่มีเส้นบนจาก utility class ตรงๆ, ไม่ต้องพึ่ง CSS override แยกอีกต่อไป — ลบ `.fleet-mockup .bb-modal-foot` rule ทิ้งเพราะ class `fleet-mockup` ไม่มี markup ใช้แล้วด้วย)
  - **เจอ conflict ที่ต้อง verify ก่อนเชื่อว่า "ทำตาม bookingModal แล้วได้ผลเหมือนกัน":** `vehicle_fleet.html` ยังโหลด `design-system.css` (bookingModal's host page ไม่โหลด) ซึ่งมี `.card{border/-radius/box-shadow:...!important}` global (บรรทัด 380) — ถ้าไม่ทำอะไรเพิ่ม `.border-0` จะแพ้ `!important` เดิม ได้ขอบ+radius คนละแบบจากที่ตั้งใจ → เพิ่ม scoped override เฉพาะ `#addVehicleModal .card.modal-content` (ค่าตรงกับ `.bb-modal` เดิม: `--bb-r-lg`/`--bb-shadow-lg`) ปิดจุดนี้แทนที่จะเดาว่า "น่าจะเหมือนกัน" (`.card-footer` ของ design-system.css comment ทิ้งไปแล้วในไฟล์นั้นเอง เลยไม่ชน ไม่ต้อง override)
  - **Bug ในตัว widget ที่ audit เจอก่อนแล้วแก้ตามคำสั่ง "แก้เลย":** 3 field (ทะเบียนรถ/ยี่ห้อ-รุ่น/อัตราสิ้นเปลือง) ใช้ `id="bk_purpose" name="purpose"` ซ้ำกันหมด (copy จาก bookingModal ไม่ได้เปลี่ยนตอนสร้าง mockup) → แยกชื่อจริง; stepper ไม่มี hidden input เลย (แค่ตัวเลขโชว์) → เพิ่ม `#fleetCapacityInput` + แก้ `bindFleetCapacityStepper()`; ปุ่มบันทึกเป็น `type="button"` (mockup เดิมไม่ได้ตั้งใจให้กดได้จริง) → `type="submit"`; chip `mock_vehicle_type`/`mock_status` → ชื่อจริง `vehicle_type`/`status`
  - **`model` NOT NULL แต่ UI รวมเป็นช่องเดียว — เช็ก DB ก่อนเชื่อว่า "แค่ไม่ส่งก็พอ":** เปิด `models/vehicle.py` เจอ `model = db.Column(db.String(50), nullable=False)` ไม่มี default — ถ้าไม่ส่ง `model` เลย `request.form.get('model')` คืน `None` → insert พังทันที (NOT NULL constraint) ไม่ใช่แค่ field ว่างเฉยๆ → ตัดสินใจส่ง hidden `<input name="model" value="">` (empty string ผ่านได้ ต่างจาก None) แทน ยี่ห้อ/รุ่นเต็มลง `brand` ตัวเดียวตามที่วางแผนไว้ตั้งแต่ต้น
  - **`vehicle_type` → column จริง:** spawn `db-helper` (ครั้งก่อนชน API limit ยังไม่เสร็จ รอบนี้รันผ่าน) — เพิ่ม `Vehicle.vehicle_type = db.Column(db.String(20), nullable=True)` ตรงตาม convention `status` (พร้อมคอมเมนต์ค่า `pickup`/`van`/`truck6`), migration `2026-07-31_vehicle-add-vehicle-type.sql` (ยังไม่รัน), sync `schema.md` Part 1+2 + `INDEX_code.md` + `migrations-index.md` ครบ. Controller เพิ่ม `vehicle_type = request.form.get('vehicle_type') or None` เอง (รู้ไฟล์/บรรทัดอยู่แล้วจากการ investigate รอบก่อน ไม่ต้อง spawn guide-vehicle ซ้ำ)
  - **ลบ preview widget เดิมทิ้ง** ตามคำสั่ง "ย้ายมาใช้ใน modal แล้วลบของเดิมออก" — แก้ id-collision ของ `#fleetCapacityStepper` (เดิมมี 2 จุดพร้อมกันถ้าไม่ลบ preview: `getElementById` เจอตัวแรกเสมอ ตัวที่ 2 จะไม่ทำงาน)
  - **ยังไม่ verify ในเบราว์เซอร์จริง** — ไม่มี preview server access (dev server เป็น process ของผู้ใช้เอง, ดู `feedback_preview_server.md` memory) — โดยเฉพาะ `.card.modal-content` chrome หลัง override (คาดว่าตรง `.bb-modal` แต่ไม่เคยเห็นจอจริง) + `ue-chip-pop` popover open/close (ยังไม่เคย verify ตั้งแต่รอบสร้าง widget ครั้งแรกด้วย)

## ไฟล์ที่แก้

- `app/templates/vehicle/admin/vehicle_fleet.html` — rewrite (shell) → table promoted to real + wired to real data (2026-07-30) → `#addVehicleModal` rebuilt on bookingModal pattern + wired (2026-07-31)
- `app/static/vehicle/css/vehicle_fleet.css` — token swap ในที่ + ลบ dead CSS (`.mf-header`/`.mf-title`/`.mf-subtitle` รอบแรก, `.mf-plate`/`.mf-name-*`/`.mf-cap`/`.mf-odo-unit`/`.mf-actions`/`.mf-icon-btn*`/`.mf-driver-row`/`-main`/`-name`/`-meta`/`-jobs`/`-side` 2026-07-30)
- `app/static/vehicle/js/vehicle_fleet.js` — `bindFleetTabs()`/`bindFleetCapacityStepper()` (รอบก่อน) + `driverRowOf()` selector `.mf-driver-row`→`.fleet-driver-row` (2026-07-30) + `bindFleetCapacityStepper()` sync hidden `#fleetCapacityInput` (2026-07-31)
- `app/views/vehicle/vehicle_admin.py` — `_fleet_add_vehicle()` เพิ่ม `vehicle_type = request.form.get('vehicle_type') or None` (2026-07-31)
- `app/models/vehicle.py` — `Vehicle.vehicle_type` column ใหม่ (ผ่าน `db-helper`, 2026-07-31)
- `app/migrations/2026-07-31_vehicle-add-vehicle-type.sql` — ใหม่ (ยังไม่รัน)
- `app/migrations/migrations-index.md`, `docs/notes/database/schema.md`, `docs/notes/INDEX_code.md` — sync สำหรับ `vehicle_type` (ผ่าน `db-helper`)
- `docs/notes/INDEX_ui.md`, `docs/notes/INDEX.md`, `docs/notes/CHANGELOG.md` — sync รอบ 2026-07-30/31
