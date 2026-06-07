from .base import db, get_bkk_time


# ==========================================
# 22. ตาราง FuelBill (บิลค่าน้ำมันเดี่ยว)
# ==========================================
class FuelBill(db.Model):
    __tablename__ = 'fuel_bill'
    id              = db.Column(db.Integer, primary_key=True)
    bill_date       = db.Column(db.Date, nullable=False)                          # วันเติม
    vehicle_id      = db.Column(db.Integer, db.ForeignKey('vehicle.id'), nullable=False)
    driver_id       = db.Column(db.Integer, db.ForeignKey('driver.id'), nullable=False)  # ผู้เติม
    amount          = db.Column(db.Numeric(10, 2), nullable=False)                # จำนวนเงิน
    payment_method  = db.Column(db.String(20), nullable=False)                    # 'transfer' | 'card' | 'self'
    mileage         = db.Column(db.Integer, nullable=True)                        # เลขไมล์ที่เติม
    note            = db.Column(db.String(500), nullable=True)
    reimbursement_id = db.Column(db.Integer, db.ForeignKey('fuel_reimbursement.id'), nullable=True)
    created_by      = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at      = db.Column(db.DateTime, default=get_bkk_time)
    updated_at      = db.Column(db.DateTime, onupdate=get_bkk_time, nullable=True)

    vehicle      = db.relationship('Vehicle', foreign_keys=[vehicle_id])
    driver       = db.relationship('Driver', foreign_keys=[driver_id])
    creator      = db.relationship('User', foreign_keys=[created_by])
    reimbursement = db.relationship('FuelReimbursement', foreign_keys=[reimbursement_id], backref='bills')


# ==========================================
# 23. ตาราง FuelReimbursement (ใบเบิกรวม — 1 ใบ : N บิล)
# ==========================================
class FuelReimbursement(db.Model):
    __tablename__ = 'fuel_reimbursement'
    id                = db.Column(db.Integer, primary_key=True)
    reimbursement_no  = db.Column(db.String(50), nullable=False)         # เลขใบเบิก เช่น จ69-00164
    source            = db.Column(db.String(100), nullable=True)         # แหล่งเบิก เช่น "บางบาล"
    submitted_at      = db.Column(db.Date, nullable=True)                # วันที่ส่งเรื่องเบิก
    received_at       = db.Column(db.Date, nullable=True)                # วันที่ได้เงินคืน
    note              = db.Column(db.String(500), nullable=True)
    created_by        = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at        = db.Column(db.DateTime, default=get_bkk_time)
    updated_at        = db.Column(db.DateTime, onupdate=get_bkk_time, nullable=True)

    creator = db.relationship('User', foreign_keys=[created_by])


# ==========================================
# 24. ตาราง FuelPrice (ราคา/ลิตร ตามช่วงเวลา)
# Replaces SystemConfig['fuel_price']. Lookup: latest effective_date <= target_date
# ==========================================
class FuelPrice(db.Model):
    __tablename__ = 'fuel_price'
    id                = db.Column(db.Integer, primary_key=True)
    effective_date    = db.Column(db.Date, nullable=False, unique=True)
    price_per_liter   = db.Column(db.Numeric(8, 2), nullable=False)
    note              = db.Column(db.String(255), nullable=True)
    created_by        = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at        = db.Column(db.DateTime, default=get_bkk_time)

    creator = db.relationship('User', foreign_keys=[created_by])

    @staticmethod
    def get_for_date(target_date):
        """Latest price where effective_date <= target_date. Returns float or None."""
        row = (FuelPrice.query
               .filter(FuelPrice.effective_date <= target_date)
               .order_by(FuelPrice.effective_date.desc())
               .first())
        return float(row.price_per_liter) if row else None


# ==========================================
# 25. ตาราง FuelReserveConfig (เงินสำรอง — singleton row id=1)
# ==========================================
class FuelReserveConfig(db.Model):
    __tablename__ = 'fuel_reserve_config'
    id          = db.Column(db.Integer, primary_key=True)
    amount      = db.Column(db.Numeric(12, 2), default=0, nullable=False)
    updated_at  = db.Column(db.DateTime, default=get_bkk_time, onupdate=get_bkk_time)
    updated_by  = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    updater = db.relationship('User', foreign_keys=[updated_by])

    @staticmethod
    def get_amount():
        row = FuelReserveConfig.query.get(1)
        return float(row.amount) if row else 0.0


# ==========================================
# 26. ตาราง FuelReserveLog (ประวัติการปรับเงินสำรอง — note required)
# ==========================================
class FuelReserveLog(db.Model):
    __tablename__ = 'fuel_reserve_log'
    id            = db.Column(db.Integer, primary_key=True)
    change_amount = db.Column(db.Numeric(12, 2), nullable=False)   # +/-
    new_balance   = db.Column(db.Numeric(12, 2), nullable=False)
    note          = db.Column(db.String(500), nullable=False)      # required reason
    created_by    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at    = db.Column(db.DateTime, default=get_bkk_time)

    creator = db.relationship('User', foreign_keys=[created_by])
