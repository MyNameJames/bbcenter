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


@vehicle_bp.route('/api/notifications')
@login_required
def api_notifications():
    from models import get_bkk_time
    now = get_bkk_time()
    cutoff_90d = now - timedelta(days=90)

    # ดึง 90 วันล่าสุด (ไม่จำกัดจำนวน — frontend จัดการ pagination ด้วย since)
    notifs = Notification.query.filter(
        Notification.user_id == current_user.id,
        Notification.created_at >= cutoff_90d
    ).order_by(Notification.created_at.desc()).limit(200).all()

    # unread count: ไม่นับที่หมดอายุแล้ว (expired_at != null AND now > expired_at)
    unread = Notification.query.filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
        or_(Notification.expired_at.is_(None), Notification.expired_at > now)
    ).count()

    # Payment unpaid (sticky) — ไม่หมดอายุ
    sticky = Notification.query.filter(
        Notification.user_id == current_user.id,
        Notification.is_sticky == True,
        Notification.is_read == False,
        Notification.category.in_(['payment', 'payment_admin'])
    ).order_by(Notification.created_at.desc()).all()

    unread_payment = sum(1 for n in sticky)

    # Helper: relative time
    def _rel_time(dt):
        if not dt: return ''
        d = now - dt
        sec = int(d.total_seconds())
        if sec < 60:   return 'เมื่อสักครู่'
        if sec < 3600: return f'{sec // 60} นาทีที่แล้ว'
        if sec < 86400: return f'{sec // 3600} ชั่วโมงที่แล้ว'
        if sec < 604800: return f'{sec // 86400} วันที่แล้ว'
        return dt.strftime('%d/%m/%Y')

    def _to_dict(n):
        b = n.booking
        return {
            'id':          n.id,
            'message':     n.message,
            'ntype':       n.ntype,
            'category':    n.category or 'status',
            'icon':        n.icon or 'fa-solid fa-circle-info',
            'is_read':     n.is_read,
            'is_sticky':   bool(n.is_sticky),
            'booking_id':  n.booking_id,
            'booking_title': (b.destination if b else None),
            'action_url':  n.action_url or (f'/vehicle/detail/{n.booking_id}' if n.booking_id else '#'),
            'created_at':  n.created_at.strftime('%d/%m/%Y %H:%M') if n.created_at else '',
            'created_rel': _rel_time(n.created_at),
        }

    # Group by booking_id (non-sticky only)
    groups_map = {}
    loose_items = []
    for n in notifs:
        if n.is_sticky and not n.is_read:
            continue  # sticky แสดงที่ sticky section แทน
        d = _to_dict(n)
        bid = n.booking_id
        if bid:
            g = groups_map.setdefault(bid, {
                'booking_id':    bid,
                'booking_title': d['booking_title'] or f'คำขอ #{bid}',
                'items':         [],
                'unread_count':  0,
                'latest':        None,
            })
            g['items'].append(d)
            if not d['is_read']:
                g['unread_count'] += 1
            if g['latest'] is None:
                g['latest'] = d
                g['_sort_dt'] = n.created_at  # raw datetime for sorting (DD/MM/YYYY string sort broken)
        else:
            loose_items.append(d)

    # ══════════════════════════════════════════════════════════
    # Stage tracker — 3 roles: user > approver > admin
    # ══════════════════════════════════════════════════════════
    # Role detection (global)
    is_admin_role = (current_user.role_vehicle == 'admin') or current_user.is_superadmin
    approver_dept_ids = {d.dept_id for d in DeptApprover.query.filter(
        DeptApprover.user_id == current_user.id
    ).all()}

    # ── Synthetic groups (approver/admin) — booking ที่ไม่มี notif target current_user
    if approver_dept_ids or is_admin_role:
        existing_bids = set(groups_map.keys())
        synth_bids = set()

        if approver_dept_ids:
            approver_synth = (VehicleBooking.query
                              .filter(VehicleBooking.trip_department_id.in_(approver_dept_ids),
                                      VehicleBooking.status.in_(['waiting_approver', 'approved', 'rejected']),
                                      VehicleBooking.created_at >= cutoff_90d,
                                      VehicleBooking.is_ad_hoc == False)
                              .order_by(VehicleBooking.updated_at.desc().nullslast(),
                                        VehicleBooking.created_at.desc())
                              .limit(50).all())
            for b in approver_synth:
                if b.id not in existing_bids:
                    synth_bids.add(b.id)

        if is_admin_role:
            admin_synth = (VehicleBooking.query
                           .filter(VehicleBooking.created_at >= (now - timedelta(days=60)),
                                   VehicleBooking.is_ad_hoc == False,
                                   VehicleBooking.status.in_(['pending', 'waiting_approver', 'approved']))
                           .order_by(VehicleBooking.updated_at.desc().nullslast(),
                                     VehicleBooking.created_at.desc())
                           .limit(50).all())
            for b in admin_synth:
                if b.id not in existing_bids:
                    synth_bids.add(b.id)

        if synth_bids:
            synth_bookings = VehicleBooking.query.filter(VehicleBooking.id.in_(synth_bids)).all()
            for b in synth_bookings:
                groups_map[b.id] = {
                    'booking_id':   b.id,
                    'booking_title': b.destination or f'คำขอ #{b.id}',
                    'items':        [],
                    'unread_count': 0,
                    'latest':       None,
                    'is_synthetic': True,
                }

    groups = list(groups_map.values())

    # ── Bulk fetch — สำหรับทุก booking ใน groups (ไม่จำกัด role) ──
    all_booking_ids = [g['booking_id'] for g in groups if g['booking_id']]
    booking_map = {}
    mileage_map = {}
    log_map = {}
    notifs_by_booking = {}
    mates_by_group = {}
    mate_users = {}
    updater_users = {}

    if all_booking_ids:
        all_bookings = VehicleBooking.query.filter(
            VehicleBooking.id.in_(all_booking_ids)
        ).all()
        booking_map = {b.id: b for b in all_bookings}

        mileages = VehicleMileage.query.filter(
            VehicleMileage.booking_id.in_(all_booking_ids)
        ).all()
        mileage_map = {m.booking_id: m for m in mileages}

        logs = (VehicleBudgetLog.query
                .filter(VehicleBudgetLog.booking_id.in_(all_booking_ids),
                        VehicleBudgetLog.event_type == 'deduct')
                .order_by(VehicleBudgetLog.created_at.desc())
                .all())
        for log in logs:
            if log.booking_id not in log_map:
                log_map[log.booking_id] = log

        # All notifications for these bookings (any user_id) — สำหรับ event timestamp
        all_notifs = (Notification.query
                      .filter(Notification.booking_id.in_(all_booking_ids))
                      .order_by(Notification.created_at.asc())
                      .all())
        for n in all_notifs:
            notifs_by_booking.setdefault(n.booking_id, []).append(n)

        # Trip mates (สำหรับ user stage)
        trip_groups_set = {b.trip_group for b in booking_map.values() if b.trip_group}
        if trip_groups_set:
            all_mates = (VehicleBooking.query
                         .filter(VehicleBooking.trip_group.in_(trip_groups_set))
                         .all())
            mate_user_ids = {m.user_id for m in all_mates if m.user_id}
            if mate_user_ids:
                mate_users = {u.id: u for u in User.query.filter(User.id.in_(mate_user_ids)).all()}
            for m in all_mates:
                mates_by_group.setdefault(m.trip_group, []).append(m)

        # Updater users (สำหรับ admin/approver stage actor names)
        updater_ids = {b.updated_by for b in booking_map.values() if b.updated_by}
        booking_owner_ids = {b.user_id for b in booking_map.values() if b.user_id}
        all_user_ids = updater_ids | booking_owner_ids
        if all_user_ids:
            updater_users = {u.id: u for u in User.query.filter(User.id.in_(all_user_ids)).all()}

    # ── Helpers ────────────────────────────────────────────────
    def _fmt_ts(dt):
        return dt.strftime('%d/%m/%Y %H:%M') if dt else ''

    def _resolve_role(booking):
        """Priority: user > approver > admin"""
        if booking.user_id == current_user.id:
            return 'user'
        if booking.trip_department_id in approver_dept_ids:
            return 'approver'
        if is_admin_role:
            return 'admin'
        return None

    def _extract_events(notifs):
        """Map event_key → notification.created_at (asc-sorted input)."""
        ev = {}
        saw_forwarded = False
        for n in notifs:
            icon = n.icon or ''
            cat  = n.category or ''
            msg  = n.message or ''
            if 'fa-calendar-plus' in icon:
                ev.setdefault('booking_created', n.created_at)
            elif 'fa-car' in icon:
                ev.setdefault('admin_assigned', n.created_at)
            elif 'fa-paper-plane' in icon:
                ev.setdefault('forwarded', n.created_at)
                saw_forwarded = True
            elif 'fa-circle-check' in icon and cat == 'status':
                if saw_forwarded:
                    ev.setdefault('approver_approved', n.created_at)
                else:
                    ev.setdefault('admin_approved', n.created_at)
            elif 'fa-circle-xmark' in icon:
                if 'หัวหน้าแผนก' in msg:
                    ev.setdefault('approver_rejected', n.created_at)
                else:
                    ev.setdefault('admin_rejected', n.created_at)
            elif 'fa-link' in icon:
                ev.setdefault('merged', n.created_at)
            elif 'fa-flag-checkered' in icon:
                ev.setdefault('mileage_end_notif', n.created_at)
            elif 'fa-flag' in icon:
                ev.setdefault('mileage_start_notif', n.created_at)
            elif 'fa-sack-dollar' in icon:
                ev.setdefault('budget_deducted', n.created_at)
            elif 'fa-credit-card' in icon and cat == 'payment':
                if 'ยืนยันแล้ว' in msg:
                    ev.setdefault('payment_confirmed', n.created_at)
                else:
                    ev.setdefault('payment_required', n.created_at)
        return ev

    def _budget_label(log):
        budget = log.budget if log else None
        if not budget:
            return ''
        bt = (budget.budget_type.name if budget.budget_type else '').lower()
        type_label = 'งบส่วนกลาง' if bt == 'central' else 'งบส่วนกอง'
        dept_name = budget.department.name if budget.department else ''
        return f'{type_label} - {dept_name}' if dept_name else type_label

    def _plate_of(booking):
        return booking.snap_vehicle_plate or (
            booking.assigned_vehicle.license_plate if booking.assigned_vehicle else ''
        )

    # ── Stage builders ─────────────────────────────────────────
    def _build_user_stages(booking, mileage, log, events):
        stages = []
        is_approved = booking.status == 'approved'
        is_rejected = bool(events.get('admin_rejected') or events.get('approver_rejected'))

        # Stage 0 (fallback): pending / forwarded — แสดงเฉพาะกรณียังไม่ approved และยังไม่ rejected
        # เพื่อให้ booking ทุกสถานะมี stage อย่างน้อย 1 อัน (ไม่ตก fallback timeline)
        if not is_approved and not is_rejected:
            if events.get('forwarded'):
                stages.append({
                    'key': 'pending_approver', 'icon': 'send',
                    'title': 'รอหัวหน้าแผนกอนุมัติ',
                    'desc_main': booking.destination or '',
                    'ts': _fmt_ts(events.get('forwarded')),
                })
            else:
                stages.append({
                    'key': 'pending', 'icon': 'clock',
                    'title': 'รอ Admin พิจารณา',
                    'desc_main': booking.destination or '',
                    'ts': _fmt_ts(events.get('booking_created') or booking.created_at),
                })
        # Stage 1: approved
        if booking.status == 'approved' and booking.updated_at:
            plate = _plate_of(booking)
            desc_main = f'อนุมัติรถ {plate}'.strip() if plate else 'อนุมัติคำขอจองรถ'
            desc_sub = ''
            if booking.trip_group:
                names = []
                for m in mates_by_group.get(booking.trip_group, []):
                    if m.id == booking.id: continue
                    u = mate_users.get(m.user_id)
                    nm = (u.full_name if u else None) or m.contact_name
                    if nm and nm not in names:
                        names.append(nm)
                if names:
                    desc_sub = f'เดินทางร่วมกับ {", ".join(names)}'
            ts = events.get('approver_approved') or events.get('admin_approved') or booking.updated_at
            stages.append({
                'key': 'approved', 'icon': 'check-circle-2',
                'title': 'ได้รับการอนุมัติแล้ว',
                'desc_main': desc_main, 'desc_sub': desc_sub,
                'ts': _fmt_ts(ts),
            })
        # Stage 2: trip_start
        if mileage and mileage.odometer_start is not None:
            stages.append({
                'key': 'trip_start', 'icon': 'play-circle',
                'title': 'เริ่มเดินทาง',
                'desc': f'เริ่มต้นที่ {mileage.odometer_start:,} กม.',
                'ts': _fmt_ts(mileage.actual_start or events.get('mileage_start_notif') or mileage.created_at),
            })
        # Stage 3: trip_end
        if mileage and mileage.odometer_end is not None:
            distance = mileage.odometer_end - (mileage.odometer_start or 0)
            stages.append({
                'key': 'trip_end', 'icon': 'flag',
                'title': 'เดินทางเสร็จสิ้น',
                'desc': f'รวมระยะทาง {distance:,} กม.',
                'ts': _fmt_ts(mileage.actual_end or events.get('mileage_end_notif')),
            })
        # Stage 4: budget
        if log:
            stages.append({
                'key': 'budget', 'icon': 'wallet',
                'title': 'ใช้งบประมาณ',
                'desc_main': f'ใช้ ฿{abs(float(log.change_amount)):,.0f}',
                'desc_sub': f'หักจาก {_budget_label(log)}' if _budget_label(log) else '',
                'ts': _fmt_ts(log.created_at),
            })
        # Stage R (terminal): rejected — แสดงเป็น stage สุดท้ายถ้าถูกปฏิเสธ
        if events.get('admin_rejected'):
            stages.append({
                'key': 'rejected', 'icon': 'x-circle',
                'title': 'ถูกปฏิเสธโดย Admin',
                'desc_main': booking.reject_reason or '',
                'ts': _fmt_ts(events.get('admin_rejected')),
            })
        elif events.get('approver_rejected'):
            stages.append({
                'key': 'rejected', 'icon': 'x-circle',
                'title': 'ถูกปฏิเสธโดยหัวหน้าแผนก',
                'desc_main': booking.reject_reason or '',
                'ts': _fmt_ts(events.get('approver_rejected')),
            })
        return stages

    def _build_admin_stages(booking, mileage, log, events):
        stages = []
        owner = updater_users.get(booking.user_id) if booking.user_id else None
        owner_name = (owner.full_name if owner else '') or 'ไม่ระบุ'

        # Stage 1: created
        ts = events.get('booking_created') or booking.created_at
        stages.append({
            'key': 'created', 'icon': 'inbox',
            'title': 'คำขอเข้ามา',
            'desc_main': f'คำขอจาก {owner_name}',
            'desc_sub': booking.destination or '',
            'ts': _fmt_ts(ts),
        })
        # Stage 2: assigned
        if events.get('admin_assigned') or booking.assigned_vehicle_id:
            plate = _plate_of(booking)
            drv = booking.snap_driver_name or (booking.driver.name if booking.driver else '')
            stages.append({
                'key': 'assigned', 'icon': 'truck',
                'title': 'มอบหมายรถ + คนขับ',
                'desc_main': plate or 'รอกำหนดรถ',
                'desc_sub': f'คนขับ: {drv}' if drv else '',
                'ts': _fmt_ts(events.get('admin_assigned')),
            })
        # Stage 3: decision (admin approve เอง OR forward)
        if events.get('forwarded'):
            stages.append({
                'key': 'forwarded', 'icon': 'send',
                'title': 'ส่งต่อหัวหน้าแผนก',
                'desc_main': booking.trip_department or booking.snap_department_name or '',
                'ts': _fmt_ts(events.get('forwarded')),
            })
        elif events.get('admin_approved'):
            updater = updater_users.get(booking.updated_by) if booking.updated_by else None
            updater_name = (updater.full_name if updater else '') or 'Admin'
            stages.append({
                'key': 'admin_approved', 'icon': 'check-circle-2',
                'title': 'อนุมัติโดย Admin',
                'desc_main': updater_name,
                'ts': _fmt_ts(events.get('admin_approved')),
            })
        elif events.get('admin_rejected'):
            stages.append({
                'key': 'admin_rejected', 'icon': 'x-circle',
                'title': 'ปฏิเสธโดย Admin',
                'desc_main': booking.reject_reason or '',
                'ts': _fmt_ts(events.get('admin_rejected')),
            })
        # Stage 4: approver decision (เฉพาะกรณี waiting_approver → ...)
        if events.get('approver_approved'):
            updater = updater_users.get(booking.updated_by) if booking.updated_by else None
            updater_name = (updater.full_name if updater else '') or 'หัวหน้าแผนก'
            stages.append({
                'key': 'approver_approved', 'icon': 'check-check',
                'title': 'หัวหน้าแผนกอนุมัติ',
                'desc_main': updater_name,
                'ts': _fmt_ts(events.get('approver_approved')),
            })
        elif events.get('approver_rejected'):
            stages.append({
                'key': 'approver_rejected', 'icon': 'x-circle',
                'title': 'หัวหน้าแผนกปฏิเสธ',
                'desc_main': booking.reject_reason or '',
                'ts': _fmt_ts(events.get('approver_rejected')),
            })
        # Stage 5: trip_done
        if mileage and mileage.odometer_end is not None:
            distance = mileage.odometer_end - (mileage.odometer_start or 0)
            fuel = float(mileage.fuel_cost or 0)
            stages.append({
                'key': 'trip_done', 'icon': 'flag',
                'title': 'ทริปเสร็จสิ้น',
                'desc_main': f'ระยะทางรวม {distance:,} กม.',
                'desc_sub': f'ค่าน้ำมัน ฿{fuel:,.0f}' if fuel else '',
                'ts': _fmt_ts(mileage.actual_end),
            })
        # Stage 6: budget
        if log:
            stages.append({
                'key': 'budget', 'icon': 'wallet',
                'title': 'หักงบเสร็จ',
                'desc_main': f'ใช้ ฿{abs(float(log.change_amount)):,.0f}',
                'desc_sub': _budget_label(log),
                'ts': _fmt_ts(log.created_at),
            })
        # Stage 7: payment received (personal เท่านั้น)
        if mileage and mileage.personal_paid_at:
            fuel = float(mileage.fuel_cost or 0)
            stages.append({
                'key': 'payment_received', 'icon': 'coins',
                'title': 'รับเงินจาก User',
                'desc_main': f'{owner_name} ฿{fuel:,.0f}',
                'desc_sub': 'ยืนยันรับเงินแล้ว',
                'ts': _fmt_ts(mileage.personal_paid_at),
            })
        return stages

    def _build_approver_stages(booking, mileage, log, events):
        stages = []
        owner = updater_users.get(booking.user_id) if booking.user_id else None
        owner_name = (owner.full_name if owner else '') or 'ไม่ระบุ'

        # Stage 1: forwarded — emit เสมอ (fallback ใช้ booking.created_at ถ้าไม่มี forwarded event)
        forwarded_ts = events.get('forwarded') or booking.created_at
        stages.append({
            'key': 'forwarded', 'icon': 'send',
            'title': 'ได้รับคำขอ' if events.get('forwarded') else 'รอ Admin ส่งต่อ',
            'desc_main': 'ส่งต่อโดย Admin' if events.get('forwarded') else '',
            'desc_sub': f'{owner_name} · {booking.destination or ""}',
            'ts': _fmt_ts(forwarded_ts),
        })
        # Stage 2: my decision
        if events.get('approver_approved'):
            stages.append({
                'key': 'my_approved', 'icon': 'check-circle-2',
                'title': 'อนุมัติแล้ว',
                'desc_main': '',
                'ts': _fmt_ts(events.get('approver_approved')),
            })
        elif events.get('approver_rejected'):
            stages.append({
                'key': 'my_rejected', 'icon': 'x-circle',
                'title': 'ปฏิเสธแล้ว',
                'desc_main': booking.reject_reason or '',
                'ts': _fmt_ts(events.get('approver_rejected')),
            })
        # Stage 3: trip_done
        if mileage and mileage.odometer_end is not None:
            distance = mileage.odometer_end - (mileage.odometer_start or 0)
            stages.append({
                'key': 'trip_done', 'icon': 'flag',
                'title': 'ทริปเสร็จ',
                'desc_main': f'ระยะทางรวม {distance:,} กม.',
                'ts': _fmt_ts(mileage.actual_end),
            })
        # Stage 4: budget (เฉพาะ dept budget)
        if log and log.budget and log.budget.budget_type \
                and log.budget.budget_type.name.lower() == 'department':
            stages.append({
                'key': 'budget', 'icon': 'wallet',
                'title': 'หักงบแผนก',
                'desc_main': f'ใช้ ฿{abs(float(log.change_amount)):,.0f}',
                'desc_sub': _budget_label(log),
                'ts': _fmt_ts(log.created_at),
            })
        return stages

    # ── Run stage builders ────────────────────────────────────
    for g in groups:
        bid = g['booking_id']
        booking = booking_map.get(bid)
        if not booking:
            continue
        role = _resolve_role(booking)
        if not role:
            continue
        mileage = mileage_map.get(bid)
        log = log_map.get(bid)
        events = _extract_events(notifs_by_booking.get(bid, []))

        if role == 'user':
            stages = _build_user_stages(booking, mileage, log, events)
        elif role == 'approver':
            stages = _build_approver_stages(booking, mileage, log, events)
        else:
            stages = _build_admin_stages(booking, mileage, log, events)

        if stages:
            g['stages'] = stages
            g['role']   = role
            # Synthetic groups → ใช้ stage สุดท้ายเป็น preview/sort key
            if g.get('is_synthetic'):
                last = stages[-1]
                preview_msg = last.get('desc_main') or last.get('desc') or last.get('title', '')
                g['latest'] = {
                    'id': None, 'message': preview_msg,
                    'ntype': 'info', 'category': 'status',
                    'icon': last.get('icon', 'info'),
                    'is_read': True, 'is_sticky': False,
                    'booking_id': bid, 'booking_title': g['booking_title'],
                    'action_url': f'/vehicle/detail/{bid}',
                    'created_at': last.get('ts', ''),
                    'created_rel': '',
                }
                # raw datetime สำหรับ sort — รวบทุก event source แล้วเลือก max
                _candidate_dts = [
                    booking.created_at, booking.updated_at,
                    events.get('booking_created'), events.get('admin_assigned'),
                    events.get('forwarded'),
                    events.get('admin_approved'), events.get('approver_approved'),
                    events.get('admin_rejected'), events.get('approver_rejected'),
                    mileage.actual_start if mileage else None,
                    mileage.actual_end if mileage else None,
                    mileage.personal_paid_at if mileage else None,
                    log.created_at if log else None,
                ]
                _valid_dts = [dt for dt in _candidate_dts if dt is not None]
                g['_sort_dt'] = max(_valid_dts) if _valid_dts else booking.created_at

    # ── Sort + drop group ไม่มี stages (frontend ไม่มี fallback timeline แล้ว) ──
    groups = [g for g in groups if g.get('stages')]
    # sort by raw datetime (latest event/stage on top) — string `DD/MM/YYYY HH:MM` ไม่ sortable lexically
    _EPOCH = datetime(1970, 1, 1)
    groups.sort(key=lambda g: g.get('_sort_dt') or _EPOCH, reverse=True)
    # strip internal raw datetime ก่อน jsonify (Flask jsonify ไม่ serialize datetime default)
    for g in groups:
        g.pop('_sort_dt', None)

    # Badge count for UI (max 30+)
    badge = unread if unread <= 30 else '30+'

    return jsonify({
        'notifications':  [_to_dict(n) for n in notifs],   # flat (backward compat)
        'groups':         groups,
        'sticky':         [_to_dict(n) for n in sticky],
        'loose':          loose_items,
        'unread':         unread,
        'unread_payment': unread_payment,
        'badge':          badge,
    })



@vehicle_bp.route('/api/notifications/read-all', methods=['POST'])
@login_required
def mark_all_read():
    Notification.query.filter_by(user_id=current_user.id, is_read=False)\
        .update({'is_read': True})
    db.session.commit()
    return jsonify({'ok': True})



@vehicle_bp.route('/api/notifications/<int:notif_id>/read', methods=['POST'])
@login_required
def mark_one_read(notif_id):
    n = Notification.query.get_or_404(notif_id)
    if n.user_id == current_user.id:
        # Sticky payment card ห้าม mark-as-read จากการคลิกเฉย ๆ — ต้อง admin confirm ก่อน
        if n.is_sticky and n.category in ('payment', 'payment_admin'):
            return jsonify({'ok': True, 'skipped': 'sticky'})
        n.is_read = True
        db.session.commit()
    return jsonify({'ok': True})


# ─────────────────────────────────────────────
# Payment — User แจ้ง "จ่ายแล้ว" (ยังไม่ใช่ยืนยันจริง)
# ─────────────────────────────────────────────

@vehicle_bp.route('/api/payment/report/<int:mileage_id>', methods=['POST'])
@login_required
def payment_report_paid(mileage_id):
    m = VehicleMileage.query.get_or_404(mileage_id)
    b = m.booking
    if b.user_id != current_user.id:
        return jsonify({'ok': False, 'msg': 'ไม่มีสิทธิ์'}), 403

    if m.personal_status == 1:
        return jsonify({'ok': False, 'msg': 'ชำระแล้ว'}), 400

    m.user_reported_paid = True
    m.user_reported_at   = datetime.now()
    db.session.commit()
    return jsonify({'ok': True, 'msg': 'แจ้งสำเร็จ — รอ Admin ยืนยัน'})


# ─────────────────────────────────────────────
# Payment — User แจ้ง "จ่ายแล้ว" จาก notification (อ้างอิง booking_id)
# ใช้โดย notification panel ที่ไม่รู้ mileage_id
# ─────────────────────────────────────────────

@vehicle_bp.route('/api/payment/report-by-booking/<int:booking_id>', methods=['POST'])
@login_required
def payment_report_paid_by_booking(booking_id):
    b = VehicleBooking.query.get_or_404(booking_id)
    if b.user_id != current_user.id:
        return jsonify({'ok': False, 'msg': 'ไม่มีสิทธิ์'}), 403

    # หา mileage ที่ end แล้ว + personal + ยังไม่ paid — เอาตัวล่าสุด
    m = (VehicleMileage.query
         .filter_by(booking_id=b.id)
         .filter(VehicleMileage.odometer_end.isnot(None))
         .filter((VehicleMileage.personal_status == 0) | (VehicleMileage.personal_status.is_(None)))
         .order_by(VehicleMileage.id.desc())
         .first())
    if not m:
        return jsonify({'ok': False, 'msg': 'ไม่พบรายการค้างชำระ'}), 404

    m.user_reported_paid = True
    m.user_reported_at   = datetime.now()
    db.session.commit()
    return jsonify({'ok': True, 'msg': 'แจ้งสำเร็จ — รอ Admin ยืนยัน', 'mileage_id': m.id})


# ─────────────────────────────────────────────
# Unified Activity History (Phase 10, 2026-05-22)
# รวม 4 service types: vehicle / repair / room / maintenance
# ─────────────────────────────────────────────

# status → (badge tone, dot color suffix, thai label)
