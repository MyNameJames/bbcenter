/* pages/notification.js — Notification System (ES module)
   - Polling /api/notifications ทุก 30 วิ
   - Dropdown panel (group by booking, tabs, sticky payment)
   - Toast popup (desktop only, สำหรับ event สำคัญ)
   โหลดจาก _header.html → ทุกหน้าที่มี header
*/

const POLL_INTERVAL_MS = 30000;
const TOAST_DURATION_MS = 3000;
const IMPORTANT_CATEGORIES = new Set(['payment', 'payment_admin']);
const IMPORTANT_NTYPES_FOR_TOAST = new Set(['success', 'danger', 'warning']);

// ── Elements ─────────────────────────────
const bellBtn   = document.getElementById('notifBellBtn');
const badge     = document.getElementById('notifBadge');
const panel     = document.getElementById('notifPanel');
const tabsEl    = document.getElementById('notifTabs');
const bodyEl    = document.getElementById('notifBody');
const stickyEl  = document.getElementById('notifStickySection');
const listEl    = document.getElementById('notifList');
const markAllBtn = document.getElementById('notifMarkAll');
const toastContainer = document.getElementById('notifToastContainer');

if (bellBtn && panel && bodyEl) {
    bootNotifications();
}

function bootNotifications() {
    // ── State ────────────────────────────────
    const state = {
        panelOpen: false,
        currentTab: 'all',       // 'all' | 'unread' | 'payment'
        lastData: null,
        expanded: new Set(),     // booking_ids ที่ expand อยู่
        seenToastIds: new Set(), // กัน toast ซ้ำ
        lastBadge: 0,
    };

    // ── Utils ─────────────────────────────────
    function escapeHtml(s) {
        if (s == null) return '';
        return String(s).replace(/[&<>"']/g, ch => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[ch]));
    }

    function categoryToClass(cat, ntype) {
        if (cat === 'mileage')       return 'cat-mileage';
        if (cat === 'budget')        return 'cat-budget';
        if (cat === 'payment' || cat === 'payment_admin') return 'cat-payment';
        // status category → ใช้ ntype
        const n = ntype || 'info';
        return 'status-' + n;
    }

    function ntypeLabel(n) {
        return ({success:'สำเร็จ', info:'ข้อมูล', warning:'แจ้งเตือน', danger:'สำคัญ'}[n]) || 'ข้อมูล';
    }

    function overdueClass(createdAt) {
        // ประมาณจาก ISO หรือ dd/mm/yyyy HH:MM — ใช้เท่าที่มี ถ้า parse ไม่ได้ ให้ default
        const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(createdAt || '');
        if (!m) return '';
        const d = new Date(+m[3], +m[2]-1, +m[1], +m[4], +m[5]);
        const days = (Date.now() - d.getTime()) / 86400000;
        if (days >= 14) return 'overdue-14';
        if (days >= 7)  return 'overdue-7';
        return '';
    }

    // ── Rendering ─────────────────────────────
    function renderEmpty(tab) {
        const msg = {
            all:     { icon:'fa-regular fa-bell-slash', title:'ยังไม่มีการแจ้งเตือน', sub:'การแจ้งเตือนใหม่จะปรากฏที่นี่' },
            unread:  { icon:'fa-solid fa-circle-check', title:'อ่านครบแล้ว', sub:'ไม่มีการแจ้งเตือนที่ยังไม่ได้อ่าน' },
            payment: { icon:'fa-solid fa-circle-check', title:'ไม่มีรายการค้างชำระ', sub:'ชำระครบแล้วทุกรายการ' },
        }[tab] || { icon:'fa-regular fa-bell-slash', title:'ยังไม่มีการแจ้งเตือน', sub:'' };
        return `<div class="notif-empty">
            <i class="${msg.icon}"></i>
            <div class="notif-empty-title">${msg.title}</div>
            <div class="notif-empty-sub">${msg.sub}</div>
        </div>`;
    }

    function renderPaymentCard(n) {
        const od = overdueClass(n.created_at);
        return `<div class="notif-payment-card ${od}" data-id="${n.id}">
            <div class="notif-payment-head">
                <i class="${escapeHtml(n.icon || 'fa-solid fa-credit-card')} title-icon"></i>
                <div class="notif-payment-title">${escapeHtml(n.booking_title || ('คำขอ #' + n.booking_id))}</div>
                <i class="fa-solid fa-bell notif-payment-bell" title="เกินกำหนด"></i>
            </div>
            <div class="notif-payment-message">${escapeHtml(n.message)}</div>
            <div class="notif-payment-actions">
                ${n.category === 'payment_admin'
                    ? `<a class="notif-btn-link" href="${escapeHtml(n.action_url)}">
                         ดูรายการทั้งหมด <i class="fa-solid fa-arrow-right"></i>
                       </a>`
                    : `<button class="notif-btn-primary" data-act="report-paid" data-booking="${n.booking_id}">
                         <i class="fa-solid fa-check"></i> ฉันจ่ายแล้ว
                       </button>
                       <a class="notif-btn-link" href="${escapeHtml(n.action_url)}">ดูรายละเอียด</a>`
                }
            </div>
        </div>`;
    }

    function renderGroup(g) {
        const latest = g.latest || {};
        const unread = g.unread_count > 0;
        const isExp = state.expanded.has(g.booking_id);
        const iconCls = categoryToClass(latest.category, latest.ntype);
        const latestIcon = escapeHtml(latest.icon || 'fa-solid fa-circle-info');

        const timelineItems = (g.items || []).map(it => `
            <div class="notif-timeline-item" data-id="${it.id}">
                <span><i class="${escapeHtml(it.icon || 'fa-solid fa-circle-info')} notif-timeline-icon"></i>${escapeHtml(it.message)}</span>
                <span class="notif-timeline-time">${escapeHtml(it.created_rel)} · ${escapeHtml(it.created_at)}</span>
            </div>`).join('');

        return `<div class="notif-group ${unread ? 'unread' : ''} ${isExp ? 'expanded' : ''}" data-booking="${g.booking_id}">
            <div class="notif-group-head" data-act="toggle">
                <span class="notif-dot-unread"></span>
                <div class="notif-cat-icon ${iconCls}"><i class="${latestIcon}"></i></div>
                <div class="notif-group-main">
                    <div class="notif-group-title-row">
                        <span class="notif-group-title">${escapeHtml(g.booking_title)}</span>
                        <span class="notif-group-id">#${g.booking_id}</span>
                        <span class="notif-group-count">${g.items.length}</span>
                    </div>
                    <div class="notif-group-preview">
                        <i class="${escapeHtml(latest.icon || 'fa-solid fa-circle-info')}"></i>${escapeHtml(latest.message || '')}
                    </div>
                    <div class="notif-group-meta">${escapeHtml(latest.created_rel || '')}</div>
                </div>
                <i class="notif-chevron fa-solid fa-chevron-right"></i>
            </div>
            <div class="notif-timeline">
                ${timelineItems}
                <div class="notif-timeline-footer">
                    <a href="/vehicle/detail/${g.booking_id}" data-act="open-booking">
                        ดูรายละเอียด booking <i class="fa-solid fa-arrow-right"></i>
                    </a>
                </div>
            </div>
        </div>`;
    }

    function renderLooseItem(n) {
        const iconCls = categoryToClass(n.category, n.ntype);
        return `<div class="notif-group ${n.is_read ? '' : 'unread'}" data-id="${n.id}" data-act="open-single">
            <div class="notif-group-head">
                <span class="notif-dot-unread"></span>
                <div class="notif-cat-icon ${iconCls}"><i class="${escapeHtml(n.icon || 'fa-solid fa-circle-info')}"></i></div>
                <div class="notif-group-main">
                    <div class="notif-group-preview">${escapeHtml(n.message)}</div>
                    <div class="notif-group-meta">${escapeHtml(n.created_rel)}</div>
                </div>
            </div>
        </div>`;
    }

    function renderList(data) {
        if (!data) return;
        const tab = state.currentTab;

        // Sticky section (แสดงเฉพาะ tab all / payment)
        const stickyHtml = (tab === 'unread') ? ''
            : (data.sticky || []).map(renderPaymentCard).join('');
        stickyEl.innerHTML = stickyHtml;
        stickyEl.classList.toggle('notif-sticky-section-empty', !stickyHtml);

        // Main list
        let groups = data.groups || [];
        let loose  = data.loose || [];

        if (tab === 'unread') {
            groups = groups.filter(g => g.unread_count > 0);
            loose  = loose.filter(n => !n.is_read);
        } else if (tab === 'payment') {
            // สำหรับ tab payment — แสดงเฉพาะ sticky (ซึ่ง render แยกด้านบน)
            groups = [];
            loose  = [];
            if (!stickyHtml) {
                listEl.innerHTML = renderEmpty('payment');
                return;
            }
            listEl.innerHTML = '';
            return;
        }

        if (groups.length === 0 && loose.length === 0 && !stickyHtml) {
            listEl.innerHTML = renderEmpty(tab);
            return;
        }

        listEl.innerHTML =
            groups.map(renderGroup).join('') +
            loose.map(renderLooseItem).join('');
    }

    function renderTabs(data) {
        if (!data) return;
        const tAll     = (data.groups || []).reduce((s,g) => s + g.items.length, 0) + (data.loose || []).length;
        const tUnread  = data.unread || 0;
        const tPayment = data.unread_payment || 0;

        tabsEl.innerHTML = `
            <button class="notif-tab ${state.currentTab==='all'?'active':''}" data-tab="all">
                ทั้งหมด <span class="notif-tab-count">${tAll}</span>
            </button>
            <button class="notif-tab ${state.currentTab==='unread'?'active':''}" data-tab="unread">
                ยังไม่อ่าน <span class="notif-tab-count">${tUnread}</span>
            </button>
            <button class="notif-tab ${state.currentTab==='payment'?'active':''}" data-tab="payment">
                <i class="fa-solid fa-credit-card"></i> ต้องจ่ายเงิน
                <span class="notif-tab-count">${tPayment}</span>
                ${tPayment > 0 ? '<span class="notif-tab-dot"></span>' : ''}
            </button>`;
    }

    function renderBadge(data) {
        const raw = data.unread || 0;
        if (raw > 0) {
            badge.textContent = (raw > 30) ? '30+' : String(raw);
            badge.classList.add('show');
            bellBtn.classList.add('has-unread');
            // Pop animation เมื่อ count เพิ่ม
            if (raw > state.lastBadge && state.lastBadge !== 0) {
                badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop');
                bellBtn.classList.remove('shake'); void bellBtn.offsetWidth; bellBtn.classList.add('shake');
            }
        } else {
            badge.classList.remove('show');
            bellBtn.classList.remove('has-unread');
            const icon = bellBtn.querySelector('i');
            if (icon) { icon.classList.remove('fa-solid'); icon.classList.add('fa-regular'); }
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
        const iconCls = categoryToClass(n.category, n.ntype);
        el.innerHTML = `
            <div class="notif-toast-icon ${iconCls}"><i class="${escapeHtml(n.icon || 'fa-solid fa-circle-info')}"></i></div>
            <div class="notif-toast-body">
                <div class="notif-toast-title">${escapeHtml(n.booking_title ? ('คำขอ #' + n.booking_id + ' · ' + n.booking_title) : ntypeLabel(n.ntype))}</div>
                <div class="notif-toast-msg">${escapeHtml(n.message)}</div>
            </div>
            <button class="notif-toast-close" aria-label="ปิด"><i class="fa-solid fa-xmark"></i></button>
            <div class="notif-toast-progress"></div>`;

        el.addEventListener('click', (e) => {
            if (e.target.closest('.notif-toast-close')) { dismissToast(el); return; }
            if (n.action_url && n.action_url !== '#') {
                fetch(`/api/notifications/${n.id}/read`, { method:'POST' }).catch(()=>{});
                window.location.href = n.action_url;
            }
        });

        toastContainer.appendChild(el);
        setTimeout(() => dismissToast(el), TOAST_DURATION_MS);
    }
    function dismissToast(el) {
        if (!el || el.classList.contains('leaving')) return;
        el.classList.add('leaving');
        setTimeout(() => el.remove(), 200);
    }

    function maybeShowToasts(data) {
        // Toast เฉพาะ mobile-skip (CSS จัดการ) + event สำคัญที่ยังไม่อ่าน + เพิ่งเกิด (within 45s) + ยังไม่เคย toast
        if (!data || !data.notifications) return;
        const now = Date.now();
        data.notifications.forEach(n => {
            if (n.is_read) return;
            if (state.seenToastIds.has(n.id)) return;
            const isImportant =
                IMPORTANT_CATEGORIES.has(n.category) ||
                IMPORTANT_NTYPES_FOR_TOAST.has(n.ntype);
            if (!isImportant) return;
            const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(n.created_at || '');
            if (!m) return;
            const t = new Date(+m[3], +m[2]-1, +m[1], +m[4], +m[5]).getTime();
            if (now - t > 45000) {
                state.seenToastIds.add(n.id);   // mark seen แต่ไม่ toast (เก่าแล้ว)
                return;
            }
            showToast(n);
        });
    }

    // ── Poll & Refresh ────────────────────
    async function refresh() {
        try {
            const r = await fetch('/api/notifications', { credentials:'same-origin' });
            if (!r.ok) return;
            const data = await r.json();
            state.lastData = data;
            renderBadge(data);
            maybeShowToasts(data);
            if (state.panelOpen) {
                renderTabs(data);
                renderList(data);
            }
        } catch (e) { /* silent */ }
    }

    // ── Panel control ────────────────────
    function openPanel() {
        state.panelOpen = true;
        panel.classList.add('open');
        document.body.style.overflow = window.innerWidth < 768 ? 'hidden' : '';
        if (state.lastData) {
            renderTabs(state.lastData);
            renderList(state.lastData);
        }
        refresh();
    }
    function closePanel() {
        state.panelOpen = false;
        panel.classList.remove('open');
        document.body.style.overflow = '';
    }
    function togglePanel() {
        if (state.panelOpen) closePanel(); else openPanel();
    }

    // ── Event wiring ─────────────────────
    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanel();
    });

    document.addEventListener('click', (e) => {
        if (!state.panelOpen) return;
        if (window.innerWidth < 768) return;   // mobile ปิดด้วยปุ่ม back
        if (!panel.contains(e.target) && !bellBtn.contains(e.target)) closePanel();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.panelOpen) closePanel();
    });

    // Tabs
    tabsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.notif-tab');
        if (!btn) return;
        state.currentTab = btn.dataset.tab;
        renderTabs(state.lastData);
        renderList(state.lastData);
    });

    // Mark all
    if (markAllBtn) {
        markAllBtn.addEventListener('click', async () => {
            await fetch('/api/notifications/read-all', { method:'POST' });
            refresh();
        });
    }

    // List interactions (delegation)
    listEl.addEventListener('click', async (e) => {
        const head = e.target.closest('[data-act="toggle"]');
        if (head) {
            const group = head.closest('.notif-group');
            const bid = parseInt(group.dataset.booking, 10);
            if (state.expanded.has(bid)) state.expanded.delete(bid);
            else state.expanded.add(bid);
            group.classList.toggle('expanded');

            // mark-as-read หลัง 1.5 วิ ถ้ายัง expand
            if (group.classList.contains('expanded')) {
                setTimeout(async () => {
                    if (!state.expanded.has(bid)) return;
                    const ids = state.lastData?.groups
                        ?.find(g => g.booking_id === bid)?.items
                        ?.filter(it => !it.is_read && !it.is_sticky)
                        ?.map(it => it.id) || [];
                    for (const id of ids) {
                        fetch(`/api/notifications/${id}/read`, { method:'POST' }).catch(()=>{});
                    }
                    if (ids.length) setTimeout(refresh, 400);
                }, 1500);
            }
            return;
        }

        const openBooking = e.target.closest('[data-act="open-booking"]');
        if (openBooking) { return; /* native navigation */ }

        const singleCard = e.target.closest('[data-act="open-single"]');
        if (singleCard) {
            const id = parseInt(singleCard.dataset.id, 10);
            const item = (state.lastData?.loose || []).find(n => n.id === id);
            await fetch(`/api/notifications/${id}/read`, { method:'POST' }).catch(()=>{});
            if (item && item.action_url && item.action_url !== '#') {
                window.location.href = item.action_url;
            } else {
                refresh();
            }
        }
    });

    // Sticky section — "ฉันจ่ายแล้ว"
    stickyEl.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-act="report-paid"]');
        if (!btn) return;
        e.preventDefault();
        const bookingId = parseInt(btn.dataset.booking, 10);
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังส่ง...';
        try {
            const r = await fetch(`/api/payment/report-by-booking/${bookingId}`, { method:'POST' });
            if (r.ok) {
                const card = btn.closest('.notif-payment-card');
                card.querySelector('.notif-payment-actions').innerHTML =
                    `<div class="notif-payment-pending">
                        <i class="fa-regular fa-clock"></i> รอ Admin ยืนยันการชำระ
                     </div>`;
            } else {
                const data = await r.json().catch(() => ({}));
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> ฉันจ่ายแล้ว';
                alert(data.msg || 'เกิดข้อผิดพลาด');
            }
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> ฉันจ่ายแล้ว';
        }
    });

    // Mobile back button
    const mobileBack = document.getElementById('notifMobileBack');
    if (mobileBack) mobileBack.addEventListener('click', closePanel);

    // ── Start polling ─────────────────────
    refresh();
    setInterval(refresh, POLL_INTERVAL_MS);
}
