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
from views.vehicle.vehicle_common import (
    vehicle_bp, adminfleet_bp, admincost_bp, driver_bp,
    is_vehicle_admin, _lookup_budget_for_booking, auto_generate_ot,
    EXPENSE_CATEGORIES, TH_MONTHS, _fmt_date_th,
)


_HIST_STATUS_META = {
    'pending':          ('warning', 'amber',  'รออนุมัติ'),
    'waiting_approver': ('warning', 'amber',  'รอหัวหน้าอนุมัติ'),
    'approved':         ('blue',    'blue',   'อนุมัติแล้ว'),
    'rejected':         ('danger',  'red',    'ปฏิเสธ'),
    'in_progress':      ('blue',    'blue',   'ดำเนินการ'),
    'done':             ('success', 'green',  'เสร็จสิ้น'),
    'cancelled':        ('neutral', 'subtle', 'ยกเลิก'),
    'confirmed':        ('blue',    'blue',   'จองแล้ว'),
}

# service_type → (lucide icon, label, create-url endpoint)
_HIST_SERVICE_META = {
    'vehicle':     ('car',       'จองรถ',          'vehicle.index'),
    'repair':      ('wrench',    'แจ้งซ่อม IT',    'repair.index'),
    'room':        ('door-open', 'จองห้องประชุม',  'room.index'),
    'maintenance': ('settings',  'แจ้งซ่อมอาคาร',  'maintenance.index'),
}


def _hist_status(status):
    return _HIST_STATUS_META.get(status, ('neutral', 'subtle', status or '—'))


def _hist_day_label(dt):
    """relative thai label: วันนี้ / เมื่อวาน / N วันก่อน / 'D MMM YYYY' (พ.ศ.)"""
    today = get_bkk_time().date()
    d     = dt.date()
    delta = (today - d).days
    if delta == 0: return 'วันนี้'
    if delta == 1: return 'เมื่อวาน'
    if 1 < delta < 7: return f'{delta} วันก่อน'
    th_months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                 'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    return f'{d.day} {th_months[d.month-1]} {d.year + 543}'


def _hist_base_item(prefix, row, *, service_type, title, subtitle,
                    status, occurs_at, meta, detail_url, reject_reason=None):
    tone, dot, label = _hist_status(status)
    ts = row.created_at or occurs_at
    return {
        'id':            f'{prefix}-{row.id}',
        'service_type':  service_type,
        'service_icon':  _HIST_SERVICE_META[service_type][0],
        'service_label': _HIST_SERVICE_META[service_type][1],
        'title':         title,
        'subtitle':      subtitle,
        'status':        status,
        'status_label':  label,
        'status_tone':   tone,
        'status_dot':    dot,
        'timestamp':     ts,
        'occurs_at':     occurs_at,
        'meta':          meta,
        'detail_url':    detail_url,
        'reject_reason': reject_reason,
        'day_key':       ts.strftime('%Y-%m-%d') if ts else '',
        'day_label':     _hist_day_label(ts) if ts else '',
    }


def _vehicle_to_activity(b):
    veh = b.assigned_vehicle
    subtitle = (f'{veh.brand} {veh.model} · {veh.license_plate}' if veh
                else (b.snap_vehicle_plate or 'ยังไม่ได้รับรถ'))
    meta = [
        ('clock', f"{b.start_datetime.strftime('%H:%M')}–{b.end_datetime.strftime('%H:%M')}"),
        ('users', f'{b.passenger_count} คน'),
    ]
    if b.driver:               meta.append(('user-check', b.driver.name))
    elif not b.need_driver:    meta.append(('user',       'ขับเอง'))
    if b.trip_group:           meta.append(('git-branch', f'กลุ่ม {b.trip_group}'))
    return _hist_base_item(
        'veh', b, service_type='vehicle',
        title=b.destination, subtitle=subtitle, status=b.status,
        occurs_at=b.start_datetime, meta=meta,
        detail_url=url_for('vehicle.detail_booking', booking_id=b.id),
        reject_reason=(b.reject_reason if b.status == 'rejected' else None),
    )


def _repair_to_activity(t):
    meta = [('map-pin', t.location), ('tag', t.category)]
    if t.urgency: meta.append(('alert-triangle', t.urgency))
    if t.asset_tag: meta.append(('hash', t.asset_tag))
    return _hist_base_item(
        'rep', t, service_type='repair',
        title=t.subject, subtitle=f'แจ้งซ่อม IT · {t.category}',
        status=t.status, occurs_at=t.created_at, meta=meta,
        detail_url=url_for('repair.edit', id=t.id),
    )


def _maintenance_to_activity(t):
    meta = [('map-pin', t.location), ('tag', t.category)]
    if t.urgency: meta.append(('alert-triangle', t.urgency))
    if t.contact_number: meta.append(('phone', t.contact_number))
    return _hist_base_item(
        'mnt', t, service_type='maintenance',
        title=t.subject, subtitle=f'แจ้งซ่อมอาคาร · {t.category}',
        status=t.status, occurs_at=t.created_at, meta=meta,
        detail_url=url_for('maintenance.edit', id=t.id),
    )


def _room_to_activity(b):
    meta = [
        ('clock', f"{b.start_time.strftime('%d %b · %H:%M')}–{b.end_time.strftime('%H:%M')}"),
        ('map-pin', b.room_name),
    ]
    return _hist_base_item(
        'room', b, service_type='room',
        title=b.title, subtitle=f'ห้องประชุม · {b.room_name}',
        status='confirmed', occurs_at=b.start_time, meta=meta,
        detail_url=url_for('room.index'),
    )


def _collect_user_activities(user_id, *, service_type='', status='', q=''):
    """รวม activity 4 service ของ user → sorted newest-first."""
    items = []
    wants = {service_type} if service_type else {'vehicle','repair','room','maintenance'}

    if 'vehicle' in wants:
        items.extend(_vehicle_to_activity(b)
                     for b in VehicleBooking.query.filter_by(user_id=user_id).all())
    if 'repair' in wants:
        items.extend(_repair_to_activity(t)
                     for t in RepairTicket.query.filter_by(user_id=user_id).all())
    if 'maintenance' in wants:
        items.extend(_maintenance_to_activity(t)
                     for t in MaintenanceTicket.query.filter_by(user_id=user_id).all())
    if 'room' in wants:
        items.extend(_room_to_activity(b)
                     for b in RoomBooking.query.filter_by(user_id=user_id).all())

    if status:
        items = [i for i in items if i['status'] == status]
    if q:
        ql = q.lower().strip()
        items = [i for i in items
                 if ql in (i['title'] or '').lower() or ql in (i['subtitle'] or '').lower()]

    items.sort(key=lambda x: x['timestamp'] or get_bkk_time(), reverse=True)
    return items


def _hist_counts(all_items):
    return {
        'total':       len(all_items),
        'pending':     sum(1 for i in all_items if i['status'] in ('pending','waiting_approver')),
        'in_progress': sum(1 for i in all_items if i['status'] == 'in_progress'),
        'done':        sum(1 for i in all_items if i['status'] in ('approved','done','confirmed')),
        'rejected':    sum(1 for i in all_items if i['status'] in ('rejected','cancelled')),
        'by_type': {
            t: sum(1 for i in all_items if i['service_type'] == t)
            for t in ('vehicle','repair','room','maintenance')
        },
    }



@vehicle_bp.route('/vehicle/history')
@login_required
def booking_history():
    """Unified activity history — vehicle + repair + room + maintenance."""
    filters = {
        'type':   request.args.get('type', ''),
        'status': request.args.get('status', ''),
        'q':      request.args.get('q', ''),
    }
    items     = _collect_user_activities(current_user.id, service_type=filters['type'],
                                          status=filters['status'], q=filters['q'])
    all_items = _collect_user_activities(current_user.id)   # for counts (unfiltered)
    return render_template(
        'vehicle/vehicle_history.html',
        items=items,
        counts=_hist_counts(all_items),
        filters=filters,
        service_meta=_HIST_SERVICE_META,
    )



@vehicle_bp.route('/vehicle/history/feed')
@login_required
def history_feed():
    """JSON feed — client-side filter refetch (no full page reload)."""
    items = _collect_user_activities(
        current_user.id,
        service_type=request.args.get('type', ''),
        status=request.args.get('status', ''),
        q=request.args.get('q', ''),
    )
    def _ser(i):
        d = dict(i)
        d['timestamp'] = i['timestamp'].isoformat() if i['timestamp'] else None
        d['occurs_at'] = i['occurs_at'].isoformat() if i['occurs_at'] else None
        return d
    return jsonify({'items': [_ser(i) for i in items]})


# ─────────────────────────────────────────────
# Admin: จัดการรถและคนขับ
# ─────────────────────────────────────────────
