from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session, current_app
from flask_login import login_required, current_user
from models import db, get_bkk_time, User, Vehicle, VehicleBooking, Driver, VehicleMileage, SystemConfig, VehicleBudget, VehicleBudgetLog, VehicleDepartment, BudgetType, Notification, DeptApprover, OTRateConfig, DriverOT, DriverOTSlot, FuelPrice, FuelBill, RepairTicket, MaintenanceTicket, RoomBooking
from sqlalchemy import and_, extract, or_, func
from datetime import datetime, date, timedelta
from views.core.telegram_service import (notify_approved, notify_forwarded_to_approver, notify_approver_approved, notify_rejected,
                                    notify_cancelled            as tg_notify_cancelled)
from views.core.notification_service import (
    notify_booking_created      as _n_booking_created,
    notify_admin_assigned       as _n_admin_assigned,
    notify_admin_approved       as _n_admin_approved,
    notify_forwarded_to_approver as _n_forwarded,
    notify_approver_approved    as _n_approver_approved,
    notify_rejected             as _n_rejected,
    notify_merged_into_group    as _n_merged,
    notify_mileage_started      as _n_mileage_start,
    notify_mileage_ended        as _n_mileage_end,
    notify_budget_deducted      as _n_budget,
    notify_payment_required     as _n_payment_required,
    notify_admin_deleted        as _n_admin_deleted,
    notify_payment_confirmed    as _n_payment_confirmed,
    notify_user_cancelled       as _n_user_cancelled,
)
import views.vehicle.vehicle_budget_service as budget_svc
import os, time
from werkzeug.utils import secure_filename

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



def is_vehicle_admin():
    return current_user.role_vehicle == 'admin' or current_user.is_superadmin


# ─────────────────────────────────────────────
# หน้าหลัก
# ─────────────────────────────────────────────

def _lookup_budget_for_booking(booking, on_date=None):
    """หา VehicleBudget ที่ booking จะหักงบ — งบ active (is_active=True) ที่ช่วง
    start_date–end_date ครอบ `on_date` (default = วันเริ่ม booking; deduct ส่งวันปิดทริป).
    คืน (budget, key_label) — budget=None ถ้าไม่พบงบ active ที่ครอบวันนั้น.
    overlap หลายก้อน → เอา start_date ล่าสุด (specific สุด)"""
    if booking.expense_type not in ('central', 'department'):
        return None, None
    d = on_date or (booking.start_datetime.date() if booking.start_datetime else None)
    if d is None:
        return None, None
    bt = BudgetType.query.filter_by(name=booking.expense_type).first()
    if not bt:
        return None, booking.expense_type

    if booking.expense_type == 'central':
        key_label = booking.central_category
        dept_obj = VehicleDepartment.query.filter_by(name=key_label).first() if key_label else None
    else:
        key_label = booking.trip_department or (booking.user.department if booking.user else None)
        if booking.trip_department_id:
            dept_obj = VehicleDepartment.query.get(booking.trip_department_id)
        elif key_label:
            dept_obj = VehicleDepartment.query.filter_by(name=key_label).first()
        else:
            dept_obj = None
    if not dept_obj:
        return None, key_label

    budget = (VehicleBudget.query.filter(
        VehicleBudget.department_id == dept_obj.id,
        VehicleBudget.budget_type_id == bt.id,
        VehicleBudget.is_active.is_(True),
        VehicleBudget.start_date.isnot(None),
        VehicleBudget.end_date.isnot(None),
        VehicleBudget.start_date <= d,
        VehicleBudget.end_date >= d,
    ).order_by(VehicleBudget.start_date.desc(), VehicleBudget.id.desc()).first())
    return budget, key_label


# ─────────────────────────────────────────────
# อนุมัติ / ปฏิเสธ
# ─────────────────────────────────────────────

def next_ot_number(yr):
    """รหัส OT ถัดไปของปี yr → 'OT-2026-0001' — ใช้ทั้ง auto_generate_ot + manual ot_create"""
    last = DriverOT.query.filter(DriverOT.ot_number.like(f'OT-{yr}-%')) \
                         .order_by(DriverOT.id.desc()).first()
    seq  = (int(last.ot_number.split('-')[-1]) + 1) if last else 1
    return f'OT-{yr}-{seq:04d}'


def auto_generate_ot(booking, mileage):
    """Auto-generate DriverOT + DriverOTSlots เมื่อปิดงาน (entry_type='end').
    Idempotent — ถ้า DriverOT สำหรับ booking นี้มีอยู่แล้วจะ skip ทันที"""
    if not booking.need_driver or not booking.driver_id:
        return
    if not mileage or not mileage.actual_start or not mileage.actual_end:
        return
    if DriverOT.query.filter_by(booking_id=booking.id).first():
        return  # already generated — idempotent

    rate_configs = OTRateConfig.query.filter_by(is_active=True).order_by(OTRateConfig.sort_order).all()
    if not rate_configs:
        return

    # Per-weekday override: if any rate row targets booking's weekday → use only those.
    # Otherwise fall back to weekday-agnostic rows (day_of_week IS NULL).
    booking_dow = mileage.actual_end.weekday()  # 0=Mon ... 6=Sun
    day_rows = [c for c in rate_configs if c.day_of_week == booking_dow]
    rate_configs = day_rows if day_rows else [c for c in rate_configs if c.day_of_week is None]
    if not rate_configs:
        return

    def to_min(dt):
        return dt.hour * 60 + dt.minute

    trip_s = to_min(mileage.actual_start)
    trip_e = to_min(mileage.actual_end)
    if trip_e <= trip_s:
        return  # invalid same-day end

    new_slots = []
    for cfg in rate_configs:
        h, m   = cfg.start_time.split(':')
        band_s = int(h) * 60 + int(m)
        h, m   = cfg.end_time.split(':')
        band_e = 1440 if cfg.end_time == '24:00' else int(h) * 60 + int(m)

        ov_s = max(trip_s, band_s)
        ov_e = min(trip_e, band_e)
        ov   = max(0, ov_e - ov_s)
        if ov == 0:
            continue

        hrs    = round(ov / 60, 2)
        rate   = float(cfg.rate)
        new_slots.append(DriverOTSlot(
            rate_config_id=cfg.id,
            slot_label=cfg.label,
            start_time=f"{ov_s // 60:02d}:{ov_s % 60:02d}",
            end_time  =f"{ov_e // 60:02d}:{ov_e % 60:02d}",
            hours=hrs, rate=rate,
            amount=round(hrs * rate, 2),
        ))

    if not new_slots:
        return

    ot = DriverOT(
        booking_id   =booking.id,
        driver_id    =booking.driver_id,
        ot_number    =next_ot_number(mileage.actual_end.year),
        date         =mileage.actual_end.date(),
        total_hours  =round(sum(float(s.hours)  for s in new_slots), 2),
        total_amount =round(sum(float(s.amount) for s in new_slots), 2),
        status       ='unpaid',
        created_at   =get_bkk_time(),
        created_by_id=current_user.id,
    )
    ot.slots = new_slots
    db.session.add(ot)
    db.session.flush()  # ไม่ commit เอง — ให้ caller ที่เรียก commit() ครอบ transaction ไว้



TH_MONTHS = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']


def _fmt_date_th(d):
    """แปลง date เป็นรูปแบบไทย เช่น 1 เม.ย. 68"""
    TH_MON = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    return f"{d.day} {TH_MON[d.month]} {str(d.year+543)[2:]}"

# ══════════════════════════════════════════════════════
# Feature 3: Budget Routes
# ══════════════════════════════════════════════════════
