# 2026-07-31 · กู้ CSS `.bb-field-box*` + `.bb-df*` + `.bb-trf*`

status: in-progress

## บริบท

commit `997ebd5` เขียนทับ `components.css` ด้วยเวอร์ชันก่อน v2.1 → CSS หาย 2 ก้อน

| ก้อน | ของ | กู้ยังไง |
|---|---|---|
| 1 | Drawer · DescList · table-wrap · pag-size ฯลฯ (43 class) + `:root` v2.1 | `git checkout 74fce7d --` → **ผู้ใช้ทำแล้ว 19:08** |
| 2 | `.bb-field-box*` · `.bb-df*` · `.bb-trf*` | **เขียนใหม่** — ไม่เคยติด git (งาน 2026-07-29 ย้ายจาก inline `<style>` เข้า canonical แล้วโดนทับก่อน commit) |

ตรวจแล้วไม่มีใน: ทุก commit · worktree · dangling blobs · stash

## Scoped Command

- **[ไฟล์]** `app/static/core/css/components.css`
- **[ตำแหน่ง]** section ใหม่ `§2b · FIELD BOX` ต่อจาก `§2 · INPUT` (หลังบรรทัด 126 `.bb-hint.is-error`)
- **[งาน]** เขียน CSS ให้ครบทุก class/state ที่ macro + JS อ้างถึง
- **[ข้อจำกัด]** token `--bb-*` v2.1 เท่านั้น · px · radius `8`/`pill` · เงาดำ · ห้าม hex literal · ห้าม `#06C167` เป็น border/text
- **[output]** CSS block เดียวใน components.css + sync CHEATSHEET/INDEX_ui

## Surface ที่ต้องรองรับ (จาก macro + JS + template จริง)

**`.bb-field-box`** — กล่อง flex: `[icon?] [input] [action?] [pop?]`
- `.bb-field-box-icon` (ซ้าย) · variant `.border-end` (Bootstrap class ที่ template ใส่มาเป็นเส้นคั่น)
- `.bb-field-box-action` (ขวา, `expand_more`)
- input ข้างใน = `.form-control` (Bootstrap) หรือ plain `<input>` → reset border/shadow/bg
- `.is-active` — JS `initDateField` ใส่ตอนเปิด panel
- validation: `.was-validated` + `:has(input:invalid)` → ring แดงที่**กรอบนอก** + reset `background-image` ของ Bootstrap

**`.bb-df*`** — `.bb-df` · `-panel` · `-head` · `-nav` · `-month` · `-week` · `-grid` · `-day` + `.is-muted`/`.is-active`/`.is-disabled`
- panel = **static flow ใต้ trigger** (JS ไม่ portal → absolute จะโดน modal clip)

**`.bb-trf*`** — `.bb-trf` · `-unit` · `-to` · `-pop` + `.is-open` · `-opt` + `.is-active` · `[data-bb-trf-duration]`

## ผู้ใช้งาน (30 จุด / 5 ไฟล์)

`vehicle_book.html` (9) · `vehicle_fleet.html` (6) · `vehicle_budget.html` (5) · macro `datefield.html`/`timerangefield.html`

layer อื่นครบแล้ว: Python wrapper (`components/datefield.py`, `timerangefield.py`) · render layer · JS (`bb-components.js` 17 hit) · gallery (`/dev/components` §DateField/§TimeRangeField)

## Checklist

- [x] 1 PLAN
- [ ] 2 GUARD — ไม่แตะ model/เงิน/สถานะ = CSS ล้วน ข้ามได้
- [ ] 3 BUILD
- [ ] 4 VERIFY
- [ ] 5 SYNC
- [ ] 6 CLOSE

## นอก scope (จดไว้ ไม่แก้)

- `vehicle_book.html` มี global unscoped `.material-symbols-rounded{font-variation-settings:'wght' 300}` ใน `<style>` — guideline §13 บันทึกเป็น debt แล้ว
- `.bb-trf-pop` ไม่ portal → เสี่ยง clip ถ้า ancestor มี `overflow:hidden` (guideline §12 #6 บอก dropdown ควร portal) — JS เดิมเป็นแบบนี้ ไม่แก้ในรอบนี้
