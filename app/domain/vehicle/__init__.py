"""
domain.vehicle — pure business logic ของ vehicle domain (ADR 0001, 2026-07-19)

ห้าม import flask เด็ดขาด — รับ argument คืนค่า ไม่มี I/O/side effect

- workflow.py  ALLOWED_TRANSITIONS / guard_budget / apply_transition (state machine กลาง
               ของ VehicleBooking.status — ย้ายจาก views/vehicle/vehicle_workflow.py, Phase 1)
- fuel.py      calc_fuel_cost (pure) — ย้ายจาก views/vehicle/vehicle_common.py, Phase 1
               (get_fuel_price ไม่ pure — query ORM — อยู่ services/vehicle/mileage_service.py แทน, Phase 3)
"""
