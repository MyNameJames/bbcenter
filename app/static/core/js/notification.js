/* notification.js — Notification System
   - Polling /api/notifications ทุก 30 วิ
   - Hybrid feed: booking notifications grouped (collapsed); non-booking solo flat
   - Dropdown panel (tabs, sticky payment)
   - Toast popup (desktop only)
   - Icons: Lucide only (FA mapped via faToLucide())
   โหลดจาก _shared/header.html → ทุกหน้าที่มี header
*/

const POLL_INTERVAL_MS = 30000;
const TOAST_DURATION_MS = 3000;
const IMPORTANT_CATEGORIES = new Set(['payment', 'payment_admin']);
const IMPORTANT_NTYPES_FOR_TOAST = new Set(['success', 'danger', 'warning']);

// ── Elements ─────────────────────────────
const bellBtn        = document.getElementById('notifBellBtn');
const badge          = document.getElementById('notifBadge');
const panel          = document.getElementById('notifPanel');
const tabsEl         = document.getElementById('notifTabs');
const bodyEl         = document.getElementById('notifBody');
const stickyEl       = document.getElementById('notifStickySection');
const listEl         = document.getElementById('notifList');
const markAllBtn     = document.getElementById('notifMarkAll');
const toastContainer = document.getElementById('notifToastContainer');

if (bellBtn && panel && bodyEl) {
    bootNotifications();
}

function bootNotifications() {
    // ── State ────────────────────────────────
    const state = {
        panelOpen:    false,
        currentTab:   'all',      // 'all' | 'unread' | 'payment'
        lastData:     null,
        lastError:    false,
        expanded:     new Set(),  // booking_ids (number) ที่ expand อยู่
        seenToastIds: new Set(),
        lastBadge:    0,
        // 'g:<bid>' = group อ่านแล้วในรอบนี้; 'n:<id>' = solo item อ่านแล้ว
        justRead: new Set(),
    };

    // ── Utils ─────────────────────────────────
    function escapeHtml(s) {
        if (s == null) return '';
        return String(s).replace(/[&<>"']/g, ch => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[ch]));
    }

    function faToLucide(fa) {
        const s = String(fa || '');
        if (s.includes('fa-gauge') || s.includes('fa-tachometer')) return 'gauge';
        if (s.includes('fa-wallet'))            return 'wallet';
        if (s.includes('fa-credit-card'))       return 'credit-card';
        if (s.includes('fa-money'))             return 'banknote';
        if (s.includes('fa-coins'))             return 'coins';
        if (s.includes('fa-fuel') || s.includes('fa-gas'))     return 'fuel';
        if (s.includes('fa-car'))               return 'car';
        if (s.includes('fa-truck'))             return 'truck';
        if (s.includes('fa-wrench') || s.includes('fa-tools')) return 'wrench';
        if (s.includes('fa-screwdriver'))       return 'wrench';
        if (s.includes('fa-calendar'))          return 'calendar';
        if (s.includes('fa-clock'))             return 'clock';
        if (s.includes('fa-bell-slash'))        return 'bell-off';
        if (s.includes('fa-bell'))              return 'bell';
        if (s.includes('fa-circle-check') || s.includes('fa-check-circle')) return 'check-circle-2';
        if (s.includes('fa-check'))             return 'check';
        if (s.includes('fa-circle-xmark') || s.includes('fa-times-circle') || s.includes('fa-circle-x')) return 'x-circle';
        if (s.includes('fa-xmark') || s.includes('fa-times'))  return 'x';
        if (s.includes('fa-triangle-exclamation') || s.includes('fa-exclamation-triangle')) return 'alert-triangle';
        if (s.includes('fa-circle-exclamation') || s.includes('fa-exclamation-circle')) return 'alert-circle';
        if (s.includes('fa-octagon-exclamation')) return 'alert-octagon';
        if (s.includes('fa-circle-info') || s.includes('fa-info-circle')) return 'info';
        if (s.includes('fa-user'))              return 'user';
        if (s.includes('fa-users'))             return 'users';
        if (s.includes('fa-arrow-right'))       return 'arrow-right';
        if (s.includes('fa-arrow-left'))        return 'arrow-left';
        if (s.includes('fa-chevron-right'))     return 'chevron-right';
        if (s.includes('fa-chevron-down'))      return 'chevron-down';
        if (s.includes('fa-spinner'))           return 'loader-2';
        if (s.includes('fa-file'))              return 'file';
        if (s.includes('fa-paperclip'))         return 'paperclip';
        if (s.includes('fa-trash'))             return 'trash-2';
        if (s.includes('fa-pen') || s.includes('fa-edit') || s.includes('fa-pencil')) return 'pencil';
        if (s.includes('fa-plus'))              return 'plus';
        if (s.includes('fa-minus'))             return 'minus';
        return 'bell';
    }

    function pickIcon(n) {
        if (n && n.icon) return faToLucide(n.icon);
        const cat = n && n.category;
        if (cat === 'mileage') return 'gauge';
        if (cat === 'budget')  return 'wallet';
        if (cat === 'payment' || cat === 'payment_admin') return 'credit-card';
        const nt = n && n.ntype;
        if (nt === 'success') return 'check-circle-2';
        if (nt === 'warning') return 'alert-triangle';
        if (nt === 'danger')  return 'alert-octagon';
        return 'info';
    }

    function lucideIcon(name, extraClass) {
        const cls = extraClass ? ` class="${escapeHtml(extraClass)}"` : '';
        return `<i data-lucide="${escapeHtml(name)}"${cls}></i>`;
    }

    function refreshLucide() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    function ntypeLabel(n) {
        return ({success:'สำเร็จ', info:'ข้อมูล', warning:'แจ้งเตือน', danger:'สำคัญ'}[n]) || 'ข้อมูล';
    }

    function overdueClass(createdAt) {
        const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(createdAt || '');
        if (!m) return '';
        const d = new Date(+m[3], +m[2]-1, +m[1], +m[4], +m[5]);
        const days = (Date.now() - d.getTime()) / 86400000;
        if (days >= 14) return 'overdue-14';
        if (days >= 7)  return 'overdue-7';
        return '';
    }

    function _categoryChip(cat) {
        const map = { mileage: 'ไมล์', budget: 'งบ', payment_admin: 'ชำระ' };
        if (!map[cat]) return '';
        return `<span class="notif-cat-chip">${map[cat]}</span>`;
    }

    // ── Rendering ─────────────────────────────
    function renderSkeleton() {
        const row = `<div class="notif-loading-row">
            <div class="notif-loading-icon"></div>
            <div class="notif-loading-lines">
                <div class="notif-loading-line long"></div>
                <div class="notif-loading-line short"></div>
            </div>
        </div>`;
        listEl.innerHTML = row + row + row;
    }

    function renderError() {
        listEl.innerHTML = `<div class="notif-error">
            ${lucideIcon('wifi-off')}
            <div class="notif-empty-title">เชื่อมต่อไม่ได้</div>
            <div class="notif-empty-sub">กำลังลองใหม่อัตโนมัติ...</div>
            <button type="button" class="notif-retry" id="notifRetryBtn">ลองอีกครั้ง</button>
        </div>`;
        const btn = document.getElementById('notifRetryBtn');
        if (btn) btn.addEventListener('click', refresh);
        refreshLucide();
    }

    function renderEmpty(tab) {
        const msg = {
            all:     { icon:'bell-off',       title:'ยังไม่มีการแจ้งเตือน', sub:'การแจ้งเตือนใหม่จะปรากฏที่นี่' },
            unread:  { icon:'check-circle-2', title:'อ่านครบแล้ว',           sub:'ไม่มีการแจ้งเตือนที่ยังไม่ได้อ่าน' },
            payment: { icon:'check-circle-2', title:'ไม่มีรายการค้างชำระ',   sub:'ชำระครบแล้วทุกรายการ' },
        }[tab] || { icon:'bell-off', title:'ยังไม่มีการแจ้งเตือน', sub:'' };
        return `<div class="notif-empty">
            ${lucideIcon(msg.icon)}
            <div class="notif-empty-title">${msg.title}</div>
            <div class="notif-empty-sub">${msg.sub}</div>
        </div>`;
    }

    function renderPaymentCard(n) {
        const od = overdueClass(n.created_at);
        const titleIcon = pickIcon(n);
        const isAdmin = (n.category === 'payment_admin');
        return `<div class="notif-payment-card ${od}" data-id="${n.id}">
            <div class="notif-payment-head">
                ${lucideIcon(titleIcon, 'title-icon')}
                <div class="notif-payment-title">${escapeHtml(n.title || n.booking_title || ('คำขอ #' + n.booking_id))}</div>
                ${lucideIcon('bell-ring', 'notif-payment-bell')}
            </div>
            <div class="notif-payment-message">${escapeHtml(n.message)}</div>
            <div class="notif-payment-actions">
                ${isAdmin
                    ? `<a class="notif-btn-link" href="${escapeHtml(n.action_url)}">
                         ดูรายการทั้งหมด ${lucideIcon('arrow-right')}
                       </a>`
                    : `<button class="notif-btn-primary" data-act="report-paid" data-booking="${n.booking_id}">
                         ฉันจ่ายแล้ว
                       </button>`
                }
            </div>
        </div>`;
    }

    // Booking group card (collapsed; click header to expand)
    function renderGroup(g) {
        const isExp = state.expanded.has(g.booking_id);
        const unread = g.unread_count > 0;
        const colorClass = `notif-icon-${g.latest_ntype || 'info'}`;
        return `<div class="notif-group ${unread ? 'unread' : ''} ${isExp ? 'expanded' : ''}"
                     data-booking="${g.booking_id}">
            <div class="notif-group-head" data-act="toggle" role="button" tabindex="0"
                 aria-expanded="${isExp ? 'true' : 'false'}">
                <span class="notif-dot-unread"></span>
                <div class="notif-cat-icon ${colorClass}">${lucideIcon(faToLucide(g.latest_icon))}</div>
                <div class="notif-group-main">
                    <div class="notif-group-title-row">
                        <span class="notif-group-title">${escapeHtml(g.booking_title)}</span>
                        <span class="notif-group-id">#${g.booking_id}</span>
                        <span class="notif-group-count">${g.notifications.length}</span>
                    </div>
                    <div class="notif-group-preview">${escapeHtml(g.latest_message)}</div>
                    <div class="notif-group-meta">${escapeHtml(g.latest_rel)}</div>
                </div>
                ${lucideIcon('chevron-right', 'notif-chevron')}
            </div>
            <div class="notif-timeline notif-timeline--notifs">
                ${g.notifications.map(renderInnerNotif).join('')}
            </div>
        </div>`;
    }

    // subtitle = message ตัด prefix "คำขอ/ทริป #N" ออก (group header แสดง #N + ปลายทางแล้ว → กระชับ)
    function innerSubtitle(n) {
        return String(n.message || '').replace(/^(คำขอ|ทริป)\s*#\d+\s*/, '');
    }

    // Compact notification row inside an expanded group — title + subtitle (2 บรรทัด) + time ขวา
    function renderInnerNotif(n) {
        const colorClass = `notif-icon-${n.ntype || 'info'}`;
        const title = n.title || ntypeLabel(n.ntype);
        return `<div class="notif-inner ${n.is_read ? '' : 'unread'}"
                     data-id="${n.id}" data-act="open-inner">
            <div class="notif-cat-icon ${colorClass}">${lucideIcon(pickIcon(n))}</div>
            <div class="notif-inner-body">
                <div class="notif-inner-title">${escapeHtml(title)}</div>
                <div class="notif-inner-msg">${escapeHtml(innerSubtitle(n))}</div>
            </div>
            <div class="notif-inner-time">${escapeHtml(n.created_rel)}</div>
        </div>`;
    }

    // Solo flat item (non-booking notification)
    function renderItem(n) {
        const colorClass = `notif-icon-${n.ntype || 'info'}`;
        const chip = _categoryChip(n.category);
        return `<div class="notif-group ${n.is_read ? '' : 'unread'}" data-id="${n.id}" data-act="open-item">
            <div class="notif-group-head" role="button" tabindex="0">
                <span class="notif-dot-unread"></span>
                <div class="notif-cat-icon ${colorClass}">${lucideIcon(pickIcon(n))}</div>
                <div class="notif-group-main">
                    ${chip ? `<div style="margin-bottom:3px">${chip}</div>` : ''}
                    <div class="notif-group-preview">${escapeHtml(n.message)}</div>
                    <div class="notif-group-meta">${escapeHtml(n.created_rel)}</div>
                </div>
            </div>
        </div>`;
    }

    // Merge-sort groups + solo items by ts_ms desc (both arrays pre-sorted by backend)
    function buildFeed(data, tab) {
        let groups = data.groups || [];
        let items  = data.items  || [];
        if (tab === 'unread') {
            groups = groups.filter(g => g.unread_count > 0 || state.justRead.has('g:' + g.booking_id));
            items  = items.filter(n => !n.is_read || state.justRead.has('n:' + n.id));
        }
        const gList = groups.map(g => ({...g, _type:'group'}));
        const nList = items.map(n  => ({...n, _type:'item'}));
        const out = [];
        let gi = 0, ni = 0;
        while (gi < gList.length || ni < nList.length) {
            const g = gList[gi], n = nList[ni];
            if (!g)                      { out.push(n); ni++; }
            else if (!n)                 { out.push(g); gi++; }
            else if (g.ts_ms >= n.ts_ms) { out.push(g); gi++; }
            else                         { out.push(n); ni++; }
        }
        return out;
    }

    function renderList(data) {
        if (!data) {
            if (state.lastError) renderError(); else renderSkeleton();
            return;
        }
        const tab = state.currentTab;
        listEl.setAttribute('aria-labelledby', `notifTab-${tab}`);

        const stickyHtml = (tab === 'unread') ? ''
            : (data.sticky || []).map(renderPaymentCard).join('');
        stickyEl.innerHTML = stickyHtml;
        stickyEl.classList.toggle('notif-sticky-section-empty', !stickyHtml);

        if (tab === 'payment') {
            if (!stickyHtml) {
                listEl.innerHTML = renderEmpty('payment');
                refreshLucide();
                return;
            }
            listEl.innerHTML = '';
            refreshLucide();
            return;
        }

        const feed = buildFeed(data, tab);
        if (feed.length === 0 && !stickyHtml) {
            listEl.innerHTML = renderEmpty(tab);
            refreshLucide();
            return;
        }

        listEl.innerHTML = feed.map(e =>
            e._type === 'group' ? renderGroup(e) : renderItem(e)
        ).join('');
        refreshLucide();
    }

    function renderTabs(data) {
        if (!data) return;
        const tAll = (data.groups || []).reduce((s, g) => s + g.notifications.length, 0)
                   + (data.items  || []).length;
        const tUnread  = data.unread || 0;
        const tPayment = data.unread_payment || 0;

        const tab = (name, label, count, opts = {}) => {
            const active = state.currentTab === name;
            const dot = opts.dot && count > 0 ? '<span class="notif-tab-dot"></span>' : '';
            const ic = opts.icon ? lucideIcon(opts.icon) : '';
            return `<button class="notif-tab ${active ? 'active' : ''}"
                            id="notifTab-${name}"
                            role="tab"
                            aria-selected="${active ? 'true' : 'false'}"
                            tabindex="${active ? '0' : '-1'}"
                            data-tab="${name}">
                ${ic}${label}
                <span class="notif-tab-count">${count}</span>
                ${dot}
            </button>`;
        };

        tabsEl.innerHTML =
            tab('all',     'ทั้งหมด',      tAll) +
            tab('unread',  'ยังไม่อ่าน',   tUnread) +
            tab('payment', 'ต้องจ่ายเงิน', tPayment, { icon: 'wallet', dot: true });

        refreshLucide();
    }

    function renderBadge(data) {
        const raw = data.unread || 0;
        if (raw > 0) {
            badge.textContent = (raw > 30) ? '30+' : String(raw);
            badge.classList.add('show');
            bellBtn.classList.add('has-unread');
            if (raw > state.lastBadge && state.lastBadge !== 0) {
                badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop');
                bellBtn.classList.remove('shake'); void bellBtn.offsetWidth; bellBtn.classList.add('shake');
            }
        } else {
            badge.classList.remove('show');
            bellBtn.classList.remove('has-unread');
        }
        state.lastBadge = raw;
    }

    // ── Toast ─────────────────────────────
    function showToast(n) {
        if (!toastContainer) return;
        if (state.seenToastIds.has(n.id)) return;
        state.seenToastIds.add(n.id);

        const el = document.createElement('div');
        el.className = `notif-toast toast-${n.ntype || 'info'}`;
        el.dataset.id = n.id;
        el.innerHTML = `
            <div class="notif-toast-icon">${lucideIcon(pickIcon(n))}</div>
            <div class="notif-toast-body">
                <div class="notif-toast-title">${escapeHtml(n.title || (n.booking_title
                    ? ('คำขอ #' + n.booking_id + ' · ' + n.booking_title)
                    : ntypeLabel(n.ntype)))}</div>
                <div class="notif-toast-msg">${escapeHtml(n.message)}</div>
            </div>
            <button class="notif-toast-close" aria-label="ปิด">${lucideIcon('x')}</button>
            <div class="notif-toast-progress"></div>`;

        el.addEventListener('click', (e) => {
            if (e.target.closest('.notif-toast-close')) { dismissToast(el); return; }
            if (n.action_url && n.action_url !== '#') {
                fetch(`/api/notifications/${n.id}/read`, { method:'POST' }).catch(()=>{});
                window.location.href = n.action_url;
            }
        });

        toastContainer.appendChild(el);
        refreshLucide();
        setTimeout(() => dismissToast(el), TOAST_DURATION_MS);
    }
    function dismissToast(el) {
        if (!el || el.classList.contains('leaving')) return;
        el.classList.add('leaving');
        setTimeout(() => el.remove(), 200);
    }

    function maybeShowToasts(data) {
        if (!data) return;
        const now = Date.now();
        const all = [
            ...(data.items || []),
            ...(data.groups || []).flatMap(g => g.notifications),
        ];
        all.forEach(n => {
            if (n.is_read) return;
            if (state.seenToastIds.has(n.id)) return;
            const isImportant =
                IMPORTANT_CATEGORIES.has(n.category) ||
                IMPORTANT_NTYPES_FOR_TOAST.has(n.ntype);
            if (!isImportant) return;
            const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(n.created_at || '');
            if (!m) return;
            const t = new Date(+m[3], +m[2]-1, +m[1], +m[4], +m[5]).getTime();
            if (now - t > 45000) { state.seenToastIds.add(n.id); return; }
            showToast(n);
        });
    }

    // ── Poll & Refresh ────────────────────
    async function refresh() {
        try {
            const r = await fetch('/api/notifications', { credentials:'same-origin' });
            if (!r.ok) {
                state.lastError = true;
                if (state.panelOpen && !state.lastData) renderError();
                return;
            }
            const data = await r.json();
            state.lastError = false;
            state.lastData = data;
            renderBadge(data);
            maybeShowToasts(data);
            if (state.panelOpen) {
                renderTabs(data);
                renderList(data);
            }
        } catch (e) {
            state.lastError = true;
            if (state.panelOpen && !state.lastData) renderError();
        }
    }

    // ── Panel control ────────────────────
    function openPanel() {
        state.panelOpen = true;
        panel.classList.add('open');
        bellBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = window.innerWidth < 768 ? 'hidden' : '';
        if (state.lastData) {
            renderTabs(state.lastData);
            renderList(state.lastData);
        } else if (state.lastError) {
            renderError();
        } else {
            renderSkeleton();
        }
        refresh();
    }
    function closePanel() {
        state.panelOpen = false;
        panel.classList.remove('open');
        bellBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        state.justRead.clear();
    }
    function togglePanel() {
        if (state.panelOpen) closePanel(); else openPanel();
    }

    // ── Toggle group expand/collapse ──────
    function toggleGroup(groupEl) {
        const bid = parseInt(groupEl.dataset.booking, 10);
        const isNowExp = !state.expanded.has(bid);
        if (isNowExp) state.expanded.add(bid); else state.expanded.delete(bid);
        groupEl.classList.toggle('expanded', isNowExp);
        groupEl.querySelector('[data-act="toggle"]')
               ?.setAttribute('aria-expanded', String(isNowExp));
        if (isNowExp) {
            // mark all unread notifications in group as read after 1.5s (if still expanded)
            setTimeout(async () => {
                if (!state.expanded.has(bid)) return;
                const g = (state.lastData?.groups || []).find(g => g.booking_id === bid);
                for (const n of (g?.notifications || [])) {
                    if (!n.is_read) {
                        fetch(`/api/notifications/${n.id}/read`, {method:'POST'}).catch(()=>{});
                    }
                }
                state.justRead.add('g:' + bid);
                setTimeout(refresh, 400);
            }, 1500);
        }
    }

    // ── Event wiring ─────────────────────
    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanel();
    });

    // กัน click ภายใน panel bubble ไป document
    panel.addEventListener('click', (e) => { e.stopPropagation(); });

    document.addEventListener('click', (e) => {
        if (!state.panelOpen) return;
        if (window.innerWidth < 768) return;
        if (!panel.contains(e.target) && !bellBtn.contains(e.target)) closePanel();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.panelOpen) closePanel();
    });

    function setTab(name) {
        if (!name || state.currentTab === name) return;
        state.currentTab = name;
        renderTabs(state.lastData);
        renderList(state.lastData);
    }
    tabsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.notif-tab');
        if (!btn) return;
        setTab(btn.dataset.tab);
    });
    tabsEl.addEventListener('keydown', (e) => {
        const order = ['all', 'unread', 'payment'];
        const idx = order.indexOf(state.currentTab);
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            setTab(order[(idx + 1) % order.length]);
            tabsEl.querySelector('.notif-tab.active')?.focus();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setTab(order[(idx - 1 + order.length) % order.length]);
            tabsEl.querySelector('.notif-tab.active')?.focus();
        } else if (e.key === 'Home') {
            e.preventDefault(); setTab(order[0]);
            tabsEl.querySelector('.notif-tab.active')?.focus();
        } else if (e.key === 'End') {
            e.preventDefault(); setTab(order[order.length - 1]);
            tabsEl.querySelector('.notif-tab.active')?.focus();
        }
    });

    if (markAllBtn) {
        markAllBtn.addEventListener('click', async () => {
            await fetch('/api/notifications/read-all', { method:'POST' });
            refresh();
        });
    }

    // List interactions: toggle group | open inner notif | open solo item
    listEl.addEventListener('click', async (e) => {
        const head = e.target.closest('[data-act="toggle"]');
        if (head) {
            toggleGroup(head.closest('.notif-group'));
            return;
        }

        const inner = e.target.closest('[data-act="open-inner"]');
        if (inner) {
            const id  = parseInt(inner.dataset.id, 10);
            const bid = parseInt(inner.closest('.notif-group').dataset.booking, 10);
            const g   = (state.lastData?.groups || []).find(g => g.booking_id === bid);
            const n   = (g?.notifications || []).find(n => n.id === id);
            await fetch(`/api/notifications/${id}/read`, {method:'POST'}).catch(()=>{});
            if (n?.action_url && n.action_url !== '#') {
                window.location.href = n.action_url;
            } else {
                refresh();
            }
            return;
        }

        const itemCard = e.target.closest('[data-act="open-item"]');
        if (!itemCard) return;
        const id   = parseInt(itemCard.dataset.id, 10);
        const item = (state.lastData?.items || []).find(n => n.id === id);
        await fetch(`/api/notifications/${id}/read`, {method:'POST'}).catch(()=>{});
        state.justRead.add('n:' + id);
        if (item?.action_url && item.action_url !== '#') {
            window.location.href = item.action_url;
        } else {
            refresh();
        }
    });

    listEl.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const head = e.target.closest('[data-act="toggle"]');
        if (head) { e.preventDefault(); toggleGroup(head.closest('.notif-group')); return; }
        const inner = e.target.closest('[data-act="open-inner"]');
        if (inner) { e.preventDefault(); inner.click(); return; }
        const item = e.target.closest('[data-act="open-item"]');
        if (item) { e.preventDefault(); item.click(); }
    });

    stickyEl.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-act="report-paid"]');
        if (!btn) return;
        e.preventDefault();
        const bookingId = parseInt(btn.dataset.booking, 10);
        btn.disabled = true;
        btn.innerHTML = `${lucideIcon('loader-2')} กำลังส่ง...`;
        refreshLucide();
        try {
            const r = await fetch(`/api/payment/report-by-booking/${bookingId}`, { method:'POST' });
            if (r.ok) {
                const card = btn.closest('.notif-payment-card');
                card.querySelector('.notif-payment-actions').innerHTML =
                    `<div class="notif-payment-pending">
                        ${lucideIcon('clock')} รอ Admin ยืนยันการชำระ
                     </div>`;
                refreshLucide();
            } else {
                const data = await r.json().catch(() => ({}));
                btn.disabled = false;
                btn.innerHTML = `${lucideIcon('check')} ฉันจ่ายแล้ว`;
                refreshLucide();
                alert(data.msg || 'เกิดข้อผิดพลาด');
            }
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = `${lucideIcon('check')} ฉันจ่ายแล้ว`;
            refreshLucide();
        }
    });

    const mobileBack = document.getElementById('notifMobileBack');
    if (mobileBack) mobileBack.addEventListener('click', closePanel);

    // ── Start polling ─────────────────────
    refresh();
    setInterval(refresh, POLL_INTERVAL_MS);
}
