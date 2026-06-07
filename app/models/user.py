from flask_login import UserMixin

from .base import db


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
