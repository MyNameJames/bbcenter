"""
Broadcast Dispatcher (group channels)
──────────────────────────────────────
รวมการแจ้งเตือน "เข้า group" ของทุกช่องทาง (Telegram + LINE) ไว้ที่เดียว
เพื่อให้ controller เรียกครั้งเดียวแล้วเด้งครบทุกช่องทาง

วิธีใช้ (controller): เปลี่ยน import จาก telegram_service มาที่นี่
    from views.core.broadcast import (notify_approved, notify_forwarded_to_approver,
        notify_approver_approved, notify_rejected, notify_cancelled as tg_notify_cancelled)
call site เดิมไม่ต้องแก้ — ชื่อ function ตรงกับ telegram_service เป๊ะ

หมายเหตุ:
- แต่ละช่องทาง try/except ภายในตัวเองอยู่แล้ว แต่ห่ออีกชั้นกันไว้
  ไม่ให้ช่องทางหนึ่งพังแล้วลามไปอีกช่องทาง
- per-user DM (LINE หา user รายคน) ไม่อยู่ที่นี่ — hook อยู่ใน
  notification_service._create() เพื่อ mirror ทุก in-app event อัตโนมัติ
"""
import logging

from views.core import telegram_service as _tg, line_service as _line

_log = logging.getLogger(__name__)


def _safe(fn, *args):
    try:
        fn(*args)
    except Exception:
        _log.exception("broadcast %s.%s error", fn.__module__, fn.__name__)


def notify_approved(booking):
    _safe(_tg.notify_approved, booking)
    _safe(_line.notify_approved, booking)


def notify_forwarded_to_approver(booking):
    _safe(_tg.notify_forwarded_to_approver, booking)
    _safe(_line.notify_forwarded_to_approver, booking)
    # ส่ง flex card + ปุ่มอนุมัติไปหา approver รายคนผ่าน LINE DM
    _safe(_line.notify_approver_action_required_dm, booking)


def notify_approver_approved(booking, approver):
    _safe(_tg.notify_approver_approved, booking, approver)
    _safe(_line.notify_approver_approved, booking, approver)


def notify_rejected(booking, rejected_by):
    _safe(_tg.notify_rejected, booking, rejected_by)
    _safe(_line.notify_rejected, booking, rejected_by)


def notify_cancelled(booking, cancelled_by):
    _safe(_tg.notify_cancelled, booking, cancelled_by)
    _safe(_line.notify_cancelled, booking, cancelled_by)
