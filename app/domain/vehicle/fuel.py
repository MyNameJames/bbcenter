"""
fuel.py — fuel cost calculation (pure logic, ย้ายจาก views/vehicle/vehicle_common.py)

get_fuel_price() ย้ายออกไป services/vehicle/mileage_service.py แล้ว (Phase 3, 2026-07-19
— ปิด DEBT-2: query ORM FuelPrice/SystemConfig ไม่ใช่ pure logic ผิดกฎ domain ของ ADR 0001)
"""


def calc_fuel_cost(vehicle, distance, fuel_price, override=None) -> float:
    """คำนวณค่าน้ำมัน — ใช้ override (mileage.fuel_cost) ถ้ามี ไม่งั้นคำนวณจาก formula
    คืน 0.0 ถ้าข้อมูลไม่ครบ
    """
    if override and float(override) > 0:
        return float(override)
    if not distance or not vehicle or not vehicle.fuel_rate or float(vehicle.fuel_rate) <= 0:
        return 0.0
    return round((distance / float(vehicle.fuel_rate)) * fuel_price, 2)
