from .base import db, get_bkk_time


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
