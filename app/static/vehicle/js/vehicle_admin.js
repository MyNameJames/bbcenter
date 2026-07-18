/* ══════════════════════════════════════════════════
   pages/vehicle-admin.js — Fleet Admin Redesign (ES module)
   Depends on: BOOKINGS_DATA, VEHICLES_DATA, DRIVERS_DATA,
               BUDGETS_DATA, PURPOSES_DATA, FUEL_PRICE, SERVER_NOW
══════════════════════════════════════════════════ */
import { initIcons } from '../../core/js/icons.js';

/* ── Constants ────────────────────────────────── */
const EN_DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const TH_DAYS_S = ['อา','จ','อ','พ','พฤ','ศ','ส'];
const TH_DAYS_F = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const TH_MON_F  = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                   'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const TH_MON_S  = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                   'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

/* STATUS_ICON — merged map (Phase A 2026-05-24 extended `.cls` for `.bl-icon--*`) */
const STATUS_ICON = {
    pending:          { dot:'pending',  icon:'clock',        cls:'bl-icon--pending' },
    waiting_approver: { dot:'approver', icon:'send',         cls:'bl-icon--approver' },
    forwarded:        { dot:'approver', icon:'send',         cls:'bl-icon--approver' },
    approved:         { dot:'approved', icon:'circle-check', cls:'bl-icon--approved' },
    rejected:         { dot:'rejected', icon:'x-circle',     cls:'bl-icon--rejected' },
};

const STATUS_BADGE = {
    pending:          { cls:'is-wr',   label:'รออนุมัติ' },
    waiting_approver: { cls:'is-info', label:'ส่ง Approver' },
    forwarded:        { cls:'is-info', label:'ส่ง Approver' },
    approved:         { cls:'is-ok',   label:'อนุมัติแล้ว' },
    rejected:         { cls:'is-dg',   label:'ปฏิเสธ' },
};

/* ── State ────────────────────────────────────── */
const bookings  = [...(window.BOOKINGS_DATA  || [])];
const vehicles  = [...(window.VEHICLES_DATA  || [])];
const drivers   = [...(window.DRIVERS_DATA   || [])];
const budgets   = window.BUDGETS_DATA   || { central:[], department:[] };
const fuelPrice = window.FUEL_PRICE     || 0;

const serverNow = window.SERVER_NOW ? new Date(window.SERVER_NOW) : new Date();
const today     = new Date(serverNow.getFullYear(), serverNow.getMonth(), serverNow.getDate());

/* ── Number count-up animation (Phase 1 redesign, 2026-05-24)
   นับ 0→target ด้วย ease-out cubic, 600ms. ใช้กับ inline stat ใน page header */
const _statRaf = new Map();
function setStat(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = parseInt(el.textContent, 10) || 0;
    target = Number(target) || 0;
    if (start === target) { el.textContent = target; return; }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        el.textContent = target;
        return;
    }
    if (_statRaf.has(id)) cancelAnimationFrame(_statRaf.get(id));
    const t0 = performance.now();
    const dur = 600;
    const diff = target - start;
    const tick = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(start + diff * eased);
        if (t < 1) _statRaf.set(id, requestAnimationFrame(tick));
        else _statRaf.delete(id);
    };
    _statRaf.set(id, requestAnimationFrame(tick));
}

let selDate    = new Date(today);
let curFilter  = 'all';
let groupMode  = false;
let groupSel   = new Set();
let notifyMode = false;
let notifySel  = new Set();

let activeBookingId  = null;
let activeGroupName  = null;
let modalAction      = 'approve';
let modalExpType     = 'central';
let swapBookingId    = null;
let swapVehicleId    = null;
let repairVehicleId  = null;
let revertBookingId  = null;
let isSaving         = false;

/* ── Helpers ──────────────────────────────────── */
function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fromDateStr(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function fmtBaht(n) { return '฿' + Number(n).toLocaleString('th-TH',{minimumFractionDigits:0,maximumFractionDigits:0}); }
function fmtNum(n)  { return Number(n).toLocaleString('th-TH'); }

function patchBooking(id, changes) {
    const idx = bookings.findIndex(b => b.id === id);
    if (idx >= 0) Object.assign(bookings[idx], changes);
}
function patchVehicle(id, changes) {
    const idx = vehicles.findIndex(v => v.id === id);
    if (idx >= 0) Object.assign(vehicles[idx], changes);
}

/* ── Resource usage helpers ───────────────────── */
const ACTIVE_STATUSES = new Set(['approved', 'waiting_approver', 'forwarded']);

function driverDayCount(driverId, dateStr, excludeBookingId) {
    return bookings.filter(x =>
        x.driverId === driverId &&
        x.startIso && x.startIso.startsWith(dateStr) &&
        ACTIVE_STATUSES.has(x.status) &&
        x.id !== excludeBookingId
    ).length;
}

function findConflict(b, resourceKey, resourceId) {
    if (!b || !resourceId) return null;
    const rid = parseInt(resourceId);
    return bookings.find(x =>
        x.id !== b.id &&
        x[resourceKey] === rid &&
        ACTIVE_STATUSES.has(x.status) &&
        x.startIso < b.endIso &&
        x.endIso > b.startIso
    ) || null;
}

/* ══════════════════════════════════════════════════
   WEEK NAVIGATION — bb-* component (WeekStrip)
   ตัว strip/prev-next/badge จัดการเองใน core/js/bb-components.js
   หน้านี้แค่ฟัง event 'bb-weekstrip:change' แล้ว sync selDate + re-render
══════════════════════════════════════════════════ */
function renderWeekMeta() {
    const dow = selDate.getDay();
    // aria-label ปุ่ม datepicker สั้น: "อา. 7 มิ.ย. 2569"
    const dayLine = `${TH_DAYS_S[dow]}. ${selDate.getDate()} ${TH_MON_S[selDate.getMonth()+1]} ${selDate.getFullYear()+543}`;
    const dpBtn = document.querySelector('#weekJumpDp [data-bb-dp-btn]');
    if (dpBtn) dpBtn.setAttribute('aria-label', dayLine);
}

/* บังคับ WeekStrip กระโดดไปสัปดาห์ของ iso (ใช้ตอนเลือกวันจาก DatePicker #weekJumpDp)
   component ไม่มี public API เปลี่ยนวันจากนอก → clone node ใหม่ (ไม่ติด listener ซ้ำ) + reinit */
function jumpWeekStrip(iso) {
    const old = document.querySelector('[data-bb-weekstrip]');
    if (!old) return;
    const fresh = old.cloneNode(true);
    fresh.dataset.value = iso;
    delete fresh.dataset.bbWsInit;
    const input = fresh.querySelector('[data-bb-ws-input]');
    if (input) input.value = iso;
    old.replaceWith(fresh);
    // init(scope) ใช้ querySelectorAll (หาแค่ descendant) — ต้องส่ง parent ไม่ใช่ fresh เอง
    // (fresh มี data-bb-weekstrip อยู่ที่ตัวมันเอง ไม่ใช่ลูก) ไม่งั้น initWeekStrip ไม่ถูกเรียก
    window.bbComponents?.init(fresh.parentElement);
    initIcons();
}

function bindDateControls() {
    document.addEventListener('bb-weekstrip:change', (e) => {
        selDate = fromDateStr(e.detail.date);
        renderWeekMeta();
        renderBefore();
        renderDuring();
        initIcons();
    });

    const jumpDp = document.getElementById('weekJumpDp');
    if (jumpDp) {
        jumpDp.addEventListener('bb-datepicker:change', (e) => {
            const iso = e.detail.date || toDateStr(today);
            selDate = fromDateStr(iso);
            jumpWeekStrip(iso);
            renderWeekMeta();
            renderBefore();
            renderDuring();
            initIcons();
        });
    }
}

/* ══════════════════════════════════════════════════
   SECTION ก่อน — BOOKING LIST
══════════════════════════════════════════════════ */
function renderBefore() {
    const ds     = toDateStr(selDate);
    const allDay = bookings.filter(b => b.startIso.startsWith(ds));

    const cnt = {
        all:              allDay.length,
        pending:          allDay.filter(b => b.status==='pending').length,
        waiting_approver: allDay.filter(b => b.status==='waiting_approver'||b.status==='forwarded').length,
        approved:         allDay.filter(b => b.status==='approved').length,
        rejected:         allDay.filter(b => b.status==='rejected').length,
    };

    setTabCount('all',              cnt.all);
    setTabCount('pending',          cnt.pending);
    setTabCount('waiting_approver', cnt.waiting_approver);
    setTabCount('approved',         cnt.approved);
    setTabCount('rejected',         cnt.rejected);

    const headerCountEl = document.getElementById('beforeCount');
    if (headerCountEl) {
        headerCountEl.textContent = cnt.all > 0 ? `${cnt.all} รายการ` : '';
    }

    setStat('statPending',  cnt.pending);
    setStat('statApprover', cnt.waiting_approver);
    setStat('statApproved', cnt.approved);

    let filtered = [...allDay];
    if (curFilter !== 'all') {
        filtered = filtered.filter(b => {
            if (curFilter==='waiting_approver') return b.status==='waiting_approver'||b.status==='forwarded';
            return b.status === curFilter;
        });
    }

    const list = document.getElementById('bookingList');

    if (!filtered.length) {
        list.innerHTML = `<div class="bb-empty">
            <div class="bb-empty-icon"><i data-lucide="car"></i></div>
            <div class="bb-empty-title">ไม่มีรายการจองรถ</div>
        </div>`;
        initIcons();
        return;
    }

    const rendered = new Set();
    const items    = [];

    filtered.forEach(b => {
        if (b.tripGroup && !rendered.has(b.tripGroup)) {
            const members = allDay.filter(x => x.tripGroup === b.tripGroup);
            members.forEach(x => rendered.add(x.tripGroup));
            items.push({ type:'group', name:b.tripGroup, members });
        } else if (!b.tripGroup) {
            items.push({ type:'single', booking:b });
        }
    });

    list.innerHTML = items.map((item, i) =>
        item.type === 'group'
            ? renderGroupRow(item.name, item.members, i)
            : renderSingleRow(item.booking, i)
    ).join('');
    initIcons();
}

/* งบที่อนุมัติ → label "ประเภท-หมวด" (null = ยังไม่จัดสรร) */
function budgetLabel(b) {
    if (b.expType === 'department') return b.expSub ? `ส่วนกอง-${b.expSub}` : 'ส่วนกอง';
    if (b.expType === 'central')    return b.expSub ? `ส่วนกลาง-${b.expSub}` : 'ส่วนกลาง';
    if (b.expType === 'personal')   return 'ส่วนตัว';
    return null;
}

function renderSingleRow(b, idx = 0) {
    const sb  = STATUS_BADGE[b.status] || STATUS_BADGE.pending;

    const isSelectable       = groupMode  && b.status === 'pending';
    const isNotifySelectable = notifyMode && b.status === 'approved';
    const isSel       = groupSel.has(b.id);
    const isNotifySel = notifySel.has(b.id);

    const actions = buildRowActions(b);
    const defaultClick = !groupMode && !notifyMode
        ? `onclick="openAdminBookingDetail(${b.id})"` : '';

    /* 3-line layout — head(ชื่อผู้จอง | status) + trip(purpose → dest) + foot(badges | actions) */
    const bookerName  = esc(b.booker || '—');
    const purposeText = esc(b.purpose || '—');
    const destText    = esc(b.dest || '—');

    const statusBadge = `<span class="bb-status ${sb.cls}"><span class="bb-dot"></span>${sb.label}</span>`;

    /* badge 1 — ช่วงเวลาเดินทาง */
    const timeText  = b.start ? `${esc(b.start)}${b.end ? `–${esc(b.end)}` : ''}` : '';
    const timeBadge = timeText
        ? `<span class="bb-badge is-neutral"><i data-lucide="clock"></i>${timeText}</span>` : '';

    /* badge 2 — ผู้โดยสาร */
    const paxBadge = `<span class="bb-badge is-neutral"><i data-lucide="users"></i>${b.pax || 0}</span>`;

    /* badge 3 — งบที่อนุมัติ (ยังไม่จัดสรร → amber เตือน ผ่าน token ตรง) */
    const budget = budgetLabel(b);
    const budgetBadge = budget
        ? `<span class="bb-badge is-neutral"><i data-lucide="wallet"></i>${esc(budget)}</span>`
        : `<span class="bb-badge" style="background:var(--bb-wr-bg);color:var(--bb-wr-tx)"><i data-lucide="wallet"></i>ยังไม่ได้จัดสรรงบ</span>`;

    /* badge 4 — งานนอกระบบ (driver เพิ่มเอง) */
    const adhocBadge = b.isAdHoc
        ? `<span class="bb-badge is-accent"><i data-lucide="user-plus"></i>งานนอกระบบ</span>`
        : '';

    const actionsZone = actions
        ? `<div class="d-flex gap-2 flex-wrap" onclick="event.stopPropagation()">${actions}</div>` : '';

    /* checkbox slot — visible only on selectable rows */
    const checkboxSlot = isSelectable
        ? `<input type="checkbox" class="form-check-input mt-1 flex-shrink-0" ${isSel?'checked':''} onclick="event.stopPropagation();toggleGroupSel(${b.id})" aria-label="เลือกเพื่อรวมงาน">`
        : isNotifySelectable
        ? `<input type="checkbox" class="form-check-input mt-1 flex-shrink-0" ${isNotifySel?'checked':''} onclick="event.stopPropagation();toggleNotifySel(${b.id})" aria-label="เลือกเพื่อแจ้ง">`
        : '';

    /* selected/notify-selected highlight — inline style ผูก token ตรง (ไม่มี bb-card variant สำหรับ state นี้) */
    const highlightStyle = isSel
        ? 'border-color:var(--bb-accent-i);background:var(--bb-accent-bg);'
        : isNotifySel
        ? 'border-color:var(--bb-info);background:var(--bb-info-bg);'
        : '';
    const cursorStyle = (isSelectable || isNotifySelectable) ? 'cursor:pointer;' : '';

    return `
    <div class="bb-card p-3 mb-2 d-flex gap-2 align-items-start"
         id="blrow-${b.id}"
         style="${highlightStyle}${cursorStyle}"
         ${isSelectable ? `onclick="toggleGroupSel(${b.id})"` : isNotifySelectable ? `onclick="toggleNotifySel(${b.id})"` : defaultClick}>
        ${checkboxSlot}
        <div class="flex-grow-1" style="min-width:0">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                <span class="fw-semibold" style="color:var(--bb-str)">${bookerName}</span>
                ${statusBadge}
            </div>
            <div class="d-flex align-items-center gap-2 mb-2 flex-wrap" style="font-size:.875rem;color:var(--bb-mut)">
                <span>${purposeText}</span>
                <i data-lucide="arrow-right" style="width:.875rem;height:.875rem;flex-shrink:0"></i>
                <span>${destText}</span>
            </div>
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div class="d-flex flex-wrap gap-2">
                    ${timeBadge}
                    ${paxBadge}
                    ${budgetBadge}
                    ${adhocBadge}
                </div>
                ${actionsZone}
            </div>
        </div>
    </div>`;
}

function buildRowActions(b) {
    if (groupMode || notifyMode) return '';
    const stop = 'event.stopPropagation();';
    switch (b.status) {
        case 'pending':
            /* Desktop: approve + reject pair; mobile: reject hidden (d-none d-md-inline-flex) */
            return `
                <button type="button" class="bb-btn is-pri is-sm" title="อนุมัติ" onclick="${stop}openAssignModal(${b.id},'approve')">
                    <i data-lucide="pencil"></i>
                    อนุมัติ
                </button>
                <button type="button" class="bb-btn is-sec is-icon is-sm d-none d-md-inline-flex" title="ปฏิเสธ" onclick="${stop}openAssignModal(${b.id},'reject')">
                    <i data-lucide="circle-x"></i>
                </button>`;
        case 'waiting_approver':
        case 'forwarded':
            /* Admin can edit assignment at any status — even after forwarding to approver */
            return `
                <button type="button" class="bb-btn is-ghost is-icon is-sm" title="แก้ไข" onclick="${stop}openAssignModal(${b.id},'edit')">
                    <i data-lucide="pencil"></i>
                </button>`;
        case 'approved':
            return `
                <button type="button" class="bb-btn is-ghost is-icon is-sm" title="แก้ไข" onclick="${stop}openAssignModal(${b.id},'edit')">
                    <i data-lucide="pencil"></i>
                </button>
                <button type="button" class="bb-btn is-ghost is-icon is-sm d-none d-md-inline-flex" title="ย้อนสถานะ" onclick="${stop}openRevertModal(${b.id})">
                    <i data-lucide="rotate-cw"></i>
                </button>`;
        case 'rejected':
            return '';
        default:
            return '';
    }
}

function renderGroupRow(grpName, members, idx = 0) {
    const totalPax = members.reduce((s,b)=>s+b.pax,0);
    const times    = [...new Set(members.map(b=>b.start))].join(', ');
    const rep      = members[0];
    const vLabel   = rep.vehicleLabel ? rep.vehicleLabel.split(' · ').pop() : 'ยังไม่กำหนดรถ';
    const colId    = `grpbody-${grpName.replace(/[^a-z0-9]/gi,'')}`;

    const approvedMembers    = members.filter(b => b.status === 'approved');
    const isGrpNotifySelectable = notifyMode && approvedMembers.length > 0;
    const isGrpNotifySel        = isGrpNotifySelectable && approvedMembers.every(b => notifySel.has(b.id));

    const titleBadge = `<span class="bb-status is-ok"><span class="bb-dot"></span>${members.length} งานรวม</span>`;
    const grpCheckboxSlot = isGrpNotifySelectable
        ? `<input type="checkbox" class="form-check-input mt-1 flex-shrink-0" ${isGrpNotifySel?'checked':''} onclick="event.stopPropagation();toggleGroupNotifySel('${grpName}')" aria-label="เลือกกลุ่มเพื่อแจ้ง">`
        : '';

    /* sub-rows = destination title + meta (pax · time · booker), no per-row ungroup (header only) */
    const subItems = members.map(b => `
        <div class="d-flex align-items-center gap-2 py-2" style="border-top:1px solid var(--bb-n200)">
            <div class="flex-grow-1" style="min-width:0">
                <div class="fw-semibold text-truncate" style="font-size:.8125rem;color:var(--bb-str)">${esc(b.dest || b.booker)}</div>
                <div class="d-flex align-items-center flex-wrap gap-1" style="font-size:.75rem;color:var(--bb-mut)">
                    <span class="d-inline-flex align-items-center gap-1"><i data-lucide="users" style="width:.75rem;height:.75rem"></i>${b.pax}</span>
                    <span>·</span>
                    <span>${esc(b.start)}</span>
                    <span>·</span>
                    <span class="text-truncate">${esc(b.booker)}</span>
                </div>
            </div>
        </div>`).join('');

    const grpTimeBadge = times
        ? `<span class="bb-badge is-neutral"><i data-lucide="clock"></i>${esc(times)}</span>` : '';
    const grpPaxBadge = `<span class="bb-badge is-neutral"><i data-lucide="users"></i>${totalPax}</span>`;

    const grpHighlightStyle = isGrpNotifySel ? 'border-color:var(--bb-info);background:var(--bb-info-bg);' : '';

    return `
    <div class="bb-card p-3 mb-2 d-flex gap-2 align-items-start"
         id="blgrp-${grpName}"
         style="${grpHighlightStyle}${isGrpNotifySelectable?'cursor:pointer;':''}"
         ${isGrpNotifySelectable ? `onclick="toggleGroupNotifySel('${grpName}')"` : ''}>
        ${grpCheckboxSlot}
        <div class="flex-grow-1" style="min-width:0">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                <span class="fw-semibold" style="color:var(--bb-str)">${esc(vLabel)}</span>
                ${titleBadge}
            </div>
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div class="d-flex flex-wrap gap-2">
                    ${grpTimeBadge}
                    ${grpPaxBadge}
                </div>
                <div class="d-flex gap-2" onclick="event.stopPropagation()">
                    <button type="button" class="bb-btn is-ghost is-icon is-sm" onclick="ungroupAll('${grpName}')" title="แยกงานทั้งหมด">
                        <i data-lucide="shuffle"></i>
                    </button>
                    <button type="button" class="bb-btn is-ghost is-icon is-sm" onclick="openAssignModal(null,'group','${grpName}')" title="แก้ไขกลุ่ม">
                        <i data-lucide="pencil"></i>
                    </button>
                    <button type="button" class="bb-btn is-ghost is-icon is-sm"
                            data-bs-toggle="collapse"
                            data-bs-target="#${colId}"
                            aria-expanded="false"
                            onclick="event.stopPropagation()"
                            title="ขยาย/ย่อ">
                        <i data-lucide="chevron-down"></i>
                    </button>
                </div>
            </div>
            <div class="collapse" id="${colId}">
                <div class="mt-2 pt-2" style="border-top:1px solid var(--bb-n200)">
                    ${subItems}
                </div>
            </div>
        </div>
    </div>`;
}

/* Filter tabs — bb-* component (Tabs) ไม่มี auto-init JS ของตัวเอง
   macro ออก data-tab (ไม่ใช่ data-filter) — bind เองแบบเดียวกับ vehicle_mileage.js */
function setTabCount(value, n) {
    const el = document.querySelector(`#adminTabsWrap .bb-tab[data-tab="${value}"] .bb-tab-count`);
    if (el) el.textContent = n;
}

function bindFilterTabs() {
    document.querySelectorAll('#adminTabsWrap .bb-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            curFilter = btn.dataset.tab || 'all';
            document.querySelectorAll('#adminTabsWrap .bb-tab').forEach(c => c.classList.toggle('is-on', c === btn));
            renderBefore();
        });
    });
}

/* ── Group Mode ───────────────────────────────── */
function toggleGroupMode() {
    groupMode = true; groupSel.clear();
    document.getElementById('btnMerge').style.display        = 'none';
    document.getElementById('btnNotify').style.display       = 'none';
    document.getElementById('btnMergeCancel').style.display  = 'inline-flex';
    document.getElementById('btnMergeConfirm').style.display = 'inline-flex';
    updateMergeBtn();
    renderBefore();
}

function cancelGroupMode() {
    groupMode = false; groupSel.clear();
    document.getElementById('btnMerge').style.display        = '';
    document.getElementById('btnNotify').style.display       = '';
    document.getElementById('btnMergeCancel').style.display  = 'none';
    document.getElementById('btnMergeConfirm').style.display = 'none';
    renderBefore();
}

function toggleGroupSel(id) {
    if (groupSel.has(id)) groupSel.delete(id); else groupSel.add(id);
    updateMergeBtn();
    renderBefore();
}

function updateMergeBtn() {
    const btn = document.getElementById('btnMergeConfirm');
    btn.textContent = `รวม (${groupSel.size})`;
    btn.disabled = groupSel.size < 2;
}

function confirmMerge() {
    if (groupSel.size < 2) return;
    activeGroupName  = null;
    activeBookingId  = null;
    openAssignModal(null, 'group_new');
}

/* ── Notify Mode ──────────────────────────────── */
function toggleNotifyMode() {
    notifyMode = true; notifySel.clear();
    document.getElementById('btnMerge').style.display         = 'none';
    document.getElementById('btnNotify').style.display        = 'none';
    document.getElementById('btnNotifyCancel').style.display  = 'inline-flex';
    document.getElementById('btnNotifyConfirm').style.display = 'inline-flex';
    updateNotifyBtn();
    renderBefore();
}

function cancelNotifyMode() {
    notifyMode = false; notifySel.clear();
    document.getElementById('btnMerge').style.display         = '';
    document.getElementById('btnNotify').style.display        = '';
    document.getElementById('btnNotifyCancel').style.display  = 'none';
    document.getElementById('btnNotifyConfirm').style.display = 'none';
    renderBefore();
}

function toggleNotifySel(id) {
    if (notifySel.has(id)) notifySel.delete(id); else notifySel.add(id);
    updateNotifyBtn();
    renderBefore();
}

function toggleGroupNotifySel(grpName) {
    const group = bookings.filter(b => b.tripGroup === grpName && b.status === 'approved');
    if (!group.length) return;
    const allSelected = group.every(b => notifySel.has(b.id));
    group.forEach(b => allSelected ? notifySel.delete(b.id) : notifySel.add(b.id));
    updateNotifyBtn();
    renderBefore();
}

function updateNotifyBtn() {
    const btn = document.getElementById('btnNotifyConfirm');
    btn.textContent = `แจ้ง (${notifySel.size})`;
    btn.disabled = notifySel.size < 1;
}

async function confirmNotify() {
    if (notifySel.size < 1) return;
    const ids = [...notifySel];
    let ok = 0, fail = 0;
    for (const id of ids) {
        try {
            const res = await fetch(`/vehicle/admin/booking/${id}/notify`, { method: 'POST' });
            if (res.ok) ok++; else fail++;
        } catch { fail++; }
    }
    cancelNotifyMode();
    showToast(fail === 0 ? `✓ แจ้ง Telegram ${ok} รายการแล้ว` : `แจ้งสำเร็จ ${ok}, ล้มเหลว ${fail}`);
}

/* ══════════════════════════════════════════════════
   SECTION ขณะ — VEHICLE STATUS + TRIP DETAIL (รวมจาก
   เดิม SECTION หลัง/tripList — ลบการ์ดแยกแล้ว 2026-07,
   ย้าย mileage/cost/OT/payment มารวมในนี้แทน)
══════════════════════════════════════════════════ */
function renderDuring() {
    const ds     = toDateStr(selDate);
    const allDay = bookings.filter(b => b.startIso.startsWith(ds) && b.status==='approved');
    const list   = document.getElementById('vehicleList');

    list.innerHTML = vehicles.map(v => renderVehicleRow(v, allDay)).join('');
}

/* tag งบ สำหรับ fuel/OT badge (personal = เรียกเก็บ) */
function tripBudgetTag(expType) {
    if (expType === 'central')    return 'หักงบส่วนกลาง';
    if (expType === 'department') return 'หักงบส่วนกอง';
    return 'เรียกเก็บ';
}

/* กรุ๊ป booking ของรถคันเดียวในวันเดียว → ตาม tripGroup (merge ยุบเป็น 1 งาน) */
function groupVehicleJobs(v, approvedToday) {
    const mine   = approvedToday.filter(b => b.vehicleId === v.id);
    const groups = [];
    const seen   = new Set();
    for (const b of mine) {
        if (!b.tripGroup) {
            groups.push([b]);
        } else if (!seen.has(b.tripGroup)) {
            seen.add(b.tripGroup);
            groups.push(mine.filter(x => x.tripGroup === b.tripGroup));
        }
    }
    return groups;
}

function renderVehicleRow(v, approvedToday) {
    if (v.dbStatus === 'maintenance') {
        const note = v.repairNote ? esc(v.repairNote) : 'ไม่ระบุอาการ';
        return `
        <div class="d-flex gap-3 bb-buy-item">
            <div class="bb-buy-thumb is-wr flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center"><i data-lucide="wrench"></i></div>
            <div class="flex-grow-1 min-w-0">
                <div class="fw-bold">${esc(v.plate)}</div>
                <div class="d-flex align-items-center gap-2 small text-muted mt-1">
                    <span>สถานะ :</span><span class="bb-badge" style="background:var(--bb-wr-bg);color:var(--bb-wr-tx)">กำลังซ่อม</span>
                </div>
                <div class="text-muted small mt-1">ดำเนินการ : ${note}</div>
            </div>
        </div>`;
    }

    const jobs = groupVehicleJobs(v, approvedToday);

    if (!jobs.length) {
        return `
        <div class="d-flex gap-3 bb-buy-item">
            <div class="bb-buy-thumb flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center"><i data-lucide="car"></i></div>
            <div class="flex-grow-1 min-w-0">
                <div class="fw-bold">${esc(v.plate)}</div>
                <div class="d-flex align-items-center gap-2 small text-muted mt-1">
                    <span>สถานะ :</span><span class="bb-badge" style="background:var(--bb-ok-bg);color:var(--bb-ok-tx)">ว่าง</span>
                </div>
                <div class="text-muted small mt-1">เลขไมล์ : -</div>
            </div>
        </div>`;
    }

    const isMulti  = jobs.length > 1;
    const plateRow = isMulti ? `<div class="fw-bold mb-2">${esc(v.plate)}</div>` : '';
    const body     = jobs.map((g, i) => renderVehicleJobBlock(v, g, i, jobs.length, isMulti)).join('');

    return `
    <div class="d-flex gap-3 bb-buy-item">
        <div class="bb-buy-thumb is-ok flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center"><i data-lucide="car"></i></div>
        <div class="flex-grow-1 min-w-0">
            ${plateRow}${body}
        </div>
    </div>`;
}

/* งานของรถคันนี้ในวันที่เลือก — 1 คันมี 0-N งาน (merge/tripGroup ยุบเป็น 1 งาน) */
function renderVehicleJobBlock(v, group, idx, total, isMulti) {
    const b = group[0];

    const bm      = group.find(x => x.odoStart !== null && x.odoEnd !== null) || b;
    const started = bm.odoStart !== null;                       // ออกเลขเริ่มแล้ว
    const hasOdo  = bm.odoStart !== null && bm.odoEnd !== null;  // ปิดงานแล้ว
    const dist    = hasOdo ? (bm.odoEnd - bm.odoStart) : 0;

    const fuelRate = Number(v.fuelRate) || 0;
    const override = Number(bm.fuelCost) || 0;
    const autoCost = (hasOdo && fuelRate > 0)
                     ? Math.round((dist / fuelRate) * fuelPrice * 100) / 100
                     : 0;
    const cost     = hasOdo ? (override > 0 ? override : autoCost) : 0;
    const otA      = Number(bm.otAmount) || 0;

    const budgetTag = tripBudgetTag(b.expType);
    const isCharge  = b.expType === 'personal';

    /* สี badge: สิ้นสุดการเดินทาง/ออกเดินทางแล้ว = ฟ้า (ตั้งใจให้เหมือนกัน), อนุมัติแล้ว = เหลือง */
    let badgeVar, stLabel;
    if (hasOdo)       { badgeVar = 'info'; stLabel = 'สิ้นสุดการเดินทาง'; }
    else if (started) { badgeVar = 'info'; stLabel = 'ออกเดินทางแล้ว'; }
    else              { badgeVar = 'wr';   stLabel = 'อนุมัติแล้ว'; }

    /* มุมขวา header — จบงานแล้ว = payment, ยังไม่จบ = เวลาเดินทาง */
    let actionHtml;
    if (hasOdo) {
        if (isCharge) {
            actionHtml = bm.personalStatus === 1
                ? `<span class="text-muted small flex-shrink-0">จ่ายแล้ว${bm.personalPaidAt ? ` · ${esc(bm.personalPaidAt)}` : ''}</span>`
                : `<button type="button" class="bb-btn is-sec is-sm flex-shrink-0" onclick="event.stopPropagation();markPaid(${bm.mileageId}, ${bm.id})" title="ยืนยันการชำระเงินจากผู้จอง"><i data-lucide="wallet"></i>เรียกเก็บ</button>`;
        } else {
            actionHtml = `<span class="text-muted small flex-shrink-0">${esc(budgetTag)}</span>`;
        }
    } else {
        actionHtml = `<span class="text-muted small flex-shrink-0">${esc(b.start)}–${esc(b.end)}</span>`;
    }

    const mileageLine = hasOdo
        ? `<div class="text-muted small mt-1">เลขไมล์ : <span class="bb-num">${fmtNum(bm.odoStart)} → ${fmtNum(bm.odoEnd)}</span> · <span class="bb-num">${fmtNum(dist)}</span> กม.</div>`
        : started
        ? `<div class="text-muted small mt-1">เลขไมล์ : <span class="bb-num">${fmtNum(bm.odoStart)}</span> → (ยังไม่สิ้นสุดการเดินทาง)</div>`
        : `<div class="text-muted small mt-1">เลขไมล์ : -</div>`;

    const costLine = hasOdo
        ? `<div class="text-muted small">รวมค่าใช้จ่าย : ${fmtNum(cost)} บาท${otA > 0 ? ` <span class="bb-badge" style="background:var(--bb-wr-bg);color:var(--bb-wr-tx)">OT: ${fmtNum(otA)} บาท</span>` : ''}</div>`
        : '';

    const headerLeft = isMulti
        ? `<div class="text-muted small">งานที่ ${idx + 1}</div>`
        : `<div class="fw-bold">${esc(v.plate)}</div>`;
    const alignCls = isMulti ? 'align-items-center' : 'align-items-start';
    const wrapCls  = isMulti && idx < total - 1 ? 'mb-3' : '';

    return `
    <div class="${wrapCls}">
        <div class="d-flex justify-content-between ${alignCls} gap-2">
            ${headerLeft}
            ${actionHtml}
        </div>
        <div class="d-flex align-items-center gap-2 small text-muted mt-1">
            <span>สถานะ :</span><span class="bb-badge" style="background:var(--bb-${badgeVar}-bg);color:var(--bb-${badgeVar}-tx)">${stLabel}</span>
        </div>
        ${mileageLine}
        ${costLine}
    </div>`;
}

/* ══════════════════════════════════════════════════
   APPROVE/ASSIGN MODAL
══════════════════════════════════════════════════ */
let bsAssignModal, bsSwapModal, bsRepairModal, bsRevertModal;

function openAssignModal(bookingId, action, groupName) {
    activeBookingId = bookingId;
    activeGroupName = groupName || null;
    modalAction     = action;

    const b = bookingId ? bookings.find(x=>x.id===bookingId) : null;

    let title = 'อนุมัติการจอง (เลือกคนขับและรถ)';
    let sub   = '';
    if (action==='reject')    title = 'Reject Booking';
    if (action==='edit')      title = 'Edit Assignment';
    if (action==='group_new') title = `Merge ${groupSel.size} Bookings`;
    if (action==='group')     title = `Edit Group`;

    if (b) sub = `${b.dest} · ${b.start}–${b.end} · ${b.booker}`;
    if (groupName) {
        const members = bookings.filter(x=>x.tripGroup===groupName);
        sub = `${members.length} รายการ · ${members.reduce((s,x)=>s+x.pax,0)} คน`;
    }

    document.getElementById('assignModalTitle').textContent = title;
    document.getElementById('assignModalSub').textContent   = sub;

    const vSel = document.getElementById('modalVehSel');
    vSel.innerHTML = '<option value="">Choose vehicle</option>' +
        vehicles.filter(v=>v.dbStatus==='active').map(v =>
            `<option value="${v.id}" ${b&&b.vehicleId===v.id?'selected':''}>${v.brand} ${v.model} · ${v.plate}</option>`
        ).join('');

    const dSel = document.getElementById('modalDrvSel');
    const dayStr = b ? b.startIso.slice(0,10) : toDateStr(selDate);
    dSel.innerHTML = '<option value="">— เลือกคนขับ —</option>' +
        drivers.map(d => {
            const n = driverDayCount(d.id, dayStr, b?.id);
            const suffix = n > 0 ? `  •  ${n} งานวันนี้` : '';
            return `<option value="${d.id}" ${b&&b.driverId===d.id?'selected':''}>${d.label}${suffix}</option>`;
        }).join('');

    modalExpType = (b?.expType) || 'central';
    document.querySelectorAll('#modalExpTabs .bb-seg-btn').forEach(t => {
        t.classList.toggle('is-on', t.dataset.type === modalExpType);
    });
    updateExpSubDropdown(b);

    document.getElementById('assignConfirmBtn').disabled = true;
    checkAssignReady();

    bsAssignModal = bsAssignModal || new bootstrap.Modal(document.getElementById('assignModal'));
    bsAssignModal.show();
}

function setModalExpType(type, el) {
    modalExpType = type;
    document.querySelectorAll('#modalExpTabs .bb-seg-btn').forEach(t=>t.classList.remove('is-on'));
    if (el) el.classList.add('is-on');
    updateExpSubDropdown(null);
    updateModalBudget();
    checkAssignReady();
}

function updateExpSubDropdown(b) {
    const sub         = document.getElementById('modalExpSubSel');
    const approverEl  = document.getElementById('modalApproverInfo');
    const approverName= document.getElementById('modalApproverName');
    if (modalExpType === 'personal') {
        sub.style.display         = 'none';
        approverEl.style.display  = 'none';
        document.getElementById('modalBudgetBar').style.display = 'none';
        return;
    }
    sub.style.display = 'block';
    const list    = budgets[modalExpType] || [];
    const prevKey = b ? b.expSub : sub.value;
    sub.innerHTML = '<option value="">— เลือกหมวด —</option>' +
        list.map(x => `<option value="${x.key}" ${x.key===prevKey?'selected':''}>${x.label}</option>`).join('');

    const selKey = sub.value;
    if (modalExpType === 'department' && selKey) {
        const entry = list.find(x => x.key === selKey);
        approverName.textContent  = entry?.approver ? ` ${entry.approver}` : ' ยังไม่ได้ตั้งผู้อนุมัติ';
        approverName.style.color  = entry?.approver ? '' : 'var(--bb-wr)';
        approverEl.style.display  = 'flex';
    } else {
        approverEl.style.display = 'none';
    }

    updateModalBudget();
}

function updateModalBudget() {
    const sub  = document.getElementById('modalExpSubSel');
    const bar  = document.getElementById('modalBudgetBar');
    const warn = document.getElementById('modalBudgetWarn');
    const fill = document.getElementById('modalBudgetFill');
    if (!sub.value || modalExpType==='personal') { bar.style.display='none'; return; }
    const list = budgets[modalExpType]||[];
    const entry= list.find(x=>x.key===sub.value);
    if (!entry||!entry.total) { bar.style.display='none'; return; }
    const rem    = entry.total - entry.used;
    const usedPct= Math.min(entry.total>0?(entry.used/entry.total)*100:0, 100);
    const remPct = entry.total>0 ? (Math.max(rem,0)/entry.total)*100 : 0;

    let tone = 'ok';
    if (rem <= 0)         tone = 'danger';
    else if (remPct < 10) tone = 'danger';
    else if (remPct < 20) tone = 'warn';

    const toneColor = { ok:'var(--bb-ok)', warn:'var(--bb-wr)', danger:'var(--bb-dg)' }[tone];
    fill.style.background = toneColor;

    document.getElementById('modalBudgetLabel').textContent = 'งบคงเหลือ';
    document.getElementById('modalBudgetValue').textContent = `${fmtNum(rem)} / ${fmtNum(entry.total)} บ.`;
    fill.style.width = `${usedPct}%`;

    if (warn) {
        if (tone === 'ok') {
            warn.hidden = true;
        } else {
            warn.hidden = false;
            warn.style.color = toneColor;
            warn.textContent = rem <= 0
                ? `งบหมดแล้ว (${fmtNum(rem)} บ.) — อาจติดลบหลังบันทึก`
                : `งบเหลือน้อย (${remPct.toFixed(0)}% · ${fmtNum(rem)} บ.)`;
        }
    }
    bar.style.display = 'block';
}

function checkAssignReady() {
    const veh   = document.getElementById('modalVehSel').value;
    const ready = (modalAction==='reject') || !!veh;
    document.getElementById('assignConfirmBtn').disabled = !ready;
    updateConflictWarnings();
}

function updateConflictWarnings() {
    const vWarn = document.getElementById('vehConflictWarn');
    const dWarn = document.getElementById('drvConflictWarn');
    if (!vWarn || !dWarn) return;
    const b = activeBookingId ? bookings.find(x => x.id === activeBookingId) : null;
    if (!b || modalAction === 'reject') {
        vWarn.hidden = true; dWarn.hidden = true; return;
    }
    const vehId = document.getElementById('modalVehSel').value;
    const drvId = document.getElementById('modalDrvSel').value;
    const vc = findConflict(b, 'vehicleId', vehId);
    const dc = findConflict(b, 'driverId',  drvId);
    if (vc) {
        vWarn.hidden = false;
        vWarn.querySelector('[data-conflict-text]').textContent =
            `ซ้อนเวลากับ #${vc.id} (${vc.start}–${vc.end} · ${vc.booker})`;
    } else { vWarn.hidden = true; }
    if (dc) {
        dWarn.hidden = false;
        dWarn.querySelector('[data-conflict-text]').textContent =
            `ซ้อนเวลากับ #${dc.id} (${dc.start}–${dc.end} · ${dc.dest})`;
    } else { dWarn.hidden = true; }
}

async function submitAssign() {
    if (isSaving) return;
    isSaving = true;
    const btn = document.getElementById('assignConfirmBtn');
    btn.disabled = true; btn.textContent = 'กำลังบันทึก...';

    const vehId  = document.getElementById('modalVehSel').value;
    const drvId  = document.getElementById('modalDrvSel').value;
    const expSub = (document.getElementById('modalExpSubSel').style.display!=='none')
                   ? document.getElementById('modalExpSubSel').value : '';

    const newVeh     = vehId ? vehicles.find(v => v.id === parseInt(vehId)) : null;
    const newVehLabel = newVeh ? `${newVeh.brand} ${newVeh.model} · ${newVeh.plate}` : '';
    const drvIdNum   = drvId ? parseInt(drvId) : null;

    try {
        if (activeGroupName) {
            const members  = bookings.filter(b=>b.tripGroup===activeGroupName);
            const mergeUrl = members[0].mergeUrl;
            const fd = new FormData();
            members.forEach(b => fd.append('booking_ids', b.id));
            if (vehId) fd.append('assigned_vehicle_id', vehId);
            if (drvId) fd.append('driver_id', drvId);
            fd.append('trip_group', activeGroupName);
            fd.append('merge_action', 'approve');
            if (modalExpType) fd.append('expense_type', modalExpType);
            if (expSub && modalExpType==='central')    fd.append('central_category', expSub);
            if (expSub && modalExpType==='department') fd.append('trip_department', expSub);
            const res0 = await fetch(mergeUrl, { method:'POST', body:fd });
            if (!res0.ok) { const d=await res0.json().catch(()=>({})); throw new Error(d.msg||'server error'); }
            members.forEach(b => patchBooking(b.id, {
                status: modalExpType === 'department' ? 'waiting_approver' : 'approved',
                ...(newVeh && { vehicleId: parseInt(vehId), vehicleLabel: newVehLabel }),
                ...(drvIdNum !== null && { driverId: drvIdNum }),
                expType: modalExpType,
            }));
            showToast('✓ บันทึกกลุ่มเรียบร้อย');

        } else if (groupSel.size > 0 && modalAction==='group_new') {
            const ids   = [...groupSel];
            const first = bookings.find(x=>x.id===ids[0]);
            const fd    = new FormData();
            ids.forEach(id => fd.append('booking_ids', id));
            if (vehId) fd.append('assigned_vehicle_id', vehId);
            if (drvId) fd.append('driver_id', drvId);
            fd.append('merge_action', 'approve');
            if (modalExpType) fd.append('expense_type', modalExpType);
            if (expSub && modalExpType==='central')    fd.append('central_category', expSub);
            if (expSub && modalExpType==='department') fd.append('trip_department', expSub);
            const res = await fetch(first.mergeUrl, { method:'POST', body:fd });
            if (!res.ok) { const d=await res.json().catch(()=>({})); throw new Error(d.msg||'server error'); }
            const tmpGroup = `TRP-${Date.now()}`;
            ids.forEach(id => patchBooking(id, {
                status: modalExpType === 'department' ? 'waiting_approver' : 'approved',
                tripGroup: tmpGroup,
                ...(newVeh && { vehicleId: parseInt(vehId), vehicleLabel: newVehLabel }),
                ...(drvIdNum !== null && { driverId: drvIdNum }),
                expType: modalExpType,
            }));
            showToast(`✓ รวม ${ids.length} รายการแล้ว`);

        } else if (activeBookingId) {
            const b   = bookings.find(x=>x.id===activeBookingId);
            const fd  = new FormData();
            const act = modalAction==='reject' ? 'reject' : 'approve';
            fd.append('assign_action', act);
            if (vehId) fd.append('assigned_vehicle_id', vehId);
            if (drvId) fd.append('driver_id', drvId);
            if (modalExpType) fd.append('expense_type', modalExpType);
            if (expSub && modalExpType==='central')    fd.append('central_category', expSub);
            if (expSub && modalExpType==='department') fd.append('trip_department', expSub);
            const res1 = await fetch(b.assignUrl, { method:'POST', body:fd });
            if (!res1.ok) { const d=await res1.json().catch(()=>({})); throw new Error(d.msg||'server error'); }
            patchBooking(activeBookingId, act === 'reject'
                ? { status: 'rejected' }
                : {
                    status: modalExpType === 'department' ? 'waiting_approver' : 'approved',
                    ...(newVeh && { vehicleId: parseInt(vehId), vehicleLabel: newVehLabel }),
                    ...(drvIdNum !== null && { driverId: drvIdNum }),
                    expType: modalExpType,
                  }
            );
            showToast(act==='reject' ? '✓ ปฏิเสธแล้ว' : modalExpType === 'department' ? '✓ อนุมัติแล้ว — รอผู้ประสานงานยืนยัน' : '✓ อนุมัติแล้ว');
        }

        bsAssignModal.hide();
        cancelGroupMode();
        isSaving = false;
        renderAll();
    } catch(e) {
        showToast(e.message && e.message !== 'server error' ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        isSaving = false;
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="check"></i> ยืนยันการอนุมัติ';
        initIcons(btn);
    }
}

/* ── Revert ───────────────────────────────────── */
function openRevertModal(bookingId) {
    revertBookingId = bookingId;
    const b = bookings.find(x=>x.id===bookingId);
    document.getElementById('revertModalText').textContent =
        `ต้องการย้อนสถานะ "${b?.dest || ''}" กลับเป็นรออนุมัติ?`;
    bsRevertModal = bsRevertModal || new bootstrap.Modal(document.getElementById('revertModal'));
    bsRevertModal.show();
}

async function submitRevert() {
    if (!revertBookingId) return;
    const b = bookings.find(x=>x.id===revertBookingId);
    try {
        const res = await fetch(b.revertUrl, { method:'POST' });
        const data = await res.json();
        if (!res.ok || !data.ok) {
            showToast(data.msg || 'ย้อนสถานะไม่ได้');
            bsRevertModal.hide();
            return;
        }
        patchBooking(revertBookingId, { status:'pending', vehicleId:null, vehicleLabel:null, driverId:null });
        showToast('✓ ย้อนสถานะแล้ว');
        bsRevertModal.hide();
        renderAll();
    } catch(e) { showToast('เกิดข้อผิดพลาด'); }
}

/* ── Ungroup ──────────────────────────────────── */
async function ungroupAll(grpName) {
    if (!confirm(`แยกกลุ่ม ${grpName} คืนทุกรายการเป็น "รออนุมัติ" ใช่ไหม?`)) return;
    const members = bookings.filter(b=>b.tripGroup===grpName);
    for (const b of members) {
        const fd = new FormData(); fd.append('action','ungroup');
        await fetch(b.assignUrl, { method:'POST', body:fd });
        patchBooking(b.id, { tripGroup:null, status:'pending', vehicleId:null, vehicleLabel:null, driverId:null });
    }
    showToast('✓ แยกกลุ่มแล้ว');
    renderAll();
}

async function splitBooking(bookingId, grpName) {
    if (!confirm('แยกรายการนี้ออกจากกลุ่ม?')) return;
    const b  = bookings.find(x=>x.id===bookingId);
    const fd = new FormData(); fd.append('action','ungroup');
    await fetch(b.assignUrl, { method:'POST', body:fd });
    patchBooking(bookingId, { tripGroup:null, status:'pending', vehicleId:null, vehicleLabel:null, driverId:null });
    showToast('✓ แยกแล้ว');
    renderAll();
}

/* ── Swap ─────────────────────────────────────── */
function openSwapModal(bookingId) {
    swapBookingId = bookingId;
    swapVehicleId = null;
    const b = bookings.find(x=>x.id===bookingId);
    document.getElementById('swapModalSub').textContent = b ? `${b.dest} · ${b.start}` : '';

    const ds       = toDateStr(selDate);
    const approved = bookings.filter(x=>x.startIso.startsWith(ds)&&x.status==='approved');
    const usedIds  = new Set(approved.map(x=>x.vehicleId).filter(Boolean));

    const listEl = document.getElementById('swapVehicleList');
    const swappable = vehicles.filter(v =>
        v.dbStatus !== 'maintenance' && !(usedIds.has(v.id) && v.id !== b?.vehicleId)
    );

    if (!swappable.length) {
        listEl.innerHTML = `<div class="bb-empty">
            <div class="bb-empty-icon"><i data-lucide="car-off"></i></div>
            <div class="bb-empty-title">ไม่มีรถที่สามารถ Swap ได้</div>
        </div>`;
    } else {
        listEl.innerHTML = swappable.map(v => {
            const isCurrent = v.id === b?.vehicleId;
            const statusLabel = isCurrent ? '<span class="bb-status is-info"><span class="bb-dot"></span>ปัจจุบัน</span>'
                              : usedIds.has(v.id) ? '<span class="bb-status is-neutral"><span class="bb-dot"></span>จองแล้ว</span>'
                              : '<span class="bb-status is-ok"><span class="bb-dot"></span>ว่าง</span>';
            const style = isCurrent ? 'border-color:var(--bb-accent-i);background:var(--bb-accent-bg);' : 'border-color:var(--bb-n200);';
            return `<div data-swap-item class="d-flex align-items-center gap-2 p-2 mb-2" style="border:1px solid;${style}border-radius:var(--bb-r-md);cursor:pointer" onclick="selectSwapVehicle(${v.id},this)">
                <span class="bb-avatar flex-shrink-0" style="width:2rem;height:2rem;background:var(--bb-n100)"><i data-lucide="car" style="width:.875rem;height:.875rem;color:var(--bb-mut)"></i></span>
                <div class="flex-grow-1" style="min-width:0">
                    <div class="fw-semibold text-truncate" style="font-size:.8125rem;color:var(--bb-str)">${esc(v.brand+' '+v.model)}</div>
                    <div class="text-truncate" style="font-size:.75rem;color:var(--bb-mut)">${esc(v.plate)}</div>
                </div>
                ${statusLabel}
            </div>`;
        }).join('');
    }

    document.getElementById('swapConfirmBtn').disabled = true;
    bsSwapModal = bsSwapModal || new bootstrap.Modal(document.getElementById('swapModal'));
    bsSwapModal.show();
    initIcons();
}

function selectSwapVehicle(id, el) {
    swapVehicleId = id;
    document.querySelectorAll('[data-swap-item]').forEach(x=>{
        x.style.borderColor = 'var(--bb-n200)';
        x.style.background  = '';
    });
    el.style.borderColor = 'var(--bb-accent-i)';
    el.style.background  = 'var(--bb-accent-bg)';
    document.getElementById('swapConfirmBtn').disabled = false;
}

async function submitSwap() {
    if (!swapBookingId || !swapVehicleId) return;
    const fd = new FormData();
    fd.append('vehicle_id', swapVehicleId);
    await fetch(`/vehicle/admin/booking/${swapBookingId}/swap`, { method:'POST', body:fd });
    const newVeh = vehicles.find(v => v.id === swapVehicleId);
    patchBooking(swapBookingId, {
        vehicleId:    swapVehicleId,
        vehicleLabel: newVeh ? `${newVeh.brand} ${newVeh.model} · ${newVeh.plate}` : '',
    });
    showToast('✓ เปลี่ยนรถแล้ว');
    bsSwapModal.hide();
    renderAll();
}

/* ── Repair ───────────────────────────────────── */
function openRepairModal(vehicleId) {
    repairVehicleId = vehicleId;
    const v = vehicles.find(x=>x.id===vehicleId);
    document.getElementById('repairModalSub').textContent = v ? `${v.brand} ${v.model} (${v.plate})` : '';
    document.getElementById('repairDate').value = toDateStr(today);
    document.getElementById('repairNote').value = '';
    bsRepairModal = bsRepairModal || new bootstrap.Modal(document.getElementById('repairModal'));
    bsRepairModal.show();
}

async function submitRepair() {
    if (!repairVehicleId) return;
    const v    = vehicles.find(x=>x.id===repairVehicleId);
    const note = document.getElementById('repairNote').value;
    const fd   = new FormData();
    fd.append('repair_note', note);
    await fetch(v.repairUrl, { method:'POST', body:fd });
    patchVehicle(repairVehicleId, { dbStatus:'maintenance', repairNote:note });
    showToast('✓ บันทึกการส่งซ่อมแล้ว');
    bsRepairModal.hide();
    renderAll();
}

async function fixDone(vehicleId) {
    const v = vehicles.find(x=>x.id===vehicleId);
    if (!v) return;
    const res  = await fetch(v.fixDoneUrl, { method:'POST' });
    const data = await res.json();
    if (data.ok) {
        patchVehicle(vehicleId, { dbStatus:'active', repairNote:null });
        showToast(`✓ ${data.label} สามารถใช้งานได้ตามปกติ`);
        renderAll();
    }
}

/* ── Booking Detail Modal ─────────────────────── */
let adminDetailModal = null;
let _adminEditId     = null;

const STATUS_CSS_KEY = {
    pending:          'pending',
    waiting_approver: 'approver',
    forwarded:        'approver',
    approved:         'approved',
    in_progress:      'approved',
    completed:        'approved',
    rejected:         'rejected',
    cancelled:        'rejected',
};

function openAdminBookingDetail(id) {
    const b = bookings.find(x => x.id === id);
    if (!b) return;

    const sb       = STATUS_BADGE[b.status]  || STATUS_BADGE.pending;
    const si       = STATUS_ICON[b.status]   || STATUS_ICON.pending;
    const cssKey   = STATUS_CSS_KEY[b.status] || 'pending';

    const pill = document.getElementById('detailStatusPill');
    pill.className = `bk-detail-status bk-detail-status--${cssKey}`;
    document.getElementById('detailStatusIcon').outerHTML =
        `<i id="detailStatusIcon" data-lucide="${si.icon}"></i>`;
    document.getElementById('detailStatusText').textContent = sb.label;

    const [y, m, d] = b.startIso.split('T')[0].split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    document.getElementById('detailDateLine').textContent =
        `วัน${TH_DAYS_F[dow]} ที่ ${d} ${TH_MON_F[m]}`;

    document.getElementById('detailTime').textContent  = `${b.start} – ${b.end}`;
    document.getElementById('detailPlate').innerHTML   = esc(b.vehicleLabel || 'รอ Admin กำหนด');

    const driverLine = document.getElementById('detailDriverLine');
    if (b.needDriver) {
        document.getElementById('detailDriver').textContent = b.driverLabel || 'รอ Admin มอบหมาย';
        driverLine.style.display = '';
    } else {
        driverLine.style.display = 'none';
    }

    document.getElementById('detailMemberCount').textContent = `${b.pax || 1} คน`;
    document.getElementById('detailMembersList').innerHTML = `
        <div class="bk-detail-member" style="flex-direction:column;align-items:flex-start;gap:4px;padding:8px 0;">
            <div><span style="color:var(--vc-fg-subtle);font-size:.78rem;">ผู้จอง</span> ${esc(b.booker)}</div>
            <div><span style="color:var(--vc-fg-subtle);font-size:.78rem;">วัตถุประสงค์</span> ${esc(b.purpose)}</div>
            <div><span style="color:var(--vc-fg-subtle);font-size:.78rem;">ปลายทาง</span> ${esc(b.dest)}</div>
            ${b.pickup ? `<div><span style="color:var(--vc-fg-subtle);font-size:.78rem;">จุดรับ</span> ${esc(b.pickup)}</div>` : ''}
        </div>`;

    const canEdit = !['in_progress','completed','cancelled'].includes(b.status);
    const actDiv  = document.getElementById('detailActions');
    actDiv.innerHTML = canEdit
        ? `<button class="btn btn-sm btn-outline-primary" onclick="openAdminEdit(${b.id})">แก้ไข</button>`
        : '';

    document.getElementById('detailEditSection').classList.add('d-none');

    adminDetailModal = adminDetailModal || new bootstrap.Modal(document.getElementById('eventDetailModal'));
    adminDetailModal.show();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openAdminEdit(id) {
    const b = bookings.find(x => x.id === id);
    if (!b) return;
    _adminEditId = id;
    document.getElementById('editStart').value   = b.startIso ? b.startIso.slice(0,16) : '';
    document.getElementById('editEnd').value     = b.endIso   ? b.endIso.slice(0,16)   : '';
    document.getElementById('editDest').value    = b.dest    || '';
    document.getElementById('editPurpose').value = b.purpose || '';
    document.getElementById('editPax').value     = b.pax     || 1;
    document.getElementById('editPickup').value  = b.pickup  || '';
    document.getElementById('detailEditSection').classList.remove('d-none');
    document.getElementById('detailActions').innerHTML = '';
}

function cancelAdminEdit() {
    document.getElementById('detailEditSection').classList.add('d-none');
    if (_adminEditId) openAdminBookingDetail(_adminEditId);
}

async function saveAdminEdit() {
    const b = bookings.find(x => x.id === _adminEditId);
    if (!b) return;
    const fd = new FormData();
    fd.append('start_datetime',   document.getElementById('editStart').value);
    fd.append('end_datetime',     document.getElementById('editEnd').value);
    fd.append('destination',      document.getElementById('editDest').value);
    fd.append('purpose',          document.getElementById('editPurpose').value);
    fd.append('passenger_count',  document.getElementById('editPax').value);
    fd.append('pickup_location',  document.getElementById('editPickup').value);
    try {
        const res  = await fetch(b.editUrl, { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok || !data.ok) { showToast(data.msg || 'เกิดข้อผิดพลาด'); return; }
        patchBooking(b.id, {
            startIso: document.getElementById('editStart').value + ':00',
            endIso:   document.getElementById('editEnd').value   + ':00',
            dest:     document.getElementById('editDest').value,
            purpose:  document.getElementById('editPurpose').value,
            pax:      parseInt(document.getElementById('editPax').value) || b.pax,
            pickup:   document.getElementById('editPickup').value,
        });
        renderAll();
        showToast(data.msg || 'บันทึกแล้ว');
        document.getElementById('detailEditSection').classList.add('d-none');
        openAdminBookingDetail(b.id);
    } catch {
        showToast('เชื่อมต่อไม่ได้ กรุณาลองใหม่');
    }
}

/* ── Post-trip actions ────────────────────────── */
async function markPaid(mileageId, bookingId) {
    if (!mileageId) return;
    const fd = new FormData();
    fd.append('mileage_id', mileageId);
    const res = await fetch('/admin/budget/personal/mark_paid', { method:'POST', body:fd });
    if (res.ok) {
        patchBooking(bookingId, { personalStatus:1 });
        showToast('✓ บันทึกการรับเงินแล้ว');
        renderAll();
    }
}

function notifyDept(bookingId) {
    showToast('📌 Feature นี้จะพร้อมใช้ในเร็วๆ นี้');
}

/* ── Toast ────────────────────────────────────── */
function showToast(msg) {
    window.bbToast({ msg });
}

/* ── Escape ───────────────────────────────────── */
function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ══════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════ */
function renderAll() {
    renderWeekMeta();
    renderBefore();
    renderDuring();
    initIcons();
}

/* ── Expose to window for legacy onclick handlers ── */
Object.assign(window, {
    toggleGroupMode, cancelGroupMode, confirmMerge,
    toggleNotifyMode, cancelNotifyMode, confirmNotify,
    toggleGroupSel, toggleNotifySel, toggleGroupNotifySel,
    openAssignModal, openRevertModal, openAdminBookingDetail,
    openSwapModal, openRepairModal,
    splitBooking, ungroupAll, fixDone,
    setModalExpType, updateExpSubDropdown, checkAssignReady,
    submitAssign, submitRevert, submitSwap, submitRepair,
    selectSwapVehicle, markPaid, notifyDept,
    openAdminEdit, cancelAdminEdit, saveAdminEdit,
});

bindDateControls();
bindFilterTabs();
renderAll();
