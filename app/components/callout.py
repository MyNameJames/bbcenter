"""Callout component — wrapper บางๆ ของ macro bb_callout.

กล่องแจ้งเตือนในหน้า (inline alert) · tone info|ok|wr|dg · title + dismissible
dismissible → ปุ่มปิด (data-bb-dismiss, จัดการใน core/js/bb-components.js)
"""
from .base import BaseComponent


class Callout(BaseComponent):
    """กล่อง alert ในหน้า."""

    template = '_components/render/_callout.html'

    def __init__(self, text='', tone='info', title='', icon='',
                 dismissible=False, **kw):
        super().__init__(**kw)
        self.text = text
        self.tone = tone
        self.title = title
        self.icon = icon
        self.dismissible = dismissible

    def context(self):
        return {'text': self.text, 'tone': self.tone, 'title': self.title,
                'icon': self.icon, 'dismissible': self.dismissible,
                'callout_id': self.id or ''}
