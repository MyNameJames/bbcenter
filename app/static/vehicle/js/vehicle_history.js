/* ============================================================
   activity_timeline.js — Unified Activity History
   ─────────────────────────────────────────────────────────────
   - IntersectionObserver entrance animation (stagger)
   - Filter wiring: segments, status select, search (debounced)
   - JSON refetch → re-render list (no full page reload)
   - Calls window.lucide.createIcons() after every DOM update
   Created: 2026-05-22 (Phase 10)
   ============================================================ */
(function () {
    'use strict';

    const FEED_URL = '/vehicle/history/feed';

    // ── DOM refs ──────────────────────────────────────────────
    const root      = document.querySelector('.atl-page');
    if (!root) return;
    const listMount = root.querySelector('#atl-list-mount');
    const empty     = root.querySelector('#atl-empty');
    const skeleton  = root.querySelector('#atl-skeleton');
    const segments  = root.querySelectorAll('.atl-segments__btn');
    const statusSel = root.querySelector('#atl-status-select');
    const searchIn  = root.querySelector('#atl-search-input');

    // ── State ─────────────────────────────────────────────────
    const state = {
        type:   (segments[0] && document.querySelector('.atl-segments__btn[aria-selected="true"]'))
                    ? document.querySelector('.atl-segments__btn[aria-selected="true"]').dataset.type || ''
                    : '',
        status: statusSel ? statusSel.value : '',
        q:      searchIn  ? searchIn.value  : '',
    };

    // ── Helpers ───────────────────────────────────────────────
    const debounce = (fn, ms) => {
        let id;
        return (...args) => { clearTimeout(id); id = setTimeout(() => fn(...args), ms); };
    };

    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons({ icons: window.lucide.icons || window.lucide });
        }
    }

    // ── Day grouping (relative thai label) ────────────────────
    function dayLabels(iso) {
        if (!iso) return { rel: '', date: '' };
        const dt = new Date(iso);
        const today = new Date(); today.setHours(0,0,0,0);
        const d = new Date(dt);   d.setHours(0,0,0,0);
        const delta = Math.round((today - d) / 86400000);
        const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                        'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
        const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
        if (delta === 0) return { rel: 'วันนี้',  date: dateStr };
        if (delta === 1) return { rel: 'เมื่อวาน', date: dateStr };
        if (delta > 1 && delta < 7) return { rel: `${delta} วันก่อน`, date: dateStr };
        return { rel: dateStr.toUpperCase(), date: '' };
    }

    function timeFmt(iso) {
        if (!iso) return '';
        const dt = new Date(iso);
        const hh = String(dt.getHours()).padStart(2, '0');
        const mm = String(dt.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }

    // ── Render ────────────────────────────────────────────────
    function renderItemHTML(it) {
        const metaHTML = (it.meta || []).map(([icon, text]) => `
            <span class="atl-item__meta-chip">
                <i data-lucide="${icon}"></i>${escapeHtml(text)}
            </span>`).join('');
        const rejectHTML = it.reject_reason ? `
            <div class="atl-item__reject">
                <strong>เหตุผล:</strong>${escapeHtml(it.reject_reason)}
            </div>` : '';
        return `
        <li class="atl-item atl-item--${it.status}" data-id="${it.id}">
            <span class="atl-item__icon" aria-hidden="true">
                <i data-lucide="${it.service_icon}"></i>
            </span>
            <div class="atl-item__body">
                <div class="atl-item__head">
                    <h3 class="atl-item__title">${escapeHtml(it.title)}</h3>
                    <span class="vc-badge vc-badge-${it.status_tone} vc-badge-dot vc-badge-xs">${escapeHtml(it.status_label)}</span>
                </div>
                ${it.subtitle ? `<p class="atl-item__subtitle">${escapeHtml(it.subtitle)}</p>` : ''}
                <div class="atl-item__meta">${metaHTML}</div>
                ${rejectHTML}
            </div>
            <div class="atl-item__rail">
                <span class="atl-item__time">${timeFmt(it.timestamp)}</span>
                <div class="atl-item__actions">
                    <a href="${escapeAttr(it.detail_url)}" class="atl-action">
                        <i data-lucide="arrow-right"></i>เปิด
                    </a>
                </div>
            </div>
        </li>`;
    }

    function renderGroups(items) {
        if (!items.length) {
            listMount.innerHTML = '';
            empty.classList.add('is-visible');
            return;
        }
        empty.classList.remove('is-visible');

        // group by YYYY-MM-DD
        const groups = [];
        let curKey = null;
        items.forEach(it => {
            const k = (it.timestamp || '').slice(0, 10);
            if (k !== curKey) { groups.push({ key: k, items: [] }); curKey = k; }
            groups[groups.length - 1].items.push(it);
        });

        const html = groups.map((g, gi) => {
            const lbl = dayLabels(g.items[0].timestamp);
            return `
            <div class="atl-day ${gi === 0 ? 'atl-day--first' : ''}">
                <span class="atl-day__rel">${lbl.rel}</span>
                ${lbl.date && lbl.date !== lbl.rel ? `<span class="atl-day__date">${lbl.date}</span>` : ''}
                <span class="atl-day__count">${g.items.length} รายการ</span>
            </div>
            <ul class="atl-list atl-group">
                ${g.items.map(renderItemHTML).join('')}
            </ul>`;
        }).join('');

        listMount.innerHTML = html;
        refreshIcons();
        observeItems();
    }

    // ── Entrance observer ─────────────────────────────────────
    let io;
    function observeItems() {
        if (!('IntersectionObserver' in window)) return;
        io && io.disconnect();
        io = new IntersectionObserver((entries) => {
            entries.forEach((e, idx) => {
                if (e.isIntersecting) {
                    const stagger = Math.min(idx * 30, 240);
                    e.target.style.setProperty('--atl-delay', `${stagger}ms`);
                    e.target.classList.add('is-in');
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });
        root.querySelectorAll('.atl-item:not(.is-in)').forEach(el => io.observe(el));
    }

    // ── Fetch ─────────────────────────────────────────────────
    async function refetch() {
        skeleton && skeleton.classList.add('is-visible');
        const url = new URL(FEED_URL, window.location.origin);
        if (state.type)   url.searchParams.set('type',   state.type);
        if (state.status) url.searchParams.set('status', state.status);
        if (state.q)      url.searchParams.set('q',      state.q);

        // sync URL bar without reload
        const pretty = new URL('/vehicle/history', window.location.origin);
        ['type', 'status', 'q'].forEach(k => { if (state[k]) pretty.searchParams.set(k, state[k]); });
        window.history.replaceState({}, '', pretty);

        try {
            const res = await fetch(url, { credentials: 'same-origin' });
            const data = await res.json();
            renderGroups(data.items || []);
        } catch (err) {
            console.error('[history] fetch failed', err);
        } finally {
            skeleton && skeleton.classList.remove('is-visible');
        }
    }

    // ── Wiring ────────────────────────────────────────────────
    segments.forEach(btn => {
        btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            segments.forEach(b => b.setAttribute('aria-selected', 'false'));
            btn.setAttribute('aria-selected', 'true');
            state.type = btn.dataset.type || '';
            refetch();
        });
    });

    if (statusSel) {
        statusSel.addEventListener('change', () => {
            state.status = statusSel.value;
            refetch();
        });
    }

    if (searchIn) {
        searchIn.addEventListener('input', debounce(() => {
            state.q = searchIn.value;
            refetch();
        }, 220));
    }

    // ── Initial: animate server-rendered items ────────────────
    observeItems();

    // ── Utils ────────────────────────────────────────────────
    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    function escapeAttr(s) { return escapeHtml(s); }
})();
