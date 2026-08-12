from .base import db, get_bkk_time


# ==========================================
# 22. ตาราง FuelBill (บิลค่าน้ำมันเดี่ยว)
# ==========================================
class FuelBill(db.Model):
    __tablename__ = 'fuel_bill'
    id              = db.Column(db.Integer, primary_key=True)
    bill_date       = db.Column(db.Date, nullable=False)                          # วันเติม
    vehicle_id      = db.Column(db.Integer, db.ForeignKey('vehicle.id'), nullable=True)  # null = บิลไม่มีชื่อรถ
    driver_id       = db.Column(db.Integer, db.ForeignKey('driver.id'), nullable=False)  # ผู้เติม
    amount          = db.Column(db.Numeric(10, 2), nullable=False)                # จำนวนเงิน
    payment_method  = db.Column(db.String(20), nullable=False)                    # 'reserve' | 'card' | 'self'
    category        = db.Column(db.String(20), nullable=False, default='fuel')    # fuel|toll|repair|insurance|other
    liters          = db.Column(db.Numeric(8, 2), nullable=True)                  # optional (ไม่บังคับ)
    mileage         = db.Column(db.Integer, nullable=True)                        # เลขไมล์ที่เติม
    note            = db.Column(db.String(500), nullable=True)
    reimbursement_id = db.Column(db.Integer, db.ForeignKey('fuel_reimbursement.id'), nullable=True)
    paid_by_holder_id = db.Column(db.Integer, db.ForeignKey('expense_holder.id'), nullable=True)  # null เมื่อ method ≠ reserve
    created_by      = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at      = db.Column(db.DateTime, default=get_bkk_time)
    updated_at      = db.Column(db.DateTime, onupdate=get_bkk_time, nullable=True)

    vehicle      = db.relationship('Vehicle', foreign_keys=[vehicle_id])
    driver       = db.relationship('Driver', foreign_keys=[driver_id])
    creator      = db.relationship('User', foreign_keys=[created_by])
    reimbursement = db.relationship('FuelReimbursement', foreign_keys=[reimbursement_id], backref='bills')
    paid_by      = db.relationship('ExpenseHolder', foreign_keys=[paid_by_holder_id])


# ==========================================
# 23. ตาราง FuelReimbursement (ใบเบิกรวม — 1 ใบ : N บิล)
# ==========================================
class FuelReimbursement(db.Model):
    __tablename__ = 'fuel_reimbursement'
    id                = db.Column(db.Integer, primary_key=True)
    reimbursement_no  = db.Column(db.String(50), nullable=False)         # เลขใบเบิก เช่น จ69-00164 (กรอกมือ)
    source            = db.Column(db.String(100), nullable=True)         # DEPRECATED free text — ใช้ source_id แทน
    source_id         = db.Column(db.Integer, db.ForeignKey('reimbursement_source.id'), nullable=True)
    status            = db.Column(db.String(20), nullable=False, default='draft')  # draft|submitted|received
    amount_requested  = db.Column(db.Numeric(12, 2), nullable=True)      # ยอดที่เขียนในใบเบิกจริง
    amount_received   = db.Column(db.Numeric(12, 2), nullable=True)      # ยอดที่ได้คืนจริง
    submitted_at      = db.Column(db.Date, nullable=True)                # วันที่ส่งเรื่องเบิก
    received_at       = db.Column(db.Date, nullable=True)                # วันที่ได้เงินคืน
    note              = db.Column(db.String(500), nullable=True)
    created_by        = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at        = db.Column(db.DateTime, default=get_bkk_time)
    updated_at        = db.Column(db.DateTime, onupdate=get_bkk_time, nullable=True)

    creator    = db.relationship('User', foreign_keys=[created_by])
    source_ref = db.relationship('ReimbursementSource', foreign_keys=[source_id])


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
# DEPRECATED 2026-08-10: แทนที่ด้วย ExpenseHolder.float_amount (สำรองรายคน)
#   เก็บตารางไว้อ้างอิงประวัติ ห้ามเขียนเพิ่ม
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
    holder_id     = db.Column(db.Integer, db.ForeignKey('expense_holder.id'), nullable=False)
    log_type      = db.Column(db.String(20), nullable=False, default='adjust')  # set_float|top_up|adjust|count
    change_amount = db.Column(db.Numeric(12, 2), nullable=False)   # +/-
    new_balance   = db.Column(db.Numeric(12, 2), nullable=False)
    note          = db.Column(db.String(500), nullable=False)      # required reason
    created_by    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at    = db.Column(db.DateTime, default=get_bkk_time)

    creator = db.relationship('User', foreign_keys=[created_by])
    holder  = db.relationship('ExpenseHolder', foreign_keys=[holder_id], backref='logs')


# ==========================================
# 27. ตาราง ExpenseHolder (ผู้สำรองเงิน — 1 user : 1 บัญชีสำรอง)
# คงเหลือ = float_amount − ใช้ไปแล้ว − ทำเรื่องเบิกแล้ว → derived ห้ามเก็บเป็น column
# (ดู services/vehicle/fuel_service.py::holder_kpi)
# ==========================================
class ExpenseHolder(db.Model):
    __tablename__ = 'expense_holder'
    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)
    float_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)   # วงเงินสำรองสะสมที่ได้รับ
    is_active    = db.Column(db.Boolean, default=True)
    created_at   = db.Column(db.DateTime, default=get_bkk_time)
    updated_at   = db.Column(db.DateTime, onupdate=get_bkk_time, nullable=True)

    user = db.relationship('User', foreign_keys=[user_id])


# ==========================================
# 28. ตาราง ReimbursementSource (แหล่งเบิก — DCI / วัดพระธรรมกาย)
# ==========================================
class ReimbursementSource(db.Model):
    __tablename__ = 'reimbursement_source'
    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(100), nullable=False)
    is_default = db.Column(db.Boolean, default=False)
    is_active  = db.Column(db.Boolean, default=True)


# ==========================================
# 29. ตาราง VehicleQuota (โควตาต่อรถต่อเดือน — บัตรน้ำมัน / สิทธิ์เบิกตามแหล่ง)
# effective-dated: แก้วงเงิน = INSERT แถวใหม่ ห้าม UPDATE แถวเดิม
#   (ไม่งั้นเดือนย้อนหลังจะคำนวณผิดทันที)
# ==========================================
class VehicleQuota(db.Model):
    __tablename__ = 'vehicle_quota'
    id             = db.Column(db.Integer, primary_key=True)
    vehicle_id     = db.Column(db.Integer, db.ForeignKey('vehicle.id'), nullable=False)
    kind           = db.Column(db.String(20), nullable=False)          # 'card' | 'source'
    source_id      = db.Column(db.Integer, db.ForeignKey('reimbursement_source.id'), nullable=True)
    limit_amount   = db.Column(db.Numeric(12, 2), nullable=False)
    effective_from = db.Column(db.Date, nullable=False)
    created_by     = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at     = db.Column(db.DateTime, default=get_bkk_time)

    vehicle = db.relationship('Vehicle', foreign_keys=[vehicle_id])
    source  = db.relationship('ReimbursementSource', foreign_keys=[source_id])


# ==========================================
# 30. ตาราง ReimbursementSettlement (คืนเงินรายคน — snapshot ตอนกด "ส่งเรื่อง")
# 1 ใบเบิก : N ผู้สำรอง · settled_at = null คือยังไม่ได้เงินคืน
# ==========================================
class ReimbursementSettlement(db.Model):
    __tablename__ = 'reimbursement_settlement'
    id               = db.Column(db.Integer, primary_key=True)
    reimbursement_id = db.Column(db.Integer, db.ForeignKey('fuel_reimbursement.id'), nullable=False)
    holder_id        = db.Column(db.Integer, db.ForeignKey('expense_holder.id'), nullable=False)
    amount           = db.Column(db.Numeric(12, 2), nullable=False)
    settled_at       = db.Column(db.Date, nullable=True)

    reimbursement = db.relationship('FuelReimbursement', foreign_keys=[reimbursement_id],
                                    backref='settlements')
    holder        = db.relationship('ExpenseHolder', foreign_keys=[holder_id])

    __table_args__ = (
        db.UniqueConstraint('reimbursement_id', 'holder_id', name='uq_settlement_rb_holder'),
    )
