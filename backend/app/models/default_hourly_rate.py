"""Default Hourly Rates model for organization-specific rate configuration."""

from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class DefaultHourlyRate(Base):
    """
    Default hourly rates by PSIRA grade and role for an organization.

    Organizations can configure default rates that auto-populate when
    adding new guards based on their PSIRA grade and role.
    """

    __tablename__ = "default_hourly_rates"

    rate_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # PSIRA Grade: A (highest), B, C, D, E (lowest)
    psira_grade = Column(String(10), nullable=False)

    # Role: armed, unarmed, supervisor
    role = Column(String(20), nullable=False)

    # Default hourly rate in Rands (ZAR)
    default_hourly_rate = Column(Numeric(10, 2), nullable=False)

    # Relationships
    organization = relationship("Organization", backref="default_hourly_rates")

    # Unique constraint: one rate per org/grade/role combination
    __table_args__ = (
        UniqueConstraint('org_id', 'psira_grade', 'role', name='uq_org_grade_role'),
    )

    def __repr__(self):
        return f"<DefaultHourlyRate org={self.org_id} grade={self.psira_grade} role={self.role} rate={self.default_hourly_rate}>"
