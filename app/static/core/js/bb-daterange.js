/* ══════════════════════════════════════════════════
   core/js/bb-daterange.js — .bb-* date-range picker (Stripe-style v2)
   ──────────────────────────────────────────────────
   ขับ markup จาก macro _components/bb/daterange.html

   layout (เลียน Stripe dashboard):
   - preset sidebar (ซ้าย) — today/7d/4w/3m/6m/12m/mtd/qtd/ytd
     มือถือ: ยุบเป็นปุ่ม "ช่วงเวลา" (data-bb-dr-presets-btn, col-auto ชิดซ้าย) กดกาง/ยุบ list เอง (2026-07-02)
   - Start/End input (บน) — พิมพ์ DD/MM/YYYY (พ.ศ.) แก้ได้
   - bb-daterange-cals = 2 คอลัมน์ (.bb-dr-cal-col) แต่ละคอลัมน์มี head ของตัวเอง
     (คอลัมน์ 0: nav < + ชื่อเดือน caret · คอลัมน์ 1: ชื่อเดือน caret + nav >) + ปฏิทินของตัวเอง (2026-07-02)
   - desktop = 2 คอลัมน์เรียงแนวนอน ขนาดคงที่ · มือถือ = stack แนวตั้ง เต็มความกว้าง (เต็มพื้นที่เหลือ)
   - caret ชื่อเดือน → แทนที่เฉพาะฝั่งนั้นด้วย month/year grid (4 คอลัมน์) ฝั่งตรงข้ามเห็นปฏิทินเดิมต่อ
   - footer: "ปิด" (หุบ popover เฉยๆ ไม่ commit — เดิมชื่อ "ยกเลิก" แต่ทำแค่ล้าง draft ไม่ได้ปิดจริง) · "ยืนยัน" (commit)
   - popover กันล้นจอ: desktop clamp ด้วย translateX ถ้าเกิน viewport, มือถือ position:fixed เต็มความกว้างใต้ header

   draft vs applied: เลือก/preset/พิมพ์ = แก้ draft เท่านั้น → กด "ใช้" จึง commit
   commit = เขียน hidden input (start/end) + dispatch 'bb-daterange:change'
   {detail:{preset,start,end}} ให้หน้า hook เอง · Esc/คลิกนอก = revert

   generic reusable — ไม่ผูก business logic
══════════════════════════════════════════════════ */

(function () {
    'use strict';

    const TH_DAYS_S = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    const TH_MON_F  = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                       'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const TH_MON_S  = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                       'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const PRESET_LABEL = {
        today: 'วันนี้', '7d': '7 วันล่าสุด', '4w': '4 สัปดาห์ล่าสุด',
        '3m': '3 เดือนล่าสุด', '6m': '6 เดือนล่าสุด', '12m': '12 เดือนล่าสุด',
        mtd: 'เดือนนี้ถึงปัจจุบัน', qtd: 'ไตรมาสนี้ถึงปัจจุบัน', ytd: 'ปีนี้ถึงปัจจุบัน',
        '30d': '30 วันล่าสุด', month: 'เดือนนี้', all: 'ทั้งหมด'   /* legacy keys */
    };

    const pad2  = n => String(n).padStart(2, '0');
    const toISO = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const fmtTH = d => `${d.getDate()} ${TH_MON_S[d.getMonth()]} ${d.getFullYear() + 543}`;
    const fmtInput = d => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear() + 543}`;
    const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() &&
                              a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    const firstOfMonth = d => new Date(d.getFullYear(), d.getMonth(), 1);
    const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

    function parseISO(v) {
        if (!v) return null;
        const [y, m, d] = String(v).split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return isNaN(dt.getTime()) ? null : dt;
    }
    /* รับ 'DD/MM/YYYY' (พ.ศ. หรือ ค.ศ.) → Date | null */
    function parseInput(v) {
        const m = String(v).trim().match(/^(\d{1,2})\D+(\d{1,2})\D+(\d{2,4})$/);
        if (!m) return null;
        let dd = +m[1], mm = +m[2], yy = +m[3];
        if (yy > 2400) yy -= 543;          // พ.ศ. → ค.ศ.
        else if (yy < 100) yy += 2000;
        const dt = new Date(yy, mm - 1, dd);
        return (dt.getMonth() === mm - 1 && dt.getDate() === dd) ? dt : null;
    }
    function presetRange(p) {
        const t = new Date(); t.setHours(0, 0, 0, 0);
        const agoD = n => { const d = new Date(t); d.setDate(d.getDate() - n); return d; };
        const agoM = n => { const d = new Date(t); d.setMonth(d.getMonth() - n); return d; };
        switch (p) {
            case 'today':         return [new Date(t), new Date(t)];
            case '7d':            return [agoD(6), new Date(t)];
            case '4w':            return [agoD(27), new Date(t)];
            case '3m':            return [agoM(3), new Date(t)];
            case '6m':            return [agoM(6), new Date(t)];
            case '12m':           return [agoM(12), new Date(t)];
            case '30d':           return [agoD(29), new Date(t)];
            case 'mtd': case 'month':
                                  return [new Date(t.getFullYear(), t.getMonth(), 1), new Date(t)];
            case 'qtd': { const q = Math.floor(t.getMonth() / 3) * 3;
                                  return [new Date(t.getFullYear(), q, 1), new Date(t)]; }
            case 'ytd':           return [new Date(t.getFullYear(), 0, 1), new Date(t)];
            case 'all':           return [null, null];
        }
        return null;
    }

    const mqMobile = window.matchMedia('(max-width: 767.98px)');

    const openInstances = new Set();
    document.addEventListener('click', e => {
        // pop portal ไป document.body ตอนเปิด (escape overflow ancestor) → เช็ก pop.contains ด้วย ไม่งั้นคลิกในปฏิทินโดนนับเป็น outside
        openInstances.forEach(inst => { if (!inst.root.contains(e.target) && !inst.pop.contains(e.target)) inst.cancel(); });
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') openInstances.forEach(inst => inst.cancel());
    });

    function enhance(root) {
        if (root.dataset.bbDrReady) return;
        root.dataset.bbDrReady = '1';

        const btn       = root.querySelector('[data-bb-dr-btn]');
        const labelEl   = root.querySelector('[data-bb-dr-label]');
        const startIn   = root.querySelector('[data-bb-dr-start]');     // hidden (committed)
        const endIn     = root.querySelector('[data-bb-dr-end]');
        const pop       = root.querySelector('[data-bb-dr-pop]');
        const startInEl = root.querySelector('[data-bb-dr-start-in]');  // top editable
        const endInEl   = root.querySelector('[data-bb-dr-end-in]');
        const calsWrap  = root.querySelector('[data-bb-dr-cals]');
        const titleEl0  = root.querySelector('[data-bb-dr-title="0"]');
        const titleEl1  = root.querySelector('[data-bb-dr-title="1"]');
        const calBody0  = root.querySelector('[data-bb-dr-cal="0"]');
        const calBody1  = root.querySelector('[data-bb-dr-cal="1"]');
        const presets   = root.querySelector('[data-bb-dr-presets]');
        const prevBtn   = root.querySelector('[data-bb-dr-prev]');
        const nextBtn   = root.querySelector('[data-bb-dr-next]');
        const applyBtn  = root.querySelector('[data-bb-dr-apply]');
        const clearBtn  = root.querySelector('[data-bb-dr-clear]');
        const presetsBtn   = root.querySelector('[data-bb-dr-presets-btn]');
        const presetsLabel = root.querySelector('[data-bb-dr-presets-label]');
        if (!btn || !pop || !calsWrap) return;

        const isMobile = () => mqMobile.matches;
        const isRight = root.classList.contains('is-align-right');

        const placeholder = root.dataset.placeholder || 'ทั้งหมด';

        // getAttribute (ไม่ใช่ .value) — กัน browser restore ค่า input เดิมทับตอน manual reload
        let appliedStart = parseISO(startIn.getAttribute('value'));
        let appliedEnd   = parseISO(endIn.getAttribute('value'));
        let appliedPreset = root.dataset.preset || '';
        let draftStart = appliedStart, draftEnd = appliedEnd, draftPreset = appliedPreset;
        let cursor = firstOfMonth(appliedStart || new Date());
        let monthPick = null;   // null | 0 | 1  (ปฏิทินฝั่งที่เปิดเลือกเดือน)
        let pickYear  = cursor.getFullYear();

        /* ── trigger label ── */
        function syncTrigger() {
            if (appliedPreset === 'all') { labelEl.textContent = PRESET_LABEL.all; btn.classList.remove('is-active'); return; }
            if (appliedStart && appliedEnd) {
                labelEl.textContent = sameDay(appliedStart, appliedEnd)
                    ? fmtTH(appliedStart) : `${fmtTH(appliedStart)} – ${fmtTH(appliedEnd)}`;
                btn.classList.add('is-active');
            } else if (appliedPreset && PRESET_LABEL[appliedPreset]) {
                labelEl.textContent = PRESET_LABEL[appliedPreset]; btn.classList.add('is-active');
            } else { labelEl.textContent = placeholder; btn.classList.remove('is-active'); }
        }
        function syncTopInputs() {
            startInEl.value = draftStart ? fmtInput(draftStart) : '';
            endInEl.value   = draftEnd   ? fmtInput(draftEnd)   : '';
        }

        /* ── render one month (band เต็มแถว + โค้งปลายแถว) ── */
        function renderMonth(base) {
            const y = base.getFullYear(), m = base.getMonth();
            const startPad = new Date(y, m, 1).getDay();
            const days = new Date(y, m + 1, 0).getDate();
            const today = new Date(); today.setHours(0, 0, 0, 0);

            let grid = TH_DAYS_S.map(d => `<div class="bb-cal-dow">${d}</div>`).join('');
            for (let i = 0; i < startPad; i++) grid += `<div class="bb-cal-day is-empty"></div>`;
            for (let dn = 1; dn <= days; dn++) {
                const d = new Date(y, m, dn), dow = d.getDay();
                const isS = sameDay(d, draftStart), isE = sameDay(d, draftEnd);
                const inR = draftStart && draftEnd && d > draftStart && d < draftEnd;
                let cls = 'bb-cal-day';
                if (inR) cls += ' in-range';
                if (isS) cls += ' range-start';
                if (isE) cls += ' range-end';
                if (draftStart && !draftEnd && isS) cls += ' range-start range-end';
                if (inR || isS || isE) {                       // โค้งที่ขอบแถว
                    if (dow === 0 || dn === 1)    cls += ' is-rl';
                    if (dow === 6 || dn === days) cls += ' is-rr';
                }
                if (sameDay(d, today)) cls += ' is-today';
                grid += `<button type="button" class="${cls}" data-date="${toISO(d)}">${dn}</button>`;
            }
            return `<div class="bb-cal"><div class="bb-cal-grid">${grid}</div></div>`;
        }

        /* ── month/year quick picker (เปิดจาก caret ชื่อเดือน) — แทนที่เฉพาะฝั่งที่กด
           ฝั่งตรงข้ามยังเห็นปฏิทินเดิม (ไม่ replace ทั้ง calsWrap) ── */
        function renderPicker() {
            const cur = monthPick === 0 ? cursor : addMonths(cursor, 1);
            const cells = TH_MON_S.map((mn, i) => {
                const on = (i === cur.getMonth() && pickYear === cur.getFullYear()) ? ' is-on' : '';
                return `<button type="button" data-pick-month="${i}" class="${on.trim()}">${mn}</button>`;
            }).join('');
            return `<div class="bb-dr-mpick">
                <div class="bb-dr-mpick-head">
                    <button type="button" class="bb-dr-nav" data-pick-year="-1"><i data-lucide="chevron-left"></i></button>
                    <span class="bb-dr-mpick-year">${pickYear + 543}</span>
                    <button type="button" class="bb-dr-nav" data-pick-year="1"><i data-lucide="chevron-right"></i></button>
                </div>
                <div class="bb-dr-mpick-grid">${cells}</div>
            </div>`;
        }

        /* slot 0/1 = เดือนซ้าย/ขวา — desktop และมือถือแสดง 2 เดือนเหมือนกัน (มือถือ scroll แนวนอนเองถ้าจอแคบกว่า) */
        function renderSlot(side) {
            if (monthPick === side) return renderPicker();
            return renderMonth(side === 0 ? cursor : addMonths(cursor, 1));
        }

        function renderTitles() {
            const a = cursor, b = addMonths(cursor, 1);
            const t = (d, side) => `<button type="button" class="bb-dr-monthtitle${monthPick === side ? ' is-on' : ''}" data-title-side="${side}">${TH_MON_F[d.getMonth()]} ${d.getFullYear() + 543} <i data-lucide="chevron-down"></i></button>`;
            titleEl0.innerHTML = t(a, 0);
            titleEl1.innerHTML = t(b, 1);
        }

        function syncPresetsTrigger() {
            if (!presetsLabel) return;
            presetsLabel.textContent = (draftPreset && PRESET_LABEL[draftPreset]) ? PRESET_LABEL[draftPreset] : 'ช่วงเวลา';
        }

        function render() {
            renderTitles();
            calBody0.innerHTML = renderSlot(0);
            calBody1.innerHTML = renderSlot(1);
            syncTopInputs();
            presets.querySelectorAll('button').forEach(bb =>
                bb.classList.toggle('is-on', bb.dataset.preset === draftPreset));
            syncPresetsTrigger();
            if (window.lucide) window.lucide.createIcons({ root: pop });
        }

        /* ── คลิกในพื้นที่ cals: ชื่อเดือน (caret) / วัน / month-picker (delegate ที่ calsWrap
           ทั้งสองคอลัมน์ — คอลัมน์แยก DOM กันแต่ bubble ขึ้นมาที่ parent เดียวกัน) ── */
        calsWrap.addEventListener('click', e => {
            const titleBtn = e.target.closest('[data-title-side]');
            if (titleBtn) {
                const side = +titleBtn.dataset.titleSide;
                if (monthPick === side) monthPick = null;
                else { monthPick = side; pickYear = (side === 0 ? cursor : addMonths(cursor, 1)).getFullYear(); }
                render(); return;
            }
            const yb = e.target.closest('[data-pick-year]');
            if (yb) { pickYear += (+yb.dataset.pickYear); render(); return; }
            const mb = e.target.closest('[data-pick-month]');
            if (mb) {
                const mm = +mb.dataset.pickMonth;
                cursor = monthPick === 1 ? new Date(pickYear, mm - 1, 1) : new Date(pickYear, mm, 1);
                monthPick = null; render(); return;
            }
            const cell = e.target.closest('[data-date]');
            if (!cell) return;
            const d = parseISO(cell.dataset.date);
            draftPreset = '';
            if (!draftStart || (draftStart && draftEnd)) { draftStart = d; draftEnd = null; }
            else if (d < draftStart) { draftStart = d; }
            else { draftEnd = d; }
            render();
        });

        /* ── preset (draft only) ── */
        presets.addEventListener('click', e => {
            const b = e.target.closest('[data-preset]');
            if (!b) return;
            const p = b.dataset.preset, range = presetRange(p);
            draftPreset = p; draftStart = range[0]; draftEnd = range[1];
            if (draftStart) cursor = firstOfMonth(draftStart);
            monthPick = null; render();
            presets.classList.remove('is-open');            // มือถือ: เลือกแล้วปิด dropdown กลับ
            if (presetsBtn) presetsBtn.setAttribute('aria-expanded', 'false');
        });

        /* ── มือถือ: ปุ่ม "ช่วงเวลา" เปิด/ปิด dropdown ลอย (position:absolute, ไม่ดัน layout) ── */
        if (presetsBtn) {
            presetsBtn.addEventListener('click', e => {
                e.stopPropagation();
                const open = presets.classList.toggle('is-open');
                presetsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        }

        /* ── nav ── */
        prevBtn.addEventListener('click', () => { cursor = addMonths(cursor, -1); monthPick = null; render(); });
        nextBtn.addEventListener('click', () => { cursor = addMonths(cursor,  1); monthPick = null; render(); });

        /* ── top inputs (พิมพ์แก้) ── */
        function applyTopInput(which) {
            const el = which === 'start' ? startInEl : endInEl;
            const d = parseInput(el.value);
            if (!d) { syncTopInputs(); return; }   // parse ไม่ได้ → revert
            draftPreset = '';
            if (which === 'start') { draftStart = d; if (draftEnd && draftEnd < d) draftEnd = null; }
            else if (draftStart && d < draftStart) { draftEnd = draftStart; draftStart = d; }
            else { draftEnd = d; }
            if (draftStart) cursor = firstOfMonth(draftStart);
            render();
        }
        startInEl.addEventListener('change', () => applyTopInput('start'));
        endInEl.addEventListener('change', () => applyTopInput('end'));
        [startInEl, endInEl].forEach(el => el.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
        }));

        /* ── close / apply — ปุ่ม "ปิด" (เดิม "ยกเลิก" แต่ทำแค่ล้าง draft ไม่ได้ปิดจริง) แค่หุบ popover เฉยๆ
           (2026-07-22) ── */
        clearBtn.addEventListener('click', () => close());
        function commit() {
            if (draftStart && !draftEnd) draftEnd = draftStart;
            appliedStart = draftStart; appliedEnd = draftEnd; appliedPreset = draftPreset;
            startIn.value = appliedStart ? toISO(appliedStart) : '';
            endIn.value   = appliedEnd   ? toISO(appliedEnd)   : '';
            syncTrigger(); close();
            root.dispatchEvent(new CustomEvent('bb-daterange:change', {
                bubbles: true, detail: { preset: appliedPreset, start: startIn.value, end: endIn.value }
            }));
        }
        applyBtn.addEventListener('click', commit);

        /* ── ตำแหน่ง popover (desktop) — portal ไป document.body ตอนเปิด (escape overflow ของ
           ancestor เช่น toolbar scroll แนวนอน) → ต้องคำนวณ top/left/right เองจาก getBoundingClientRect
           มือถือปล่อยให้ CSS media query คุมเต็ม (position:fixed คงที่อยู่แล้วไม่ต้องอิง trigger) ── */
        function place() {
            if (isMobile()) { pop.style.position = ''; pop.style.top = ''; pop.style.left = ''; pop.style.right = ''; return; }
            const r = btn.getBoundingClientRect();
            pop.style.position = 'fixed';
            pop.style.top = `${r.bottom + 6}px`;
            if (isRight) { pop.style.left = 'auto'; pop.style.right = `${window.innerWidth - r.right}px`; }
            else { pop.style.left = `${r.left}px`; pop.style.right = 'auto'; }
        }

        /* ── กัน popover ล้นจอ (desktop) ── */
        function clampToViewport() {
            pop.style.transform = '';
            if (isMobile()) return;
            const r = pop.getBoundingClientRect();
            const vw = window.innerWidth;
            let shift = 0;
            if (r.right > vw - 8) shift = r.right - (vw - 8);
            else if (r.left < 8) shift = r.left - 8;
            if (shift) pop.style.transform = `translateX(${-shift}px)`;
        }

        /* ── open / close ── */
        function open() {
            draftStart = appliedStart; draftEnd = appliedEnd; draftPreset = appliedPreset;
            cursor = firstOfMonth(appliedStart || new Date()); monthPick = null;
            render();
            document.body.appendChild(pop);      // portal
            pop.hidden = false; root.classList.add('is-open');
            btn.setAttribute('aria-expanded', 'true'); openInstances.add(inst);
            place();
            window.addEventListener('scroll', place, true);
            window.addEventListener('resize', place);
            requestAnimationFrame(clampToViewport);
            // popover mutual-exclusion ร่วมกับ combo/ue_chip_dd (bb-components.js) ผ่าน window เพราะคนละไฟล์
            if (window.__bbActivePopoverClose && window.__bbActivePopoverClose !== cancel) window.__bbActivePopoverClose();
            window.__bbActivePopoverClose = cancel;
        }
        function close() {
            pop.hidden = true; root.classList.remove('is-open');
            presets.classList.remove('is-open');
            if (presetsBtn) presetsBtn.setAttribute('aria-expanded', 'false');
            btn.setAttribute('aria-expanded', 'false'); openInstances.delete(inst);
            root.appendChild(pop);               // ย้ายกลับเข้า root
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
            if (window.__bbActivePopoverClose === cancel) window.__bbActivePopoverClose = null;
        }
        function cancel() { draftStart = appliedStart; draftEnd = appliedEnd; draftPreset = appliedPreset; close(); }
        const inst = { root, pop, cancel };

        btn.addEventListener('click', e => { e.stopPropagation(); if (pop.hidden) open(); else cancel(); });
        pop.addEventListener('click', e => {
            e.stopPropagation();
            // dropdown "ช่วงเวลา" (มือถือ) — คลิกที่อื่นในป็อปอัพ (ปฏิทิน/inputs) ก็ปิดกลับ เหมือน dropdown จริง
            if (presets.classList.contains('is-open') && !e.target.closest('.bb-dr-presets-wrap')) {
                presets.classList.remove('is-open');
                if (presetsBtn) presetsBtn.setAttribute('aria-expanded', 'false');
            }
        });
        mqMobile.addEventListener('change', () => { if (!pop.hidden) clampToViewport(); });
        window.addEventListener('resize', () => { if (!pop.hidden) clampToViewport(); });

        syncTrigger();
    }

    function init(scope) {
        (scope || document).querySelectorAll('[data-bb-daterange]').forEach(enhance);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
    else init();
    window.BBDateRange = { init, enhance };
})();
