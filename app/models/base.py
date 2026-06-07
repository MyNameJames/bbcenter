from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta

db = SQLAlchemy()


# 🟢 สร้างฟังก์ชันดึงเวลาปัจจุบันของไทย (UTC + 7 ชั่วโมง)
def get_bkk_time():
    return datetime.utcnow() + timedelta(hours=7)
