-- 2026-08-05: vehicle-booking-add-note — เพิ่ม note ให้ตาราง vehicle_booking
-- Reason: eventDetailModal redesign (vehicle_detail.html) — ช่อง "หมายเหตุ" ใน
--   bookingModal (vehicle_book.html) มีอยู่แล้วแต่เป็น orphan input (id="travelDate"
--   ไม่มี name เลย ไม่เคยถูกส่ง/เก็บที่ไหน) ผู้ใช้ยืนยันให้เก็บเป็น DB column จริง
-- Existing rows: ไม่ backfill — nullable, booking เดิมเป็น NULL
-- รันด้วย: sqlite3 app/instance/portal.db < app/migrations/2026-08-05_vehicle-booking-add-note.sql

BEGIN TRANSACTION;

ALTER TABLE vehicle_booking ADD COLUMN note VARCHAR(300);

COMMIT;

-- Verify (run manually after):
-- .schema vehicle_booking
