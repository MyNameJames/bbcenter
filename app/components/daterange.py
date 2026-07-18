"""DateRange component — wrapper บางๆ ของ macro bb_daterange.

macro มีอยู่แล้ว (_components/bb/daterange.html) — Stripe-style picker
trigger → popover (preset sidebar, มือถือ = dropdown ลอย + Start/End input +
2 คอลัมน์ปฏิทิน แต่ละคอลัมน์มี nav/ชื่อเดือนของตัวเอง). JS auto-init [data-bb-daterange]
(core/js/bb-daterange.js) + dispatch event 'bb-daterange:change'

commit ผ่านปุ่ม "ยืนยัน" (ปุ่ม "ยกเลิก" = ล้าง draft) → เซ็ต hidden input (name_start/name_end)
(2026-07-02: เปลี่ยนจาก "ใช้"/"ล้าง" — ดู daterange.html + bb-daterange.js สำหรับรายละเอียด layout)
"""
from .base import BaseComponent


class DateRange(BaseComponent):
    """ตัวเลือกช่วงวันที่ (preset + ปฏิทิน 2 เดือน)."""

    template = '_components/render/_daterange.html'

    def __init__(self, name_start='date_start', name_end='date_end',
                 start='', end='', preset='', placeholder='ทั้งหมด',
                 align='left', **kw):
        super().__init__(**kw)
        self.name_start = name_start
        self.name_end = name_end
        self.start = start
        self.end = end
        self.preset = preset
        self.placeholder = placeholder
        self.align = align

    def context(self):
        return {'name_start': self.name_start, 'name_end': self.name_end,
                'start': self.start, 'end': self.end, 'preset': self.preset,
                'dr_id': self.id or '', 'placeholder': self.placeholder,
                'align': self.align}
