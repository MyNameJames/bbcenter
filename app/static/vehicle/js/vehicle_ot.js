/* vehicle_ot.js — OT Cost Management page (ES module)
   - Edit modal (slot rows) + receipt preview + rate config modal
   - AJAX: filter (chips + popover) + row actions ไม่ reload หน้า (swap #costResults)
   - Kebab overflow menu: portal-to-body กัน .table-responsive overflow clip
   Depends on:
     - #otCostData (JSON script tag — อยู่นอก #costResults, sync แยกตอน swap)
     - Bootstrap 5 modal (global) · core/icons.js (lucide wrapper)
*/
import { initIcons } from '../../core/js/icons.js';

/* วันในสัปดาห์ index ตรงกับ OTRateConfig.day_of_week (0=จันทร์ … 6=อาทิตย์, Python weekday())
   ประกาศบนสุดเพราะใช้ทั้งแท็บ "ตั้งค่า OT" และ rateConfigModal เดิม */
const TH_DAYS = ['จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์','อาทิตย์'];

/* ── Mutable data (refresh หลัง AJAX swap) ──────── */
let OTS = {};
let RATE_CONFIGS = [];
let EDIT_URL_TPL = '';
let CREATE_URL = '';
let ACTIVE_STATUS = 'all';
let TOGGLE_NO_RECEIPT_URL_TPL = '';

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
    TOGGLE_NO_RECEIPT_URL_TPL = d.toggleNoReceiptUrlTemplate || '';
}
refreshData();

/* ════════════════════════════════════════════════
   EDIT MODAL — slot rows + recompute
   ════════════════════════════════════════════════ */
function buildSlotRow(slot) {
    const opts = RATE_CONFIGS.map(c => `
        <option value="${c.id}" data-rate="${c.rate}" data-label="${c.label}"
            data-rate-type="${c.rate_type || 'hourly'}"
            ${(slot && slot.cfg_id === c.id) ? 'selected' : ''}>
            ${c.label} ฿${c.rate}${c.rate_type === 'flat_day' ? '/วัน (เหมา)' : '/ชม.'} (${c.start}–${c.end})
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
        const rtype = sel.selectedOptions[0]?.dataset.rateType || 'hourly';
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
        // flat_day = เหมาจ่าย ไม่คูณเวลา (2026-08-07) — preview ไม่รู้ว่าวันนั้นเก็บไปแล้วหรือยัง
        // (เป็น state ใน DB) จึงโชว์ยอดเต็มเสมอ ตัวเลขจริงตัดสินที่ backend ตอน submit
        const hrs = Math.round(mins / 60 * 100) / 100;
        const amt = rtype === 'flat_day' ? Math.round(rate) : Math.round(mins / 60 * rate);
        hint.textContent = rtype === 'flat_day'
            ? `${hrs} ชม. · เหมาจ่าย ฿${amt.toLocaleString()}/วัน`
            : `${hrs} ชม. × ฿${rate}/ชม. = ฿${amt.toLocaleString()}`;
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

/* ════════════════════════════════════════════════
   TAB "ใบจ่ายจริง" — คนขับ+เดือนเดียว, list + preview สด
   (feature redesign, page contract 2026-08-08 — view-only ยังไม่มี batch-payment entity)
   markup: .slipmk-dd (field-box dropdown) · .bb-table (list) · .slipmk-sheet (A4 preview)
   ════════════════════════════════════════════════ */
let slipItems = [];   // ผลลัพธ์ล่าสุดจาก /admin/ot/slip (ทุกสถานะ ไม่กรอง paid/unpaid)

function otSlotLabels(ot) {
    return (ot.slots || []).map(s => s.label).join(', ') || '—';
}

/* ── ตาราง OT ที่เข้าใบเสร็จ (ซ้าย) — แถวสีจาง (opacity) = ผู้ใช้จ่ายเอง ไม่นับเข้ายอด
   ไอคอนถังขยะ = ot_toggle_no_receipt (ย้ายเข้า/ออกผู้ใช้จ่ายเอง) — reload หลัง toggle สำเร็จ ── */
function slipTableRow(ot) {
    const span = otTimeSpan(ot);
    return `<tr data-ot-id="${ot.id}"${ot.no_receipt ? ' style="opacity:.55"' : ''}>
        <td><div class="bb-cell-strong">${esc(ot.date_display)}</div><span class="bb-cell-sub">${esc(otSlotLabels(ot))}${span ? ' · ' + span : ''}</span></td>
        <td class="bb-cell-num">${Number(ot.total_hours).toFixed(2)}</td>
        <td class="bb-cell-num bb-cell-strong bb-num">${baht(ot.total_amount)}</td>
        <td class="bb-table-actions">
            <button type="button" class="bb-btn is-ghost is-icon is-sm js-slip-toggle-receipt" data-ot-id="${ot.id}"
                    title="${ot.no_receipt ? 'นำกลับเข้าใบเสร็จ' : 'ย้ายไปผู้ใช้จ่ายเอง (เอาออกจากใบนี้)'}">
                <span class="material-symbols-rounded" style="color:${ot.no_receipt ? 'var(--bb-mut)' : 'var(--bb-dg-tx)'}">${ot.no_receipt ? 'undo' : 'delete'}</span>
            </button>
        </td>
    </tr>`;
}

/* ── กระดาษ A4 preview (ขวา) — ฟอร์แมตเดียวกับ buildReceiptPage() แต่คนขับเดียวเสมอ (แท็บนี้
   scope ต่อคนขับ+เดือนอยู่แล้ว) และ markup ใช้ .slipmk-* แทน .cost-receipt-page/.rcpt-* ── */
function buildSlipSheet(records) {
    const d = records[0];
    let grand = 0;
    let rows = records.map(ot => {
        grand += Number(ot.total_amount) || 0;
        const span = otTimeSpan(ot);
        const dest = ot.destination ? ` ${esc(ot.destination)}` : '';
        return `<tr><td>ค่าล่วงเวลาสารถีวันที่ ${esc(ot.date)}${dest}${span ? ` (${span})` : ''}</td><td class="is-money">${Number(ot.total_amount).toFixed(2)}</td></tr>`;
    }).join('');
    for (let i = records.length; i < MIN_ROWS; i++) {
        rows += `<tr><td>&nbsp;</td><td class="is-money"></td></tr>`;
    }
    const idImg = d.driver_id_card_image
        ? `<div class="slipmk-idcard" style="border:0;background:none;justify-content:flex-start"><img src="${esc(d.driver_id_card_image)}" alt="บัตรประชาชน" style="max-width:60%;height:auto;border:1px solid var(--bb-n200);border-radius:.3em"></div>`
        : `<div class="slipmk-idcard">ไม่มีรูปบัตรประชาชน</div>`;

    return `
    <div class="slipmk-sheet-title">ใบเสร็จรับเงิน</div>
    <div class="slipmk-row"><span class="slipmk-k">วันที่</span><span class="slipmk-v">${todayTh()}</span></div>
    <div class="slipmk-row"><span class="slipmk-k">ข้าพเจ้าชื่อ</span><span class="slipmk-v is-grow">${esc(d.driver_name)}</span></div>
    <div class="slipmk-row">
        <span class="slipmk-k">บัตรประจำตัวประชาชนเลข</span><span class="slipmk-v">${esc(d.driver_national_id) || '-'}</span>
        <span class="slipmk-k">ที่อยู่</span><span class="slipmk-v is-grow">${esc(d.driver_addr_line) || '-'}</span>
    </div>
    <div class="slipmk-row">
        <span class="slipmk-k">ตำบล</span><span class="slipmk-v">${esc(d.driver_addr_subdistrict) || '-'}</span>
        <span class="slipmk-k">อำเภอ</span><span class="slipmk-v">${esc(d.driver_addr_district) || '-'}</span>
        <span class="slipmk-k">จังหวัด</span><span class="slipmk-v">${esc(d.driver_addr_province) || '-'}</span>
    </div>
    <div class="slipmk-row">
        <span class="slipmk-k">รหัสไปรษณีย์</span><span class="slipmk-v">${esc(d.driver_addr_postal) || '-'}</span>
        <span class="slipmk-k">โทร</span><span class="slipmk-v">${esc(d.driver_phone) || '-'}</span>
    </div>
    <p class="slipmk-intro">ได้รับเงินเพื่อชำระค่าสินค้า หรือค่าบริการดังรายละเอียดข้างท้ายดังนี้ ถูกต้องเรียบร้อยแล้ว</p>
    <table class="slipmk-table">
        <thead><tr><th>รายการ</th><th class="is-money">จำนวนเงิน</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td>รวมเงิน</td><td class="is-money">${grand.toFixed(2)}</td></tr></tfoot>
    </table>
    <div class="slipmk-sign">
        <div class="slipmk-sign-inner">
            <div>ลงชื่อ..............................................................ผู้รับเงิน</div>
            <div class="slipmk-sign-name">( ${esc(d.driver_name)} )</div>
        </div>
    </div>
    ${idImg}`;
}

function renderSlipEmpty(msg) {
    const table = document.getElementById('slipItemsTable');
    const total = document.getElementById('slipTotalRow');
    const note  = document.getElementById('slipSelfPaidNote');
    const empty = document.getElementById('slipEmptyState');
    const sheet = document.getElementById('slipSheetHost');
    if (table) table.classList.add('d-none');
    if (total) total.classList.add('d-none');
    if (note)  note.classList.add('d-none');
    if (empty) { empty.classList.remove('d-none'); const m = empty.querySelector('[data-slip-empty-msg]'); if (m) m.textContent = msg; }
    if (sheet) sheet.innerHTML = '';
}

function renderSlipPanel() {
    if (!slipItems.length) { renderSlipEmpty('ไม่มีข้อมูล OT ของคนขับ/เดือนที่เลือก'); return; }

    const receiptItems  = slipItems.filter(o => !o.no_receipt);
    const selfPaidItems = slipItems.filter(o => o.no_receipt);

    document.getElementById('slipEmptyState').classList.add('d-none');
    document.getElementById('slipItemsTable').classList.remove('d-none');
    document.getElementById('slipItemsBody').innerHTML = slipItems.map(slipTableRow).join('');

    const totalRow = document.getElementById('slipTotalRow');
    totalRow.classList.remove('d-none');
    totalRow.classList.add('d-flex');
    document.getElementById('slipTotalAmount').textContent =
        baht(receiptItems.reduce((s, o) => s + Number(o.total_amount || 0), 0));

    const note = document.getElementById('slipSelfPaidNote');
    if (selfPaidItems.length) {
        note.classList.remove('d-none');
        note.querySelector('[data-slip-note-text]').innerHTML =
            `เดือนนี้มี OT ที่ <b>ผู้ใช้จ่ายเอง ${selfPaidItems.length} รายการ (${baht(selfPaidItems.reduce((s, o) => s + Number(o.total_amount || 0), 0))})</b> — ไม่นับเข้าใบเสร็จ`;
    } else {
        note.classList.add('d-none');
    }

    document.getElementById('slipSheetHost').innerHTML = receiptItems.length
        ? buildSlipSheet(receiptItems)
        : `<div style="padding:40px 20px;text-align:center;color:var(--bb-mut);font-size:14px">ไม่มีรายการให้ออกใบเสร็จเดือนนี้ (ทั้งหมดเป็นผู้ใช้จ่ายเอง)</div>`;
}

async function loadSlip(driverId, ym) {
    if (!driverId || !ym) { renderSlipEmpty('เลือกคนขับก่อน'); slipItems = []; return; }
    const [year, month] = ym.split('-');
    try {
        const res = await fetch(`/admin/ot/slip?driver_id=${driverId}&year=${year}&month=${month}`, {
            headers: { 'X-Requested-With': 'fetch' }, credentials: 'same-origin'
        });
        const data = await res.json();
        if (!res.ok || !data.ok) { renderSlipEmpty(data.msg || 'โหลดข้อมูลไม่สำเร็จ'); slipItems = []; return; }
        slipItems = data.items || [];
        renderSlipPanel();
    } catch (e) {
        renderSlipEmpty('โหลดข้อมูลไม่สำเร็จ');
        slipItems = [];
    }
}

function currentSlipSelection() {
    const driverDd = document.getElementById('mkDriver');
    const monthDd  = document.getElementById('mkMonth');
    return { driverId: driverDd ? driverDd.dataset.value || '' : '', ym: monthDd ? monthDd.dataset.value || '' : '' };
}

/* ── .slipmk-dd (field-box dropdown) — ก็อป pattern .yp-dd จาก vehicle_budget.js: click เปิด/ปิด,
   click option → set label + dataset.value + dispatch 'slipmk-dd:change' ── */
(function initSlipDropdowns() {
    const panel = document.getElementById('costPanelSlip');
    if (!panel) return;
    const dds = panel.querySelectorAll('.slipmk-dd');
    if (!dds.length) return;

    function closeAll() {
        dds.forEach(dd => {
            dd.querySelector('[data-slipmk-dd-pop]').classList.remove('is-open');
            dd.setAttribute('aria-expanded', 'false');
        });
    }
    dds.forEach(dd => {
        const pop = dd.querySelector('[data-slipmk-dd-pop]');
        const label = dd.querySelector('[data-slipmk-dd-value]');
        dd.addEventListener('click', e => {
            if (e.target.closest('.slipmk-opt')) return;
            e.stopPropagation();
            const willOpen = !pop.classList.contains('is-open');
            closeAll();
            if (willOpen) { pop.classList.add('is-open'); dd.setAttribute('aria-expanded', 'true'); }
        });
        pop.querySelectorAll('.slipmk-opt input').forEach(inp => {
            inp.addEventListener('change', () => {
                label.textContent = inp.closest('.slipmk-opt').querySelector('span').textContent;
                label.classList.remove('is-ph');
                dd.dataset.value = inp.value;
                closeAll();
                dd.dispatchEvent(new Event('slipmk-dd:change', { bubbles: true }));
            });
        });
        // เดือนมี default checked (i==0 ใน template) → sync label+value ตั้งแต่โหลดหน้า
        const checked = pop.querySelector('.slipmk-opt input:checked');
        if (checked) { label.textContent = checked.closest('.slipmk-opt').querySelector('span').textContent; label.classList.remove('is-ph'); dd.dataset.value = checked.value; }
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('#costPanelSlip .slipmk-dd')) closeAll();
    });
})();

(function bindSlipTab() {
    const driverDd = document.getElementById('mkDriver');
    const monthDd  = document.getElementById('mkMonth');
    if (!driverDd || !monthDd) return;
    function reload() {
        const { driverId, ym } = currentSlipSelection();
        loadSlip(driverId, ym);
    }
    driverDd.addEventListener('slipmk-dd:change', reload);
    monthDd.addEventListener('slipmk-dd:change', reload);
    renderSlipEmpty('เลือกคนขับก่อน');   // เดือนมี default อยู่แล้ว แต่คนขับยังไม่ได้เลือก
})();

/* ── ถังขยะในตาราง (ซ้าย) — toggle ผู้ใช้จ่ายเอง แล้ว reload รายการ+preview ── */
document.addEventListener('click', e => {
    const btn = e.target.closest('.js-slip-toggle-receipt');
    if (!btn || !TOGGLE_NO_RECEIPT_URL_TPL) return;
    const otId = btn.dataset.otId;
    btn.disabled = true;
    fetch(TOGGLE_NO_RECEIPT_URL_TPL.replace('/0/', `/${otId}/`), {
        method: 'POST',
        headers: { 'X-Requested-With': 'fetch' },
        credentials: 'same-origin'
    })
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); const { driverId, ym } = currentSlipSelection(); return loadSlip(driverId, ym); })
    .catch(() => alert('ทำรายการไม่สำเร็จ ลองใหม่'))
    .finally(() => { btn.disabled = false; });
});

/* ════════════════════════════════════════════════
   TAB "ผู้ใช้จ่ายเอง" — list เดียว ไม่มี filter (feature redesign, page contract 2026-08-08)
   ปุ่ม "นำกลับเข้าใบเสร็จ" = undo no_receipt แล้ว reload หน้า (list ไม่ผูก AJAX swap เหมือน
   #costResults ของแท็บ "ทั้งหมด" — reload ตรงๆ ง่ายกว่าและพอสำหรับ action เดียวของแท็บนี้)
   ════════════════════════════════════════════════ */
document.addEventListener('click', e => {
    const btn = e.target.closest('.js-ot-self-undo');
    if (!btn || !TOGGLE_NO_RECEIPT_URL_TPL) return;
    btn.disabled = true;
    fetch(TOGGLE_NO_RECEIPT_URL_TPL.replace('/0/', `/${btn.dataset.otId}/`), {
        method: 'POST',
        headers: { 'X-Requested-With': 'fetch' },
        credentials: 'same-origin'
    })
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); window.location.reload(); })
    .catch(() => { alert('ทำรายการไม่สำเร็จ ลองใหม่'); btn.disabled = false; });
});

/* ── ปุ่ม "เพิ่มรายการ" — เปิด addOtModal เดิม (openAddModal ประกาศไว้ด้านบนไฟล์นี้แล้ว) ── */
const slipAddBtn = document.getElementById('slipAddBtn');
if (slipAddBtn) slipAddBtn.addEventListener('click', openAddModal);

/* ── ปุ่ม "พิมพ์" บน preview toolbar — เปิด #receiptPreviewModal เดิม (buildReceiptPage/openPreview)
   เฉพาะรายการที่เข้าใบเสร็จของคนขับ+เดือนที่เลือกอยู่ ── */
function printSlipReceipt() {
    const receiptItems = slipItems.filter(o => !o.no_receipt);
    if (!receiptItems.length) { alert('ไม่มีรายการให้ออกใบเสร็จของคนขับ/เดือนนี้'); return; }
    openPreview(receiptItems);
}
const slipPrintBtn = document.getElementById('slipPrintBtn');
if (slipPrintBtn) slipPrintBtn.addEventListener('click', printSlipReceipt);

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

/* Section tabs (page contract redesign, 2026-08-08) — สลับ panel เต็มความกว้าง
   (pattern เดียวกับ bindFleetTabs ใน vehicle_fleet.js) แทนที่ status-chip tabs เดิม
   ที่เคยผูก AJAX ตรงนี้ (ลบ handler เดิมแล้ว — #costTabs ไม่มีในหน้าอีกต่อไป)
   leaveGuard = ฟังก์ชันที่ panel ปัจจุบันฝากไว้ให้ถามก่อนออก (แท็บ "ตั้งค่า OT" ใช้ตอนแก้ค้าง) */
let leaveGuard = null;

(function bindCostSectionTabs() {
    const wrap = document.getElementById('costTab2Wrap');
    if (!wrap) return;
    const panels = document.querySelectorAll('[data-cost-panel]');

    function showPanel(key) {
        panels.forEach(p => p.classList.toggle('d-none', p.id !== `costPanel${key[0].toUpperCase()}${key.slice(1)}`));
    }
    wrap.addEventListener('click', e => {
        const tab = e.target.closest('.tab2-tab');
        if (!tab) return;
        const key = tab.dataset.tab;
        if (leaveGuard && !leaveGuard(() => showPanel(key))) return;   // guard เปิด modal เอง
        showPanel(key);
    });
})();

/* ════════════════════════════════════════════════
   TAB "ตั้งค่า OT" — rate band editor (feature redesign, page contract 2026-08-08)
   แทน rateConfigModal · บันทึกทั้งชุดผ่าน ot_rate_config_update (AJAX) + confirm modal
   validate ฝั่ง client 2 อย่าง: band ข้ามเที่ยงคืน (block) · band ทับกัน (เตือน ไม่ block)
   ════════════════════════════════════════════════ */
(function initRateSettings() {
    const form = document.getElementById('rateSetForm');
    if (!form) return;

    const rowsBox    = document.getElementById('rateSetRows');
    const overlapEl  = document.getElementById('rateSetOverlapWarn');
    const dirtyHint  = document.getElementById('rateSetDirtyHint');
    const saveBtn    = document.getElementById('rateSetSaveBtn');
    const HINT_CLEAN = dirtyHint.textContent;

    const toMin = hm => (hm === '24:00' ? 1440
        : (parseInt(hm.slice(0, 2), 10) * 60 + parseInt(hm.slice(3, 5), 10)));

    /* snapshot = สถานะฟอร์มทั้งชุดเป็น string — เทียบตรงๆ ว่ามีอะไรเปลี่ยนไหม
       (ถูกกว่าไล่ diff ทีละ field และไม่พลาดตอนเพิ่ม/ลบแถว) */
    const snapshot = () => new URLSearchParams(new FormData(form)).toString();
    let baseline = '';
    const isDirty = () => snapshot() !== baseline;

    function rowHtml() {
        const dayOpts = ['<option value="" selected>ทุกวัน</option>']
            .concat(TH_DAYS.map((d, i) => `<option value="${i}">${d}</option>`)).join('');
        return `
        <input type="hidden" name="cfg_id[]" value="">
        <div class="cost-rate-row-field" data-col-full>
            <label class="bb-label">ชื่อช่วง</label>
            <input type="text" name="cfg_label[]" class="bb-input" placeholder="เช่น หัวค่ำ" required>
        </div>
        <div class="cost-rate-row-field">
            <label class="bb-label">เฉพาะวัน</label>
            <select name="cfg_day[]" class="bb-input">${dayOpts}</select>
        </div>
        <div class="cost-rate-row-field">
            <label class="bb-label">เริ่ม</label>
            <input type="time" name="cfg_start[]" class="bb-input" required data-rate-start>
        </div>
        <div class="cost-rate-row-field">
            <label class="bb-label">สิ้นสุด</label>
            <input type="time" name="cfg_end[]" class="bb-input" required data-rate-end>
        </div>
        <div class="cost-rate-row-field">
            <label class="bb-label">อัตรา</label>
            <div class="rateset-rate-cell">
                <input type="number" name="cfg_rate[]" class="bb-input" min="0" step="1" required>
                <select name="cfg_rate_type[]" class="bb-input">
                    <option value="hourly" selected>฿/ชม.</option>
                    <option value="flat_day">เหมา/วัน</option>
                </select>
            </div>
        </div>
        <button type="button" class="bb-btn is-ghost is-icon is-sm js-rateset-remove" title="ลบช่วงนี้">
            <span class="material-symbols-rounded" style="color:var(--bb-dg-tx)">delete</span>
        </button>`;
    }

    function addRow() {
        const row = document.createElement('div');
        row.className = 'cost-rate-row';
        row.setAttribute('data-rate-row', '');
        row.innerHTML = rowHtml();
        rowsBox.appendChild(row);
        row.querySelector('input[name="cfg_label[]"]').focus();
        refresh();
    }

    const rowLabel = row => row.querySelector('input[name="cfg_label[]"]').value || '(ไม่มีชื่อ)';

    /* ลบช่วง: แถวใหม่ (ไม่มี cfg_id) เอาออกจาก DOM ตรงๆ · แถวเดิม (มี cfg_id) ต้อง confirm modal
       ก่อน (แทน confirm() เบราว์เซอร์เดิมของ rateConfigModal) แล้ว soft-delete ผ่าน cfg_delete[]
       hidden input ที่ผูกกับ form ตรงๆ (ไม่ใช่ตัวแถว เพราะแถวถูกลบออกจาก DOM ไปแล้ว) */
    function removeRow(row) {
        row.remove();
        refresh();
    }
    function confirmDeleteRow(row, cfgId) {
        document.getElementById('rateDeleteConfirmName').textContent = rowLabel(row);
        const modalEl = document.getElementById('rateDeleteConfirmModal');
        const modal   = bootstrap.Modal.getOrCreateInstance(modalEl);
        document.getElementById('rateDeleteConfirmBtn').addEventListener('click', () => {
            modal.hide();
            const del = document.createElement('input');
            del.type = 'hidden'; del.name = 'cfg_delete[]'; del.value = cfgId;
            form.appendChild(del);
            removeRow(row);
        }, { once: true });
        modal.show();
    }
    rowsBox.addEventListener('click', e => {
        const rm = e.target.closest('.js-rateset-remove');
        if (!rm) return;
        const row   = rm.closest('[data-rate-row]');
        const cfgId = row.querySelector('input[name="cfg_id[]"]').value;
        if (cfgId) confirmDeleteRow(row, cfgId);
        else removeRow(row);
    });

    /* band ข้ามเที่ยงคืน → คิดเงินไม่ได้ (bug B2) block ไว้ตั้งแต่ client · server ตรวจซ้ำอีกชั้น
       คืนชื่อ band ที่ผิดกลับมาด้วย ให้ modal แจ้งเจาะจงว่าติดตัวไหน */
    function validateRows() {
        const bad = [];
        rowsBox.querySelectorAll('[data-rate-row]').forEach(row => {
            const s = row.querySelector('[data-rate-start]').value;
            const e = row.querySelector('[data-rate-end]').value;
            const old = row.querySelector('.rateset-row-err');
            if (old) old.remove();
            row.classList.remove('is-invalid');
            if (!s || !e || toMin(e) > toMin(s)) return;
            bad.push(rowLabel(row));
            row.classList.add('is-invalid');
            const p = document.createElement('p');
            p.className = 'rateset-row-err';
            p.innerHTML = `<span class="material-symbols-rounded">warning</span>ช่วงข้ามเที่ยงคืนใช้ไม่ได้ — ต้องแยกเป็น ${esc(s)}–24:00 และ 00:00–${esc(e)}`;
            row.appendChild(p);
        });
        return bad;
    }

    /* band ทับกัน = เวลาที่ทับถูกคิดเงินทั้ง 2 band (build_ot_specs วนทุก band ไม่ใช่ first-match)
       เทียบเฉพาะแถว "วันเดียวกัน" — วันเจาะจงกับ "ทุกวัน" ไม่มีทางชนกัน เพราะ _configs_for_day()
       ให้วันเจาะจงชนะทั้งชุด (ไม่ผสมกัน) */
    function detectOverlap() {
        const groups = {};
        rowsBox.querySelectorAll('[data-rate-row]').forEach(row => {
            const s = row.querySelector('[data-rate-start]').value;
            const e = row.querySelector('[data-rate-end]').value;
            if (!s || !e || toMin(e) <= toMin(s)) return;
            const key = row.querySelector('select[name="cfg_day[]"]').value;
            (groups[key] = groups[key] || []).push({ label: rowLabel(row), s: toMin(s), e: toMin(e) });
        });
        for (const key of Object.keys(groups)) {
            const list = groups[key];
            for (let i = 0; i < list.length; i++) {
                for (let j = i + 1; j < list.length; j++) {
                    const a = list[i], b = list[j];
                    const os = Math.max(a.s, b.s), oe = Math.min(a.e, b.e);
                    if (oe > os) return { a: a.label, b: b.label, from: minToHm(os), to: minToHm(oe) };
                }
            }
        }
        return null;
    }
    const minToHm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

    function refresh() {
        validateRows();
        const ov = detectOverlap();
        overlapEl.classList.toggle('d-none', !ov);
        if (ov) {
            overlapEl.querySelector('[data-rate-overlap-text]').innerHTML =
                `ช่วง <b>${esc(ov.a)}</b> กับ <b>${esc(ov.b)}</b> ทับกันที่ ${ov.from}–${ov.to} — เวลาที่ทับจะถูกคิดเงินทั้งสองช่วง`;
        }
        const dirty = isDirty();
        dirtyHint.textContent = dirty ? 'มีการแก้ไขที่ยังไม่ได้บันทึก' : HINT_CLEAN;
        dirtyHint.style.color = dirty ? 'var(--bb-wr-tx)' : 'var(--bb-n400)';
    }

    /* modal ถาม "ทิ้งสิ่งที่แก้ไว้ใช่ไหม?" — ใช้ร่วมปุ่มยกเลิก + leaveGuard (สลับแท็บ) */
    function confirmDiscard(onLeave) {
        const modalEl = document.getElementById('rateDirtyModal');
        const modal   = bootstrap.Modal.getOrCreateInstance(modalEl);
        document.getElementById('rateDirtyLeaveBtn').addEventListener('click', () => {
            modal.hide();
            onLeave();
        }, { once: true });
        document.getElementById('rateDirtyStayBtn').addEventListener('click', () => modal.hide(), { once: true });
        modal.show();
    }

    rowsBox.addEventListener('input', refresh);
    rowsBox.addEventListener('change', refresh);
    document.getElementById('rateSetAddTop').addEventListener('click', addRow);
    document.getElementById('rateSetAddBottom').addEventListener('click', addRow);
    document.getElementById('rateSetCancelBtn').addEventListener('click', () => {
        if (!isDirty()) { window.location.reload(); return; }
        confirmDiscard(() => window.location.reload());
    });

    /* submit → validate → confirm modal → AJAX POST (ไม่ auto-save: config นี้คุมเงินทั้งระบบ) */
    form.addEventListener('submit', e => {
        e.preventDefault();
        const bad = validateRows();
        if (bad.length) {
            document.getElementById('rateMidnightErrorList').innerHTML =
                `ต้องแยกเป็น 2 ท่อนก่อนบันทึก: <b>${bad.map(esc).join(', ')}</b>`;
            bootstrap.Modal.getOrCreateInstance(document.getElementById('rateMidnightErrorModal')).show();
            return;
        }
        const count = rowsBox.querySelectorAll('[data-rate-row]').length;
        document.getElementById('rateSaveConfirmSummary').textContent = `บันทึกทั้งหมด ${count} ช่วง`;
        const modalEl = document.getElementById('rateSaveConfirmModal');
        const modal   = bootstrap.Modal.getOrCreateInstance(modalEl);
        const btn     = document.getElementById('rateSaveConfirmBtn');
        btn.addEventListener('click', () => {
            modal.hide();
            saveBtn.disabled = true;
            fetch(form.action, {
                method: 'POST',
                headers: { 'X-Requested-With': 'fetch' },
                body: new FormData(form),
                credentials: 'same-origin'
            })
            .then(async r => {
                const data = await r.json().catch(() => ({}));
                if (!r.ok || data.ok === false) throw new Error(data.msg || 'HTTP ' + r.status);
                window.location.reload();   // reload ให้ id ของแถวใหม่ + rate strip/JSON blob ตรงกัน
            })
            .catch(err => { alert(err.message || 'บันทึกไม่สำเร็จ'); saveBtn.disabled = false; });
        }, { once: true });
        modal.show();
    });

    /* ออกจากแท็บทั้งที่ยังไม่บันทึก → modal ถามก่อน (สลับแท็บ) / เบราว์เซอร์ถามเอง (ปิด-รีเฟรชหน้า) */
    leaveGuard = proceed => {
        if (document.getElementById('costPanelRate').classList.contains('d-none')) return true;
        if (!isDirty()) return true;
        confirmDiscard(() => {
            baseline = snapshot();   // ยอมทิ้ง → ไม่ให้ถามซ้ำ (ค่าที่แก้ยังคาอยู่จนกด reload/บันทึก)
            refresh();
            proceed();
        });
        return false;
    };
    window.addEventListener('beforeunload', e => {
        if (!document.getElementById('costPanelRate').classList.contains('d-none') && isDirty()) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    baseline = snapshot();
    refresh();
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

/* ── Add OT modal: AJAX submit (เปิด modal ผ่าน slipAddBtn เท่านั้นตอนนี้ — addOtBtn เดิม
   ถูกตัดออกจากหน้าแล้ว, ดู TAB "ใบจ่ายจริง" ด้านบน) ── */
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

const receiptPrintBtn = document.getElementById('receiptPrintBtn');
if (receiptPrintBtn) receiptPrintBtn.addEventListener('click', () => window.print());

/* ════════════════════════════════════════════════
   RATE CONFIG modal — add/remove rows (normal submit / full reload)
   ⚠ legacy: ไม่มีปุ่มเปิด modal นี้ในหน้าแล้ว (แท็บ "ตั้งค่า OT" แทนที่) รอลบพร้อม markup
   ════════════════════════════════════════════════ */
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
            <label class="vc-label">อัตรา</label>
            <input type="number" name="cfg_rate[]" class="vc-input" min="0" step="1" required>
        </div>
        <div class="cost-rate-row-field">
            <label class="vc-label">หน่วย</label>
            <select name="cfg_rate_type[]" class="vc-select">
                <option value="hourly" selected>฿/ชม.</option>
                <option value="flat_day">เหมา/วัน</option>
            </select>
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
