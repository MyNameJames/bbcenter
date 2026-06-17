from flask import jsonify
from flask_login import login_required, current_user
from models import db, get_bkk_time, VehicleBooking, VehicleMileage, Notification
from sqlalchemy import or_
from datetime import timedelta
from collections import defaultdict
from views.vehicle.vehicle_common import vehicle_bp


# ── Display title (บรรทัดแรกของ notif card) ────────────────────
# title สั้นๆ จาก event_key (booking events) → fallback category → ntype
_EVENT_TITLE = {
    'booked':        'จองสำเร็จ',
    'assigned':      'เปลี่ยนรถ',
    'forwarded':     'ส่งต่อผู้ประสานงาน',
    'approved':      'อนุมัติแล้ว',
    'rejected':      'ถูกปฏิเสธ',
    'merged':        'รวมกลุ่มทริป',
    'mileage_start': 'เริ่มเดินทาง',
    'mileage_end':   'สิ้นสุดเดินทาง',
    'budget':        'หักงบเดินทาง',
    'edited':        'แก้ไขคำขอ',
    'cancelled':     'ยกเลิกเดินทาง',
}
_CAT_TITLE   = {'mileage': 'การเดินทาง', 'budget': 'งบประมาณ',
                'payment': 'ชำระเงิน', 'payment_admin': 'ชำระเงิน'}
_NTYPE_TITLE = {'success': 'สำเร็จ', 'info': 'แจ้งเตือน',
                'warning': 'แจ้งเตือน', 'danger': 'สำคัญ'}


def _notif_title(n):
    return (_EVENT_TITLE.get(n.event_key)
            or _CAT_TITLE.get(n.category)
            or _NTYPE_TITLE.get(n.ntype, 'แจ้งเตือน'))


# ── Helpers ────────────────────────────────────────────────────

def _rel_time(dt, now):
    if not dt: return ''
    d = now - dt
    sec = int(d.total_seconds())
    if sec < 60:     return 'เมื่อสักครู่'
    if sec < 3600:   return f'{sec // 60} นาทีที่แล้ว'
    if sec < 86400:  return f'{sec // 3600} ชั่วโมงที่แล้ว'
    if sec < 604800: return f'{sec // 86400} วันที่แล้ว'
    return dt.strftime('%d/%m/%Y')


def _notif_to_dict(n, now):
    b = n.booking
    return {
        'id':            n.id,
        'title':         n.title or _notif_title(n),
        'message':       n.message,
        'ntype':         n.ntype,
        'category':      n.category or 'status',
        'icon':          n.icon or 'fa-solid fa-circle-info',
        'is_read':       n.is_read,
        'is_sticky':     bool(n.is_sticky),
        'booking_id':    n.booking_id,
        'booking_title': (b.destination if b else None),
        'action_url':    n.action_url or (f'/vehicle/detail/{n.booking_id}' if n.booking_id else '#'),
        'created_at':    n.created_at.strftime('%d/%m/%Y %H:%M') if n.created_at else '',
        'created_rel':   _rel_time(n.created_at, now),
        'ts_ms':         int(n.created_at.timestamp() * 1000) if n.created_at else 0,
    }


# ── Routes ─────────────────────────────────────────────────────

@vehicle_bp.route('/api/notifications')
@login_required
def api_notifications():
    now        = get_bkk_time()
    cutoff_90d = now - timedelta(days=90)

    notifs = (Notification.query
              .filter(Notification.user_id == current_user.id,
                      Notification.created_at >= cutoff_90d,
                      Notification.is_sticky == False,
                      Notification.superseded_at.is_(None))
              .order_by(Notification.created_at.desc()).limit(200).all())

    unread = Notification.query.filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
        Notification.superseded_at.is_(None),
        or_(Notification.expired_at.is_(None), Notification.expired_at > now)
    ).count()

    sticky = (Notification.query
              .filter(Notification.user_id == current_user.id,
                      Notification.is_sticky == True,
                      Notification.is_read == False,
                      Notification.category.in_(['payment', 'payment_admin']))
              .order_by(Notification.created_at.desc()).all())

    badge = unread if unread <= 30 else '30+'

    # Group booking-related notifications by booking_id
    booking_map = defaultdict(list)
    solo = []
    for n in notifs:
        if n.booking_id:
            booking_map[n.booking_id].append(n)
        else:
            solo.append(n)

    groups = []
    for bid, ns in booking_map.items():
        ns_s = sorted(ns, key=lambda x: x.created_at, reverse=True)
        latest = ns_s[0]
        b = latest.booking
        groups.append({
            'booking_id':     bid,
            'booking_title':  (b.destination if b else f'คำขอ #{bid}'),
            'unread_count':   sum(1 for n in ns_s if not n.is_read),
            'ts_ms':          int(latest.created_at.timestamp() * 1000),
            'latest_rel':     _rel_time(latest.created_at, now),
            'latest_message': latest.message,
            'latest_icon':    latest.icon or 'fa-solid fa-circle-info',
            'latest_ntype':   latest.ntype or 'info',
            'notifications':  [_notif_to_dict(n, now) for n in ns_s],
        })

    groups.sort(key=lambda g: g['ts_ms'], reverse=True)

    return jsonify({
        'groups':         groups,
        'items':          [_notif_to_dict(n, now) for n in solo],
        'sticky':         [_notif_to_dict(n, now) for n in sticky],
        'unread':         unread,
        'unread_payment': len(sticky),
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
    m.user_reported_at   = get_bkk_time()
    db.session.commit()
    return jsonify({'ok': True, 'msg': 'แจ้งสำเร็จ — รอ Admin ยืนยัน'})


@vehicle_bp.route('/api/payment/report-by-booking/<int:booking_id>', methods=['POST'])
@login_required
def payment_report_paid_by_booking(booking_id):
    b = VehicleBooking.query.get_or_404(booking_id)
    if b.user_id != current_user.id:
        return jsonify({'ok': False, 'msg': 'ไม่มีสิทธิ์'}), 403

    m = (VehicleMileage.query
         .filter_by(booking_id=b.id)
         .filter(VehicleMileage.odometer_end.isnot(None))
         .filter((VehicleMileage.personal_status == 0) | (VehicleMileage.personal_status.is_(None)))
         .order_by(VehicleMileage.id.desc())
         .first())
    if not m:
        return jsonify({'ok': False, 'msg': 'ไม่พบรายการค้างชำระ'}), 404

    m.user_reported_paid = True
    m.user_reported_at   = get_bkk_time()
    db.session.commit()
    return jsonify({'ok': True, 'msg': 'แจ้งสำเร็จ — รอ Admin ยืนยัน', 'mileage_id': m.id})
