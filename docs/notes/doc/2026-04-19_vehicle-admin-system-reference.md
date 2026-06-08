# Vehicle Admin System — Reference Document
**วันที่:** 2026-04-19
**สถานะ:** reference

---

## 1. Flow การทำงานของระบบ

Vehicle Admin Dashboard (`/vehicle/admin`) แบ่งเป็น 3 section:

```
[ BEFORE · Approval Requests ]   [ DURING · Vehicles ]
[ AFTER  · Trip Summary      ]
```

| Section | ทำอะไร |
|---------|--------|
| **BEFORE** | รายการจองที่รออนุมัติ / อนุมัติแล้ว / ปฏิเสธ — admin อนุมัติ, merge กลุ่ม, ย้อนสถานะ |
| **DURING** | สถานะรถทุกคัน ณ วันที่เลือก — swap รถ, ส่งซ่อม, ปิดซ่อม |
| **AFTER** | สรุปทริปที่เสร็จแล้ว — ดูค่าเชื้อเพลิง, mark paid/unpaid สำหรับ personal expense |

### Features ทั้งหมด

| # | Feature | ผลลัพธ์ |
|---|---------|---------|
| 1 | **Approve single booking** | status → `approved`, in-app only (Telegram ผ่าน btnNotify เท่านั้น — 2026-06-07) |
| 2 | **Reject single booking** | status → `rejected`, in-app only |
| 3 | **Forward single booking** | status → `waiting_approver`, in-app only |
| 4 | **Merge / Create new group** | สร้าง `trip_group` ใหม่ (TRP-xxx), bookings ทั้งกลุ่ม → `approved` |
| 5 | **Edit existing group** | แก้รถ/คนขับ/expense ของกลุ่มที่มีอยู่ |
| 6 | **Edit single booking** | แก้รถ/คนขับ/expense ของรายการเดี่ยว |
| 7 | **Revert booking** | status → `pending`, ล้างรถ/คนขับ/กลุ่ม |
| 8 | **Ungroup all** | แยกทุก booking ในกลุ่มออกจากกัน |
| 9 | **Split single from group** | แยก booking เดียวออกจากกลุ่ม |
| 10 | **Swap vehicle** | เปลี่ยนรถที่ assign ให้ booking |
| 11 | **Send to repair** | vehicle.status → `maintenance` |
| 12 | **Mark repair done** | vehicle.status → `active` |
| 13 | **Mark personal expense paid** | mileage.personal_status → `1` |

---

## 2. JS Functions — vehicle_admin.js

### Utility

| Function | บรรทัด | ทำอะไร |
|----------|--------|--------|
| `toDateStr(date)` | 62–64 | แปลง Date → YYYY-MM-DD |
| `isPastOrToday(d)` | 70–73 | เช็คว่าวันที่ผ่านมาแล้วหรือวันนี้ |
| `isToday(d)` | 66–68 | เช็คว่าเป็นวันนี้ |
| `fmtBaht(n)` | 75 | จัดรูปทศนิยม 2 ตำแหน่ง + ฿ |
| `fmtNum(n)` | 76 | จัดรูป number มี comma |
| `esc(str)` | 926–929 | Escape HTML |
| `showToast(msg)` | 918–923 | แสดง toast notification |

### State Patching (local array update ไม่ reload)

| Function | บรรทัด | ทำอะไร |
|----------|--------|--------|
| `patchBooking(id, fields)` | 79–82 | merge fields เข้า booking ใน local array |
| `patchVehicle(id, fields)` | 83–86 | merge fields เข้า vehicle ใน local array |

### Rendering

| Function | บรรทัด | ทำอะไร |
|----------|--------|--------|
| `renderAll()` | 934–941 | เรนเดอร์ทุก section (เรียก 4 ฟังก์ชันด้านล่าง) |
| `renderWeekNav()` | 91–114 | เรนเดอร์ week navigation bar (7 วัน) |
| `renderBefore()` | 124–199 | เรนเดอร์ Approval Requests + filter tabs |
| `renderSingleRow(b)` | 201–242 | เรนเดอร์ card ของ single booking |
| `buildRowActions(b)` | 244–273 | สร้าง action buttons (✓ ✗ ✎ ↶) ตาม status |
| `renderGroupRow(grpName, members)` | 275–344 | เรนเดอร์ card กลุ่ม + collapse list |
| `renderDuring()` | 398–404 | เรนเดอร์ Vehicles section |
| `getVehicleStatus(v)` | 406–418 | หาสถานะรถ: `available`/`reserved`/`inuse`/`maintenance` |
| `renderVehicleRow(v)` | 420–475 | เรนเดอร์ vehicle card + action buttons |
| `renderAfter()` | 480–498 | เรนเดอร์ Trip Summary section |
| `renderTripRow(b)` | 500–545 | เรนเดอร์ trip row + odo/fuel/payment info |

### Week Navigation

| Function | บรรทัด | ทำอะไร |
|----------|--------|--------|
| `shiftWeek(delta)` | 116–119 | เลื่อนสัปดาห์ ±1 |

### Filter / Expand

| Function | บรรทัด | ทำอะไร |
|----------|--------|--------|
| `setFilter(f)` | 346–351 | ตั้ง filter tab (all/pending/waiting_approver/approved/rejected) |
| `toggleBeforeExpand()` | 353–356 | expand/collapse section BEFORE |

### Group Mode (Merge)

| Function | บรรทัด | ทำอะไร |
|----------|--------|--------|
| `toggleGroupMode()` | 359–366 | เข้า/ออก group mode (แสดง checkbox) |
| `cancelGroupMode()` | 368–374 | ออก group mode + clear selection |
| `toggleGroupSel(id)` | 376–380 | เลือก/ยกเลิก booking ใน group mode |
| `updateMergeBtn()` | 382–386 | enable "รวม" button เมื่อเลือก >= 2 รายการ |
| `confirmMerge()` | 388–393 | เปิด assign modal ด้วย action='group_new' |

### Assign Modal

| Function | บรรทัด | ทำอะไร |
|----------|--------|--------|
| `openAssignModal(id, action, grpName)` | 552–607 | เปิด modal (approve/reject/edit/group/group_new) |
| `setModalExpType(type)` | 609–616 | เปลี่ยน expense type + toggle sub-dropdown |
| `updateExpSubDropdown()` | 618–630 | populate central_category / trip_department dropdown |
| `updateModalBudget()` | 632–646 | อัปเดต budget bar ใน modal |
| `checkAssignReady()` | 648–652 | validate ก่อน enable ปุ่ม Confirm |
| `submitAssign()` | 654–755 | POST ไปยัง server (3 branch: group/group_new/single) |

### Revert

| Function | บรรทัด | ทำอะไร |
|----------|--------|--------|
| `openRevertModal(bookingId)` | 758–765 | เปิด confirm modal ก่อน revert |
| `submitRevert()` | 767–777 | POST revert → patch local → renderAll |

### Ungroup / Split

| Function | บรรทัด | ทำอะไร |
|----------|--------|--------|
| `ungroupAll(grpName)` | 780–790 | POST ungroup สำหรับทุก member ใน group |
| `splitBooking(bookingId, grpName)` | 792–800 | POST ungroup สำหรับ booking เดียว |

### Vehicle Actions

| Function | บรรทัด | ทำอะไร |
|----------|--------|--------|
| `openSwapModal(bookingId)` | 803–840 | เปิด modal เลือกรถใหม่ |
| `selectSwapVehicle(vehicleId)` | 842–847 | highlight รถที่เลือกใน swap modal |
| `submitSwap()` | 849–862 | POST swap → patchBooking → renderAll |
| `openRepairModal(vehicleId)` | 865–873 | เปิด modal กรอก repair note |
| `submitRepair()` | 875–886 | POST repair → patchVehicle → renderAll |
| `fixDone(vehicleId)` | 888–898 | POST fix-done → patchVehicle → renderAll |

### After Section

| Function | บรรทัด | ทำอะไร |
|----------|--------|--------|
| `markPaid(mileageId, bookingId)` | 901–911 | POST mark_paid → patchBooking → renderAll |
| `notifyDept(bookingId)` | 913–915 | **Placeholder** — ยังไม่ implement |

---

## 3. Python Routes — vehicle_view.py

| Function | บรรทัด | Method | URL | ทำอะไร |
|----------|--------|--------|-----|--------|
| `admin_trips()` | 476–515 | GET | `/vehicle/admin` | render หน้า admin พร้อม inject bookings/vehicles/drivers/budgets เป็น JSON |
| `admin_revert_booking()` | 521–529 | POST | `/vehicle/admin/booking/<id>/revert` | status → `pending`, ล้างรถ/คนขับ/กลุ่ม → `jsonify({'ok': True})` |
| `admin_vehicle_repair()` | 535–545 | POST | `/vehicle/admin/vehicle/<id>/repair` | vehicle.status → `maintenance` → `jsonify({'ok': True})` |
| `admin_vehicle_fix_done()` | 548–558 | POST | `/vehicle/admin/vehicle/<id>/fix-done` | vehicle.status → `active` → `jsonify({'ok': True, 'label': ...})` |
| `admin_swap_vehicle()` | 564–577 | POST | `/vehicle/admin/booking/<id>/swap` | booking.assigned_vehicle_id → new id → `jsonify({'ok': True, 'label': ...})` |
| `admin_merge()` | 583–644 | POST | `/vehicle/admin/merge` | สร้าง/แก้ trip_group, อัปเดต bookings ทั้งกลุ่ม → `jsonify({'ok': True, 'trip_group': ...})` |
| `admin_assign()` | 654–708 | POST | `/vehicle/admin/assign/<id>` | approve/reject/forward/ungroup single booking → `jsonify({'ok': True})` |
| `budget_personal_mark_paid()` | 1289–1301 | POST | `/admin/budget/personal/mark_paid` | mileage.personal_status → 1 → `jsonify({'ok': True})` |
| `budget_personal_mark_unpaid()` | 1304–1318 | POST | `/admin/budget/personal/mark_unpaid` | mileage.personal_status → 0 → `jsonify({'ok': True})` |

---

## 4. Feature Flows — JS → Server

### Feature 1: Approve Single Booking
```
openAssignModal(id, 'approve')
  → submitAssign()
    → POST /vehicle/admin/assign/<id>  {assign_action: 'approve', vehicle, driver, expense}
    → patchBooking(id, {status: 'approved', ...})
    → renderAll()
```

### Feature 2: Reject Single Booking
```
openAssignModal(id, 'reject')
  → submitAssign()
    → POST /vehicle/admin/assign/<id>  {assign_action: 'reject'}
    → patchBooking(id, {status: 'rejected'})
    → renderAll()
```

### Feature 3: Forward to Approver
```
openAssignModal(id, 'approve')  [user เลือก "ส่ง approver" ใน modal]
  → submitAssign()
    → POST /vehicle/admin/assign/<id>  {assign_action: 'forward', ...}
    → patchBooking(id, {status: 'waiting_approver'})
    → renderAll()
```

### Feature 4: Merge / Create New Group
```
toggleGroupMode()
  → toggleGroupSel(id) × N
  → confirmMerge()
    → openAssignModal(null, 'group_new')
      → submitAssign()
        → POST /vehicle/admin/merge  {booking_ids: [...], merge_action: 'approve', vehicle, driver, expense}
        → patchBooking() × N  {status: 'approved', tripGroup: TMP}
        → cancelGroupMode()
        → renderAll()
```

### Feature 5: Edit Existing Group
```
[click ✎ on group row]
  → openAssignModal(null, 'group', grpName)
    → submitAssign()
      → POST /vehicle/admin/merge  {booking_ids: [...], trip_group: 'TRP-xxx', vehicle, driver, expense}
      → patchBooking() × N
      → renderAll()
```

### Feature 6: Edit Single Booking
```
[click ✎ on single row]
  → openAssignModal(id, 'edit')
    → submitAssign()
      → POST /vehicle/admin/assign/<id>  {assign_action: 'approve', ...}
      → patchBooking(id, {...})
      → renderAll()
```

### Feature 7: Revert Booking
```
[click ↶ button]
  → openRevertModal(id)
    → submitRevert()
      → POST /vehicle/admin/booking/<id>/revert
      → patchBooking(id, {status: 'pending', vehicleId: null, driverId: null, tripGroup: null})
      → renderAll()
```

### Feature 8: Ungroup All
```
[click shuffle on group row]
  → ungroupAll(grpName)
    → forEach member:
        POST /vehicle/admin/assign/<id>  {action: 'ungroup'}
    → patchBooking() × N  {tripGroup: null, vehicleId: null, ...}
    → renderAll()
```

### Feature 9: Split Single from Group
```
[click shuffle on member row inside collapse]
  → splitBooking(id, grpName)
    → POST /vehicle/admin/assign/<id>  {action: 'ungroup'}
    → patchBooking(id, {tripGroup: null, vehicleId: null, ...})
    → renderAll()
```

### Feature 10: Swap Vehicle
```
[click swap button on vehicle row (DURING)]
  → openSwapModal(bookingId)
    → selectSwapVehicle(vehicleId)
      → submitSwap()
        → POST /vehicle/admin/booking/<id>/swap  {vehicle_id: newId}
        → patchBooking(id, {vehicleId, vehicleLabel})
        → renderAll()
```

### Feature 11: Send to Repair
```
[click wrench button on vehicle row (DURING)]
  → openRepairModal(vehicleId)
    → submitRepair()
      → POST /vehicle/admin/vehicle/<id>/repair  {repair_note}
      → patchVehicle(id, {dbStatus: 'maintenance', repairNote})
      → renderAll()
```

### Feature 12: Mark Repair Done
```
[click "เสร็จซ่อม" on maintenance vehicle]
  → fixDone(vehicleId)
    → POST /vehicle/admin/vehicle/<id>/fix-done
    → patchVehicle(id, {dbStatus: 'active', repairNote: null})
    → renderAll()
```

### Feature 13: Mark Personal Expense Paid
```
[click "รับเงินแล้ว" on trip row (AFTER, expense_type='personal')]
  → markPaid(mileageId, bookingId)
    → POST /admin/budget/personal/mark_paid  {mileage_id}
    → patchBooking(id, {personalStatus: 1})
    → renderAll()
```

---

## ไฟล์ที่เกี่ยวข้อง
- `app/static/js/vehicle_admin.js` — JS logic ทั้งหมด
- `app/static/css/vehicle_admin.css` — styles
- `app/templates/vehicle/admin/vehicle_admin.html` — template + JSON data inject
- `app/views/vehicle_view.py` — server routes (admin section: line 476–708, budget: 1289–1318)
