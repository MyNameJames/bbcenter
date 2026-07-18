"""Bell component — wrapper บางๆ ของ macro bb_bell.

ปุ่มไอคอนแจ้งเตือน + count badge แดง (alert icon) · static (count จาก server)
เปิด panel ผ่าน on_click → data-action (controller ผูก listener เอง)
"""
from .base import BaseComponent


class Bell(BaseComponent):
    """ไอคอนแจ้งเตือน + count badge."""

    template = '_components/render/_bell.html'

    def __init__(self, count=0, icon='bell', ghost=False, on_click='', **kw):
        super().__init__(**kw)
        self.count = count
        self.icon = icon
        self.ghost = ghost
        self.on_click = on_click

    def context(self):
        return {'count': self.count, 'icon': self.icon, 'ghost': self.ghost,
                'on_click': self.on_click, 'bell_id': self.id or ''}
