/* ══════════════════════════════════════════════════
   core/js/bb-components.js — .bb-* interactive components
   ──────────────────────────────────────────────────
   auto-init markup จาก macro _components/bb/*.html:
     [data-bb-weekstrip]  แถบสัปดาห์          → event 'bb-weekstrip:change'  {date}
     [data-bb-datepicker] ปฏิทินวันเดียว       → event 'bb-datepicker:change' {date}
     [data-bb-timepicker] เวลาแบบ column       → event 'bb-timepicker:change' {value}
     [data-bb-timerange]  ช่วงเวลา เริ่ม→สิ้นสุด → event 'bb-timerange:change'  {start,end}
     [data-bb-combo]      dropdown ค้นหาได้     → event 'bb-combo:change'      {value,label}
     [data-bb-upload]     dropzone อัปโหลด      → event 'bb-upload:change'     {files}
   + window.bbToast({type,title,msg,duration})  in-app notification
   + [data-bb-dismiss]    ปิด callout
   + [data-bb-toast-flashes]  bridge flash → toast ตอนโหลด

   generic reusable — ไม่ผูก business logic · เซ็ต hidden input ให้ หน้า hook event เอง
══════════════════════════════════════════════════ */
(function () {
    'use strict';

    const TH_DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    const pad2  = n => String(n).padStart(2, '0');
    const toISO = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const fmtTH = d => `${d.getDate()} ${TH_MON[d.getMonth()]} ${d.getFullYear() + 543}`;
    const sameDay = (a, b) => a && b && a.toDateString() === b.toDateString();
    const stop = e => e.stopPropagation();
    const icons = () => { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); };

    /* ── Popover mutual-exclusion (cross-widget · cross-file — bb-daterange.js เป็นไฟล์แยกเรียกผ่าน window เอง)
       เปิด popover ตัวใหม่ → ปิดตัวที่เปิดค้างอยู่ก่อนเสมอ (combo/ue_chip_dd/filter/daterange) */
    function bbOpenPopover(closeFn) {
        if (window.__bbActivePopoverClose && window.__bbActivePopoverClose !== closeFn) window.__bbActivePopoverClose();
        window.__bbActivePopoverClose = closeFn;
    }
    function bbClosePopover(closeFn) {
        if (window.__bbActivePopoverClose === closeFn) window.__bbActivePopoverClose = null;
    }

    /* ── กัน popover ล้นขอบจอแนวนอน (ทุกขนาดจอ) — เหมือน clampToViewport ของ bb-daterange.js
       ใช้กับ popover ที่ position:fixed จาก getBoundingClientRect (ue_chip_dd, combo) ── */
    function bbClampPopoverX(pop) {
        pop.style.transform = '';
        const r = pop.getBoundingClientRect();
        const vw = window.innerWidth;
        let shift = 0;
        if (r.right > vw - 8) shift = r.right - (vw - 8);
        else if (r.left < 8) shift = r.left - 8;
        if (shift) pop.style.transform = `translateX(${-shift}px)`;
    }

    function parseISO(v) {
        if (!v) return null;
        const [y, m, d] = String(v).split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return isNaN(dt.getTime()) ? null : dt;
    }
    /* 'DD/MM/YYYY' (พ.ศ. หรือ ค.ศ.) → Date | null */
    function parseInput(v) {
        const m = String(v).trim().match(/^(\d{1,2})\D+(\d{1,2})\D+(\d{2,4})$/);
        if (!m) return null;
        let dd = +m[1], mm = +m[2], yy = +m[3];
        if (yy > 2400) yy -= 543; else if (yy < 100) yy += 2000;
        const dt = new Date(yy, mm - 1, dd);
        return (dt.getMonth() === mm - 1 && dt.getDate() === dd) ? dt : null;
    }
    const fmtInput = d => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear() + 543}`;
    const today0 = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
    const once = (el, flag) => { if (el.dataset[flag]) return false; el.dataset[flag] = '1'; return true; };

    /* ────────────────────────────── WEEK STRIP */
    function initWeekStrip(root) {
        if (!once(root, 'bbWsInit')) return;
        const strip = root.querySelector('[data-bb-ws-strip]');
        const input = root.querySelector('[data-bb-ws-input]');
        let counts = {};
        try { counts = JSON.parse(root.dataset.counts || '{}'); } catch (e) { counts = {}; }
        const td = today0();
        let sel = parseISO(root.dataset.value) || new Date(td);

        function render() {
            const start = new Date(sel); start.setDate(start.getDate() - start.getDay());
            let h = '';
            for (let i = 0; i < 7; i++) {
                const d = new Date(start); d.setDate(start.getDate() + i);
                const on = sameDay(d, sel), isTd = sameDay(d, td), c = counts[toISO(d)] || 0;
                const ind = c === 0 ? '' : c === 1 ? '<span class="bb-ws-ind-dot"></span>' : c <= 5 ? '<span class="bb-ws-ind-bar is-wr"></span>' : '<span class="bb-ws-ind-bar is-dg"></span>';
                const dnum = on ? `<div class="bb-ws-dnum-active bb-num">${d.getDate()}</div>` : `<div class="bb-ws-dnum bb-num">${d.getDate()}</div>`;
                const wd = i === 0 ? ' is-sun' : i === 6 ? ' is-sat' : '';
                h += `<div class="bb-ws-day${wd}${on ? ' is-on' : ''}${isTd && !on ? ' is-today' : ''}" data-iso="${toISO(d)}">` +
                     `<div class="bb-ws-dow">${TH_DOW[i]}</div>` +
                     `<div class="bb-ws-dnum-wrap">${dnum}</div>` +
                     `<div class="bb-ws-ind">${ind}</div></div>`;
            }
            strip.innerHTML = h;
        }
        function pick(d) {
            sel = d; if (input) input.value = toISO(d); render();
            root.dispatchEvent(new CustomEvent('bb-weekstrip:change', { detail: { date: toISO(d) }, bubbles: true }));
        }
        strip.addEventListener('click', e => { const el = e.target.closest('[data-iso]'); if (el) pick(parseISO(el.dataset.iso)); });
        root.querySelector('[data-bb-ws-prev]').addEventListener('click', () => { sel.setDate(sel.getDate() - 7); pick(new Date(sel)); });
        root.querySelector('[data-bb-ws-next]').addEventListener('click', () => { sel.setDate(sel.getDate() + 7); pick(new Date(sel)); });
        render();
    }

    /* ────────────────────────────── DATE PICKER (single) */
    function initDatePicker(root) {
        if (!once(root, 'bbDpInit')) return;
        const btn = root.querySelector('[data-bb-dp-btn]');
        const label = root.querySelector('[data-bb-dp-label]');
        const input = root.querySelector('[data-bb-dp-input]');
        const pop = root.querySelector('[data-bb-dp-pop]');
        const text = root.querySelector('[data-bb-dp-text]');
        const monthEl = root.querySelector('[data-bb-dp-month]');
        const grid = root.querySelector('[data-bb-dp-grid]');
        const ph = root.dataset.placeholder || 'เลือกวันที่';
        const isRight = root.classList.contains('is-align-right');
        let pick = parseISO(root.dataset.value);
        let draft = pick, view = pick || today0();

        /* popover เป็น position:fixed (inline style, ไม่แตะ .bb-datepicker class กลาง —
           class เดิม position:absolute ยัง reuse อยู่ที่ vehicle_budget.html custom datepicker)
           คำนวณจาก getBoundingClientRect ของปุ่ม เพื่อ escape overflow:hidden ของ ancestor เช่น .bb-card */
        function place() {
            const r = btn.getBoundingClientRect();
            pop.style.position = 'fixed';
            pop.style.top = `${r.bottom + 6}px`;
            if (isRight) { pop.style.left = 'auto'; pop.style.right = `${window.innerWidth - r.right}px`; }
            else { pop.style.left = `${r.left}px`; pop.style.right = 'auto'; }
        }

        function renderGrid() {
            monthEl.textContent = `${TH_MON[view.getMonth()]} ${view.getFullYear() + 543}`;
            const first = new Date(view.getFullYear(), view.getMonth(), 1);
            const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
            let h = TH_DOW.map(d => `<div class="bb-cal-dow">${d}</div>`).join('');
            for (let e = 0; e < first.getDay(); e++) h += '<button class="bb-cal-day is-empty"></button>';
            for (let n = 1; n <= days; n++) {
                const cur = new Date(view.getFullYear(), view.getMonth(), n);
                const td = sameDay(cur, today0()), on = sameDay(cur, draft);
                h += `<button type="button" class="bb-cal-day${td ? ' is-today' : ''}${on ? ' is-selected' : ''}" data-n="${n}">${n}</button>`;
            }
            grid.innerHTML = h;
        }
        function open() {
            pop.hidden = false; btn.classList.add('is-active'); btn.setAttribute('aria-expanded', 'true');
            draft = pick; if (draft) view = new Date(draft);
            text.value = draft ? fmtInput(draft) : '';
            renderGrid(); icons(); place();
            window.addEventListener('scroll', place, true);
            window.addEventListener('resize', place);
        }
        function close() {
            pop.hidden = true; btn.classList.remove('is-active'); btn.setAttribute('aria-expanded', 'false');
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
        }
        function commit() {
            pick = draft;
            if (pick) { label.textContent = fmtTH(pick); label.classList.remove('is-ph'); input.value = toISO(pick); }
            else { label.textContent = ph; label.classList.add('is-ph'); input.value = ''; }
            root.dispatchEvent(new CustomEvent('bb-datepicker:change', { detail: { date: input.value }, bubbles: true }));
            close();
        }
        btn.addEventListener('click', e => { stop(e); pop.hidden ? open() : close(); });
        pop.addEventListener('click', stop);
        grid.addEventListener('click', e => {
            const b = e.target.closest('[data-n]'); if (!b || b.classList.contains('is-empty')) return;
            draft = new Date(view.getFullYear(), view.getMonth(), +b.dataset.n); text.value = fmtInput(draft); renderGrid();
        });
        text.addEventListener('input', () => { const d = parseInput(text.value); if (d) { draft = d; view = new Date(d); renderGrid(); } });
        root.querySelector('[data-bb-dp-prev]').addEventListener('click', e => { stop(e); view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderGrid(); });
        root.querySelector('[data-bb-dp-next]').addEventListener('click', e => { stop(e); view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderGrid(); });
        root.querySelector('[data-bb-dp-clear]').addEventListener('click', e => { stop(e); draft = null; commit(); });
        root.querySelector('[data-bb-dp-apply]').addEventListener('click', e => { stop(e); commit(); });
        document.addEventListener('click', e => { if (!pop.hidden && !root.contains(e.target)) close(); });
    }

    /* ────────────────────────────── TIME (column) — shared unit */
    const parseHM = v => { const m = String(v || '').match(/^(\d{1,2}):(\d{1,2})$/); return m ? { h: +m[1] % 24, m: +m[2] % 60 } : { h: 9, m: 0 }; };
    const fmtHM = s => `${pad2(s.h)}:${pad2(s.m)}`;
    const hmMins = s => s.h * 60 + s.m;

    function setupTimeUnit(unit, opts) {
        const btn = unit.querySelector('[data-bb-tp-btn]');
        const label = unit.querySelector('[data-bb-tp-label]');
        const input = unit.querySelector('[data-bb-tp-input]');
        const pop = unit.querySelector('[data-bb-tp-pop]');
        const hBody = unit.querySelector('[data-bb-tp-h]');
        const mBody = unit.querySelector('[data-bb-tp-m]');
        const state = parseHM(input ? input.value : unit.dataset.value);

        function scrollOn(body) { const o = body.querySelector('.is-on'); if (o) body.scrollTop = o.offsetTop - body.clientHeight / 2 + o.offsetHeight / 2; }
        function render() {
            const step = opts.getStep(), min = opts.getMin ? opts.getMin() : null;
            let hh = '';
            for (let i = 0; i < 24; i++) { const off = min && i < min.h; hh += `<div class="bb-tp-opt${i === state.h ? ' is-on' : ''}${off ? ' is-off' : ''}" data-h="${i}">${pad2(i)}</div>`; }
            hBody.innerHTML = hh;
            let mm = '';
            for (let m = 0; m < 60; m += step) { const off = min && (state.h < min.h || (state.h === min.h && m < min.m)); mm += `<div class="bb-tp-opt${m === state.m ? ' is-on' : ''}${off ? ' is-off' : ''}" data-m="${m}">${pad2(m)}</div>`; }
            mBody.innerHTML = mm;
            scrollOn(hBody); scrollOn(mBody);
        }
        function commit() {
            label.textContent = fmtHM(state); if (input) input.value = fmtHM(state);
            if (opts.onChange) opts.onChange(state);
        }
        function open() { pop.hidden = false; btn.classList.add('is-active'); render(); }
        function close() { pop.hidden = true; btn.classList.remove('is-active'); }
        btn.addEventListener('click', e => { stop(e); if (opts.onOpen) opts.onOpen(); pop.hidden ? open() : close(); });
        pop.addEventListener('click', stop);
        hBody.addEventListener('click', e => { const o = e.target.closest('[data-h]'); if (!o || o.classList.contains('is-off')) return; state.h = +o.dataset.h; commit(); render(); });
        mBody.addEventListener('click', e => { const o = e.target.closest('[data-m]'); if (!o || o.classList.contains('is-off')) return; state.m = +o.dataset.m; commit(); render(); if (opts.onMinutePick) opts.onMinutePick(); else close(); });
        document.addEventListener('click', e => { if (!pop.hidden && !unit.contains(e.target)) close(); });
        return { state, open, close, render, commit, btn };
    }

    function initTimePicker(root) {
        if (!once(root, 'bbTpInit')) return;
        const step = +(root.dataset.step || 1);
        const u = setupTimeUnit(root, {
            getStep: () => step,
            onMinutePick: () => { u.close(); root.dispatchEvent(new CustomEvent('bb-timepicker:change', { detail: { value: fmtHM(u.state) }, bubbles: true })); }
        });
    }

    function initTimeRange(root) {
        if (!once(root, 'bbTrInit')) return;
        const step = +(root.dataset.step || 15);
        const warnM = (() => { const m = String(root.dataset.warn || '').match(/^(\d{1,2}):(\d{1,2})$/); return m ? (+m[1] * 60 + +m[2]) : null; })();
        const startUnit = root.querySelector('[data-bb-tr-unit="start"]');
        const endUnit = root.querySelector('[data-bb-tr-unit="end"]');
        let start, end;
        const applyWarn = (u) => { if (warnM == null) return; u.btn.classList.toggle('is-warn', hmMins(u.state) < warnM); };
        const fire = () => root.dispatchEvent(new CustomEvent('bb-timerange:change', { detail: { start: fmtHM(start.state), end: fmtHM(end.state) }, bubbles: true }));

        start = setupTimeUnit(startUnit, {
            getStep: () => step,
            onChange: () => { applyWarn(start); if (hmMins(end.state) < hmMins(start.state)) { end.state.h = start.state.h; end.state.m = start.state.m; end.commit(); } fire(); },
            onMinutePick: () => { start.close(); end.open(); }
        });
        end = setupTimeUnit(endUnit, {
            getStep: () => step,
            getMin: () => start.state,
            onChange: () => { applyWarn(end); fire(); },
            onMinutePick: () => { end.close(); fire(); }
        });
        applyWarn(start); applyWarn(end);
    }

    /* ────────────────────────────── COMBO (searchable dropdown) */
    function initCombo(root) {
        if (!once(root, 'bbComboInit')) return;
        const btn = root.querySelector('[data-bb-combo-btn]');
        const label = root.querySelector('[data-bb-combo-label]');
        const input = root.querySelector('[data-bb-combo-input]');
        const pop = root.querySelector('[data-bb-combo-pop]');
        const search = root.querySelector('[data-bb-combo-search]');
        const list = root.querySelector('[data-bb-combo-list]');
        const emptyEl = root.querySelector('[data-bb-combo-empty]');

        function filter() {
            const q = search.value.trim().toLowerCase(); let shown = 0;
            list.querySelectorAll('.bb-combo-opt').forEach(o => {
                const hit = (o.dataset.label || '').toLowerCase().includes(q);
                o.hidden = !hit; if (hit) shown++;
            });
            if (emptyEl) emptyEl.hidden = shown > 0;
        }
        const isRight = root.classList.contains('is-align-right');
        /* portal ไป document.body ตอนเปิด (escape overflow:auto ของ ancestor เช่น toolbar scroll) —
           เหมือน ue_chip_dd (ue_chip.html) · คำนวณตำแหน่ง/ความกว้างจาก getBoundingClientRect ของ btn */
        function place() {
            const r = btn.getBoundingClientRect();
            pop.style.position = 'fixed';
            pop.style.top = `${r.bottom + 6}px`;
            pop.style.minWidth = `${Math.max(r.width, 208)}px`;   // 208px = floor เดิม (13rem)
            if (isRight) { pop.style.left = 'auto'; pop.style.right = `${window.innerWidth - r.right}px`; }
            else { pop.style.left = `${r.left}px`; pop.style.right = 'auto'; }
        }
        function open() {
            document.body.appendChild(pop);
            pop.hidden = false; btn.classList.add('is-active'); btn.setAttribute('aria-expanded', 'true');
            search.value = ''; filter(); search.focus();
            place();
            requestAnimationFrame(() => bbClampPopoverX(pop));
            window.addEventListener('scroll', place, true);
            window.addEventListener('resize', place);
            bbOpenPopover(close);
        }
        function close() {
            pop.hidden = true; btn.classList.remove('is-active'); btn.setAttribute('aria-expanded', 'false');
            root.appendChild(pop);
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
            bbClosePopover(close);
        }
        function choose(o) {
            input.value = o.dataset.value;
            label.textContent = o.dataset.label; label.classList.remove('is-ph');
            list.querySelectorAll('.bb-combo-opt').forEach(x => { x.classList.remove('is-on'); const c = x.querySelector('[data-lucide="check"]'); if (c) c.remove(); });
            o.classList.add('is-on'); const ic = document.createElement('i'); ic.setAttribute('data-lucide', 'check'); o.appendChild(ic); icons();
            root.dispatchEvent(new CustomEvent('bb-combo:change', { detail: { value: o.dataset.value, label: o.dataset.label }, bubbles: true }));
            close();
        }
        btn.addEventListener('click', e => { stop(e); pop.hidden ? open() : close(); });
        pop.addEventListener('click', stop);
        search.addEventListener('input', filter);
        list.addEventListener('click', e => { const o = e.target.closest('.bb-combo-opt'); if (o) choose(o); });
        document.addEventListener('click', e => { if (!pop.hidden && !root.contains(e.target) && !pop.contains(e.target)) close(); });
    }

    /* ────────────────────────────── UPLOAD (dropzone) */
    const FILE_IC = ext => /(png|jpe?g|gif|webp|svg)$/i.test(ext) ? 'image' : /pdf$/i.test(ext) ? 'file-text' : 'file';
    function humanSize(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(0) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
    function initUpload(root) {
        if (!once(root, 'bbUpInit')) return;
        const zone = root.querySelector('[data-bb-upload-zone]');
        const input = root.querySelector('[data-bb-upload-input]');
        const listEl = root.querySelector('[data-bb-upload-list]');
        const multiple = input.multiple;
        const dt = new DataTransfer();

        function sync() { input.files = dt.files; render(); root.dispatchEvent(new CustomEvent('bb-upload:change', { detail: { files: dt.files }, bubbles: true })); }
        function render() {
            let h = '';
            [...dt.files].forEach((f, i) => {
                const ext = (f.name.split('.').pop() || '');
                h += `<div class="bb-upload-file"><i data-lucide="${FILE_IC(ext)}" class="bb-upload-ftype"></i>` +
                     `<span class="bb-upload-fname">${f.name}</span><span class="bb-upload-fsize bb-num">${humanSize(f.size)}</span>` +
                     `<button type="button" class="bb-upload-fx" data-rm="${i}" aria-label="ลบ"><i data-lucide="x"></i></button></div>`;
            });
            listEl.innerHTML = h; icons();
        }
        function addFiles(files) {
            if (!multiple) while (dt.items.length) dt.items.remove(0);
            [...files].forEach(f => dt.items.add(f));
            if (!multiple && dt.files.length > 1) while (dt.items.length > 1) dt.items.remove(0);
            sync();
        }
        input.addEventListener('change', () => addFiles(input.files));
        listEl.addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (!b) return; e.preventDefault(); dt.items.remove(+b.dataset.rm); sync(); });
        ['dragover', 'dragenter'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); root.classList.add('is-drag'); }));
        ['dragleave', 'dragend'].forEach(ev => zone.addEventListener(ev, () => root.classList.remove('is-drag')));
        zone.addEventListener('drop', e => { e.preventDefault(); root.classList.remove('is-drag'); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
    }

    /* ────────────────────────────── SEARCH (collapse ↔ expand, sync จาก mockup-orders.html 2026-07-07) */
    function initSearch(root) {
        if (!once(root, 'bbSearchInit')) return;
        const input = root.querySelector('input');
        const clearBtn = root.querySelector('[data-bb-search-clear]');
        if (!input) return;
        const setExpanded = v => root.classList.toggle('is-expanded', v);
        const setHasText = v => root.classList.toggle('has-text', v);
        root.addEventListener('click', () => { if (!root.classList.contains('is-expanded')) { setExpanded(true); input.focus(); } });
        input.addEventListener('focus', () => setExpanded(true));
        input.addEventListener('input', () => setHasText(!!input.value));
        input.addEventListener('blur', () => { if (!input.value) setExpanded(false); });
        if (clearBtn) clearBtn.addEventListener('click', e => {
            stop(e);
            input.value = '';
            setHasText(false);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.focus();
        });
        setHasText(!!input.value);
        if (input.value) setExpanded(true);
    }

    /* ────────────────────────────── FILTER BUTTON (live · ไม่มี apply) */
    function initFilter(root) {
        if (!once(root, 'bbFilterInit')) return;
        const btn = root.querySelector('[data-bb-filter-btn]');
        const pop = root.querySelector('[data-bb-filter-pop]');
        const body = root.querySelector('[data-bb-filter-body]');
        if (!btn || !pop || !body) return;

        function snap() {
            const st = {};
            body.querySelectorAll('[data-filter-group]').forEach(g => {
                const on = [...g.querySelectorAll('[data-value]')].filter(b => b.classList.contains('is-on')).map(b => b.dataset.value);
                st[g.dataset.filterGroup] = ('multi' in g.dataset) ? on.slice().sort() : (on[0] || '');
            });
            body.querySelectorAll('[name]').forEach(el => { st[el.name] = (el.type === 'checkbox') ? el.checked : el.value; });
            return st;
        }
        const initial = JSON.stringify(snap());
        function recompute() {
            const st = snap(), init = JSON.parse(initial); let n = 0;
            Object.keys(st).forEach(k => { if (JSON.stringify(st[k]) !== JSON.stringify(init[k])) n++; });
            root.classList.toggle('is-active', n > 0);
            root.dispatchEvent(new CustomEvent('bb-filter:change', { detail: st, bubbles: true }));
        }
        btn.addEventListener('click', e => { stop(e); pop.hidden = !pop.hidden; btn.setAttribute('aria-expanded', pop.hidden ? 'false' : 'true'); });
        pop.addEventListener('click', stop);
        body.addEventListener('click', e => {
            const opt = e.target.closest('[data-value]'); if (!opt) return;
            const grp = opt.closest('[data-filter-group]'); if (!grp) return;
            if ('multi' in grp.dataset) opt.classList.toggle('is-on');
            else { grp.querySelectorAll('[data-value]').forEach(x => x.classList.remove('is-on')); opt.classList.add('is-on'); }
            recompute();
        });
        body.addEventListener('change', e => { if (e.target.matches('[name]')) recompute(); });
        const clear = root.querySelector('[data-bb-filter-clear]');
        if (clear) clear.addEventListener('click', e => {
            stop(e);
            const init = JSON.parse(initial);
            body.querySelectorAll('[data-filter-group]').forEach(g => {
                const def = init[g.dataset.filterGroup], multi = 'multi' in g.dataset;
                g.querySelectorAll('[data-value]').forEach(b => b.classList.toggle('is-on', multi ? def.indexOf(b.dataset.value) > -1 : b.dataset.value === def));
            });
            body.querySelectorAll('[name]').forEach(el => { if (el.type === 'checkbox') el.checked = init[el.name]; else el.value = init[el.name]; });
            recompute();
        });
        document.addEventListener('click', e => { if (!pop.hidden && !root.contains(e.target)) { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
    }

    /* ────────────────────────────── RANGE SLIDER (single | dual) */
    function initSlider(root) {
        if (!once(root, 'bbSlInit')) return;
        const min = +root.dataset.min, max = +root.dataset.max, step = +root.dataset.step || 1, unit = root.dataset.unit || '';
        const dual = 'dual' in root.dataset;
        const rail = root.querySelector('[data-bb-slider-rail]');
        const fill = root.querySelector('[data-bb-slider-fill]');
        const thumbs = [...root.querySelectorAll('[data-bb-slider-thumb]')];
        const bubbles = thumbs.map(t => t.querySelector('[data-bb-slider-bubble]'));
        const inputs = [...root.querySelectorAll('[data-bb-slider-input]')];
        const snap = v => { v = Math.round((v - min) / step) * step + min; return Math.min(max, Math.max(min, v)); };
        const pct = v => (v - min) / (max - min) * 100;
        // getAttribute (ไม่ใช่ .value) — กัน browser restore ค่า input เดิมทับตอน manual reload
        const vals = inputs.map(i => snap(parseFloat(i.getAttribute('value')) || min));

        function render() {
            thumbs.forEach((t, i) => {
                t.style.left = pct(vals[i]) + '%';
                t.setAttribute('aria-valuemin', min); t.setAttribute('aria-valuemax', max); t.setAttribute('aria-valuenow', vals[i]);
                bubbles[i].textContent = vals[i] + (unit ? (' ' + unit) : '');
                if (inputs[i]) inputs[i].value = vals[i];
            });
            if (dual) { fill.style.left = pct(vals[0]) + '%'; fill.style.width = (pct(vals[1]) - pct(vals[0])) + '%'; }
            else { fill.style.left = '0%'; fill.style.width = pct(vals[0]) + '%'; }
        }
        function setVal(i, v, fire) {
            v = snap(v);
            if (dual) { if (i === 0) v = Math.min(v, vals[1]); if (i === 1) v = Math.max(v, vals[0]); }
            vals[i] = v; render();
            if (fire !== false) root.dispatchEvent(new CustomEvent('bb-slider:change', { detail: dual ? { min: vals[0], max: vals[1] } : { value: vals[0] }, bubbles: true }));
        }
        function valFromX(clientX) { const r = rail.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width)); return min + p * (max - min); }
        const nearest = v => (!dual ? 0 : (Math.abs(v - vals[0]) <= Math.abs(v - vals[1]) ? 0 : 1));

        thumbs.forEach((t, i) => {
            t.addEventListener('pointerdown', e => {
                e.preventDefault(); t.setPointerCapture(e.pointerId); t.classList.add('is-active'); t.focus();
                const move = ev => setVal(i, valFromX(ev.clientX));
                const up = () => { t.classList.remove('is-active'); t.removeEventListener('pointermove', move); t.removeEventListener('pointerup', up); };
                t.addEventListener('pointermove', move); t.addEventListener('pointerup', up);
            });
            t.addEventListener('keydown', e => {
                let d = 0;
                if (e.key === 'ArrowRight' || e.key === 'ArrowUp') d = step;
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') d = -step;
                else if (e.key === 'PageUp') d = step * 10;
                else if (e.key === 'PageDown') d = -step * 10;
                else if (e.key === 'Home') { e.preventDefault(); return setVal(i, min); }
                else if (e.key === 'End') { e.preventDefault(); return setVal(i, max); }
                else return;
                e.preventDefault(); setVal(i, vals[i] + d);
            });
        });
        rail.addEventListener('pointerdown', e => {
            if (e.target.closest('[data-bb-slider-thumb]')) return;
            const v = valFromX(e.clientX), i = nearest(v); setVal(i, v); thumbs[i].focus();
        });
        // reset → เต็มพิสัย (single=min · dual=[min,max]) · silent (render อย่างเดียว ไม่ยิง change)
        root.addEventListener('bb-slider:reset', () => { vals[0] = min; if (dual) vals[1] = max; render(); });
        render();
    }

    /* ────────────────────────────── SIDEBAR (collapsible group + drawer <1200) */
    function initSidebar(root) {
        if (!once(root, 'bbSbInit')) return;
        // collapsible groups
        root.querySelectorAll('[data-bb-sidebar-group]').forEach(g => {
            const t = g.querySelector('[data-bb-sidebar-toggle]');
            if (!t) return;
            t.addEventListener('click', () => {
                const open = g.classList.toggle('is-open');
                t.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        });
        // drawer (<1200) — overlay เป็น sibling ถัดจาก aside
        const overlay = root.nextElementSibling && root.nextElementSibling.matches('[data-bb-sidebar-overlay]')
            ? root.nextElementSibling : document.querySelector('[data-bb-sidebar-overlay]');
        function openDrawer() { root.classList.add('is-drawer-open'); if (overlay) overlay.classList.add('is-show'); document.body.classList.add('bb-drawer-lock'); }
        function closeDrawer() { root.classList.remove('is-drawer-open'); if (overlay) overlay.classList.remove('is-show'); document.body.classList.remove('bb-drawer-lock'); }
        root.__bbOpenDrawer = openDrawer;
        root.__bbCloseDrawer = closeDrawer;
        const closeBtn = root.querySelector('[data-bb-sidebar-close]');
        if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
        if (overlay) overlay.addEventListener('click', closeDrawer);
        // คลิก leaf link (ไม่ใช่ group toggle) ใน drawer → ปิด
        root.querySelectorAll('.bb-sidebar-link:not(.bb-sidebar-group-toggle), .bb-sidebar-logout').forEach(a => {
            a.addEventListener('click', () => { if (root.classList.contains('is-drawer-open')) closeDrawer(); });
        });
    }
    // open trigger (อยู่ใน topbar ของหน้า) + Esc — ผูกครั้งเดียวระดับ document
    document.addEventListener('click', e => {
        const t = e.target.closest('[data-bb-sidebar-open]'); if (!t) return;
        const sel = t.getAttribute('data-bb-sidebar-open');
        const sb = (sel && document.querySelector(sel)) || document.querySelector('[data-bb-sidebar]');
        if (sb && sb.__bbOpenDrawer) sb.__bbOpenDrawer();
    });
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        document.querySelectorAll('[data-bb-sidebar].is-drawer-open').forEach(sb => sb.__bbCloseDrawer && sb.__bbCloseDrawer());
    });

    /* ────────────────────────────── TOAST (in-app notification) */
    const TOAST_IC = { ok: 'check-circle', info: 'info', wr: 'alert-triangle', dg: 'alert-octagon' };
    function getRegion() {
        let r = document.querySelector('[data-bb-toast-region]');
        if (!r) { r = document.createElement('div'); r.className = 'bb-toast-region'; r.setAttribute('data-bb-toast-region', ''); document.body.appendChild(r); }
        return r;
    }
    window.bbToast = function (opts) {
        opts = opts || {};
        const type = TOAST_IC[opts.type] ? opts.type : 'info';
        const dur = opts.duration == null ? 5000 : +opts.duration;
        const el = document.createElement('div');
        el.className = 'bb-toast is-' + type;
        el.innerHTML = `<div class="bb-toast-row"><div class="bb-toast-ic"><i data-lucide="${TOAST_IC[type]}"></i></div>` +
            `<div class="bb-toast-body">${opts.title ? `<div class="bb-toast-title">${opts.title}</div>` : ''}` +
            `${opts.msg ? `<div class="bb-toast-msg">${opts.msg}</div>` : ''}</div>` +
            `<button type="button" class="bb-toast-x" aria-label="ปิด"><i data-lucide="x"></i></button></div>` +
            (dur > 0 ? '<div class="bb-toast-bar"></div>' : '');
        getRegion().prepend(el); icons();
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
        function kill() { el.style.transform = 'translateX(120%)'; el.style.opacity = '0'; setTimeout(() => el.remove(), 280); }
        el.querySelector('.bb-toast-x').addEventListener('click', kill);
        if (dur > 0) {
            const bar = el.querySelector('.bb-toast-bar');
            if (bar) { bar.style.transition = `width ${dur}ms linear`; requestAnimationFrame(() => { bar.style.width = '0%'; }); }
            setTimeout(kill, dur);
        }
        return el;
    };

    /* ────────────────────────────── CALENDAR (month + event chips) */
    const TH_MON_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                         'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const CAL_STATUS = { ok: 1, wr: 1, dg: 1, info: 1, neutral: 1 };
    function initCalendar(root) {
        if (!once(root, 'bbCalInit')) return;
        const body = root.querySelector('[data-bb-cal-body]');
        const monthEl = root.querySelector('[data-bb-cal-month]');
        const maxChips = +(root.dataset.max || 2);
        const bookUrl = root.dataset.bookUrl || '';
        let events = {};
        try { events = JSON.parse(root.querySelector('[data-bb-cal-events]').textContent) || {}; } catch (e) { /* empty */ }

        const t0 = today0(), todayISO = toISO(t0);
        const view = { y: t0.getFullYear(), m: t0.getMonth() };
        if (root.dataset.year) view.y = +root.dataset.year;
        if (root.dataset.month) view.m = +root.dataset.month - 1;
        let sel = todayISO;

        const dayKey = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
        const tmin = t => { const p = String(t || '').split(':'); return (+p[0] || 0) * 60 + (+p[1] || 0); };
        const st = e => (CAL_STATUS[e.status] ? e.status : 'neutral');
        const dayEvents = iso => (events[iso] || []).slice().sort((a, b) => tmin(a.time) - tmin(b.time));
        const fmtDay = iso => { const p = iso.split('-'); return `${+p[2]} ${TH_MON_FULL[+p[1] - 1]} ${+p[0] + 543}`; };

        const pop = document.createElement('div');
        pop.className = 'bb-mcal-pop'; pop.hidden = true; root.appendChild(pop);
        const closePop = () => { pop.hidden = true; };
        function openPop(iso, linkEl) {
            const evs = dayEvents(iso);
            let rows = evs.map((e, i) =>
                `<button type="button" class="bb-mcal-prow" data-idx="${i}">` +
                `<span class="bb-mcal-pdot is-${st(e)}"></span>` +
                `<span class="bb-mcal-ptime bb-num">${e.time || ''}</span>` +
                `<span class="bb-mcal-pdest">${e.title || ''}</span>` +
                `<i data-lucide="chevron-right" class="bb-mcal-pchev"></i></button>`).join('');
            pop.innerHTML =
                `<div class="bb-mcal-pop-hd"><span class="bb-mcal-pop-title">${fmtDay(iso)}</span>` +
                `<span class="bb-mcal-pop-count bb-num">${evs.length} งาน</span>` +
                `<button type="button" class="bb-mcal-pop-book" data-book><i data-lucide="plus"></i>จองรถ</button></div>` +
                `<div class="bb-mcal-pop-bd">${rows}</div>`;
            pop.dataset.iso = iso; pop.hidden = false; icons();
            const rr = root.getBoundingClientRect(), lr = linkEl.getBoundingClientRect();
            let left = lr.left - rr.left, w = pop.offsetWidth;
            if (left + w > root.clientWidth) left = root.clientWidth - w - 4;
            pop.style.left = Math.max(4, left) + 'px';
            pop.style.top = (lr.bottom - rr.top + 4) + 'px';
        }

        function render() {
            monthEl.textContent = `${TH_MON_FULL[view.m]} ${view.y + 543}`;
            const first = new Date(view.y, view.m, 1).getDay();
            const dim = new Date(view.y, view.m + 1, 0).getDate();
            const pdim = new Date(view.y, view.m, 0).getDate();
            let h = '';
            for (let i = 0; i < 42; i++) {
                let dn, mm = view.m, yy = view.y, out = false;
                if (i < first) { dn = pdim - first + 1 + i; mm--; out = true; }
                else if (i >= first + dim) { dn = i - first - dim + 1; mm++; out = true; }
                else dn = i - first + 1;
                if (mm < 0) { mm = 11; yy--; } if (mm > 11) { mm = 0; yy++; }
                const iso = dayKey(yy, mm, dn);
                const evs = out ? [] : dayEvents(iso);
                let inner = `<div class="bb-mcal-top"><span class="bb-mcal-dn">${dn}</span></div>`;
                if (!out) {
                    let ec = evs.slice(0, maxChips).map((e, i2) =>
                        `<div class="bb-mcal-ev is-${st(e)}" data-ev="${i2}"><span class="bb-mcal-ev-t bb-num">${e.time || ''}</span><span class="bb-mcal-ev-d">${e.title || ''}</span></div>`).join('');
                    if (evs.length > maxChips) ec += `<div class="bb-mcal-more" data-more="${iso}">+${evs.length - maxChips} รายการ</div>`;
                    inner += `<div class="bb-mcal-ec">${ec}</div>`;
                }
                const cls = 'bb-mcal-cell' + (out ? ' is-out' : '') + (iso === todayISO ? ' is-today' : '') + (iso === sel ? ' is-sel' : '');
                h += `<div class="${cls}"${out ? '' : ` data-day="${iso}"`}>${inner}</div>`;
            }
            body.innerHTML = h;
        }

        function goBook(iso) {
            if (bookUrl) { window.location.href = bookUrl + (bookUrl.indexOf('?') > -1 ? '&' : '?') + 'date=' + iso; }
            else root.dispatchEvent(new CustomEvent('bb-calendar:book', { detail: { date: iso }, bubbles: true }));
        }
        function pickEvent(iso, idx) {
            const it = dayEvents(iso)[idx];
            if (it && it.url) window.location.href = it.url;
            else root.dispatchEvent(new CustomEvent('bb-calendar:eventclick', { detail: { date: iso, index: idx }, bubbles: true }));
        }

        body.addEventListener('click', e => {
            const more = e.target.closest('[data-more]');
            if (more) { stop(e); openPop(more.dataset.more, more); return; }
            const cell = e.target.closest('[data-day]'); if (!cell) return;
            const iso = cell.dataset.day;
            const ev = e.target.closest('[data-ev]');
            if (ev) { stop(e); pickEvent(iso, +ev.dataset.ev); return; }
            sel = iso; closePop(); render();
            root.dispatchEvent(new CustomEvent('bb-calendar:daychange', { detail: { date: iso }, bubbles: true }));
        });
        pop.addEventListener('click', e => {
            const bk = e.target.closest('[data-book]'); if (bk) { stop(e); goBook(pop.dataset.iso); return; }
            const row = e.target.closest('[data-idx]'); if (row) { stop(e); pickEvent(pop.dataset.iso, +row.dataset.idx); }
        });
        root.querySelector('[data-bb-cal-prev]').addEventListener('click', () => { if (--view.m < 0) { view.m = 11; view.y--; } closePop(); render(); });
        root.querySelector('[data-bb-cal-next]').addEventListener('click', () => { if (++view.m > 11) { view.m = 0; view.y++; } closePop(); render(); });
        root.querySelector('[data-bb-cal-today]').addEventListener('click', () => { view.y = t0.getFullYear(); view.m = t0.getMonth(); sel = todayISO; closePop(); render(); });
        document.addEventListener('click', e => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('[data-more]')) closePop(); });
        render();
    }

    /* ────────────────────────────── UE CHIP (Uber-style filter chip) */
    function initUeChipToggle(el) {
        if (!once(el, 'ueChipTgInit')) return;
        const input = el.querySelector('input[type="hidden"]');
        el.addEventListener('click', function () {
            const on = !el.classList.contains('is-on');
            el.classList.toggle('is-on', on);
            el.setAttribute('aria-pressed', on ? 'true' : 'false');
            if (input) { input.value = on ? (el.dataset.value || 'on') : ''; input.dispatchEvent(new Event('change', { bubbles: true })); }
            el.dispatchEvent(new CustomEvent('ue-chip-toggle:change', { detail: { on: on, value: el.dataset.value || '' }, bubbles: true }));
        });
    }

    function initUeChipDd(root) {
        if (!once(root, 'ueChipDdInit')) return;
        const btn = root.querySelector('[data-ue-chip-btn]');
        const pop = root.querySelector('[data-ue-chip-pop]');
        const body = root.querySelector('[data-ue-chip-body]');
        const badge = root.querySelector('[data-ue-chip-badge]');
        if (!btn || !pop || !body) return;
        const isRight = root.classList.contains('is-align-right');
        const labelEl = btn.querySelector('.ue-chip-label');
        const origLabel = labelEl ? labelEl.textContent : '';

        function snap() {
            const st = {};
            body.querySelectorAll('[name]').forEach(function (el) {
                const key = el.name + '|' + (el.value || '');
                st[key] = (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value;
            });
            return st;
        }
        const initial = JSON.stringify(snap());
        function selectedCount() {
            let n = 0;
            body.querySelectorAll('input[type="checkbox"],input[type="radio"]').forEach(function (el) {
                if (el.checked && el.value) n++;
            });
            return n;
        }
        function recompute() {
            const changed = JSON.stringify(snap()) !== initial;
            root.classList.toggle('is-active', changed);
            if (body.querySelector('input[type="radio"]')) {
                // radio → เอา label ที่เลือกมาใส่ chip (ยกเว้น default = คืน label เดิม) · ไม่ใช้ badge
                const checked = body.querySelector('input[type="radio"]:checked');
                if (labelEl) {
                    const opt = checked && checked.closest('.ue-chip-opt');
                    const sp = opt && opt.querySelector('span');
                    labelEl.textContent = (changed && sp) ? sp.textContent : origLabel;
                }
                if (badge) badge.classList.remove('is-show');
            } else {
                // checkbox → badge นับ เฉพาะเมื่อเปลี่ยนจาก default
                const c = changed ? selectedCount() : 0;
                if (badge) { badge.textContent = c > 0 ? c : ''; badge.classList.toggle('is-show', c > 0); }
            }
            root.dispatchEvent(new CustomEvent('ue-chip:change', { detail: snap(), bubbles: true }));
        }
        function place() {
            const r = btn.getBoundingClientRect();
            pop.style.top = (r.bottom + 8) + 'px';
            if (isRight) { pop.style.left = 'auto'; pop.style.right = (window.innerWidth - r.right) + 'px'; }
            else { pop.style.left = r.left + 'px'; pop.style.right = 'auto'; }
        }
        function open() {
            document.body.appendChild(pop);          // portal → escape overflow/transform ancestor
            pop.hidden = false; root.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true');
            place();
            requestAnimationFrame(() => bbClampPopoverX(pop));
            window.addEventListener('scroll', place, true);
            window.addEventListener('resize', place);
            bbOpenPopover(close);
        }
        function close() {
            pop.hidden = true; root.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false');
            root.appendChild(pop);                   // move กลับเข้า root
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
            bbClosePopover(close);
        }
        btn.addEventListener('click', function (e) { stop(e); pop.hidden ? open() : close(); });
        pop.addEventListener('click', stop);         // คลิกใน panel = ไม่ปิด (live select)
        body.addEventListener('change', function (e) { if (e.target.matches('[name]')) recompute(); });
        const clr = root.querySelector('[data-ue-chip-clear]');
        if (clr) clr.addEventListener('click', function (e) {
            stop(e);
            const init = JSON.parse(initial);
            body.querySelectorAll('[name]').forEach(function (el) {
                const key = el.name + '|' + (el.value || '');
                if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!init[key];
                else el.value = init[key];
            });
            recompute();
        });
        document.addEventListener('click', function (e) {
            if (!pop.hidden && !root.contains(e.target) && !pop.contains(e.target)) close();
        });
        recompute();
    }

    /* ────────────────────────────── init */
    function init(scope) {
        const r = scope || document;
        r.querySelectorAll('[data-bb-weekstrip]').forEach(initWeekStrip);
        r.querySelectorAll('[data-bb-datepicker]').forEach(initDatePicker);
        r.querySelectorAll('[data-bb-timepicker]').forEach(initTimePicker);
        r.querySelectorAll('[data-bb-timerange]').forEach(initTimeRange);
        r.querySelectorAll('[data-bb-combo]').forEach(initCombo);
        r.querySelectorAll('[data-bb-search]').forEach(initSearch);
        r.querySelectorAll('[data-bb-upload]').forEach(initUpload);
        r.querySelectorAll('[data-bb-filter]').forEach(initFilter);
        r.querySelectorAll('[data-bb-slider]').forEach(initSlider);
        r.querySelectorAll('[data-bb-sidebar]').forEach(initSidebar);
        r.querySelectorAll('[data-bb-calendar]').forEach(initCalendar);
        r.querySelectorAll('[data-ue-chip-toggle]').forEach(initUeChipToggle);
        r.querySelectorAll('[data-ue-chip-dd]').forEach(initUeChipDd);
        // flash → toast bridge
        r.querySelectorAll('[data-bb-toast-flashes]').forEach(s => {
            if (!once(s, 'bbFlashed')) return;
            try { (JSON.parse(s.textContent) || []).forEach(t => window.bbToast(t)); } catch (e) { /* ignore */ }
        });
    }
    // callout dismiss (delegated)
    document.addEventListener('click', e => {
        const x = e.target.closest('[data-bb-dismiss]');
        if (x) { const c = x.closest('.bb-callout'); if (c) c.remove(); }
    });

    window.bbComponents = { init };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
