"""Loading components — wrapper บางๆ ของ macro bb_spinner / bb_skeleton.

markup ตรง components-gallery.html §+ (.bb-spinner · .bb-skeleton)
- Spinner  — วงหมุน · size='sm' · text → inline (spinner + ข้อความ)
- Skeleton — แถบ placeholder หลายบรรทัด (ส่ง width เป็น str ก็ได้)
"""
from .base import BaseComponent


class Spinner(BaseComponent):
    """วงหมุนโหลด. size='sm' = เล็ก · text มีค่า = แบบ inline."""

    template = '_components/render/_spinner.html'

    def __init__(self, size='', text='', **kw):
        super().__init__(**kw)
        self.size = size
        self.text = text

    def context(self):
        return {'size': self.size, 'text': self.text}


class Skeleton(BaseComponent):
    """แถบ placeholder. lines = list ของ width (str) หรือ dict {height, width}."""

    template = '_components/render/_skeleton.html'

    def __init__(self, lines=None, height='14px', **kw):
        super().__init__(**kw)
        self.lines = lines or []
        self.height = height

    def _norm(self, ln):
        if isinstance(ln, dict):
            return {'height': ln.get('height', self.height), 'width': ln.get('width', '100%')}
        return {'height': self.height, 'width': ln}   # ln = width str

    def context(self):
        return {'lines': [self._norm(ln) for ln in self.lines]}
