# LINE Flex Card + Postback Approve
**วันที่:** 2026-06-18
**สถานะ:** completed

## เป้าหมาย
- เปลี่ยน LINE notification จาก plain text → Flex Card (SCB-style design)
- Group card: 5 events (approved/forwarded/approver_approved/rejected/cancelled)
- Approver DM card: ปุ่มอนุมัติ postback + deadline 1 วัน
- Postback handler: approve booking โดยตรงจาก LINE

## การตัดสินใจ
- ใช้ `guard_budget` + `apply_transition` จาก vehicle_workflow (ไม่ duplicate logic)
- Lazy import ใน postback handler กัน circular import
- Approver ได้รับ 2 DM (plain text จาก _create + flex card จาก notify_approver_action_required_dm) — known tradeoff, refine ภายหลัง
- `reply_flex()` ใน line_service สำหรับ webhook reply แบบ flex

## ไฟล์ที่แก้ไข
- app/views/core/line_service.py
- app/views/core/line_webhook.py
- app/views/core/broadcast.py

## Docs sync checklist
- [x] architecture.md § Notification Architecture (LINE section เพิ่ม flex + postback)
- [x] INDEX_ui.md — ไม่มี template เปลี่ยน
- [x] INDEX_routes.md — ไม่มี route ใหม่ (postback ใช้ /line/webhook เดิม)
