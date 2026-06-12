# 2026-06-11 — cancel-refund rework + auto-reject cron

> status: in_progress · plan: ~/.claude/plans/1-noble-fox.md

## Scope

- [ไฟล์]: vehicle_booking.py · vehicle_admin.py · vehicle_budget.py · vehicle_budget_service.py · notification_service.py · notification_cron.py · vehicle.html · vehicle.js · vehicle_admin.js · vehicle_budget.html · tests/
- [ตำแหน่ง]: cancel/delete/reject/revert guards + refund call sites 6 จุด + cron job ใหม่
- [งาน]: Phase 1 = owner ยกเลิกได้เฉพาะ pending/waiting_approver + ถอด refund_for_booking ทั้งระบบ (เก็บ rededuct/refund_for_mileage) · Phase 2 = cron 08:10 auto-reject pending/waiting_approver ที่เลยวันเดินทาง + notify owner
- [ข้อจำกัด]: test-first (logic เงิน/สถานะ) · ห้ามแตะ used_amount ตรง · ไม่มี model change · ห้าม import app/app.py ใน tests
- [output]: code + tests เขียว + docs sync (INDEX_routes/INDEX_code/CHANGELOG/future_features)

## Checklist

- [x] 1 PLAN — scoped 5 field ครบ + log file
- [x] 2 GUARD — test_booking_cancel_guards.py 10 tests + route_app/client fixtures
- [x] 3 BUILD — Phase 1 เสร็จ: guards + refund removal + submitRevert fix + UI
- [ ] 4 VERIFY — pytest รอ confirm จากผู้ใช้
- [x] 5 SYNC — Maintenance Protocol + checker ผ่าน (INDEX_routes/code/ui + CHANGELOG + future_features)
- [ ] 6 CLOSE — log → doc/ (รอ pytest ผ่าน)

## Notes ระหว่างงาน

- (ว่าง)
