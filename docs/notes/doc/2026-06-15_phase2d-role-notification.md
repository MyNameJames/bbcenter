# Phase 2d — Role-Aware Notification Content (in-app)

**วันที่:** 2026-06-15 · **status:** ✅ completed

## Quick checklist
- [x] 1 PLAN — scoped + log file + 3 decisions
- [x] 2 GUARD — ไม่แตะ model/budget mutation → skip db-helper + test-first
- [x] 3 BUILD — Phase A (vehicle) + Phase B (repair/maintenance/room)
- [x] 4 VERIFY — pytest 48 passed; browser = ผู้ใช้ทดสอบเอง (server :5001 user process)
- [x] 5 SYNC — INDEX_code + architecture + date bump + checker PASS
- [x] 6 CLOSE — log → doc/

## สรุปงาน
notification in-app เปลี่ยนเป็น **role-aware multi-recipient** — แต่ละ event แตกข้อความตามบทบาท
(User / Admin / Approver / Driver) แล้วส่งหลายผู้รับใน 1 event

**Decisions:** in-app เท่านั้น (Telegram ไม่แตะ) · แบ่ง 2 phase · driver/approver ไม่มี account → `logger.warning` + skip

## กลไกกลาง (notification_service.py)
- `_emit(role_msgs)` — dict `{user_id: message}`, dedup + skip None/ว่าง
- resolver: `_vehicle_admin_ids()`, `_booking_approver_ids()` (DeptApprover by dept),
  `_booking_driver_uid()` (`Driver.linked_user`; ไม่มี → warning+None)
- `_cost_lines(fuel, ot)` — detail+total, **ตัดบรรทัด OT ถ้า ≤0** (กฎ self-pay: ย้าย OT ไป no_receipt → หายอัตโนมัติ)
- `_budget_sub_label()` — ชื่องบย่อยสำหรับข้อความค่าเดินทาง (lazy import EXPENSE_CATEGORIES — circular)

## Highlights
- **Approver + Driver ได้ in-app ครั้งแรก** (เดิม Telegram อย่างเดียว)
- **ไม่แตะ call site เลย** — ทุก notify_* ยังรับ `booking` เหมือนเดิม, ผู้รับ resolve ภายใน
- ทำงานคู่ Phase 2c feed (group by booking_id) → หลายบทบาทยุบเป็น 1 card/booking

## ไฟล์ที่แก้
1. `app/views/core/notification_service.py` — helpers + 17 notify functions (vehicle/repair/maintenance/room)
2. `docs/notes/INDEX_code.md` — notification rows + helper row
3. `docs/notes/architecture.md` — Phase 2d blockquote
4. `CLAUDE.md` — date bump 2026-06-15

## รอผู้ใช้ทดสอบ browser (:5001)
- login admin/approver/driver → ตรวจแต่ละ role เห็นข้อความถูก variant
- personal trip ที่ OT ย้ายไป self-pay (no_receipt) → ข้อความไม่มีบรรทัด "ค่าล่วงเวลาสารถี"
- งานกอง → approver เห็น "ขอใช้รถ (งานกอง)…" ตอนส่งต่อ + "อนุมัติเรียบร้อย…" ตอน approve + "งาน {sub} หักงบ…" ตอนปิดทริป
