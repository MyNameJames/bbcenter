from .base import db, get_bkk_time


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

    # ── โปรไฟล์คนขับ (2026-06-08) — ข้อมูลสำหรับออกใบเสร็จ/เอกสาร ──
    national_id      = db.Column(db.String(20), nullable=True)   # เลขบัตรประชาชน 13 หลัก
    addr_line        = db.Column(db.String(200), nullable=True)  # บ้านเลขที่/หมู่/ถนน
    addr_subdistrict = db.Column(db.String(100), nullable=True)  # ตำบล/แขวง
    addr_district    = db.Column(db.String(100), nullable=True)  # อำเภอ/เขต
    addr_province    = db.Column(db.String(100), nullable=True)  # จังหวัด
    addr_postal      = db.Column(db.String(10),  nullable=True)  # รหัสไปรษณีย์
    id_card_image    = db.Column(db.String(255), nullable=True)  # ไฟล์รูปบัตรประชาชน
    avatar_image     = db.Column(db.String(255), nullable=True)  # ไฟล์รูปโปรไฟล์คนขับ


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

    status        = db.Column(db.String(20), default='pending')   # pending | approved | waiting_approver | rejected | cancelled (Phase 9, 2026-05-22 — soft cancel ผ่าน cancel_booking())
    reject_reason = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=get_bkk_time)
    updated_at = db.Column(db.DateTime, onupdate=get_bkk_time, nullable=True)
    updated_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # ใคร approve/reject/แก้ล่าสุด

    trip_group          = db.Column(db.Integer, nullable=True)   # 1, 2, 3, 4 ...
    assigned_vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicle.id'), nullable=True)
    assigned_vehicle    = db.relationship('Vehicle', foreign_keys='VehicleBooking.assigned_vehicle_id')

    telegram_message_id = db.Column(db.Integer, nullable=True)

    expense_type       = db.Column(db.String(20), nullable=True)   # canonical: 'central'|'department'|'personal'
    central_category   = db.Column(db.String(50), nullable=True)   # หมวดย่อย ถ้า expense_type='central'
    trip_department    = db.Column(db.String(100), nullable=True)   # ชื่อแผนก (display)
    trip_department_id = db.Column(db.Integer, db.ForeignKey('vehicle_department.id'), nullable=True)
    trip_department_ref = db.relationship('VehicleDepartment', foreign_keys=[trip_department_id])
    pickup_location    = db.Column(db.String(200), nullable=True)  # จุดขึ้นรถ

    # Snapshot ณ เวลาที่ admin assign — ป้องกันข้อมูลหายเมื่อแก้/ลบรถ หรือคนขับ
    snap_vehicle_plate = db.Column(db.String(20), nullable=True)   # ทะเบียนรถ
    snap_driver_name   = db.Column(db.String(100), nullable=True)  # ชื่อคนขับ

    # ── Ad-hoc trip (2026-05-18) ─────────────────────────────
    # is_ad_hoc=True → driver สร้างเอง (งานนอกระบบ), ซ่อนจากปฏิทิน /vehicle
    is_ad_hoc = db.Column(db.Boolean, nullable=False, default=False, server_default='0')


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
