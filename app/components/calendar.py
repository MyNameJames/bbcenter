"""Calendar component — wrapper บางๆ ของ macro bb_calendar.

ปฏิทินรายเดือน + event chips · เกิน max_chips → popover โชว์งานทั้งวัน
JS auto-init [data-bb-calendar] (core/js/bb-components.js)
event: 'bb-calendar:daychange' · 'bb-calendar:eventclick' · 'bb-calendar:book'

events = dict 'YYYY-MM-DD' → list ของ {time, title, status, label, url}
    status ∈ ok | wr | dg | info | neutral (Controller แมป booking status → semantic เอง)
"""
from .base import BaseComponent


class Calendar(BaseComponent):
    """ปฏิทินรายเดือนแสดง event chips ตามวัน."""

    template = '_components/render/_calendar.html'

    def __init__(self, events=None, year=None, month=None, max_chips=2,
                 caption='', book_url='', **kw):
        super().__init__(**kw)
        self.events = events or {}
        self.year = year
        self.month = month
        self.max_chips = max_chips
        self.caption = caption
        self.book_url = book_url

    def context(self):
        return {'events': self.events, 'year': self.year, 'month': self.month,
                'max_chips': self.max_chips, 'caption': self.caption,
                'book_url': self.book_url, 'calendar_id': self.id or ''}
