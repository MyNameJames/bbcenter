-- ══════════════════════════════════════════════════════════════
-- Migration: Add reject_reason to vehicle_booking
-- วันที่: 2026-04-26
-- รันด้วย: sqlite3 app/instance/portal.db < app/migrations/2026-04-26_vehicle-booking-reject-reason.sql
-- ══════════════════════════════════════════════════════════════

BEGIN TRANSACTION;

-- ── 1. Add reject_reason column ──
ALTER TABLE vehicle_booking ADD COLUMN reject_reason VARCHAR(500);

COMMIT;

-- Verify (run manually after):
-- sqlite3 app/instance/portal.db ".schema vehicle_booking"
