# Vehicle Admin — Page Contract (4 หน้า)

> **สถานะ:** v1 (2026-08-07) · scope เดิม = 4 หน้า admin: [`vehicle_admin.html`](../../app/templates/vehicle/admin/vehicle_admin.html) · [`vehicle_mileage.html`](../../app/templates/vehicle/admin/vehicle_mileage.html) · [`vehicle_fleet.html`](../../app/templates/vehicle/admin/vehicle_fleet.html) · [`vehicle_budget.html`](../../app/templates/vehicle/admin/vehicle_budget.html) — ขยายมาถึง [`vehicle_cost.html`](../../app/templates/vehicle/admin/vehicle_cost.html) ด้วยแล้ว (2026-08-07, ใช้ contract เดียวกัน แม้ไม่ได้อยู่ใน 4 หน้าตั้งต้น)
> **ทำไมมีไฟล์นี้:** 4 หน้านี้ implement [design_guideline.md](design_guideline.md) คนละเวอร์ชันกัน (modal 3 แบบปน, thead 2 สไตล์, icon lib ปน, empty state 2 class) — ไฟล์นี้ล็อกจุดที่ guideline เปิดช่องตีความไว้ ให้ apply ซ้ำได้โดยไม่ต้องถกใหม่ทุกหน้า
> **สถานะ apply:** `vehicle_fleet.html` = หน้าแรกที่ apply ครบ (2026-08-07) — อีก 3 หน้ายังเป็นของเดิม รอคิว

---

## 1. Modal — 2 แบบ

### 1.1 Form modal — แบบ A (มีอยู่แล้ว ไม่ต้องออกแบบใหม่)
ตาม [design_guideline.md §13b](design_guideline.md#13b-modal-ฟอร์มมาตรฐาน-reference--2026-07-30) — header eyebrow + ชื่อใหญ่ + avatar ขวา, **ไม่มีปุ่มปิด X** (ปิดผ่าน ยกเลิก/backdrop เท่านั้น), footer `border-top-0`. Reference จริง: `#assignModal` (`vehicle_admin.html`), `#bookingModal` (`vehicle_book.html`), `#addVehicleModal`/`#addDriverModal` (`vehicle_fleet.html`).

### 1.2 Confirm modal — illustration card (ใหม่, 2026-08-07)
เล็ก 340px, **ไม่มี X**, ไม่มี icon ในปุ่ม — ต่างจาก form modal ชัดเจน (ไม่ใช่ฟอร์ม ไม่มี field)

```
[illustration svg 140×172, สี #C9C9C9]
[eyebrow เล็ก — คำถาม เช่น "ลบรถคันนี้ใช่ไหม"]  14px/500 mut
[ชื่อ/entity ตัวใหญ่ — เช่น ชื่อรถ/ชื่อคนขับ]      22px/700 str
[คำอธิบายผลลัพธ์ — ตัดบรรทัดเองด้วย <br> ตรงจุดอ่านลื่นสุด]  14px/mut
[ปุ่ม ยกเลิก + ยืนยัน แถวเดียวกัน กึ่งกลาง ไม่มี icon]
```

**Class ที่ใช้ (page-scoped ใน `vehicle_fleet.html` ตอนนี้ — ยังไม่ promote):**
| class | หน้าที่ |
|---|---|
| `.mf-confirm-card` | modal-content: `border-radius:20px` (**exception จาก binary radius §5** — ดู §14 drift ledger), `max-width:340px`, padding 32/28/28, `shadow-lg`, text-center |
| `.mf-confirm-title` | eyebrow question — 14px/500/`--bb-mut` |
| `.mf-confirm-name` | entity name — 22px/700/`--bb-str` |
| `.mf-confirm-desc` | ผลลัพธ์ — 14px/`--bb-mut`/line-height 1.6 |
| `.mf-illust` | สี illustration ทั้งหมด — `color:#C9C9C9` (เทากว่า `n300` ปกติเล็กน้อย กันแย่ง content) |

ปุ่ม: ยกเลิก = `.bb-btn.is-sec` · ยืนยัน = `.bb-btn.is-pri` (ทั่วไป) หรือ `.bb-btn.is-danger` (ลบ/ทำลาย) — ไม่มี icon ทั้งคู่ วาง `d-flex justify-content-center gap-2`

**Reference จริง:** `#deleteVehicleModal`/`#deleteDriverModal` ใน `vehicle_fleet.html`

**เกณฑ์ promote เข้า `components.css`:** ใช้ซ้ำ ≥2 หน้า → ยก `.mf-confirm-*` เป็น `.bb-confirm-*` ทางการ + เพิ่ม `/dev/components` gallery + เพิ่ม radius exception นี้เข้า guideline §5 formal (ตอนนี้ยังเป็น drift-ledger exception เดี่ยว)

---

## 2. Toolbar
โครง: **tab2 (บน)** → **chip row + primary button ขวา (ล่าง)**
- chip active = `border` + `text` `accent-dk` (ตาม spec §12 row 4 ที่เขียนไว้ — **ไม่ใช่โค้ดปัจจุบันที่ยังเป็น drift ตัดไปแล้ว**, ดู §14 "ยังไม่เคาะ" ในตัว guideline — page contract นี้เลือกฝั่ง revert ให้ตรง spec)
- ปุ่ม toolbar ที่ไม่ใช่ primary → `.bb-btn.is-sec` ห้าม `style=""` inline สี
- **ไม่บังคับทุกหน้าต้องมี chip filter** — หน้าที่ไม่มี filter จริง (เช่น `vehicle_fleet.html`) ไม่ต้องเพิ่มให้ใหม่ (นี่คือกฎ style ของ toolbar ที่มีอยู่ ไม่ใช่คำสั่งเพิ่ม feature)

---

## 3. Table
- **thead:** พื้น **ขาว** เหลือแค่เส้น `border-bottom` 1px `--bb-n200` (+ `border-top` จาก `.bb-table` เอง), text `--bb-mut` weight 500 (ไม่ bold)
  - **แก้ไข (2026-08-07, พบตอน apply `vehicle_cost.html`):** เข้าใจผิดตอนแรกว่า default `.bb-table thead` ของ `components.css` เป็น "pill `n50`" (ตามที่ guideline §12 เขียนไว้ตอนนั้น) เลยเพิ่ม page-scoped override ให้ `vehicle_fleet.html`/`vehicle_mileage.html` — **เช็กโค้ดจริงแล้ว `components.css` บรรทัด 408-410 default อยู่แล้วตรงกับที่ต้องการ** (พื้นโปร่งใส/ขาว + border-bottom `n200` + `mut` + weight 500) ไม่ต้อง override เลย! แก้ guideline §12 row 9 ให้ตรงโค้ดแล้ว. Override ที่ใส่ไว้ใน fleet/mileage เป็น CSS ซ้ำซ้อนแต่ไม่พัง (ผลลัพธ์เหมือนกัน) ยังไม่ได้ลบออก — ไม่เร่งด่วน
  - **`vehicle_cost.html`:** ไม่ต้องใส่ override เลย แค่เปลี่ยน class ตารางจาก `table data-table` (legacy Zendenta, **หมดฤทธิ์จริงเพราะ `main.css` ไม่ถูกโหลดจาก `_base_ue.html`** — เป็น orphan class/bug ไม่ใช่แค่ style เก่า) → `.bb-table` เฉยๆ ก็ได้ผลลัพธ์ตรง contract ทันที
- **action column:** ท้ายสุดเสมอ, แยกเป็น icon เดี่ยวต่อ action จริง (ดู/แก้ไข/ลบ) — **อย่าฝืนใส่ 2-3 icon ถ้าไม่มี action จริงมารองรับ** (เช่น `vehicle_fleet.html` ตารางรถมีแค่ "แก้ไข" 1 ปุ่ม ปล่อยไว้แบบนั้น ไม่ต้องเติม view/delete ที่ไม่มี backend รองรับ)
- mobile: table→scroll หรือ card stack (ตามหน้าเดิม ไม่บังคับเปลี่ยน pattern)

---

## 4. Icon
- เขียน `<span class="material-symbols-rounded">ชื่อ_material</span>` **ตรงๆ** — ห้าม `data-lucide` ในโค้ดใหม่/ที่ redesign
- `rounded` (ไม่ใช่ `outlined` ที่ guideline §7 เขียนไว้ผิด — โค้ดจริงทั้งระบบใช้ `rounded`, doc ต้องแก้ตาม ไม่ใช่โค้ด)
- `vehicle_mileage.html` ยังเป็น `data-lucide` ทั้งหน้า — migrate เมื่อถึงคิวหน้านั้น

---

## 5. `<style>` ในไฟล์ template
- อยู่ในไฟล์ได้เฉพาะ CSS ที่ **หน้านั้นใช้คนเดียวจริง** และต้องใช้ `var(--bb-*)` ล้วน **ห้าม hex literal**
- ใช้ซ้ำ ≥2 หน้า → ย้ายเข้า `components.css` (`.bb-*`) แล้วลบออกจากหน้า
- ข้อยกเว้นชั่วคราว (page-scoped ที่ยังไม่ promote): `.mf-confirm-*`, `.mf-illust`, `.fleet-table thead th` ใน `vehicle_fleet.html` (ดู §1.2, §3)

---

## 6. Empty state
**Illustration:** `_shared/illustrations.html` → `{% include '_shared/illustrations.html' %}` ครั้งเดียวต่อหน้า (ใกล้ๆ `{% include '_shared/tab2.html' %}`) แล้วเรียกด้วย `<use href="#illust-anxious">` ที่ไหนก็ได้ในหน้านั้น

สี illustration: `#C9C9C9` (ผ่าน class `.mf-illust` — ยังเป็น page-scoped, ดู §5)

**3 ขนาด/บริบท:**

| Variant | ขนาด | ใช้เมื่อ | Action |
|---|---|---|---|
| **A** | 96×118 | ยังไม่มีข้อมูลเลย (first-run) | ปุ่ม primary พาไปสร้าง (เช่น "เพิ่มรถคันแรก") |
| **B** | 140×172 | มีข้อมูลแต่กรอง/ค้นหาแล้วไม่เจอ | ไม่มี action หรือ ghost link "ล้างตัวกรอง" (`accent-dk`, ไม่มี icon) |
| **C** | 56×69 | inline compact ในการ์ด/ tab panel เล็ก | ตามบริบท (มี/ไม่มีปุ่มได้) |

**Layout:** `d-block mx-auto mb-3` (Bootstrap utility, ห้ามเขียน CSS centering เอง) ตามด้วย `.bb-empty-title` (16/700) + `.bb-empty-desc` (mut) ครอบด้วย `.bb-empty` (แทน `.vc-empty` legacy — migrate ทุกจุดที่เจอ)

**Reference จริง:** `vehicle_fleet.html` (ตาราง "รถ"/"คนขับ" — ทั้งคู่ variant A)

---

## Apply log

| หน้า | วันที่ | จุดที่ apply |
|---|---|---|
| `vehicle_fleet.html` | 2026-08-07 | §1.2 (`deleteVehicleModal`/`deleteDriverModal`) · §3 thead · §6 empty state (รถ+คนขับ, variant A) |
| `vehicle_mileage.html` | 2026-08-07 | §3 thead (scoped `#bbMlResults .bb-table thead th`) · §4 icon (0 `data-lucide` เหลือ — แปลงตรงทุกจุด: ปุ่มยกเลิกเลือก, tooltip เติมน้ำมัน, badge OT mismatch, action ตาราง, การ์ดมือถือ, `#mileageModal`) · §6 empty state (variant B, ไม่มีปุ่ม — ตามที่ตกลง หน้านี้ยังไม่มี clear-all จริง) |
| `vehicle_cost.html` *(นอก scope 4 หน้าตั้งต้น)* | 2026-08-07 | §3 table (`table data-table` orphan class → `.bb-table` — ดู §3 แก้ไข) · §6 empty state (variant B, ไม่มีปุ่ม) · §1.2 confirm modal ใหม่ (`#costConfirmModal`, ใช้แทน `confirm()` เบราว์เซอร์ของปุ่มลบ OT — ต้องแก้ `vehicle_ot.js` เพิ่ม `showCostConfirm()`/`submitCostAction()`) |
| `vehicle_admin.html` | — | ยังไม่ apply |
| `vehicle_budget.html` | — | ยังไม่ apply |

**Backlog (`vehicle_cost.html`, ตัดสินใจข้ามรอบนี้ ไม่ใช่ลืม):**
- 4 modal (แก้ไข OT / เพิ่ม OT / อัตรา OT / preview ใบเสร็จ) ยังเป็น Bootstrap default (`.modal-header`+X) ไม่ใช่ pattern A (§1.1) — งานใหญ่ รอคิวแยก
- ส่วนใบเสร็จ/พิมพ์ (`.cost-receipt-*`/`.rcpt-*`) ใช้ hex ตรงๆ ไม่ใช่ `--bb-*` — **ไม่นับเป็น exception** (ต่างจาก radius confirm-modal) ยังเป็น drift ค้างอยู่ ไม่ได้ตัดสินใจว่าโอเค แค่ยังไม่ทำ

**สิ่งที่ตั้งใจไม่แตะใน `vehicle_fleet.html` รอบนี้:** `driverDetailModal` (read-only detail — ไม่เข้า pattern ไหนใน 6 จุดนี้ เป็น candidate ของ Drawer component ในอนาคต ไม่ใช่ตอนนี้)

**สิ่งที่เช็กแล้วไม่ต้องแตะใน `vehicle_mileage.html`:**
- chip active color (`accent-dk`) — เข้าใจผิดว่าเป็น drift ตอนแรก แต่เช็ก `ue.css` § CHIP จริงแล้วโค้ด**ตรง spec อยู่แล้ว** (แก้ไปตั้งแต่ 2026-07-28) — ปิด drift-ledger entry เดิมใน [design_guideline.md §14](design_guideline.md) แทนการแก้โค้ด
- `vehicle_mileage.js` — ไม่มีจุดไหน generate `data-lucide` แบบ dynamic (sort icon เขียน material-symbols name ตรงอยู่แล้ว) **ยกเว้น 1 จุด**: `updateOdoUI()` เดิม query icon ผ่าน `avatar.querySelector('svg, i, [data-lucide]')` ซึ่งจะหา `#mmAvatar` icon ไม่เจอหลัง migrate เป็น `<span class="material-symbols-rounded">` ตรงๆ (ไม่มี `data-lucide` แล้ว) — **แก้ selector เพิ่ม `.material-symbols-rounded`** กันฟีเจอร์ swap สี icon ตาม state พัง
