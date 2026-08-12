"""
fuel.py — fuel cost calculation + คำศัพท์/สูตรของเงินสำรอง (pure logic ห้าม import flask/models)

get_fuel_price() ย้ายออกไป services/vehicle/mileage_service.py แล้ว (Phase 3, 2026-07-19
— ปิด DEBT-2: query ORM FuelPrice/SystemConfig ไม่ใช่ pure logic ผิดกฎ domain ของ ADR 0001)

2026-08-10 (fuel-reserve redesign P1): เพิ่ม constant + สูตรเงินสำรองรายคน
"""
from decimal import Decimal

# ── ช่องทางจ่าย ─────────────────────────────────────────────
# 'reserve' เดิมชื่อ 'transfer' — เปลี่ยนชื่อ 2026-08-10 เพราะค่าเดิมสื่อผิด
# (label ว่า "เงินสด" แต่ค่าเป็น transfer) · migration แปลงข้อมูลเดิมให้แล้ว
PAYMENT_METHODS  = ('reserve', 'card', 'self')
PAYMENT_LABEL_TH = {'reserve': 'เงินสำรอง', 'card': 'ตัดบัตร', 'self': 'จ่ายเอง'}

# ── หมวดค่าใช้จ่าย — สำรองไม่ใช่แค่น้ำมัน ────────────────────
BILL_CATEGORIES  = ('fuel', 'toll', 'repair', 'insurance', 'other')
CATEGORY_LABEL_TH = {'fuel': 'น้ำมัน', 'toll': 'ทางด่วน', 'repair': 'ซ่อม',
                     'insurance': 'พรบ./ประกัน', 'other': 'อื่นๆ'}

# ── โควตา / ใบเบิก ─────────────────────────────────────────
QUOTA_KINDS = ('card', 'source')          # บัตรน้ำมัน · สิทธิ์เบิกตามแหล่ง
RB_STATUSES = ('draft', 'submitted', 'received')

D0 = Decimal('0')


def depletes_reserve(method) -> bool:
    """มิติ "เงิน" — เฉพาะ 'reserve' เท่านั้นที่ควักเงินสำรองของเจ้าหน้าที่
    'card' = บัตรส่วนกลาง · 'self' = ผู้โดยสารจ่ายเอง (เก็บประวัติ ไม่แตะเงินสำรอง)
    ⚠️ มิติ "น้ำมัน" (pivot / km ต่อลิตร) ต้องนับทุกใบ รวม card + self
    """
    return method == 'reserve'


def remaining_balance(float_amount, used, submitted) -> Decimal:
    """คงเหลือ(H) = วงเงินสำรอง − ใช้ไปแล้ว − ทำเรื่องเบิกแล้ว
    เป็นค่า derived เท่านั้น — ห้ามเก็บเป็น column (จะ drift)
    """
    return (Decimal(str(float_amount or 0))
            - Decimal(str(used or 0))
            - Decimal(str(submitted or 0)))


def calc_fuel_cost(vehicle, distance, fuel_price, override=None) -> float:
    """คำนวณค่าน้ำมัน — ใช้ override (mileage.fuel_cost) ถ้ามี ไม่งั้นคำนวณจาก formula
    คืน 0.0 ถ้าข้อมูลไม่ครบ
    """
    if override and float(override) > 0:
        return float(override)
    if not distance or not vehicle or not vehicle.fuel_rate or float(vehicle.fuel_rate) <= 0:
        return 0.0
    return round((distance / float(vehicle.fuel_rate)) * fuel_price, 2)
