/* pages/budget-admin.js — interactions for /admin/budget (ES module)
 * load AFTER bootstrap.bundle.min.js
 */
import { initIcons, bindModalReinit } from '../../core/js/icons.js';

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
// extendBudgetModal — นำงบจากคลังกลับมาใช้ (pre-fill budget_id + ช่วง start/end เดิม)
wireModal('extendBudgetModal', {
    budget_id:  'bid',
    dept_label: 'dept',
    start_date: 'start',
    end_date:   'end',
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
        if (sel) {
            sel.value = approverId;
            // notify the vc-ac autocomplete to refresh its visible label
            sel.dispatchEvent(new Event('change', { bubbles: true }));
        }

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

// ── Main tabs (2026-06-15): ตารางรวม / ส่วนกลาง / ส่วนกอง / ส่วนตัว / งบไม่ใช้แล้ว
//    client-side switch (data set render มาครบแล้ว). default = pivot.
//    (toolbar filter/add ถูกลบออก 2026-06-16 ตามคำสั่งผู้ใช้)
(function initBudgetTabs() {
    const tabs   = Array.from(document.querySelectorAll('[data-budget-tab]'));
    const panels = Array.from(document.querySelectorAll('[data-budget-panel]'));
    if (!tabs.length) return;

    function activate(name) {
        tabs.forEach(function (t) {
            const on = t.dataset.budgetTab === name;
            t.classList.toggle('is-active', on);
            t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        panels.forEach(function (p) {
            const on = p.dataset.budgetPanel === name;
            p.classList.toggle('is-active', on);
            p.hidden = !on;
        });
    }

    tabs.forEach(function (t) {
        t.addEventListener('click', function () { activate(t.dataset.budgetTab); });
    });

    // sync toolbar/add กับ tab ที่ active อยู่ตอน load (default = pivot → toolbar ซ่อน)
    const current = tabs.find(function (t) { return t.classList.contains('is-active'); }) || tabs[0];
    activate(current.dataset.budgetTab);
})();

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

/* ── Date pickers (va-cal) — แทน native type="date" ในทุก modal ──
   ปุ่ม trigger → .va-cal popover → คลิกวัน → set hidden input (ISO) + sync label.
   ไม่ submit เอง (ค่าอยู่ในฟอร์มจน submit). pre-fill จาก modal show → sync label
   ตอน shown.bs.modal. required (extend modal) ตรวจตอน submit. */
(function initBudgetDatepickers() {
    const roots = document.querySelectorAll('[data-datepick]');
    if (!roots.length) return;

    const TH_DAYS_S = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    const TH_MON_F  = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                       'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const TH_MON_S  = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                       'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    const pad2  = n => String(n).padStart(2, '0');
    const toISO = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sameDay = (a, b) => a.getFullYear() === b.getFullYear() &&
                              a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    function parseISO(v) {
        if (!v) return null;
        const [y, m, d] = String(v).split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return isNaN(dt.getTime()) ? null : dt;
    }

    const instances = [];
    const closeAll = except => instances.forEach(i => { if (i.root !== except) i.close(); });

    roots.forEach(root => {
        const btn      = root.querySelector('[data-datepick-btn]');
        const labelEl  = root.querySelector('[data-datepick-label]');
        const input    = root.querySelector('[data-datepick-input]');
        const pop       = root.querySelector('[data-datepick-pop]');
        const dowWrap  = root.querySelector('[data-cal-dow]');
        const daysWrap = root.querySelector('[data-cal-days]');
        const titleEl  = root.querySelector('[data-cal-title]');
        const prevBtn  = root.querySelector('[data-cal-prev]');
        const nextBtn  = root.querySelector('[data-cal-next]');
        if (!btn || !input || !pop) return;

        const placeholder = labelEl.textContent.trim();
        let cursor = parseISO(input.value) || new Date(today);

        function syncLabel() {
            const sel = parseISO(input.value);
            if (sel) {
                labelEl.textContent = `${sel.getDate()} ${TH_MON_S[sel.getMonth()]} ${sel.getFullYear() + 543}`;
                btn.classList.add('budget-date-btn--filled');
            } else {
                labelEl.textContent = placeholder;
                btn.classList.remove('budget-date-btn--filled');
            }
            root.classList.remove('is-invalid');
        }

        function render() {
            const y = cursor.getFullYear(), m = cursor.getMonth();
            titleEl.textContent = `${TH_MON_F[m]} ${y + 543}`;
            if (!dowWrap.childElementCount) {
                dowWrap.innerHTML = TH_DAYS_S.map((d, i) => {
                    const c = i === 0 ? ' va-cal-dow-cell--sun' : i === 6 ? ' va-cal-dow-cell--sat' : '';
                    return `<span class="va-cal-dow-cell${c}">${d}</span>`;
                }).join('');
            }
            const sel = parseISO(input.value);
            const startPad = new Date(y, m, 1).getDay();
            const days = new Date(y, m + 1, 0).getDate();
            let cells = '';
            for (let i = 0; i < startPad; i++) cells += `<span class="va-cal-cell va-cal-cell--empty"></span>`;
            for (let dn = 1; dn <= days; dn++) {
                const d = new Date(y, m, dn), dow = d.getDay();
                let cls = 'va-cal-cell';
                if (sel && sameDay(d, sel)) cls += ' va-cal-cell--active';
                if (sameDay(d, today))      cls += ' va-cal-cell--today';
                if (dow === 0)      cls += ' va-cal-cell--sun';
                else if (dow === 6) cls += ' va-cal-cell--sat';
                cells += `<button type="button" class="${cls}" data-date="${toISO(d)}">${dn}</button>`;
            }
            daysWrap.innerHTML = cells;
        }

        function open() {
            closeAll(root);
            cursor = parseISO(input.value) || new Date(today);
            render();
            pop.hidden = false;
            btn.setAttribute('aria-expanded', 'true');
        }
        function close() {
            pop.hidden = true;
            btn.setAttribute('aria-expanded', 'false');
        }

        btn.addEventListener('click', e => {
            e.stopPropagation();
            if (pop.hidden) open(); else close();
        });
        prevBtn.addEventListener('click', e => {
            e.stopPropagation();
            cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
            render();
        });
        nextBtn.addEventListener('click', e => {
            e.stopPropagation();
            cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
            render();
        });
        daysWrap.addEventListener('click', e => {
            const cell = e.target.closest('[data-date]');
            if (!cell) return;
            input.value = cell.dataset.date;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            syncLabel();
            close();
        });

        syncLabel();
        instances.push({ root, input, close, syncLabel });
    });

    document.addEventListener('click', e => {
        instances.forEach(i => { if (!i.root.contains(e.target)) i.close(); });
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(null); });

    // pre-fill จาก modal show เสร็จแล้ว → sync label (ค่าถูก set ก่อนหน้านี้)
    document.addEventListener('shown.bs.modal', e => {
        instances.forEach(i => { if (e.target.contains(i.root)) i.syncLabel(); });
    });
    // ปิด popover ที่ค้างเมื่อ modal ปิด
    document.addEventListener('hidden.bs.modal', e => {
        instances.forEach(i => { if (e.target.contains(i.root)) i.close(); });
    });

    // required (hidden input ไม่ trigger HTML5 validation) → ตรวจตอน submit
    document.addEventListener('submit', e => {
        const form = e.target;
        if (!form.querySelector) return;
        let firstMissing = null;
        form.querySelectorAll('[data-datepick-required]').forEach(inp => {
            const root = inp.closest('[data-datepick]');
            if (!inp.value) {
                root.classList.add('is-invalid');
                if (!firstMissing) firstMissing = root;
            } else {
                root.classList.remove('is-invalid');
            }
        });
        if (firstMissing) {
            e.preventDefault();
            const trigger = firstMissing.querySelector('[data-datepick-btn]');
            if (trigger) trigger.focus();
        }
    }, true);
})();

// ── Sortable tables (2026-06-15): คลิก <th data-sort> → จัดเรียง tbody rows ──
//    data-sort="num" → parse ตัวเลข (ลอก ฿ , % ออก); "text" → localeCompare ไทย.
//    คลิกซ้ำคอลัมน์เดิม = สลับ asc/desc; คอลัมน์ใหม่ = เริ่ม asc.
(function initSortableTables() {
    const tables = document.querySelectorAll('[data-sortable-table]');
    if (!tables.length) return;

    function cellNum(td) {
        const s = (td.textContent || '').replace(/[฿,\s]/g, '');
        const m = s.match(/-?\d+(?:\.\d+)?/);
        return m ? parseFloat(m[0]) : 0;
    }
    function cellText(td) { return (td.textContent || '').trim(); }

    tables.forEach(function (table) {
        const thead = table.tHead;
        const tbody = table.tBodies[0];
        if (!thead || !tbody) return;

        thead.querySelectorAll('th[data-sort]').forEach(function (th) {
            th.addEventListener('click', function () {
                const idx  = th.cellIndex;
                const type = th.dataset.sort;
                const asc  = !th.classList.contains('sort-asc');

                thead.querySelectorAll('th').forEach(function (h) {
                    h.classList.remove('sort-asc', 'sort-desc');
                });
                th.classList.add(asc ? 'sort-asc' : 'sort-desc');

                const rows = Array.prototype.slice.call(tbody.rows);
                rows.sort(function (a, b) {
                    const ca = a.cells[idx], cb = b.cells[idx];
                    if (!ca || !cb) return 0;
                    let r;
                    if (type === 'num') {
                        r = cellNum(ca) - cellNum(cb);
                    } else {
                        r = cellText(ca).localeCompare(cellText(cb), 'th');
                    }
                    return asc ? r : -r;
                });
                rows.forEach(function (row) { tbody.appendChild(row); });
            });
        });
    });
})();
