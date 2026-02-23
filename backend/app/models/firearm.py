"""Firearm register and compliance models."""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Date, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class FirearmStatus(str, enum.Enum):
    IN_ARMORY = "in_armory"
    ISSUED = "issued"
    MAINTENANCE = "maintenance"
    LOST = "lost"
    DECOMMISSIONED = "decommissioned"


class Firearm(Base):
    """Firearm in the organization's registry."""

    __tablename__ = "firearms"

    firearm_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    serial_number = Column(String(100), nullable=False, index=True)
    make = Column(String(100), nullable=False)
    model = Column(String(100), nullable=True)
    caliber = Column(String(50), nullable=True)
    firearm_type = Column(String(50), nullable=False)  # handgun, shotgun, rifle

    license_number = Column(String(100), nullable=True)
    license_expiry = Column(Date, nullable=True)

    status = Column(SQLEnum(FirearmStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=FirearmStatus.IN_ARMORY, index=True)
    current_holder_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=True)
    purchase_date = Column(Date, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    current_holder = relationship("Employee", foreign_keys=[current_holder_id])
    issues = relationship("FirearmIssue", back_populates="firearm", cascade="all, delete-orphan")
    inspections = relationship("FirearmInspection", back_populates="firearm", cascade="all, delete-orphan")


class FirearmIssue(Base):
    """Record of a firearm being issued to / returned by a guard."""

    __tablename__ = "firearm_issues"

    issue_id = Column(Integer, primary_key=True, index=True)
    firearm_id = Column(Integer, ForeignKey("firearms.firearm_id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False, index=True)

    issued_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    returned_at = Column(DateTime(timezone=True), nullable=True)
    issued_by_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)

    ammunition_issued = Column(Integer, nullable=False, default=0)
    ammunition_returned = Column(Integer, nullable=True)
    condition_on_issue = Column(String(50), nullable=False, default="good")  # good, fair, poor
    condition_on_return = Column(String(50), nullable=True)

    # Relationships
    firearm = relationship("Firearm", back_populates="issues")
    employee = relationship("Employee")
    issued_by = relationship("User", foreign_keys=[issued_by_user_id])


class FirearmInspection(Base):
    """Periodic inspection record for a firearm."""

    __tablename__ = "firearm_inspections"

    inspection_id = Column(Integer, primary_key=True, index=True)
    firearm_id = Column(Integer, ForeignKey("firearms.firearm_id", ondelete="CASCADE"), nullable=False, index=True)
    inspected_by_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)

    inspection_date = Column(Date, nullable=False)
    condition = Column(String(50), nullable=False)  # excellent, good, fair, poor, unserviceable
    passed = Column(Integer, nullable=False, default=1)  # 1=passed, 0=failed
    next_inspection_due = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    firearm = relationship("Firearm", back_populates="inspections")
    inspected_by = relationship("User", foreign_keys=[inspected_by_user_id])
