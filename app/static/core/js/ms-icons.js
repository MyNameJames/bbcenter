/* ══════════════════════════════════════════════════
   core/js/ms-icons.js — Lucide → Material Symbols (runtime transform)
   ──────────────────────────────────────────────────
   Phase 1 redesign (2026-07-11): หน้าที่ opt-in (โหลด script นี้) จะแปลงทุก
   <i data-lucide="X"> เป็น <span class="material-symbols-rounded" data-lucide="X">ms</span>
   ครอบคลุม static + dynamic (toast/combo/sort/notification) ผ่าน MutationObserver.

   ⚠️ หน้านั้น "ต้องไม่โหลด Lucide จริง" (ใส่ stub window.lucide={createIcons(){}} แทน)
      ไม่งั้น Lucide จะ render <i>→<svg> แข่งกัน. หน้าอื่นที่ไม่โหลด script นี้ = ใช้ Lucide ตามเดิม.
   - คง attribute data-lucide บน span ไว้ → JS เดิมที่ query [data-lucide] (combo remove-check,
     sort updateSortIcons) ยังทำงาน; observer ฟัง attribute change → sync ข้อความไอคอน (sort)
   - size: bb-* CSS เดิม size ผ่าน `svg` — MS เป็น span ใช้ font-size; แปลง width ใน inline style
     เป็น font-size + เติม default sizing ผ่าน CSS ของหน้า (.ml2-content .material-symbols-rounded)
══════════════════════════════════════════════════ */
(function () {
    'use strict';

    /* Lucide name → Material Symbols name (ครอบคลุมไอคอนที่ใช้บนหน้า + ที่พบบ่อย) */
    var MAP = {
        'chevron-down': 'expand_more', 'chevron-up': 'expand_less',
        'chevron-left': 'chevron_left', 'chevron-right': 'chevron_right',
        'chevrons-up-down': 'unfold_more', 'chevrons-left': 'keyboard_double_arrow_left',
        'arrow-up': 'arrow_upward', 'arrow-down': 'arrow_downward',
        'arrow-left': 'arrow_back', 'arrow-right': 'arrow_forward',
        'check': 'check', 'check-circle': 'check_circle', 'circle-check': 'check_circle',
        'x': 'close', 'x-circle': 'cancel',
        'search': 'search', 'download': 'download', 'upload': 'upload', 'upload-cloud': 'cloud_upload',
        'filter': 'filter_list', 'sliders': 'tune', 'sliders-horizontal': 'tune',
        'calendar': 'calendar_month', 'calendar-days': 'calendar_month', 'calendar-check': 'event_available',
        'calendar-x': 'event_busy',
        'clock': 'schedule', 'more-time': 'more_time',
        'more-vertical': 'more_vert', 'more-horizontal': 'more_horiz',
        'user': 'person', 'users': 'group', 'user-plus': 'person_add',
        'fuel': 'local_gas_station', 'gauge': 'speed', 'speed': 'speed',
        'bike': 'two_wheeler', 'car': 'directions_car', 'bus': 'directions_bus',
        'plane-landing': 'flight_land', 'plane-takeoff': 'flight_takeoff', 'dot': 'fiber_manual_record',
        'pencil': 'edit', 'trash-2': 'delete', 'plus': 'add', 'minus': 'remove',
        'bell': 'notifications', 'info': 'info', 'alert-triangle': 'warning',
        'alert-octagon': 'dangerous', 'alert-circle': 'error', 'triangle-alert': 'warning',
        'wrench': 'build', 'building-2': 'apartment', 'landmark': 'account_balance', 'computer': 'computer', 'hammer': 'construction',
        'screwdriver': 'construction', 'file': 'draft', 'file-text': 'description', 'image': 'image',
        'map-pin': 'location_on', 'trip-origin': 'trip_origin', 'phone': 'call', 'hash': 'tag', 'list': 'list', 'list-checks': 'checklist',
        'settings': 'settings', 'log-out': 'logout', 'menu': 'menu', 'home': 'home',
        'fact-check': 'fact_check', 'wallet': 'account_balance_wallet',
        'cards-stack': 'stacks', 'add-card': 'add_card', 'accessibility-new': 'accessibility_new',
        'diversity-3': 'diversity_3', 'space-dashboard': 'space_dashboard', 'layout-dashboard': 'space_dashboard',
        'eye': 'visibility', 'eye-off': 'visibility_off', 'save': 'save', 'send': 'send',
        'award': 'workspace_premium', 'refresh-cw': 'refresh', 'star': 'star', 'heart': 'favorite',
        'banknote': 'payments', 'draft': 'draft', 'lock': 'lock',
        'printer': 'print', 'receipt-text': 'receipt_long', 'rotate-ccw': 'restore', 'undo-2': 'undo'
    };

    var msName = function (lucide) { return MAP[lucide] || String(lucide).replace(/-/g, '_'); };

    /* size คุมด้วย CSS ตาม context (ไม่แปลง inline width → font-size เพราะทำให้ขนาดไม่สม่ำเสมอ)
       เก็บแค่ color จาก inline style เดิม */
    function colorFrom(style) {
        var m = /(?:^|;)\s*color:\s*([^;]+)/.exec(style || '');
        return m ? m[1].trim() : '';
    }

    function toMS(el) {
        if (!el || el.nodeType !== 1) return;
        var name = el.getAttribute('data-lucide');
        if (!name) return;

        /* เป็น MS span อยู่แล้ว (เช่น data-lucide เปลี่ยนค่าโดย sort) → อัปเดตข้อความ */
        if (el.classList.contains('material-symbols-rounded')) {
            el.textContent = msName(name);
            return;
        }

        var span = document.createElement('span');
        span.className = 'material-symbols-rounded';
        el.classList.forEach(function (c) {
            if (c !== 'lucide' && c.indexOf('lucide-') !== 0) span.classList.add(c);
        });
        span.setAttribute('data-lucide', name);         // คงไว้ให้ JS เดิม query ได้

        /* คง attribute อื่นไว้ทั้งหมด (class/style จัดการแยกด้านล่าง) — สำคัญกับ `id`:
           เดิม id หายตอนแปลง → getElementById('detailStatusIcon') คืน null แล้ว
           vehicle.js/vehicle_admin.js พังตอนเปิด detail modal (2026-07-28) */
        for (var i = 0; i < el.attributes.length; i++) {
            var a = el.attributes[i];
            if (a.name !== 'class' && a.name !== 'style') span.setAttribute(a.name, a.value);
        }

        var col = colorFrom(el.getAttribute('style') || '');
        if (col) span.style.color = col;                // คง color เดิม (size → CSS)

        span.textContent = msName(name);
        el.replaceWith(span);
    }

    function convert(root) {
        if (!root || root.nodeType !== 1) return;
        if (root.hasAttribute && root.hasAttribute('data-lucide')) toMS(root);
        if (root.querySelectorAll) root.querySelectorAll('[data-lucide]').forEach(toMS);
    }

    var obs = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
            var m = muts[i];
            if (m.type === 'attributes') {
                if (m.target.getAttribute && m.target.getAttribute('data-lucide')) toMS(m.target);
            } else {
                m.addedNodes.forEach(function (n) { convert(n); });
            }
        }
    });

    function start() {
        convert(document.body);
        obs.observe(document.body, {
            childList: true, subtree: true,
            attributes: true, attributeFilter: ['data-lucide']
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
