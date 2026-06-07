# BBCenter V2 — Design System Reference
**Updated:** 2026-06-06 (Token palette refresh + single-font: สี core ปรับเป็น gray-scale/Tailwind-style — `--vc-fg`/`--vc-primary` `#000`→`#111827`, `--vc-fg-muted` `#666`→`#6B7280`, `--vc-fg-subtle` `#888`→`#9CA3AF`, `--vc-border` `#EAEAEA`→`#E5E7EB`, `--vc-primary-hover` `#333`→`#1F2937`; semantic `--vc-green` `#16A34A` / `--vc-amber` `#D97706` / `--vc-red` `#DC2626` (hover `#B91C1C`) / `--vc-blue` `#2563EB` (hover `#1D4ED8`) + bg/border rgba ปรับตาม. Accent indigo `#4F46E5` คงไว้. **Font:** บังคับ Sarabun อย่างเดียวทุกที่ — `--vc-font-mono` Poppins→Sarabun + เพิ่ม `--vc-font-sans`; ลบ Geist Mono/IBM Plex/Poppins/Montserrat/Inter/Prompt ออกหมด (link + CSS); `_header.html` โหลด Sarabun global; base `body{font-family:--vc-font-sans}` ใน design-system.css. `.ds-btn-primary:hover` hardcode→token)
**Updated:** 2026-05-22 (budget_manage Phase 8: dead purple CSS cleanup — `.vc-btn-purple` + `.vc-badge-purple` (budget_manage.css §7) + `.vc-kpi-value--purple` (components/kpi.css) ลบครบ. Tokens `--vc-purple*` ใน tokens.css เก็บไว้สำหรับ swatch demo. Closes purple retirement loop ที่เริ่ม Phase 4 (markup) — ตอนนี้ functional CSS file zero references; only design_system_reference.html ใช้ใน demo)
**Updated:** 2026-05-22 (budget_manage Phase 7: Pivot section — fiscal year (Mar→Feb) × dept, 2 collapsed cards (central + dept). **CSS architecture move:** `.vc-pivot-*` block (~165 lines) extracted from `fuel_admin.css` §22 → `components/pivot.css` shared component (loaded globally via `design-system.css` @import). Reusable principle: **collapsible pivot via `<details class="vc-card vc-pivot-wrap">`** — sticky-col table, heat-tinted cells (`--cell-heat: 0..100` via indigo low-opacity), drill-down links per cell + total col + grand total tfoot, footer mono tabular-nums. Pattern ใช้ได้ใน admin pages อื่นที่ต้องการ overview table ที่ "ย่อได้" และ "scroll-able sticky column". Personal pivot deferred → future_features #14 (BudgetType ไม่มี personal, ต้อง query VehicleMileage แทน))
**Updated:** 2026-05-22 (budget_manage Phase 6: 3 modal `ds-alert-*` info/warning boxes → meta lines. Pattern (a) `<dl class="budget-modal-meta">` Stripe-style label-value pairs (border-block divider + flex baseline rows + `<dt>` SMALL CAPS uppercase muted + `<dd>` sm/600/fg) สำหรับ context info; pattern (b) `<p.budget-modal-notice>` thin top-border info line w/ lucide icon สำหรับ "อธิบายผลของ action". Reusable principle: **เลือกใช้ alert box เฉพาะ destructive/error warning จริง** — context info (label-value) ที่อยู่ในฟอร์มอนุญาตให้ใช้ meta block แทน เพื่อ focus กลับไปที่ form input)
**Updated:** 2026-05-22 (budget_manage Phase 5: personal row card → inline line — drop card chrome (border/bg/radius/padding) → `padding-block` + bottom border separator; `.meta` flex baseline inline (label+value 1 บรรทัด); typography demoted (label sm lowercase, value sm mono fg); reusable principle: **lightweight inline strip** สำหรับ secondary info section ที่ไม่ควรแข่ง prominence กับ primary card grid — เก็บ color signal บน icon (green warmth) แทน value text)
**Updated:** 2026-05-21 (Clean UI spec — apply 5 carousel principles: borders not shadows · 60-30-10 palette · spacing · 3-weight typography · hierarchy by size+weight; budget_manage Phase 1: CTA `vc-btn-purple`→`vc-btn-primary` · `.vc-bcard--inactive` stripe→dashed flat (§13) · dropdown padding 6→8px; budget_manage Phase 2: KPI 6→4 cells (`vc-kpi-group--6`→`--4`) · "งบส่วนกลาง"+"งบงานกอง" amounts ย้ายขึ้น `.vc-section-hdr-amount` (mono/tnum/600); budget_manage Phase 3: card hierarchy — `.vc-bcard-row` → `.vc-bcard-pct-hero` (percent เป็น hero text-lg/600/mono + label muted xs) · `.vc-bcard-amounts` demoted (used md/600→sm/500/muted, total sm/muted→xs/subtle) · ลบ `.used.is-purple` (purple บน data value หลุด scope); budget_manage Phase 4 premium polish — purple retirement complete (markup zero, CSS rules `.vc-btn-purple`/`.vc-badge-purple` kept for Phase 8) · `.vc-progress > span` baseline `--vc-green`→`--vc-fg` (Linear monochrome — reusable principle) · SMALL CAPS labels (`.vc-bcard-pct-label` + `.vc-section-hdr-amount-label` 11px/500 uppercase tracking-wide — reusable premium tag pattern) · `.vc-bcard-pct` text-lg→text-2xl/tracking-tight · asymmetric child margin-top แทน flat gap · `.vc-kpi-cell--signal` modifier (bg-subtle highlight 1 cell แทนใช้สี) · page-scoped animation tokens `--bm-ease-out`/`--bm-dur-fast/-base/-slow` + 3 keyframes (`bm-fade-up/-progress-fill/-fade-in`) + per-card stagger via inline `--bm-delay` + signature progress-fill animation + `.budget-modal-enter` scoped modal entrance + `prefers-reduced-motion` block)
**Style:** Vercel-inspired Light Mode | **Primary:** Gray-900 `#111827` (`--vc-primary`) | **Accent:** Indigo `#4F46E5` (`--vc-accent`, focus ring + sidebar active only) | **Font:** Sarabun เท่านั้น (ทุก context รวม numeric/code — `--vc-font-sans` = `--vc-font-mono` = Sarabun; ห้ามใช้ font อื่น)

> **Canonical rule:** Use `--vc-*` tokens only in new CSS/templates. `--ds-*` is legacy (Indigo-era pre-2026-05) and still alive in `tokens.css` for un-migrated pages — do not introduce new references. See [SKILL §3.2](../../.claude/skills/bbcenter-design/SKILL.md) for the binary list of allowed tokens.
>
> **Token source:** [app/static/css/tokens.css](../../app/static/css/tokens.css) — Part A `--ds-*` (legacy, freeze), Part B `--vc-*` (canonical). Imported by `design-system.css`.
>
> **Component library (Phase 2):**
> - CSS: `app/static/css/components/{kpi,filter_bar,badge,pill,empty_state,form_group,table_shell,modal_shell}.css` — `@import`-ed by `design-system.css`.
> - Macros: `app/templates/_components/{kpi,filter_bar,badge,pill,empty_state,form_group,table_shell,_modal}.html` — opt-in per page (Phase 3 migrates each page).
> - Class naming: **flat vocab** `.vc-{block}-{tone-or-mod}` matching `/bbcenter-design` skill (e.g. `vc-badge-warning`, `vc-empty-title`).
>
> See [frontend-architecture-plan](log/2026-05-14_frontend-architecture-plan.md) for migration roadmap. Reference page = [admin_fuel.html](../../app/templates/vehicle/admin/admin_fuel.html).

---

## 1. Design Philosophy

| หลักการ | รายละเอียด |
|---|---|
| **Gray-900 primary** | `--vc-primary` = `#111827` สำหรับ CTA หลัก ปุ่ม Save/Confirm |
| **Indigo accent secondary** | `--vc-accent` = `#4F46E5` focus ring · sidebar active · secondary CTA |
| **Extra-light borders** | `--vc-border` = `#E5E7EB` แทน shadow ทุกที่ |
| **Prominent white space** | padding넉넉한, header สูง, nav item หายใจได้ |
| **No shadow** | `box-shadow: none` ทุก component — ยกเว้น `--vc-focus-ring` (2px outline) |
| **Tight radius** | 4–8px เท่านั้น (`--vc-radius-xs/sm/md`) |
| **Vercel-style surfaces** | `vc-card` เป็น base surface (ไม่ใช้ Bootstrap `.card` ใน vc-scope) |
| **Lucide icons ใน vc-scope** | `<i data-lucide="...">` (Font Awesome เฉพาะ legacy pages) |

---

## 1.5 Clean UI Principles (canonical — apply ทุกหน้า)

| # | Principle | กฎใน BBCenter |
|---|---|---|
| 1 | **Borders, not shadows** | `box-shadow: none` ทุก surface — ยกเว้น `--vc-accent-ring` (focus). Border 1px `--vc-border` แทน |
| 2 | **60-30-10 palette** | 60% page bg (`--vc-bg-subtle`) · 30% surface (`--vc-bg`) · 10% signal (text + border + black CTA). Status colors = exception, ใช้แค่ badge/dot |
| 3 | **Generous spacing** | Page padding 24-32px · card body 16-24px · ห้าม `padding < 8px` บน interactive element · touch target ≥ 32×32px |
| 4 | **Fewer fonts & weights** | 1 font (Sarabun เท่านั้น — UI + numeric/code). **Weight allowlist: 400 / 500 / 600 เท่านั้น** — ban 300, 700, 800 |
| 5 | **Hierarchy by size+weight** | 1 element = 1 size + 1 weight + 1 color. ห้ามใช้สี accent (indigo) เป็น primary heading — ใช้ `--vc-fg` |

> **Indigo accent (`--vc-accent`) scope:** focus ring + sidebar active + secondary hover เท่านั้น. **ห้ามใช้บน CTA fill** — primary CTA = `--vc-primary` (black) เสมอ
>
> **`--vc-purple` scope:** budget_manage page only

---

## 2. Color Tokens (`--vc-*` canonical)

### Surface & Background
| Token | Value | ใช้กับ |
|---|---|---|
| `--vc-bg` | `#FFFFFF` | card / sidebar / modal base |
| `--vc-bg-subtle` | `#FAFAFA` | thead / section muted / KPI cell |
| `--vc-bg-hover` | `#F5F5F5` | row hover / nav hover |
| `--vc-bg-inverted` | `#000000` | dark surface (rare) |

### Foreground / Text
| Token | Value | ใช้กับ |
|---|---|---|
| `--vc-fg` | `#111827` | heading / strong body |
| `--vc-fg-muted` | `#6B7280` | paragraph / table cell |
| `--vc-fg-subtle` | `#9CA3AF` | label / meta / "—" / placeholders |
| `--vc-fg-disabled` | `#BBBBBB` | disabled state |
| `--vc-fg-inverted` | `#FFFFFF` | text บน vc-primary/solid bg |

### Border
| Token | Value | ใช้กับ |
|---|---|---|
| `--vc-border` | `#E5E7EB` | divider / card border ทั่วไป |
| `--vc-border-hover` | `#999999` | hover state divider |
| `--vc-border-strong` | `#666666` | emphasis divider (rare) |

### Primary & Accent
| Token | Value | ใช้กับ |
|---|---|---|
| `--vc-primary` | `#111827` | CTA หลัก (Save/Confirm/บันทึก) |
| `--vc-primary-hover` | `#1F2937` | hover state |
| `--vc-on-primary` | `#FFFFFF` | text on primary bg |
| `--vc-accent` | `#4F46E5` | focus ring tint / sidebar active / secondary CTA |
| `--vc-accent-hover` | `#4338CA` | hover state |
| `--vc-accent-dark` | `#3730A3` | pressed state |
| `--vc-accent-light` | `#EEF2FF` | tinted background |
| `--vc-accent-border` | `#C7D2FE` | tinted border |
| `--vc-accent-ring` | `0 0 0 3px rgba(79,70,229,.18)` | focus ring |

### Semantic Colors (Vercel palette) — used **outside** 60-30-10 budget
| ชื่อ | Base | Bg-tint | Border-tint | ใช้กับ | Allowed surfaces |
|---|---|---|---|---|---|
| **Blue** (info / approved) | `--vc-blue` `#2563EB` | `--vc-blue-bg` (10%) | `--vc-blue-border` (25%) | สถานะอนุมัติ / informational | badge, dot, link |
| **Amber** (warning / pending) | `--vc-amber` `#D97706` | `--vc-amber-bg` (10%) | `--vc-amber-border` (25%) | รออนุมัติ / รอเบิก | badge, dot, KPI value (over-budget) |
| **Red** (danger / error) | `--vc-red` `#DC2626` | `--vc-red-bg` (8%) | `--vc-red-border` (20%) | ปฏิเสธ / ลบ / over budget | badge, dot, delete button, error text |
| **Green** (success / received) | `--vc-green` `#16A34A` | `--vc-green-bg` (10%) | `--vc-green-border` (25%) | สำเร็จ / ได้เงิน | badge, dot |
| **Purple** (scoped) | `--vc-purple` `#7928CA` | — | — | special highlight | **budget_manage page only** |

> **Rule:** ห้ามใช้ semantic color เป็น background ของ surface ใหญ่ (card body, page bg). ใช้แค่ badge, dot, icon, text. ห้าม mix > 3 semantic colors ใน viewport เดียว

### 60-30-10 Proportions
| % | Role | Token | Hex | ตัวอย่าง |
|---|---|---|---|---|
| **60%** | Page surface | `--vc-bg-subtle` | `#FAFAFA` | `<body>` / `main` background |
| **30%** | Component surface | `--vc-bg` | `#FFFFFF` | card / sidebar / modal / table tbody |
| **10%** | Signal (text + border + CTA) | `--vc-fg` + `--vc-border` + `--vc-primary` | `#111827` / `#E5E7EB` / `#111827` | heading, divider, primary button |

---

## 3. Typography

**Font stack:** Sarabun เท่านั้น — ห้ามใช้ font อื่น (โหลด global ใน `_header.html`)
- UI text: `--vc-font-sans` = `'Sarabun', sans-serif` (ทุก context body/heading)
- Mono / numeric: `--vc-font-mono` = `'Sarabun', sans-serif` (ใช้ `tabular-nums`/`font-feature-settings` แทนการเปลี่ยน font เพื่อจัดเรียงตัวเลข)

### Size scale (`--vc-text-*` in px)
| Token | Value |
|---|---|
| `--vc-text-xs` | 12px (meta / badge text) |
| `--vc-text-sm` | 13px (label / caption) |
| `--vc-text-base` | 14px (body default) |
| `--vc-text-md` | 16px (card title) |
| `--vc-text-lg` | 18px (section title) |
| `--vc-text-xl` | 24px (page title) |
| `--vc-text-2xl` | 32px (KPI value large) |
| `--vc-text-3xl` | 48px (display) |

### Font weight allowlist — **3 levels เท่านั้น**

| Weight | Use | Examples |
|---|---|---|
| **400** | Body text, table cells, meta | paragraph, `td`, muted labels |
| **500** | Medium emphasis, labels, nav, buttons, KPI label | label, nav-item, `.vc-btn`, overline |
| **600** | Headings, KPI values, card titles, strong emphasis | h1-h3, `.vc-kpi-value`, `.vc-card-head-title` |

**Banned:** `300`, `700`, `800`, `bold` keyword. Migration:
- `font-weight: 700` → `600` (heading) หรือ `500` (caption emphasis)
- `font-weight: 800` → `600`
- `font-weight: 300` → `400`

### Letter-spacing
| Token | Value | ใช้กับ |
|---|---|---|
| `--vc-tracking-tight` | -0.02em | medium headings |
| `--vc-tracking-tighter` | -0.04em | display headings |
| `--vc-tracking-wide` | 0.02em | uppercase labels |

---

## 4. Spacing (8px grid + 4px micro)

| Token | Value |
|---|---|
| `--vc-space-1` | 4px |
| `--vc-space-2` | 8px |
| `--vc-space-3` | 12px |
| `--vc-space-4` | 16px |
| `--vc-space-5` | 20px |
| `--vc-space-6` | 24px |
| `--vc-space-8` | 32px |
| `--vc-space-10` | 40px |
| `--vc-space-12` | 48px |

> Bootstrap utility (`p-3`, `gap-2`) ใช้ก่อน — ใช้ token เมื่อ custom layout เท่านั้น

### Spacing usage map (apply per context)

| Context | Recommended | Token |
|---|---|---|
| Page top padding (`main`) | 24-32px | `--vc-space-6` / `-8` |
| Card body padding | 16-24px | `--vc-space-4` / `-6` |
| Card head ↔ body gap | 12-16px | `--vc-space-3` / `-4` |
| KPI cell padding | 16px | `--vc-space-4` |
| Form field gap (between) | 12-16px | `--vc-space-3` / `-4` |
| Inline gap (icon ↔ text) | 6-8px | `--vc-space-2` |
| Section gap (between cards) | 16-24px | `--vc-space-4` / `-6` |
| Modal padding | 20-24px | `--vc-space-5` / `-6` |
| Empty state padding-y | 48px | `--vc-space-12` |

**Hard rule:** ห้าม `padding < 8px` (`--vc-space-2`) บน interactive element (button/input/row). Touch target ≥ 32×32px

---

## 5. Border Radius

| Token | Value | ใช้กับ |
|---|---|---|
| `--vc-radius-xs` | 4px | button / badge / input |
| `--vc-radius-sm` | 6px | card / nav item |
| `--vc-radius-md` | 8px | modal / large surface |
| `--vc-radius-lg` | 12px | rare — hero card |
| `--vc-radius-full` | 9999px | pill / avatar / dot |

---

## 6. Shadow — STRICT no-shadow rule

**ไม่มี shadow ใดๆ** — แม้ `0 1px 2px rgba(...)` ที่ดู "เบา" ก็ห้าม. Modal/popover ใช้ border + overlay เท่านั้น

**Allowed exception (เดียว):** focus ring สำหรับ accessibility
```css
--vc-focus-ring: 0 0 0 2px var(--vc-bg), 0 0 0 4px var(--vc-fg);
--vc-accent-ring: 0 0 0 3px rgba(79,70,229,.18);  /* focus state สำหรับ accent element */
```

### Border system per surface

| Surface | Border | Radius |
|---|---|---|
| Card (`vc-card`) | `1px solid --vc-border` | `--vc-radius-sm` (6px) |
| Input | `1px solid --vc-border` → focus `--vc-accent` + ring | `--vc-radius-xs` (4px) |
| Modal | `1px solid --vc-border` + overlay `rgba(9,9,11,.4)` | `--vc-radius-md` (8px) |
| Button (secondary/ghost) | `1px solid --vc-border` → hover `--vc-border-hover` | `--vc-radius-xs` (4px) |
| Badge | `1px solid` semantic-border | `--vc-radius-xs` |
| Pill / avatar | none หรือ 1px | `--vc-radius-full` |
| Calendar cell | `1px solid --vc-border` (right + bottom only) | 0 |
| Table row | `1px solid --vc-border` (bottom only, `last-child` remove) | 0 |
| KPI cell divider | `1px solid --vc-border` (between cells) | inherit |

---

## 7. Component Heights

| Token | Value | ใช้กับ |
|---|---|---|
| `--vc-h-input-sm` | 28px | filter input |
| `--vc-h-input` | 32px | normal input / button-sm |
| `--vc-h-input-md` | 40px | form input ใหญ่ |
| `--vc-h-row` | 48px | table row |

---

## 8. Motion

| Token | Value |
|---|---|
| `--vc-transition` | 150ms ease |
| `--vc-transition-slow` | 250ms ease |

---

## 9. Components

> **กฎ:** ใน `.vc-scope` ใช้ `vc-card / vc-btn / vc-table / vc-badge / vc-empty / vc-kpi-*` ตาม component library — **ห้าม mix `.ds-*` กับ `.vc-*`** ในไฟล์เดียว

### 9.1 Card (vc-card)
```html
<div class="vc-card">
  <div class="vc-card-head">
    <h3 class="vc-card-head-title">Title <span class="vc-card-head-meta">meta</span></h3>
  </div>
  <div class="vc-card-body"> ... </div>
</div>
```

### 9.2 Buttons (vc-btn)
| Class | ลักษณะ | ใช้กับ |
|---|---|---|
| `.vc-btn.vc-btn-primary` | bg: `--vc-primary` (black), text: white | CTA หลัก |
| `.vc-btn.vc-btn-secondary` | border-only | secondary action |
| `.vc-btn.vc-btn-ghost` | transparent | icon button / cancel |
| `.vc-btn.vc-btn-danger` | red outline → red fill | ลบ / ปฏิเสธ |
| `.vc-btn-sm` / `.vc-btn-icon` | modifier | ตามบริบท |

### 9.3 Badges (vc-badge) — flat vocab

```html
<span class="vc-badge vc-badge-success vc-badge-dot">ได้เงิน</span>
<span class="vc-badge vc-badge-warning vc-badge-dot">รอเบิก</span>
<span class="vc-badge vc-badge-blue vc-badge-dot">อนุมัติ</span>
<span class="vc-badge vc-badge-danger vc-badge-dot">ปฏิเสธ</span>
<span class="vc-badge vc-badge-neutral">ยกเลิก</span>
<span class="vc-badge vc-badge-solid vc-badge-dot">3 งานรวม</span>
<span class="vc-badge vc-badge-xs">เล็กพิเศษ</span>
```

- Tones: `-neutral / -warning / -blue / -success / -danger / -solid` (+ page-local `-purple` ใน budget_admin.css)
- `-solid` = inverted black-fg/white-bg สำหรับ strong emphasis (Phase 3.2)
- Modifier `vc-badge-dot` → left colored dot สำหรับ status pills
- Macro: `{{ badge(text, tone, dot=True, icon='lucide-name') }}` จาก [_components/badge.html](../../app/templates/_components/badge.html)

### 9.4 Form Inputs (vc-form-*)
```html
<div class="vc-form-group">
  <label class="vc-label">ชื่อผู้จอง</label>
  <input class="vc-input" placeholder="กรอกชื่อ...">
  <span class="vc-form-hint">ข้อความช่วยเหลือ</span>
</div>
```

### 9.5 Table (vc-table)
```html
<div class="vc-card">
  <div class="vc-card-head">
    <h3 class="vc-card-head-title">รายการจอง <span class="vc-card-head-meta">48</span></h3>
  </div>
  <div class="table-responsive">
    <table class="vc-table mb-0">
      <thead><tr><th>ชื่อ</th><th>สถานะ</th></tr></thead>
      <tbody>...</tbody>
    </table>
  </div>
</div>
```

### 9.6 Empty State (vc-empty)
```html
<div class="vc-empty">
  <div class="vc-empty-icon">
    <i data-lucide="receipt" style="width:20px;height:20px;"></i>
  </div>
  <p class="vc-empty-title">ยังไม่มีบิล</p>
  <p class="vc-empty-desc">เริ่มต้นด้วยการบันทึกบิลใบแรก</p>
  <button class="vc-btn vc-btn-primary vc-btn-sm">บิลใหม่</button>
</div>
```
- Macro: `{{ empty_state(title, desc, icon='lucide-name', compact=False) }}` จาก [_components/empty_state.html](../../app/templates/_components/empty_state.html)
- ใส่ CTA ผ่าน `{% call empty_state(...) %}<button>…</button>{% endcall %}`

### 9.7 KPI Cell (vc-kpi-*)
> **Note 2026-05-24:** `.va-kpi-card` + `.va-kpi-4` (page-scoped wrapper) ถูกลบจาก vehicle_admin Phase 1-2 redesign. ใช้ `.vc-kpi-group` + `.vc-kpi-cell` primitive ตรงๆ ได้ — ถ้าต้องการ grid columns count override ให้ใช้ inline `style="--vc-kpi-cols: 4;"` หรือสร้าง page-scoped class ใหม่ตามต้องการ.
```html
<div class="vc-card">
  <div class="vc-kpi-group">
    <div class="vc-kpi-cell">
      <p class="vc-kpi-label"><i data-lucide="wallet" class="vc-icon-sm"></i> ค่าน้ำมันเดือนนี้</p>
      <p class="vc-kpi-value">12,540<span class="vc-kpi-unit">บาท</span></p>
      <p class="vc-kpi-meta">เม.ย. 2569</p>
    </div>
  </div>
</div>
```

### 9.8 Filter Bar (vc-filter-bar)
```html
<form class="vc-filter-bar">
  <span class="vc-badge vc-badge-neutral"><i data-lucide="calendar-days" class="vc-icon-sm"></i> ช่วงวันที่</span>
  <div class="vc-filter-group">
    <span class="vc-filter-label">รถ</span>
    <select class="vc-filter-select">...</select>
  </div>
  <div class="vc-filter-actions">
    <button class="vc-btn vc-btn-secondary vc-btn-sm">กรอง</button>
  </div>
</form>
```

### 9.9 Modal (vc-modal)
- Container: `--vc-bg` · `1px solid --vc-border` · radius `--vc-radius-md` (8px) · **NO shadow**
- Overlay: `rgba(9,9,11,.4)` (no blur required)
- Padding: `--vc-space-6` (24px)
- Header: border-bottom `--vc-border` · padding-bottom `--vc-space-4`
- Footer: border-top `--vc-border` · padding-top `--vc-space-4` · `flex justify-end gap --vc-space-2`
- Close: `vc-btn-ghost` 32×32 พร้อม lucide `x`

### 9.10 Calendar Cell (rendered by vehicle.js)
Reference: [vehicle-warm-mockup.html](../design/vehicle-warm-mockup.html) lines 290-335
- `.calendar-cell`: `border-right + border-bottom: 1px solid --vc-border` · `padding: 8px` · `gap: 4px` · flat (no shadow/radius per cell)
- `.date-number` (today): `border: 1.5px solid --vc-fg` · transparent bg · weight 600 — **border-only, not filled**
- `.event-card`: border 1px `--vc-border` · radius `--vc-radius-sm` · padding `5px 8px` · `--vc-text-xs` · hover เปลี่ยน `border-color` เป็น `--vc-fg-subtle` (ห้าม shadow/transform)
- Status: 6px dot ใน `--vc-{green|amber|red|blue}` — ไม่ใช้สีพื้น chip

### 9.11 Alert (ds-alert — page-level flash messages)
> `.ds-alert*` ยังใช้ได้สำหรับ Flask flash messages (global ใน design-system.css) — ไม่ต้อง migrate. กฎ "ไม่ใช้ ds-*" ใช้กับ **token references** เป็นหลัก ไม่ใช่ class name ของ component ที่ยังไม่ migrate

```html
<div class="ds-alert ds-alert-success"> ... </div>
<div class="ds-alert ds-alert-warning"> ... </div>
<div class="ds-alert ds-alert-danger">  ... </div>
<div class="ds-alert ds-alert-info">    ... </div>
```

---

## 10. Icon Rules

**Library inside `.vc-scope`:** Lucide (data-attribute API)
```html
<i data-lucide="clock" class="vc-icon-sm"></i>
<script>lucide.createIcons();</script>  <!-- เรียกหลัง DOM update -->
```

**Legacy pages (ยังไม่ migrate vc-scope):** Font Awesome 6 (`fa-solid`)
- Vendor: `app/static/vendor/fontawesome/css/all.min.css`

### Lucide icon — meaning mapping (จาก SKILL §3.4)

| Concept | Icon | ตัวอย่าง |
|---|---|---|
| เวลา / ช่วงเวลา | `clock` | 08:30 – 12:00 น. |
| สถานที่ / จุดหมาย | `map-pin` | ศาลากลาง |
| จำนวนคน | `users` | 4 คน |
| รถ / ทะเบียน | `car` | Toyota Fortuner |
| คนขับ | `user-round` | สมชาย |
| วันที่ | `calendar-days` | 11 เม.ย. 2569 |
| แผนก | `building` | กองช่าง |
| หมายเหตุ | `sticky-note` | — |
| ค่าใช้จ่าย | `receipt` | 850 บาท |
| เลขไมล์ | `gauge` | 45,210 กม. |
| เงิน / งบ | `wallet` / `piggy-bank` | งบประมาณ |
| สถานะอนุมัติ | `circle-check` | approved |
| คำเตือน | `clock` / `alert-circle` | pending |

> icon ใช้สี `currentColor` (inherit จาก parent) — ห้าม hardcode color ใน icon

---

## 11. Responsive

| Breakpoint | Behavior |
|---|---|
| `< 992px` | Sidebar ซ่อน (transform: translateX(-100%)), เปิดด้วย hamburger |
| `≥ 992px` | Sidebar แสดงถาวร, main content มี `margin-left: 256px` |

---

## 12. Utility Classes (canonical = `.vc-*`)

| Class | ผล |
|---|---|
| `.vc-text-success/-warning/-danger/-blue` | semantic colors (uses `--vc-*` tokens) |
| `.vc-truncate` | text overflow ellipsis |
| `.vc-mono` | font-family: `--vc-font-mono` |
| `.vc-icon-sm/-md/-lg` | size lucide icons |
| `.vc-dot-sep` | inline separator dot |

> `.ds-text-*`, `.ds-surface`, `.ds-ring` etc — **legacy**, อยู่ใน `design-system.css` เพื่อ backward-compat. ไม่ใช้ใน new code

---

## 13. Do & Don't

### Do ✅
- ใช้ `var(--vc-*)` token ทุก color/spacing/radius reference
- Border 1px เป็น default; ไม่มี `box-shadow` ใดๆ ยกเว้น focus ring
- Surface 3 ระดับเท่านั้น: `--vc-bg-subtle` (page) → `--vc-bg` (card) → `--vc-bg-hover` (row hover)
- **1 element = 1 size + 1 weight + 1 color**
- Font weight อนุญาตเฉพาะ **400 / 500 / 600**
- Primary CTA = **1 ปุ่มต่อหน้า** (`--vc-primary` black). Secondary action ใช้ border-only
- Radius: 4px (button/badge/input), 6px (card), 8px (modal), 9999px (pill/avatar)
- Lucide icon ใน `.vc-scope`, Font Awesome เฉพาะ legacy pages
- Numeric/money cells ใช้ `vc-mono` utility (tabular-nums)
- Touch target ≥ 32×32px
- Spacing token > literal pixel ทุกครั้ง
- `.table-responsive` ครอบ `vc-table` ทุกครั้ง
- Flat vocab `vc-badge-success` (ไม่ใช้ BEM `--`)

### Don't ❌
- ห้าม `box-shadow` ใดๆ — รวม `0 1px 2px rgba(...)` ที่ดู "เบา" ก็ห้าม (ยกเว้น focus ring)
- ห้าม `border-left: Npx solid <accent>` บน card/KPI/alert (AI-dashboard tell)
- ห้าม `font-weight: 700 / 800 / 300` — รวม `bold` keyword
- ห้ามใช้ indigo (`--vc-accent`) เป็น background fill ของปุ่ม CTA (จะดู Material/Bootstrap-default)
- ห้าม mix > 3 semantic colors ใน viewport เดียว
- ห้าม `border-radius > 12px` (ยกเว้น pill `--vc-radius-full`)
- ห้ามผสม Lucide + Font Awesome ในหน้าเดียวกัน
- ห้าม inline `style="..."` ใน template — ย้ายไป CSS class
- ห้ามสร้าง token ใหม่ (`--my-*`, `--ds-*`) — ใช้ `--vc-*` อย่างเดียว
- ห้าม `padding < 8px` บน interactive element
- ห้าม hex literal ใน CSS rule (เช่น `color: #666`) — ใช้ token
- ห้าม zebra-striped table, gradient background, glow effect
- ห้าม vertical borders ระหว่าง column ใน table (horizontal line อย่างเดียว)

---

## 14. Migration cheatsheet — `--ds-*` → `--vc-*`

ใช้ตอน manual refactor ไฟล์ใด ไฟล์หนึ่ง (Phase 5 cleanup):

| Legacy `--ds-*` | Canonical `--vc-*` | Note |
|---|---|---|
| `--ds-accent` | `--vc-accent` | same value `#4F46E5` |
| `--ds-bg-page` | `--vc-bg-subtle` | both `#FAFAFA` |
| `--ds-bg-surface` | `--vc-bg` | both `#FFFFFF` |
| `--ds-bg-subtle` | `--vc-bg-subtle` | rough equivalent |
| `--ds-bg-hover` | `--vc-bg-hover` | both `#F5*` |
| `--ds-border` | `--vc-border` | `#EFEFEF` → `#E5E7EB` (visually identical) |
| `--ds-border-strong` | `--vc-border` | `#E4E4E7` → `#E5E7EB` (visually identical) |
| `--ds-text-heading` | `--vc-fg` | `#09090B` → `#111827` |
| `--ds-text-body` | `--vc-fg-muted` | `#3F3F46` → `#6B7280` |
| `--ds-text-secondary` | `--vc-fg-subtle` | `#71717A` → `#9CA3AF` |
| `--ds-text-muted` | `--vc-fg-subtle` | (use subtle for both) |
| `--ds-text-disabled` | `--vc-fg-disabled` | `#D4D4D8` → `#BBB` |
| `--ds-success` / `-text` etc | `--vc-green` / `--vc-green-bg` | Vercel palette |
| `--ds-warning` / `-text` | `--vc-amber` / `--vc-amber-bg` | Vercel amber |
| `--ds-danger` / `-text` | `--vc-red` / `--vc-red-bg` | Vercel red |
| `--ds-info` / `-text` | `--vc-blue` / `--vc-blue-bg` | Vercel blue |
| `--ds-radius-sm` (4px) | `--vc-radius-xs` (4px) | |
| `--ds-radius-md` (6px) | `--vc-radius-sm` (6px) | |
| `--ds-radius-xl` (8px) | `--vc-radius-md` (8px) | |
| `--ds-radius-full` | `--vc-radius-full` | both `9999px` |
| `--ds-space-N` | `--vc-space-N` | identical values 1-12 |
| `--ds-text-xs/sm/...` (rem) | `--vc-text-xs/sm/...` (px) | visually similar but px-based |
| `--ds-shadow-focus` | `--vc-accent-ring` หรือ `--vc-focus-ring` | choose per context |
| `--ds-font-sans` | (omit, body inherits Sarabun) | |
| `--ds-font-mono` | `--vc-font-mono` | now Sarabun (font เดียวของระบบ) |
| `--ds-z-*` | (no vc equivalent yet — keep) | |
| `--ds-sidebar-width` / `-header-height` / `-transition` | (no vc equivalent yet — keep) | layout tokens |

> **Phase 5 cleanup plan:** เพิ่ม `--vc-z-*` + `--vc-sidebar-width` ฯลฯ ก่อน batch-replace + delete Part A ของ tokens.css

---

## 15. Critical Fix List (2026-05-21 audit — apply per phase)

ลำดับ priority สำหรับ Clean UI compliance:

| # | File:line | Issue | Fix |
|---|---|---|---|
| 1 | `app/static/css/vehicle_admin.css:916` | `box-shadow: var(--vc-shadow-lg)` — token ไม่มีจริง (broken ref) | ลบบรรทัด |
| 2 | `app/static/css/vehicle.css:303` | sidebar drawer shadow `4px 0 24px rgba(0,0,0,.18)` | แทนด้วย `border-right: 1px solid --vc-border` + overlay |
| 3 | `app/static/css/vehicle.css:401` | `box-shadow: 0 1px 4px rgba(0,0,0,.04)` | ลบ shadow, เพิ่ม `border: 1px solid --vc-border` |
| 4 | `app/static/css/main.css:258, 269, 276` | Glow shadow `0px 0px 70px 25px` (legacy login decoration) | ลบทั้งหมด |
| 5 | `app/static/css/fuel_admin.css:548, 637, 680` | Modal/toast shadows | แทนด้วย border + radius |
| 6 | `app/static/css/vehicle_admin.css:177, 586, 740` | `font-weight: 800` | → `600` |
| 7 | `app/static/css/vercel.css:71` | `font-weight: 300` (breadcrumb sep) | → `400` |
| 8 | `app/static/css/notification.css:416` | `border-left: 2px solid` accent strip | → `border-bottom` หรือ `border-top` |
| 9 | `docs/design/vehicle-warm-mockup.html:354` | `.evt:hover { box-shadow }` ใน mockup เอง | port เป็น `border-color` hover เท่านั้น |
| 10 | Audit ทั่ว codebase | `border-radius > 12px` | ลดเหลือ 4/6/8/full |

**Migration strategy:** ทำเป็น phase ทีละไฟล์ (เริ่ม vehicle_admin.css — broken token + 3 weight-800). ห้าม batch-replace ทั้งหมดในครั้งเดียว

---

## 16. Open Question Decisions (2026-05-21)

จาก ux-designer audit, ตัดสินแล้ว:

| Q | Decision | Rationale |
|---|---|---|
| **Indigo `#4F46E5` เก็บหรือทิ้ง?** | **เก็บ** | scope = focus ring + sidebar active + secondary hover เท่านั้น. ห้ามใช้บน CTA fill (primary = `--vc-primary` black) — รักษา brand recognition โดยไม่ทำให้ดู Material |
| **`--vc-purple` ลบไหม?** | **เก็บ scope** | ใช้แค่ budget_manage page. หน้าอื่นถ้าต้อง highlight ใช้ `--vc-blue` แทน |
| **Mockup shadow on `.evt:hover`** | **ลบ** | ยึดกฎ no-shadow strict. ใช้ `border-color: --vc-fg-subtle` hover แทน |
| **Font weight 700→600 migration** | **Phase per file** | เริ่ม `vehicle_admin.css` (มี weight 800 + broken token), ตามด้วยไฟล์ที่มี 700. ห้าม batch-replace |
| **Mobile sidebar shadow** | **ลบ** | แทนด้วย `border-right: 1px solid --vc-border` + overlay `rgba(0,0,0,.4)`. Material-style drawer shadow ไม่เข้ากับ Vercel aesthetic |
