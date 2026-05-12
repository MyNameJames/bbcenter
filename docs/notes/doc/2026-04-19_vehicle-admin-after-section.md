# Vehicle Admin — AFTER Section Reference
**วันที่:** 2026-04-19
**สถานะ:** completed

---

## 1. ทำอะไรไปแล้ว

| # | Feature | สถานะ |
|---|---------|--------|
| 1 | แสดงรายการทริปที่อนุมัติแล้วของวันที่เลือก | ✅ Done |
| 2 | แสดงข้อมูลไมล์ (odo start → end) + คำนวณค่าเชื้อเพลิง | ✅ Done |
| 3 | mark personal expense ว่า "รับเงินแล้ว" + แสดงวันที่รับ | ✅ Done |
| 4 | Empty state เมื่อไม่มีทริป | ✅ Done |
| 5 | badge แยกประเภทค่าใช้จ่าย (ส่วนกลาง / ส่วนกอง / ส่วนตัว) | ✅ Done |
| 6 | แสดง "รอกรอกไมล์" เมื่อยังไม่มีข้อมูล mileage → ใช้ ds-status-dot--pending แทน tag | ✅ Done |
| 7 | ปุ่ม "แจ้ง Telegram" สำหรับ expense_type='department' | ⚠️ Placeholder (future feature #5) |
| 8 | pts-row redesign v2: card layout ตาม bookingList + ds-status-dot + group by tripGroup | ✅ Done |
| 9 | detail line wrap หลัง ··· + no-mileage row เป็น single line ไม่มี tag | ✅ Done |

---

## 2. Flow การทำงาน

### 2.1 Render AFTER Section

```
renderAll()
  └─ renderAfter()
       ├─ filter bookings: startIso starts with selDate AND status==='approved'
       ├─ group by tripGroup (null → individual, same tripGroup → 1 row)
       ├─ อัปเดต #afterCount
       └─ groups.map(g => renderTripRow(g))
            ├─ representative b = g[0], bm = g.find(hasOdo) || g[0]
            ├─ plate = vehicleLabel.split(' · ').pop()
            ├─ isGroup → "งานร่วม N รายการ", else ชื่อผู้จอง
            ├─ ds-status-dot--approved (มีไมล์) / ds-status-dot--pending (ยังไม่มีไมล์)
            ├─ detailHtml: pts-detail-main + pts-detail-sub (wrap หลัง ···)
            ├─ [personal]    → ปุ่ม "รับเงินแล้ว" หรือ stamp (เฉพาะถ้ามีไมล์)
            └─ [department]  → ปุ่ม "แจ้ง Telegram" (placeholder)
```

### 2.2 Mark Personal Expense Paid

```
คลิก "รับเงินแล้ว"
  └─ markPaid(mileageId, bookingId)
       ├─ POST /admin/budget/personal/mark_paid  { mileage_id }
       ├─ patchBooking(bookingId, { personalStatus: 1 })
       ├─ showToast('✓ บันทึกการรับเงินแล้ว')
       └─ renderAll()
```

---

## 3. Functions

### JS — vehicle_admin.js

| Function | บรรทัด | ทำอะไร |
|----------|--------|--------|
| `renderAfter()` | 559–590 | filter approved bookings → group by tripGroup → render list หรือ empty state |
| `renderTripRow(group)` | 591–648 | รับ array, สร้าง card ตาม bookingList: ds-status-dot + plate + name/group + badge + ยอด + detail + action |
| `markPaid(mileageId, bookingId)` | ~1070 | POST mark_paid → patchBooking personalStatus=1 → renderAll |
| `notifyDept(bookingId)` | ~1084 | **Placeholder** — แสดง toast "Feature นี้จะพร้อมใช้" (ยังไม่ implement จริง) |

### Python Routes — vehicle_view.py

| Function | บรรทัด | Method | URL |
|----------|--------|--------|-----|
| `budget_personal_mark_paid()` | ~1289 | POST | `/admin/budget/personal/mark_paid` |
| `budget_personal_mark_unpaid()` | ~1304 | POST | `/admin/budget/personal/mark_unpaid` |

---

## 4. Data Fields ที่ AFTER ใช้ (จาก BOOKINGS_DATA)

| Field | Source (Python) | ใช้ใน |
|-------|----------------|--------|
| `b.id` | `VehicleBooking.id` | markPaid, notifyDept |
| `b.booker` | `user.full_name or user.username` | แสดงชื่อ |
| `b.startIso` | `start_datetime.isoformat()` | filter วันที่ใน renderAfter |
| `b.status` | `VehicleBooking.status` | filter เฉพาะ 'approved' |
| `b.expType` | `expense_type` | แยก badge + action |
| `b.deptName` | `trip_department or user.department` | label badge ส่วนกอง |
| `b.mileageId` | `mileage[0].id` | markPaid |
| `b.odoStart` | `mileage[0].odometer_start` | คำนวณ dist |
| `b.odoEnd` | `mileage[0].odometer_end` | คำนวณ dist |
| `b.fuelCost` | `mileage[0].fuel_cost` | บวกเพิ่มใน total |
| `b.personalStatus` | `mileage[0].personal_status` | แสดง paid/unpaid button |
| `b.personalPaidAt` | `mileage[0].personal_paid_at` (Thai format) | แสดงวันที่รับเงิน |

---

## 5. CSS Classes (vehicle_admin.css)

| Class | ใช้กับ |
|-------|--------|
| `.pts-row` | modifier บน `.card.mb-2` — animation + opacity no-mileage |
| `.pts-no-mileage` | card ที่ยังไม่มีไมล์ (opacity .7) |
| `.pts-plate` | ทะเบียนรถ (bold) + `::after` separator dot |
| `.pts-name` | ชื่อผู้จอง หรือ "งานร่วม N รายการ" |
| `.pts-exp-badge` | badge ประเภทค่าใช้จ่าย |
| `.pts-exp-central / department / personal` | สี badge แต่ละประเภท |
| `.pts-amount` | ยอดเงินรวม (margin-left: auto) |
| `.pts-detail` | flex-wrap container สำหรับ detail line |
| `.pts-detail-main` | "ไมล์: odo → odo" (nowrap — คงอยู่บรรทัดแรก) |
| `.pts-detail-sub` | "··· กม. × ฿..." (nowrap — wrap ลงบรรทัดใหม่เมื่อพื้นที่ไม่พอ) |
| `.pts-btn-paid` | ปุ่ม "รับเงินแล้ว" |
| `.pts-paid-stamp` | stamp "จ่ายเมื่อ..." |
| `.pts-btn-telegram` | ปุ่ม "แจ้ง Telegram" |

---

## 6. ที่ยังไม่ได้ทำ (Future)

| # | Feature | หมายเหตุ |
|---|---------|----------|
| A-1 | `notifyDept(bookingId)` จริง | ต้องสร้าง endpoint + fetch + toast (บันทึกใน future_features.md #5) |

---

## สรุปการทำงาน
**สถานะ:** completed
**วันที่เสร็จ:** 2026-04-23

### สิ่งที่ทำ
- Redesign `renderTripRow` ให้ใช้ Bootstrap `.card.mb-2` + `ds-status-dot` เหมือน bookingList
- Group bookings ที่มี `tripGroup` เดียวกันเป็น 1 row ("งานร่วม N รายการ")
- Layout 3 บรรทัด: [plate + badge] / [name] / [detail wrap]
- `pts-right` column แยก amount + action ออกจาก flex-wrap ป้องกัน layout พัง
- Detail line แยก `pts-detail-main` / `pts-detail-sub` — wrap ตั้งแต่ `···` ลงมา
- ซ่อน `+ น้ำมัน ฿0` เมื่อ fuel = 0, format fuelPrice ด้วย `fmtNum`
- แก้ double spacing จาก `::after` + gap, เพิ่ม `text-overflow: ellipsis` บน name, ลบ dead CSS `.pts-action-wrap`

### การตัดสินใจสำคัญ
- ใช้ `ds-status-dot--approved` (เขียว) / `ds-status-dot--pending` (เหลือง) แทน custom icon — consistent กับ design system
- `pts-right` เป็น `flex-direction: column` บน desktop, amount อยู่บน action — ไม่ซ้อน element สองชุด
- Business rule: งานร่วมต้องมี `expType` เดียวกัน → ใช้ `b = group[0]` เป็น representative ได้เลย

### ไฟล์ที่เปลี่ยนแปลงทั้งหมด
- `app/static/js/vehicle_admin.js` — `renderAfter()`, `renderTripRow(group)`
- `app/static/css/vehicle_admin.css` — POST-TRIP SUMMARY section
- `docs/notes/future_features.md` — เพิ่ม #7 (ลบ vehicle2 functions)
