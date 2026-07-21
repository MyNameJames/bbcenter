/* ══════════════════════════════════════════════════
   pages/mileage-admin.js — Mileage Admin (ES module)
   Modal: unified single-form (odo ออก+กลับ พร้อมกัน),
   checkbox selection summary, export-link sync.
══════════════════════════════════════════════════ */

/* ── Helpers ──────────────────────────────────── */
function fmt(n) {
    if (n === null || n === undefined || isNaN(n)) return '0';
    return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function nowTimestampValue() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ── Motion helpers — shared จาก core/js/ue-motion.js (window.ueMotion, โหลดก่อน module นี้) ── */
const { REDUCE, sleep, SKEL_MIN_MS, countUp, staggerRows, showSkeleton } = window.ueMotion;

/* ── State refs ───────────────────────────────── */
const $modal      = document.getElementById('mileageModal');
const formMileage = document.getElementById('formMileage');
const mmOdoStart  = document.getElementById('mmOdoStart');
const mmOdoEnd    = document.getElementById('mmOdoEnd');
const mmOdoEndErr = document.getElementById('mmOdoEndErr');
const mmEntryType = document.getElementById('mmEntryType');
const mmConfirmDistance = document.getElementById('mmConfirmDistance');
let bsModal    = null;
let currentRow = null;

const BADGE_STYLE = {
    none:     { text: 'รอกรอกไมล์ออก',   bg: '--bb-n200',  fg: '--bb-mut'  },
    partial:  { text: 'รอกรอกไมล์กลับ', bg: '--bb-wr-bg', fg: '--bb-wr-tx' },
    complete: { text: 'กรอกเลขไมล์ครบ',  bg: '--bb-ok-bg', fg: '--bb-ok-tx' }
};
const AVATAR_ICON_COLOR = { none: '--bb-mut', partial: '--bb-wr', complete: '--bb-ok' };

function clearEndError() {
    mmOdoEnd.classList.remove('is-error');
    mmOdoEndErr.style.display = 'none';
}

/* ── Modal open ───────────────────────────────── */
function openMileage(btn) {
    const row = btn.closest('[data-booking]');
    if (!row) return;
    currentRow = row;

    const ds = row.dataset;
    document.getElementById('mmFormBookingId').value   = ds.booking;
    document.getElementById('mmBudgetSub').textContent = 'BK-' + ds.booking + (ds.budgetSub ? ' · ' + ds.budgetSub : '');
    document.getElementById('mmName').textContent      = ds.user || '—';
    document.getElementById('mmTime').textContent      = ds.time || '—';
    document.getElementById('mmDriver').textContent    = ds.driver || '—';
    document.getElementById('mmPlateDest').textContent = (ds.plate ? ds.plate + ' → ' : '') + (ds.destination || '—');
    document.getElementById('mmDistance').textContent  = ds.distance ? fmt(ds.distance) : '-';
    document.getElementById('mmCost').textContent      = ds.cost ? fmt(ds.cost) : '-';

    const odoStart = ds.odoStart ? Number(ds.odoStart) : null;
    const odoEnd   = ds.odoEnd   ? Number(ds.odoEnd)   : null;

    let state;
    if (!odoStart) state = 'none';
    else if (!odoEnd) state = 'partial';
    else state = 'complete';

    const { text, bg, fg } = BADGE_STYLE[state];
    const badge  = document.getElementById('mmBadge');
    badge.textContent    = text;
    badge.style.background = `var(${bg})`;
    badge.style.color      = `var(${fg})`;

    const avatar = document.getElementById('mmAvatar');
    avatar.style.background = `var(${bg})`;
    avatar.querySelector('svg, i').style.color = `var(${AVATAR_ICON_COLOR[state]})`;

    clearEndError();

    if (state === 'none') {
        mmOdoStart.value    = '';
        mmOdoStart.disabled = false;
        mmOdoStart.required = true;
        mmOdoEnd.value      = '';
        mmOdoEnd.disabled   = true;
        mmOdoEnd.required   = false;
        document.getElementById('mmActualStart').value = nowTimestampValue();
        mmEntryType.value = 'start';
    } else {
        mmOdoStart.value    = odoStart;
        mmOdoStart.disabled = true;
        mmOdoStart.required = false;
        mmOdoEnd.value      = odoEnd || '';
        mmOdoEnd.disabled   = false;
        mmOdoEnd.required   = true;
        document.getElementById('mmActualEnd').value = nowTimestampValue();
        mmEntryType.value = 'end';
    }

    if (!bsModal) bsModal = new bootstrap.Modal($modal);
    bsModal.show();
}

mmOdoEnd.addEventListener('input', clearEndError);

formMileage.addEventListener('submit', function (e) {
    if (mmEntryType.value !== 'end') return;
    const start = Number(mmOdoStart.value || (currentRow && currentRow.dataset.odoStart) || 0);
    const end   = Number(mmOdoEnd.value || 0);
    if (!end || end <= start) {
        e.preventDefault();
        mmOdoEnd.classList.add('is-error');
        mmOdoEndErr.style.display = 'block';
        return;
    }
    // REQ-3 (Phase 3.5): เพดานระยะทาง — confirm ผ่านได้ ไม่ block เด็ดขาด (ตกลงกับ
    // เจ้าของโปรเจกต์) — backend มี guard เดียวกันเป็น safety net เผื่อ JS ถูกข้าม
    const distance = end - start;
    if (distance > window.BBML_DISTANCE_CAP && mmConfirmDistance.value !== '1') {
        const ok = confirm(
            `ระยะทาง ${fmt(distance)} กม. เกินเพดานปกติ (${fmt(window.BBML_DISTANCE_CAP)} กม.) — ยืนยันว่าเลขถูกต้องใช่ไหม?`
        );
        if (!ok) { e.preventDefault(); return; }
        mmConfirmDistance.value = '1';
    }
});

/* ── Toolbar: status tabs (tab2 component, 2026-07-07 แทน bb_tabs) ──
   tab2_tabs ออก data-tab เป็น <div> (ไม่ใช่ button) → ไม่ต้อง preventDefault */
(function bindStatusTabs() {
    const form = document.getElementById('filterForm');
    const hidden = document.getElementById('statusFilter');
    if (!form || !hidden) return;
    document.querySelectorAll('#statusTabs .tab2-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            hidden.value = btn.dataset.tab || '';
            // update active state ทันที (ไม่ reload → server ไม่ได้ render ให้)
            document.querySelectorAll('#statusTabs .tab2-tab')
                .forEach(c => c.classList.toggle('active', c === btn));
            runFilter();
        });
    });
})();

/* ── Filter (bb_filter live) + date range → trigger AJAX ──
   bb_filter toggle/clear = JS ของ bb-components.js · ที่นี่แค่ผูก trigger
   bb-filter:change ยิงเมื่อ native input/select ใน filter เปลี่ยน (cost, booker, budget_sub)
   bb_combo set hidden value แต่ไม่ยิง native change → bridge เป็น native 'change'
   เพื่อให้ bb_filter จับ (badge is-active + ยิง bb-filter:change ต่อ) → ไหลเข้า runFilter จุดเดียว */
document.addEventListener('bb-daterange:change', () => runFilter());
document.addEventListener('bb-filter:change', () => runFilter());

/* filter controls: bb_dropdown (menu) + booker combo + budget cascade
   dropdown (bb-select + .bb-menu) เป็น decorative → wire เอง:
     เลือก item → set hidden input [name] + native change → bb_filter (bb-components)
     จับ change → recompute badge + ยิง bb-filter:change → runFilter
   booker = bb_combo → bridge bb-combo:change → native change (เหมือนเดิม)
   budget_type เปลี่ยน → rebuild เมนู budget_sub (cascade) */
(function bindFilterControls() {
    const root = document.getElementById('bbMlFilter');
    if (!root) return;
    const cats       = window.EXPENSE_CATS || { central: [], department: [] };
    const initialSub = window.BBML_FILTER_SUB || '';
    const subSec     = document.getElementById('filterBudgetSubSec');
    const dds        = Array.from(root.querySelectorAll('[data-bb-ml-dd]'));
    const ddByName   = name => dds.find(dd => dd.querySelector('[data-bb-ml-dd-input]').name === name);

    function closeMenus(except) {
        dds.forEach(dd => {
            if (dd === except) return;
            dd.querySelector('[data-bb-ml-dd-menu]').hidden = true;
            dd.querySelector('[data-bb-ml-dd-trigger]').setAttribute('aria-expanded', 'false');
        });
    }

    // set ค่า dropdown (is-on + label + hidden input) · silent = ไม่ยิง change
    function pick(dd, value, label, silent) {
        const input = dd.querySelector('[data-bb-ml-dd-input]');
        const lbl   = dd.querySelector('[data-bb-ml-dd-label]');
        dd.querySelectorAll('.bb-menu-item').forEach(x =>
            x.classList.toggle('is-on', (x.dataset.value || '') === (value || '')));
        input.value = value || '';
        lbl.textContent = label || 'ทั้งหมด';
        if (!silent) input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    dds.forEach(dd => {
        const trigger = dd.querySelector('[data-bb-ml-dd-trigger]');
        const menu    = dd.querySelector('[data-bb-ml-dd-menu]');
        const name    = dd.querySelector('[data-bb-ml-dd-input]').name;
        trigger.addEventListener('click', e => {
            e.stopPropagation();
            const willOpen = menu.hidden;
            closeMenus(dd);
            menu.hidden = !willOpen;
            trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        });
        menu.addEventListener('click', e => {
            const opt = e.target.closest('.bb-menu-item');
            if (!opt) return;
            menu.hidden = true;
            trigger.setAttribute('aria-expanded', 'false');
            if (name === 'budget_type') {
                pick(dd, opt.dataset.value, opt.dataset.label, true);  // defer change
                rebuildBudgetSub(opt.dataset.value);                   // sync budget_sub (silent)
                dd.querySelector('[data-bb-ml-dd-input]').dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                pick(dd, opt.dataset.value, opt.dataset.label);
            }
        });
    });

    // budget_type → rebuild เมนู budget_sub (cascade) · pick แบบ silent เสมอ
    function rebuildBudgetSub(type) {
        const dd = ddByName('budget_sub');
        if (!dd) return;
        const menu = dd.querySelector('[data-bb-ml-dd-menu]');
        if (type !== 'central' && type !== 'department') {
            if (subSec) subSec.hidden = true;
            menu.innerHTML = '<div class="bb-menu-item is-on" data-value="" data-label="ทั้งหมด">ทั้งหมด</div>';
            pick(dd, '', 'ทั้งหมด', true);
            return;
        }
        if (subSec) subSec.hidden = false;
        const list = cats[type] || [];
        menu.innerHTML = '<div class="bb-menu-item" data-value="" data-label="ทั้งหมด">ทั้งหมด</div>' +
            list.map(x => `<div class="bb-menu-item" data-value="${x.key}" data-label="${x.label}">${x.label}</div>`).join('');
        const keep = list.some(x => x.key === initialSub) ? initialSub : '';
        const kept = keep ? list.find(x => x.key === keep) : null;
        pick(dd, keep, kept ? kept.label : 'ทั้งหมด', true);
    }

    // booker combo → bridge bb-combo:change → native change (ให้ bb_filter จับ)
    document.addEventListener('bb-combo:change', e => {
        const el = e.target;
        if (!el.classList || !el.classList.contains('bb-combo')) return;
        const input = el.querySelector('[data-bb-combo-input]');
        if (input) input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // click ใน filter body นอก dropdown → ปิดเมนูที่เปิดอยู่
    const body = root.querySelector('[data-bb-filter-body]');
    if (body) body.addEventListener('click', e => { if (!e.target.closest('[data-bb-ml-dd]')) closeMenus(null); });

    /* ล้างการเลือก — reset controls in-place (ไม่โหลดหน้าใหม่) แล้ว AJAX filter จุดเดียว
       bb-components clear ใช้ baseline = ค่าที่กรองอยู่ (server-persisted) → reset ผิด ·
       จึ่ง override: capture + stopImmediatePropagation กัน handler เดิม แล้ว reset เอง */
    const clearBtn = root.querySelector('[data-bb-filter-clear]');
    if (clearBtn) clearBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopImmediatePropagation();
        // dropdowns → 'ทั้งหมด' (silent) · budget_type รีเซ็ต cascade budget_sub ด้วย
        dds.forEach(dd => {
            pick(dd, '', 'ทั้งหมด', true);
            if (dd.querySelector('[data-bb-ml-dd-input]').name === 'budget_type') rebuildBudgetSub('');
        });
        // booker combo → placeholder (silent)
        const combo = root.querySelector('.bb-combo');
        if (combo) {
            const cin = combo.querySelector('[data-bb-combo-input]');
            const clbl = combo.querySelector('[data-bb-combo-label]');
            if (cin) cin.value = '';
            if (clbl) { clbl.textContent = 'ทั้งหมด'; clbl.classList.add('is-ph'); }
            combo.querySelectorAll('.bb-combo-opt').forEach(x => {
                x.classList.remove('is-on');
                const c = x.querySelector('[data-lucide="check"]'); if (c) c.remove();
            });
        }
        // cost slider (dual) → เต็มพิสัย (silent render)
        const slider = root.querySelector('[data-bb-slider]');
        if (slider) slider.dispatchEvent(new CustomEvent('bb-slider:reset'));
        // badge off + filter จุดเดียว
        root.classList.remove('is-active');
        runFilter();
    }, true);   // capture: stop ก่อน bubble listener ของ bb-components
})();

/* cost slider (dual) → debounce → native change ให้ bb_filter จับ (badge + runFilter) */
(function bindFilterSlider() {
    const root = document.getElementById('bbMlFilter');
    if (!root) return;
    const slider = root.querySelector('[data-bb-slider]');
    if (!slider) return;
    let t;
    slider.addEventListener('bb-slider:change', () => {
        clearTimeout(t);
        t = setTimeout(() => {
            const input = slider.querySelector('[data-bb-slider-input]');
            if (input) input.dispatchEvent(new Event('change', { bubbles: true }));
        }, 300);
    });
})();

/* ── Selection / Summary (re-bindable หลัง AJAX swap) ── */
let $checkAll, $modeAll, $modeSel, $strip;

function getRows() {
    return Array.from(document.querySelectorAll('tr.bb-ml-row'));
}

function recalcSummary() {
    if (!$strip) return;
    const rows = getRows();
    const selected = rows.filter(r => {
        const cb = r.querySelector('.bb-ml-row-check');
        return cb && cb.checked;
    });

    if (selected.length > 0) {
        let d = 0, c = 0;
        selected.forEach(r => {
            d += Number(r.dataset.distance || 0);
            c += Number(r.dataset.cost || 0);
        });
        document.getElementById('selCount').textContent    = selected.length;
        document.getElementById('selDistance').textContent = fmt(d);
        document.getElementById('selCost').textContent     = fmt(c);
        $modeAll.style.display = 'none';
        $modeSel.style.display = 'flex';
        $strip.classList.add('is-selected');
    } else {
        $modeAll.style.display = 'flex';
        $modeSel.style.display = 'none';
        $strip.classList.remove('is-selected');
    }

    if (!$checkAll) return;
    const enabled = rows.filter(r => {
        const cb = r.querySelector('.bb-ml-row-check');
        return cb && !cb.disabled;
    });
    if (enabled.length === 0) {
        $checkAll.indeterminate = false;
        $checkAll.checked = false;
    } else if (enabled.every(r => r.querySelector('.bb-ml-row-check').checked)) {
        $checkAll.indeterminate = false;
        $checkAll.checked = true;
    } else if (enabled.some(r => r.querySelector('.bb-ml-row-check').checked)) {
        $checkAll.indeterminate = true;
    } else {
        $checkAll.indeterminate = false;
        $checkAll.checked = false;
    }
}

let _sumInit = false, _sumLast = null;
function calcAllSummary() {
    const rows = getRows();
    let d = 0, c = 0;
    rows.forEach(r => {
        d += Number(r.dataset.distance || 0);
        c += Number(r.dataset.cost || 0);
    });
    const elN = document.getElementById('sumAllCount');
    const elD = document.getElementById('sumAllDistance');
    const elC = document.getElementById('sumAllCost');
    if (elN) elN.textContent = fmt(rows.length);
    if (elD) elD.textContent = fmt(d);
    if (elC) {
        if (!_sumInit) {                     // B2 — โหลดครั้งแรก → count-up
            countUp(elC, c, { format: fmt });
            _sumInit = true;
        } else {                             // filter เปลี่ยน → set + bump ถ้าค่าต่าง
            elC.textContent = fmt(c);
            if (c !== _sumLast && !REDUCE) {
                elC.classList.remove('is-bump');
                void elC.offsetWidth;
                elC.classList.add('is-bump');
            }
        }
        _sumLast = c;
    }
}

function clearSelection() {
    document.querySelectorAll('.bb-ml-row-check').forEach(cb => { cb.checked = false; });
    if ($checkAll) { $checkAll.checked = false; $checkAll.indeterminate = false; }
    recalcSummary();
}

/* ══════════════════════════════════════════════════
   TABLE SEARCH — client-side filter + highlight (เหลือง)
   ค้นในแถว (cell text + dataset) → match: show + <mark>; ไม่ match: ซ่อน
   search input อยู่นอก #bbMlResults → ค่าคงหลัง AJAX swap, re-apply ใน bindResults
══════════════════════════════════════════════════ */
let bbMlQuery = '';

/* unwrap <mark> เดิมทั้งหมด + รวม text node ที่แตก */
function clearHighlight(root) {
    root.querySelectorAll('mark.bb-ml-search-hl').forEach(m => {
        m.replaceWith(document.createTextNode(m.textContent));
    });
    root.normalize();
}

/* wrap ทุก occurrence ของ q ในแถว — เฉพาะ text node ที่ปลอดภัย
   (ข้าม checkbox/action/badge/button/a เพื่อไม่ทำลาย structure) */
function highlightRow(row, q) {
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            const p = node.parentElement;
            if (!p || p.closest('.bb-ml-col-check, .bb-ml-col-actions, .bb-badge, .bb-status, button, a, mark'))
                return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });
    const targets = [];
    let n; while ((n = walker.nextNode())) targets.push(n);

    targets.forEach(node => {
        const text  = node.nodeValue;
        const lower = text.toLowerCase();
        let i = lower.indexOf(q);
        if (i === -1) return;
        const frag = document.createDocumentFragment();
        let last = 0;
        while (i !== -1) {
            if (i > last) frag.appendChild(document.createTextNode(text.slice(last, i)));
            const mark = document.createElement('mark');
            mark.className = 'bb-ml-search-hl';
            mark.textContent = text.slice(i, i + q.length);
            frag.appendChild(mark);
            last = i + q.length;
            i = lower.indexOf(q, last);
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
    });
}

function applySearch(q) {
    bbMlQuery = (q || '').trim().toLowerCase();
    const results = document.getElementById('bbMlResults');
    if (results) clearHighlight(results);

    // Desktop rows
    getRows().forEach(row => {
        if (!bbMlQuery) { row.style.display = ''; return; }
        const hay = (row.textContent + ' ' + (row.dataset.user || '') + ' ' +
            (row.dataset.vehicle || '') + ' ' + (row.dataset.destination || '')).toLowerCase();
        const match = hay.includes(bbMlQuery);
        row.style.display = match ? '' : 'none';
        if (match) highlightRow(row, bbMlQuery);
    });

    // Mobile cards
    document.querySelectorAll('.bb-ml-trip-card').forEach(card => {
        if (!bbMlQuery) { card.style.display = ''; return; }
        const hay = (card.textContent + ' ' + (card.dataset.user || '') + ' ' +
            (card.dataset.plate || '') + ' ' + (card.dataset.destination || '')).toLowerCase();
        card.style.display = hay.includes(bbMlQuery) ? '' : 'none';
    });

    // Desktop date-group headers
    document.querySelectorAll('tr.bb-ml-date-group').forEach(g => {
        if (!bbMlQuery) { g.style.display = ''; return; }
        let sib = g.nextElementSibling, hasVisible = false;
        while (sib && !sib.classList.contains('bb-ml-date-group')) {
            if (sib.classList.contains('bb-ml-row') && sib.style.display !== 'none') { hasVisible = true; break; }
            sib = sib.nextElementSibling;
        }
        g.style.display = hasVisible ? '' : 'none';
    });

    // Mobile date headers
    document.querySelectorAll('.bb-ml-date-cell--mobile').forEach(hdr => {
        if (!bbMlQuery) { hdr.style.display = ''; return; }
        let sib = hdr.nextElementSibling, hasVisible = false;
        while (sib && !sib.classList.contains('bb-ml-date-cell--mobile')) {
            if (sib.classList.contains('bb-ml-trip-card') && sib.style.display !== 'none') { hasVisible = true; break; }
            sib = sib.nextElementSibling;
        }
        hdr.style.display = hasVisible ? '' : 'none';
    });
}

(function bindSearch() {
    const input = document.getElementById('bbMlSearch');
    if (!input) return;
    let t;
    input.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => applySearch(input.value), 150);
    });
})();

/* ══════════════════════════════════════════════════
   TABLE SORT — click header → asc → desc → none
   sortState module-level → คงอยู่หลัง AJAX swap; re-applied ใน bindSortHeaders
══════════════════════════════════════════════════ */
let sortState = { col: null, dir: 1 };

function getSortValue(row, col) {
    switch (col) {
        case 'booking':     return Number(row.dataset.booking) || 0;
        case 'distance':    return Number(row.dataset.distance) || 0;
        case 'cost':        return Number(row.dataset.cost) || 0;
        case 'odo-start':   return Number(row.dataset.odoStart) || 0;
        case 'odo-end':     return Number(row.dataset.odoEnd) || 0;
        case 'status': {
            const order = { none: 0, partial: 1, complete: 2 };
            return order[row.dataset.status] ?? 0;
        }
        case 'user':        return (row.dataset.user || '').toLowerCase();
        case 'vehicle':     return (row.dataset.vehicle || '').toLowerCase();
        case 'destination': return (row.dataset.destination || '').toLowerCase();
        default: return '';
    }
}

function applySortToTbody() {
    const table = document.querySelector('.bb-table');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    if (!sortState.col) {
        tbody.querySelectorAll('tr.bb-ml-date-group').forEach(r => r.style.display = '');
        return;
    }
    tbody.querySelectorAll('tr.bb-ml-date-group').forEach(r => r.style.display = 'none');

    const rows = Array.from(tbody.querySelectorAll('tr.bb-ml-row'));
    rows.sort((a, b) => {
        const va = getSortValue(a, sortState.col);
        const vb = getSortValue(b, sortState.col);
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sortState.dir;
        return String(va).localeCompare(String(vb), 'th') * sortState.dir;
    });
    rows.forEach(r => tbody.appendChild(r));
    if (bbMlQuery) applySearch(bbMlQuery);
}

const _MS_SORT = { 'arrow-up': 'arrow_upward', 'arrow-down': 'arrow_downward', 'chevrons-up-down': 'unfold_more' };
function updateSortIcons() {
    document.querySelectorAll('.bb-table th[data-sort]').forEach(th => {
        const col = th.dataset.sort;
        const iconEl = th.querySelector('.bb-sort-icon [data-lucide], .bb-sort-icon .material-symbols-outlined');
        if (sortState.col === col) {
            th.setAttribute('aria-sort', sortState.dir === 1 ? 'ascending' : 'descending');
        } else {
            th.removeAttribute('aria-sort');
        }
        if (!iconEl) return;
        const name = sortState.col === col
            ? (sortState.dir === 1 ? 'arrow-up' : 'arrow-down')
            : 'chevrons-up-down';
        iconEl.setAttribute('data-lucide', name);
        // MS span → set ligature ตรงๆ (deterministic, ไม่พึ่ง observer); Lucide เดิม → createIcons
        if (iconEl.classList.contains('material-symbols-outlined')) {
            iconEl.textContent = _MS_SORT[name] || name.replace(/-/g, '_');
        } else {
            bbMlInitIcons(th);
        }
    });
}

function bindSortHeaders() {
    document.querySelectorAll('.bb-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (sortState.col === col) {
                if (sortState.dir === -1) { sortState.col = null; sortState.dir = 1; }
                else sortState.dir = -1;
            } else {
                sortState.col = col;
                sortState.dir = 1;
            }
            updateSortIcons();
            applySortToTbody();
        });
    });
    updateSortIcons();
    if (sortState.col) applySortToTbody();
}

/* (re)grab refs ภายใน #bbMlResults + bind listeners — เรียกตอน init + หลังทุก swap */
function bindResults() {
    $checkAll = document.getElementById('checkAll');
    $modeAll  = document.getElementById('modeAll');
    $modeSel  = document.getElementById('modeSelected');
    $strip    = document.getElementById('summaryStrip');

    // checkbox = bb-check-box component (span) → toggle .is-on (ไม่มี native .checked)
    // is-disabled = เลือกไม่ได้ (ยังไม่ครบ)
    if ($checkAll) {
        $checkAll.addEventListener('click', function () {
            const on = !$checkAll.classList.contains('is-on');
            setCheck($checkAll, on);
            getRows().forEach(r => {
                const cb = r.querySelector('.bb-ml-row-check');
                if (cb && !cb.classList.contains('is-disabled')) setCheck(cb, on);
            });
        });
    }
    document.querySelectorAll('tr.bb-ml-row').forEach(row => {
        row.addEventListener('click', function (e) {
            if (e.target.closest('button, a')) return;   // span checkbox = ปล่อยให้ toggle
            const cb = row.querySelector('.bb-ml-row-check');
            if (cb && !cb.classList.contains('is-disabled')) setCheck(cb, !cb.classList.contains('is-on'));
        });
    });
    calcAllSummary();
    if (bbMlQuery) applySearch(bbMlQuery);    // re-apply search หลัง AJAX swap (rows ใหม่)
    bindSortHeaders();                      // re-bind sort + re-apply sortState หลัง swap
    staggerRows('#bbMlResults', { rows: 'tr.bb-ml-row, .bb-ml-trip-card', dots: '.bb-status .bb-dot, .bb-avatar' });
}

/* toggle bb-check-box (span) — class .is-on + aria */
function setCheck(el, on) {
    el.classList.toggle('is-on', on);
    el.setAttribute('aria-checked', on ? 'true' : 'false');
}

/* ══════════════════════════════════════════════════
   AJAX FILTERING — กรองโดยไม่ reload หน้า (โดยเฉพาะกรองวัน)
   fetch URL เดิม (GET) → parse #bbMlResults → swap + rebind
══════════════════════════════════════════════════ */
function bbMlInitIcons(scope) {
    const l = window.lucide;
    if (!l || !l.createIcons) return;
    try {
        const opts = { icons: l.icons || l };
        if (scope instanceof Element) opts.root = scope;
        l.createIcons(opts);
    } catch (e) { /* lucide not ready */ }
}

function buildFilterURL() {
    const form = document.getElementById('filterForm');
    const params = new URLSearchParams();
    new FormData(form).forEach((v, k) => {
        if (v !== '' && v != null) params.append(k, v);
    });
    const base = (form.getAttribute('action') || window.location.pathname).split('?')[0];
    const qs = params.toString();
    return base + (qs ? '?' + qs : '');
}

function syncExportLink(url) {
    const link = document.getElementById('exportLink');
    if (!link) return;
    const qs   = url.split('?')[1] || '';
    const base = link.getAttribute('href').split('?')[0];
    link.setAttribute('href', base + (qs ? '?' + qs : ''));
}

let _bbMlReqToken = 0;
async function runFilter() {
    const results = document.getElementById('bbMlResults');
    const form    = document.getElementById('filterForm');
    if (!results || !form) { if (form) form.submit(); return; }

    const url   = buildFilterURL();
    const token = ++_bbMlReqToken;
    results.classList.add('is-loading');
    const _skelAt = showSkeleton(results, { count: Math.min(getRows().length || 5, 6) });   // B4 — skeleton ระหว่างโหลด
    try {
        const res = await fetch(url, {
            headers: { 'X-Requested-With': 'fetch' },
            credentials: 'same-origin'
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        if (token !== _bbMlReqToken) return;            // มี request ใหม่กว่า → ทิ้งผลเก่า
        if (_skelAt) {                                   // ให้ skeleton โชว์ ≥ SKEL_MIN_MS กัน flash
            const left = SKEL_MIN_MS - (performance.now() - _skelAt);
            if (left > 0) { await sleep(left); if (token !== _bbMlReqToken) return; }
        }
        const doc   = new DOMParser().parseFromString(text, 'text/html');
        const fresh = doc.getElementById('bbMlResults');
        if (!fresh) throw new Error('no #bbMlResults in response');
        results.innerHTML = fresh.innerHTML;
        bbMlInitIcons(results);
        bindResults();
        // ไม่ pushState — ตั้งใจไม่ให้ query string ค้าง address bar
        // เพื่อให้ reload หน้าเสมอกลับไป default filter (ไม่ใช่ filter เดิม)
        syncExportLink(url);
    } catch (e) {
        window.location.href = url;                     // fallback: full nav
    } finally {
        if (token === _bbMlReqToken) results.classList.remove('is-loading');
    }
}

/* intercept native submit (เช่น Enter ในช่อง search/cost) → AJAX */
(function bindFilterFormAjax() {
    const form = document.getElementById('filterForm');
    if (!form) return;
    form.addEventListener('submit', e => {
        e.preventDefault();
        runFilter();
    });
})();

/* ── Export link: sync กับ filter ปัจจุบันตอนโหลด ── */
syncExportLink(window.location.href);

/* ── Expose to window for legacy onclick handlers ── */
Object.assign(window, { openMileage, clearSelection });

/* ── Init ─────────────────────────────────────── */
bindResults();
