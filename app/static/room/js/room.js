/* ══════════════════════════════════════════════════
   pages/room.js — BB Center room booking calendar (ES module)
   Calendar + booking (create+edit merged) + detail. Migrate 2026-08-05: bb-* token +
   Material Symbols icon (แทน vc-* + Lucide) · date/time ผ่าน DateField/TimeRangeField
   component (core/js/bb-components.js) แทน flatpickr/native input. Pattern จาก pages/vehicle.js
══════════════════════════════════════════════════ */

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
let bookingModal, eventDetailModal;

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
eventDetailModal = new bootstrap.Modal(document.getElementById('eventDetailModal'));

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

document.getElementById('prevMonthBtnMobile')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});
document.getElementById('nextMonthBtnMobile')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});
document.getElementById('todayBtnMobile')?.addEventListener('click', () => {
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

/* ── Booking modal — DateField/TimeRangeField (component กลาง) ─────────────
   2026-08-05: date/time ย้ายจาก native input → DateField/TimeRangeField
   (core/js/bb-components.js, event 'bb-datefield:change'/'bb-timerangefield:change') ── */
function bkDateFieldEl() { return document.getElementById('bk_date_field'); }
function bkTimeRangeEl() { return document.getElementById('bk_timerange_field'); }
function bkSetDate(ds) { bkDateFieldEl()?.__bbSetValue(ds); }
function bkClearDate()  { bkDateFieldEl()?.__bbClear(); }
function bkSetTimeRange(start, end) { bkTimeRangeEl()?.__bbSetRange(start, end); }

/* จอง+แก้ไข ใช้ #bookingForm เดียวกัน (2026-08-05) — สลับปุ่ม/form.action ตามโหมด
   create ใช้ data-create-action ที่ template เก็บไว้ (กัน action ค้างจาก edit ครั้งก่อน) */
function bkSetMode(mode) {
    const isEdit = mode === 'edit';
    const btn = document.getElementById('bkSubmitBtn');
    if (btn) {
        btn.title = isEdit ? 'บันทึกการแก้ไข' : 'ยืนยันการจองห้อง';
        btn.innerHTML = isEdit
            ? 'บันทึก <span class="material-symbols-rounded vc-icon-sm">check</span>'
            : 'ยืนยันการจอง <span class="material-symbols-rounded vc-icon-sm">arrow_forward</span>';
    }
}

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
document.getElementById('bookingModal')?.addEventListener('hidden.bs.modal', function() {
    const f = document.getElementById('bookingForm');
    if (f) {
        f.classList.remove('was-validated');
        f.reset();
        f.querySelectorAll('.is-valid').forEach(el => el.classList.remove('is-valid'));
        const err = document.getElementById('bk_date_err');
        if (err) err.hidden = true;
    }
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

/* ── Calendar render ──────────────────────────── */
function renderCalendar() {
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    document.getElementById('currentMonthLabel').textContent = `${TH_MONTHS[month]} ${year + 543}`;
    const _mobLabel = document.getElementById('currentMonthLabelMobile');
    if (_mobLabel) _mobLabel.textContent = `${TH_MONTHS[month]} ${year + 543}`;
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
                style="border-bottom:1px solid var(--bb-n200);cursor:pointer;"
                onclick="bootstrap.Popover.getInstance(document.querySelector('[data-ds=\\'${ds}\\']'))?.hide(); setTimeout(()=>openEventDetail(${e.id}),200)">
                <span class="bb-badge ${kind === 'small' ? 'is-info' : 'is-wr'}" style="font-size:.7rem;">${e.room || ''}</span>
                <span style="font-size:.75rem;font-weight:600;">${e.time}</span>
                <span class="text-truncate" style="font-size:.72rem;max-width:110px;">${e.title}</span>
            </div>`;
        }).join('');
        html += `<div class="event-more vc-cal-more popover-trigger" data-ds="${ds}"
            data-bs-toggle="popover" data-bs-placement="auto" data-bs-html="true"
            data-bs-title="<span style='font-size:.8rem;font-weight:600;'>+${extra.length} รายการ</span>"
            data-bs-content="${popContent.replace(/"/g, '&quot;')}"
            onclick="event.stopPropagation()">+${extra.length} รายการ</div>`;
    }

    dayEvents.slice(0, maxShow).forEach(e => {
        const kind = roomKind(e.room);
        const tone = kind === 'small'
            ? 'background:var(--bb-info-bg);color:var(--bb-info-tx);'
            : 'background:var(--bb-wr-bg);color:var(--bb-wr-tx);';
        html += `<div class="event-card p-1" style="border-radius:4px;${tone}"
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
    const countEl = document.getElementById('mobileDaybarCount');
    if (countEl) countEl.textContent = dayEvents.length ? `${dayEvents.length} รายการ` : '';
    const content = document.getElementById('mobileListContent');

    if (!dayEvents.length) {
        content.innerHTML = `<div class="vrc-m-empty">
            <div class="vrc-m-empty-icon"><span class="material-symbols-rounded">event_busy</span></div>
            <div class="vrc-m-empty-title">ไม่มีการจองในวันนี้</div>
            <div class="vrc-m-empty-sub">แตะปุ่ม “จองห้อง” ด้านบนเพื่อเพิ่มการจองใหม่</div>
        </div>`;
        return;
    }

    let html = '';
    dayEvents.forEach(e => {
        const kind = roomKind(e.room);
        const tone = kind === 'small'
            ? 'background:var(--bb-info-bg);color:var(--bb-info-tx)'
            : 'background:var(--bb-wr-bg);color:var(--bb-wr-tx)';
        html += `
        <div class="card mb-2" onclick="openEventDetail(${e.id})" style="cursor:pointer;">
            <div class="card-body py-2 px-3">
                <div class="d-flex align-items-center gap-3">

                    <div class="bb-avatar flex-shrink-0" style="width:36px;height:36px;${tone}">
                        <span class="material-symbols-rounded vc-icon-sm">add_home</span>
                    </div>

                    <div class="flex-grow-1 overflow-hidden">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <span class="fw-semibold text-truncate" style="font-size:.88rem;color:var(--bb-str);">${e.title}</span>
                            <span class="bb-badge ${kind === 'small' ? 'is-info' : 'is-wr'} flex-shrink-0" style="font-size:.68rem;">${e.room}</span>
                        </div>
                        <div class="d-flex align-items-center gap-1 flex-wrap" style="font-size:.75rem;color:var(--bb-mut);">
                            <span class="material-symbols-rounded">face</span>${e.booker}
                            <span class="mx-1">·</span>
                            <span class="material-symbols-rounded vc-icon-sm">schedule</span>${e.time} – ${e.timeEnd}
                        </div>
                    </div>

                    ${e.isOwner ? `
                    <div class="flex-shrink-0">
                        <button type="button" class="bb-btn is-sec is-icon is-sm"
                                title="แก้ไขการจอง"
                                onclick="event.stopPropagation(); openEditBookingModal(${e.id})">
                            <span class="material-symbols-rounded vc-icon-sm">edit</span>
                        </button>
                    </div>` : ''}

                </div>
            </div>
        </div>`;
    });

    content.innerHTML = html;
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
    const avatar = document.getElementById('detailStatusAvatar');
    if (avatar) {
        avatar.style.background = kind === 'small' ? 'var(--bb-info-bg)' : 'var(--bb-wr-bg)';
        avatar.style.color      = kind === 'small' ? 'var(--bb-info-tx)' : 'var(--bb-wr-tx)';
    }

    document.getElementById('detailDateLine').textContent = _thaiDateFull(e.date);
    document.getElementById('detailTime').textContent  = `${e.time} – ${e.timeEnd}`;
    document.getElementById('detailRoom').textContent  = e.room || '–';
    document.getElementById('detailTitle').textContent = e.title || '–';

    document.getElementById('detailBookerBlock').innerHTML = `
        <div class="d-flex align-items-center gap-3 py-2">
            <div class="bb-avatar flex-shrink-0" style="width:2.25rem;height:2.25rem;background:var(--bb-n100);color:var(--bb-mut)">
                <span class="material-symbols-rounded">face</span>
            </div>
            <div class="flex-grow-1 overflow-hidden">
                <div class="fw-semibold text-truncate" style="font-size:.9rem;color:var(--bb-str);">${e.booker || '–'}</div>
                <div class="text-truncate" style="font-size:.78rem;color:var(--bb-mut);">${e.dept || ''}</div>
            </div>
        </div>`;

    const actDiv = document.getElementById('detailActions');
    actDiv.innerHTML = '';
    if (e.isOwner) {
        actDiv.innerHTML = `
            <button type="button" class="bb-btn is-sec is-sm" title="แก้ไขการจอง"
                onclick="eventDetailModal.hide();setTimeout(()=>openEditBookingModal(${e.id}),300)">
                <span class="material-symbols-rounded vc-icon-sm">edit</span>
                แก้ไข
            </button>
            <form action="${e.deleteUrl}" method="POST"
                onsubmit="return confirm('ยืนยันยกเลิกการจองห้องนี้?')">
                <button type="submit" class="bb-btn is-danger is-sm" title="ยกเลิกการจอง">
                    <span class="material-symbols-rounded vc-icon-sm">delete</span>
                    ยกเลิก
                </button>
            </form>`;
    }
    actDiv.classList.toggle('d-none', !actDiv.innerHTML);

    eventDetailModal.show();
}

function openEditBookingModal(eventId) {
    const e = mockEvents.find(b => b.id === eventId);
    if (!e) return;
    eventDetailModal?.hide();

    const form = document.getElementById('bookingForm');
    form.action = e.editUrl;
    form.classList.remove('was-validated');
    form.querySelectorAll('.is-valid').forEach(el => el.classList.remove('is-valid'));

    document.getElementById('bk_room_name').value = e.room  || '';
    document.getElementById('bk_title').value     = e.title || '';
    bkSetDate(e.date);
    bkSetTimeRange(e.time || '09:00', e.timeEnd || '10:00');

    form.querySelectorAll('[required]').forEach(field => {
        if (field.value) field.classList.add('is-valid');
    });

    bkSetMode('edit');
    bookingModal.show();
}

function openBookingModal(dateStr = null) {
    if (eventDetailModal) eventDetailModal.hide();
    const pad = n => String(n).padStart(2, '0');
    const ds = dateStr || (selectedDate
        ? `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`
        : null);

    const form = document.getElementById('bookingForm');
    form.action = form.dataset.createAction;   // คืนค่า action กัน edit ครั้งก่อนค้างไว้

    if (ds) bkSetDate(ds); else bkClearDate();
    bkSetTimeRange('09:00', '10:00');

    bkSetMode('create');
    bookingModal.show();
}

/* ── ทำซ้ำ: เปิด modal จองใหม่ prefill ห้อง+หัวข้อเดิม (เว้นวัน/เวลา) — ใช้โดยปุ่ม "ทำซ้ำ" ใน dashboard.html
   (url_for('room.index', copy_from=b.id) ผูกไว้ที่ auth_view.py) ── */
function openDuplicateModal(eventId) {
    const e = mockEvents.find(b => b.id === eventId);
    if (!e) return;
    openBookingModal();   // modal เปล่า: set เวลา default
    bkClearDate();         // เว้นวันให้เลือกใหม่
    const title = document.getElementById('bk_title');
    if (title) title.value = e.title || '';
    // ห้องเดิม — เลือกถ้ายังมีในตัวเลือก (กันห้องถูกปิด)
    const roomSel = document.getElementById('bk_room_name');
    if (roomSel) {
        const exists = Array.from(roomSel.options).some(o => o.value === e.room);
        roomSel.value = exists ? (e.room || '') : '';
        roomSel.classList.toggle('is-invalid', !exists);
    }
}

/* ── Expose for inline onclick handlers ── */
Object.assign(window, { openEventDetail, openEditBookingModal, openBookingModal, openDuplicateModal });
Object.defineProperty(window, 'eventDetailModal', { get: () => eventDetailModal, configurable: true });

/* ── ?new=1 (จองใหม่) / ?copy_from=<id> (ทำซ้ำ) deep-link จากหน้า home ── */
(function handleNewOrCopyDeeplink() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('copy_from') && !params.has('new')) return;
    const copyId = parseInt(params.get('copy_from'), 10);
    if (copyId) openDuplicateModal(copyId);
    else if (params.get('new')) openBookingModal();
    const url = new URL(window.location.href);
    url.searchParams.delete('copy_from');
    url.searchParams.delete('new');
    history.replaceState(null, '', url.toString());
})();
