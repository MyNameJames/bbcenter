-- 2026-06-12: user-line-id — เพิ่ม LINE Messaging API fields ให้ตาราง user
-- Reason: เพิ่มช่องทางแจ้งเตือน LINE (ช่องทางที่ 3 ต่อจาก Telegram + in-app)
--         line_user_id = push แจ้งเตือนรายคน · line_link_code = flow ผูกบัญชีแบบโค้ด 6 หลักผ่าน chat
-- Note: SQLite ไม่รองรับ ADD COLUMN แบบ inline UNIQUE → เพิ่ม column ก่อน แล้วสร้าง UNIQUE INDEX แยก

BEGIN TRANSACTION;

-- 1) LINE userId (จาก webhook ตอนผูกบัญชี) — push แจ้งเตือนรายคน
ALTER TABLE user ADD COLUMN line_user_id VARCHAR(64);

-- 2) โค้ด 6 หลักชั่วคราวสำหรับ flow ผูกบัญชี LINE ผ่าน chat
ALTER TABLE user ADD COLUMN line_link_code VARCHAR(6);

-- 3) UNIQUE บน line_user_id (ผ่าน index เพราะ SQLite เพิ่ม UNIQUE column ผ่าน ALTER ไม่ได้)
CREATE UNIQUE INDEX IF NOT EXISTS ix_user_line_user_id ON user(line_user_id);

COMMIT;
