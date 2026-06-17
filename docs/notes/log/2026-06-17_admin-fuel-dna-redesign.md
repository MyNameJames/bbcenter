# Log — Redesign admin_fuel.html → DNA Zendenta

> เริ่ม 2026-06-17 · status: **in_progress**

## Scope (5 field)
- **[ไฟล์]** `app/templates/vehicle/admin/admin_fuel.html` · `app/templates/_shared/header.html` · `app/static/vehicle/css/vehicle_fuel.css` · KPI CSS · Manrope global (header.html)
- **[ตำแหน่ง]** KPI L74-192 · head L17 · header crumb L20-30 · bills table L361-446 · css L65/71
- **[งาน]** 3 KPI strip (งบ/สำรอง/รอเบิก แบบ ใช้/ทั้งหมด + icon tile + Manrope) · header breadcrumb→page-title ทั้งระบบ · table flat ไม่มี border ไม่ sortable · โหลด Manrope global · layout bootstrap utility
- **[ข้อจำกัด]** `--vc-*` only · no shadow · no inline `<script>` · bootstrap utility แทน custom CSS · ไม่แตะ route/model · คง `data-fuel-*` / `#fuelBillsBody` / `.bill-check` attribute
- **[output]** redesigned template + css

## Decisions (จากผู้ใช้)
1. KPI: 3 ตัว = งบทั้งปี / เงินสำรอง / รอเบิก — ตัด จ่ายเอง + อนุมัติ breakdown (ข้อมูลคงใน DB)
2. subtext = "% ของงบ · คงเหลือ X บาท"
3. header: เปลี่ยนทั้งระบบ (ทาง A)
4. table: flat ไม่มี border, ไม่ sortable
5. mood DNA: flat + border bg-tint (ไม่ใช่เงา), Manrope เป็นพระเอก, accent ประหยัด

## Checklist
- [x] 1 PLAN — scoped 5 field + log
- [x] 2 GUARD — display-only (ไม่แตะ model/เงิน/service/JS) → ผ่าน
- [x] 3 BUILD — KPI 3-strip / header title global / Manrope / css cleanup (table ไม่ต้องแตะ — flat อยู่แล้ว)
- [ ] 4 VERIFY — รอผู้ใช้ verify browser (server port 5001 ผู้ใช้รันเอง, preview tools ใช้ไม่ได้)
- [x] 5 SYNC — INDEX_ui + design_dna_redesign + design_system + checker ผ่าน (architecture ไม่เกี่ยว)
- [ ] 6 CLOSE — รอ verify ผ่านก่อน → log → doc/

## ไฟล์ที่แก้ (5)
1. `app/templates/_shared/header.html` — Manrope global + breadcrumb→`<h1 vrc-topbar-title>` (ทั้งระบบ)
2. `app/static/core/css/vercel.css` — `.vrc-topbar-crumb*`→`.vrc-topbar-title`
3. `app/static/vehicle/css/vehicle_fuel.css` — card radius/hover token + `.fuel-kpi*` strip
4. `app/templates/vehicle/admin/admin_fuel.html` — head Manrope, ลบ h1, KPI 2card→3strip
5. docs: INDEX_ui.md · design_dna_redesign.md · design_system.md

## หมายเหตุ
- header global เช็กแล้ว — ทุกหน้าส่ง page_title ชัดเจน ไม่พัง
- self_paid + อนุมัติ breakdown ตัดจาก KPI (ข้อมูลคงใน DB)

## Iteration 2 (2026-06-17) — toolbar + filter popover
- ข้อ1 KPI borderless: `vc-card` → `.fuel-kpi-strip` (no border รอบ, เส้นกั้น cell + border-bottom)
- ข้อ2 รวมปุ่ม: ลบ page-action bar → price-open + bill-create อยู่ใน `vc-card-head-actions` อันเดียว
- ข้อ3 filter popover: filter bar → ปุ่ม "ตัวกรอง" (`#filterToggle`) + `form.fuel-filter-panel#filterForm` (position:fixed). JS +`wireFilterPopover()`. selects เอา `data-dropdown` ออก (native ใน popover). คง `#filterForm` + `.vc-filter-select` → `wireFilterBar` auto-submit ทำงานต่อ
- ข้อ4: `.vc-card-head` flex-wrap nowrap + `.vc-card-head-actions` overflow-x:auto scroll
- ไฟล์เพิ่ม: `vehicle_fuel.js` (wireFilterPopover)
- orphan: `components/filter_bar.css` `.vc-filter-bar` wrapper เลิกใช้ในหน้านี้ (ไม่ลบ — อาจมีหน้าอื่นใช้); noscript filter fallback หาย (ระบบพึ่ง JS อยู่แล้ว)
