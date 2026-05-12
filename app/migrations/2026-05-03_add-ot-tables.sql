-- ══════════════════════════════════════════════════════════════
-- Migration: Add OT tables — ot_rate_config, driver_ot, driver_ot_slot
-- วันที่: 2026-05-03
-- รันด้วย: sqlite3 app/instance/portal.db < app/migrations/2026-05-03_add-ot-tables.sql
-- ══════════════════════════════════════════════════════════════

BEGIN TRANSACTION;

-- ── 1. ot_rate_config — อัตรา OT แต่ละ time band ──
CREATE TABLE IF NOT EXISTS ot_rate_config (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    label      VARCHAR(50)    NOT NULL,
    start_time VARCHAR(5)     NOT NULL,
    end_time   VARCHAR(5)     NOT NULL,
    rate       NUMERIC(8, 2)  NOT NULL,
    is_active  BOOLEAN        NOT NULL DEFAULT 1,
    sort_order INTEGER        NOT NULL DEFAULT 0
);

-- ── 2. driver_ot — 1 OT record ต่อ 1 booking ──
CREATE TABLE IF NOT EXISTS driver_ot (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id     INTEGER        NOT NULL REFERENCES vehicle_booking(id),
    driver_id      INTEGER        NOT NULL REFERENCES driver(id),
    ot_number      VARCHAR(20)    NOT NULL UNIQUE,
    date           DATE           NOT NULL,
    total_hours    NUMERIC(6, 2)  NOT NULL DEFAULT 0,
    total_amount   NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status         VARCHAR(20)    NOT NULL DEFAULT 'pending',
    approved_by_id INTEGER        REFERENCES user(id),
    approved_at    DATETIME,
    paid_by_id     INTEGER        REFERENCES user(id),
    paid_at        DATETIME,
    note           VARCHAR(500),
    created_at     DATETIME,
    created_by_id  INTEGER        REFERENCES user(id)
);

-- ── 3. driver_ot_slot — time slot แต่ละช่วงใน 1 OT record ──
CREATE TABLE IF NOT EXISTS driver_ot_slot (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_ot_id   INTEGER        NOT NULL REFERENCES driver_ot(id),
    rate_config_id INTEGER        REFERENCES ot_rate_config(id),
    slot_label     VARCHAR(50)    NOT NULL,
    start_time     VARCHAR(5)     NOT NULL,
    end_time       VARCHAR(5)     NOT NULL,
    hours          NUMERIC(6, 2)  NOT NULL DEFAULT 0,
    rate           NUMERIC(8, 2)  NOT NULL DEFAULT 0,
    amount         NUMERIC(10, 2) NOT NULL DEFAULT 0
);

-- ── 4. Indexes ──
CREATE INDEX IF NOT EXISTS idx_driver_ot_booking   ON driver_ot(booking_id);
CREATE INDEX IF NOT EXISTS idx_driver_ot_driver    ON driver_ot(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_ot_status    ON driver_ot(status);
CREATE INDEX IF NOT EXISTS idx_driver_ot_slot_ot   ON driver_ot_slot(driver_ot_id);

-- ── 5. Seed data — ot_rate_config ──
INSERT INTO ot_rate_config (label, start_time, end_time, rate, is_active, sort_order) VALUES
    ('เช้ามืด',             '06:00', '08:00', 20.00, 1, 1),
    ('หัวค่ำ',              '17:00', '19:00', 20.00, 1, 2),
    ('วิกาล (หลัง 19:00)', '19:00', '24:00', 40.00, 1, 3),
    ('วิกาล (ก่อน 06:00)', '00:00', '06:00', 40.00, 1, 4);

COMMIT;

-- Verify (run manually after):
-- .schema ot_rate_config
-- .schema driver_ot
-- .schema driver_ot_slot
-- SELECT * FROM ot_rate_config;
