---
name: component-guide
description: >
  BBCenter — reverse lookup: บอก "หน้าไหน บรรทัดไหน class อะไร" → คืน component
  (.bb-*) + signature + ตัวอย่าง copy-paste. join guideline §12 (class หลัก) กับ
  app/components/CHEATSHEET.md (signature). ใช้เมื่อผู้ใช้ถามว่า class นี้เป็น
  component ตัวไหน / ใช้ยังไง / จะแก้ UI ตรงนี้ต้องใช้ component อะไร หรือสั่ง
  "update map" เมื่อ gallery มี component ใหม่.
  Triggers:
  - "/component-guide" / "class ... เป็น component อะไร" / "หน้า X บรรทัด Y ใช้อะไร"
  - "update map" / "gallery เพิ่ม <ชื่อ> sync map"
---

# component-guide — class → component (reverse lookup)

**หน้าที่:** ผู้ใช้ชี้ class (จาก template ที่จะแก้) → คืน Python component + signature + ตัวอย่าง
map นี้ = **join** `design_guideline.md §12` (คอลัมน์ class หลัก) + `app/components/CHEATSHEET.md` (signature)

## ⛔ Guard — บังคับทุกครั้ง (กันเปลือง token)

1. **Read เฉพาะบรรทัดที่ผู้ใช้บอก** (`offset`+`limit` ~5 บรรทัด) — ห้าม Read template ทั้งไฟล์
2. **โหลดเป็นชั้น:** อ่าน map ด้านล่างก่อน (เล็ก) → เจอ match ค่อยเปิด `CHEATSHEET.md` ดึง signature เฉพาะตัวนั้น
3. **ห้าม copy signature มาเก็บใน map** — signature อยู่ CHEATSHEET เสมอ ชี้ไป ไม่ทำซ้ำ (drift + token คูณ 2)
4. **ห้าม glob/grep `app/components/`** (CLAUDE.md ห้ามอยู่แล้ว)
5. **scope แค่ `.bb-*`** — เจอ legacy/utility → ตอบ 1 บรรทัดแล้วหยุด (ดู §เจอของนอก scope)
6. **ไม่ match = จบทันที** — "ยังไม่มี component ตัวนี้ → เปิด gallery เพิ่ม" ห้ามเดา ห้ามค้นต่อ

## Flow — Lookup

```
ผู้ใช้: "หน้า vehicle_cost.html บรรทัด 142 class bb-kpi"
1. Read บรรทัด 142 (offset=140 limit=5) → ยืนยัน class จริง (ไม่เดาจากชื่อหน้า)
2. หาใน map → .bb-kpi → KPI
3. เปิด CHEATSHEET.md ดึง signature + ตัวอย่างของ KPI เท่านั้น
4. คืน: component + signature + ตัวอย่าง copy-paste
```

ถ้าผู้ใช้บอก class มาตรงๆ ("bb-menu เป็นอะไร") → ข้ามขั้น Read ไป lookup เลย

## MAP — class → component (`.bb-*` canonical เท่านั้น)

> source of truth = guideline §12 + CHEATSHEET · แก้ component เมื่อไหร่ = sync ตารางนี้ด้วย

### Core 13 (guideline §12)
| class หลัก | component | หมายเหตุ (1:many / ตัวแปร) |
|---|---|---|
| `.bb-btn` (`.is-pri/.is-sec/.is-ghost/.is-danger/.is-sm/.is-icon`) | **Button** | variant ผ่าน `.is-*` |
| `.bb-field` / `.bb-label` / `.bb-input` (`.bb-input-wrap`) | **Input** | select/textarea ก็ใช้ `.bb-input` |
| `.bb-search` | **Search** | |
| `.bb-seg` / `.bb-seg-btn` | **Segmented** | (กลุ่ม Filter) |
| `.bb-chip` | **Chip** | (กลุ่ม Filter) |
| `.bb-token` / `.bb-token-x` | **Token** | (กลุ่ม Filter) |
| `.bb-daterange` | **DateRange** | (กลุ่ม Filter) |
| `.bb-tabs` / `.bb-tab` / `.bb-tab-count` | **Tabs** | underline = กรองสถานะ |
| `.bb-select` / `.bb-menu` / `.bb-menu-rich` / `.bb-menu-item` | **Dropdown** ⚠️ **1:many** | `.bb-select`+`.bb-menu` ใช้ทั้ง Dropdown **และ** Filter §4 — ดู context |
| `.bb-card` / `.bb-card-head` / `.bb-card-body` | **Card** | ❌ ห้าม border-left สีพิเศษ |
| `.bb-kpi` (`.is-ghost`) / `.bb-kpi-tile/-label/-value/-den/-delta` | **KPI** | ghost = ไม่มีกรอบ |
| `.bb-table` / `.bb-th` / `.bb-check` / `.bb-cell-id/-strong/-num` | **Table** | ❌ ไม่มี zebra/เส้นตั้ง |
| `.bb-badge` (`.is-neutral/.is-accent`) | **Badge** | คนละตัวกับ Status |
| `.bb-status` (`.is-ok/wr/dg/info/neutral`, `.bb-dot`) · `.bb-status-inline` | **Status** ⚠️ | pill (default) vs `inline=True` ในตาราง |
| `.bb-pag` / `.bb-pag-info` / `.bb-pag-nav` / `.bb-pg` | **Pagination** | |
| `.bb-modal-overlay` / `.bb-modal` / `.bb-modal-head/-body/-foot` | **Modal** | |
| `.bb-timeline` / `.bb-tl-item` / `.bb-tl-dot/-time/-title/-desc` | **Timeline** | state done/cur/todo |
| `.bb-empty` / `.bb-empty-icon` | **Empty** | |
| `.bb-skeleton` | **Skeleton** | ❌ ไม่มี gradient |
| `.bb-spinner` (`.is-sm`) | **Spinner** | |

### Form / Date-Time / More (CHEATSHEET — class ตาม convention `.bb-<name>`, event `bb-<name>:change`)
| class หลัก | component |
|---|---|
| `.bb-combo` | **Combo** (dropdown + search) |
| `.bb-upload` | **Upload** |
| `.bb-slider` | **Slider** (`dual=True` = ช่วง) |
| `.bb-weekstrip` | **WeekStrip** |
| `.bb-datepicker` | **DatePicker** |
| `.bb-timepicker` | **TimePicker** |
| `.bb-timerange` | **TimeRange** |
| `.bb-callout` | **Callout** (อยู่กับที่ · คนละตัวกับ Toast) |
| `.bb-toast` (`ToastRegion`) | **Toast** (เด้งมุมจอ) |
| `.bb-bell` | **Bell** (alert icon) |
| `.bb-sidebar-*` | **Sidebar** |

> ⚠️ กลุ่มนี้ class เดา convention `.bb-<name>` — ถ้าไม่ตรง = ยืนยันกับ gallery ก่อนคืน

## เจอของนอก scope — ตอบสั้นแล้วหยุด

| เจอ | ตอบ |
|---|---|
| `.zen-*` · `.data-table` · `--vc-*` (legacy) | "legacy — ไม่มี Python component (เขียนมือ) · จะใช้ component ต้อง migrate เป็น `.bb-*`" |
| Bootstrap utility (`d-flex` `row` `col-*` `py-*` `gap-*`) | "utility ไม่ใช่ component → ดู guideline §8 (Bootstrap) / §4 (spacing) หรือใช้ skill `bootstrap-guide`" |
| class ที่ไม่มีใน 2 ตาราง | "ยังไม่มี — เปิด gallery (`/static/core/components-gallery.html`) เพิ่มเข้า components.css ก่อน" |

## Flow — Update (เมื่อ gallery มี component ใหม่)

```
ผู้ใช้: "gallery เพิ่ม Callout แล้ว update map"
1. Read เฉพาะ block ของ Callout ใน app/components/*.py (หา class + signature) — ไม่อ่านทั้ง dir
2. เพิ่ม 1 แถวในตารางข้างบน: .bb-callout → Callout
3. เตือนให้ sync 5 จุดถ้ายังไม่ครบ (ห้ามเงียบ):
   components-gallery.html · components.css · app/components/*.py · CHEATSHEET.md · guideline §12
4. ตอบกลับว่าเพิ่มแถวไหนแล้ว
```

**Guard update:** แตะเฉพาะ component ที่ผู้ใช้บอกชื่อ · **ห้าม re-scan gallery ทั้งไฟล์** / re-generate map ทั้งก้อน (ยกเว้นสั่ง "rebuild map")
