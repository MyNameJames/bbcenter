"""
models — แตกจาก models.py เดิม (1 ไฟล์ 27 tables) เป็น package ตาม domain (2026-06-07)

`from models import X` เดิมยังใช้ได้ทุกตัว เพราะ re-export ครบที่นี่
แก้/เพิ่ม model → ไปที่ไฟล์ domain ที่ตรง แล้วเพิ่มชื่อใน __all__
"""
from .base import db, get_bkk_time

from .user import User
from .common import SystemConfig, Notification
from .repair import RepairTicket
from .maintenance import MaintenanceTicket
from .room import RoomBooking
from .vehicle import (
    Vehicle,
    Driver,
    VehicleBooking,
    VehicleMileage,
    TripPassenger,
    VehicleServiceLog,
    TripExpenseItem,
)
from .vehicle_budget import (
    BudgetType,
    ExpenseType,
    VehicleDepartment,
    VehicleBudget,
    DeptApprover,
    VehicleBudgetLog,
)
from .vehicle_ot import OTRateConfig, DriverOT, DriverOTSlot
from .vehicle_fuel import (
    FuelBill,
    FuelReimbursement,
    FuelPrice,
    FuelReserveConfig,
    FuelReserveLog,
)

__all__ = [
    'db', 'get_bkk_time',
    'User',
    'SystemConfig', 'Notification',
    'RepairTicket',
    'MaintenanceTicket',
    'RoomBooking',
    'Vehicle', 'Driver', 'VehicleBooking', 'VehicleMileage',
    'TripPassenger', 'VehicleServiceLog', 'TripExpenseItem',
    'BudgetType', 'ExpenseType', 'VehicleDepartment', 'VehicleBudget',
    'DeptApprover', 'VehicleBudgetLog',
    'OTRateConfig', 'DriverOT', 'DriverOTSlot',
    'FuelBill', 'FuelReimbursement', 'FuelPrice',
    'FuelReserveConfig', 'FuelReserveLog',
]
