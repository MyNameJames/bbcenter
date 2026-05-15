// pages/repair.js — /repair page entry (ระบบแจ้งซ่อมไอที)
//
// ES module. Loads after DOM parse (implicit defer), so no
// jQuery $(document).ready() wrapper needed. jQuery itself is still
// used as a global for DataTable.

import { initIcons, bindModalReinit } from '../core/icons.js';

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
    table.on('draw', initIcons);
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

// ── Auto-open edit modal ─────────────────────────────
const editTicketId = document.body.dataset.editTicket;
if (editTicketId) {
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
