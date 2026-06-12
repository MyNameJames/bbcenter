# INDEX — จุดเริ่มต้นของ Claude

> **Claude: อ่านไฟล์นี้ก่อนเสมอ** เมื่อต้องหา symbol/route/feature แทนการ glob/grep
> ทุกคอลัมน์ `file:line` คลิกเปิดได้เลย
> **อัปเดตล่าสุด:** 2026-06-11 · ประวัติ phase/changelog ทั้งหมด → [CHANGELOG.md](CHANGELOG.md)

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
| Migration .sql ทั้งหมด | [app/migrations/migrations-index.md](../../app/migrations/migrations-index.md) |

---

## 📁 File Map (Top-level)

```
app/
  app.py · models/ (package ตาม domain) · ad_utils.py
  .env (gitignored) · .env.example (template — env vars: architecture.md § Configuration)
  instance/portal.db        SQLite (gitignored)
  logs/app.log              error log กลาง rotate 1MB×5 (gitignored — config ใน app.py, 2026-06-11)
  migrations/*.sql          manual migrations + migrations-index.md
  views/                    9 blueprints (auth/repair/maintenance/vehicle/room/fuel)
    core/                   util ข้าม domain: telegram_service · notification_service · notification_cron
    vehicle/                vehicle domain (ตัดจาก vehicle_view.py ขั้น 3, 2026-06-07):
                            vehicle_common (blueprints+helpers) · vehicle_booking · vehicle_notification
                            vehicle_admin · vehicle_mileage · vehicle_cost · vehicle_budget
                            vehicle_driver · vehicle_budget_service
  templates/                Jinja2 — see INDEX_ui.md § Templates
  static/<domain>/{css,js}/ domain-scoped assets (ขั้น 5, 2026-06-07): core/ · vehicle/ · repair/ · room/ ...
tools/
  git-hooks/pre-commit      secret guard (enable: git config core.hooksPath tools/git-hooks)
  doc-stats.sh              token budget check
tests/                      pytest — conftest.py + test_budget_service.py (run: .venv/bin/python -m pytest)
pytest.ini · requirements-dev.txt   (root — pythonpath=app, pytest)
docs/notes/
  INDEX.md (ไฟล์นี้, hub) · INDEX_routes.md · INDEX_code.md · INDEX_ui.md
  architecture.md · design_system.md · task-lifecycle.md · future_features.md
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
| `vehicle_bp` | [views/vehicle/](../../app/views/vehicle/) (def ใน `vehicle_common.py`) | `/vehicle`, `/api` | 27 |
| `adminfleet_bp` | [views/vehicle/](../../app/views/vehicle/) | `/admin/*` | 7 |
| `admincost_bp` | [views/vehicle/](../../app/views/vehicle/) | `/admin/cost`, `/admin/ot/*`, `/vehicle/mileage/override-fuel` | 10 |
| `driver_bp` | [views/vehicle/](../../app/views/vehicle/) | `/driver` | 3 |
| `room_bp` | [app/views/room_view.py](../../app/views/room_view.py) | `/room`, `/api/room` | 5 |
| `fuel_bp` | [app/views/fuel_view.py](../../app/views/fuel_view.py) | `/admin/fuel`, `/admin/fuel/export`, `/api/fuel` | 14 |

> **vehicle controller mapping** (vehicle_view.py แตกขั้น 3, 2026-06-07):
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
> | helpers: is_vehicle_admin / _lookup_budget_for_booking / auto_generate_ot / EXPENSE_CATEGORIES | `vehicle_common.py` |

---

> ⬇️ **ข้อมูลละเอียดอยู่ใน sub-files:**
> - Routes: [INDEX_routes.md](INDEX_routes.md)
> - Functions + Models: [INDEX_code.md](INDEX_code.md)
> - Templates + Design: [INDEX_ui.md](INDEX_ui.md)
