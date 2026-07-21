"""Pagination component — wrapper บางๆ ของ macro bb_pagination.

แบบ windowed (มี gap …)
Python คำนวณ window/gap + info → macro render เฉยๆ (layering)

window: หน้าแรก, หน้าสุดท้าย, current ± edge, แทรก gap คั่น
controller สร้าง: Pagination(total=128, page=1, limit=20)
"""
from .base import BaseComponent


class Pagination(BaseComponent):
    """แถบเปลี่ยนหน้า (info + ปุ่มหน้า + prev/next)."""

    template = '_components/render/_pagination.html'

    def __init__(self, total=0, page=1, limit=20, edge=1, on_click='', **kw):
        super().__init__(**kw)
        self.total = max(0, int(total))
        self.limit = max(1, int(limit))
        self.page = max(1, int(page))
        self.edge = edge          # จำนวนหน้ารอบ ๆ current ที่โชว์
        self.on_click = on_click

    @property
    def total_pages(self):
        return max(1, -(-self.total // self.limit))   # ceil

    def _info(self):
        if self.total == 0:
            return 'ไม่มีรายการ'
        start = (self.page - 1) * self.limit + 1
        end = min(self.page * self.limit, self.total)
        return f'แสดง {start:,}–{end:,} จาก {self.total:,}'

    def _windowed(self):
        """คืน list token: {kind:'page',n,active} | {kind:'gap'}."""
        last = self.total_pages
        keep = {1, last, self.page}
        for d in range(1, self.edge + 1):
            keep.add(self.page - d)
            keep.add(self.page + d)
        shown = sorted(n for n in keep if 1 <= n <= last)

        tokens, prev = [], 0
        for n in shown:
            if n - prev > 1:
                tokens.append({'kind': 'gap'})
            tokens.append({'kind': 'page', 'n': n, 'active': n == self.page})
            prev = n
        return tokens

    def context(self):
        return {'info': self._info(), 'pages': self._windowed(),
                'page': self.page, 'total_pages': self.total_pages,
                'on_click': self.on_click}
