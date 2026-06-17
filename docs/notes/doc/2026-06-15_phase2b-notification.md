# Phase 2b — Notification Improvements

**วันที่:** 2026-06-15 · **status:** completed
**roadmap:** แผนรวม DB cleanup + เพิ่ม function — Phase 2b (4 ข้อ)

## งาน

ปรับปรุง notification system 4 ข้อ:
1. Icon สีต่างกันตาม ntype ใน notification panel
2. OT created → แจ้ง admin ทุกคน (เดิมแจ้ง driver)
3. ปิดทริปส่วนตัว/ad-hoc → แจ้ง admin ด้วย
4. Feed เรียงตามเวลา ไม่ group ตาม booking (flat timeline)

## ไฟล์ที่แก้

### Batch 1 — OT recipient (Item 2)
- `app/views/core/notification_service.py`
  - `notify_ot_created()` (Event #25): เปลี่ยน recipient จาก `booking.driver_id` → loop admin ทุกคน (`role_vehicle='admin' OR is_superadmin`)
  - เพิ่ม `notify_admin_personal_trip()` (Event #26): แจ้ง admin ทุกคนเมื่อปิดทริปส่วนตัว/ad-hoc; category=`payment_admin`, ntype=`warning`

### Batch 2 — Personal trip notify + flat feed backend (Items 3, 4)
- `app/views/vehicle/vehicle_common.py`
  - `deduct_budget_for_trip()`: เพิ่ม call `notify_admin_personal_trip()` หลัง deduct เมื่อ `expense_type=='personal' or is_ad_hoc`

- `app/views/vehicle/vehicle_notification.py` — **rewrite 621 → 120 LOC**
  - ลบ: `_fmt_ts`, `_budget_label`, `_plate_of`, `_extract_events`, `_resolve_role`, `_group_notifs`, `_add_synthetic_groups`, `_fetch_bulk_data`, `_run_stage_builders`, `_build_user_stages`, `_build_approver_stages`, `_build_admin_stages`
  - `api_notifications()`: flat query `Notification.user_id == current_user.id` เรียง `created_at DESC` limit 200; response shape เปลี่ยนจาก `{notifications, groups, loose, ...}` → `{items[], sticky[], unread, unread_payment, badge}`
  - admin/approver เห็นเฉพาะ notification ของตัวเอง (ไม่มี synthetic injection)

### Batch 3 — Frontend flat feed + icon colors (Items 1, 4)
- `app/static/core/js/notification.js` — **rewrite 653 → 333 LOC**
  - ลบ: `renderGroup`, `renderStageTimeline`, `toggleGroup`, `state.expanded`, `roleIcon`, `roleLabel`, `roleChipText`, `renderLooseItem`
  - เพิ่ม: `renderItem(n)` — reuses `.notif-group` CSS layout + เพิ่ม `.notif-icon-{ntype}` บน `.notif-cat-icon` สำหรับสี
  - อัปเดต: `renderList` → `data.items`; `renderTabs` → `(data.items||[]).length`; `maybeShowToasts` → `data.items`; click handler → `[data-act="open-item"]` + lookup จาก `data.items`; `state.justRead` เก็บ plain numeric ID (ไม่ใช่ `'loose:'+id`)

- `app/static/core/css/notification.css`
  - เพิ่ม 4 บรรทัดหลัง `.notif-cat-icon [data-lucide]`:
    ```css
    .notif-cat-icon.notif-icon-success { color: var(--vc-green); }
    .notif-cat-icon.notif-icon-info    { color: var(--vc-primary); }
    .notif-cat-icon.notif-icon-warning { color: var(--vc-amber); }
    .notif-cat-icon.notif-icon-danger  { color: var(--vc-red); }
    ```

## Docs (sync)
- `docs/notes/INDEX_ui.md` — notification.js row (flat feed note) + notification.css row (color classes)
- `docs/notes/INDEX_code.md` — `notify_ot_created` (admin not driver) + `notify_admin_personal_trip` Event #26
- `docs/notes/INDEX_routes.md` — `/api/notifications` line numbers corrected + response shape noted
- `docs/notes/architecture.md` — Event #25 recipient fix + Event #26 added; date bumped 2026-06-15

## Verify
- pytest: 48 passed (ก่อน Batch 3 — JS/CSS ไม่มี test)
- ผู้ใช้ทดสอบใน browser :5001 — notification panel เปิด, items เรียงตามเวลา, icon สีต่างกันตาม ntype

## หมายเหตุ
- Phase 1 migration (`2026-06-14_drop-dead-columns.sql`) ยังไม่ได้รัน → รัน `sqlite3 app/instance/portal.db < app/migrations/2026-06-14_drop-dead-columns.sql` ก่อนทดสอบ production
