/* ══════════════════════════════════════════════════
   pages/mileage-admin.js — Mileage Admin (ES module)
   Modal 3-state (start/end/complete), realtime cost preview,
   checkbox selection summary, export-link sync.
══════════════════════════════════════════════════ */

const FUEL_PRICE = window.MLG_FUEL_PRICE || 40;

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

function nowTimestampLabel() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear() + 543}  ${pad(d.getHours())}:${pad(d.getMinutes())} น.`;
}

/* ── State refs ───────────────────────────────── */
const $modal        = document.getElementById('mileageModal');
const formStart     = document.getElementById('formStart');
const formEnd       = document.getElementById('formEnd');
const stateComplete = document.getElementById('stateComplete');
let bsModal    = null;
let currentRow = null;

function showState(which) {
    formStart.style.display     = which === 'start'    ? 'block' : 'none';
    formEnd.style.display       = which === 'end'      ? 'block' : 'none';
    stateComplete.style.display = which === 'complete' ? 'block' : 'none';
}

/* ── Modal open ───────────────────────────────── */
function openMileage(btn) {
    const row = btn.closest('tr.mlg-row');
    if (!row) return;
    currentRow = row;

    const ds = row.dataset;
    document.getElementById('mmBookingId').textContent = 'BK-' + ds.booking;
    document.getElementById('mmUser').textContent      = ds.user || '—';
    document.getElementById('mmTime').textContent      = ds.time || '—';
    document.getElementById('mmVehicle').textContent   = ds.vehicle || '—';
    document.getElementById('mmDest').textContent      = ds.destination || '—';

    const odoStart   = ds.odoStart ? Number(ds.odoStart) : null;
    const odoEnd     = ds.odoEnd   ? Number(ds.odoEnd)   : null;
    const fuelRate   = Number(ds.fuelRate) || 10;
    const manualFuel = ds.manualFuel ? Number(ds.manualFuel) : null;

    if (!odoStart) {
        document.getElementById('fsBookingId').value = ds.booking;
        document.getElementById('fsActualStart').value = nowTimestampValue();
        document.getElementById('fsTimeLabel').textContent = nowTimestampLabel();
        document.getElementById('fsOdo').value = '';
        showState('start');
    } else if (!odoEnd) {
        document.getElementById('feBookingId').value = ds.booking;
        document.getElementById('feActualEnd').value = nowTimestampValue();
        document.getElementById('feOdoStartRef').textContent = fmt(odoStart) + ' กม.';
        document.getElementById('feFuelRate').textContent = fuelRate;
        document.getElementById('feOdoEnd').value = '';
        document.getElementById('feFuelManual').value = '';
        document.getElementById('feRefuel').checked = false;
        document.getElementById('feRefuelWrap').style.display = 'none';
        document.getElementById('fePreview').style.display = 'none';
        document.getElementById('feOdoErr').style.display = 'none';
        document.getElementById('feSubmit').disabled = true;
        formEnd.dataset.odoStart = odoStart;
        formEnd.dataset.fuelRate = fuelRate;
        showState('end');
    } else {
        const distance = odoEnd - odoStart;
        const formulaCost = (distance / fuelRate) * FUEL_PRICE;
        document.getElementById('cOdoStart').textContent     = fmt(odoStart);
        document.getElementById('cOdoEnd').textContent       = fmt(odoEnd);
        document.getElementById('cDistance').textContent     = fmt(distance);
        document.getElementById('cCostFormula').textContent  = fmt(formulaCost);
        const manualRow = document.getElementById('cManualRow');
        if (manualFuel && manualFuel > 0) {
            manualRow.style.display = 'flex';
            document.getElementById('cCostManual').textContent = fmt(manualFuel);
        } else {
            manualRow.style.display = 'none';
        }
        showState('complete');
    }

    if (!bsModal) bsModal = new bootstrap.Modal($modal);
    bsModal.show();
}

function goEditEnd() {
    if (!currentRow) return;
    const ds = currentRow.dataset;
    const odoStart = Number(ds.odoStart);
    const fuelRate = Number(ds.fuelRate) || 10;
    document.getElementById('feBookingId').value = ds.booking;
    document.getElementById('feActualEnd').value = nowTimestampValue();
    document.getElementById('feOdoStartRef').textContent = fmt(odoStart) + ' กม.';
    document.getElementById('feFuelRate').textContent = fuelRate;
    document.getElementById('feOdoEnd').value = ds.odoEnd || '';
    document.getElementById('feFuelManual').value = ds.manualFuel || '';
    formEnd.dataset.odoStart = odoStart;
    formEnd.dataset.fuelRate = fuelRate;
    recalcEndPreview();
    showState('end');
}

/* ── Realtime preview (state 2) ───────────────── */
function recalcEndPreview() {
    const odoStart = Number(formEnd.dataset.odoStart || 0);
    const fuelRate = Number(formEnd.dataset.fuelRate || 10);
    const odoEnd   = Number(document.getElementById('feOdoEnd').value || 0);
    const preview  = document.getElementById('fePreview');
    const errBox   = document.getElementById('feOdoErr');
    const submit   = document.getElementById('feSubmit');

    if (!odoEnd) {
        preview.style.display = 'none';
        errBox.style.display = 'none';
        submit.disabled = true;
        return;
    }
    if (odoEnd <= odoStart) {
        preview.style.display = 'none';
        errBox.style.display = 'block';
        submit.disabled = true;
        return;
    }
    errBox.style.display = 'none';
    const distance = odoEnd - odoStart;
    const cost     = (distance / fuelRate) * FUEL_PRICE;
    document.getElementById('feCalcDistance').textContent = fmt(distance);
    document.getElementById('feCalcCost').textContent     = fmt(cost);
    preview.style.display = 'block';
    submit.disabled = false;
}

document.getElementById('feOdoEnd').addEventListener('input', recalcEndPreview);

document.getElementById('feRefuel').addEventListener('change', function () {
    document.getElementById('feRefuelWrap').style.display = this.checked ? 'block' : 'none';
});

/* ── Toolbar: status chips ────────────────────── */
(function bindStatusChips() {
    const form = document.getElementById('filterForm');
    const hidden = document.getElementById('statusFilter');
    if (!form || !hidden) return;
    document.querySelectorAll('.mlg-status-chips .mlg-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            hidden.value = btn.dataset.status || '';
            // update active state ทันที (ไม่ reload → server ไม่ได้ render ให้)
            document.querySelectorAll('.mlg-status-chips .mlg-chip')
                .forEach(c => c.classList.toggle('is-active', c === btn));
            runFilter();
        });
    });
})();

/* ── Toolbar: advanced filter popover ──────────── */
(function bindAdvToggle() {
    const btn   = document.getElementById('advFilterBtn');
    const sheet = document.getElementById('advSheet');
    if (!btn || !sheet) return;

    const isOpen = () => !sheet.hasAttribute('hidden');
    function setOpen(open) {
        if (open) sheet.removeAttribute('hidden');
        else sheet.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', String(open));
    }

    // stopPropagation: keep our own outside-click handler from closing
    // immediately on the same click that opened it.
    btn.addEventListener('click', e => { e.stopPropagation(); setOpen(!isOpen()); });

    // close on click outside (clicks inside the popover — incl. its
    // vc-dd dropdowns, which are descendants — keep it open)
    document.addEventListener('click', e => {
        if (!isOpen()) return;
        if (sheet.contains(e.target) || btn.contains(e.target)) return;
        setOpen(false);
    });

    // close on Esc
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && isOpen()) { setOpen(false); btn.focus(); }
    });
})();

/* ── Toolbar: date preset ─────────────────────── */
(function bindDatePreset() {
    const preset = document.getElementById('datePreset');
    const form   = document.getElementById('filterForm');
    const dStart = form && form.querySelector('input[name="date_start"]');
    const dEnd   = form && form.querySelector('input[name="date_end"]');
    const showAll = document.getElementById('showAllInput');
    const rangeGroup = document.getElementById('dateRangeGroup');
    if (!preset || !form || !dStart || !dEnd) return;

    const fmt = d => d.toISOString().slice(0, 10);
    const today = () => new Date();
    const daysAgo = n => { const d = today(); d.setDate(d.getDate() - n); return d; };
    const monthStart = () => { const d = today(); d.setDate(1); return d; };

    // Initial preset detection
    function detectInitial() {
        if (showAll && showAll.value === '1') return 'all';
        if (!dStart.value && !dEnd.value) return 'month';
        return 'custom';
    }
    preset.value = detectInitial();
    if (preset.value === 'custom') rangeGroup.removeAttribute('hidden');
    else if (preset.value === 'all') rangeGroup.setAttribute('hidden', '');
    else rangeGroup.setAttribute('hidden', '');

    preset.addEventListener('change', () => {
        const v = preset.value;
        if (v === 'custom') {
            rangeGroup.removeAttribute('hidden');
            if (showAll) showAll.value = '';
            return; // wait for user to pick dates + click Apply
        }
        rangeGroup.setAttribute('hidden', '');
        if (v === 'all') {
            dStart.value = '';
            dEnd.value = '';
            if (showAll) showAll.value = '1';
        } else if (v === 'month') {
            dStart.value = '';
            dEnd.value = '';
            if (showAll) showAll.value = '';
        } else if (v === '7d') {
            dStart.value = fmt(daysAgo(7));
            dEnd.value = fmt(today());
            if (showAll) showAll.value = '';
        } else if (v === '30d') {
            dStart.value = fmt(daysAgo(30));
            dEnd.value = fmt(today());
            if (showAll) showAll.value = '';
        }
        runFilter();
    });
})();

/* ── Toolbar: custom date-range calendar pickers (แทน native date input) ──
   2 instance (start/end) ใช้ .va-cal popover (style จาก vehicle_admin.css).
   คลิกปุ่ม → ปฏิทินเปิด → คลิกวัน → set hidden input + submit form ทันที. */
(function bindDateRangePickers() {
    const form    = document.getElementById('filterForm');
    const pickers = document.querySelectorAll('#dateRangeGroup [data-datepick]');
    if (!form || !pickers.length) return;

    const TH_DAYS_S = ['อา','จ','อ','พ','พฤ','ศ','ส'];
    const TH_MON_F  = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                       'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    const TH_MON_S  = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                       'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    const showAll = document.getElementById('showAllInput');

    const pad2  = n => String(n).padStart(2, '0');
    const toISO = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sameDay = (a, b) => a.getFullYear() === b.getFullYear() &&
                             a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    function parseISO(v) {
        if (!v) return null;
        const [y, m, d] = v.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return isNaN(dt.getTime()) ? null : dt;
    }

    const instances = [];
    function closeAll(except) {
        instances.forEach(i => { if (i.root !== except) i.close(); });
    }

    pickers.forEach(root => {
        const btn      = root.querySelector('[data-datepick-btn]');
        const labelEl  = root.querySelector('[data-datepick-label]');
        const input    = root.querySelector('[data-datepick-input]');
        const pop      = root.querySelector('[data-datepick-pop]');
        const dowWrap  = root.querySelector('[data-cal-dow]');
        const daysWrap = root.querySelector('[data-cal-days]');
        const titleEl  = root.querySelector('[data-cal-title]');
        const prevBtn  = root.querySelector('[data-cal-prev]');
        const nextBtn  = root.querySelector('[data-cal-next]');
        if (!btn || !input || !pop) return;

        const placeholder = labelEl.textContent.trim();
        let cursor = parseISO(input.value) || new Date(today);

        function syncLabel() {
            const sel = parseISO(input.value);
            if (sel) {
                labelEl.textContent = `${sel.getDate()} ${TH_MON_S[sel.getMonth()]} ${sel.getFullYear() + 543}`;
                btn.classList.add('mlg-date-btn--filled');
            } else {
                labelEl.textContent = placeholder;
                btn.classList.remove('mlg-date-btn--filled');
            }
        }

        function render() {
            const y = cursor.getFullYear(), m = cursor.getMonth();
            titleEl.textContent = `${TH_MON_F[m]} ${y + 543}`;
            if (!dowWrap.childElementCount) {
                dowWrap.innerHTML = TH_DAYS_S.map((d, i) => {
                    const c = i === 0 ? ' va-cal-dow-cell--sun' : i === 6 ? ' va-cal-dow-cell--sat' : '';
                    return `<span class="va-cal-dow-cell${c}">${d}</span>`;
                }).join('');
            }
            const sel = parseISO(input.value);
            const startPad = new Date(y, m, 1).getDay();
            const days = new Date(y, m + 1, 0).getDate();
            let cells = '';
            for (let i = 0; i < startPad; i++) cells += `<span class="va-cal-cell va-cal-cell--empty"></span>`;
            for (let dn = 1; dn <= days; dn++) {
                const d = new Date(y, m, dn), dow = d.getDay();
                let cls = 'va-cal-cell';
                if (sel && sameDay(d, sel)) cls += ' va-cal-cell--active';
                if (sameDay(d, today))      cls += ' va-cal-cell--today';
                if (dow === 0)      cls += ' va-cal-cell--sun';
                else if (dow === 6) cls += ' va-cal-cell--sat';
                cells += `<button type="button" class="${cls}" data-date="${toISO(d)}">${dn}</button>`;
            }
            daysWrap.innerHTML = cells;
        }

        function open() {
            closeAll(root);
            cursor = parseISO(input.value) || new Date(today);
            render();
            pop.hidden = false;
            btn.setAttribute('aria-expanded', 'true');
        }
        function close() {
            pop.hidden = true;
            btn.setAttribute('aria-expanded', 'false');
        }

        btn.addEventListener('click', e => {
            e.stopPropagation();
            if (pop.hidden) open(); else close();
        });
        prevBtn.addEventListener('click', e => {
            e.stopPropagation();
            cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
            render();
        });
        nextBtn.addEventListener('click', e => {
            e.stopPropagation();
            cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
            render();
        });
        daysWrap.addEventListener('click', e => {
            const cell = e.target.closest('[data-date]');
            if (!cell) return;
            input.value = cell.dataset.date;
            if (showAll) showAll.value = '';
            syncLabel();
            close();
            runFilter();
        });

        syncLabel();
        instances.push({ root, close });
    });

    document.addEventListener('click', e => {
        instances.forEach(i => { if (!i.root.contains(e.target)) i.close(); });
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(null); });
})();

/* ── Budget filter: sub-options follow type (pattern: updateExpSubDropdown) ── */
(function bindBudgetFilter() {
    const typeSel  = document.getElementById('filterBudgetType');
    const subSel   = document.getElementById('filterBudgetSub');
    const subWrap  = document.getElementById('filterBudgetSubWrap');
    const typeWrap = document.getElementById('filterBudgetTypeWrap');
    if (!typeSel || !subSel || !subWrap) return;

    const cats = window.EXPENSE_CATS || { central: [], department: [] };
    const initialSub = window.MLG_FILTER_SUB || '';

    function updateBudgetSubDropdown() {
        const t = typeSel.value;
        if (t !== 'central' && t !== 'department') {
            subWrap.style.display = 'none';
            subSel.innerHTML = '<option value="">ทั้งหมด</option>';
            // ไม่มีหมวด/กอง → "งบ" ขยายเต็ม 2 col
            if (typeWrap) typeWrap.classList.add('mlg-adv-col-full');
            return;
        }
        subWrap.style.display = '';
        // มีหมวด/กอง → "งบ" เหลือ 1 col, sub อยู่ข้างๆ
        if (typeWrap) typeWrap.classList.remove('mlg-adv-col-full');
        const list    = cats[t] || [];
        const prevKey = subSel.value || initialSub;
        subSel.innerHTML = '<option value="">ทั้งหมด</option>' +
            list.map(x => `<option value="${x.key}" ${x.key === prevKey ? 'selected' : ''}>${x.label}</option>`).join('');
    }
    typeSel.addEventListener('change', updateBudgetSubDropdown);
    updateBudgetSubDropdown();
})();

/* ── Selection / Summary (re-bindable หลัง AJAX swap) ── */
let $checkAll, $modeAll, $modeSel, $strip;

function getRows() {
    return Array.from(document.querySelectorAll('tr.mlg-row'));
}

function recalcSummary() {
    if (!$strip) return;
    const rows = getRows();
    const selected = rows.filter(r => {
        const cb = r.querySelector('.mlg-row-check');
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
        const cb = r.querySelector('.mlg-row-check');
        return cb && !cb.disabled;
    });
    if (enabled.length === 0) {
        $checkAll.indeterminate = false;
        $checkAll.checked = false;
    } else if (enabled.every(r => r.querySelector('.mlg-row-check').checked)) {
        $checkAll.indeterminate = false;
        $checkAll.checked = true;
    } else if (enabled.some(r => r.querySelector('.mlg-row-check').checked)) {
        $checkAll.indeterminate = true;
    } else {
        $checkAll.indeterminate = false;
        $checkAll.checked = false;
    }
}

function calcAllSummary() {
    const rows = getRows();
    let d = 0, c = 0;
    rows.forEach(r => {
        d += Number(r.dataset.distance || 0);
        c += Number(r.dataset.cost || 0);
    });
    const elD = document.getElementById('sumAllDistance');
    const elC = document.getElementById('sumAllCost');
    if (elD) elD.textContent = fmt(d);
    if (elC) elC.textContent = fmt(c);
}

function clearSelection() {
    document.querySelectorAll('.mlg-row-check').forEach(cb => { cb.checked = false; });
    if ($checkAll) { $checkAll.checked = false; $checkAll.indeterminate = false; }
    recalcSummary();
}

/* (re)grab refs ภายใน #mlgResults + bind listeners — เรียกตอน init + หลังทุก swap */
function bindResults() {
    $checkAll = document.getElementById('checkAll');
    $modeAll  = document.getElementById('modeAll');
    $modeSel  = document.getElementById('modeSelected');
    $strip    = document.getElementById('summaryStrip');

    if ($checkAll) {
        $checkAll.addEventListener('change', function () {
            const checked = this.checked;
            getRows().forEach(r => {
                const cb = r.querySelector('.mlg-row-check');
                if (cb && !cb.disabled) cb.checked = checked;
            });
            recalcSummary();
        });
    }
    document.querySelectorAll('.mlg-row-check').forEach(cb => {
        cb.addEventListener('change', recalcSummary);
    });
    document.querySelectorAll('tr.mlg-row').forEach(row => {
        row.addEventListener('click', function (e) {
            if (e.target.closest('button, input, a')) return;
            const cb = row.querySelector('.mlg-row-check');
            if (cb && !cb.disabled) {
                cb.checked = !cb.checked;
                recalcSummary();
            }
        });
    });
    calcAllSummary();
    recalcSummary();
}

/* ══════════════════════════════════════════════════
   AJAX FILTERING — กรองโดยไม่ reload หน้า (โดยเฉพาะกรองวัน)
   fetch URL เดิม (GET) → parse #mlgResults → swap + rebind
══════════════════════════════════════════════════ */
function mlgInitIcons(scope) {
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

let _mlgReqToken = 0;
async function runFilter(push = true) {
    const results = document.getElementById('mlgResults');
    const form    = document.getElementById('filterForm');
    if (!results || !form) { if (form) form.submit(); return; }

    const url   = buildFilterURL();
    const token = ++_mlgReqToken;
    results.classList.add('is-loading');
    try {
        const res = await fetch(url, {
            headers: { 'X-Requested-With': 'fetch' },
            credentials: 'same-origin'
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        if (token !== _mlgReqToken) return;            // มี request ใหม่กว่า → ทิ้งผลเก่า
        const doc   = new DOMParser().parseFromString(text, 'text/html');
        const fresh = doc.getElementById('mlgResults');
        if (!fresh) throw new Error('no #mlgResults in response');
        results.innerHTML = fresh.innerHTML;
        mlgInitIcons(results);
        bindResults();
        if (push) history.pushState({ mlg: true }, '', url);
        syncExportLink(url);
    } catch (e) {
        window.location.href = url;                     // fallback: full nav
    } finally {
        if (token === _mlgReqToken) results.classList.remove('is-loading');
    }
}

/* back/forward → reload ให้ server render state ตาม URL (ตรงเสมอ) */
window.addEventListener('popstate', () => { window.location.reload(); });

/* intercept native submit (ปุ่ม "นำไปใช้" ใน adv-sheet) → AJAX */
(function bindFilterFormAjax() {
    const form = document.getElementById('filterForm');
    if (!form) return;
    form.addEventListener('submit', e => {
        e.preventDefault();
        // ปิด adv-filter popover — runFilter swap แค่ #mlgResults
        // (popover อยู่นอก region นั้น เลยไม่ปิดเองหลังกด "นำไปใช้")
        const sheet = document.getElementById('advSheet');
        const advBtn = document.getElementById('advFilterBtn');
        if (sheet) sheet.setAttribute('hidden', '');
        if (advBtn) advBtn.setAttribute('aria-expanded', 'false');
        runFilter();
    });
})();

/* ── Export link: sync กับ filter ปัจจุบันตอนโหลด ── */
syncExportLink(window.location.href);

/* ── Expose to window for legacy onclick handlers ── */
Object.assign(window, { openMileage, goEditEnd, clearSelection });

/* ── Init ─────────────────────────────────────── */
bindResults();
