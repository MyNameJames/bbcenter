"""TimeRange component — wrapper บางๆ ของ macro bb_timerange.

ช่วงเวลา เริ่ม→สิ้นสุด · end กันเวลาก่อน start · auto-advance · warn_before
JS auto-init [data-bb-timerange] (core/js/bb-components.js) + event 'bb-timerange:change'
"""
from .base import BaseComponent


class TimeRange(BaseComponent):
    """ตัวเลือกช่วงเวลา (2 ช่อง + กันเวลาย้อน + เตือน)."""

    template = '_components/render/_timerange.html'

    def __init__(self, name_start='time_start', name_end='time_end',
                 start='08:00', end='10:00', step=15, warn_before='', **kw):
        super().__init__(**kw)
        self.name_start = name_start
        self.name_end = name_end
        self.start = start
        self.end = end
        self.step = step
        self.warn_before = warn_before

    def context(self):
        return {'name_start': self.name_start, 'name_end': self.name_end,
                'start': self.start, 'end': self.end, 'step': self.step,
                'warn_before': self.warn_before, 'tr_id': self.id or ''}
