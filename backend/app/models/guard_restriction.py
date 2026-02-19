"""Guard restriction (blacklisting) model."""

from datetime import datetime
from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class GuardRestriction(Base):
    """
    Records that a guard (employee) must not be assigned to a specific
    client or site.  Either client_id or site_id (or both) must be set.

    Used by the roster generator to filter ineligible assignments, and
    surfaced on the employee and client/site detail pages.
    """

    __tablename__ = "guard_restrictions"

    restriction_id = Column(Integer, primary_key=True, index=True)

    # Org scoping — stored as plain int so no FK import cycle
    org_id = Column(Integer, nullable=False, index=True)

    # The restricted guard
    employee_id = Column(
        Integer,
        ForeignKey("employees.employee_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Target — at least one should be non-null
    client_id = Column(
        Integer,
        ForeignKey("clients.client_id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    site_id = Column(
        Integer,
        ForeignKey("sites.site_id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    reason = Column(Text, nullable=True)
    created_by_user_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    employee = relationship("Employee", backref="guard_restrictions")
    client = relationship("Client", backref="guard_restrictions")
    site = relationship("Site", backref="guard_restrictions")
