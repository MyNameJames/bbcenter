"""
LINE Webhook + Account Linking
───────────────────────────────
blueprint `core_bp` — endpoint สำหรับ LINE Messaging API + flow ผูกบัญชี user

Routes:
- POST /line/webhook  — LINE platform ยิง event เข้ามา (verify X-Line-Signature)
                        · message ที่เป็นโค้ด 6 หลัก → จับคู่ User → set line_user_id
                        · group event → log groupId (เอาไปใส่ LINE_GROUP_ID ใน .env)
- GET  /line/link     — หน้าแสดงโค้ด 6 หลักของ user (login required) + วิธีแอด OA

flow ผูกบัญชี:
1. user เปิด /line/link → ระบบ gen โค้ด 6 หลัก เก็บใน User.line_link_code
2. user แอด Official Account เป็นเพื่อน แล้วพิมพ์โค้ดใน chat
3. webhook จับคู่โค้ด → set line_user_id, ล้าง line_link_code → reply ยืนยัน
4. ต่อจากนั้นทุก in-app notification ของ user จะเด้ง LINE DM ด้วย (hook ใน _create)
"""
import hmac
import hashlib
import base64
import random

from flask import Blueprint, current_app, request, abort, render_template
from flask_login import login_required, current_user

from models import db, User, get_bkk_time
from views.core import line_service

core_bp = Blueprint('core', __name__)


# ─────────────────────────────────────────
# Webhook
# ─────────────────────────────────────────
def _verify_signature(body: bytes, signature: str) -> bool:
    """ตรวจ X-Line-Signature = base64(HMAC-SHA256(channel_secret, body))"""
    secret = line_service.LINE_CHANNEL_SECRET
    if not secret or not signature:
        return False
    digest = hmac.new(secret.encode('utf-8'), body, hashlib.sha256).digest()
    expected = base64.b64encode(digest).decode('utf-8')
    return hmac.compare_digest(expected, signature)


def _handle_message_event(ev):
    """user พิมพ์ข้อความ → ถ้าเป็นโค้ด 6 หลักให้ผูกบัญชี"""
    source = ev.get('source', {})
    user_id = source.get('userId')
    reply_token = ev.get('replyToken')
    text = (ev.get('message', {}).get('text') or '').strip()

    if not user_id:
        return

    # group/room → log id ครั้งแรก (เอาไปใส่ .env) แล้วจบ
    if source.get('type') in ('group', 'room'):
        gid = source.get('groupId') or source.get('roomId')
        current_app.logger.info("LINE %s event — id = %s", source.get('type'), gid)
        return

    if not (len(text) == 6 and text.isdigit()):
        return  # ไม่ใช่โค้ด — เพิกเฉย

    user = User.query.filter_by(line_link_code=text).first()
    if not user:
        line_service.reply(reply_token, "❌ โค้ดไม่ถูกต้องหรือหมดอายุ — กรุณาเปิดหน้าผูกบัญชีใหม่")
        return

    # userId นี้ผูกกับคนอื่นอยู่แล้วหรือไม่ (line_user_id unique)
    existing = User.query.filter_by(line_user_id=user_id).first()
    if existing and existing.id != user.id:
        line_service.reply(reply_token, "⚠️ LINE นี้ถูกผูกกับบัญชีอื่นแล้ว")
        return

    user.line_user_id   = user_id
    user.line_link_code = None
    db.session.commit()
    line_service.reply(
        reply_token,
        f"✅ ผูกบัญชีสำเร็จ — {user.full_name or user.username}\n"
        f"ต่อจากนี้จะได้รับแจ้งเตือนผ่าน LINE"
    )


def _handle_postback_event(ev):
    """approver กดปุ่ม postback ใน flex card — รองรับ action=approve เท่านั้น"""
    source   = ev.get('source', {})
    line_uid = source.get('userId')
    reply_token = ev.get('replyToken')
    data     = ev.get('postback', {}).get('data', '')

    if not line_uid or not data:
        return

    params     = dict(p.split('=', 1) for p in data.split('&') if '=' in p)
    action     = params.get('action')
    booking_id = params.get('booking_id')

    if action == 'approve' and booking_id:
        _approve_via_line(line_uid, reply_token, int(booking_id))


def _approve_via_line(line_uid: str, reply_token: str, booking_id: int):
    """ตรวจสอบสิทธิ์ + deadline + budget แล้ว approve booking ผ่าน LINE postback"""
    from datetime import timedelta
    from models import db, User, VehicleBooking, DeptApprover, get_bkk_time
    from views.vehicle.vehicle_common import _lookup_budget_for_booking
    from views.core import broadcast
    from views.core.notification_service import notify_approver_approved as _n_approved
    from views.core.line_service import build_approve_result_card

    def _reply_text(msg):
        line_service.reply(reply_token, msg)

    try:
        approver = User.query.filter_by(line_user_id=line_uid).first()
        if not approver:
            _reply_text("❌ ไม่พบบัญชีที่ผูกไว้ กรุณาผูกบัญชีที่ /line/link ก่อน")
            return

        my_dept_ids = {r.dept_id for r in DeptApprover.query.filter_by(user_id=approver.id).all()}
        if not my_dept_ids:
            _reply_text("❌ ท่านไม่มีสิทธิ์อนุมัติ")
            return

        booking = VehicleBooking.query.get(booking_id)
        if not booking:
            _reply_text(f"❌ ไม่พบคำขอ #{booking_id}")
            return

        if booking.status != 'waiting_approver':
            status_th = {'approved': 'อนุมัติแล้ว', 'rejected': 'ปฏิเสธแล้ว',
                         'cancelled': 'ยกเลิกแล้ว', 'pending': 'รอ Admin'}.get(booking.status, booking.status)
            _reply_text(f"ℹ️ คำขอ #{booking_id} ไม่ได้รอผู้ประสานงาน — สถานะปัจจุบัน: {status_th}")
            return

        if booking.trip_department_id not in my_dept_ids:
            _reply_text("❌ ท่านไม่มีสิทธิ์อนุมัติคำขอของแผนกนี้")
            return

        # Deadline: ต้องอนุมัติก่อน 1 วันก่อนเดินทาง
        now = get_bkk_time()
        if booking.start_datetime - now <= timedelta(days=1):
            _reply_text(f"⏰ เลยกำหนดอนุมัติแล้ว\n"
                        f"ต้องอนุมัติก่อน 1 วัน กรุณาติดต่อ Admin โดยตรง")
            return

        # Budget guard (เหมือน approver path ใน vehicle_booking.py)
        _bgt, _kl = _lookup_budget_for_booking(booking)
        if _bgt is None:
            _reply_text('❌ อนุมัติไม่ได้ — ไม่มีงบที่เปิดใช้ครอบวันเดินทางนี้'
                        + (f' (หมวด {_kl})' if _kl else ''))
            return

        booking.status     = 'approved'
        booking.updated_by = approver.id
        db.session.flush()

        broadcast.notify_approver_approved(booking, approver)   # TG + LINE group
        _n_approved(booking, approver)                          # In-app

        db.session.commit()

        result_card = build_approve_result_card(booking, approver)
        line_service.reply_flex(reply_token, f"อนุมัติสำเร็จ — คำขอ #{booking_id}", result_card)

    except Exception:
        current_app.logger.exception("_approve_via_line failed booking_id=%s", booking_id)
        _reply_text("❌ เกิดข้อผิดพลาด กรุณาลองใหม่หรือติดต่อ Admin")


@core_bp.route('/line/webhook', methods=['POST'])
def line_webhook():
    body = request.get_data()
    signature = request.headers.get('X-Line-Signature', '')
    if not _verify_signature(body, signature):
        abort(400)

    payload = request.get_json(silent=True) or {}
    for ev in payload.get('events', []):
        try:
            etype = ev.get('type')
            if etype == 'message' and ev.get('message', {}).get('type') == 'text':
                _handle_message_event(ev)
            elif etype == 'postback':
                _handle_postback_event(ev)
            elif etype in ('join', 'follow'):
                src = ev.get('source', {})
                gid = src.get('groupId') or src.get('roomId') or src.get('userId')
                current_app.logger.info("LINE %s event — source %s id = %s", etype, src.get('type'), gid)
        except Exception:
            current_app.logger.exception("LINE webhook event error")

    return 'OK', 200


# ─────────────────────────────────────────
# Account linking page
# ─────────────────────────────────────────
def _gen_code() -> str:
    return f"{random.randint(0, 999999):06d}"


@core_bp.route('/line/link')
@login_required
def line_link():
    """แสดงโค้ด 6 หลักให้ user พิมพ์ใน chat ของ Official Account"""
    if not current_user.line_user_id:
        # ยังไม่ผูก → gen โค้ดใหม่ทุกครั้งที่เปิดหน้า
        current_user.line_link_code = _gen_code()
        db.session.commit()
    return render_template(
        'core/line_link.html',
        link_code=current_user.line_link_code,
        is_linked=bool(current_user.line_user_id),
    )
