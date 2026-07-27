"""Badge / Status component — wrapper บางๆ ของ macro bb_badge / bb_status.

Controller สร้าง object แทนการเขียน <span class="bb-..."> เองในหน้า
"""
from .base import BaseComponent


class Badge(BaseComponent):
    """tag/count สี่เหลี่ยม. variant: neutral | accent."""

    template = '_components/render/_badge.html'

    def __init__(self, text, variant='neutral', icon=None, **kw):
        super().__init__(**kw)
        self.text = text
        self.variant = variant
        self.icon = icon

    def context(self):
        return {'text': self.text, 'variant': self.variant, 'icon': self.icon}


class Status(BaseComponent):
    """สถานะ. tone: ok | wr | dg | info | neutral.
    inline=True → แบบไม่มีพื้น (ใช้ในตาราง), False → badge มีพื้น.
    icon=None → ใช้ icon ประจำ tone (ok=check-circle · wr=clock · dg=x-circle · info=info).
    ⛔ ไม่มีแบบ dot เปล่าอีกแล้ว — ต้องมี icon คู่ label เสมอ (ok เขียวชนกับ accent).
    """

    template = '_components/render/_status.html'

    def __init__(self, text, tone='neutral', inline=False, icon=None, **kw):
        super().__init__(**kw)
        self.text = text
        self.tone = tone
        self.inline = inline
        self.icon = icon

    def context(self):
        return {'text': self.text, 'tone': self.tone,
                'inline': self.inline, 'icon': self.icon}
