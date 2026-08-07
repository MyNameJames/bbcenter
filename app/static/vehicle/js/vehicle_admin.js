/* ══════════════════════════════════════════════════
   pages/vehicle-admin.js — Fleet Admin Redesign (ES module)
   Depends on: BOOKINGS_DATA, VEHICLES_DATA, DRIVERS_DATA,
               BUDGETS_DATA, PURPOSES_DATA, FUEL_PRICE, SERVER_NOW
══════════════════════════════════════════════════ */
import { initIcons } from '../../core/js/icons.js';

/* ── Constants ────────────────────────────────── */
const TH_DAYS_F = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const TH_MON_F  = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                   'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

/* STATUS_ICON — merged map (Phase A 2026-05-24 extended `.cls` for `.bl-icon--*`)
   icon = ชื่อ Material Symbols ของ Google ตรงๆ (2026-07-28 เลิกใช้ชื่อ Lucide + ms-icons MAP) */
const STATUS_ICON = {
    pending:          { dot:'pending',  icon:'schedule',     cls:'bl-icon--pending' },
    waiting_approver: { dot:'approver', icon:'send',         cls:'bl-icon--approver' },
    forwarded:        { dot:'approver', icon:'send',         cls:'bl-icon--approver' },
    approved:         { dot:'approved', icon:'check_circle', cls:'bl-icon--approved' },
    rejected:         { dot:'rejected', icon:'cancel',       cls:'bl-icon--rejected' },
};

const STATUS_BADGE = {
    pending:          { cls:'is-wr',   label:'รออนุมัติ' },
    waiting_approver: { cls:'is-info', label:'ส่ง Approver' },
    forwarded:        { cls:'is-info', label:'ส่ง Approver' },
    approved:         { cls:'is-ok',   label:'อนุมัติแล้ว' },
    rejected:         { cls:'is-dg',   label:'ปฏิเสธ' },
};

/* label ปุ่มยืนยันใน assignModal ตาม action — ใช้ร่วมกันทั้ง openAssignModal (ตั้งตอนเปิด)
   และ submitAssign catch block (คืนค่าตอน error) */
const CONFIRM_LABEL = {
    approve:   'อนุมัติและจัดรถ',
    reject:    'ยืนยันการปฏิเสธ',
    edit:      'บันทึกการแก้ไข',
    group_new: 'ยืนยันการรวมงาน',
    group:     'บันทึกกลุ่ม',
    group_add: 'ยืนยันเพิ่มงานเข้ากลุ่ม',
};

/* ── State ────────────────────────────────────── */
const bookings  = [...(window.BOOKINGS_DATA  || [])];
const vehicles  = [...(window.VEHICLES_DATA  || [])];
const drivers   = [...(window.DRIVERS_DATA   || [])];
const budgets   = window.BUDGETS_DATA   || { central:[], department:[] };
const fuelPrice = window.FUEL_PRICE     || 0;

const serverNow = window.SERVER_NOW ? new Date(window.SERVER_NOW) : new Date();
const today     = new Date(serverNow.getFullYear(), serverNow.getMonth(), serverNow.getDate());

let selDate    = new Date(today);
let curFilter  = 'all';
let groupSel   = new Set();
let notifySel  = new Set();
let groupRowSel = new Set();   // trip_group names ที่ติ๊กจากแถว "งานร่วม" (แจ้งเตือน + เพิ่มงานเข้ากลุ่ม)

let activeBookingId  = null;
let activeGroupName  = null;
let modalAction      = 'approve';
let modalExpType     = 'central';
let swapBookingId    = null;
let swapVehicleId    = null;
let repairVehicleId  = null;
let revertBookingId  = null;
let revertGroupName  = null;
let isSaving         = false;
let pendingAddIds    = [];     // booking id ใหม่ที่กำลังจะเพิ่มเข้ากลุ่มเดิม (modalAction==='group_add')

/* ── Helpers ──────────────────────────────────── */
function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fromDateStr(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
}

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
/* เปลี่ยนวัน = ยกเลิกการเลือกทั้งหมด (groupSel/notifySel/groupRowSel) + ปิดปุ่ม ALL — กันเลือก
   ค้างข้ามวัน (ตัวเลือกที่ค้างอ้างถึง booking ของวันเก่าที่มองไม่เห็นแล้ว) */
function bindDateControls() {
    document.addEventListener('bb-weekstrip:change', (e) => {
        selDate = fromDateStr(e.detail.date);
        groupSel.clear();
        notifySel.clear();
        groupRowSel.clear();
        document.getElementById('ptBtnAll')?.classList.remove('is-on');
        ptUpdateActionButtons();
        renderBefore();
        renderDuring();
        initIcons();
    });
}

/* ══════════════════════════════════════════════════
   SECTION ก่อน — BOOKING LIST (table/card ใหม่เท่านั้น
   — card list เดิม #bookingList ลบทิ้งแล้ว 2026-07-28)
══════════════════════════════════════════════════ */
function renderBefore() {
    renderPreviewTable();
    renderPreviewCards();
    initIcons();
}

/* งบที่อนุมัติ → label "ประเภท-หมวด" (null = ยังไม่จัดสรร) */
function budgetLabel(b) {
    if (b.expType === 'department') return b.expSub ? `ส่วนกอง-${b.expSub}` : 'ส่วนกอง';
    if (b.expType === 'central')    return b.expSub ? `ส่วนกลาง-${b.expSub}` : 'ส่วนกลาง';
    if (b.expType === 'personal')   return 'ส่วนตัว';
    return null;
}


/* ══════════════════════════════════════════════════
   PREVIEW TABLE + MOBILE CARD (2026-07-27) — ผูก bookings จริงแล้ว
   state: bookings/curFilter/selDate/groupSel/notifySel
   (card list เดิม + โหมดรวมงาน/แจ้งเตือนแบบ toggle ลบทิ้งแล้ว 2026-07-28)
══════════════════════════════════════════════════ */
const PT_TONE = {
    pending:          { bg:'var(--bb-n100)',    fg:'var(--bb-mut)'    },
    waiting_approver: { bg:'var(--bb-info-bg)', fg:'var(--bb-info-tx)'},
    forwarded:        { bg:'var(--bb-info-bg)', fg:'var(--bb-info-tx)'},
    approved:         { bg:'var(--bb-ok-bg)',   fg:'var(--bb-ok-tx)'  },
    rejected:         { bg:'var(--bb-dg-bg)',   fg:'var(--bb-dg-tx)'  },
};

function ptDuration(b) {
    if (!b.startIso || !b.endIso) return '';
    const h = (new Date(b.endIso) - new Date(b.startIso)) / 3600000;
    return h > 0 ? `(${Number.isInteger(h) ? h : h.toFixed(1)} ชม.)` : '';
}

function ptPlate(vehicleLabel) {
    return vehicleLabel ? esc(vehicleLabel.split(' · ').pop()) : '—';
}

function ptBudgetLines(b) {
    const label = budgetLabel(b);
    if (!label) return { top:'ยังไม่ได้จัดสรร', bottom:'—' };
    const [top, bottom] = label.split('-');
    return { top, bottom: bottom || b.deptName || '—' };
}

/* การ์ดมือถือไม่มีคอลัมน์งบแยกเหมือนตาราง desktop → ยุบ 2 บรรทัดของ ptBudgetLines เป็นบรรทัดเดียว
   "งบส่วนกลาง โภชนาการ" (ยังไม่จัดสรร = ข้อความเดียว ไม่ต่อ '—') */
function ptBudgetInline(b) {
    const { top, bottom } = ptBudgetLines(b);
    if (!budgetLabel(b)) return 'ยังไม่ได้จัดสรรงบ';
    return `งบ${top}${bottom && bottom !== '—' ? ` ${bottom}` : ''}`;
}

/* pending = ปุ่ม pri "อนุมัติรถ" · อื่นๆ = ปุ่ม n50/n700 "แก้ไข" (ปุ่มย้อนสถานะเก็บไว้ก่อน ยังไม่โชว์) */
function ptActionBtn(allPending, onclick) {
    return allPending
        ? `<button type="button" class="bb-btn is-pri is-sm flex-shrink-0" style="white-space:nowrap" onclick="event.stopPropagation();${onclick('approve')}">อนุมัติรถ</button>`
        : `<button type="button" class="bb-btn is-sm flex-shrink-0" style="background:var(--bb-n50);color:var(--bb-n700);outline:none;white-space:nowrap" onclick="event.stopPropagation();${onclick('edit')}">แก้ไข</button>`;
}

/* checkbox โชว์ทุกแถว ความหมายขึ้นกับสถานะ: pending → เลือกไว้รวมงาน (groupSel) · approved → เลือกไว้แจ้ง Telegram (notifySel)
   สถานะอื่น (waiting_approver/rejected) กดไม่ได้ — ทำอะไรกับมันไม่ได้ทั้งสองอย่าง */
function ptSelKind(status) {
    if (status === 'pending')  return 'group';
    if (status === 'approved') return 'notify';
    return null;
}
function ptChecked(b) {
    const kind = ptSelKind(b.status);
    return kind === 'group' ? groupSel.has(b.id) : kind === 'notify' ? notifySel.has(b.id) : false;
}
function ptCheckbox(b) {
    const kind = ptSelKind(b.status);
    const checked = ptChecked(b);
    return `<span class="bb-check-box${checked ? ' is-on' : ''}${kind ? '' : ' is-disabled'}" role="checkbox" aria-checked="${checked}" tabindex="0"
        ${kind ? `onclick="event.stopPropagation();ptRowClick(${b.id},'${b.status}')"` : ''}></span>`;
}
/* คลิกได้ทั้งแถว (ยกเว้นปุ่ม action ที่ stopPropagation ไว้แล้ว) = toggle checkbox ของแถวนั้น */
function ptRowClick(id, status) {
    if (status === 'pending')  toggleGroupSel(id);
    else if (status === 'approved') toggleNotifySel(id);
}

function ptTripMeta(b) {
    return `<div class="bb-subtext d-flex align-items-center gap-1 pt-2">
        <span class="material-symbols-rounded">directions_run</span>${b.pax || 0}
        <span>|</span>
        <span class="material-symbols-rounded">schedule</span>${esc(b.start || '—')}${b.end ? `–${esc(b.end)}` : ''} ${ptDuration(b)}
    </div>`;
}

function ptSingleRow(b) {
    const tone = PT_TONE[b.status] || PT_TONE.pending;
    const bud  = ptBudgetLines(b);
    const sel  = ptChecked(b);
    return `
    <tr onclick="ptRowClick(${b.id},'${b.status}')" style="cursor:pointer;${sel ? 'background:var(--bb-n50);outline:none' : ''}">
        <td>${ptCheckbox(b)}</td>
        <td><div class="bb-avatar" style="width:3.5rem;height:3.5rem;background:${tone.bg};color:${tone.fg}"><span class="material-symbols-rounded">directions_car</span></div></td>
        <td>
            <div class="fw-semibold" style="color:var(--bb-str)">${esc(b.booker)}${ptGroupOrderBadge(b)}</div>
            <div class="bb-subtext">${esc(b.pickup || '—')} → ${esc(b.dest || '—')}</div>
            ${ptTripMeta(b)}
        </td>
        <td><div>${esc(bud.top)}</div><div class="bb-subtext">${esc(bud.bottom)}</div></td>
        <td><div>${esc(b.driverLabel || '—')}</div><div class="bb-subtext">${ptPlate(b.vehicleLabel)}</div></td>
        <td class="bb-table-actions">${ptActionBtn(b.status === 'pending', kind => `openAssignModal(${b.id},'${kind}')`)}</td>
    </tr>`;
}

/* subtext รวมของทั้งกลุ่ม (desktop เท่านั้น) — คนรวมทุกรายการ + ช่วงเวลารวม (min start–max end) */
function ptGroupMeta(members) {
    const totalPax = members.reduce((s, b) => s + (b.pax || 0), 0);
    const minStart = members.reduce((m, b) => (b.startIso < m ? b.startIso : m), members[0].startIso);
    const maxEnd   = members.reduce((m, b) => (b.endIso   > m ? b.endIso   : m), members[0].endIso);
    const h = (new Date(maxEnd) - new Date(minStart)) / 3600000;
    const durStr = h > 0 ? `(${Number.isInteger(h) ? h : h.toFixed(1)} ชม.)` : '';
    return `<div class="bb-subtext d-flex align-items-center gap-1 pt-1">
        <span class="material-symbols-rounded">directions_run</span>${totalPax}
        <span>|</span>
        <span class="material-symbols-rounded">schedule</span>${minStart.slice(11,16)}–${maxEnd.slice(11,16)} ${durStr}
    </div>`;
}

/* แถวย่อยของงานร่วม — เป็น <tr> จริงในตารางเดียวกับแถวหลัก (ไม่ใช่ nested table) เพื่อให้
   คอลัมน์ align กับแถวอื่นเป๊ะๆ โดยไม่ต้องเดา offset · bg ขาว + padding 16px + เส้นประคั่นระหว่าง
   รายการ (แถวสุดท้ายคั่นด้วยเส้นทึบปกติ) ใส่เป็น inline style กันชน .bb-table tbody td */
function ptGroupSubRow(b, colId, isLast) {
    const border = isLast ? '1px solid var(--bb-n200)' : '1px dashed var(--bb-n300)';
    const cell   = `background:#fff;padding-top:16px;padding-bottom:16px;border-bottom:${border}`;
    return `
    <tr data-ptgrp="${colId}" style="display:none">
        <td style="${cell}"></td>
        <td style="${cell}"></td>
        <td style="${cell}" colspan="4">
            <div class="fw-semibold" style="color:var(--bb-str)">${esc(b.booker)}</div>
            <div class="bb-subtext">${esc(b.pickup || '—')} → ${esc(b.dest || '—')}</div>
            ${ptTripMeta(b)}
        </td>
    </tr>`;
}

function ptGroupRow(grpName, members) {
    const allPending = members.every(b => b.status === 'pending');
    const colId = `ptgrp-${grpName.replace(/[^a-z0-9]/gi,'')}`;
    const rep   = members[0];
    const bud   = ptBudgetLines(rep);
    const sel   = ptGroupChecked(grpName);
    const isAddTarget = sel && groupSel.size >= 1;
    const subRows = members.map((b, i) => ptGroupSubRow(b, colId, i === members.length - 1)).join('');
    return `
    <tr style="cursor:pointer;${sel ? 'background:var(--bb-n50);outline:none' : ''}" onclick="toggleGroupRowSel('${grpName}')">
        <td>${ptGroupCheckbox(grpName)}</td>
        <td><div class="bb-avatar" style="width:3.5rem;height:3.5rem;background:var(--bb-ok-bg);color:var(--bb-ok-tx)"><span class="material-symbols-rounded">merge</span></div></td>
        <td onclick="event.stopPropagation();ptToggleGroupRows('${colId}')">
            <div class="fw-semibold d-flex align-items-center gap-1" style="color:var(--bb-str)">
                งานร่วม <span class="bb-badge is-neutral">${members.length}</span>${isAddTarget ? ' <span class="bb-badge is-neutral">หลัก</span>' : ''}
            </div>
            ${ptGroupMeta(members)}
        </td>
        <td><div>${esc(bud.top)}</div><div class="bb-subtext">${esc(bud.bottom)}</div></td>
        <td><div>${esc(rep.driverLabel || '—')}</div><div class="bb-subtext">${ptPlate(rep.vehicleLabel)}</div></td>
        <td class="bb-table-actions">${ptActionBtn(allPending, () => `openAssignModal(null,'group','${grpName}')`)}</td>
    </tr>
    ${subRows}`;
}

function ptCardSingle(b) {
    const tone = PT_TONE[b.status] || PT_TONE.pending;
    const sel  = ptChecked(b);
    return `
    <div class="bb-card p-3 mb-2 d-flex gap-3" onclick="ptRowClick(${b.id},'${b.status}')" style="cursor:pointer;${sel ? 'background:var(--bb-n50);outline:none' : ''}">
        <div class="bb-avatar flex-shrink-0" style="width:3rem;height:3rem;background:${tone.bg};color:${tone.fg}"><span class="material-symbols-rounded">directions_car</span></div>
        <div class="flex-grow-1" style="min-width:0">
            <div class="d-flex justify-content-between align-items-start gap-2">
                <span class="fw-semibold" style="color:var(--bb-str)">${esc(b.booker)}${ptGroupOrderBadge(b)}</span>
                ${ptCheckbox(b)}
            </div>
            <div class="bb-subtext">${esc(b.pickup || '—')} → ${esc(b.dest || '—')}</div>
            ${ptTripMeta(b)}
            <div class="d-flex justify-content-between align-items-end pt-3">
                <div class=" row g-1 align-items-center" style="font-size:.8125rem;">
                <div class="bb-subtext">${esc(ptBudgetInline(b))}</div>
                <span style="font-size:.8125rem">${esc(b.driverLabel || '—')} · ${ptPlate(b.vehicleLabel)}</span>
                </div>
                ${ptActionBtn(b.status === 'pending', kind => `openAssignModal(${b.id},'${kind}')`)}
            </div>
        </div>
    </div>`;
}

function ptCardGroup(grpName, members) {
    const allPending = members.every(b => b.status === 'pending');
    const colId = `ptcgrp-${grpName.replace(/[^a-z0-9]/gi,'')}`;
    const rep   = members[0];
    const sel   = ptGroupChecked(grpName);
    const isAddTarget = sel && groupSel.size >= 1;
    /* indent 4rem (avatar 3rem + gap-3 1rem) ให้เท่าจุดเริ่ม text บรรทัดชื่อด้านบน · เส้นคั่นเป็น
       เส้นประ (ไม่ใส่ให้รายการแรก) */
    const sub = members.map((b, i) => `
        <div class="pt-2 mt-2" style="padding-left:4rem;${i > 0 ? 'border-top:1px dashed var(--bb-n300)' : ''}">
            <div class="fw-semibold" style="font-size:.8125rem;color:var(--bb-str)">${esc(b.booker)}</div>
            <div class="bb-subtext">${esc(b.pickup || '—')} → ${esc(b.dest || '—')}</div>
            ${ptTripMeta(b)}
        </div>`).join('');
    /* คลิกที่การ์ด (ยกเว้น checkbox/ปุ่ม action/label "งานร่วม") = ติ๊กเลือกทั้งกลุ่ม (เหมือนแถวเดี่ยว)
       คลิกเฉพาะ label "งานร่วม" = โชว์/ซ่อนรายการที่รวมเข้ามา */
    return `
    <div class="bb-card p-3 mb-2" style="cursor:pointer;${sel ? 'background:var(--bb-n50);outline:none' : ''}" onclick="toggleGroupRowSel('${grpName}')">
        <div class="d-flex gap-3">
            <div class="bb-avatar flex-shrink-0" style="width:3rem;height:3rem;background:var(--bb-ok-bg);color:var(--bb-ok-tx)"><span class="material-symbols-rounded">call_merge</span></div>
            <div class="flex-grow-1" style="min-width:0">
                <div class="fw-semibold d-flex align-items-center justify-content-between gap-1" style="color:var(--bb-str)">
                    <span class="d-flex align-items-center gap-1" onclick="event.stopPropagation();ptToggleGroup('${colId}')">
                        งานร่วม <span class="bb-badge is-neutral">${members.length}</span>${isAddTarget ? ' <span class="bb-badge is-neutral">หลัก</span>' : ''}
                    </span>
                    ${ptGroupCheckbox(grpName)}
                </div>
                <div class="bb-subtext">${ptGroupMeta(members)}</div>
                <div class="d-flex justify-content-between align-items-end">
                    <div class="row">
                        <span class="bb-subtext pb-1" style="font-size:.8125rem">${esc(ptBudgetInline(rep))}</span>   
                        <span class="pt-1" style="font-size:.8125rem">${esc(rep.driverLabel || '—')} · ${ptPlate(rep.vehicleLabel)}</span>   
                    </div>
                    ${ptActionBtn(allPending, () => `openAssignModal(null,'group','${grpName}')`)}
                </div>
            </div>
        </div>
        <div id="${colId}" style="display:none">${sub}</div>
    </div>`;
}

function ptToggleGroup(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
}

/* desktop group sub-rows = sibling <tr> จริง (ไม่ใช่ wrapper element เดียวเหมือนมือถือ)
   toggle ผ่าน data-ptgrp แทน id */
function ptToggleGroupRows(colId) {
    document.querySelectorAll(`tr[data-ptgrp="${colId}"]`).forEach(tr => {
        tr.style.display = tr.style.display === 'none' ? '' : 'none';
    });
}

/* action bar: ปุ่มเริ่ม disabled ไม่มีตัวเลข → กด checkbox แล้วโชว์จำนวน+เปิดใช้งาน
   รวมงาน: รวมใหม่ต้อง ≥2 (groupSel ล้วน) หรือเพิ่มเข้ากลุ่มเดิม (groupRowSel=1 กลุ่ม +
   groupSel≥1) · แจ้ง Telegram: ≥1 นับรวมสมาชิกทุกคนของกลุ่มที่ติ๊ก (groupRowSel) ด้วย */
function ptUpdateActionButtons() {
    const m = document.getElementById('ptBtnMerge');
    if (m) {
        const canAddToGroup = groupRowSel.size === 1 && groupSel.size >= 1;
        const canFreshMerge = groupRowSel.size === 0 && groupSel.size >= 2;
        m.disabled = !(canAddToGroup || canFreshMerge);
        const n = groupSel.size;
        m.innerHTML = `<span class="material-symbols-rounded">merge</span>รวมงาน${n ? ` (${n})` : ''}`;
    }
    const t = document.getElementById('ptBtnNotify');
    if (t) {
        const groupCount = [...groupRowSel].reduce((s, g) => s + bookings.filter(b => b.tripGroup === g).length, 0);
        const n = notifySel.size + groupCount;
        t.disabled = n < 1;
        t.textContent = `แจ้ง Telegram${n ? ` (${n})` : ''}`;
    }
}

/* select-all chip หน้าปุ่ม รวมงาน/แจ้ง Telegram — เลือก/เลิกเลือกทุกแถวเดี่ยวที่กดได้ (pending→groupSel, approved→notifySel)
   รวมแถว "งานร่วม" ด้วย (groupRowSel — ติ๊กแล้วเข้าเงื่อนไขแจ้ง Telegram ทั้งกลุ่ม) */
function ptSelectAll(btn) {
    const items    = ptItems();
    const singles  = items.filter(it => it.type === 'single').map(it => it.booking);
    const grpNames = items.filter(it => it.type === 'group').map(it => it.name);
    const pend = singles.filter(b => b.status === 'pending').map(b => b.id);
    const appr = singles.filter(b => b.status === 'approved').map(b => b.id);
    const eligible = pend.length + appr.length + grpNames.length;
    const allOn = eligible > 0 && pend.every(id => groupSel.has(id)) && appr.every(id => notifySel.has(id))
                  && grpNames.every(n => groupRowSel.has(n));
    if (allOn) {
        pend.forEach(id => groupSel.delete(id));
        appr.forEach(id => notifySel.delete(id));
        grpNames.forEach(n => groupRowSel.delete(n));
    } else {
        pend.forEach(id => groupSel.add(id));
        appr.forEach(id => notifySel.add(id));
        grpNames.forEach(n => groupRowSel.add(n));
    }
    btn.classList.toggle('is-on', !allOn);
    ptUpdateActionButtons();
    renderBefore();
}

/* งานที่ติ๊กอันแรก = หลัก (จะเป็นทริปที่งานอื่นรวมเข้า) อันต่อมา = รอง
   groupSel เป็น Set → ลำดับ iterate = ลำดับ insert เสมอ ใช้แทน order field ตรงๆ ได้
   ยกเว้นมีกลุ่ม "งานร่วม" เดิมถูกติ๊กด้วย (groupRowSel) — กลุ่มเดิมเป็นหลักเสมอ (มีรถ/คนขับ
   อยู่แล้ว) งาน pending ที่เพิ่งติ๊กเป็น "รอง" ทั้งหมด ไม่มีใครใน groupSel ได้ "หลัก" */
function ptGroupOrderBadge(b) {
    if (!groupSel.has(b.id)) return '';
    const isPrimary = groupRowSel.size === 0 && [...groupSel][0] === b.id;
    return `<span class="bb-badge is-neutral" style="margin-left:.375rem">${isPrimary ? 'หลัก' : 'รอง'}</span>`;
}

/* checkbox ของแถว "งานร่วม" ทั้งกลุ่ม (ต่างจาก ptCheckbox ต่อคน) — ใช้ทั้งเลือกแจ้ง Telegram
   ทั้งกลุ่มพร้อมกัน และเป็นเป้าหมาย "เพิ่มงานเข้ากลุ่ม" เมื่อผสมกับ groupSel (pending ที่ติ๊กไว้) */
function ptGroupChecked(grpName) { return groupRowSel.has(grpName); }
function ptGroupCheckbox(grpName) {
    const checked = ptGroupChecked(grpName);
    return `<span class="bb-check-box${checked ? ' is-on' : ''}" role="checkbox" aria-checked="${checked}" tabindex="0"
        onclick="event.stopPropagation();toggleGroupRowSel('${grpName}')"></span>`;
}
function toggleGroupRowSel(grpName) {
    if (groupRowSel.has(grpName)) groupRowSel.delete(grpName); else groupRowSel.add(grpName);
    ptUpdateActionButtons();
    renderBefore();
}

let bsPtNotifyModal = null;
function ptNotifyTargetIds() {
    const groupIds = [...groupRowSel].flatMap(g => bookings.filter(b => b.tripGroup === g).map(b => b.id));
    return [...new Set([...notifySel, ...groupIds])];
}
function ptOpenNotifyConfirm() {
    const ids = ptNotifyTargetIds();
    if (ids.length < 1) return;
    document.getElementById('ptNotifyConfirmCount').textContent = ids.length;
    bsPtNotifyModal = bsPtNotifyModal || new bootstrap.Modal(document.getElementById('ptNotifyConfirmModal'));
    bsPtNotifyModal.show();
}
function ptSubmitNotify() {
    if (bsPtNotifyModal) bsPtNotifyModal.hide();
    confirmNotify();
}

/* filter+group logic คัดลอกจาก renderBefore() — ต้องตรงกันเป๊ะ ไม่งั้น table/card ใหม่จะไม่ sync กับ card list เดิม */
function ptItems() {
    const ds     = toDateStr(selDate);
    const allDay = bookings.filter(b => b.startIso.startsWith(ds));
    let filtered = [...allDay];
    if (curFilter !== 'all') {
        filtered = filtered.filter(b => curFilter === 'waiting_approver'
            ? (b.status === 'waiting_approver' || b.status === 'forwarded')
            : b.status === curFilter);
    }
    const rendered = new Set();
    const items = [];
    filtered.forEach(b => {
        if (b.tripGroup && !rendered.has(b.tripGroup)) {
            const members = allDay.filter(x => x.tripGroup === b.tripGroup);
            members.forEach(x => rendered.add(x.tripGroup));
            items.push({ type:'group', name:b.tripGroup, members });
        } else if (!b.tripGroup) {
            items.push({ type:'single', booking:b });
        }
    });
    return items;
}

function renderPreviewTable() {
    const tbody = document.getElementById('adminPreviewTbody');
    if (!tbody) return;
    const items = ptItems();
    tbody.innerHTML = items.length
        ? items.map(it => it.type === 'group' ? ptGroupRow(it.name, it.members) : ptSingleRow(it.booking)).join('')
        : `<tr><td colspan="6" class="text-center py-4" style="color:var(--bb-mut)">ไม่มีรายการจองรถ</td></tr>`;
}

function renderPreviewCards() {
    const wrap = document.getElementById('adminPreviewCards');
    if (!wrap) return;
    const items = ptItems();
    wrap.innerHTML = items.length
        ? items.map(it => it.type === 'group' ? ptCardGroup(it.name, it.members) : ptCardSingle(it.booking)).join('')
        : `<div class="bb-empty"><div class="bb-empty-icon"><span class="material-symbols-rounded">directions_car</span></div><div class="bb-empty-title">ไม่มีรายการจองรถ</div></div>`;
}

function bindTab2Tabs() {
    document.querySelectorAll('#adminTab2Wrap .tab2-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            curFilter = btn.dataset.tab || 'all';
            document.querySelectorAll('#adminTab2Wrap .tab2-tab').forEach(c => c.classList.toggle('active', c === btn));
            renderBefore();
        });
    });
}

/* ── Group select (ไม่มี "โหมด" แล้ว — checkbox บนตารางเลือกได้ตลอด 2026-07-28) ── */
function toggleGroupSel(id) {
    if (groupSel.has(id)) groupSel.delete(id); else groupSel.add(id);
    ptUpdateActionButtons();
    renderBefore();
}

function confirmMerge() {
    if (groupRowSel.size === 1 && groupSel.size >= 1) {
        const grpName = [...groupRowSel][0];
        pendingAddIds   = [...groupSel];
        activeBookingId = null;
        openAssignModal(null, 'group_add', grpName);
        return;
    }
    if (groupSel.size < 2 || groupRowSel.size > 0) return;
    activeGroupName  = null;
    activeBookingId  = null;
    pendingAddIds    = [];
    openAssignModal(null, 'group_new');
}

/* ── Notify select ────────────────────────────── */
function toggleNotifySel(id) {
    if (notifySel.has(id)) notifySel.delete(id); else notifySel.add(id);
    ptUpdateActionButtons();
    renderBefore();
}

function clearNotifySel() {
    notifySel.clear();
    ptUpdateActionButtons();
    renderBefore();
}

async function confirmNotify() {
    const ids = ptNotifyTargetIds();
    if (ids.length < 1) return;
    let ok = 0, fail = 0;
    for (const id of ids) {
        try {
            const res = await fetch(`/vehicle/admin/booking/${id}/notify`, { method: 'POST' });
            if (res.ok) ok++; else fail++;
        } catch { fail++; }
    }
    groupRowSel.clear();
    clearNotifySel();
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

    const ptList = document.getElementById('ptVehicleList');
    if (ptList) ptList.innerHTML = vehicles.slice(0, 5).map(v => ptVehicleRow(v, allDay)).join('');
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


/* ══════════════════════════════════════════════════
   PREVIEW VEHICLE LIST (col-lg-4 "การใช้รถ") — ผูก vehicles จริงแล้ว (2026-07-28)
   2 บรรทัดต่อสถานะ (ยกเว้นกำลังซ่อมที่เก็บบรรทัดอาการไว้ — ข้อมูลจำเป็น) ไม่ใช้ bb-badge แล้ว
   ใช้ text fw-bold สีตาม tone แทน · แสดงแค่ 5 คันแรกตามที่ขอไว้
══════════════════════════════════════════════════ */
function ptVehicleRow(v, approvedToday) {
    if (v.dbStatus === 'maintenance') {
        const note = v.repairNote ? esc(v.repairNote) : 'ไม่ระบุอาการ';
        return `
        <div class="d-flex gap-3 bb-buy-item">
            <div class="bb-buy-thumb is-wr flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center"><span class="material-symbols-rounded">build</span></div>
            <div class="flex-grow-1 min-w-0">
                <div class="fw-bold">${esc(v.plate)}</div>
                <div class="fw-bold small" style="color:var(--bb-wr-tx)">กำลังซ่อม</div>
                <div class="text-muted small mt-1">ดำเนินการ : ${note}</div>
            </div>
        </div>`;
    }

    const jobs = groupVehicleJobs(v, approvedToday);
    if (!jobs.length) {
        return `
        <div class="d-flex gap-3 bb-buy-item">
            <div class="bb-buy-thumb flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center"><span class="material-symbols-rounded">directions_car</span></div>
            <div class="flex-grow-1 min-w-0">
                <div class="fw-bold">${esc(v.plate)}</div>
                <div class="fw-bold small" style="color:var(--bb-ok-tx)">ว่าง</div>
            </div>
        </div>`;
    }

    const isMulti  = jobs.length > 1;
    const plateRow = isMulti ? `<div class="fw-bold mb-2">${esc(v.plate)}</div>` : '';
    const body     = jobs.map((g, i) => ptVehicleJobLine(v, g, i, jobs.length, isMulti)).join('');

    return `
    <div class="d-flex gap-3 bb-buy-item">
        <div class="bb-buy-thumb is-ok flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center"><span class="material-symbols-rounded">directions_car</span></div>
        <div class="flex-grow-1 min-w-0">
            ${plateRow}${body}
        </div>
    </div>`;
}

function ptVehicleJobLine(v, group, idx, total, isMulti) {
    const b  = group[0];
    const bm = group.find(x => x.odoStart !== null && x.odoEnd !== null) || b;
    const started = bm.odoStart !== null;
    const hasOdo  = bm.odoStart !== null && bm.odoEnd !== null;
    const dist    = hasOdo ? (bm.odoEnd - bm.odoStart) : 0;

    const fuelRate = Number(v.fuelRate) || 0;
    const override = Number(bm.fuelCost) || 0;
    const autoCost = (hasOdo && fuelRate > 0) ? Math.round((dist / fuelRate) * fuelPrice * 100) / 100 : 0;
    const cost     = hasOdo ? (override > 0 ? override : autoCost) : 0;
    const otA      = Number(bm.otAmount) || 0;
    const isCharge = b.expType === 'personal';

    const headerLeft = isMulti ? `<div class="text-muted small">งานที่ ${idx + 1}</div>` : `<div class="fw-bold">${esc(v.plate)}</div>`;
    const wrapCls = isMulti && idx < total - 1 ? 'mb-3' : '';

    let line2;
    if (hasOdo)       line2 = `<div class="fw-bold small" style="color:var(--bb-info-tx)">${fmtNum(cost)} บาท${otA > 0 ? ` · OT ${fmtNum(otA)} บาท` : ''}</div>`;
    else if (started) line2 = `<div class="fw-bold small" style="color:var(--bb-info-tx)">ออกเดินทางแล้ว</div>`;
    else               line2 = `<div class="fw-bold small" style="color:var(--bb-wr-tx)">อนุมัติแล้ว</div>`;

    let actionHtml = '';
    if (hasOdo && isCharge) {
        actionHtml = bm.personalStatus === 1
            ? `<span class="text-muted small flex-shrink-0">จ่ายแล้ว</span>`
            : `<button type="button" class="bb-btn is-sec is-sm flex-shrink-0" onclick="event.stopPropagation();markPaid(${bm.mileageId}, ${bm.id})" title="ยืนยันการชำระเงินจากผู้จอง"><span class="material-symbols-rounded">account_balance_wallet</span>เรียกเก็บ</button>`;
    }

    return `
    <div class="${wrapCls}">
        <div class="d-flex justify-content-between align-items-center gap-2">
            ${headerLeft}
            ${actionHtml}
        </div>
        ${line2}
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

    let b = bookingId ? bookings.find(x=>x.id===bookingId) : null;
    /* ปุ่มย้อนสถานะ (ghost) — โชว์ 2 เคส (2026-08-01): งานเดี่ยวที่อนุมัติ/ส่ง approver แล้ว
       (ไม่ได้อยู่กลุ่มทริป) หรือ งานร่วมที่อนุมัติ/ส่ง approver แล้วทั้งกลุ่ม (action='group' —
       ตั้งจาก ptActionBtn เฉพาะกลุ่มที่ไม่ใช่ all-pending) — pending/rejected ไม่โชว์ */
    const REVERTIBLE = new Set(['approved', 'waiting_approver']);
    const canRevertSingle = !!(b && action === 'edit' && REVERTIBLE.has(b.status) && !b.tripGroup);
    const canRevertGroup  = !!(groupName && action === 'group'
        && bookings.some(x => x.tripGroup === groupName && REVERTIBLE.has(x.status)));
    const canRevert = canRevertSingle || canRevertGroup;

    /* เดิม header เคยโชว์ "Reject Booking"/"Merge N Bookings" ฯลฯ ให้แยกโหมดได้ ตอนนี้ header
       เปลี่ยนไปโชว์เลขคำขอแทน (ตาม widget) เลยย้ายการบอกโหมดมาไว้ที่ปุ่มยืนยันแทน (CONFIRM_LABEL ด้านบนไฟล์) */
    document.getElementById('assignConfirmBtn').textContent = CONFIRM_LABEL[action] || 'อนุมัติและจัดรถ';

    let refLabel = '—', name = '—', timeStr = '—', badgeCls = '', badgeLabel = '';
    let route = '—';
    if (b) {
        refLabel   = `คำขอจองรถ #${b.id}`;
        name       = b.booker || '—';
        timeStr    = `${b.purpose || '—'} · ${b.pax || 0} คน · ${b.start}–${b.end}`;
        const sb   = STATUS_BADGE[b.status] || STATUS_BADGE.pending;
        badgeCls   = sb.cls; badgeLabel = sb.label;
        route      = `${b.pickup || '—'} → ${b.dest || '—'}`;
    }
    if (groupName && action === 'group_add') {
        /* เพิ่มงานเข้ากลุ่มเดิม — งานเดิมเป็นหลักเสมอ ใช้ b = สมาชิกตัวแทนกลุ่ม prefill
           รถ/คนขับ/งบด้านล่างทั้งหมด (แก้ในโมดัลได้ก่อนยืนยัน) */
        const members = bookings.filter(x=>x.tripGroup===groupName);
        const addBookings = pendingAddIds.map(id => bookings.find(x=>x.id===id)).filter(Boolean);
        refLabel   = 'เพิ่มงานเข้ากลุ่ม';
        name       = `${members.length} เดิม + ${addBookings.length} ใหม่`;
        timeStr    = `${addBookings.reduce((s,x)=>s+(x.pax||0),0)} คนที่เพิ่ม`;
        badgeCls = ''; badgeLabel = '';
        route      = '—';
        b = members[0];
    } else if (groupName) {
        const members = bookings.filter(x=>x.tripGroup===groupName);
        refLabel   = 'รวมงาน';
        name       = `${members.length} รายการ`;
        timeStr    = `${members.reduce((s,x)=>s+x.pax,0)} คน`;
        badgeCls = ''; badgeLabel = '';
        route      = '—';
    }

    const revertBtn = document.getElementById('assignRevertBtn');
    if (revertBtn) revertBtn.style.display = canRevert ? '' : 'none';

    document.getElementById('assignModalTitle').textContent = refLabel;
    document.getElementById('assignModalSub').textContent   = name;
    document.getElementById('assignModalTime').textContent  = timeStr;
    const badgeEl = document.getElementById('assignModalBadge');
    badgeEl.className   = 'bb-badge' + (badgeCls ? ' ' + badgeCls : '');
    badgeEl.textContent = badgeLabel;
    badgeEl.style.display = badgeLabel ? 'inline-flex' : 'none';
    document.getElementById('assignModalRoute').textContent = route;
    /* avatar สีตามสถานะ ใช้ cls เดียวกับ badge (is-wr/is-info/is-ok/is-dg) — ไม่มี status เดี่ยว (กรณีกลุ่ม) = grey เดิม */
    document.getElementById('assignModalAvatar').className =
        'bb-avatar flex-shrink-0' + (badgeCls ? ' ' + badgeCls : '');

    const vSel = document.getElementById('modalVehSel');
    vSel.innerHTML = '<option value="">— เลือกรถ —</option>' +
        vehicles.filter(v=>v.dbStatus==='active').map(v =>
            `<option value="${v.id}" ${b&&b.vehicleId===v.id?'selected':''}>${v.plate} · ${v.brand} ${v.model}</option>`
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
    document.querySelectorAll('#modalExpTabs .bb-exp-radio').forEach(r => {
        r.checked = r.value === modalExpType;
    });
    updateExpSubDropdown(b);

    document.getElementById('assignConfirmBtn').disabled = true;
    checkAssignReady();

    bsAssignModal = bsAssignModal || new bootstrap.Modal(document.getElementById('assignModal'));
    bsAssignModal.show();
}

function setModalExpType(type) {
    modalExpType = type;
    updateExpSubDropdown(null);
    updateModalBudget();
    checkAssignReady();
}

/* ส่วนกลาง/ส่วนกอง แยก dropdown คนละตัว (คนละ option list) · ส่วนตัวไม่มี dropdown เลย */
function ptExpSubEl() {
    if (modalExpType === 'central')    return document.getElementById('modalExpSubCentral');
    if (modalExpType === 'department') return document.getElementById('modalExpSubDept');
    return null;
}

function updateExpSubDropdown(b) {
    const central     = document.getElementById('modalExpSubCentral');
    const dept        = document.getElementById('modalExpSubDept');
    const approverEl  = document.getElementById('modalApproverInfo');
    const approverName= document.getElementById('modalApproverName');

    central.style.display = modalExpType === 'central'    ? 'block' : 'none';
    dept.style.display    = modalExpType === 'department' ? 'block' : 'none';

    /* ผู้อนุมัติโชว์เฉพาะ department เท่านั้น — ซ่อนเป็นค่าเริ่มต้นก่อนเสมอ กันโชว์ค้างข้ามประเภท
       (ส่วนกลาง/ส่วนตัว ต้องไม่เห็น "ผู้อนุมัติ:" เลย) แล้วค่อยเปิดเฉพาะ branch department ด้านล่าง */
    approverEl.style.display = 'none';

    if (modalExpType === 'personal') {
        document.getElementById('modalBudgetBar').style.display = 'none';
        return;
    }

    const sub     = ptExpSubEl();
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
    }

    updateModalBudget();
}

function updateModalBudget() {
    const sub  = ptExpSubEl();
    const bar  = document.getElementById('modalBudgetBar');
    const warn = document.getElementById('modalBudgetWarn');
    const fill = document.getElementById('modalBudgetFill');
    if (!sub || !sub.value || modalExpType==='personal') { bar.style.display='none'; return; }
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
    const expSubEl = ptExpSubEl();
    const expSub = expSubEl ? expSubEl.value : '';

    const newVeh     = vehId ? vehicles.find(v => v.id === parseInt(vehId)) : null;
    const newVehLabel = newVeh ? `${newVeh.brand} ${newVeh.model} · ${newVeh.plate}` : '';
    const drvIdNum   = drvId ? parseInt(drvId) : null;

    try {
        if (modalAction === 'group_add') {
            const addIds = pendingAddIds;
            const first  = bookings.find(x=>x.id===addIds[0]);
            const fd = new FormData();
            addIds.forEach(id => fd.append('booking_ids', id));
            if (vehId) fd.append('assigned_vehicle_id', vehId);
            if (drvId) fd.append('driver_id', drvId);
            fd.append('trip_group', activeGroupName);
            if (modalExpType) fd.append('expense_type', modalExpType);
            if (expSub && modalExpType==='central')    fd.append('central_category', expSub);
            if (expSub && modalExpType==='department') fd.append('trip_department', expSub);
            const res2 = await fetch(first.mergeUrl, { method:'POST', body:fd });
            if (!res2.ok) { const d=await res2.json().catch(()=>({})); throw new Error(d.msg||'server error'); }
            addIds.forEach(id => patchBooking(id, {
                status: modalExpType === 'department' ? 'waiting_approver' : 'approved',
                tripGroup: activeGroupName,
                ...(newVeh && { vehicleId: parseInt(vehId), vehicleLabel: newVehLabel }),
                ...(drvIdNum !== null && { driverId: drvIdNum }),
                expType: modalExpType,
            }));
            showToast(`✓ เพิ่ม ${addIds.length} รายการเข้ากลุ่มแล้ว`);

        } else if (activeGroupName) {
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
        groupSel.clear();
        groupRowSel.clear();
        pendingAddIds = [];
        ptUpdateActionButtons();
        isSaving = false;
        renderAll();
    } catch(e) {
        showToast(e.message && e.message !== 'server error' ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        isSaving = false;
        btn.disabled = false;
        btn.textContent = CONFIRM_LABEL[modalAction] || 'อนุมัติและจัดรถ';
    }
}

/* ── Revert ───────────────────────────────────── */
/* ปุ่ม ghost ใน assignModal (โหมด edit ของ booking อนุมัติแล้ว) — ปิด assignModal แล้วต่อด้วย
   revertModal (confirm dialog เดิม) ไม่ยิง revert ตรงจากในนี้เลย กันกดพลาด */
function triggerRevertFromModal() {
    if (activeGroupName && modalAction === 'group') {
        const grp = activeGroupName;
        bsAssignModal.hide();
        openRevertModal(null, grp);
        return;
    }
    if (!activeBookingId) return;
    const id = activeBookingId;
    bsAssignModal.hide();
    openRevertModal(id);
}

function openRevertModal(bookingId, groupName) {
    revertBookingId = bookingId || null;
    revertGroupName = groupName || null;
    const text = groupName
        ? `ต้องการย้อนสถานะงานร่วม (${bookings.filter(x=>x.tripGroup===groupName).length} รายการ) กลับเป็นรออนุมัติทั้งหมดใช่ไหม?`
        : `ต้องการย้อนสถานะ "${bookings.find(x=>x.id===bookingId)?.dest || ''}" กลับเป็นรออนุมัติ?`;
    document.getElementById('revertModalText').textContent = text;
    bsRevertModal = bsRevertModal || new bootstrap.Modal(document.getElementById('revertModal'));
    bsRevertModal.show();
}

async function submitRevert() {
    /* งานร่วม (ทั้งกลุ่ม) — ใช้ endpoint ungroup เดิม (all-or-nothing) แล้ว patch ทุกสมาชิก
       รวม field งบด้วย (backend เคลียร์ expense_type/central_category/trip_department ให้แล้ว) */
    if (revertGroupName) {
        const members = bookings.filter(x => x.tripGroup === revertGroupName);
        if (!members.length) return;
        try {
            const fd = new FormData(); fd.append('action', 'ungroup');
            const res  = await fetch(members[0].assignUrl, { method:'POST', body:fd });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                showToast(data.msg || 'ย้อนสถานะไม่ได้');
                bsRevertModal.hide();
                return;
            }
            members.forEach(b => patchBooking(b.id, {
                status:'pending', vehicleId:null, vehicleLabel:null, driverId:null,
                tripGroup:null, expType:null, expSub:null, deptName:'',
            }));
            showToast('✓ ย้อนสถานะแล้ว');
            bsRevertModal.hide();
            renderAll();
        } catch(e) { showToast('เกิดข้อผิดพลาด'); }
        return;
    }

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
        patchBooking(revertBookingId, {
            status:'pending', vehicleId:null, vehicleLabel:null, driverId:null,
            expType:null, expSub:null, deptName:'',
        });
        showToast('✓ ย้อนสถานะแล้ว');
        bsRevertModal.hide();
        renderAll();
    } catch(e) { showToast('เกิดข้อผิดพลาด'); }
}

/* ── Ungroup ──────────────────────────────────── */
async function ungroupAll(grpName) {
    // res.ok/data.ok check (correction, 2026-07-19): REQ-1 ทำให้ ungroup มี 400-guard จริง
    // (block ถ้ามีใครในกลุ่ม start แล้ว) — เดิม patch ทันทีไม่เช็ก response เลย ทำให้โชว์
    // "สำเร็จ" ปลอมตอน backend block จริง (ผิด pattern CLAUDE.md § Flask Response)
    if (!confirm(`แยกกลุ่ม ${grpName} คืนทุกรายการเป็น "รออนุมัติ" ใช่ไหม?`)) return;
    const members = bookings.filter(b=>b.tripGroup===grpName);
    const fd = new FormData(); fd.append('action','ungroup');
    const res  = await fetch(members[0].assignUrl, { method:'POST', body:fd });
    const data = await res.json();
    if (!res.ok || !data.ok) {
        showToast(data.msg || 'แยกกลุ่มไม่สำเร็จ');
        return;
    }
    members.forEach(b => patchBooking(b.id, { tripGroup:null, status:'pending', vehicleId:null, vehicleLabel:null, driverId:null }));
    showToast('✓ แยกกลุ่มแล้ว');
    renderAll();
}

async function splitBooking(bookingId, grpName) {
    // all-or-nothing (REQ-1, Phase 3.5): ถอด 1 รายการ = ทั้งกลุ่มกลับ pending หมด — ไม่มี
    // partial split อีกแล้ว ข้อความ/patch ต้องครอบทุกสมาชิก ไม่ใช่แค่ bookingId เดียว
    // res.ok/data.ok check (correction, 2026-07-19): ดูเหตุผลเดียวกับ ungroupAll ด้านบน
    if (!confirm(`ถอด #${bookingId} ออกจากกลุ่ม ${grpName} — ทุกรายการในกลุ่มนี้จะกลับเป็น "รออนุมัติ" ทั้งหมด ใช่ไหม?`)) return;
    const b       = bookings.find(x=>x.id===bookingId);
    const members = bookings.filter(x=>x.tripGroup===grpName);
    const fd = new FormData(); fd.append('action','ungroup');
    const res  = await fetch(b.assignUrl, { method:'POST', body:fd });
    const data = await res.json();
    if (!res.ok || !data.ok) {
        showToast(data.msg || 'แยกกลุ่มไม่สำเร็จ');
        return;
    }
    members.forEach(m => patchBooking(m.id, { tripGroup:null, status:'pending', vehicleId:null, vehicleLabel:null, driverId:null }));
    showToast('✓ แยกกลุ่มแล้ว');
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
            <div class="bb-empty-icon"><span class="material-symbols-rounded">no_transfer</span></div>
            <div class="bb-empty-title">ไม่มีรถที่สามารถ Swap ได้</div>
        </div>`;
    } else {
        listEl.innerHTML = swappable.map(v => {
            const isCurrent = v.id === b?.vehicleId;
            const statusLabel = isCurrent ? '<span class="bb-status is-info"><span class="material-symbols-rounded">info</span>ปัจจุบัน</span>'
                              : usedIds.has(v.id) ? '<span class="bb-status is-neutral"><span class="material-symbols-rounded">circle</span>จองแล้ว</span>'
                              : '<span class="bb-status is-ok"><span class="material-symbols-rounded">check_circle</span>ว่าง</span>';
            const style = isCurrent ? 'border-color:var(--bb-accent-i);background:var(--bb-accent-bg);' : 'border-color:var(--bb-n200);';
            return `<div data-swap-item class="d-flex align-items-center gap-2 p-2 mb-2" style="border:1px solid;${style}border-radius:var(--bb-r-md);cursor:pointer" onclick="selectSwapVehicle(${v.id},this)">
                <span class="bb-avatar flex-shrink-0" style="width:2rem;height:2rem;background:var(--bb-n100)"><span class="material-symbols-rounded" style="color:var(--bb-mut)">directions_car</span></span>
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

/* สถานะ ∈ {waiting_approver, approved} เท่านั้น = admin จัดรถ+คนขับแล้วจริง — ก่อนหน้านั้นยังไม่มีข้อมูลให้โชว์
   (ชุดเดียวกับ VEHICLE_ASSIGNED_STATUSES ใน vehicle.js — ไฟล์แยกกันคนละหน้า ไม่แชร์ module) */
const VEHICLE_ASSIGNED_STATUSES = ['waiting_approver', 'approved'];

function _adminSortByTime(arr) {
    return [...arr].sort((a, b) => (a.start || '').localeCompare(b.start || ''));
}

function openAdminBookingDetail(id) {
    const b = bookings.find(x => x.id === id);
    if (!b) return;

    const groupMembers = b.tripGroup
        ? _adminSortByTime(bookings.filter(x => x.tripGroup === b.tripGroup && x.status !== 'rejected'))
        : [];
    const isGroup = groupMembers.length > 1;
    const members = isGroup ? groupMembers : [b];
    const rep     = isGroup ? (members.find(x => x.vehicleLabel) || b) : b;

    const tone  = PT_TONE[b.status]          || PT_TONE.pending;
    const sb    = STATUS_BADGE[b.status]     || STATUS_BADGE.pending;
    const si    = STATUS_ICON[b.status]      || STATUS_ICON.pending;
    const label = isGroup ? 'ใช้รถร่วมกัน' : sb.label;
    // const icon  = isGroup ? 'group' : si.icon;

    const [y, m, d] = b.startIso.split('T')[0].split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    document.getElementById('detailDateLine').textContent =
        `วัน${TH_DAYS_F[dow]} ที่ ${d} ${TH_MON_F[m]}`;

    const badge = document.getElementById('detailStatusBadge');
    badge.className   = `py-1 px-2 me-2 bb-badge ${isGroup ? 'is-ok' : sb.cls}`;
    badge.textContent = label;
    document.getElementById('detailTimeText').textContent = `${b.start}–${b.end} ${ptDuration(b)}`;
    const avatar = document.getElementById('detailStatusAvatar');
    avatar.style.background = tone.bg;
    avatar.style.color      = tone.fg;
    // document.getElementById('detailStatusIcon').textContent = icon;

    // รถ + คนขับ — โชว์เฉพาะ status ที่ admin จัดรถ/คนขับแล้ว
    const vdSection = document.getElementById('detailVehicleDriverSection');
    if (VEHICLE_ASSIGNED_STATUSES.includes(rep.status)) {
        vdSection.classList.remove('d-none');
        document.getElementById('detailPlate').textContent = ptPlate(rep.vehicleLabel);
        document.getElementById('detailVehicleModel').textContent = rep.vehicleLabel ? rep.vehicleLabel.split(' · ')[0] : '';

        const driverLine = document.getElementById('detailDriverLine');
        if (rep.needDriver) {
            driverLine.classList.remove('d-none');
            document.getElementById('detailDriverName').textContent  = rep.driverLabel || 'รอ Admin มอบหมาย';
            document.getElementById('detailDriverPhone').textContent = rep.driverPhone || '';
            const callBtn = document.getElementById('detailDriverCallBtn');
            callBtn.onclick  = rep.driverPhone ? () => { window.location.href = `tel:${rep.driverPhone}`; } : null;
            callBtn.disabled = !rep.driverPhone;
        } else {
            driverLine.classList.add('d-none');
        }
    } else {
        vdSection.classList.add('d-none');
    }

    // ผู้โดยสาร — การ์ดเส้นประต่อคน (pickup → dest, purpose | pax | เวลา, note) — เหมือนฝั่ง user
    // คนแรกไม่มีเส้นประบน — hr.bk-divider ของ header ทำหน้าที่คั่นไปแล้ว (กันเส้นประซ้อนกัน 2 เส้น)
    document.getElementById('detailMembersList').innerHTML = members.map((mm, idx) => `
        <div class="py-3 mt-2 ms-1 ps-2"${idx > 0 ? ' style="border-top:1px dashed var(--bb-n300);"' : ''}>
            <span class="fw-semibold" style="color:var(--bb-str)">${esc(mm.booker || '–')}</span>
            <div class="bb-subtext">${mm.pickup ? `${esc(mm.pickup)} → ` : ''}${esc(mm.dest || '–')}</div>
            <div class="bb-subtext d-flex align-items-center gap-1 pt-1">
                ${esc(mm.purpose || '–')}
                <span>|</span>
                <span class="material-symbols-rounded">directions_run</span>${mm.pax || '–'} รูป/คน
                <span>|</span>
                <span class="material-symbols-rounded">schedule</span>${mm.start}–${mm.end} ${ptDuration(mm)}
            </div>
            ${mm.note ? `<div class="bb-subtext pt-2">หมายเหตุ: ${esc(mm.note)}</div>` : ''}
        </div>`
    ).join('');

    const canEdit = !['in_progress','completed','cancelled'].includes(b.status);
    const actDiv  = document.getElementById('detailActions');
    // ไม่มีปุ่มแก้ไข = ซ่อนแถวปุ่มไปเลย ไม่โชว์ปุ่ม "ปิด" เดี่ยวๆ (2026-08-05: ปิดผ่าน backdrop/Escape แทน)
    actDiv.innerHTML = canEdit
        ? `<button class="btn btn-sm btn-outline-primary" onclick="openAdminEdit(${b.id})">แก้ไข</button>`
        : '';
    actDiv.classList.toggle('d-none', !actDiv.innerHTML);

    document.getElementById('detailEditSection').classList.add('d-none');

    adminDetailModal = adminDetailModal || new bootstrap.Modal(document.getElementById('eventDetailModal'));
    adminDetailModal.show();
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
    document.getElementById('editNote').value    = b.note    || '';
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
    fd.append('note',             document.getElementById('editNote').value);
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
            note:     document.getElementById('editNote').value,
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
    renderBefore();
    renderDuring();
    initIcons();
}

/* ── Expose to window for legacy onclick handlers ── */
Object.assign(window, {
    confirmMerge, confirmNotify,
    toggleGroupSel, toggleNotifySel, toggleGroupRowSel, ptToggleGroup, ptToggleGroupRows,
    ptOpenNotifyConfirm, ptSubmitNotify, ptRowClick, ptSelectAll,
    openAssignModal, openRevertModal, triggerRevertFromModal, openAdminBookingDetail,
    openSwapModal, openRepairModal,
    splitBooking, ungroupAll, fixDone,
    setModalExpType, updateExpSubDropdown, checkAssignReady,
    submitAssign, submitRevert, submitSwap, submitRepair,
    selectSwapVehicle, markPaid, notifyDept,
    openAdminEdit, cancelAdminEdit, saveAdminEdit,
});

bindDateControls();
bindTab2Tabs();
renderAll();
