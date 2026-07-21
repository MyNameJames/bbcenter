from flask import Blueprint, redirect, url_for, flash, session
from flask_login import current_user
from models import db, Vehicle, VehicleBooking
from functools import wraps
from services.vehicle.budget_service import _lookup_budget_for_booking
from services.vehicle.mileage_service import get_fuel_price
from domain.vehicle.fuel import calc_fuel_cost

# Phase 5 (2026-07-19) — เก็บกวาด: ไฟล์นี้เหลือแค่ blueprint def + shared constant/helper
# (business logic ทั้งหมดย้ายเข้า services/domain ตั้งแต่ Phase 1-3) — ลบ import ที่ตายแล้ว
# 48 ชื่อ (render_template/request/jsonify/login_required/get_bkk_time/User/Driver/
# VehicleMileage/SystemConfig/VehicleBudget/VehicleBudgetLog/VehicleDepartment/BudgetType/
# Notification/DeptApprover/FuelPrice/FuelBill/RepairTicket/MaintenanceTicket/RoomBooking/
# and_/extract/or_/func/datetime/date/timedelta/os/time/secure_filename/budget_svc + 5
# broadcast + 12 notification_service alias) — เหลือ 3 ชื่อ (_lookup_budget_for_booking/
# get_fuel_price/calc_fuel_cost) ที่ "ดูเหมือนตาย" ในไฟล์นี้เองแต่ต้องคงไว้เพราะ
# vehicle_booking.py/vehicle_admin.py/vehicle_budget.py/vehicle_mileage.py/vehicle_driver.py/
# vehicle_cost.py ยัง re-import ต่อจากที่นี่อยู่ (import chain — ตรวจ re-export ก่อนลบเสมอ)

vehicle_bp    = Blueprint('vehicle', __name__)
adminfleet_bp = Blueprint('adminfleet', __name__)
admincost_bp  = Blueprint('admincost', __name__)
driver_bp     = Blueprint('driver', __name__)


EXPENSE_CATEGORIES = {
    # ── ส่วนกลาง ──────────────────────────────────────────────
    # เพิ่ม/ลบ หมวดย่อยที่นี่ → จะขึ้นใน dropdown อัตโนมัติ
    "central": [
        {"key": "medical",       "label": "ค่ารักษาพยาบาล"},
        {"key": "training",      "label": "ค่าอบรม / สัมมนา"},
        {"key": "religious",     "label": "งานกิจนิมนต์ / ศาสนา"},
        {"key": "official",      "label": "ราชการ / ติดต่อหน่วยงาน"},
        {"key": "welfare",       "label": "สวัสดิการ / เยี่ยมไข้"},
        {"key": "procurement",   "label": "จัดซื้อจัดจ้าง"},
        {"key": "other_central", "label": "อื่น ๆ (ส่วนกลาง)"},
    ],
    # ── งานกอง (department) ───────────────────────────────────
    # แต่ละ key = ชื่อกอง, label = ชื่อที่แสดง
    "department": [
        {"key": "กองสนับสนุนและบริการ", "label": "กองสนับสนุนและบริการ"},
        {"key": "กองวิชาการ",           "label": "กองวิชาการ"},
        {"key": "กองDOU",               "label": "กองDOU"},
        {"key": "กองบริหาร",            "label": "กองบริหาร"},
        {"key": "กองเลขานุการ",         "label": "กองเลขานุการ"},
        {"key": "กองกิจการนิสิต",       "label": "กองกิจการนิสิต"},
        {"key": "กองพระไตรปิฏก",        "label": "กองพระไตรปิฏก"},
    ],
}


def _build_budget_subs():
    """Distinct หมวด/กอง ที่ถูกใช้จริงใน approved booking → options สำหรับ filter งบ
    (cascade budget_type → sub). ใช้ร่วม mileage_log + cost_summary."""
    _central_labels = {c['key']: c['label'] for c in EXPENSE_CATEGORIES['central']}
    _dept_labels    = {c['key']: c['label'] for c in EXPENSE_CATEGORIES['department']}
    central_keys = [k for (k,) in db.session.query(VehicleBooking.central_category)
                    .filter(VehicleBooking.status == 'approved',
                            VehicleBooking.expense_type == 'central',
                            VehicleBooking.central_category.isnot(None),
                            VehicleBooking.central_category != '')
                    .distinct().order_by(VehicleBooking.central_category).all()]
    dept_keys = [k for (k,) in db.session.query(VehicleBooking.trip_department)
                 .filter(VehicleBooking.status == 'approved',
                         VehicleBooking.expense_type == 'department',
                         VehicleBooking.trip_department.isnot(None),
                         VehicleBooking.trip_department != '')
                 .distinct().order_by(VehicleBooking.trip_department).all()]
    return {
        'central':    [{'key': k, 'label': _central_labels.get(k, k)} for k in central_keys],
        'department': [{'key': k, 'label': _dept_labels.get(k, k)} for k in dept_keys],
    }


def is_vehicle_admin():
    return current_user.role_vehicle == 'admin' or current_user.is_superadmin


def require_vehicle_admin(f):
    """Decorator: block route ถ้าไม่ใช่ vehicle admin (flash + redirect to vehicle.index)"""
    @wraps(f)
    def _decorated(*args, **kwargs):
        if not is_vehicle_admin():
            flash('คุณไม่มีสิทธิ์', 'danger')
            return redirect(url_for('vehicle.index'))
        return f(*args, **kwargs)
    return _decorated


# ─────────────────────────────────────────────
# หน้าหลัก
# ─────────────────────────────────────────────

# check_vehicle_conflict / check_driver_conflict / check_vehicle_active ย้ายไป
# services/vehicle/booking_service.py แล้ว (Phase 2, 2026-07-19) — caller (vehicle_admin.py)
# import จากที่นั่นตรง (Phase 5, 2026-07-19: ลบสำเนาเนื้อฟังก์ชันซ้ำที่ค้างอยู่ตรงนี้ทิ้ง —
# ไม่มีใคร import จาก vehicle_common อีกแล้วตั้งแต่ Phase 2)

# _auto_close_stale_trips / deduct_budget_for_trip / next_ot_number / auto_generate_ot
# ย้ายไป services/vehicle/mileage_service.py แล้ว (Phase 3, 2026-07-19) — signature
# เปลี่ยน (flash()/current_user แยกออก คืนค่าแทน) จึงไม่ re-import กลับมาที่นี่ทั้งชื่อเดิม
# เหมือน get_fuel_price — caller เปลี่ยนไปเรียก services.vehicle.mileage_service ตรง


TH_MONTHS = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']


def _fmt_date_th(d):
    """แปลง date เป็นรูปแบบไทย เช่น 1 เม.ย. 68"""
    TH_MON = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    return f"{d.day} {TH_MON[d.month]} {str(d.year+543)[2:]}"

# ══════════════════════════════════════════════════════
# Feature 3: Budget Routes
# ══════════════════════════════════════════════════════
