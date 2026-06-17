# notif-supersede — กัน notification ซ้ำต่อ booking + driver gap

> status: completed · 2026-06-15 · syntax check ผ่าน (.venv py_compile), checker PASS, รอ user รัน migration + ทดสอบ browser

## ปัญหา
booking #54 มี 11 notif (คาด ≤5) = legacy old-format + booking ถูกแก้/re-approve หลายรอบ + user หลาย role. `_emit` dedup ใน event เดียวแล้ว แต่ event ชนิดเดียวยิงหลายรอบ (reassign/re-forward/re-approve) สะสมข้าม event

## วิธีแก้ (user เลือก: supersede + แจ้ง driver)
1. **Model:** +`event_key` +`superseded_at` (db-helper → migration `2026-06-15_notification-supersede.sql` + schema.md Part1+2 + migrations-index v2.19)
2. **`_create`:** รับ `event_key` → ถ้ามี booking_id+event_key+ไม่ sticky → mark notif เดิม (user+booking+event_key) `superseded_at=now` ก่อน add ใหม่
3. **notify_*:** ใส่ event_key — booked/assigned/forwarded/approved/rejected/merged/mileage_start/mileage_end/budget/edited/cancelled. **ข้าม** payment(sticky)/repair/room(booking_id=None)
4. **driver gap:** `notify_admin_assigned` เพิ่ม recipient driver "Admin แจ้งเปลี่ยนรถ…"
5. **อ่าน:** `api_notifications` filter `superseded_at IS NULL` (notifs + unread)

## ไฟล์
- app/models/common.py, app/migrations/2026-06-15_notification-supersede.sql
- app/views/core/notification_service.py, app/views/vehicle/vehicle_notification.py
- schema.md, migrations-index.md, INDEX_code.md

## ต้องรัน (user)
`sqlite3 app/instance/portal.db < app/migrations/2026-06-15_notification-supersede.sql`

## หมายเหตุ
- legacy notif (event_key=NULL) ไม่ถูก supersede ย้อนหลัง — แค่ booking ใหม่สะอาด (ตามที่ตกลง)
- Telegram ไม่แตะ (in-app เท่านั้น)

## Checklist
- [x] PLAN/GUARD/BUILD
- [ ] VERIFY — pytest + user รัน migration + ทดสอบ browser
- [ ] SYNC — checker
- [ ] CLOSE
