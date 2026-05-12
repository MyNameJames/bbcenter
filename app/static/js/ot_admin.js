/* ot_admin.js — OT Management Page
   Requires: OT_MAP, OT_DATA, RATE_CONFIGS, EDIT_URL_TEMPLATE (injected by template)
*/
'use strict';

/* ── Tab Switching ──────────────────────────────── */
function switchTab(btn, status) {
    document.querySelectorAll('.ot-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('#otTable tbody tr[data-status]').forEach(tr => {
        tr.style.display = (status === 'all' || tr.dataset.status === status) ? '' : 'none';
    });
}

/* ── Slot helpers ───────────────────────────────── */
function _slotLabel(cfgId) {
    const c = RATE_CONFIGS.find(r => r.id === cfgId);
    return c ? c.label : '—';
}

function _makeSlotRow(idx, s) {
    const opts = RATE_CONFIGS.map(c =>
        `<option value="${c.id}" data-rate="${c.rate}" ${(s && s.cfg_id === c.id) ? 'selected' : ''}>
            ${c.label} ฿${c.rate}/ชม. (${c.start}–${c.end})
        </option>`
    ).join('');
    const st = s ? s.start : '';
    const en = s ? s.end   : '';
    return `
    <div class="slot-row row g-2 align-items-end" data-idx="${idx}">
        <div class="col-12 col-sm-5">
            <label class="ds-label">ช่วง OT</label>
            <select name="slot_cfg[]" class="ds-select slot-cfg-select" onchange="calcEditTotal()">${opts}</select>
        </div>
        <div class="col-5 col-sm-3">
            <label class="ds-label">เริ่ม</label>
            <input type="time" name="slot_start[]" class="ds-input slot-start" value="${st}" onchange="calcEditTotal()">
        </div>
        <div class="col-5 col-sm-3">
            <label class="ds-label">สิ้นสุด</label>
            <input type="time" name="slot_end[]" class="ds-input slot-end" value="${en}" onchange="calcEditTotal()">
        </div>
        <div class="col-2 col-sm-1 d-flex align-items-end pb-1">
            <button type="button" onclick="removeSlotRow(this)"
                style="background:none;border:1px solid #FECACA;color:#DC2626;border-radius:4px;padding:5px 7px;cursor:pointer;line-height:1;">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <div class="col-12">
            <small class="slot-hrs text-muted"></small>
        </div>
    </div>`;
}

function addEditSlot() {
    const c = document.getElementById('editSlotsContainer');
    const idx = c.children.length;
    c.insertAdjacentHTML('beforeend', _makeSlotRow(idx, null));
    calcEditTotal();
}

function removeSlotRow(btn) {
    btn.closest('.slot-row').remove();
    calcEditTotal();
}

function calcEditTotal() {
    let totalHrs = 0, totalAmt = 0;
    document.querySelectorAll('#editSlotsContainer .slot-row').forEach(row => {
        const sel   = row.querySelector('.slot-cfg-select');
        const start = row.querySelector('.slot-start').value;
        const end   = row.querySelector('.slot-end').value;
        const small = row.querySelector('.slot-hrs');
        if (!sel || !start || !end) { small.textContent = ''; return; }
        const rate  = parseFloat(sel.selectedOptions[0]?.dataset.rate || 0);
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        const mins  = (eh * 60 + em) - (sh * 60 + sm);
        if (mins <= 0) { small.textContent = 'ช่วงเวลาไม่ถูกต้อง'; small.style.color = '#DC2626'; return; }
        const hrs  = Math.round(mins / 60 * 100) / 100;
        const amt  = Math.round(hrs * rate * 100) / 100;
        small.textContent = `${hrs} ชม. × ฿${rate} = ฿${amt.toLocaleString()}`;
        small.style.color = '';
        totalHrs += hrs;
        totalAmt += amt;
    });
    document.getElementById('editTotalHrs').textContent = `${Math.round(totalHrs * 100) / 100} ชม.`;
    document.getElementById('editTotalAmt').textContent = `฿${Math.round(totalAmt).toLocaleString()}`;
}

/* ── Open Edit Modal ────────────────────────────── */
function openEditModal(otId) {
    const ot = OT_MAP[otId];
    if (!ot) return;

    document.getElementById('editModalTitle').textContent = `แก้ไข ${ot.ot_number}`;
    document.getElementById('editDriverId').value = ot.driver_id;
    document.getElementById('editDate').value      = ot.date;
    document.getElementById('editNote').value      = ot.note;

    const url = EDIT_URL_TEMPLATE.replace('{id}', otId);
    document.getElementById('editOtForm').action = url;

    const c = document.getElementById('editSlotsContainer');
    c.innerHTML = '';
    (ot.slots || []).forEach((s, i) => c.insertAdjacentHTML('beforeend', _makeSlotRow(i, s)));

    calcEditTotal();
    new bootstrap.Modal(document.getElementById('editOtModal')).show();
}

/* ── Print: single record ───────────────────────── */
function printSingle(otId) {
    const ot = OT_MAP[otId];
    if (!ot) return;
    _populatePrintReceipt([ot]);
    window.print();
}

/* ── Print: all visible rows (per driver) ──────── */
function printDriverReceipt() {
    const activeStatus = document.querySelector('.ot-tab.active')?.dataset?.statusVal || 'all';
    const visible = OT_DATA
        .map(id => OT_MAP[id])
        .filter(ot => ot && (activeStatus === 'all' || ot.status === activeStatus));
    if (!visible.length) { alert('ไม่มีข้อมูล OT ในช่วงที่เลือก'); return; }
    _populatePrintReceipt(visible);
    window.print();
}

/* ── Populate #printReceipt ─────────────────────── */
function _populatePrintReceipt(records) {
    // Use first record's driver info (assumes single driver or group)
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
        // Section header: date + OT number
        tbody.insertAdjacentHTML('beforeend',
            `<tr>
                <td colspan="2" style="padding:8px 8px 2px; font-weight:700; color:#3F3F46; border-top:1px solid #E4E4E7; font-size:.8rem;">
                    ${ot.date} — ${ot.ot_number}
                    ${ot.destination ? `<span style="font-weight:400; margin-left:8px; color:#71717A;">${ot.destination}</span>` : ''}
                </td>
            </tr>`
        );

        // Slot rows
        (ot.slots || []).forEach(s => {
            tbody.insertAdjacentHTML('beforeend',
                `<tr>
                    <td style="padding:3px 8px 3px 20px; color:#3F3F46;">
                        ${s.label} (${s.start}–${s.end}) ${s.hours} ชม. × ฿${s.rate}
                    </td>
                    <td style="padding:3px 8px; text-align:right;">฿${Math.round(s.amount).toLocaleString()}</td>
                </tr>`
            );
        });

        // Sub-total per record
        tbody.insertAdjacentHTML('beforeend',
            `<tr>
                <td style="padding:2px 8px 8px; text-align:right; font-size:.75rem; color:#71717A;">รวม OT นี้</td>
                <td style="padding:2px 8px 8px; text-align:right; font-weight:600;">฿${Math.round(ot.total_amount).toLocaleString()}</td>
            </tr>`
        );
        grand += ot.total_amount;
    });

    document.getElementById('receiptTotal').textContent = `฿${Math.round(grand).toLocaleString()}`;
}

/* ── On load: restore active tab from page state ── */
document.addEventListener('DOMContentLoaded', () => {
    // If server rendered with a status param, mark the right tab active
    const activeTab = document.querySelector('.ot-tab.active');
    if (activeTab) {
        const onclick = activeTab.getAttribute('onclick') || '';
        const m = onclick.match(/'(\w+)'\)/);
        if (m) {
            const status = m[1];
            // Tag each tab with its status for printDriverReceipt()
            document.querySelectorAll('.ot-tab').forEach(b => {
                const om = (b.getAttribute('onclick') || '').match(/'(\w+)'\)/);
                if (om) b.dataset.statusVal = om[1];
            });
            if (status !== 'all') {
                document.querySelectorAll('#otTable tbody tr[data-status]').forEach(tr => {
                    tr.style.display = (tr.dataset.status === status) ? '' : 'none';
                });
            }
        }
    }
});
