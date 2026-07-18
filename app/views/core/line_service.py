"""
LINE Messaging API Service
──────────────────────────
ช่องทางแจ้งเตือนที่ 3 (ต่อจาก Telegram + in-app) ผ่าน LINE Official Account

โครงสร้าง mirror `telegram_service.py`:
- `_push_group(text)`            → broadcast เข้า LINE group (LINE_GROUP_ID) plain text
- `_push_flex_group(alt, body)`  → broadcast flex card เข้า LINE group
- `_push_user(line_user_id, text)` → DM หา user รายคน plain text (ใช้โดย notification_service._create)
- `_push_flex_user(uid, alt, body)` → DM flex card หา user รายคน
- `reply(reply_token, text)`     → reply plain text (webhook)
- `reply_flex(reply_token, alt, body)` → reply flex card (webhook postback)
- notify_* 5 ตัว                → ชื่อตรงกับ telegram_service เป๊ะ (เรียกผ่าน broadcast.py) ส่ง flex
- `notify_approver_action_required_dm` → ส่ง flex card + ปุ่ม approve ไปหา approver รายคน

หมายเหตุ: LINE push ลบข้อความไม่ได้ → ไม่มี delete_old_message

ENV (.env) — ไม่มี → ข้าม notify เงียบๆ:
    LINE_CHANNEL_ACCESS_TOKEN   channel access token (long-lived)
    LINE_CHANNEL_SECRET         channel secret (verify webhook signature — ใน line_webhook.py)
    LINE_GROUP_ID               groupId ของ LINE group
"""
import logging
import os
import requests
from datetime import timedelta

_log = logging.getLogger(__name__)

LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
LINE_CHANNEL_SECRET       = os.getenv("LINE_CHANNEL_SECRET")
LINE_GROUP_ID             = os.getenv("LINE_GROUP_ID")

if not LINE_CHANNEL_ACCESS_TOKEN:
    _log.warning("LINE_CHANNEL_ACCESS_TOKEN ไม่ได้ตั้งใน .env — การแจ้งเตือน LINE จะถูกข้าม")

_PUSH_URL  = "https://api.line.me/v2/bot/message/push"
_REPLY_URL = "https://api.line.me/v2/bot/message/reply"

_TH_MONTHS = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
               'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']


# ─────────────────────────────────────────
# Low-level push (plain text)
# ─────────────────────────────────────────
def _push(to: str, text: str) -> bool:
    if not LINE_CHANNEL_ACCESS_TOKEN or not to:
        return False
    try:
        resp = requests.post(
            _PUSH_URL,
            headers={"Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
                     "Content-Type": "application/json"},
            json={"to": to, "messages": [{"type": "text", "text": text[:5000]}]},
            timeout=5,
        )
        if resp.ok:
            return True
        _log.warning("LINE push failed %s: %s", resp.status_code, resp.text)
    except Exception:
        _log.exception("LINE push error")
    return False


def _push_group(text: str) -> bool:
    if not LINE_GROUP_ID:
        return False
    return _push(LINE_GROUP_ID, text)


def _push_user(line_user_id: str, text: str) -> bool:
    return _push(line_user_id, text)


def reply(reply_token: str, text: str) -> bool:
    if not LINE_CHANNEL_ACCESS_TOKEN or not reply_token:
        return False
    try:
        resp = requests.post(
            _REPLY_URL,
            headers={"Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
                     "Content-Type": "application/json"},
            json={"replyToken": reply_token, "messages": [{"type": "text", "text": text[:5000]}]},
            timeout=5,
        )
        return resp.ok
    except Exception:
        _log.exception("LINE reply error")
        return False


# ─────────────────────────────────────────
# Low-level push (Flex Message)
# ─────────────────────────────────────────
def _push_flex(to: str, alt_text: str, contents: dict) -> bool:
    if not LINE_CHANNEL_ACCESS_TOKEN or not to:
        return False
    try:
        resp = requests.post(
            _PUSH_URL,
            headers={"Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
                     "Content-Type": "application/json"},
            json={"to": to, "messages": [
                {"type": "flex", "altText": alt_text[:400], "contents": contents}
            ]},
            timeout=5,
        )
        if resp.ok:
            return True
        _log.warning("LINE flex push failed %s: %s", resp.status_code, resp.text)
    except Exception:
        _log.exception("LINE flex push error")
    return False


def _push_flex_group(alt_text: str, contents: dict) -> bool:
    if not LINE_GROUP_ID:
        return False
    return _push_flex(LINE_GROUP_ID, alt_text, contents)


def _push_flex_user(line_user_id: str, alt_text: str, contents: dict) -> bool:
    return _push_flex(line_user_id, alt_text, contents)


def reply_flex(reply_token: str, alt_text: str, contents: dict) -> bool:
    if not LINE_CHANNEL_ACCESS_TOKEN or not reply_token:
        return False
    try:
        resp = requests.post(
            _REPLY_URL,
            headers={"Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
                     "Content-Type": "application/json"},
            json={"replyToken": reply_token, "messages": [
                {"type": "flex", "altText": alt_text[:400], "contents": contents}
            ]},
            timeout=5,
        )
        return resp.ok
    except Exception:
        _log.exception("LINE reply_flex error")
        return False


# ─────────────────────────────────────────
# Format helpers
# ─────────────────────────────────────────
def _th_date(dt) -> str:
    if not dt:
        return '-'
    return f"{dt.day} {_TH_MONTHS[dt.month]} {dt.year + 543}"


def _th_time(dt) -> str:
    if not dt:
        return '-'
    return dt.strftime('%H:%M')


def _expense_text(booking) -> str:
    exp = booking.expense_type
    if exp == 'central':
        cat = f' ({booking.central_category})' if booking.central_category else ''
        return f'ส่วนกลาง{cat}'
    if exp == 'department':
        return 'หน่วยงาน'
    if exp == 'personal':
        return 'ส่วนตัว'
    return exp or '-'


# ─────────────────────────────────────────
# Flex component builders
# ─────────────────────────────────────────
def _row(label: str, value: str) -> dict:
    return {
        "type": "box", "layout": "horizontal",
        "paddingTop": "8px", "paddingBottom": "8px",
        "contents": [
            {"type": "text", "text": label, "size": "sm", "color": "#888888", "flex": 2},
            {"type": "text", "text": value or '-', "size": "sm", "color": "#162334",
             "weight": "bold", "flex": 3, "align": "end", "wrap": True},
        ],
    }


def _sep() -> dict:
    return {"type": "separator", "color": "#f0f0f0"}


def _booking_rows(booking, *, show_vehicle: bool = False) -> list:
    u = booking.user
    user_text = (u.full_name or u.username) if u else '-'
    if u and u.department:
        user_text += f' · {u.department}'

    d1, d2 = booking.start_datetime, booking.end_datetime
    if d1 and d2 and _th_date(d1) == _th_date(d2):
        date_text = f'{_th_date(d1)}  {_th_time(d1)}–{_th_time(d2)}'
    else:
        date_text = (f'{_th_date(d1)} {_th_time(d1)}'
                     f' – {_th_date(d2)} {_th_time(d2)}')

    rows = [
        _row('👤 ผู้จอง', user_text),
        _sep(),
        _row('📍 ปลายทาง', booking.destination or '-'),
        _sep(),
        _row('🎯 จุดประสงค์', f'{booking.purpose or "-"}  👥 {booking.passenger_count} คน'),
        _sep(),
        _row('🗓 วันที่', date_text),
        _sep(),
        _row('💰 ค่าใช้จ่าย', _expense_text(booking)),
    ]

    if show_vehicle:
        v = booking.assigned_vehicle
        if v:
            rows += [_sep(), _row('🚐 รถ', f'{v.brand} {v.model} · {v.license_plate}')]
        drv = booking.driver
        if drv:
            drv_text = drv.name + (f'  📞 {drv.phone}' if drv.phone else '')
            rows += [_sep(), _row('👮 คนขับ', drv_text)]

    return rows


def _bubble(bg_color: str, emoji: str, title: str, subtitle: str,
            badge: str, body_rows: list, footer_contents: list = None) -> dict:
    header_contents = [
        {"type": "box", "layout": "horizontal", "contents": [
            {"type": "text", "text": emoji, "size": "xl", "flex": 0},
            {"type": "text", "text": badge, "size": "xs", "color": "#ffffff99",
             "align": "end", "flex": 1, "gravity": "center"},
        ]},
        {"type": "text", "text": title, "color": "#ffffff", "weight": "bold",
         "size": "lg", "margin": "sm"},
        {"type": "text", "text": subtitle, "color": "#ffffff99", "size": "xs"},
    ]
    bubble = {
        "type": "bubble", "size": "kilo",
        "header": {"type": "box", "layout": "vertical", "backgroundColor": bg_color,
                   "paddingAll": "16px", "contents": header_contents},
        "body":   {"type": "box", "layout": "vertical", "paddingAll": "16px",
                   "contents": body_rows},
    }
    if footer_contents:
        bubble["footer"] = {"type": "box", "layout": "vertical",
                            "paddingAll": "12px", "contents": footer_contents}
    return bubble


# ─────────────────────────────────────────
# notify_* — ชื่อตรงกับ telegram_service (เรียกผ่าน broadcast.py)
# ─────────────────────────────────────────
def notify_approved(booking):
    subtitle = f'คำขอ #{booking.id} · {_expense_text(booking)}'
    rows = _booking_rows(booking, show_vehicle=True)
    if booking.trip_group:
        rows += [_sep(), _row('🔗 กลุ่มทริป', booking.trip_group)]
    contents = _bubble('#4059e6', '✅', 'อนุมัติการจอง', subtitle, 'อนุมัติ', rows)
    _push_flex_group(f'อนุมัติการจองรถ — #{booking.id}', contents)


def notify_forwarded_to_approver(booking):
    dept = (booking.user.department if booking.user else None) or '-'
    subtitle = f'คำขอ #{booking.id} · แผนก{dept}'
    rows = _booking_rows(booking)
    rows += [_sep(), _row('⚠️ หมายเหตุ', f'Approver แผนก{dept} โปรดพิจารณา')]
    contents = _bubble('#f59e0b', '📨', 'รอผู้ประสานงาน', subtitle, 'รออนุมัติ', rows)
    _push_flex_group(f'รอ Approver อนุมัติ — #{booking.id}', contents)


def notify_approver_approved(booking, approver):
    approver_name = approver.full_name or approver.username
    subtitle = f'อนุมัติโดย {approver_name}'
    rows = _booking_rows(booking, show_vehicle=True)
    rows += [_sep(), _row('✍️ อนุมัติโดย', approver_name)]
    contents = _bubble('#059669', '🎉', 'พร้อมเดินทาง!', subtitle, 'สำเร็จ', rows)
    _push_flex_group(f'พร้อมเดินทาง — #{booking.id}', contents)


def notify_rejected(booking, rejected_by):
    rejecter = rejected_by.full_name or rejected_by.username
    rows = _booking_rows(booking)
    rows += [_sep(), _row('✍️ ปฏิเสธโดย', rejecter)]
    if booking.reject_reason:
        rows += [_sep(), _row('💬 เหตุผล', booking.reject_reason)]
    contents = _bubble('#dc2626', '❌', 'ไม่อนุมัติ', f'ปฏิเสธโดย {rejecter}', 'ปฏิเสธ', rows)
    _push_flex_group(f'ไม่อนุมัติ — #{booking.id}', contents)


def notify_cancelled(booking, cancelled_by):
    canceller = cancelled_by.full_name or cancelled_by.username
    rows = _booking_rows(booking)
    rows += [_sep(), _row('✍️ ยกเลิกโดย', canceller)]
    contents = _bubble('#6b7280', '🚫', 'ยกเลิกการจอง', f'ยกเลิกโดย {canceller}', 'ยกเลิก', rows)
    _push_flex_group(f'ยกเลิกการจอง — #{booking.id}', contents)


# ─────────────────────────────────────────
# Approver DM — flex card + postback button
# ─────────────────────────────────────────
def notify_approver_action_required_dm(booking):
    """ส่ง flex card "รออนุมัติ" ไปหา approver รายคนผ่าน LINE DM
    เรียกจาก broadcast.notify_forwarded_to_approver หลัง group notification
    """
    from models import DeptApprover, User
    if not booking.trip_department_id:
        return
    approvers = DeptApprover.query.filter_by(dept_id=booking.trip_department_id).all()
    for apr in approvers:
        u = User.query.get(apr.user_id)
        if u and u.line_user_id:
            contents = _build_approver_dm_card(booking)
            _push_flex_user(u.line_user_id, f'รออนุมัติ — คำขอ #{booking.id}', contents)


def _build_approver_dm_card(booking) -> dict:
    from models import get_bkk_time
    dept = (booking.trip_department
            or (booking.user.department if booking.user else None) or '-')
    deadline_dt = booking.start_datetime - timedelta(days=1)
    deadline_str = (f'ต้องอนุมัติก่อน {_th_date(deadline_dt)} '
                    f'{_th_time(booking.start_datetime)} น.')
    rows = _booking_rows(booking)
    footer = [
        {"type": "box", "layout": "horizontal",
         "backgroundColor": "#fff8e6", "paddingAll": "8px",
         "cornerRadius": "6px",
         "contents": [
             {"type": "text", "text": f"⏰ {deadline_str}",
              "size": "xs", "color": "#92400e", "wrap": True}
         ]},
        {"type": "button", "style": "primary", "color": "#4059e6", "margin": "sm",
         "action": {
             "type": "postback",
             "label": "✅  อนุมัติ",
             "data": f"action=approve&booking_id={booking.id}",
             "displayText": f"ยืนยันอนุมัติการจองรถ #{booking.id}",
         }},
    ]
    return _bubble('#4059e6', '🚗', 'รออนุมัติจากท่าน',
                   f'คำขอ #{booking.id} · แผนก{dept}', 'รออนุมัติ', rows, footer)


def build_approve_result_card(booking, approver) -> dict:
    """Flex card ส่งกลับหลัง approve สำเร็จ (เรียกจาก line_webhook postback handler)"""
    from models import get_bkk_time
    approver_name = approver.full_name or approver.username
    now = get_bkk_time()
    rows = _booking_rows(booking, show_vehicle=True)
    rows += [
        _sep(),
        _row('✍️ อนุมัติโดย', approver_name),
        _sep(),
        _row('⏱ เวลาอนุมัติ', f'{_th_date(now)} {_th_time(now)} น.'),
    ]
    return _bubble('#059669', '✅', 'อนุมัติเรียบร้อยแล้ว',
                   f'คำขอ #{booking.id} · อนุมัติโดย {approver_name}', 'สำเร็จ', rows)
