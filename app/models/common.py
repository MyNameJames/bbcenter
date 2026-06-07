from .base import db, get_bkk_time


# ==========================================
# 8. ตาราง SystemConfig (ค่า config กลาง)
# ==========================================
class SystemConfig(db.Model):
    __tablename__ = 'system_config'
    key   = db.Column(db.String(50), primary_key=True)
    value = db.Column(db.String(100), nullable=False)

    @staticmethod
    def get(key, default=None):
        row = SystemConfig.query.get(key)
        return row.value if row else default

    @staticmethod
    def set(key, value):
        row = SystemConfig.query.get(key)
        if row:
            row.value = str(value)
        else:
            db.session.add(SystemConfig(key=key, value=str(value)))
        db.session.commit()


# ==========================================
# 10. ตาราง Notification (การแจ้งเตือนส่วนตัว)
# ==========================================
class Notification(db.Model):
    __tablename__ = 'notification'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    booking_id = db.Column(db.Integer, db.ForeignKey('vehicle_booking.id'), nullable=True)
    message    = db.Column(db.String(255), nullable=False)
    ntype      = db.Column(db.String(20), default='info')   # success | warning | danger | info
    is_read    = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=get_bkk_time)

    # ── Enhanced fields (2026-04-23) ──
    category   = db.Column(db.String(20), default='status')   # status | mileage | budget | payment | payment_admin
    action_url = db.Column(db.String(255), nullable=True)     # ลิงก์ปลายทางเมื่อคลิก (ถ้า null จะใช้ /vehicle/detail/<booking_id>)
    is_sticky  = db.Column(db.Boolean, default=False)         # ปักบนสุด (payment unpaid)
    expired_at = db.Column(db.DateTime, nullable=True)        # ไม่แสดง badge count ถ้าเกิน (null = ไม่หมดอายุ — ใช้กับ payment)
    icon       = db.Column(db.String(40), nullable=True)      # FA icon class (เช่น 'fa-solid fa-circle-check')

    user    = db.relationship('User',           foreign_keys=[user_id])
    booking = db.relationship('VehicleBooking', foreign_keys=[booking_id])
