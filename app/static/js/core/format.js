// core/format.js — Thai date / number formatters
//
// Thai dates use Buddhist Era (year + 543). Use these helpers
// instead of inlining formatters in feature modules.

const TH_MONTHS_ABBR = [
    'ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
    'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'
];
const TH_MONTHS_FULL = [
    'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];

function toDate(d) {
    return d instanceof Date ? d : new Date(d);
}

export function thb(n) {
    return '฿' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function km(n) {
    return Number(n).toLocaleString('en-US') + ' km';
}

export function number(n) {
    return Number(n).toLocaleString('en-US');
}

export function thaiDate(d, { abbr = true } = {}) {
    const date = toDate(d);
    const day = String(date.getDate()).padStart(2, '0');
    const month = (abbr ? TH_MONTHS_ABBR : TH_MONTHS_FULL)[date.getMonth()];
    const year = date.getFullYear() + 543;
    return `${day} ${month} ${year}`;
}

export function thaiTime(d) {
    const date = toDate(d);
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}
