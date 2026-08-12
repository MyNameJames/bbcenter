/* ══════════════════════════════════════════════════
   pages/fuel-admin.js — Fuel Admin Page ("เงินสำรองและค่าใช้จ่าย", ES module)
   - Tabs (tab2) — ภาพรวมทั้งปี / ค้างเบิก / จบแล้ว / ใบเบิกเงิน / เจ้าหน้าที่
   - Bill kebab → open #fuelBillModal in edit mode (pre-filled)
   - "บิลใหม่" (tab ค้างเบิก) → open #fuelBillModal in create mode
   - tab ค้างเบิก: filter chip + checkbox (เฉพาะ "ใช้ไปแล้ว") → "ใส่ใบเบิก" (#attachBillsModal)
   - tab ใบเบิกเงิน: "เปิด" → clone <template id="rbDetail{id}"> เข้า #reimbursementDetailModal
     (ฟอร์ม submit/receive/settle เป็น real DOM จริงจาก server เลย ไม่ reconstruct)
   - tab เจ้าหน้าที่: "จัดการ" → #holderManageModal (set_float/top_up/count/adjust)
   - ปุ่ม "ตั้งค่า" → #fuelSettingsModal (ราคาน้ำมัน/งบทั้งปี/แหล่งเบิก สลับด้วย .bb-seg)
   - Re-init Material icons on shown.bs.modal
══════════════════════════════════════════════════ */
import { initIcons, bindModalReinit } from '../../core/js/icons.js';

/* ── DOM helpers ───────────────────────────────── */
const $  = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function todayISO() {
    const d = new Date();
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
}

function fmtMoney(n) {
    return Number(n || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
}

/* ─────────────────────────────────────────────
   1. TABS — ภาพรวมทั้งปี/ค้างเบิก/จบแล้ว/ใบเบิกเงิน/เจ้าหน้าที่
   (.tab2-tab underline slide เป็น JS กลางของ tab2.html อยู่แล้ว — ที่นี่แค่สลับ panel)
───────────────────────────────────────────── */
function showFuelTab(value) {
    $$('#fuelTabWrap .tab2-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === value));
    $$('.fuel-tab-panel').forEach(p => p.classList.toggle('d-none', p.dataset.tabPanel !== value));
}

function bindFuelTabs() {
    const wrap = $('#fuelTabWrap');
    if (!wrap) return;
    wrap.addEventListener('click', (e) => {
        const tab = e.target.closest('.tab2-tab');
        if (tab && tab.dataset.tab) showFuelTab(tab.dataset.tab);
    });
    $$('[data-tab-goto]').forEach(btn => {
        btn.addEventListener('click', () => showFuelTab(btn.dataset.tabGoto));
    });
}

/* ─────────────────────────────────────────────
   2. BILL MODAL — create / edit / delete
───────────────────────────────────────────── */
function billFieldVisibility() {
    const method = ($('input[name="payment_method"]:checked') || {}).value || 'reserve';
    const holderGroup = $('#bill_holder_group');
    const holderSel = $('#bill_holder_id');
    if (holderGroup) holderGroup.style.display = (method === 'reserve') ? '' : 'none';
    if (holderSel) holderSel.required = (method === 'reserve');

    const category = ($('#bill_category') || {}).value || 'fuel';
    const fuelFields = $('#bill_fuel_fields');
    if (fuelFields) fuelFields.style.display = (category === 'fuel') ? '' : 'none';

    updateQuotaHint();
}

function updateQuotaHint() {
    const hint   = $('#bill_quota_hint');
    const method = ($('input[name="payment_method"]:checked') || {}).value || 'reserve';
    const vid    = ($('#bill_vehicle_id') || {}).value;
    if (!hint) return;
    if (method !== 'card' || !vid) { hint.style.display = 'none'; return; }

    const billDate = ($('#bill_date') || {}).value || todayISO();
    fetch('/api/fuel/quota?vehicle_id=' + encodeURIComponent(vid) + '&bill_date=' + encodeURIComponent(billDate))
        .then(r => r.json())
        .then(data => {
            if (!data.ok || !data.card) { hint.style.display = 'none'; return; }
            hint.style.display = '';
            hint.textContent = 'วงเงินบัตรเดือนนี้เหลือ ' + fmtMoney(data.card.remaining) + ' ฿ (จาก ' + fmtMoney(data.card.limit) + ' ฿)';
            hint.classList.toggle('is-error', data.card.remaining <= 0);
        })
        .catch(() => { hint.style.display = 'none'; });
}

function openBillModal(mode, bill) {
    const modalEl = $('#fuelBillModal');
    const form    = $('#fuelBillForm');
    const title   = $('#fuelBillModalTitle');
    const submit  = $('#fuelBillSubmitLabel');
    const delBtn  = $('#fuelBillDeleteBtn');
    if (!modalEl || !form) return;

    form.reset();

    if (mode === 'edit' && bill) {
        title.textContent  = 'แก้ไขบิล';
        submit.textContent = 'บันทึกการแก้ไข';
        form.action = '/admin/fuel/bill/' + bill.id + '/edit';
        $('#bill_date').value         = bill.date || '';
        $('#bill_amount').value       = bill.amount || '';
        $('#bill_vehicle_id').value   = bill.vehicle_id || '';
        $('#bill_driver_id').value    = bill.driver_id || '';
        $('#bill_category').value     = bill.category || 'fuel';
        $('#bill_liters').value       = bill.liters || '';
        $('#bill_mileage').value      = bill.mileage || '';
        $('#bill_note').value         = bill.note || '';
        $('#bill_holder_id').value    = bill.paid_by_holder_id || '';
        const radio = $('input[name="payment_method"][value="' + (bill.payment_method || 'reserve') + '"]');
        if (radio) radio.checked = true;
        delBtn.style.display = '';
        delBtn.dataset.billId = bill.id;
    } else {
        title.textContent  = 'บิลใหม่';
        submit.textContent = 'บันทึก';
        form.action = '/admin/fuel/bill';
        $('#bill_date').value = todayISO();
        $('#bill_category').value = 'fuel';
        const tr = $('input[name="payment_method"][value="reserve"]');
        if (tr) tr.checked = true;
        delBtn.style.display = 'none';
        delete delBtn.dataset.billId;
    }

    billFieldVisibility();
    const m = bootstrap.Modal.getOrCreateInstance(modalEl);
    m.show();
    initIcons(modalEl);
}

function wireBillModal() {
    $$('[data-fuel-action="bill-create"]').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); openBillModal('create'); });
    });
    $$('[data-fuel-action="bill-edit"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tr = btn.closest('tr');
            if (!tr) return;
            openBillModal('edit', {
                id:                tr.dataset.billId,
                date:              tr.dataset.billDate,
                amount:            tr.dataset.billAmount,
                vehicle_id:        tr.dataset.billVehicleId,
                driver_id:         tr.dataset.billDriverId,
                category:          tr.dataset.billCategory,
                liters:            tr.dataset.billLiters,
                mileage:           tr.dataset.billMileage,
                payment_method:    tr.dataset.billPaymentMethod,
                paid_by_holder_id: tr.dataset.billHolderId,
                note:              tr.dataset.billNote,
            });
        });
    });
    const delBtn = $('#fuelBillDeleteBtn');
    if (delBtn) {
        delBtn.addEventListener('click', () => {
            const id = delBtn.dataset.billId;
            if (!id) return;
            if (!confirm('ลบบิลนี้ใช่หรือไม่? (กระทบใบเบิกที่ผูกอยู่ ถ้ามี)')) return;
            const f = $('#fuelBillDeleteForm');
            f.action = '/admin/fuel/bill/' + id + '/delete';
            f.submit();
        });
    }

    $$('input[name="payment_method"]').forEach(r => r.addEventListener('change', billFieldVisibility));
    const catSel = $('#bill_category');
    if (catSel) catSel.addEventListener('change', billFieldVisibility);
    const vehSel = $('#bill_vehicle_id');
    if (vehSel) vehSel.addEventListener('change', updateQuotaHint);
    const dateInp = $('#bill_date');
    if (dateInp) dateInp.addEventListener('change', updateQuotaHint);
}

/* ─────────────────────────────────────────────
   3. REIMBURSEMENT MODAL — tab ใบเบิกเงิน (P4)
   เปิดใบ = clone เนื้อหาจริงจาก <template id="rbDetail{id}"> (server-rendered, มี form/action
   จริงอยู่แล้ว) เข้า modal — ไม่ reconstruct จาก JSON เพราะเนื้อหามีทั้งฟอร์ม/ตาราง/ปุ่มหลายแบบ
───────────────────────────────────────────── */
function openReimbursementDetail(rbId, title) {
    const modalEl = $('#reimbursementDetailModal');
    const tpl     = document.getElementById('rbDetail' + rbId);
    const content = $('#rbDetailContent');
    if (!modalEl || !tpl || !content) return;

    content.innerHTML = '';
    content.appendChild(tpl.content.cloneNode(true));
    $('#rbDetailTitle').textContent = title || ('ใบเบิก #' + rbId);

    const m = bootstrap.Modal.getOrCreateInstance(modalEl);
    m.show();
    initIcons(modalEl);
}

function wireReimbursementModals() {
    $$('[data-rb-open]').forEach(btn => {
        btn.addEventListener('click', () => {
            openReimbursementDetail(btn.dataset.rbOpen, btn.dataset.rbTitle);
        });
    });

    // ส่งเรื่อง — เตือนถ้ายอดที่พิมพ์ไม่ตรงยอดรวมบิล (spec §5.5)
    document.addEventListener('submit', (e) => {
        const form = e.target;
        if (!form.dataset || form.dataset.rbSubmitTotal === undefined) return;
        const total = parseFloat(form.dataset.rbSubmitTotal);
        const typed = parseFloat((form.querySelector('[name="amount_requested"]') || {}).value);
        if (!isNaN(typed) && Math.abs(typed - total) > 0.01) {
            if (!confirm('ยอดที่พิมพ์ (' + fmtMoney(typed) + ') ไม่ตรงกับยอดรวมบิล (' + fmtMoney(total) + ') ยืนยันส่งเรื่องด้วยยอดนี้?')) {
                e.preventDefault();
            }
        }
    });
}

/* ─────────────────────────────────────────────
   4. SETTINGS MODAL — ราคาน้ำมัน / งบทั้งปี / แหล่งเบิก (.bb-seg สลับ panel)
───────────────────────────────────────────── */
function settingsSetMode(mode) {
    $$('#settingsModeSeg [data-settings-mode]').forEach(b => b.classList.toggle('is-on', b.dataset.settingsMode === mode));
    $$('.settings-panel').forEach(p => p.classList.toggle('d-none', p.dataset.settingsMode !== mode));
}

function wireSettingsModal() {
    const modalEl = $('#fuelSettingsModal');
    if (!modalEl) return;
    modalEl.addEventListener('show.bs.modal', () => {
        const d = $('#price_effective_date');
        if (d && !d.value) d.value = todayISO();
    });
    $$('#settingsModeSeg [data-settings-mode]').forEach(b => {
        b.addEventListener('click', () => settingsSetMode(b.dataset.settingsMode));
    });
}

/* ─────────────────────────────────────────────
   5. PENDING BILLS (ค้างเบิก) — filter chip + checkbox + ใส่ใบเบิก
───────────────────────────────────────────── */
function wirePendingFilterChips() {
    const wrap = $('#pendingFilterChips');
    if (!wrap) return;
    wrap.querySelectorAll('[data-vehicle-filter]').forEach(chip => {
        chip.addEventListener('click', () => {
            wrap.querySelectorAll('[data-vehicle-filter]').forEach(c => c.classList.remove('is-on'));
            chip.classList.add('is-on');
            const key = chip.dataset.vehicleFilter;
            $$('#pendingBillsBody tr[data-bill-id]').forEach(tr => {
                const show = !key || tr.dataset.vehicleKey === key;
                tr.style.display = show ? '' : 'none';
            });
        });
    });
}

function refreshAttachButton() {
    const ids = $$('.pending-check:checked').map(cb => cb.value);
    const btn = $('#attachBillsBtn');
    const lbl = $('#pendingSelectedCount');
    if (!btn) return;
    btn.disabled = (ids.length === 0);
    if (lbl) lbl.textContent = ids.length ? ' (' + ids.length + ')' : '';
}

function wirePendingCheckboxes() {
    const checkAll = $('#pendingCheckAll');
    if (checkAll) {
        checkAll.addEventListener('change', () => {
            $$('.pending-check:not(:disabled)').forEach(cb => {
                if (cb.closest('tr').style.display !== 'none') cb.checked = checkAll.checked;
            });
            refreshAttachButton();
        });
    }
    $$('.pending-check').forEach(cb => cb.addEventListener('change', refreshAttachButton));
    refreshAttachButton();
}

function openAttachModal() {
    const ids = $$('.pending-check:checked').map(cb => cb.value);
    if (!ids.length) return;
    const modalEl = $('#attachBillsModal');
    const hidden  = $('#attachBillsHidden');
    if (!modalEl || !hidden) return;

    hidden.innerHTML = '';
    let total = 0;
    ids.forEach(id => {
        const tr = document.querySelector('#pendingBillsBody tr[data-bill-id="' + id + '"]');
        if (tr) total += parseFloat(tr.dataset.billAmount || '0');
        const inp = document.createElement('input');
        inp.type = 'hidden'; inp.name = 'bill_ids'; inp.value = id;
        hidden.appendChild(inp);
    });
    $('#attachBillCount').textContent = ids.length;
    $('#attachBillTotal').textContent = fmtMoney(total);

    const m = bootstrap.Modal.getOrCreateInstance(modalEl);
    m.show();
    initIcons(modalEl);
}

function attachSetMode(mode) {
    $$('#attachModeSeg [data-attach-mode]').forEach(b => b.classList.toggle('is-on', b.dataset.attachMode === mode));
    $$('.attach-mode-panel').forEach(p => {
        p.classList.toggle('d-none', (mode === 'existing') !== (p.id === 'attachExisting'));
    });
    const form = $('#attachBillsForm');
    if (form) form.action = (mode === 'existing') ? '/admin/fuel/attach-bills' : '/admin/fuel/reimbursement/draft';
}

function wireAttachModal() {
    const btn = $('#attachBillsBtn');
    if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); openAttachModal(); });

    $$('#attachModeSeg [data-attach-mode]').forEach(b => {
        b.addEventListener('click', () => attachSetMode(b.dataset.attachMode));
    });
    $$('[data-attach-rb-pick]').forEach(r => {
        r.addEventListener('change', () => { $('#attachRbId').value = r.value; });
    });
}

/* ─────────────────────────────────────────────
   6. FINISHED BILLS (จบแล้ว) — filter chip รถ + chip สถานะย่อย (AND กัน, client-side)
───────────────────────────────────────────── */
function applyFinishedFilters() {
    const vehKey = ($('#finishedFilterChips .ue-chip.is-on') || {}).dataset?.vehicleFilter || '';
    const status = ($('#finishedStatusChips .ue-chip.is-on') || {}).dataset?.statusFilter || '';
    $$('#finishedBillsBody tr[data-bill-id]').forEach(tr => {
        const matchVeh = !vehKey || tr.dataset.vehicleKey === vehKey;
        const matchStatus = !status || tr.dataset.finishedStatus === status;
        tr.style.display = (matchVeh && matchStatus) ? '' : 'none';
    });
}

function wireFinishedFilterChips() {
    const vehWrap = $('#finishedFilterChips');
    if (vehWrap) {
        vehWrap.querySelectorAll('[data-vehicle-filter]').forEach(chip => {
            chip.addEventListener('click', () => {
                vehWrap.querySelectorAll('[data-vehicle-filter]').forEach(c => c.classList.remove('is-on'));
                chip.classList.add('is-on');
                applyFinishedFilters();
            });
        });
    }
    const statusWrap = $('#finishedStatusChips');
    if (statusWrap) {
        statusWrap.querySelectorAll('[data-status-filter]').forEach(chip => {
            chip.addEventListener('click', () => {
                statusWrap.querySelectorAll('[data-status-filter]').forEach(c => c.classList.remove('is-on'));
                chip.classList.add('is-on');
                applyFinishedFilters();
            });
        });
    }
}

/* ─────────────────────────────────────────────
   7. HOLDER MODALS — เพิ่มเจ้าหน้าที่ + จัดการเงินสำรอง
   (set_float / top_up / count / adjust ใน modal เดียว สลับด้วย .bb-seg)
───────────────────────────────────────────── */
const HM_TYPE_LABEL = {
    set_float: 'ตั้ง/แก้วงเงิน', top_up: 'เติมเงิน',
    adjust: 'ปรับยอด', count: 'นับเงินจริง',
};

function hmRenderHistory(logs) {
    const box = $('#hmHistory');
    if (!box) return;
    if (!logs || !logs.length) { box.textContent = 'ยังไม่มีประวัติ'; return; }
    box.innerHTML = logs.map(function (log) {
        const label = HM_TYPE_LABEL[log.type] || log.type;
        const sign  = log.change > 0 ? '+' : '';
        const color = log.change > 0 ? 'var(--bb-ok-tx)' : (log.change < 0 ? 'var(--bb-dg-tx)' : 'var(--bb-mut)');
        return '<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--bb-n100)">' +
            '<span>' + log.date + ' · ' + label + (log.note ? ' — ' + log.note : '') + '</span>' +
            '<span class="bb-num" style="color:' + color + ';white-space:nowrap">' + sign + fmtMoney(log.change) + '</span>' +
            '</div>';
    }).join('');
}

function hmSetMode(mode) {
    $$('#hmModeSeg [data-hm-mode]').forEach(function (b) {
        b.classList.toggle('is-on', b.dataset.hmMode === mode);
    });
    $$('.hm-form').forEach(function (f) {
        f.classList.toggle('d-none', f.dataset.hmMode !== mode);
    });
}

function openHolderManageModal(data) {
    const modalEl = $('#holderManageModal');
    if (!modalEl) return;

    $('#hmName').textContent      = data.name || '—';
    $('#hmFloat').textContent     = fmtMoney(data.float_amount);
    $('#hmUsed').textContent      = fmtMoney(data.used);
    $('#hmSubmitted').textContent = fmtMoney(data.submitted);
    $('#hmBalance').textContent   = fmtMoney(data.balance);

    const base = '/admin/fuel/holder/' + data.id;
    $('#hmFormSetFloat').action = base + '/set-float';
    $('#hmFormTopUp').action    = base + '/topup';
    $('#hmFormCount').action    = base + '/count';
    $('#hmFormAdjust').action   = base + '/adjust';
    $('#hmFormSetFloat').dataset.hmMode = 'set_float';
    $('#hmFormTopUp').dataset.hmMode    = 'top_up';
    $('#hmFormCount').dataset.hmMode    = 'count';
    $('#hmFormAdjust').dataset.hmMode   = 'adjust';

    $('#hmSetFloatAmt').value = data.float_amount;
    $('#hmTopUpAmt').value = '';
    $('#hmCountAmt').value = '';
    $('#hmAdjustAmt').value = '';
    $('#hmSetFloatNote').value = '';
    $('#hmTopUpNote').value = '';
    $('#hmCountNote').value = '';
    $('#hmAdjustNote').value = '';
    $('#hmCountPreview').textContent = 'กรอกยอดที่นับได้จริง — ระบบจะเทียบกับคงเหลือให้';

    const balance = parseFloat(data.balance) || 0;
    const countInp = $('#hmCountAmt');
    if (countInp && countInp.dataset.wired === undefined) {
        countInp.dataset.wired = '1';
        countInp.addEventListener('input', function () {
            const v = parseFloat(countInp.value);
            const prev = $('#hmCountPreview');
            if (isNaN(v)) { prev.textContent = 'กรอกยอดที่นับได้จริง — ระบบจะเทียบกับคงเหลือให้'; return; }
            const diff = v - parseFloat($('#holderManageModal').dataset.balance || '0');
            if (diff === 0) { prev.textContent = 'ตรงกับคงเหลือในระบบพอดี'; return; }
            const sign = diff > 0 ? '+' : '';
            prev.textContent = 'ต่างจากคงเหลือในระบบ ' + sign + fmtMoney(diff) + ' บาท';
        });
    }
    modalEl.dataset.balance = balance;

    hmRenderHistory(data.logs || []);
    hmSetMode('set_float');

    const m = bootstrap.Modal.getOrCreateInstance(modalEl);
    m.show();
    initIcons(modalEl);
}

function wireHolderModals() {
    $$('[data-holder-action="manage"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            let logs = [];
            try { logs = JSON.parse(btn.dataset.holderLogs || '[]'); } catch (e) { logs = []; }
            openHolderManageModal({
                id: btn.dataset.holderId,
                name: btn.dataset.holderName,
                float_amount: btn.dataset.holderFloat,
                used: btn.dataset.holderUsed,
                submitted: btn.dataset.holderSubmitted,
                balance: btn.dataset.holderBalance,
                logs: logs,
            });
        });
    });

    $$('#hmModeSeg [data-hm-mode]').forEach(function (b) {
        b.addEventListener('click', function () { hmSetMode(b.dataset.hmMode); });
    });

    const submitBtn = $('#hmSubmitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', function () {
            const form = $('.hm-form:not(.d-none)');
            if (!form) return;
            if (!form.reportValidity()) return;
            form.submit();
        });
    }
}

/* ─────────────────────────────────────────────
   Init (module is deferred — DOM is ready)
───────────────────────────────────────────── */
if (typeof bootstrap === 'undefined') {
    console.warn('[fuel-admin] bootstrap not loaded yet — modals will not work');
} else {
    bindFuelTabs();
    wireBillModal();
    wireReimbursementModals();
    wireSettingsModal();
    wirePendingFilterChips();
    wireFinishedFilterChips();
    wirePendingCheckboxes();
    wireAttachModal();
    wireHolderModals();
    bindModalReinit();
}
