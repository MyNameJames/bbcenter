"""Empty component — wrapper บางๆ ของ macro bb_empty.

markup ตรง components-gallery.html §+ (.bb-empty) — empty state
action รับ component (เช่น Button) → reuse _render_body จาก card (DRY)
"""
from .base import BaseComponent
from .card import _render_body


class Empty(BaseComponent):
    """empty state (icon + title + desc + ปุ่ม optional)."""

    template = '_components/render/_empty.html'

    def __init__(self, title='', desc='', icon='inbox', action=None, **kw):
        super().__init__(**kw)
        self.title = title
        self.desc = desc
        self.icon = icon
        self.action = action

    def context(self):
        return {'title': self.title, 'desc': self.desc, 'icon': self.icon,
                'action': _render_body(self.action)}
