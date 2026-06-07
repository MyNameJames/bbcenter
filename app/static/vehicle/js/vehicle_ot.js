/* pages/ot-admin.js — OT Cost Management page (ES module)
   Depends on:
     - #otCostData (JSON script tag injected by template)
     - Bootstrap 5 modal (global)
     - core/icons.js (lucide wrapper)
*/
import { initIcons } from '../../core/js/icons.js';

const dataEl = document.getElementById('otCostData');
if (!dataEl) {
    // No data injected → nothing to wire
} else {
    let DATA;
    try { DATA = JSON.parse(dataEl.textContent); }
    catch (e) { console.error('ot-admin: bad JSON', e); }

    if (DATA) bootPage(DATA);
}

function bootPage(DATA) {
    const OTS            = DATA.ots || {};
    const RATE_CONFIGS   = DATA.rateConfigs || [];
    const EDIT_URL_TPL   = DATA.editUrlTemplate || '';
    const ACTIVE_STATUS  = DATA.activeStatus || 'all';

    /* ── Slot row builder (edit modal) ─────────────── */
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

    function recomputeTotal() {
        let totalHrs = 0, totalAmt = 0;
        document.querySelectorAll('#editSlotsContainer .cost-slot-row').forEach(row => {
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
            const hrs = Math.round(mins / 60 * 100) / 100;
            const amt = Math.round(hrs * rate * 100) / 100;
            hint.textContent = `${hrs} ชม. × ฿${rate} = ฿${amt.toLocaleString()}`;
            totalHrs += hrs;
            totalAmt += amt;
        });
        document.getElementById('editTotalHrs').textContent = `${Math.round(totalHrs * 100) / 100} ชม.`;
        document.getElementById('editTotalAmt').textContent = `฿${Math.round(totalAmt).toLocaleString()}`;
    }

    function addSlotRow(slot) {
        const container = document.getElementById('editSlotsContainer');
        container.appendChild(buildSlotRow(slot));
        initIcons(container);
        recomputeTotal();
    }

    /* ── Open Edit Modal ───────────────────────────── */
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
        recomputeTotal();

        new bootstrap.Modal(document.getElementById('editOtModal')).show();
    }

    /* ── Print receipt ─────────────────────────────── */
    function populateReceipt(records) {
        const first = records[0];
        const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

        document.getElementById('receiptDate').textContent     = today;
        document.getElementById('receiptName').textContent     = first.driver_name;
        document.getElementById('receiptPhone').textContent    = first.driver_phone;
        document.getElementById('receiptSignName').textContent = `(${first.driver_name})`;

        const tbody = document.getElementById('receiptRows');
        tbody.innerHTML = '';
        let grand = 0;

        records.forEach(ot => {
            const head = document.createElement('tr');
            head.innerHTML = `
                <td colspan="2" style="padding:8px 8px 2px; font-weight:700; color:#3F3F46; border-top:1px solid #E4E4E7; font-size:.8rem;">
                    ${ot.date_display} — ${ot.ot_number}
                    ${ot.destination ? `<span style="font-weight:400; margin-left:8px; color:#71717A;">${ot.destination}</span>` : ''}
                </td>
            `;
            tbody.appendChild(head);

            (ot.slots || []).forEach(s => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="padding:3px 8px 3px 20px; color:#3F3F46;">
                        ${s.label} (${s.start}–${s.end}) ${s.hours} ชม. × ฿${s.rate}
                    </td>
                    <td style="padding:3px 8px; text-align:right;">฿${Math.round(s.amount).toLocaleString()}</td>
                `;
                tbody.appendChild(row);
            });

            const sub = document.createElement('tr');
            sub.innerHTML = `
                <td style="padding:2px 8px 8px; text-align:right; font-size:.75rem; color:#71717A;">รวม OT นี้</td>
                <td style="padding:2px 8px 8px; text-align:right; font-weight:600;">฿${Math.round(ot.total_amount).toLocaleString()}</td>
            `;
            tbody.appendChild(sub);
            grand += ot.total_amount;
        });

        document.getElementById('receiptTotal').textContent = `฿${Math.round(grand).toLocaleString()}`;
    }

    function printSingle(otId) {
        const ot = OTS[String(otId)];
        if (!ot) return;
        populateReceipt([ot]);
        window.print();
    }

    function printAll() {
        const visible = Object.values(OTS).filter(ot =>
            ACTIVE_STATUS === 'all' || ot.status === ACTIVE_STATUS
        );
        if (!visible.length) { alert('ไม่มีข้อมูล OT ในช่วงที่เลือก'); return; }
        populateReceipt(visible);
        window.print();
    }

    /* ── Event wiring ──────────────────────────────── */
    // Row actions (edit / print) — event delegation
    document.addEventListener('click', e => {
        const btn = e.target.closest('[data-cost-action]');
        if (!btn) return;
        const action = btn.dataset.costAction;
        const otId   = btn.dataset.otId;
        if (action === 'edit')  openEditModal(otId);
        if (action === 'print') printSingle(otId);
    });

    // Add-slot button in modal
    const addBtn = document.getElementById('addSlotBtn');
    if (addBtn) addBtn.addEventListener('click', () => addSlotRow(null));

    // Slot remove + recompute (delegated)
    const slotsContainer = document.getElementById('editSlotsContainer');
    if (slotsContainer) {
        slotsContainer.addEventListener('click', e => {
            const rm = e.target.closest('.js-slot-remove');
            if (rm) { rm.closest('.cost-slot-row').remove(); recomputeTotal(); }
        });
        slotsContainer.addEventListener('input',  recomputeTotal);
        slotsContainer.addEventListener('change', recomputeTotal);
    }

    // Print all (visible tab)
    const printAllBtn = document.getElementById('printAllBtn');
    if (printAllBtn) printAllBtn.addEventListener('click', printAll);

    /* ── Rate config modal — add/remove rows ────────── */
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
                <i data-lucide="x" class="vc-icon-sm"></i>
            </button>
        `;
        return row;
    }

    const addRateBtn  = document.getElementById('addRateBtn');
    const rateBox     = document.getElementById('rateConfigContainer');
    const rateForm    = document.getElementById('rateConfigForm');

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
                // Existing row — soft delete: mark + append cfg_delete[] hidden, disable inputs
                if (!confirm('ลบช่วงอัตรานี้ใช่ไหม? OT ที่สร้างใหม่จะไม่ใช้อัตรานี้อีก')) return;
                row.classList.add('is-removed');
                row.querySelectorAll('input').forEach(i => i.disabled = true);
                const del = document.createElement('input');
                del.type = 'hidden'; del.name = 'cfg_delete[]'; del.value = cfgId;
                rateForm.appendChild(del);
                rm.remove();
            } else {
                // New row — just drop from DOM
                row.remove();
            }
        });
    }

    // Auto-submit filter on change
    const filterForm = document.getElementById('filterForm');
    if (filterForm) {
        filterForm.querySelectorAll('select').forEach(sel => {
            sel.addEventListener('change', () => filterForm.submit());
        });
    }
}
