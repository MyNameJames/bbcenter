# Admin Approval — Mobile-First Redesign

> สถานะ: 🔄 In Progress  
> วันที่: 2026-04-11  
> ไฟล์หลัก: `docs/design/admin-approval-v2.html` (mockup), `app/templates/vehicle/admin/vehicle_admin.html` (production)

---

## บริบท (Context)

หน้า `/vehicle/admin` เป็นหน้าที่ admin ใช้อนุมัติการจองรถทุกวัน ปัญหาของหน้าเดิม:
- ออกแบบมาเพื่อ Desktop เป็นหลัก แต่ admin ส่วนใหญ่ใช้งานผ่านมือถือ
- การอนุมัติต้องเปิด Modal ซ้อนกันหลายชั้น
- ไม่มี quick action — ต้องเลื่อน scroll หาปุ่มทุกครั้ง
- UX การรวมทริปไม่ชัดเจน (drag & drop ไม่เหมาะกับมือถือ)

---

## แนวคิดในการออกแบบ (Design Concept)

### หลักการหลัก: "Approve in 3 taps"

เป้าหมายคือให้ admin สามารถอนุมัติงานได้ **ภายใน 3 การกด** บนมือถือ:
1. แตะ card → เปิด bottom sheet
2. เลือก รถ / คนขับ / ประเภทงบ / action
3. กด "ยืนยัน"

### โครงสร้าง UI (3 Layer Architecture)

```
┌─────────────────────────┐
│  Header (sticky)        │  ← ชื่อหน้า + notif bell
├─────────────────────────┤
│  Date Strip (7 วัน)    │  ← เลือกวันที่ + dot indicator
├─────────────────────────┤
│  Summary Chips          │  ← รออนุมัติ / อนุมัติแล้ว / ทั้งหมด
├─────────────────────────┤
│  Card List              │  ← booking cards (single + group)
│                         │
│  [Long press → group    │
│   select mode]          │
└─────────────────────────┘
           ↕ tap card
┌─────────────────────────┐
│  Bottom Sheet           │  ← action panel (slide up)
│  • กำหนดรถ / คนขับ    │
│  • ประเภทค่าใช้จ่าย   │
│  • อนุมัติ / ส่งต่อ   │
│  • ไม่อนุมัติ          │
└─────────────────────────┘
```

### การจัดการ Trip Group (รวมทริป)

**Long Press (500ms)** บน card → เข้า Group Select Mode:
- Float action bar โผล่ขึ้นจากด้านล่าง (springy animation)
- แตะ card เพื่อ toggle เลือก
- กด "รวมทริป" → เปิด bottom sheet พร้อมกำหนดรถ/งบ ให้ทั้งกลุ่ม

**Group card** แสดงเป็น card ใหญ่:
- Header gradient violet — แยกออกจาก single card ชัดเจน
- Sub-items ขยาย/ย่อได้ (accordion)
- แตะ ⋮ → bottom sheet จัดการกลุ่ม (edit / ungroup)

---

## Design System ที่ใช้

### Palette — "Midnight Premium"

```
--navy:    #0D1117   /* darkest — text, bg selected */
--ink:     #1C2033   /* body text */
--smoke:   #52596E   /* secondary text */
--cloud:   #9AA3B8   /* muted / labels */
--mist:    #E8ECF3   /* borders */
--frost:   #F3F5FA   /* input bg / hover */
--snow:    #F8F9FC   /* page bg */
--surface: #FFFFFF   /* card bg */
--accent:  #1B2A6B   /* CTA — deep navy blue */
```

### Status Colors

| สถานะ | สี | CSS var |
|-------|----|---------|
| รออนุมัติ | Amber | `--amber: #C27803` |
| อนุมัติแล้ว | Emerald | `--emerald: #047857` |
| รอ Approver | Violet | `--violet: #5B21B6` |
| ไม่อนุมัติ | Rose | `--rose: #BE123C` |
| ด่วน | Crimson + pulse | `--crimson: #9F1239` |

### Typography

- Font: **IBM Plex Sans Thai** (Google Fonts) — น้ำหนักดี อ่านง่ายทั้ง TH/EN
- Card name: `0.9rem / 700` — emphasis ชัด
- Meta info: `0.7rem / 400` — ไม่แย่งสายตา

### Key CSS Techniques

```css
/* Card — shadow-only, no border */
box-shadow: 0 1px 3px rgba(15,17,30,.06), 0 4px 16px rgba(15,17,30,.05);

/* Bottom sheet overlay — frosted glass */
backdrop-filter: blur(2px);
background: rgba(13,17,23,.5);

/* Float bar — springy entrance */
transition: transform .35s cubic-bezier(.34, 1.28, .64, 1);

/* Long-press ring animation */
@keyframes longpressRing {
  0%   { transform: scale(.88); opacity: .5; }
  100% { transform: scale(1.06); opacity: 0; }
}

/* Action option selected highlight */
background: color-mix(in srgb, var(--opt-c) 6%, white);
```

---

## โครงสร้าง JavaScript

### State Variables

```javascript
let curFilter = 'pending'   // chip filter ที่ active
let activeId  = null        // booking id ที่ bottom sheet กำลัง manage
let activeGrp = null        // trip_group name ถ้ากำลัง manage group
let selAction = null        // 'approve' | 'forward' | 'reject'
let groupMode = false       // long-press select mode
let groupSel  = new Set()   // booking ids ที่เลือกสำหรับรวมทริป
let curExpType = ''         // 'central' | 'department' | 'personal'
```

### Functions สำคัญ

| Function | หน้าที่ |
|----------|---------|
| `renderStrip()` | วาด 7-day date strip, dot indicators |
| `renderCards()` | กรอง booking → render single/group cards |
| `renderGroupCard(grpName, members)` | render grouped card (violet header) |
| `openSheet(id)` | เปิด bottom sheet สำหรับ single booking |
| `openGroupManageSheet(grpName)` | เปิด bottom sheet สำหรับ group |
| `openGroupSheet()` | เปิด bottom sheet สำหรับรวมทริปใหม่ |
| `confirmAction()` | submit: single / edit-group / new-group |
| `ungroupConfirm(grpName)` | แยกกลุ่ม → คืนทุก booking เป็น pending |
| `attachLongPress(el, id)` | ผูก 500ms long press → group select mode |
| `setExpType(type)` | switch expense type + repopulate budget dropdown |
| `updateBudgetPreview()` | แสดง budget bar (color: green/amber/red) |
| `checkReady()` | enable/disable ปุ่มยืนยัน |

### Data Flow (Mockup vs Production)

| | Mockup | Production |
|--|--------|-----------|
| Booking data | `let bookings = [...]` | `window.BOOKINGS_DATA` จาก Jinja2 |
| Vehicles | `const vehicles = [...]` | `window.VEHICLES_DATA` จาก Jinja2 |
| Drivers | `const drivers = [...]` | `window.DRIVERS_DATA` จาก Jinja2 (ต้องเพิ่ม) |
| Budgets | hardcoded mock | ดึงจาก `VehicleBudget` model หรือ static |
| confirmAction | อัปเดต JS array | POST form → Flask route |

---

## Backend Integration Plan

### Route ที่เกี่ยวข้อง

| Action | Route | Method | Key Form Fields |
|--------|-------|--------|----------------|
| อนุมัติ / ส่งต่อ (single) | `vehicle.admin_assign/<id>` | POST | `assigned_vehicle_id`, `driver_id`, `expense_type`, `central_category`, `trip_department`, `assign_action` |
| ไม่อนุมัติ (single) | `vehicle.admin_assign/<id>` | POST | `assign_action=reject` *(ต้องเพิ่มใน backend)* |
| รวมทริป (group) | `vehicle.admin_merge` | POST | `booking_ids[]`, `assigned_vehicle_id`, `driver_id`, `trip_group`, `merge_action` |
| แยกกลุ่ม (ungroup) | `vehicle.admin_assign/<id>` | POST | `action=ungroup` |

### สิ่งที่ต้องเพิ่มใน Backend

1. **`admin_assign` — เพิ่ม reject branch** (ปัจจุบันมีแค่ approve/forward)
   ```python
   if assign_action == 'reject':
       booking.status = 'rejected'
       db.session.commit()
       notify_rejected(booking, current_user)
   ```

2. **`DRIVERS_DATA` injection** ใน `vehicle_admin.html` template
   ```js
   window.DRIVERS_DATA = [{% for d in drivers %}
     { id: {{ d.id }}, label: {{ d.name | tojson }} }...
   {% endfor %}];
   ```

---

## Mockup File

`docs/design/admin-approval-v2.html` — standalone HTML, ไม่ต้องการ backend  
เปิดดูได้ผ่าน dev server: `python -m http.server 7788 --directory docs/design`

สถานะ mockup: ✅ **ครบทุก interaction** — date strip, filter, single card, group card, bottom sheet, long-press group select, budget preview, ungroup

---

## สถานะการ Integrate (Production)

- [ ] เพิ่ม reject branch ใน `vehicle_view.py::admin_assign()`
- [ ] เพิ่ม `DRIVERS_DATA` injection ใน template
- [ ] แทน CSS เดิมด้วย design system ใหม่
- [ ] แทน card list HTML ด้วย `renderCards()` ใหม่
- [ ] แทน modal เดิมด้วย bottom sheet
- [ ] ทดสอบ form submit ไปยัง Flask routes
- [ ] ทดสอบบน iOS Safari + Android Chrome
