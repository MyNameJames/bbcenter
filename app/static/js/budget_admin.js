/* budget_admin.js — interactions for /admin/budget (.vc-scope)
 * Standalone: load AFTER bootstrap.bundle.min.js + lucide
 */
(function () {
  'use strict';

  // ── Lucide icons ─────────────────────────────────────────────
  function initLucide() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }
  initLucide();

  // ── Dropdown action menus (per card / row) ──────────────────
  document.addEventListener('click', function (e) {
    const trigger = e.target.closest('[data-dropdown-trigger]');
    const inMenu  = e.target.closest('.vc-dropdown-menu');

    // close all open dropdowns first
    document.querySelectorAll('.vc-dropdown.is-open').forEach(function (d) {
      if (!trigger || !d.contains(trigger)) d.classList.remove('is-open');
    });
    if (trigger) {
      e.preventDefault();
      const dd = trigger.closest('.vc-dropdown');
      if (dd) dd.classList.toggle('is-open');
    }
    // click on item inside menu → close after the click is processed
    if (inMenu && e.target.closest('[data-dropdown-close]')) {
      const dd = inMenu.closest('.vc-dropdown');
      if (dd) setTimeout(function () { dd.classList.remove('is-open'); }, 0);
    }
  });

  // ── Modal data wiring (Bootstrap modal events) ───────────────
  function wireModal(id, fields) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('show.bs.modal', function (ev) {
      const btn = ev.relatedTarget;
      if (!btn) return;
      Object.keys(fields).forEach(function (target) {
        const dataKey = fields[target];
        const inputs  = el.querySelectorAll('[data-bind="' + target + '"]');
        const val     = btn.dataset[dataKey];
        if (val === undefined) return;
        inputs.forEach(function (input) {
          if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA' ||
              input.tagName === 'SELECT') {
            input.value = val;
          } else {
            input.textContent = val;
          }
        });
      });
      // Re-render lucide for any new icons in modal
      initLucide();
    });
  }

  wireModal('budgetTopUpModal', {
    budget_id:    'bid',
    dept_label:   'dept',
    current_cap:  'amount',
  });
  wireModal('budgetAdjustModal', {
    budget_id:    'bid',
    dept_label:   'dept',
    current_used: 'used',
  });

  // ── Refund modal: row picker ─────────────────────────────────
  const refundModal = document.getElementById('budgetRefundModal');
  if (refundModal) {
    refundModal.addEventListener('click', function (e) {
      const pick = e.target.closest('[data-pick-booking]');
      if (!pick) return;
      const form = refundModal.querySelector('form');
      if (form) form.querySelector('[name="booking_id"]').value = pick.dataset.pickBooking;
      refundModal.querySelectorAll('[data-pick-booking]').forEach(function (r) {
        r.classList.remove('is-picked');
      });
      pick.classList.add('is-picked');
      const submit = refundModal.querySelector('[data-refund-submit]');
      if (submit) submit.disabled = false;
    });
    refundModal.addEventListener('hide.bs.modal', function () {
      refundModal.querySelectorAll('[data-pick-booking]').forEach(function (r) {
        r.classList.remove('is-picked');
      });
      const submit = refundModal.querySelector('[data-refund-submit]');
      if (submit) submit.disabled = true;
      const form = refundModal.querySelector('form');
      if (form) form.querySelector('[name="booking_id"]').value = '';
    });
  }
})();
