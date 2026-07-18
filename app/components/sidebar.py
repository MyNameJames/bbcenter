"""Sidebar component — wrapper บางๆ ของ macro bb_sidebar.

app shell sidebar (Stripe-style) — config-driven (brand / sections / logout)
layout: position:fixed + เนื้อหาหลักใส่ class .bb-sidebar-main (margin-left)
JS auto-init [data-bb-sidebar] (core/js/bb-components.js) — พับ/กาง group

data model:
    brand   = {mark, name, sub, on_click}
    section = {label?, items:[...]}
    item    = {label, icon?, href?, on_click?, active?, badge?}  (link)
              {group, icon?, open?, badge?, children:[...]}      (collapsible group)
    logout  = {label, icon?, href?, on_click?}
"""
from .base import BaseComponent


class Sidebar(BaseComponent):
    """sidebar นำทาง (brand + sections + logout)."""

    template = '_components/render/_sidebar.html'

    def __init__(self, brand=None, sections=None, logout=None, **kw):
        super().__init__(**kw)
        self.brand = brand or {}
        self.sections = sections or []
        self.logout = logout

    def context(self):
        return {'brand': self.brand, 'sections': self.sections,
                'logout': self.logout, 'sidebar_id': self.id or ''}
