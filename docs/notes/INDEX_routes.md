# INDEX — Routes

> Part ของ INDEX.md แยก เพื่อ token budget — [กลับ hub](INDEX.md)
> **อัปเดตล่าสุด:** 2026-06-12

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
| POST | `/vehicle/delete/<id>` | [vehicle_booking.py:174](../../app/views/vehicle/vehicle_booking.py#L174) — ลบ booking (hard delete). owner: pending/rejected เท่านั้น; admin: ทุกสถานะ ยกเว้นถ้ามี `mileage.budget_deducted_at` → blocked (กัน ledger orphan) **2026-06-12** |
| POST | `/vehicle/cancel/<id>` | [vehicle_booking.py:218](../../app/views/vehicle/vehicle_booking.py#L218) — soft cancel. owner: status ∈ {pending, waiting_approver} เท่านั้น; admin: +approved; time guard `now < start_datetime`; notify (owner/admin/approver/driver/mate) + Telegram + flip `status='cancelled'`. **ไม่มี refund งบ** — งบหักเฉพาะตอนปิดทริป **2026-06-12** |
| GET | `/vehicle/detail/<id>` | `vehicle_booking.py` — **2026-06-07: redirect → `/vehicle?detail=<id>`** (detail page ลบ, แสดงผ่าน modal `vehicle/modals/vehicle_detail.html` + JS deeplink); เก็บ permission check |
| GET | `/api/vehicle/bookings` | `vehicle_booking.py` |
| GET | `/api/custom-bookings` | `vehicle_booking.py` |
| POST | `/vehicle/approve/<id>` | `vehicle_booking.py` |
| GET | `/vehicle/approver` | `vehicle_booking.py` — approver inbox รายการรอแผนกตัวเอง + budget เดือนปัจจุบัน |

> **2026-06-07:** `/vehicle/history` + `/vehicle/history/feed` (booking_history/history_feed) **ลบแล้ว** — feature เลิกใช้, `vehicle_history.py` + template ลบ, sidebar link "ประวัติการจอง" ออก

### vehicle (admin — shared `/vehicle/admin/*`)
| Method | Path | File:Line |
|--------|------|-----------|
| GET | `/vehicle/admin` | [vehicle_view.py:619](../../app/views/vehicle_view.py#L619) |
| POST | `/vehicle/admin/booking/<id>/notify` | [vehicle_view.py:681](../../app/views/vehicle_view.py#L681) |
| POST | `/vehicle/admin/booking/<id>/revert` | [vehicle_admin.py:299](../../app/views/vehicle/vehicle_admin.py#L299) — revert → pending. Guard: ห้ามถ้ามี `mileage.budget_deducted_at`; source ∈ {approved, waiting_approver, rejected} เท่านั้น; เคลียร์ reject_reason + set updated_by; คืน JSON `{ok, msg}` **2026-06-12** |
| POST | `/vehicle/admin/vehicle/<id>/repair` | [vehicle_view.py:709](../../app/views/vehicle_view.py#L709) |
| POST | `/vehicle/admin/vehicle/<id>/fix-done` | [vehicle_view.py:722](../../app/views/vehicle_view.py#L722) |
| POST | `/vehicle/admin/booking/<id>/swap` | [vehicle_view.py:738](../../app/views/vehicle_view.py#L738) |
| POST | `/vehicle/admin/merge` | [vehicle_view.py:757](../../app/views/vehicle_view.py#L757) |
| POST | `/vehicle/admin/assign/<id>` | [vehicle_view.py:832](../../app/views/vehicle_view.py#L832) |
| GET/POST | `/vehicle/mileage` | [vehicle_view.py:1063](../../app/views/vehicle_view.py#L1063) |
| GET | `/vehicle/mileage/export` | [vehicle_view.py:1430](../../app/views/vehicle_view.py#L1430) — Excel export ตาม filter |
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
| POST | `/vehicle/mileage/override-fuel` | [vehicle_cost.py:70](../../app/views/vehicle/vehicle_cost.py#L70) |
| GET | `/admin/cost` | [vehicle_cost.py:124](../../app/views/vehicle/vehicle_cost.py#L124) — tab `''`(live)/unpaid/paid/self_paid/deleted + KPI ยอดรวม/ยังไม่จ่าย/จ่ายแล้ว (ไม่นับ deleted) + col งบ per row |
| POST | `/admin/ot/<id>/mark_paid` | [vehicle_cost.py:201](../../app/views/vehicle/vehicle_cost.py#L201) — toggle จ่าย/ไม่จ่าย |
| POST | `/admin/ot/<id>/toggle_no_receipt` | [vehicle_cost.py:226](../../app/views/vehicle/vehicle_cost.py#L226) — tab ผู้ใช้จ่ายเอง |
| POST | `/admin/ot/create` | [vehicle_cost.py:243](../../app/views/vehicle/vehicle_cost.py#L243) — manual standalone OT (booking_id=None, ไม่หักงบ) |
| POST | `/admin/ot/<id>/edit` | [vehicle_cost.py:288](../../app/views/vehicle/vehicle_cost.py#L288) |
| POST | `/admin/ot/<id>/delete` | [vehicle_cost.py:312](../../app/views/vehicle/vehicle_cost.py#L312) — soft delete |
| POST | `/admin/ot/<id>/restore` | [vehicle_cost.py:330](../../app/views/vehicle/vehicle_cost.py#L330) — กู้คืนจาก tab ลบ |
| POST | `/admin/ot/rate_config/update` | [vehicle_cost.py:346](../../app/views/vehicle/vehicle_cost.py#L346) |
| GET | `/admin/cost/export` | [vehicle_cost.py:396](../../app/views/vehicle/vehicle_cost.py#L396) — filter ตาม tab status เดียวกับ `/admin/cost` |

### driver
| Method | Path | File:Line |
|--------|------|-----------|
| GET | `/driver` | [vehicle_driver.py:36](../../app/views/vehicle/vehicle_driver.py#L36) — ส่ง `latest_odo` (MAX odometer ต่อรถ) เข้า template |
| POST | `/driver/ad-hoc-trip` | [vehicle_driver.py:90](../../app/views/vehicle/vehicle_driver.py#L90) — งานนอกระบบ driver สร้างเอง (collapse UI, strict contact_user_id) + บันทึกเลขไมล์ออกทันที (สร้าง VehicleMileage start ถ้าส่ง odometer_start) |
| POST | `/driver/change-vehicle` | [vehicle_driver.py:174](../../app/views/vehicle/vehicle_driver.py#L174) — เปลี่ยนรถฉุกเฉินก่อนออก (swap + เช็ก active + ไม่ชนคิว approved; block ถ้าบันทึกไมล์ออกแล้ว) |
| POST | `/driver/mileage` | [vehicle_driver.py:219](../../app/views/vehicle/vehicle_driver.py#L219) |

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

