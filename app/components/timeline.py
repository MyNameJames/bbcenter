"""Timeline component — wrapper บางๆ ของ macro bb_timeline.

markup ตรง components-gallery.html §+ (.bb-timeline)
state ของแต่ละ item: 'done' · 'cur' · 'todo'
ส่ง items เป็น TLItem หรือ dict ก็ได้
"""
from dataclasses import dataclass

from .base import BaseComponent


@dataclass
class TLItem:
    title: str = ''
    time: str = '—'
    desc: str = ''
    state: str = 'todo'    # done | cur | todo

    def to_dict(self):
        return {'title': self.title, 'time': self.time,
                'desc': self.desc, 'state': self.state}


class Timeline(BaseComponent):
    """ไทม์ไลน์สถานะ. ส่ง TLItem object หรือ dict ก็ได้."""

    template = '_components/render/_timeline.html'

    def __init__(self, items=None, **kw):
        super().__init__(**kw)
        self.items = items or []

    def context(self):
        return {'items': [i.to_dict() if isinstance(i, TLItem) else i for i in self.items]}
