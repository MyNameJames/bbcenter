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

/* ── Budget filter: sub-options follow type (pattern: updateExpSubDropdown) ── */
(function bindBudgetFilter() {
    const typeSel = document.getElementById('filterBudgetType');
    const subSel  = document.getElementById('filterBudgetSub');
    const subWrap = document.getElementById('filterBudgetSubWrap');
    if (!typeSel || !subSel || !subWrap) return;

    const cats = window.EXPENSE_CATS || { central: [], department: [] };
    const initialSub = window.MLG_FILTER_SUB || '';

    function updateBudgetSubDropdown() {
        const t = typeSel.value;
        if (t !== 'central' && t !== 'department') {
            subWrap.style.display = 'none';
            subSel.innerHTML = '<option value="">ทั้งหมด</option>';
            return;
        }
        subWrap.style.display = '';
        const list    = cats[t] || [];
        const prevKey = subSel.value || initialSub;
        subSel.innerHTML = '<option value="">ทั้งหมด</option>' +
            list.map(x => `<option value="${x.key}" ${x.key === prevKey ? 'selected' : ''}>${x.label}</option>`).join('');
    }
    typeSel.addEventListener('change', updateBudgetSubDropdown);
    updateBudgetSubDropdown();
})();

/* ── Selection / Summary ──────────────────────── */
const $checkAll = document.getElementById('checkAll');
const $modeAll  = document.getElementById('modeAll');
const $modeSel  = document.getElementById('modeSelected');
const $strip    = document.getElementById('summaryStrip');

function getRows() {
    return Array.from(document.querySelectorAll('tr.mlg-row'));
}

function recalcSummary() {
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

function clearSelection() {
    document.querySelectorAll('.mlg-row-check').forEach(cb => { cb.checked = false; });
    if ($checkAll) { $checkAll.checked = false; $checkAll.indeterminate = false; }
    recalcSummary();
}

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

/* ── Export link: sync with current filter ────── */
(function syncExport() {
    const link = document.getElementById('exportLink');
    if (!link) return;
    const params = new URLSearchParams(window.location.search);
    const qs = params.toString();
    if (qs) link.href = link.href + (link.href.includes('?') ? '&' : '?') + qs;
})();

/* ── Expose to window for legacy onclick handlers ── */
Object.assign(window, { openMileage, goEditEnd, clearSelection });

/* ── Init ─────────────────────────────────────── */
calcAllSummary();
recalcSummary();
