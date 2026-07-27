"""Button component — wrapper บางๆ ของ macro bb_button.

on_click → data-action (event convention กลาง — JS delegated listener ผูกเอง)
"""
from .base import BaseComponent


class Button(BaseComponent):
    """ปุ่ม. variant: pri | sec | ghost | danger | danger-sec · size: None | 'sm'.

    pri = ink fill ตัวขาว · sec = ขาว+ขอบ · ghost = ตัวเขียว accent-dk
    danger = แดงทึบ (ยืนยันลบจริง) · danger-sec = ขาว+ขอบ+ตัวแดง (ปฏิเสธ/ยกเลิก)
    block=True → เต็มความกว้าง (ใช้ใน drawer/ฟอร์มคอลัมน์แคบ)
    """

    template = '_components/render/_button.html'

    def __init__(self, text='', variant='pri', size=None, icon=None,
                 icon_only=False, disabled=False, on_click=None,
                 type='button', href='', target='', title='',
                 mobile_icon=False, block=False, **kw):
        super().__init__(**kw)
        self.text = text
        self.variant = variant
        self.size = size
        self.icon = icon
        self.icon_only = icon_only
        self.disabled = disabled
        self.on_click = on_click
        self.type = type
        self.href = href
        self.target = target
        self.title = title
        self.mobile_icon = mobile_icon
        self.block = block

    def context(self):
        return {'text': self.text, 'variant': self.variant, 'size': self.size or '',
                'icon': self.icon, 'icon_only': self.icon_only,
                'disabled': self.disabled, 'on_click': self.on_click or '',
                'type': self.type, 'href': self.href, 'target': self.target,
                'id': self.id or '', 'title': self.title,
                'mobile_icon': self.mobile_icon, 'block': self.block}
