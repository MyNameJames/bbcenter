// pages/approver-inbox.js — entry point for /vehicle/approver
//
// ES module. The template still uses `onclick="switchTab(...)"` etc.
// on its buttons, so we expose those handlers on `window` during
// the Phase 4 migration. When the template is rewired to delegated
// listeners, drop the window.* assignments.

function switchTab(tab, el) {
    document.querySelectorAll('.tab-content-section').forEach(s => s.classList.add('d-none'));
    document.querySelectorAll('.inbox-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.remove('d-none');
    el.classList.add('active');
}

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
window.switchTab = switchTab;
window.showRejectForm = showRejectForm;
window.hideRejectForm = hideRejectForm;
