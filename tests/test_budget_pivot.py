"""
Test สำหรับ views/vehicle/vehicle_budget.py::_build_central_dept_pivot — regression กัน bug
2026-08-07: เดิม filter แค่ VehicleBudgetLog.created_at อยู่ในช่วงวันที่ของ plan เท่านั้น ไม่เช็ก
yearly_plan_id FK ทำให้งบที่ผูกก้อนงบอื่น (หรือช่วงเวลาทับกัน) หลุดเข้ามาปนใน "ภาพรวมทั้งปี"
"""
from datetime import datetime

import services.vehicle.budget_service as bs
from models import get_bkk_time
from views.vehicle.vehicle_budget import _build_central_dept_pivot
from conftest import SNAP


def test_pivot_excludes_budget_from_other_plan(session, make_budget, make_mileage):
    b = make_budget(used_amount=0)
    b.yearly_plan_id = 999  # ผูกก้อนงบอื่น ไม่ใช่ก้อนที่กำลังดู (plan_id=1 ด้านล่าง)
    session.commit()
    _, m = make_mileage()
    bs.deduct_for_mileage(m, b, 350, snap=SNAP)
    session.commit()

    fy_start = datetime(2026, 1, 1)
    fy_end   = datetime(2026, 12, 31, 23, 59, 59)

    central, dept, _, _, _, _ = _build_central_dept_pivot(fy_start, fy_end, plan_id=1)

    assert central == {}
    assert dept == {}


def test_pivot_includes_budget_from_matching_plan(session, make_budget, make_mileage):
    b = make_budget(used_amount=0)
    b.yearly_plan_id = 1
    session.commit()
    _, m = make_mileage()
    bs.deduct_for_mileage(m, b, 350, snap=SNAP)
    session.commit()

    fy_start = datetime(2026, 1, 1)
    fy_end   = datetime(2026, 12, 31, 23, 59, 59)

    central, dept, _, _, _, _ = _build_central_dept_pivot(fy_start, fy_end, plan_id=1)

    # make_budget ตั้ง budget_type name เป็น 'central-{n}' (ไม่ใช่ 'central' เป๊ะ) → เข้า dept bucket
    this_month = get_bkk_time().month
    assert dept.get(b.department_id, {}).get(this_month) == 350.0
