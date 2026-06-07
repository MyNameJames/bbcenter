/* ══════════════════════════════════════════════════
   pages/room.js — BB Center room booking calendar (ES module)
   Calendar + booking + edit + detail. Pattern จาก pages/vehicle.js
══════════════════════════════════════════════════ */

import { initIcons, bindModalReinit } from '../core/icons.js';
bindModalReinit();
document.addEventListener('shown.bs.popover', () => {
    document.querySelectorAll('.popover').forEach(tip => initIcons(tip));
});

document.addEventListener('keydown', (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const t = ev.target;
    if (t && (t.matches('input,textarea,select,[contenteditable="true"]') ||
              t.closest('.modal.show'))) return;
    if (ev.key === 'ArrowLeft')       document.getElementById('prevMonthBtn')?.click();
    else if (ev.key === 'ArrowRight') document.getElementById('nextMonthBtn')?.click();
    else if (ev.key === 't' || ev.key === 'T') document.getElementById('todayBtn')?.click();
});

/* ── Constants ─────────────────────────────────── */
const TH_MONTHS = [
    'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];
const TH_DAYS_FULL = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];

function roomKind(room) {
    if (!room) return 'small';
    return room.includes('เล็ก') ? 'small' : 'large';
}

/* ── State ─────────────────────────────────────── */
let currentDate = new Date();
currentDate.setDate(1);
let selectedDate = new Date();
let calendarCollapsed = false;
let bookingModal, editBookingModal, eventDetailModal;

const mockEvents = window.BOOKINGS || [];

/* ── Helpers ───────────────────────────────────── */
function sortByTime(arr) {
    return [...arr].sort((a, b) => {
        const m = t => { const [h, mm] = t.split(':').map(Number); return h * 60 + mm; };
        return m(a.time) - m(b.time);
    });
}

/* ── Init ──────────────────────────────────────── */
bookingModal     = new bootstrap.Modal(document.getElementById('bookingModal'));
editBookingModal = new bootstrap.Modal(document.getElementById('editBookingModal'));
eventDetailModal = new bootstrap.Modal(document.getElementById('eventDetailModal'));

initFlatpickr();
renderCalendar();
initMobileScrollCollapse();

/* ── Month nav ─────────────────────────────────── */
document.getElementById('prevMonthBtn')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});
document.getElementById('nextMonthBtn')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});
document.getElementById('todayBtn')?.addEventListener('click', () => {
    currentDate = new Date(); currentDate.setDate(1);
    selectedDate = new Date();
    renderCalendar();
});

const calBody = document.getElementById('calendarBody');
function hideOtherMonthEvents() {
    document.querySelectorAll('.calendar-cell.other-month .events-container')
        .forEach(c => { c.innerHTML = ''; });
}
if (calBody) {
    new MutationObserver(hideOtherMonthEvents).observe(calBody, { childList: true, subtree: true });
}

/* ── bookingForm validation ────────────────────── */
document.getElementById('bookingForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    this.classList.add('was-validated');
    if (!this.checkValidity()) return;
    const date   = document.getElementById('bk_date').value;
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
document.getElementById('bookingModal')?.addEventListener('hidden.bs.modal', function() {
    const f = document.getElementById('bookingForm');
    if (f) {
        f.classList.remove('was-validated');
        f.reset();
        f.querySelectorAll('.is-valid').forEach(el => el.classList.remove('is-valid'));
    }
});

document.getElementById('editBookingForm')?.addEventListener('submit', function(e) {
    this.classList.add('was-validated');
    if (!this.checkValidity()) e.preventDefault();
});
document.getElementById('editBookingModal')?.addEventListener('hidden.bs.modal', function() {
    const f = document.getElementById('editBookingForm');
    if (f) f.classList.remove('was-validated');
});

/* ── Mobile scroll collapse ────────────────────── */
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

/* ── Flatpickr (booking modal time pickers) ────── */
function initFlatpickr() {
    const bkDate = document.getElementById('bk_date');
    if (bkDate) {
        const today = new Date();
        const pad   = n => String(n).padStart(2, '0');
        bkDate.min  = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
    }
    const bkStart = document.getElementById('bk_start_time');
    const bkEnd   = document.getElementById('bk_end_time');
    const bkDur   = document.getElementById('bk_duration_preview');
    const updateDuration = () => {
        if (!bkDur) return;
        const s = bkStart?.value, e = bkEnd?.value;
        if (!s || !e || e <= s) { bkDur.textContent = ''; return; }
        const [sh, sm] = s.split(':').map(Number);
        const [eh, em] = e.split(':').map(Number);
        const mins = (eh * 60 + em) - (sh * 60 + sm);
        const h = Math.floor(mins / 60), m = mins % 60;
        const parts = [];
        if (h) parts.push(`${h} ชม.`);
        if (m) parts.push(`${m} นาที`);
        bkDur.textContent = `ระยะเวลา ${parts.join(' ')}`;
    };
    if (bkStart && bkEnd) {
        bkStart.addEventListener('change', () => {
            bkEnd.min = bkStart.value;
            if (bkEnd.value && bkEnd.value <= bkStart.value) bkEnd.value = '';
            updateDuration();
        });
        bkEnd.addEventListener('change', updateDuration);
    }
}

function initFlatpickrInEditModal() {
    const sEl = document.querySelector('#editBookingModal #editStartDatetime');
    const eEl = document.querySelector('#editBookingModal #editEndDatetime');
    if (!sEl || !eEl || sEl._flatpickr) return;
    const eFp = flatpickr(eEl, {
        enableTime:true, time_24hr:true, minuteIncrement:5,
        locale:'th', dateFormat:'Y-m-d\\TH:i', altInput:true, altFormat:'d/m/Y H:i'
    });
    flatpickr(sEl, {
        enableTime:true, time_24hr:true, minuteIncrement:5,
        locale:'th', dateFormat:'Y-m-d\\TH:i', altInput:true, altFormat:'d/m/Y H:i',
        onChange(sel) {
            if (!sel.length) return;
            const d=sel[0], ds=flatpickr.formatDate(d,'Y-m-d');
            eFp.set('minDate', ds + 'T00:00');
            eFp.set('maxDate', ds + 'T23:59');
        }
    });
}

/* ── Calendar render ──────────────────────────── */
function renderCalendar() {
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    document.getElementById('currentMonthLabel').textContent = `${TH_MONTHS[month]} ${year + 543}`;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const calBody = document.getElementById('calendarBody');
    calBody.innerHTML = '';
    const today = new Date();
    for (let i = firstDay - 1; i >= 0; i--) createCell(daysInPrev - i, year, month - 1, true);
    for (let i = 1; i <= daysInMonth; i++) {
        const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        createCell(i, year, month, false, isToday);
    }
    const total = firstDay + daysInMonth;
    const fill = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let i = 1; i <= fill; i++) createCell(i, year, month + 1, true);
    if (calendarCollapsed) collapseCalendarCells();
    updateMobileList(selectedDate || today);
    initIcons(calBody);
}

function createCell(day, year, month, isOtherMonth, isToday = false) {
    let tYear = year, tMonth = month;
    if (tMonth < 0) { tMonth = 11; tYear--; }
    if (tMonth > 11) { tMonth = 0; tYear++; }
    const pad = n => String(n).padStart(2, '0');
    const ds = `${tYear}-${pad(tMonth + 1)}-${pad(day)}`;
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
    const cellDate = new Date(tYear, tMonth, day);
    const isPast = cellDate < todayMidnight;

    const cell = document.createElement('div');
    cell.className = `calendar-cell${isOtherMonth ? ' other-month' : ''}${isToday ? ' today' : ''}${isPast ? ' past-day' : ''}`;
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', `${day} ${TH_MONTHS[tMonth]} ${tYear + 543}`);
    if (isToday) cell.setAttribute('aria-current', 'date');
    if (selectedDate && !isOtherMonth
        && selectedDate.getDate() === day
        && selectedDate.getMonth() === tMonth
        && selectedDate.getFullYear() === tYear) cell.classList.add('selected');

    const dayEvents = sortByTime(mockEvents.filter(e => e.date === ds));
    let html = `<span class="date-number">${day}</span>`;

    if (!isOtherMonth) {
        if (dayEvents.length === 1) html += `<span class="mobile-indicator"></span>`;
        else if (dayEvents.length >= 4) html += `<span class="mobile-indicator" style="width:25px;border-radius:4px;"></span>`;
        else if (dayEvents.length >= 2) html += `<span class="mobile-indicator" style="width:15px;border-radius:4px;"></span>`;
    }

    html += `<div class="events-container mt-auto">`;
    html += isOtherMonth ? '' : buildDesktopEventCards(dayEvents, ds);
    html += `</div>`;

    cell.innerHTML = html;
    cell.querySelectorAll('[data-bs-toggle="popover"]').forEach(el => {
        new bootstrap.Popover(el, { trigger: 'click', container: 'body', sanitize: false });
    });

    cell.addEventListener('click', () => {
        document.querySelectorAll('.calendar-cell').forEach(c => c.classList.remove('selected'));
        if (!isOtherMonth) cell.classList.add('selected');
        selectedDate = new Date(tYear, tMonth, day);
        updateMobileList(selectedDate);
        document.querySelectorAll('[data-bs-toggle="popover"]').forEach(el => {
            bootstrap.Popover.getInstance(el)?.hide();
        });
        if (window.innerWidth >= 768 && !isOtherMonth && !isPast) {
            openBookingModal(ds);
        }
    });

    document.getElementById('calendarBody').appendChild(cell);
}

function buildDesktopEventCards(dayEvents, ds) {
    if (!dayEvents.length) return '';
    const maxShow = 2;
    let html = '';

    if (dayEvents.length > maxShow) {
        const extra = dayEvents.slice(maxShow);
        const popContent = extra.map(e => {
            const kind = roomKind(e.room);
            return `<div class="d-flex align-items-center gap-2 mb-1 pb-1"
                style="border-bottom:1px solid var(--vc-border);cursor:pointer;"
                onclick="bootstrap.Popover.getInstance(document.querySelector('[data-ds=\\'${ds}\\']'))?.hide(); setTimeout(()=>openEventDetail(${e.id}),200)">
                <span class="vc-badge room-badge--${kind}" style="font-size:.7rem;">${e.room || ''}</span>
                <span style="font-size:.75rem;font-weight:600;">${e.time}</span>
                <span class="text-truncate" style="font-size:.72rem;max-width:110px;">${e.title}</span>
            </div>`;
        }).join('');
        html += `<div class="event-more popover-trigger" data-ds="${ds}"
            data-bs-toggle="popover" data-bs-placement="auto" data-bs-html="true"
            data-bs-title="<span style='font-size:.8rem;font-weight:600;'>+${extra.length} รายการ</span>"
            data-bs-content="${popContent.replace(/"/g, '&quot;')}"
            onclick="event.stopPropagation()">+${extra.length} รายการ</div>`;
    }

    dayEvents.slice(0, maxShow).forEach(e => {
        const kind = roomKind(e.room);
        html += `<div class="event-card room-${kind} p-1" style="border-radius:4px;"
            onclick="event.stopPropagation(); openEventDetail(${e.id})">
            <div class="row g-1 d-flex align-items-center text-truncate">
                <span class="col-auto" style="font-size:.72rem;font-weight:600;">${e.time}</span>
                <span class="col text-truncate" style="font-size:.72rem;">${e.title}</span>
            </div>
        </div>`;
    });

    return html;
}

function updateMobileList(dateObj) {
    if (!dateObj) return;
    const pad = n => String(n).padStart(2, '0');
    const ds = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
    const isPastDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()) < todayMidnight;

    document.getElementById('mobileListDateLabel').textContent =
        `${dateObj.getDate()} ${TH_MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear() + 543}`;

    const bookBtn = document.getElementById('mobileDateCountBtn');
    if (bookBtn) {
        bookBtn.disabled = isPastDate;
        bookBtn.style.opacity = isPastDate ? '.5' : '';
        bookBtn.style.cursor  = isPastDate ? 'not-allowed' : '';
    }

    const dayEvents = sortByTime(mockEvents.filter(e => e.date === ds));
    const content = document.getElementById('mobileListContent');

    if (!dayEvents.length) {
        content.innerHTML = `<div class="room-mobile-empty">
            <i data-lucide="calendar-x"></i>
            <small>ไม่มีการจองในวันนี้</small>
        </div>`;
        initIcons(content);
        return;
    }

    let html = '';
    dayEvents.forEach(e => {
        const kind = roomKind(e.room);
        html += `
        <div class="card mb-2" onclick="openEventDetail(${e.id})" style="cursor:pointer;">
            <div class="card-body py-2 px-3">
                <div class="d-flex align-items-center gap-3">

                    <div class="room-list-dot room-list-dot--${kind}">
                        <i data-lucide="door-open" class="vc-icon-sm"></i>
                    </div>

                    <div class="flex-grow-1 overflow-hidden">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <span class="fw-semibold text-truncate" style="font-size:.88rem;color:var(--vc-fg);">${e.title}</span>
                            <span class="vc-badge room-badge--${kind} flex-shrink-0" style="font-size:.68rem;">${e.room}</span>
                        </div>
                        <div class="d-flex align-items-center gap-1 flex-wrap" style="font-size:.75rem;color:var(--vc-fg-muted);">
                            <i data-lucide="user" class="vc-icon-sm"></i>${e.booker}
                            <span class="mx-1">·</span>
                            <i data-lucide="clock" class="vc-icon-sm"></i>${e.time} – ${e.timeEnd}
                        </div>
                    </div>

                    ${e.isOwner ? `
                    <div class="flex-shrink-0">
                        <button type="button" class="vc-btn vc-btn-ghost vc-btn-icon vc-btn-sm"
                                title="แก้ไขการจอง"
                                onclick="event.stopPropagation(); openEditBookingModal(${e.id})">
                            <i data-lucide="pencil" class="vc-icon-sm"></i>
                        </button>
                    </div>` : ''}

                </div>
            </div>
        </div>`;
    });

    content.innerHTML = html;
    initIcons(content);
}

function _thaiDateFull(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    return `วัน${TH_DAYS_FULL[dow]} ที่ ${d} ${TH_MONTHS[m - 1]} ${y + 543}`;
}

function openEventDetail(eventId) {
    const e = mockEvents.find(b => b.id === eventId);
    if (!e) return;

    const kind = roomKind(e.room);
    const headerDot = document.getElementById('detailHeaderDot');
    headerDot.className = `room-detail-dot room-detail-dot--${kind} flex-shrink-0`;
    document.getElementById('detailHeaderIcon').outerHTML =
        `<i id="detailHeaderIcon" data-lucide="door-open" style="width:20px;height:20px;"></i>`;

    document.getElementById('detailDateLine').textContent = _thaiDateFull(e.date);
    document.getElementById('detailTime').textContent  = `${e.time} – ${e.timeEnd}`;
    document.getElementById('detailRoom').textContent  = e.room || '–';
    document.getElementById('detailTitle').textContent = e.title || '–';

    document.getElementById('detailBookerBlock').innerHTML = `
        <div class="d-flex align-items-center gap-3 py-2">
            <div class="room-list-dot room-list-dot--${kind} flex-shrink-0">
                <i data-lucide="user" class="vc-icon-sm"></i>
            </div>
            <div class="flex-grow-1 overflow-hidden">
                <div class="fw-semibold text-truncate" style="font-size:.9rem;color:var(--vc-fg);">${e.booker || '–'}</div>
                <div class="text-truncate" style="font-size:.78rem;color:var(--vc-fg-muted);">${e.dept || ''}</div>
            </div>
        </div>`;

    const actDiv = document.getElementById('detailActions');
    actDiv.innerHTML = '';
    if (e.isOwner) {
        actDiv.innerHTML = `
            <button type="button" class="vc-btn vc-btn-secondary vc-btn-sm" title="แก้ไขการจอง"
                onclick="eventDetailModal.hide();setTimeout(()=>openEditBookingModal(${e.id}),300)">
                <i data-lucide="pencil" class="vc-icon-sm"></i>
                แก้ไข
            </button>
            <form action="${e.deleteUrl}" method="POST"
                onsubmit="return confirm('ยืนยันยกเลิกการจองห้องนี้?')">
                <button type="submit" class="vc-btn vc-btn-danger vc-btn-sm" title="ยกเลิกการจอง">
                    <i data-lucide="trash-2" class="vc-icon-sm"></i>
                    ยกเลิก
                </button>
            </form>`;
    }

    eventDetailModal.show();
}

function openEditBookingModal(eventId) {
    const e = mockEvents.find(b => b.id === eventId);
    if (!e) return;
    eventDetailModal?.hide();

    const form = document.getElementById('editBookingForm');
    form.action = e.editUrl;
    form.classList.remove('was-validated');
    document.getElementById('editRoomName').value = e.room || '';
    document.getElementById('editTitle').value    = e.title || '';

    initFlatpickrInEditModal();
    setTimeout(() => {
        const sd = document.getElementById('editStartDatetime')?._flatpickr;
        const ed = document.getElementById('editEndDatetime')?._flatpickr;
        if (sd) sd.setDate(`${e.date}T${e.time}`);
        if (ed) ed.setDate(`${e.date}T${e.timeEnd}`);
        editBookingModal.show();
    }, 50);
}

function openBookingModal(dateStr = null) {
    if (eventDetailModal) eventDetailModal.hide();
    const pad = n => String(n).padStart(2, '0');
    const ds = dateStr || (selectedDate
        ? `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`
        : null);

    const bkDate  = document.getElementById('bk_date');
    const bkStart = document.getElementById('bk_start_time');
    const bkEnd   = document.getElementById('bk_end_time');
    if (ds && bkDate) bkDate.value = ds;
    if (bkStart && !bkStart.value) bkStart.value = '09:00';
    if (bkEnd && !bkEnd.value)     bkEnd.value   = '10:00';

    bookingModal.show();
}

/* ── Expose for inline onclick handlers ── */
Object.assign(window, { openEventDetail, openEditBookingModal, openBookingModal });
Object.defineProperty(window, 'eventDetailModal', { get: () => eventDetailModal, configurable: true });
