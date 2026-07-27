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

/* ── OT breakdown + segmented bar (Case 17 merge, 2026-07-22) ──
   โชว์เฉพาะทริปที่ปิดแล้ว (state==='complete') — ข้อมูลมาจาก DriverOT/DriverOTSlot ที่
   auto_generate_ot()/close_trip() คำนวณ+commit ไปแล้วจริง ไม่ใช่ preview ก่อน submit ── */
function hmToMin(hm) {
    const [h, m] = hm.split(':').map(Number);
    return h * 60 + m;
}

function buildOtBarSegments(actualStart, actualEnd, slots) {
    const tStart = hmToMin(actualStart);
    let tEnd = hmToMin(actualEnd);
    if (tEnd <= tStart) tEnd += 24 * 60; // ข้ามเที่ยงคืน
    const total = tEnd - tStart;
    if (total <= 0) return [];

    const norm = slots.map(s => {
        let ss = hmToMin(s.start_time);
        let se = hmToMin(s.end_time);
        if (ss < tStart) ss += 24 * 60;
        if (se <= ss) se += 24 * 60;
        return { ss, se };
    }).sort((a, b) => a.ss - b.ss);

    const segments = [];
    let cursor = tStart;
    norm.forEach(s => {
        if (s.ss > cursor) segments.push({ pct: (s.ss - cursor) / total * 100, type: 'regular' });
        segments.push({ pct: (Math.min(s.se, tEnd) - s.ss) / total * 100, type: 'ot' });
        cursor = Math.max(cursor, s.se);
    });
    if (cursor < tEnd) segments.push({ pct: (tEnd - cursor) / total * 100, type: 'regular' });
    return segments;
}

function timeOnly(fullDatetime) {
    // data-actual-start/-end เป็น datetime-local เต็ม (YYYY-MM-DDTHH:MM) ตั้งแต่ 2026-07-22
    // เพื่อให้ pre-fill hidden field ตอนแก้ไขได้โดยไม่ทับเวลาจริงด้วย now() — ที่นี่เอาแค่ HH:MM มาโชว์
    return fullDatetime && fullDatetime.includes('T') ? fullDatetime.split('T')[1] : (fullDatetime || '');
}

function renderOtStop(ds, state) {
    const stop = document.getElementById('mmOtStop');
    let slots = [];
    try { slots = JSON.parse(ds.otSlots || '[]'); } catch (e) { slots = []; }

    if (state !== 'complete' || !slots.length) {
        stop.style.display = 'none';
        return;
    }
    stop.style.display = '';

    const actualStart = timeOnly(ds.actualStart);
    const actualEnd   = timeOnly(ds.actualEnd);

    const totalMinutes = slots.reduce((sum, s) => sum + Number(s.hours) * 60, 0);
    const totalHours   = slots.reduce((sum, s) => sum + Number(s.hours), 0);
    const otText = totalMinutes < 60 ? `${Math.round(totalMinutes)} นาที` : `${totalHours.toFixed(2)} ชม.`;
    document.getElementById('mmOtTimeRange').textContent =
        `${actualStart || '—'} - ${actualEnd || '—'} (OT : ${otText})`;

    document.getElementById('mmOtRates').innerHTML = slots.map(s => `
        <div class="text-muted" style="font-size:.8125rem">
            OT rate (${s.label}) : ${fmt(s.rate)} บาท/ชม. (รวมเป็น <b style="color:var(--bb-str)">${fmt(s.amount)} บาท</b>)
        </div>
    `).join('');

    if (actualStart && actualEnd) {
        const segments = buildOtBarSegments(actualStart, actualEnd, slots);
        document.getElementById('mmOtBar').innerHTML = segments.map(s =>
            `<div style="width:${s.pct}%;background:var(${s.type === 'ot' ? '--bb-wr' : '--bb-n200'})"></div>`
        ).join('');
        const boundaries = [actualStart, ...slots.flatMap(s => [s.start_time, s.end_time]), actualEnd];
        document.getElementById('mmOtBarLabels').innerHTML =
            [...new Set(boundaries)].map(t => `<span class="bb-num">${t}</span>`).join('');
    }
}

function renderCostStop(ds, state) {
    const stop = document.getElementById('mmCostStop');
    if (state !== 'complete') {
        stop.style.display = 'none';
        return;
    }
    stop.style.display = '';

    const distance = ds.distance ? Number(ds.distance) : 0;
    const fuelCost = ds.cost     ? Number(ds.cost)      : 0;
    const otTotal  = ds.otTotal  ? Number(ds.otTotal)   : 0;

    document.getElementById('mmCostDistanceLine').textContent = `ระยะทางทั้งหมด ${fmt(distance)} กม.`;
    document.getElementById('mmCostFuelInfo').textContent = (ds.fuelPrice && ds.fuelRate)
        ? `ราคาน้ำมันต่อลิตร ${fmt(ds.fuelPrice)} บาท (${fmt(ds.fuelRate)} กม. ต่อลิตร)`
        : '—';
    document.getElementById('mmCostBreakdown').textContent = `ค่าน้ำมัน : ${fmt(fuelCost)} บาท / ค่า OT ${fmt(otTotal)} บาท`;
    document.getElementById('mmCostTotal').textContent = `รวมทั้งหมด ${fmt(fuelCost + otTotal)} บาท`;
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
    document.getElementById('mmDriverPhone').textContent = (ds.driver && ds.phone) ? `${ds.driver} | โทร ${ds.phone}` : (ds.driver || ds.phone || '—');
    document.getElementById('mmBudgetLine').textContent  = ds.budgetSub ? `${ds.budgetLabel || ''}-${ds.budgetSub}` : (ds.budgetLabel || '—');
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
    // <i data-lucide> ถูก ms-icons.js แปลงเป็น <span class="material-symbols-outlined" data-lucide="..."> แล้ว
    // ('svg, i' เจอ null เพราะ tag เดิมไม่เหลือแล้วหลัง shim ทำงาน)
    const avatarIcon = avatar.querySelector('svg, i, [data-lucide]');
    if (avatarIcon) avatarIcon.style.color = `var(${AVATAR_ICON_COLOR[state]})`;

    clearEndError();

    // ทั้งสองช่องแก้ได้เสมอ ไม่ผูกกับ state (admin เท่านั้น — 2026-07-22): submit handler
    // จะตัดสินใจเองว่าค่าไหนถูกกรอกมาบ้าง แล้วเลือก entry_type ให้ตรง
    mmOdoStart.disabled = false;
    mmOdoStart.required = false;
    mmOdoEnd.disabled   = false;
    mmOdoEnd.required   = false;

    // คง actual_start/actual_end เดิมไว้ถ้ามีอยู่แล้ว (แก้แค่ตัวเลขไมล์ ไม่ควรทับเวลาจริงด้วย
    // now()) — เติม now() เฉพาะช่องที่ยังไม่เคยมีค่าจริง
    document.getElementById('mmActualStart').value = ds.actualStart || nowTimestampValue();
    document.getElementById('mmActualEnd').value   = ds.actualEnd   || '';

    if (state === 'none') {
        mmOdoStart.value = '';
        mmOdoEnd.value   = '';
        mmEntryType.value = 'start';
    } else {
        mmOdoStart.value = odoStart;
        mmOdoEnd.value   = odoEnd || '';
        mmEntryType.value = 'end';
    }

    renderOtStop(ds, state);
    renderCostStop(ds, state);

    if (!bsModal) bsModal = new bootstrap.Modal($modal);
    bsModal.show();
}

mmOdoEnd.addEventListener('input', clearEndError);

formMileage.addEventListener('submit', function (e) {
    // เลือก entry_type จากค่าที่กรอกจริงตอน submit ไม่ใช่ state ตอนเปิด modal (ทั้งสองช่อง
    // แก้ได้เสมอแล้ว — 2026-07-22)
    const hasStart = mmOdoStart.value.trim() !== '';
    const hasEnd   = mmOdoEnd.value.trim()   !== '';
    const priorStart = currentRow ? currentRow.dataset.odoStart : '';

    if (!hasStart && !hasEnd) { e.preventDefault(); return; }
    // กันกรอกแค่เลขไมล์กลับทั้งที่ยังไม่มีเลขไมล์ออกเลย ทั้งในฟอร์มและในระบบ (สร้าง record
    // end-only ที่ผิดปกติไม่ได้)
    if (hasEnd && !hasStart && !priorStart) { e.preventDefault(); return; }

    mmEntryType.value = (hasStart && hasEnd) ? 'both' : (hasEnd ? 'end' : 'start');

    if (!document.getElementById('mmActualStart').value) {
        document.getElementById('mmActualStart').value = nowTimestampValue();
    }
    if ((mmEntryType.value === 'end' || mmEntryType.value === 'both') &&
        !document.getElementById('mmActualEnd').value) {
        document.getElementById('mmActualEnd').value = nowTimestampValue();
    }

    if (mmEntryType.value !== 'end' && mmEntryType.value !== 'both') return;
    const start = Number(mmOdoStart.value || priorStart || 0);
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

/* ── KPI action cards: คลิก "งานยังไม่ครบ"/"รอยืนยันจ่ายส่วนตัว" → set filter → runFilter()
   (ตาม pattern bindStatusTabs — reuse runFilter() เดิม ห้ามเขียน fetch ใหม่) ── */
(function bindKpiFilters() {
    function onActivate(el, fn) {
        el.addEventListener('click', fn);
        el.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
        });
    }

    const missingCard = document.querySelector('[data-kpi-filter="incomplete"]');
    if (missingCard) onActivate(missingCard, () => {
        // มี tab "ยังไม่ครบ" อยู่แล้ว → จำลองคลิก tab (ได้ทั้ง hidden input + active state + runFilter)
        const tab = document.querySelector('#statusTabs .tab2-tab[data-tab="incomplete"]');
        if (tab) { tab.click(); return; }
        const hidden = document.getElementById('statusFilter');
        if (hidden) { hidden.value = 'incomplete'; runFilter(); }
    });

    const pendingCard = document.querySelector('[data-kpi-filter="pending_personal"]');
    if (pendingCard) onActivate(pendingCard, () => {
        const hidden = document.getElementById('pendingPersonalFilter');
        if (!hidden) return;
        hidden.value = '1';
        runFilter();
    });
})();

/* ── Filter (chip filter + date range) → trigger AJAX ──
   bb_filter/.bb-filter-btn (cost slider + ล้างการเลือก) ถูกลบออกจากหน้านี้แล้ว (2026-07-22)
   booker combo (filterBookerCombo) ก็ถูกลบออกจากหน้านี้แล้วเช่นกัน (2026-07-22)
   — chip filter (vehicle/driver/budget_type/budget_sub) เป็น toolbar chip เดี่ยวทั้งหมด
   ue-chip:change ยิงเมื่อ chip filter เปลี่ยน (ue_chip_dd, bb-components.js) */
document.addEventListener('bb-daterange:change', () => runFilter());
document.addEventListener('ue-chip:change', () => runFilter());

/* chip filter (ue_chip_dd, radio single-select) + budget cascade
   ue_chip_dd เปิด/ปิด/label sync = JS ของ bb-components.js (initUeChipDd) ทั้งหมด — ที่นี่ผูกแค่ cascade
   ⚠️ popover ของ ue_chip_dd portal ออกไป document.body ตอนเปิดเสมอ →
      ต้อง capture reference ของ [data-ue-chip-body] ไว้ตรงๆ ตั้งแต่แรก ห้าม querySelector ซ้ำผ่าน ancestor
      (ancestor.querySelector หา popover ที่ portal ออกไปแล้วไม่เจอ)
   budget_type เปลี่ยน → rebuild ตัวเลือก budget_sub (cascade) — คง id="filterBudgetSubSec" ไว้เพื่อ show/hide */
(function bindFilterControls() {
    const cats       = window.EXPENSE_CATS || { central: [], department: [] };
    const initialSub = window.BBML_FILTER_SUB || '';
    const subSec     = document.getElementById('filterBudgetSubSec');

    function ddBody(id) {
        const dd = document.getElementById(id);
        return dd ? dd.querySelector('[data-ue-chip-body]') : null;
    }
    const budgetTypeBody = ddBody('ddBudgetTypeFilter');
    const budgetSubBody  = ddBody('ddBudgetSubFilter');

    function optRow(name, value, label, checked) {
        return `<label class="ue-chip-opt"><span>${label}</span><input type="radio" name="${name}" value="${value}"${checked ? ' checked' : ''}></label>`;
    }

    // budget_type → rebuild ตัวเลือก budget_sub (cascade) · เขียน DOM ตรงๆ (ไม่ยิง change ที่นี่ —
    // ue-chip:change ของ budget_type เองพอสำหรับ trigger runFilter แล้ว)
    function rebuildBudgetSub(type) {
        if (!budgetSubBody) return;
        const isSub = type === 'central' || type === 'department';
        if (subSec) subSec.hidden = !isSub;
        const list = isSub ? (cats[type] || []) : [];
        const keep = list.some(x => x.key === initialSub) ? initialSub : '';
        budgetSubBody.innerHTML = optRow('budget_sub', '', 'ทั้งหมด', !keep) +
            list.map(x => optRow('budget_sub', x.key, x.label, x.key === keep)).join('');
        // sync label/badge ของ ue_chip_dd (มันจับ 'change' บน body เอง)
        const checked = budgetSubBody.querySelector('input:checked') || budgetSubBody.querySelector('input');
        if (checked) checked.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (budgetTypeBody) {
        budgetTypeBody.addEventListener('change', e => {
            if (e.target.name === 'budget_type') rebuildBudgetSub(e.target.value);
        });
    }
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
        return cb && cb.classList.contains('is-on');
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
    // $checkAll = bb-check-box (span) ไม่มี native .indeterminate/.checked — ใช้ setCheck() เท่านั้น
    // indeterminate (บางแถว) ข้าม visual แยก — ไม่มี CSS rule รองรับ (.is-indeterminate) จึงถือเป็น "ไม่ครบ" เหมือน none
    const enabled = rows.filter(r => {
        const cb = r.querySelector('.bb-ml-row-check');
        return cb && !cb.classList.contains('is-disabled');
    });
    const allChecked = enabled.length > 0 &&
        enabled.every(r => r.querySelector('.bb-ml-row-check').classList.contains('is-on'));
    setCheck($checkAll, allChecked);
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
    // .bb-ml-row-check เป็น custom checkbox (span + is-on class) ไม่ใช่ <input> จริง — ต้องใช้ setCheck()
    // เดิม cb.checked = false ไม่มีผลอะไรเลยเพราะ span ไม่มี property .checked
    document.querySelectorAll('.bb-ml-row-check').forEach(cb => setCheck(cb, false));
    if ($checkAll) setCheck($checkAll, false);
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
            recalcSummary();
        });
    }
    document.querySelectorAll('tr.bb-ml-row').forEach(row => {
        row.addEventListener('click', function (e) {
            // .bb-icon-btn (เมนู ⋮) เป็น span role="button" ไม่ใช่ <button> จริง — เดิมเช็กแค่ 'button, a'
            // จึงหลุดผ่านมาทำให้คลิกเมนูดันไป toggle เลือกแถวด้วย ทั้งที่ openMileage() เปิด modal ไปแล้ว
            if (e.target.closest('button, a, [role="button"]')) return;   // span checkbox = ปล่อยให้ toggle
            const cb = row.querySelector('.bb-ml-row-check');
            if (cb && !cb.classList.contains('is-disabled')) setCheck(cb, !cb.classList.contains('is-on'));
            recalcSummary();
        });
    });
    calcAllSummary();
    if (bbMlQuery) applySearch(bbMlQuery);    // re-apply search หลัง AJAX swap (rows ใหม่)
    bindSortHeaders();                      // re-bind sort + re-apply sortState หลัง swap
    staggerRows('#bbMlResults', { rows: 'tr.bb-ml-row, .bb-ml-trip-card', dots: '.bb-status [data-lucide], .bb-avatar' });
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
