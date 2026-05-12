# Vehicle Calendar — User Flow Coverage Analysis
Date: 2026-04-10

---

## สิ่งที่มีแล้ว ✅

| Feature | Route |
|---------|-------|
| จองรถใหม่ | `POST /vehicle/book` |
| ดูรายละเอียด | `GET /vehicle/detail/<id>` |
| แก้ไข (pending เท่านั้น) | `POST /vehicle/edit/<id>` |
| ลบ/ยกเลิก (pending+rejected) | `POST /vehicle/delete/<id>` |
| ดูปฏิทิน (desktop + mobile) | `GET /vehicle` |
| ดูประวัติ | `GET /vehicle/history` |
| Admin approve/reject/forward | `POST /vehicle/approve/<id>` |
| Approver approve/reject | `POST /vehicle/approve/<id>` |
| Telegram notify (approve/reject/forward/merge) | `telegram_service.py` |
| Trip group merge | `POST /vehicle/admin/merge` |
| บันทึกไมล์ (admin+driver) | `POST /vehicle/mileage` |

---

## Gap Analysis — สิ่งที่ขาด ❌

### 🔴 P1 — Critical

| # | ปัญหา | ผลกระทบ |
|---|-------|---------|
| G1 | ไม่มี Telegram แจ้ง Admin เมื่อมีจองใหม่ | Admin ไม่รู้ ต้องมาเช็คเอง booking ค้างนาน |
| G2 | User ยกเลิก approved booking ไม่ได้ (ต้องติดต่อ Admin) | ไม่มี self-service flow |

### 🟡 P2 — Important

| # | ปัญหา | ผลกระทบ |
|---|-------|---------|
| G3 | Calendar ไม่แสดง availability (วันไหนรถว่าง/เต็ม) | User จองโดยไม่รู้ว่ามีรถว่างหรือเปล่า |
| G4 | ไม่มี in-app notification badge | User ไม่รู้ว่าสถานะเปลี่ยนแล้ว ต้อง refresh เอง |
| G5 | Calendar ไม่แสดง rejected bookings | User ต้องไปหน้า History แยก |

### 🟢 P3 — Nice to Have

| # | ปัญหา |
|---|-------|
| G6 | User ไม่สามารถเลือก expense_type ตอนจองได้ |
| G7 | Pickup location ไม่แสดงใน detail modal (minor bug) |

---

## แผนดำเนินการ

```
1. G1: เพิ่ม notify_new_booking() ใน telegram_service.py   [ง่าย, impact สูง]
2. G2: Cancel request flow + status ใหม่                   [สำคัญ, ซับซ้อนปานกลาง]
3. G4: In-app notification badge บน sidebar               [model มีอยู่แล้ว]
4. G5: แสดง rejected บน calendar + style                  [ง่าย]
5. G3: Calendar availability indicator                     [ซับซ้อน]
6. G6, G7: ตามหลัง
```

---

## Notes

- Cancel flow: ต้องคำนวณ budget reverse ด้วย ถ้า booking ที่ cancel เคยบันทึกไมล์แล้ว
- Status ใหม่ `cancellation_requested` ต้องเพิ่มใน DB โดยตรง (ไม่มี migration tool)
- Notification badge: query `Notification` ที่ `is_read=False` ของ current_user
