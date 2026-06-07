"""
views.core — function กลางที่ไม่ผูก request/blueprint (ย้ายมารวม 2026-06-07, ขั้น 2 module refactor)

- telegram_service     ส่ง Telegram (delete_old → send → save_id)
- notification_service in-app notify (notify_*) — commit ใน _create()
- notification_cron    APScheduler escalation

หมายเหตุ: core = util ข้าม domain เท่านั้น. budget_service (vehicle business logic)
อยู่ที่ views/vehicle/vehicle_budget_service.py ไม่ใช่ที่นี่
"""
