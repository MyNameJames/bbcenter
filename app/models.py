from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime, timedelta

db = SQLAlchemy()

# 🟢 สร้างฟังก์ชันดึงเวลาปัจจุบันของไทย (UTC + 7 ชั่วโมง)
def get_bkk_time():
    return datetime.utcnow() + timedelta(hours=7)

# ==========================================
# 0. ตาราง BudgetType (ต้องอยู่ก่อนทุกอย่าง)
# ==========================================
class BudgetType(db.Model):
    __tablename__ = 'budget_type'

    id   = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    # seed: (1, 'central'), (2, 'department')


# ==========================================
# 0.1 ตาราง ExpenseType (ประเภทค่าใช้จ่าย)
# ==========================================
class ExpenseType(db.Model):
    __tablename__ = 'expense_type'

    id   = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    # seed: (1, 'central'), (2, 'department'), (3, 'personal')


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
# 1. ตาราง User (ต้องอยู่บนสุดเสมอ)
# ==========================================
class User(UserMixin, db.Model):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    full_name = db.Column(db.String(100))
    email = db.Column(db.String(120))
    department    = db.Column(db.String(100))   # string ใช้แสดงผล / backward compat
    department_id = db.Column(db.Integer, db.ForeignKey('vehicle_department.id'), nullable=True)
    dept          = db.relationship('VehicleDepartment', foreign_keys=[department_id])
    
    role_repair = db.Column(db.String(20), default='user')
    role_maintenance = db.Column(db.String(20), default='user')
    role_vehicle = db.Column(db.String(20), default='user')
    role_room = db.Column(db.String(20), default='user')
    is_superadmin = db.Column(db.Boolean, default=False)

    # 🛑 ย้าย Relationship มาไว้ฝั่ง User ให้มันรู้ตัวว่ามีตาราง RepairTicket เชื่อมอยู่
    repair_tickets = db.relationship('RepairTicket', backref='user', lazy=True)
    maintenance_tickets = db.relationship('MaintenanceTicket', backref='user', lazy=True)
    vehicle_bookings = db.relationship('VehicleBooking', foreign_keys='VehicleBooking.user_id', backref='user', lazy=True)
    room_bookings = db.relationship('RoomBooking', backref='user', lazy=True)
    


# ==========================================
# 2. ตาราง RepairTicket (ระบบแจ้งซ่อม)
# ==========================================
class RepairTicket(db.Model):
    __tablename__ = 'repair_ticket'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    urgency = db.Column(db.String(20), nullable=False)
    asset_tag = db.Column(db.String(50))
    location = db.Column(db.String(100), nullable=False)
    subject = db.Column(db.String(150), nullable=False)
    
    # 🟢 เพิ่มคอลัมน์นี้สำหรับเก็บชื่อไฟล์รูป (อนุญาตให้เป็นค่าว่างได้ เพราะบางเคสอาจไม่มีรูป)
    image_file = db.Column(db.String(255), nullable=True) 
    
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=get_bkk_time)

    # 🆕 เพิ่มสำหรับ Admin
    resolved_note = db.Column(db.Text, nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, onupdate=get_bkk_time, nullable=True)




# ==========================================
# 3. ตาราง MaintenanceTicket (ระบบแจ้งซ่อมทั่วไป/อาคาร)
# ==========================================
class MaintenanceTicket(db.Model):
    __tablename__ = 'maintenance_ticket'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    category = db.Column(db.String(50), nullable=False) # ประปา, ไฟฟ้า, แอร์ ฯลฯ
    urgency = db.Column(db.String(20), nullable=False)
    location = db.Column(db.String(100), nullable=False)
    contact_number = db.Column(db.String(20), nullable=False) # 🟢 เบอร์ติดต่อกลับ (สำคัญสำหรับช่างอาคาร)
    subject = db.Column(db.String(150), nullable=False)
    image_file = db.Column(db.String(255), nullable=True)
    
    status = db.Column(db.String(20), default='pending')
    # created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=get_bkk_time)

    resolved_note   = db.Column(db.Text, nullable=True)
    resolved_at     = db.Column(db.DateTime, nullable=True)
    updated_at      = db.Column(db.DateTime, nullable=True)
    repair_cost     = db.Column(db.Numeric(10, 2), nullable=True)
    technician_type = db.Column(db.String(20), nullable=True)
    scheduled_date  = db.Column(db.Date, nullable=True)
    image_after     = db.Column(db.String(255), nullable=True)


# ==========================================
# 4. ตาราง Vehicle (ข้อมูลรถในบริษัท)
# ==========================================
class Vehicle(db.Model):
    __tablename__ = 'vehicle'

    id = db.Column(db.Integer, primary_key=True)
    brand = db.Column(db.String(50), nullable=False)       # ยี่ห้อ เช่น Toyota
    model = db.Column(db.String(50), nullable=False)       # รุ่น เช่น Commuter
    license_plate = db.Column(db.String(20), unique=True, nullable=False) # ทะเบียนรถ (ห้ามซ้ำ)
    capacity = db.Column(db.Integer, nullable=False)       # จำนวนที่นั่งสูงสุด
    status = db.Column(db.String(20), default='active')    # สถานะ: active, maintenance
    fuel_rate = db.Column(db.Numeric(6, 2), default=10.0)
    next_service_date = db.Column(db.Date, nullable=True)
    next_service_km   = db.Column(db.Integer, nullable=True)
    tax_due_date      = db.Column(db.Date, nullable=True)
    repair_note       = db.Column(db.Text, nullable=True)
    repair_started_at = db.Column(db.DateTime, nullable=True)


# ==========================================
# 5.0 ตาราง คนขับ
# ==========================================
class Driver(db.Model):
    __tablename__ = 'driver'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # ผูกกับ User account
    linked_user = db.relationship('User', foreign_keys=[user_id])


# ==========================================
# 5. ตาราง VehicleBooking (ตั๋วการจองรถ/เจ้าภาพทริป)
# ==========================================
class VehicleBooking(db.Model):
    __tablename__ = 'vehicle_booking'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)       # ใครเป็นคนจอง (ผู้ตั้งทริป)
    start_datetime = db.Column(db.DateTime, nullable=False) # วัน-เวลาที่เริ่มใช้รถ
    end_datetime = db.Column(db.DateTime, nullable=False)   # วัน-เวลาที่คืนรถ
    
    destination = db.Column(db.String(200), nullable=False) # สถานที่ปลายทาง เช่น "นิคมอุตสาหกรรมชลบุรี"
    purpose = db.Column(db.String(200), nullable=False)     # วัตถุประสงค์ เช่น "พบลูกค้า"
    
    need_driver     = db.Column(db.Boolean, default=True)        # ต้องการพนักงานขับรถไหม?
    passenger_count = db.Column(db.Integer, nullable=False)      # จำนวนคนไปในทริปนี้

    driver_id = db.Column(db.Integer, db.ForeignKey('driver.id'), nullable=True)
    driver    = db.relationship('Driver', foreign_keys=[driver_id], backref='bookings')

    status        = db.Column(db.String(20), default='pending')   # pending | approved | waiting_approver | rejected
    reject_reason = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=get_bkk_time)
    updated_at = db.Column(db.DateTime, onupdate=get_bkk_time, nullable=True)
    updated_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # ใคร approve/reject/แก้ล่าสุด

    trip_group          = db.Column(db.Integer, nullable=True)   # 1, 2, 3, 4 ...
    assigned_vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicle.id'), nullable=True)
    assigned_vehicle    = db.relationship('Vehicle', foreign_keys='VehicleBooking.assigned_vehicle_id')

    telegram_message_id = db.Column(db.Integer, nullable=True)

    expense_type       = db.Column(db.String(20), nullable=True)   # string ใช้แสดงผล / backward compat
    expense_type_id    = db.Column(db.Integer, db.ForeignKey('expense_type.id'), nullable=True)
    expense_type_ref   = db.relationship('ExpenseType', foreign_keys=[expense_type_id])
    central_category   = db.Column(db.String(50), nullable=True)  # หมวดย่อย ถ้า expense_type=1 (central)
    trip_department    = db.Column(db.String(100), nullable=True)  # string ใช้แสดงผล / backward compat
    trip_department_id = db.Column(db.Integer, db.ForeignKey('vehicle_department.id'), nullable=True)
    trip_department_ref = db.relationship('VehicleDepartment', foreign_keys=[trip_department_id])
    pickup_location    = db.Column(db.String(200), nullable=True)  # จุดขึ้นรถ

    # Snapshot ณ เวลาที่ admin assign — ป้องกันข้อมูลหายเมื่อแก้/ลบรถ หรือคนขับ
    snap_vehicle_plate   = db.Column(db.String(20), nullable=True)   # ทะเบียนรถ
    snap_driver_name     = db.Column(db.String(100), nullable=True)  # ชื่อคนขับ
    snap_department_name = db.Column(db.String(100), nullable=True)  # ชื่อแผนก

    # ── Ad-hoc trip (2026-05-18) ─────────────────────────────
    # is_ad_hoc=True → driver สร้างเอง (งานนอกระบบ), ซ่อนจากปฏิทิน /vehicle
    is_ad_hoc    = db.Column(db.Boolean, nullable=False, default=False, server_default='0')
    # contact_name → free-text ผู้ติดต่อ เมื่อ user_id ไม่ใช่ผู้ติดต่อจริง (driver_id ตั้งเป็นตัวเอง)
    contact_name = db.Column(db.String(100), nullable=True)




# ==========================================
# 6. ตาราง RoomBooking (จองห้องประชุม)
# ==========================================
class RoomBooking(db.Model):
    __tablename__ = 'room_booking'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    room_name = db.Column(db.String(50), nullable=False) # เก็บชื่อ "ห้อง 1" หรือ "ห้อง 2"
    title = db.Column(db.String(255), nullable=False) # หัวข้อการประชุม
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=get_bkk_time)
    


# ==========================================
# 7. ตาราง VehicleMileage (การจดกม.)
# ==========================================
class VehicleMileage(db.Model):
    __tablename__    = 'vehicle_mileage'
    id               = db.Column(db.Integer, primary_key=True)
    booking_id       = db.Column(db.Integer, db.ForeignKey('vehicle_booking.id'), nullable=False)
    odometer_start   = db.Column(db.Integer, nullable=True)
    odometer_end     = db.Column(db.Integer, nullable=True)
    actual_start     = db.Column(db.DateTime, nullable=True)
    actual_end       = db.Column(db.DateTime, nullable=True)
    fuel_cost        = db.Column(db.Numeric(10, 2), default=0)
    noted_by         = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at       = db.Column(db.DateTime, default=get_bkk_time)

    booking          = db.relationship('VehicleBooking', backref='mileage')
    noter            = db.relationship('User', foreign_keys=[noted_by])

    # ข้อ 1: รูปหน้าปัด
    odometer_start_img = db.Column(db.String(255), nullable=True)
    odometer_end_img   = db.Column(db.String(255), nullable=True)

    # ข้อ 2: เติมน้ำมันระหว่างทาง
    refuel        = db.Column(db.Boolean, default=False)
    refuel_amount = db.Column(db.Numeric(10, 2), default=0)
    refuel_img    = db.Column(db.String(255), nullable=True)

    # ข้อ 3: การชำระเงินส่วนตัว (ใช้เฉพาะ booking ที่ expense_type='personal')
    personal_status      = db.Column(db.Integer, default=0)              # 0=pending, 1=paid
    personal_paid_at     = db.Column(db.DateTime, nullable=True)
    personal_paid_by_id  = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    personal_paid_by     = db.relationship('User', foreign_keys=[personal_paid_by_id])

    # ข้อ 4: User แจ้งว่าจ่ายแล้ว (ยังไม่ใช่ยืนยันจริง — รอ admin confirm)
    user_reported_paid   = db.Column(db.Boolean, default=False)
    user_reported_at     = db.Column(db.DateTime, nullable=True)
    last_reminder_at     = db.Column(db.DateTime, nullable=True)   # cron: เตือนล่าสุดเมื่อไหร่ (กันเตือนซ้ำ)

    # ข้อ 5: Budget idempotency (migration 2026-05-06) — ทุก mutation ต้องผ่าน BudgetService
    budget_deducted_at  = db.Column(db.DateTime, nullable=True)                                    # null = ยังไม่เคยหักงบ
    last_budget_log_id  = db.Column(db.Integer, db.ForeignKey('vehicle_budget_log.id'), nullable=True)  # tx ที่ active (ใช้ refund/rededuct)


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

    start_date     = db.Column(db.Date, nullable=True)   # วันเริ่มใช้งบ (ถ้า null = ทั้งเดือน)
    end_date       = db.Column(db.Date, nullable=True)   # วันสิ้นสุดงบ

    # is_active = False → block approve_booking ใหม่ + block top_up/manual_adjust
    # ประวัติ used_amount + ledger ยังอยู่ครบ; KPI total/remaining ไม่นับ inactive
    is_active      = db.Column(db.Boolean, nullable=False, default=True, server_default='1')

    # 1 แผนก + 1 ประเภทงบ + 1 เดือน = 1 row เท่านั้น
    __table_args__ = (db.UniqueConstraint('budget_type_id', 'department_id', 'year', 'month'),)

    @property
    def remaining(self):
        return self.budget_amount - self.used_amount

    @property
    def percent_used(self):
        if self.budget_amount <= 0:
            return 0
        return min(round(float(self.used_amount) / float(self.budget_amount) * 100, 1), 100)


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


# ==========================================
# 11. ตาราง TripPassenger (ขอติดรถ)
# ==========================================
class TripPassenger(db.Model):
    __tablename__ = 'trip_passenger'

    id         = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('vehicle_booking.id', ondelete='CASCADE'), nullable=False)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    status     = db.Column(db.String(20), default='pending')  # pending | approved | rejected | cancelled
    note       = db.Column(db.String(200), nullable=True)     # หมายเหตุจากผู้ขอ
    admin_note = db.Column(db.Text, nullable=True)            # เหตุผลจาก admin

    created_at  = db.Column(db.DateTime, default=get_bkk_time)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    booking  = db.relationship('VehicleBooking', foreign_keys=[booking_id], backref='passengers', passive_deletes=True)
    user     = db.relationship('User', foreign_keys=[user_id])
    reviewer = db.relationship('User', foreign_keys=[reviewed_by])

    __table_args__ = (db.UniqueConstraint('booking_id', 'user_id'),)


# ==========================================
# 12. ตาราง VehicleServiceLog (ประวัติซ่อมบำรุงรถ)
# ==========================================
class VehicleServiceLog(db.Model):
    __tablename__ = 'vehicle_service_log'

    id         = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicle.id', ondelete='CASCADE'), nullable=False)
    noted_by   = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    service_type = db.Column(db.String(30), nullable=False)
    # oil_change | tire | battery | inspection | repair | other

    service_date      = db.Column(db.Date, nullable=False)
    odometer          = db.Column(db.Integer, nullable=True)    # ไมล์ตอนเข้าซ่อม
    cost              = db.Column(db.Numeric(10, 2), default=0)
    vendor            = db.Column(db.String(100), nullable=True) # ชื่ออู่ / ศูนย์บริการ
    description       = db.Column(db.Text, nullable=True)
    next_service_date = db.Column(db.Date, nullable=True)        # sync ไป vehicle.next_service_date
    next_service_km   = db.Column(db.Integer, nullable=True)     # sync ไป vehicle.next_service_km

    created_at = db.Column(db.DateTime, default=get_bkk_time)

    vehicle = db.relationship('Vehicle', foreign_keys=[vehicle_id], backref='service_logs', passive_deletes=True)
    noter   = db.relationship('User', foreign_keys=[noted_by])


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
# 14. ตาราง TripExpenseItem (ค่าใช้จ่ายเพิ่มเติมต่อทริป)
# ==========================================
class TripExpenseItem(db.Model):
    __tablename__ = 'trip_expense_item'

    id         = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('vehicle_booking.id', ondelete='CASCADE'), nullable=False)
    noted_by   = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    expense_type = db.Column(db.String(30), nullable=False)
    # toll | parking | food | other

    amount      = db.Column(db.Numeric(10, 2), nullable=False)
    description = db.Column(db.String(200), nullable=True)
    receipt_img = db.Column(db.String(255), nullable=True)  # รูปใบเสร็จ

    created_at = db.Column(db.DateTime, default=get_bkk_time)

    booking = db.relationship('VehicleBooking', foreign_keys=[booking_id], backref='extra_expenses', passive_deletes=True)
    noter   = db.relationship('User', foreign_keys=[noted_by])


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