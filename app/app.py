import os
import logging
from logging.handlers import RotatingFileHandler
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
_secret_key = os.getenv('FLASK_SECRET_KEY')
if not _secret_key:
    raise RuntimeError(
        "FLASK_SECRET_KEY ไม่ได้ตั้งใน .env — ต้องตั้งก่อนรันแอป "
        "(gen ด้วย: python -c \"import secrets; print(secrets.token_hex(24))\")"
    )
app.config['SECRET_KEY'] = _secret_key
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{BASE_DIR}/instance/portal.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)  # หมดใน 8 ชั่วโมง

# ── Logging กลาง (2026-06-11): error ทุก route → logs/app.log (rotate 1MB×5) + console
# ใช้คู่ pattern ใน except block: current_app.logger.exception('<route> failed')
_log_dir = os.path.join(BASE_DIR, 'logs')
os.makedirs(_log_dir, exist_ok=True)
_file_handler = RotatingFileHandler(
    os.path.join(_log_dir, 'app.log'),
    maxBytes=1_000_000, backupCount=5, encoding='utf-8',
)
_file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s [%(module)s] %(message)s'))
logging.basicConfig(level=logging.INFO,
                    handlers=[_file_handler, logging.StreamHandler()])

# ผูก Database เข้ากับแอป
db.init_app(app)

# UI Component layer — jinja global `component(obj)` → obj.render()
from components import (register_components, Table, Column, Badge, Status,
                        Button, Card, KPI, Input, Search, Tabs, Tab,
                        Segmented, Seg, Chip, Token, DateRange,
                        Dropdown, MenuItem, MenuLabel, MenuDivider, MenuRich,
                        Pagination, Modal, Timeline, TLItem)
from markupsafe import Markup
register_components(app)


@app.route('/finance')
@login_required
def finance():
    return render_template('layout.html')


# Living component gallery (dev) — render component จริงผ่าน {{ component(obj) }}
# โตทีละตัวจน absorb static components-gallery.html ได้แล้ว retire ของเก่า
@app.route('/dev/components')
def dev_components():
    demo_vehicles = [
        {'plate': 'กข 1234', 'brand': 'Toyota Hilux', 'rate': 12.5, 'status': ('ใช้งาน', 'ok')},
        {'plate': '1กก 5678', 'brand': 'Isuzu D-Max', 'rate': 11.0, 'status': ('ใช้งาน', 'ok')},
        {'plate': 'ผบ 9012', 'brand': 'Honda City', 'rate': 15.2, 'status': ('พักใช้งาน', 'wr')},
    ]
    table = Table(data=demo_vehicles, info=True, columns=[
        Column(key='plate', label='ทะเบียน'),
        Column(key='brand', label='ยี่ห้อ'),
        Column(key='rate', label='กม./ลิตร', align='end', fmt='{:,.1f}'),
        # Cell Component — สถานะ render ผ่าน Status (badge ในตาราง)
        Column(label='สถานะ', cell=lambda r: Status(r['status'][0], r['status'][1], inline=True)),
    ])
    badges = [Badge('ร่าง'), Badge('ใหม่', 'accent', icon='zap'), Badge('v2.4')]
    statuses = [Status('เสร็จสิ้น', 'ok'), Status('รออนุมัติ', 'wr'),
                Status('ยกเลิก', 'dg'), Status('กำลังเดินทาง', 'info'),
                Status('ร่าง', 'neutral')]
    inline_statuses = [Status('เสร็จสิ้น', 'ok', inline=True, icon='check-circle-2'),
                       Status('รออนุมัติ', 'wr', inline=True, icon='clock'),
                       Status('ยกเลิก', 'dg', inline=True, icon='x-circle')]
    buttons = [Button('บันทึก'), Button('ส่งออก', 'sec', icon='download'),
               Button('ยกเลิก', 'ghost'), Button('ลบ', 'danger', icon='trash-2'),
               Button('เล็ก', 'pri', size='sm'),
               Button(variant='sec', icon='settings', icon_only=True),
               Button('ปิดใช้งาน', 'pri', disabled=True)]
    card = Card(title='สรุปการใช้รถ', link='ดูทั้งหมด',
                body=Markup('เนื้อหาในการ์ด — ตาราง, ฟอร์ม, KPI, อะไรก็ได้'))
    kpis = [KPI('ระยะทางรวม', '12,480', icon='route', den='กม.', delta='8.2%', delta_dir='up'),
            KPI('งบคงเหลือ', '฿ 84,200', icon='wallet', variant='ghost', delta='3.1%', delta_dir='down')]
    inputs = [Input('driver', label='ชื่อผู้ขับ', placeholder='กรอกชื่อ-นามสกุล'),
              Input('mile', label='เลขไมล์', icon='gauge', placeholder='0', hint='หน่วยกิโลเมตร'),
              Input('budget', label='งบประมาณ', value='-500', error='ต้องมากกว่า 0')]
    search = Search(placeholder='ค้นหาทะเบียน, ผู้ขับ, ปลายทาง…')
    tabs = Tabs([Tab('ทั้งหมด', 128, active=True), Tab('รออนุมัติ', 12),
                 Tab('กำลังเดินทาง', 8), Tab('เสร็จสิ้น', 96)])
    segmented = Segmented([Seg('วันนี้', active=True), Seg('7 วัน'),
                           Seg('30 วัน'), Seg('ปีนี้')])
    chips = [Chip('ทั้งหมด', 128, active=True), Chip('รออนุมัติ', 12),
             Chip('เสร็จสิ้น', 96)]
    tokens = [Token('แผนก', '=', 'ขนส่ง'), Token('สถานะ', 'is', 'รออนุมัติ')]
    daterange = DateRange(placeholder='เลือกช่วงวันที่')
    dropdown = Dropdown('ขนส่ง', hint='แผนก:', width=220, items=[
        MenuLabel('เลือกสถานะ'),
        MenuItem('รออนุมัติ', active=True),
        MenuItem('อนุมัติแล้ว'),
        MenuItem('ยกเลิก'),
        MenuDivider(),
        MenuRich('เฉพาะของฉัน', 'แสดงเฉพาะรายการที่ฉันสร้าง'),
    ])
    pagination = Pagination(total=128, page=1, limit=20, edge=2)
    modal = Modal('ยืนยันการลบ', sub='รายการนี้จะถูกลบถาวร', overlay=False,
                  body=Markup('ต้องการลบบันทึกการเดินทาง <b>กข 1234</b> ใช่หรือไม่? '
                              'การกระทำนี้ย้อนกลับไม่ได้'),
                  actions=[Button('ยกเลิก', 'sec'), Button('ลบรายการ', 'danger')])
    timeline = Timeline([
        TLItem('สร้างคำขอ', '08:30', 'โดย สมชาย ใจดี', state='done'),
        TLItem('รออนุมัติ', '09:15', 'หัวหน้าแผนกขนส่ง', state='cur'),
        TLItem('เริ่มเดินทาง', state='todo'),
    ])
    return render_template('dev/components.html', table=table, badges=badges,
                           statuses=statuses, inline_statuses=inline_statuses,
                           buttons=buttons, card=card, kpis=kpis, inputs=inputs,
                           search=search, tabs=tabs, segmented=segmented,
                           chips=chips, tokens=tokens, daterange=daterange,
                           dropdown=dropdown, pagination=pagination,
                           modal=modal, timeline=timeline)

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

from views.vehicle import vehicle_bp, adminfleet_bp, admincost_bp, driver_bp
app.register_blueprint(vehicle_bp)
app.register_blueprint(adminfleet_bp)
app.register_blueprint(admincost_bp)
app.register_blueprint(driver_bp)

from views.room_view import room_bp
app.register_blueprint(room_bp)

from views.fuel_view import fuel_bp
app.register_blueprint(fuel_bp)

from views.core.line_webhook import core_bp
app.register_blueprint(core_bp)


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


# Sidebar badge: "อนุมัติรถ" — count of pending bookings whose start_datetime
# falls on tomorrow (BKK time). Only computed for vehicle admins / superadmins.
@app.context_processor
def inject_admin_pending_tomorrow():
    from flask_login import current_user
    from models import VehicleBooking, get_bkk_time
    from datetime import datetime, timedelta, time
    if not current_user.is_authenticated:
        return {}
    if not (current_user.role_vehicle == 'admin' or current_user.is_superadmin):
        return {}
    tomorrow_date = (get_bkk_time() + timedelta(days=1)).date()
    day_start = datetime.combine(tomorrow_date, time.min)
    day_end   = datetime.combine(tomorrow_date, time.max)
    count = VehicleBooking.query.filter(
        VehicleBooking.status == 'pending',
        VehicleBooking.start_datetime >= day_start,
        VehicleBooking.start_datetime <= day_end,
    ).count()
    return {'pending_count': count}


# ==========================================

# Route หน้าแรกสุด (เวลาคนพิมพ์แค่ชื่อเว็บ) ให้โยนไปหน้า Login
@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('auth.dashboard'))  # ✅ login แล้ว → ไป dashboard
    return redirect(url_for('auth.login'))           # ยังไม่ login → ไปหน้า login

# ==========================================
# Notification Scheduler (APScheduler)
# ==========================================
# เริ่ม scheduler เฉพาะ process หลัก (ไม่ใช่ reloader child)
# เพื่อกันไม่ให้ cron job รันซ้ำตอน dev mode
import os as _os
if _os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
    try:
        from views.core.notification_cron import init_scheduler
        init_scheduler(app)
    except Exception as _e:
        print(f"[Scheduler] init error: {_e}")


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    debug_mode = os.getenv('FLASK_DEBUG', '0') == '1'
    app.run(host='0.0.0.0', port=5001, debug=debug_mode)