"""Shift template model."""

from sqlalchemy import Column, Integer, String, Time, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class ShiftTemplate(Base):
    """Reusable shift patterns model (7-day or 4-week patterns per site)."""

    __tablename__ = "shift_templates"

    template_id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id"), nullable=False, index=True)
    template_name = Column(String(100), nullable=False)
    day_of_week = Column(Integer)  # 0=Monday, 6=Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    required_skill = Column(String(100))
    required_staff_count = Column(Integer, default=1)
    pattern_description = Column(Text)

    # Relationships
    site = relationship("Site", back_populates="shift_templates")

    def __repr__(self):
        return f"<ShiftTemplate {self.template_id}: {self.template_name}>"
