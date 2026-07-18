"""Thin server-side component layer — BaseComponent.

ปรัชญา (BBCenter UI Framework):
    Database → Model → Controller → Component → Jinja → HTML
    Component ถือ config + เลือก template → render ผ่าน Jinja เท่านั้น

ห้าม:
    - build HTML string ใน Python
    - query DB
    - รู้ business logic / ตรวจ permission
    (Controller เป็นคนเตรียม data + ตัดสินใจว่าจะแสดง component ตัวไหน)

ทุก component สืบทอด BaseComponent → property กลาง: id, class_name, visible
"""
from flask import render_template
from markupsafe import Markup


class BaseComponent:
    """Base ของทุก widget. subclass กำหนด `template` + override `context()`."""

    template = None  # path Jinja template ที่ใช้ render

    def __init__(self, id=None, class_name='', visible=True):
        self.id = id
        self.class_name = class_name
        self.visible = visible

    def context(self):
        """ข้อมูลที่ส่งเข้า template — subclass override."""
        return {'c': self}

    def render(self):
        """คืน Markup ที่ render แล้ว (ปลอดภัยพอที่จะพิมพ์ใน Jinja)."""
        if not self.visible:
            return Markup('')
        if not self.template:
            raise NotImplementedError(f'{type(self).__name__} ไม่ได้กำหนด template')
        return Markup(render_template(self.template, **self.context()))
