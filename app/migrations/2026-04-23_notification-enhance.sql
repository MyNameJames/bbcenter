-- ══════════════════════════════════════════════════════════════
-- Migration: Enhance Notification + VehicleMileage for in-app notifications
-- วันที่: 2026-04-23
-- รันด้วย: sqlite3 app/instance/portal.db < app/migrations/2026-04-23_notification-enhance.sql
-- ══════════════════════════════════════════════════════════════

BEGIN TRANSACTION;

-- ── 1. Notification: เพิ่ม 5 fields ──
ALTER TABLE notification ADD COLUMN category   VARCHAR(20) DEFAULT 'status';
ALTER TABLE notification ADD COLUMN action_url VARCHAR(255);
ALTER TABLE notification ADD COLUMN is_sticky  BOOLEAN DEFAULT 0;
ALTER TABLE notification ADD COLUMN expired_at DATETIME;
ALTER TABLE notification ADD COLUMN icon       VARCHAR(40);

-- ── 2. VehicleMileage: เพิ่ม 3 fields (payment tracking) ──
ALTER TABLE vehicle_mileage ADD COLUMN user_reported_paid BOOLEAN DEFAULT 0;
ALTER TABLE vehicle_mileage ADD COLUMN user_reported_at   DATETIME;
ALTER TABLE vehicle_mileage ADD COLUMN last_reminder_at   DATETIME;

-- ── 3. Index เสริม performance ──
CREATE INDEX IF NOT EXISTS idx_notif_user_unread
    ON notification(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notif_booking
    ON notification(booking_id);

CREATE INDEX IF NOT EXISTS idx_notif_created
    ON notification(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mileage_personal_status
    ON vehicle_mileage(personal_status);

COMMIT;

-- Verify (run manually after):
-- .schema notification
-- .schema vehicle_mileage
