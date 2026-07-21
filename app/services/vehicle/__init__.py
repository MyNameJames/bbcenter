"""
services.vehicle — use case orchestration ของ vehicle domain (ADR 0001, 2026-07-19)

orchestrate: ตรวจ (guard) → เปลี่ยน state (ORM) → side effect (notify, หลัง flush) ·
ห้ามแตะ flask.request/flash()/current_user ตรงๆ — รับ actor_id/param แทน
logger: logging.getLogger(__name__) (ไม่ใช่ current_app.logger)

- budget_service.py   deduct/refund/rededuct_for_mileage, set_budget_amount, manual_adjust,
                      set_active, verify_cache_integrity, _lookup_budget_for_booking —
                      gateway เดียวของ VehicleBudget mutation (ย้ายจาก views/vehicle/
                      vehicle_budget_service.py, Phase 1)
- booking_service.py  approve_from_pending/reject_from_pending/approver_approve/
                      approver_reject/assign_resources/ungroup/cancel/revert +
                      check_vehicle_conflict/check_driver_conflict/check_vehicle_active —
                      gateway เดียวของ VehicleBooking.status (Phase 2)
- mileage_service.py  close_trip/auto_generate_ot/auto_close_stale_trips/
                      override_fuel_cost/get_fuel_price/get_distance_cap_km (Phase 3)
"""
