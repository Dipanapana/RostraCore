"""Guard deployment history model — tracks site assignments over time."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Date
from sqlalchemy.orm import relationship
from app.database import Base


class DeploymentRecord(Base):
    """Historical record of a guard being deployed to a site."""

    __tablename__ = "deployment_records"

    record_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="SET NULL"), nullable=True, index=True)

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)  # null = currently deployed

    role = Column(String(100), nullable=True)  # e.g. "Site Supervisor", "Access Control", "Patrol"
    reason = Column(String(50), nullable=True)  # new_assignment, transfer, rotation, temporary
    notes = Column(Text, nullable=True)

    created_by_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)

    # Relationships
    organization = relationship("Organization")
    employee = relationship("Employee")
    site = relationship("Site")

    def __repr__(self):
        return f"<DeploymentRecord {self.record_id}: emp={self.employee_id} site={self.site_id}>"
