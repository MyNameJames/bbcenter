# Group Approve Bug Fix
**วันที่:** 2026-04-12
**สถานะ:** in-progress

## เป้าหมาย
แก้บัค: อนุมัติ group card แล้วสถานะไม่เปลี่ยน (ยังเป็น pending)

## สาเหตุที่พบ

### Bug 1 (หลัก) — `admin_merge` driver validation ผิด
- `need_driver_count` นับ booking ที่มี `need_driver=True` ทั้งหมด แม้จะมี `driver_id` assign ไปแล้ว
- `rep = members[0]` คือ booking แรก (sort by `created_at DESC`)
- ถ้า booking แรกไม่ต้องการคนขับ → `rep.driverId = null` → driver select ไม่ถูก pre-fill
- form ไม่ส่ง `driver_id` → backend บล็อก: "มี X รายการที่ขอคนขับ กรุณาเลือกคนขับด้วย"
- แต่ JS แสดง toast "สำเร็จ" ทุกกรณี → user งง

### Bug 2 — JS ไม่ detect backend failure
- `fetch()` follows redirect → ได้ HTML 200 เสมอ → ไม่รู้ว่า backend reject
- Toast "อัปเดตกลุ่ม X เรียบร้อย" แสดงแม้ backend จะ reject

### Bug 3 — Reject group ส่ง `merge_action = 'approve'`
- `selAction==='forward' ? 'forward' : 'approve'` → reject ถูก map เป็น approve

## การตัดสินใจ

### Fix 1 — Backend `admin_merge`
เพิ่ม `and not b.driver_id` ใน need_driver_count:
```python
if b and b.need_driver and not b.driver_id
```
เฉพาะ booking ที่ยังไม่มีคนขับเท่านั้นที่นับ

### Fix 2 — Frontend driver pre-fill
ใช้ driver จาก member ใดก็ได้ที่มี driverId (ไม่จำกัดแค่ rep):
```javascript
const anyDriver = members.find(b => b.driverId);
if (ds && anyDriver?.driverId) ds.value = anyDriver.driverId;
```

### Fix 3 — Frontend reject flow
Group reject ต้อง loop `admin_assign` per member (เพราะ `admin_merge` ไม่รองรับ reject):
```javascript
if (selAction === 'reject') {
    for (const m of members) { await fetch(m.assignUrl, POST, reject) }
} else { ... admin_merge ... }
```

## ไฟล์ที่แก้ไข
- `app/views/vehicle_view.py`
- `app/static/js/vehicle_admin.js`
