-- 2026-06-16: notification-add-title — เพิ่ม title ให้ตาราง notification
-- Reason: freeze "title" (บรรทัดแรกของ notif card) ตอนสร้าง notification
--   * เดิม title ถูก compute ตอน serialize จาก event_key (_notif_title() ใน vehicle_notification.py)
--     → title เป็น generic ต่อ event_key เดียวกัน แยก case ไม่ได้
--     (เช่น admin-approve vs approver-approve ใช้ event_key='approved' เหมือนกัน)
--   * freeze ตอนสร้าง → แต่ละ notif เก็บ title เฉพาะของมัน + รองรับ dynamic title (เช่น "อนุมัติงาน {purpose}")
-- Note: nullable เพราะ notif เก่าไม่มีค่า → serializer fallback ไปใช้ _notif_title() เดิม
--   db.create_all() ไม่ ALTER ตารางเดิม → ต้องรัน .sql นี้ manual

BEGIN TRANSACTION;

-- 1) title แช่แข็งตอนสร้าง (null = serializer fallback _notif_title)
ALTER TABLE notification ADD COLUMN title VARCHAR(120);

COMMIT;
