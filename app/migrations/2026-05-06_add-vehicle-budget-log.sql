-- 2026-05-06: Add vehicle_budget_log (ledger) + idempotency fields on vehicle_mileage
-- Reason: used_amount เคยถูกแก้แบบ raw +=/-= ทำให้ double-deduct, refund ไม่ได้, ไม่มี audit
-- Pattern: เลียน fuel_reserve_log; vehicle_budget.used_amount กลายเป็น cache ของ SUM(change_amount)

BEGIN TRANSACTION;

-- 1) Ledger ใหม่ (ทุก mutation ของเงินเข้าตารางนี้)
CREATE TABLE vehicle_budget_log (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id          INTEGER NOT NULL REFERENCES vehicle_budget(id),
    event_type         VARCHAR(20) NOT NULL,    -- set_budget|deduct|refund|override|adjust
    change_amount      NUMERIC(12,2) NOT NULL,  -- signed: หัก=-, คืน=+, เพิ่มเพดาน=+
    new_used_balance   NUMERIC(12,2) NOT NULL,  -- snapshot used_amount หลัง event
    new_budget_amount  NUMERIC(12,2) NOT NULL,  -- snapshot budget_amount หลัง event
    booking_id         INTEGER REFERENCES vehicle_booking(id),
    mileage_id         INTEGER REFERENCES vehicle_mileage(id),
    reverses_log_id    INTEGER REFERENCES vehicle_budget_log(id),
    snap_distance      INTEGER,
    snap_fuel_rate     NUMERIC(8,2),
    snap_fuel_price    NUMERIC(8,2),
    note               VARCHAR(500) NOT NULL,
    created_by         INTEGER REFERENCES user(id),
    created_at         DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_vbl_budget  ON vehicle_budget_log(budget_id);
CREATE INDEX ix_vbl_booking ON vehicle_budget_log(booking_id);
CREATE INDEX ix_vbl_mileage ON vehicle_budget_log(mileage_id);

-- 2) Idempotency บน vehicle_mileage (ป้องกัน double-deduct + ใช้สำหรับ reverse)
ALTER TABLE vehicle_mileage ADD COLUMN budget_deducted_at DATETIME;
ALTER TABLE vehicle_mileage ADD COLUMN last_budget_log_id INTEGER REFERENCES vehicle_budget_log(id);

-- 3) Backfill: เปิด balance เริ่มต้น (booking เก่าทั้งหมดถือเป็น "opening balance")
--    ใส่ event_type='adjust', change_amount=current used_amount, note='opening balance migration'
INSERT INTO vehicle_budget_log
    (budget_id, event_type, change_amount, new_used_balance, new_budget_amount, note, created_at)
SELECT id, 'adjust', used_amount, used_amount, budget_amount,
       'opening balance @ migration 2026-05-06', CURRENT_TIMESTAMP
FROM vehicle_budget
WHERE used_amount <> 0 OR budget_amount <> 0;

COMMIT;
