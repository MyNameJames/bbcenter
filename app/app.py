import os
from dotenv import load_dotenv
from flask import Flask, redirect, url_for, render_template
from flask_login import LoginManager, current_user, login_required
from models import db, User
from datetime import timedelta
from models import Vehicle # อย่าลืม import Vehicle ด้านบนด้วยนะถ้ายังไม่มี ชั่วคราว

# โหลดตัวแปรจากไฟล์ .env
load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'default_super_secret_key')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{BASE_DIR}/instance/portal.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)  # หมดใน 8 ชั่วโมง

# ผูก Database เข้ากับแอป
db.init_app(app)

# ตั้งค่า Login Manager
login_manager = LoginManager()
login_manager.init_app(app)
# 🛑 จุดสำคัญ: ต้องบอก Flask ว่าหน้า Login ตอนนี้ย้ายไปอยู่ Blueprint 'auth' แล้ว
login_manager.login_view = 'auth.login' 
login_manager.login_message = "กรุณาเข้าสู่ระบบก่อน"  # เปลี่ยนเป็นภาษาไทย
login_manager.login_message_category = "danger"                   # บังคับให้เป็น error สีแดง

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ==========================================
# ลงทะเบียน Blueprints
# ==========================================
from views.auth_view import auth_bp
app.register_blueprint(auth_bp)

from views.repair_view import repair_bp  
app.register_blueprint(repair_bp)

from views.maintenance_view import maintenance_bp 
app.register_blueprint(maintenance_bp)

from views.vehicle_view import vehicle_bp, adminfleet_bp, admincost_bp, driver_bp
app.register_blueprint(vehicle_bp)
app.register_blueprint(adminfleet_bp)
app.register_blueprint(admincost_bp)
app.register_blueprint(driver_bp)

from views.room_view import room_bp
app.register_blueprint(room_bp)

from views.fuel_view import fuel_bp
app.register_blueprint(fuel_bp)


# ==========================================
# Context processors
# ==========================================

@app.context_processor
def inject_approver_pending_count():
    from flask_login import current_user
    from models import VehicleBooking, DeptApprover
    count = 0
    is_budget_approver = False
    if current_user.is_authenticated:
        my_rows = DeptApprover.query.filter_by(user_id=current_user.id).all()
        if my_rows:
            is_budget_approver = True
            my_dept_ids = [r.dept_id for r in my_rows]
            count = VehicleBooking.query.filter(
                VehicleBooking.status == 'waiting_approver',
                VehicleBooking.trip_department_id.in_(my_dept_ids)
            ).count()
    return {'approver_pending_count': count, 'is_budget_approver': is_budget_approver}


# ==========================================

# Route หน้าแรกสุด (เวลาคนพิมพ์แค่ชื่อเว็บ) ให้โยนไปหน้า Login
@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('auth.dashboard'))  # ✅ login แล้ว → ไป dashboard
    return redirect(url_for('auth.login'))           # ยังไม่ login → ไปหน้า login

# ==========================================
# Design System Reference (superadmin only)
# ==========================================
@app.route('/design-system')
@login_required
def design_system_reference():
    if not current_user.is_superadmin:
        return redirect(url_for('auth.dashboard'))
    return render_template('design_system_reference.html')


# ==========================================
# Notification Scheduler (APScheduler)
# ==========================================
# เริ่ม scheduler เฉพาะ process หลัก (ไม่ใช่ reloader child)
# เพื่อกันไม่ให้ cron job รันซ้ำตอน dev mode
import os as _os
if _os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
    try:
        from views.notification_cron import init_scheduler
        init_scheduler(app)
    except Exception as _e:
        print(f"[Scheduler] init error: {_e}")


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5001, debug=True)