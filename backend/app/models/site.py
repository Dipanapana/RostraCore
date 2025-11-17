"""Site model."""

from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Site(Base):
    """Client location/site model."""

    __tablename__ = "sites"

    site_id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy: Site belongs to an organization (via client)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    client_id = Column(Integer, ForeignKey("clients.client_id", ondelete="SET NULL"), nullable=True, index=True)
    client_name = Column(String(200), nullable=False)  # Kept for backward compatibility
    site_name = Column(String(200), nullable=True)  # Specific site name (e.g., "Main Gate", "Building A")
    address = Column(String(500), nullable=False)  # Full address (legacy field)

    # Detailed location fields
    street_address = Column(String(300), nullable=True)  # e.g., "123 Main Street"
    suburb = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    province = Column(String(50), nullable=True)  # North West, Northern Cape, Gauteng, etc.
    postal_code = Column(String(20), nullable=True)
    country = Column(String(100), nullable=False, server_default='South Africa')

    # GPS coordinates
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)
    gps_accuracy = Column(Float, nullable=True)  # Accuracy in meters
    location_notes = Column(Text, nullable=True)  # Specific instructions (e.g., "Enter via back gate")
    shift_pattern = Column(String(50))  # day/night/12hr
    required_skill = Column(String(100))
    billing_rate = Column(Float)
    min_staff = Column(Integer, default=1)
    notes = Column(Text)

    # Supervisor
    supervisor_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)

    # Relationships (MVP core only)
    organization = relationship("Organization", back_populates="sites")
    client = relationship("Client", back_populates="sites")
    supervisor = relationship("Employee", foreign_keys=[supervisor_id])
    shifts = relationship("Shift", back_populates="site")
    shift_templates = relationship("ShiftTemplate", back_populates="site")

    def __repr__(self):
        return f"<Site {self.site_id}: {self.client_name}>"
