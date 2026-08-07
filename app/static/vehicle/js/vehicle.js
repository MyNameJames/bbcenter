/* ══════════════════════════════════════════════════
   pages/vehicle.js — BB Center user-facing vehicle page (ES module)
   Calendar + booking + group rendering + 4 modals.
══════════════════════════════════════════════════ */

import { initIcons, bindModalReinit } from '../../core/js/icons.js';
bindModalReinit();
// Popover content (calendar "+N รายการ") render asynchronously — re-init Lucide ตอน popover เปิด
// + Escape-to-close ทุก popover ที่เปิดอยู่
document.addEventListener('shown.bs.popover', () => {
    document.querySelectorAll('.popover').forEach(tip => initIcons(tip));
});
document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    const openTips = document.querySelectorAll('.popover.show');
    if (!openTips.length) return;
    document.querySelectorAll('[data-bs-toggle="popover"]').forEach(el => {
        bootstrap.Popover.getInstance(el)?.hide();
    });
});
// ปิด popover "+N รายการ" เมื่อคลิกนอกพื้นที่ popover (trigger เองมี stopPropagation
// อยู่แล้วเลยไม่ถูก listener นี้ตัดตอนตอนเปิด/toggle)
document.addEventListener('click', (ev) => {
    if (ev.target.closest('.popover.bb-daypop')) return;
    if (!document.querySelector('.popover.bb-daypop.show')) return;
    document.querySelectorAll('[data-bs-toggle="popover"]').forEach(el => {
        bootstrap.Popover.getInstance(el)?.hide();
    });
});

// Keyboard navigation — ← / → เปลี่ยนเดือน, T = วันนี้
// Skip เมื่อ focus อยู่ใน input/textarea/contenteditable หรือ modal เปิดอยู่
document.addEventListener('keydown', (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const t = ev.target;
    if (t && (t.matches('input,textarea,select,[contenteditable="true"]') ||
              t.closest('.modal.show'))) return;
    if (ev.key === 'ArrowLeft')       document.getElementById('prevMonthBtn')?.click();
    else if (ev.key === 'ArrowRight') document.getElementById('nextMonthBtn')?.click();
    else if (ev.key === 't' || ev.key === 'T') document.getElementById('todayBtn')?.click();
});

/* ── Constants ────────────────────────────────── */
const TH_MONTHS = [
    'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];
const STATUS_LABEL = {
    pending:          'รออนุมัติ',
    waiting_approver: 'รอผู้ประสานงานกอง',
    approved:         'อนุมัติแล้ว',
    rejected:         'ไม่อนุมัติ',
    completed:        'เสร็จแล้ว'
};
const STATUS_BADGE = {
    pending:          'vc-badge vc-badge-warning vc-badge-dot',
    waiting_approver: 'vc-badge vc-badge-blue vc-badge-dot',
    approved:         'vc-badge vc-badge-success vc-badge-dot',
    rejected:         'vc-badge vc-badge-danger vc-badge-dot',
    completed:        'vc-badge vc-badge-neutral vc-badge-dot'
};
const STATUS_DOT = {
    pending:          'pending',
    waiting_approver: 'approver',
    approved:         'approved',
    rejected:         'rejected',
    completed:        'approved',
};
const EVENT_CARD_STYLE = {
    pending:          'background:var(--bb-wr-bg);color:var(--bb-wr-tx);',
    waiting_approver: 'background:var(--bb-info-bg);color:var(--bb-info-tx);',
    approved:         'background:var(--bb-ok-bg);color:var(--bb-ok-tx);',
    rejected:         'background:var(--bb-dg-bg);color:var(--bb-dg-tx);',
    completed:        'background:var(--bb-n100);color:var(--bb-mut);'
};
const STATUS_ICON = {
    pending:          'clock',
    waiting_approver: 'send',
    approved:         'circle-check',
    rejected:         'circle-x',
    completed:        'check-circle-2'
};
/* Phase 2026-08-03 — vrc-m-list การ์ดใหม่ (bb-card style ตาม adminPreviewCards): avatar tone/bb-status class/icon ต่อ status */
const STATUS_TONE = {
    pending:          { bg: 'var(--bb-wr-bg)',   fg: 'var(--bb-wr-tx)'   },
    waiting_approver: { bg: 'var(--bb-info-bg)', fg: 'var(--bb-info-tx)' },
    approved:         { bg: 'var(--bb-ok-bg)',   fg: 'var(--bb-ok-tx)'   },
    rejected:         { bg: 'var(--bb-dg-bg)',   fg: 'var(--bb-dg-tx)'   },
    completed:        { bg: 'var(--bb-n100)',    fg: 'var(--bb-mut)'    }
};
const BB_STATUS_TONE = {
    pending:          'is-wr',
    waiting_approver: 'is-info',
    approved:         'is-ok',
    rejected:         'is-dg',
    completed:        'is-neutral'
};
/* Material Symbols ตรงๆ ไม่ใช้ data-lucide shim (โค้ดใหม่ตาม feedback_material_symbols_direct) */
const BB_STATUS_ICON = {
    pending:          'schedule',
    waiting_approver: 'send',
    approved:         'check_circle',
    rejected:         'cancel',
    completed:        'task_alt'
};

/* ── State ─────────────────────────────────────── */
let currentDate      = new Date();
currentDate.setDate(1);
let selectedDate     = new Date();
let calendarCollapsed = false;
let bookingModal, eventDetailModal, moreEventsModal;

/* Hide cancelled bookings ใน user-facing view (2026-05-23) — admin หน้าอื่นยังเห็น */
const mockEvents = (window.BOOKINGS || []).filter(e => e.status !== 'cancelled');
const VEHICLES   = window.VEHICLES || [];
const DRIVERS    = window.DRIVERS  || [];

/* ── Helpers ───────────────────────────────────── */
function sortByTime(arr) {
    return [...arr].sort((a, b) => {
        const m = t => { const [h, mm] = t.split(':').map(Number); return h * 60 + mm; };
        return m(a.time) - m(b.time);
    });
}
function calcDuration(s, e) {
    const [h1,m1] = s.split(':').map(Number), [h2,m2] = e.split(':').map(Number);
    let d = (h2*60+m2)-(h1*60+m1); if(d<=0) d+=1440;
    const h=Math.floor(d/60), m=d%60;
    return h===0?`${m} นาที`:m===0?`${h} ชั่วโมง`:`${h} ชม. ${m} นาที`;
}

function isSoloBooking(e) {
    if (!e.tripGroup) return true;
    const partners = mockEvents.filter(b =>
        b.tripGroup === e.tripGroup && b.id !== e.id &&
        b.status !== 'rejected'
    );
    return partners.length === 0;
}

/* ── Init (module deferred — DOM is ready) ────── */
bookingModal     = new bootstrap.Modal(document.getElementById('bookingModal'));
eventDetailModal = new bootstrap.Modal(document.getElementById('eventDetailModal'));
moreEventsModal  = new bootstrap.Modal(document.getElementById('moreEventsModal'));

/* ปิด popover "+N รายการ" ทุกครั้งที่ modal ใดๆ ในหน้ากำลังจะเปิด — จุดเดียวครอบทุกทาง
   (เดิมปะเฉพาะ openEventDetail() แล้วพลาด — ปุ่ม "จองรถ"/คลิกช่องวันก็เปิด modal ได้เหมือนกัน
   แต่ไม่ผ่านจุดนั้น ทำให้ popover ที่ append ไปที่ <body> ลอยทะลุ backdrop ขึ้นมา) */
document.addEventListener('show.bs.modal', () => {
    document.querySelectorAll('[data-bs-toggle="popover"]').forEach(el => {
        bootstrap.Popover.getInstance(el)?.hide();
    });
});

initFlatpickr();
renderCalendar();
initMobileScrollCollapse();

/* ── Month navigation (Phase B 2026-05-23: dual-bind desktop + mobile) ── */
const _prevMonth = () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); };
const _nextMonth = () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); };
const _gotoToday = () => {
    currentDate = new Date(); currentDate.setDate(1);
    selectedDate = new Date();
    renderCalendar();
};
['prevMonthBtn','prevMonthBtnMobile'].forEach(id => document.getElementById(id)?.addEventListener('click', _prevMonth));
['nextMonthBtn','nextMonthBtnMobile'].forEach(id => document.getElementById(id)?.addEventListener('click', _nextMonth));
['todayBtn','todayBtnMobile'].forEach(id => document.getElementById(id)?.addEventListener('click', _gotoToday));

/* ── Unlock month nav prev button after every render ── */
const calBody = document.getElementById('calendarBody');
function unlockMonthNav() {
    const prev = document.getElementById('prevMonthBtn');
    if (prev) prev.disabled = false;
}
function hideOtherMonthEvents() {
    document.querySelectorAll('.calendar-cell.other-month .events-container')
        .forEach(c => { c.innerHTML = ''; });
}
if (calBody) {
    new MutationObserver(unlockMonthNav).observe(calBody, { childList: true });
    new MutationObserver(hideOtherMonthEvents).observe(calBody, { childList: true, subtree: true });
}
unlockMonthNav();

/* ── bookingForm validation ────────────────────── */
document.getElementById('bookingForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    this.classList.add('was-validated');
    const date = bkDateFieldEl()?.__bbGetValue() || '';
    if (!date) {
        const err = document.getElementById('bk_date_err');
        if (err) err.hidden = false;
        return;
    }
    if (!this.checkValidity()) return;
    const range = bkTimeRangeEl()?.__bbGetRange() || {};
    document.getElementById('bk_start_datetime').value = date + 'T' + range.start;
    document.getElementById('bk_end_datetime').value   = date + 'T' + range.end;
    this.submit();
});
document.querySelectorAll('#bookingForm [required]').forEach(field => {
    ['input', 'change'].forEach(evt => field.addEventListener(evt, () => {
        field.classList.toggle('is-valid', field.checkValidity());
    }));
});
document.getElementById('bookingModal')?.addEventListener('shown.bs.modal', function() {
    document.querySelectorAll('#bookingForm [required]').forEach(field => {
        if (field.value) field.classList.toggle('is-valid', field.checkValidity());
    });
});
document.getElementById('bookingModal')?.addEventListener('hidden.bs.modal', function() {
    const f = document.getElementById('bookingForm');
    if (f) {
        f.classList.remove('was-validated');
        f.reset();
        f.querySelectorAll('.is-valid').forEach(el => el.classList.remove('is-valid'));
        // form.reset() คืนแค่ hidden input ของแต่ละ component ไม่คืนตัวเลข/ข้อความที่โชว์ — sync มือ
        window.bkSetPax?.(1);
        bkDateFieldEl()?.__bbClear();
        bkTimeRangeEl()?.__bbSetRange('08:00', '17:00');
    }
});

/* ── Mobile scroll logic ───────────────────────── */
function initMobileScrollCollapse() {
    const list = document.getElementById('mobileListContent');
    if (!list) return;

    list.addEventListener('scroll', () => {
        if (window.innerWidth >= 768) return;
        const y = list.scrollTop;
        if (y > 10 && !calendarCollapsed) {
            calendarCollapsed = true;
            collapseCalendarCells();
        } else if (y <= 10 && calendarCollapsed) {
            calendarCollapsed = false;
            expandCalendar();
        }
    });
}

function collapseCalendarCells() {
    const all = Array.from(document.querySelectorAll('#calendarBody .calendar-cell'));
    if (!all.length) return;
    const rows = [];
    for (let i = 0; i < all.length; i += 7) rows.push(all.slice(i, i + 7));
    let selIdx = rows.findIndex(r => r.some(c => c.classList.contains('selected')));
    if (selIdx < 0) selIdx = 0;
    const isLast = selIdx === rows.length - 1;
    rows.forEach((row, i) => {
        const show = isLast ? (i===selIdx-1||i===selIdx) : (i===selIdx||i===selIdx+1);
        row.forEach(c => c.style.display = show ? '' : 'none');
    });
}

function expandCalendar() {
    document.querySelectorAll('#calendarBody .calendar-cell').forEach(c => {
        c.style.display = '';
    });
}

function initFlatpickr() {
    // booking modal (จอง+แก้ไข ใช้ modal เดียวกัน) — date/time เป็น DateField/TimeRangeField
    // component แล้ว (bb-components.js) จัดการใน bkBindBookingControls แค่ event/OT warning
    // flatpickr เอาออกแล้ว (2026-07-28) — เดิมใช้เฉพาะ edit modal ที่รวมเข้า bookingModal แล้ว
}

/* ══ Booking modal — DateField/TimeRangeField (component กลาง) + OT warning ══════
   2026-07-29: date/time ย้ายจาก native input + custom list → DateField/TimeRangeField
   (core/js/bb-components.js, event 'bb-datefield:change'/'bb-timerangefield:change')
   · OT warning เมื่อวันอาทิตย์ / นอกเวลา 08:00–17:00 (อ่าน rate จาก window.OT_RATES) */
const BK_WORK_START = 480;   // 08:00 (นาที)
const BK_WORK_END   = 1020;  // 17:00
const _t2m = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
function _fmtDur(mins) {
    const h = Math.floor(mins / 60), m = mins % 60, parts = [];
    if (h) parts.push(`${h} ชม.`);
    if (m) parts.push(`${m} นาที`);
    return parts.join(' ') || '0 นาที';
}

let bkSelDate = null;   // Date — sync จาก event bb-datefield:change (bkBindBookingControls)

function bkDateFieldEl() { return document.getElementById('bk_date_field'); }
function bkTimeRangeEl() { return document.getElementById('bk_timerange_field'); }

/* ตั้งค่าวัน/ช่วงเวลาแบบโปรแกรม (เปิด modal สร้างใหม่/แก้ไข) — bkSelDate + OT warning
   sync ผ่าน event listener ใน bkBindBookingControls (component ยิง event เองตอน __bbSetValue) */
function bkSetDate(ds) { bkDateFieldEl()?.__bbSetValue(ds); }
function bkClearDate() {
    bkDateFieldEl()?.__bbClear();
    bkSelDate = null;
    bkUpdateWarning();
}
function bkSetTimeRange(start, end) {
    bkTimeRangeEl()?.__bbSetRange(start, end);
    bkUpdateWarning();
}

/* คำนวณค่าล่วงเวลาสารถีจากวัน+เวลา — null = ไม่เข้าเกณฑ์ OT */
function bkComputeOT() {
    const rates = window.OT_RATES || [];
    if (!bkSelDate) return null;
    const jsDow = bkSelDate.getDay();
    if (jsDow === 0) {  // วันอาทิตย์ = หยุดทั้งวัน
        const r = rates.find(x => x.dow === 6);
        return { type: 'sunday', rate: r ? r.rate : null };
    }
    const range = bkTimeRangeEl()?.__bbGetRange() || {};
    const sMin = _t2m(range.start || '08:00');
    const eMin = _t2m(range.end   || '17:00');
    if (eMin <= sMin) return null;
    const segs = [];
    if (sMin < BK_WORK_START) segs.push([sMin, Math.min(eMin, BK_WORK_START)]);
    if (eMin > BK_WORK_END)   segs.push([Math.max(sMin, BK_WORK_END), eMin]);
    if (!segs.length) return null;
    const pyDow = (jsDow + 6) % 7;  // JS(0=Sun) → Python(0=Mon)
    const bands = rates.filter(b => b.dow !== 6 && (b.dow == null || b.dow === pyDow));
    let amt = 0, mins = 0; const rset = new Set();
    segs.forEach(([s, e]) => bands.forEach(b => {
        const bs = _t2m(b.start);
        const be = (b.end === '24:00' || b.end === '00:00') ? 1440 : _t2m(b.end);
        const ov = Math.max(0, Math.min(e, be) - Math.max(s, bs));
        if (ov > 0) { mins += ov; amt += ov / 60 * b.rate; rset.add(b.rate); }
    }));
    if (mins === 0) return null;
    return { type: 'afterhours', minutes: mins, amount: amt, rates: [...rset].sort((a, b) => a - b) };
}

function bkUpdateWarning() {
    const box = document.getElementById('bk_ot_warn');
    const txt = document.getElementById('bk_ot_warn_text');
    if (!box || !txt) return;
    const ot = bkComputeOT();
    if (!ot) { box.hidden = true; txt.innerHTML = ''; return; }
    if (ot.type === 'sunday') {
        const r = ot.rate != null
            ? `วันละ <strong>${ot.rate.toLocaleString()} บาท</strong>`
            : 'ตามอัตราที่กำหนด';
        txt.innerHTML = `<strong>วันอาทิตย์เป็นวันหยุดของสารถี</strong> </br>: หากไม่ใช่งานส่วนกลาง จะมีค่าล่วงเวลาสารถี ${r}`;
    } else {
        const rTxt = `ชั่วโมงละ <strong>${ot.rates.map(r => r.toLocaleString()).join('/')} บาท</strong>`;
        txt.innerHTML = `เวลาที่เลือกอยู่ <strong>นอกเวลาทำงานของสารถี (08:00–17:00)</strong></br>: หากไม่ใช่งานส่วนกลาง จะมีค่าล่วงเวลาสารถี <strong>${Math.round(ot.amount).toLocaleString()} บาท</strong></br>: (นอกเวลา ${_fmtDur(ot.minutes)} · ${rTxt})`;
    }
    box.hidden = false;
    initIcons(box);
}

function bkBindBookingControls() {
    if (!document.getElementById('bookingModal')) return;

    /* ── DateField: user เลือกวันเองในปฏิทิน (ไม่ผ่าน bkSetDate) → sync bkSelDate + OT ── */
    bkDateFieldEl()?.addEventListener('bb-datefield:change', e => {
        const [yy, mm, dd] = e.detail.date.split('-').map(Number);
        bkSelDate = new Date(yy, mm - 1, dd);
        bkUpdateWarning();
    });
    /* ── TimeRangeField: user เลือกเวลาเอง → recompute OT warning ── */
    bkTimeRangeEl()?.addEventListener('bb-timerangefield:change', bkUpdateWarning);

    /* ── ผู้โดยสาร: เฉพาะตัวเลข ── */
    const pax = document.getElementById('bk_passenger_count');
    pax?.addEventListener('input', () => { pax.value = pax.value.replace(/[^0-9]/g, ''); });
}
bkBindBookingControls();

/* ── Calendar ──────────────────────────────────── */
function renderCalendar() {
    const year=currentDate.getFullYear(), month=currentDate.getMonth();
    const _monthLabel = `${TH_MONTHS[month]} ${year+543}`;
    document.getElementById('currentMonthLabel').textContent = _monthLabel;
    const _mlMobile = document.getElementById('currentMonthLabelMobile');
    if (_mlMobile) _mlMobile.textContent = _monthLabel;
    const firstDay=new Date(year,month,1).getDay();
    const daysInMonth=new Date(year,month+1,0).getDate();
    const daysInPrev=new Date(year,month,0).getDate();
    const calBody=document.getElementById('calendarBody');
    calBody.innerHTML='';
    const today=new Date();
    for(let i=firstDay-1;i>=0;i--) createCell(daysInPrev-i,year,month-1,true);
    for(let i=1;i<=daysInMonth;i++){
        const isToday=i===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
        createCell(i,year,month,false,isToday);
    }
    const total=firstDay+daysInMonth;
    const fill=total%7===0?0:7-(total%7);
    for(let i=1;i<=fill;i++) createCell(i,year,month+1,true);
    if(calendarCollapsed) collapseCalendarCells();
    updateMobileList(selectedDate||today);
}

function createCell(day, year, month, isOtherMonth, isToday=false) {
    let tYear=year, tMonth=month;
    if(tMonth<0){tMonth=11;tYear--;} if(tMonth>11){tMonth=0;tYear++;}
    const pad=n=>String(n).padStart(2,'0');
    const ds=`${tYear}-${pad(tMonth+1)}-${pad(day)}`;
    const todayMidnight=new Date(); todayMidnight.setHours(0,0,0,0);
    const cellDate=new Date(tYear,tMonth,day);
    const isPast=cellDate<todayMidnight;

    const cell=document.createElement('div');
    cell.className=`calendar-cell${isOtherMonth?' other-month':''}${isToday?' today':''}${isPast?' past-day':''}`;
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', `${day} ${TH_MONTHS[tMonth]} ${tYear + 543}`);
    if (isToday) cell.setAttribute('aria-current', 'date');
    if(selectedDate&&!isOtherMonth
        &&selectedDate.getDate()===day
        &&selectedDate.getMonth()===tMonth
        &&selectedDate.getFullYear()===tYear) cell.classList.add('selected');

    const dayEvents=sortByTime(mockEvents.filter(e=>e.date===ds));
    const activeOnDay=dayEvents.filter(e=>e.status!=='rejected'&&e.status!=='completed').length;
    const totalV=window.TOTAL_VEHICLES||0;
    const vehiclesLeft=totalV-activeOnDay;
    let html=`<span class="date-number">${day}</span>`;

    if(!isOtherMonth){
        /* Phase F (2026-05-23): 1=dot · 2-3=short bar · 4+=long bar
           2026-08-03: slot render เสมอ (แม้ 0 event) กัน cell สูงไม่เท่ากันบนมือถือ — ว่าง = is-empty (visibility:hidden แต่ยังกิน layout space) */
        const n = dayEvents.length;
        const barCls = n===0 ? 'is-empty' : n>=4 ? 'mobile-indicator--bar-lg' : n>=2 ? 'mobile-indicator--bar-md' : '';
        html+=`<span class="mobile-indicator ${barCls} mt-1"></span>`;
    }

    html+=`<div class="events-container mt-auto">`;
    html+=isOtherMonth ? '' : buildDesktopEventCards(dayEvents, ds);
    html+=`</div>`;

    cell.innerHTML=html;
    cell.querySelectorAll('[data-bs-toggle="popover"]').forEach(el=>{
        new bootstrap.Popover(el,{trigger:'click',container:'body',sanitize:false,customClass:'bb-daypop'});
    });

    cell.addEventListener('click',()=>{
        document.querySelectorAll('.calendar-cell').forEach(c=>c.classList.remove('selected'));
        if(!isOtherMonth) cell.classList.add('selected');
        selectedDate=new Date(tYear,tMonth,day);
        updateMobileList(selectedDate);
        document.querySelectorAll('[data-bs-toggle="popover"]').forEach(el=>{
            bootstrap.Popover.getInstance(el)?.hide();
        });
        if (window.innerWidth >= 768 && !isOtherMonth && !isPast) {
            openBookingModal(ds);
        }
    });

    document.getElementById('calendarBody').appendChild(cell);
}

function buildDesktopEventCards(dayEvents, ds) {
    if(!dayEvents.length) return '';

    const grouped={}, singles=[];
    dayEvents.forEach(e=>{
        const solo=isSoloBooking(e);
        if(!solo && e.tripGroup){
            if(!grouped[e.tripGroup]) grouped[e.tripGroup]=[];
            grouped[e.tripGroup].push(e);
        } else {
            singles.push(e);
        }
    });

    const displayItems=[];
    Object.entries(grouped).forEach(([grp,members])=>{
        displayItems.push({type:'group', grp, members:sortByTime(members)});
    });
    singles.forEach(e=>displayItems.push({type:'single', e}));

    displayItems.sort((a,b)=>{
        const ta=a.type==='group'?a.members[0].time:a.e.time;
        const tb=b.type==='group'?b.members[0].time:b.e.time;
        const m=t=>{const[h,mm]=t.split(':').map(Number);return h*60+mm;};
        return m(ta)-m(tb);
    });

    const maxShow=2;
    let html='';

    // 1. Render visible event chips first
    displayItems.slice(0,maxShow).forEach(item=>{
        if(item.type==='group'){
            const members=item.members;
            const f=members[0];
            const second=members[1]||null;
            const style=EVENT_CARD_STYLE.approved;

            html+=`<div class="event-card p-1"
                style="${style}border-radius:4px;flex-direction:column;align-items:flex-start;white-space:normal;"
                onclick="event.stopPropagation(); openEventDetail(${f.id})">
                <div style="display:flex;align-items:center;gap:3px;width:100%;overflow:hidden;">
                    <span style="font-size:.72rem;font-weight:700;flex-shrink:0;">${f.time}</span>
                    <span style="font-size:.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${f.dest}</span>
                </div>
                ${second?`<div style="padding-left:2rem;width:100%;overflow:hidden;">
                    <span style="font-size:.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;opacity:.85;">${second.dest}</span>
                </div>`:''}
            </div>`;
        } else {
            const e=item.e;
            const style=EVENT_CARD_STYLE[e.status]||EVENT_CARD_STYLE.pending;
            html+=`<div class="event-card p-1" style="${style}border-radius:4px;"
                onclick="event.stopPropagation(); openEventDetail(${e.id})">
                <div class="row g-1 d-flex align-items-center text-truncate">
                    <span class="col-auto" style="font-size:.72rem;font-weight:600;">${e.time}</span>
                    <span class="col text-truncate" style="font-size:.72rem;">${e.dest}</span>
                </div>
            </div>`;
        }
    });

    // 2. Then overflow trigger BELOW chips (Google/Apple Calendar convention)
    // 2026-08-05: popup แสดงครบทุกรายการของวันนั้น (ไม่ใช่แค่ส่วนเกิน maxShow) —
    // ผู้ใช้ดูง่ายกว่าเดิมที่ต้องกลับไปดู 2 อันแรกที่ calendar-cell เอง
    // ป้ายปุ่ม trigger ยังนับตามส่วนเกินเหมือนเดิม (ไม่เปลี่ยนตามที่ตกลง)
    if(displayItems.length>maxShow){
        const extraCount=displayItems.length-maxShow;
        const popContent=displayItems.map(item=>{
            if(item.type==='group'){
                const f=item.members[0];
                return `<div class="bb-daypop-row bb-daypop-row--group m-1 px-2 py-1" data-id="${f.id}"
                    onclick="bootstrap.Popover.getInstance(document.querySelector('[data-ds=\\'${ds}\\']'))?.hide(); setTimeout(()=>openEventDetail(${f.id}),200)">
                    <span class="bb-daypop-time pe-1">${f.time}</span>
                    <span class="bb-daypop-dest">ใช้รถร่วมกัน (${item.members.length})</span>
                </div>`;
            }
            const e=item.e;
            const dotKey=STATUS_DOT[e.status]||'pending';
            return `<div class="bb-daypop-row bb-daypop-row--${dotKey} m-1 px-2 py-1" data-id="${e.id}"
                onclick="bootstrap.Popover.getInstance(document.querySelector('[data-ds=\\'${ds}\\']'))?.hide(); setTimeout(()=>openEventDetail(${e.id}),200)">
                <span class="bb-daypop-time">${e.time}</span>
                <span class="bb-daypop-dest">${e.dest}</span>
            </div>`;
        }).join('');

        html+=`<div class="event-more vc-cal-more popover-trigger" data-ds="${ds}"
            data-bs-toggle="popover" data-bs-placement="top" data-bs-html="true"
            data-bs-content="${popContent.replace(/"/g,'&quot;')}"
            onclick="event.stopPropagation()">+${extraCount} รายการ<span class="material-symbols-rounded vc-cal-more-icon">expand_more</span></div>`;
    }

    return html;
}

/* 2026-08-03: การ์ด mobileListSection คุมให้ตรง adminPreviewCards (ptCardSingle/ptCardGroup ใน vehicle_admin.js)
   ทุกจุด — duration + plate extract แยกจาก calcDuration()/​_plateLabel() เดิมเพราะ format/scope ต่างกัน
   (admin ptDuration คืน "(N ชม.)" สั้น, ptPlate คืนแค่รหัสทะเบียนล้วนไม่มี HTML span) */
function _mlDurLabel(t1, t2) {
    const [h1,m1]=t1.split(':').map(Number), [h2,m2]=t2.split(':').map(Number);
    let mins=(h2*60+m2)-(h1*60+m1); if(mins<0) mins+=1440;   // t1===t2 → 0 นาที (ห้ามจองข้ามวัน อยู่แล้วตาม CLAUDE.md gotcha ไม่ต้อง wrap)
    const h=mins/60;
    return h>0 ? `(${Number.isInteger(h)?h:h.toFixed(1)} ชม.)` : '';
}
function _mlPlate(carStr) {
    const m=(carStr||'').match(/\(([^)]+)\)/);
    return m ? m[1] : '—';
}
/* meta line เดียวกับ ptTripMeta (admin) — 🏃pax | 🕐time–time(dur) */
function _mlTripMeta(pax, t1, t2) {
    return `<div class="bb-subtext d-flex align-items-center gap-1 pt-1">
                <span class="material-symbols-rounded" style="font-size:14px">directions_run</span>${pax||0}
                <span>|</span>
                <span class="material-symbols-rounded" style="font-size:14px">schedule</span>${t1}${t2?`–${t2}`:''} ${_mlDurLabel(t1,t2)}
            </div>`;
}

function updateMobileList(dateObj) {
    if(!dateObj) return;
    const pad=n=>String(n).padStart(2,'0');
    const ds=`${dateObj.getFullYear()}-${pad(dateObj.getMonth()+1)}-${pad(dateObj.getDate())}`;
    const todayMidnight=new Date(); todayMidnight.setHours(0,0,0,0);
    const isPastDate=new Date(dateObj.getFullYear(),dateObj.getMonth(),dateObj.getDate())<todayMidnight;

    document.getElementById('mobileListDateLabel').textContent =
        `${dateObj.getDate()} ${TH_MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear()+543}`;

    const _dayCount = mockEvents.filter(e=>e.date===ds).length;
    const _countEl = document.getElementById('mobileDaybarCount');
    if (_countEl) _countEl.textContent = _dayCount ? `${_dayCount} รายการ` : '';

    /* Past-date disable — inline book button (FAB reverted 2026-05-23) */
    const bookBtn=document.getElementById('mobileDateCountBtn');
    if(bookBtn){
        bookBtn.disabled = isPastDate;
        bookBtn.style.opacity = isPastDate ? '.5' : '';
        bookBtn.style.cursor = isPastDate ? 'not-allowed' : '';
    }

    const dayEvents=sortByTime(mockEvents.filter(e=>e.date===ds));
    const content=document.getElementById('mobileListContent');

    if(!dayEvents.length){
        content.innerHTML=`
        <div class="vrc-m-empty">
            <div class="vrc-m-empty-icon"><span class="material-symbols-rounded">event_busy</span></div>
            <div class="vrc-m-empty-title">ไม่มีการจองในวันนี้</div>
            <div class="vrc-m-empty-sub">แตะปุ่ม “จองรถ” ด้านบนเพื่อเพิ่มการจองใหม่</div>
        </div>`;
        initIcons(content);
        return;
    }

    const grouped={}, singles=[];
    dayEvents.forEach(e=>{
        if(!isSoloBooking(e) && e.tripGroup){
            if(!grouped[e.tripGroup]) grouped[e.tripGroup]=[];
            grouped[e.tripGroup].push(e);
        } else {
            singles.push(e);
        }
    });

    /* 2026-08-03: bb-card ตรงกับ adminPreviewCards (ptCardSingle/ptCardGroup ใน vehicle_admin.js) ทุกจุด
       ยกเว้น 3 อย่างที่ตัดตามที่ขอ (budget/checkbox/ปุ่ม action) — group ยังคง expand/collapse
       (dual data-bs-toggle บน head + ปุ่ม chevron, stopPropagation กันซ้อน) ต่างจาก admin (ไม่ expand แต่โชว์ยุบ) */
    let html='<div class="vrc-m-list">';
    let _i = 0;   /* stagger index (--i) — คงพฤติกรรม fade-in เดิม (คีย์เฟรมย้ายไป target .bb-card ใน CSS) */

    Object.entries(grouped)
        .sort((a,b)=>{
            const m=t=>{const[h,mm]=t.split(':').map(Number);return h*60+mm;};
            return m(a[1][0].time)-m(b[1][0].time);
        })
        .forEach(([grpName,members])=>{
            const sorted=sortByTime(members);
            const toMins=t=>{const[h,m]=t.split(':').map(Number);return h*60+m;};
            const minTime=sorted[0].time;
            const maxTimeEnd=sorted.reduce((best,e)=>toMins(e.timeEnd)>toMins(best)?e.timeEnd:best, sorted[0].timeEnd);
            const totalPax=members.reduce((sum,e)=>sum+(parseInt(e.pax)||0),0);
            const rep=sorted[0];   /* ตัวแทนกลุ่ม (คนขับ/ทะเบียน) — เหมือน admin ptCardGroup rep=members[0] */
            const collapseId=`grp-${grpName.replace(/[^a-z0-9]/gi,'')}`;

            html+=`
            <div class="bb-card p-3" style="--i:${_i++}">
                <div class="d-flex gap-3" style="cursor:pointer" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                    <div class="bb-avatar flex-shrink-0" style="width:3rem;height:3rem;background:var(--bb-ok-bg);color:var(--bb-ok-tx)">
                        <span class="material-symbols-rounded">call_merge</span>
                    </div>
                    <div class="flex-grow-1" style="min-width:0">
                        <div class="d-flex align-items-center justify-content-between gap-2">
                            <span class="fw-semibold" style="color:var(--bb-str)">งานร่วม <span class="bb-badge is-neutral">${members.length}</span></span>
                            <button type="button" class="vrc-m-evt-toggle grp-toggle collapsed flex-shrink-0"
                                    data-bs-toggle="collapse" data-bs-target="#${collapseId}"
                                    aria-label="ขยาย/ยุบสมาชิกในกลุ่ม"
                                    onclick="event.stopPropagation();">
                                <span class="material-symbols-rounded">expand_more</span>
                            </button>
                        </div>
                        ${_mlTripMeta(totalPax, minTime, maxTimeEnd)}
                        <div class="pt-2" style="font-size:.8125rem">${rep.driverName||'—'} · ${_mlPlate(rep.car)}</div>
                    </div>
                </div>
                <div class="collapse" id="${collapseId}">
                    <div class="">
                        ${sorted.map((e, i)=>`
                        <button type="button" class="w-100 pt-2 mt-2 bg-white border-bottom-0 border-end-0 border-start-0" style="padding-left:4rem; ${i > 0 ? 'border-top:1px dashed var(--bb-n300);' : 'border-top:none;'} " onclick="openEventDetail(${e.id})">
                            <div class="flex-grow-1" style="min-width:0;text-align:left">
                                <div class="fw-semibold" style="color:var(--bb-str);">${e.booker}</div>
                                <div class="bb-subtext">${e.pickup||'—'} → ${e.dest||'—'}</div>
                                ${_mlTripMeta(e.pax, e.time, e.timeEnd)}
                            </div>
                        </button>`).join('')}
                    </div>
                </div>
            </div>`;
        });

    singles.forEach(e=>{
        const tone = STATUS_TONE[e.status] || STATUS_TONE.completed;
        const badgeTone = BB_STATUS_TONE[e.status] || 'is-neutral';
        const badgeIcon = BB_STATUS_ICON[e.status] || 'help';
        html+=`
        <div class="bb-card p-3 d-flex gap-3" style="--i:${_i++};cursor:pointer" onclick="openEventDetail(${e.id})">
            <div class="bb-avatar flex-shrink-0" style="width:3rem;height:3rem;background:${tone.bg};color:${tone.fg}">
                <span class="material-symbols-rounded">directions_car</span>
            </div>
            <div class="flex-grow-1" style="min-width:0">
                <span class="fw-semibold me-1" style="color:var(--bb-str)">${e.booker}</span>
                <span class="py-1 px-2 bb-badge ${badgeTone}" style="font-size:11px;">${STATUS_LABEL[e.status]||e.status}</span>
                <div class="bb-subtext">${e.pickup||'—'} → ${e.dest||'—'}</div>
                ${_mlTripMeta(e.pax, e.time, e.timeEnd)}
                <div class="d-flex justify-content-between align-items-end pt-2">
                    <span style="font-size:.8125rem">${e.driverName||'—'} · ${_mlPlate(e.car)}</span>

                </div>
            </div>
        </div>`;
    });

    html+='</div>';
    content.innerHTML=html;
    initIcons(content);
}

function openMoreEvents(dateStr) {
    const events=sortByTime(mockEvents.filter(e=>e.date===dateStr));
    const [y,m,d]=dateStr.split('-').map(Number);
    document.getElementById('moreEventsTitle').textContent=`${d} ${TH_MONTHS[m-1]} — รายการทั้งหมด`;
    document.getElementById('moreEventsList').innerHTML=
        `<div class="d-flex flex-column gap-2">`+
        events.map(e=>`
            <div class="event-card p-2"
                style="${EVENT_CARD_STYLE[e.status]||''}border-radius:8px;cursor:pointer;"
                onclick="moreEventsModal.hide();setTimeout(()=>openEventDetail(${e.id}),280)">
                <div class="d-flex align-items-center justify-content-between">
                    <span style="font-weight:700;font-size:.85rem;">${e.time} – ${e.dest}</span>
                    <span class="${STATUS_BADGE[e.status]||'vc-badge vc-badge-neutral vc-badge-dot'}">${STATUS_LABEL[e.status]||e.status}</span>
                </div>
                <div class="d-flex align-items-center gap-1" style="font-size:.78rem;margin-top:3px;opacity:.75;">
                    <span class="material-symbols-rounded vc-icon-sm">person</span>${e.booker}
                </div>
            </div>`).join('')+`</div>`;
    moreEventsModal.show();
}

const TH_DAYS_FULL = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];

function _thaiDateFull(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    return `วัน${TH_DAYS_FULL[dow]} ที่ ${d} ${TH_MONTHS[m - 1]}`;
}
function _esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
/* สถานะ ∈ {waiting_approver, approved} เท่านั้น = admin จัดรถ+คนขับแล้วจริง — ก่อนหน้านั้นยังไม่มีข้อมูลให้โชว์ */
const VEHICLE_ASSIGNED_STATUSES = ['waiting_approver', 'approved'];

function openEventDetail(eventId) {
    const e = mockEvents.find(b => b.id === eventId);
    if (!e) return;

    const groupMembers = e.tripGroup
        ? sortByTime(mockEvents.filter(b =>
            b.tripGroup === e.tripGroup && b.status !== 'rejected'))
        : [];
    const isGroup = groupMembers.length > 1;
    const members = isGroup ? groupMembers : [e];
    const rep     = isGroup ? (members.find(b => b.car) || e) : e;

    // Header: status badge + avatar (tone ตาม status จริงเสมอ — group แค่เปลี่ยน label/icon)
    const tone  = STATUS_TONE[e.status] || STATUS_TONE.pending;
    const label = isGroup ? 'ใช้รถร่วมกัน' : (STATUS_LABEL[e.status] || e.status);
    // const icon  = isGroup ? 'group' : (BB_STATUS_ICON[e.status] || 'schedule');

    document.getElementById('detailDateLine').textContent = _thaiDateFull(e.date);
    const badge = document.getElementById('detailStatusBadge');
    badge.className   = `py-1 px-2 me-2 bb-badge ${BB_STATUS_TONE[e.status] || 'is-wr'}`;
    badge.textContent = label;
    document.getElementById('detailTimeText').textContent =
        `${e.time}–${e.timeEnd} (${calcDuration(e.time, e.timeEnd)})`;
    const avatar = document.getElementById('detailStatusAvatar');
    avatar.style.background = tone.bg;
    avatar.style.color      = tone.fg;
    // document.getElementById('detailStatusIcon').textContent = icon;

    // รถ + คนขับ — โชว์เฉพาะ status ที่ admin จัดรถ/คนขับแล้ว
    const vdSection = document.getElementById('detailVehicleDriverSection');
    if (VEHICLE_ASSIGNED_STATUSES.includes(rep.status)) {
        vdSection.classList.remove('d-none');
        const carMatch = (rep.car || '').match(/\(([^)]+)\)/);
        document.getElementById('detailPlate').textContent = carMatch ? carMatch[1] : 'รอ Admin กำหนด';
        document.getElementById('detailVehicleModel').textContent = (rep.car || '').replace(/\s*\([^)]*\)/, '').trim();

        const driverLine = document.getElementById('detailDriverLine');
        if (rep.needDriver) {
            driverLine.classList.remove('d-none');
            document.getElementById('detailDriverName').textContent  = rep.driverName || 'รอ Admin มอบหมาย';
            document.getElementById('detailDriverPhone').textContent = rep.driverPhone || '';
            const callBtn = document.getElementById('detailDriverCallBtn');
            callBtn.onclick = rep.driverPhone ? () => { window.location.href = `tel:${rep.driverPhone}`; } : null;
            callBtn.disabled = !rep.driverPhone;
        } else {
            driverLine.classList.add('d-none');
        }
    } else {
        vdSection.classList.add('d-none');
    }

    // ผู้โดยสาร — การ์ดเส้นประต่อคน (pickup → dest, purpose | pax | เวลา, note)
    // คนแรกไม่มีเส้นประบน — hr.bk-divider ของ header ทำหน้าที่คั่นไปแล้ว (กันเส้นประซ้อนกัน 2 เส้น)
    document.getElementById('detailMembersList').innerHTML = members.map((m, idx) => `
        <div class="py-3 mt-2 ms-1 ps-2"${idx > 0 ? ' style="border-top:1px dashed var(--bb-n300);"' : ''}>
            <span class="fw-semibold" style="color:var(--bb-str)">${_esc(m.booker || '–')}</span>
            <div class="bb-subtext">${m.pickup ? `${_esc(m.pickup)} → ` : ''}${_esc(m.dest || '–')}</div>
            <div class="bb-subtext d-flex align-items-center gap-1 pt-1">
                ${_esc(m.purpose || '–')}
                <span>|</span>
                <span class="material-symbols-rounded">directions_run</span>${m.pax || '–'} รูป/คน
                <span>|</span>
                <span class="material-symbols-rounded">schedule</span>${m.time}–${m.timeEnd} (${calcDuration(m.time, m.timeEnd)})
            </div>
            ${m.note ? `<div class="bb-subtext pt-2">หมายเหตุ: ${_esc(m.note)}</div>` : ''}
        </div>`
    ).join('');

    const actDiv = document.getElementById('detailActions');
    actDiv.innerHTML = '';
    if (!isGroup && e.canCancel) {
        // canCancel: owner AND status ∈ {pending, waiting_approver}; admin AND status ∈ {pending, waiting_approver, approved}; AND now < start_datetime
        // ปุ่ม "แก้ไข" ยังจำกัด owner+pending เหมือนเดิม (approved booking แก้เองไม่ได้ ต้อง admin).
        // Order: [ยกเลิก] ซ้าย, [แก้ไข] ขวา (primary action ขวา ตาม Vercel/Linear)
        const showEdit = e.isOwner && e.isPending;
        actDiv.innerHTML = `
            <form action="${e.cancelUrl}" method="POST"
                onsubmit="return confirm('ยืนยันยกเลิกการจอง #${e.id}? — แจ้ง Admin/Approver/Driver/ผู้ร่วมเดินทาง')">
                <button type="submit" class="bb-btn is-danger-sec is-sm" title="ยกเลิกการจองนี้">
                    <span class="material-symbols-rounded vc-icon-sm">delete</span>
                    ยกเลิกการจอง
                </button>
            </form>
            ${showEdit ? `
            <button type="button" class="bb-btn is-sec is-sm" title="แก้ไขการจอง"
                onclick="eventDetailModal.hide();setTimeout(()=>openEditBookingModal(${e.id}),300)">
                <span class="material-symbols-rounded vc-icon-sm">edit</span>
                แก้ไข
            </button>` : ''}`;
    }
    // ไม่มี action ใด (isGroup / ไม่ใช่เจ้าของ / แก้ไข-ยกเลิกไม่ได้แล้ว) — ซ่อนแถวปุ่มไปเลย ไม่โชว์ปุ่ม "ปิด" เดี่ยวๆ
    // (2026-08-05: เปลี่ยนจาก fallback ปุ่มปิด — ปิดผ่าน backdrop/Escape แทน, ปุ่ม X เดิมก็เอาออกไปแล้ว)
    actDiv.classList.toggle('d-none', !actDiv.innerHTML);

    eventDetailModal.show();
}

/* จอง+แก้ไข ใช้ #bookingForm เดียวกัน (2026-07-28) — สลับปุ่ม/หมายเหตุ/ปลายทาง submit ตามโหมด
   create ใช้ data-create-action ที่ template เก็บไว้ (กัน action ค้างจาก edit ครั้งก่อน) */
function bkSetMode(mode) {
    const isEdit = mode === 'edit';
    const btn = document.getElementById('bkSubmitBtn');
    if (btn) {
        btn.title = isEdit ? 'บันทึกการแก้ไข' : 'ส่งคำขอจองรถ';
        btn.innerHTML = isEdit
            ? 'บันทึก <span class="material-symbols-rounded vc-icon-sm">check</span>'
            : 'ส่งคำขอ <span class="material-symbols-rounded vc-icon-sm">arrow_forward</span>';
    }
    const note = document.getElementById('bk_info_note_text');
    if (note) {
        note.innerHTML = isEdit
            ? '<small class="fw-bold">หมายเหตุ :</small> <small>แก้ไขได้เฉพาะรายการที่ยังรออนุมัติ — การแก้ไขจะถูกบันทึกและแจ้ง Admin</small>'
            : '<small class="fw-bold">แอดมิน :</small> <small>จะจัดสรรรถและคนขับให้ตามความเหมาะสม</small>';
    }
}

function openEditBookingModal(eventId) {
    const e = mockEvents.find(b => b.id === eventId);
    if (!e) return;
    eventDetailModal?.hide();
    if (moreEventsModal) moreEventsModal.hide();

    const form = document.getElementById('bookingForm');
    form.action = e.editUrl;
    form.classList.remove('was-validated');
    form.querySelectorAll('.is-valid').forEach(el => el.classList.remove('is-valid'));

    document.getElementById('bk_destination').value      = e.dest    || '';
    document.getElementById('bk_purpose').value           = e.purpose || '';
    window.bkSetPax?.(e.pax || 1);
    document.getElementById('bk_pickup_location').value   = e.pickup  || '';
    document.getElementById('bk_note').value               = e.note   || '';
    bkSetDate(e.date);
    bkSetTimeRange(e.time || '08:00', e.timeEnd || '17:00');

    form.querySelectorAll('[required]').forEach(field => {
        if (field.value) field.classList.add('is-valid');
    });

    bkSetMode('edit');
    bookingModal.show();
}

function openBookingModal(dateStr=null) {
    if(eventDetailModal) eventDetailModal.hide();
    if(moreEventsModal)  moreEventsModal.hide();
    const pad = n => String(n).padStart(2,'0');
    const ds  = dateStr || (selectedDate
        ? `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth()+1)}-${pad(selectedDate.getDate())}`
        : null);

    const form = document.getElementById('bookingForm');
    form.action = form.dataset.createAction;   // คืนค่า action กัน edit ครั้งก่อนค้างไว้

    if (ds) bkSetDate(ds); else bkClearDate();
    // เวลา default 08:00–17:00 ทุกครั้งที่เปิด modal
    bkSetTimeRange('08:00', '17:00');

    bkSetMode('create');
    bookingModal.show();
}

/* ── ทำซ้ำ: เปิด modal จองใหม่ prefill ข้อมูลเดิม (เว้นวัน/เวลา) ── */
function openDuplicateModal(eventId) {
    const e = mockEvents.find(b => b.id === eventId);
    if (!e) return;
    openBookingModal();   // modal เปล่า: clear date + default time 08:00–17:00
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setVal('bk_purpose',         e.purpose || '');
    setVal('bk_destination',     e.dest    || '');
    window.bkSetPax?.(e.pax || 1);
    setVal('bk_pickup_location', e.pickup  || '');
    setVal('bk_note',            e.note    || '');
}

/* ── Expose for HTML-string onclick handlers ── */
Object.assign(window, {
    openEventDetail, openEditBookingModal, openMoreEvents, openBookingModal, openDuplicateModal,
});
Object.defineProperty(window, 'eventDetailModal', { get: () => eventDetailModal, configurable: true });
Object.defineProperty(window, 'moreEventsModal',  { get: () => moreEventsModal,  configurable: true });

/* ── ?pay= / ?detail=<booking_id> deep-link (notification + detail_booking redirect) ── */
(function handleBookingDeeplink() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('pay') || params.get('detail');
    if (!raw) return;
    const id = parseInt(raw, 10);
    if (!id) return;
    openEventDetail(id);
    const url = new URL(window.location.href);
    url.searchParams.delete('pay');
    url.searchParams.delete('detail');
    history.replaceState(null, '', url.toString());
})();

/* ── ?new=1 (จองใหม่) / ?copy_from=<id> (ทำซ้ำ) deep-link จากหน้า home ── */
(function handleNewOrCopyDeeplink() {
    const params = new URLSearchParams(window.location.search);
    const copyId = parseInt(params.get('copy_from'), 10);
    if (copyId) openDuplicateModal(copyId);
    else if (params.get('new')) openBookingModal();
    if (!params.has('copy_from') && !params.has('new')) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('copy_from');
    url.searchParams.delete('new');
    history.replaceState(null, '', url.toString());
})();
