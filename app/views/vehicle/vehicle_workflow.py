"""
vehicle_workflow.py — booking state machine กลาง

ใช้งาน:
    from views.vehicle.vehicle_workflow import ALLOWED_TRANSITIONS, guard_budget, apply_transition

ALLOWED_TRANSITIONS  — dict[current_status] → set ของ to_status ที่ทำได้
guard_budget(booking) → (ok: bool, error_msg: str | None) — เช็ค active budget ก่อน approve
apply_transition(booking, to_status, actor_id=None) → (ok, msg) — validate + set status; ไม่ commit
"""
from views.vehicle.vehicle_common import _lookup_budget_for_booking

# ─────────────────────────────────────────────────────────────
# สถานะ booking ที่ระบบรองรับ + transition ที่ allowed
# ─────────────────────────────────────────────────────────────
ALLOWED_TRANSITIONS: dict[str, frozenset] = {
    'pending':          frozenset({'approved', 'waiting_approver', 'rejected', 'cancelled'}),
    'waiting_approver': frozenset({'approved', 'rejected', 'cancelled'}),
    'approved':         frozenset({'cancelled'}),
    'rejected':         frozenset(),
    'cancelled':        frozenset(),
}


def guard_budget(booking) -> tuple[bool, str | None]:
    """เช็ค active budget ครอบวันเดินทาง ก่อน approve
    - expense_type ไม่ใช่ central/department → skip (ok=True เสมอ)
    - ไม่พบงบ active → ok=False + error message
    """
    if booking.expense_type not in ('central', 'department'):
        return True, None
    budget, key_label = _lookup_budget_for_booking(booking)
    if budget is None:
        msg = ('อนุมัติไม่ได้ — ไม่มีงบที่เปิดใช้ครอบวันเดินทางนี้'
               + (f' (หมวด {key_label})' if key_label else '')
               + ' — กรุณาตั้งงบหรือเพิ่มเวลาช่วงงบที่หน้าจัดการงบประมาณก่อน')
        return False, msg
    return True, None


def apply_transition(booking, to_status: str, actor_id: int | None = None) -> tuple[bool, str | None]:
    """เปลี่ยน status booking ถ้า transition allowed
    - ตั้ง booking.updated_by = actor_id ถ้า actor_id ส่งมา (None = ไม่แตะ)
    - ไม่ flush/commit — caller จัดการเอง
    คืน (True, None) ถ้าสำเร็จ หรือ (False, error_msg) ถ้าไม่ allowed
    """
    current = booking.status
    if to_status not in ALLOWED_TRANSITIONS.get(current, frozenset()):
        return False, f'ไม่สามารถเปลี่ยนสถานะจาก {current} → {to_status}'
    booking.status = to_status
    if actor_id is not None:
        booking.updated_by = actor_id
    return True, None
