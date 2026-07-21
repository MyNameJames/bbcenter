"""Search component — wrapper บางๆ ของ macro bb_search.

on_input → data-action (event convention กลาง)
"""
from .base import BaseComponent


class Search(BaseComponent):
    """ช่องค้นหา (icon + input)."""

    template = '_components/render/_search.html'

    def __init__(self, placeholder='ค้นหา…', name='', value='', on_input='', **kw):
        super().__init__(**kw)
        self.placeholder = placeholder
        self.name = name
        self.value = value
        self.on_input = on_input

    def context(self):
        return {'placeholder': self.placeholder, 'name': self.name,
                'value': self.value, 'on_input': self.on_input}
