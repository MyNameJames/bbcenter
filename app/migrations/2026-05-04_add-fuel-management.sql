-- ══════════════════════════════════════════════════════════════
-- Migration: Add fuel-management tables
--   fuel_reimbursement, fuel_bill, fuel_price, fuel_reserve_config, fuel_reserve_log
-- วันที่: 2026-05-04
-- รันด้วย: sqlite3 app/instance/portal.db < app/migrations/2026-05-04_add-fuel-management.sql
--
-- วัตถุประสงค์:
--   หน้า /admin/fuel — บันทึกบิลค่าน้ำมันที่จ่ายให้คนขับ, รวมเป็นใบเบิก,
--   ติดตามวันที่ admin ได้เงินคืน, แทน SystemConfig['fuel_price'] ด้วยตาราง
--   ราคา/ลิตร แบบ time-effective, และติดตามเงินสำรอง (เงินสด) ที่ admin ถืออยู่
--
-- หมายเหตุ FK ordering:
--   fuel_reimbursement ต้อง CREATE ก่อน fuel_bill (FK dependency)
-- ══════════════════════════════════════════════════════════════

BEGIN TRANSACTION;

-- ── 1. fuel_reimbursement — ใบเบิกรวม (1 ใบ : N บิล) ──
CREATE TABLE IF NOT EXISTS fuel_reimbursement (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    reimbursement_no VARCHAR(50)  NOT NULL,                  -- เลขใบเบิก เช่น จ69-00164
    source           VARCHAR(100),                           -- แหล่งเบิก เช่น "บางบาล"
    submitted_at     DATE,                                   -- วันที่ส่งเรื่องเบิก
    received_at      DATE,                                   -- วันที่ได้เงินคืน
    note             VARCHAR(500),
    created_by       INTEGER       REFERENCES user(id),
    created_at       DATETIME,
    updated_at       DATETIME
);

-- ── 2. fuel_bill — บิลค่าน้ำมันเดี่ยว (FK → fuel_reimbursement) ──
CREATE TABLE IF NOT EXISTS fuel_bill (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_date        DATE          NOT NULL,                 -- วันเติม
    vehicle_id       INTEGER       NOT NULL REFERENCES vehicle(id),
    driver_id        INTEGER       NOT NULL REFERENCES driver(id),
    amount           NUMERIC(10, 2) NOT NULL,                -- จำนวนเงิน
    payment_method   VARCHAR(20)   NOT NULL,                 -- 'transfer' | 'card' | 'self'
    mileage          INTEGER,                                -- เลขไมล์ที่เติม
    note             VARCHAR(500),
    reimbursement_id INTEGER       REFERENCES fuel_reimbursement(id),
    created_by       INTEGER       REFERENCES user(id),
    created_at       DATETIME,
    updated_at       DATETIME
);

-- ── 3. fuel_price — ราคา/ลิตร ตามช่วงเวลา (replaces SystemConfig['fuel_price']) ──
CREATE TABLE IF NOT EXISTS fuel_price (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    effective_date  DATE          NOT NULL UNIQUE,
    price_per_liter NUMERIC(8, 2) NOT NULL,
    note            VARCHAR(255),
    created_by      INTEGER       REFERENCES user(id),
    created_at      DATETIME
);

-- ── 4. fuel_reserve_config — เงินสำรอง (singleton row id=1) ──
CREATE TABLE IF NOT EXISTS fuel_reserve_config (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    amount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    updated_at DATETIME,
    updated_by INTEGER       REFERENCES user(id)
);

-- ── 5. fuel_reserve_log — ประวัติการปรับเงินสำรอง (note required) ──
CREATE TABLE IF NOT EXISTS fuel_reserve_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    change_amount NUMERIC(12, 2) NOT NULL,                   -- +/-
    new_balance   NUMERIC(12, 2) NOT NULL,
    note          VARCHAR(500)   NOT NULL,                   -- required reason
    created_by    INTEGER        REFERENCES user(id),
    created_at    DATETIME
);

-- ── 6. Indexes — query patterns ──
CREATE INDEX IF NOT EXISTS idx_fuel_bill_date            ON fuel_bill(bill_date);
CREATE INDEX IF NOT EXISTS idx_fuel_bill_vehicle         ON fuel_bill(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_bill_driver          ON fuel_bill(driver_id);
CREATE INDEX IF NOT EXISTS idx_fuel_bill_reimbursement   ON fuel_bill(reimbursement_id);
CREATE INDEX IF NOT EXISTS idx_fuel_reimbursement_no     ON fuel_reimbursement(reimbursement_no);
CREATE INDEX IF NOT EXISTS idx_fuel_price_effective_date ON fuel_price(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_reserve_log_created  ON fuel_reserve_log(created_at DESC);

-- ── 7. Singleton row + seed FuelPrice from existing SystemConfig['fuel_price'] ──
-- เริ่มต้นเงินสำรอง = 0 (admin ไปปรับใน UI พร้อมใส่ note ทีหลัง)
INSERT INTO fuel_reserve_config (id, amount) VALUES (1, 0);

-- ถ้ามี SystemConfig['fuel_price'] อยู่แล้ว — copy ไปเป็น row แรกของ fuel_price
-- (วันที่ effective_date = วันที่ migration เพื่อกัน NULL; admin ปรับย้อนหลังได้)
INSERT INTO fuel_price (effective_date, price_per_liter, note)
SELECT DATE('2026-05-04'), CAST(value AS NUMERIC), 'migrated from SystemConfig[fuel_price]'
FROM system_config
WHERE key = 'fuel_price'
  AND NOT EXISTS (SELECT 1 FROM fuel_price WHERE effective_date = DATE('2026-05-04'));

COMMIT;

-- Verify (run manually after):
-- .schema fuel_reimbursement
-- .schema fuel_bill
-- .schema fuel_price
-- .schema fuel_reserve_config
-- .schema fuel_reserve_log
-- SELECT * FROM fuel_reserve_config;
-- SELECT * FROM fuel_price;
