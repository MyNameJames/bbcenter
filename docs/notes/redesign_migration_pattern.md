# Redesign Migration Pattern — หน้าเก่า (legacy shell + CSS) → UE base + bb-* ล้วน

> **อัปเดต:** 2026-07-21 — target เปลี่ยนเป็น **chrome รุ่นใหม่ `header2` + `sidebar2`** ผ่าน `_base_ue.html` (เดิม pattern นี้พาไปหา `_shared/header.html` + `sidebar.html` + `.bb-sidebar-main` = **ตายแล้ว ห้ามใช้เป็น target อีก**)
>
> **ใช้เมื่อ:** redesign หน้าที่มีอยู่แล้ว ให้เลิก standalone shell + legacy CSS (`design-system.css` / `<domain>.css` / `<domain>_admin.css` ฯลฯ) → `{% extends '_base_ue.html' %}` + `bb-*` ล้วน
> **ไม่ใช้เมื่อ:** สร้างหน้าใหม่ตั้งแต่ต้น → ไปที่ [page_pattern.md](page_pattern.md) แทน
> **reference (default ต้นแบบ):** [`app/templates/vehicle/admin/vehicle_mileage.html`](../../app/templates/vehicle/admin/vehicle_mileage.html) — หน้าแรกที่ migrate ครบ ลอกโครงจากหน้านี้เสมอ
> design target (token/สี/spacing) → [design_guideline.md](design_guideline.md) · component lookup → skill `component-guide`
>
> ⚠️ **นี่คือ process (ทำทีละขั้นตอน) ไม่ใช่ spec** — ถ้าหา token/สี/ค่ามาตรฐาน ไปที่ design_guideline.md แทน

---

## Scope

**อยู่ใน pattern นี้ (ทำเหมือนกันทุกหน้า):**
- Step 0 — Include check
- Step 1 — Chrome + CSS stack: `header2`/`sidebar2` ผ่าน `{% extends '_base_ue.html' %}`
- Step 2 — Body shell: ย้ายเนื้อหาเข้า 5 block ของ base

**ไม่อยู่ใน pattern นี้ (ต่างกันทุกหน้า แล้วแต่เนื้อหา):**
- Reskin card/list/modal/table ภายในหน้า — ทำตาม audit rule (ด้านล่าง) เป็นเคสๆ ไป ไม่มี template ตายตัว

---

## Step 0 — Include check (เช็คก่อนลบ CSS)

grep **เฉพาะตัว template ที่จะแก้** หา `{% include %}` — ไม่ grep เข้าไปในไฟล์ CSS:

```bash
grep -n "{% include" app/templates/<path>/<page>.html
```

ทุก partial ที่ include มา (เช่น modal ที่ share กับหน้าอื่น) = จะเสียหน้าตาไปด้วยถ้ามันพึ่ง CSS ไฟล์ที่กำลังจะลบ (เพราะมันไม่ได้อยู่ใน scope ที่กำลัง reskin) **ไม่ต้องไล่หาว่า partial นั้นพึ่ง CSS บรรทัดไหน/นิยามอยู่ไฟล์ไหน** — รู้แค่ "มันจะดูพัง" ก็พอสำหรับตัดสินใจว่าจะรวม scope เข้ามาด้วยไหม หรือปล่อยไว้เป็น item แยก

> **ตัวอย่างจริง (vehicle_admin.html, 2026-07-04):** เจอ `{% include 'vehicle/modals/vehicle_detail.html' %}` — modal นี้ใช้ `.bk-detail-*` + `--vc-*` ที่นิยามอยู่ใน `vehicle.css` เท่านั้น (share กับ `vehicle.html`) ไม่ได้อยู่ใน scope เดิม → ถามผู้ใช้ก่อนว่าจะ fork เป็น bb-* แยก หรือแก้ไฟล์ share เลย ไม่เดาเอง

**อย่าทำ (เกินความจำเป็น + กิน token):**
```bash
# ❌ ไม่ต้องไล่หา definition ข้ามทุกไฟล์ CSS — ไม่ช่วยตัดสินใจอะไร เพราะยังไงก็ลบ head link ตามที่สั่งอยู่ดี
grep -rn "\-\-vc-fg-subtle" app/static/*/css/*.css
```

---

## Step 1 — Chrome + CSS stack: extends `_base_ue.html`

**ห้าม include `header2`/`sidebar2` เองในหน้า** — `sidebar2` ต้องมี flex parent `.ml2-body-row` และ `header2` ต้องอยู่ใน `.ml2-frame` ซึ่งมีอยู่ใน [`_base_ue.html`](../../app/templates/_base_ue.html) เท่านั้น. ทางเดียวที่ถูก = extends base

บรรทัดแรกของไฟล์:

```jinja
{% extends '_base_ue.html' %}
```

**ลบทิ้งทั้งหมด (base ให้แล้ว):**

| ลบ | เพราะ |
|---|---|
| `<!DOCTYPE>` · `<html>` · `<head>` · `<body>` | base ครอบให้ |
| `<link>` CSS ทุกบรรทัด — vendor (bootstrap/fontawesome/bootstrap-icons) · font Sarabun/Inter · `components.css` · `gallery.css` | base โหลดครบ + เพิ่ม `ue.css` |
| `<link>` legacy — `design-system.css` · `<domain>.css` · `<domain>_admin.css` | ไม่ใช้แล้ว (**ไม่แตะ/ไม่ลบไฟล์ CSS จริง** — share กับหน้าอื่นเสมอ) |
| `{% include '_shared/header.html' %}` + `<div class="d-xl-none">` ที่ห่อมัน | → `header2` (base) |
| `{% include '_shared/sidebar.html' %}` + `{% set active_menu = ... %}` + `<div class="sidebar-overlay">` | → `sidebar2` (base) |
| `<div class="container-fluid">` · `<main class="bb-sidebar-main">` · `<div class="container-xxl">` | → `.ml2-frame`/`.ml2-body-row`/`.ml2-content-inner` (base) |
| `<h2>`/`<h1>` page title ของหน้า + `{% set page_section %}`/`{% set page_title %}` | → `{% block page_title %}` |
| block flash `bb-callout` | base มี flash→toast bridge ให้แล้ว (§Step 2) |
| `<script>` vendor ท้ายไฟล์ — jquery · bootstrap.bundle · `bb-components.js` | base โหลดให้ (+ `ue-motion.js`) |

**เรื่อง chrome รุ่นใหม่ที่ต้องรู้:**
- `sidebar2` = **role-based + active-by-endpoint** อ่าน `current_user` + `request.endpoint` เอง → **ไม่ต้องส่ง `active_menu`**. ถ้าหน้าที่ migrate ยังไม่มีในเมนู → ไปเพิ่มรายการใน [`_shared/sidebar2.html`](../../app/templates/_shared/sidebar2.html) พร้อม `url_for` + เงื่อนไข active (ห้าม hardcode path)
- `header2` = self-contained (โหลด Material Symbols font · notification จริง · stub `window.lucide` · `ms-icons.js`) → **ห้ามโหลด lucide/MS ซ้ำในหน้า**
- icon ในเนื้อหน้าเขียน `<i data-lucide="...">` เหมือนเดิมได้ — `ms-icons.js` แปลงเป็น Material Symbols ให้ runtime

**CSS เฉพาะหน้าที่ยังจำเป็นจริงๆ** (เช่น page-scoped override) → `{% block head %}` ไม่ใช่ `<style>` ลอยกลางไฟล์

**ผลลัพธ์ทันทีหลัง step นี้ (ปกติ ไม่ใช่ bug):**
1. element ที่ยังใช้ class เก่า (`vc-*`/`bl-*`/`va-*`) จะดู **ไม่มีสไตล์ (browser default)** — ไม่กระทบ JS เลย (CSS ไม่เกี่ยวกับ `querySelector`/`onclick`/id ปุ่มยังกดได้ modal ยังเปิดได้) รอ reskin ใน audit rule
2. **สีทั้งหน้าเปลี่ยนเป็นเขียว** เพราะ `ue.css` override token accent ทับ `components.css` → ต้องไล่ดูด้วยตาทุก card/badge/modal ว่าคู่สีไหนอ่านไม่ออก (เขียว `#06C167` = fill เท่านั้น · ตัวหนังสือ/เส้นขอบใช้ `--bb-accent-dk`) → [design_guideline §14](design_guideline.md)

---

## Step 2 — Body shell: ย้ายเนื้อหาเข้า 5 block

โครงเปล่าที่ copy ได้เลย (ลอกจาก reference [`vehicle_mileage.html`](../../app/templates/vehicle/admin/vehicle_mileage.html)):

```jinja
{% extends '_base_ue.html' %}

{% block title %}<title>ชื่อหน้า - BBCenter</title>{% endblock %}
{% block page_title %}ชื่อหน้า{% endblock %}

{% block content %}
{# import macro + เนื้อหาเดิมทั้งหมด (ยังไม่ต้อง reskin) #}
{% endblock %}

{% block modals %}
{# modal ทุกตัว + {% include %} modal partial #}
{% endblock %}

{% block scripts %}
<script>/* data injection: window.XXX_DATA */</script>
<script type="module" src="{{ url_for('static', filename='<domain>/js/<page>.js') }}"></script>
{% endblock %}
```

**กฎวาง block:**
- `page_title` — ใส่แค่ข้อความ base ห่อ `<h1 class="page-title">` ให้ (ปล่อยว่าง = ไม่มี title bar)
- `modals` — modal ต้องอยู่ block นี้ ไม่ใช่ใน `content` (อยู่นอก `.ml2-content` กัน stacking context/overflow)
- `scripts` — data injection `<script>` + JS ของหน้า. **ห้าม inline `<script>` ที่มี logic** (design_guideline) — inject ข้อมูลอย่างเดียว
- `head` — เฉพาะ CSS page-scoped ที่ยังตัดไม่ได้

**Flash:** ไม่ต้องเขียนอะไรในหน้าเลย — base แปลง `get_flashed_messages` → `<script type="application/json" data-bb-toast-flashes>` ให้ `bb-components.js` เด้ง toast. ผลคือ flash **เปลี่ยนจาก callout ในหน้า → toast ลอยล่าง** (behavior change ที่ตั้งใจ) · ถ้าหน้ามี `{{ component(toast_region) }}` เดิม → เช็กว่าซ้ำกับ base ไหมก่อนลบ

**เช็คให้ลบด้วยเสมอ:** class scoping/spacing เก่าที่ค้างบน wrapper เช่น `vc-scope` (ล็อก font-size 14px + สี legacy ทั้ง subtree — สาเหตุหลักที่หน้า migrate แล้ว font ไม่ตรง reference), `px-1 px-md-5`/`p-md-3 p-2` ที่ reference ไม่มี (base มี padding ให้แล้วใน `.ml2-content-inner`)

---

## Audit rule — reskin เนื้อหา (นอก scope step 1-2, ทำเป็นเคสๆ)

หลัง step 1-2 เสร็จ ทุก legacy class ที่ยังเหลือในหน้า (card/list/modal/table) ให้ตรวจผ่าน skill **`component-guide`** (class → component reverse lookup):

- เจอ match → migrate เป็น `bb-*` ตัวนั้น ตาม signature ใน `CHEATSHEET.md`
- **ไม่เจอ match → ห้ามสร้าง CSS/component ใหม่เอง** — ใส่ในลิสต์ "missing" แล้วหยุดตรงนั้น รอตัดสินใจว่าจะเพิ่มเข้า gallery ก่อนไหม (`component-guide` skill มี guard นี้อยู่แล้ว: "ไม่ match = จบทันที ห้ามเดา ห้ามค้นต่อ")

ไม่มี pattern ตายตัวสำหรับขั้นนี้ เพราะ card/modal/list แต่ละหน้าประกอบจาก atom (`bb-badge`/`bb-status`/`bb-btn`/`bb-timeline`/`bb-avatar` ฯลฯ) ต่างกันตามเนื้อหาจริงของหน้านั้น

---

## Token guard — สรุปสิ่งที่ห้ามทำระหว่าง migrate (กันกิน token เกิน)

| อย่าทำ | ทำแทนด้วย |
|---|---|
| grep หา definition ของ token/class ข้ามทุกไฟล์ CSS ก่อนตัดสินใจลบ | เชื่อ step 0 (include check) พอ — ลบได้เลยตามที่สั่ง ไม่กระทบ JS |
| Read ไฟล์ template/JS ยาวเป็นพันบรรทัดทั้งไฟล์ ทั้งที่รู้ line แล้ว | `grep -n` หา line ก่อน → Read เฉพาะ `offset`+`limit` ช่วงนั้น |
| grep/ค้นเองข้าม >3 ไฟล์ที่ scope ไม่ชัด | spawn subagent `Explore` แทน (ผลลัพธ์ยาวไปตกที่ subagent ไม่ใช่ context หลัก) |

---

## Checklist ก่อน mark เสร็จ (step 1-2 เท่านั้น — step reskin เนื้อหาเช็คแยกตาม task)

```
[ ] Step 0: grep {% include %} ในหน้า → list partial ที่ได้รับผลกระทบ ถามผู้ใช้ถ้ามีของนอก scope
[ ] Step 1: บรรทัดแรก = {% extends '_base_ue.html' %} · ไม่เหลือ head/link CSS/script vendor/include header|sidebar เก่า
[ ] Step 1: หน้านี้มีในเมนู sidebar2 + active ตรง endpoint (ไม่ได้ส่ง active_menu)
[ ] Step 2: เนื้อหาอยู่ครบใน 5 block (title/page_title/content/modals/scripts) · modal ไม่ตกค้างใน content
[ ] Step 2: ไม่มี block flash เดิม (base เป็น toast) · ไม่มี vc-scope/spacing เก่าค้างบน wrapper
[ ] ตาดู: token เขียวจาก ue.css ไม่ทำให้ตัวหนังสือ/เส้นขอบอ่านไม่ออก (accent = fill เท่านั้น)
[ ] ไม่ได้แตะ/ลบไฟล์ CSS จริงที่ share กับหน้าอื่น
[ ] sync docs ตาม Maintenance Protocol (CLAUDE.md) ถ้ามีไฟล์อื่นเปลี่ยน
```
