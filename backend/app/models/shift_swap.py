"""
ShiftSwap model — request & approval workflow for shift swaps/trades.

Guards can request to swap one of their assigned shifts with another guard.
Managers review and approve/reject swaps. The system validates eligibility
(qualifications, blacklisting, availability) before allowing approval.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum


class SwapStatus(str, enum.Enum):
    """Swap request lifecycle."""
    PENDING_PEER = "pending_peer"          # Waiting for target guard to accept
    PENDING_APPROVAL = "pending_approval"  # Peer accepted, awaiting manager
    APPROVED = "approved"                  # Manager approved, swap executed
    REJECTED = "rejected"                  # Manager rejected
    DECLINED = "declined"                  # Target guard declined
    CANCELLED = "cancelled"               # Requester withdrew
    EXPIRED = "expired"                   # Not actioned before shift start


class ShiftSwap(Base):
    """
    A request by one guard to swap a shift assignment with another guard.

    Flow:
    1. Guard A requests swap of their shift with Guard B
    2. Guard B accepts or declines (PENDING_PEER → PENDING_APPROVAL / DECLINED)
    3. Manager approves or rejects (PENDING_APPROVAL → APPROVED / REJECTED)
    4. On approval, shift_assignments are updated in-place
    """
    __tablename__ = "shift_swaps"

    swap_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id"), nullable=False, index=True)

    # The guard requesting the swap and their shift
    requester_employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False, index=True)
    requester_assignment_id = Column(Integer, ForeignKey("shift_assignments.assignment_id"), nullable=False)

    # The target guard and (optionally) their shift to trade
    target_employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False, index=True)
    target_assignment_id = Column(Integer, ForeignKey("shift_assignments.assignment_id"), nullable=True)

    # Status
    status = Column(String(20), nullable=False, default=SwapStatus.PENDING_PEER.value)
    reason = Column(Text, nullable=True)             # Why the guard wants to swap
    rejection_reason = Column(Text, nullable=True)    # Why it was rejected/declined

    # Audit trail
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)      # When peer responded
    reviewed_at = Column(DateTime, nullable=True)       # When manager reviewed
    reviewed_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)

    # Relationships
    requester = relationship("Employee", foreign_keys=[requester_employee_id])
    target = relationship("Employee", foreign_keys=[target_employee_id])
    requester_assignment = relationship("ShiftAssignment", foreign_keys=[requester_assignment_id])
    target_assignment = relationship("ShiftAssignment", foreign_keys=[target_assignment_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    def __repr__(self):
        return f"<ShiftSwap(id={self.swap_id}, requester={self.requester_employee_id}, target={self.target_employee_id}, status={self.status})>"
