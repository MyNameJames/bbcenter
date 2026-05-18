-- 2026-05-18: vehicle-booking-ad-hoc — เพิ่ม 2 columns เพื่อรองรับ ad-hoc trip (งานนอกระบบ)
-- Reason: Driver สร้าง booking on-the-fly จาก /driver page สำหรับทริปที่ไม่ได้จองล่วงหน้า
--   - is_ad_hoc: flag แยก driver-created off-the-books trips ออกจาก pre-booked ปกติ
--                ใช้ filter ad-hoc ออกจาก /vehicle calendar (ยังแสดงในหน้า admin)
--   - contact_name: free-text ผู้ติดต่อ/ผู้จองที่ไม่อยู่ใน LDAP (visitor) — display layer
--                   prefer ค่านี้แทน user.full_name เมื่อ not null

BEGIN TRANSACTION;

-- 1) flag ad-hoc trips (default 0 = booking ปกติ)
ALTER TABLE vehicle_booking ADD COLUMN is_ad_hoc BOOLEAN NOT NULL DEFAULT 0;

-- 2) free-text contact name สำหรับ external visitors / ผู้ติดต่อนอกระบบ LDAP
ALTER TABLE vehicle_booking ADD COLUMN contact_name VARCHAR(100);

COMMIT;

-- Run:
--   sqlite3 app/instance/portal.db < app/migrations/2026-05-18_vehicle-booking-ad-hoc.sql
-- Verify:
--   sqlite3 app/instance/portal.db ".schema vehicle_booking"
