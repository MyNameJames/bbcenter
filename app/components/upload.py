"""Upload component — wrapper บางๆ ของ macro bb_upload.

dropzone อัปโหลดไฟล์ — คลิก/ลากวาง → รายการไฟล์ · <input type=file> จริง (post ได้)
JS auto-init [data-bb-upload] (core/js/bb-components.js) + event 'bb-upload:change'
"""
from .base import BaseComponent


class Upload(BaseComponent):
    """dropzone อัปโหลดไฟล์ (single/multiple)."""

    template = '_components/render/_upload.html'

    def __init__(self, name='file', accept='', multiple=False,
                 hint='ลากไฟล์มาวาง หรือคลิกเพื่อเลือก', **kw):
        super().__init__(**kw)
        self.name = name
        self.accept = accept
        self.multiple = multiple
        self.hint = hint

    def context(self):
        return {'name': self.name, 'accept': self.accept,
                'multiple': self.multiple, 'hint': self.hint,
                'upload_id': self.id or ''}
