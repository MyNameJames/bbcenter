# BBCenter Design Guideline

> **สถานะ:** v2.1 (2026-07-21) · **canonical design source — อ่านก่อนออกแบบ/แก้ UI/CSS/template ทุกครั้ง**
> เอกสารนี้ = แหล่งเดียวของการตัดสินใจ design. ของเก่า (`design_system.md` · `design_dna_redesign.md` · `zendenta_migration.md`) = **ลบแล้ว 2026-06-28** ใช้ไฟล์นี้แทน
>
> ⬛🟢 **v2.1 = "ink คือโครง เขียวคือสัญญาณ"** — ฐานสี monochrome (ink `#000000` · canvas · surface 2 ชั้น) ตาม `ubereats.design.md` · **เขียว `#06C167` เหลือ 2 หน้าที่: พื้น tint + ลิงก์/ghost** · ปุ่มหลัก/active = **ink** · หน่วย px · เงาดำ · radius binary · weight เพดาน 800 — รายละเอียดการตัดสินใจ → §11
>
> ✅ **โค้ดเดินตามเอกสารแล้ว** (redesign Batch 0-3 · 2026-07-21): `components.css` = `:root` เดียว + component ชุด control/data/drawer ลงครบ · `ue.css` เหลือแค่ shell/motion (ไม่มี token) · `tokens.css` (`--vc-*` indigo) = legacy รอหน้าสุดท้าย migrate. drift ที่เหลือ → **§14**
>
> 🚦 vehicle domain → อ่าน [vehicle_product_spec.md](vehicle_product_spec.md) คู่กันเสมอ

---

## 0. North Star

สาย **functional minimalism** — โครงเป็นระบบแบบ Google + รสนิยมสะอาดแบบ Apple + craft แบบ Linear
อ้างอิง: **Uber Eats Manager (หลัก — สี/shell/density/motion)** · Apple HIG · Material · Linear · Stripe (craft/philosophy เท่านั้น — **ไม่ใช่แหล่งสีอีกแล้ว**) · Dime · Grab

> **UE Manager = reference หลักของทั้งระบบ** (promote 2026-07-21) — ต้นแบบ `mockup-orders.html` → `_base_ue.html` + `ue.css`. ปรัชญาเดิม (functional minimalism · dense table/filter/KPI) ตรงกับ P1 List/Ledger อยู่แล้ว
>
> **UE *marketing* (`ubereats.design.md`) = แหล่งของ "ฐานสี" ตั้งแต่ v2.1** (เปลี่ยนจุดยืนจาก v2.0 ที่เขียนว่า "ห้ามลอกสี") — เพราะ ink+surface ของมันคือโครงที่ทำให้เขียวยังเป็นสัญญาณอยู่ได้. **แต่ยังไม่ยืม**: ฟอนต์ (UberMove ไม่รองรับไทย) · ความโปร่ง (nav 72 / section 88 — หน้า ops รับไม่ได้) · `ink-muted = #000000` (dashboard ต้องมี ramp เทา ดู §2 · §11 v2.1 #4). doctrine 4 ข้อที่ยืมตั้งแต่ v2.0:
> 1. **binary radius** — surface 8 / interactive pill (§5)
> 2. **type 2 ชั้น ไม่มีตรงกลาง** — display กับ interface ห่างจนไม่มี element กำกวม (§3)
> 3. **gray 2 step ที่แยกจากกันจริง** (§2)
> 4. **shape discipline** — pill กับ soft-card เท่านั้น
>
> mockup: อ้างอิงจากสเปก marketing → [`mockup-ubereats-marketing.html`](../../app/static/core/mockup-ubereats-marketing.html) · **บันทึกการ redesign v2.1 (Batch 0-3, เทียบก่อน/หลังทีละ component)** → [`mockup-bb-v2.html`](../../app/static/core/mockup-bb-v2.html) · [`-batch1`](../../app/static/core/mockup-bb-v2-batch1.html) (control) · [`-batch2`](../../app/static/core/mockup-bb-v2-batch2.html) (data) · [`-batch3`](../../app/static/core/mockup-bb-v2-batch3.html) (drawer)

---

## 1. Design Philosophy (7 หลักการ)

| # | หลักการ | กฎ | ที่มา |
|---|---|---|---|
| 1 | **ข้อมูลมาก่อน interface ถอย** | chrome น้อย · border+ที่ว่างนำ · ปุ่มต้องดูเหมือนปุ่ม | Apple · Stripe |
| 2 | **Typography คือลำดับชั้น** | จัดด้วย size+weight เท่านั้น ห้ามใช้สี/เงาแทน | Stripe · Linear |
| 3 | **สีคือสัญญาณ** | monochrome ฐาน + 1 accent · semantic เฉพาะ status | Stripe · Linear · Google |
| 4 | **เงาแบบสุขุม** | **เงาดำ low-opacity** เฉพาะของที่ลอยจริง · ของพื้นใช้ border | UE · Google |
| 5 | **Opinionated + modular** | 1 ปัญหา = 1 pattern · component กลางใช้ซ้ำ · token=ความจริง | Linear · Grab |
| 6 | **เผยข้อมูลเป็นชั้น บนโครงที่นิ่ง** | โครงหน้าอยู่ที่เดิม · เปลี่ยนแค่ "เผย/เน้น" ไม่ใช่ "วางตรงไหน" · ห้าม reorder/personalize layout | Stripe · Apple · Grab (in-place เท่านั้น) |
| 7 | **การเงินเป็นมิตร + เนี้ยบทุก state** | งบ/ตัวเลขดูสงบ ไม่น่ากลัว · ออกแบบทุก microstate (hover/focus/disabled/loading/empty) | Dime · Linear · Stripe |

**หลักการ 6 อยู่ใต้ 5:** opinionated/predictable มาก่อน — context-awareness ทำได้แค่ highlight/badge อยู่กับที่ ห้ามขยับโครง

---

## 2. Color

### โครง token 2 ชั้น
- **primitive** (ค่าดิบ: `accent-600`, `neutral-50`) → **semantic** (ตามหน้าที่: `action-primary`, `text-muted`, `surface-card`)
- ตั้งชื่อ semantic ตาม**หน้าที่** ไม่ใช่สี → เปลี่ยน brand/dark ที่ชั้นเดียว

### Ink + เขียว 2 จุด (v2.1 · locked 2026-07-21)

> **ฐานสีเป็น monochrome** ตาม [`ubereats.design.md`](ubereats.design.md) (ink · canvas · surface 2 ชั้น)
> **เขียว `#06C167` โผล่แค่ 2 หน้าที่: พื้น tint กับ ลิงก์/ปุ่ม ghost** — ที่เหลือทั้งหมดเป็น ink
>
> **⛔ กฎข้อเดียวที่ห้ามพลาด: `accent` เป็นตัวหนังสือ/เส้นขอบบนพื้นขาวไม่ได้ — ใช้ `accent-dk` แทนเสมอ**

| Token | Hex | ใช้ | contrast บนขาว |
|---|---|---|---|
| `ink` ★ | `#000000` | **CTA fill · active · text-strong · border เน้น** | **21 ✅ AAA** |
| `ink-h` | `#262626` | hover ของ ink fill | — |
| `accent-bg` ✅ | `#EAFBF2` | **tint bg** — แถวที่เลือก · nav active · callout · menu item active | — |
| `accent-dk` ✅ | `#0B7A3E` | **link · ปุ่ม ghost · action ในแถวตาราง** | **5.43 ✅ AA** |
| `accent` ⚠️ | `#06C167` | **fill ชิ้นเล็กเท่านั้น** — dot · check · progress | **2.38 ⛔** |
| `accent-hover` | `#05a058` | hover ของ accent fill | 3.40 ⚠️ |
| focus ring | `0 0 0 3px rgba(0,0,0,.12)` | คู่กับ border ink | — |

**ทำไมปุ่มหลักเป็นดำไม่ใช่เขียว:** `ubereats.design.md` กำหนด `button-primary` = ink fill + ตัวขาว + pill และทั้งระบบไม่มี chromatic fill เลย. ให้เขียวเป็นปุ่มด้วยจะกลายเป็น "ทุกอย่างเขียว" → เขียวเลิกหมายถึงอะไร. เขียวที่ใช้น้อยลง = เห็นแล้วรู้ทันทีว่า "อันนี้กดได้/อันนี้ถูกเลือก"

**ทำไมต้องมี `accent-dk`:** `#06C167` สว่างมาก contrast บนขาวแค่ **2.38:1** — ตกแม้เกณฑ์ UI-component (3:1). เขียวจึงเป็น**พื้น**ได้อย่างเดียว ส่วนงานที่ต้อง "เขียวบนขาว" → `accent-dk` `#0B7A3E` (5.43:1 ผ่าน AA)

**map การใช้:**
| งาน | token |
|---|---|
| ปุ่ม primary · tab/chip active · pagination active · checkbox เลือก | `ink` + hover `ink-h` |
| ลิงก์ · ปุ่ม ghost · action ในแถวตาราง | `accent-dk` |
| พื้น tint (แถวที่เลือก · nav active · menu item active · callout ok) | `accent-bg` (+ ตัวหนังสือ `accent-dk`) |
| dot · check ใน circle · progress fill | `accent` |
| ปุ่มปฏิเสธ/ยกเลิก | ขาว + border `n300` + ตัว `dg-tx` (`danger-sec`) |

### Neutral — เทากลาง (neutral gray · เลิก cool blue-gray)

merge: `ue.css` ให้ค่าหัว-ท้าย · UE marketing ให้ 2 step กลางที่แยกจากกันจริง (`ue.css` เดิมยุบ `n50`=`n100` และ `n200`=`n300` ซ้ำค่า)

| Step | Hex | semantic | contrast บนขาว |
|---|---|---|---|
| `0` | `#FFFFFF` | surface (card/modal/sidebar) | — |
| `50` | `#F6F6F6` | bg (page) | — |
| `100` | `#F3F3F3` | bg-subtle (thead/hover/KPI/band) | — |
| `200` | `#E8E8E8` | border | — |
| `300` | `#E0E0E0` | border-strong | — |
| `400` | `#9E9E9E` | text-disabled | 2.68 |
| `500` | `#8A8A8A` | text-subtle (placeholder/meta) | 3.45 |
| `600` | `#757575` | text-muted (label/cell รอง) | **4.61 ✅ AA** |
| `800` | `#3D3D3D` | text-body | 10.9 ✅ |
| `900` | `#000000` | text-strong (heading) = ink | 21 ✅ |

### Semantic — status เท่านั้น
| Role | dot/fill | text (AA) | bg-tint | border-tint |
|---|---|---|---|---|
| success | `#16A34A` | `#15803D` | `rgba(22,163,74,.10)` | `rgba(22,163,74,.25)` |
| warning | `#D97706` | `#B45309` | `rgba(217,119,6,.12)` | `rgba(217,119,6,.25)` |
| danger | `#DC2626` | `#C81E1E` | `rgba(220,38,38,.10)` | `rgba(220,38,38,.22)` |
| info | `#2563EB` | `#1D5FD0` | `rgba(37,99,235,.10)` | `rgba(37,99,235,.24)` |

> ✅ **`info` (`#2563EB` น้ำเงิน) เลิกชนกับ accent แล้ว** — เดิม accent เป็นน้ำเงินจึงต้องมีกฎ "info ต้องต่างจาก accent ชัด" ตอนนี้ตัดกฎนั้นทิ้งได้
>
> ⛔ **`success` `#16A34A` ยังอยู่ใกล้ accent `#06C167` — เขียวทั้งคู่** (ตัดสิน 2026-07-21: **คง success เป็นเขียว** ไม่ย้ายไปน้ำเงิน — สำเร็จ = เขียว เป็นความตั้งใจ)
> **กฎบังคับที่ตามมา:** `success` ห้ามปรากฏเป็น dot/fill เปล่าๆ — **ต้องมี icon + label คู่เสมอ** (สื่อ 2 ทาง: รูปทรง + สี) · และห้ามวาง `success` กับปุ่ม accent ติดกันในบล็อกเดียว
> **ผลกับโค้ด (Batch 2 · 2026-07-21):** `.bb-dot` **ถูกลบออกจาก `components.css` แล้ว** — `.bb-status` ทุกตัวใช้ icon เสมอ (ไม่ส่ง icon = ใช้ icon ประจำ tone) · ความเสี่ยงลดลงอีกชั้นเพราะปุ่มหลักเป็น ink ไม่ใช่เขียว

**กฎสี:** 60-30-10 (neutral 60 · surface 30 · signal 10) · ห้ามสี > 3 ใน viewport · ห้าม semantic เป็นพื้น surface ใหญ่ · **ห้ามใช้สีสื่อความหมายอย่างเดียว (มี icon/label คู่)** ← สำคัญขึ้นมากหลังย้ายไปเขียว

### Dark mode
วาง token semantic ให้รองรับ dark (swap ชั้นเดียว) แต่ **ship light-only ก่อน** — ออกแบบไปที่ role ไม่ใช่ hex (หลัก Apple)

---

## 3. Typography

### ฟอนต์ (เคาะแล้ว)
- **ข้อความ/หัวข้อทั้งหมด = Sarabun** (heading = Sarabun 600)
- **ตัวเลข = Inter** — KPI hero weight **300** (airy) · ตัวเลขในตาราง weight **400** (ชัด) · `font-feature-settings:'tnum'` ทุกที่
- web-loadable + license ฟรี → consistent ทุกเครื่อง

### Type 2 ชั้น — ไม่มีตรงกลาง (doctrine จาก UE marketing)

**เส้นแบ่งคือ weight ไม่ใช่ size:**

| ชั้น | weight | บทบาท |
|---|---|---|
| **display** | `700` · `800` | หัวข้อ · ตัวเลขเด่น — สร้างอำนาจด้วย scale |
| **interface** | `400` · `500` · `600` | body · label · ปุ่ม · nav — ทุกอย่างที่ไม่ใช่หัวข้อ |

**ห้ามมี element ที่กำกวมระหว่าง 2 ชั้น** — ถ้าตอบไม่ได้ว่ามันเป็น "หัวข้อ" หรือ "ตัวควบคุม" แปลว่าออกแบบผิด

### Weight allowlist
`400` (body — **ไทยห้ามต่ำกว่านี้**) · `500` (label/nav) · `600` (ปุ่ม/chip) · `700` (h2/h3) · `800` (page-title/KPI hero)
❌ ห้าม `300` (เดิมอนุญาตให้ตัวเลข — **ยกเลิก** เพราะ display ย้ายไป 800 หมดแล้ว) · ❌ ห้าม `900`

> **เปลี่ยนจาก v1.1:** เดิมเขียน "❌ ห้าม 700/800/bold" — **ยกเลิกข้อห้ามนั้น**. โค้ดจริง (`ue.css`) ใช้ 800 บน page-title + KPI มาตั้งแต่ 2026-07-11 และเป็นสิ่งที่ user เห็นบนจอ → v2.0 เดินตามโค้ด

### Scale (px · เลิก rem)
| Token | px | weight | tracking | ใช้ |
|---|---|---|---|---|
| **page-title** | 38 | 800 | −0.5px | h1 หัวหน้า (mobile ≤1199 → 28) |
| **kpi-hero** | 26 | 800 | −0.5px | ตัวเลขเด่น / ยอดเงินใหญ่ |
| **h2** | 20 | 700 | 0 | section title |
| **h3** | 16 | 700 | 0 | card title |
| **btn** | 15 | 600 | 0 | ปุ่ม · chip · tab |
| **body** | 15 | 400 | 0 | default |
| **label** | 14 | 500 | 0 | label · nav |
| **caption** | 13 | 400 | 0 | meta · badge |
| **micro** | 12 | 500 | +0.04em | ตารางแน่น · caps-label |

### กฎไทยเฉพาะ — ⛔ ไม่มีข้อยกเว้น (blocker ที่ทำให้ลอก type token ของ UE marketing ไม่ได้)
- **line-height ไทย body = 1.6–1.7** (สระบน/ล่างซ้อน · ถ้า 1.5 สระชนบรรทัด) · heading 1.3 · display 1.15
  > UE marketing กำหนด line-height เป็น px ตายตัวและแน่นมาก (body 16/24 = 1.5 · label 14/20 = 1.43) — **ใช้กับไทยไม่ได้** จึงไม่ยืมค่ามาเลย
- **tracking:** display Latin/ตัวเลข `-0.5px` · **ไทยคง 0 เสมอ** · caps-label `+0.04em`
  > ⚠️ `ue.css` `h1.page-title` ใส่ `letter-spacing:-0.5px` กับ**ทุกภาษารวมไทย** = ผิดกฎนี้ → ดู §14
- **ฟอนต์ = Sarabun เท่านั้น** — UberMove/UberMoveText เป็น proprietary + ไม่รองรับไทย **ห้ามพยายามใช้/หา substitute**

---

## 4. Spacing (8pt grid · px)

| Token | px |
|---|---|
| space-1 | 4 |
| space-2 | 8 |
| space-3 | 12 |
| space-4 | 16 |
| space-5 | 20 |
| space-6 | 24 |
| space-8 | 32 |
| space-10 | 40 |
| space-12 | 48 |
| space-14 | 56 |

**Usage:** card padding 16–24 · หัว↔เนื้อ 12–16 · section gap 16–24 · form gap 12–16 · icon↔text 8 · row py 8–12 (comfortable) / 6–8 (compact) · modal 20–24 · empty state py 48

### Ops density (จาก `ue.css` — คงไว้ ไม่เอาความโปร่งของ UE marketing)

> UE marketing เป็น landing page: nav สูง 72 · section padding 72/88. **หน้า ops รับไม่ได้** — เสีย viewport ให้ chrome เกินไป

| จุด | desktop | ≤1199 |
|---|---|---|
| content padding | `40px 48px 56px` | `20px 16px 32px` |
| content max-width | `1400px` | — |
| page-title margin-bottom | `24` | `16` |
| chip / control สูง | `44` | `44` |
| chip padding-x | `18` | `18` |

**กฎ:** ฐาน 8 · 4=half-step · **internal ≤ external** (padding ใน ≤ ช่องว่างนอก) · proximity (เกี่ยวข้องชิด) · dense ได้เป็นจุดไม่ใช่ทั้งหน้า · comfortable(default)/compact(ตารางเยอะ) · touch target desktop ≥32 · mobile ≥44

---

## 5. Border Radius — **binary** (doctrine จาก UE marketing)

> เดิม 5 step (4/6/8/12/16) → **เหลือ 2 ค่าจริง**. เหตุผล: 5 step ทำให้ทุกครั้งที่สร้าง component ต้อง "ตัดสินใจ" ว่าอันนี้ 8 หรือ 12 → drift ทุกครั้ง. binary ตัดสินใจไม่ได้เลย

| Token | px | ใช้ | กฎ |
|---|---|---|---|
| `radius-flush` | `0` | input ที่นั่งชิดในกรอบ search-wrapper | rare |
| `radius-surface` ★ | `8` | **ของทุกอย่างที่เป็นพื้น** — card · table · modal · popover · menu · skeleton · KPI tile · thumbnail | default |
| `radius-pill` ★ | `999` | **ของทุกอย่างที่กดได้** — ปุ่ม · chip · tab · badge · avatar · dot · pagination | default |

**กฎเดียว:** ถามว่า "กดได้ไหม" → กดได้ = `pill` · กดไม่ได้ = `8`
❌ ห้าม `4` · `6` · `12` · `16` · หรือค่าอื่นใดนอกจาก 3 ตัวข้างบน — ถ้ารู้สึกว่าต้องใช้ค่ากลาง แปลว่ายังตอบไม่ได้ว่าของชิ้นนั้นกดได้หรือไม่

---

## 6. Shadow (**เงาดำ** low-opacity · 2 ระดับ)

> เปลี่ยนจาก cool-tint `rgba(16,37,64,…)` → **ดำล้วน** ตาม `ue.css`/UE ทั้ง 2 แหล่ง · และยุบ 3 ระดับเหลือ 2 (ระดับกลางไม่เคยถูกใช้แยกจริง)

| Token | ค่า | ใช้ |
|---|---|---|
| `shadow-none` ★ | `none` | **base — card/row/input/table/page (ใช้ border แทน)** |
| `shadow-sm` | `0 1px 4px rgba(0,0,0,.08)` | hover lift · sticky header · search-wrapper |
| `shadow-lg` | `0 12px 32px rgba(0,0,0,.14)` | modal · popover · dropdown menu |

**กฎ:** เงาเฉพาะ element ที่**ลอยเหนือ content จริง** · ของพื้นใช้ border `#E8E8E8` · ❌ ห้ามเงาสี/glow/inset
**เลิกกฎเดิม** "❌ ห้ามเงาดำล้วน" — v2.0 เงาดำคือ default

---

## 7. Icon — Material Symbols (migrate จาก Lucide, 2026-07-21)

> ที่มา: Uber Eats Manager reference (`mockup-orders.html` → `header2.html`/`sidebar2.html`, Phase 1 2026-07-11) → promote เป็น icon system เดียวทั้งระบบ 2026-07-21
>
> **กลไก migrate (สำคัญ — อ่านก่อนแตะ icon):** markup ยังเขียน `data-lucide="ชื่อ-lucide"` เหมือนเดิมทุกที่ (component/template **ไม่ต้อง rewrite**) — หน้าที่ใช้ Material Symbols แค่ stub `window.lucide={createIcons(){},icons:{}}` (กัน Lucide จริง render แข่ง) + โหลด [`ms-icons.js`](../../app/static/core/js/ms-icons.js) แทน → `MutationObserver` แปลง `[data-lucide]` → `<span class="material-symbols-outlined">` runtime ผ่าน `MAP` (lucide-name → material-symbols-name) ครอบคลุมทั้ง static + dynamic (toast/combo/sort). **ชื่อไอคอนใหม่ที่ `MAP` ยังไม่มี** → fallback แปลง `-`→`_` ตรงๆ (เดา, อาจไม่ตรง glyph จริง) → เจอไอคอนใหม่ต้องเพิ่มเข้า `MAP` เสมอ อย่าปล่อย fallback เดา
>
> **⭐ เขียนตรงๆ ดีกว่า (2026-07-28 — target ใหม่ของโค้ดใหม่):** โค้ด/หน้าใหม่ **ให้เขียน `<span class="material-symbols-outlined">ชื่อ_material</span>` ตรงๆ** ไม่ต้องผ่าน `data-lucide` + `MAP` อีก — ชื่อ Google เป็น source of truth ตัวเดียว, ไม่มีชั้นแปล, ไม่มีโอกาสหลุด `MAP` แล้ว render เป็นตัวหนังสือดิบ. `ms-icons.js` **ยังต้องอยู่** เพราะ shared macro (`_components/bb/*.html`) กับหน้าเก่ายังเขียน `data-lucide` — shim แปลงให้ ทั้งสองแบบอยู่ร่วมกันได้ปกติ (glyph ปลายทางเดียวกัน). หน้าแรกที่ migrate ครบ = `vehicle_admin.{html,js}` (2026-07-28, 0 `data-lucide` เหลือ, 36 `<span class="material-symbols-outlined">` รวม 2 ไฟล์). ⚠️ ตอนแปลง **ห้ามยก inline `width`/`height` มาด้วย** — MS เป็น font ใช้ `font-size` (ขนาดจริงมาจาก `ue.css` ตาม context อยู่แล้ว); `[data-lucide]` selector ที่ตั้ง width/height ใน `components.css` = dead สำหรับหน้า MS มาตั้งแต่แรก

- font: `Material Symbols Outlined` (Google Fonts) · variation default `FILL 0, wght 400, GRAD 0, opsz 24`
- ขนาด (สืบทอด scale เดิมจาก Lucide era): `icon-sm` 16px (ตารางแน่น) · `icon-md` 20px (**default** ปุ่ม/ฟอร์ม/nav) · `icon-lg` 24px (primary/header) — คุมด้วย `font-size` ตาม context (ไม่มี stroke-width แบบ Lucide). ⚠️ prototype ปัจจุบัน (`sidebar2`/`header2`) ใช้ 18/20/22px ยังไม่ตรง scale เป๊ะ — ปรับให้ตรง sm/md/lg ตอน migrate หน้าอื่นต่อ
- pair: icon-20 ↔ control สูง 32
- **icon ในปุ่ม:** gap icon↔text = 8px · center กับ cap-height ของ text (หลัก Apple)
- **สี:** mono `#757575` (n600) ปกติ · **`accent-dk` `#0B7A3E`** เฉพาะ active (⛔ ไม่ใช่ `accent` `#06C167` — contrast 2.38:1 ตกเกณฑ์ UI 3:1 ดู §2) · semantic เฉพาะ status · ใช้ `currentColor`
- **active = fill:** icon ที่ active ใช้ `font-variation-settings:'FILL' 1` คู่กับสี `accent-dk` (pattern จาก `.ue-chip.is-on`) — สื่อสถานะ 2 ทางไม่พึ่งสีอย่างเดียว
- ❌ ห้าม mix icon library อื่น (Lucide จริง/Font Awesome) ในหน้าเดียว — attribute `data-lucide` ที่เหลืออยู่ทุกที่ = ชื่อ convention เท่านั้น ไม่ใช่ library จริงแล้ว · ❌ ห้าม filled หลากสีแบบ super-app

---

## 8. Bootstrap Rules (Bootstrap 5)

### แบ่งงาน
| Bootstrap utility | custom CSS (identity 5 อย่าง) |
|---|---|
| layout (`d-flex`/`grid`/`row-col`) · spacing (`p-`/`m-`/`gap-`) · align · responsive (`d-none d-md-block`) | **สี · badge/tint · radius · active/hover · shadow** |

**กฎ:** ทำได้ด้วย utility 1 ตัว → ห้ามเขียน CSS

### token = single source (วิธี: Sass-compile)
- `--bs-*` (CSS var) = อ่านอย่างเดียว เปลี่ยนไม่ recolor component → **ต้องตั้งที่ Sass `$variables`**
- **compile Bootstrap จาก Sass** map `$primary`(**accent เขียว `#06C167`**)/`$font-*`(Sarabun)/`$border-radius`(=8)/`$box-shadow`/`$spacers`(=8pt) = token เรา
- ห้ามแก้ไฟล์ Bootstrap · ใช้ `custom.scss` import เข้ามา
- เลี่ยง default look: ปิด gradient · ปุ่มห้ามใช้ Bootstrap `.btn-primary` default (น้ำเงิน Bootstrap ไม่ใช่ accent เรา) → compile ผ่าน Sass token เท่านั้น
- ⚠️ `$primary` = เขียวจะทำให้ Bootstrap gen `.text-primary`/`.border-primary` เป็น `#06C167` ซึ่ง**ตก contrast** → ห้ามใช้ utility 2 ตัวนั้น ใช้ `accent-dk` ของเราแทน

### Table — pattern เดียว (กัน drift — ผิดซ้ำบ่อย)
- ✅ `<table class="data-table">` custom: **border แนวนอนเท่านั้น** · spacing/type/header neutral ของเรา
- ❌ ห้าม `table-striped` / `table-hover` / `table-bordered` / `table-light` / `table-dark` · ❌ ไม่มี zebra · ไม่มีเส้นแนวตั้ง

### Utility hygiene
เรียง class: layout → spacing → color · เยอะเกินใน element เดียว → แตกเป็น component class

---

## 9. Responsive

### Breakpoints (Bootstrap 5 + ultra-wide)
`xs <576` (มือถือ: drawer · table ยุบ) · `md ≥768` (2 คอลัมน์) · `lg ≥992` (**sidebar ถาวร**) · `xl ≥1200` (grid — `ue.css` ใช้ `1199.98` เป็นเส้นสลับ density) · `xxl ≥1400` (master-detail) · `3xl ≥1600` (cap width ชนแล้ว เหลือ margin)

### Container (แก้ปัญหาจอ 1440+)
1. content **max-width `1400px`** (ตาม `.ml2-content-inner`) — ไม่ปล่อย edge-to-edge บน ultra-wide
2. จอใหญ่กว่า cap → เหลือ margin ซ้าย-ขวา **ไม่ยืด content ไม่ขยายฟอนต์**
3. per page: ตารางแน่น→กว้าง/fluid ถึง cap · ฟอร์ม/อ่าน→cap แคบ (65–75 ตัวอักษร/บรรทัด)

> **ตัดทิ้งใน v2.0: root font scaling** (`html{font-size:16→17→18px}`) — กลไกนี้ทำงานได้เฉพาะเมื่อทุก size เป็น `rem` ซึ่งเลิกใช้แล้ว (§3). เป็น aspiration ที่ไม่เคยถูก implement จริงในโค้ดสักหน้า → ลบดีกว่าเก็บไว้ให้เข้าใจผิด. จอใหญ่จัดการด้วย **structure (master-detail) + cap width** แทน

### จอใหญ่ = structure ไม่ใช่ stretch
≥1440 ใช้ **master-detail / 2-pane** แทนคอลัมน์เดียวยืด

### Mobile (mobile-first)
sidebar→drawer · ตารางกว้าง 3 กลยุทธ์ (horizontal scroll / card stack / ซ่อนคอลัมน์รอง+expandable row) · touch ≥44 · โชว์สำคัญ on-the-go ก่อน · bottom nav ถ้า 3–5 section

---

## 10. Do / Don't (สรุปเร็ว)

**Do ✅** — `var(--*)` token ทุก reference · border default (เงาเฉพาะของลอย) · 1 element = 1 size+1 weight+1 color · weight `400/500/600` (interface) + `700/800` (display) · primary CTA 1 ปุ่ม/หน้า = **`accent` fill + ตัวขาว** · **เขียวบนขาวใช้ `accent-dk` เสมอ** · **px ทุก size** · radius = `8` หรือ `pill` เท่านั้น · Material Symbols เท่านั้น (ผ่าน `data-lucide` shim, §7) · icon active = FILL 1 + `accent-dk` · ตัวเลข Inter+tnum · `data-table`/`bb-table` · touch ≥32 (mobile ≥44) · status ต้องมี icon+label คู่สีเสมอ

**Don't ❌** — ⛔ **`#06C167` เป็น text/link/border บนพื้นขาว** (2.38:1) · ⛔ `success` เป็น dot เปล่าไม่มี label (ชนเขียว accent) · เงาสี/glow/inset · `border-left` สี บน card/KPI · weight `300`/`900` · `rem` · radius `4`/`6`/`12`/`16` · สี > 3/viewport · mix icon library อื่น (Lucide จริง/FA) · Bootstrap `.text-primary`/`.border-primary` · inline `style=""` · token ใหม่ (`--my-*`) · padding < 8 บน interactive · hex literal ใน CSS · zebra/gradient table · เส้นแนวตั้งในตาราง · ลอก type token/สี/ความโปร่งจาก `ubereats.design.md`

> **เลิกใช้แล้ว (v1.1 → v2.0):** ~~ห้ามเงาดำ~~ · ~~ห้าม weight 700/800~~ · ~~rem ทุก size~~ · ~~radius > 16~~ — 4 ข้อนี้ถูกยกเลิก อย่าเอาไปเตือนคนอื่น

---

## 11. Decisions log

### v2.1 — "ink คือโครง เขียวคือสัญญาณ" (locked 2026-07-21 · หลัง v2.0 วันเดียวกัน)

> **บริบท:** v2.0 ย้าย accent เป็นเขียวแล้วให้เขียวทำทุกอย่าง (ปุ่ม + active + link + tint) — พอ redesign component ชุดจริง (Batch 0-3) เห็นว่าหน้าเดียวมีเขียว 6-7 จุด → เขียวเลิกเป็นสัญญาณ กลายเป็นสีพื้น. v2.1 ดึงกลับ: **ฐาน monochrome ตาม `ubereats.design.md` · เขียวเหลือ 2 หน้าที่**

| # | ตัดสิน | เดิม (v2.0) | เหตุผล |
|---|---|---|---|
| 1 | **ปุ่ม primary / active / text-strong = ink `#000000`** | เขียว `#06C167` fill | `ubereats.design.md` `button-primary` = ink fill · ทั้งระบบไม่มี chromatic fill |
| 2 | **เขียวเหลือ 2 จุด**: tint bg `accent-bg` + link/ghost `accent-dk` | เขียวทำทุกอย่าง | ใช้น้อย = เห็นแล้วรู้ทันทีว่าหมายถึงอะไร |
| 3 | **neutral = `surface-1 #F3F3F3` / `surface-2 #E8E8E8` ตาม spec** · `str` = `#000000` | `#06060a` + n100 `#f6f6f6` | ตรง spec เป๊ะอยู่แล้ว 2 ค่า เหลือแค่ปรับ str |
| 4 | **คง ramp เทาไว้** (`mut #757575` · `n500` · `n400`) แม้ spec ให้ `ink-muted = #000000` | — | spec เป็น landing page มี text ไม่กี่บรรทัด · dashboard มี label/meta/cell รอง ถ้าดำหมดตารางอ่านไม่ออก |
| 5 | **`success` คงเป็นเขียว** ไม่ย้ายเฉด | ค้างไม่เคาะ | สำเร็จ = เขียว เป็นความตั้งใจ · แก้ด้วยกฎ icon+label แทน (§2) |
| 6 | **`.bb-dot` ลบทิ้ง** — status ใช้ icon เสมอ | dot + label | สื่อ 2 ทาง (รูปทรง+สี) ไม่พึ่งสีอย่างเดียว |
| 7 | **`:root` เหลือที่เดียว** = `components.css` · ลบ token block ใน `ue.css` | 2 `:root` ซ้อนกัน | ปิด §14 P2 |
| 8 | **Drawer = component ใหม่** (ไม่ยืด Modal) | ไม่มี | Modal บล็อกทั้งจอ · P2 Workspace/Queue ต้องเห็น list เบื้องหลังระหว่าง triage |

**ยังไม่เคาะ:** `.bb-select.is-active` = ink fill (ตัดสินเอง) vs ภาพต้นแบบที่เป็น outline — ถ้าใช้จริงแล้วรู้สึกหนักไป เปลี่ยนเป็น border ink 1.5px ได้

### v2.0 — "เขียวคือของจริง" (locked 2026-07-21)

> **บริบท:** ตั้งแต่ 2026-07-11 `ue.css` override `--bb-accent` เป็นเขียว → หน้า mileage ที่ user ใช้จริงเป็นเขียว **แต่ guideline ยังเขียนน้ำเงิน** = doc โกหกมา 10 วัน. v2.0 ตัดสินให้ **โค้ดชนะ** แล้วเขียน doc ตาม แทนที่จะบังคับโค้ดกลับไปน้ำเงิน

| # | ตัดสิน | เดิม (v1.1) | เหตุผล |
|---|---|---|---|
| 1 | **accent = เขียว `#06C167`** + `accent-dk` `#0B7A3E` แยกหน้าที่ | น้ำเงิน `#4081EC` ค่าเดียว | โค้ดจริง + ต้องแยก 2 token เพราะเขียว contrast 2.38:1 (§2) |
| 2 | **neutral = เทากลาง** | เทาอมฟ้า cool | โค้ดจริง (`ue.css`) + ยืม 2 step กลางจาก UE marketing มาเติมที่ยุบซ้ำ |
| 3 | **หน่วย = px** · ตัด root font scaling | rem + root scaling | rem ไม่เคยถูก implement สักหน้า · UE ทั้ง 2 แหล่งเป็น px |
| 4 | **weight เพดาน 800** · type 2 ชั้นแบ่งด้วย weight | ห้าม 700/800 | โค้ดจริง (page-title 38/800) + doctrine UE marketing |
| 5 | **radius binary** `8` / `pill` (+`0` flush) | 5 step 4/6/8/12/16 | doctrine UE marketing — ตัดการตัดสินใจออก = ตัด drift |
| 6 | **เงาดำ** 2 ระดับ | cool-tint 3 ระดับ | โค้ดจริง + UE ทั้ง 2 แหล่ง |
| 7 | **`_base_ue.html` = Z0 App Shell target** | page-opt-in "ไม่มี timeline unify" | ถ้าเขียว+UE = official แล้ว shell ก็ต้องเป็น target ด้วย · migrate ทีละหน้า ไม่มี deadline (§13) |
| 8 | **UE marketing = ยืมแค่ doctrine** ไม่ยืมสี/ฟอนต์/ความโปร่ง | — | ปาเลตต์ ink+white ของมันพึ่งรูปถ่าย ซึ่ง dashboard ไม่มี (§0) |
| 9 | **Stripe = craft only** ไม่ใช่แหล่งสี | Stripe (สีหลัก) | ผลพวงจาก #1 |

**ยังไม่เคาะ (ค้างใน §14):** เฉดของ `success` ที่ชนเขียว accent

### v1.x — ยังใช้อยู่ (locked 2026-06-28)

- ฟอนต์ = **Sarabun ทั้งหมด + Inter ตัวเลข** — ยืนยันอีกครั้งใน v2.0 (UberMove ใช้ไม่ได้: proprietary + ไม่รองรับไทย)
- line-height ไทย **1.6–1.7** = blocker ที่ทำให้ลอก type token ของ UE marketing ไม่ได้
- dark mode = **token-ready · ship light-only**
- Bootstrap = **Sass-compile** (token เป็น `$variables`)
- icon = ~~Font Awesome~~ → ~~Lucide~~ → **Material Symbols** (migrate 2026-07-21 · ผ่าน `ms-icons.js` shim, markup ยังใช้ `data-lucide="x"` เดิม — §7)
- **design component library** (2026-06-28) → spec §12 + [`components.css`](../../app/static/core/css/components.css) (prefix `.bb-*`)
- **Uber Eats Manager = reference** (2026-07-21) → promote เป็น **ref หลัก** ใน v2.0 (§0)

---

## 12. Component Library (spec · canonical)

> 🖼️ **Gallery (ดูก่อนสร้างเสมอ):** `/dev/components` ([templates/dev/components.html](../../app/templates/dev/components.html)) — Living Gallery, render component จริงทุกตัวผ่าน `{{ component(obj) }}` (drift ไม่ได้; static `components-gallery.html` retired 2026-07-19). **อยากได้ component → เปิด `/dev/components` ก่อน:** มีแล้ว = copy ไปใช้ · ยังไม่มี = แจ้งกลับเพื่อเพิ่มเข้า gallery + components.css (ห้ามสร้าง class `.bb-*` ใหม่เองมั่ว)
>
> implement: [`app/static/core/css/components.css`](../../app/static/core/css/components.css) · prefix `.bb-*` (target ใหม่ — `--vc-*`/`.zen-*`/`.data-table` เดิม = legacy จะ migrate เข้าหา) · icon = **Material Symbols** ผ่าน `data-lucide` attribute shim ([`ms-icons.js`](../../app/static/core/js/ms-icons.js) — ดู §7) · เลข = Inter (`.bb-num`)
>
> **กฎรวม:** ทุก class ใช้ `--bb-*` token เท่านั้น (นิยามใน components.css `:root`) · ห้าม hex literal · ห้ามตั้งชื่อชน Bootstrap (`.btn`/`.badge`/`.card`/`.table`)

### Token (`--bb-*`)

> ✅ **`:root` เหลือที่เดียว = `components.css`** (Batch 0 · 2026-07-21) — block token ใน `ue.css` ถูกลบแล้ว **ห้ามประกาศ `:root` ที่ไฟล์อื่นอีก**

| Token | ค่า | หมายเหตุ |
|---|---|---|
| `--bb-ink` / `--bb-ink-h` | `#000000` / `#262626` | **CTA fill · active · text-strong** |
| `--bb-accent` | `#06C167` | fill ชิ้นเล็ก (dot/check) — ⛔ ห้ามเป็นตัวหนังสือ/เส้นขอบ |
| `--bb-accent-dk` | `#0B7A3E` | **link · ghost button · action ในแถว** — AA ✅ |
| `--bb-accent-bg` | `#EAFBF2` | **tint bg** — แถวที่เลือก · nav/menu active · callout ok |
| `--bb-accent-h` | `#05a058` | hover ของ accent fill |
| `--bb-n0`…`--bb-n900` | เทากลาง §2 (10 step) | `n100`/`n200` = `surface-1`/`surface-2` ตาม spec |
| `--bb-mut` / `--bb-body` | `#757575` / `#3D3D3D` | text-muted (AA ✅) / text-body |
| `--bb-str` | `#000000` | text-strong = ink |
| `--bb-ok/wr/dg/info` + `-bg`/`-tx` | §2 (`-bg` = rgba tint) | ⚠️ `ok` เขียว — ต้องมี icon+label |
| `--bb-r-surface` / `-pill` / `-flush` | `8px` / `999px` / `0` | binary radius §5 |
| `--bb-shadow-sm` / `-lg` | `0 1px 4px rgba(0,0,0,.08)` / `0 12px 32px rgba(0,0,0,.14)` | `-md` = alias ของ `-sm` |
| `--bb-ring` | `0 0 0 3px rgba(0,0,0,.12)` | focus ring (คู่กับ border ink) |

> ⏸ **deprecated รอลบ** (ยังอยู่ใน `:root` เพราะ CSS/หน้าเก่าอ้างถึง — ไล่แทนที่ทีละหน้าแล้วลบ):
> `--bb-accent-i` (= `var(--bb-ink)`) · `--bb-chip-green` (= `accent`) · `--bb-chip-accent` (= `accent-dk`) · `--bb-r-xs/sm/md/lg/xl` (5-step เดิม)

### 16 component + 4 เสริม

| # | Component | class หลัก | anatomy + กฎ |
|---|---|---|---|
| 1 | **Button** | `.bb-btn` + `.is-pri`/`.is-sec`/`.is-ghost`/`.is-danger`/`.is-danger-sec` + `.is-sm`/`.is-icon`/`.is-block` | **radius pill** · 15px/600 · **สูง 40 (sm 32)** · gap icon↔text 8 · **ไม่มีเงา** · **pri** = `ink` fill + ตัวขาว (21:1 ✅) · **sec** = ขาว+hairline `n300` hover border ink · **ghost** = text **`accent-dk`** + hover `accent-bg` · **danger-sec** = ขาว+ขอบ+ตัว `dg-tx` (ปฏิเสธ/ยกเลิก) · icon-only 40px · `:disabled` = พื้น `n100` + ตัว `n400` (⛔ ไม่ใช้ opacity — ตัวหนังสือจางจนอ่านไม่ออก) |
| 2 | **Input** | `.bb-field` > `.bb-label` + `.bb-input` (+`.bb-input-wrap`+icon) | label 14/500 บน · border `n200` **radius 8** · `:focus` border **`accent-dk`** + `--bb-ring` (ต้อง 3:1 กับพื้นขาว → `accent` ตก) · `.is-error` ring แดง + `.bb-hint.is-error` · `:disabled` พื้น `n100` · select/textarea ใช้ `.bb-input` |
| 3 | **Search** | `.bb-search` > icon + input | pill outline **border 1px `n300`** · icon `search` ซ้าย · collapse 40px → expand 320px · `:focus`/expanded → border `ink` + `shadow-sm` (spec ให้เงาเฉพาะ search wrapper กับ nav) |
| 4 | **Filter** | `.ue-chip`/`.ue-chip-dd` (canonical) · `.bb-seg`/`.bb-seg-btn.is-on` · `.bb-token`+`.bb-token-x` · `.bb-daterange` | **chip** (canonical, `ue.css §CHIP`) = pill h44 pad-x 18 · border 2px `n300` · font 15/600 → active = border+text **`accent-dk`** ไม่ fill พื้น + icon `FILL 1` · hover border `mut` · active `scale(.97)` · count badge = fill `accent-dk` + ตัวขาว (โชว์เมื่อ active) · **segmented** = track `n100` + active pill ขาว+`shadow-sm` · **token** = field+operator+value+`x` (`accent-bg` tint) · **date range** = preset ซ้าย + dual-month + footer สรุปวัน |
| 5 | **Tabs** | `.bb-tabs` > `.bb-tab.is-on` (+`.bb-tab-count`) | underline **ink** 2px (**default ของ status/section filter**) · สูง 44 · gap 24 · 15px/500 → active 700 · count = pill `n100`/`mut` → active **`ink` fill + ตัวขาว** · sub-nav ภายในหน้า |
| 6 | **Dropdown** | `.bb-select` (trigger) · `.bb-menu`>`.bb-menu-rich`(title+desc+`.bb-check`)/`.bb-menu-item`(.is-on) · `.ue-chip-pop` | trigger = pill outline (เหมือน chip §4) · menu = **radius 8** + `shadow-lg` `0 12px 32px rgba(0,0,0,.14)` · rich = title 14/600 + desc 13 mut + check วงกลม `accent` fill (ตัวขาวทับได้) · plain item = `.is-on` พื้น `n50` + ตัวหนา (ไม่ fill accent-bg) · **panel ต้อง portal→body + `position:fixed`** กัน overflow/transform ancestor clip |
| 7 | **Card** | `.bb-card` (+`.bb-card-head`/`.bb-card-body`) | surface ขาว + border `n200` **radius 8** · head แยกด้วย hairline + action link · ❌ ห้าม `border-left` สีพิเศษ |
| 8 | **KPI** | `.bb-kpi` (+`.is-ghost`) > `.bb-kpi-tile` + `.bb-kpi-label` + `.bb-kpi-value`(`.bb-num`) + `.bb-kpi-den`/`.bb-kpi-delta.is-up/.is-down` | icon tile 54px **radius 8** ซ้าย · label mut บน · เลข **Inter 26/800** tracking −0.5px (§3 kpi-hero) + denominator mut · delta สี semantic (**ต้องมีลูกศร icon คู่** — `is-up` เขียวชน accent) · **card** = กรอบ **radius 8** (เดิม 4px hardcode → §14) · **ghost** = ไม่มีกรอบ · ค่าเปลี่ยน → animate `countUp` + `bump` (`ue-motion.js`) |
| 9 | **Table** | `.bb-table` (v2 canonical) > thead pill `n50` · `.bb-th.sortable` (icon `chevrons-up-down`+hover) vs `<th>` เปล่า · `.bb-check` · `.bb-cell-id/strong/num`(`.bb-num`) · inline status icon | ❌ ไม่มี zebra/เส้นตั้ง · hairline `n100` แนวนอน · hover `#FBFCFE` · checkbox เลือก = `str` fill · `.sortable` = กดกรองได้, `<th>` เปล่า = กรองไม่ได้ · mobile = overflow-x scroll |
| 10 | **Badge** | `.bb-badge` + `.is-neutral`/`.is-accent` | tag/count · `.is-accent` = tint `accent-bg` + ตัว `accent-dk` — **คนละตัวกับ status** |
| 11 | **Status** | `.bb-status` + `.is-ok/wr/dg/info/neutral` · inline = `.bb-status-inline` | **badge radius 8** (กดไม่ได้ → ไม่ใช่ pill) · pad 6/10 · 13px/600 · **icon + label เสมอ** · map: รออนุมัติ=wr · อนุมัติ=info · ปิดงาน=ok · ยกเลิก=dg · ร่าง=neutral · ⛔ **`.bb-dot` ถูกลบแล้ว** (§2) · ไม่ส่ง icon = ใช้ icon ประจำ tone · ใน table ใช้ `inline` (ไม่มีพื้น) |
| 12 | **Pagination** | `.bb-pag` > `.bb-pag-info` + `.bb-pag-right`>(`.bb-pag-size` + `.bb-pag-nav`>`.bb-pg`) | info ซ้าย (เลข Inter 600) + nav ขวา · **ปุ่ม pill 36px** border `n300` · active = **`ink` fill** + ตัวขาว · `.bb-pag-size` = แถวต่อหน้า · prev/next chevron |
| 13 | **Modal** | `.bb-modal-overlay` > `.bb-modal` (`.bb-modal-head`/`-body`/`-foot`) | overlay `rgba(0,0,0,.45)` · card **radius 8** + `shadow-lg` · head title+sub+`x` · foot พื้น `n50` (sec+pri ขวา) · **position ห้าม fixed ใน mock** (จริงใช้ได้) |
| 14 | **Drawer** ★ | `.bb-drawer-overlay` > `.bb-drawer` (`.bb-drawer-head`/`-body`/`-foot` · `-eyebrow`/`-title`/`-sub`/`-x`) | แผงขวา 420px (มือถือเต็มจอ) · **flex 3 ชั้น: head นิ่ง · body scroll · foot นิ่ง** → ปุ่ม action ไม่หนีไปกับ scroll · **ใช้แทน Modal เมื่อต้องเห็น list เบื้องหลัง** (P2 Workspace/Queue) · eyebrow = caps 12/600 `n500` · title = Inter 22/700 · sub = ลิงก์ `accent-dk` · `overlay=False` = ฝัง inline (2-pane) |
| 15 | **Section** ★ | `.bb-section` + `.bb-section-title` | บล็อกย่อยใน drawer/card คั่นด้วย **hairline ไม่ใช่กรอบซ้อนกรอบ** · title 16/700 · py 20 |
| 16 | **DescList** ★ | `.bb-desc` > `.bb-desc-label` + `.bb-desc-value` (+`.is-num`/`.is-stack`) | grid 2 คอลัมน์ label ซ้าย(`mut`) / value ขวา(ink 600) · **⛔ ห้ามใช้ `<table>`** (ไม่มีหัวคอลัมน์ ไม่ sort ไม่ scan ข้ามแถว) · `.is-stack` = ค่ายาวซ้อนบน-ล่าง |
| + | **Timeline** | `.bb-timeline` > `.bb-tl-item.done/.cur/.todo` > `.bb-tl-dot`+`.bb-tl-time/.bb-tl-title/.bb-tl-desc` | เส้นแนวตั้ง hairline · dot: `ok`=done · `accent`=cur · ขาว+border=todo · time Inter |
| + | **Empty** | `.bb-empty` > `.bb-empty-icon` + title + desc + action | icon tile กลาง **radius 8** + title 16/700 + desc mut + ปุ่ม pri |
| + | **Loading** | `.bb-skeleton`/`.ml2-skel-*` · `.bb-spinner`(+`.is-sm`) | skeleton พื้น `n100` **radius 8** (เดิม 6 → §14) · shimmer gradient `n100→n200→n100` (ข้อยกเว้นเดียวที่อนุญาต gradient) · spinner วง + top `accent` · inline = spinner-sm + text |
| + | **Motion** | `ue-motion.js` → `countUp` · `staggerRows` · `showSkeleton` · CSS `ml2FrameIn/RowIn/DotPop/Bump/Shimmer` | page entry `frameIn .5s cubic-bezier(.2,.8,.2,1)` · row stagger + dotPop ตอนโหลด · ปุ่ม hover `translateY(-1px)` / active `scale(.97)` · **บังคับมี `@media (prefers-reduced-motion: reduce)` ปิดทุกตัว** |

---

## 13. Layout Pattern Library (spec · canonical)

> page skeleton อิง **job ของผู้ใช้** ไม่ใช่หน้าตา — ทั้งระบบมี **5 pattern + 1 App Shell** · ใช้คู่ component §12

**Z0 · App Shell = [`_base_ue.html`](../../app/templates/_base_ue.html)** (target, promote 2026-07-21 · ดู §11 #7)

`sidebar2` (lg+ fixed ~260px · mobile=drawer) + `header2` sticky (notify · user) + `.ml2-frame` > `.ml2-body-row` > `.ml2-content` (pad 40/48/56 · inner max-w 1400)
**Page title = `h1.page-title` 38/800 ในเนื้อหา** (block `page_title` — แสดงเมื่อมีข้อความ) · ห้ามมี page-header zone ซ้ำ

> **Migration:** `_shared/sidebar.html` + `header.html` = **legacy** ทยอย migrate **ทีละหน้า ไม่มี deadline** — ห้าม big-bang. หน้าที่ยังไม่แตะ = ใช้ shell เดิมต่อไปได้ ไม่ถือว่าผิด
> **สถานะ:** `_base_ue.html` = mileage เท่านั้น (2026-07-21)

| Pattern | job | zone (บนลงล่าง) | หน้า |
|---|---|---|---|
| **P1 List/Ledger** | สแกน+กรอง+act หลายแถว | summary strip (KPI ghost ≤⅕จอ) → toolbar sticky (tabs underline ซ้าย · search+filter+view-toggle+primary ขวา) → **content ครองจอ** (table v2 / card grid) → pagination | mileage · cost · fuel · manage-users · **budget · manage-fleet** (card-view variant) |
| **P2 Workspace/Queue** | triage คิว → ลงรายละเอียดทีละชิ้น | toolbar (status tabs) → **2-pane**: queue ซ้าย 36–40% (min320/max420) + detail/action ขวา 60–64% (action bar sticky ล่าง) | จัดการคำขอ (admin) |
| **P3 Overview** | เหลือบสุขภาพระบบ + ทางเข้า | KPI grid (เด่น) → widget grid (chart/activity/shortcut · ห้าม personalize) — read-only, ทุก widget link เข้า P1/P2 | dashboard |
| **P4 Calendar** | ดู demand ตามเวลา | cal toolbar (เดือน+nav+today) → month grid (cell = วันที่ + demand indicator) → day detail (side panel/bottom sheet) | vehicle (user) · demand |
| **P5 Focus/Form** | งานเดียวจดจ่อ | context bar → form body คอลัมน์แคบกลาง (max ~600px/65–75ch · section+label+field) → action bar sticky ล่าง (primary+secondary) | สร้าง/แก้ booking · driver entry · approver (review card stack + inline act) · **login** (chrome-less variant) |

**กฎรวม:** content ครองจอ (summary เหลือบไม่บวม) · tabs underline = กรองสถานะ ไม่ใช่ nav · sticky header/toolbar ตอน scroll · row → drawer/expand ไม่เปิดหน้าใหม่ · จอ ≥1440 = master-detail/2-pane ไม่ stretch คอลัมน์เดียว · mobile = table→scroll/stack, P5 column เต็มแถว

**Adoption (ทีละหน้า · ไม่มี deadline):**

| หน้า | shell | component | token |
|---|---|---|---|
| mileage | `_base_ue.html` ✅ | `.bb-*` + `.ue-chip` ✅ | เขียว ✅ |
| manage-fleet | `_base_ue.html` ✅ (2026-07-29) | legacy `.vc-*` (reskin modal/table เฟสถัดไป) | `--bb-*` เฉพาะ `vehicle_fleet.css` ✅ — `design-system.css`/`vehicle_admin.css`/`vehicle_fuel.css` ยังโหลดชั่วคราว |
| ที่เหลือทั้งหมด | `_shared/sidebar.html`+`header.html` | legacy `--vc-*`/`.zen-*` | น้ำเงิน/indigo |

**ลำดับที่แนะนำเวลาแตะหน้าใหม่:** shell → token → component → density. อย่าทำครึ่งๆ ในหน้าเดียว (เช่นเปลี่ยน token แต่ไม่เปลี่ยน shell) — จะได้หน้าที่ไม่ใช่ทั้งเก่าทั้งใหม่

---

## 13b. Modal ฟอร์มมาตรฐาน (reference — 2026-07-30)

> เมื่อต้องสร้าง modal ที่มีฟอร์มซับซ้อน (หลาย field · มี date/time picker · ต้อง validate) → **ใช้ [`vehicle/modals/vehicle_book.html`](../../app/templates/vehicle/modals/vehicle_book.html) (`#bookingModal`) เป็นต้นแบบ** ไม่ต้องคิดโครงใหม่

**โครงที่ยึดได้:**
- **header** — eyebrow (เช่น `#แบบฟอร์มจองรถ`) + ชื่อใหญ่ + context ย่อย (สังกัด/แผนก) + avatar ขวา (pattern เดียวกับ `assignModal` ใน `vehicle_admin.html`) — ไม่มีปุ่มปิด X (ปิดผ่านปุ่ม "ยกเลิก"/backdrop เท่านั้น)
- **date/time field** — `{{ component(date_field) }}`/`{{ component(time_range_field) }}` (`DateField`/`TimeRangeField`, ดู [INDEX_ui.md § Design System](INDEX_ui.md)) แทนเขียน calendar/time-dropdown เอง
- **text field ที่มี icon** — `.bb-field-box` (icon + input แถวเดียว คลิกได้ทั้งกล่อง) แทน `.bb-input-wrap` (icon overlay ทับ input) — ใช้เมื่อกล่องต้องเป็น trigger ของ picker ได้ด้วย
- **validation** — required field ว่างตอน submit → ring แดงที่**กรอบนอก** `.bb-field-box` (ผ่าน `.was-validated` + `:has(input:invalid)`, ดู `components.css` §2b) **ไม่ใช่** ไอคอน/glow ในตัว input เอง — native/Bootstrap default ต้อง reset ทิ้งเสมอ (`background-image:none` + specificity ชน `.form-control:invalid` ให้ชนะ)
- **footer** — `border-top-0` (ไม่มีเส้นคั่นกับ body — ต่างจาก `.bb-modal-foot` มาตรฐานใน §12 ที่มี border-top + พื้น n50)

**ไม่ใช่ standard (debt เฉพาะไฟล์นี้ ไม่ใช่ pattern ให้ทำตาม):** field "หมายเหตุ" (`id="travelDate"`) ยังเป็น mockup ค้าง ไม่มี `name`/backend รองรับ · global unscoped `.material-symbols-rounded{font-variation-settings:'wght' 300}` ใน `<style>` ของไฟล์ — รายละเอียด → [INDEX_ui.md § Templates](INDEX_ui.md)

> ต้องการ **modal เดียวสลับ add/edit** (ไม่ใช่แค่ฟอร์มเปล่า) → recipe + variations แยกไว้ที่ [modal_pattern.md](modal_pattern.md) (ต่อยอดจาก `#bookingModal` ข้างบนนี้ ไม่ซ้ำเนื้อหา)

---

## 14. Drift ledger — guideline v2.0 vs โค้ดวันนี้

> **วิธีใช้:** ก่อนแตะหน้าใดหน้าหนึ่ง เปิดตารางนี้ → เก็บกวาดเฉพาะรายการที่หน้านั้นแตะถึง. **ห้ามไล่แก้ทั้งระบบรวดเดียว** (ตัดสินใจ 2026-07-21: migrate ทีละหน้า)

### ✅ P1 · a11y — ปิดแล้ว (Batch 0-2 · 2026-07-21)

`.bb-btn.is-ghost` → `accent-dk` · `.bb-input:focus` → border ink + ring ดำ · `--bb-ring` → `rgba(0,0,0,.12)` · `.bb-table thead th` → `mut` (เดิม accent) · `.bb-badge.is-accent` → `accent-dk` บน tint

### ✅ P2 · token — ปิดแล้ว (Batch 0)

`:root` เหลือที่เดียวที่ `components.css` (ลบ block ใน `ue.css`) · neutral แยก 10 step จริง · `--bb-chip-green`/`--bb-chip-accent` เหลือเป็น alias รอลบ

**ค้าง:** [`tokens.css`](../../app/static/core/css/tokens.css) `--vc-*` legacy indigo — ตายเมื่อหน้าสุดท้าย migrate

### 🔶 P3 · binary radius — ปิดเฉพาะ component ที่ redesign แล้ว

| จุด | สถานะ |
|---|---|
| `.bb-btn` · `.bb-select` · `.bb-search` · `.bb-pg` · `.bb-cell-link` | ✅ `pill` |
| `.bb-status` · `.bb-menu` · `.bb-callout` · `.bb-drawer` · `.bb-section` | ✅ `8` |
| `.bb-input` · `.bb-card` · `.bb-kpi` · `.bb-modal` · `.ue-chip-pop` · `.ml2-skel-block` · `.bb-badge` | ⏸ ยังใช้ 5-step เดิม (rounds ถัดไป) |

### P4 · เล็กน้อย

| จุด | ตอนนี้ | ต้องเป็น |
|---|---|---|
| `ue.css` `h1.page-title` | `letter-spacing:-0.5px` โดนไทยด้วย | จำกัดเฉพาะ Latin/ตัวเลข — ไทยต้อง 0 (§3) |
| icon size | `ue.css` ใช้ rem 0.95–1.9 กระจาย | ยุบเข้า sm 16 / md 20 / lg 24 (§7) |
| prefix `.ml2-*` | legacy จาก mileage | rename `.ue-*` (cosmetic) |
| Bootstrap | โหลด CDN สำเร็จรูป | Sass-compile map `$primary`=เขียว (§8) |

### 🔶 P5 · component API — ยก macro เป็น object (เหลือ 2 จาก 3)

> **กฎที่ตกลงแล้ว:** หน้าใหม่/redesign → เรียก component ผ่าน **object** เท่านั้น (`from components import X` ใน controller → `{{ component(x) }}` ใน jinja) · macro ใน `_components/bb/*` = **private** ห้าม import ตรงจากไฟล์เพจ
> แนวเดียวกับ ViewComponent (GitHub) / React: **object = public API · template = implementation ข้างหลัง**
>
> ⏸ **จังหวะแก้ = รอบ redesign ครั้งถัดไปของ component นั้นๆ เท่านั้น — ตอนนี้ไม่แตะอะไรทั้งสิ้น** (ตามกฎ §14: เก็บกวาดเฉพาะรายการที่หน้านั้นแตะถึง · ห้ามไล่แก้ทั้งระบบรวดเดียว)

gap ที่ทำให้ [`vehicle_mileage.html`](../../app/templates/vehicle/admin/vehicle_mileage.html) ต้อง "หนีไปทางหลัง" = เรียก macro ตรง — ปิด gap เมื่อ redesign component นั้น:

| จุด | ตอนนี้ | ต้องเป็น |
|---|---|---|
| ~~[`Button`](../../app/components/button.py) object~~ | **✅ ปิดแล้ว (Batch 1 · 2026-07-21)** — object รับ `href`/`target`/`title`/`mobile_icon` + เพิ่ม `block` | — |
| `bb_filter` ([`_components/bb/filter.html`](../../app/templates/_components/bb/filter.html)) | shell macro · ไม่มี Python class → หน้าต้องใช้ `{% call %}` เอง | `Filter(body=[...])` รับ component ลูกแบบ **slot** (เหมือน `Card(body=[...])` ที่มีแล้ว) |
| `bb_ml_dd` (macro ประจำหน้า · `vehicle_mileage.html` บรรทัด 22–38) | reinvent dropdown เอง 17 บรรทัดในไฟล์เพจ | ยก **`Select`** เป็น object reusable ใน `app/components/` |

**ผลเมื่อปิดครบ:** toolbar ในไฟล์เพจ ~110 → ~15 บรรทัด · การสร้าง option list + เงื่อนไข `active`/`visible` ย้ายไป controller (Python — test ได้/autocomplete ได้ · ตรง [ADR 0001](adr/0001-clean-architecture-layers.md) + [page_pattern.md](page_pattern.md)) · signature drift page↔macro หมดไป เพราะไฟล์เพจไม่แตะ macro อีกเลย

### ✅ เคาะแล้ว (2026-07-21)

- **เฉด `success`** `#16A34A` — **คงเป็นเขียว** (ทางเลือก ก) + บังคับ icon+label ทุกที่ · `.bb-dot` ลบทิ้ง · ความเสี่ยงลดอีกชั้นเพราะปุ่มหลักเป็น ink แล้ว

### ✅ เคาะแล้ว (2026-07-22)

- **`vehicle_mileage.html` desktop table status badges (คอลัมน์ "สถานะ") ไม่มี icon** — label อย่างเดียว โดยตั้งใจ (ผู้ใช้ตัดสินใจ 2026-07-22, ไม่แก้ §12 core rule) → **ขัด §12 "icon + label เสมอ"** ไว้เป็นข้อยกเว้นเฉพาะหน้านี้ ไม่ใช่ pattern ใหม่ทั้งระบบ. Mobile card list (หน้าเดียวกัน) ยังมี icon+label ตามเดิม — asymmetry desktop/mobile ตั้งใจ ไม่ใช่ bug

### ⚠️ ค้างตรวจ (2026-07-22) — ยังไม่เคาะ

- **`.ue-chip` active/selected ไม่เปลี่ยนสีแล้ว** — §12 row 4 ("Filter") spec เดิมเขียนไว้ว่า "chip active = border+text `accent-dk` ไม่ fill พื้น + icon `FILL 1`" แต่โค้ดจริงตอนนี้ (`ue.css` § CHIP, session mileage layout-flatten 2026-07-22) **ตัด `.ue-chip.is-on`/`.ue-chip-dd.is-open/.is-active` border+color→`accent-dk` ทิ้งทั้งหมด** — chip ที่เลือกค่าแล้วยังคงสี base (`n50`/`n700`) เหมือนไม่ active (เหลือแค่ icon fill + label/badge count เป็นสัญญาณ). ไม่ทราบว่าเป็นการตัดสินใจ conscious หรือ side-effect ของการทำ base restyle (flat gray) — **ต้อง human ยืนยัน**: (a) แก้ §12 row 4 ให้ตรงกับโค้ดใหม่ (accept) หรือ (b) เพิ่ม border/color กลับเข้า `.ue-chip.is-on` ให้ตรง spec เดิม (revert).

### ⏸ ค้าง — งานที่ redesign v2.1 ยังไม่ได้แตะ

| จุด | เหตุ |
|---|---|
| Python object ของ component ที่เหลือ (`Input`/`Card`/`KPI`/`Modal`/`Chip`…) | Batch 0-3 แตะแค่ control · data · drawer — ตัวที่เหลือยังเป็นสไตล์เดิม (radius 5-step, .875rem) |
| `ue.css` `h1.page-title` `letter-spacing:-0.5px` โดนไทยด้วย | ต้องจำกัดเฉพาะ Latin/ตัวเลข (§3) |
| หน้าเดิมทุกหน้าที่ใช้ `.bb-*` | เปลี่ยนหน้าตาตามอัตโนมัติ (ปุ่มดำ · ตารางเปลือย · status badge) — **ต้องไล่ดูด้วยตาทีละหน้า** |

---

## เก่า → ใหม่ (deprecated)

| เก่า | สถานะ |
|---|---|
| `design_system.md` | **ลบแล้ว 2026-06-28** → ไฟล์นี้ |
| `design_dna_redesign.md` | **ลบแล้ว 2026-06-28** (DNA layer เลิก) |
| `zendenta_migration.md` | **ลบแล้ว 2026-06-28** (Zendenta layer เลิก · legacy `.zen-*`/`.data-table` ยังอยู่ใน main.css) |
| `--vc-*` tokens (tokens.css) | legacy — ยังใช้ในโค้ดเดิมจน migrate; token ใหม่ตามไฟล์นี้ (§14 P2) |
| bbcenter-design SKILL | ⛔ **ล้าสมัยหนักหลัง v2.0** — skill สอน accent น้ำเงิน/no-shadow/`--vc-*` ซึ่งขัด v2.0 เกือบทุกข้อ. ใช้ได้เฉพาะซ่อมหน้า legacy ที่ยังไม่ migrate · งานใหม่ยึดไฟล์นี้เท่านั้น |
| `accent` น้ำเงิน `#4081EC` | **เลิกใช้ 2026-07-21** (v2.0) → เขียว `#06C167` + `#0B7A3E` |
| `rem` + root font scaling | **เลิกใช้ 2026-07-21** (v2.0) → px + cap width 1400 |
| radius 5 step (4/6/12/16) | **เลิกใช้ 2026-07-21** (v2.0) → binary `8`/`pill` |
| shadow cool-tint `rgba(16,37,64,…)` | **เลิกใช้ 2026-07-21** (v2.0) → ดำ `rgba(0,0,0,…)` 2 ระดับ |
| `ubereats.design.md` | reference only — ยืมแค่ 4 doctrine (§0) **ห้ามลอกสี/ฟอนต์/ความโปร่ง** · mockup เทียบ → [`mockup-ubereats-marketing.html`](../../app/static/core/mockup-ubereats-marketing.html) |
