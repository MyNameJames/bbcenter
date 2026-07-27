"""Table component — wrapper บางๆ ของ macro bb_table_v2 (_components/bb/table.html).

Controller สร้าง Table()/Column() แทนการเขียน config dict ยาวใน template
→ controller อ่านง่าย, design ยัง render จุดเดียว (macro เดิม) ไม่ซ้ำ HTML

custom cell (badge/status/ปุ่ม): ใช้ `Column(cell=lambda row: Component)` (Cell Component
2026-06-29) — map เป็น cfg `render` = callable คืน `.render()`, bb_table_v2 เรียกผ่าน
`{{ col.render(row) }}` ได้ (Jinja เรียก Python callable ได้).

row key พิเศษ (Batch 3 · 2026-07-21) — ใส่ใน dict ของ data ได้เลย:
    _group / _group_note / _accent  แถวหัวกลุ่มคั่นกลางตาราง (_accent=True = กลุ่มที่ทำ action ได้)
    _locked                          แถวจาง ทำ action ไม่ได้
    _sel                             แถวที่เลือกอยู่ (tint เขียว)
เคสที่ยังต้องใช้ shell bb_table: ต้องใส่ data-* เอง บน <tr>
"""
from dataclasses import dataclass

from .base import BaseComponent


@dataclass
class Column:
    """1 คอลัมน์ของ Table. field ตรงกับ column dict ของ bb_table_v2."""

    key: str = ''       # ดึง row[key]
    sub: str = ''       # key ของบรรทัดรองใน cell เดียวกัน (เช่น 'รถตู้' / '10 ที่นั่ง')
    label: str = ''     # หัวคอลัมน์
    sort: str = ''      # sort key → คอลัมน์กรองได้
    align: str = ''     # '' | 'end' | 'center'
    fmt: str = ''       # 'money' | 'num' | format string เช่น '฿{:,.0f}'
    cls: str = ''       # extra class บน th/td
    cell: object = None  # callable(row) -> BaseComponent — render component ต่อ row (เช่น Status)

    def to_cfg(self):
        cfg = {k: v for k, v in vars(self).items() if v and k != 'cell'}
        if self.cell:
            make = self.cell
            cfg['render'] = lambda row: make(row).render()
        return cfg


def _col_cfg(col):
    return col.to_cfg() if isinstance(col, Column) else col


class Table(BaseComponent):
    """Data table. ส่ง columns เป็น Column หรือ dict ก็ได้."""

    template = '_components/render/_table.html'

    def __init__(self, columns=None, data=None, total=None, limit=None,
                 page=None, pagination=False, info=False, empty='ไม่พบรายการ',
                 wrap_cls='', table_cls='', **kw):
        super().__init__(**kw)
        self.columns = columns or []
        self.data = data or []
        self.total = total
        self.limit = limit
        self.page = page
        self.pagination = pagination
        self.info = info
        self.empty = empty
        self.wrap_cls = wrap_cls
        self.table_cls = table_cls

    def add_column(self, **kw):
        self.columns.append(Column(**kw))
        return self

    def _cfg(self):
        cfg = {
            'columns': [_col_cfg(c) for c in self.columns],
            'data': self.data,
            'empty': self.empty,
        }
        if self.id:           cfg['id'] = self.id
        if self.class_name:   cfg['class'] = self.class_name
        if self.total is not None: cfg['total'] = self.total
        if self.limit:        cfg['limit'] = self.limit
        if self.page:         cfg['page'] = self.page
        if self.pagination:   cfg['pagination'] = True
        if self.info:         cfg['info'] = True
        if self.wrap_cls:     cfg['wrap_cls'] = self.wrap_cls
        if self.table_cls:    cfg['table_cls'] = self.table_cls
        return cfg

    def context(self):
        return {'cfg': self._cfg()}
