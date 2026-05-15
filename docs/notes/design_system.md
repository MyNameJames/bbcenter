# BBCenter V2 — Design System Reference
**Updated:** 2026-05-14 (Phase 3 + namespace alignment — doc rewritten to use `--vc-*` only; `--ds-*` = legacy, retire ใน Phase 5 cleanup)
**Style:** Vercel-inspired Light Mode | **Primary:** Pure Black `#000` (`--vc-primary`) | **Accent:** Indigo `#4F46E5` (`--vc-accent`) | **Font:** Sarabun (UI) + Geist Mono (numeric/code)

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
| **Pure black primary** | `--vc-primary` = `#000` สำหรับ CTA หลัก ปุ่ม Save/Confirm |
| **Indigo accent secondary** | `--vc-accent` = `#4F46E5` focus ring · sidebar active · secondary CTA |
| **Extra-light borders** | `--vc-border` = `#EAEAEA` แทน shadow ทุกที่ |
| **Prominent white space** | padding넉넉한, header สูง, nav item หายใจได้ |
| **No shadow** | `box-shadow: none` ทุก component — ยกเว้น `--vc-focus-ring` (2px outline) |
| **Tight radius** | 4–8px เท่านั้น (`--vc-radius-xs/sm/md`) |
| **Vercel-style surfaces** | `vc-card` เป็น base surface (ไม่ใช้ Bootstrap `.card` ใน vc-scope) |
| **Lucide icons ใน vc-scope** | `<i data-lucide="...">` (Font Awesome เฉพาะ legacy pages) |

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
| `--vc-fg` | `#000000` | heading / strong body |
| `--vc-fg-muted` | `#666666` | paragraph / table cell |
| `--vc-fg-subtle` | `#888888` | label / meta / "—" / placeholders |
| `--vc-fg-disabled` | `#BBBBBB` | disabled state |
| `--vc-fg-inverted` | `#FFFFFF` | text บน vc-primary/solid bg |

### Border
| Token | Value | ใช้กับ |
|---|---|---|
| `--vc-border` | `#EAEAEA` | divider / card border ทั่วไป |
| `--vc-border-hover` | `#999999` | hover state divider |
| `--vc-border-strong` | `#666666` | emphasis divider (rare) |

### Primary & Accent
| Token | Value | ใช้กับ |
|---|---|---|
| `--vc-primary` | `#000000` | CTA หลัก (Save/Confirm/บันทึก) |
| `--vc-primary-hover` | `#333333` | hover state |
| `--vc-on-primary` | `#FFFFFF` | text on primary bg |
| `--vc-accent` | `#4F46E5` | focus ring tint / sidebar active / secondary CTA |
| `--vc-accent-hover` | `#4338CA` | hover state |
| `--vc-accent-dark` | `#3730A3` | pressed state |
| `--vc-accent-light` | `#EEF2FF` | tinted background |
| `--vc-accent-border` | `#C7D2FE` | tinted border |
| `--vc-accent-ring` | `0 0 0 3px rgba(79,70,229,.18)` | focus ring |

### Semantic Colors (Vercel palette)
| ชื่อ | Base | Bg-tint | Border-tint | ใช้กับ |
|---|---|---|---|---|
| **Blue** (info / approved) | `--vc-blue` `#0070F3` | `--vc-blue-bg` (10%) | `--vc-blue-border` (25%) | สถานะอนุมัติ / informational |
| **Amber** (warning / pending) | `--vc-amber` `#F5A623` | `--vc-amber-bg` (10%) | `--vc-amber-border` (25%) | รออนุมัติ / รอเบิก |
| **Red** (danger / error) | `--vc-red` `#EE0000` | `--vc-red-bg` (8%) | `--vc-red-border` (20%) | ปฏิเสธ / ลบ / over budget |
| **Green** (success / received) | `--vc-green` `#0F9D58` | `--vc-green-bg` (10%) | `--vc-green-border` (25%) | สำเร็จ / ได้เงิน |
| **Purple** (optional accent) | `--vc-purple` `#7928CA` | — | — | special highlight (rare) |

---

## 3. Typography

**Font stack:**
- UI text: `'Sarabun', -apple-system, sans-serif` (ทุก context body/heading)
- Mono / numeric: `--vc-font-mono` = Geist Mono → `ui-monospace → SF Mono → Menlo → Cascadia Code`

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

## 6. Shadow

**ไม่มี shadow** — ใช้ border (`--vc-border`) แทน

```css
/* เดียวที่ได้รับอนุญาต = focus ring */
--vc-focus-ring: 0 0 0 2px var(--vc-bg), 0 0 0 4px var(--vc-fg);
--vc-accent-ring: 0 0 0 3px rgba(79,70,229,.18);  /* focus state สำหรับ accent element */
```

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
```html
<div class="vc-card va-kpi-card">
  <div class="vc-kpi-group va-kpi-4">
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

### 9.9 Alert (ds-alert — page-level flash messages)
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

| Do ✅ | Don't ❌ |
|---|---|
| ใช้ `--vc-*` token ทุกครั้ง | hardcode hex color · ใช้ `--ds-*` ใหม่ |
| `vc-card` เป็น surface ใน vc-scope | สร้าง `<div style="background:#fff;">` |
| Lucide icon ใน vc-scope | mix lucide + FA ในหน้าเดียว |
| Border แทน shadow | `box-shadow` ใดๆ ยกเว้น focus |
| Radius 4–8px (`--vc-radius-xs/sm/md`) | `border-radius > 12px` (ยกเว้น pill `-full`) |
| Sarabun ทุก UI element | ผสม font หลายตระกูล |
| `.table-responsive` ครอบ `vc-table` ทุกครั้ง | table ไม่มี responsive wrapper |
| Flat vocab `vc-badge-success` | BEM `vc-badge--success` |

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
| `--ds-border` | `--vc-border` | `#EFEFEF` → `#EAEAEA` (visually identical) |
| `--ds-border-strong` | `--vc-border` | `#E4E4E7` → `#EAEAEA` (visually identical) |
| `--ds-text-heading` | `--vc-fg` | `#09090B` → `#000` |
| `--ds-text-body` | `--vc-fg-muted` | `#3F3F46` → `#666` |
| `--ds-text-secondary` | `--vc-fg-subtle` | `#71717A` → `#888` |
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
| `--ds-font-mono` | `--vc-font-mono` | Geist Mono swap |
| `--ds-z-*` | (no vc equivalent yet — keep) | |
| `--ds-sidebar-width` / `-header-height` / `-transition` | (no vc equivalent yet — keep) | layout tokens |

> **Phase 5 cleanup plan:** เพิ่ม `--vc-z-*` + `--vc-sidebar-width` ฯลฯ ก่อน batch-replace + delete Part A ของ tokens.css
