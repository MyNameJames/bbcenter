/* ============================================================
   Fuel Admin Page — JS controller
   ────────────────────────────────────────────────────────────
   Phase 2.6 — wires up:
     - Bill checkbox → enable "รวมบิลที่เลือก" + count
     - Bill kebab → open #fuelBillModal in edit mode (pre-filled)
     - "+ บิลใหม่" / empty CTA → open #fuelBillModal in create mode
     - "รวมบิลที่เลือก" → open #fuelReimbModal in create mode (selected bills)
     - Reimb collapse: "บันทึกได้เงิน" / "แก้ไข" / "ลบ" → trigger
     - KPI "ตั้งค่า" → open reserve / budget modals
     - Header "ตั้งค่าราคา" → open price modal
     - Reserve modal: live preview ของ new balance
     - Re-init Lucide icons after dynamic DOM updates
   ============================================================ */
(function () {
    'use strict';

    /* ── Lucide re-init helper ─────────────────────────── */
    function initIcons(scope) {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            try { window.lucide.createIcons({ root: scope || document.body }); }
            catch (e) { /* lucide not ready yet */ }
        }
    }

    /* ── DOM helpers ───────────────────────────────────── */
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

    /* ── State ─────────────────────────────────────────── */
    const state = {
        // Map<bill_id, { date, vehicle_label, driver_label, amount }>
        bills: new Map(),
    };

    // Cache bill row data once on load (used by reimb modal summary)
    function indexBillRows() {
        $$('#fuelBillsBody tr[data-bill-id]').forEach(tr => {
            const id = tr.dataset.billId;
            state.bills.set(id, {
                date:    tr.dataset.billDate    || '',
                vehicle: tr.dataset.billVehicle || '',
                driver:  tr.dataset.billDriver  || '',
                amount:  parseFloat(tr.dataset.billAmount || '0'),
            });
        });
    }


    /* ─────────────────────────────────────────────
       1. BILL CHECKBOXES → merge button enable
    ───────────────────────────────────────────── */
    function getCheckedBills() {
        return $$('.bill-check:checked').map(cb => cb.value);
    }

    function refreshMergeButton() {
        const ids = getCheckedBills();
        const btn = $('#mergeBillsBtn');
        const lbl = $('#selectedCount');
        if (!btn) return;
        btn.disabled = (ids.length === 0);
        if (lbl) lbl.textContent = ids.length ? ` (${ids.length})` : '';
    }

    function wireBillCheckboxes() {
        const checkAll = $('#checkAll');
        if (checkAll) {
            checkAll.disabled = false;     // enable now that JS is live
            checkAll.addEventListener('change', () => {
                $$('.bill-check:not(:disabled)').forEach(cb => { cb.checked = checkAll.checked; });
                refreshMergeButton();
            });
        }
        $$('.bill-check').forEach(cb => {
            // remove the "Phase 2.6" disabled flag set in template
            // (only re-enable for status === 'รอเบิก')
            const tr = cb.closest('tr');
            if (tr && tr.dataset.status === 'รอเบิก') cb.disabled = false;
            cb.addEventListener('change', refreshMergeButton);
        });
        refreshMergeButton();
    }


    /* ─────────────────────────────────────────────
       2. BILL MODAL — create / edit / delete
    ───────────────────────────────────────────── */
    function openBillModal(mode, bill) {
        const modalEl = $('#fuelBillModal');
        const form    = $('#fuelBillForm');
        const title   = $('#fuelBillModalTitle');
        const submit  = $('#fuelBillSubmitLabel');
        const delBtn  = $('#fuelBillDeleteBtn');
        if (!modalEl || !form) return;

        // Reset
        form.reset();

        if (mode === 'edit' && bill) {
            title.textContent  = 'แก้ไขบิล';
            submit.textContent = 'บันทึกการแก้ไข';
            form.action = '/admin/fuel/bill/' + bill.id + '/edit';
            $('#bill_date').value         = bill.date || '';
            $('#bill_amount').value       = bill.amount || '';
            $('#bill_vehicle_id').value   = bill.vehicle_id || '';
            $('#bill_driver_id').value    = bill.driver_id || '';
            $('#bill_mileage').value      = bill.mileage || '';
            $('#bill_note').value         = bill.note || '';
            const radio = $('input[name="payment_method"][value="' + (bill.payment_method || 'transfer') + '"]');
            if (radio) radio.checked = true;
            // Show delete
            delBtn.style.display = '';
            delBtn.dataset.billId = bill.id;
        } else {
            title.textContent  = 'บิลใหม่';
            submit.textContent = 'บันทึก';
            form.action = '/admin/fuel/bill';
            $('#bill_date').value = todayISO();
            const tr = $('input[name="payment_method"][value="transfer"]');
            if (tr) tr.checked = true;
            delBtn.style.display = 'none';
            delete delBtn.dataset.billId;
        }

        const m = bootstrap.Modal.getOrCreateInstance(modalEl);
        m.show();
        initIcons(modalEl);
    }

    function wireBillModal() {
        // "+ บิลใหม่" buttons (header + empty state)
        $$('[data-fuel-action="bill-create"]').forEach(btn => {
            btn.addEventListener('click', () => openBillModal('create'));
        });
        // Row kebab → edit
        $$('[data-fuel-action="bill-edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tr = btn.closest('tr');
                if (!tr) return;
                openBillModal('edit', {
                    id:              tr.dataset.billId,
                    date:            tr.dataset.billDate,
                    amount:          tr.dataset.billAmount,
                    vehicle_id:      tr.dataset.billVehicleId,
                    driver_id:       tr.dataset.billDriverId,
                    mileage:         tr.dataset.billMileage,
                    payment_method:  tr.dataset.billPaymentMethod,
                    note:            tr.dataset.billNote,
                });
            });
        });
        // Delete in edit mode
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
    }


    /* ─────────────────────────────────────────────
       3. REIMBURSEMENT MODAL — create + edit
    ───────────────────────────────────────────── */
    function renderReimbBillRows(billIds) {
        const tbody  = $('#fuelReimbBillTbody');
        const hidden = $('#fuelReimbBillHidden');
        const cnt    = $('#fuelReimbBillCount');
        const tot    = $('#fuelReimbBillTotal');
        if (!tbody) return 0;

        tbody.innerHTML = '';
        hidden.innerHTML = '';
        let total = 0;
        billIds.forEach(id => {
            const b = state.bills.get(String(id));
            if (!b) return;
            total += b.amount;
            const tr = document.createElement('tr');
            tr.innerHTML =
                '<td class="vc-td-muted">' + (b.date || '—') + '</td>' +
                '<td>' + (b.vehicle || '—') + '</td>' +
                '<td class="vc-td-muted">' + (b.driver || '—') + '</td>' +
                '<td class="vc-td-num">' + fmtMoney(b.amount) + '</td>';
            tbody.appendChild(tr);
            const inp = document.createElement('input');
            inp.type = 'hidden';
            inp.name = 'bill_ids';
            inp.value = id;
            hidden.appendChild(inp);
        });
        cnt.textContent = billIds.length;
        tot.textContent = fmtMoney(total);
        return total;
    }

    function openReimbCreate() {
        const ids = getCheckedBills();
        if (ids.length === 0) {
            alert('กรุณาเลือกบิลที่ "รอเบิก" ก่อน');
            return;
        }
        const modalEl = $('#fuelReimbModal');
        const form    = $('#fuelReimbForm');
        if (!modalEl || !form) return;

        form.reset();
        form.action = '/admin/fuel/reimbursement';
        $('#fuelReimbModalTitle').textContent = 'รวม ' + ids.length + ' บิลเป็นใบเบิก';
        $('#fuelReimbSubmitLabel').textContent = 'สร้างใบเบิก';
        $('#fuelReimbReceivedWrap').style.display = 'none';
        $('#reimb_submitted_at').value = todayISO();

        renderReimbBillRows(ids);

        const m = bootstrap.Modal.getOrCreateInstance(modalEl);
        m.show();
        initIcons(modalEl);
    }

    function openReimbEdit(rb) {
        const modalEl = $('#fuelReimbModal');
        const form    = $('#fuelReimbForm');
        if (!modalEl || !form) return;

        form.reset();
        form.action = '/admin/fuel/reimbursement/' + rb.id + '/edit';
        $('#fuelReimbModalTitle').textContent = 'แก้ไขใบเบิก ' + (rb.no || '');
        $('#fuelReimbSubmitLabel').textContent = 'บันทึกการแก้ไข';
        $('#reimbursement_no').value      = rb.no || '';
        $('#reimb_source').value          = rb.source || '';
        $('#reimb_submitted_at').value    = rb.submitted_at || '';
        $('#reimb_received_at').value     = rb.received_at || '';
        $('#reimb_note').value            = rb.note || '';
        $('#fuelReimbReceivedWrap').style.display = '';   // show received_at field

        renderReimbBillRows(rb.bill_ids || []);

        const m = bootstrap.Modal.getOrCreateInstance(modalEl);
        m.show();
        initIcons(modalEl);
    }

    function wireReimbModal() {
        const mergeBtn = $('#mergeBillsBtn');
        if (mergeBtn) {
            mergeBtn.disabled = false;     // enable now (was disabled in template until 2.6)
            refreshMergeButton();          // re-evaluate based on checked count
            mergeBtn.addEventListener('click', openReimbCreate);
        }

        // Edit reimbursement (from collapse body)
        $$('[data-fuel-action="reimb-edit"]').forEach(btn => {
            btn.addEventListener('click', () => {
                openReimbEdit({
                    id:           btn.dataset.rbId,
                    no:           btn.dataset.rbNo,
                    source:       btn.dataset.rbSource,
                    submitted_at: btn.dataset.rbSubmittedAt,
                    received_at:  btn.dataset.rbReceivedAt,
                    note:         btn.dataset.rbNote,
                    bill_ids:     (btn.dataset.rbBillIds || '').split(',').filter(Boolean),
                });
            });
        });

        // Receive reimbursement → confirm + submit form
        $$('[data-fuel-action="reimb-receive"]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!confirm('บันทึกว่าได้รับเงินคืนสำหรับใบเบิก ' + (btn.dataset.rbNo || '') + ' วันนี้ใช่หรือไม่?')) return;
                const id = btn.dataset.rbId;
                const f  = document.createElement('form');
                f.method = 'POST';
                f.action = '/admin/fuel/reimbursement/' + id + '/receive';
                document.body.appendChild(f);
                f.submit();
            });
        });

        // Delete reimbursement → confirm + submit
        $$('[data-fuel-action="reimb-delete"]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!confirm('ลบใบเบิก ' + (btn.dataset.rbNo || '') + ' ?\nบิลที่อยู่ในใบเบิกนี้จะกลับเป็นสถานะ "รอเบิก"')) return;
                const id = btn.dataset.rbId;
                const f  = document.createElement('form');
                f.method = 'POST';
                f.action = '/admin/fuel/reimbursement/' + id + '/delete';
                document.body.appendChild(f);
                f.submit();
            });
        });
    }


    /* ─────────────────────────────────────────────
       4. RESERVE MODAL — open + live preview
    ───────────────────────────────────────────── */
    function wireReserveModal() {
        $$('[data-fuel-action="reserve-open"]').forEach(btn => {
            btn.disabled = false;
            btn.addEventListener('click', () => {
                const modalEl = $('#fuelReserveModal');
                if (!modalEl) return;
                const m = bootstrap.Modal.getOrCreateInstance(modalEl);
                m.show();
                initIcons(modalEl);
            });
        });

        // Live preview: current + change = preview
        const changeInp  = $('#reserve_change');
        const previewInp = $('#reserve_preview');
        if (changeInp && previewInp && previewInp.dataset.current === undefined) {
            // current passed via data-current on preview input (set in template via data attr)
            // For now read from KPI value cell (avoids template change)
            const current = parseFloat(
                ($('[data-fuel-kpi="reserve-amount"]')?.dataset.value) || '0'
            );
            const update = () => {
                const v = parseFloat(changeInp.value);
                if (isNaN(v)) { previewInp.value = '—'; return; }
                const after = current + v;
                previewInp.value = fmtMoney(after) + ' ฿';
            };
            changeInp.addEventListener('input', update);
        }
    }


    /* ─────────────────────────────────────────────
       5. PRICE MODAL — open
    ───────────────────────────────────────────── */
    function wirePriceModal() {
        $$('[data-fuel-action="price-open"]').forEach(btn => {
            btn.disabled = false;
            btn.addEventListener('click', () => {
                const modalEl = $('#fuelPriceModal');
                if (!modalEl) return;
                // pre-fill date with today
                const d = $('#price_effective_date');
                if (d && !d.value) d.value = todayISO();
                const m = bootstrap.Modal.getOrCreateInstance(modalEl);
                m.show();
                initIcons(modalEl);
            });
        });
    }


    /* ─────────────────────────────────────────────
       6. ANNUAL BUDGET MODAL — open
    ───────────────────────────────────────────── */
    function wireBudgetModal() {
        $$('[data-fuel-action="budget-open"]').forEach(btn => {
            btn.disabled = false;
            btn.addEventListener('click', () => {
                const modalEl = $('#fuelBudgetModal');
                if (!modalEl) return;
                const m = bootstrap.Modal.getOrCreateInstance(modalEl);
                m.show();
                initIcons(modalEl);
            });
        });
    }


    /* ─────────────────────────────────────────────
       7. FILTER BAR — auto-submit on select change
    ───────────────────────────────────────────── */
    function wireFilterBar() {
        const form = $('#filterForm');
        if (!form) return;
        $$('.vc-filter-select', form).forEach(sel => {
            sel.addEventListener('change', () => form.submit());
        });
    }


    /* ─────────────────────────────────────────────
       8. Init
    ───────────────────────────────────────────── */
    function init() {
        if (typeof bootstrap === 'undefined') {
            console.warn('[fuel_admin] bootstrap not loaded yet — modals will not work');
            return;
        }
        indexBillRows();
        wireBillCheckboxes();
        wireBillModal();
        wireReimbModal();
        wireReserveModal();
        wirePriceModal();
        wireBudgetModal();
        wireFilterBar();

        // Re-init Lucide on all modals when shown (icons inside conditional content)
        document.addEventListener('shown.bs.modal', (e) => initIcons(e.target));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
