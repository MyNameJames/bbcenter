from .base import db, get_bkk_time


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
