"""Leave request and balance models for SA labor law compliance.

Updated: Model now matches actual database schema (request_id, days_requested, etc.)
"""

from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text, Enum as SQLEnum, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class LeaveType(str, enum.Enum):
    """Types of leave per SA BCEA."""
    ANNUAL = "annual"           # 15 working days (BCEA minimum)
    SICK = "sick"               # 30 days in 3-year cycle (BCEA)
    FAMILY_RESPONSIBILITY = "family_responsibility"  # 3 days per year (BCEA)
    MATERNITY = "maternity"     # 4 consecutive months (BCEA)
    PARENTAL = "parental"       # 10 consecutive days (BCEA)
    UNPAID = "unpaid"           # No pay
    STUDY = "study"             # If employer policy allows
    COMPASSIONATE = "compassionate"  # Bereavement/family emergency
    # Non-productive time exceptions
    IOD = "iod"                 # Injury on Duty — fully paid, claimed from WCA/COIDA
    TRAINING = "training"       # Paid training / induction time
    SUSPENSION = "suspension"   # Suspension pending investigation (may be paid or unpaid)


class LeaveStatus(str, enum.Enum):
    """Status of leave request."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class LeaveRequest(Base):
    """Leave request for employees."""

    __tablename__ = "leave_requests"

    # Primary key - matches DB column 'request_id'
    request_id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # Employee requesting leave
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)

    # Leave details - DB uses VARCHAR(50) for leave_type
    leave_type = Column(String(50), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    days_requested = Column(Numeric(4, 1), nullable=True)  # Working days only

    # Request details
    reason = Column(Text, nullable=True)
    medical_certificate_url = Column(String(500), nullable=True)
    supporting_document_url = Column(String(500), nullable=True)

    # Status - DB uses VARCHAR(50)
    status = Column(String(50), default="pending")

    # Admin who approved/rejected
    approved_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    approval_date = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    employee = relationship("Employee")
    organization = relationship("Organization")
    approver = relationship("User", foreign_keys=[approved_by])

    def __repr__(self):
        return f"<LeaveRequest {self.request_id}: {self.leave_type} for employee {self.employee_id}>"


class LeaveBalance(Base):
    """
    Leave balance tracking per employee per leave type.

    Database schema: One record per (employee, leave_type) with cycle-based tracking.
    Tenancy is enforced via employee relationship.

    BCEA Minimums:
    - Annual leave: 15 working days per year
    - Sick leave: 30 days per 36-month cycle
    - Family responsibility: 3 days per year
    """

    __tablename__ = "leave_balances"

    balance_id = Column(Integer, primary_key=True, index=True)

    # Employee (tenancy enforced via employee's org)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)

    # Leave type - one record per type per employee
    leave_type = Column(String(50), nullable=False)

    # Cycle dates for tracking (annual = calendar year, sick = 36-month cycle)
    cycle_start = Column(Date, nullable=True)
    cycle_end = Column(Date, nullable=True)

    # Balance tracking - generic columns for all leave types
    entitled_days = Column(Numeric(5, 1), default=0)
    used_days = Column(Numeric(5, 1), default=0)
    pending_days = Column(Numeric(5, 1), default=0)  # Approved but not yet taken

    # Carry-over support
    carried_over_days = Column(Numeric(5, 1), default=0)
    carry_over_expires = Column(Date, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    employee = relationship("Employee")

    @property
    def remaining(self) -> float:
        """Calculate remaining leave days."""
        entitled = float(self.entitled_days or 0)
        used = float(self.used_days or 0)
        pending = float(self.pending_days or 0)
        carried = float(self.carried_over_days or 0)
        return entitled + carried - used - pending

    def __repr__(self):
        return f"<LeaveBalance {self.balance_id}: {self.leave_type} for employee {self.employee_id}>"


# BCEA Leave entitlements reference
BCEA_LEAVE_ENTITLEMENTS = {
    LeaveType.ANNUAL: {
        "days": 15,
        "description": "15 consecutive working days per year (BCEA Section 20)",
        "accrual": "1 day per 17 days worked",
        "carry_over": "Can agree to take within 6 months of next cycle"
    },
    LeaveType.SICK: {
        "days": 30,
        "description": "30 days per 36-month cycle (BCEA Section 22)",
        "medical_cert": "Required for >2 consecutive days",
        "first_6_months": "1 day for every 26 days worked"
    },
    LeaveType.FAMILY_RESPONSIBILITY: {
        "days": 3,
        "description": "3 days per year (BCEA Section 27)",
        "reasons": ["Birth of child", "Illness of child", "Death of spouse/parent/child/sibling/grandparent"]
    },
    LeaveType.MATERNITY: {
        "days": 120,  # 4 months
        "description": "4 consecutive months (BCEA Section 25)",
        "earliest_start": "4 weeks before expected delivery",
        "uif_claim": "Employee can claim from UIF"
    },
    LeaveType.PARENTAL: {
        "days": 10,
        "description": "10 consecutive days (Labour Laws Amendment Act)",
        "when": "From day of birth/adoption"
    }
}
