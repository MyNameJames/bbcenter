"""DatePicker component — wrapper บางๆ ของ macro bb_datepicker.

date picker วันเดียว (Stripe-style) — trigger → popover ปฏิทินเดือนเดียว + align
JS auto-init [data-bb-datepicker] (core/js/bb-components.js) + event 'bb-datepicker:change'
commit ผ่านปุ่ม "ใช้" → เซ็ต hidden input (name)
"""
from .base import BaseComponent


class DatePicker(BaseComponent):
    """ตัวเลือกวันที่เดียว (ปฏิทินเดือนเดียว + ชิดซ้าย/ขวา)."""

    template = '_components/render/_datepicker.html'

    def __init__(self, name='date', value='', placeholder='เลือกวันที่',
                 align='left', **kw):
        super().__init__(**kw)
        self.name = name
        self.value = value
        self.placeholder = placeholder
        self.align = align

    def context(self):
        return {'name': self.name, 'value': self.value,
                'placeholder': self.placeholder, 'align': self.align,
                'dp_id': self.id or ''}
