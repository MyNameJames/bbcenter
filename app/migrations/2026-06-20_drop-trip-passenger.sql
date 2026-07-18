-- ลบตาราง trip_passenger ออก (2026-06-20)
-- เหตุผล: feature "ขอติดรถ" ถูกตัดออกจาก scope (ไม่มีหน้า UI / route ใดใช้งานจริง)
-- ทดแทน: trip_group linking ที่ admin จัดการเองผ่าน admin_merge

DROP TABLE IF EXISTS trip_passenger;
