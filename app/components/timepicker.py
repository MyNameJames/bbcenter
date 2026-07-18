"""TimePicker component — wrapper บางๆ ของ macro bb_timepicker.

เลือกเวลาแบบ column (ชม./นาที) · step ปรับได้
JS auto-init [data-bb-timepicker] (core/js/bb-components.js) + event 'bb-timepicker:change'
"""
from .base import BaseComponent


class TimePicker(BaseComponent):
    """ตัวเลือกเวลา (column ชั่วโมง/นาที)."""

    template = '_components/render/_timepicker.html'

    def __init__(self, name='time', value='09:00', step=1, **kw):
        super().__init__(**kw)
        self.name = name
        self.value = value
        self.step = step

    def context(self):
        return {'name': self.name, 'value': self.value,
                'step': self.step, 'tp_id': self.id or ''}
