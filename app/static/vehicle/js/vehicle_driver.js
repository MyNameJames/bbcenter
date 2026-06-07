/* ══════════════════════════════════════════════════
   pages/driver-home.js — Driver home (ES module)
   Tab switching, accordion cards, actual_start/end stamping,
   upload-zone visual feedback, ad-hoc modal + searchable combo.
══════════════════════════════════════════════════ */
import { initIcons } from '../core/icons.js';

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
    form.addEventListener('submit', () => {
        const stamp = form.querySelector('[data-actual-now]');
        if (stamp) stamp.value = nowStamp();
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
   Ad-hoc modal — open/close
══════════════════════════════════════════════════ */
const adhocModal = document.getElementById('adhocModal');

function openAdhoc() {
    if (!adhocModal) return;
    adhocModal.hidden = false;
    adhocModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    initIcons(adhocModal);
}

function closeAdhoc() {
    if (!adhocModal) return;
    adhocModal.hidden = true;
    adhocModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

document.querySelectorAll('[data-open-adhoc]').forEach(btn => {
    btn.addEventListener('click', openAdhoc);
});

document.querySelectorAll('[data-close-adhoc]').forEach(btn => {
    btn.addEventListener('click', closeAdhoc);
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && adhocModal && !adhocModal.hidden) closeAdhoc();
});

/* ══════════════════════════════════════════════════
   Combo — searchable user dropdown
   - typing filters list + clears hidden user_id
   - clicking option locks selection (hidden user_id set, list closes)
══════════════════════════════════════════════════ */
document.querySelectorAll('[data-combo]').forEach(combo => {
    const input  = combo.querySelector('[data-combo-input]');
    const hidden = combo.querySelector('[data-combo-user-id]');
    const list   = combo.querySelector('[data-combo-list]');
    const items  = Array.from(combo.querySelectorAll('[data-combo-option]'));

    const showList = () => { list.hidden = false; };
    const hideList = () => { list.hidden = true; };

    input.addEventListener('focus', showList);

    input.addEventListener('input', () => {
        hidden.value = '';                    // typing = free-text mode
        const q = input.value.trim().toLowerCase();
        let anyVisible = false;
        items.forEach(it => {
            const name = (it.dataset.userName || '').toLowerCase();
            const match = !q || name.includes(q);
            it.hidden = !match;
            if (match) anyVisible = true;
        });
        list.hidden = !anyVisible;
    });

    items.forEach(it => {
        it.addEventListener('mousedown', e => {
            e.preventDefault();               // ป้องกัน input blur ก่อน click
            input.value  = it.dataset.userName;
            hidden.value = it.dataset.userId;
            hideList();
        });
    });

    document.addEventListener('click', e => {
        if (!combo.contains(e.target)) hideList();
    });
});
