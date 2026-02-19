"""
Shift exception model for operational exception management.

Covers absenteeism, no-shows, late arrivals, early departures, and
other shift-related exceptions that require management action.
"""

from sqlalchemy import Column, Integer, String, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ShiftException(Base):
    """
    Operational exception record tied to a shift and/or employee.

    Exception types:
    - no_show          : Guard did not arrive at all (critical)
    - late_arrival     : Guard arrived significantly late
    - early_departure  : Guard left before shift ended
    - awol             : Absent without leave / unexcused
    - relief_required  : Site needs replacement guard urgently
    - equipment_issue  : Guard equipment problem affecting deployment
    - other            : Other operational exception

    Resolution workflow: open → in_progress → resolved | escalated
    """

    __tablename__ = "shift_exceptions"

    exception_id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # Links — shift and employee are optional so exceptions can also be site-level
    shift_id = Column(Integer, ForeignKey("shifts.shift_id", ondelete="SET NULL"), nullable=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="SET NULL"), nullable=True, index=True)

    # Exception details
    exception_type = Column(String(50), nullable=False)   # no_show | late_arrival | early_departure | awol | relief_required | equipment_issue | other
    exception_date = Column(Date, nullable=False)
    description = Column(Text, nullable=True)

    # Status workflow
    status = Column(String(20), nullable=False, default="open")   # open | in_progress | resolved | escalated

    # Who logged the exception
    reported_by_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    reported_by_name = Column(String(200), nullable=True)  # Denormalised for history

    # Resolution
    resolved_by_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    resolved_by_name = Column(String(200), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    organization = relationship("Organization")
    employee = relationship("Employee", foreign_keys=[employee_id])
    shift = relationship("Shift", foreign_keys=[shift_id])
    site = relationship("Site", foreign_keys=[site_id])
    reporter = relationship("User", foreign_keys=[reported_by_id])
    resolver = relationship("User", foreign_keys=[resolved_by_id])

    def __repr__(self):
        return f"<ShiftException(id={self.exception_id}, type={self.exception_type}, status={self.status})>"

    def to_dict(self):
        return {
            "exception_id": self.exception_id,
            "org_id": self.org_id,
            "shift_id": self.shift_id,
            "employee_id": self.employee_id,
            "employee_name": (
                f"{self.employee.first_name} {self.employee.last_name}"
                if self.employee else None
            ),
            "site_id": self.site_id,
            "site_name": self.site.site_name if self.site else None,
            "exception_type": self.exception_type,
            "exception_date": self.exception_date.isoformat() if self.exception_date else None,
            "description": self.description,
            "status": self.status,
            "reported_by_id": self.reported_by_id,
            "reported_by_name": self.reported_by_name,
            "resolved_by_id": self.resolved_by_id,
            "resolved_by_name": self.resolved_by_name,
            "resolution_notes": self.resolution_notes,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
