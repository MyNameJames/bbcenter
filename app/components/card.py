"""Card component — wrapper บางๆ ของ macro bb_card.

markup ตรง components-gallery.html §7 (.bb-card)
body รับได้: str/Markup, BaseComponent, หรือ list ของ component → ประกอบ component ซ้อนได้
"""
from markupsafe import Markup

from .base import BaseComponent


def _render_body(body):
    """แปลง body (component / list / str) เป็น Markup สำหรับ template."""
    if body is None:
        return Markup('')
    if isinstance(body, BaseComponent):
        return body.render()
    if isinstance(body, (list, tuple)):
        return Markup('').join(_render_body(b) for b in body)
    return body


class Card(BaseComponent):
    """การ์ด. head แสดงเมื่อมี title/link · body ใส่ component อื่นได้."""

    template = '_components/render/_card.html'

    def __init__(self, title='', link='', body='', **kw):
        super().__init__(**kw)
        self.title = title
        self.link = link
        self.body = body

    def context(self):
        return {'title': self.title, 'link': self.link,
                'body': _render_body(self.body)}
