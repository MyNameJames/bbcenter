"""
pytest fixtures สำหรับ budget_service tests

- in-memory SQLite (เร็ว, isolated ต่อ test)
- request context ค้างไว้ เพื่อให้ budget_service เข้าถึง flask_login.current_user
  (ไม่ login → AnonymousUserMixin → getattr(current_user,'id',None) คืน None)
- SQLite ปกติไม่ enforce FK → factory สร้างเฉพาะ row ที่ logic แตะจริง
  (ไม่ต้องสร้าง User/Vehicle จริงสำหรับ FK ของ booking/mileage)
"""
import itertools
from datetime import datetime

import pytest
from flask import Flask
from flask_login import LoginManager

from models import (
    db, BudgetType, VehicleDepartment, VehicleBudget,
    VehicleBooking, VehicleMileage,
)

_seq = itertools.count(1)  # กัน unique-constraint ชนกันข้าม test (name ของ dept/budget_type)


@pytest.fixture
def app():
    app = Flask(__name__)
    app.config.update(
        SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        TESTING=True,
        SECRET_KEY='test-only',
    )
    db.init_app(app)
    lm = LoginManager()
    lm.init_app(app)
    lm.user_loader(lambda uid: None)  # ไม่ login → current_user = anonymous
    # test_request_context() ให้ทั้ง app context + request context
    # → current_user ทำงานได้ (anonymous)
    with app.test_request_context():
        db.create_all()
        yield app
        db.session.remove()


@pytest.fixture
def session(app):
    return db.session


# ──────────────────────────────────────────────────────────────
# Factories
# ──────────────────────────────────────────────────────────────
@pytest.fixture
def make_budget(session):
    def _make(budget_amount=1000, used_amount=0, is_active=True,
              year=2026, month=6):
        n = next(_seq)
        bt = BudgetType(name=f'central-{n}')
        session.add(bt)
        session.flush()
        dept = VehicleDepartment(name=f'dept-{n}', budget_type_id=bt.id)
        session.add(dept)
        session.flush()
        b = VehicleBudget(
            budget_type_id=bt.id, department_id=dept.id,
            year=year, month=month,
            budget_amount=budget_amount, used_amount=used_amount,
            is_active=is_active,
        )
        session.add(b)
        session.commit()
        return b
    return _make


@pytest.fixture
def make_mileage(session):
    """สร้าง booking + mileage (FK ไม่ถูก enforce → user_id อ้างค่าหลอกได้)"""
    def _make(fuel_cost=0):
        bk = VehicleBooking(
            user_id=1,
            start_datetime=datetime(2026, 6, 10, 8, 0),
            end_datetime=datetime(2026, 6, 10, 17, 0),
            destination='ปลายทางทดสอบ', purpose='ทดสอบ',
            passenger_count=1,
        )
        session.add(bk)
        session.flush()
        m = VehicleMileage(booking_id=bk.id, fuel_cost=fuel_cost)
        session.add(m)
        session.commit()
        return bk, m
    return _make


SNAP = {'distance': 100, 'fuel_rate': 10, 'fuel_price': 35}
