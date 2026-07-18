# dashboard.html — Zendenta-original redesign (scoped)

> สถานะ: in-progress · 2026-06-18

## Scoped Command
- **[ไฟล์]**: `app/templates/dashboard/dashboard.html` + `app/static/dashboard/css/dashboard.css`
- **[ตำแหน่ง]**:
  - html: เพิ่ม section "ภาพรวมคำขอ" (stat strip) ก่อน section "คำขอของฉัน" (131) · redesign table "คำขอของฉัน" (131–174) · wrap scope `.dash-zen`
  - css: เพิ่ม block scoped `.dash-zen` (local vars + `.dz-stat*` + `.dz-table*` + `.dz-badge*`) ต่อท้ายไฟล์
- **[งาน]**:
  1. Stat overview — derive จาก `my_requests` ใน Jinja (`status_color`: total / warning / blue / success) → 4 Zendenta stat card (icon-tile สี + label + เลข `.vc-mono` + mini progress bar สัดส่วนต่อ total)
  2. Redesign table "คำขอของฉัน" → Zendenta แถวโปร่ง: icon-tile service สี + title/subtitle two-line + badge tint สถานะ + วันที่ Manrope + ปุ่มทำซ้ำ ghost · hairline + hover · คง `empty_state`
  3. CSS scoped: local vars (radius 14, soft shadow, status tints mint/peach/blush/lavender) ใต้ `.dash-zen` เท่านั้น
- **[ข้อจำกัด]**:
  - scoped `dashboard.css` เท่านั้น — ห้ามแตะ `design-system.css`/`vehicle.css` (global)
  - **DESIGN-OVERRIDE (legit, user-approved 2026-06-18):** shadow + radius 14px อนุญาตเฉพาะใน `.dash-zen` scope — comment กำกับใน CSS. dashboard = Zendenta-original pilot ถาวร, ตั้งใจต่างจาก 7 หน้า Zendenta-clean
  - **icon tile = monochrome** `--vc-icon` (#9999b0) บน `--vc-icon-bg` (#f0f0f0) เหมือน DNA เดิม — ห้ามหลากสี · สีมีได้เฉพาะ status badge (warning/blue/success/neutral tint)
  - ไม่แตะ backend (`auth_view.py`) — stat derive ใน Jinja จาก `my_requests`
  - ห้าม inline `<script>` ใน template — animation = CSS เท่านั้น (count-up ถ้าจำเป็น → `dashboard.js`)
  - icons = lucide (`data-lucide`) ตามระบบ · ตัวเลข = `.vc-mono` (Manrope โหลด global ที่ `header.html` แล้ว)
  - ไม่แตะ section อื่น: Quick Actions / วันนี้ของฉัน / superadmin · คง `dash-fade` entrance
- **[output]**: dashboard.html + dashboard.css redesigned · pytest เขียว · sync INDEX_ui + design_dna_redesign (บันทึก scoped exception) · browser ผู้ใช้ดูเอง (server 5001)

## Checklist
- [x] 1 PLAN — scoped 5 field + log file + ถาม DNA scope/data (×2)
- [x] 2 GUARD — แตะแค่ template+CSS, ไม่มี model/เงิน/สถานะ → ไม่ต้อง db-helper/test-first
- [ ] 3 BUILD
- [ ] 4 VERIFY — pytest + ผู้ใช้ดู browser
- [ ] 5 SYNC — INDEX_ui.md + design_dna_redesign.md (scoped exception) + checker
- [ ] 6 CLOSE

## Data ref (auth_view.py:93 `_build_my_requests`)
`my_requests[]` = `{service, icon, title, subtitle, status_label, status_color, created_at, repeat_url}`
`status_color` ∈ `warning`(รอ) · `blue`(กำลังดำเนินการ) · `success`(เสร็จ/อนุมัติ) · `neutral`(อื่น)
service→icon: vehicle=car · repair=desktop · maintenance=building-2 · room=users

## ไฟล์ที่แก้
- (รอ BUILD)
