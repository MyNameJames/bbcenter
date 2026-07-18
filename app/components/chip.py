"""Chip / Token component — wrapper บางๆ ของ macro bb_chip / bb_token.

markup ตรง components-gallery.html §4b
- Chip  = toggle filter (มี count) — เลือกได้/ปิดได้
- Token = applied filter ที่ติดอยู่แล้ว (field op value + ปุ่ม x)
on_click / on_remove → data-action (event convention กลาง)
"""
from .base import BaseComponent


class Chip(BaseComponent):
    """ปุ่มกรองแบบ toggle (label + count)."""

    template = '_components/render/_chip.html'

    def __init__(self, label='', count=None, active=False, value='', on_click='', **kw):
        super().__init__(**kw)
        self.label = label
        self.count = count
        self.active = active
        self.value = value
        self.on_click = on_click

    def context(self):
        return {'label': self.label, 'count': self.count, 'active': self.active,
                'value': self.value, 'on_click': self.on_click}


class Token(BaseComponent):
    """ตัวกรองที่ถูกนำมาใช้แล้ว (field op value + ปุ่มลบ)."""

    template = '_components/render/_token.html'

    def __init__(self, field='', op='=', value='', on_remove='', **kw):
        super().__init__(**kw)
        self.field = field
        self.op = op
        self.value = value
        self.on_remove = on_remove

    def context(self):
        return {'field': self.field, 'op': self.op,
                'value': self.value, 'on_remove': self.on_remove}
