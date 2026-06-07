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

// let weekStart = new Date(today);
// weekStart.setDate(today.getDate() - (today.getDay() + 6) % 7);

let weekStart = new Date(today);
weekStart.setDate(today.getDate() - today.getDay());

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

function isToday(d) {
    return d.getFullYear()===today.getFullYear() && d.getMonth()===today.getMonth() && d.getDate()===today.getDate();
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
   WEEK NAVIGATION
══════════════════════════════════════════════════ */
// function renderWeekNav() {
//     const strip = document.getElementById('wnStrip');
//     strip.innerHTML = '';

//     for (let i = 0; i < 7; i++) {
//         const d     = new Date(weekStart); d.setDate(weekStart.getDate() + i);
//         const ds    = toDateStr(d);
//         const cnt   = bookings.filter(b => b.startIso.startsWith(ds)).length;
//         const isTd  = isToday(d);
//         const isSel = d.toDateString() === selDate.toDateString();

//         let dotCls = 'va-week-day-dot';
//         if (cnt >= 4)      dotCls += ' va-week-day-dot--lg';
//         else if (cnt >= 2) dotCls += ' va-week-day-dot--md';
//         else if (cnt === 1) dotCls += ' va-week-day-dot--sm';

//         const el = document.createElement('div');
//         el.className = `va-week-day${isTd?' va-week-day-today':''}${isSel?' va-week-day-active':''}`;
//         el.style.setProperty('--va-i', i);
//         el.innerHTML = `
//             <span class="va-week-day-name">${TH_DAYS_S[d.getDay()]}</span>
//             <span class="va-week-day-num">${d.getDate()}</span>
//             <div class="${dotCls}"${cnt>0?` title="${cnt} รายการ"`:''}></div>`;
//         el.addEventListener('click', () => {
//             selDate = new Date(d);
//             renderAll();
//         });
//         strip.appendChild(el);
//     }
// }

function renderWeekNav() {
    const strip = document.getElementById('wnStrip');
    strip.innerHTML = '';

    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);

        const ds    = toDateStr(d);
        const cnt   = bookings.filter(b => b.startIso.startsWith(ds)).length;
        const isTd  = isToday(d);
        const isSel = d.toDateString() === selDate.toDateString();

        let dotCls = 'va-week-day-dot';
        if (cnt >= 4)       dotCls += ' va-week-day-dot--lg';
        else if (cnt >= 2)  dotCls += ' va-week-day-dot--md';
        else if (cnt === 1) dotCls += ' va-week-day-dot--sm';

        const dayOfWeek = d.getDay();

        let textClass = '';
        if (dayOfWeek === 0) {
            textClass = ' text-danger';   // อาทิตย์
        } else if (dayOfWeek === 6) {
            textClass = ' text-primary';  // เสาร์
        }

        const el = document.createElement('div');
        el.className = `va-week-day${isTd ? ' va-week-day-today' : ''}${isSel ? ' va-week-day-active' : ''}`;
        el.style.setProperty('--va-i', i);

        el.innerHTML = `
            <span class="va-week-day-name${textClass} pb-2">${TH_DAYS_S[dayOfWeek]}</span>
            <span class="va-week-day-num">${d.getDate()}</span>
            <div class="${dotCls}"${cnt > 0 ? ` title="${cnt} รายการ"` : ''}></div>
        `;

        el.addEventListener('click', () => {
            selDate = new Date(d);
            renderAll();
        });

        strip.appendChild(el);
    }
}

function renderWeekMeta() {
    const dow = selDate.getDay();
    // heading สั้น: "อา. 7 มิ.ย. 2569" — today มี dot บน strip อยู่แล้ว ไม่ต้องมี tag
    const dayLine = `${TH_DAYS_S[dow]}. ${selDate.getDate()} ${TH_MON_S[selDate.getMonth()+1]} ${selDate.getFullYear()+543}`;
    const h2 = document.getElementById('selDateHeading');
    if (h2) h2.textContent = dayLine;
}

function shiftWeek(dir) {
    weekStart.setDate(weekStart.getDate() + dir * 7);
    renderWeekNav();
    renderWeekMeta();
}

/* ── Date picker popover ─────────────────────────── */
function _alignWeekStartTo(date) {
    // Monday-based: weekStart = date - ((dow + 6) % 7)
    const d = new Date(date);
    d.setDate(d.getDate() - (d.getDay() + 6) % 7);
    weekStart = d;
}

function openWeekPicker() {
    const pop = document.getElementById('weekPickerPop');
    const btn = document.getElementById('weekPickerBtn');
    const inp = document.getElementById('weekPickerInput');
    if (!pop || !btn) return;
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    if (inp) {
        inp.value = toDateStr(selDate);
        setTimeout(() => inp.focus(), 30);
    }
}
function closeWeekPicker() {
    const pop = document.getElementById('weekPickerPop');
    const btn = document.getElementById('weekPickerBtn');
    if (!pop || !btn) return;
    pop.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
}
function bindWeekControls() {
    const todayBtn  = document.getElementById('weekTodayBtn');
    const pickerBtn = document.getElementById('weekPickerBtn');
    const pickerInp = document.getElementById('weekPickerInput');
    const pickerPop = document.getElementById('weekPickerPop');

    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            selDate = new Date(today);
            _alignWeekStartTo(today);
            closeWeekPicker();
            renderAll();
        });
    }
    if (pickerBtn) {
        pickerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const expanded = pickerBtn.getAttribute('aria-expanded') === 'true';
            if (expanded) closeWeekPicker(); else openWeekPicker();
        });
    }
    if (pickerInp) {
        pickerInp.addEventListener('change', (e) => {
            const v = e.target.value; // "YYYY-MM-DD"
            if (!v) return;
            const [yy, mm, dd] = v.split('-').map(Number);
            const picked = new Date(yy, mm - 1, dd);
            if (isNaN(picked.getTime())) return;
            selDate = picked;
            _alignWeekStartTo(picked);
            closeWeekPicker();
            renderAll();
        });
    }
    // click outside
    document.addEventListener('click', (e) => {
        if (pickerPop && !pickerPop.hidden) {
            if (!pickerPop.contains(e.target) && !pickerBtn.contains(e.target)) {
                closeWeekPicker();
            }
        }
    });
    // Esc
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && pickerPop && !pickerPop.hidden) {
            closeWeekPicker();
            pickerBtn?.focus();
        }
    });
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

    document.getElementById('cnt-all').textContent      = cnt.all;
    document.getElementById('cnt-pending').textContent  = cnt.pending;
    document.getElementById('cnt-approver').textContent = cnt.waiting_approver;
    document.getElementById('cnt-approved').textContent = cnt.approved;
    document.getElementById('cnt-rejected').textContent = cnt.rejected;

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
        list.innerHTML = `<div class="vc-empty">
            <div class="vc-empty-icon"><i data-lucide="car" style="width:20px;height:20px;"></i></div>
            <p class="vc-empty-title">ไม่มีรายการจองรถ</p>
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

    /* Phase 14 (2026-06-07): 3-line layout —
       head(ชื่อผู้จอง | status) + trip(purpose → dest) + foot(badges scroll-x | actions) */
    const bookerName  = esc(b.booker || '—');
    const purposeText = esc(b.purpose || '—');
    const destText    = esc(b.dest || '—');

    const statusBadge = `<span class="bl-status vc-badge ${sb.cls}">${sb.label}</span>`;

    /* badge 1 — ช่วงเวลาเดินทาง */
    const timeText  = b.start ? `${esc(b.start)}${b.end ? `–${esc(b.end)}` : ''}` : '';
    const timeBadge = timeText
        ? `<span class="vc-badge vc-badge-neutral bl-badge"><i data-lucide="clock" class="vc-icon-sm"></i>${timeText}</span>` : '';

    /* badge 2 — ผู้โดยสาร */
    const paxBadge = `<span class="vc-badge vc-badge-neutral bl-badge"><i data-lucide="users" class="vc-icon-sm"></i>${b.pax || 0}</span>`;

    /* badge 2 — งบที่อนุมัติ (ยังไม่จัดสรร → amber เตือน) */
    const budget = budgetLabel(b);
    const budgetBadge = budget
        ? `<span class="vc-badge vc-badge-neutral bl-badge"><i data-lucide="wallet" class="vc-icon-sm"></i>${esc(budget)}</span>`
        : `<span class="vc-badge vc-badge-warning bl-badge"><i data-lucide="wallet" class="vc-icon-sm"></i>ยังไม่ได้จัดสรรงบ</span>`;

    /* badge 3 — งานนอกระบบ (driver เพิ่มเอง) → ม่วง subtle */
    const adhocBadge = b.isAdHoc
        ? `<span class="vc-badge bl-badge bl-badge-adhoc"><i data-lucide="user-plus" class="vc-icon-sm"></i>งานนอกระบบ</span>`
        : '';

    const actionsZone = actions
        ? `<div class="bl-actions" onclick="event.stopPropagation()">${actions}</div>` : '';

    /* Phase B — checkbox slot (visible only on selectable rows; placeholder keeps grid aligned) */
    const checkboxSlot = isSelectable
        ? `<input type="checkbox" class="bl-sel-check form-check-input" ${isSel?'checked':''} onclick="event.stopPropagation();toggleGroupSel(${b.id})" aria-label="เลือกเพื่อรวมงาน">`
        : isNotifySelectable
        ? `<input type="checkbox" class="bl-sel-check bl-sel-check--notify form-check-input" ${isNotifySel?'checked':''} onclick="event.stopPropagation();toggleNotifySel(${b.id})" aria-label="เลือกเพื่อแจ้ง">`
        : (groupMode || notifyMode)
        ? `<span class="bl-sel-slot" aria-hidden="true"></span>`
        : '';

    return `
    <div class="bl-card${b.status==='approved'?' bl-card--done':''}${isSel?' bl-selected':''}${isNotifySel?' bl-notify-selected':''}${isSelectable?' bl-group-mode':''}${isNotifySelectable?' bl-notify-mode':''}"
         id="blrow-${b.id}"
         style="--va-i:${idx}"
         ${isSelectable ? `onclick="toggleGroupSel(${b.id})"` : isNotifySelectable ? `onclick="toggleNotifySel(${b.id})"` : defaultClick}>
        ${checkboxSlot}
        <div class="bl-body">
            <div class="bl-head">
                <span class="bl-title">${bookerName}</span>
                ${statusBadge}
            </div>
            <div class="bl-trip">
                <span class="bl-trip-purpose">${purposeText}</span>
                <i data-lucide="arrow-right" class="vc-icon-sm bl-trip-arrow"></i>
                <span class="bl-trip-dest">${destText}</span>
            </div>
            <div class="bl-foot">
                <div class="bl-badges">
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
            /* Desktop: approve (pencil icon) + reject pair; mobile: reject hidden via .bl-action-secondary */
            return `
                <button type="button" class="vc-btn vc-btn-primary vc-btn-icon vc-btn-sm" title="อนุมัติ" onclick="${stop}openAssignModal(${b.id},'approve')">
                    <i data-lucide="pencil" class="vc-icon-sm"></i>
                </button>
                <button type="button" class="vc-btn vc-btn-secondary vc-btn-icon vc-btn-sm bl-action-secondary" title="ปฏิเสธ" onclick="${stop}openAssignModal(${b.id},'reject')">
                    <i data-lucide="circle-x" class="vc-icon-sm"></i>
                </button>`;
        case 'waiting_approver':
        case 'forwarded':
            /* Admin can edit assignment at any status — even after forwarding to approver */
            return `
                <button type="button" class="vc-btn vc-btn-ghost vc-btn-icon vc-btn-sm" title="แก้ไข" onclick="${stop}openAssignModal(${b.id},'edit')">
                    <i data-lucide="pencil" class="vc-icon-sm"></i>
                </button>`;
        case 'approved':
            return `
                <button type="button" class="vc-btn vc-btn-ghost vc-btn-icon vc-btn-sm" title="แก้ไข" onclick="${stop}openAssignModal(${b.id},'edit')">
                    <i data-lucide="pencil" class="vc-icon-sm"></i>
                </button>
                <button type="button" class="vc-btn vc-btn-ghost vc-btn-icon vc-btn-sm bl-action-secondary" title="ย้อนสถานะ" onclick="${stop}openRevertModal(${b.id})">
                    <i data-lucide="rotate-cw" class="vc-icon-sm"></i>
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

    /* Phase B — group title badge คงเดิม ("N งานรวม"); checkbox ย้ายไปเป็น leftmost slot */
    const titleBadge = `<span class="bl-status vc-badge vc-badge-success vc-badge-dot">${members.length} งานรวม</span>`;
    const grpCheckboxSlot = isGrpNotifySelectable
        ? `<input type="checkbox" class="bl-sel-check bl-sel-check--notify form-check-input" ${isGrpNotifySel?'checked':''} onclick="event.stopPropagation();toggleGroupNotifySel('${grpName}')" aria-label="เลือกกลุ่มเพื่อแจ้ง">`
        : (groupMode || notifyMode)
        ? `<span class="bl-sel-slot" aria-hidden="true"></span>`
        : '';

    /* Phase A: sub-rows = destination title + meta (pax · time · booker), no per-row ungroup (header only) */
    const subItems = members.map(b => `
        <div class="bl-group-sub">
            <div class="bl-group-sub-info">
                <div class="bl-group-sub-head">
                    <span class="bl-group-sub-name">${esc(b.dest || b.booker)}</span>
                </div>
                <div class="bl-group-sub-meta">
                    <span><i data-lucide="users" class="vc-icon-sm bl-meta-ico"></i>${b.pax}</span>
                    <span class="bl-meta-dot">·</span>
                    <span>${esc(b.start)}</span>
                    <span class="bl-meta-dot">·</span>
                    <span class="bl-group-sub-dest">${esc(b.booker)}</span>
                </div>
            </div>
        </div>`).join('');

    /* Phase 14.1 (2026-06-07): group row โครง 3-line คล้าย single —
       head(รถ | "N งานรวม") + trip(สรุป) + foot(badges เวลา/คน | actions) */
    const grpTimeBadge = times
        ? `<span class="vc-badge vc-badge-neutral bl-badge"><i data-lucide="clock" class="vc-icon-sm"></i>${esc(times)}</span>` : '';
    const grpPaxBadge = `<span class="vc-badge vc-badge-neutral bl-badge"><i data-lucide="users" class="vc-icon-sm"></i>${totalPax}</span>`;

    return `
    <div class="bl-card bl-card--group${isGrpNotifySel?' bl-notify-selected':''}${isGrpNotifySelectable?' bl-notify-mode':''}"
         id="blgrp-${grpName}"
         style="--va-i:${idx}"
         ${isGrpNotifySelectable ? `onclick="toggleGroupNotifySel('${grpName}')"` : ''}>
        ${grpCheckboxSlot}
        <div class="bl-body">
            <div class="bl-head">
                <span class="bl-title">${esc(vLabel)}</span>
                ${titleBadge}
            </div>
            <div class="bl-foot">
                <div class="bl-badges">
                    ${grpTimeBadge}
                    ${grpPaxBadge}
                </div>
                <div class="bl-actions" onclick="event.stopPropagation()">
                    <button type="button" class="vc-btn vc-btn-ghost vc-btn-icon vc-btn-sm" onclick="ungroupAll('${grpName}')" title="แยกงานทั้งหมด">
                        <i data-lucide="shuffle" class="vc-icon-sm"></i>
                    </button>
                    <button type="button" class="vc-btn vc-btn-ghost vc-btn-icon vc-btn-sm" onclick="openAssignModal(null,'group','${grpName}')" title="แก้ไขกลุ่ม">
                        <i data-lucide="pencil" class="vc-icon-sm"></i>
                    </button>
                    <button type="button" class="vc-btn vc-btn-ghost vc-btn-icon vc-btn-sm bl-grp-chev"
                            data-bs-toggle="collapse"
                            data-bs-target="#${colId}"
                            aria-expanded="false"
                            onclick="event.stopPropagation()"
                            title="ขยาย/ย่อ">
                        <i data-lucide="chevron-down" class="vc-icon-sm"></i>
                    </button>
                </div>
            </div>
            <div class="collapse bl-grp-collapse" id="${colId}">
                ${subItems}
            </div>
        </div>
    </div>`;
}

function setFilter(f, el) {
    curFilter = f;
    document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    renderBefore();
}

/* ── Group Mode ───────────────────────────────── */
function toggleGroupMode() {
    groupMode = true; groupSel.clear();
    document.getElementById('btnMerge').style.display        = 'none';
    document.getElementById('btnNotify').style.display       = 'none';
    document.getElementById('btnMergeCancel').style.display  = 'inline-flex';
    document.getElementById('btnMergeConfirm').style.display = 'inline-flex';
    document.getElementById('bookingList')?.classList.add('va-list--selecting');
    updateMergeBtn();
    renderBefore();
}

function cancelGroupMode() {
    groupMode = false; groupSel.clear();
    document.getElementById('btnMerge').style.display        = '';
    document.getElementById('btnNotify').style.display       = '';
    document.getElementById('btnMergeCancel').style.display  = 'none';
    document.getElementById('btnMergeConfirm').style.display = 'none';
    document.getElementById('bookingList')?.classList.remove('va-list--selecting');
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
    document.getElementById('bookingList')?.classList.add('va-list--selecting');
    updateNotifyBtn();
    renderBefore();
}

function cancelNotifyMode() {
    notifyMode = false; notifySel.clear();
    document.getElementById('btnMerge').style.display         = '';
    document.getElementById('btnNotify').style.display        = '';
    document.getElementById('btnNotifyCancel').style.display  = 'none';
    document.getElementById('btnNotifyConfirm').style.display = 'none';
    document.getElementById('bookingList')?.classList.remove('va-list--selecting');
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

    const iconName = status === 'maintenance' ? 'wrench' : 'car';
    const iconCls  = (status === 'inuse' || status === 'reserved') ? 'vs-icon-active'
                   : status === 'maintenance' ? 'vs-icon-maintenance' : '';

    const xs = 'width:11px;height:11px;';
    let detail = '';
    if (bk && (status === 'inuse' || status === 'reserved')) {
        const driver = bk.driverLabel ? `${esc(bk.driverLabel)} · ` : '';
        detail = `<div class="vs-detail"><span>${driver}${esc(bk.dest)}</span></div>`;
    } else if (status === 'available') {
        detail = `<div class="vs-detail vs-detail-available">
            <i data-lucide="circle-check" style="${xs}"></i><span>ว่าง</span>
        </div>`;
    } else if (status === 'maintenance') {
        const note = v.repairNote ? esc(v.repairNote) : 'ส่งซ่อม';
        detail = `<div class="vs-detail vs-detail-maintenance">
            <i data-lucide="wrench" style="${xs}"></i><span>${note}</span>
        </div>`;
    }

    let actions = '';
    if ((status === 'reserved' || status === 'inuse') && bk) {
        actions = `<button class="vs-btn" onclick="openSwapModal(${bk.id})">
            <i data-lucide="shuffle" style="${xs}"></i> Swap
        </button>`;
    } else if (status === 'maintenance') {
        actions = `<button class="vs-btn vs-btn-fix" onclick="fixDone(${v.id})">
            <i data-lucide="circle-check" style="${xs}"></i> เสร็จซ่อม
        </button>`;
    } else if (status === 'available') {
        actions = `<button class="vs-btn vs-btn-repair" title="ส่งซ่อม" onclick="openRepairModal(${v.id})">
            <i data-lucide="wrench" style="width:12px;height:12px;"></i>
        </button>`;
    }

    return `
    <div class="vs-row">
        <div class="vs-icon ${iconCls}">
            <i data-lucide="${iconName}" style="width:16px;height:16px;"></i>
        </div>
        <div class="vs-info">
            <div class="vs-name">${esc(v.plate)}</div>
            <div class="vs-brand">${esc(v.brand)} ${esc(v.model)}</div>
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
        initIcons();
        return;
    }

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

/* tag งบ สำหรับ fuel/OT badge (personal = เรียกเก็บ) */
function tripBudgetTag(expType) {
    if (expType === 'central')    return 'หักงบส่วนกลาง';
    if (expType === 'department') return 'หักงบส่วนกอง';
    return 'เรียกเก็บ';
}

function renderTripRow(group) {
    const b       = group[0];
    const isGroup = group.length > 1;

    const bm      = group.find(x => x.odoStart !== null && x.odoEnd !== null) || b;
    const started = bm.odoStart !== null;                          // ออกเลขเริ่มแล้ว
    const hasOdo  = bm.odoStart !== null && bm.odoEnd !== null;    // ปิดงานแล้ว
    const dist    = hasOdo ? (bm.odoEnd - bm.odoStart) : 0;

    const veh      = vehicles.find(v => v.id === bm.vehicleId);
    const fuelRate = veh ? Number(veh.fuelRate) : 0;
    const override = Number(bm.fuelCost) || 0;
    const autoCost = (hasOdo && fuelRate > 0)
                     ? Math.round((dist / fuelRate) * fuelPrice * 100) / 100
                     : 0;
    const total    = hasOdo ? (override > 0 ? override : autoCost) : 0;

    const plate    = b.vehicleLabel ? b.vehicleLabel.split(' · ').pop() : '—';
    const destText = isGroup ? `งานร่วม ${group.length} รายการ` : esc(b.dest || b.booker || '—');

    const budgetTag = tripBudgetTag(b.expType);
    const isCharge  = b.expType === 'personal';

    /* บรรทัด 1 มุมขวา — payment (ว่างถ้ายังไม่ปิดงาน) */
    let payHtml = '';
    if (hasOdo) {
        if (isCharge) {
            payHtml = bm.personalStatus === 1
                ? `<span class="va-trip-pay va-trip-pay--done"><i data-lucide="circle-check" class="vc-icon-sm"></i>จ่ายแล้ว · ${esc(bm.personalPaidAt)}</span>`
                : `<button type="button" class="va-trip-pay-btn" onclick="event.stopPropagation();markPaid(${bm.mileageId}, ${bm.id})" title="ยืนยันการชำระเงินจากผู้จอง"><i data-lucide="wallet" class="vc-icon-sm"></i>ยืนยันการชำระเงิน</button>`;
        } else {
            payHtml = `<span class="va-trip-pay va-trip-pay--done"><i data-lucide="circle-check" class="vc-icon-sm"></i>จ่ายแล้ว${bm.actualEnd ? ` · ${esc(bm.actualEnd)}` : ''}</span>`;
        }
    }

    /* บรรทัด 2 — mileage (icon car) */
    const mileageHtml = hasOdo
        ? `<div class="va-trip-mileage">
               <i data-lucide="car" class="vc-icon-sm va-trip-mileage-ico"></i>
               <span class="vc-mono">${fmtNum(bm.odoStart)} → ${fmtNum(bm.odoEnd)}</span>
               <span class="va-trip-mileage-dot">·</span>
               <span class="vc-mono">${fmtNum(dist)} กม.</span>
               ${fuelRate > 0 ? `<span class="va-trip-mileage-dot">·</span><span class="vc-mono">${fmtNum(fuelRate)} กม./ลิตร</span>` : ''}
           </div>`
        : `<div class="va-trip-mileage va-trip-mileage--empty">ยังไม่บันทึกเลขไมล์</div>`;

    /* บรรทัด 3 — badges: คนขับ · สถานะ · อัตราน้ำมัน · ค่าน้ำมัน · OT */
    const driverBadge = b.driverLabel
        ? `<span class="vc-badge vc-badge-neutral va-trip-badge"><i data-lucide="user" class="vc-icon-sm"></i>${esc(b.driverLabel)}</span>`
        : '';

    const isPast = new Date(b.endIso) < serverNow;
    let stCls, stIcon, stLabel;
    if (hasOdo)       { stCls = 'vc-badge-success'; stIcon = 'flag';       stLabel = 'สิ้นสุดการเดินทาง'; }
    else if (started) { stCls = 'vc-badge-blue';    stIcon = 'navigation'; stLabel = 'เริ่มเดินทาง'; }
    else if (isPast)  { stCls = 'vc-badge-neutral'; stIcon = 'circle-x';   stLabel = 'ยกเลิก (ไม่บันทึกไมล์)'; }
    else              { stCls = 'vc-badge-warning'; stIcon = 'clock';      stLabel = 'รอเดินทาง'; }
    const statusBadge = `<span class="vc-badge ${stCls} va-trip-badge"><i data-lucide="${stIcon}" class="vc-icon-sm"></i>${stLabel}</span>`;

    // const rateBadge = `<span class="vc-badge vc-badge-neutral va-trip-badge"><i data-lucide="fuel" class="vc-icon-sm"></i>${fmtNum(fuelPrice)}฿/ลิตร</span>`;

    const fuelBadge = hasOdo
        ? `<span class="vc-badge va-trip-badge ${isCharge ? 'vc-badge-warning' : 'vc-badge-neutral'}"><i data-lucide="fuel" class="vc-icon-sm"></i>${fmtBaht(total)} (${budgetTag}) | ${fmtNum(fuelPrice)}฿/ลิตร </span>`
        : '';
    const otH = Number(bm.otHours)  || 0;
    const otA = Number(bm.otAmount) || 0;
    const otBadge = otA > 0
        ? `<span class="vc-badge va-trip-badge ${isCharge ? 'vc-badge-warning' : 'va-trip-badge--ot'}"><i data-lucide="clock" class="vc-icon-sm"></i>OT +${fmtNum(otH)} ชม. · ${fmtBaht(otA)} (${budgetTag})</span>`
        : '';

    return `
    <div class="va-trip${!hasOdo ? ' va-trip--no-mileage' : ''}">
        <div class="va-trip-head">
            <span class="va-trip-plate">${esc(plate)}</span>
            <i data-lucide="arrow-right" class="vc-icon-sm va-trip-arrow"></i>
            <span class="va-trip-dest">${destText}</span>
            ${payHtml}
        </div>
        ${mileageHtml}
        <div class="va-trip-badges">
            ${driverBadge}
            ${statusBadge}
            ${fuelBadge}
            ${otBadge}
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
    const warn = document.getElementById('modalBudgetWarn');
    if (!sub.value || modalExpType==='personal') { bar.style.display='none'; return; }
    const list = budgets[modalExpType]||[];
    const entry= list.find(x=>x.key===sub.value);
    if (!entry||!entry.total) { bar.style.display='none'; return; }
    const rem    = entry.total - entry.used;
    const usedPct= Math.min(entry.total>0?(entry.used/entry.total)*100:0, 100);
    const remPct = entry.total>0 ? (Math.max(rem,0)/entry.total)*100 : 0;

    let tone = 'ok';
    if (rem <= 0)        tone = 'danger';
    else if (remPct < 10) tone = 'danger';
    else if (remPct < 20) tone = 'warn';

    bar.classList.remove('va-budget--ok','va-budget--warn','va-budget--danger');
    bar.classList.add(`va-budget--${tone}`);

    document.getElementById('modalBudgetLabel').textContent = 'งบคงเหลือ';
    document.getElementById('modalBudgetValue').textContent = `${fmtNum(rem)} / ${fmtNum(entry.total)} บ.`;
    document.getElementById('modalBudgetFill').style.width = `${usedPct}%`;

    if (warn) {
        if (tone === 'ok') {
            warn.hidden = true;
        } else {
            warn.hidden = false;
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
        btn.innerHTML = '<i data-lucide="send" class="vc-icon-sm"></i> Confirm & Notify via Telegram';
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
        listEl.innerHTML = `<div class="vc-empty">
            <div class="vc-empty-icon"><i data-lucide="car-off" style="width:20px;height:20px;"></i></div>
            <p class="vc-empty-title">ไม่มีรถที่สามารถ Swap ได้</p>
        </div>`;
    } else {
        listEl.innerHTML = swappable.map(v => {
            const isCurrent = v.id === b?.vehicleId;
            const statusLabel = isCurrent ? '<span class="swap-veh-status vc-badge vc-badge-blue vc-badge-dot">ปัจจุบัน</span>'
                              : usedIds.has(v.id) ? '<span class="swap-veh-status vc-badge vc-badge-neutral vc-badge-dot">จองแล้ว</span>'
                              : '<span class="swap-veh-status vc-badge vc-badge-success vc-badge-dot">ว่าง</span>';
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

    const sb   = STATUS_BADGE[b.status] || STATUS_BADGE.pending;
    const si   = STATUS_ICON[b.status]  || STATUS_ICON.pending;
    const badge = document.getElementById('singleStatusBadge');
    badge.className = `rounded-2 ${sb.cls} px-3 py-2 fw-bold d-inline-flex align-items-center`;
    document.getElementById('singleStatusIcon').className  = `${si.fa} pe-2`;
    document.getElementById('singleStatusLabel').textContent = sb.label;

    const [y, m, d] = b.startIso.split('T')[0].split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    document.getElementById('singleDateLine').textContent =
        `วัน${TH_DAYS_F[dow]} ที่ ${d} ${TH_MON_F[m]}`;

    document.getElementById('singleTime').textContent  = `${b.start} – ${b.end}`;
    document.getElementById('singlePlate').textContent = b.vehicleLabel || 'รอ Admin กำหนด';

    const driverLine = document.getElementById('singleDriverLine');
    if (b.needDriver) {
        document.getElementById('singleDriver').textContent = b.driverLabel || 'รอ Admin มอบหมาย';
        driverLine.style.display = '';
    } else {
        driverLine.style.display = 'none';
    }

    document.getElementById('singleBooker').textContent  = b.booker || '–';
    document.getElementById('singlePurpose').textContent = b.purpose || '–';
    document.getElementById('singleDest').textContent    = b.dest    || '–';
    document.getElementById('singlePax').textContent     = b.pax     || '–';

    document.getElementById('singlePickupLine').setAttribute('hidden', '');

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
    renderWeekMeta();
    renderBefore();
    renderDuring();
    renderAfter();
    initIcons();
}

/* ── Expose to window for legacy onclick handlers ── */
Object.assign(window, {
    shiftWeek, toggleGroupMode, cancelGroupMode, confirmMerge,
    toggleNotifyMode, cancelNotifyMode, confirmNotify,
    setFilter,
    toggleGroupSel, toggleNotifySel, toggleGroupNotifySel,
    openAssignModal, openRevertModal, openAdminBookingDetail,
    openSwapModal, openRepairModal,
    splitBooking, ungroupAll, fixDone,
    setModalExpType, updateExpSubDropdown, checkAssignReady,
    submitAssign, submitRevert, submitSwap, submitRepair,
    selectSwapVehicle, markPaid, notifyDept,
});

bindWeekControls();
renderAll();
