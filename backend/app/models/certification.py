"""Certification model."""

from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Certification(Base):
    """Training & licenses model."""

    __tablename__ = "certifications"

    cert_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False, index=True)
    cert_type = Column(String(100), nullable=False)
    issue_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False, index=True)
    verified = Column(Boolean, default=False)
    cert_number = Column(String(100))
    issuing_authority = Column(String(200))

    # Relationships
    employee = relationship("Employee", back_populates="certifications")

    def __repr__(self):
        return f"<Certification {self.cert_id}: {self.cert_type} for Employee {self.employee_id}>"
