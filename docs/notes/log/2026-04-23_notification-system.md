# Notification System — In-App Notification (Vehicle Module)
**วันที่:** 2026-04-23
**อัปเดตล่าสุด:** 2026-04-24
**สถานะ:** completed — DB migration applied, server running

## เป้าหมาย
สร้างระบบ In-App Notification สำหรับระบบยานพาหนะ ครอบคลุม 15 events ตั้งแต่การจอง → อนุมัติ → ไมล์ → งบประมาณ → ชำระเงิน พร้อม:
- Bell dropdown (desktop + mobile)
- Toast popup สำหรับ event สำคัญ
- Group by booking
- Tabs (ทั้งหมด / ยังไม่อ่าน / ต้องจ่ายเงิน)
- Personal payment escalation flow (3 วัน → user, 7 วัน → user + admin)

## การตัดสินใจ

### Scope
- **ระยะนี้:** เฉพาะระบบยานพาหนะ (ผู้จอง + admin สำหรับ payment escalation)
- **Future:** ครอบคลุม repair, maintenance, room (เก็บใน `future_features.md`)

### 15 Events
1. จองสำเร็จ (pending)
2. Admin assign รถ/คนขับ
3. Admin อนุมัติตรง
4. Admin ส่งต่อ Approver
5. Approver อนุมัติ
6. Admin/Approver ปฏิเสธ
7. ถูกรวมเข้ากลุ่มทริป (merge)
8. คนขับบันทึกไมล์ start
9. คนขับบันทึกไมล์ end
10. หักงบ central (แจ้งผู้จองด้วย)
11. หักงบ department (แจ้งผู้จองด้วย)
12. Personal unpaid (ครั้งแรก)
13. Personal reminder (escalate day 3, day 7)
14. Admin แก้ไข booking ของ user (ไม่แจ้งถ้า user แก้เอง)
15. Admin ลบ booking ของ user

### Payment Flow
- Admin เป็นคน mark "ได้รับเงินแล้ว"
- User กด "จ่ายแล้ว" = แจ้ง intent (ยังไม่ is_paid จริง)
- Escalation: day 3 → เตือน user, day 7+ → แจ้ง admin ด้วย

### Tech Choices
- Polling ทุก 30 วินาที (ไม่ใช้ WebSocket)
- Badge number: 1-30, แสดง `30+` ถ้าเกิน
- Toast: มุมล่างขวา 3 วินาที (เฉพาะ event สำคัญ)
- Retention: แสดง 90 วันล่าสุด, ไม่ลบจริง
- Reminder stop: ถ้า unread + เกิน 40 วัน หยุดส่ง (ยกเว้น payment — ไม่หยุดจนกว่าจะจ่าย)
- Cron: APScheduler (เพิ่ม dependency)
- Grouping: by booking_id (1 card/booking)

### DB Changes
- `notification` เพิ่ม: `category`, `action_url`, `is_sticky`, `expired_at`, `icon`
- `vehicle_mileage` เพิ่ม: `user_reported_paid`, `user_reported_at`, `last_reminder_at`
- ✅ Migration applied แล้ว (2026-04-24) ผ่าน sqlite3 bash command ทีละ statement

## ไฟล์ที่แก้ไข

### Backend
- `app/models.py` — เพิ่ม 5 columns ใน `Notification` (category, action_url, is_sticky, expired_at, icon) และ 3 columns ใน `VehicleMileage` (user_reported_paid, user_reported_at, last_reminder_at)
- `app/migrations/2026-04-23_notification-enhance.sql` — SQL ALTER TABLE + CREATE INDEX (user ต้องรันเอง)
- `app/views/notification_service.py` — **ใหม่** (~230 บรรทัด) 15 `notify_*` functions + `_create()` helper, ICON registry ใช้ Font Awesome ทั้งหมด
- `app/views/notification_cron.py` — **ใหม่** `check_payment_escalation()` + `init_scheduler()` (APScheduler, tz=Asia/Bangkok, 08:00)
- `requirements.txt` — เพิ่ม `APScheduler==3.10.4`
- `app/app.py` — เรียก `init_scheduler(app)` พร้อม `WERKZEUG_RUN_MAIN` guard
- `app/views/vehicle_view.py` — wire notify_* เข้า 15 events (book, approve, assign, merge, mileage, delete), เขียน `/api/notifications` ใหม่ (groups/sticky/loose/badge), เพิ่ม `/api/payment/report/<mileage_id>` + `/api/payment/report-by-booking/<booking_id>`, mark-paid endpoint bulk-close sticky + notify_payment_confirmed

### Frontend
- `app/static/css/notification.css` — **ใหม่** (~490 บรรทัด) bell + badge animations, panel dropdown (mobile full-screen), tabs, sticky payment card (overdue-7/14 variants), group card + timeline, toast, prefers-reduced-motion
- `app/static/js/notification.js` — **ใหม่** (~360 บรรทัด) polling 30s, groups/sticky/loose rendering, toast สำหรับ event สำคัญ, badge 30+ cap, mark-read on expand
- `app/templates/_notification_panel.html` — **ใหม่** markup bell + dropdown panel
- `app/templates/_notification_toast.html` — **ใหม่** toast container
- `app/templates/_header.html` — ลบ inline notification (~80 บรรทัด) → `{% include %}` 2 partials + link CSS/JS

### Docs
- `docs/notes/future_features.md` — เพิ่ม #8 (notification ขยายโมดูลอื่น) + #9 (user preferences)

## ขั้นตอน Deploy (บันทึกสถานะ)

| ขั้นตอน | สถานะ |
|---|---|
| `pip install APScheduler` | ✅ ติดตั้งแล้ว |
| DB migration (ALTER TABLE + CREATE INDEX) | ✅ Applied แล้ว (2026-04-24 bash) |
| Flask server restart | ✅ Running |

## API ที่เพิ่ม

| Method | Path | ใช้กับ |
|---|---|---|
| GET  | `/api/notifications` | polling — return {groups, sticky, loose, unread, unread_payment, badge} |
| POST | `/api/notifications/<id>/read` | mark single read |
| POST | `/api/notifications/read-all` | mark all |
| POST | `/api/payment/report/<mileage_id>` | user แจ้งจ่าย (by mileage) |
| POST | `/api/payment/report-by-booking/<booking_id>` | user แจ้งจ่าย จาก notification panel |

## Icons — Font Awesome ทั้งหมด (ไม่มี emoji)

Bell: `fa-regular fa-bell` ↔ `fa-solid fa-bell` (swap เมื่อมี unread)  
Category: payment=`fa-credit-card`, mileage=`fa-gauge-high`, budget=`fa-receipt`, status=`fa-circle-check/xmark/info/bell`

## การเปลี่ยนแปลงเพิ่มเติม (2026-04-24)

### [Fix] DB migration ไม่ถูก apply — แก้ด้วย bash ทีละ statement
SQL file เดิมใช้ `BEGIN TRANSACTION` ซึ่ง SQLite จะ rollback ทั้งหมดถ้ามี column ซ้ำ
→ แก้ด้วยการรัน `sqlite3` ทีละบรรทัดแบบไม่มี transaction เพื่อข้าม column ที่มีอยู่แล้วได้

### [Change] Payment notification action — ไม่ใช้หน้า vehicle/detail/<id>#payment แล้ว
**Decision:** เมื่อ user คลิก "ดูรายละเอียด" จาก payment notification → ไป `/vehicle?pay=<booking_id>` แล้วเปิด `eventDetailModal` / `groupDetailModal` ที่มีอยู่แล้ว (ไม่สร้าง modal ใหม่)

**เหตุผล:** ไม่ต้องการหน้าแยก — ให้ user อยู่บนหน้า `/vehicle` แล้วเห็น popup ทันที

**ไฟล์ที่แก้:**
- `app/views/notification_service.py` — `action_url` ของ `notify_payment_required()` และ `notify_payment_reminder_user()` เปลี่ยนจาก `/vehicle/detail/{id}#payment` → `/vehicle?pay={id}`
- `app/templates/vehicle/vehicle.html` — เพิ่ม JS snippet ท้ายไฟล์ ตรวจ `?pay=<id>` → เรียก `openEventDetail(id)` (polling รอ `mockEvents` + `openEventDetail` พร้อม) → `history.replaceState` เคลียร์ `?pay=` จาก URL โดยไม่ reload

**ไม่ต้องเพิ่ม:** API endpoint หรือ modal ใหม่ใดๆ — ใช้ `openEventDetail()` ใน `vehicle.js` ได้เลย
