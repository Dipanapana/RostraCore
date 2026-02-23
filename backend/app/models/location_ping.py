"""Location ping model for GPS breadcrumb trail tracking."""

from sqlalchemy import Column, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class LocationPing(Base):
    """GPS location ping from a guard during an active shift."""

    __tablename__ = "location_pings"

    ping_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # Shift context
    shift_id = Column(Integer, ForeignKey("shifts.shift_id"), nullable=True, index=True)

    # GPS data
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy = Column(Float, nullable=True)  # meters

    # Device info
    battery_level = Column(Float, nullable=True)  # 0-100
    is_moving = Column(Boolean, nullable=True, default=False)

    # Timestamp
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    employee = relationship("Employee", foreign_keys=[employee_id])
