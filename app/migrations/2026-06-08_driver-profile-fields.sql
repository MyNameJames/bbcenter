-- 2026-06-08: driver-profile-fields — เพิ่มฟิลด์โปรไฟล์คนขับ
-- Reason: เก็บข้อมูลคนขับให้ครบสำหรับออกใบเสร็จ/เอกสาร (เลขบัตร ปชช., ที่อยู่เต็ม, รูปบัตร, รูปโปรไฟล์)
--         ทุกคอลัมน์ nullable — คนขับเดิมไม่ต้อง backfill

BEGIN TRANSACTION;

ALTER TABLE driver ADD COLUMN national_id      VARCHAR(20);
ALTER TABLE driver ADD COLUMN addr_line        VARCHAR(200);
ALTER TABLE driver ADD COLUMN addr_subdistrict VARCHAR(100);
ALTER TABLE driver ADD COLUMN addr_district    VARCHAR(100);
ALTER TABLE driver ADD COLUMN addr_province    VARCHAR(100);
ALTER TABLE driver ADD COLUMN addr_postal      VARCHAR(10);
ALTER TABLE driver ADD COLUMN id_card_image    VARCHAR(255);
ALTER TABLE driver ADD COLUMN avatar_image     VARCHAR(255);

COMMIT;
