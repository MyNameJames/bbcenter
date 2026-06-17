// maintenance.js — BBCenter V2

document.addEventListener('DOMContentLoaded', function () {
    const pageData = document.getElementById('pageData');
    let gotoBox = null;   // cached go-to-page control (see renderGotoPage)

    // Re-render Lucide icons (rows on other pages have un-rendered <i data-lucide>)
    function reinitIcons() {
        const l = window.lucide;
        if (!l || !l.createIcons) return;
        try { l.createIcons({ icons: l.icons || l }); } catch (e) { /* not ready */ }
    }

    // Go-to-page control appended into the pagination pill. DataTables wipes
    // .dataTables_paginate innerHTML on every draw → re-attach + refresh here.
    function renderGotoPage(table) {
        const wrapper = table.table().container();
        const paginate = wrapper.querySelector('.dataTables_paginate');
        if (!paginate) return;

        if (!gotoBox) {
            gotoBox = document.createElement('div');
            gotoBox.className = 'maintenance-goto';
            gotoBox.innerHTML =
                '<span class="maintenance-goto-label">ไปที่หน้า</span>' +
                '<select class="maintenance-goto-select" aria-label="เลือกหน้าที่ต้องการ"></select>' +
                '<button type="button" class="maintenance-goto-btn" title="ไปที่หน้าที่เลือก">ไป</button>';
            const select = gotoBox.querySelector('.maintenance-goto-select');
            gotoBox.querySelector('.maintenance-goto-btn').addEventListener('click', function () {
                table.page(parseInt(select.value, 10)).draw('page');
            });
        }
        if (gotoBox.parentElement !== paginate) paginate.appendChild(gotoBox);

        const info = table.page.info();
        const pages = Math.max(info.pages, 1);
        const select = gotoBox.querySelector('.maintenance-goto-select');
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

    // DataTable
    if (typeof $ !== 'undefined' && $.fn && $.fn.DataTable) {
        const dtLang = pageData ? pageData.dataset.dtLang : '/static/vendor/datatables/json/th.json';
        const table = $('#maintenanceTable').DataTable({
            responsive: true,
            language: { url: dtLang },
            order: [[0, 'desc']],
            pageLength: 10
        });
        table.on('draw', function () {
            reinitIcons();
            renderGotoPage(table);
        });
        renderGotoPage(table);
    }

    // Auto-open form modal: แก้ไข / ทำซ้ำ / จองใหม่
    if (pageData && pageData.dataset.openForm === 'true') {
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
