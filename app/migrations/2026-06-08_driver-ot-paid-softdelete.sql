-- 2026-06-08: driver-ot-paid-softdelete — ตัด step อนุมัติ OT + soft delete + flag ไม่ออกใบ
-- Reason: หน้า OT (admincost) เปลี่ยน workflow จาก pending→approved→paid เหลือแค่ unpaid|paid
--         + เพิ่ม no_receipt (tab "ผู้ใช้จ่ายเอง" = OT ที่ไม่ต้องออกใบ)
--         + soft delete (tab "ลบ") แทนการลบจริง เพื่อกู้คืนได้
-- Backfill: status เดิม pending/approved → unpaid (ยังไม่จ่าย); paid คงเดิม

BEGIN TRANSACTION;

ALTER TABLE driver_ot ADD COLUMN no_receipt BOOLEAN DEFAULT 0;
ALTER TABLE driver_ot ADD COLUMN is_deleted BOOLEAN DEFAULT 0;
ALTER TABLE driver_ot ADD COLUMN deleted_at DATETIME;

UPDATE driver_ot SET status = 'unpaid' WHERE status IN ('pending', 'approved');

COMMIT;
