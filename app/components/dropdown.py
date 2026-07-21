"""Dropdown component — wrapper บางๆ ของ macro bb_dropdown.

trigger (hint + label + caret) → panel เมนู

menu item 4 ชนิด (helper สร้าง dict 'kind'):
  MenuLabel(text) · MenuItem(label, active, ...) · MenuDivider() · MenuRich(title, desc, ...)
on_click / on_toggle → data-action (event convention กลาง)
"""
from dataclasses import dataclass

from .base import BaseComponent


@dataclass
class MenuLabel:
    text: str = ''
    def to_dict(self):
        return {'kind': 'label', 'text': self.text}


@dataclass
class MenuItem:
    label: str = ''
    active: bool = False
    value: str = ''
    on_click: str = ''
    def to_dict(self):
        return {'kind': 'item', 'label': self.label, 'active': self.active,
                'value': self.value, 'on_click': self.on_click}


@dataclass
class MenuDivider:
    def to_dict(self):
        return {'kind': 'divider'}


@dataclass
class MenuRich:
    title: str = ''
    desc: str = ''
    checked: bool = False
    value: str = ''
    on_click: str = ''
    def to_dict(self):
        return {'kind': 'rich', 'title': self.title, 'desc': self.desc,
                'checked': self.checked, 'value': self.value, 'on_click': self.on_click}


class Dropdown(BaseComponent):
    """trigger + เมนู. ส่ง items เป็น Menu* object หรือ dict ก็ได้."""

    template = '_components/render/_dropdown.html'

    def __init__(self, label='', items=None, hint='', width=0, on_toggle='', **kw):
        super().__init__(**kw)
        self.label = label
        self.items = items or []
        self.hint = hint
        self.width = width
        self.on_toggle = on_toggle

    def context(self):
        items = [it.to_dict() if hasattr(it, 'to_dict') else it for it in self.items]
        return {'label': self.label, 'items': items, 'hint': self.hint,
                'width': self.width, 'on_toggle': self.on_toggle}
