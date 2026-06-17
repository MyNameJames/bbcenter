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
