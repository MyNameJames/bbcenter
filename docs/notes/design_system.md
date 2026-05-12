# BBCenter V2 — Design System Reference
**Updated:** 2026-04-11
**Style:** Vercel-inspired Light Mode | **Accent:** Indigo | **Font:** Sarabun

---

## 1. Design Philosophy

| หลักการ | รายละเอียด |
|---|---|
| **Extra-light borders** | ใช้ border สีจาง `#EFEFEF` แทน shadow ทั้งหมด |
| **Prominent white space** | padding넉넉한, header สูง, nav item หายใจได้ |
| **No shadow** | `box-shadow: none` ทุก component — ใช้ border แทน |
| **Tight radius** | 4–6px เท่านั้น ดู serious ไม่กลมเกิน |
| **Bootstrap .card base** | ทุก surface component ใช้ `.card` เป็น base เสมอ |
| **Font Awesome หลัก** | `fa-solid` ทุก icon โดยเฉพาะข้อมูลเชิงเทคนิค |

---

## 2. Color Tokens

### Accent (Indigo)
| Token | Value | ใช้กับ |
|---|---|---|
| `--ds-accent` | `#4F46E5` | primary action, focus ring, active nav |
| `--ds-accent-hover` | `#4338CA` | hover state |
| `--ds-accent-dark` | `#3730A3` | pressed state |
| `--ds-accent-light` | `#EEF2FF` | tinted background |
| `--ds-accent-border` | `#C7D2FE` | tinted border |
| `--ds-accent-text` | `#3730A3` | text on light bg |

### Semantic Colors
| ชื่อ | Base | Light | Border | Text |
|---|---|---|---|---|
| **Success** | `#16A34A` | `#F0FDF4` | `#BBF7D0` | `#14532D` |
| **Warning** | `#D97706` | `#FFFBEB` | `#FDE68A` | `#78350F` |
| **Danger** | `#DC2626` | `#FEF2F2` | `#FECACA` | `#7F1D1D` |
| **Info** | `#2563EB` | `#EFF6FF` | `#BFDBFE` | `#1E3A8A` |
| **Neutral** | — | `#F4F4F5` | `#E4E4E7` | `#3F3F46` |

### Surface & Background
| Token | Value | ใช้กับ |
|---|---|---|
| `--ds-bg-page` | `#FAFAFA` | พื้นหลังทั้งหน้า |
| `--ds-bg-surface` | `#FFFFFF` | card / sidebar / modal |
| `--ds-bg-subtle` | `#F7F7F8` | thead, section muted |
| `--ds-bg-hover` | `#F5F5F6` | row / nav hover |

### Border
| Token | Value | ใช้กับ |
|---|---|---|
| `--ds-border` | `#EFEFEF` | border ทั่วไป (extra-light) |
| `--ds-border-strong` | `#E4E4E7` | divider ที่ต้องการเห็นชัด |

### Text (Zinc palette)
| Token | Value | ใช้กับ |
|---|---|---|
| `--ds-text-heading` | `#09090B` | heading, CTA button |
| `--ds-text-body` | `#3F3F46` | body text |
| `--ds-text-secondary` | `#71717A` | label, meta, nav inactive |
| `--ds-text-muted` | `#A1A1AA` | placeholder, icon |
| `--ds-text-disabled` | `#D4D4D8` | disabled state |
| `--ds-text-on-accent` | `#FFFFFF` | text on accent bg |

---

## 3. Typography

**Font:** `'Sarabun', -apple-system, sans-serif` — ใช้ทุก context (sans + display)

| Class | Size | Weight | ใช้กับ |
|---|---|---|---|
| `.ds-h1` | 1.5rem (24px) | 700 | Page title |
| `.ds-h2` | 1.2rem (19px) | 600 | Section heading |
| `.ds-h3` | 1.05rem (17px) | 600 | Card title |
| `.ds-body` | 0.875rem (14px) | 400 | Body text |
| `.ds-caption` | 0.8rem (13px) | 400 | Meta / label |
| `.ds-overline` | 0.72rem (11.5px) | 700 | Section label (uppercase) |
| `.ds-number-lg` | 2rem (32px) | 700 | KPI value ใหญ่ |
| `.ds-number-md` | 1.5rem (24px) | 700 | KPI value กลาง |

### Font Size Tokens
| Token | Value |
|---|---|
| `--ds-text-xs` | `.72rem` (~11.5px) |
| `--ds-text-sm` | `.8rem` (~12.8px) |
| `--ds-text-base` | `.875rem` (14px) |
| `--ds-text-md` | `.95rem` (~15px) |
| `--ds-text-lg` | `1.05rem` (~17px) |
| `--ds-text-xl` | `1.2rem` (~19px) |
| `--ds-text-2xl` | `1.5rem` (24px) |
| `--ds-text-3xl` | `2rem` (32px) |

---

## 4. Spacing (4px grid)

| Token | Value |
|---|---|
| `--ds-space-1` | 4px |
| `--ds-space-2` | 8px |
| `--ds-space-3` | 12px |
| `--ds-space-4` | 16px |
| `--ds-space-5` | 20px |
| `--ds-space-6` | 24px |
| `--ds-space-8` | 32px |
| `--ds-space-10` | 40px |
| `--ds-space-12` | 48px |

> ใช้ Bootstrap utility (`p-3`, `gap-2` ฯลฯ) ก่อน ใช้ token เมื่อ custom เท่านั้น

---

## 5. Border Radius

| Token | Value | ใช้กับ |
|---|---|---|
| `--ds-radius-xs` | 2px | chip เล็กมาก |
| `--ds-radius-sm` | 4px | button, badge, input |
| `--ds-radius-md` | 6px | card, nav item |
| `--ds-radius-lg` | 6px | card (max) |
| `--ds-radius-xl` | 8px | modal, large panel |
| `--ds-radius-full` | 9999px | pill, avatar, dot |

---

## 6. Shadow

**ไม่มี shadow ทั้งหมด** — ใช้ border แทน

```css
--ds-shadow-xs/sm/md/lg/xl: none;
--ds-shadow-focus: 0 0 0 3px rgba(79,70,229,.18);  /* focus ring เท่านั้น */
```

---

## 7. Z-index Scale

| Token | Value | ใช้กับ |
|---|---|---|
| `--ds-z-base` | 0 | normal flow |
| `--ds-z-raised` | 10 | sticky table header |
| `--ds-z-dropdown` | 100 | dropdown menu |
| `--ds-z-sticky` | 200 | top header |
| `--ds-z-sidebar` | 300 | sidebar |
| `--ds-z-overlay` | 400 | backdrop overlay |
| `--ds-z-modal` | 500 | modal dialog |
| `--ds-z-toast` | 600 | toast notification |

---

## 8. Layout

| Token | Value |
|---|---|
| `--ds-sidebar-width` | 256px |
| `--ds-header-height` | 64px |
| `--ds-transition` | .12s ease |

### App Shell Pattern
```html
<div class="ds-app-shell">
  <aside class="ds-sidebar ds-main-offset"> ... </aside>
  <div class="ds-main">
    <header class="ds-header"> ... </header>
    <div class="ds-scroll-area"> ... </div>
  </div>
</div>
```

---

## 9. Components

### Card (Bootstrap base)
> **กฎ:** ใช้ Bootstrap `.card` เสมอ — CSS override ทำให้ตรงกับ design system อัตโนมัติ

```html
<div class="card">
  <div class="card-header">Title</div>
  <div class="card-body"> ... </div>
  <div class="card-footer"> ... </div>
</div>
```

| Part | Padding | Background |
|---|---|---|
| `.card-header` | 12px 16px | `#FFFFFF` |
| `.card-body` | 16px | `#FFFFFF` |
| `.card-footer` | 12px 16px | `#F7F7F8` |

### Badges
```html
<span class="ds-badge ds-badge-success">อนุมัติแล้ว</span>
<span class="ds-badge ds-badge-warning">รอดำเนินการ</span>
<span class="ds-badge ds-badge-accent">รออนุมัติ</span>
<span class="ds-badge ds-badge-danger">ปฏิเสธ</span>
<span class="ds-badge ds-badge-neutral">ยกเลิก</span>
```

### Buttons
| Class | ลักษณะ | ใช้กับ |
|---|---|---|
| `.ds-btn.ds-btn-primary` | สีดำ `#09090B` | CTA หลัก (จองรถ, บันทึก) |
| `.ds-btn.ds-btn-accent` | Indigo `#4F46E5` | action รอง |
| `.ds-btn.ds-btn-secondary` | border only | cancel, secondary |
| `.ds-btn.ds-btn-ghost` | transparent | icon buttons |
| `.ds-btn.ds-btn-danger` | red outline → fill | ลบ, ปฏิเสธ |
| `.ds-btn-sm` / `.ds-btn-lg` | ขนาดเล็ก/ใหญ่ | ตามบริบท |

### Form Inputs
```html
<div class="ds-form-group">
  <label class="ds-label">ชื่อผู้จอง</label>
  <input class="ds-input" placeholder="กรอกชื่อ...">
  <span class="ds-form-hint">ข้อความช่วยเหลือ</span>
</div>
```

### Table Pattern
```html
<div class="card">
  <div class="card-header">รายการจอง</div>
  <div class="table-responsive">
    <table class="table ds-table mb-0">
      <thead><tr><th>ชื่อ</th><th>สถานะ</th></tr></thead>
      <tbody>...</tbody>
    </table>
  </div>
  <div class="card-footer">Showing 1–10 of 48</div>
</div>
```

### Empty State
```html
<div class="ds-empty">
  <div class="ds-empty-icon"><i class="fa-solid fa-calendar-xmark"></i></div>
  <p class="ds-empty-title">ไม่มีข้อมูล</p>
  <p class="ds-empty-desc">ยังไม่มีการจองในวันที่เลือก</p>
</div>
```

### Alert
```html
<div class="ds-alert ds-alert-success"> ... </div>
<div class="ds-alert ds-alert-warning"> ... </div>
<div class="ds-alert ds-alert-danger">  ... </div>
<div class="ds-alert ds-alert-info">    ... </div>
```

---

## 10. Icon Rules (บังคับ)

**Library:** Font Awesome 6 (`fa-solid`) เป็นหลัก, Bootstrap Icons เป็น fallback
**Vendor:** `app/static/vendor/fontawesome/css/all.min.css`

### ข้อมูลเชิงเทคนิค — ต้องมี icon นำหน้าเสมอ

| ข้อมูล | Icon class | ตัวอย่าง |
|---|---|---|
| เวลา / ช่วงเวลา | `fa-solid fa-clock` | 08:30 – 12:00 น. |
| สถานที่ / จุดหมาย | `fa-solid fa-location-dot` | ศาลากลางจังหวัด |
| จำนวนคน | `fa-solid fa-users` | 4 คน |
| รถ / ทะเบียน | `fa-solid fa-car` | Toyota Fortuner (อย 1234) |
| คนขับ | `fa-solid fa-id-card` | สมชาย • 081-xxx |
| วันที่ | `fa-solid fa-calendar` | 11 เม.ย. 2569 |
| แผนก | `fa-solid fa-building` | กองช่าง |
| หมายเหตุ | `fa-solid fa-note-sticky` | — |
| ค่าใช้จ่าย | `fa-solid fa-receipt` | 850 บาท |
| เลขไมล์ | `fa-solid fa-gauge-high` | 45,210 กม. |

> icon ใช้สี `--ds-text-muted` (#A1A1AA) เสมอ ยกเว้น active/accent state

---

## 11. Responsive

| Breakpoint | Behavior |
|---|---|
| `< 992px` | Sidebar ซ่อน (transform: translateX(-100%)), เปิดด้วย hamburger |
| `≥ 992px` | Sidebar แสดงถาวร, main content มี `margin-left: 256px` |

---

## 12. Utility Classes

| Class | ผล |
|---|---|
| `.ds-text-accent` | color: Indigo |
| `.ds-text-success/warning/danger` | semantic colors |
| `.ds-text-muted-u` | color: #A1A1AA |
| `.ds-surface` | background: #FFFFFF |
| `.ds-truncate` | text overflow ellipsis |
| `.ds-ring` | focus ring (Indigo) |
| `.ds-border-b` | border-bottom |
| `.ds-border-t` | border-top |

---

## 13. Do & Don't

| Do ✅ | Don't ❌ |
|---|---|
| ใช้ Bootstrap `.card` เป็น base เสมอ | สร้าง surface div เอง |
| ใช้ `--ds-*` token ทุกครั้ง | hardcode hex color |
| `fa-solid` icon ทุก technical field | ใช้ข้อความล้วนไม่มี icon |
| Border แทน shadow | `box-shadow` ใดๆ ยกเว้น focus |
| Radius 4–6px เท่านั้น | `border-radius > 8px` |
| Sarabun ทุก element | ผสม font หลายตระกูล |
| `.table-responsive` ครอบ table ทุกครั้ง | table ไม่มี responsive wrapper |
