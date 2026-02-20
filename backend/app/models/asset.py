"""
Asset / Equipment Management — track physical equipment issued to guards.

Model matches the existing 'assets' table schema in the database.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum


class AssetStatus(str, enum.Enum):
    AVAILABLE = "available"
    ISSUED = "issued"
    MAINTENANCE = "maintenance"
    LOST = "lost"
    DAMAGED = "damaged"
    DISPOSED = "disposed"


class AssetCategory(str, enum.Enum):
    FIREARM = "firearm"
    RADIO = "radio"
    TORCH = "torch"
    KEYS = "keys"
    VEST = "vest"
    PHONE = "phone"
    BATON = "baton"
    HANDCUFFS = "handcuffs"
    FIRST_AID = "first_aid"
    VEHICLE = "vehicle"
    OTHER = "other"


class Asset(Base):
    """A piece of physical equipment belonging to the organisation.

    Maps to the existing 'assets' table with columns:
    asset_id, org_id, name, asset_number, serial_number, category, status,
    current_location_type, current_location_id, assigned_to_employee_id,
    purchase_cost, salvage_value, current_book_value, accumulated_depreciation,
    depreciation_method, useful_life_years, last_depreciation_calculated_at,
    acquired_date, disposed_at, disposal_reason, condition, audit_trail,
    manufacturer, model, notes, created_at, updated_at
    """
    __tablename__ = "assets"

    asset_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id"), nullable=False, index=True)

    name = Column(String(200), nullable=False)
    asset_number = Column(String(50), nullable=False, index=True)      # asset tag/barcode
    serial_number = Column(String(100), nullable=False, default="")
    category = Column(String(50), nullable=False, default=AssetCategory.OTHER.value)
    status = Column(String(20), nullable=False, default=AssetStatus.AVAILABLE.value)

    # Location tracking
    current_location_type = Column(String(20), nullable=True)   # 'site', 'employee', 'warehouse'
    current_location_id = Column(Integer, nullable=True)
    assigned_to_employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=True, index=True)

    # Financial
    purchase_cost = Column(Numeric(12, 2), nullable=False, default=0)
    salvage_value = Column(Numeric(12, 2), nullable=True)
    current_book_value = Column(Numeric(12, 2), nullable=False, default=0)
    accumulated_depreciation = Column(Numeric(12, 2), nullable=False, default=0)
    depreciation_method = Column(String(20), nullable=True)
    useful_life_years = Column(Integer, nullable=True)
    last_depreciation_calculated_at = Column(DateTime, nullable=True)

    # Lifecycle
    acquired_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    disposed_at = Column(DateTime, nullable=True)
    disposal_reason = Column(Text, nullable=True)
    condition = Column(String(20), nullable=False, default="good")  # good, fair, poor

    # Metadata
    audit_trail = Column(JSON, nullable=False, default=list)
    manufacturer = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assigned_employee = relationship("Employee", foreign_keys=[assigned_to_employee_id])
    history = relationship("AssetHistory", back_populates="asset", order_by="AssetHistory.created_at.desc()")

    def __repr__(self):
        return f"<Asset(id={self.asset_id}, tag={self.asset_number}, status={self.status})>"


class AssetHistory(Base):
    """Audit trail for asset assignments and status changes."""
    __tablename__ = "asset_history"

    history_id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.asset_id"), nullable=False, index=True)
    action = Column(String(30), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=True)
    performed_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    asset = relationship("Asset", back_populates="history")
    employee = relationship("Employee", foreign_keys=[employee_id])
    performer = relationship("User", foreign_keys=[performed_by])
