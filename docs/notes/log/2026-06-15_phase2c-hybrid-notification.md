# Phase 2c — Hybrid Notification Feed

**วันที่:** 2026-06-15 · **status:** in_progress

## Quick checklist
- [x] 1 PLAN — scoped 5 field ครบ + log file
- [ ] 2 GUARD — ไม่แตะ model/budget → skip
- [ ] 3 BUILD — ใน scope + design rules
- [ ] 4 VERIFY — pytest + browser
- [ ] 5 SYNC — Maintenance Protocol + checker
- [ ] 6 CLOSE — log → doc/

## งาน
เปลี่ยน flat notification feed → hybrid feed:
- Booking notifications: grouped by booking_id (collapsed, click ขยาย)
- Non-booking notifications (แจ้งซ่อม, ค่าน้ำมัน ฯลฯ): solo flat item
- เรียงผสมตามเวลาล่าสุด

## ไฟล์ที่แก้
1. `app/views/vehicle/vehicle_notification.py` — group by booking_id ใน Python; response shape: `{groups[], items[], sticky[], ...}`
2. `app/static/core/js/notification.js` — renderGroup + renderInnerNotif + toggleGroup + buildFeed
3. `app/static/core/css/notification.css` — `.notif-timeline--notifs` + `.notif-inner*` + `.notif-cat-chip`
