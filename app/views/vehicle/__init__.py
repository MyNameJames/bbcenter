"""
views.vehicle — vehicle domain controllers เท่านั้น (ไม่มี service/business logic แล้ว —
Clean Architecture refactor Phase 0-5, 2026-07-19: business logic ทั้งหมดย้ายไป
app/services/vehicle/*.py (booking_service/mileage_service/budget_service) +
app/domain/vehicle/*.py (workflow/fuel) แล้ว ดู docs/notes/adr/0001-clean-architecture-layers.md)

ขั้น 3 module refactor (2026-06-07): vehicle_view.py (~3973 LOC) ตัดเป็น controller ต่อ feature
- vehicle_common         blueprints(4) + shared constant เท่านั้น (is_vehicle_admin,
                         EXPENSE_CATEGORIES, TH_MONTHS, _fmt_date_th) — ห้ามเพิ่ม logic ใหม่
- vehicle_booking        จอง/แก้/ลบ/cancel/detail/approve/approver  (vehicle_bp)
- vehicle_notification   api_notifications/read/payment_report        (vehicle_bp)
- vehicle_admin          admin_trips/assign/merge/manage_fleet/...  (vehicle_bp+adminfleet_bp)
- vehicle_mileage        mileage_log/export                           (vehicle_bp)
- vehicle_cost           cost_summary/export/override_fuel/ot_*       (admincost_bp)
- vehicle_budget         budget_manage/personal + pivot               (adminfleet_bp)
- vehicle_driver         driver_home/ad-hoc/mileage                   (driver_bp)
- vehicle_fuel           admin_fuel/bill/reimbursement/price           (fuel_bp — ย้ายจาก
                         views/fuel_view.py เดิม, Phase 1; blueprint import ตรงใน app.py
                         ไม่ผ่าน side-effect import ด้านล่างนี้)

blueprints ถูก import จาก vehicle_common; controller modules ถูก import ที่นี่เพื่อ register routes
"""
from .vehicle_common import vehicle_bp, adminfleet_bp, admincost_bp, driver_bp

# import controller modules → ผูก @route เข้า blueprints (side-effect)
from . import (
    vehicle_booking,
    vehicle_notification,
    vehicle_admin,
    vehicle_mileage,
    vehicle_cost,
    vehicle_budget,
    vehicle_driver,
)

__all__ = ['vehicle_bp', 'adminfleet_bp', 'admincost_bp', 'driver_bp']
