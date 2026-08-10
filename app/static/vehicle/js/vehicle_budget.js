/* pages/budget-admin.js — interactions for /admin/budget (ES module)
 * load AFTER bootstrap.bundle.min.js
 */
import { initIcons, bindModalReinit } from '../../core/js/icons.js';

initIcons();
bindModalReinit();

// ── Dropdown action menus (per card / row) — bb-ml-dd + [hidden] toggle ──
document.addEventListener('click', function (e) {
    const trigger = e.target.closest('[data-dropdown-trigger]');
    const inMenu  = e.target.closest('[data-dropdown-menu]');

    // close all open dropdowns first
    document.querySelectorAll('[data-dropdown]').forEach(function (d) {
        const menu = d.querySelector('[data-dropdown-menu]');
        if (!menu || menu.hidden) return;
        if (!trigger || !d.contains(trigger)) menu.hidden = true;
    });
    if (trigger) {
        e.preventDefault();
        const dd   = trigger.closest('[data-dropdown]');
        const menu = dd && dd.querySelector('[data-dropdown-menu]');
        if (menu) menu.hidden = !menu.hidden;
    }
    // click on item inside menu → close after the click is processed
    if (inMenu && e.target.closest('[data-dropdown-close]')) {
        const dd   = inMenu.closest('[data-dropdown]');
        const menu = dd && dd.querySelector('[data-dropdown-menu]');
        if (menu) setTimeout(function () { menu.hidden = true; }, 0);
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

// ── setBudgetModal: merged รอบ 2 (2026-08-07) — เลิก tab ตั้ง/แก้เพดาน ↔ top-up (ดู comment
//    เต็มบนตัว modal ใน vehicle_budget.html) เหลือฟอร์มเดียว action=set_budget เสมอ. โหมด
//    แก้ไข/สร้างใหม่ toggle บล็อก DOM ตรง (sbHero/sbCreateFields/sbQuickAdd/sbNoteWrap/sbNotice)
//    sbBaseAmount เก็บเพดานเดิมตอนเปิด modal ให้ sbUpdateDeltaHint() คำนวณส่วนต่างตอนพิมพ์/กดปุ่มบวก ──
const setBudgetModal = document.getElementById('setBudgetModal');
if (setBudgetModal) {
    const sbHero         = document.getElementById('sbHero');
    const sbCreateFields = document.getElementById('sbCreateFields');
    const sbQuickAdd     = document.getElementById('sbQuickAdd');
    const sbNoteWrap     = document.getElementById('sbNoteWrap');
    const sbNotice       = document.getElementById('sbNotice');
    const sbAmountInput  = document.getElementById('sbAmount');
    const sbAmountLabel  = document.getElementById('sbAmountLabel');
    const sbAmountHint   = document.getElementById('sbAmountHint');
    const sbDeltaHint    = document.getElementById('sbDeltaHint');
    let sbBaseAmount = 0;

    function fmtMoney(n) { return Math.round(Number(n) || 0).toLocaleString('en-US'); }

    // ส่วนต่างระหว่างเพดานเดิม (sbBaseAmount) กับค่าในช่องตอนนี้ — โชว์เฉพาะตอนมีการเปลี่ยน
    function sbUpdateDeltaHint(next) {
        if (!sbDeltaHint) return;
        const diff = Number(next) - sbBaseAmount;
        sbDeltaHint.textContent = diff
            ? '฿' + fmtMoney(sbBaseAmount) + ' → ' + (diff >= 0 ? '+' : '−') + '฿' + fmtMoney(Math.abs(diff))
            : '';
    }

    // ── ปุ่มบวกเร็ว: เติมค่าเข้า sbAmount ฝั่ง client เท่านั้น ไม่ใช่ delta field แยก ──
    document.querySelectorAll('#sbQuickAdd [data-sb-add]').forEach(function (b) {
        b.addEventListener('click', function () {
            const next = (Number(sbAmountInput.value) || 0) + Number(b.dataset.sbAdd);
            sbAmountInput.value = next;
            sbUpdateDeltaHint(next);
        });
    });
    if (sbAmountInput) {
        sbAmountInput.addEventListener('input', function () {
            if (!sbHero.classList.contains('d-none')) sbUpdateDeltaHint(sbAmountInput.value);
        });
    }

    // ── hero summary: เพดาน/ใช้ไป/คงเหลือ + bar (สีตาม pct เหมือน _pct_tone ของตาราง) ──
    function sbApplyHero(btn) {
        const cap    = Number((btn && btn.dataset.amount) || 0);
        const used   = Number((btn && btn.dataset.used) || 0);
        const remain = Number((btn && btn.dataset.remaining) != null ? btn.dataset.remaining : cap - used);
        const pct    = Number((btn && btn.dataset.pct) || 0);

        document.getElementById('sbPeriodText').textContent =
            (btn && btn.dataset.startTh && btn.dataset.endTh) ? (btn.dataset.startTh + ' – ' + btn.dataset.endTh) : '—';
        document.getElementById('sbCurCap').textContent       = fmtMoney(cap);
        document.getElementById('sbCurUsed').textContent      = fmtMoney(used);
        document.getElementById('sbCurRemain').textContent    = fmtMoney(remain);
        document.getElementById('sbLegUsed').textContent      = '฿' + fmtMoney(used);
        document.getElementById('sbLegUsedPct').textContent   = '/ ' + pct.toFixed(0) + '%';
        document.getElementById('sbLegRemain').textContent    = '฿' + fmtMoney(remain);
        document.getElementById('sbLegRemainPct').textContent = '/ ' + Math.max(0, 100 - pct).toFixed(0) + '%';

        const fill = document.getElementById('sbBarFill');
        fill.style.width = Math.min(100, Math.max(0, pct)) + '%';
        fill.classList.toggle('is-dg', pct >= 90);
        fill.classList.toggle('is-wr', pct >= 70 && pct < 90);
    }

    // ── โหมดสร้างใหม่ (redesign 2026-08-07 รอบ 3) ──────────────────────────────────────
    const sbPoolSummary = document.getElementById('sbPoolSummary');
    const sbTypeHint     = document.getElementById('sbTypeHint');

    // ประเภทงบ (.bb-seg) — กำหนด pool ที่ใช้เทียบ (central_allocation/dept_allocation คนละก้อน)
    // + ผู้อนุมัติ (เฉพาะ department) + datalist ชื่อกอง — ใช้ทั้งตอนกด segmented และตอน show.bs.modal
    function sbSetType(type) {
        const isCentral = type === 'central';
        document.getElementById('sbBudgetType').value = type;
        document.querySelectorAll('#sbTypeSeg [data-sb-type]').forEach(function (b) {
            b.classList.toggle('is-on', b.dataset.sbType === type);
        });
        const lbl = document.getElementById('sbDeptLabel');
        if (lbl) lbl.textContent = isCentral ? 'หมวดงาน (ส่วนกลาง)' : 'ชื่อกอง / แผนก';
        if (sbTypeHint) sbTypeHint.textContent = isCentral
            ? 'งบส่วนกลางไม่มีผู้อนุมัติแยก — การจองผ่าน admin โดยตรง'
            : 'แต่ละกองมีผู้อนุมัติของตัวเอง ก่อนส่งถึง admin';
        document.getElementById('approverRow').classList.toggle('d-none', isCentral);

        const activeList = document.getElementById('sbDeptListActive');
        const srcList    = document.getElementById(isCentral ? 'sbDeptListCentral' : 'sbDeptListDept');
        if (activeList && srcList) activeList.innerHTML = srcList.innerHTML;

        sbRecomputePool();
    }
    document.querySelectorAll('#sbTypeSeg [data-sb-type]').forEach(function (b) {
        b.addEventListener('click', function () { sbSetType(b.dataset.sbType); });
    });

    // ── .sb-dd generic open/close (ก้อนงบ + ผู้อนุมัติ) — ก็อปพฤติกรรมจาก .yp-dd (yearlyPlanModal) ──
    function sbCloseAllDD() {
        document.querySelectorAll('#setBudgetModal .sb-dd-pop').forEach(function (p) { p.classList.remove('is-open'); });
        document.querySelectorAll('#setBudgetModal .sb-dd').forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
    }
    function sbInitDD(triggerId, popId, onSelect, onOpen) {
        const trigger = document.getElementById(triggerId);
        const pop     = document.getElementById(popId);
        if (!trigger || !pop) return;
        trigger.addEventListener('click', function (e) {
            if (e.target.closest('.sb-dd-search')) return;
            e.stopPropagation();
            const willOpen = !pop.classList.contains('is-open');
            sbCloseAllDD();
            if (willOpen) {
                pop.classList.add('is-open');
                trigger.setAttribute('aria-expanded', 'true');
                if (onOpen) onOpen();
            }
        });
        pop.addEventListener('click', function (e) {
            const opt = e.target.closest('.sb-dd-opt');
            if (!opt || opt.hidden) return;
            e.stopPropagation();
            onSelect(opt);
            sbCloseAllDD();
        });
    }
    document.addEventListener('click', function (e) {
        if (!e.target.closest('#setBudgetModal .sb-dd')) sbCloseAllDD();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') sbCloseAllDD(); });

    // ก้อนงบ — set ค่า + label + .is-active จาก data-value/data-label แล้วคำนวณ pool ใหม่
    function sbSetPlan(value) {
        const label = document.getElementById('sbPlanLabel');
        let matched = null;
        document.querySelectorAll('#sbPlanPop .sb-dd-opt').forEach(function (o) {
            const on = String(o.dataset.value) === String(value || '');
            o.classList.toggle('is-active', on);
            if (on) matched = o;
        });
        document.getElementById('sbYearlyPlan').value = value || '';
        if (matched) { label.textContent = matched.dataset.label; label.classList.remove('is-ph'); }
        else { label.textContent = label.dataset.placeholder || ''; label.classList.add('is-ph'); }
        sbRecomputePool();
    }
    sbInitDD('sbPlanTrigger', 'sbPlanPop', function (opt) { sbSetPlan(opt.dataset.value); });

    // ผู้อนุมัติ — เช่นเดียวกับก้อนงบ + ช่องค้นหาในตัว pop (แทน .vc-ac เดิม)
    function sbSetApprover(value) {
        const label = document.getElementById('sbApproverLabel');
        let matched = null;
        document.querySelectorAll('#sbApproverPop .sb-dd-opt').forEach(function (o) {
            const on = (o.dataset.value || '') === (value || '');
            o.classList.toggle('is-active', on);
            if (on) matched = o;
        });
        document.getElementById('sbApprover').value = value || '';
        if (matched) { label.textContent = matched.dataset.label; label.classList.remove('is-ph'); }
        else { label.textContent = label.dataset.placeholder || ''; label.classList.add('is-ph'); }
    }
    const sbApproverSearch = document.getElementById('sbApproverSearch');
    sbInitDD('sbApproverTrigger', 'sbApproverPop', function (opt) { sbSetApprover(opt.dataset.value); }, function () {
        if (!sbApproverSearch) return;
        sbApproverSearch.value = '';
        document.querySelectorAll('#sbApproverPop .sb-dd-opt').forEach(function (o) { o.hidden = false; });
        sbApproverSearch.focus();
    });
    if (sbApproverSearch) {
        sbApproverSearch.addEventListener('input', function () {
            const q = sbApproverSearch.value.trim().toLowerCase();
            document.querySelectorAll('#sbApproverPop .sb-dd-opt').forEach(function (o) {
                if (o.dataset.value === '') return;   // "— ยังไม่กำหนด —" อยู่ให้เลือกเสมอ
                o.hidden = !!q && !(o.dataset.label || '').toLowerCase().includes(q);
            });
        });
    }

    // วงเงินคงเหลือของ (ประเภทงบ, ก้อนงบ) ที่เลือกอยู่ — bar 3 ช่วง (จัดสรรแล้ว/งบก้อนนี้/เหลือ)
    // + เตือน/บล็อกถ้าเพดานที่พิมพ์เกินวงเงินที่เหลือ (ตัดสินใจ 2026-08-07: บล็อกจริง ไม่ใช่แค่เตือน —
    // backend เช็กซ้ำอีกชั้นใน _handle_set_budget กันกรณี client ถูกข้าม)
    function sbRecomputePool() {
        const opt = document.querySelector('#sbPlanPop .sb-dd-opt.is-active');
        if (!opt) { sbPoolSummary.classList.add('d-none'); return; }
        sbPoolSummary.classList.remove('d-none');

        const isCentral = document.getElementById('sbBudgetType').value === 'central';
        const pool   = Number(isCentral ? opt.dataset.centralPool : opt.dataset.deptPool) || 0;
        const alloc  = Number(isCentral ? opt.dataset.centralAlloc : opt.dataset.deptAlloc) || 0;
        const newAmt = Math.max(0, Number(sbAmountInput.value) || 0);
        const left   = pool - alloc;

        document.getElementById('sbPoolLabel').textContent  = isCentral ? 'วงเงินส่วนกลาง' : 'วงเงินส่วนกอง';
        document.getElementById('sbPoolPeriod').textContent = opt.dataset.period || '—';
        document.getElementById('sbPoolTotal').textContent  = fmtMoney(pool);
        document.getElementById('sbPoolAlloc').textContent  = fmtMoney(alloc);
        document.getElementById('sbPoolLeft').textContent   = fmtMoney(Math.max(0, left - newAmt));

        const allocPct = pool > 0 ? Math.min(100, alloc / pool * 100) : 0;
        const newPct   = pool > 0 ? Math.min(Math.max(0, 100 - allocPct), newAmt / pool * 100) : 0;
        const over     = newAmt > left;

        document.getElementById('sbPoolBarAlloc').style.width = allocPct + '%';
        const barNew = document.getElementById('sbPoolBarNew');
        barNew.style.width = newPct + '%';
        barNew.classList.toggle('is-over', over);
        document.getElementById('sbPoolLegNew').classList.toggle('d-none', newAmt <= 0);

        if (sbAmountHint) {
            sbAmountHint.style.color = over ? 'var(--bb-dg)' : '';
            sbAmountHint.textContent = over
                ? 'เกินวงเงินที่เหลือ ฿' + fmtMoney(left) + ' อยู่ ฿' + fmtMoney(newAmt - left)
                : 'ยอดสูงสุดที่หักได้ตลอดช่วงของก้อนงบที่เลือก — เมื่อปิดทริปแต่ละครั้งระบบจะหักจากยอดนี้';
        }
    }

    setBudgetModal.addEventListener('show.bs.modal', function (ev) {
        const btn        = ev.relatedTarget;
        const type       = (btn && btn.dataset.budgetType) || 'central';
        const isCentral  = type === 'central';
        const approverId = (btn && btn.dataset.approver) || '';
        const deptName   = (btn && btn.dataset.dept) || '';
        const amount     = (btn && btn.dataset.amount) || '';
        const bid        = (btn && btn.dataset.bid) || '';
        const hasBudget  = !!bid;

        document.getElementById('sbBudgetId').value = bid;
        document.getElementById('sbDept').value     = deptName;
        sbAmountInput.value                          = amount;
        document.getElementById('sbNote').value     = '';

        sbSetType(type);
        sbSetPlan((btn && btn.dataset.planId) || '');
        sbSetApprover(approverId);

        const groupLabel = isCentral ? 'งบส่วนกลาง' : 'งบงานกอง';
        const eyebrow     = document.getElementById('sbEyebrow');
        const title       = document.getElementById('sbTitle');
        const subtitle    = document.getElementById('sbSubtitle');
        const submitTxt   = document.getElementById('sbSubmitText');

        sbHero.classList.toggle('d-none', !hasBudget);
        sbCreateFields.classList.toggle('d-none', hasBudget);
        sbQuickAdd.classList.toggle('d-none', !hasBudget);
        sbNoteWrap.classList.toggle('d-none', !hasBudget);
        sbNotice.classList.toggle('d-none', hasBudget);
        if (sbAmountHint) sbAmountHint.classList.toggle('d-none', hasBudget);

        if (hasBudget) {
            eyebrow.textContent  = '#แก้ไขเพดานงบ';
            title.textContent    = deptName;
            subtitle.textContent = groupLabel;
            if (submitTxt) submitTxt.textContent = 'อัปเดตเพดาน';
            if (sbAmountLabel) sbAmountLabel.textContent = 'เพดานงบใหม่ (บาท)';
            sbApplyHero(btn);
            sbBaseAmount = Number(amount) || 0;
            sbUpdateDeltaHint(sbBaseAmount);
        } else {
            eyebrow.textContent  = '#ตั้งงบย่อยใหม่';
            title.textContent    = 'ตั้ง' + groupLabel + 'ใหม่';
            subtitle.textContent = 'กรอกข้อมูลกองและเพดานที่ต้องการ';
            if (submitTxt) submitTxt.textContent = 'บันทึกงบ';
            if (sbAmountLabel) sbAmountLabel.textContent = 'เพดานงบ (บาท)';
        }
    });

    // ── บล็อก submit ถ้าโหมดสร้างใหม่ + เพดานเกินวงเงินที่เหลือ (client-side preview ของเช็ก
    //    เดียวกับ backend _handle_set_budget — กันกด submit เปล่าๆ ก่อนถึง server) ──
    setBudgetModal.querySelector('form').addEventListener('submit', function (ev) {
        if (sbCreateFields.classList.contains('d-none')) return;   // โหมดแก้ไข ไม่เช็กฝั่งนี้
        const opt = document.querySelector('#sbPlanPop .sb-dd-opt.is-active');
        if (!opt) return;   // required attr ของ input ก้อนงบเดิมจับไปแล้ว (ไม่มี hidden required แต่ browser เช็ก sbAmount/sbDept)
        const isCentral = document.getElementById('sbBudgetType').value === 'central';
        const pool  = Number(isCentral ? opt.dataset.centralPool : opt.dataset.deptPool) || 0;
        const alloc = Number(isCentral ? opt.dataset.centralAlloc : opt.dataset.deptAlloc) || 0;
        const newAmt = Number(sbAmountInput.value) || 0;
        if (newAmt > pool - alloc) {
            ev.preventDefault();
            sbRecomputePool();
            sbAmountInput.focus();
        }
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

// ── Confirm dialog ก่อนลบงบทิ้งถาวร (v2.29 — งบปิดแล้ว tab) ──
document.addEventListener('submit', function (e) {
    const form = e.target.closest('form[data-confirm-delete]');
    if (!form) return;
    const dept = form.dataset.deptName || 'งบนี้';
    const msg = 'ลบงบของ "' + dept + '" ทิ้งถาวรใช่หรือไม่?\n\n' +
        '⚠️ กู้คืนไม่ได้ (ใช้ได้เฉพาะงบที่ยังไม่เคยมีการหักเงิน/ปรับยอดจริง — ระบบจะบล็อกให้เองถ้าเคยใช้แล้ว)';
    if (!confirm(msg)) e.preventDefault();
});

// ── Confirm dialog ก่อนลบก้อนงบทิ้งถาวร (v2.30 — แท็บ "งบหลัก") — ลบพร้อม cascade งบย่อยที่ผูกอยู่ ──
document.addEventListener('submit', function (e) {
    const form = e.target.closest('form[data-confirm-delete-plan]');
    if (!form) return;
    const name = form.dataset.planName || 'ก้อนงบนี้';
    const msg = 'ลบ "' + name + '" ทิ้งถาวรใช่หรือไม่?\n\n' +
        '⚠️ กู้คืนไม่ได้ งบย่อยทั้งหมดที่ผูกกับก้อนนี้จะถูกลบไปด้วย ' +
        '(ใช้ได้เฉพาะตอนใช้ไป 0 บาททั้งก้อน — ระบบจะบล็อกให้เองถ้ามีงบย่อยที่ใช้ไปแล้ว)';
    if (!confirm(msg)) e.preventDefault();
});

// ── Main tabs (2026-07-29): ตารางรวม / กำลังใช้งาน / ไม่ได้ใช้งานแล้ว / ร่วมบุญส่วนตัว
//    tab2 component (.tab2-tab + data-tab, ดู _shared/tab2.html) แทน .bb-tabs เดิม —
//    client-side switch (data set render มาครบแล้ว). default = pivot.
(function initBudgetTabs() {
    const wrap    = document.getElementById('budgetTab2Wrap');
    const tabs    = wrap ? Array.from(wrap.querySelectorAll('.tab2-tab')) : [];
    const panels  = Array.from(document.querySelectorAll('[data-budget-panel]'));
    const toolbar = document.getElementById('budgetToolbar');
    if (!tabs.length) return;

    function activate(name) {
        tabs.forEach(function (t) {
            t.classList.toggle('active', t.dataset.tab === name);
        });
        panels.forEach(function (p) {
            p.classList.toggle('d-none', p.dataset.budgetPanel !== name);
        });
        // toolbar (เดือน + ตั้งงบ) โชว์เฉพาะ tab "กำลังใช้งาน"
        if (toolbar) toolbar.classList.toggle('d-none', name !== 'active');
    }

    tabs.forEach(function (t) {
        t.addEventListener('click', function () { activate(t.dataset.tab); });
    });

    // sync panel กับ tab ที่ active อยู่ตอน load (default = pivot)
    const current = tabs.find(function (t) { return t.classList.contains('active'); }) || tabs[0];
    activate(current.dataset.tab);
})();

// ── Yearly plan chip (v2.26 — เดิม "ปีงบ" ผูก year=<ค.ศ.>&month=3 ตอนนี้เลือก plan ตรงๆ
//    ผ่าน ?plan_id= แทน เพราะ plan มีช่วงเวลาของตัวเอง ไม่ผูกกับเดือนมี.ค.แล้ว):
//    ue_chip_dd (_components/bb/ue_chip.html) radio ไม่ auto-navigate เอง (mechanism ออกแบบไว้
//    เก็บ state ใน form filter เท่านั้น) → ฟัง 'ue-chip:change' ที่ .ue-chip-dd แล้วสั่ง navigate เอง
(function initYearlyPlanChip() {
    const dd = document.getElementById('ddYearlyPlan');
    if (!dd) return;
    // initUeChipDd (bb-components.js) portals .ue-chip-pop ไป document.body ตอนเปิด (กัน overflow
    // clip) — 'ue-chip:change' ยิงตอน dropdown ยังเปิดอยู่ (คลิก checkbox/radio ก่อนปิด panel) แปลว่า
    // input ไม่ได้อยู่ใต้ dd ใน DOM แล้ว ณ ตอนนั้น dd.querySelector(...) จึงหาไม่เจอเสมอ (2026-08-07 bug)
    // capture ตัว pop ไว้ตอน init แทน (เหมือนที่ initUeChipDd เก็บ body ไว้ใน closure ของมันเอง) —
    // querySelector จาก node reference ตรงๆ ทำงานได้ไม่ว่า node นั้นจะอยู่ตรงไหนใน document ปัจจุบัน
    const pop = dd.querySelector('[data-ue-chip-pop]');
    if (!pop) return;
    dd.addEventListener('ue-chip:change', function () {
        const radio = pop.querySelector('input[type="radio"]:checked');
        if (!radio || !radio.value) return;
        const url = new URL(window.location.href);
        url.searchParams.set('plan_id', radio.value);
        window.location.href = url.toString();
    });
})();

// ── Plan year chip (v2.29 — client-side, ไม่ reload หน้าแล้ว) — narrow ตัวเลือกใน chip "งบ"
//    (#ddYearlyPlan) เหลือเฉพาะ plan ที่ทับปีปฏิทินที่เลือก อ่านช่วงปีจาก data-plan-year-start/end
//    ที่แปะไว้ที่ .ue-chip-opt แต่ละตัว (เดิม v2.28 navigate ไป ?plan_year= — ตัดตามคำขอผู้ใช้)
(function initPlanYearChip() {
    const dd     = document.getElementById('ddPlanYear');
    const planDd = document.getElementById('ddYearlyPlan');
    if (!dd || !planDd) return;
    // เหตุผลเดียวกับ initYearlyPlanChip ด้านบน — pop portal ไป document.body ตอนเปิด, capture
    // reference ไว้ตอน init แทน dd.querySelector ตรงๆ ตอน event (2026-08-07 bug fix)
    const pop = dd.querySelector('[data-ue-chip-pop]');
    if (!pop) return;

    function apply() {
        const radio = pop.querySelector('input[type="radio"]:checked');
        const year  = radio ? Number(radio.value) : null;
        planDd.querySelectorAll('.ue-chip-opt').forEach(function (opt) {
            if (!year) { opt.hidden = false; return; }
            const start = Number(opt.dataset.planYearStart);
            const end   = Number(opt.dataset.planYearEnd);
            opt.hidden = !(start <= year && year <= end);
        });
    }

    dd.addEventListener('ue-chip:change', apply);
    apply();
})();

// ── Pivot filter: ประเภทงบ (2026-07-29, v2.28: ตัด "กอง" ออก) — กรองเฉพาะตารางปีงบ
//    (#pivotMockupTable, เดิมกรอง #pivotAllDetails ก่อนตารางนั้นถูกลบ 2026-07-31)
//    ไม่แตะ tab อื่น (ตกลงกันไว้). ue_chip_dd เป็น checkbox multi-select ปกติ (ไม่ติ๊ก = ทั้งหมด)
//    filter client-side ล้วน — ข้อมูล render มาครบแล้วในหน้าไม่ต้อง reload. แถวรวมท้ายตาราง (tbody
//    ไม่มี data-budget-type) ไม่ถูกฟิลเตอร์ — โชว์ grand total เสมอไม่ว่าจะกรองอะไรอยู่
(function initPivotFilter() {
    const ddType = document.getElementById('ddPivotBudgetType');
    const table  = document.getElementById('pivotMockupTable');
    if (!table || !ddType) return;
    // เหตุผลเดียวกับ initYearlyPlanChip ด้านบน — pop portal ไป document.body ตอนเปิด, capture
    // reference ไว้ตอน init แทน dd.querySelectorAll ตรงๆ ตอน event (2026-08-07 bug fix)
    const pop = ddType.querySelector('[data-ue-chip-pop]');
    if (!pop) return;

    function checkedValues(popEl) {
        return Array.from(popEl.querySelectorAll('input[type="checkbox"]:checked')).map(function (el) { return el.value; });
    }

    function apply() {
        const types = checkedValues(pop);
        table.querySelectorAll('tbody[data-budget-type]').forEach(function (tbody) {
            const type = tbody.dataset.budgetType;
            tbody.hidden = !(types.length === 0 || types.includes(type));
        });
    }

    ddType.addEventListener('ue-chip:change', apply);
})();

// ── "งบหลัก" tab (v2.28, เปลี่ยนชื่อจาก "รายชื่องบใหญ่" v2.29) — radio "ตั้งเป็นค่าเริ่มต้น" auto-submit ฟอร์มของแถวนั้นเมื่อเลือก
//    (แต่ละแถวมี <form data-set-default-form> ของตัวเอง — POST action=set_default_plan)
document.addEventListener('change', function (e) {
    if (!e.target.matches('[data-set-default-radio]')) return;
    const form = e.target.closest('[data-set-default-form]');
    if (form) form.submit();
});

// ── yearlyPlanModal: create vs edit (v2.29 — data-attribute driven, wireModal-style) — modal
//    instance เดียวใช้ร่วมหลายปุ่ม ("ตั้งงบใหม่" โซนบน, "แก้ไขก้อนเงิน" โซนบน, icon แก้ไขรายแถวใน
//    แท็บ "งบหลัก") เดิม (v2.28) ใช้ snapshot ค่าเดียวตอน page-load ทำให้แก้ไขได้แค่ plan ที่กำลังดูอยู่
//    เท่านั้น — ตอนนี้เปลี่ยนมาอ่านจาก data-plan-* ของปุ่มที่กดตรงๆ (เหมือน wireModal() ด้านบน) ทำให้
//    icon แก้ไขแต่ละแถวในแท็บ "งบหลัก" เปิดแก้ plan ของแถวนั้นได้ตรงตัว ไม่ใช่แค่ plan ที่กำลังดูอยู่
//    redesign 2026-08-06 รอบ 2: วันที่เริ่ม/สิ้นสุดเปลี่ยนจาก ue_chip_dd (filter chip — ผิดหมวด
//    ใน form field) เป็น .yp-dd (field-box trigger dropdown, ดู macro yp_dd ใน vehicle_budget.html)
//    + ปีเป็น disabled input — ค่า day/month/year ถูกประกอบเป็น ISO string เขียนลง hidden
//    #ypStartDate/#ypEndDate (name เดิม start_date/end_date ไม่เปลี่ยน contract กับ backend
//    _handle_set_yearly_plan)

// ── .yp-dd popover open/close/select (UI ล้วน — ไม่รู้เรื่อง ISO date, แค่ dataset.value +
//    dispatch 'yp-dd:change' ให้ initYearlyPlanModalMode ด้านล่างฟังต่อ) ──
(function initYearlyPlanDateDD() {
    const dds = document.querySelectorAll('#yearlyPlanModal .yp-dd');
    if (!dds.length) return;

    function closeAll() {
        dds.forEach(function (dd) {
            const pop = dd.querySelector('[data-yp-dd-pop]');
            if (pop) pop.classList.remove('is-open');
            dd.setAttribute('aria-expanded', 'false');
        });
    }

    dds.forEach(function (dd) {
        const pop = dd.querySelector('[data-yp-dd-pop]');
        if (!pop) return;

        dd.addEventListener('click', function (e) {
            e.stopPropagation();
            const willOpen = !pop.classList.contains('is-open');
            closeAll();
            if (willOpen) { pop.classList.add('is-open'); dd.setAttribute('aria-expanded', 'true'); }
        });

        pop.addEventListener('click', function (e) {
            const opt = e.target.closest('.yp-dd-opt');
            if (!opt) return;
            e.stopPropagation();
            const label = dd.querySelector('[data-yp-dd-value]');
            dd.dataset.value = opt.dataset.value;
            if (label) { label.textContent = opt.dataset.label; label.classList.remove('is-ph'); }
            pop.querySelectorAll('.yp-dd-opt').forEach(function (o) { o.classList.toggle('is-active', o === opt); });
            closeAll();
            dd.dispatchEvent(new Event('yp-dd:change', { bubbles: true }));
        });
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('#yearlyPlanModal .yp-dd')) closeAll();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
})();

// ── ypTotal/ypCentral/ypDeptPreview — comma thousand-separator ระหว่างพิมพ์ (2026-08-07,
//    ตามคำขอผู้ใช้ "จะได้รู้หลักของเลข") field เดิมเป็น <input type="number"> ซึ่ง browser
//    ไม่ยอมให้พิมพ์ , เข้าไปเลย ต้องเปลี่ยนเป็น type="text" + inputmode="numeric" แล้ว mask เอง —
//    fmtComma/parseComma ใช้ร่วมกันทั้ง initYearlyPlanModalMode (prefill ตอนแก้ไข) และ
//    initYearlyPlanPreview (คำนวณ live) ต้อง stripComma ก่อน submit เสมอ (backend parse ด้วย
//    float() ตรงๆ — comma หลุดไปจะ ValueError) ──
function fmtComma(n) { return Math.round(Number(n) || 0).toLocaleString('en-US'); }
function parseComma(v) { return Number(String(v || '').replace(/,/g, '')) || 0; }
function stripComma(v) { return String(v || '').replace(/,/g, ''); }

function bindMoneyInputFormat(input) {
    if (!input) return;
    input.addEventListener('input', function () {
        const caret = input.selectionStart;
        const digitsBeforeCaret = input.value.slice(0, caret).replace(/[^0-9]/g, '').length;
        const raw = input.value.replace(/[^0-9]/g, '');
        input.value = raw ? Number(raw).toLocaleString('en-US') : '';
        let count = 0, pos = input.value.length;
        for (let i = 0; i < input.value.length; i++) {
            if (/[0-9]/.test(input.value[i])) count++;
            if (count === digitsBeforeCaret) { pos = i + 1; break; }
        }
        if (digitsBeforeCaret === 0) pos = 0;
        input.setSelectionRange(pos, pos);
    });
}

(function initYearlyPlanModalMode() {
    const modal = document.getElementById('yearlyPlanModal');
    const form  = modal && modal.querySelector('form');
    if (!form) return;

    const planIdInput  = form.querySelector('[name="plan_id"]');
    const nameInput     = document.getElementById('ypName');
    const totalInput    = document.getElementById('ypTotal');
    const centralInput  = document.getElementById('ypCentral');
    const deptPreview   = document.getElementById('ypDeptPreview');
    bindMoneyInputFormat(totalInput);
    bindMoneyInputFormat(centralInput);

    const startDateHidden = document.getElementById('ypStartDate');
    const endDateHidden   = document.getElementById('ypEndDate');
    const startYearInput  = document.getElementById('ypStartYear');
    const endYearInput    = document.getElementById('ypEndYear');
    const errorBox        = document.getElementById('ypDateError');
    const errorText       = document.getElementById('ypDateErrorText');

    const ddStartDay   = document.getElementById('ddYpStartDay');
    const ddStartMonth = document.getElementById('ddYpStartMonth');
    const ddEndDay     = document.getElementById('ddYpEndDay');
    const ddEndMonth   = document.getElementById('ddYpEndMonth');

    // .yp-dd (field-box dropdown, redesign 2026-08-06 รอบ 2 — แทน ue_chip_dd) เก็บค่าที่เลือกไว้ที่
    // dataset.value ของ root ตรงๆ ไม่ผ่าน radio/checked แล้ว — เปิด/ปิด popover + toggle .is-active
    // อยู่ใน initYearlyPlanDateDD ด้านล่าง (แยกความรับผิดชอบ: อันนั้นแค่ UI, อันนี้ประกอบ ISO date)
    function chipValue(dd) {
        const v = dd && dd.dataset.value;
        return v ? Number(v) : null;
    }

    // set ค่า .yp-dd ตรงๆ ผ่าน dataset + label + .is-active แล้ว dispatch 'yp-dd:change' ครั้งเดียว
    // value=null = เคลียร์ (คืน placeholder เดิมจาก data-placeholder บน label)
    function setChipValue(dd, value) {
        if (!dd) return;
        const label = dd.querySelector('[data-yp-dd-value]');
        const opts  = dd.querySelectorAll('.yp-dd-opt');
        let matched = null;
        opts.forEach(function (o) {
            const on = value !== null && Number(o.dataset.value) === Number(value);
            o.classList.toggle('is-active', on);
            if (on) matched = o;
        });
        if (matched) {
            dd.dataset.value = matched.dataset.value;
            if (label) { label.textContent = matched.dataset.label; label.classList.remove('is-ph'); }
        } else {
            delete dd.dataset.value;
            if (label) { label.textContent = label.dataset.placeholder || ''; label.classList.add('is-ph'); }
        }
        dd.dispatchEvent(new Event('yp-dd:change', { bubbles: true }));
    }

    function daysInMonth(month, year) {
        return new Date(year, month, 0).getDate();
    }

    function pad2(n) { return String(n).padStart(2, '0'); }

    function hideDateError() {
        if (errorBox) errorBox.classList.add('d-none');
        if (errorText) errorText.textContent = '';
    }

    function showDateError(msg) {
        if (errorText) errorText.textContent = msg;
        if (errorBox) errorBox.classList.remove('d-none');
    }

    // ประกอบ day/month/year ปัจจุบันเป็น ISO string ลง hidden input — เดือนที่มีวันน้อยกว่าที่เลือกไว้
    // ("เดือนนี้มี 30 วันไม่สามารถเลือกวันที่ 31 ได้") เคลียร์ day ทิ้งแล้วเตือน
    function recomputeDates() {
        const sYear = Number(startYearInput.value) || null;
        const eYear = Number(endYearInput.value) || null;
        const sMonth = chipValue(ddStartMonth);
        const eMonth = chipValue(ddEndMonth);
        let sDay = chipValue(ddStartDay);
        let eDay = chipValue(ddEndDay);

        if (sDay && sMonth && sYear && sDay > daysInMonth(sMonth, sYear)) {
            const max = daysInMonth(sMonth, sYear);
            setChipValue(ddStartDay, null);
            sDay = null;
            showDateError('เดือนที่เลือก (เริ่มใช้งบ) มี ' + max + ' วัน — เลือกวันที่ 1-' + max);
        }
        if (eDay && eMonth && eYear && eDay > daysInMonth(eMonth, eYear)) {
            const max = daysInMonth(eMonth, eYear);
            setChipValue(ddEndDay, null);
            eDay = null;
            showDateError('เดือนที่เลือก (สิ้นสุดการใช้งบ) มี ' + max + ' วัน — เลือกวันที่ 1-' + max);
        }

        startDateHidden.value = (sDay && sMonth && sYear) ? (sYear + '-' + pad2(sMonth) + '-' + pad2(sDay)) : '';
        endDateHidden.value   = (eDay && eMonth && eYear) ? (eYear + '-' + pad2(eMonth) + '-' + pad2(eDay)) : '';
    }

    [ddStartDay, ddStartMonth, ddEndDay, ddEndMonth].forEach(function (dd) {
        if (!dd) return;
        dd.addEventListener('yp-dd:change', function () { hideDateError(); recomputeDates(); });
    });

    form.addEventListener('submit', function (ev) {
        if (totalInput)   totalInput.value   = stripComma(totalInput.value);
        if (centralInput) centralInput.value = stripComma(centralInput.value);
        hideDateError();
        recomputeDates();
        if (!startDateHidden.value || !endDateHidden.value) {
            ev.preventDefault();
            showDateError('กรุณาเลือกวันที่เริ่มใช้งบและวันที่สิ้นสุดการใช้งบให้ครบ');
            return;
        }
        if (startDateHidden.value > endDateHidden.value) {
            ev.preventDefault();
            showDateError('วันที่เริ่มใช้งบต้องไม่มากกว่าวันที่สิ้นสุดการใช้งบ');
        }
    });

    modal.addEventListener('show.bs.modal', function (ev) {
        hideDateError();
        const btn      = ev.relatedTarget;
        const mode     = btn && btn.dataset.planMode;
        const today    = new Date();
        const thisYear = today.getFullYear();
        const nextYear = thisYear + 1;

        if (mode === 'create') {
            if (planIdInput)  planIdInput.value  = '';
            if (nameInput)    nameInput.value    = 'งบประมาณประจำปี ';
            if (totalInput)   totalInput.value   = '';
            if (centralInput) centralInput.value = '';
            if (deptPreview)  deptPreview.value  = '';

            startYearInput.value = thisYear;
            endYearInput.value   = nextYear;
            setChipValue(ddStartDay,   today.getDate());
            setChipValue(ddStartMonth, today.getMonth() + 1);
            setChipValue(ddEndDay,     null);
            setChipValue(ddEndMonth,   today.getMonth() + 1);
            recomputeDates();
            return;
        }

        if (!btn) return;  // edit แต่ไม่รู้ plan ไหน — ปล่อยฟอร์มไว้ตามเดิม กันเขียนทับผิดๆ
        const total   = Number(btn.dataset.planTotal) || 0;
        const central = Number(btn.dataset.planCentral) || 0;
        if (planIdInput)  planIdInput.value  = btn.dataset.planId || '';
        if (nameInput)    nameInput.value    = btn.dataset.planName || '';
        if (totalInput)   totalInput.value   = btn.dataset.planTotal ? fmtComma(total) : '';
        if (centralInput) centralInput.value = btn.dataset.planCentral ? fmtComma(central) : '';
        if (deptPreview)  deptPreview.value  = fmtComma(total - central);

        const start = btn.dataset.planStart ? new Date(btn.dataset.planStart + 'T00:00:00') : null;
        const end   = btn.dataset.planEnd   ? new Date(btn.dataset.planEnd   + 'T00:00:00')   : null;

        startYearInput.value = start ? start.getFullYear() : thisYear;
        endYearInput.value   = end   ? end.getFullYear()   : nextYear;
        setChipValue(ddStartDay,   start ? start.getDate() : null);
        setChipValue(ddStartMonth, start ? start.getMonth() + 1 : null);
        setChipValue(ddEndDay,     end ? end.getDate() : null);
        setChipValue(ddEndMonth,   end ? end.getMonth() + 1 : null);
        recomputeDates();
    });
})();

// ── Yearly plan modal: preview ส่วนกอง = ทั้งปี − ส่วนกลาง (2026-07-31)
//    v2.28: ypDeptPreview เปลี่ยนจาก <strong> (textContent) เป็น <input> (ตาม ypTotal/ypCentral)
//    เพื่อให้หน้าตาตรงกัน — set .value ไม่ใช่ .textContent (input ไม่มี text node)
//    v2.30 (2026-08-07): total/central เปลี่ยนเป็น type="text" + comma mask (bindMoneyInputFormat
//    ด้านบน) — parse ผ่าน parseComma() แทน Number() ตรงๆ (value มี comma ปนอยู่) ──
(function initYearlyPlanPreview() {
    const total   = document.getElementById('ypTotal');
    const central = document.getElementById('ypCentral');
    const preview = document.getElementById('ypDeptPreview');
    if (!total || !central || !preview) return;

    function update() {
        const dept = parseComma(total.value) - parseComma(central.value);
        preview.value = fmtComma(dept);
    }
    total.addEventListener('input', update);
    central.addEventListener('input', update);
    update();
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
        btn.innerHTML = '<i data-lucide="loader"></i> กำลังบันทึก...';
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
            r.style.background = '';
        });
        pick.style.background = 'var(--bb-accent-bg)';
        const submit = refundModal.querySelector('[data-refund-submit]');
        if (submit) submit.disabled = false;
    });
    refundModal.addEventListener('hide.bs.modal', function () {
        refundModal.querySelectorAll('[data-pick-booking]').forEach(function (r) {
            r.style.background = '';
        });
        const submit = refundModal.querySelector('[data-refund-submit]');
        if (submit) submit.disabled = true;
        const form = refundModal.querySelector('form');
        if (form) form.querySelector('[name="booking_id"]').value = '';
    });
}

/* ── Date pickers — แทน native type="date" ในทุก modal ──
   ปุ่ม trigger (.bb-dp-trigger) → .bb-datepicker popover (reuse bb-cal* CSS) →
   คลิกวัน → set hidden input (ISO) + sync label. ไม่ submit เอง (ค่าอยู่ในฟอร์มจน submit).
   pre-fill จาก modal show → sync label ตอน shown.bs.modal. required (extend modal) ตรวจตอน submit. */
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
                labelEl.classList.remove('is-ph');
            } else {
                labelEl.textContent = placeholder;
                labelEl.classList.add('is-ph');
            }
            btn.style.borderColor = '';
        }

        function render() {
            const y = cursor.getFullYear(), m = cursor.getMonth();
            titleEl.textContent = `${TH_MON_F[m]} ${y + 543}`;
            if (!dowWrap.childElementCount) {
                dowWrap.innerHTML = TH_DAYS_S.map(d => `<span class="bb-cal-dow">${d}</span>`).join('');
            }
            const sel = parseISO(input.value);
            const startPad = new Date(y, m, 1).getDay();
            const days = new Date(y, m + 1, 0).getDate();
            let cells = '';
            for (let i = 0; i < startPad; i++) cells += `<span class="bb-cal-day is-empty"></span>`;
            for (let dn = 1; dn <= days; dn++) {
                const d = new Date(y, m, dn);
                let cls = 'bb-cal-day';
                if (sel && sameDay(d, sel)) cls += ' is-selected';
                if (sameDay(d, today))      cls += ' is-today';
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
            const root    = inp.closest('[data-datepick]');
            const trigger = root.querySelector('[data-datepick-btn]');
            if (!inp.value) {
                if (trigger) trigger.style.borderColor = 'var(--bb-dg)';
                if (!firstMissing) firstMissing = root;
            } else {
                if (trigger) trigger.style.borderColor = '';
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
