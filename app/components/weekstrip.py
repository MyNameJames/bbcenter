"""WeekStrip component — wrapper บางๆ ของ macro bb_weekstrip.

แถบเลือกวัน 7 ช่อง + เลื่อนสัปดาห์ · count badge แดงต่อวัน
JS auto-init [data-bb-weekstrip] (core/js/bb-components.js) + event 'bb-weekstrip:change'
"""
from .base import BaseComponent


class WeekStrip(BaseComponent):
    """แถบสัปดาห์ (7 วัน) + badge จำนวนรายการต่อวัน."""

    template = '_components/render/_weekstrip.html'

    def __init__(self, name='date', value='', counts=None, **kw):
        super().__init__(**kw)
        self.name = name
        self.value = value
        self.counts = counts or {}

    def context(self):
        return {'name': self.name, 'value': self.value,
                'counts': self.counts, 'ws_id': self.id or ''}
