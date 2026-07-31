---
paths:
  - "app/views/**/*.py"
  - "app/services/**/*.py"
  - "app/domain/**/*.py"
  - "app/static/**/*.js"
---

## 🧹 Clean Code Rules — บังคับทุก function ใหม่

กฎเหล่านี้ **บังคับใช้ทันที** เมื่อเขียน/แก้ code — ไม่ต้องรอให้ผู้ใช้สั่ง

### ❌ ห้ามเด็ดขาด

| ห้าม | ทำแทนด้วย |
|------|----------|
| `print(...)` ทุกกรณี | `current_app.logger.exception/warning/info()` (ใน Flask context) · `logging.getLogger(__name__)` (service module) |
| `import X` กลางฟังก์ชัน | ย้ายขึ้น top-of-file เสมอ |
| Copy import block จากไฟล์อื่น | import เฉพาะที่ไฟล์นี้ใช้จริง |
| `flash(str(e), 'danger')` | `logger.exception(...)` + `flash('เกิดข้อผิดพลาด กรุณาลองใหม่', 'danger')` |
| Formula/pattern เดิม copy ครั้งที่ 3 | extract helper ใน service file ที่เกี่ยวข้อง (`services/vehicle/*.py`) — **ไม่ใช่** `vehicle_common.py` อีกต่อไป (Clean Architecture refactor, Phase 5, 2026-07-19: `vehicle_common.py` เหลือแค่ blueprint def + shared constant ห้ามรับ logic ใหม่) |
| [DEBUG ...] หรือ debug comment ค้างใน code | ลบก่อน mark เสร็จ |

> **ข้อยกเว้น mid-function import (Phase 5, 2026-07-19):** `views/core/notification_cron.py::init_scheduler()` ยัง import `apscheduler.*` ในตัวฟังก์ชัน — ตั้งใจ ไม่ใช่ตกหล่น เพราะ `apscheduler` ไม่ได้ถูกติดตั้งในทุก environment ที่ import module นี้ (`tests/conftest.py` เตือนไว้แล้วว่า "ห้าม import app/app.py ใน test — จะ start APScheduler") — ทดสอบแล้วย้ายขึ้น top-level จริง → `ModuleNotFoundError` ทันทีที่ import module (ไม่ใช่ circular import — เป็นเรื่อง optional/deferred dependency) จุดอื่นในไฟล์เดียวกัน (models/domain/notification_service) ย้ายขึ้น top-level แล้วตามปกติ

### ✅ Function ใหม่ทุกตัว — checklist ก่อน submit

```
[ ] ≤ 60 บรรทัด (นับเฉพาะ logic, ไม่นับ docstring)
    — ถ้าเกิน: แตก helper หรืออธิบายว่าทำไมจำเป็น
[ ] ทำงานอย่างเดียว (Single Responsibility)
    — ถ้ามี POST action หลาย branch → แตกฟังก์ชันต่อ action
[ ] ชื่อสื่อ verb+noun: `_calc_fuel_cost()`, `_lookup_budget()`, ไม่ใช่ `process()` / `handle()`
[ ] import เฉพาะที่ใช้ — ห้าม copy import block ยาว
[ ] error: `logger.exception()` → flash generic → return/redirect
[ ] ไม่มี magic number → ใช้ constant หรือ config
```

### กฎ DRY — ตรวจก่อนเขียน

1. ก่อนเขียน formula ค่าใช้จ่าย/คำนวณ → เช็ก `services/vehicle/*.py` (`mileage_service.py`/`budget_service.py`/`booking_service.py`) ว่ามี helper แล้วหรือยัง (ย้ายออกจาก `vehicle_common.py` ทั้งหมดแล้ว — Clean Architecture refactor Phase 1-3, 2026-07-19)
2. Fuel cost formula — **ห้าม inline** ใช้ `calc_fuel_cost(vehicle, distance, fuel_price, override=None)` จาก `domain/vehicle/fuel.py` (pure function — ย้ายจาก `vehicle_common.py` ไป Phase 1, 2026-07-19)
3. FuelPrice fallback — **ห้าม inline** ใช้ `get_fuel_price(on_date)` จาก `services/vehicle/mileage_service.py` (query ORM จึงอยู่ service ไม่ใช่ domain — ย้ายจาก `vehicle_common.py` ไป Phase 3, 2026-07-19 ปิด DEBT-2)

### Logger pattern ตาม context

```python
# ใน Flask route / service ที่เรียกจาก route (current_app ใช้ได้)
current_app.logger.exception('route_name failed')   # error + traceback
current_app.logger.warning('ข้อความ %s', var)        # warning ไม่มี traceback

# ใน module-level service (telegram_service, line_service, broadcast)
_log = logging.getLogger(__name__)   # บรรทัดแรกของไฟล์ หลัง import
_log.exception('send error')
_log.warning('config missing: %s', key)
```

## Flask Response Pattern

**Regular form POST** → `flash(msg, category)` + `redirect(url_for(...))`

**AJAX/fetch request** → `jsonify({'ok': True, 'msg': '...'})` (200) หรือ `jsonify({'ok': False, 'msg': '...'})` (400/403/404)

**Error handling ใน route:**
```python
except Exception:
    current_app.logger.exception('<route_name> failed')
    flash('เกิดข้อผิดพลาด กรุณาลองใหม่', 'danger')
    return redirect(url_for(...))
```

**JS ฝั่ง client:**
```javascript
const res  = await fetch(url, { method: 'POST', body: fd });
const data = await res.json();
if (!res.ok || !data.ok) { showToast(data.msg, 'danger'); return; }
// patch UI
```
ห้าม patch UI ก่อนเช็ก `res.ok` + `data.ok` — เดิมเคย patch ทันทีแล้ว UI โชว์สถานะปลอมเมื่อ server ตอบ 400
