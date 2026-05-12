# INDEX — จุดเริ่มต้นของ Claude

> **Claude: อ่านไฟล์นี้ก่อนเสมอ** เมื่อต้องหา symbol/route/feature แทนการ glob/grep
> ทุกคอลัมน์ `file:line` คลิกเปิดได้เลย
> **อัปเดตล่าสุด:** 2026-05-08 (driver_home Vercel-style rewrite + new driver.css; วันนี้/พรุ่งนี้ tabs, accordion cards, refuel UI removed)

---

## 🗺️ Navigation — ถามอะไร ไปที่ไหน

| ถาม | ไปที่ |
|-----|------|
| Schema ตอนนี้ + ประวัติ DB | [database/schema.md](database/schema.md) (Part 1=ปัจจุบัน, Part 2=history+เหตุผล) |
| Route / Function / Template / CSS class | Section ด้านล่างในไฟล์นี้ |
| System flow / architecture | [architecture.md](architecture.md) |
| งานที่ทำแล้ว / กำลังทำ | [doc/](doc/) · [log/](log/) |
| Feature backlog | [future_features.md](future_features.md) |
| Migration .sql ทั้งหมด | [app/migrations/migrations-index.md](../../app/migrations/migrations-index.md) |

---

## 📁 File Map (Top-level)

```
app/
  app.py · models.py · ad_utils.py
  instance/portal.db        SQLite (gitignored)
  migrations/*.sql          manual migrations + migrations-index.md
  views/                    8 blueprints (auth/repair/maintenance/vehicle/room/fuel)
  services/budget_service.py
  templates/                Jinja2 — see § Templates
  static/css|js|images/icons|uploads/{repair,maintenance,mileage}|vendor/{bootstrap,fontawesome,...}
docs/notes/
  INDEX.md (ไฟล์นี้) · architecture.md · design_system.md · task-lifecycle.md · future_features.md
  database/schema.md        ← Part 1 ปัจจุบัน + Part 2 history
  doc/ (completed) · log/ (in-progress) · skills/
```

---

## 🚀 Blueprints

| Blueprint | File | URL prefix | จำนวน route |
|-----------|------|------------|-------------|
| `auth_bp` | [app/views/auth_view.py](../../app/views/auth_view.py) | `/` | 6 |
| `repair_bp` | [app/views/repair_view.py](../../app/views/repair_view.py) | `/repair` | 4 |
| `maintenance_bp` | [app/views/maintenance_view.py](../../app/views/maintenance_view.py) | `/maintenance` | 5 |
| `vehicle_bp` | [app/views/vehicle_view.py](../../app/views/vehicle_view.py) | `/vehicle`, `/api` | ~25 |
| `adminfleet_bp` | [app/views/vehicle_view.py](../../app/views/vehicle_view.py) | `/admin/*` | 8 |
| `admincost_bp` | [app/views/vehicle_view.py](../../app/views/vehicle_view.py) | `/admin/cost`, `/vehicle/mileage/override-fuel` | 3 |
| `driver_bp` | [app/views/vehicle_view.py](../../app/views/vehicle_view.py) | `/driver` | 2 |
| `room_bp` | [app/views/room_view.py](../../app/views/room_view.py) | `/room`, `/api/room` | 5 |
| `fuel_bp` | [app/views/fuel_view.py](../../app/views/fuel_view.py) | `/admin/fuel`, `/admin/fuel/export`, `/api/fuel` | 14 |

---

## 🛣️ Routes (all paths)

### auth
| Method | Path | File:Line | Function |
|--------|------|-----------|----------|
| GET/POST | `/login` | [auth_view.py:12](../../app/views/auth_view.py#L12) | `login()` |
| GET | `/dev/login/<username>` | [auth_view.py:58](../../app/views/auth_view.py#L58) | `dev_login()` — **dev bypass** |
| GET | `/logout` | [auth_view.py:74](../../app/views/auth_view.py#L74) | `logout()` |
| GET | `/dashboard` | [auth_view.py:81](../../app/views/auth_view.py#L81) | `dashboard()` |
| GET | `/manage_users` | [auth_view.py:195](../../app/views/auth_view.py#L195) | `manage_users()` — superadmin |
| POST | `/update_user/<id>` | [auth_view.py:206](../../app/views/auth_view.py#L206) | `update_user()` — superadmin |

### repair
| Method | Path | File:Line |
|--------|------|-----------|
| GET/POST | `/repair` | [repair_view.py:45](../../app/views/repair_view.py#L45) |
| GET/POST | `/repair/edit/<id>` | [repair_view.py:86](../../app/views/repair_view.py#L86) |
| POST | `/repair/delete/<id>` | [repair_view.py:112](../../app/views/repair_view.py#L112) |
| POST | `/repair/update_status/<id>` | [repair_view.py:128](../../app/views/repair_view.py#L128) |

### maintenance
| Method | Path | File:Line |
|--------|------|-----------|
| GET/POST | `/maintenance` | [maintenance_view.py:59](../../app/views/maintenance_view.py#L59) |
| GET/POST | `/maintenance/edit/<id>` | [maintenance_view.py:92](../../app/views/maintenance_view.py#L92) |
| POST | `/maintenance/delete/<id>` | [maintenance_view.py:118](../../app/views/maintenance_view.py#L118) |
| POST | `/maintenance/update_status/<id>` | [maintenance_view.py:134](../../app/views/maintenance_view.py#L134) |
| GET | `/maintenance/export_excel` | [maintenance_view.py:204](../../app/views/maintenance_view.py#L204) |

### vehicle (user)
| Method | Path | File:Line |
|--------|------|-----------|
| GET | `/vehicle` | [vehicle_view.py:63](../../app/views/vehicle_view.py#L63) |
| POST | `/vehicle/book` | [vehicle_view.py:81](../../app/views/vehicle_view.py#L81) |
| GET/POST | `/vehicle/edit/<id>` | [vehicle_view.py:136](../../app/views/vehicle_view.py#L136) |
| POST | `/vehicle/delete/<id>` | [vehicle_view.py:175](../../app/views/vehicle_view.py#L175) |
| GET | `/vehicle/detail/<id>` | [vehicle_view.py:210](../../app/views/vehicle_view.py#L210) |
| GET | `/vehicle/calendar` | [vehicle_view.py:226](../../app/views/vehicle_view.py#L226) |
| GET | `/api/vehicle/bookings` | [vehicle_view.py:233](../../app/views/vehicle_view.py#L233) |
| GET | `/api/custom-bookings` | [vehicle_view.py:255](../../app/views/vehicle_view.py#L255) |
| POST | `/vehicle/approve/<id>` | [vehicle_view.py:282](../../app/views/vehicle_view.py#L282) |
| GET | `/vehicle/history` | [vehicle_view.py:521](../../app/views/vehicle_view.py#L521) |
| GET | `/vehicle/approver` | [vehicle_view.py:239](../../app/views/vehicle_view.py#L239) — approver inbox รายการรอแผนกตัวเอง + budget เดือนปัจจุบัน |

### vehicle (admin — shared `/vehicle/admin/*`)
| Method | Path | File:Line |
|--------|------|-----------|
| GET | `/vehicle/admin` | [vehicle_view.py:619](../../app/views/vehicle_view.py#L619) |
| POST | `/vehicle/admin/booking/<id>/notify` | [vehicle_view.py:681](../../app/views/vehicle_view.py#L681) |
| POST | `/vehicle/admin/booking/<id>/revert` | [vehicle_view.py:695](../../app/views/vehicle_view.py#L695) |
| POST | `/vehicle/admin/vehicle/<id>/repair` | [vehicle_view.py:709](../../app/views/vehicle_view.py#L709) |
| POST | `/vehicle/admin/vehicle/<id>/fix-done` | [vehicle_view.py:722](../../app/views/vehicle_view.py#L722) |
| POST | `/vehicle/admin/booking/<id>/swap` | [vehicle_view.py:738](../../app/views/vehicle_view.py#L738) |
| POST | `/vehicle/admin/merge` | [vehicle_view.py:757](../../app/views/vehicle_view.py#L757) |
| POST | `/vehicle/admin/assign/<id>` | [vehicle_view.py:832](../../app/views/vehicle_view.py#L832) |
| GET/POST | `/vehicle/mileage` | [vehicle_view.py:1043](../../app/views/vehicle_view.py#L1043) |
| GET | `/vehicle/mileage/export` | [vehicle_view.py:1332](../../app/views/vehicle_view.py#L1332) — Excel export ตาม filter |
| GET | `/api/admin/bookings` | [vehicle_view.py:1841](../../app/views/vehicle_view.py#L1841) |
| POST | `/api/check-merge` | [vehicle_view.py:1719](../../app/views/vehicle_view.py#L1719) |

### adminfleet (`/admin/manage-fleet`, `/admin/budget`)
| Method | Path | File:Line |
|--------|------|-----------|
| GET/POST | `/admin/manage-fleet` | [vehicle_view.py:613](../../app/views/vehicle_view.py#L613) |
| POST | `/admin/manage-fleet/service` | [vehicle_view.py:2114](../../app/views/vehicle_view.py#L2114) |
| GET | `/api/vehicle/<vid>/history` | [vehicle_view.py:1552](../../app/views/vehicle_view.py#L1552) |
| GET/POST | `/admin/budget` | [vehicle_view.py:1278](../../app/views/vehicle_view.py#L1278) |
| GET | `/admin/budget/personal` | [vehicle_view.py:1435](../../app/views/vehicle_view.py#L1435) |
| POST | `/admin/budget/personal/mark_paid` | [vehicle_view.py:1505](../../app/views/vehicle_view.py#L1505) |
| POST | `/admin/budget/personal/mark_unpaid` | [vehicle_view.py:1532](../../app/views/vehicle_view.py#L1532) |

### admincost
| Method | Path | File:Line |
|--------|------|-----------|
| POST | `/vehicle/mileage/override-fuel` | [vehicle_view.py:1534](../../app/views/vehicle_view.py#L1534) |
| GET/POST | `/admin/cost` | [vehicle_view.py:1552](../../app/views/vehicle_view.py#L1552) |
| GET | `/admin/cost/export` | [vehicle_view.py:2178](../../app/views/vehicle_view.py#L2178) |

### driver
| Method | Path | File:Line |
|--------|------|-----------|
| GET | `/driver` | [vehicle_view.py:1139](../../app/views/vehicle_view.py#L1139) |
| POST | `/driver/mileage` | [vehicle_view.py:1165](../../app/views/vehicle_view.py#L1165) |

### room
| Method | Path | File:Line |
|--------|------|-----------|
| GET | `/room` | [room_view.py:16](../../app/views/room_view.py#L16) |
| POST | `/room/book` | [room_view.py:23](../../app/views/room_view.py#L23) |
| POST | `/room/edit/<id>` | [room_view.py:58](../../app/views/room_view.py#L58) |
| POST | `/room/delete/<id>` | [room_view.py:96](../../app/views/room_view.py#L96) |
| GET | `/api/room/bookings` | [room_view.py:111](../../app/views/room_view.py#L111) |

### fuel (vehicle admin only)
| Method | Path | File:Line | Function |
|--------|------|-----------|----------|
| GET | `/admin/fuel` | [fuel_view.py:112](../../app/views/fuel_view.py#L112) | `admin_fuel()` — KPI + bills + reimbursements + pivot |
| POST | `/admin/fuel/bill` | [fuel_view.py:238](../../app/views/fuel_view.py#L238) | `create_bill()` |
| POST | `/admin/fuel/bill/<id>/edit` | [fuel_view.py:270](../../app/views/fuel_view.py#L270) | `edit_bill()` |
| POST | `/admin/fuel/bill/<id>/delete` | [fuel_view.py:291](../../app/views/fuel_view.py#L291) | `delete_bill()` |
| POST | `/admin/fuel/reimbursement` | [fuel_view.py:305](../../app/views/fuel_view.py#L305) | `create_reimbursement()` — รวมบิลที่เลือก |
| POST | `/admin/fuel/reimbursement/<id>/edit` | [fuel_view.py:341](../../app/views/fuel_view.py#L341) | `edit_reimbursement()` |
| POST | `/admin/fuel/reimbursement/<id>/receive` | [fuel_view.py:356](../../app/views/fuel_view.py#L356) | `receive_reimbursement()` — mark ได้เงิน |
| POST | `/admin/fuel/reimbursement/<id>/delete` | [fuel_view.py:367](../../app/views/fuel_view.py#L367) | `delete_reimbursement()` — detach bills back to รอเบิก |
| POST | `/admin/fuel/reserve` | [fuel_view.py:383](../../app/views/fuel_view.py#L383) | `adjust_reserve()` — +/- with required note |
| POST | `/admin/fuel/price` | [fuel_view.py:418](../../app/views/fuel_view.py#L418) | `add_price()` — effective-dated upsert |
| POST | `/admin/fuel/price/<id>/delete` | [fuel_view.py:448](../../app/views/fuel_view.py#L448) | `delete_price()` |
| POST | `/admin/fuel/annual-budget` | [fuel_view.py:462](../../app/views/fuel_view.py#L462) | `set_annual_budget()` — SystemConfig['fuel_annual_budget'] |
| GET | `/api/fuel/bill-by-mileage` | [fuel_view.py:478](../../app/views/fuel_view.py#L478) | `api_bill_by_mileage()` — phase 3 mileage badge lookup |
| GET | `/admin/fuel/export/excel` | [fuel_view.py:499](../../app/views/fuel_view.py#L499) | `export_excel()` — 3 sheets (บิล/ใบเบิก/Pivot) honoring filters |

### notification API (in vehicle_bp)
| Method | Path | File:Line |
|--------|------|-----------|
| GET | `/api/notifications` | [vehicle_view.py:350](../../app/views/vehicle_view.py#L350) |
| POST | `/api/notifications/read-all` | [vehicle_view.py:449](../../app/views/vehicle_view.py#L449) |
| POST | `/api/notifications/<id>/read` | [vehicle_view.py:458](../../app/views/vehicle_view.py#L458) |
| POST | `/api/payment/report/<mileage_id>` | [vehicle_view.py:474](../../app/views/vehicle_view.py#L474) |
| POST | `/api/payment/report-by-booking/<id>` | [vehicle_view.py:495](../../app/views/vehicle_view.py#L495) |

---

## 🔧 Key Functions (non-route)

### Permission helpers
| Function | File:Line |
|----------|-----------|
| `is_vehicle_admin()` | [vehicle_view.py:56](../../app/views/vehicle_view.py#L56) |
| `is_repair_admin()` | [repair_view.py:14](../../app/views/repair_view.py#L14) |
| `is_maintenance_admin()` | [maintenance_view.py:14](../../app/views/maintenance_view.py#L14) |

### Business logic
| Function | File:Line | หน้าที่ |
|----------|-----------|---------|
| `book_vehicle_simple()` | [vehicle_view.py:83](../../app/views/vehicle_view.py#L83) | สร้าง booking + validate ห้ามข้ามวัน |
| `approve_booking()` | [vehicle_view.py:282](../../app/views/vehicle_view.py#L282) | approve/reject + status flow + reject_reason |
| `approver_inbox()` | [vehicle_view.py:241](../../app/views/vehicle_view.py#L241) | approver ดูรายการรอแผนกตัวเอง + ประวัติ + VehicleBudget เดือนปัจจุบัน (ctx: pending, history, budgets) |
| `inject_approver_pending_count()` | [app.py](../../app/app.py) | context processor — badge จำนวน waiting_approver สำหรับ approver |
| `admin_assign()` | [vehicle_view.py:832](../../app/views/vehicle_view.py#L832) | assign รถ+คนขับ + snap_* |
| `mileage_log()` | [vehicle_view.py:1043](../../app/views/vehicle_view.py#L1043) | admin บันทึกไมล์ + หักงบผ่าน BudgetService + dashboard KPI/breakdown/filter; default filter = เดือนปัจจุบัน (show_all=1 เพื่อดูทั้งหมด) |
| `mileage_export()` | [vehicle_view.py:1332](../../app/views/vehicle_view.py#L1332) | Export Excel ตาม filter ปัจจุบัน |
| `driver_mileage()` | [vehicle_view.py:1165](../../app/views/vehicle_view.py#L1165) | คนขับบันทึกไมล์ + หักงบผ่าน BudgetService |
| `override_fuel()` | [vehicle_view.py:1531](../../app/views/vehicle_view.py#L1531) | admin override `mileage.fuel_cost` + auto refund/rededuct ผ่าน BudgetService |
| `budget_manage()` | [vehicle_view.py:1874](../../app/views/vehicle_view.py#L1874) | ตั้ง/แก้เพดานงบ — log ผ่าน `BudgetService.set_budget_amount()` |
| `BudgetService` | [services/budget_service.py](../../app/services/budget_service.py) | API กลาง: deduct/refund/rededuct/set_budget_amount/manual_adjust + verify_cache_integrity |
| `calc_ot()` | [vehicle_view.py:1023](../../app/views/vehicle_view.py#L1023) | คำนวณ OT |
| `get_bkk_time()` | [models.py:8](../../app/models.py#L8) | Thai time (UTC+7) |

### Notification
| Function | File:Line | หน้าที่ |
|----------|-----------|---------|
| `_create()` | [notification_service.py:44](../../app/views/notification_service.py#L44) | สร้าง in-app notif |
| `notify_booking_created()` | [notification_service.py:86](../../app/views/notification_service.py#L86) | user สร้าง booking |
| `notify_admin_assigned()` | [notification_service.py:99](../../app/views/notification_service.py#L99) | admin assign รถ |
| `notify_admin_approved()` | [notification_service.py:116](../../app/views/notification_service.py#L116) | admin approve |
| `notify_forwarded_to_approver()` | [notification_service.py:131](../../app/views/notification_service.py#L131) | ส่งต่อ approver แผนก |
| `notify_approver_approved()` | [notification_service.py:144](../../app/views/notification_service.py#L144) | approver แผนก approve |
| `notify_rejected()` | [notification_service.py:159](../../app/views/notification_service.py#L159) | reject |
| `notify_merged_into_group()` | [notification_service.py:173](../../app/views/notification_service.py#L173) | รวม trip |
| `notify_mileage_started/ended()` | [notification_service.py:186,199](../../app/views/notification_service.py#L186) | บันทึกไมล์ |
| `notify_budget_deducted()` | [notification_service.py:213](../../app/views/notification_service.py#L213) | หักงบสำเร็จ |
| `notify_payment_required()` | [notification_service.py:232](../../app/views/notification_service.py#L232) | personal ต้องชำระ |
| `notify_payment_reminder_user()` | [notification_service.py:248](../../app/views/notification_service.py#L248) | เตือนชำระ (cron) |
| `notify_payment_overdue_admin()` | [notification_service.py:264](../../app/views/notification_service.py#L264) | เตือน admin (cron) |
| `notify_payment_confirmed()` | [notification_service.py:310](../../app/views/notification_service.py#L310) | admin ยืนยันรับเงิน |
| `check_payment_escalation()` | [notification_cron.py:28](../../app/views/notification_cron.py#L28) | cron job |

### Frontend JS
| Function | File:Line | หน้าที่ |
|----------|-----------|---------|
| `openEventDetail()` | [vehicle.js:660](../../app/static/js/vehicle.js#L660) | เปิด detail modal (single หรือ group อัตโนมัติ) |

### Telegram
| Function | File:Line |
|----------|-----------|
| `_send()` | [telegram_service.py:19](../../app/views/telegram_service.py#L19) |
| `delete_old_message()` | [telegram_service.py:35](../../app/views/telegram_service.py#L35) |
| `notify_approved()` | [telegram_service.py:92](../../app/views/telegram_service.py#L92) |
| `notify_forwarded_to_approver()` | [telegram_service.py:112](../../app/views/telegram_service.py#L112) |
| `notify_approver_approved()` | [telegram_service.py:131](../../app/views/telegram_service.py#L131) |
| `notify_rejected()` | [telegram_service.py:150](../../app/views/telegram_service.py#L150) |

---

## 🧱 Database Models

**27 tables total** — รายละเอียดเต็ม: [database/schema-current.md](database/schema-current.md)

| Model | Line | หมายเหตุ |
|-------|------|---------|
| `BudgetType` | [models.py:14](../../app/models.py#L14) | lookup: central/department |
| `ExpenseType` | [models.py:25](../../app/models.py#L25) | lookup: central/department/personal |
| `VehicleDepartment` | [models.py:36](../../app/models.py#L36) | แผนก + budget_type |
| `User` | [models.py:49](../../app/models.py#L49) | 4 role fields + is_superadmin |
| `RepairTicket` | [models.py:77](../../app/models.py#L77) | |
| `MaintenanceTicket` | [models.py:105](../../app/models.py#L105) | |
| `Vehicle` | [models.py:134](../../app/models.py#L134) | fuel_rate, next_service_*, tax_due_date |
| `Driver` | [models.py:154](../../app/models.py#L154) | link to User |
| `VehicleBooking` | [models.py:167](../../app/models.py#L167) | ⭐ หัวใจหลัก — snap_* fields |
| `RoomBooking` | [models.py:215](../../app/models.py#L215) | |
| `VehicleMileage` | [models.py:230](../../app/models.py#L230) | + payment tracking (2026-04-23) |
| `SystemConfig` | [models.py:269](../../app/models.py#L269) | key-value, มี `.get()`/`.set()` |
| `VehicleBudget` | [models.py:292](../../app/models.py#L292) | unique(type, dept, year, month) |
| `Notification` | [models.py:332](../../app/models.py#L332) | + category/action_url/sticky (2026-04-23) |
| `TripPassenger` | [models.py:357](../../app/models.py#L357) | CASCADE delete |
| `VehicleServiceLog` | [models.py:382](../../app/models.py#L382) | sync → vehicle.next_service_* |
| `DeptApprover` | [models.py:410](../../app/models.py#L410) | junction: User many-to-many VehicleDepartment (approver) |
| `TripExpenseItem` | [models.py:424](../../app/models.py#L424) | toll/parking/food/other |
| `OTRateConfig` | [models.py:447](../../app/models.py#L447) | อัตรา OT แต่ละ time band + seed 4 rows |
| `DriverOT` | [models.py:464](../../app/models.py#L464) | 1 OT record ต่อ 1 booking — approval + audit trail |
| `DriverOTSlot` | [models.py:493](../../app/models.py#L493) | time slot แต่ละช่วงใน OT record — snapshot rate |
| `FuelBill` | [models.py:510](../../app/models.py#L510) | บิลค่าน้ำมันเดี่ยว → vehicle/driver, link to FuelReimbursement |
| `FuelReimbursement` | [models.py:534](../../app/models.py#L534) | ใบเบิกรวม 1:N FuelBill — `submitted_at` / `received_at` |
| `FuelPrice` | [models.py:553](../../app/models.py#L553) | ราคา/ลิตรตามช่วงเวลา — `get_for_date()` (replaces SystemConfig['fuel_price']) |
| `FuelReserveConfig` | [models.py:577](../../app/models.py#L577) | เงินสำรอง singleton (id=1) — `get_amount()` |
| `FuelReserveLog` | [models.py:595](../../app/models.py#L595) | ประวัติการปรับเงินสำรอง — note required |
| `VehicleBudgetLog` | [models.py:611](../../app/models.py#L611) | **ledger** ของ vehicle_budget — ทุก mutation ต้องผ่าน BudgetService (2026-05-06) |

---

## 🎨 Templates

**Shared partials** (include ทุกหน้า):
| Partial | File |
|---------|------|
| `_sidebar.html` | [app/templates/_sidebar.html](../../app/templates/_sidebar.html) — `active_menu` keys: `dashboard` `history` `vehicle`/`calendar` `repair` `room` `admin` `mileage` `fleet` `cost` `budget` `fuel` `approver`. **Icons: Lucide** (`data-lucide="..."`) — load via `_header.html` |
| `_header.html` | [app/templates/_header.html](../../app/templates/_header.html) |
| `_notification_panel.html` | [app/templates/_notification_panel.html](../../app/templates/_notification_panel.html) |
| `_notification_toast.html` | [app/templates/_notification_toast.html](../../app/templates/_notification_toast.html) |

**Vehicle templates:**
| File | ใช้สำหรับ |
|------|----------|
| `vehicle/vehicle.html` | หน้าจองหลัก |
| `vehicle/vehicle_calendar.html` | calendar view | ไม่ใช้แล้ว ลบทิ้งได้เลย
| `vehicle/vehicle_history.html` | ประวัติ |
| `vehicle/vehicle_edit.html` | แก้ไข booking |
| `vehicle/approver_inbox.html` | Approver inbox — budget card + 3 tabs (รออนุมัติ/อนุมัติแล้ว/ปฏิเสธ) + accordion cards + inline reject form |
| `vehicle/admin/mileage_admin.html` | บันทึกเลขไมล์ (admin) — KPI + breakdown + filter + checkbox summary + modal 3-state |
| `vehicle/driver_home.html` | หน้าคนขับ — **Vercel namespace** (2026-05-08, rev2): `<body class="vc-scope">` + lucide icons only (no Font Awesome). Header + segmented tabs (วันนี้/พรุ่งนี้, no "ย้อนหลัง"), accordion cards (`[data-card]` open one→close others within active panel), inline mileage form (no modal), upload zone (no separate camera button), CTA black `--vc-primary`. Tomorrow tab read-only with "เริ่มงานได้ในวันที่ …" note. Refuel UI removed. Loads lucide UMD inline + `driver.css`. |
| `vehicle/vehicle-modal-book.html` | `#bookingModal` |
| `vehicle/vehicle-modal-edit.html` | `#editBookingModal` |
| `vehicle/vehicle-modal-detail.html` | `#eventDetailModal` (single + group รวมใน modal เดียว) |
| `vehicle/vehicle-modal-group.html` | *(merged into vehicle-modal-detail.html)* |
| `vehicle/vehicle-modal-more-events.html` | `#moreEventsModal` |
| `vehicle/admin/vehicle_admin.html` | admin dashboard — **Vercel shell** (`.vc-scope`), 4-cell KPI strip (รออนุมัติ/ส่ง Approver/อนุมัติ/ปฏิเสธ), week navigator (dark active fill), 2-col split: Bookings+Trips (col-8) / Vehicle status grid (col-4 sticky), 4 modals: `#assignModal` `#swapModal` `#repairModal` `#revertModal`. Reuses `fuel_admin.css` primitives (`.vc-card/.vc-kpi-*/.vc-btn/.vc-modal/.vc-form-*`). Lucide icons. |
| `vehicle/admin/admin_manage_fleet.html` | จัดการรถ + คนขับ + ตารางผู้อนุมัติประจำกอง (view-only); service/tax date อยู่ใน edit modal |
| `vehicle/admin/vehicle_cost.html` | จัดการค่าล่วงเวลา (OT) คนขับ — KPI, ตาราง, อนุมัติ, พิมพ์ใบเสร็จ |
| `vehicle/admin/budget_manage.html` | จัดการงบ |
| `vehicle/admin/budget_personal.html` | personal reimbursement |
| `vehicle/admin/admin_fuel.html` | **Phase 2.3–2.7 + 4.1/4.3** — Vercel shell, 6 KPI cells, filter bar (year/month/vehicle/driver GET), Bills data table (Excel export link, anchor `#billsCard`), Reimbursements accordion, **Pivot รถ×เดือน** (heatmap, sticky col, footer sum, **drill-down → Bills filter year+vehicle+month**), **5 modals (bill/reimb/reserve/price/budget)** + JS controller |
| `vehicle/admin/fuel-modal-bill.html` | Bill create/edit/delete modal — date/vehicle/driver/amount/payment radio segmented/mileage/note. `#fuelBillModal` |
| `vehicle/admin/fuel-modal-reimbursement.html` | Reimbursement create/edit modal — bill list summary + เลขใบเบิก/แหล่ง/วันส่ง/note. `#fuelReimbModal` |
| `vehicle/admin/fuel-modal-reserve.html` | Reserve adjust modal — current summary + signed change + note (required) + history 20. `#fuelReserveModal` |
| `vehicle/admin/fuel-modal-price.html` | Fuel price modal — add new + history with delete. `#fuelPriceModal` |
| `vehicle/admin/fuel-modal-budget.html` | Annual budget modal — single number input + summary. `#fuelBudgetModal` |

**กฎสำคัญ:** modal ห้ามมี inline `<script>` — JS อยู่ใน `vehicle.js` ทั้งหมด

---

## 🎨 Design System

**Entry point:** [app/static/css/design-system.css](../../app/static/css/design-system.css)
- CSS variables: `--ds-*` (accent, bg, text, border, radius) — global, ทุกหน้า
- Primary: `#4F46E5` (Indigo-600)
- Shadow: ไม่มี (ใช้ border แทน)

**Vercel namespace `--vc-*`** (Section 8 ในไฟล์เดียวกัน, 2026-05-05):
- Scope: opt-in via `.vc-scope` หรือใช้ใน `fuel_admin.css` เท่านั้น (ห้ามไหลไปหน้าอื่น)
- Primary: `#000` (pure black) · Border: `#EAEAEA` · Radius card 8px
- Mono: Geist Mono (โหลดใน `_header.html`) — ใช้ผ่าน `.vc-mono`
- Utilities: `.vc-mono` `.vc-caption` `.vc-tracking-tight` `.vc-icon{,-sm,-md,-lg}` `.vc-scope`

**Per-page CSS:**
| File | ใช้กับ |
|------|--------|
| `vehicle.css` | หน้า user vehicle + calendar + history |
| `driver.css` | **`/driver` only** (2026-05-08, **rev2 → Vercel namespace**) — uses `--vc-*` tokens (matches `fuel_admin.css` standard), body wrapped in `.vc-scope`. Classes: `.driver-page/-container/-header/-title/-subtitle/-header-meta/-tabs(__btn,__count)/-card(__head,__id,__summary,__chevron,__body, .is-open, --readonly)/-meta(__item,__icon,__label,__value)/-summary(__row,__label,__value)/-form(__title)/-upload(.has-file,__icon,__label,__hint)/-cta/-pill(--waiting,--ontrip,--done,--upcoming)/-done-summary/-readonly-note/-empty(__icon,__title,__desc)/-panel(.is-active)`. Mono font (Geist Mono) for BK-id, KPI numbers, inputs. Black primary CTA via `--vc-primary`. Lucide icons sized via `.vc-icon-sm/md/lg`. JS: tab switch + accordion (open one→close others within panel) + actual_start/end timestamp stamp + upload zone file feedback + lucide.createIcons(). |
| `vehicle_admin.css` | admin dashboard + budget pages. **Rewritten 2026-05-07** for Vercel shell: depends on `fuel_admin.css` (vc-* primitives) + `design-system.css` (vc-* tokens). Page-specific only: `.va-page-header/.va-kpi-4/.va-week-*/.va-collapsed-bar/.va-filter-tabs+.ftab/.va-list/.va-vehicle-grid/.va-modal-*/.va-exp-tabs/.va-budget-bar/.va-swap-list/.adm-toast`. JS-rendered classes restyled: `.bl-*` `.pts-*` `.vs-*` (vehicle status row) `.swap-veh-*` `.adm-exp-tab`. Mobile breakpoints ≤767px (list actions wrap) and ≤575px (vehicle row + filter tab compact) |
| `fuel_admin.css` | **Vercel namespace** — fuel page only. Sections: page shell, header, card, KPI strip, btn, table+badge+empty, list+collapse+meta-grid, form input/segmented radio/modal Bootstrap-override skin/history scroll table, **§21 filter bar** (`.vc-filter-bar/.vc-filter-select`), **§22 pivot table** (`.vc-pivot-*`, heatmap via `--cell-heat`, `.vc-pivot-link` drill-down with `:focus-visible` + `:has()` hover boost) |
| `notification.css` | notification panel + toast |
| `main.css`, `util.css` | common utilities |

**Per-page JS:**
| File | โหลดใน |
|------|--------|
| `vehicle.js` | vehicle templates (รวม modals ทั้งหมด) |
| `vehicle_admin.js` | admin pages |
| `mileage_admin.js` | admin mileage page (modal 3-state, realtime cost, checkbox summary, drill-down) |
| `fuel_admin.js` | fuel page — 5-modal controller, checkbox→merge, kebab→edit, lucide re-init on shown.bs.modal, **wireFilterBar** (auto-submit GET on select change) |
| `notification.js` | ทุกหน้าที่มี notification panel |
| `ot_admin.js` | vehicle_cost.html — tab switching, edit modal, slot calc, print receipt |

**Reference page:** `/design-system` (superadmin) → [design_system_reference.html](../../app/templates/design_system_reference.html)

**Icon libraries:**
- Font Awesome (`fa-solid` / `fa-regular`) — global default ใช้อยู่ทุกหน้า
- Lucide Icons (line, stroke 1.5px) — โหลด global ใน `_header.html` (CDN unpkg). ใช้: `<i data-lucide="fuel"></i>`. หลัง DOM update เรียก `window.lucide.createIcons()`. ใช้สำหรับ Vercel namespace (Phase 2 fuel page)

---

> Patterns ที่ซ้ำซาก (booking status, telegram, in-app notify, budget mutation) → ดู CLAUDE.md § Gotchas
> Maintenance Protocol → ดู CLAUDE.md
