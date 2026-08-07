# รวม setBudgetModal + budgetTopUpModal เป็น modal เดียว
**วันที่:** 2026-08-06
**สถานะ:** completed

## เป้าหมาย
รวม `#setBudgetModal` (action=`set_budget`, แก้ `budget_amount` แบบ absolute) กับ
`#budgetTopUpModal` (action=`top_up`, แก้ `budget_amount` แบบ +delta) เป็น modal เดียว
ในหน้า `app/templates/vehicle/admin/vehicle_budget.html` — ทั้งสองแก้ field เดียวกัน
(`budget_amount`) ต่างกันแค่ absolute vs delta จึงควรรวม (ตกลงกับผู้ใช้ในบทสนทนา design ก่อนหน้า)

`#budgetAdjustModal` (action=`manual_adjust`, แก้ `used_amount` — คนละ field/คนละความเสี่ยง)
**ไม่รวม** แยกเดี่ยวเหมือนเดิม (ตกลงแล้ว)

Pattern อ้างอิง: [modal_pattern.md](../modal_pattern.md) — ใช้เฉพาะ**กลไก** (1 modal
สลับหลายโหมดผ่าน hidden action + JS `show.bs.modal`) ไม่ใช้ literal HTML skeleton ของ
recipe (นั้นเขียนจาก context `vehicle_fleet.html` ที่ยังมี `design-system.css` legacy) —
โครง head/body/foot คงของเดิม (`.bb-modal-head/-body/-foot`) ตามที่ modal อื่นในหน้านี้
(`budgetAdjustModal`/`extendBudgetModal`) ใช้อยู่แล้ว เพื่อความสม่ำเสมอในหน้าเดียวกัน

## การตัดสินใจ
- เก็บ id เดิม `setBudgetModal` (ปุ่ม toolbar "ตั้งงบย่อย" ชี้อยู่แล้ว) — ลบ `budgetTopUpModal` ทิ้ง
- เพิ่ม segmented control ใช้ component ที่มีอยู่แล้วในหน้านี้ (`.bb-tabs`/`.bb-tab.is-on` — §5
  ของ design_guideline.md) แทนสร้าง component ใหม่ — โชว์เฉพาะตอนแก้งบที่มีอยู่แล้ว (มี `bid`)
  ซ่อนตอนสร้างใหม่ (toolbar) เพราะ top-up งบที่ยังไม่มีไม่ได้
- คง **มีปุ่มปิด X** ตามที่ modal นี้มีอยู่แล้ว (ต่างจาก modal_pattern.md ข้อ 1 ที่บอกห้ามมี X —
  กฎนั้นมาจาก `#bookingModal` context ที่ไม่มี X; หน้านี้ modal อื่น (`budgetAdjustModal`/
  `extendBudgetModal`) มี X หมด — เลือกสม่ำเสมอกับหน้าตัวเองมากกว่าตาม recipe ตรงตัว)
- แก้ `data-lucide` ที่ inject ผ่าน JS string (`vehicle_budget.js:117,121`) เป็น
  `material-symbols-rounded` ตรงๆ ตาม memory guideline (ห้าม shim) — glyph จาก `ms-icons.js`
  MAP: pencil→edit, landmark→account_balance, users→group
- ไม่แก้ `views/vehicle/vehicle_budget.py` — `_handle_set_budget`/`_handle_top_up` ยัง
  branch ตาม `action` เหมือนเดิม (`budget_manage()` dispatch table ไม่เปลี่ยน) ฝั่ง view
  ไม่รู้ด้วยซ้ำว่า UI รวม 2 form เป็นอันเดียว — เพิ่มแค่ hidden `budget_id` field เข้า
  set_budget submit เฉยๆ (view เดิมไม่ได้อ่าน field นี้ตอน action=set_budget อยู่แล้ว ไม่กระทบ)

## ไฟล์ที่แก้ไข
- `app/templates/vehicle/admin/vehicle_budget.html` — merge modal, ปรับปุ่ม dropdown row
  ("แก้เพดานงบ"/"เพิ่มงบ (top-up)") ให้มี `data-bid` ครบ + ชี้ modal เดียวกัน
- `app/static/vehicle/js/vehicle_budget.js` — ขยาย `show.bs.modal` handler ของ
  `setBudgetModal`, เพิ่ม mode-toggle logic, ลบ `wireModal('budgetTopUpModal', ...)`,
  แก้ data-lucide → material-symbols-rounded

## Docs sync checklist (ก่อน `จบงาน`)
- [x] INDEX_ui.md (template เปลี่ยนโครง modal + JS row) — sync ยืนยันด้วย `checker` agent (ไม่พบ drift)
- [x] ไม่แก้ model/route/schema — ข้ามหัวข้ออื่น (ยืนยันแล้วว่าไม่กระทบ)

## VERIFY
- `pytest tests/test_budget_service.py` เขียวครบ 18 tests (ไม่แตะ service — ยืนยันว่าไม่กระทบ mutation logic)
- Jinja balance check (`{% if/for/block/call %}` open=close) ผ่าน
- `node --check vehicle_budget.js` ผ่าน
- **ไม่ได้ทดสอบ render จริงผ่าน browser** — test harness ของโปรเจกต์ (`tests/conftest.py::route_app`)
  สร้าง Flask app แบบ minimal ไม่ตั้ง `template_folder` (ตั้งใจ หลีกเลี่ยง import `app/app.py` เต็ม
  ที่จะ start APScheduler) จึง render template จริงไม่ได้ในเทส — ลองแล้วเจอ `TemplateNotFound`
  (ลบ scratch test ทิ้งแล้ว ไม่ commit) ต้องให้ผู้ใช้เปิด `/admin/budget` ใน dev server (port 5001,
  process แยกของผู้ใช้) แล้วเช็ก: (1) กด "แก้เพดานงบ" → เปิด modal tab "ตั้ง/แก้เพดาน" prefill ครบ
  (2) กด "เพิ่มงบ (top-up)" → เปิด modal tab "เพิ่มเพดาน" ตรง (3) สลับ tab ไปมาได้ในโมดัลเดียวกัน โดย
  ข้อมูลยังอยู่ (4) กด "ตั้งงบย่อย" (toolbar) → ไม่เห็น tab bar เลย (5) submit ทั้ง 2 โหมดเช็ก
  flash message ถูกต้อง

## สรุปการทำงาน
**สถานะ:** completed
**วันที่เสร็จ:** 2026-08-06

### สิ่งที่ทำ
- รวม `#setBudgetModal` (action=`set_budget`) + `#budgetTopUpModal` (action=`top_up`) เป็น modal
  เดียว — ลบ `#budgetTopUpModal` ทิ้ง, เพิ่ม segmented control `.bb-tabs#sbModeTabs` (ใช้ component
  §5 เดิม ไม่สร้างใหม่) สลับ `#sbSetFields`/`#sbTopUpFields` + hidden `#sbAction`/`#sbBudgetId`
- retarget ปุ่ม dropdown แถว "แก้เพดานงบ"/"เพิ่มงบ (top-up)" ทั้งคู่ไปที่ `#setBudgetModal`
  (เพิ่ม `data-sb-mode`/`data-bid` ให้ครบทั้ง 2 ปุ่ม เพื่อสลับ tab ได้เต็มแม้เปิดจากปุ่มไหนก็ตาม)
- ขยาย `setBudgetModal` handler ใน `vehicle_budget.js` — เพิ่ม `sbApplyMode()`, ลบ
  `wireModal('budgetTopUpModal', ...)`, แก้ icon inject จาก `data-lucide` string → `material-symbols-rounded` ตรง

### การตัดสินใจสำคัญ
- คง `.bb-modal-head/-body/-foot` + ปุ่มปิด X เดิม — ไม่ตาม literal HTML skeleton ของ
  modal_pattern.md recipe (นั้นมาจาก context `vehicle_fleet.html`/`#bookingModal` คนละหน้า) ใช้
  แค่กลไก (1 modal สลับโหมดผ่าน hidden field + JS) — เพื่อสม่ำเสมอกับ modal อื่นในหน้าเดียวกัน
- ไม่แก้ `views/vehicle/vehicle_budget.py`/`budget_service.py` — action `set_budget`/`top_up` ยัง
  แยกกันอยู่ฝั่ง backend เหมือนเดิม เป็นแค่ UI merge

### ไฟล์ที่เปลี่ยนแปลงทั้งหมด
- `app/templates/vehicle/admin/vehicle_budget.html`
- `app/static/vehicle/js/vehicle_budget.js`
- `docs/notes/INDEX_ui.md`

### Docs sync
- [x] INDEX_ui.md (ยืนยันด้วย checker agent — ไม่พบ drift)
- [x] ไม่แก้ model/route/schema/migration/component signature
