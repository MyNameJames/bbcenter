/* ══════════════════════════════════════════════════
   vehicle_admin.js — Fleet Admin Redesign
   Depends on: BOOKINGS_DATA, VEHICLES_DATA, DRIVERS_DATA,
               BUDGETS_DATA, PURPOSES_DATA, FUEL_PRICE, SERVER_NOW
══════════════════════════════════════════════════ */

/* ── Constants ────────────────────────────────── */
const EN_DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const TH_DAYS_S = ['อา','จ','อ','พ','พฤ','ศ','ส'];   // short Thai day names
const TH_DAYS_F = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const TH_MON_F  = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                   'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

const STATUS_ICON = {
    pending:          { dot:'pending',  icon:'clock' },
    waiting_approver: { dot:'approver', icon:'send' },
    forwarded:        { dot:'approver', icon:'send' },
    approved:         { dot:'approved', icon:'check-circle' },
    rejected:         { dot:'rejected', icon:'x-circle' },
};

const STATUS_BADGE = {
    pending:          { cls:'vc-badge-warning vc-badge-dot', label:'รออนุมัติ' },
    waiting_approver: { cls:'vc-badge-blue vc-badge-dot',    label:'ส่ง Approver' },
    forwarded:        { cls:'vc-badge-blue vc-badge-dot',    label:'ส่ง Approver' },
    approved:         { cls:'vc-badge-success vc-badge-dot', label:'อนุมัติแล้ว' },
    rejected:         { cls:'vc-badge-danger vc-badge-dot',  label:'ปฏิเสธ' },
};

/* ── State ────────────────────────────────────── */
const bookings  = [...(window.BOOKINGS_DATA  || [])];
const vehicles  = [...(window.VEHICLES_DATA  || [])];
const drivers   = [...(window.DRIVERS_DATA   || [])];
const budgets   = window.BUDGETS_DATA   || { central:[], department:[] };
const fuelPrice = window.FUEL_PRICE     || 0;

const serverNow = window.SERVER_NOW ? new Date(window.SERVER_NOW) : new Date();
const today     = new Date(serverNow.getFullYear(), serverNow.getMonth(), serverNow.getDate());

let weekStart = new Date(today);
weekStart.setDate(today.getDate() - (today.getDay() + 6) % 7); // Mon-based, handles Sunday correctly

let selDate    = new Date(today);
let curFilter  = 'all';
let groupMode  = false;
let groupSel   = new Set();
let notifyMode = false;
let notifySel  = new Set();
let beforeExpanded = true;

// Modal state
let activeBookingId  = null;
let activeGroupName  = null;
let modalAction      = 'approve'; // 'approve' | 'reject'
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

function isToday(d) {
    return d.getFullYear()===today.getFullYear() && d.getMonth()===today.getMonth() && d.getDate()===today.getDate();
}

function isPastOrToday(d) {
    const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return s <= today;
}

function fmtBaht(n) { return '฿' + Number(n).toLocaleString('th-TH',{minimumFractionDigits:0,maximumFractionDigits:0}); }
function fmtNum(n)  { return Number(n).toLocaleString('th-TH'); }

/* patch local arrays → no page reload needed */
function patchBooking(id, changes) {
    const idx = bookings.findIndex(b => b.id === id);
    if (idx >= 0) Object.assign(bookings[idx], changes);
}
function patchVehicle(id, changes) {
    const idx = vehicles.findIndex(v => v.id === id);
    if (idx >= 0) Object.assign(vehicles[idx], changes);
}

/* ══════════════════════════════════════════════════
   WEEK NAVIGATION
══════════════════════════════════════════════════ */
function renderWeekNav() {
    const strip = document.getElementById('wnStrip');
    strip.innerHTML = '';

    for (let i = 0; i < 7; i++) {
        const d     = new Date(weekStart); d.setDate(weekStart.getDate() + i);
        const ds    = toDateStr(d);
        const hasBk = bookings.some(b => b.startIso.startsWith(ds));
        const isTd  = isToday(d);
        const isSel = d.toDateString() === selDate.toDateString();

        const el = document.createElement('div');
        el.className = `va-week-day${isTd?' va-week-day-today':''}${isSel?' va-week-day-active':''}`;
        el.innerHTML = `
            <span class="va-week-day-name">${TH_DAYS_S[d.getDay()]}</span>
            <span class="va-week-day-num">${d.getDate()}</span>
            <div class="va-week-day-dot"${hasBk && !isSel?' style="background:var(--vc-fg)"':''}></div>`;
        el.addEventListener('click', () => {
            selDate = new Date(d);
            renderAll();
        });
        strip.appendChild(el);
    }
}

function shiftWeek(dir) {
    weekStart.setDate(weekStart.getDate() + dir * 7);
    renderWeekNav();
}

/* ══════════════════════════════════════════════════
   SECTION ก่อน — BOOKING LIST
══════════════════════════════════════════════════ */
function renderBefore() {
    const ds     = toDateStr(selDate);
    const allDay = bookings.filter(b => b.startIso.startsWith(ds));

    // Counts
    const cnt = {
        all:              allDay.length,
        pending:          allDay.filter(b => b.status==='pending').length,
        waiting_approver: allDay.filter(b => b.status==='waiting_approver'||b.status==='forwarded').length,
        approved:         allDay.filter(b => b.status==='approved').length,
        rejected:         allDay.filter(b => b.status==='rejected').length,
    };

    document.getElementById('cnt-all').textContent      = cnt.all;
    document.getElementById('cnt-pending').textContent  = cnt.pending;
    document.getElementById('cnt-approver').textContent = cnt.waiting_approver;
    document.getElementById('cnt-approved').textContent = cnt.approved;
    document.getElementById('cnt-rejected').textContent = cnt.rejected;
    // document.getElementById('beforeCount').textContent  = `${cnt.all} รายการ`;

    // KPI strip (top of page) — mirror same counts for selected day
    const setKpi = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setKpi('kpiPending',  cnt.pending);
    setKpi('kpiApprover', cnt.waiting_approver);
    setKpi('kpiApproved', cnt.approved);
    setKpi('kpiRejected', cnt.rejected);

    // Collapse logic: today and past → collapsed by default (unless user expanded)
    const shouldCollapse = isPastOrToday(selDate);
    const collapsedEl  = document.getElementById('beforeCollapsed');
    const expandedEl   = document.getElementById('beforeExpanded');

    if (shouldCollapse && !beforeExpanded) {
        collapsedEl.style.display = 'flex';
        expandedEl.style.display  = 'none';
        document.getElementById('beforeCollapsedText').textContent =
            `อนุมัติแล้ว ${cnt.approved}/${cnt.all} รายการ`;
        return;
    } else {
        collapsedEl.style.display = 'none';
        expandedEl.style.display  = 'block';
    }

    // Filter
    let filtered = [...allDay];
    if (curFilter !== 'all') {
        filtered = filtered.filter(b => {
            if (curFilter==='waiting_approver') return b.status==='waiting_approver'||b.status==='forwarded';
            return b.status === curFilter;
        });
    }

    const list = document.getElementById('bookingList');

    if (!filtered.length) {
        list.innerHTML = `<div class="vc-empty">
            <div class="vc-empty-icon"><i data-lucide="car" style="width:20px;height:20px;"></i></div>
            <p class="vc-empty-title">ไม่มีรายการจองรถ</p>
        </div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    // Group rendering
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

    list.innerHTML = items.map(item =>
        item.type === 'group'
            ? renderGroupRow(item.name, item.members)
            : renderSingleRow(item.booking)
    ).join('');
}

function renderSingleRow(b) {
    const si = STATUS_ICON[b.status]  || STATUS_ICON.pending;
    const sb = STATUS_BADGE[b.status] || STATUS_BADGE.pending;

    const isSelectable       = groupMode  && b.status === 'pending';
    const isNotifySelectable = notifyMode && b.status === 'approved';
    const isSel       = groupSel.has(b.id);
    const isNotifySel = notifySel.has(b.id);

    const leftEl = isSelectable
        ? `<input class="form-check-input bl-sel-check" type="checkbox"
               id="chk-${b.id}"
               ${isSel ? 'checked' : ''}
               onclick="event.stopPropagation();toggleGroupSel(${b.id})">`
        : isNotifySelectable
        ? `<input class="form-check-input bl-sel-check bl-sel-check--notify" type="checkbox"
               id="chk-n-${b.id}"
               ${isNotifySel ? 'checked' : ''}
               onclick="event.stopPropagation();toggleNotifySel(${b.id})">`
        : `<span class="vc-badge ${sb.cls}">${sb.label}</span>`;

    const actions = buildRowActions(b);

    const defaultClick = !groupMode && !notifyMode
        ? `onclick="openAdminBookingDetail(${b.id})" style="cursor:pointer"` : '';
    return `
    <div class="card mb-2${isSel?' bl-selected':''}${isNotifySel?' bl-notify-selected':''}${isSelectable?' bl-group-mode':''}${isNotifySelectable?' bl-notify-mode':''}"
         id="blrow-${b.id}"
         ${isSelectable ? `onclick="toggleGroupSel(${b.id})"` : isNotifySelectable ? `onclick="toggleNotifySel(${b.id})"` : defaultClick}>
        <div class="card-body py-2 px-3">
            <div class="d-flex align-items-center gap-3">
                <div class="flex-grow-1 overflow-hidden">
                    <div class="d-flex align-items-center gap-2 mb-1">
                        <span class="fw-semibold text-truncate" style="font-size:.88rem;color:var(--ds-text-heading);">${esc(b.booker)}</span>
                        ${!isSelectable && !isNotifySelectable ? leftEl : ''}
                    </div>
                    <div class="text-muted d-inline-block" style="font-size:.75rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
                        stroke-linejoin="round" class="lucide lucide-user-icon lucide-user mb-1 me-1">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${b.pax}
                        <span class="mx-1">·</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
                        stroke-linejoin="round" class="lucide lucide-clock4-icon lucide-clock-4 mb-1 me-1"><circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/></svg>${b.start}
                        <span class="mx-1">·</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" 
                        stroke-linejoin="round" class="lucide lucide-map-pin-icon lucide-map-pin mb-1 me-1">
                        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>${esc(b.dest)}
                    </div>
                </div>
                <div class="bl-actions">${actions}</div>
            </div>
        </div>
    </div>`;
}

function buildRowActions(b) {
    if (groupMode) return '';
    switch (b.status) {
        case 'pending':
            return `<button class="ds-btn-icon rounded-3 bg-white text-success" title="อนุมัติ" onclick="event.stopPropagation();openAssignModal(${b.id},'approve')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                    </button>
                    <button class="ds-btn-icon rounded-3 bg-white text-danger" title="ปฏิเสธ" onclick="event.stopPropagation();openAssignModal(${b.id},'reject')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>`;
        case 'waiting_approver':
        case 'forwarded':
            return `<button class="ds-btn-icon rounded-3 bg-white" title="แก้ไข" onclick="event.stopPropagation();openAssignModal(${b.id},'edit')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
                    </button>`;
        case 'approved':
            return `<button class="ds-btn-icon rounded-3 bg-white" title="แก้ไข" onclick="event.stopPropagation();openAssignModal(${b.id},'edit')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
                    </button>
                    <button class="ds-btn-icon rounded-3 bg-white text-danger" title="ย้อนสถานะ" onclick="event.stopPropagation();openRevertModal(${b.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-cw-icon lucide-rotate-cw"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                    </button>`;
        case 'rejected':
            return `<button class="bl-ico-btn" title="แก้ไข" onclick="event.stopPropagation();openAssignModal(${b.id},'edit')">
                        <i data-lucide="pencil"></i>
                    </button>`;
        default:
            return '';
    }
}

function renderGroupRow(grpName, members) {
    const totalPax = members.reduce((s,b)=>s+b.pax,0);
    const times    = [...new Set(members.map(b=>b.start))].join(', ');
    const rep      = members[0];
    const vLabel   = rep.vehicleLabel || 'ยังไม่กำหนดรถ';
    const colId    = `grpbody-${grpName.replace(/[^a-z0-9]/gi,'')}`;

    const approvedMembers    = members.filter(b => b.status === 'approved');
    const isGrpNotifySelectable = notifyMode && approvedMembers.length > 0;
    const isGrpNotifySel        = isGrpNotifySelectable && approvedMembers.every(b => notifySel.has(b.id));

    const leftEl = isGrpNotifySelectable
        ? `<input type="checkbox" class="bl-sel-check bl-sel-check--notify form-check-input"
               ${isGrpNotifySel ? 'checked' : ''}
               onclick="event.stopPropagation();toggleGroupNotifySel('${grpName}')">`
        : `<span class="vc-badge vc-badge-solid vc-badge-dot flex-shrink-0">${members.length} งานรวม</span>`;

    const subItems = members.map(b => {
        const si = STATUS_ICON[b.status] || STATUS_ICON.pending;
        const sb = STATUS_BADGE[b.status] || STATUS_BADGE.pending;
        return `
        <div class="bl-group-sub d-flex align-items-center gap-3 px-3 py-2">
            <div class="flex-grow-1 overflow-hidden">
                <div class="d-flex align-items-center gap-2 mb-1">
                    <span class="fw-semibold text-truncate" style="font-size:.82rem;color:var(--ds-text-heading);">${esc(b.booker)}</span>
                    <span class="vc-badge vc-badge-xs ${sb.cls}">${sb.label}</span>
                </div>
                <div class="text-muted d-inline-block text-truncate" style="font-size:.72rem;">
                    <i data-lucide="users" class="vc-icon-sm me-1" style="width:11px;height:11px;"></i>${b.pax}
                    <span class="mx-1">·</span>
                    <i data-lucide="clock" class="vc-icon-sm me-1" style="width:11px;height:11px;"></i>${b.start}
                    <span class="mx-1">·</span>
                    <i data-lucide="map-pin" class="vc-icon-sm me-1" style="width:11px;height:11px;"></i>${esc(b.dest)}
                </div>
            </div>
            <button class="bl-ico-btn bl-ico-split" title="แยกออกจากกลุ่ม" onclick="splitBooking(${b.id},'${grpName}')">
                <i data-lucide="shuffle"></i>
            </button>
        </div>`;
    }).join('');

    return `
    <div class="card mb-2${isGrpNotifySel?' bl-notify-selected':''}${isGrpNotifySelectable?' bl-notify-mode':''}"
         id="blgrp-${grpName}"
         ${isGrpNotifySelectable ? `onclick="toggleGroupNotifySel('${grpName}')" style="cursor:pointer"` : ''}>
        <div class="card-body py-2 px-3">
            <div class="d-flex align-items-center gap-3">
                <div class="flex-grow-1 overflow-hidden">
                    <div class="d-flex align-items-center gap-2 mb-1">
                        <span class="fw-semibold text-truncate" style="font-size:.88rem;color:var(--ds-text-heading);">${esc(vLabel)}</span>
                        ${leftEl}
                    </div>
                    <div class="text-muted d-inline-block text-truncate" style="font-size:.75rem;">
                        <i data-lucide="users" class="vc-icon-sm me-1" style="width:12px;height:12px;"></i>${totalPax}
                        <span class="mx-1">·</span>
                        <i data-lucide="clock" class="vc-icon-sm me-1" style="width:12px;height:12px;"></i>${times}
                    </div>
                </div>
                <div class="bl-actions" onclick="event.stopPropagation()">
                    <button class="bl-txt-btn bl-txt-split" onclick="ungroupAll('${grpName}')" title="แยกงานทั้งหมด">
                        <i data-lucide="shuffle"></i>
                    </button>
                    <button class="bl-txt-btn" onclick="openAssignModal(null,'group','${grpName}')" title="แก้ไขกลุ่ม">
                        <i data-lucide="pencil"></i>
                    </button>
                    <button class="bl-ico-btn"
                            data-bs-toggle="collapse"
                            data-bs-target="#${colId}"
                            aria-expanded="false"
                            onclick="event.stopPropagation()">
                        <i data-lucide="chevron-down"></i>
                    </button>
                </div>
            </div>
        </div>
        <div class="collapse" id="${colId}">
            <div class="border-top">${subItems}</div>
        </div>
    </div>`;
}

function setFilter(f, el) {
    curFilter = f;
    document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    renderBefore();
}

function toggleBeforeExpand() {
    beforeExpanded = !beforeExpanded;
    renderBefore();
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
   SECTION ขณะ — VEHICLE STATUS
══════════════════════════════════════════════════ */
function renderDuring() {
    const ds     = toDateStr(selDate);
    const allDay = bookings.filter(b => b.startIso.startsWith(ds) && b.status==='approved');
    const list   = document.getElementById('vehicleList');

    list.innerHTML = vehicles.map(v => renderVehicleRow(v, allDay)).join('');
}

function getVehicleStatus(v, approvedToday) {
    if (v.dbStatus === 'maintenance') return 'maintenance';
    const bk = approvedToday.find(b => b.vehicleId === v.id || b.vehicleId === v.id);
    if (!bk) return 'available';
    // Check if trip already started (only meaningful for today)
    if (isToday(selDate)) {
        const now = serverNow;
        const start = new Date(bk.startIso);
        const end   = new Date(bk.endIso);
        if (now >= start && now <= end) return 'inuse';
    }
    return 'reserved';
}

function renderVehicleRow(v, approvedToday) {
    const status = getVehicleStatus(v, approvedToday);
    const bk = approvedToday.find(b => b.vehicleId === v.id);

    const iconCls = (status==='inuse' || status==='reserved') ? 'vs-icon-active'
                  : status==='maintenance' ? 'vs-icon-maintenance' : '';

    let detail = '';
    if (bk && (status==='inuse' || status==='reserved')) {
        const driver = bk.driverLabel ? `${esc(bk.driverLabel)} → ` : '';
        detail = `<div class="vs-detail"><span>${driver}${esc(bk.dest)}</span></div>`;
    } else if (status==='available') {
        detail = `<div class="vs-detail vs-detail-available"><i class="fa-regular fa-circle-check"></i><span>Available</span></div>`;
    } else if (status==='maintenance') {
        const note = v.repairNote ? esc(v.repairNote) : 'ส่งซ่อม';
        detail = `<div class="vs-detail vs-detail-maintenance"><i class="fa-solid fa-wrench"></i><span>${note}</span></div>`;
    }

    let actions = '';
    if ((status==='reserved' || status==='inuse') && bk) {
        actions = `<button class="vs-btn" onclick="openSwapModal(${bk.id})">
            <i class="fa-solid fa-shuffle"></i> Swap
        </button>`;
    } else if (status==='maintenance') {
        actions = `<button class="vs-btn vs-btn-fix" onclick="fixDone(${v.id})">
            <i class="fa-solid fa-circle-check"></i> เสร็จซ่อม
        </button>`;
    } else if (status==='available') {
        actions = `<button class="vs-btn vs-btn-repair" onclick="openRepairModal(${v.id})">
            <i class="fa-solid fa-wrench"></i>
        </button>`;
    }

    return `
    <div class="vs-row">
        <div class="vs-icon ${iconCls}"><i class="fa-solid fa-truck"></i></div>
        <div class="vs-info">
            <div class="vs-name">${esc(v.plate)}<span class="vs-name-sub"> · ${esc(v.brand+' '+v.model)}</span></div>
            ${detail}
        </div>
        <div class="vs-actions">${actions}</div>
    </div>`;
}

/* ══════════════════════════════════════════════════
   SECTION หลัง — POST-TRIP SUMMARY
══════════════════════════════════════════════════ */
function renderAfter() {
    const ds   = toDateStr(selDate);
    const done = bookings.filter(b =>
        b.startIso.startsWith(ds) && b.status==='approved'
    );

    document.getElementById('afterCount').textContent = `${done.length} รายการ`;
    const list = document.getElementById('tripList');

    if (!done.length) {
        list.innerHTML = `<div class="vc-empty">
            <div class="vc-empty-icon"><i data-lucide="route" style="width:20px;height:20px;"></i></div>
            <p class="vc-empty-title">ไม่มีทริปที่เสร็จแล้ว</p>
        </div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    // Group bookings by tripGroup; ungrouped → individual
    const groups = [];
    const seen = new Set();
    for (const b of done) {
        if (!b.tripGroup) {
            groups.push([b]);
        } else if (!seen.has(b.tripGroup)) {
            seen.add(b.tripGroup);
            groups.push(done.filter(x => x.tripGroup === b.tripGroup));
        }
    }

    list.innerHTML = groups.map(g => renderTripRow(g)).join('');
}

function renderTripRow(group) {
    const b       = group[0];
    const isGroup = group.length > 1;

    const bm     = group.find(x => x.odoStart !== null && x.odoEnd !== null) || b;
    const hasOdo = bm.odoStart !== null && bm.odoEnd !== null;
    const dist   = hasOdo ? (bm.odoEnd - bm.odoStart) : 0;

    // Mirror server-side formula (vehicle_view.py L1149-1151 / L1265-1270):
    //   trip_cost = m.fuel_cost (override) > 0 ? m.fuel_cost
    //             : round((distance / vehicle.fuel_rate) * fuel_price, 2)
    const veh        = vehicles.find(v => v.id === bm.vehicleId);
    const fuelRate   = veh ? Number(veh.fuelRate) : 0;
    const override   = Number(bm.fuelCost) || 0;
    const autoCost   = (hasOdo && fuelRate > 0)
                       ? Math.round((dist / fuelRate) * fuelPrice * 100) / 100
                       : 0;
    const isOverride = override > 0;
    const total      = hasOdo ? (isOverride ? override : autoCost) : 0;

    const plate    = b.vehicleLabel ? b.vehicleLabel.split(' · ').pop() : '—';
    const nameText = isGroup ? `งานร่วม ${group.length} รายการ` : esc(b.booker);

    const expBadgeCls = b.expType==='central' ? 'pts-exp-central'
                      : b.expType==='department' ? 'pts-exp-department' : 'pts-exp-personal';
    const expLabel = b.expType==='central' ? 'ส่วนกลาง'
                   : b.expType==='department' ? `ส่วนกอง · ${esc(b.deptName)}` : 'ส่วนตัว';

    const dotCls = hasOdo ? 'ds-status-dot--approved' : 'ds-status-dot--pending';
    const dotFa  = hasOdo ? 'fa-regular fa-circle-check' : 'fa-regular fa-clock';

    // Breakdown line: show real formula, mark override
    const subText = isOverride
        ? `··· ${fmtNum(dist)} กม. · ค่าน้ำมัน (กำหนดเอง) ฿${fmtNum(override)}`
        : (fuelRate > 0
            ? `·· ${fmtNum(dist)} กม. ÷ ${fmtNum(fuelRate)} กม. × ฿${fmtNum(fuelPrice)}`
            : `·· ${fmtNum(dist)} กม. · ไม่ได้ตั้งอัตราสิ้นเปลือง`);
    const detailHtml = hasOdo ? `
        <div class="pts-detail mt-1">
            <span class="pts-detail-main">ไมล์: ${fmtNum(bm.odoStart)} → ${fmtNum(bm.odoEnd)}</span>
            <span class="pts-detail-sub">${subText}</span>
        </div>` : '';

    let actionHtml = '';
    if (b.expType === 'personal') {
        if (bm.personalStatus === 1) {
            actionHtml = `<span class="pts-paid-stamp"><i class="fa-solid fa-circle-check" style="color:var(--ds-success)"></i> จ่ายเมื่อ ${bm.personalPaidAt}</span>`;
        } else if (hasOdo) {
            actionHtml = `<button class="pts-btn-paid" onclick="markPaid(${bm.mileageId}, ${bm.id})"><i class="fa-solid fa-check"></i> รับเงินแล้ว</button>`;
        }
    } else if (b.expType === 'department') {
        actionHtml = `<button class="pts-btn-telegram" onclick="notifyDept(${b.id})"><i class="fa-brands fa-telegram"></i> แจ้ง Telegram</button>`;
    }

    const rightHtml = (hasOdo || actionHtml) ? `
        <div class="pts-right flex-shrink-0 ms-auto text-end">
            ${actionHtml ? `<div>${actionHtml}</div>` : ''}
            ${hasOdo ? `<span class="pts-amount">${fmtBaht(total)}</span>` : ''}
        </div>` : '';

    return `
    <div class="card mb-2 pts-row${!hasOdo ? ' pts-no-mileage' : ''}">
        <div class="card-body py-2 px-3">
            <div class="d-flex align-items-center gap-3">
                <div class="ds-status-dot ${dotCls}"><i class="${dotFa}"></i></div>
                <div class="flex-grow-1 overflow-hidden">
                    <div class="d-flex align-items-center gap-2 mb-1">
                        <span class="pts-plate">${esc(plate)}</span>
                        <span class="pts-exp-badge ${expBadgeCls}">${expLabel}</span>
                    </div>
                    <div class="pts-name mb-0">${nameText}</div>
                    ${detailHtml}
                </div>
                ${rightHtml}
            </div>
        </div>
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

    // Title
    let title = 'Approve & Assign Resources';
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

    // Populate vehicle dropdown
    const vSel = document.getElementById('modalVehSel');
    vSel.innerHTML = '<option value="">Choose vehicle</option>' +
        vehicles.filter(v=>v.dbStatus==='active').map(v =>
            `<option value="${v.id}" ${b&&b.vehicleId===v.id?'selected':''}>${v.brand} ${v.model} · ${v.plate}</option>`
        ).join('');

    // Populate driver dropdown
    const dSel = document.getElementById('modalDrvSel');
    dSel.innerHTML = '<option value="">Choose driver</option>' +
        drivers.map(d =>
            `<option value="${d.id}" ${b&&b.driverId===d.id?'selected':''}>${d.label}</option>`
        ).join('');

    // Expense type
    modalExpType = (b?.expType) || 'central';
    document.querySelectorAll('.adm-exp-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.type === modalExpType);
    });
    updateExpSubDropdown(b);

    document.getElementById('assignConfirmBtn').disabled = true;
    checkAssignReady();

    bsAssignModal = bsAssignModal || new bootstrap.Modal(document.getElementById('assignModal'));
    bsAssignModal.show();
}

function setModalExpType(type, el) {
    modalExpType = type;
    document.querySelectorAll('.adm-exp-tab').forEach(t=>t.classList.remove('active'));
    if (el) el.classList.add('active');
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

    // approver (department only)
    const selKey = sub.value;
    if (modalExpType === 'department' && selKey) {
        const entry = list.find(x => x.key === selKey);
        if (entry?.approver) {
            approverName.textContent  = ` ${entry.approver}`;
            approverEl.style.display  = 'block';
        } else {
            approverEl.style.display  = 'none';
        }
    } else {
        approverEl.style.display = 'none';
    }

    updateModalBudget();
}

function updateModalBudget() {
    const sub  = document.getElementById('modalExpSubSel');
    const bar  = document.getElementById('modalBudgetBar');
    if (!sub.value || modalExpType==='personal') { bar.style.display='none'; return; }
    const list = budgets[modalExpType]||[];
    const entry= list.find(x=>x.key===sub.value);
    if (!entry||!entry.total) { bar.style.display='none'; return; }
    const rem  = entry.total - entry.used;
    const pct  = Math.min(entry.total>0?(entry.used/entry.total)*100:0, 100);
    const color= pct<70?'var(--ds-success)':pct<90?'var(--ds-warning)':'var(--ds-danger)';
    document.getElementById('modalBudgetLabel').textContent = 'งบคงเหลือ';
    document.getElementById('modalBudgetValue').textContent = `${fmtNum(rem)} / ${fmtNum(entry.total)} บ.`;
    document.getElementById('modalBudgetFill').style.cssText= `width:${pct}%;background:${color}`;
    bar.style.display = 'block';
}

function checkAssignReady() {
    const veh   = document.getElementById('modalVehSel').value;
    const ready = (modalAction==='reject') || !!veh;
    document.getElementById('assignConfirmBtn').disabled = !ready;
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

    // Pre-compute vehicle label for local patch
    const newVeh     = vehId ? vehicles.find(v => v.id === parseInt(vehId)) : null;
    const newVehLabel = newVeh ? `${newVeh.brand} ${newVeh.model} · ${newVeh.plate}` : '';
    const drvIdNum   = drvId ? parseInt(drvId) : null;

    try {
        if (activeGroupName) {
            // Edit existing group
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
            // patch local
            members.forEach(b => patchBooking(b.id, {
                status: modalExpType === 'department' ? 'waiting_approver' : 'approved',
                ...(newVeh && { vehicleId: parseInt(vehId), vehicleLabel: newVehLabel }),
                ...(drvIdNum !== null && { driverId: drvIdNum }),
                expType: modalExpType,
            }));
            showToast('✓ บันทึกกลุ่มเรียบร้อย');

        } else if (groupSel.size > 0 && modalAction==='group_new') {
            // New group merge
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
            // patch local — generate a temporary group name (server assigned on reload)
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
            // patch local
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
        btn.innerHTML = '<i class="fa-brands fa-telegram"></i> Confirm & Notify via Telegram';
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
        await fetch(b.revertUrl, { method:'POST' });
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
        listEl.innerHTML = '<p style="color:var(--ds-text-muted);font-size:.85rem;text-align:center;padding:16px">ไม่มีรถที่สามารถ Swap ได้</p>';
    } else {
        listEl.innerHTML = swappable.map(v => {
            const isCurrent = v.id === b?.vehicleId;
            const statusLabel = isCurrent ? '<span class="swap-veh-status" style="background:#DCFCE7;color:#16A34A">ปัจจุบัน</span>'
                              : usedIds.has(v.id) ? '<span class="swap-veh-status" style="background:#EDE9FE;color:#4338CA">จองแล้ว</span>'
                              : '<span class="swap-veh-status" style="background:#DCFCE7;color:#16A34A">ว่าง</span>';
            return `<div class="swap-veh-item" onclick="selectSwapVehicle(${v.id},this)">
                <div class="swap-veh-radio"></div>
                <div>
                    <div class="swap-veh-label">${esc(v.brand+' '+v.model)}</div>
                    <div class="swap-veh-plate">${esc(v.plate)}</div>
                </div>
                ${statusLabel}
            </div>`;
        }).join('');
    }

    document.getElementById('swapConfirmBtn').disabled = true;
    bsSwapModal = bsSwapModal || new bootstrap.Modal(document.getElementById('swapModal'));
    bsSwapModal.show();
}

function selectSwapVehicle(id, el) {
    swapVehicleId = id;
    document.querySelectorAll('.swap-veh-item').forEach(x=>x.classList.remove('selected'));
    el.classList.add('selected');
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

function openAdminBookingDetail(id) {
    const b = bookings.find(x => x.id === id);
    if (!b) return;

    // Status badge
    const sb   = STATUS_BADGE[b.status] || STATUS_BADGE.pending;
    const si   = STATUS_ICON[b.status]  || STATUS_ICON.pending;
    const badge = document.getElementById('singleStatusBadge');
    badge.className = `rounded-2 ${sb.cls} px-3 py-2 fw-bold d-inline-flex align-items-center`;
    document.getElementById('singleStatusIcon').className  = `${si.fa} pe-2`;
    document.getElementById('singleStatusLabel').textContent = sb.label;

    // Date
    const [y, m, d] = b.startIso.split('T')[0].split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    document.getElementById('singleDateLine').textContent =
        `วัน${TH_DAYS_F[dow]} ที่ ${d} ${TH_MON_F[m]}`;

    // Time + vehicle
    document.getElementById('singleTime').textContent  = `${b.start} – ${b.end}`;
    document.getElementById('singlePlate').textContent = b.vehicleLabel || 'รอ Admin กำหนด';

    // Driver
    const driverLine = document.getElementById('singleDriverLine');
    if (b.needDriver) {
        document.getElementById('singleDriver').textContent = b.driverLabel || 'รอ Admin มอบหมาย';
        driverLine.style.display = '';
    } else {
        driverLine.style.display = 'none';
    }

    // Booking info
    document.getElementById('singleBooker').textContent  = b.booker || '–';
    document.getElementById('singlePurpose').textContent = b.purpose || '–';
    document.getElementById('singleDest').textContent    = b.dest    || '–';
    document.getElementById('singlePax').textContent     = b.pax     || '–';

    // Pickup (ไม่มีใน admin data)
    document.getElementById('singlePickupLine').setAttribute('hidden', '');

    // ซ่อน action buttons (admin ไม่ใช้ปุ่มจากหน้านี้)
    document.getElementById('singleActions').innerHTML = '';

    adminDetailModal = adminDetailModal || new bootstrap.Modal(document.getElementById('eventDetailModal'));
    adminDetailModal.show();
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
    const t = document.getElementById('admToast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
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
    renderWeekNav();
    // Update selected date heading
    const dow = selDate.getDay();
    const isTd = isToday(selDate);
    document.getElementById('selDateHeading').textContent =
        `วัน${TH_DAYS_F[dow]}ที่ ${selDate.getDate()} ${TH_MON_F[selDate.getMonth()+1]} ${selDate.getFullYear()+543}${isTd ? '  (วันนี้)' : ''}`;
    // Reset collapse when date changes
    beforeExpanded = !isPastOrToday(selDate);
    renderBefore();
    renderDuring();
    renderAfter();

    // Re-initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

renderAll();

window.addEventListener('resize', () => {
    // re-render if needed
});
