"""
views.vehicle — vehicle domain (controller + service)

ขั้น 3 module refactor (2026-06-07): vehicle_view.py (~3973 LOC) ตัดเป็น controller ต่อ feature
- vehicle_common         blueprints(4) + helpers/constants กลาง (is_vehicle_admin,
                         _lookup_budget_for_booking, auto_generate_ot, EXPENSE_CATEGORIES,
                         TH_MONTHS, _fmt_date_th)
- vehicle_booking        จอง/แก้/ลบ/cancel/detail/approve/approver  (vehicle_bp)
- vehicle_notification   api_notifications/read/payment_report        (vehicle_bp)
- vehicle_admin          admin_trips/assign/merge/manage_fleet/...  (vehicle_bp+adminfleet_bp)
- vehicle_mileage        mileage_log/export                           (vehicle_bp)
- vehicle_cost           cost_summary/export/override_fuel/ot_*       (admincost_bp)
- vehicle_budget         budget_manage/personal + pivot               (adminfleet_bp)
- vehicle_driver         driver_home/ad-hoc/mileage                   (driver_bp)
- vehicle_budget_service ledger service (ทุก budget mutation ผ่านที่นี่)

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
