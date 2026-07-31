"""Input component — wrapper บางๆ ของ macro bb_input.

icon → ห่อ .bb-input-wrap · error → .is-error (input + hint)
"""
from .base import BaseComponent


class Input(BaseComponent):
    """field: label + input + hint. error เด่นกว่า hint (แสดง error แทน)."""

    template = '_components/render/_input.html'

    def __init__(self, name, label='', value='', placeholder='', icon=None,
                 hint='', error='', type='text', disabled=False, required=False,
                 min=None, max=None, pattern=None, inputmode=None, **kw):
        super().__init__(**kw)
        self.name = name
        self.label = label
        self.value = value
        self.placeholder = placeholder
        self.icon = icon
        self.hint = hint
        self.error = error
        self.type = type
        self.disabled = disabled
        self.required = required
        self.min = min
        self.max = max
        self.pattern = pattern
        self.inputmode = inputmode

    def context(self):
        return {'id': self.id, 'class_name': self.class_name,
                'name': self.name, 'label': self.label, 'value': self.value,
                'placeholder': self.placeholder, 'icon': self.icon,
                'hint': self.hint, 'error': self.error, 'type': self.type,
                'disabled': self.disabled, 'required': self.required,
                'min': self.min, 'max': self.max,
                'pattern': self.pattern, 'inputmode': self.inputmode}
