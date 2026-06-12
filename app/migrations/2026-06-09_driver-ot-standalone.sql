-- 2026-06-09: driver-ot-standalone — driver_ot.booking_id → nullable
-- Reason: รองรับ manual OT (เพิ่มเองผ่านปุ่ม "เพิ่ม OT" หน้า admin/cost) ที่ไม่ผูก booking/งบ
--         SQLite ไม่รองรับ ALTER COLUMN drop-NOT-NULL → ต้อง rebuild ตาราง (12-step)
-- Note: ข้อมูลเดิมทั้งหมดมี booking_id อยู่แล้ว — copy ตรงๆ ไม่มี data loss

PRAGMA foreign_keys=OFF;

BEGIN TRANSACTION;

CREATE TABLE driver_ot__new (
    id             INTEGER PRIMARY KEY,
    booking_id     INTEGER REFERENCES vehicle_booking(id),   -- nullable now (was NOT NULL)
    driver_id      INTEGER NOT NULL REFERENCES driver(id),
    ot_number      VARCHAR(20) NOT NULL UNIQUE,
    date           DATE NOT NULL,
    total_hours    NUMERIC(6, 2)  DEFAULT 0,
    total_amount   NUMERIC(10, 2) DEFAULT 0,
    status         VARCHAR(20) DEFAULT 'unpaid',
    approved_by_id INTEGER REFERENCES user(id),
    approved_at    DATETIME,
    paid_by_id     INTEGER REFERENCES user(id),
    paid_at        DATETIME,
    no_receipt     BOOLEAN DEFAULT 0,
    is_deleted     BOOLEAN DEFAULT 0,
    deleted_at     DATETIME,
    note           VARCHAR(500),
    created_at     DATETIME,
    created_by_id  INTEGER REFERENCES user(id)
);

INSERT INTO driver_ot__new (
    id, booking_id, driver_id, ot_number, date, total_hours, total_amount,
    status, approved_by_id, approved_at, paid_by_id, paid_at,
    no_receipt, is_deleted, deleted_at, note, created_at, created_by_id
)
SELECT
    id, booking_id, driver_id, ot_number, date, total_hours, total_amount,
    status, approved_by_id, approved_at, paid_by_id, paid_at,
    no_receipt, is_deleted, deleted_at, note, created_at, created_by_id
FROM driver_ot;

DROP TABLE driver_ot;
ALTER TABLE driver_ot__new RENAME TO driver_ot;

COMMIT;

PRAGMA foreign_keys=ON;
