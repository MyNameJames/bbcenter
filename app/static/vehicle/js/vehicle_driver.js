/* ══════════════════════════════════════════════════
   pages/driver-home.js — Driver home (ES module)
   Tab switching, accordion cards, actual_start/end stamping,
   upload-zone visual feedback, ad-hoc modal + searchable combo.
══════════════════════════════════════════════════ */
import { initIcons } from '../../core/js/icons.js';

initIcons();

/* ── Tab switching ───────────────────────────── */
const tabBtns = document.querySelectorAll('.driver-tabs__btn');
const panels  = document.querySelectorAll('.driver-panel');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.toggle('is-active', b === btn));
        panels.forEach(p => p.classList.toggle('is-active', p.dataset.panel === target));
    });
});

/* ── Accordion: open one card → close others within active panel ── */
document.querySelectorAll('[data-card-toggle]').forEach(head => {
    head.addEventListener('click', () => {
        const card  = head.closest('[data-card]');
        const panel = card.closest('.driver-panel');
        const wasOpen = card.classList.contains('is-open');

        panel.querySelectorAll('[data-card]').forEach(c => c.classList.remove('is-open'));

        if (!wasOpen) card.classList.add('is-open');
    });
});

/* ── Stamp actual_start / actual_end on submit ── */
const pad = n => String(n).padStart(2, '0');
const nowStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
document.querySelectorAll('[data-driver-form]').forEach(form => {
    form.addEventListener('submit', (e) => {
        const stamp = form.querySelector('[data-actual-now]');
        if (stamp) stamp.value = nowStamp();

        // REQ-3 (Phase 3.5): เพดานระยะทาง — confirm ผ่านได้ ไม่ block เด็ดขาด (ตกลงกับ
        // เจ้าของโปรเจกต์) — backend มี guard เดียวกันเป็น safety net เผื่อ JS ถูกข้าม
        const odoInput = form.querySelector('[data-odo-input]');
        const confirmField = form.querySelector('[data-confirm-distance]');
        if (odoInput && confirmField) {
            const start = Number(form.dataset.odoStart || 0);
            const end   = Number(odoInput.value || 0);
            const distance = end - start;
            if (distance > window.DRIVER_DISTANCE_CAP && confirmField.value !== '1') {
                const ok = confirm(
                    `ระยะทาง ${distance.toLocaleString()} กม. เกินเพดานปกติ (${window.DRIVER_DISTANCE_CAP.toLocaleString()} กม.) — ยืนยันว่าเลขถูกต้องใช่ไหม?`
                );
                if (!ok) { e.preventDefault(); return; }
                confirmField.value = '1';
            }
        }
    });
});

/* ── Upload zone: visual feedback when file picked ── */
document.querySelectorAll('[data-upload-input]').forEach(input => {
    input.addEventListener('change', () => {
        const zone  = input.closest('.driver-upload');
        const label = zone.querySelector('.driver-upload__label');
        const hint  = zone.querySelector('.driver-upload__hint');
        if (input.files && input.files.length) {
            zone.classList.add('has-file');
            label.textContent = input.files[0].name;
            hint.textContent  = 'แตะเพื่อเปลี่ยนรูป';
        } else {
            zone.classList.remove('has-file');
        }
    });
});

/* ══════════════════════════════════════════════════
   Ad-hoc — collapse panel (แทน modal เดิม)
   เปิด = กางลงมา, ยกเลิก/toggle = หุบ + reset form
══════════════════════════════════════════════════ */
const adhocBtn   = document.querySelector('[data-adhoc-toggle]');
const adhocPanel = document.querySelector('[data-adhoc-panel]');
const adhocForm  = adhocPanel ? adhocPanel.querySelector('form') : null;

function openAdhoc() {
    if (!adhocPanel) return;
    adhocPanel.hidden = false;
    if (adhocBtn) adhocBtn.classList.add('is-open');
    initIcons(adhocPanel);
    adhocPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeAdhoc() {
    if (!adhocPanel) return;
    adhocPanel.hidden = true;
    if (adhocBtn) adhocBtn.classList.remove('is-open');
    if (adhocForm) {
        adhocForm.reset();
        // reset visual states (upload zone + odo hint)
        adhocForm.querySelectorAll('.driver-upload.has-file').forEach(z => z.classList.remove('has-file'));
        const odoHint = adhocPanel.querySelector('[data-adhoc-odo-hint]');
        if (odoHint) odoHint.hidden = true;
    }
}

if (adhocBtn) {
    adhocBtn.addEventListener('click', () => (adhocPanel.hidden ? openAdhoc() : closeAdhoc()));
}
document.querySelectorAll('[data-adhoc-cancel]').forEach(btn => btn.addEventListener('click', closeAdhoc));

/* ── Ad-hoc vehicle change → อัปเดต hint เลขไมล์ล่าสุด + min ── */
const adhocVehicle = document.querySelector('[data-adhoc-vehicle]');
if (adhocVehicle && adhocPanel) {
    adhocVehicle.addEventListener('change', () => {
        const opt  = adhocVehicle.selectedOptions[0];
        const last = opt ? (opt.dataset.lastOdo || '') : '';
        const hint = adhocPanel.querySelector('[data-adhoc-odo-hint]');
        const odo  = adhocPanel.querySelector('[data-odo-input]');
        if (last) {
            if (hint) { hint.textContent = 'เลขไมล์ล่าสุด: ' + Number(last).toLocaleString() + ' km'; hint.hidden = false; }
            if (odo)  odo.min = last;
        } else {
            if (hint) hint.hidden = true;
            if (odo)  odo.min = 0;
        }
    });
}
