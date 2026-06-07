from .base import db, get_bkk_time


# ==========================================
# 15. ตาราง OTRateConfig (อัตรา OT แต่ละ time band)
# ==========================================
class OTRateConfig(db.Model):
    __tablename__ = 'ot_rate_config'
    id         = db.Column(db.Integer, primary_key=True)
    label      = db.Column(db.String(50), nullable=False)   # "เช้ามืด"
    start_time = db.Column(db.String(5),  nullable=False)   # "06:00"
    end_time   = db.Column(db.String(5),  nullable=False)   # "08:00" หรือ "24:00"
    rate       = db.Column(db.Numeric(8, 2), nullable=False)
    is_active  = db.Column(db.Boolean, default=True)
    day_of_week = db.Column(db.Integer, nullable=True)  # NULL=any day, 0=Mon ... 6=Sun (Python weekday()); used by auto_generate_ot() override
    sort_order = db.Column(db.Integer, default=0)


# ==========================================
# 16. ตาราง DriverOT (1 OT record ต่อ 1 booking)
# ==========================================
class DriverOT(db.Model):
    __tablename__ = 'driver_ot'
    id             = db.Column(db.Integer, primary_key=True)
    booking_id     = db.Column(db.Integer, db.ForeignKey('vehicle_booking.id'), nullable=False)
    driver_id      = db.Column(db.Integer, db.ForeignKey('driver.id'), nullable=False)
    ot_number      = db.Column(db.String(20), nullable=False, unique=True)  # "OT-2026-0001"
    date           = db.Column(db.Date, nullable=False)
    total_hours    = db.Column(db.Numeric(6, 2), default=0)
    total_amount   = db.Column(db.Numeric(10, 2), default=0)
    status         = db.Column(db.String(20), default='pending')  # pending|approved|paid
    approved_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    approved_at    = db.Column(db.DateTime, nullable=True)
    paid_by_id     = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    paid_at        = db.Column(db.DateTime, nullable=True)
    note           = db.Column(db.String(500), nullable=True)
    created_at     = db.Column(db.DateTime, default=get_bkk_time)
    created_by_id  = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    booking     = db.relationship('VehicleBooking', foreign_keys=[booking_id], backref='driver_ots')
    driver      = db.relationship('Driver', foreign_keys=[driver_id], backref='ots')
    approved_by = db.relationship('User', foreign_keys=[approved_by_id])
    paid_by     = db.relationship('User', foreign_keys=[paid_by_id])
    created_by  = db.relationship('User', foreign_keys=[created_by_id])
    slots       = db.relationship('DriverOTSlot', backref='driver_ot', cascade='all, delete-orphan')


# ==========================================
# 17. ตาราง DriverOTSlot (time slot แต่ละช่วงใน 1 OT record)
# ==========================================
class DriverOTSlot(db.Model):
    __tablename__ = 'driver_ot_slot'
    id             = db.Column(db.Integer, primary_key=True)
    driver_ot_id   = db.Column(db.Integer, db.ForeignKey('driver_ot.id'), nullable=False)
    rate_config_id = db.Column(db.Integer, db.ForeignKey('ot_rate_config.id'), nullable=True)
    slot_label     = db.Column(db.String(50), nullable=False)   # snapshot label
    start_time     = db.Column(db.String(5),  nullable=False)   # "17:00"
    end_time       = db.Column(db.String(5),  nullable=False)   # "19:00"
    hours          = db.Column(db.Numeric(6, 2), default=0)
    rate           = db.Column(db.Numeric(8, 2), default=0)     # snapshot rate
    amount         = db.Column(db.Numeric(10, 2), default=0)

    rate_config = db.relationship('OTRateConfig')
