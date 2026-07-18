"""Modal component — wrapper บางๆ ของ macro bb_modal.

markup ตรง components-gallery.html §13 (.bb-modal)
- body / actions รับ component อื่นได้ (reuse _render_body จาก card — DRY)
- actions = list ปุ่ม (Button) → render ลง .bb-modal-foot
- overlay=True (default) = canonical (ห่อ overlay, hidden รอ JS เปิด)
JS เปิด/ปิดอยู่ในไฟล์ .js — ห้าม inline <script>
"""
from markupsafe import Markup

from .base import BaseComponent
from .card import _render_body


class Modal(BaseComponent):
    """กล่อง modal (head + body + foot)."""

    template = '_components/render/_modal.html'

    def __init__(self, title='', body='', actions=None, sub='',
                 mid='', on_close='', overlay=True, **kw):
        super().__init__(**kw)
        self.title = title
        self.body = body
        self.actions = actions or []
        self.sub = sub
        self.mid = mid          # id บน overlay/modal (ให้ JS อ้างถึง)
        self.on_close = on_close
        self.overlay = overlay

    def context(self):
        foot = Markup('').join(_render_body(a) for a in self.actions)
        return {'title': self.title, 'body': _render_body(self.body),
                'foot': foot, 'sub': self.sub, 'mid': self.mid,
                'on_close': self.on_close, 'overlay': self.overlay}
