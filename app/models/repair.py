from .base import db, get_bkk_time


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
