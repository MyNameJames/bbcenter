# Modal Pattern — 1 Modal หลายโหมด (Add/Edit รวมกัน)

> **ต้นแบบ:** `#bookingModal` ([vehicle/modals/vehicle_book.html](../../app/templates/vehicle/modals/vehicle_book.html)) — ดูโครง header/field/footer มาตรฐานที่ [design_guideline.md](design_guideline.md) §13b ก่อน (เอกสารนี้ต่อยอดเฉพาะส่วน "1 modal สลับโหมด add/edit" ไม่ซ้ำเนื้อหา §13b)
> **ตัวอย่างจริง:** `#addVehicleModal` — merge `editVehicleModal` เข้า `addVehicleModal` ([vehicle_fleet.html:343](../../app/templates/vehicle/admin/vehicle_fleet.html#L343) + [vehicle_fleet.js:35](../../app/static/vehicle/js/vehicle_fleet.js#L35)) · `#addDriverModal` — merge `editDriverModal` เข้า `addDriverModal` ในไฟล์เดียวกัน (data บน parent row + ไฟล์แนบ — ดู variations ด้านล่าง) — ทั้งคู่ 2026-07-31
> clean-code/doc-sync rules → [CLAUDE.md](../../CLAUDE.md) (ไม่เขียนซ้ำที่นี่)

---

## เมื่อไหร่ใช้ pattern นี้

รวม add-modal กับ edit-modal เป็นตัวเดียว แทนแยก 2 modal ที่ฟอร์มซ้ำกันเกือบหมด — ใช้เมื่อ:
- field ของ add กับ edit เหมือนกัน ≥80% (ต่างแค่ title/ค่า prefill/section เสริมบางส่วน)
- ทุก trigger เป็น DOM element จริงเสมอ (ปุ่ม "เพิ่ม" ใน toolbar · ปุ่ม "แก้ไข" ต่อแถวในตาราง) — ไม่มีจุดไหนต้องเปิด modal จาก JS ที่ไม่มี element ต้นทาง (เช่น auto-open หลัง fetch เสร็จ)

**ไม่เข้าเงื่อนไข → อย่าใช้ pattern นี้:** ถ้าต้องเปิด modal แบบเดียวกันจาก JS หลายจุดที่ไม่มีปุ่มต้นทาง ให้ใช้ pattern ของ `#bookingModal` แทน (expose `bkSetMode('create'|'edit')` + `openBookingModal()`/`openEditBookingModal()` เป็นฟังก์ชันเรียกจากที่ไหนก็ได้) — ซับซ้อนกว่าแต่จำเป็นเมื่อไม่มี relatedTarget ให้อ่าน

---

## ต้องสร้างอย่างไร (recipe 7 ขั้น)

### 1. โครง HTML — modal เดียว ไม่มีปุ่มปิด X

```html
<div class="modal fade" id="xxxModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="card modal-content border-0">
      <form action="/admin/xxx" method="POST">
        <input type="hidden" name="action" value="add_x" id="x_action">
        <input type="hidden" name="entity_id" id="x_entity_id" value="">
```

- wrapper = `.card.modal-content.border-0` (**ไม่ใช่** `.bb-modal-overlay`/`.bb-modal` ตาม §12 spec ของ guideline — ยึด pattern ที่พิสูจน์แล้วใน `#bookingModal` แทน spec ที่ยังไม่มีโค้ดจริงรองรับ)
- `.modal-dialog-centered` เสมอ · **ห้าม** ปุ่มปิด X — ปิดผ่าน "ยกเลิก"/backdrop เท่านั้น (design_guideline.md §13b)
- hidden `action` แยกค่า add/edit ให้ backend route branch ถูก (`add_vehicle`/`edit_vehicle`)
- hidden `entity_id` ว่างตอน add, ใส่ id ตอน edit

### 2. Header ข้อความ dynamic

```html
<div id="xModalEyebrow">#แบบฟอร์ม</div>
<div id="xModalTitle">เพิ่ม...ใหม่</div>
<div id="xModalSubtitle">กรอกข้อมูล...</div>
```
JS สลับ 3 บรรทัดนี้ตามโหมด (`setText()`)

### 3. Section เฉพาะ edit — คั่นด้วยเส้นประ

```html
<div id="xEditOnlySection" class="d-none">
    <hr class="fleet-divider">
    ...ฟิลด์ที่มีแค่ตอน edit (เช่น วันนัดต่างๆ)...
</div>
```
JS toggle `.d-none` ตาม `isEdit`

> ⚠️ `.fleet-divider` เป็น class **ประจำหน้า** (นิยามใน `<style>` ของ `vehicle_fleet.html` เอง) ไม่ใช่ shared component — ค่าเดียวกับ `.bk-divider` ที่นิยามซ้ำอีกที่ใน [vehicle_calendar.css:748](../../app/static/vehicle/css/vehicle_calendar.css#L748) (`vehicle_book.html` ใช้ตัวนั้น) ทั้งคู่คือ `border-top:1px dashed var(--bb-n300)`. **ยังไม่รวมเป็น token/class เดียวใน `components.css`** — สร้างหน้าใหม่ตอนนี้ให้ประกาศ class ท้องถิ่นแบบเดียวกันไปก่อน (อย่าตั้งชื่อใหม่เพิ่ม อย่า import ข้ามหน้า)

### 4. Trigger — native `data-bs-toggle`, ไม่ใช่ JS-driven open

ปุ่ม "เพิ่ม" (add mode — **ห้ามมี** `data-id`):
```html
<button data-bs-toggle="modal" data-bs-target="#xxxModal">เพิ่ม</button>
```
ปุ่ม "แก้ไข" ต่อแถว (edit mode — ใส่ `data-*` ให้ครบทุก field ที่ต้อง prefill):
```html
<button data-bs-toggle="modal" data-bs-target="#xxxModal"
        data-id="{{ row.id }}" data-field-a="{{ row.field_a }}" ...>แก้ไข</button>
```

### 5. JS — `show.bs.modal` + `relatedTarget.dataset`

```js
const modal = document.getElementById('xxxModal');
modal.addEventListener('show.bs.modal', function (e) {
    const b = e.relatedTarget;
    const isEdit = !!(b && b.dataset.id);

    setVal('x_action', isEdit ? 'edit_x' : 'add_x');
    setVal('x_entity_id', isEdit ? b.dataset.id : '');
    // ...set ทุก field จาก b.dataset.* (edit) หรือค่า default (add)...
    document.getElementById('xEditOnlySection').classList.toggle('d-none', !isEdit);
});
```
`isEdit` เช็กจาก `!!b.dataset.id` เท่านั้น — จุดพังที่พบบ่อยสุดคือลืมเว้น `data-id` ไว้บนปุ่ม add

### 6. CSS override — เฉพาะหน้าที่ยังโหลด `design-system.css`

`design-system.css` มี `.card{border/-radius/box-shadow:...!important}` แบบ global ชนกับ Bootstrap `.border-0` ถ้าหน้านั้นยังโหลดไฟล์นี้อยู่ (เช็กก่อนว่าหน้าที่กำลังทำ ยังโหลด `design-system.css` ไหม — `bookingModal` ไม่ต้อง override เพราะหน้าของมันไม่โหลด):
```css
#xxxModal .card.modal-content {
    border: none !important;
    border-radius: var(--bb-r-lg) !important;
    box-shadow: var(--bb-shadow-lg) !important;
    background: #fff;
}
```

### 7. Footer — ขาว ไม่มีเส้นบน

```html
<div class="card-footer bg-white border-top-0 d-flex justify-content-end gap-2 pt-2 pb-3">
    <button type="button" class="bb-btn is-sec" data-bs-dismiss="modal">ยกเลิก</button>
    <button type="submit" class="bb-btn is-pri">บันทึก</button>
</div>
```

---

## ผลลัพท์

Modal เดียวรองรับ 2 โหมด ลด HTML/JS ซ้ำเทียบกับแยก 2 modal:

| | Add mode | Edit mode |
|---|---|---|
| trigger | ปุ่ม toolbar (ไม่มี `data-id`) | ปุ่มแก้ไขต่อแถว (มี `data-id` + `data-*` ครบ) |
| eyebrow/title | "#แบบฟอร์ม" / "เพิ่ม...ใหม่" | "#แก้ไขข้อมูล" / "แก้ไขข้อมูล..." |
| form prefill | ค่า default | ค่าจาก `data-*` ของแถวที่กด |
| section เฉพาะ edit | ซ่อน (`d-none`) | โชว์ พร้อมเส้นประคั่นด้านบน |
| hidden `action` | `add_x` | `edit_x` |

ตัวอย่างจริง: `#addVehicleModal` ([vehicle_fleet.html:343-483](../../app/templates/vehicle/admin/vehicle_fleet.html#L343)) + handler ([vehicle_fleet.js:35-68](../../app/static/vehicle/js/vehicle_fleet.js#L35)) — merge `editVehicleModal` เดิมเข้า `addVehicleModal`, ปุ่มแก้ไขในตาราง retarget `data-bs-target` มาที่ modal เดียวกัน

---

## ถ้าปรับเปลี่ยน — variations ที่เจอแล้ว

| สถานการณ์ | ทำยังไง | ทำไม |
|---|---|---|
| ฟอร์มมี custom component ที่ sync ผ่าน JS event ไม่ใช่แค่ attribute (เช่น `ue-chip-dd`) | set `.checked`/`.value` ให้ครบ**ทุกตัวใน group ก่อน** → ค่อย dispatch `new Event('change', {bubbles:true})` **ครั้งเดียวหลังสุด** ไม่ใช่ทีละตัวระหว่างตั้งค่า | component sync ด้วย native `change` event เท่านั้น (`initUeChipDd` ใน [bb-components.js:818](../../app/static/core/js/bb-components.js#L818)) — dispatch ก่อนตั้งค่าครบจะอ่านสถานะ group ผิด |
| ฟอร์มมี custom stepper/counter (ไม่ใช่ `<input>` ธรรมดา) | expose setter บน `window` ตอน bind stepper ครั้งแรก (เช่น `window.avSetCapacity(n)`) แล้วเรียกจาก `show.bs.modal` handler | stepper เก็บ state ใน closure variable ไม่ใช่ DOM attribute — set `.value` ตรงๆ ไม่ sync กับตัวเลขที่โชว์ (ดู [vehicle_fleet.js:308](../../app/static/vehicle/js/vehicle_fleet.js#L308)) |
| 2 field เดิมแยกกัน ถูกรวมเป็น input เดียวใน UI ใหม่ แต่ DB column เดิมยังคง `NOT NULL` | ส่ง hidden field ว่าง (`<input type="hidden" name="model" value="">`) แทนไม่ส่งเลย | ไม่ส่ง field ที่ `NOT NULL` = insert พังทันที — เช็ก model ก่อนรวม field ทุกครั้ง |
| ปุ่มแก้ไขเดิมชี้ modal เก่าที่เพิ่งลบ/merge | retarget `data-bs-target` มาที่ modal ที่ merge แล้ว + ไล่เช็กว่า `data-*` ที่ handler ใหม่ต้องใช้ครบหรือยัง | ปุ่มเดิมมักไม่มี `data-*` ของ field ที่เพิ่งเพิ่มเข้ามาทีหลัง (เช่น column ใหม่ที่ migration เพิ่งเพิ่ม) |
| หน้ายังโหลด `design-system.css` (legacy) | เพิ่ม scoped override ตาม recipe ข้อ 6 — เช็กก่อนว่าหน้านั้นโหลดไฟล์นี้จริงไหม (ถ้าไม่โหลดเหมือน `bookingModal` ไม่ต้อง override) | `.card{...!important}` แบบ global ชนะ Bootstrap `.border-0` เสมอถ้าไม่ override เจาะจงกว่า |
| data-* ผูกกับ element ที่ไม่ใช่ปุ่มเปิด modal โดยตรง (เช่น อยู่บน `<tr>` ที่ครอบ ไม่ใช่ปุ่มแก้ไขในนั้น — กรณีตารางที่มีหลายปุ่ม action ต่อแถว) | อ่านผ่าน helper ที่ `.closest(rowSelector)` จาก `e.relatedTarget` แทนอ่าน `e.relatedTarget.dataset` ตรงๆ | เก็บ data-* รวมไว้ที่ row เดียวดีกว่าใส่ซ้ำทุกปุ่ม action ในแถว — helper เดียวกันนี้ยัง apply ได้แม้ relatedTarget เป็น row เองล้วนๆ (`.closest()` match ตัวเองได้ถ้าผ่าน selector อยู่แล้ว, ดูแถวถัดไป) |
| ฟอร์มมีไฟล์แนบ (`<input type=file>`) | ให้ id เฉพาะแล้ว `.value = ''` เอง**ทุกครั้งที่เปิด modal ทั้ง 2 โหมด** ใน handler | browser ไม่ยอมให้ set `.value` ของ file input เป็นไฟล์ผ่าน JS ได้เลย (security) — ไม่ reset จะเห็นไฟล์ที่เคยเลือกไว้ค้างจากการเปิดครั้งก่อน (add คนละครั้ง/edit คนละคน) |
| ความต่าง add/edit เป็นแค่ hint ข้อความ/แสดงลิงก์ไฟล์เดิม ไม่ใช่ field ที่มีเฉพาะโหมดใดโหมดหนึ่งจริงๆ | toggle เฉพาะจุด (`.d-none` บน span/element เล็กๆ) พอ ไม่ต้องมี section คั่นเส้นประทั้งก้อนตาม recipe ข้อ 3 | เส้นประคั่น section มีไว้บอกว่า "กลุ่ม field นี้มีเฉพาะ edit" — ถ้าฟิลด์เดียวกันใช้ทั้ง 2 โหมด แค่ hint ต่างกัน ใส่ section จะเข้าใจผิดว่ามี field เพิ่มจริง |
| ต้องเปิด modal เดียวกันจากจุดที่ 3 ที่ไม่ใช่ทั้งปุ่ม toolbar หรือปุ่มในแถว (เช่น ปุ่ม "แก้ไข" ใน modal อื่นที่ต้องปิดตัวเองก่อนแล้วค่อยเปิด modal นี้ต่อ) | เก็บ reference ของ element ต้นทาง (row/ปุ่มเดิม) ไว้ใน closure variable ตอน modal ต้นทางเปิด แล้วส่งเข้า `bootstrap.Modal.getOrCreateInstance(modal).show(savedElement)` — Bootstrap `.show()` รับ relatedTarget เป็น argument ได้ ไหลเข้า `show.bs.modal` listener เดียวกับ trigger ปกติ ไม่ต้องเขียน handler แยก | ถ้าไม่ส่ง relatedTarget เข้าไป `.show()` เฉยๆ จะได้ `undefined` — handler ทั่วไปจะตีความเป็น add mode ผิดๆ ทั้งที่ตั้งใจเปิดแบบ edit |

---

## Changelog

| วันที่ | เปลี่ยนอะไร | ที่มา |
|---|---|---|
| 2026-07-31 | เขียน pattern นี้ครั้งแรก — สรุปจากเคส merge `editVehicleModal` → `addVehicleModal` ใน `vehicle_fleet.html` (recipe คือขั้นตอนที่ใช้จริงรอบนั้น ไม่ใช่ทฤษฎีล่วงหน้า) | session 2026-07-31 |
| 2026-07-31 | เคสที่ 2 — merge `editDriverModal` → `addDriverModal` (ไฟล์เดียวกัน) เพิ่ม 4 variation: data บน parent row ไม่ใช่ปุ่ม · file input ต้อง reset เอง · field-level hint ไม่ต้องมี section คั่น · ส่ง relatedTarget เข้า `.show()` ได้เมื่อเปิดจาก context ที่ 3 (ปุ่มแก้ไขใน `driverDetailModal`) | session 2026-07-31 |

> เพิ่มแถวใหม่ทุกครั้งที่ pattern นี้ถูกใช้ซ้ำแล้วต้องปรับ (ทั้ง recipe หลักและตาราง variations) — กันไฟล์นี้ค้างเป็นภาพ 1 ครั้งที่ไม่ตรงกับโค้ดจริงรอบถัดๆ ไป
