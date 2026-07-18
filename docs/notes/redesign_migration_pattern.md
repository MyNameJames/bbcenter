# Redesign Migration Pattern — หน้าเก่า (legacy CSS) → bb-* ล้วน

> **ใช้เมื่อ:** redesign หน้าที่มีอยู่แล้วให้เลิกใช้ legacy CSS (`design-system.css` / `<domain>.css` / `<domain>_admin.css` ฯลฯ) เปลี่ยนไปใช้ `core/css/components.css` + `core/css/gallery.css` (`bb-*`) ล้วน
> **ไม่ใช้เมื่อ:** สร้างหน้าใหม่ตั้งแต่ต้น → ไปที่ [page_pattern.md](page_pattern.md) แทน
> design target (token/สี/spacing) → [design_guideline.md](design_guideline.md) · component lookup → skill `component-guide`
>
> ⚠️ **นี่คือ process (ทำทีละขั้นตอน) ไม่ใช่ spec** — ถ้าหา token/สี/ค่ามาตรฐาน ไปที่ design_guideline.md แทน

---

## Scope

**อยู่ใน pattern นี้ (ทำเหมือนกันทุกหน้า):**
- Step 0 — Include check
- Step 1 — Head: สลับ CSS stack
- Step 2 — Body shell: จับโครงให้ตรง reference หน้าใหม่ล่าสุดที่ migrate เสร็จแล้ว (เช่น `vehicle_mileage.html`)

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

## Step 1 — Head: สลับ CSS stack

ลบ `<link>` CSS เก่าเฉพาะ **ในหน้าที่ redesign** (ไม่แตะ/ไม่ลบไฟล์ CSS จริง — ไฟล์เหล่านั้น share กับหน้าอื่นเสมอ) เหลือชุดเดียวกับ reference หน้าที่ migrate เสร็จแล้ว:

```diff
- <link rel="stylesheet" href="{{ url_for('static', filename='core/css/design-system.css') }}">
- <link rel="stylesheet" href="{{ url_for('static', filename='vehicle/css/vehicle.css') }}">
- <link rel="stylesheet" href="{{ url_for('static', filename='vehicle/css/vehicle_fuel.css') }}">
- <link rel="stylesheet" href="{{ url_for('static', filename='vehicle/css/vehicle_admin.css') }}">
  <link href="{{ url_for('static', filename='vendor/bootstrap/css/bootstrap.min.css') }}" rel="stylesheet">
  <link rel="stylesheet" href="{{ url_for('static', filename='vendor/fontawesome/css/all.min.css') }}">
  <link rel="stylesheet" href="{{ url_for('static', filename='vendor/bootstrap-icons/bootstrap-icons.min.css') }}">
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{{ url_for('static', filename='core/css/components.css') }}">
  <link rel="stylesheet" href="{{ url_for('static', filename='core/css/gallery.css') }}">
```

**ผลลัพธ์ทันทีหลัง step นี้:** element ที่ยังใช้ class เก่า (`vc-*`/`bl-*`/`va-*`/domain-prefix อื่นๆ) จะดู **ไม่มีสไตล์ (browser default)** — นี่คือเรื่องปกติ ไม่ใช่ bug ไม่กระทบ JS function เลย (CSS ไม่เกี่ยวกับ `querySelector`/`addEventListener`/`onclick`/id — ปุ่มยังกดได้ modal ยังเปิดปิดได้ปกติทุกอย่าง) แค่ "หน้าตา" เท่านั้นที่รอ reskin ต่อใน step ถัดไป (นอก scope pattern นี้)

---

## Step 2 — Body shell: จับโครงให้ตรง reference

```diff
- <main class="main-content vc-scope">
-     {% set page_section = 'ผู้ดูแลระบบ' %}
-     {% set page_title = 'ชื่อหน้า' %}
-     {% include '_shared/header.html' %}
-     <div class="container-xxl px-4 pt-3 pb-5">
+ {% set page_section = 'ผู้ดูแลระบบ' %}
+ {% set page_title = 'ชื่อหน้า' %}
+ <div class="d-xl-none">
+     {% include '_shared/header.html' %}
+ </div>
+ <div class="container-fluid">
+     <div class="sidebar-overlay" id="sidebarOverlay"></div>
+     {% set active_menu = '<menu-key>' %}
+     {% include '_shared/sidebar.html' %}
+     <main class="bb-sidebar-main">
+         <div class="container-xxl">
+             <div class="d-none d-xl-block px-1 pt-4">
+                 <h1 class="m-0 fw-bold" style="font-size:1.625rem;letter-spacing:-.02em;color:var(--bb-str)">ชื่อหน้า</h1>
+             </div>
```

Flash messages → ใช้ pattern เดียวกันทุกหน้า (คัดลอกได้เลย ไม่ต้องดัดแปลง):

```jinja
{% with messages = get_flashed_messages(with_categories=true) %}
{% if messages %}
<div class="mb-3">
    {% for category, message in messages %}
    {% set _co = {'success':'ok','danger':'dg','warning':'wr','info':'info'}.get(category, 'info') %}
    <div class="bb-callout is-{{ _co }}">{{ message }}</div>
    {% endfor %}
</div>
{% endif %}
{% endwith %}
```

**เช็คให้ลบด้วยเสมอ:** class scoping/spacing เก่าที่ค้างอยู่บน `<main>`/`<div class="container-xxl">` เช่น `vc-scope` (ล็อก font-size 14px + สี legacy ทั้ง subtree — สาเหตุหลักที่หน้า migrate แล้ว font/spacing ไม่ตรง reference), `p-md-3 p-2` ที่ reference ไม่มี

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
[ ] Step 1: เหลือ CSS link เท่า reference (bootstrap/fontawesome/bootstrap-icons/font×2/components.css/gallery.css)
[ ] Step 2: โครง body ตรง reference (bb-sidebar-main/container-xxl/flash=bb-callout) + ไม่มี vc-scope/spacing เก่าค้าง
[ ] ไม่ได้แตะ/ลบไฟล์ CSS จริงที่ share กับหน้าอื่น
[ ] sync docs ตาม Maintenance Protocol (CLAUDE.md) ถ้ามีไฟล์อื่นเปลี่ยน
```
