# BBCenter Design Guideline

> **สถานะ:** v1.0 (2026-06-28) · **canonical design source — อ่านก่อนออกแบบ/แก้ UI/CSS/template ทุกครั้ง**
> เอกสารนี้ = แหล่งเดียวของการตัดสินใจ design. ของเก่า (`design_system.md` · `design_dna_redesign.md` · `zendenta_migration.md`) = **ลบแล้ว 2026-06-28** ใช้ไฟล์นี้แทน
>
> ⚠️ **Target spec vs code ปัจจุบัน:** ไฟล์นี้คือ *เป้าหมาย* (accent น้ำเงิน `#4081EC` · Sarabun+Inter · rem · soft-shadow). โค้ดเดิมยังใช้ token เก่า (`--vc-*` indigo `#4059e6` · no-shadow · px) จนกว่าจะ migrate → **UI ใหม่/redesign ยึดไฟล์นี้** · หน้าเก่ายังไม่ migrate = legacy จนกว่าจะแตะ
>
> 🚦 vehicle domain → อ่าน [vehicle_product_spec.md](vehicle_product_spec.md) คู่กันเสมอ

---

## 0. North Star

สาย **functional minimalism** — โครงเป็นระบบแบบ Google + รสนิยมสะอาดแบบ Apple + craft แบบ Linear/Stripe
อ้างอิง: Apple HIG · Material · Linear · **Stripe (สีหลัก)** · Dime · Grab

---

## 1. Design Philosophy (7 หลักการ)

| # | หลักการ | กฎ | ที่มา |
|---|---|---|---|
| 1 | **ข้อมูลมาก่อน interface ถอย** | chrome น้อย · border+ที่ว่างนำ · ปุ่มต้องดูเหมือนปุ่ม | Apple · Stripe |
| 2 | **Typography คือลำดับชั้น** | จัดด้วย size+weight เท่านั้น ห้ามใช้สี/เงาแทน | Stripe · Linear |
| 3 | **สีคือสัญญาณ** | monochrome ฐาน + 1 accent · semantic เฉพาะ status | Stripe · Linear · Google |
| 4 | **เงาแบบสุขุม** | soft shadow เฉพาะของที่ลอยจริง · ของพื้นใช้ border | Stripe · Google |
| 5 | **Opinionated + modular** | 1 ปัญหา = 1 pattern · component กลางใช้ซ้ำ · token=ความจริง | Linear · Grab |
| 6 | **เผยข้อมูลเป็นชั้น บนโครงที่นิ่ง** | โครงหน้าอยู่ที่เดิม · เปลี่ยนแค่ "เผย/เน้น" ไม่ใช่ "วางตรงไหน" · ห้าม reorder/personalize layout | Stripe · Apple · Grab (in-place เท่านั้น) |
| 7 | **การเงินเป็นมิตร + เนี้ยบทุก state** | งบ/ตัวเลขดูสงบ ไม่น่ากลัว · ออกแบบทุก microstate (hover/focus/disabled/loading/empty) | Dime · Linear · Stripe |

**หลักการ 6 อยู่ใต้ 5:** opinionated/predictable มาก่อน — context-awareness ทำได้แค่ highlight/badge อยู่กับที่ ห้ามขยับโครง

---

## 2. Color

### โครง token 2 ชั้น
- **primitive** (ค่าดิบ: `accent-600`, `neutral-50`) → **semantic** (ตามหน้าที่: `action-primary`, `text-muted`, `surface-card`)
- ตั้งชื่อ semantic ตาม**หน้าที่** ไม่ใช่สี → เปลี่ยน brand/dark ที่ชั้นเดียว

### Accent — น้ำเงิน (migrate จาก Stripe blurple 2026-07-05 → เฉดสว่างขึ้น 2026-07)
| Token | Hex | ใช้ | white-text |
|---|---|---|---|
| `accent-bg` (tint) | `#EFF6FF` | tint bg (active nav/selected) | — |
| `accent` ★ | `#4081EC` | brand identity · dot · icon · fill ใหญ่ · **CTA fill + link (interactive)** | 3.8 ⚠️ |
| `accent-hover` | `#1766E8` | hover | 5.1 ✅ |
| focus ring | `0 0 0 3px rgba(64,129,236,.18)` | | |

**กฎ:** text/link/CTA บนพื้นขาว → `accent` — token เดียวใช้ทั้ง identity/interactive (ไม่แยก 500/600 เหมือน blurple เดิม เพราะทดสอบแล้วค่าเดียวพอ). ⚠️ **`accent` เฉดใหม่ (2026-07) contrast บนขาว = 3.8:1 — ไม่ผ่าน AA text ปกติ (ต้องการ 4.5:1)** ผ่านแค่ large-text/UI-component-level (≥3:1) — ถ้าใช้เป็น body text/link ตัวเล็กบนพื้นขาว ให้ใช้ `accent-hover` (`#1766E8`, 5.1:1 ✅ ผ่าน AA) แทน หรือคง `accent` ไว้เฉพาะ dot/icon/fill ที่ไม่ใช่ข้อความ

### Neutral — เทาอมฟ้า (cool, Stripe-derived)
| Step | Hex | semantic |
|---|---|---|
| `0` | `#FFFFFF` | surface (card/modal/sidebar) |
| `50` | `#F6F9FC` | bg (page) |
| `100` | `#EEF2F8` | bg-subtle (thead/hover/KPI) |
| `200` | `#E2E8F1` | border |
| `300` | `#CDD6E3` | border-strong |
| `400` | `#9AA7BC` | text-disabled |
| `500` | `#8593A8` | text-subtle (placeholder/meta) |
| `600` | `#5B6B83` | text-muted (label/cell รอง · AA ✅) |
| `800` | `#273951` | text-body |
| `900` | `#0A2540` | text-strong (heading) |

### Semantic — status เท่านั้น
| Role | dot/fill | text (AA) | bg-tint | border-tint |
|---|---|---|---|---|
| success | `#16A34A` | `#15803D` | `rgba(22,163,74,.10)` | `rgba(22,163,74,.25)` |
| warning | `#D97706` | `#B45309` | `rgba(217,119,6,.12)` | `rgba(217,119,6,.25)` |
| danger | `#DC2626` | `#C81E1E` | `rgba(220,38,38,.10)` | `rgba(220,38,38,.22)` |
| info | `#2563EB` | `#1D5FD0` | `rgba(37,99,235,.10)` | `rgba(37,99,235,.24)` |

**กฎสี:** 60-30-10 (neutral 60 · surface 30 · signal 10) · ห้ามสี > 3 ใน viewport · ห้าม semantic เป็นพื้น surface ใหญ่ · ห้ามใช้สีสื่อความหมายอย่างเดียว (มี icon/label คู่) · info ต้องต่างจาก accent น้ำเงิน ชัด

### Dark mode
วาง token semantic ให้รองรับ dark (swap ชั้นเดียว) แต่ **ship light-only ก่อน** — ออกแบบไปที่ role ไม่ใช่ hex (หลัก Apple)

---

## 3. Typography

### ฟอนต์ (เคาะแล้ว)
- **ข้อความ/หัวข้อทั้งหมด = Sarabun** (heading = Sarabun 600)
- **ตัวเลข = Inter** — KPI hero weight **300** (airy) · ตัวเลขในตาราง weight **400** (ชัด) · `font-feature-settings:'tnum'` ทุกที่
- web-loadable + license ฟรี → consistent ทุกเครื่อง

### Weight allowlist
`300` (เฉพาะตัวเลข/display ≥28px) · `400` (body — ไทยห้ามต่ำกว่านี้) · `500` (label/nav/ปุ่ม) · `600` (heading/KPI) — ❌ ห้าม 700/800/bold

### Scale (rem · base 16px)
| Token | px | rem | weight | ใช้ |
|---|---|---|---|---|
| display-lg | 36 | 2.25 | 300 | KPI hero / ยอดเงินใหญ่ |
| display | 28 | 1.75 | 300 | ตัวเลขเด่น |
| h1 | 24 | 1.5 | 600 | page title |
| h2 | 18 | 1.125 | 600 | section title |
| h3 | 16 | 1 | 600 | card title |
| body | 14 | 0.875 | 400 | default |
| label | 13 | 0.8125 | 500 | label |
| caption | 12 | 0.75 | 400 | meta/badge |
| micro | 11 | 0.6875 | 500 | ตารางแน่น |

### กฎไทยเฉพาะ
- **line-height ไทย body = 1.6–1.7** (สระบน/ล่างซ้อน · ถ้า 1.5 สระชนบรรทัด) · heading 1.3 · display 1.15
- **tracking:** display Latin/ตัวเลข `-0.02em` · **ไทยคง 0 เสมอ** · caps-label `+0.04em`

---

## 4. Spacing (8pt grid · rem)

| Token | px | rem |
|---|---|---|
| space-1 | 4 | 0.25 |
| space-2 | 8 | 0.5 |
| space-3 | 12 | 0.75 |
| space-4 | 16 | 1 |
| space-5 | 20 | 1.25 |
| space-6 | 24 | 1.5 |
| space-8 | 32 | 2 |
| space-10 | 40 | 2.5 |
| space-12 | 48 | 3 |

**Usage:** page padding 24–32 · card padding 16–24 · หัว↔เนื้อ 12–16 · section gap 16–24 · form gap 12–16 · icon↔text 8 · row py 8–12 (comfortable) / 6–8 (compact) · modal 20–24 · empty state py 48

**กฎ:** ฐาน 8 · 4=half-step · **internal ≤ external** (padding ใน ≤ ช่องว่างนอก) · proximity (เกี่ยวข้องชิด) · dense ได้เป็นจุดไม่ใช่ทั้งหน้า · comfortable(default)/compact(ตารางเยอะ) · touch target desktop ≥32 · mobile ≥44

---

## 5. Border Radius

| Token | px / rem | ใช้ |
|---|---|---|
| radius-xs | 4 / 0.25 | badge · tag |
| radius-sm | 6 / 0.375 | input · button |
| radius-md | 8 / 0.5 | **card (default)** |
| radius-lg | 12 / 0.75 | modal · card เด่น |
| radius-xl | 16 / 1 | hero (rare) |
| radius-full | 9999px | pill · avatar · dot |

ส่วนใหญ่ 4–8 (Stripe) · ❌ ห้าม > 16 (ยกเว้น pill)

---

## 6. Shadow (cool-tint · restrained · 3 ระดับ)

| Token | ค่า | ใช้ |
|---|---|---|
| `shadow-none` | `none` | **base — card/row/input/page (ใช้ border)** |
| `shadow-sm` | `0 1px 2px rgba(16,37,64,.06), 0 1px 3px rgba(16,37,64,.04)` | dropdown · hover lift |
| `shadow-md` | `0 4px 8px rgba(16,37,64,.08), 0 2px 4px rgba(16,37,64,.06)` | popover · sticky header |
| `shadow-lg` | `0 12px 28px rgba(16,37,64,.12), 0 4px 10px rgba(16,37,64,.08)` | modal |

**กฎ:** เงาเฉพาะ element ที่ลอยเหนือ content จริง · ของพื้นใช้ border `#E2E8F1` · ❌ ห้ามเงาดำล้วน/เงาสี/glow

---

## 7. Icon — Lucide

- **grid 24px · live area 20px** · stroke ปรับตามขนาด: 24→2 · 20→1.75 · 16→1.5 (ตาเห็นหนาเท่ากัน)
- ขนาด: `icon-sm` 16/1.5 (ตารางแน่น) · `icon-md` 20/1.75 (**default** ปุ่ม/ฟอร์ม/nav) · `icon-lg` 24/2 (primary/header)
- pair: icon-20 ↔ control สูง 32
- **icon ในปุ่ม:** gap icon↔text = 8px · center กับ cap-height ของ text (หลัก Apple)
- **สี:** mono `#5B6B83` ปกติ · accent น้ำเงิน เฉพาะ active · semantic เฉพาะ status · ใช้ `currentColor`
- ❌ ห้าม mix library อื่น (Font Awesome) ในหน้าเดียว · ❌ ห้าม filled หลากสีแบบ super-app

---

## 8. Bootstrap Rules (Bootstrap 5)

### แบ่งงาน
| Bootstrap utility | custom CSS (identity 5 อย่าง) |
|---|---|
| layout (`d-flex`/`grid`/`row-col`) · spacing (`p-`/`m-`/`gap-`) · align · responsive (`d-none d-md-block`) | **สี · badge/tint · radius · active/hover · shadow** |

**กฎ:** ทำได้ด้วย utility 1 ตัว → ห้ามเขียน CSS

### token = single source (วิธี: Sass-compile)
- `--bs-*` (CSS var) = อ่านอย่างเดียว เปลี่ยนไม่ recolor component → **ต้องตั้งที่ Sass `$variables`**
- **compile Bootstrap จาก Sass** map `$primary`(accent น้ำเงิน)/`$font-*`(Sarabun)/`$border-radius`/`$box-shadow`/`$spacers`(=8pt) = token เรา
- ห้ามแก้ไฟล์ Bootstrap · ใช้ `custom.scss` import เข้ามา
- เลี่ยง default look: ปิด gradient · ปุ่มห้ามใช้ Bootstrap `.btn-primary` default (สีน้ำเงิน Bootstrap คนละเฉดกับ accent เรา) → compile ผ่าน Sass token เท่านั้น

### Table — pattern เดียว (กัน drift — ผิดซ้ำบ่อย)
- ✅ `<table class="data-table">` custom: **border แนวนอนเท่านั้น** · spacing/type/header neutral ของเรา
- ❌ ห้าม `table-striped` / `table-hover` / `table-bordered` / `table-light` / `table-dark` · ❌ ไม่มี zebra · ไม่มีเส้นแนวตั้ง

### Utility hygiene
เรียง class: layout → spacing → color · เยอะเกินใน element เดียว → แตกเป็น component class

---

## 9. Responsive

### Breakpoints (Bootstrap 5 + ultra-wide)
`xs <576` (มือถือ: drawer · table ยุบ) · `md ≥768` (2 คอลัมน์) · `lg ≥992` (**sidebar ถาวร**) · `xl ≥1200` (grid) · `xxl ≥1400` (root +1 · master-detail) · `3xl ≥1600` (cap width · root +2)

### Container (แก้ปัญหาจอ 1440+)
1. content **max-width ~1600px** (ไม่ปล่อย edge-to-edge บน ultra-wide แต่กว้างกว่า 1320)
2. **root font scaling** (เพราะทุกอย่างเป็น rem):
```css
html{font-size:16px}
@media(min-width:1440px){html{font-size:17px}}
@media(min-width:1920px){html{font-size:18px}}
```
→ ทั้ง UI โต proportional เติมจอใหญ่
- per page: ตารางแน่น→กว้าง/fluid · ฟอร์ม/อ่าน→cap แคบ (65–75 ตัวอักษร/บรรทัด)

### จอใหญ่ = structure ไม่ใช่ stretch
≥1440 ใช้ **master-detail / 2-pane** แทนคอลัมน์เดียวยืด

### Mobile (mobile-first)
sidebar→drawer · ตารางกว้าง 3 กลยุทธ์ (horizontal scroll / card stack / ซ่อนคอลัมน์รอง+expandable row) · touch ≥44 · โชว์สำคัญ on-the-go ก่อน · bottom nav ถ้า 3–5 section

---

## 10. Do / Don't (สรุปเร็ว)

**Do ✅** — `var(--*)` token ทุก reference · border default (เงาเฉพาะของลอย) · 1 element = 1 size+1 weight+1 color · weight 300/400/500/600 · primary CTA 1 ปุ่ม/หน้า (accent น้ำเงิน) · rem ทุก size · Lucide เท่านั้น · ตัวเลข Inter+tnum · `data-table` · touch ≥32 (mobile ≥44)

**Don't ❌** — เงาดำ/สี/glow · `border-left` สี บน card/KPI · weight 700/800/300(บน body) · accent เป็น CTA fill ของ component อื่น · สี > 3/viewport · radius > 16 (ยกเว้น pill) · mix Lucide+FA · inline `style=""` · token ใหม่ (`--my-*`) · padding < 8 บน interactive · hex literal ใน CSS · zebra/gradient table · เส้นแนวตั้งในตาราง

---

## 11. Decisions log (locked 2026-06-28)

- accent = **น้ำเงิน `#4081EC`** (identity + interactive ค่าเดียว · hover `#1766E8`) — migrate จาก Stripe blurple (2026-07-05) → เฉดสว่างขึ้น (2026-07), ทดลองผ่านหน้า prototype `layout.html` ก่อน promote เข้า `components.css` กลาง
- neutral = **เทาอมฟ้า cool**
- ฟอนต์ = **Sarabun ทั้งหมด + Inter ตัวเลข** (hero 300 / ตาราง 400)
- หน่วย = **rem** (size + spacing) + root scaling จอใหญ่
- เงา = **อนุญาต soft Stripe-grade** (เลิกกฎ no-shadow เด็ดขาด) — แต่ของพื้นยังใช้ border
- dark mode = **token-ready · ship light-only**
- Bootstrap = **Sass-compile** (token เป็น `$variables`)
- icon = **Lucide** (เลิก Font Awesome)
- **design component library = สร้างแล้ว** (2026-06-28) → spec §12 + [`components.css`](../../app/static/core/css/components.css) (prefix `.bb-*`, 13+3 component)

---

## 12. Component Library (spec · canonical)

> 🖼️ **Gallery (ดูก่อนสร้างเสมอ):** [`app/static/core/components-gallery.html`](../../app/static/core/components-gallery.html) — render component ทุกตัวจาก CSS จริง + ปุ่ม copy markup. **อยากได้ component → เปิด gallery ก่อน:** มีแล้ว = copy ไปใช้ · ยังไม่มี = แจ้งกลับเพื่อเพิ่มเข้า gallery + components.css (ห้ามสร้าง class `.bb-*` ใหม่เองมั่ว). เปิด `/static/core/components-gallery.html`
>
> implement: [`app/static/core/css/components.css`](../../app/static/core/css/components.css) · prefix `.bb-*` (target ใหม่ — `--vc-*`/`.zen-*`/`.data-table` เดิม = legacy จะ migrate เข้าหา) · icon = **Lucide** (`data-lucide`) · เลข = Inter (`.bb-num`)
>
> **กฎรวม:** ทุก class ใช้ `--bb-*` token เท่านั้น (นิยามใน components.css `:root`) · ห้าม hex literal · ห้ามตั้งชื่อชน Bootstrap (`.btn`/`.badge`/`.card`/`.table`)

### Token (`--bb-*` ใน components.css)
`--bb-accent #4081EC` · `--bb-accent-i #4081EC` (interactive/CTA) · `--bb-accent-h #1766E8` (hover) · `--bb-accent-bg #EFF6FF` (tint) · `--bb-n0..n900` (cool neutral §2) · `--bb-mut #5B6B83` · `--bb-str #0A2540` · semantic `--bb-ok/wr/dg/info` + `-bg`/`-tx` (§2) · `--bb-ring 0 0 0 3px rgba(64,129,236,.18)`

### 13 component

| # | Component | class หลัก | anatomy + กฎ |
|---|---|---|---|
| 1 | **Button** | `.bb-btn` + `.is-pri`/`.is-sec`/`.is-ghost`/`.is-danger` + `.is-sm`/`.is-icon` | radius-sm · weight 600 · gap icon↔text 8 · **pri** = `accent-i` fill + `shadow-sm` accent-tint · **sec** = ขาว+hairline · **ghost** = text accent + hover tint · icon-only 34px · `:disabled` opacity .45 ไม่มีเงา |
| 2 | **Input** | `.bb-field` > `.bb-label` + `.bb-input` (+`.bb-input-wrap`+icon) | label 13/500 บน · border `n200` radius-sm · `:focus` border accent + `--bb-ring` · `.is-error` ring แดง + `.bb-hint.is-error` · `:disabled` พื้น `n100` · select/textarea ใช้ `.bb-input` |
| 3 | **Search** | `.bb-search` > icon + input | pill outline border 2px `n300` (sync จาก mockup-orders.html, 2026-07-07) · icon `search` ซ้าย · `:focus` → border `--bb-str` ไม่มี ring/fill |
| 4 | **Filter** | `.bb-seg`/`.bb-seg-btn.is-on` · `.bb-chip.is-on` · `.bb-token`+`.bb-token-x` · `.bb-daterange` · `.bb-select`+`.bb-menu` | **segmented** = track `n100` + active pill ขาว+`shadow-sm` (status/time, tab-like) · **chip/select** (2026-07-07, sync จาก mockup-orders.html) = outline pill border 2px `n300` (ไม่ active) → border+font `--bb-chip-accent` (#0B7A3E, ไม่ fill พื้น) ตอน active · hover = `--bb-str` · count = pill เขียวเข้ม+ตัวขาว (active เท่านั้น) · **token** = field+operator+value+`x` (accent tint) · `+เพิ่มตัวกรอง` dashed · **date range** = preset ซ้าย + dual-month + footer สรุปวัน · ⚠️ ใช้สีเขียว (`--bb-chip-green`/`--bb-chip-accent`) เฉพาะ chip/select/menu เท่านั้น ปุ่ม/ลิงก์อื่นยังใช้ blurple (`--bb-accent`) เหมือนเดิม |
| 5 | **Tabs** | `.bb-tabs` > `.bb-tab.is-on` (+`.bb-tab-count`) | underline accent (**default ของ status/section filter**) · count pill เป็น tint เมื่อ active · sub-nav ภายในหน้า |
| 6 | **Dropdown** | `.bb-select` (trigger, icon `chevrons-up-down`) · `.bb-menu`>`.bb-menu-rich`(title+desc+`.bb-check`)/`.bb-menu-item`(.is-on) | trigger = pill outline (เหมือน chip §4, 2026-07-07) · menu = ไม่มี border, radius 12px, shadow `0 12px 32px rgba(10,37,64,.16)` · rich = title 14/600 + desc 12.5 mut + check วงกลม accent (ไม่เปลี่ยน) · plain item = `.is-on` พื้น `n50` + ตัวหนา (ไม่ fill accent-bg) |
| 7 | **Card** | `.bb-card` (+`.bb-card-head`/`.bb-card-body`) | surface ขาว + border `n200` radius-md · head แยกด้วย hairline + action link · ❌ ห้าม `border-left` สีพิเศษ |
| 8 | **KPI** | `.bb-kpi` (+`.is-ghost`) > `.bb-kpi-tile` + `.bb-kpi-label` + `.bb-kpi-value`(`.bb-num`) + `.bb-kpi-den`/`.bb-kpi-delta.is-up/.is-down` | icon tile 54px radius-lg ซ้าย · label mut บน · เลข **Inter 600** (เปลี่ยนจาก 300 — mileage prototype, 2026-07-05) + denominator mut · delta สี semantic · **card** = มีกรอบ radius **4px hardcode** (เปลี่ยนจาก radius-lg 12px, 2026-07-05) · **ghost** = ไม่มีกรอบ (tile border แทน) |
| 9 | **Table** | `.bb-table` (v2 canonical) > thead pill `n50` · `.bb-th.sortable` (icon `chevrons-up-down`+hover) vs `<th>` เปล่า · `.bb-check` · `.bb-cell-id/strong/num`(`.bb-num`) · inline status icon | ❌ ไม่มี zebra/เส้นตั้ง · hairline `n100` แนวนอน · hover `#FBFCFE` · checkbox เลือก = `str` fill · `.sortable` = กดกรองได้, `<th>` เปล่า = กรองไม่ได้ · mobile = overflow-x scroll |
| 10 | **Badge** | `.bb-badge` + `.is-neutral`/`.is-accent` | tag/count · radius-xs (เหลี่ยม) — **คนละตัวกับ status** |
| 11 | **Status** | `.bb-status` + `.is-ok/wr/dg/info/neutral` (+`.bb-dot`) · inline = `.bb-status-inline` | pill radius-full + dot สี semantic · map: รออนุมัติ=wr · อนุมัติ=info · ปิดงาน=ok · ยกเลิก=dg · ร่าง=neutral · ใน table ใช้ inline icon+text ได้ |
| 12 | **Pagination** | `.bb-pag` > `.bb-pag-info` + `.bb-pag-nav`>`.bb-pg`(.is-on/.is-disabled/.is-gap) | info ซ้าย (Inter เลข) + nav ขวา · active = `accent-i` fill · prev/next chevron |
| 13 | **Modal** | `.bb-modal-overlay` > `.bb-modal` (`.bb-modal-head`/`-body`/`-foot`) | overlay `rgba(10,37,64,.45)` · card radius-lg + `shadow-lg` · head title+sub+`x` · foot พื้น `n50` (sec+pri ขวา) · **position ห้าม fixed ใน mock** (จริงใช้ได้) |
| + | **Timeline** | `.bb-timeline` > `.bb-tl-item.done/.cur/.todo` > `.bb-tl-dot`+`.bb-tl-time/.bb-tl-title/.bb-tl-desc` | เส้นแนวตั้ง hairline · dot: ok=done · accent=cur · ขาว=todo · time Inter |
| + | **Empty** | `.bb-empty` > `.bb-empty-icon` + title + desc + action | icon tile กลาง + title 16/600 + desc mut + ปุ่ม pri |
| + | **Loading** | `.bb-skeleton` (pulse opacity) · `.bb-spinner`(+`.is-sm`) | skeleton พื้น `n100` ❌ ไม่มี gradient · spinner วง + top accent · inline = spinner-sm + text |

---

## 13. Layout Pattern Library (spec · canonical)

> page skeleton อิง **job ของผู้ใช้** ไม่ใช่หน้าตา — ทั้งระบบมี **5 pattern + 1 App Shell** · ใช้คู่ component §12

**Z0 · App Shell** (ทุกหน้า login แล้ว): `sidebar` (lg+ fixed ~240px · mobile=drawer) + `topbar` sticky ~56px (global search · notify · user). **Page title อยู่ใน topbar (`page_title`) — ห้ามเพิ่ม page-header zone ซ้ำในเนื้อหา**

| Pattern | job | zone (บนลงล่าง) | หน้า |
|---|---|---|---|
| **P1 List/Ledger** | สแกน+กรอง+act หลายแถว | summary strip (KPI ghost ≤⅕จอ) → toolbar sticky (tabs underline ซ้าย · search+filter+view-toggle+primary ขวา) → **content ครองจอ** (table v2 / card grid) → pagination | mileage · cost · fuel · manage-users · **budget · manage-fleet** (card-view variant) |
| **P2 Workspace/Queue** | triage คิว → ลงรายละเอียดทีละชิ้น | toolbar (status tabs) → **2-pane**: queue ซ้าย 36–40% (min320/max420) + detail/action ขวา 60–64% (action bar sticky ล่าง) | จัดการคำขอ (admin) |
| **P3 Overview** | เหลือบสุขภาพระบบ + ทางเข้า | KPI grid (เด่น) → widget grid (chart/activity/shortcut · ห้าม personalize) — read-only, ทุก widget link เข้า P1/P2 | dashboard |
| **P4 Calendar** | ดู demand ตามเวลา | cal toolbar (เดือน+nav+today) → month grid (cell = วันที่ + demand indicator) → day detail (side panel/bottom sheet) | vehicle (user) · demand |
| **P5 Focus/Form** | งานเดียวจดจ่อ | context bar → form body คอลัมน์แคบกลาง (max ~600px/65–75ch · section+label+field) → action bar sticky ล่าง (primary+secondary) | สร้าง/แก้ booking · driver entry · approver (review card stack + inline act) · **login** (chrome-less variant) |

**กฎรวม:** content ครองจอ (summary เหลือบไม่บวม) · tabs underline = กรองสถานะ ไม่ใช่ nav · sticky header/toolbar ตอน scroll · row → drawer/expand ไม่เปิดหน้าใหม่ · จอ ≥1440 = master-detail/2-pane ไม่ stretch คอลัมน์เดียว · mobile = table→scroll/stack, P5 column เต็มแถว

**Adoption:** P1 = mileage ✅ (2026-06-28, adopter แรก `.bb-*`) · ที่เหลือ = ยังไม่ migrate (legacy `--vc-*`/`.zen-*`)

---

## เก่า → ใหม่ (deprecated)

| เก่า | สถานะ |
|---|---|
| `design_system.md` | **ลบแล้ว 2026-06-28** → ไฟล์นี้ |
| `design_dna_redesign.md` | **ลบแล้ว 2026-06-28** (DNA layer เลิก) |
| `zendenta_migration.md` | **ลบแล้ว 2026-06-28** (Zendenta layer เลิก · legacy `.zen-*`/`.data-table` ยังอยู่ใน main.css) |
| `--vc-*` tokens (tokens.css) | legacy — ยังใช้ในโค้ดเดิมจน migrate; token ใหม่ตามไฟล์นี้ |
| bbcenter-design SKILL | ต้อง sync ตามไฟล์นี้ (ดู disposition) |
