"""DateField component — wrapper บางๆ ของ macro bb_datefield.

date picker วันเดียว แบบ inline calendar — ต่างจาก DatePicker เดิม (bb_datepicker):
ไม่มีขั้นพิมพ์เอง/ปุ่มยืนยัน เลือกวันแล้ว commit ทันที + วันที่ผ่านมาแล้วเลือกไม่ได้
JS auto-init [data-bb-datefield] (core/js/bb-components.js) + event 'bb-datefield:change'
"""
from .base import BaseComponent


class DateField(BaseComponent):
    """ตัวเลือกวันที่เดียว — ปฏิทิน inline ใต้ trigger, วันที่ผ่านมาแล้วเลือกไม่ได้."""

    template = '_components/render/_datefield.html'

    def __init__(self, name='date', value='', placeholder='เลือกวันที่',
                 label='', **kw):
        super().__init__(**kw)
        self.name = name
        self.value = value
        self.placeholder = placeholder
        self.label = label

    def context(self):
        return {'name': self.name, 'value': self.value,
                'placeholder': self.placeholder, 'label': self.label,
                'df_id': self.id or ''}
