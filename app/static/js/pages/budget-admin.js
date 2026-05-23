/* pages/budget-admin.js — interactions for /admin/budget (ES module)
 * load AFTER bootstrap.bundle.min.js
 */
import { initIcons, bindModalReinit } from '../core/icons.js';

initIcons();
bindModalReinit();

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

// ── setBudgetModal: swap datalist + approver pre-select + retitle ──
const setBudgetModal = document.getElementById('setBudgetModal');
if (setBudgetModal) {
    setBudgetModal.addEventListener('show.bs.modal', function (ev) {
        const btn        = ev.relatedTarget;
        const type       = (btn && btn.dataset.budgetType) || 'department';
        const isCentral  = type === 'central';
        const approverId = (btn && btn.dataset.approver) || '';
        const deptName   = (btn && btn.dataset.dept) || '';
        const amount     = (btn && btn.dataset.amount) || '';
        // edit mode = มี dept + amount จาก dropdown ที่อ้างอิงงบเดิม
        const isEdit     = !!(deptName && amount);

        document.getElementById('sbBudgetType').value = type;
        document.getElementById('sbDept').value       = deptName;
        document.getElementById('sbAmount').value     = amount;
        document.getElementById('sbStartDate').value  = (btn && btn.dataset.start)  || '';
        document.getElementById('sbEndDate').value    = (btn && btn.dataset.end)    || '';

        const activeList = document.getElementById('sbDeptListActive');
        const srcList    = document.getElementById(isCentral ? 'sbDeptListCentral' : 'sbDeptListDept');
        if (activeList && srcList) activeList.innerHTML = srcList.innerHTML;

        const sel = document.getElementById('sbApprover');
        if (sel) sel.value = approverId;

        const approverRow = document.getElementById('approverRow');
        if (approverRow) approverRow.hidden = isCentral;

        const ttl       = document.getElementById('sbTitle');
        const lbl       = document.getElementById('sbDeptLabel');
        const noticeTxt = document.getElementById('sbNoticeText');
        const submitTxt = document.getElementById('sbSubmitText');
        const groupLabel = isCentral ? 'งบส่วนกลาง' : 'งบงานกอง';
        const groupIcon  = isCentral ? 'landmark' : 'users';
        const fieldLabel = isCentral ? 'หมวดงาน (ส่วนกลาง)' : 'ชื่อกอง / แผนก';

        if (isEdit) {
            ttl.innerHTML = '<i data-lucide="pencil" class="vc-icon-sm"></i> แก้เพดาน' + groupLabel + ' — ' + deptName;
            if (noticeTxt) noticeTxt.innerHTML = 'อัปเดตเพดาน' + groupLabel + 'ของ <strong>' + deptName + '</strong> — ยอดที่หักไว้แล้วจะคงเดิม กระทบเฉพาะเพดานสูงสุด';
            if (submitTxt) submitTxt.textContent = 'อัปเดตเพดาน';
        } else {
            ttl.innerHTML = '<i data-lucide="' + groupIcon + '" class="vc-icon-sm"></i> ตั้ง' + groupLabel + 'ใหม่';
            if (noticeTxt) noticeTxt.innerHTML = 'ตั้ง' + groupLabel + 'สำหรับเดือนที่เลือก — ถ้ามีงบของ' + (isCentral ? 'หมวด' : 'กอง') + 'นี้อยู่แล้ว ระบบจะอัปเดตทับ';
            if (submitTxt) submitTxt.textContent = 'บันทึกงบ';
        }
        lbl.innerHTML = fieldLabel + ' <span class="vc-required">*</span>';

        initIcons(setBudgetModal);
    });
}

// ── Confirm dialog ก่อน toggle active (ปิดงบ = block booking ใหม่) ──
document.addEventListener('submit', function (e) {
    const form = e.target.closest('form[data-confirm-toggle]');
    if (!form) return;
    const dept     = form.dataset.deptName || 'งบนี้';
    const toActive = form.dataset.toActive === '1';
    const msg = toActive
        ? 'เปิดใช้งานงบของ "' + dept + '" ใช่หรือไม่?\n\nbooking ใหม่ของแผนก/กองนี้จะสามารถหักจากงบนี้ได้อีกครั้ง'
        : 'ปิดใช้งานงบของ "' + dept + '" ใช่หรือไม่?\n\n⚠️ booking ใหม่ที่จะหักจากงบนี้จะถูกบล็อก จนกว่าจะเปิดใช้งานใหม่\n(งบที่หักไปแล้วในอดีตจะไม่ได้รับผลกระทบ)';
    if (!confirm(msg)) e.preventDefault();
});

// ── Phase 3E (2026-05-22): personal section client-side tab filter
//    Tab pills [ทั้งหมด / ค้างรับ / รับแล้ว] toggles row visibility ผ่าน
//    data-personal-row="paid|unpaid". ไม่ reload (data set เล็ก, snappy).
document.addEventListener('click', function (e) {
    const tab = e.target.closest('[data-personal-filter]');
    if (!tab) return;
    const filter = tab.dataset.personalFilter;
    document.querySelectorAll('[data-personal-filter]').forEach(function (t) {
        t.classList.toggle('is-active', t === tab);
    });
    document.querySelectorAll('[data-personal-row]').forEach(function (row) {
        const s = row.dataset.personalRow;
        row.hidden = (filter !== 'all' && s !== filter);
    });
});

// ── Phase 2E (2026-05-22): ยืนยันรับเงินส่วนตัวจากผู้จอง (AJAX)
//    route ปลายทาง return JSON — ต้องใช้ fetch (form POST จะได้ raw JSON page)
document.addEventListener('submit', async function (e) {
    const form = e.target.closest('form[data-confirm-pay]');
    if (!form) return;
    e.preventDefault();

    const user   = form.dataset.user   || 'ผู้จอง';
    const amount = form.dataset.amount || '—';
    const msg = 'ยืนยันได้รับเงิน ฿' + amount + ' จาก "' + user + '" แล้วใช่ไหม?\n\n' +
                'ระบบจะบันทึกใน ledger และปิดการแจ้งเตือนค้างจ่ายของ booking นี้\n' +
                '(การยืนยันนี้ย้อนกลับได้ที่หน้าจัดการการเก็บเงินส่วนตัว)';
    if (!confirm(msg)) return;

    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
        btn.disabled = true;
        btn.dataset.origHtml = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader" class="vc-icon-sm"></i> กำลังบันทึก...';
    }

    try {
        const fd  = new FormData(form);
        const res = await fetch(form.action, { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok !== false) {
            location.reload();
            return;
        }
        alert(data.msg || 'บันทึกไม่สำเร็จ — กรุณาลองใหม่');
    } catch (err) {
        alert('Network error: ' + (err && err.message ? err.message : 'ไม่ทราบสาเหตุ'));
    }
    if (btn) {
        btn.disabled = false;
        if (btn.dataset.origHtml) btn.innerHTML = btn.dataset.origHtml;
    }
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
