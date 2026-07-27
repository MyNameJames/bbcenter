# INDEX — จุดเริ่มต้นของ Claude

> **Claude: อ่านไฟล์นี้ก่อนเสมอ** เมื่อต้องหา symbol/route/feature แทนการ glob/grep
> ทุกคอลัมน์ `file:line` คลิกเปิดได้เลย
> **อัปเดตล่าสุด:** 2026-07-27 · ประวัติ phase/changelog ทั้งหมด → [CHANGELOG.md](CHANGELOG.md)

---

## 🗺️ Navigation — ถามอะไร ไปที่ไหน

| ถาม | ไปที่ |
|-----|------|
| Schema ตอนนี้ + ประวัติ DB | [database/schema.md](database/schema.md) (Part 1=ปัจจุบัน, Part 2=history+เหตุผล) |
| **Routes ทุก path** | [INDEX_routes.md](INDEX_routes.md) |
| **Key Functions + Database Models** | [INDEX_code.md](INDEX_code.md) |
| **Templates + Design System** | [INDEX_ui.md](INDEX_ui.md) |
| System flow / architecture | [architecture.md](architecture.md) |
| งานที่ทำแล้ว / กำลังทำ | [doc/](doc/) · [log/](log/) |
| Feature backlog | [future_features.md](future_features.md) |
| Redesign หน้าเก่า → bb-* (legacy CSS migration) | [redesign_migration_pattern.md](redesign_migration_pattern.md) |
| Migration .sql ทั้งหมด | [app/migrations/migrations-index.md](../../app/migrations/migrations-index.md) |

---

## 📁 File Map (Top-level)

```
app/
  app.py · models/ (package ตาม domain) · ad_utils.py
  components/               UI component layer (thin Python wrapper รอบ Jinja macro, 2026-06-29):
                            base (BaseComponent) · table (Table/Column → macro bb_table_v2)
                            register_components(app) → jinja global `component(obj)`
  domain/vehicle/           pure logic, ห้าม import flask (Clean Architecture Phase 0-1, 2026-07-19):
                            workflow.py (ALLOWED_TRANSITIONS/guard_budget/apply_transition)
                            fuel.py (calc_fuel_cost — pure)
  services/vehicle/         use-case orchestration: guard→state change→notify (Phase 0-4, 2026-07-19):
                            booking_service.py · mileage_service.py · budget_service.py
  .env (gitignored) · .env.example (template — env vars: architecture.md § Configuration)
  instance/portal.db        SQLite (gitignored)
  logs/app.log              error log กลาง rotate 1MB×5 (gitignored — config ใน app.py, 2026-06-11)
  migrations/*.sql          manual migrations + migrations-index.md
  views/                    10 blueprints (auth/repair/maintenance/vehicle/room/fuel/core)
    core/                   util ข้าม domain: telegram_service · line_service · broadcast · line_webhook(core_bp) · notification_service · notification_cron
    vehicle/                vehicle domain controllers (ตัดจาก vehicle_view.py ขั้น 3, 2026-06-07):
                            vehicle_common (blueprints+shared constant เท่านั้น — Phase 5 เก็บกวาด, ห้ามเพิ่ม logic) · vehicle_booking · vehicle_notification
                            vehicle_admin · vehicle_mileage · vehicle_cost · vehicle_budget
                            vehicle_driver · vehicle_fuel (ย้ายจาก views/fuel_view.py, Phase 1)
  templates/                Jinja2 — see INDEX_ui.md § Templates
  static/<domain>/{css,js}/ domain-scoped assets (ขั้น 5, 2026-06-07): core/ · vehicle/ · repair/ · room/ ...
tools/
  git-hooks/pre-commit      secret guard (enable: git config core.hooksPath tools/git-hooks)
  doc-stats.sh              token budget check
tests/                      pytest — 8 ไฟล์ + conftest.py, 97 case (run: .venv/bin/python -m pytest) — รายละเอียด → architecture.md § Testing
pytest.ini · requirements-dev.txt   (root — pythonpath=app, pytest)
docs/notes/
  INDEX.md (ไฟล์นี้, hub) · INDEX_routes.md · INDEX_code.md · INDEX_ui.md
  architecture.md · design_guideline.md · page_pattern.md (โครงเขียนหน้า) · redesign_migration_pattern.md (migrate หน้าเก่า→bb-*) · task-lifecycle.md · future_features.md
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
| `vehicle_bp` | [views/vehicle/](../../app/views/vehicle/) (def ใน `vehicle_common.py`) | `/vehicle`, `/api` | 28 |
| `adminfleet_bp` | [views/vehicle/](../../app/views/vehicle/) | `/admin/*` | 7 |
| `admincost_bp` | [views/vehicle/](../../app/views/vehicle/) | `/admin/cost`, `/admin/ot/*`, `/vehicle/mileage/override-fuel` | 10 |
| `driver_bp` | [views/vehicle/](../../app/views/vehicle/) | `/driver` | 4 |
| `room_bp` | [app/views/room_view.py](../../app/views/room_view.py) | `/room`, `/api/room` | 5 |
| `fuel_bp` | [app/views/vehicle/vehicle_fuel.py](../../app/views/vehicle/vehicle_fuel.py) | `/admin/fuel`, `/admin/fuel/export`, `/api/fuel` | 14 |
| `core_bp` | [app/views/core/line_webhook.py](../../app/views/core/line_webhook.py) | `/line/webhook`, `/line/link` | 2 |

> **vehicle controller mapping** (vehicle_view.py แตกขั้น 3, 2026-06-07 · service/domain เพิ่ม Clean Architecture refactor Phase 0-5, 2026-07-19):
>
> | route group | controller |
> |---|---|
> | book/edit/delete/cancel/detail/approve/approver/api_bookings/custom_bookings/check_merge | `vehicle_booking.py` |
> | api_notifications/read-all/read/payment_report | `vehicle_notification.py` |
> | admin_trips/notify/revert/repair/fix-done/swap/merge/assign/manage_fleet/service/api_admin_bookings | `vehicle_admin.py` |
> | mileage_log/export | `vehicle_mileage.py` |
> | cost_summary/cost_export/override_fuel/ot_* | `vehicle_cost.py` |
> | budget_manage/budget_personal* | `vehicle_budget.py` |
> | driver_home/ad-hoc/mileage | `vehicle_driver.py` |
> | admin_fuel/reimbursement/bill/price | `vehicle_fuel.py` |
> | helpers: is_vehicle_admin / require_vehicle_admin / EXPENSE_CATEGORIES / TH_MONTHS | `vehicle_common.py` (ห้ามเพิ่ม logic ใหม่ — Phase 5) |
> | approve/reject/cancel/revert/assign gateway | `services/vehicle/booking_service.py` |
> | close_trip/auto_generate_ot/override_fuel_cost/get_fuel_price gateway | `services/vehicle/mileage_service.py` |
> | deduct/refund/top_up/manual_adjust gateway + `_lookup_budget_for_booking` | `services/vehicle/budget_service.py` |
> | state machine: ALLOWED_TRANSITIONS / guard_budget / apply_transition | `domain/vehicle/workflow.py` |
> | pure logic: calc_fuel_cost | `domain/vehicle/fuel.py` |

---

> ⬇️ **ข้อมูลละเอียดอยู่ใน sub-files:**
> - Routes: [INDEX_routes.md](INDEX_routes.md)
> - Functions + Models: [INDEX_code.md](INDEX_code.md)
> - Templates + Design: [INDEX_ui.md](INDEX_ui.md)
