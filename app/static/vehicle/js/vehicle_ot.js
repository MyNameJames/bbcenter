/* vehicle_ot.js — OT Cost Management page (ES module)
   - Edit modal (slot rows) + receipt preview + rate config modal
   - AJAX: filter (chips + popover) + row actions ไม่ reload หน้า (swap #costResults)
   - Kebab overflow menu: portal-to-body กัน .table-responsive overflow clip
   Depends on:
     - #otCostData (JSON script tag — อยู่นอก #costResults, sync แยกตอน swap)
     - Bootstrap 5 modal (global) · core/icons.js (lucide wrapper)
*/
import { initIcons } from '../../core/js/icons.js';

/* ── Mutable data (refresh หลัง AJAX swap) ──────── */
let OTS = {};
let RATE_CONFIGS = [];
let EDIT_URL_TPL = '';
let CREATE_URL = '';
let ACTIVE_STATUS = 'all';

function parseData() {
    const el = document.getElementById('otCostData');
    if (!el) return null;
    try { return JSON.parse(el.textContent); }
    catch (e) { console.error('ot-admin: bad JSON', e); return null; }
}
function refreshData() {
    const d = parseData();
    if (!d) return;
    OTS          = d.ots || {};
    RATE_CONFIGS = d.rateConfigs || [];
    EDIT_URL_TPL = d.editUrlTemplate || '';
    CREATE_URL   = d.createUrl || '';
    ACTIVE_STATUS = d.activeStatus || 'all';
}
refreshData();

/* ════════════════════════════════════════════════
   EDIT MODAL — slot rows + recompute
   ════════════════════════════════════════════════ */
function buildSlotRow(slot) {
    const opts = RATE_CONFIGS.map(c => `
        <option value="${c.id}" data-rate="${c.rate}" data-label="${c.label}"
            ${(slot && slot.cfg_id === c.id) ? 'selected' : ''}>
            ${c.label} ฿${c.rate}/ชม. (${c.start}–${c.end})
        </option>
    `).join('');
    const st = slot ? slot.start : '';
    const en = slot ? slot.end   : '';
    const row = document.createElement('div');
    row.className = 'cost-slot-row';
    row.innerHTML = `
        <div class="cost-slot-row-field" data-col-full>
            <label class="vc-label">ช่วง OT</label>
            <select name="slot_cfg[]" class="vc-select js-slot-cfg">${opts}</select>
        </div>
        <div class="cost-slot-row-field">
            <label class="vc-label">เริ่ม</label>
            <input type="time" name="slot_start[]" class="vc-input js-slot-start" value="${st}">
        </div>
        <div class="cost-slot-row-field">
            <label class="vc-label">สิ้นสุด</label>
            <input type="time" name="slot_end[]" class="vc-input js-slot-end" value="${en}">
        </div>
        <button type="button" class="vc-btn vc-btn-ghost vc-btn-icon vc-btn-sm cost-slot-row-remove js-slot-remove" title="ลบช่วงนี้">
            <i data-lucide="x" class="vc-icon-sm"></i>
        </button>
        <p class="cost-slot-row-hint js-slot-hint"></p>
    `;
    return row;
}

/* แต่ละ modal (edit/add) มี container + total el คนละชุด — งานเดียวกัน scope ต่างกัน */
const SLOT_SCOPES = {
    editSlotsContainer: { hrs: 'editTotalHrs', amt: 'editTotalAmt' },
    addSlotsContainer:  { hrs: 'addTotalHrs',  amt: 'addTotalAmt'  },
};

function recomputeScope(container) {
    const scope = SLOT_SCOPES[container.id];
    if (!scope) return;
    let totalHrs = 0, totalAmt = 0;
    container.querySelectorAll('.cost-slot-row').forEach(row => {
        const sel   = row.querySelector('.js-slot-cfg');
        const start = row.querySelector('.js-slot-start').value;
        const end   = row.querySelector('.js-slot-end').value;
        const hint  = row.querySelector('.js-slot-hint');
        hint.classList.remove('is-invalid');
        if (!sel || !start || !end) { hint.textContent = ''; return; }
        const rate  = parseFloat(sel.selectedOptions[0]?.dataset.rate || 0);
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        const mins  = (eh * 60 + em) - (sh * 60 + sm);
        if (mins <= 0) {
            hint.textContent = 'ช่วงเวลาไม่ถูกต้อง';
            hint.classList.add('is-invalid');
            return;
        }
        // สูตรเดียวกับ domain/vehicle/ot.py::build_slot() — คูณจากนาทีจริง ปัดเป็นบาทเต็ม
        // (hrs ใช้แสดงผลอย่างเดียว ห้ามเอาไปคูณ เดิมคูณจาก hrs ที่ปัดแล้ว → ยอดเกินจริง)
        const hrs = Math.round(mins / 60 * 100) / 100;
        const amt = Math.round(mins / 60 * rate);
        hint.textContent = `${hrs} ชม. × ฿${rate}/ชม. = ฿${amt.toLocaleString()}`;
        totalHrs += hrs;
        totalAmt += amt;
    });
    document.getElementById(scope.hrs).textContent = `${Math.round(totalHrs * 100) / 100} ชม.`;
    document.getElementById(scope.amt).textContent = `฿${Math.round(totalAmt).toLocaleString()}`;
}

function addSlotRow(container, slot) {
    container.appendChild(buildSlotRow(slot));
    initIcons(container);
    recomputeScope(container);
}

function openEditModal(otId) {
    const ot = OTS[String(otId)];
    if (!ot) return;

    document.getElementById('editModalTitle').textContent = `แก้ไข ${ot.ot_number}`;
    document.getElementById('editDriverId').value = ot.driver_id;
    document.getElementById('editDate').value      = ot.date;
    document.getElementById('editNote').value      = ot.note || '';

    document.getElementById('editOtForm').action = EDIT_URL_TPL.replace('/0/', `/${otId}/`);

    const container = document.getElementById('editSlotsContainer');
    container.innerHTML = '';
    (ot.slots || []).forEach(s => container.appendChild(buildSlotRow(s)));
    initIcons(container);
    recomputeScope(container);

    bootstrap.Modal.getOrCreateInstance(document.getElementById('editOtModal')).show();
}

function openAddModal() {
    const form = document.getElementById('addOtForm');
    if (!form) return;
    form.reset();
    // default วันที่ = วันนี้ (hidden input + datepicker จะ sync label ตอน shown.bs.modal)
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('addDate').value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const container = document.getElementById('addSlotsContainer');
    container.innerHTML = '';
    addSlotRow(container, null);   // เริ่มด้วย 1 ช่วงว่าง

    bootstrap.Modal.getOrCreateInstance(document.getElementById('addOtModal')).show();
}

/* ════════════════════════════════════════════════
   RECEIPT preview (group by driver → 1 ใบ/คน)
   ════════════════════════════════════════════════ */
const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const baht = (n) => '฿' + Math.round(Number(n) || 0).toLocaleString();

function todayTh() {
    const d = new Date();
    const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function otTimeSpan(ot) {
    const slots = ot.slots || [];
    if (!slots.length) return '';
    const starts = slots.map(s => s.start).filter(Boolean).sort();
    const ends   = slots.map(s => s.end).filter(Boolean).sort();
    return `${starts[0]} - ${ends[ends.length - 1]}`;
}

const MIN_ROWS = 8;

function buildReceiptPage(records) {
    const d = records[0];
    let grand = 0;
    let lineRows = records.map(ot => {
        grand += Number(ot.total_amount) || 0;
        const span = otTimeSpan(ot);
        const dest = ot.destination ? ` ${esc(ot.destination)}` : '';
        return `<tr>
            <td class="rcpt-desc">ค่าล่วงเวลาสารถีวันที่ ${esc(ot.date)}${dest}${span ? ` (${span})` : ''}</td>
            <td class="rcpt-money">${baht(ot.total_amount)}</td>
        </tr>`;
    }).join('');
    for (let i = records.length; i < MIN_ROWS; i++) {
        lineRows += `<tr><td class="rcpt-desc">&nbsp;</td><td class="rcpt-money"></td></tr>`;
    }

    const idImg = d.driver_id_card_image
        ? `<div class="rcpt-idcard"><img src="${esc(d.driver_id_card_image)}" alt="บัตรประชาชน"></div>`
        : '';

    return `
    <div class="cost-receipt-page">
        <div class="cost-print-title">ใบเสร็จรับเงิน</div>

        <div class="rcpt-head">
            <div class="rcpt-line"><span class="rcpt-k">วันที่</span><span class="rcpt-v">${todayTh()}</span></div>
            <div class="rcpt-line">
                <span class="rcpt-k">ข้าพเจ้าชื่อ</span><span class="rcpt-v rcpt-grow">${esc(d.driver_name)}</span>
                <span class="rcpt-k">ที่อยู่</span><span class="rcpt-v rcpt-grow">${esc(d.driver_addr_line) || '-'}</span>
            </div>
            <div class="rcpt-line">
                <span class="rcpt-k">บัตรประจำตัวประชาชนเลข</span><span class="rcpt-v rcpt-grow">${esc(d.driver_national_id) || '-'}</span>
            </div>
            <div class="rcpt-line">
                <span class="rcpt-k">ตำบล</span><span class="rcpt-v">${esc(d.driver_addr_subdistrict) || '-'}</span>
                <span class="rcpt-k">อำเภอ</span><span class="rcpt-v">${esc(d.driver_addr_district) || '-'}</span>
                <span class="rcpt-k">จังหวัด</span><span class="rcpt-v">${esc(d.driver_addr_province) || '-'}</span>
            </div>
            <div class="rcpt-line">
                <span class="rcpt-k">รหัสไปรษณีย์</span><span class="rcpt-v">${esc(d.driver_addr_postal) || '-'}</span>
                <span class="rcpt-k">โทร</span><span class="rcpt-v">${esc(d.driver_phone) || '-'}</span>
            </div>
        </div>

        <p class="cost-print-intro">ได้รับเงินเพื่อชำระค่าสินค้า หรือค่าบริการดังรายละเอียดข้างท้ายดังนี้ ถูกต้องเรียบร้อยแล้ว</p>

        <table class="cost-print-table">
            <thead>
                <tr><th class="desc">รายการ</th><th class="money">จำนวนเงิน</th></tr>
            </thead>
            <tbody>${lineRows}</tbody>
            <tfoot>
                <tr><td>รวมเงิน</td><td class="rcpt-money">${baht(grand)}</td></tr>
            </tfoot>
        </table>

        <div class="cost-print-sign">
            <div class="cost-print-sign-inner">
                <div class="cost-print-sign-line">ลงชื่อ..............................................................ผู้รับเงิน</div>
                <div class="cost-print-sign-name">(${esc(d.driver_name)})</div>
            </div>
        </div>
        ${idImg}
    </div>`;
}

let receiptModal = null;
function openPreview(records) {
    if (!records.length) { alert('ไม่มีข้อมูลใบเสร็จ'); return; }
    const byDriver = new Map();
    records.forEach(ot => {
        const k = ot.driver_id;
        if (!byDriver.has(k)) byDriver.set(k, []);
        byDriver.get(k).push(ot);
    });
    const host = document.getElementById('receiptHost');
    host.innerHTML = Array.from(byDriver.values()).map(buildReceiptPage).join('');
    const cntEl = document.getElementById('receiptPreviewCount');
    if (cntEl) cntEl.textContent = byDriver.size > 1 ? `(${byDriver.size} ใบ)` : '';
    initIcons(host);
    if (!receiptModal) receiptModal = new bootstrap.Modal(document.getElementById('receiptPreviewModal'));
    receiptModal.show();
}

function printSingle(otId) {
    const ot = OTS[String(otId)];
    if (!ot) return;
    openPreview([ot]);
}

function printAll() {
    const visible = Object.values(OTS).filter(ot => !ot.no_receipt);
    if (!visible.length) { alert('ไม่มีรายการที่ต้องออกใบเสร็จใน tab นี้'); return; }
    openPreview(visible);
}

/* ════════════════════════════════════════════════
   KEBAB overflow menu — portal-to-body (กัน overflow clip)
   ════════════════════════════════════════════════ */
let kebab = null;   // { menu, home, btn }

function closeKebab() {
    if (!kebab) return;
    const { menu, home, btn } = kebab;
    menu.setAttribute('hidden', '');
    menu.classList.remove('is-portal');
    menu.removeAttribute('style');
    if (home && home.isConnected) home.appendChild(menu);
    else menu.remove();
    if (btn && btn.isConnected) btn.setAttribute('aria-expanded', 'false');
    kebab = null;
}

function openKebab(btn) {
    closeKebab();
    const wrap = btn.closest('.cost-action-more');
    const menu = wrap && wrap.querySelector('.cost-action-menu');
    if (!menu) return;
    const home = menu.parentNode;
    document.body.appendChild(menu);
    menu.classList.add('is-portal');
    menu.removeAttribute('hidden');
    menu.style.position = 'fixed';
    menu.style.visibility = 'hidden';
    const r  = btn.getBoundingClientRect();
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    const gap = 4, edge = 8;
    let top = r.bottom + gap;
    if (top + mh > window.innerHeight - edge) top = Math.max(edge, r.top - gap - mh);
    let left = r.right - mw;
    if (left < edge) left = edge;
    menu.style.top  = top + 'px';
    menu.style.left = left + 'px';
    menu.style.visibility = '';
    btn.setAttribute('aria-expanded', 'true');
    initIcons(menu);
    kebab = { menu, home, btn };
}

/* ════════════════════════════════════════════════
   AJAX FILTER — fetch หน้าเดิม → swap #costResults + #costTabs + data blob
   ════════════════════════════════════════════════ */
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

let _reqToken = 0;
async function runFilter(push = true) {
    const results = document.getElementById('costResults');
    const form    = document.getElementById('filterForm');
    if (!results || !form) { if (form) form.submit(); return; }

    closeKebab();
    const url   = buildFilterURL();
    const token = ++_reqToken;
    results.classList.add('is-loading');
    try {
        const res = await fetch(url, {
            headers: { 'X-Requested-With': 'fetch' },
            credentials: 'same-origin'
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        if (token !== _reqToken) return;
        const doc   = new DOMParser().parseFromString(text, 'text/html');
        const fresh = doc.getElementById('costResults');
        if (!fresh) throw new Error('no #costResults in response');

        results.innerHTML = fresh.innerHTML;

        // tabs (counts + active) อยู่นอก region → swap แยก
        const freshTabs = doc.getElementById('costTabs');
        const curTabs   = document.getElementById('costTabs');
        if (freshTabs && curTabs) curTabs.innerHTML = freshTabs.innerHTML;

        // data blob อยู่นอก region (ท้ายหน้า) → sync แล้ว refresh
        const freshData = doc.getElementById('otCostData');
        const curData   = document.getElementById('otCostData');
        if (freshData && curData) curData.textContent = freshData.textContent;
        refreshData();

        initIcons(results);
        if (curTabs) initIcons(curTabs);
        if (push) history.pushState({ cost: true }, '', url);
        syncExportLink(url);
    } catch (e) {
        window.location.href = url;
    } finally {
        if (token === _reqToken) results.classList.remove('is-loading');
    }
}

window.addEventListener('popstate', () => { window.location.reload(); });

/* ════════════════════════════════════════════════
   EVENT WIRING (delegated — รอด AJAX swap)
   ════════════════════════════════════════════════ */

/* Row actions: edit / print (delegated) */
document.addEventListener('click', e => {
    const btn = e.target.closest('[data-cost-action]');
    if (!btn) return;
    closeKebab();
    const action = btn.dataset.costAction;
    const otId   = btn.dataset.otId;
    if (action === 'edit')  openEditModal(otId);
    if (action === 'print') printSingle(otId);
});

/* Kebab toggle + outside-click close (delegated) */
document.addEventListener('click', e => {
    const tog = e.target.closest('[data-cost-menu]');
    if (tog) {
        e.stopPropagation();
        if (kebab && kebab.btn === tog) closeKebab();
        else openKebab(tog);
        return;
    }
    if (kebab && !kebab.menu.contains(e.target)) closeKebab();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeKebab(); });
window.addEventListener('scroll', () => closeKebab(), true);
window.addEventListener('resize', () => closeKebab());

/* Row action forms (จ่าย/ย้าย/ลบ/กู้คืน) → AJAX POST → refresh table
   data-confirm-name (ถ้ามี) = เปิด #costConfirmModal (illustration card, page contract 2026-08-07)
   แทน confirm() เบราว์เซอร์ — ไม่มี = submit ตรงเลย (จ่าย/ย้าย/กู้คืน ไม่ต้อง confirm) */
function submitCostAction(form) {
    fetch(form.action, {
        method: 'POST',
        headers: { 'X-Requested-With': 'fetch' },
        body: new FormData(form),
        credentials: 'same-origin'
    })
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return runFilter(false); })
    .catch(() => { form.removeAttribute('data-confirm-name'); form.submit(); });
}

function showCostConfirm(name, onConfirm) {
    const modalEl = document.getElementById('costConfirmModal');
    const btn = document.getElementById('costConfirmBtn');
    if (!modalEl || !btn || !window.bootstrap) { onConfirm(); return; }
    document.getElementById('costConfirmName').textContent = name;
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const handler = () => { modal.hide(); onConfirm(); };
    btn.addEventListener('click', handler, { once: true });
    modal.show();
}

document.addEventListener('submit', e => {
    const form = e.target.closest('form.js-cost-action');
    if (!form) return;
    e.preventDefault();
    closeKebab();
    if (form.dataset.confirmName) {
        showCostConfirm(form.dataset.confirmName, () => submitCostAction(form));
        return;
    }
    submitCostAction(form);
});

/* Edit modal form → AJAX POST → close modal → refresh */
(function bindEditForm() {
    const form = document.getElementById('editOtForm');
    if (!form) return;
    form.addEventListener('submit', e => {
        if (e.defaultPrevented) return;   // datepicker required-check (capture) บล็อกไว้แล้ว
        e.preventDefault();
        fetch(form.action, {
            method: 'POST',
            headers: { 'X-Requested-With': 'fetch' },
            body: new FormData(form),
            credentials: 'same-origin'
        })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r; })
        .then(() => {
            bootstrap.Modal.getOrCreateInstance(document.getElementById('editOtModal')).hide();
            runFilter(false);
        })
        .catch(() => form.submit());
    });
})();

/* Status chips → set hidden status + AJAX (delegated) */
document.addEventListener('click', e => {
    const chip = e.target.closest('#costTabs .cost-chip');
    if (!chip) return;
    const statusInput = document.getElementById('statusInput');
    if (statusInput) statusInput.value = chip.dataset.status || '';
    document.querySelectorAll('#costTabs .cost-chip')
        .forEach(c => c.classList.toggle('is-active', c === chip));
    runFilter();
});

/* Filter popover (button → sheet) */
(function bindFilterPopover() {
    const btn   = document.getElementById('costFilterBtn');
    const sheet = document.getElementById('costFilterSheet');
    if (!btn || !sheet) return;
    const isOpen = () => !sheet.hasAttribute('hidden');
    function setOpen(open) {
        if (open) sheet.removeAttribute('hidden');
        else sheet.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', String(open));
    }
    btn.addEventListener('click', e => { e.stopPropagation(); setOpen(!isOpen()); });
    document.addEventListener('click', e => {
        if (!isOpen()) return;
        if (sheet.contains(e.target) || btn.contains(e.target)) return;
        setOpen(false);
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && isOpen()) { setOpen(false); btn.focus(); }
    });
})();

/* Filter selects change → auto-apply (popover เปิดค้างไว้) */
(function bindFilterChange() {
    const form = document.getElementById('filterForm');
    if (!form) return;
    form.addEventListener('change', e => {
        if (e.target.matches('select')) runFilter();
    });
    form.addEventListener('submit', e => {
        e.preventDefault();
        const sheet = document.getElementById('costFilterSheet');
        const btn   = document.getElementById('costFilterBtn');
        if (sheet) sheet.setAttribute('hidden', '');
        if (btn) btn.setAttribute('aria-expanded', 'false');
        runFilter();
    });
    const clear = document.getElementById('costFilterClear');
    if (clear) clear.addEventListener('click', () => {
        window.location.href = form.getAttribute('action');   // reset → server default (เดือนปัจจุบัน)
    });
})();

/* Budget filter cascade: budget_type → budget_sub (sheet อยู่นอก #costResults → bind ครั้งเดียว) */
(function bindBudgetFilter() {
    const typeSel = document.getElementById('filterBudgetType');
    const subSel  = document.getElementById('filterBudgetSub');
    const subWrap = document.getElementById('filterBudgetSubWrap');
    if (!typeSel || !subSel || !subWrap) return;

    const cats       = window.EXPENSE_CATS || { central: [], department: [] };
    const initialSub = window.COST_FILTER_SUB || '';

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

/* ── Slot add/remove/recompute — ใช้ร่วม edit + add modal ── */
[
    { btn: 'addSlotBtn',   container: 'editSlotsContainer' },
    { btn: 'addOtSlotBtn', container: 'addSlotsContainer'  },
].forEach(({ btn, container }) => {
    const addBtn = document.getElementById(btn);
    const box    = document.getElementById(container);
    if (addBtn && box) addBtn.addEventListener('click', () => addSlotRow(box, null));
    if (!box) return;
    box.addEventListener('click', e => {
        const rm = e.target.closest('.js-slot-remove');
        if (rm) { rm.closest('.cost-slot-row').remove(); recomputeScope(box); }
    });
    box.addEventListener('input',  () => recomputeScope(box));
    box.addEventListener('change', () => recomputeScope(box));
});

/* ── Add OT modal: open (ปุ่ม header) + AJAX submit ── */
const addOtBtn = document.getElementById('addOtBtn');
if (addOtBtn) addOtBtn.addEventListener('click', openAddModal);

(function bindAddForm() {
    const form = document.getElementById('addOtForm');
    if (!form) return;
    form.addEventListener('submit', e => {
        if (e.defaultPrevented) return;   // datepicker required-check (capture) บล็อกไว้แล้ว
        e.preventDefault();
        fetch(form.action || CREATE_URL, {
            method: 'POST',
            headers: { 'X-Requested-With': 'fetch' },
            body: new FormData(form),
            credentials: 'same-origin'
        })
        .then(async r => {
            const data = await r.json().catch(() => ({}));
            if (!r.ok || data.ok === false) throw new Error(data.msg || 'HTTP ' + r.status);
            bootstrap.Modal.getOrCreateInstance(document.getElementById('addOtModal')).hide();
            runFilter(false);
        })
        .catch(err => alert(err.message || 'เพิ่ม OT ไม่สำเร็จ'));
    });
})();

const printAllBtn = document.getElementById('printAllBtn');
if (printAllBtn) printAllBtn.addEventListener('click', printAll);

const receiptPrintBtn = document.getElementById('receiptPrintBtn');
if (receiptPrintBtn) receiptPrintBtn.addEventListener('click', () => window.print());

/* ════════════════════════════════════════════════
   RATE CONFIG modal — add/remove rows (normal submit / full reload)
   ════════════════════════════════════════════════ */
const TH_DAYS = ['จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์','อาทิตย์'];
function buildRateRow() {
    const dayOpts = ['<option value="" selected>ทุกวัน</option>']
        .concat(TH_DAYS.map((d, i) => `<option value="${i}">${d}</option>`))
        .join('');
    const row = document.createElement('div');
    row.className = 'cost-rate-row';
    row.innerHTML = `
        <input type="hidden" name="cfg_id[]" value="">
        <div class="cost-rate-row-field" data-col-full>
            <label class="vc-label">ชื่อ Band</label>
            <input type="text" name="cfg_label[]" class="vc-input" placeholder="เช่น หัวค่ำ" required>
        </div>
        <div class="cost-rate-row-field cost-rate-row-day">
            <label class="vc-label">เฉพาะวัน</label>
            <select name="cfg_day[]" class="vc-select">${dayOpts}</select>
        </div>
        <div class="cost-rate-row-field">
            <label class="vc-label">เริ่ม</label>
            <input type="time" name="cfg_start[]" class="vc-input" required>
        </div>
        <div class="cost-rate-row-field">
            <label class="vc-label">สิ้นสุด</label>
            <input type="time" name="cfg_end[]" class="vc-input" required>
        </div>
        <div class="cost-rate-row-field">
            <label class="vc-label">฿/ชม.</label>
            <input type="number" name="cfg_rate[]" class="vc-input" min="0" step="1" required>
        </div>
        <button type="button" class="vc-btn vc-btn-ghost vc-btn-icon vc-btn-sm cost-rate-row-remove js-rate-remove" title="ลบช่วงนี้">
            <i data-lucide="trash-2" class="vc-icon-sm"></i>
        </button>
    `;
    return row;
}

const addRateBtn = document.getElementById('addRateBtn');
const rateBox    = document.getElementById('rateConfigContainer');
const rateForm   = document.getElementById('rateConfigForm');

if (addRateBtn && rateBox) {
    addRateBtn.addEventListener('click', () => {
        const row = buildRateRow();
        rateBox.appendChild(row);
        initIcons(rateBox);
    });
}

if (rateBox) {
    rateBox.addEventListener('click', e => {
        const rm = e.target.closest('.js-rate-remove');
        if (!rm) return;
        const row   = rm.closest('.cost-rate-row');
        const cfgId = row.dataset.cfgId;
        if (cfgId) {
            if (!confirm('ลบช่วงอัตรานี้ใช่ไหม? OT ที่สร้างใหม่จะไม่ใช้อัตรานี้อีก')) return;
            row.classList.add('is-removed');
            row.querySelectorAll('input').forEach(i => i.disabled = true);
            const del = document.createElement('input');
            del.type = 'hidden'; del.name = 'cfg_delete[]'; del.value = cfgId;
            rateForm.appendChild(del);
            rm.remove();
        } else {
            row.remove();
        }
    });
}

/* ════════════════════════════════════════════════
   DATE PICKER (va-cal) — แทน native type="date" ในทุก modal (port จาก vehicle_budget.js)
   ปุ่ม trigger → .va-cal popover → คลิกวัน → set hidden input (ISO) + sync label.
   pre-fill (openEditModal/openAddModal set hidden value ก่อน show) → sync ตอน shown.bs.modal.
   ════════════════════════════════════════════════ */
(function initOtDatepickers() {
    const roots = document.querySelectorAll('[data-datepick]');
    if (!roots.length) return;

    const TH_DAYS_S = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    const TH_MON_F  = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                       'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const TH_MON_S  = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                       'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    const pad2  = n => String(n).padStart(2, '0');
    const toISO = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sameDay = (a, b) => a.getFullYear() === b.getFullYear() &&
                              a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    function parseISO(v) {
        if (!v) return null;
        const [y, m, d] = String(v).split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return isNaN(dt.getTime()) ? null : dt;
    }

    const instances = [];
    const closeAll = except => instances.forEach(i => { if (i.root !== except) i.close(); });

    roots.forEach(root => {
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
                btn.classList.add('budget-date-btn--filled');
            } else {
                labelEl.textContent = placeholder;
                btn.classList.remove('budget-date-btn--filled');
            }
            root.classList.remove('is-invalid');
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
            input.dispatchEvent(new Event('change', { bubbles: true }));
            syncLabel();
            close();
        });

        syncLabel();
        instances.push({ root, input, close, syncLabel });
    });

    document.addEventListener('click', e => {
        instances.forEach(i => { if (!i.root.contains(e.target)) i.close(); });
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(null); });

    // pre-fill จาก modal show เสร็จ → sync label
    document.addEventListener('shown.bs.modal', e => {
        instances.forEach(i => { if (e.target.contains(i.root)) i.syncLabel(); });
    });
    document.addEventListener('hidden.bs.modal', e => {
        instances.forEach(i => { if (e.target.contains(i.root)) i.close(); });
    });

    // required (hidden input ไม่ trigger HTML5 validation) → ตรวจตอน submit
    document.addEventListener('submit', e => {
        const form = e.target;
        if (!form.querySelector) return;
        let firstMissing = null;
        form.querySelectorAll('[data-datepick-required]').forEach(inp => {
            const root = inp.closest('[data-datepick]');
            if (!inp.value) {
                root.classList.add('is-invalid');
                if (!firstMissing) firstMissing = root;
            } else {
                root.classList.remove('is-invalid');
            }
        });
        if (firstMissing) {
            e.preventDefault();
            const trigger = firstMissing.querySelector('[data-datepick-btn]');
            if (trigger) trigger.focus();
        }
    }, true);
})();

/* ── Expose for legacy/global ── */
Object.assign(window, { closeCostKebab: closeKebab });
