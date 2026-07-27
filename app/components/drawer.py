"""Drawer / Section / DescList component — wrapper บางๆ ของ macro ใน bb/drawer.html

Batch 3 (2026-07-21). ใช้ Drawer แทน Modal เมื่อผู้ใช้ต้อง "เห็น list เบื้องหลัง"
(P2 Workspace/Queue — triage คิวทีละใบโดยไม่หลุด context)

body/actions รับได้: str/Markup, BaseComponent, หรือ list ของ component (เหมือน Card)
"""
from .base import BaseComponent
from .card import _render_body


class DescList(BaseComponent):
    """label ซ้าย / value ขวา — ⛔ ห้ามใช้ Table (ไม่มีหัวคอลัมน์ ไม่ sort ไม่ scan ข้ามแถว).

    items = list ของ dict {label, value, num=False, stack=False} หรือ tuple (label, value)
        num=True   → value เป็นตัวเลข (Inter + tnum)
        stack=True → ค่ายาว (หมายเหตุ/ที่อยู่) ซ้อนบน-ล่างแทนซ้าย-ขวา
    """

    template = '_components/render/_desc.html'

    def __init__(self, items=None, **kw):
        super().__init__(**kw)
        self.items = [self._norm(it) for it in (items or [])]

    @staticmethod
    def _norm(item):
        if isinstance(item, (list, tuple)):
            label, value = item
            return {'label': label, 'value': value, 'num': False, 'stack': False}
        return {'label': item.get('label', ''), 'value': item.get('value', ''),
                'num': item.get('num', False), 'stack': item.get('stack', False)}

    def context(self):
        return {'items': self.items}


class Section(BaseComponent):
    """บล็อกย่อยใน drawer/card — คั่นด้วย hairline ไม่ใช่กรอบซ้อนกรอบ."""

    template = '_components/render/_section.html'

    def __init__(self, title='', body='', **kw):
        super().__init__(**kw)
        self.title = title
        self.body = body

    def context(self):
        return {'title': self.title, 'body': _render_body(self.body)}


class Drawer(BaseComponent):
    """แผงรายละเอียดฝั่งขวา. โครง 3 ชั้น: head นิ่ง · body scroll · foot นิ่ง.

    status = component (เช่น Status) แสดงข้างหัวข้อ · actions = ปุ่มท้ายแผง (Button block=True)
    overlay=False → ฝัง inline ไม่มีฉากหลัง (เช่น 2-pane บนจอกว้าง)
    """

    template = '_components/render/_drawer.html'

    def __init__(self, title='', body='', eyebrow='', sub='', status=None,
                 actions=None, on_close='', overlay=True, **kw):
        super().__init__(**kw)
        self.title = title
        self.body = body
        self.eyebrow = eyebrow
        self.sub = sub
        self.status = status
        self.actions = actions
        self.on_close = on_close
        self.overlay = overlay

    def context(self):
        return {'title': self.title, 'body': _render_body(self.body),
                'eyebrow': self.eyebrow, 'sub': self.sub,
                'status': _render_body(self.status),
                'actions': _render_body(self.actions),
                'on_close': self.on_close, 'overlay': self.overlay,
                'id': self.id or ''}
