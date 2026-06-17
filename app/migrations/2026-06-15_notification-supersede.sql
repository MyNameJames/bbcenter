-- 2026-06-15: notification-supersede — เพิ่ม event_key + superseded_at ให้ตาราง notification
-- Reason: รองรับฟีเจอร์ "supersede" — กัน notification ชนิดเดียวกันของ booking เดิมสะสมซ้ำ
--   * event_key  = ระบุชนิด event แบบ stable (booked/assigned/forwarded/approved/...) เพราะ icon string ใช้ระบุตัวตนไม่ได้
--     (เช่น 'approved' กับ 'payment_done' ใช้ icon 'fa-solid fa-circle-check' เดียวกัน)
--   * superseded_at = เวลาที่ถูกแทนด้วย event ชนิดเดียวกันที่ใหม่กว่า (null = ยัง active/แสดงผล)
-- Note: db.create_all() ไม่ ALTER ตารางเดิม → ต้องรัน .sql นี้ manual

BEGIN TRANSACTION;

-- 1) ชนิด event แบบ stable (กัน icon ชนกัน)
ALTER TABLE notification ADD COLUMN event_key VARCHAR(40);

-- 2) เวลาเมื่อถูกแทนที่ด้วย event ชนิดเดียวกันที่ใหม่กว่า (null = active)
ALTER TABLE notification ADD COLUMN superseded_at DATETIME;

COMMIT;
