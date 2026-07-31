"""TimeRangeField component — wrapper บางๆ ของ macro bb_timerangefield.

ช่วงเวลา เริ่ม→สิ้นสุด แบบ dropdown list เวลาแบน step เดียว — ต่างจาก TimeRange เดิม
(bb_timerange): ไม่ใช่ column ชม./นาที 2 ขั้น · end กันเวลาก่อน start · โชว์ระยะเวลารวมได้
JS auto-init [data-bb-timerangefield] (core/js/bb-components.js) + event 'bb-timerangefield:change'
"""
from .base import BaseComponent


class TimeRangeField(BaseComponent):
    """ตัวเลือกช่วงเวลา (list แบน step เดียว + กันเวลาย้อน + โชว์ระยะเวลารวม)."""

    template = '_components/render/_timerangefield.html'

    def __init__(self, name_start='time_start', name_end='time_end',
                 start='08:00', end='17:00', step=15, label='',
                 show_duration=False, **kw):
        super().__init__(**kw)
        self.name_start = name_start
        self.name_end = name_end
        self.start = start
        self.end = end
        self.step = step
        self.label = label
        self.show_duration = show_duration

    def context(self):
        return {'name_start': self.name_start, 'name_end': self.name_end,
                'start': self.start, 'end': self.end, 'step': self.step,
                'label': self.label, 'show_duration': self.show_duration,
                'trf_id': self.id or ''}
