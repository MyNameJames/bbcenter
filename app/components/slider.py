"""Slider component — wrapper บางๆ ของ macro bb_slider.

range slider (single | dual) — ลาก/คีย์บอร์ด/คลิกราง · bubble โชว์ค่าตลอด · scale
JS auto-init [data-bb-slider] (core/js/bb-components.js) + event 'bb-slider:change'
เซ็ต hidden input ให้ (single: name · dual: name_min/name_max) → post ได้
"""
from .base import BaseComponent


class Slider(BaseComponent):
    """range slider. dual=True = เลือกช่วง (2 handle)."""

    template = '_components/render/_slider.html'

    def __init__(self, min=0, max=100, step=1, unit='', dual=False, scale=True,
                 name='value', value=None, name_min='', name_max='',
                 start=None, end=None, **kw):
        super().__init__(**kw)
        self.min = min
        self.max = max
        self.step = step
        self.unit = unit
        self.dual = dual
        self.scale = scale
        self.name = name
        self.value = value
        self.name_min = name_min
        self.name_max = name_max
        self.start = start
        self.end = end

    def context(self):
        return {'min': self.min, 'max': self.max, 'step': self.step,
                'unit': self.unit, 'dual': self.dual, 'scale': self.scale,
                'name': self.name, 'value': self.value,
                'name_min': self.name_min, 'name_max': self.name_max,
                'start': self.start, 'end': self.end, 'slider_id': self.id or ''}
