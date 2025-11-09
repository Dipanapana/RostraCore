"""Site model."""

from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Site(Base):
    """Client location/site model."""

    __tablename__ = "sites"

    site_id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.client_id", ondelete="SET NULL"), nullable=True, index=True)
    client_name = Column(String(200), nullable=False)  # Kept for backward compatibility
    site_name = Column(String(200), nullable=True)  # Specific site name (e.g., "Main Gate", "Building A")
    address = Column(String(500), nullable=False)
    gps_lat = Column(Float)
    gps_lng = Column(Float)
    shift_pattern = Column(String(50))  # day/night/12hr
    required_skill = Column(String(100))
    billing_rate = Column(Float)
    min_staff = Column(Integer, default=1)
    notes = Column(Text)

    # Relationships
    client = relationship("Client", back_populates="sites")
    shifts = relationship("Shift", back_populates="site")
    expenses = relationship("Expense", back_populates="site")
    shift_templates = relationship("ShiftTemplate", back_populates="site")

    def __repr__(self):
        return f"<Site {self.site_id}: {self.client_name}>"
