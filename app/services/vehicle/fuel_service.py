"""
FuelService — เงินสำรองรายคน (ExpenseHolder) + โควตารถต่อเดือน (VehicleQuota)

ทุกสูตรเงินของหน้า "เงินสำรองและค่าใช้จ่าย" อยู่ที่นี่ที่เดียว — ห้าม copy สูตรไป
controller/template (ADR 0001) เพราะสูตรเดียวกันถูกใช้ 3 จุด (KPI bar · ตอนกรอกบิล ·
ตอนใส่บิลเข้าใบเบิก) ถ้าแยกกันจะ drift ทันที

สมการที่ต้องเป็นจริงตลอดเวลา (spec 2026-08-10 §1.ก):
    วงเงินสำรอง(H) = คงเหลือ(H) + ใช้ไปแล้ว(H) + ทำเรื่องเบิกแล้ว(H)

มิติ "เงิน" นับเฉพาะบิล payment_method='reserve' · มิติ "น้ำมัน" (pivot) นับทุกใบ

ตาราง: expense_holder, reimbursement_settlement, vehicle_quota, reimbursement_source
Migration: 2026-08-10_fuel-reserve-multi-holder.sql
"""
import logging
from calendar import monthrange
from datetime import date
from decimal import Decimal

from sqlalchemy import extract, func, or_

from domain.vehicle.fuel import D0, remaining_balance, PAYMENT_METHODS, BILL_CATEGORIES
from models import (
    db, get_bkk_time, ExpenseHolder, FuelBill, FuelReimbursement, FuelReserveLog,
    ReimbursementSettlement, ReimbursementSource, VehicleQuota,
)

_log = logging.getLogger(__name__)


def _dec(value) -> Decimal:
    return Decimal(str(value or 0))


def month_end(year: int, month: int) -> date:
    """วันสุดท้ายของเดือน — ใช้ตัด effective_from ของ vehicle_quota"""
    return date(year, month, monthrange(year, month)[1])


# ──────────────────────────────────────────────────────────────
# KPI เงินสำรองรายคน
# ──────────────────────────────────────────────────────────────
def get_holder(user_id) -> ExpenseHolder:
    """บัญชีสำรองของ user (None = ไม่ได้เป็นผู้สำรองเงิน → KPI ว่างเปล่า, D2)"""
    if not user_id:
        return None
    return ExpenseHolder.query.filter_by(user_id=user_id, is_active=True).first()


def holder_used(holder_id) -> Decimal:
    """ใช้ไปแล้ว = ควักเงินจ่ายแล้วแต่ยังไม่ได้ยื่นเรื่องเบิก

    รวมบิลที่อยู่ในใบเบิกสถานะ 'draft' ด้วย — ใบร่างเป็นแค่ตะกร้ารวมบิล ยังไม่ได้ส่งเรื่อง
    จึงยังไม่มี settlement ถ้าไม่นับตรงนี้ ยอดจะหายไปจากสมการ §1.ก ระหว่างที่บิลนอนอยู่ในร่าง
    """
    total = (db.session.query(func.coalesce(func.sum(FuelBill.amount), 0))
             .outerjoin(FuelReimbursement, FuelBill.reimbursement_id == FuelReimbursement.id)
             .filter(FuelBill.payment_method == 'reserve',
                     FuelBill.paid_by_holder_id == holder_id,
                     or_(FuelBill.reimbursement_id.is_(None),
                         FuelReimbursement.status == 'draft'))
             .scalar())
    return _dec(total)


def holder_submitted(holder_id) -> Decimal:
    """ทำเรื่องเบิกแล้ว = snapshot ตอนกด "ส่งเรื่อง" ที่ยังไม่ได้รับเงินคืน"""
    total = (db.session.query(func.coalesce(func.sum(ReimbursementSettlement.amount), 0))
             .filter(ReimbursementSettlement.holder_id == holder_id,
                     ReimbursementSettlement.settled_at.is_(None))
             .scalar())
    return _dec(total)


def holder_kpi(holder) -> dict:
    """ตัวเลข 4 ตัวของ KPI bar — holder=None คืนศูนย์ทั้งหมด + has_holder=False (D2)"""
    if holder is None:
        return {'has_holder': False, 'holder_id': None,
                'float_amount': D0, 'used': D0, 'submitted': D0, 'balance': D0}
    used = holder_used(holder.id)
    submitted = holder_submitted(holder.id)
    float_amount = _dec(holder.float_amount)
    return {
        'has_holder': True,
        'holder_id': holder.id,
        'float_amount': float_amount,
        'used': used,
        'submitted': submitted,
        'balance': remaining_balance(float_amount, used, submitted),
    }


def all_holder_kpis() -> list:
    """KPI ของผู้สำรองทุกคน — tab เจ้าหน้าที่ (P2)"""
    holders = (ExpenseHolder.query
               .order_by(ExpenseHolder.is_active.desc(), ExpenseHolder.id)
               .all())
    return [{'holder': h, **holder_kpi(h)} for h in holders]


# ──────────────────────────────────────────────────────────────
# เงินสำรองรายคน — mutation (D8: ทุก action บังคับกรอกเหตุผล + log ทุกครั้ง)
# ──────────────────────────────────────────────────────────────
def _require_note(note: str):
    if not (note or '').strip():
        raise ValueError('ต้องกรอกเหตุผล')


def _write_log(holder, log_type, change_amount, new_balance, note, actor_id):
    db.session.add(FuelReserveLog(
        holder_id=holder.id, log_type=log_type,
        change_amount=change_amount, new_balance=new_balance,
        note=note.strip(), created_by=actor_id,
    ))


def create_holder(user_id, float_amount, note: str, actor_id) -> ExpenseHolder:
    """เพิ่มเจ้าหน้าที่ผู้สำรองเงิน — 1 user ผูกได้บัญชีเดียว (unique)"""
    _require_note(note)
    if ExpenseHolder.query.filter_by(user_id=user_id).first():
        raise ValueError('ผู้ใช้นี้เป็นผู้สำรองเงินอยู่แล้ว')
    amt = _dec(float_amount)
    holder = ExpenseHolder(user_id=user_id, float_amount=amt, is_active=True)
    db.session.add(holder)
    db.session.flush()
    _write_log(holder, 'set_float', amt, amt, note, actor_id)
    db.session.commit()
    return holder


def set_float(holder: ExpenseHolder, new_amount, note: str, actor_id) -> ExpenseHolder:
    """ตั้ง/แก้วงเงินสำรอง (absolute) — D6 เจ้าหน้าที่ตั้งเองได้ · D8 บังคับเหตุผล"""
    _require_note(note)
    new_amt = _dec(new_amount)
    change = new_amt - _dec(holder.float_amount)
    holder.float_amount = new_amt
    _write_log(holder, 'set_float', change, new_amt, note, actor_id)
    db.session.commit()
    return holder


def top_up(holder: ExpenseHolder, amount, note: str, actor_id) -> ExpenseHolder:
    """เติมเงินสำรอง (incremental, +เท่านั้น)"""
    _require_note(note)
    amt = _dec(amount)
    if amt <= D0:
        raise ValueError('จำนวนเติมต้องมากกว่า 0')
    holder.float_amount = _dec(holder.float_amount) + amt
    _write_log(holder, 'top_up', amt, holder.float_amount, note, actor_id)
    db.session.commit()
    return holder


def adjust_float(holder: ExpenseHolder, change_amount, note: str, actor_id) -> ExpenseHolder:
    """ปรับยอด (+/-) — ใช้เป็นขั้นที่ 2 หลัง count_cash เจอส่วนต่าง (auditable 2 ขั้น ไม่รวบ)"""
    _require_note(note)
    change = _dec(change_amount)
    if change == D0:
        raise ValueError('จำนวนปรับต้องไม่เป็นศูนย์')
    holder.float_amount = _dec(holder.float_amount) + change
    _write_log(holder, 'adjust', change, holder.float_amount, note, actor_id)
    db.session.commit()
    return holder


def count_cash(holder: ExpenseHolder, counted_amount, note: str, actor_id) -> Decimal:
    """นับเงินในมือจริง — เทียบกับ "คงเหลือ" (derived) แล้ว log ไว้เป็นหลักฐานเท่านั้น
    ไม่แก้ float_amount — ถ้าต้องปรับจริงให้เรียก adjust_float() แยกอีกขั้น
    คืนค่า variance = counted − คงเหลือ (0 = ตรง, ลบ = เงินขาด, บวก = เงินเกิน)
    """
    _require_note(note)
    kpi = holder_kpi(holder)
    variance = _dec(counted_amount) - kpi['balance']
    _write_log(holder, 'count', variance, kpi['float_amount'], note, actor_id)
    db.session.commit()
    return variance


# ──────────────────────────────────────────────────────────────
# โควตารถต่อเดือน (effective-dated)
# ──────────────────────────────────────────────────────────────
def quota_limit(vehicle_id, kind, year, month, source_id=None) -> Decimal:
    """วงเงินที่บังคับใช้ในเดือนนั้น — แถวที่ effective_from ล่าสุดแต่ยังไม่เกินสิ้นเดือน
    คืน None = ไม่ได้ตั้งโควตาไว้ (≠ 0 ซึ่งแปลว่าตั้งไว้ว่าใช้ไม่ได้)
    """
    if not vehicle_id:
        return None
    row = (VehicleQuota.query
           .filter(VehicleQuota.vehicle_id == vehicle_id,
                   VehicleQuota.kind == kind,
                   VehicleQuota.source_id == source_id,
                   VehicleQuota.effective_from <= month_end(year, month))
           .order_by(VehicleQuota.effective_from.desc(), VehicleQuota.id.desc())
           .first())
    return _dec(row.limit_amount) if row else None


def quota_used(vehicle_id, kind, year, month, source_id=None, exclude_bill_id=None) -> Decimal:
    """ยอดที่กินโควตาไปแล้วในเดือนนั้น — นับตาม bill_date (วันเติมจริง) ไม่ใช่วันกรอก (A1)"""
    q = (db.session.query(func.coalesce(func.sum(FuelBill.amount), 0))
         .filter(FuelBill.vehicle_id == vehicle_id,
                 extract('year', FuelBill.bill_date) == year,
                 extract('month', FuelBill.bill_date) == month))
    if kind == 'card':
        q = q.filter(FuelBill.payment_method == 'card')
    else:
        q = (q.join(FuelReimbursement, FuelBill.reimbursement_id == FuelReimbursement.id)
              .filter(FuelReimbursement.source_id == source_id))
    if exclude_bill_id:
        q = q.filter(FuelBill.id != exclude_bill_id)
    return _dec(q.scalar())


def quota_status(vehicle_id, kind, year, month, source_id=None, exclude_bill_id=None) -> dict:
    """{limit, used, remaining} — คืน None ถ้ารถคันนี้ไม่ได้ตั้งโควตาชนิดนี้ไว้"""
    limit = quota_limit(vehicle_id, kind, year, month, source_id)
    if limit is None:
        return None
    used = quota_used(vehicle_id, kind, year, month, source_id, exclude_bill_id)
    return {
        'vehicle_id': vehicle_id, 'kind': kind, 'source_id': source_id,
        'year': year, 'month': month,
        'limit': limit, 'used': used, 'remaining': limit - used,
    }


def _active_quota_keys(year, month) -> list:
    """(vehicle_id, kind, source_id) ทุกชุดที่มีผลในเดือนนั้น (ไม่ซ้ำ)"""
    rows = (db.session.query(VehicleQuota.vehicle_id, VehicleQuota.kind, VehicleQuota.source_id)
            .filter(VehicleQuota.effective_from <= month_end(year, month))
            .distinct()
            .all())
    return [tuple(r) for r in rows]


def quota_lines(year, month, top=2) -> list:
    """บรรทัดโควตาใน KPI bar — เอาที่เหลือมากที่สุด `top` อันดับ คละบัตร/แหล่งเบิก (D3)
    ตัดตัวที่เหลือ ≤ 0 ทิ้ง (ไม่มีอะไรให้ใช้แล้ว = ไม่ต้องโชว์)
    """
    lines = []
    for vehicle_id, kind, source_id in _active_quota_keys(year, month):
        st = quota_status(vehicle_id, kind, year, month, source_id)
        if st and st['remaining'] > 0:
            lines.append(st)
    lines.sort(key=lambda s: s['remaining'], reverse=True)
    return lines[:top]


def card_quota_error(vehicle_id, bill_date, amount, exclude_bill_id=None) -> str:
    """ข้อความ error ถ้าบิล 'card' ใบนี้ทำให้เกินโควตาบัตรของเดือนนั้น (§4.5 block)
    คืน None = ผ่าน · ไม่ได้ตั้งโควตาไว้ = ผ่าน (ไม่ block ของที่ยังไม่ได้ config)
    """
    if not (vehicle_id and bill_date):
        return None
    st = quota_status(vehicle_id, 'card', bill_date.year, bill_date.month,
                      exclude_bill_id=exclude_bill_id)
    if st is None:
        return None
    if _dec(amount) > st['remaining']:
        return (f"เกินวงเงินบัตรของเดือนนี้ — เหลือ {st['remaining']:,.2f} บาท "
                f"(วงเงิน {st['limit']:,.2f}) กรุณาเปลี่ยนเป็นเงินสำรอง")
    return None


# ──────────────────────────────────────────────────────────────
# บิลใหม่ / แก้ไขบิล — validate ตาม spec §4.5
# ──────────────────────────────────────────────────────────────
def latest_bill_mileage(vehicle_id, exclude_bill_id=None):
    """เลขไมล์ล่าสุดที่เคยบันทึกในบิลของรถคันนี้ (เรียงตาม bill_date) — None = ยังไม่มีประวัติ"""
    if not vehicle_id:
        return None
    q = (FuelBill.query
         .filter(FuelBill.vehicle_id == vehicle_id, FuelBill.mileage.isnot(None))
         .order_by(FuelBill.bill_date.desc(), FuelBill.id.desc()))
    if exclude_bill_id:
        q = q.filter(FuelBill.id != exclude_bill_id)
    row = q.first()
    return row.mileage if row else None


def _check_mileage(vehicle_id, mileage, exclude_bill_id=None):
    """คืน warning string (หรือ None) — raise ValueError ถ้าไมล์ย้อนหลัง (block)"""
    if mileage is None:
        return None
    latest = latest_bill_mileage(vehicle_id, exclude_bill_id)
    if latest is None:
        return None
    if mileage < latest:
        raise ValueError(f'เลขไมล์ต้องไม่น้อยกว่าไมล์ล่าสุดที่บันทึกไว้ ({latest:,} กม.)')
    if mileage - latest > 2000:
        return f'เลขไมล์กระโดด {mileage - latest:,} กม. จากครั้งก่อน (>2,000 กม.) — ตรวจสอบว่าถูกต้อง'
    return None


def _resolve_paid_by(method, holder_id):
    """card/self → null เสมอ (§4.5) · reserve → holder ที่เลือก (เปลี่ยนได้จาก default)"""
    return holder_id if method == 'reserve' else None


def _apply_bill_fields(bill, *, bill_date, vehicle_id, driver_id, amount, method,
                       category, liters, mileage, note, paid_by_holder_id,
                       exclude_bill_id=None):
    """validate + set field บน bill object (ใช้ร่วมกัน create/update) — คืน list ของ warning"""
    if not driver_id:
        raise ValueError('กรุณาเลือกคนขับ')
    if method not in PAYMENT_METHODS:
        raise ValueError('ช่องทางชำระไม่ถูกต้อง')
    if method == 'reserve' and not paid_by_holder_id:
        # review 2026-08-10 #2: บิล reserve ที่ไม่มี holder เคยหลุดผ่านได้ → เงินหายจาก
        # สมการ §1.ก เงียบๆ ตอน submit_reimbursement (ไม่เจอ holder ให้ผูก settlement)
        raise ValueError('บิลจ่ายด้วยเงินสำรอง ต้องเลือกผู้สำรองจ่าย')
    if category not in BILL_CATEGORIES:
        category = 'fuel'

    warnings = []
    mileage_warning = _check_mileage(vehicle_id, mileage, exclude_bill_id)
    if mileage_warning:
        warnings.append(mileage_warning)

    if method == 'card':
        err = card_quota_error(vehicle_id, bill_date, amount, exclude_bill_id)
        if err:
            raise ValueError(err)

    bill.bill_date = bill_date
    bill.vehicle_id = vehicle_id
    bill.driver_id = driver_id
    bill.amount = _dec(amount)
    bill.payment_method = method
    bill.category = category
    bill.liters = (_dec(liters) if liters not in (None, '') else None)
    bill.mileage = mileage
    bill.note = note
    bill.paid_by_holder_id = _resolve_paid_by(method, paid_by_holder_id)
    return warnings


def create_bill(*, bill_date, vehicle_id, driver_id, amount, method, category='fuel',
                liters=None, mileage=None, note=None, paid_by_holder_id=None, actor_id):
    """สร้างบิล + validate ตาม §4.5 · คืน (bill, warnings) — warnings ไม่ block แค่แจ้งเตือน"""
    bill = FuelBill(created_by=actor_id)
    warnings = _apply_bill_fields(
        bill, bill_date=bill_date, vehicle_id=vehicle_id, driver_id=driver_id,
        amount=amount, method=method, category=category, liters=liters,
        mileage=mileage, note=note, paid_by_holder_id=paid_by_holder_id)
    db.session.add(bill)
    db.session.commit()
    return bill, warnings


def update_bill(bill: FuelBill, *, bill_date, vehicle_id, driver_id, amount, method,
                category='fuel', liters=None, mileage=None, note=None,
                paid_by_holder_id=None, actor_id):
    """แก้ไขบิล + validate — เช็กไมล์/โควตาไม่เอาบิลตัวเองมานับ (exclude_bill_id)
    บิลที่อยู่ในใบเบิก submitted/received แก้ไม่ได้ (D9)"""
    if bill.reimbursement_id is not None and bill.reimbursement.status != 'draft':
        raise ValueError('บิลนี้อยู่ในใบเบิกที่ส่งเรื่องแล้ว แก้ไขไม่ได้')
    warnings = _apply_bill_fields(
        bill, bill_date=bill_date, vehicle_id=vehicle_id, driver_id=driver_id,
        amount=amount, method=method, category=category, liters=liters,
        mileage=mileage, note=note, paid_by_holder_id=paid_by_holder_id,
        exclude_bill_id=bill.id)
    db.session.commit()
    return bill, warnings


# ──────────────────────────────────────────────────────────────
# ใบเบิก (draft) — สร้าง + ใส่บิล
# ──────────────────────────────────────────────────────────────
def create_draft_reimbursement(reimbursement_no, source_id, note, actor_id) -> FuelReimbursement:
    if not (reimbursement_no or '').strip():
        raise ValueError('กรุณากรอกเลขที่ใบเบิก')
    rb = FuelReimbursement(reimbursement_no=reimbursement_no.strip(), source_id=source_id,
                           status='draft', note=(note or '').strip() or None,
                           created_by=actor_id)
    db.session.add(rb)
    db.session.commit()
    return rb


def attach_bills_to_reimbursement(bill_ids, reimbursement: FuelReimbursement, actor_id) -> list:
    """ใส่บิลที่เลือกเข้าใบเบิก (ต้องเป็น draft) — ดึงเฉพาะบิล reserve ที่ยังไม่เคยเข้าใบเบิกไหน
    เช็กโควตาแหล่งเบิกต่อรถต่อเดือน (kind='source') ถ้าเกิน = **เตือน** (ไม่ block — ต่างจากบัตร
    ที่ block เพราะบัตรมีเพดานจริงต้องคุมเข้ม ส่วนแหล่งเบิกคุมหลวมกว่าตามที่ยืนยัน) · คืน list of warning
    """
    if reimbursement.status != 'draft':
        raise ValueError('ใบเบิกนี้ส่งเรื่องแล้ว ใส่บิลเพิ่มไม่ได้')

    bills = (FuelBill.query
             .filter(FuelBill.id.in_(bill_ids),
                     FuelBill.payment_method == 'reserve',
                     FuelBill.reimbursement_id.is_(None))
             .all())
    if not bills:
        raise ValueError('ไม่พบบิลที่เลือก หรือบิลถูกใช้ไปแล้ว')

    warnings = []
    if reimbursement.source_id:
        running = {}  # (vehicle_id, year, month) -> Decimal ที่ใช้ไปแล้วในรอบนี้
        for b in bills:
            if not (b.vehicle_id and b.bill_date):
                continue
            key = (b.vehicle_id, b.bill_date.year, b.bill_date.month)
            st = quota_status(b.vehicle_id, 'source', b.bill_date.year, b.bill_date.month,
                              source_id=reimbursement.source_id)
            if st is None:
                continue
            already = running.get(key, D0)
            remaining_after = st['remaining'] - already - _dec(b.amount)
            running[key] = already + _dec(b.amount)
            if remaining_after < 0:
                warnings.append(
                    f"บิล {b.bill_date.strftime('%d/%m/%Y')} เกินโควตาแหล่งเบิกของรถคันนี้ในเดือนนั้น "
                    f"{abs(remaining_after):,.2f} บาท")

    for b in bills:
        b.reimbursement_id = reimbursement.id
    db.session.commit()
    return warnings


def create_draft_with_bills(bill_ids, reimbursement_no, source_id, note, actor_id) -> FuelReimbursement:
    """"+ สร้างใบเบิกใหม่" ในตัว modal ใส่ใบเบิก (§5.3) — สร้าง draft แล้ว attach ในคำสั่งเดียว"""
    rb = create_draft_reimbursement(reimbursement_no, source_id, note, actor_id)
    attach_bills_to_reimbursement(bill_ids, rb, actor_id)
    return rb


def detach_bill(bill: FuelBill, actor_id) -> FuelBill:
    """ถอดบิลออกจากใบเบิก — เฉพาะใบ draft เท่านั้น (D9)"""
    if bill.reimbursement_id is None:
        raise ValueError('บิลนี้ไม่ได้อยู่ในใบเบิกใด')
    if bill.reimbursement.status != 'draft':
        raise ValueError('ใบเบิกนี้ส่งเรื่องแล้ว ถอดบิลไม่ได้')
    bill.reimbursement_id = None
    db.session.commit()
    return bill


def delete_bill(bill: FuelBill, actor_id):
    """ลบบิล — บิลที่อยู่ในใบเบิก submitted/received ลบไม่ได้ (D9)"""
    if bill.reimbursement_id is not None and bill.reimbursement.status != 'draft':
        raise ValueError('บิลนี้อยู่ในใบเบิกที่ส่งเรื่องแล้ว ลบไม่ได้')
    db.session.delete(bill)
    db.session.commit()


def delete_draft_reimbursement(reimbursement: FuelReimbursement, actor_id):
    """ลบใบเบิก draft — บิลข้างในกลับสู่สถานะ "ใช้ไปแล้ว" (reimbursement_id=None) · ล็อกแล้วลบไม่ได้ (D9)"""
    if reimbursement.status != 'draft':
        raise ValueError('ใบเบิกนี้ส่งเรื่องแล้ว ลบไม่ได้')
    FuelBill.query.filter_by(reimbursement_id=reimbursement.id).update({'reimbursement_id': None})
    db.session.delete(reimbursement)
    db.session.commit()


def update_reimbursement_meta(reimbursement: FuelReimbursement, *, reimbursement_no,
                              source_id, note, actor_id) -> FuelReimbursement:
    """แก้เลขที่/แหล่งเบิก/หมายเหตุ — เฉพาะ draft (§4.4: submitted ทำได้แค่บันทึกได้เงิน/คืนเงิน)"""
    if reimbursement.status != 'draft':
        raise ValueError('ใบเบิกนี้ส่งเรื่องแล้ว แก้ข้อมูลใบไม่ได้')
    if not (reimbursement_no or '').strip():
        raise ValueError('กรุณากรอกเลขที่ใบเบิก')
    reimbursement.reimbursement_no = reimbursement_no.strip()
    reimbursement.source_id = source_id
    reimbursement.note = (note or '').strip() or None
    db.session.commit()
    return reimbursement


# ──────────────────────────────────────────────────────────────
# ส่งเรื่อง / ได้เงิน / คืนเงินรายคน (§4.4)
# ──────────────────────────────────────────────────────────────
def submit_reimbursement(reimbursement: FuelReimbursement, amount_requested, actor_id) -> FuelReimbursement:
    """draft → submitted — snapshot reimbursement_settlement 1 แถวต่อผู้สำรอง (idempotent guard
    ผ่าน status check เท่านั้น) แล้วล็อกบิลข้างในทั้งหมด (D9, บังคับผ่าน status ของใบ ไม่ใช่ต่อบิล)
    ไม่นับบิล card/self ในยอด (ไม่มี holder ไม่เคยควักเงินสำรอง)
    """
    if reimbursement.status != 'draft':
        raise ValueError('ใบเบิกนี้ส่งเรื่องไปแล้ว')
    bills = FuelBill.query.filter_by(reimbursement_id=reimbursement.id).all()
    if not bills:
        raise ValueError('ใบเบิกนี้ยังไม่มีบิล')

    # review 2026-08-10 #2: defense-in-depth เผื่อบิล reserve เก่า (ก่อน create_bill บังคับ holder)
    # หลุดเข้ามาโดยไม่มี paid_by_holder_id — ถ้าปล่อยผ่าน ยอดจะหายจาก settlement เงียบๆ
    orphan = [b for b in bills if b.payment_method == 'reserve' and not b.paid_by_holder_id]
    if orphan:
        raise ValueError('มีบิลเงินสำรองที่ไม่ได้ระบุผู้สำรองจ่าย — แก้ไขบิลก่อนส่งเรื่อง')

    by_holder = {}
    for b in bills:
        if b.payment_method == 'reserve' and b.paid_by_holder_id:
            by_holder[b.paid_by_holder_id] = by_holder.get(b.paid_by_holder_id, D0) + _dec(b.amount)
    if not by_holder:
        raise ValueError('ใบเบิกนี้ไม่มีบิลเงินสำรองที่ผูกผู้สำรองไว้ — ตรวจสอบบิลข้างในก่อน')

    total = sum(by_holder.values(), D0)
    for holder_id, amount in by_holder.items():
        db.session.add(ReimbursementSettlement(
            reimbursement_id=reimbursement.id, holder_id=holder_id, amount=amount))

    reimbursement.status = 'submitted'
    reimbursement.submitted_at = get_bkk_time().date()
    reimbursement.amount_requested = _dec(amount_requested) if amount_requested else total
    db.session.commit()
    return reimbursement


def receive_reimbursement(reimbursement: FuelReimbursement, amount_received, received_at, actor_id) -> FuelReimbursement:
    """submitted → received — บันทึกยอดที่ได้เงินจริง (ไม่ได้คืนเงินให้แต่ละคนอัตโนมัติ ต้องกด settle_holder แยก)"""
    if reimbursement.status != 'submitted':
        raise ValueError('ใบเบิกนี้ต้องส่งเรื่องก่อนถึงจะบันทึกได้เงินได้')
    reimbursement.amount_received = _dec(amount_received)
    reimbursement.received_at = received_at or get_bkk_time().date()
    reimbursement.status = 'received'
    db.session.commit()
    return reimbursement


def settle_holder(settlement: ReimbursementSettlement, settled_at, actor_id) -> ReimbursementSettlement:
    """คืนเงินให้ผู้สำรอง 1 คน — ต้องรอใบเบิก "ได้เงินคืน" จริงก่อน (status='received') เท่านั้น
    ไม่งั้นยอดจะไหลกลับ "คงเหลือ" (derived) ทั้งที่เงินยังไม่เข้าจริง — KPI จะโกหกว่ามีเงินในมือ
    (review 2026-08-10 #1: probe ยืนยันว่า settle ตอน status='submitted' ทำให้ balance ผิด)
    idempotent guard กันคืนซ้ำ (settled_at ตั้งแล้วห้ามตั้งซ้ำ)
    """
    if settlement.reimbursement.status != 'received':
        raise ValueError('ใบเบิกนี้ยังไม่ได้เงินคืน — บันทึก "ได้เงินคืน" ก่อนถึงจะคืนเงินให้ผู้สำรองได้')
    if settlement.settled_at is not None:
        raise ValueError('คืนเงินให้คนนี้ไปแล้ว')
    settlement.settled_at = settled_at or get_bkk_time().date()
    db.session.commit()
    return settlement


# ──────────────────────────────────────────────────────────────
# แหล่งเบิก (ReimbursementSource) — CRUD (review 2026-08-10 #8)
# ──────────────────────────────────────────────────────────────
def create_source(name, is_default, actor_id) -> ReimbursementSource:
    name = (name or '').strip()
    if not name:
        raise ValueError('กรุณากรอกชื่อแหล่งเบิก')
    if ReimbursementSource.query.filter_by(name=name).first():
        raise ValueError('มีแหล่งเบิกชื่อนี้อยู่แล้ว')
    if is_default:
        ReimbursementSource.query.update({'is_default': False})
    src = ReimbursementSource(name=name, is_default=bool(is_default), is_active=True)
    db.session.add(src)
    db.session.commit()
    return src


def toggle_source_active(source: ReimbursementSource, actor_id) -> ReimbursementSource:
    """เปิด/ปิดใช้งานแหล่งเบิก — ปิดแล้วไม่โผล่ในตัวเลือกตอนสร้างใบเบิก/ตั้งโควตา แต่ข้อมูลเดิมไม่หาย"""
    if source.is_active and source.is_default:
        raise ValueError('ปิดแหล่งเบิกค่าเริ่มต้นไม่ได้ — ตั้งแหล่งอื่นเป็นค่าเริ่มต้นก่อน')
    source.is_active = not source.is_active
    db.session.commit()
    return source


def set_default_source(source: ReimbursementSource, actor_id) -> ReimbursementSource:
    if not source.is_active:
        raise ValueError('ตั้งแหล่งเบิกที่ปิดใช้งานเป็นค่าเริ่มต้นไม่ได้')
    ReimbursementSource.query.update({'is_default': False})
    source.is_default = True
    db.session.commit()
    return source


def delete_source(source: ReimbursementSource, actor_id):
    """ลบได้เฉพาะแหล่งที่ไม่เคยถูกอ้างอิง (ใบเบิก/โควตารถ) — กันประวัติเสีย ใช้ปิดใช้งานแทนถ้าเคยใช้แล้ว"""
    if FuelReimbursement.query.filter_by(source_id=source.id).first():
        raise ValueError('แหล่งเบิกนี้ถูกใช้ในใบเบิกแล้ว ลบไม่ได้ — ปิดใช้งานแทน')
    if VehicleQuota.query.filter_by(source_id=source.id).first():
        raise ValueError('แหล่งเบิกนี้ถูกตั้งวงเงินรถไว้แล้ว ลบไม่ได้ — ปิดใช้งานแทน')
    db.session.delete(source)
    db.session.commit()


# ──────────────────────────────────────────────────────────────
# fleet config (P5) — ตั้งวงเงินโควตารถต่อคัน (§5.8)
# ──────────────────────────────────────────────────────────────
def set_vehicle_quota(vehicle_id, kind, limit_amount, source_id, actor_id, effective_from=None) -> VehicleQuota:
    """ตั้ง/แก้วงเงินโควตารถ — insert แถวใหม่เสมอ ห้าม UPDATE แถวเดิม (เดือนย้อนหลังต้องไม่เปลี่ยน)
    limit_amount ว่าง/None → no-op (ไม่ได้แปลว่าปิดโควตา แค่แปลว่าฟอร์มนี้ไม่ได้ตั้งค่า)
    ค่าเท่าเดิมกับที่ effective ตอนนี้ → no-op เช่นกัน (กัน insert แถวซ้ำไม่จำเป็นทุกครั้งที่กดบันทึก)
    """
    if limit_amount in (None, ''):
        return None
    eff = effective_from or date(get_bkk_time().date().year, get_bkk_time().date().month, 1)
    new_amt = _dec(limit_amount)
    current = quota_limit(vehicle_id, kind, eff.year, eff.month, source_id)
    if current == new_amt:
        return None
    q = VehicleQuota(vehicle_id=vehicle_id, kind=kind, source_id=source_id,
                     limit_amount=new_amt, effective_from=eff, created_by=actor_id)
    db.session.add(q)
    db.session.commit()
    return q
