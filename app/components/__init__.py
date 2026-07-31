"""BBCenter UI Component layer — thin Python wrapper รอบ Jinja macro.

ใช้:
    from components import Table, Column
    table = Table(data=rows)
    table.add_column(key='label', label='ประเภทงาน')
    # ส่ง table เข้า template → {{ component(table) }}

register_components(app) ติดตั้ง jinja global `component(obj)` → obj.render()
"""
from .base import BaseComponent
from .table import Table, Column
from .badge import Badge, Status
from .button import Button
from .card import Card
from .kpi import KPI
from .input import Input
from .search import Search
from .tabs import Tabs, Tab
from .segmented import Segmented, Seg
from .chip import Chip, Token
from .daterange import DateRange
from .dropdown import Dropdown, MenuItem, MenuLabel, MenuDivider, MenuRich
from .pagination import Pagination
from .modal import Modal
from .timeline import Timeline, TLItem
from .empty import Empty
from .loading import Spinner, Skeleton
from .weekstrip import WeekStrip
from .datepicker import DatePicker
from .timepicker import TimePicker
from .timerange import TimeRange
from .datefield import DateField
from .timerangefield import TimeRangeField
from .combo import Combo
from .upload import Upload
from .bell import Bell
from .callout import Callout
from .drawer import Drawer, Section, DescList
from .toast import ToastRegion
from .sidebar import Sidebar
from .slider import Slider
from .calendar import Calendar

__all__ = ['BaseComponent', 'Table', 'Column', 'Badge', 'Status',
           'Button', 'Card', 'KPI', 'Input', 'Search', 'Tabs', 'Tab',
           'Segmented', 'Seg', 'Chip', 'Token', 'DateRange',
           'Dropdown', 'MenuItem', 'MenuLabel', 'MenuDivider', 'MenuRich',
           'Pagination', 'Modal', 'Timeline', 'TLItem',
           'Empty', 'Spinner', 'Skeleton',
           'WeekStrip', 'DatePicker', 'TimePicker', 'TimeRange',
           'DateField', 'TimeRangeField',
           'Combo', 'Upload', 'Bell', 'Callout', 'ToastRegion', 'Sidebar',
           'Slider', 'Calendar', 'Drawer', 'Section', 'DescList',
           'register_components']


def register_components(app):
    """ติดตั้ง jinja global `component` — เรียกใน app.py ตอน setup."""
    app.jinja_env.globals['component'] = lambda obj: obj.render()
