/* ══════════════════════════════════════════════════
   core/js/dropdown.js — reusable cmdk-style menus
   ──────────────────────────────────────────────────
   Two components, both progressive enhancement:

   1. dropdown        → <select data-dropdown>
        Non-searchable. Keeps the <select> as source of
        truth: writes .value + dispatches a 'change' event,
        so existing select-bound JS keeps working untouched.
        <optgroup> boundaries render as a divider line
        (group labels are ignored — no text headers).

   2. autocompleteinput → <input data-autocomplete list="…">
        Searchable. Reads <option>s from the linked <datalist>,
        filters as you type, fills the input on pick. Free text
        stays allowed (input is the submitted value).

   Keyboard: ↑/↓ move, Enter select, Esc/Tab close.
   No icons inside option rows.
   Loaded as a module AFTER page JS so initial .value is read
   after any page-side preset logic has run.
══════════════════════════════════════════════════ */

(function () {
    'use strict';

    const CHEVRON = '<svg class="vc-dd-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

    let uid = 0;
    const openInstances = new Set();

    /* close every open menu (e.g. outside click / Esc elsewhere) */
    function closeAll(except) {
        openInstances.forEach(inst => { if (inst !== except) inst.close(); });
    }

    document.addEventListener('click', e => {
        openInstances.forEach(inst => {
            // panel is portalled to <body>, so it is NOT inside root —
            // check both so clicks on the menu itself don't self-close.
            if (!inst.root.contains(e.target) && !inst.panel.contains(e.target)) {
                inst.close();
            }
        });
    });

    /* ── Floating panel: portal to <body> + fixed positioning ──
       Escapes every `overflow:hidden`/scroll/transform ancestor
       (cards, filter bars, table wrappers) so the menu is never
       clipped. Repositions on scroll/resize while open. */
    function makeFloating(panel, anchor) {
        const home = panel.parentNode;   // original parent (the .vc-dd/.vc-ac root)
        let onMove = null;

        function place() {
            const r = anchor.getBoundingClientRect();
            const vh = window.innerHeight;
            const gap = 4, edge = 8;
            panel.style.position = 'fixed';
            panel.style.left = r.left + 'px';
            panel.style.minWidth = r.width + 'px';
            // measure natural height with constraints reset
            panel.style.top = '0px';
            panel.style.maxHeight = '';
            const ph = panel.offsetHeight;
            const below = vh - r.bottom - edge;
            const above = r.top - edge;
            if (ph <= below || below >= above) {
                panel.style.top = (r.bottom + gap) + 'px';
                panel.style.maxHeight = Math.min(280, Math.max(80, below)) + 'px';
            } else {
                panel.style.maxHeight = Math.min(280, Math.max(80, above)) + 'px';
                panel.style.top = Math.max(edge, r.top - Math.min(ph, above) - gap) + 'px';
            }
        }

        return {
            show() {
                document.body.appendChild(panel);   // portal out of clipping ancestors
                panel.hidden = false;
                place();
                onMove = () => place();
                window.addEventListener('scroll', onMove, true);
                window.addEventListener('resize', onMove);
            },
            hide() {
                panel.hidden = true;
                if (onMove) {
                    window.removeEventListener('scroll', onMove, true);
                    window.removeEventListener('resize', onMove);
                    onMove = null;
                }
                home.appendChild(panel);            // return ownership to the root
                panel.style.position = panel.style.top = panel.style.left = '';
                panel.style.minWidth = panel.style.maxHeight = '';
            },
            reposition() { if (!panel.hidden) place(); }
        };
    }

    /* ════════════════════════════════════════════
       Component 1 — dropdown  (<select data-dropdown>)
    ════════════════════════════════════════════ */
    function enhanceDropdown(select) {
        if (select.dataset.ddReady) return;
        select.dataset.ddReady = '1';

        const id = 'vcdd-' + (++uid);

        const root = document.createElement('div');
        root.className = 'vc-dd';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'vc-dd-trigger';
        trigger.setAttribute('role', 'combobox');
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-controls', id);
        if (select.getAttribute('aria-label')) {
            trigger.setAttribute('aria-label', select.getAttribute('aria-label'));
        }
        trigger.innerHTML = '<span class="vc-dd-value"></span>' + CHEVRON;
        // carry page-specific sizing/hook classes (e.g. width helpers),
        // but not the native-select skin which has its own chevron.
        Array.from(select.classList)
            .filter(c => c !== 'vc-filter-select' && c !== 'vc-dd-native')
            .forEach(c => trigger.classList.add(c));

        const panel = document.createElement('div');
        panel.className = 'vc-dd-panel';
        panel.id = id;
        panel.setAttribute('role', 'listbox');
        panel.hidden = true;

        // place wrapper before the native select, then move select inside
        select.parentNode.insertBefore(root, select);
        root.appendChild(trigger);
        root.appendChild(panel);
        root.appendChild(select);
        select.classList.add('vc-dd-native');
        select.setAttribute('tabindex', '-1');

        const valueEl = trigger.querySelector('.vc-dd-value');
        let options = [];        // [{el, value, label}]
        let activeIdx = -1;

        function buildOptions() {
            panel.innerHTML = '';
            options = [];
            const kids = Array.from(select.children);
            kids.forEach((node, i) => {
                if (node.tagName === 'OPTGROUP') {
                    // divider before any group that isn't the first content
                    if (panel.childElementCount > 0) addDivider();
                    Array.from(node.querySelectorAll('option')).forEach(addOption);
                } else if (node.tagName === 'OPTION') {
                    addOption(node);
                }
            });
        }

        function addDivider() {
            const d = document.createElement('div');
            d.className = 'vc-dd-divider';
            d.setAttribute('role', 'separator');
            panel.appendChild(d);
        }

        function addOption(opt) {
            const el = document.createElement('div');
            el.className = 'vc-dd-option';
            el.setAttribute('role', 'option');
            el.textContent = opt.textContent.trim();
            const idx = options.length;
            el.addEventListener('click', () => choose(idx));
            el.addEventListener('mousemove', () => setActive(idx));
            panel.appendChild(el);
            options.push({ el, value: opt.value, label: opt.textContent.trim() });
        }

        function syncValue() {
            const cur = options.find(o => o.value === select.value) || options[0];
            valueEl.textContent = cur ? cur.label : '';
            options.forEach(o =>
                o.el.setAttribute('aria-selected', String(o.value === select.value)));
        }

        function setActive(idx) {
            if (idx === activeIdx) return;
            if (options[activeIdx]) options[activeIdx].el.classList.remove('is-active');
            activeIdx = idx;
            if (options[activeIdx]) {
                options[activeIdx].el.classList.add('is-active');
                options[activeIdx].el.scrollIntoView({ block: 'nearest' });
            }
        }

        function move(delta) {
            if (!options.length) return;
            let i = activeIdx;
            i = (i < 0 ? (delta > 0 ? 0 : options.length - 1) : i + delta);
            if (i < 0) i = options.length - 1;
            if (i >= options.length) i = 0;
            setActive(i);
        }

        function choose(idx) {
            const o = options[idx];
            if (!o) return;
            if (select.value !== o.value) {
                select.value = o.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
            syncValue();
            close();
            trigger.focus();
        }

        const float = makeFloating(panel, trigger);
        const inst = { root, panel, close };
        function open() {
            if (!panel.hidden) return;
            closeAll(inst);
            float.show();
            root.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');
            openInstances.add(inst);
            const sel = options.findIndex(o => o.value === select.value);
            setActive(sel >= 0 ? sel : 0);
        }
        function close() {
            if (panel.hidden) return;
            float.hide();
            root.classList.remove('is-open');
            trigger.setAttribute('aria-expanded', 'false');
            if (options[activeIdx]) options[activeIdx].el.classList.remove('is-active');
            activeIdx = -1;
            openInstances.delete(inst);
        }

        trigger.addEventListener('click', () => (panel.hidden ? open() : close()));

        trigger.addEventListener('keydown', e => {
            if (panel.hidden) {
                if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
                    e.preventDefault(); open();
                }
                return;
            }
            switch (e.key) {
                case 'ArrowDown': e.preventDefault(); move(1); break;
                case 'ArrowUp':   e.preventDefault(); move(-1); break;
                case 'Enter':     e.preventDefault(); choose(activeIdx); break;
                case 'Escape':    e.preventDefault(); close(); trigger.focus(); break;
                case 'Tab':       close(); break;
            }
        });

        buildOptions();
        syncValue();
        // reflect external programmatic value changes
        select.addEventListener('change', syncValue);
        // rebuild when the option list is replaced externally
        // (e.g. chained dependent dropdowns that swap innerHTML)
        new MutationObserver(() => { buildOptions(); syncValue(); })
            .observe(select, { childList: true, subtree: true });
    }

    /* ════════════════════════════════════════════
       Component 2 — autocompleteinput
       (<input data-autocomplete list="…">)
    ════════════════════════════════════════════ */
    function enhanceAutocomplete(input) {
        if (input.dataset.acReady) return;
        input.dataset.acReady = '1';

        // pull source options from the linked datalist, then detach
        // native list so it doesn't double up with our panel.
        const listId = input.getAttribute('list');
        const datalist = listId && document.getElementById(listId);
        const source = datalist
            ? Array.from(datalist.querySelectorAll('option'))
                .map(o => (o.value || o.textContent).trim())
                .filter(Boolean)
            : [];
        if (datalist) input.removeAttribute('list');

        const id = 'vcac-' + (++uid);

        const root = document.createElement('div');
        root.className = 'vc-ac';
        input.parentNode.insertBefore(root, input);
        root.appendChild(input);

        const panel = document.createElement('div');
        panel.className = 'vc-ac-panel';
        panel.id = id;
        panel.setAttribute('role', 'listbox');
        panel.hidden = true;
        root.appendChild(panel);

        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-expanded', 'false');
        input.setAttribute('aria-controls', id);
        input.setAttribute('autocomplete', 'off');

        let options = [];     // [{el, value}]
        let activeIdx = -1;

        const float = makeFloating(panel, input);
        const inst = { root, panel, close };

        function render(filter) {
            panel.innerHTML = '';
            options = [];
            activeIdx = -1;
            const q = (filter || '').trim().toLowerCase();
            const matches = q
                ? source.filter(s => s.toLowerCase().includes(q))
                : source.slice();

            if (!matches.length) {
                const empty = document.createElement('div');
                empty.className = 'vc-ac-empty';
                empty.textContent = 'ไม่พบรายชื่อ';
                panel.appendChild(empty);
                return;
            }
            matches.forEach(val => {
                const el = document.createElement('div');
                el.className = 'vc-ac-option';
                el.setAttribute('role', 'option');
                el.textContent = val;
                const idx = options.length;
                el.addEventListener('click', () => choose(idx));
                el.addEventListener('mousemove', () => setActive(idx));
                panel.appendChild(el);
                options.push({ el, value: val });
            });
        }

        function setActive(idx) {
            if (idx === activeIdx) return;
            if (options[activeIdx]) options[activeIdx].el.classList.remove('is-active');
            activeIdx = idx;
            if (options[activeIdx]) {
                options[activeIdx].el.classList.add('is-active');
                options[activeIdx].el.scrollIntoView({ block: 'nearest' });
            }
        }

        function move(delta) {
            if (!options.length) return;
            let i = activeIdx + delta;
            if (i < 0) i = options.length - 1;
            if (i >= options.length) i = 0;
            setActive(i);
        }

        function choose(idx) {
            const o = options[idx];
            if (!o) return;
            input.value = o.value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            close();
        }

        function open() {
            if (!panel.hidden) return;
            closeAll(inst);
            render(input.value);
            float.show();
            input.setAttribute('aria-expanded', 'true');
            openInstances.add(inst);
        }
        function close() {
            if (panel.hidden) return;
            float.hide();
            input.setAttribute('aria-expanded', 'false');
            activeIdx = -1;
            openInstances.delete(inst);
        }

        input.addEventListener('focus', open);
        input.addEventListener('input', () => {
            render(input.value);
            if (panel.hidden) open();
            else float.reposition();
        });

        input.addEventListener('keydown', e => {
            if (panel.hidden && ['ArrowDown', 'ArrowUp'].includes(e.key)) {
                e.preventDefault(); open(); return;
            }
            switch (e.key) {
                case 'ArrowDown': e.preventDefault(); move(1); break;
                case 'ArrowUp':   e.preventDefault(); move(-1); break;
                case 'Enter':
                    // only intercept when picking a highlighted row;
                    // otherwise let the form submit with the typed value.
                    if (!panel.hidden && activeIdx >= 0) {
                        e.preventDefault(); choose(activeIdx);
                    } else {
                        close();
                    }
                    break;
                case 'Escape': close(); break;
            }
        });
    }

    /* ════════════════════════════════════════════
       Component 3 — autocompleteselect
       (<select data-autocomplete>)
         Searchable like component 2, but the native
         <select> stays the source of truth: a pick writes
         select.value + fires 'change', so the SUBMITTED
         value is the <option> value (e.g. an id), never the
         typed label. Free text is NOT allowed (strict combobox).
    ════════════════════════════════════════════ */
    function enhanceAutocompleteSelect(select) {
        if (select.dataset.acReady) return;
        select.dataset.acReady = '1';

        // snapshot options as {value,label}; re-read on external swaps
        function readOptions() {
            return Array.from(select.options)
                .map(o => ({ value: o.value, label: (o.textContent || '').trim() }))
                .filter(o => o.label);
        }
        let source = readOptions();

        const id = 'vcac-' + (++uid);

        const root = document.createElement('div');
        root.className = 'vc-ac';
        select.parentNode.insertBefore(root, select);
        root.appendChild(select);

        // input mirrors the select's own classes (chevron, sizing) so it
        // looks identical to the control it replaces.
        const input = document.createElement('input');
        input.type = 'text';
        input.className = select.className;
        if (select.getAttribute('placeholder')) input.placeholder = select.getAttribute('placeholder');
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-expanded', 'false');
        input.setAttribute('aria-controls', id);
        input.setAttribute('autocomplete', 'off');
        root.appendChild(input);

        // hide the real control but keep it in the form so it submits
        select.classList.add('vc-dd-native');

        const panel = document.createElement('div');
        panel.className = 'vc-ac-panel';
        panel.id = id;
        panel.setAttribute('role', 'listbox');
        panel.hidden = true;
        root.appendChild(panel);

        let options = [];
        let activeIdx = -1;

        const float = makeFloating(panel, input);
        const inst = { root, panel, close };

        function syncFromSelect() {
            const cur = source.find(o => o.value === select.value);
            input.value = cur ? cur.label : '';
        }

        function render(filter) {
            panel.innerHTML = '';
            options = [];
            activeIdx = -1;
            const q = (filter || '').trim().toLowerCase();
            const matches = q
                ? source.filter(s => s.label.toLowerCase().includes(q))
                : source.slice();

            if (!matches.length) {
                const empty = document.createElement('div');
                empty.className = 'vc-ac-empty';
                empty.textContent = 'ไม่พบรายชื่อ';
                panel.appendChild(empty);
                return;
            }
            matches.forEach(m => {
                const el = document.createElement('div');
                el.className = 'vc-ac-option';
                el.setAttribute('role', 'option');
                el.textContent = m.label;
                if (m.value === select.value) el.setAttribute('aria-selected', 'true');
                const idx = options.length;
                el.addEventListener('click', () => choose(idx));
                el.addEventListener('mousemove', () => setActive(idx));
                panel.appendChild(el);
                options.push({ el, value: m.value });
            });
        }

        function setActive(idx) {
            if (idx === activeIdx) return;
            if (options[activeIdx]) options[activeIdx].el.classList.remove('is-active');
            activeIdx = idx;
            if (options[activeIdx]) {
                options[activeIdx].el.classList.add('is-active');
                options[activeIdx].el.scrollIntoView({ block: 'nearest' });
            }
        }

        function move(delta) {
            if (!options.length) return;
            let i = activeIdx + delta;
            if (i < 0) i = options.length - 1;
            if (i >= options.length) i = 0;
            setActive(i);
        }

        function choose(idx) {
            const o = options[idx];
            if (!o) return;
            select.value = o.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            syncFromSelect();
            close();
        }

        function open() {
            if (!panel.hidden) return;
            closeAll(inst);
            render('');               // focus → show full list, ignore current label
            float.show();
            input.setAttribute('aria-expanded', 'true');
            openInstances.add(inst);
        }
        function close() {
            if (panel.hidden) return;
            float.hide();
            input.setAttribute('aria-expanded', 'false');
            activeIdx = -1;
            openInstances.delete(inst);
            syncFromSelect();         // strict: revert any unconfirmed typing
        }

        input.addEventListener('focus', () => { open(); input.select(); });
        input.addEventListener('input', () => {
            render(input.value);
            if (panel.hidden) {
                float.show();
                input.setAttribute('aria-expanded', 'true');
                openInstances.add(inst);
            } else {
                float.reposition();
            }
        });

        input.addEventListener('keydown', e => {
            if (panel.hidden && ['ArrowDown', 'ArrowUp'].includes(e.key)) {
                e.preventDefault(); open(); return;
            }
            switch (e.key) {
                case 'ArrowDown': e.preventDefault(); move(1); break;
                case 'ArrowUp':   e.preventDefault(); move(-1); break;
                case 'Enter':
                    // strict combobox — never submit a half-typed label
                    e.preventDefault();
                    if (!panel.hidden && activeIdx >= 0) choose(activeIdx);
                    else close();
                    break;
                case 'Escape': close(); break;
            }
        });

        // keep the input label in sync with programmatic value changes
        // (e.g. a modal preset writes select.value then fires 'change')
        select.addEventListener('change', syncFromSelect);
        // re-read options if the list is swapped externally
        new MutationObserver(() => { source = readOptions(); syncFromSelect(); })
            .observe(select, { childList: true });

        syncFromSelect();
    }

    /* ── init ─────────────────────────────────── */
    function init(scope) {
        (scope || document).querySelectorAll('select[data-dropdown]').forEach(enhanceDropdown);
        (scope || document).querySelectorAll('input[data-autocomplete]').forEach(enhanceAutocomplete);
        (scope || document).querySelectorAll('select[data-autocomplete]').forEach(enhanceAutocompleteSelect);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init());
    } else {
        init();
    }

    // expose for dynamically-injected controls
    window.VCMenus = { init, enhanceDropdown, enhanceAutocomplete, enhanceAutocompleteSelect };
})();
