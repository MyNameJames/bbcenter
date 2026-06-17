# views/auth_view.py
import os
from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from flask_login import login_user, logout_user, login_required, current_user
from models import db, User, RepairTicket, MaintenanceTicket, RoomBooking, VehicleBooking, get_bkk_time
from ad_utils import check_ad_login
from datetime import datetime

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username').strip().lower()
        password = request.form.get('password')

        is_valid, user_info = check_ad_login(username, password)
        # is_valid = True
        # user_info = {
        #     'full_name': 'Test User', 
        #     'email': 'test@test.com', 
        #     'department': 'IT'
        # }

        if is_valid:
            user = User.query.filter_by(username=username).first()
            if not user:
                user = User(
                    username=username,
                    full_name=user_info['full_name'],
                    email=user_info['email'],
                    department=user_info['department']
                )
                db.session.add(user)
                db.session.commit()

            session.permanent = True        # ← เพิ่มตรงนี้
            login_user(user, remember=True) # ← แก้ตรงนี้

            return redirect(url_for('auth.dashboard'))
        else:
            flash("User หรือ Password ไม่ถูกต้อง!", "danger")

    return render_template('auth/login.html')


# ── Dev Bypass Login ────────────────────────────────────────────────────────
# เปิดใช้ได้เฉพาะเมื่อตั้ง environment variable: DEV_BYPASS=1
# ห้ามใช้ใน production เด็ดขาด
#
# วิธีใช้:
#   DEV_BYPASS=1 python app.py
#   แล้วเปิด /dev/login/pjatuporn ใน browser
# ─────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/dev/login/<username>')
def dev_login(username):
    if os.environ.get('DEV_BYPASS') != '1':
        flash('ไม่อนุญาต', 'danger')
        return redirect(url_for('auth.login'))

    user = User.query.filter_by(username=username).first()
    if not user:
        flash(f'ไม่พบ user: {username}', 'danger')
        return redirect(url_for('auth.login'))

    session.permanent = True
    login_user(user, remember=True)
    return redirect(url_for('auth.dashboard'))


@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth.login'))


# ── หน้า Home (Action Hub) ────────────────────────────────────────────────
# status → (label, vc-badge color suffix)
_VEHICLE_STATUS = {
    'pending':          ('รออนุมัติ',    'warning'),
    'waiting_approver': ('รอผู้อนุมัติ',  'warning'),
    'approved':         ('อนุมัติแล้ว',   'success'),
}
_TICKET_STATUS = {
    'pending':     ('รอรับเรื่อง',     'warning'),
    'in_progress': ('กำลังดำเนินการ',  'blue'),
    'done':        ('เสร็จสิ้น',       'success'),
}


def _build_my_requests(user, limit=12):
    """รวมคำขอของ user ทุก service → list ของ dict normalized เรียง created_at ใหม่สุดก่อน."""
    rows = []

    for b in (VehicleBooking.query
              .filter(VehicleBooking.user_id == user.id,
                      VehicleBooking.status.notin_(['cancelled', 'rejected']))
              .order_by(VehicleBooking.created_at.desc()).limit(limit)):
        label, color = _VEHICLE_STATUS.get(b.status, (b.status, 'neutral'))
        rows.append({'service': 'vehicle', 'icon': 'car',
                     'title': b.destination or b.purpose, 'subtitle': b.purpose,
                     'status_label': label, 'status_color': color,
                     'created_at': b.created_at,
                     'repeat_url': url_for('vehicle.index', copy_from=b.id)})

    for t in (RepairTicket.query.filter_by(user_id=user.id)
              .order_by(RepairTicket.created_at.desc()).limit(limit)):
        label, color = _TICKET_STATUS.get(t.status, (t.status, 'neutral'))
        rows.append({'service': 'repair', 'icon': 'desktop',
                     'title': t.subject, 'subtitle': t.category,
                     'status_label': label, 'status_color': color,
                     'created_at': t.created_at,
                     'repeat_url': url_for('repair.index', copy_from=t.id)})

    for t in (MaintenanceTicket.query.filter_by(user_id=user.id)
              .order_by(MaintenanceTicket.created_at.desc()).limit(limit)):
        label, color = _TICKET_STATUS.get(t.status, (t.status, 'neutral'))
        rows.append({'service': 'maintenance', 'icon': 'building-2',
                     'title': t.subject, 'subtitle': t.category,
                     'status_label': label, 'status_color': color,
                     'created_at': t.created_at,
                     'repeat_url': url_for('maintenance.index', copy_from=t.id)})

    now = get_bkk_time()
    for b in (RoomBooking.query.filter_by(user_id=user.id)
              .order_by(RoomBooking.created_at.desc()).limit(limit)):
        label, color = ('กำลังจะถึง', 'blue') if b.start_time >= now else ('ผ่านแล้ว', 'neutral')
        rows.append({'service': 'room', 'icon': 'users',
                     'title': b.title, 'subtitle': b.room_name,
                     'status_label': label, 'status_color': color,
                     'created_at': b.created_at,
                     'repeat_url': url_for('room.index', copy_from=b.id)})

    rows.sort(key=lambda r: r['created_at'], reverse=True)
    return rows[:limit]


def _build_today_items(user):
    """รายการของ user ที่มีกำหนดวันนี้ (จองรถอนุมัติแล้ว + จองห้อง) เรียงตามเวลาเริ่ม."""
    today = get_bkk_time().date()
    t0 = datetime.combine(today, datetime.min.time())
    t1 = datetime.combine(today, datetime.max.time())
    items = []

    for b in (VehicleBooking.query
              .filter(VehicleBooking.user_id == user.id,
                      VehicleBooking.status == 'approved',
                      VehicleBooking.start_datetime >= t0,
                      VehicleBooking.start_datetime <= t1)
              .order_by(VehicleBooking.start_datetime.asc())):
        items.append({'icon': 'car', 'title': b.destination, 'meta': b.purpose,
                      'sort': b.start_datetime,
                      'time': f"{b.start_datetime:%H:%M}–{b.end_datetime:%H:%M}"})

    for b in (RoomBooking.query
              .filter(RoomBooking.user_id == user.id,
                      RoomBooking.start_time >= t0,
                      RoomBooking.start_time <= t1)
              .order_by(RoomBooking.start_time.asc())):
        items.append({'icon': 'users', 'title': b.title, 'meta': b.room_name,
                      'sort': b.start_time,
                      'time': f"{b.start_time:%H:%M}–{b.end_time:%H:%M}"})

    items.sort(key=lambda i: i['sort'])
    return items


@auth_bp.route('/dashboard')
@login_required
def dashboard():
    return render_template(
        'dashboard/dashboard.html',
        my_requests=_build_my_requests(current_user),
        today_items=_build_today_items(current_user),
    )


@auth_bp.route('/manage_users')
@login_required
def manage_users():
    if not current_user.is_superadmin:
        flash("คุณไม่มีสิทธิ์เข้าถึงหน้าจัดการผู้ใช้งาน", "danger")
        return redirect(url_for('auth.dashboard'))

    users = User.query.all()
    return render_template('usermng/manage_users.html', users=users)


@auth_bp.route('/update_user/<int:id>', methods=['POST'])
@login_required
def update_user(id):
    if not current_user.is_superadmin:
        return redirect(url_for('auth.dashboard'))

    user = User.query.get_or_404(id)
    user.department    = request.form.get('department')
    user.role_repair   = request.form.get('role_repair')
    user.role_maintenance = request.form.get('role_maintenance')
    user.role_vehicle  = request.form.get('role_vehicle')
    user.role_room     = request.form.get('role_room')
    user.is_superadmin = True if request.form.get('is_superadmin') else False

    db.session.commit()
    flash(f"อัปเดตสิทธิ์ของ {user.full_name or user.username} เรียบร้อยแล้ว!", "success")
    return redirect(url_for('auth.manage_users'))