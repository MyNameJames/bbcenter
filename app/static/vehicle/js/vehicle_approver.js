// pages/approver-inbox.js — entry point for /vehicle/approver
//
// ES module. The template still uses `onclick="showRejectForm(...)"` etc.
// on its buttons, so we expose those handlers on `window` during
// the Phase 4 migration. When the template is rewired to delegated
// listeners, drop the window.* assignments.

// tab2_tabs (_shared/tab2.html) renders markup only — each page binds its
// own click handler. This one just shows/hides the existing panels.
function bindApproverTab2() {
    const wrap = document.getElementById('approverTab2Wrap');
    if (!wrap) return;
    wrap.querySelectorAll('.tab2-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            wrap.querySelectorAll('.tab2-tab').forEach(c => c.classList.toggle('active', c === btn));
            document.querySelectorAll('.tab-content-section').forEach(s => s.classList.add('d-none'));
            document.getElementById('tab-' + tab).classList.remove('d-none');
        });
    });
}
bindApproverTab2();

function showRejectForm(id) {
    document.getElementById('action-btns-' + id).classList.add('d-none');
    const form = document.getElementById('reject-form-' + id);
    form.classList.remove('d-none');
    form.querySelector('input[name="reject_reason"]').focus();
}

function hideRejectForm(id) {
    document.getElementById('reject-form-' + id).classList.add('d-none');
    document.getElementById('action-btns-' + id).classList.remove('d-none');
}

// Chevron rotation via Bootstrap collapse events
document.addEventListener('show.bs.collapse', (e) => {
    const hdr = e.target.previousElementSibling;
    if (hdr?.classList.contains('ac-header')) {
        hdr.querySelector('.ac-chevron')?.classList.add('rotated');
    }
});
document.addEventListener('hide.bs.collapse', (e) => {
    const hdr = e.target.previousElementSibling;
    if (hdr?.classList.contains('ac-header')) {
        hdr.querySelector('.ac-chevron')?.classList.remove('rotated');
    }
});

// Expose legacy onclick handlers to window (template still uses them)
window.showRejectForm = showRejectForm;
window.hideRejectForm = hideRejectForm;
