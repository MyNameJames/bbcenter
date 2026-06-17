// pages/repair.js — /repair page entry (ระบบแจ้งซ่อมไอที)
//
// ES module. Loads after DOM parse (implicit defer), so no
// jQuery $(document).ready() wrapper needed. jQuery itself is still
// used as a global for DataTable.

import { initIcons, bindModalReinit } from '../../core/js/icons.js';

// ── DataTable ───────────────────────────────────────
const $table = $('#repairTable');
if ($table.length) {
    const langUrl = $table.data('lang-url') || '';
    const table = $table.DataTable({
        responsive: true,
        language: langUrl ? { url: langUrl } : {},
        order: [[0, 'desc']],
        pageLength: 10,
        columnDefs: [{ targets: -1, orderable: false }],
    });
    table.on('draw', () => {
        initIcons();
        renderGotoPage(table);
    });
    renderGotoPage(table);
}

// ── Go-to-page control (appended into the pagination pill) ──
// DataTables wipes .dataTables_paginate innerHTML on every draw, so we
// re-attach + refresh option list each time renderGotoPage runs.
let gotoBox = null;
function renderGotoPage(table) {
    const wrapper = table.table().container();
    const paginate = wrapper.querySelector('.dataTables_paginate');
    if (!paginate) return;

    if (!gotoBox) {
        gotoBox = document.createElement('div');
        gotoBox.className = 'repair-goto';
        gotoBox.innerHTML =
            '<span class="repair-goto-label">ไปที่หน้า</span>' +
            '<select class="repair-goto-select" aria-label="เลือกหน้าที่ต้องการ"></select>' +
            '<button type="button" class="repair-goto-btn" title="ไปที่หน้าที่เลือก">ไป</button>';
        const select = gotoBox.querySelector('.repair-goto-select');
        gotoBox.querySelector('.repair-goto-btn')
            .addEventListener('click', () => table.page(parseInt(select.value, 10)).draw('page'));
    }
    if (gotoBox.parentElement !== paginate) paginate.appendChild(gotoBox);

    const info   = table.page.info();
    const pages  = Math.max(info.pages, 1);
    const select = gotoBox.querySelector('.repair-goto-select');
    if (select.options.length !== pages) {
        select.innerHTML = '';
        for (let i = 0; i < pages; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = i + 1;
            select.appendChild(opt);
        }
    }
    select.value = info.page;
}

// ── Modal: รับงาน ───────────────────────────────────
const acceptModal = document.getElementById('acceptModal');
if (acceptModal) {
    acceptModal.addEventListener('show.bs.modal', (e) => {
        const btn = e.relatedTarget;
        document.getElementById('acceptForm').action =
            '/repair/update_status/' + btn.dataset.ticketId;
        document.getElementById('acceptTicketInfo').textContent =
            'รับงาน #' + btn.dataset.ticketId + ' — ' + btn.dataset.ticketSubject;
        const urgencyEl = document.getElementById('acceptUrgency');
        if (urgencyEl) urgencyEl.value = btn.dataset.ticketUrgency || 'ปกติ';
    });
}

// ── Modal: ปิดงาน ───────────────────────────────────
const closeModal = document.getElementById('closeModal');
if (closeModal) {
    closeModal.addEventListener('show.bs.modal', (e) => {
        const btn = e.relatedTarget;
        document.getElementById('closeForm').action =
            '/repair/update_status/' + btn.dataset.ticketId;
        document.getElementById('modalTicketInfo').textContent =
            'ปิดงาน #' + btn.dataset.ticketId + ' — ' + btn.dataset.ticketSubject;
        const noteEl = closeModal.querySelector('textarea[name="resolved_note"]');
        if (noteEl) noteEl.value = '';
    });
}

// ── Auto-open form modal (แก้ไข / ทำซ้ำ / จองใหม่) ─────
const ds = document.body.dataset;
if (ds.editTicket || ds.copyTicket || ds.openNew) {
    const modalEl = document.getElementById('repairFormModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
}

// ── Tooltips ────────────────────────────────────────
document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
    new bootstrap.Tooltip(el);
});

// ── Upload zone ─────────────────────────────────────
const uploadZone   = document.getElementById('uploadZone');
const fileInput    = document.getElementById('fileInput');
const uploadLabel  = document.getElementById('uploadLabel');
if (uploadZone && fileInput) {
    uploadZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', function () {
        if (!uploadLabel) return;
        if (this.files.length > 0) {
            uploadLabel.textContent = this.files[0].name;
            uploadLabel.classList.replace('text-muted', 'text-success');
        } else {
            uploadLabel.textContent = 'คลิกเพื่อเลือกไฟล์ภาพ';
            uploadLabel.classList.replace('text-success', 'text-muted');
        }
    });
}

// ── Re-render lucide icons inside modals when they open ──
bindModalReinit();
