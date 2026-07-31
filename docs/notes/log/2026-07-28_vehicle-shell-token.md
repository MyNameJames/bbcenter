# vehicle.html migrate — Phase 1: shell + token

> **status:** in_progress · **เริ่ม:** 2026-07-28
> ref: [design_guideline.md §13 Z0 · §14 adoption](../design_guideline.md) · [vehicle_product_spec.md](../vehicle_product_spec.md)

## Scope (เฟส 1 เท่านั้น)

| ชั้น | จาก | เป็น |
|---|---|---|
| shell | standalone `<html>` + `_shared/sidebar.html`+`header.html` + `body.zd` | `{% extends '_base_ue.html' %}` |
| token | `--vc-*` (indigo) + `vehicle_zendenta.css` | `--bb-*` (ink + เขียว 2 จุด) |

**ยังไม่ทำ (เฟสถัดไป):** component `Calendar` (`.bb-mcal`) · demand heatmap · redesign modal 4 ตัว · density/layout

## ตัดสินใจ

1. **ไฟล์ CSS ใหม่ `vehicle_calendar.css` แทนการแก้ `vehicle.css` ในที่** (ผู้ใช้เคาะ 2026-07-28)
   เหตุ: `vehicle.css` ถูกโหลดโดย **12 หน้า** และหน้าเหล่านั้นไม่โหลด `components.css` → swap token ในที่ = `--bb-*` ว่าง = 11 หน้าสีหาย
   และ `room.html`/`room.js` ใช้ class ปฏิทินชุดเดียวกัน (`calendar-cell` · `event-card` · `date-number` · `vrc-*`) → ลบ block = หน้า room พัง
   ⇒ `vehicle.css` **ไม่ถูกแตะ**; หน้า vehicle เลิกโหลดมันแทน
2. **modal 4 ตัวยังพึ่ง CSS เดิมชั่วคราว** — `tokens.css` (`--vc-*`) + `design-system.css` (`.vc-btn`/`.vc-badge`/form) + `vehicle_admin.css` (`.va-cal` date picker) ยังโหลดอยู่
   `.bk-*` ทั้งชุด port เข้าไฟล์ใหม่แล้ว (swap token อย่างเดียว ไม่ redesign) → ตัด `vehicle.css` ออกได้
   ตรวจแล้วว่า `design-system.css` + `vehicle_admin.css` **ไม่มี rule ปฏิทิน** → ไม่ชนกับไฟล์ใหม่
3. **ห้าม rename class** ที่ `vehicle.js` ผูก (`calendar-cell` · `date-number` · `event-card` · `events-container` · `event-more` · `mobile-indicator` · `bk-*` · `vrc-m-*`)

## Token map ที่ใช้

| `--vc-*` | `--bb-*` |
|---|---|
| `bg` / `bg-subtle` / `bg-hover` | `n0` / `n50` / `n100` |
| `border` / `border-hover` / `border-strong` | `n200` / `n400` / `mut` |
| `fg` / `fg-muted` / `fg-subtle` / `fg-disabled` | `str` / `mut` / `n500` / `n400` |
| `primary` · `accent` (indigo) | `ink` (v2.1 — ปุ่มหลัก/active = ink) |
| `accent-light` / `accent-ring` | `accent-bg` / `ring` |
| `green` / `amber` / `red` / `blue` (+`-bg`) | `ok-tx` / `wr-tx` / `dg-tx` / `info-tx` (+`-bg`) |
| `radius-xs/sm/md/lg` | `r-surface` (8) · กดได้ = `r-pill` |
| `text-xs/sm/base` | px ตรง (13/14/15) |
| `dur-*` / `ease-*` | ค่า literal |

`*-border` ของ semantic ไม่มีใน `--bb-*` → status pill ใช้ bg tint + text tone ไม่มีเส้นขอบ (ตรง `.bb-status` §12)

## Checklist

- [x] 1 PLAN — scoped 5 field + log file
- [x] 2 GUARD — ไม่แตะ models / ไม่แตะ logic เงิน-สถานะ → ไม่ต้อง db-helper / test-first
- [ ] 3 BUILD
- [ ] 4 VERIFY — ผู้ใช้ทดสอบบน localhost:5001 (server เป็น process ของผู้ใช้)
- [ ] 5 SYNC — INDEX_ui.md · guideline §14 adoption · CHANGELOG
- [ ] 6 CLOSE — log → doc/

## ไฟล์ที่แก้

- `app/templates/vehicle/vehicle.html` — rewrite (shell)
- `app/static/vehicle/css/vehicle_calendar.css` — ใหม่
- `app/static/vehicle/css/vehicle_zendenta.css` — ลบ
- `app/static/vehicle/js/vehicle.js` — swap `--vc-*` → `--bb-*` ใน inline style constant
