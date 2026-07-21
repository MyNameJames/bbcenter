"""Segmented component — wrapper บางๆ ของ macro bb_segmented.

toggle ช่วงเวลา/มุมมอง
ส่ง items เป็น Seg หรือ dict ก็ได้
"""
from dataclasses import dataclass

from .base import BaseComponent


@dataclass
class Seg:
    label: str = ''
    active: bool = False
    value: str = ''        # data-seg
    on_click: str = ''     # data-action

    def to_dict(self):
        return {'label': self.label, 'active': self.active,
                'value': self.value, 'on_click': self.on_click}


class Segmented(BaseComponent):
    """ปุ่มเลือกแบบกลุ่ม (1 active). ส่ง Seg object หรือ dict ก็ได้."""

    template = '_components/render/_segmented.html'

    def __init__(self, items=None, **kw):
        super().__init__(**kw)
        self.items = items or []

    def context(self):
        return {'items': [s.to_dict() if isinstance(s, Seg) else s for s in self.items]}
