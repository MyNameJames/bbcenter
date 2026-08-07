from .base import db, get_bkk_time


# ==========================================
# 0. ตาราง BudgetType (ต้องอยู่ก่อนทุกอย่าง)
# ==========================================
class BudgetType(db.Model):
    __tablename__ = 'budget_type'

    id   = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    # seed: (1, 'central'), (2, 'department')


# ==========================================
# 0.2 ตาราง VehicleDepartment (ต้องอยู่ก่อน User)
# ==========================================
class VehicleDepartment(db.Model):
    __tablename__ = 'vehicle_department'

    id             = db.Column(db.Integer, primary_key=True)
    name           = db.Column(db.String(100), unique=True, nullable=False)
    budget_type_id = db.Column(db.Integer, db.ForeignKey('budget_type.id'), nullable=False)
    budget_type    = db.relationship('BudgetType', foreign_keys=[budget_type_id])
    is_disable     = db.Column(db.Integer, default=0)  # 0=active, 1=disable


# ==========================================
# 9. ตาราง VehicleBudget (งบประมาณยานพาหนะ)
# ==========================================
class VehicleBudget(db.Model):
    __tablename__ = 'vehicle_budget'
    id               = db.Column(db.Integer, primary_key=True)

    budget_type_id = db.Column(db.Integer, db.ForeignKey('budget_type.id'), nullable=False)
    budget_type    = db.relationship('BudgetType', foreign_keys=[budget_type_id])

    # central → ชี้ไปที่ row budget_type_id=1 ใน vehicle_department
    # department → ชี้ไปที่แผนกที่รับผิดชอบ
    department_id  = db.Column(db.Integer, db.ForeignKey('vehicle_department.id'), nullable=False)
    department     = db.relationship('VehicleDepartment', foreign_keys=[department_id])

    year             = db.Column(db.Integer, nullable=False)
    month            = db.Column(db.Integer, nullable=False)
    budget_amount    = db.Column(db.Numeric(12, 2), default=0)  # งบที่ตั้งไว้
    used_amount      = db.Column(db.Numeric(12, 2), default=0)  # ใช้ไปแล้ว

    approver_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # สำหรับ department budget เท่านั้น
    approver       = db.relationship('User', foreign_keys=[approver_id])

    # ผูกกับ "เงินก้อนประจำปี" ต้นทาง (2026-07-31) — nullable: งบเก่าก่อน feature นี้ไม่ backfill
    # (admin จะปิดใช้งาน/is_active=False เอง); งบใหม่ตั้งแต่นี้ไปเลือกจาก dropdown ปี งบเสมอ
    yearly_plan_id = db.Column(db.Integer, db.ForeignKey('vehicle_budget_yearly_plan.id'), nullable=True)
    yearly_plan    = db.relationship('VehicleBudgetYearlyPlan', foreign_keys=[yearly_plan_id])

    start_date     = db.Column(db.Date, nullable=True)   # วันเริ่มใช้งบ (ถ้า null = ทั้งเดือน)
    end_date       = db.Column(db.Date, nullable=True)   # วันสิ้นสุดงบ

    # is_active = False → block approve_booking ใหม่ + block top_up/manual_adjust
    # ประวัติ used_amount + ledger ยังอยู่ครบ; KPI total/remaining ไม่นับ inactive
    is_active      = db.Column(db.Boolean, nullable=False, default=True, server_default='1')

    # 1 แผนก + 1 ประเภทงบ + 1 เดือน + 1 yearly_plan = 1 row (v2.28: เดิมไม่มี yearly_plan_id ร่วม
    # constraint — แผนกเดียวกัน+เดือนเดียวกัน แต่คนละ plan (งบประจำปี vs งบพิเศษ) ต้องแยกเป็นคนละ row ได้
    # NULL แต่ละแถวไม่เท่ากันเอง (SQL semantics) → งบเก่าก่อน v2.26 ที่ yearly_plan_id IS NULL ไม่กระทบ)
    __table_args__ = (db.UniqueConstraint('budget_type_id', 'department_id', 'year', 'month', 'yearly_plan_id'),)

    @property
    def remaining(self):
        return self.budget_amount - self.used_amount

    @property
    def percent_used(self):
        if self.budget_amount <= 0:
            return 0
        return min(round(float(self.used_amount) / float(self.budget_amount) * 100, 1), 100)


# ==========================================
# 13. ตาราง DeptApprover (ผู้อนุมัติประจำกอง — many-to-many)
# ==========================================
class DeptApprover(db.Model):
    __tablename__ = 'dept_approver'

    id      = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    dept_id = db.Column(db.Integer, db.ForeignKey('vehicle_department.id'), nullable=False)

    user = db.relationship('User', foreign_keys=[user_id])
    dept = db.relationship('VehicleDepartment', foreign_keys=[dept_id])

    __table_args__ = (db.UniqueConstraint('user_id', 'dept_id', name='uq_dept_approver'),)


# ==========================================
# 27. ตาราง VehicleBudgetLog (ledger ของ vehicle_budget — ทุก mutation ผ่านที่นี่)
# Migration 2026-05-06: vehicle_budget.used_amount กลายเป็น cache ของ SUM(change_amount)
# ==========================================
class VehicleBudgetLog(db.Model):
    __tablename__ = 'vehicle_budget_log'
    id                = db.Column(db.Integer, primary_key=True)
    budget_id         = db.Column(db.Integer, db.ForeignKey('vehicle_budget.id'), nullable=False)
    event_type        = db.Column(db.String(20), nullable=False)   # set_budget|deduct|refund|override|adjust
    change_amount     = db.Column(db.Numeric(12, 2), nullable=False)   # signed: หัก=-, คืน=+, เพิ่มเพดาน=+
    new_used_balance  = db.Column(db.Numeric(12, 2), nullable=False)   # snapshot used_amount หลัง event
    new_budget_amount = db.Column(db.Numeric(12, 2), nullable=False)   # snapshot budget_amount หลัง event
    booking_id        = db.Column(db.Integer, db.ForeignKey('vehicle_booking.id'), nullable=True)
    mileage_id        = db.Column(db.Integer, db.ForeignKey('vehicle_mileage.id'), nullable=True)
    reverses_log_id   = db.Column(db.Integer, db.ForeignKey('vehicle_budget_log.id'), nullable=True)  # self-ref: refund ชี้ไป deduct เดิม
    snap_distance     = db.Column(db.Integer, nullable=True)
    snap_fuel_rate    = db.Column(db.Numeric(8, 2), nullable=True)
    snap_fuel_price   = db.Column(db.Numeric(8, 2), nullable=True)
    note              = db.Column(db.String(500), nullable=False)      # required เหตุผล
    created_by        = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at        = db.Column(db.DateTime, default=get_bkk_time)

    budget   = db.relationship('VehicleBudget', foreign_keys=[budget_id])
    booking  = db.relationship('VehicleBooking', foreign_keys=[booking_id])
    mileage  = db.relationship('VehicleMileage', foreign_keys=[mileage_id])
    reverses = db.relationship('VehicleBudgetLog', remote_side=[id], foreign_keys=[reverses_log_id])
    creator  = db.relationship('User', foreign_keys=[created_by])

    __table_args__ = (
        db.Index('ix_vbl_budget',  'budget_id'),
        db.Index('ix_vbl_booking', 'booking_id'),
        db.Index('ix_vbl_mileage', 'mileage_id'),
    )


# ==========================================
# 28. ตาราง VehicleBudgetYearlyPlan (เงินก้อนประจำปี — ชั้นเหนือ VehicleBudget)
# v2.24 (2026-07-30): เพดานเงินก้อนใหญ่ทั้งปีที่องค์กรได้รับ + แบ่งส่วนกลาง/ส่วนกอง
# ==========================================
class VehicleBudgetYearlyPlan(db.Model):
    __tablename__ = 'vehicle_budget_yearly_plan'

    id = db.Column(db.Integer, primary_key=True)

    # ปีงบเป็น ค.ศ. — เดิม ('unique=True') เคยเป็น key เดียวที่บอกช่วงเวลา (ผูกกับสูตร hardcode
    # "เริ่มมี.ค. จบก.พ.ปีถัดไป" ใน views/vehicle/vehicle_budget.py). ตอนนี้เป็นแค่ label แสดงผล
    # ตัวตนจริงของ plan คือ start_date/end_date ด้านล่าง — ไม่ unique แล้ว เผื่อ plan ถูกแก้/แตกช่วงในอนาคต
    fiscal_year = db.Column(db.Integer, nullable=False)

    total_amount        = db.Column(db.Numeric(12, 2), nullable=False, default=0)  # เงินทั้งปีที่ได้รับ
    central_allocation  = db.Column(db.Numeric(12, 2), nullable=False, default=0)  # เพดานส่วนกลาง

    # ช่วงเวลาที่ plan มีผล (2026-07-31) — explicit แทนสูตร march-hardcode เดิม; ปกติ ~12 เดือน
    # แต่ DB ไม่บังคับ (ไม่มี check constraint) เผื่อ org แก้ปฏิทินงบในอนาคต
    start_date = db.Column(db.Date, nullable=False)
    end_date   = db.Column(db.Date, nullable=False)

    created_at = db.Column(db.DateTime, default=get_bkk_time)
    updated_at = db.Column(db.DateTime, default=get_bkk_time, onupdate=get_bkk_time)

    # v2.28 (2026-08-06): free-text label แยก "งบพิเศษ ทริป X" ออกจาก "งบประมาณประจำปี"
    # เจตนา — ไม่ทำ enum/type column แยก (owner decision, ดู spec §7 out-of-scope)
    name = db.Column(db.String(100), nullable=True)

    # v2.28: plan ที่หน้า budget_manage auto-select เมื่อไม่มี ?plan_id= — invariant "มีได้แค่ 1
    # plan ที่ is_default=True ในคราวเดียว" บังคับที่ service layer (set_default_plan()) ไม่ใช่ DB constraint
    is_default = db.Column(db.Boolean, nullable=False, default=False, server_default='0')

    @property
    def dept_allocation(self):
        # ห้ามเก็บเป็น column แยก — บังคับ total = central + dept เสมอ กันข้อมูลไม่ตรงกัน
        return float(self.total_amount) - float(self.central_allocation)
