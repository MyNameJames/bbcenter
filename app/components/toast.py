"""ToastRegion component — wrapper บางๆ ของ macro bb_toast_region.

จุดวาง toast (in-app notification) มุมขวาบน — วาง 1 ครั้งใน base layout
ยิง toast ด้วย JS API: window.bbToast({type, title, msg, duration})
bridge flash → toast: ส่ง flashes ตอน render → JS อ่านยิงทันที
"""
from .base import BaseComponent


class ToastRegion(BaseComponent):
    """region สำหรับ toast (+ flash bridge)."""

    template = '_components/render/_toast.html'

    def __init__(self, flashes=None, **kw):
        super().__init__(**kw)
        self.flashes = flashes or []

    def context(self):
        return {'flashes': self.flashes, 'region_id': self.id or ''}
