# Vehicle Admin — สรุปงานที่เหลือแต่ละ Component
**วันที่:** 2026-04-19
**สถานะ:** completed
**วันที่เสร็จ:** 2026-04-19

---

## ภาพรวม Layout

```
[ BEFORE · APPROVAL REQUESTS ]   [ DURING · VEHICLES ]
[ AFTER  · TRIP SUMMARY      ]
```

- **Left col (col-lg-8):** BEFORE (บน) + AFTER (ล่าง)
- **Right col (col-lg-4):** DURING

---

## 🟡 BEFORE · Approval Requests

### ✅ ทำแล้ว
- renderBefore + filter tabs (ทั้งหมด / รออนุมัติ / ส่ง Approver / อนุมัติแล้ว / ปฏิเสธ)
- renderSingleRow — card + status dot + badge + icon-only action buttons
- renderGroupRow — group card + Bootstrap collapse + text buttons (แยกทั้งหมด / ดูรายละเอียด / แก้ไข / chevron)
- Group mode — checkboxes (Bootstrap `form-check-input`) + card clickable + btnMerge/Cancel/Confirm
- Merge flow — confirmMerge → openAssignModal('group_new') → submitAssign → patchBooking + renderAll
- Edit existing group — openAssignModal('group') → submitAssign
- ungroupAll, splitBooking — patch local + renderAll (no reload)
- submitRevert — modal confirm → fetch → patch pending
- **[งานนี้] แก้ B-1** — server routes คืน JSON แทน redirect; `submitAssign` ใช้ `if (!res.ok)` แทน `redirect:'manual'`
- **[งานนี้] Notify Telegram mode** — ปุ่มแยกข้าง "รวมงาน"; blue checkbox บน approved cards; mutual exclusivity; `toggleNotifyMode/cancelNotifyMode/toggleNotifySel/confirmNotify`
- **[งานนี้] Group notify** — `renderGroupRow` รองรับ notify mode; `toggleGroupNotifySel(grpName)` เพิ่ม/ลบ approved member IDs; แก้ bug `trip_group` → `tripGroup`
- **[งานนี้] Assign modal** — ลบ PURPOSE OF TRIP; dropdown ดึงจาก DB (central/dept); แสดงชื่อผู้ประสานงานกอง
- **[งานนี้] คลิกการ์ด** → `openAdminBookingDetail(id)` เปิด `vehicle-modal-detail.html`
- **[งานนี้] weekStart fix** — `(today.getDay() + 6) % 7` แก้ Sunday bug
- **[งานนี้] #selDateHeading** — แสดงวันที่เลือกในรูปแบบไทยเหนือ main layout

### ❌ Bug ที่ยังค้าง
| # | Bug | ที่อยู่ | หมายเหตุ |
|---|-----|---------|---------|
| D-1 | `getVehicleStatus` duplicate condition ไม่เช็ค vehicle2 | `vehicle_admin.js` ~410 | status รถที่ 2 อาจผิด |

---

## 🔵 DURING · Vehicles

### ✅ ทำแล้ว
- renderDuring — list รถทุกคัน + status badge
- getVehicleStatus — available / reserved / inuse (time-based) / maintenance
- renderVehicleRow — icon, dest+driver label, action buttons
- Swap vehicle — openSwapModal → selectSwapVehicle → submitSwap → patchVehicle
- Repair — openRepairModal → submitRepair → patch dbStatus='maintenance'
- Fix Done — fixDone → fetch → patchVehicle dbStatus='active'

---

## 🟢 AFTER · Trip Summary

### ✅ ทำแล้ว
- renderAfter — list approved bookings ของวันนั้น
- renderTripRow — booker, expense badge, odo start→end, fuel cost, fuelCost override
- markPaid — personal expense → PATCH → patch personalStatus=1 + personalPaidAt
- Empty state เมื่อไม่มีรายการ

### ❌ Feature ที่ยังไม่ implement
| # | Feature | หมายเหตุ |
|---|---------|----------|
| A-1 | `notifyDept(bookingId)` — ปุ่ม "แจ้ง Telegram แผนก" ยังเป็น placeholder | บันทึกใน future_features.md #5 |

---

## สรุปการทำงาน

### สิ่งที่ทำในงานนี้
- แก้ B-1: server JSON response + client-side error detection
- เพิ่ม Notify Telegram mode (single booking)
- เพิ่ม Notify Telegram mode (group booking) + แก้ bug `tripGroup` key mismatch
- Assign modal: ลบ purpose, เพิ่ม dropdown จาก budget DB, แสดงชื่อผู้ประสานงาน
- คลิกการ์ด → detail modal
- weekStart Sunday bug fix
- แสดงวันที่เลือกใน heading

### การตัดสินใจสำคัญ
- ใช้ JSON response แทน redirect ฝั่ง server เพื่อให้ fetch detect error ได้ง่ายกว่า `redirect:'manual'`
- `toggleGroupNotifySel` ใช้ `bookings` (client state) แทน DOM query — ต้องระวัง field name เป็น camelCase (`tripGroup`)

### ไฟล์ที่เปลี่ยนแปลงทั้งหมด
- `app/static/js/vehicle_admin.js`
- `app/static/css/vehicle_admin.css`
- `app/templates/vehicle/admin/vehicle_admin.html`
- `app/views/vehicle_view.py`
- `app/views/telegram_service.py`
- `docs/notes/future_features.md`
- `docs/notes/log/2026-04-19_vehicle-admin-system-reference.md` (สร้างใหม่)
