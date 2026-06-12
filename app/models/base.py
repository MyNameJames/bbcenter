from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta, timezone

db = SQLAlchemy()


# 🟢 สร้างฟังก์ชันดึงเวลาปัจจุบันของไทย (UTC + 7 ชั่วโมง)
# คืน naive datetime — คอลัมน์ DB ทั้งระบบเก็บ naive BKK time ห้ามคืน aware
def get_bkk_time():
    return datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=7)
