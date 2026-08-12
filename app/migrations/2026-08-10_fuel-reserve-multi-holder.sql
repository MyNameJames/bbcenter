-- 2026-08-10: fuel-reserve-multi-holder — หน้าค่าน้ำมัน → "เงินสำรองและค่าใช้จ่าย" (Phase 1)
--   spec: docs/notes/log/2026-08-10_fuel-reserve-redesign.md §3
--
-- Reason (จากผู้ใช้จริง — เจ้าหน้าที่ใช้สัปดาห์ละ 3–4 ครั้ง):
--   R1) เงินสำรองมีหลายคนควักจ่าย แต่ระบบเก็บเป็น singleton row (fuel_reserve_config)
--       → แยกไม่ออกว่าใครควักเงิน ใครต้องได้คืน  → expense_holder (บัญชีรายคน)
--       + fuel_bill.paid_by_holder_id + reimbursement_settlement (คืนเงินทีละคน)
--   R2) เงินสำรองไม่ได้จ่ายแค่ค่าน้ำมัน (ทางด่วน/ซ่อม/พรบ.) → fuel_bill.category
--   R3) วงเงินบัตรน้ำมัน + สิทธิ์เบิกของแต่ละแหล่งคุมไม่ได้ → vehicle_quota (effective-dated)
--   R4) แหล่งเบิกเป็น free text พิมพ์ไม่ตรงกัน → reimbursement_source + FK
--   R5) payment_method='transfer' สื่อผิด (label ว่า "เงินสด" แต่ค่าเป็น transfer)
--       → เปลี่ยนเป็น 'reserve' (= ควักเงินสำรองจ่าย)
--
-- หลักการที่ schema ต้องบังคับ:
--   • "คงเหลือ" ของแต่ละคน = derived (float_amount − ใช้ไปแล้ว − ทำเรื่องเบิกแล้ว)
--     → ห้ามมี column balance เด็ดขาด ไม่งั้น drift
--   • vehicle_quota แก้วงเงิน = INSERT แถวใหม่ ห้าม UPDATE แถวเดิม
--     (ผู้ใช้ยืนยันว่าวงเงินเปลี่ยนได้ ถ้าเขียนทับ เดือนย้อนหลังจะคำนวณผิดทันที)
--   • reimbursement_settlement.amount = snapshot ตอนกด "ส่งเรื่อง" ไม่ใช่คำนวณสดทุกครั้ง
--
-- fuel_bill ต้อง rebuild ทั้งตาราง เพราะ vehicle_id เปลี่ยนจาก NOT NULL → nullable
--   (บิลที่ไม่มีชื่อรถ เช่น ค่าทางด่วนของทริปที่จำรถไม่ได้) SQLite แก้ constraint ตรงๆ ไม่ได้
--
-- ⚠️ ลำดับสำคัญ: ต้อง UPDATE transfer→reserve (ขั้น 6) ก่อนเซ็ต paid_by_holder_id (ขั้น 7)
--    ไม่งั้นจับบิลเงินสำรองไม่ครบ
-- ⚠️ backup ก่อนรันบน prod เสมอ
--
-- รันซ้ำได้อย่างปลอดภัย (review 2026-08-10 #5) — ขั้น 0 เป็น migration ledger: รันครั้งที่ 2
--   ขึ้นไป INSERT ลง schema_migration จะชน UNIQUE constraint ทันทีเป็นคำสั่งแรกในทรานแซกชัน
--   → -bail หยุดทั้งสคริปต์ก่อนแตะ ขั้น 4 (rebuild fuel_bill) เลย กันปัญหาเดิมที่เคย SELECT
--   ค่า 'fuel'/NULL ทับ category/paid_by_holder_id ที่ผู้ใช้กรอกไว้จริงหลัง migrate ครั้งแรก
--   (raw SQL ไม่มี IF ระดับ DDL — ledger row เป็นวิธีที่ทำให้ "รันซ้ำ = no-op" ได้จริงใน SQLite ล้วน)
-- ⚠️ ต้องรันด้วย `-bail` เสมอ ไม่งั้น error จาก ledger จะถูกข้ามแล้วรันขั้นต่อไปต่อ (พฤติกรรม default
--   ของ sqlite3 CLI คือ "พิมพ์ error แล้วรันบรรทัดถัดไปต่อ" ไม่ใช่หยุดทั้งไฟล์)
-- ⚠️ 4 ตารางใหม่ยังคง IF NOT EXISTS ไว้เผื่อ db.create_all() ตอน app start สร้างให้ก่อนแล้ว
--   (คนละกรณีกับการรันซ้ำทั้งไฟล์ — เคสนั้น ledger ยังไม่มี row จึงยังรันมาถึงตรงนี้ได้ปกติ)
--
-- รันด้วย: sqlite3 -bail app/instance/portal.db < app/migrations/2026-08-10_fuel-reserve-multi-holder.sql

PRAGMA foreign_keys=OFF;

BEGIN TRANSACTION;

-- ─────────────────────────────────────────────────────────────
-- 0) migration ledger — gate กันรันซ้ำ (ต้องอยู่ก่อนสเต็ปอื่นทั้งหมด)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migration (
    id          INTEGER PRIMARY KEY,
    version     TEXT NOT NULL UNIQUE,
    applied_at  DATETIME
);
INSERT INTO schema_migration (version, applied_at)
VALUES ('2026-08-10_fuel-reserve-multi-holder', datetime('now', '+7 hours'));

-- ─────────────────────────────────────────────────────────────
-- 1) ตารางใหม่ 4 ตัว
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_holder (
    id            INTEGER PRIMARY KEY,
    user_id       INTEGER NOT NULL UNIQUE REFERENCES "user"(id),
    float_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_active     BOOLEAN DEFAULT 1,
    created_at    DATETIME,
    updated_at    DATETIME
);

CREATE TABLE IF NOT EXISTS reimbursement_source (
    id          INTEGER PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    is_default  BOOLEAN DEFAULT 0,
    is_active   BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS vehicle_quota (
    id              INTEGER PRIMARY KEY,
    vehicle_id      INTEGER NOT NULL REFERENCES vehicle(id),
    kind            VARCHAR(20) NOT NULL,           -- 'card' | 'source'
    source_id       INTEGER REFERENCES reimbursement_source(id),
    limit_amount    NUMERIC(12,2) NOT NULL,
    effective_from  DATE NOT NULL,
    created_by      INTEGER REFERENCES "user"(id),
    created_at      DATETIME
);
CREATE INDEX IF NOT EXISTS ix_vehicle_quota_lookup ON vehicle_quota (vehicle_id, kind, effective_from);

CREATE TABLE IF NOT EXISTS reimbursement_settlement (
    id                INTEGER PRIMARY KEY,
    reimbursement_id  INTEGER NOT NULL REFERENCES fuel_reimbursement(id),
    holder_id         INTEGER NOT NULL REFERENCES expense_holder(id),
    amount            NUMERIC(12,2) NOT NULL,
    settled_at        DATE,
    CONSTRAINT uq_settlement_rb_holder UNIQUE (reimbursement_id, holder_id)
);

-- ─────────────────────────────────────────────────────────────
-- 2) seed แหล่งเบิก (D: DCI = ค่าเริ่มต้น) — WHERE NOT EXISTS กันซ้ำเป็นชั้นที่ 2
--    (ชั้นแรกคือ ledger ขั้น 0 ที่กันทั้งสคริปต์ไม่ให้มาถึงตรงนี้อยู่แล้วถ้าเคยรัน)
-- ─────────────────────────────────────────────────────────────
INSERT INTO reimbursement_source (name, is_default, is_active)
SELECT 'DCI', 1, 1 WHERE NOT EXISTS (SELECT 1 FROM reimbursement_source WHERE name = 'DCI');
INSERT INTO reimbursement_source (name, is_default, is_active)
SELECT 'วัดพระธรรมกาย', 0, 1 WHERE NOT EXISTS (SELECT 1 FROM reimbursement_source WHERE name = 'วัดพระธรรมกาย');

-- ─────────────────────────────────────────────────────────────
-- 3) เจ้าหน้าที่หลัก 1 คน — วงเงิน = fuel_reserve_config.amount เดิม (D12)
--    หา user จาก fuel_reserve_config.updated_by · ถ้าไม่มี → คนที่สร้างบิลมากที่สุด
--    ถ้าหาไม่เจอเลย (DB เปล่า) → ไม่ insert · ขั้นถัดไปจะ no-op ทั้งหมด
-- ─────────────────────────────────────────────────────────────
INSERT INTO expense_holder (user_id, float_amount, is_active, created_at)
SELECT h.uid,
       COALESCE((SELECT amount FROM fuel_reserve_config WHERE id = 1), 0),
       1,
       datetime('now', '+7 hours')
FROM (
    SELECT COALESCE(
        (SELECT updated_by FROM fuel_reserve_config WHERE id = 1 AND updated_by IS NOT NULL),
        (SELECT created_by FROM fuel_bill WHERE created_by IS NOT NULL
          GROUP BY created_by ORDER BY COUNT(*) DESC LIMIT 1)
    ) AS uid
) h
WHERE h.uid IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 4) fuel_bill — rebuild (vehicle_id → nullable) + column ใหม่
-- ─────────────────────────────────────────────────────────────
CREATE TABLE fuel_bill_new (
    id                 INTEGER PRIMARY KEY,
    bill_date          DATE NOT NULL,
    vehicle_id         INTEGER REFERENCES vehicle(id),          -- nullable แล้ว
    driver_id          INTEGER NOT NULL REFERENCES driver(id),
    amount             NUMERIC(10,2) NOT NULL,
    payment_method     VARCHAR(20) NOT NULL,                    -- reserve|card|self
    category           VARCHAR(20) NOT NULL DEFAULT 'fuel',     -- fuel|toll|repair|insurance|other
    liters             NUMERIC(8,2),
    mileage            INTEGER,
    note               VARCHAR(500),
    reimbursement_id   INTEGER REFERENCES fuel_reimbursement(id),
    paid_by_holder_id  INTEGER REFERENCES expense_holder(id),   -- null เมื่อ method ≠ reserve
    created_by         INTEGER REFERENCES "user"(id),
    created_at         DATETIME,
    updated_at         DATETIME
);

INSERT INTO fuel_bill_new
    (id, bill_date, vehicle_id, driver_id, amount, payment_method, category, liters,
     mileage, note, reimbursement_id, paid_by_holder_id, created_by, created_at, updated_at)
SELECT
     id, bill_date, vehicle_id, driver_id, amount, payment_method, 'fuel', NULL,
     mileage, note, reimbursement_id, NULL, created_by, created_at, updated_at
FROM fuel_bill;

DROP TABLE fuel_bill;
ALTER TABLE fuel_bill_new RENAME TO fuel_bill;
CREATE INDEX IF NOT EXISTS ix_fuel_bill_holder ON fuel_bill (paid_by_holder_id);
CREATE INDEX IF NOT EXISTS ix_fuel_bill_date   ON fuel_bill (bill_date);

-- ─────────────────────────────────────────────────────────────
-- 5) column ใหม่ของตารางเดิม
-- ─────────────────────────────────────────────────────────────
ALTER TABLE fuel_reimbursement ADD COLUMN source_id INTEGER REFERENCES reimbursement_source(id);
ALTER TABLE fuel_reimbursement ADD COLUMN status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE fuel_reimbursement ADD COLUMN amount_requested NUMERIC(12,2);
ALTER TABLE fuel_reimbursement ADD COLUMN amount_received NUMERIC(12,2);

ALTER TABLE fuel_reserve_log ADD COLUMN holder_id INTEGER REFERENCES expense_holder(id);
ALTER TABLE fuel_reserve_log ADD COLUMN log_type VARCHAR(20) DEFAULT 'adjust';

-- ─────────────────────────────────────────────────────────────
-- 6) rename ค่า transfer → reserve  (ต้องมาก่อนขั้น 7)
-- ─────────────────────────────────────────────────────────────
UPDATE fuel_bill SET payment_method = 'reserve' WHERE payment_method = 'transfer';

-- ─────────────────────────────────────────────────────────────
-- 7) บิลเงินสำรองเดิมทั้งหมด = ของเจ้าหน้าที่หลัก (D12)
-- ─────────────────────────────────────────────────────────────
UPDATE fuel_bill
   SET paid_by_holder_id = (SELECT id FROM expense_holder ORDER BY id LIMIT 1)
 WHERE payment_method = 'reserve';

-- ─────────────────────────────────────────────────────────────
-- 8) log เดิม = ของเจ้าหน้าที่หลัก · ชนิด 'adjust' (ของเดิมไม่ได้แยกชนิด)
-- ─────────────────────────────────────────────────────────────
UPDATE fuel_reserve_log
   SET holder_id = (SELECT id FROM expense_holder ORDER BY id LIMIT 1),
       log_type  = 'adjust';

-- ─────────────────────────────────────────────────────────────
-- 9) ใบเบิกเดิม — ไม่มีใบไหนเป็นร่าง (ของเดิมสร้างพร้อมบิลเสมอ)
-- ─────────────────────────────────────────────────────────────
UPDATE fuel_reimbursement
   SET status = CASE WHEN received_at IS NOT NULL THEN 'received' ELSE 'submitted' END;

-- แหล่งเบิก free text → FK เฉพาะที่ชื่อตรงกันเป๊ะ (ที่เหลือปล่อย null ให้คนมาเลือกเอง)
UPDATE fuel_reimbursement
   SET source_id = (SELECT s.id FROM reimbursement_source s WHERE s.name = fuel_reimbursement.source)
 WHERE source IS NOT NULL
   AND EXISTS (SELECT 1 FROM reimbursement_source s WHERE s.name = fuel_reimbursement.source);

-- ─────────────────────────────────────────────────────────────
-- 10) settlement ย้อนหลัง — 1 แถวต่อใบเบิก (มีผู้สำรองคนเดียวในข้อมูลเก่า)
--     amount นับเฉพาะบิล 'reserve' ในใบนั้น: บิล card/self ไม่เคยควักเงินสำรอง
--     ถ้านับด้วยจะทำให้ "ทำเรื่องเบิกแล้ว" พองเกินจริงและสมการ §1.ก พัง
-- ─────────────────────────────────────────────────────────────
INSERT INTO reimbursement_settlement (reimbursement_id, holder_id, amount, settled_at)
SELECT rb.id,
       (SELECT id FROM expense_holder ORDER BY id LIMIT 1),
       (SELECT COALESCE(SUM(b.amount), 0) FROM fuel_bill b
         WHERE b.reimbursement_id = rb.id AND b.payment_method = 'reserve'),
       rb.received_at
FROM fuel_reimbursement rb
WHERE (SELECT id FROM expense_holder ORDER BY id LIMIT 1) IS NOT NULL
  AND (SELECT COALESCE(SUM(b.amount), 0) FROM fuel_bill b
        WHERE b.reimbursement_id = rb.id AND b.payment_method = 'reserve') > 0;

COMMIT;

PRAGMA foreign_keys=ON;

-- Verify (รันมือหลัง migrate):
-- SELECT payment_method, COUNT(*), SUM(amount) FROM fuel_bill GROUP BY payment_method;
--   คาดหวัง: ไม่มี 'transfer' เหลือ · ยอดรวมทุกช่องทางเท่าก่อน migrate
-- SELECT h.id, h.float_amount,
--        (SELECT COALESCE(SUM(b.amount),0) FROM fuel_bill b
--          WHERE b.paid_by_holder_id=h.id AND b.payment_method='reserve'
--            AND b.reimbursement_id IS NULL) AS used,
--        (SELECT COALESCE(SUM(s.amount),0) FROM reimbursement_settlement s
--          WHERE s.holder_id=h.id AND s.settled_at IS NULL) AS submitted
--   FROM expense_holder h;
--   คาดหวัง: float_amount − used − submitted = คงเหลือ ตรงกับที่หน้าเดิมเคยโชว์
