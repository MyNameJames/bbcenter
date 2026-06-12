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
const STATUS_ICON = {
    pending:          'clock',
    waiting_approver: 'send',
    approved:         'circle-check',
    rejected:         'circle-x',
    completed:        'check-circle-2'
};
const EVENT_CARD_STYLE = {
    pending:          'background:var(--vc-amber-bg);border-color:var(--vc-amber-border);color:var(--vc-amber);',
    waiting_approver: 'background:var(--vc-blue-bg);border-color:var(--vc-blue-border);color:var(--vc-blue);',
    approved:         'background:var(--vc-green-bg);border-color:var(--vc-green-border);color:var(--vc-green);',
    rejected:         'background:var(--vc-red-bg);border-color:var(--vc-red-border);color:var(--vc-red);',
    completed:        'background:var(--vc-bg-subtle);border-color:var(--vc-border);color:var(--vc-fg-muted);'
};

/* ── State ─────────────────────────────────────── */
let currentDate      = new Date();
currentDate.setDate(1);
let selectedDate     = new Date();
let calendarCollapsed = false;
let bookingModal, editBookingModal, eventDetailModal, moreEventsModal;

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
editBookingModal = new bootstrap.Modal(document.getElementById('editBookingModal'));
eventDetailModal = new bootstrap.Modal(document.getElementById('eventDetailModal'));
moreEventsModal  = new bootstrap.Modal(document.getElementById('moreEventsModal'));

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
    const date = document.getElementById('bk_date').value;
    if (!date) {  // bk_date เป็น hidden → validate เอง
        const err = document.getElementById('bk_date_err');
        if (err) err.hidden = false;
        document.getElementById('bk_datepick_btn')?.focus();
        return;
    }
    if (!this.checkValidity()) return;
    const tStart = document.getElementById('bk_start_time').value;
    const tEnd   = document.getElementById('bk_end_time').value;
    document.getElementById('bk_start_datetime').value = date + 'T' + tStart;
    document.getElementById('bk_end_datetime').value   = date + 'T' + tEnd;
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
    }
});

/* ── editBookingForm validation ────────────────── */
// 2026-05-23: mirror bookingForm pattern — compose hidden start/end datetime จาก
//   edit_date + edit_start_time + edit_end_time (visible split fields) ก่อน submit
document.getElementById('editBookingForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    this.classList.add('was-validated');
    if (!this.checkValidity()) return;
    const date   = document.getElementById('edit_date').value;
    const tStart = document.getElementById('edit_start_time').value;
    const tEnd   = document.getElementById('edit_end_time').value;
    document.getElementById('editStartDatetime').value = date + 'T' + tStart;
    document.getElementById('editEndDatetime').value   = date + 'T' + tEnd;
    this.submit();
});
document.querySelectorAll('#editBookingForm [required]').forEach(field => {
    ['input', 'change'].forEach(evt => field.addEventListener(evt, () => {
        field.classList.toggle('is-valid', field.checkValidity());
    }));
});
document.getElementById('editBookingModal')?.addEventListener('hidden.bs.modal', function() {
    const f = document.getElementById('editBookingForm');
    if (f) {
        f.classList.remove('was-validated');
        f.querySelectorAll('.is-valid').forEach(el => el.classList.remove('is-valid'));
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

/* ── Flatpickr ─────────────────────────────────── */
// Shared helper: convert native date input → flatpickr w/ Thai display "วันจันทร์ที่ 4 พฤษภาคม 2569"
//   - dateFormat 'Y-m-d' → hidden value (form submit + .value reads ยังทำงาน)
//   - altInput visible = readable Thai+BE format
//   - guard `_flatpickr` กัน init ซ้ำ
const _TH_DAYS_FP   = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const _TH_MONTHS_FP = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                       'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
function _initThaiDatePicker(input) {
    if (!input || input._flatpickr) return;
    flatpickr(input, {
        dateFormat: 'Y-m-d',
        altInput: true,
        altInputClass: 'form-control',
        altFormat: 'thai_be',  // custom marker — branch ใน formatDate
        minDate: 'today',
        locale: (flatpickr.l10ns && flatpickr.l10ns.th) || 'default',
        disableMobile: true,
        formatDate: (date, format) => {
            if (format === 'thai_be') {
                return `วัน${_TH_DAYS_FP[date.getDay()]}ที่ ${date.getDate()} ${_TH_MONTHS_FP[date.getMonth()]} ${date.getFullYear() + 543}`;
            }
            return flatpickr.formatDate(date, format);
        },
    });
}

// Shared helper: bind start_time + end_time → duration preview (live "X ชม. Y นาที")
function _bindTimeDuration(startEl, endEl, previewEl) {
    if (!startEl || !endEl) return;
    const update = () => {
        if (!previewEl) return;
        const s = startEl.value, e = endEl.value;
        if (!s || !e || e <= s) { previewEl.textContent = ''; return; }
        const [sh, sm] = s.split(':').map(Number);
        const [eh, em] = e.split(':').map(Number);
        const mins = (eh * 60 + em) - (sh * 60 + sm);
        const h = Math.floor(mins / 60), m = mins % 60;
        const parts = [];
        if (h) parts.push(`${h} ชม.`);
        if (m) parts.push(`${m} นาที`);
        previewEl.textContent = `ระยะเวลา ${parts.join(' ')}`;
    };
    startEl.addEventListener('change', () => {
        endEl.min = startEl.value;
        if (endEl.value && endEl.value <= startEl.value) endEl.value = '';
        update();
    });
    endEl.addEventListener('change', update);
    return update;
}

function initFlatpickr() {
    // booking modal: date(va-cal)+time(picker) จัดการใน bkBindBookingControls แล้ว
}

function initFlatpickrInModal() {
    // 2026-05-23: edit modal restructured ให้ mirror book modal — date / start_time / end_time แยก field
    _initThaiDatePicker(document.getElementById('edit_date'));
    _bindTimeDuration(
        document.getElementById('edit_start_time'),
        document.getElementById('edit_end_time'),
        document.getElementById('edit_duration_preview'),
    );
}

/* ══ Booking modal — date (va-cal) + time picker + OT warning ══════
   2026-06-10: date=ปฏิทินคลิกเดียว · time=list 00:00–23:30 (default 08:00–17:00)
   · OT warning เมื่อวันอาทิตย์ / นอกเวลา 08:00–17:00 (อ่าน rate จาก window.OT_RATES) */
const BK_DOW_S = ['อา','จ','อ','พ','พฤ','ศ','ส'];
const BK_MON_S = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const BK_WORK_START = 480;   // 08:00 (นาที)
const BK_WORK_END   = 1020;  // 17:00
const BK_TIMES = (() => {
    const a = [];
    for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 30)
        a.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    return a;
})();
const _t2m = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
function _fmtDur(mins) {
    const h = Math.floor(mins / 60), m = mins % 60, parts = [];
    if (h) parts.push(`${h} ชม.`);
    if (m) parts.push(`${m} นาที`);
    return parts.join(' ') || '0 นาที';
}

let bkCalCursor = null;   // Date — เดือนที่ปฏิทินโชว์ (วันที่ 1)
let bkSelDate   = null;   // Date — วันที่เลือก

function bkRenderCal() {
    const dowWrap = document.getElementById('bk_cal_dow');
    const days    = document.getElementById('bk_cal_days');
    const title   = document.getElementById('bk_cal_title');
    if (!days || !bkCalCursor) return;
    const y = bkCalCursor.getFullYear(), m = bkCalCursor.getMonth();
    if (title) title.textContent = `${TH_MONTHS[m]} ${y + 543}`;
    if (dowWrap && !dowWrap.childElementCount) {
        dowWrap.innerHTML = BK_DOW_S.map((d, i) => {
            const c = i === 0 ? ' va-cal-dow-cell--sun' : i === 6 ? ' va-cal-dow-cell--sat' : '';
            return `<span class="va-cal-dow-cell${c}">${d}</span>`;
        }).join('');
    }
    const pad = new Date(y, m, 1).getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
    let cells = '';
    for (let i = 0; i < pad; i++) cells += `<span class="va-cal-cell va-cal-cell--empty"></span>`;
    for (let dnum = 1; dnum <= dim; dnum++) {
        const d  = new Date(y, m, dnum);
        const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(dnum).padStart(2, '0')}`;
        const dw = d.getDay();
        const isSel   = bkSelDate && d.toDateString() === bkSelDate.toDateString();
        const isToday = d.toDateString() === new Date().toDateString();
        const isPast  = d < todayMid;
        let cls = 'va-cal-cell';
        if (isSel)              cls += ' va-cal-cell--active';
        if (isToday && !isSel)  cls += ' va-cal-cell--today';
        if (dw === 0)           cls += ' va-cal-cell--sun';
        else if (dw === 6)      cls += ' va-cal-cell--sat';
        if (isPast)
            cells += `<span class="${cls} va-cal-cell--empty" style="opacity:.32;">${dnum}</span>`;
        else
            cells += `<button type="button" class="${cls}" data-date="${ds}">${dnum}</button>`;
    }
    days.innerHTML = cells;
}

function bkSetDate(ds) {
    const [yy, mm, dd] = ds.split('-').map(Number);
    bkSelDate   = new Date(yy, mm - 1, dd);
    bkCalCursor = new Date(yy, mm - 1, 1);
    document.getElementById('bk_date').value = ds;
    const val = document.getElementById('bk_datepick_val');
    val.textContent = `${BK_DOW_S[bkSelDate.getDay()]}. ${dd} ${BK_MON_S[mm - 1]} ${yy + 543}`;
    val.classList.remove('bk-datepick-val--empty');
    const err = document.getElementById('bk_date_err');
    if (err) err.hidden = true;
    bkRenderCal();
    bkUpdateWarning();
}

function bkClearDate() {
    bkSelDate = null;
    bkCalCursor = new Date(); bkCalCursor.setDate(1);
    document.getElementById('bk_date').value = '';
    const val = document.getElementById('bk_datepick_val');
    val.textContent = 'เลือกวันที่เดินทาง';
    val.classList.add('bk-datepick-val--empty');
    bkRenderCal();
    bkUpdateWarning();
}

function bkBuildTimeLists() {
    document.querySelectorAll('#bookingModal .bk-timepick').forEach(tp => {
        const list = tp.querySelector('.bk-timepick-list');
        if (list.childElementCount) return;
        list.innerHTML = BK_TIMES.map(t => {
            const ot = _t2m(t) < BK_WORK_START || _t2m(t) > BK_WORK_END;
            return `<button type="button" class="bk-timepick-opt${ot ? ' bk-timepick-opt--ot' : ''}" data-val="${t}" role="option">${t}</button>`;
        }).join('');
    });
}

function bkSelectTime(target, val) {
    const tp = document.querySelector(`.bk-timepick[data-target="${target}"]`);
    if (!tp) return;
    document.getElementById(target).value = val;
    tp.querySelector('.bk-timepick-val').textContent = val;
    tp.querySelectorAll('.bk-timepick-opt').forEach(o =>
        o.classList.toggle('bk-timepick-opt--active', o.dataset.val === val));
    bkUpdateDuration();
    bkUpdateWarning();
}

function bkUpdateDuration() {
    const p = document.getElementById('bk_duration_preview');
    if (!p) return;
    const s = document.getElementById('bk_start_time').value;
    const e = document.getElementById('bk_end_time').value;
    if (!s || !e || e <= s) { p.textContent = ''; return; }
    p.textContent = `ระยะเวลา ${_fmtDur(_t2m(e) - _t2m(s))}`;
}

/* คำนวณค่าล่วงเวลาสารถีจากวัน+เวลา — null = ไม่เข้าเกณฑ์ OT */
function bkComputeOT() {
    const rates = window.OT_RATES || [];
    if (!bkSelDate) return null;
    if (!document.getElementById('needDriver')?.checked) return null;  // ไม่ใช้คนขับ = ไม่มี OT
    const jsDow = bkSelDate.getDay();
    if (jsDow === 0) {  // วันอาทิตย์ = หยุดทั้งวัน
        const r = rates.find(x => x.dow === 6);
        return { type: 'sunday', rate: r ? r.rate : null };
    }
    const sMin = _t2m(document.getElementById('bk_start_time').value || '08:00');
    const eMin = _t2m(document.getElementById('bk_end_time').value   || '17:00');
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
    const sBtn = document.querySelector('.bk-timepick[data-target="bk_start_time"] .bk-timepick-btn');
    const eBtn = document.querySelector('.bk-timepick[data-target="bk_end_time"] .bk-timepick-btn');
    [sBtn, eBtn].forEach(b => b && b.classList.remove('bk-ot-active'));
    const ot = bkComputeOT();
    if (!ot) { box.hidden = true; txt.innerHTML = ''; return; }
    if (ot.type === 'sunday') {
        const r = ot.rate != null
            ? `วันละ <strong>${ot.rate.toLocaleString()} บาท</strong>`
            : 'ตามอัตราที่กำหนด';
        txt.innerHTML = `<strong>วันอาทิตย์เป็นวันหยุดของพนักงานขับรถ</strong> — หากใช้รถส่วนกลางพร้อมคนขับในวันนี้ จะมีค่าล่วงเวลาสารถี ${r}`;
    } else {
        const rTxt = `ชั่วโมงละ <strong>${ot.rates.map(r => r.toLocaleString()).join('/')} บาท</strong>`;
        txt.innerHTML = `เวลาที่เลือกอยู่<strong>นอกเวลาทำงานของพนักงานขับรถ (08:00–17:00)</strong> — หากใช้รถส่วนกลางพร้อมคนขับ จะมีค่าล่วงเวลาสารถีประมาณ <strong>${Math.round(ot.amount).toLocaleString()} บาท</strong> (นอกเวลา ${_fmtDur(ot.minutes)} · ${rTxt})`;
        [sBtn, eBtn].forEach(b => b && b.classList.add('bk-ot-active'));
    }
    box.hidden = false;
    initIcons(box);
}

function bkCloseAllTimePops(except) {
    document.querySelectorAll('#bookingModal .bk-timepick').forEach(tp => {
        if (tp === except) return;
        tp.querySelector('.bk-timepick-pop').hidden = true;
        tp.querySelector('.bk-timepick-btn').setAttribute('aria-expanded', 'false');
    });
}

function bkBindBookingControls() {
    if (!document.getElementById('bookingModal')) return;
    bkBuildTimeLists();

    /* ── date calendar ── */
    const dBtn = document.getElementById('bk_datepick_btn');
    const dPop = document.getElementById('bk_cal_pop');
    const closeDate = () => { if (dPop) { dPop.hidden = true; dBtn?.setAttribute('aria-expanded', 'false'); } };
    dBtn?.addEventListener('click', e => {
        e.stopPropagation();
        const open = dBtn.getAttribute('aria-expanded') === 'true';
        bkCloseAllTimePops();
        if (open) { closeDate(); return; }
        if (!bkCalCursor) { bkCalCursor = new Date(); bkCalCursor.setDate(1); }
        bkRenderCal();
        dPop.hidden = false;
        dBtn.setAttribute('aria-expanded', 'true');
    });
    document.getElementById('bk_cal_prev')?.addEventListener('click', e => {
        e.stopPropagation();
        bkCalCursor = new Date(bkCalCursor.getFullYear(), bkCalCursor.getMonth() - 1, 1);
        bkRenderCal();
    });
    document.getElementById('bk_cal_next')?.addEventListener('click', e => {
        e.stopPropagation();
        bkCalCursor = new Date(bkCalCursor.getFullYear(), bkCalCursor.getMonth() + 1, 1);
        bkRenderCal();
    });
    document.getElementById('bk_cal_days')?.addEventListener('click', e => {
        const b = e.target.closest('[data-date]');
        if (!b) return;
        bkSetDate(b.dataset.date);
        closeDate();
    });

    /* ── time pickers ── */
    document.querySelectorAll('#bookingModal .bk-timepick').forEach(tp => {
        const btn  = tp.querySelector('.bk-timepick-btn');
        const pop  = tp.querySelector('.bk-timepick-pop');
        const list = tp.querySelector('.bk-timepick-list');
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const open = btn.getAttribute('aria-expanded') === 'true';
            bkCloseAllTimePops();
            closeDate();
            if (open) { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); return; }
            pop.hidden = false;
            btn.setAttribute('aria-expanded', 'true');
            const active = list.querySelector('.bk-timepick-opt--active');
            if (active) list.scrollTop = active.offsetTop - list.clientHeight / 2 + active.clientHeight / 2;
        });
        list.addEventListener('click', e => {
            const o = e.target.closest('[data-val]');
            if (!o) return;
            bkSelectTime(tp.dataset.target, o.dataset.val);
            pop.hidden = true;
            btn.setAttribute('aria-expanded', 'false');
        });
    });

    /* ── ปิด popover เมื่อคลิกนอกพื้นที่ ── */
    document.addEventListener('click', e => {
        if (!e.target.closest('.bk-datepick')) closeDate();
        if (!e.target.closest('.bk-timepick')) bkCloseAllTimePops();
    });

    /* ── ผู้โดยสาร: เฉพาะตัวเลข ── */
    const pax = document.getElementById('bk_passenger_count');
    pax?.addEventListener('input', () => { pax.value = pax.value.replace(/[^0-9]/g, ''); });

    /* ── toggle คนขับ → recompute OT warning ── */
    document.getElementById('needDriver')?.addEventListener('change', bkUpdateWarning);
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
    if(!isOtherMonth&&totalV>0){
        if(vehiclesLeft<=0) html+=`<span class="vehicle-full-badge">รถเต็ม</span>`;
    }

    if(!isOtherMonth){
        /* Phase F (2026-05-23): 1=dot · 2-3=short bar · 4+=long bar */
        if(dayEvents.length===1) html+=`<span class="mobile-indicator mt-1"></span>`;
        else if(dayEvents.length>=4) html+=`<span class="mobile-indicator mobile-indicator--bar-lg mt-1"></span>`;
        else if(dayEvents.length>=2) html+=`<span class="mobile-indicator mobile-indicator--bar-md mt-1"></span>`;
    }

    html+=`<div class="events-container mt-auto">`;
    html+=isOtherMonth ? '' : buildDesktopEventCards(dayEvents, ds);
    html+=`</div>`;

    cell.innerHTML=html;
    cell.querySelectorAll('[data-bs-toggle="popover"]').forEach(el=>{
        new bootstrap.Popover(el,{trigger:'click',container:'body',sanitize:false,customClass:'vc-cal-pop'});
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
    if(displayItems.length>maxShow){
        const extra=displayItems.slice(maxShow);
        const popContent=extra.map(item=>{
            if(item.type==='group'){
                const f=item.members[0];
                return `<div class="vc-cal-pop-row" data-id="${f.id}"
                    onclick="bootstrap.Popover.getInstance(document.querySelector('[data-ds=\\'${ds}\\']'))?.hide(); setTimeout(()=>openEventDetail(${f.id}),200)">
                    <span class="vc-cal-pop-dot vc-cal-pop-dot--group" title="ทริปร่วม"></span>
                    <span class="vc-cal-pop-time">${f.time}</span>
                    <span class="vc-cal-pop-dest"><i data-lucide="users" class="vc-cal-pop-dest-icon"></i>ทริปร่วม (${item.members.length})</span>
                </div>`;
            }
            const e=item.e;
            const dotKey=STATUS_DOT[e.status]||'pending';
            const statusLabel=STATUS_LABEL[e.status]||e.status;
            return `<div class="vc-cal-pop-row" data-id="${e.id}"
                onclick="bootstrap.Popover.getInstance(document.querySelector('[data-ds=\\'${ds}\\']'))?.hide(); setTimeout(()=>openEventDetail(${e.id}),200)">
                <span class="vc-cal-pop-dot vc-cal-pop-dot--${dotKey}" title="${statusLabel}"></span>
                <span class="vc-cal-pop-time">${e.time}</span>
                <span class="vc-cal-pop-dest">${e.dest}</span>
            </div>`;
        }).join('');

        html+=`<div class="event-more vc-cal-more popover-trigger" data-ds="${ds}"
            data-bs-toggle="popover" data-bs-placement="auto" data-bs-html="true"
            data-bs-content="${popContent.replace(/"/g,'&quot;')}"
            onclick="event.stopPropagation()">+${extra.length} รายการ<i data-lucide="chevron-down" class="vc-cal-more-icon"></i></div>`;
    }

    return html;
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
            <div class="vrc-m-empty-icon"><i data-lucide="calendar-x"></i></div>
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

    /* Phase C (2026-05-23): premium event-card markup (.vrc-m-evt*) */
    const dotKey = s => (s === 'completed' ? 'completed' : (STATUS_DOT[s] || 'approved'));
    const statusKey = s => (s === 'completed' ? 'completed' : (STATUS_DOT[s] || 'approved'));

    let html='<div class="vrc-m-list">';
    let _i = 0;   /* Phase E: stagger index (--i) across groups + singles */

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
            const carLabel=(members[0].car||'').split('(')[0].trim() || grpName;
            const collapseId=`grp-${grpName.replace(/[^a-z0-9]/gi,'')}`;

            html+=`
            <div class="vrc-m-evt vrc-m-evt--group" style="--i:${_i++}">
                <div class="vrc-m-evt-head" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                    <span class="vrc-m-evt-dot vrc-m-evt-dot--group"></span>
                    <div class="vrc-m-evt-body">
                        <div class="vrc-m-evt-title">${carLabel}</div>
                        <div class="vrc-m-evt-meta">
                            <span>${totalPax} ท่าน</span>
                            <span class="sep">·</span>
                            <span>${minTime}–${maxTimeEnd}</span>
                        </div>
                    </div>
                    <span class="vrc-m-evt-status vrc-m-evt-status--group">${members.length} งานรวม</span>
                    <button type="button" class="vrc-m-evt-toggle grp-toggle collapsed"
                            data-bs-toggle="collapse" data-bs-target="#${collapseId}"
                            aria-label="ขยาย/ยุบสมาชิกในกลุ่ม"
                            onclick="event.stopPropagation();">
                        <i data-lucide="chevron-down"></i>
                    </button>
                </div>
                <div class="collapse" id="${collapseId}">
                    <div class="vrc-m-evt-sub">
                        ${sorted.map(e=>`
                        <button type="button" class="vrc-m-evt-sub-row" onclick="openEventDetail(${e.id})">
                            <span class="vrc-m-evt-sub-time">${e.time}</span>
                            <div class="vrc-m-evt-sub-body">
                                <div class="vrc-m-evt-sub-title">${e.booker}</div>
                                <div class="vrc-m-evt-sub-meta">${e.pax} ท่าน${e.dest?` · ${e.dest}`:''}</div>
                            </div>
                        </button>`).join('')}
                    </div>
                </div>
            </div>`;
        });

    singles.forEach(e=>{
        const title = e.dest
            ? `${e.time}–${e.timeEnd} · ${e.dest}`
            : `${e.time}–${e.timeEnd}`;
        const carShort = (e.car||'').split('(')[0].trim();
        const metaParts = [e.booker, `${e.pax} ท่าน`];
        if (carShort) metaParts.push(carShort);
        const metaHTML = metaParts
            .map((p,i) => i === 0
                ? `<span>${p}</span>`
                : `<span class="sep">·</span><span>${p}</span>`)
            .join('');
        html+=`
        <div class="vrc-m-evt" style="--i:${_i++}" onclick="openEventDetail(${e.id})">
            <div class="vrc-m-evt-head">
                <span class="vrc-m-evt-dot vrc-m-evt-dot--${dotKey(e.status)}"></span>
                <div class="vrc-m-evt-body">
                    <div class="vrc-m-evt-title">${title}</div>
                    <div class="vrc-m-evt-meta">${metaHTML}</div>
                </div>
                <span class="vrc-m-evt-status vrc-m-evt-status--${statusKey(e.status)}">${STATUS_LABEL[e.status]||e.status}</span>
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
                    <i data-lucide="user" class="vc-icon-sm"></i>${e.booker}
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
// Premium plate render: plate code = monospace span, brand = muted. Returns HTML (consumer ต้องใช้ .innerHTML).
function _plateLabel(e) {
    if (!e.car) return 'รอ Admin กำหนด';
    const match = e.car.match(/\(([^)]+)\)/);
    const plate = match ? match[1] : '';
    const brand = e.car.replace(/\s*\([^)]*\)/, '').trim();
    if (!plate) return _esc(brand);
    return `<span class="bk-detail-plate-code">${_esc(plate)}</span><span class="bk-detail-plate-brand">${_esc(brand)}</span>`;
}

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

    // Status pill (แทน header circle dot เดิม)
    const statusKey      = isGroup ? 'group' : (STATUS_DOT[e.status]   || 'approved');
    const statusLabel    = isGroup ? 'ทริปร่วม' : (STATUS_LABEL[e.status] || 'อนุมัติแล้ว');
    const statusIconName = isGroup ? 'users'   : (STATUS_ICON[e.status]  || 'circle-check');
    const statusPill = document.getElementById('detailStatusPill');
    statusPill.className = `bk-detail-status bk-detail-status--${statusKey}`;
    document.getElementById('detailStatusIcon').outerHTML =
        `<i id="detailStatusIcon" data-lucide="${statusIconName}"></i>`;
    document.getElementById('detailStatusText').textContent = statusLabel;

    document.getElementById('detailDateLine').textContent = _thaiDateFull(e.date);
    document.getElementById('detailTime').textContent     = `${e.time} – ${e.timeEnd}`;
    document.getElementById('detailPlate').innerHTML      = _plateLabel(rep);

    const driverLine = document.getElementById('detailDriverLine');
    if (rep.needDriver) {
        document.getElementById('detailDriver').textContent = rep.driver || 'รอ Admin มอบหมาย';
        driverLine.style.display = '';
    } else {
        driverLine.style.display = 'none';
    }

    // Section count
    document.getElementById('detailMemberCount').textContent = `${members.length} คน`;

    // Premium member tiles — bordered cards with avatar ring + stagger (--bk-i)
    document.getElementById('detailMembersList').innerHTML = members.map((m, idx) => `
        <div class="bk-detail-member" style="--bk-i:${idx}">
            <div class="bk-detail-member-avatar">
                <i data-lucide="user"></i>
            </div>
            <div class="bk-detail-member-body">
                <div class="bk-detail-member-head">
                    <span class="bk-detail-member-name text-truncate">${m.booker || '–'}</span>
                    <span class="vc-badge vc-badge-neutral flex-shrink-0 d-inline-flex align-items-center gap-1">
                        <i data-lucide="users" class="vc-icon-sm"></i>${m.pax || '–'}
                    </span>
                </div>
                <div class="bk-detail-member-trip">
                    <span class="text-truncate">${m.purpose || '–'}</span>
                    <i data-lucide="arrow-right" class="vc-icon-sm flex-shrink-0"></i>
                    <span class="text-truncate">${m.dest || '–'}</span>
                </div>
                ${m.pickup && m.pickup.trim() ? `
                <div class="bk-detail-member-pickup text-truncate">ขึ้นรถที่: ${m.pickup}</div>` : ''}
            </div>
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
                <button type="submit" class="vc-btn vc-btn-danger vc-btn-sm" title="ยกเลิกการจองนี้">
                    <i data-lucide="trash-2" class="vc-icon-sm"></i>
                    ยกเลิกการจอง
                </button>
            </form>
            ${showEdit ? `
            <button type="button" class="vc-btn vc-btn-secondary vc-btn-sm" title="แก้ไขการจอง"
                onclick="eventDetailModal.hide();setTimeout(()=>openEditBookingModal(${e.id}),300)">
                <i data-lucide="pencil" class="vc-icon-sm"></i>
                แก้ไข
            </button>` : ''}`;
    }

    // Footer collapse: CSS `.bk-detail-footer:has(#detailActions:empty) { display: none }` ทำให้แล้ว
    eventDetailModal.show();
}

function openEditBookingModal(eventId) {
    const e = mockEvents.find(b => b.id === eventId);
    if (!e) return;
    eventDetailModal?.hide();

    const editForm = document.getElementById('editBookingForm');
    editForm.action = e.editUrl;
    editForm.classList.remove('was-validated');
    editForm.querySelectorAll('.is-valid').forEach(el => el.classList.remove('is-valid'));

    document.getElementById('editDest').value         = e.dest    || '';
    document.getElementById('editPurpose').value      = e.purpose || '';
    document.getElementById('editPax').value          = e.pax     || 1;
    document.getElementById('editNeedDriver').checked = e.needDriver;
    document.getElementById('editPickup').value       = e.pickup  || '';
    document.getElementById('edit_start_time').value  = e.time    || '';
    document.getElementById('edit_end_time').value    = e.timeEnd || '';

    initFlatpickrInModal();
    setTimeout(() => {
        // edit_date via flatpickr setDate → sync altInput Thai display
        const editDate = document.getElementById('edit_date');
        if (editDate?._flatpickr) editDate._flatpickr.setDate(e.date, true);
        else if (editDate) editDate.value = e.date;
        // Trigger duration preview + valid-icon refresh
        document.getElementById('edit_end_time')?.dispatchEvent(new Event('change'));
        editForm.querySelectorAll('[required]').forEach(field => {
            if (field.value) field.classList.add('is-valid');
        });
        editBookingModal.show();
    }, 50);
}

function openBookingModal(dateStr=null) {
    if(eventDetailModal) eventDetailModal.hide();
    if(moreEventsModal)  moreEventsModal.hide();
    const pad = n => String(n).padStart(2,'0');
    const ds  = dateStr || (selectedDate
        ? `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth()+1)}-${pad(selectedDate.getDate())}`
        : null);

    if (ds) bkSetDate(ds); else bkClearDate();
    // เวลา default 08:00–17:00 ทุกครั้งที่เปิด modal
    bkSelectTime('bk_start_time', '08:00');
    bkSelectTime('bk_end_time',   '17:00');

    bookingModal.show();
}

/* ── Expose for HTML-string onclick handlers ── */
Object.assign(window, {
    openEventDetail, openEditBookingModal, openMoreEvents, openBookingModal,
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
