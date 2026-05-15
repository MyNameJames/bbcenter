---
name: bbcenter-design
description: |
  BBCenter V2 design system — copy-paste templates + binary rules so any
  model can produce pages that match admin_fuel.html exactly without
  judgment calls.

  Triggers:
  - "/bbcenter-design" / "/design" / "ออกแบบหน้า..." / "ทำหน้า...สวยๆ"
  - Any task that creates/edits a Jinja template in app/templates/
  - Any task that creates/edits a CSS file in app/static/css/
  - Any task that mentions "ให้เหมือน" / "consistency" / "กลมกลืน" /
    "product เดียวกัน" / "redesign"
---

# BBCenter Design Skill — Mechanical Mode

You are not designing from scratch. You are **copying patterns from
admin_fuel.html** and renaming page-specific bits. Every section below
gives you exact HTML / CSS / decision rules. Do not invent.

**Canonical reference:** [admin_fuel.html](app/templates/vehicle/admin/admin_fuel.html)
**Tokens reference:** [design_system.md](docs/notes/design_system.md)
**Macros (Phase 3+):** [`app/templates/_components/`](app/templates/_components/) — see §2.0

---

## 0. The 10 Hard Rules — never break these

1. Every `<main>` must have `class="main-content vc-scope"`.
2. Every visible container = `<div class="vc-card">`. Never `<div class="card-custom">`, never raw `<div>` with manual border.
3. Every `<button>` and `<a class="vc-btn">` must have `title="..."`.
4. Every icon inside `vc-scope` uses `<i data-lucide="NAME" class="vc-icon-sm"></i>`. **Not** `<i class="fa-...">`.
5. Every empty state uses `<div class="vc-empty">`. Never just text "ไม่มีข้อมูล".
6. Every number column = `class="text-end"` on `<th>` and `class="vc-td-num"` on `<td>`. Money uses `vc-mono`.
7. Every date shown to the user = `dd <TH_MONTHS[m-1]> yyyy+543` (Buddhist year). Never raw ISO.
8. Every `<table>` is wrapped in `<div class="table-responsive">`.
9. Every status pill = `<span class="vc-badge vc-badge-{COLOR} vc-badge-dot">`. Never colored row backgrounds, never `border-left: Npx solid <color>`.
10. Zero inline `<style>` and zero inline `<script>` inside templates. CSS → `app/static/css/<page>.css`. JS → `app/static/js/<page>.js` loaded with `defer`.

If you violate any rule, the page is not done. Fix before reporting back.

---

## 1. Page Skeleton — copy this verbatim, rename `<PAGE>`

```html
{# <PAGE_DESCRIPTION> #}
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <title><PAGE_TITLE> - BBCenter</title>
    <link rel="icon" href="{{ url_for('static', filename='fonts/favicon_io/favicon-32x32.png') }}">
    <link href="{{ url_for('static', filename='vendor/bootstrap/css/bootstrap.min.css') }}" rel="stylesheet">
    <link rel="stylesheet" href="{{ url_for('static', filename='vendor/fontawesome/css/all.min.css') }}">
    <link rel="stylesheet" href="{{ url_for('static', filename='vendor/bootstrap-icons/bootstrap-icons.min.css') }}">
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ url_for('static', filename='css/design-system.css') }}">
    <link rel="stylesheet" href="{{ url_for('static', filename='css/vehicle_admin.css') }}">
    <link rel="stylesheet" href="{{ url_for('static', filename='css/vehicle.css') }}">
    <link rel="stylesheet" href="{{ url_for('static', filename='css/<PAGE>.css') }}">
</head>
<body>
{% set TH_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'] %}

<div class="container-fluid container-p-y">
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    {% set active_menu = '<PAGE_MENU_KEY>' %}
    {% include '_sidebar.html' %}

    <main class="main-content vc-scope">
        {% set page_title = '<PAGE_TITLE>' %}
        {% include '_header.html' %}

        <div class="container-xxl px-3 pt-2">

            {# Flash messages — always include #}
            {% with messages = get_flashed_messages(with_categories=true) %}
                {% if messages %}
                <div class="vc-stack" style="margin-bottom: var(--vc-space-4);">
                    {% for category, message in messages %}
                    <div class="ds-alert ds-alert-{{ category }}">{{ message }}</div>
                    {% endfor %}
                </div>
                {% endif %}
            {% endwith %}

            {# Page header #}
            <div class="<PAGE>-header">
                <div>
                    <h1 class="<PAGE>-title"><PAGE_TITLE></h1>
                    <p class="<PAGE>-subtitle"><SUBTITLE></p>
                </div>
                <div class="<PAGE>-header-actions">
                    <!-- secondary + primary buttons here -->
                </div>
            </div>

            {# ... page content blocks here ... #}

        </div>
    </main>
</div>

<script src="{{ url_for('static', filename='vendor/bootstrap/js/bootstrap.bundle.min.js') }}"></script>
<script src="{{ url_for('static', filename='js/<PAGE>.js') }}" defer></script>
</body>
</html>
```

**CSS order is fixed.** Do not reorder. Page CSS is **last** so it can override.

`<PAGE>-header` CSS (put in `<PAGE>.css`):
```css
.<PAGE>-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--vc-space-4);
    margin-bottom: var(--vc-space-5);
}
.<PAGE>-title { font-size: var(--vc-text-xl); font-weight: 700; margin: 0; }
.<PAGE>-subtitle { font-size: var(--vc-text-sm); color: var(--vc-fg-subtle); margin: 4px 0 0; }
.<PAGE>-header-actions { display: flex; gap: var(--vc-space-2); }
```

---

## 2. Component Templates — copy from here, change content only

> **Macro shorthand (optional, Phase 3+):** the components below also exist
> as Jinja macros in `app/templates/_components/`. Use raw HTML when you
> are creating the canonical reference for a page, prototyping, or when
> the cell needs custom logic. Use the macro when the call site is
> simple and you want fewer lines. The skill review tools accept **both**
> forms — they render to the exact same HTML.
>
> See `§2.0` below for the macro inventory.

### 2.0 Macro shorthand (optional)

```jinja
{# at top of template — import only what you use #}
{% from '_components/kpi.html' import kpi_group, kpi_cell %}
{% from '_components/empty_state.html' import empty_state %}
{% from '_components/badge.html' import badge %}
{% from '_components/filter_bar.html' import filter_bar, filter_select %}
```

| Macro | Renders | Use when |
|---|---|---|
| `kpi_group(cols=3\|6)` + `kpi_cell(label, value, unit, icon, meta, tone, action, data_attr)` | §2.1 KPI block | 2–6 simple cells, no JSX-heavy action button. Pass `tone='danger'\|'success'\|'muted'\|'blue'\|'purple'\|'warn'`. Icon is **lucide name** (default). For cells with complex actions, prefer raw HTML. |
| `empty_state(title, desc, icon, compact)` + `{% call %}…{% endcall %}` for CTA button | §2.3/§2.4 `vc-empty` block | Always cleaner than raw — 4 args replace ~10 lines. CTA button goes inside the `{% call %}` block. |
| `badge(text, tone, dot, icon, size)` | `<span class="vc-badge vc-badge-{tone}">` | When a row has just one fixed status badge. For `{% if status == 'X' %}…{% elif %}` chains, raw inline is still clearer. |
| `filter_bar(action, method, form_id)` + `filter_select(name, label, options, current, placeholder)` + `filter_date(name, label, value)` | §2.2 filter bar | Selects with tuple/dict option lists. **Skip the macro** when you need custom-rendered options (e.g. Buddhist year transform, "ทั้งปี" sentinel option) — raw HTML stays clearer. |

**Rule:** macros are a shorthand layer, not a requirement. The canonical
admin page (`admin_fuel.html`) keeps KPI / filter / pivot **raw** so
copy-paste workflows from §5 still work; it uses `empty_state` macro
because that one is a strict win. When in doubt, use raw.

### 2.1 KPI Group (3 cells)

```html
<div class="vc-card" style="margin-bottom: var(--vc-space-4);">
    <div class="vc-kpi-group">

        <div class="vc-kpi-cell">
            <p class="vc-kpi-label">
                <i data-lucide="<ICON>" class="vc-icon-sm"></i>
                <LABEL>
            </p>
            <p class="vc-kpi-value">
                {{ '{:,.0f}'.format(<VALUE>) }}<span class="vc-kpi-unit"><UNIT></span>
            </p>
            <p class="vc-kpi-meta"><META_LINE></p>
            {# Optional bottom action — only if this cell has a setting #}
            <div class="vc-kpi-action">
                <button type="button" class="vc-btn vc-btn-ghost vc-btn-sm" data-action="<KEY>" title="<TITLE>">
                    <i data-lucide="settings-2" class="vc-icon-sm"></i>
                    ตั้งค่า
                </button>
            </div>
        </div>

        <!-- repeat .vc-kpi-cell × 2 more -->

    </div>
</div>
```

**Value modifier classes** (add to `.vc-kpi-value`):
- `vc-kpi-value--danger` → ติดลบ / over budget
- `vc-kpi-value--success` → เหลือใช้ได้ / positive
- `vc-kpi-value--muted` → ศูนย์ / empty / informational

Example: `<p class="vc-kpi-value {% if x < 0 %}vc-kpi-value--danger{% elif x == 0 %}vc-kpi-value--muted{% endif %}">`

### 2.2 Filter Bar

```html
<form method="get" action="{{ url_for('<BLUEPRINT>.<ROUTE>') }}" class="vc-filter-bar" id="filterForm">
    <div class="vc-filter-group">
        <span class="vc-filter-label">ปี</span>
        <select name="year" class="vc-filter-select">
            {% for y in range(f_year, f_year - 5, -1) %}
            <option value="{{ y }}" {% if y == f_year %}selected{% endif %}>{{ y + 543 }}</option>
            {% endfor %}
        </select>
    </div>
    <div class="vc-filter-group">
        <span class="vc-filter-label">เดือน</span>
        <select name="month" class="vc-filter-select">
            <option value="0" {% if f_month == 0 %}selected{% endif %}>ทั้งปี</option>
            {% for m in range(1, 13) %}
            <option value="{{ m }}" {% if m == f_month %}selected{% endif %}>{{ TH_MONTHS[m-1] }}</option>
            {% endfor %}
        </select>
    </div>
    <!-- more filter groups -->
    <div class="vc-filter-actions">
        {% if f_month or f_veh %}
        <a href="{{ url_for('<BLUEPRINT>.<ROUTE>', year=f_year) }}" class="vc-btn vc-btn-ghost vc-btn-sm" title="ล้าง filter">
            <i data-lucide="x" class="vc-icon-sm"></i>
            ล้าง
        </a>
        {% endif %}
        <noscript>
            <button type="submit" class="vc-btn vc-btn-secondary vc-btn-sm">
                <i data-lucide="filter" class="vc-icon-sm"></i>
                กรอง
            </button>
        </noscript>
    </div>
</form>
```

Filter bar auto-submits on `<select>` change via existing vehicle_admin.js — do not add JS for that.

### 2.3 Data Table (with card head + empty fallback)

```html
<div class="vc-card" id="<ID>Card">
    <div class="vc-card-head">
        <h3 class="vc-card-head-title">
            <i data-lucide="<ICON>" class="vc-icon-sm"></i>
            <SECTION_TITLE>
            <span class="vc-card-head-meta">{{ items|length }} รายการ</span>
        </h3>
        <div class="vc-card-head-actions">
            <button type="button" class="vc-btn vc-btn-primary vc-btn-sm" data-action="<KEY>-create" title="<TITLE>">
                <i data-lucide="plus" class="vc-icon-sm"></i>
                เพิ่มรายการ
            </button>
        </div>
    </div>

    {% if items %}
    <div class="table-responsive">
        <table class="vc-table mb-0">
            <thead>
                <tr>
                    <th>วันที่</th>
                    <th>ชื่อ</th>
                    <th class="text-end">จำนวน</th>
                    <th>สถานะ</th>
                    <th class="vc-table-actions"></th>
                </tr>
            </thead>
            <tbody>
                {% for it in items %}
                <tr data-id="{{ it.id }}">
                    <td class="vc-td-muted">
                        {%- if it.date -%}
                        {{ '%02d'|format(it.date.day) }} {{ TH_MONTHS[it.date.month - 1] }} {{ it.date.year + 543 }}
                        {%- else -%}—{%- endif -%}
                    </td>
                    <td class="vc-td-strong">{{ it.name or '—' }}</td>
                    <td class="vc-td-num vc-td-strong">{{ '{:,.2f}'.format(it.amount) }}</td>
                    <td>
                        {% if it.status == 'รอ' %}
                            <span class="vc-badge vc-badge-warning vc-badge-dot">รอ</span>
                        {% elif it.status == 'อนุมัติ' %}
                            <span class="vc-badge vc-badge-blue vc-badge-dot">อนุมัติ</span>
                        {% elif it.status == 'เสร็จ' %}
                            <span class="vc-badge vc-badge-success vc-badge-dot">เสร็จ</span>
                        {% endif %}
                    </td>
                    <td class="vc-table-actions">
                        <button type="button" class="vc-btn vc-btn-ghost vc-btn-icon vc-btn-sm" data-action="<KEY>-edit" title="แก้ไข">
                            <i data-lucide="more-horizontal" class="vc-icon-sm"></i>
                        </button>
                    </td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>
    {% else %}
    <div class="vc-empty">
        <div class="vc-empty-icon">
            <i data-lucide="<EMPTY_ICON>" style="width:20px;height:20px;"></i>
        </div>
        <p class="vc-empty-title">ยังไม่มี<NOUN></p>
        <p class="vc-empty-desc"><GUIDANCE></p>
        <button type="button" class="vc-btn vc-btn-primary vc-btn-sm" data-action="<KEY>-create" title="<TITLE>">
            <i data-lucide="plus" class="vc-icon-sm"></i>
            เพิ่มรายการแรก
        </button>
    </div>
    {% endif %}
</div>
```

### 2.4 List Card with Collapsible Details (right column)

```html
<div class="vc-card">
    <div class="vc-card-head">
        <h3 class="vc-card-head-title">
            <i data-lucide="<ICON>" class="vc-icon-sm"></i>
            <SECTION_TITLE>
            <span class="vc-card-head-meta">{{ items|length }} ใบ</span>
        </h3>
    </div>

    {% if items %}
    <ul class="vc-list">
        {% for it in items %}
        <li class="vc-list-item">
            <details class="vc-collapse">
                <summary>
                    <div class="vc-collapse-main">
                        <div class="vc-collapse-title">
                            <span class="vc-td-strong">{{ it.title }}</span>
                            <span class="vc-badge vc-badge-blue vc-badge-dot">{{ it.status }}</span>
                        </div>
                        <div class="vc-collapse-meta">
                            {{ '%02d'|format(it.date.day) }} {{ TH_MONTHS[it.date.month - 1] }}
                            <span class="vc-dot-sep">·</span>
                            <span class="vc-mono">{{ '{:,.0f}'.format(it.amount) }}</span>&nbsp;฿
                        </div>
                    </div>
                    <i data-lucide="chevron-down" class="vc-icon-sm vc-collapse-chevron"></i>
                </summary>

                <div class="vc-collapse-body">
                    <dl class="vc-meta-grid">
                        <dt>ผู้ส่ง</dt><dd>{{ it.sender or '—' }}</dd>
                        <dt>หมายเหตุ</dt><dd>{{ it.note or '—' }}</dd>
                    </dl>

                    <div class="vc-action-row">
                        <button type="button" class="vc-btn vc-btn-primary vc-btn-sm" data-action="<KEY>-approve" data-id="{{ it.id }}" title="อนุมัติ">
                            <i data-lucide="check" class="vc-icon-sm"></i>
                            อนุมัติ
                        </button>
                        <button type="button" class="vc-btn vc-btn-secondary vc-btn-sm" data-action="<KEY>-edit" data-id="{{ it.id }}" title="แก้ไข">
                            <i data-lucide="pencil" class="vc-icon-sm"></i>
                            แก้ไข
                        </button>
                        <button type="button" class="vc-btn vc-btn-danger vc-btn-sm" data-action="<KEY>-delete" data-id="{{ it.id }}" title="ลบ">
                            <i data-lucide="trash-2" class="vc-icon-sm"></i>
                            ลบ
                        </button>
                    </div>
                </div>
            </details>
        </li>
        {% endfor %}
    </ul>
    {% else %}
    <div class="vc-empty"> <!-- same empty pattern as 2.3 --> </div>
    {% endif %}
</div>
```

### 2.5 Two-column grid (table left 8, list right 4)

```html
<div class="<PAGE>-grid-2">
    <!-- left: table card from 2.3 -->
    <!-- right: list card from 2.4 -->
</div>
```

CSS:
```css
.<PAGE>-grid-2 {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--vc-space-4);
}
@media (max-width: 1199px) {
    .<PAGE>-grid-2 { grid-template-columns: 1fr; }
}
```

---

## 3. Lookup Tables

### 3.1 Class → meaning (most-used)

| Class | Purpose | Where |
|---|---|---|
| `vc-scope` | Enables vc-* design | `<main>` only |
| `vc-card` | Any surface container | wraps every section |
| `vc-card-head` | Card title row | first child of vc-card |
| `vc-card-head-title` | h3 with icon | inside vc-card-head |
| `vc-card-head-meta` | Subtle count "12 รายการ" | inside title h3 |
| `vc-card-head-actions` | Right-side button cluster | sibling of title |
| `vc-kpi-group` | Container for KPI cells | inside vc-card |
| `vc-kpi-cell` | One KPI panel | repeats inside group |
| `vc-kpi-label` | Top text + icon | inside cell |
| `vc-kpi-value` | Big number | inside cell |
| `vc-kpi-unit` | "บาท" / "ครั้ง" small unit | inside value |
| `vc-kpi-meta` | One-line context below number | inside cell |
| `vc-kpi-action` | Bottom button (settings) | optional, inside cell |
| `vc-filter-bar` | Filter row container | one per page |
| `vc-filter-group` | One label + select pair | repeats in bar |
| `vc-filter-label` | Small label above select | inside group |
| `vc-filter-select` | Styled `<select>` | inside group |
| `vc-filter-actions` | Right slot (clear/apply) | last in bar |
| `vc-table` | Styled table | inside .table-responsive |
| `vc-table-sm` | Compact table | nested tables |
| `vc-table-check` | Checkbox column | first th/td |
| `vc-table-actions` | Action column | last th/td |
| `vc-td-strong` | Primary text cell | name / amount |
| `vc-td-muted` | Secondary text cell | date / id |
| `vc-td-num` | Right-aligned number | money columns |
| `vc-mono` | Monospace font | money / ID strings |
| `vc-badge` | Status pill base | always combine with color |
| `vc-badge-warning` | Yellow — รอ / pending | combine with vc-badge-dot |
| `vc-badge-blue` | Blue — อนุมัติ / in-progress | combine with vc-badge-dot |
| `vc-badge-success` | Green — เสร็จ / done | combine with vc-badge-dot |
| `vc-badge-danger` | Red — ปฏิเสธ / failed | combine with vc-badge-dot |
| `vc-badge-neutral` | Gray — ยกเลิก / generic | combine with vc-badge-dot |
| `vc-badge-dot` | Adds left dot | always use with status |
| `vc-btn` | Button base | combine with variant |
| `vc-btn-primary` | Black solid | one per area max |
| `vc-btn-secondary` | Border only | cancel / secondary |
| `vc-btn-ghost` | Transparent | icon-only / clear |
| `vc-btn-danger` | Red border→fill | delete / reject |
| `vc-btn-sm` | Small size | inside cards |
| `vc-btn-icon` | Square icon-only | with `more-horizontal` |
| `vc-empty` | Empty state container | every `{% else %}` branch |
| `vc-empty-icon` | Icon circle | first child |
| `vc-empty-title` | Headline text | second child |
| `vc-empty-desc` | Sub text | third child |
| `vc-list` | List card body | `<ul>` |
| `vc-list-item` | List row | `<li>` |
| `vc-collapse` | Expandable detail | `<details>` |
| `vc-collapse-main` | Summary content wrapper | inside `<summary>` |
| `vc-collapse-title` | Top line of summary | name + badge |
| `vc-collapse-meta` | Subtitle of summary | date · count · sum |
| `vc-collapse-chevron` | Rotating arrow | last in summary |
| `vc-collapse-body` | Expanded panel | after summary |
| `vc-meta-grid` | `<dl>` 2-col key-value | inside collapse body |
| `vc-action-row` | Bottom button row | inside collapse body |
| `vc-dot-sep` | "·" separator | between meta items |
| `vc-stack` | Vertical stack | wraps alerts |
| `vc-icon-sm` | 16px lucide icon | every icon inside vc-scope |
| `vc-fg-subtle` | (token) muted text color | placeholders / "—" |
| `ds-alert` + `ds-alert-{cat}` | Flash banner | only for flash messages |

### 3.2 Tokens (just the ones you'll use)

| Token | Value | Use for |
|---|---|---|
| `--vc-space-2` | 8px | inside-button gap |
| `--vc-space-3` | 12px | small padding |
| `--vc-space-4` | 16px | card padding / card→card gap |
| `--vc-space-5` | 20px | section spacing |
| `--vc-space-6` | 24px | between major sections |
| `--vc-border` | #EAEAEA | normal divider (default border) |
| `--vc-border-hover` | #999999 | hover state divider |
| `--vc-accent` | #4F46E5 | secondary CTA / focus ring tint / sidebar active |
| `--vc-primary` | #000000 | primary CTA (Vercel black) |
| `--vc-fg` | #000000 | h1/h2/h3 / strong body |
| `--vc-fg-muted` | #666666 | paragraph / muted body |
| `--vc-fg-subtle` | #888888 | label / meta / "—" / placeholders |
| `--vc-radius-xs` | 4px | button / badge / input |
| `--vc-radius-sm` | 6px | card / nav |
| `--vc-radius-md` | 8px | modal / larger surface |
| `--vc-focus-ring` | (2px outline) | only allowed "shadow" — focus state |

**Never** write a hex color in any template or page CSS. Use a token.

> **Token namespace rule:** Use **`--vc-*` only**. `--ds-*` is legacy (Indigo-era) and will be retired in Phase 5 cleanup ([roadmap](../../docs/notes/log/2026-05-14_frontend-architecture-plan.md)) — already removed from canonical examples here. If you see `var(--ds-*)` in an existing file, leave it alone unless you're explicitly migrating that page (don't mix add-ds + add-vc in the same change). Migration map → [design_system.md §14](../../docs/notes/design_system.md).

### 3.3 Status → badge color (memorize this)

| Thai status | Color class | Lucide alt icon |
|---|---|---|
| รอ / รอเบิก / รออนุมัติ / pending | `vc-badge-warning` | `clock` |
| อนุมัติ / กำลังดำเนินการ / approved | `vc-badge-blue` | `circle-check` |
| เสร็จ / ได้เงิน / สำเร็จ / done | `vc-badge-success` | `check` |
| ปฏิเสธ / ล้มเหลว / over budget | `vc-badge-danger` | `x` |
| ยกเลิก / draft / generic | `vc-badge-neutral` | `minus` |

### 3.4 Lucide icon → meaning (most-used)

| Concept | Icon |
|---|---|
| Add / new | `plus` |
| Edit | `pencil` |
| Delete | `trash-2` |
| Approve / done | `check` |
| Settings | `settings-2` |
| Filter | `filter` |
| Clear filter | `x` |
| Download | `download` |
| Money | `banknote` / `circle-dollar-sign` |
| Wallet / reserve | `wallet` |
| Receipt / bill | `receipt` / `receipt-text` |
| Document | `file-text` |
| Target / goal | `target` |
| Up trend / used | `trending-up` |
| Piggy bank / remaining | `piggy-bank` |
| Grid / pivot | `grid-3x3` |
| Combine / merge | `combine` |
| More action menu | `more-horizontal` |
| Expand | `chevron-down` |

If unsure, search lucide.dev — never use Font Awesome inside `vc-scope`.

---

## 4. Decision Tables

### 4.1 "I need to show X" → use Y

| User-shown data | Component |
|---|---|
| 2–4 single-number metrics | KPI group (§2.1) |
| Many rows of records | Data table (§2.3) |
| Few rows, each with deep detail | List card + collapse (§2.4) |
| Year × month breakdown | Pivot table (see admin_fuel.html:230) |
| Filters | Filter bar (§2.2), one per page |
| One-time message after action | `ds-alert` flash (already in skeleton) |
| Empty list/table | `vc-empty` (built into §2.3/§2.4) |
| Settings / forms | Modal partial — never inline form on page |

### 4.2 "How many buttons / what variants?"

| Position | Primary | Secondary | Ghost | Danger |
|---|---|---|---|---|
| Page header right | 1 max | 0–2 | 0 | 0 |
| Card head actions | 1 max | 0–2 | 0–1 | 0 |
| KPI cell action | 0 | 0 | 1 (settings) | 0 |
| Table row actions | 0 | 0 | 1 (`more-horizontal` only) | 0 |
| Collapse action row | 1 | 1 | 0 | 1 |
| Modal footer | 1 (save) | 1 (cancel) | 0 | 1 if applicable |

Rule: never two primary buttons next to each other.

### 4.3 "What goes in page CSS file vs vehicle.css"

| Style | File |
|---|---|
| `vc-*` class behavior | already in vehicle.css — do not redefine |
| Page header (`.<PAGE>-header`, title, subtitle) | `<PAGE>.css` |
| Page grid (`.<PAGE>-grid-2`) | `<PAGE>.css` |
| Page-only one-off classes | `<PAGE>.css` |
| Token value | design-system.css — do not touch from page |
| Any `box-shadow` | nowhere (only `--vc-focus-ring` allowed) |
| Any color hex | nowhere — use a token |

---

## 5. Common Tasks — step-by-step recipes

### 5.1 "Create a new admin page like fuel"

1. Copy `app/templates/vehicle/admin/admin_fuel.html` → `app/templates/.../<page>.html`.
2. Rename in the copy: `fuel-header` → `<page>-header`, `fuel-title` → `<page>-title`, etc. (4 classes).
3. Delete content sections you don't need. Keep the **page skeleton** (§1) intact.
4. Replace KPI cells, table columns, list items with your data. Use §2 templates.
5. Copy `app/static/css/fuel_admin.css` → `app/static/css/<page>.css`. Replace `fuel-` prefix with `<page>-`. Delete page-specific rules you don't need.
6. Update `<link>` in the new template to load `<page>.css` as the last CSS file.
7. Add the route in the relevant blueprint and update `INDEX.md` § Routes + § Templates.
8. Run §6 self-check.

### 5.2 "Make page X look like fuel admin"

1. Open `<page>.html`.
2. Compare to admin_fuel.html section by section, top to bottom.
3. For each section, find the matching §2 template here and rewrite the markup. Do not edit visual styles inline — let `vc-*` classes do the work.
4. Move all inline `<style>` to `<page>.css`. Move all inline `<script>` to `<page>.js`.
5. Replace every hardcoded date string with the TH_MONTHS pattern.
6. Replace every status text with a `vc-badge`.
7. Replace every "ไม่มีข้อมูล" with `vc-empty`.
8. Replace every Font Awesome icon inside `vc-scope` with Lucide.
9. Run §6 self-check.

### 5.3 "Add a new section to an existing admin page"

1. Identify the section type from §4.1.
2. Find the closest matching example in admin_fuel.html (or another `vc-scope` page).
3. Copy the markup, change content only.
4. If the section needs page-specific CSS, add it to `<page>.css`, never `vehicle.css`.
5. Run §6 self-check on the new section.

### 5.4 "Review this template for design consistency"

1. Read the template top to bottom.
2. Build a list of every violation against §0 (the 10 hard rules) **and** §3.1 (class vocabulary).
3. Output the review table from §7. One row per issue.
4. End with a one-line verdict.
5. Do **not** rewrite the file unless asked.

---

## 6. Self-Check — run before reporting any page is done

Read the template you produced and answer YES/NO for each:

1. `<main class="main-content vc-scope">` present?
2. CSS link order is `bootstrap → fontawesome → bootstrap-icons → Sarabun → design-system → vehicle_admin → vehicle → <page>`?
3. Every `<div>` that visually looks like a card uses `class="vc-card"`?
4. Every `<button>` and `<a class="vc-btn">` has `title="..."`?
5. Every icon inside `<main class="vc-scope">` uses `<i data-lucide="..." class="vc-icon-sm"></i>`?
6. Every empty branch uses `<div class="vc-empty">` with icon + title + desc + CTA? (raw or via `empty_state` macro — both fine)
7. Every number column has `text-end` on `<th>` and `vc-td-num` on `<td>`?
8. Every money value uses `vc-mono` and `{:,.2f}` or `{:,.0f}` formatting?
9. Every date uses the TH_MONTHS + `year + 543` pattern?
10. Every `<table>` is inside `<div class="table-responsive">`?
11. Every status is a `<span class="vc-badge vc-badge-COLOR vc-badge-dot">`?
12. Zero `<style>` tags inside the template? Zero `<script>` tags (other than the two at the bottom for bootstrap bundle + page JS)?
13. Zero `#hex` color literals in template attributes?
14. Page-specific CSS lives in `app/static/css/<page>.css`, not in the template?
15. INDEX.md updated if routes/templates/CSS files changed?

If any answer is NO, fix it. Don't ship a partial.

---

## 7. Review Output Format

When reviewing, output **one markdown table** — never bullets, never prose paragraphs.

| Where | Now | Should be | Why |
|---|---|---|---|
| `foo.html:42` | `<div class="my-card">` | `<div class="vc-card">` | §0 rule 2 — every surface uses `vc-card` |
| `foo.html:88` | `<table class="table">` | `<table class="vc-table">` inside `.table-responsive` | §0 rule 8 — table must be in responsive wrapper |
| `foo.css:12` | `color: #888888;` | `color: var(--vc-fg-subtle);` | §3.2 — never hardcode hex |
| `foo.html:120` | `<i class="fa-solid fa-plus"></i>` | `<i data-lucide="plus" class="vc-icon-sm"></i>` | §0 rule 4 — inside vc-scope use Lucide |
| `foo.html:155` | text "ไม่มีข้อมูล" | full `vc-empty` block from §2.3 | §0 rule 5 — empty state must be styled |

End with verdict:

> **Verdict:** matches BBCenter DNA / needs revision in N spots / off-system, rebuild from §5.2

---

## 8. When the user wants something off-system

If asked to add a shadow, a colored card border, a non-Sarabun font, a
new color, or anything that breaks §0:

1. Say which rule it breaks and what the within-system alternative is.
2. Offer the alternative as default.
3. If the user insists, do it but add this comment above the override:

```html
{# DESIGN-OVERRIDE: <one-line reason from user> — date YYYY-MM-DD #}
```

So future reviewers know it was intentional, not drift.
