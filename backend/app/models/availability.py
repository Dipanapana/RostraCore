"""Availability model."""

from sqlalchemy import Column, Integer, Date, Time, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Availability(Base):
    """Guard availability blocks model."""

    __tablename__ = "availability"

    avail_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    available = Column(Boolean, default=True)

    # Relationships
    employee = relationship("Employee", back_populates="availability")

    def __repr__(self):
        return f"<Availability {self.avail_id}: Employee {self.employee_id} on {self.date}>"
