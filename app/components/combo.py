"""Combo component — wrapper บางๆ ของ macro bb_combo.

dropdown ที่ค้นหาได้ (searchable select) — trigger → popover (search + รายการกรองสด)
JS auto-init [data-bb-combo] (core/js/bb-components.js) + event 'bb-combo:change'
"""
from .base import BaseComponent


class Combo(BaseComponent):
    """dropdown ค้นหาได้. options = list ของ {'value','label'}."""

    template = '_components/render/_combo.html'

    def __init__(self, name='', options=None, value='', placeholder='เลือก…',
                 search_placeholder='ค้นหา…', **kw):
        super().__init__(**kw)
        self.name = name
        self.options = options or []
        self.value = value
        self.placeholder = placeholder
        self.search_placeholder = search_placeholder

    def context(self):
        return {'name': self.name, 'options': self.options, 'value': self.value,
                'placeholder': self.placeholder,
                'search_placeholder': self.search_placeholder,
                'combo_id': self.id or ''}
