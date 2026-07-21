"""KPI component — wrapper บางๆ ของ macro bb_kpi.

variant: card | ghost · delta_dir: 'up' | 'down' (เว้นว่าง = ไม่มี delta)
"""
from .base import BaseComponent


class KPI(BaseComponent):
    """ตัวเลขสรุป. value/den render เป็น .bb-num (Inter 300)."""

    template = '_components/render/_kpi.html'

    def __init__(self, label, value, icon=None, variant='card', den='',
                 delta='', delta_dir='', **kw):
        super().__init__(**kw)
        self.label = label
        self.value = value
        self.icon = icon
        self.variant = variant
        self.den = den
        self.delta = delta
        self.delta_dir = delta_dir

    def context(self):
        return {'label': self.label, 'value': self.value, 'icon': self.icon,
                'variant': self.variant, 'den': self.den,
                'delta': self.delta, 'delta_dir': self.delta_dir}
