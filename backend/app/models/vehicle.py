"""Vehicle / fleet management model."""

import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class VehicleStatus(str, enum.Enum):
    ACTIVE = "active"
    IN_SERVICE = "in_service"
    DECOMMISSIONED = "decommissioned"


class Vehicle(Base):
    """Company vehicle record."""

    __tablename__ = "vehicles"

    vehicle_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    registration = Column(String(20), nullable=False)
    make = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    year = Column(Integer, nullable=True)
    colour = Column(String(50), nullable=True)
    vin = Column(String(50), nullable=True)
    fleet_number = Column(String(50), nullable=True)

    status = Column(String(30), default="active")
    assigned_site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="SET NULL"), nullable=True)
    assigned_employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)

    current_mileage = Column(Integer, nullable=True)
    fuel_type = Column(String(30), nullable=True)  # petrol, diesel, electric, hybrid
    license_expiry = Column(DateTime, nullable=True)
    service_due_date = Column(DateTime, nullable=True)
    service_due_mileage = Column(Integer, nullable=True)

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)

    # Relationships
    organization = relationship("Organization")
    assigned_site = relationship("Site")
    assigned_employee = relationship("Employee")

    def __repr__(self):
        return f"<Vehicle {self.vehicle_id}: {self.registration}>"
