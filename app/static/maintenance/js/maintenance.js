// maintenance.js — BBCenter V2

document.addEventListener('DOMContentLoaded', function () {
    const pageData = document.getElementById('pageData');

    // DataTable
    if (typeof $ !== 'undefined' && $.fn && $.fn.DataTable) {
        const dtLang = pageData ? pageData.dataset.dtLang : '/static/vendor/datatables/json/th.json';
        $('#maintenanceTable').DataTable({
            responsive: true,
            language: { url: dtLang },
            order: [[0, 'desc']]
        });
    }

    // Auto-open form modal when in edit mode
    if (pageData && pageData.dataset.editMode === 'true') {
        const formModal = document.getElementById('maintenanceFormModal');
        if (formModal) {
            new bootstrap.Modal(formModal).show();
        }
    }

    // Modal: รับงาน — populate from button data
    const acceptModal = document.getElementById('acceptModal');
    if (acceptModal) {
        acceptModal.addEventListener('show.bs.modal', function (e) {
            const btn = e.relatedTarget;
            document.getElementById('acceptForm').action =
                '/maintenance/update_status/' + btn.dataset.ticketId;
            document.getElementById('acceptTicketInfo').textContent =
                'รับงาน #' + btn.dataset.ticketId + ' — ' + btn.dataset.ticketSubject;
            document.querySelector('#acceptModal input[name="scheduled_date"]').value = '';
            document.getElementById('acceptUrgency').value = btn.dataset.ticketUrgency || 'ปกติ';
        });
    }

    // Modal: ปิดงาน — populate from button data
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('show.bs.modal', function (e) {
            const btn = e.relatedTarget;
            document.getElementById('closeForm').action =
                '/maintenance/update_status/' + btn.dataset.ticketId;
            document.getElementById('closeTicketInfo').textContent =
                'ปิดงาน #' + btn.dataset.ticketId + ' — ' + btn.dataset.ticketSubject;
            document.querySelector('#closeModal textarea').value = '';
            document.querySelector('#closeModal input[name="repair_cost"]').value = '';
            document.querySelector('#closeModal select[name="technician_type"]').selectedIndex = 0;
        });
    }

    // Delete confirmation
    document.querySelectorAll('[data-delete-id]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const id = this.dataset.deleteId;
            if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?')) {
                document.getElementById('deleteForm' + id).submit();
            }
        });
    });

    // Export Excel
    const doExportBtn = document.getElementById('doExportBtn');
    if (doExportBtn) {
        doExportBtn.addEventListener('click', function () {
            const month = document.getElementById('exportMonthSelect').value;
            if (!month) {
                alert('กรุณาเลือกเดือนก่อนดาวน์โหลด');
                return;
            }
            window.location.href = '/maintenance/export_excel?month=' + month;
            bootstrap.Modal.getInstance(document.getElementById('exportModal')).hide();
        });
    }

    // Tooltips for truncated resolved notes
    document.querySelectorAll('.maintenance-resolved-note[title]').forEach(function (el) {
        new bootstrap.Tooltip(el);
    });
});
