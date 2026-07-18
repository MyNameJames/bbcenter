"""Tabs component — wrapper บางๆ ของ macro bb_tabs.

markup ตรง components-gallery.html §5 (.bb-tabs) — underline = status filter
ส่ง tabs เป็น Tab หรือ dict ก็ได้
"""
from dataclasses import dataclass

from .base import BaseComponent


@dataclass
class Tab:
    label: str = ''
    count: object = None   # int/str — None/'' = ไม่แสดง count
    active: bool = False
    value: str = ''        # data-tab
    on_click: str = ''     # data-action

    def to_dict(self):
        return {'label': self.label, 'count': self.count, 'active': self.active,
                'value': self.value, 'on_click': self.on_click}


class Tabs(BaseComponent):
    """แถบ tab. ส่ง Tab object หรือ dict ก็ได้."""

    template = '_components/render/_tabs.html'

    def __init__(self, tabs=None, **kw):
        super().__init__(**kw)
        self.tabs = tabs or []

    def context(self):
        return {'tabs': [t.to_dict() if isinstance(t, Tab) else t for t in self.tabs]}
