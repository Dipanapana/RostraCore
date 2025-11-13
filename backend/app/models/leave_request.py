from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
from enum import Enum


class LeaveType(str, Enum):
    """Types of leave requests"""
    ANNUAL = "annual"
    SICK = "sick"
    FAMILY_RESPONSIBILITY = "family_responsibility"
    UNPAID = "unpaid"
    STUDY = "study"
    MATERNITY = "maternity"
    PATERNITY = "paternity"
    OTHER = "other"


class LeaveStatus(str, Enum):
    """Status of leave requests"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class LeaveRequest(Base):
    """
    LeaveRequest model for employee unavailability/leave management.
    Employees can request leave through mobile calendar interface.
    Admins can approve/reject requests.
    """
    __tablename__ = "leave_requests"

    leave_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)
    start_date = Column(DateTime(timezone=True), nullable=False, index=True)
    end_date = Column(DateTime(timezone=True), nullable=False)
    leave_type = Column(SQLEnum(LeaveType), nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(SQLEnum(LeaveStatus), nullable=False, default=LeaveStatus.PENDING, index=True)
    approved_by = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    employee = relationship("Employee", back_populates="leave_requests")
    approver = relationship("User", foreign_keys=[approved_by])

    def __repr__(self):
        return f"<LeaveRequest(leave_id={self.leave_id}, employee_id={self.employee_id}, status='{self.status}')>"
