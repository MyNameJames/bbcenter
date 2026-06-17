"""
LINE Messaging API Service
──────────────────────────
ช่องทางแจ้งเตือนที่ 3 (ต่อจาก Telegram + in-app) ผ่าน LINE Official Account

โครงสร้าง mirror `telegram_service.py`:
- `_push_group(text)`            → broadcast เข้า LINE group (LINE_GROUP_ID)
- `_push_user(line_user_id, text)` → DM หา user รายคน (ใช้โดย notification_service._create)
- notify_* 5 ตัว                  → ชื่อตรงกับ telegram_service เป๊ะ (เรียกผ่าน broadcast.py)

หมายเหตุ: LINE push ลบข้อความไม่ได้ (ไม่มี message_id ให้ delete แบบ Telegram)
          → ไม่มี delete_old_message; แต่ละ notify ส่งข้อความใหม่เสมอ

ENV (.env) — ไม่มี → ข้าม notify เงียบๆ (graceful skip เหมือน Telegram):
    LINE_CHANNEL_ACCESS_TOKEN   channel access token (long-lived)
    LINE_CHANNEL_SECRET         channel secret (ใช้ verify webhook signature — ใน line_webhook.py)
    LINE_GROUP_ID               groupId ของ LINE group (ได้จาก webhook ครั้งแรก)
"""
import logging
import os
import requests

_log = logging.getLogger(__name__)

LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
LINE_CHANNEL_SECRET       = os.getenv("LINE_CHANNEL_SECRET")
LINE_GROUP_ID             = os.getenv("LINE_GROUP_ID")

if not LINE_CHANNEL_ACCESS_TOKEN:
    _log.warning("LINE_CHANNEL_ACCESS_TOKEN ไม่ได้ตั้งใน .env — การแจ้งเตือน LINE จะถูกข้าม")

_PUSH_URL  = "https://api.line.me/v2/bot/message/push"
_REPLY_URL = "https://api.line.me/v2/bot/message/reply"

TH_MONTHS = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
             'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']


# ─────────────────────────────────────────
# Low-level push
# ─────────────────────────────────────────
def _push(to: str, text: str) -> bool:
    """ส่งข้อความ text ไปยัง target (groupId หรือ userId) — คืน True ถ้าสำเร็จ"""
    if not LINE_CHANNEL_ACCESS_TOKEN or not to:
        return False
    try:
        resp = requests.post(
            _PUSH_URL,
            headers={
                "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
                "Content-Type":  "application/json",
            },
            json={"to": to, "messages": [{"type": "text", "text": text[:5000]}]},
            timeout=5,
        )
        if resp.ok:
            return True
        _log.warning("LINE push failed %s: %s", resp.status_code, resp.text)
    except Exception:
        _log.exception("LINE push error")
    return False


def reply(reply_token: str, text: str) -> bool:
    """ตอบกลับ event (ใช้ใน webhook) — ฟรีกว่า push, ต้องใช้ replyToken ภายในเวลาจำกัด"""
    if not LINE_CHANNEL_ACCESS_TOKEN or not reply_token:
        return False
    try:
        resp = requests.post(
            _REPLY_URL,
            headers={
                "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
                "Content-Type":  "application/json",
            },
            json={"replyToken": reply_token, "messages": [{"type": "text", "text": text[:5000]}]},
            timeout=5,
        )
        return resp.ok
    except Exception:
        _log.exception("LINE reply error")
        return False


def _push_group(text: str) -> bool:
    """broadcast เข้า LINE group (LINE_GROUP_ID)"""
    if not LINE_GROUP_ID:
        return False
    return _push(LINE_GROUP_ID, text)


def _push_user(line_user_id: str, text: str) -> bool:
    """DM หา user รายคน — ใช้โดย notification_service._create()"""
    return _push(line_user_id, text)


# ─────────────────────────────────────────
# Format helpers (plain text — LINE ไม่รองรับ HTML)
# ─────────────────────────────────────────
def _fmt_date(dt):
    if not dt:
        return '-'
    return f"{dt.day} {TH_MONTHS[dt.month]} {dt.year + 543}"

def _fmt_time(dt):
    if not dt:
        return '-'
    return dt.strftime('%H:%M')

def _user_line(booking):
    u = booking.user
    name = (u.full_name or u.username) if u else '-'
    dept = (u.department if u else None) or '-'
    return f"👤 {name} | {dept}"

def _time_line(booking):
    d1, d2 = booking.start_datetime, booking.end_datetime
    if _fmt_date(d1) == _fmt_date(d2):
        return f"🗓 {_fmt_date(d1)}\n     {_fmt_time(d1)} → {_fmt_time(d2)} น."
    return (f"🗓 ไป   {_fmt_date(d1)} {_fmt_time(d1)} น.\n"
            f"🗓 กลับ {_fmt_date(d2)} {_fmt_time(d2)} น.")

def _car_line(booking):
    v = booking.assigned_vehicle
    if v:
        return f"🚐 {v.brand} {v.model} ({v.license_plate})"
    return "🚐 ยังไม่กำหนดรถ"

def _driver_line(booking):
    if not booking.need_driver:
        return "🚗 ขับรถด้วยตัวเอง"
    if booking.driver:
        return f"👨‍✈️ {booking.driver.name} 📞 {booking.driver.phone}"
    return ""

def _expense_line(booking):
    exp = booking.expense_type
    if exp == 'central':
        cat = f" ({booking.central_category})" if booking.central_category else ""
        return f"💰 ค่าใช้จ่าย: ส่วนกลาง{cat}"
    if exp == 'department':
        return "💰 ค่าใช้จ่าย: หน่วยงาน"
    if exp == 'personal':
        return "💰 ค่าใช้จ่าย: ผู้จองออกเอง"
    return ""

def _head_block(booking):
    """ส่วนหัวที่ใช้ร่วม: ผู้จอง + ปลายทาง + จุดประสงค์ + ค่าใช้จ่าย"""
    lines = [
        _user_line(booking),
        f"📍 {booking.destination}",
        f"🎯 {booking.purpose or '-'} · 👥 {booking.passenger_count} คน",
    ]
    exp = _expense_line(booking)
    if exp:
        lines.append(exp)
    return "\n".join(lines)


# ─────────────────────────────────────────
# notify_* — ชื่อตรงกับ telegram_service (เรียกผ่าน broadcast.py)
# ─────────────────────────────────────────
def notify_approved(booking):
    group_line = f"\n🔗 กลุ่ม {booking.trip_group}" if booking.trip_group else ""
    text = (
        f"✅ อนุมัติการจองรถ — #{booking.id}\n\n"
        f"{_head_block(booking)}\n\n"
        f"{_time_line(booking)}\n\n"
        f"{_car_line(booking)}\n"
        f"{_driver_line(booking)}"
        f"{group_line}"
    )
    _push_group(text)


def notify_forwarded_to_approver(booking):
    dept = (booking.user.department if booking.user else None) or '-'
    text = (
        f"📨 รอ Approver อนุมัติ — #{booking.id}\n\n"
        f"{_head_block(booking)}\n"
        f"⚠️ Approver แผนก {dept} โปรดพิจารณา\n\n"
        f"{_time_line(booking)}\n\n"
        f"{_car_line(booking)}\n"
        f"{_driver_line(booking)}"
    )
    _push_group(text)


def notify_approver_approved(booking, approver):
    approver_name = approver.full_name or approver.username
    text = (
        f"🎉 พร้อมเดินทาง! — #{booking.id}\n\n"
        f"{_head_block(booking)}\n\n"
        f"{_time_line(booking)}\n\n"
        f"{_car_line(booking)}\n"
        f"{_driver_line(booking)}\n\n"
        f"✍️ อนุมัติโดย {approver_name}"
    )
    _push_group(text)


def notify_rejected(booking, rejected_by):
    rejecter = rejected_by.full_name or rejected_by.username
    reason_line = f"\n💬 เหตุผล: {booking.reject_reason}" if booking.reject_reason else ""
    text = (
        f"❌ ไม่อนุมัติ — #{booking.id}\n\n"
        f"{_user_line(booking)}\n"
        f"📍 {booking.destination}\n"
        f"🗓 {_fmt_date(booking.start_datetime)} {_fmt_time(booking.start_datetime)} น.\n\n"
        f"✍️ ปฏิเสธโดย {rejecter}"
        f"{reason_line}"
    )
    _push_group(text)


def notify_cancelled(booking, cancelled_by):
    canceller = cancelled_by.full_name or cancelled_by.username
    text = (
        f"🚫 ยกเลิกการจอง — #{booking.id}\n\n"
        f"{_user_line(booking)}\n"
        f"📍 {booking.destination}\n"
        f"🗓 {_fmt_date(booking.start_datetime)} {_fmt_time(booking.start_datetime)} น.\n\n"
        f"✍️ ยกเลิกโดย {canceller}"
    )
    _push_group(text)
