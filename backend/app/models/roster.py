"""
Roster model - tracks roster lifecycle and optimization metadata
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Roster(Base):
    """
    Roster entity representing a complete roster for a time period.
    Tracks optimization metadata, costs, and compliance status.
    """
    __tablename__ = "rosters"

    roster_id = Column(Integer, primary_key=True, index=True)
    roster_code = Column(String(50), unique=True, nullable=False, index=True)  # e.g., "R2025-11-W1"
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)

    # Status tracking
    status = Column(
        String(20),
        nullable=False,
        default="draft",
        index=True
    )  # draft, optimizing, optimized, published, active, completed, archived

    # Optimization timing
    optimization_started_at = Column(DateTime, nullable=True)
    optimization_completed_at = Column(DateTime, nullable=True)
    optimization_duration_seconds = Column(Float, nullable=True)

    # Shift statistics
    total_shifts = Column(Integer, nullable=False, default=0)
    assigned_shifts = Column(Integer, nullable=False, default=0)
    unassigned_shifts = Column(Integer, nullable=False, default=0)

    # Cost breakdown
    total_cost = Column(Float, nullable=False, default=0.0)
    regular_pay_cost = Column(Float, nullable=False, default=0.0)
    overtime_cost = Column(Float, nullable=False, default=0.0)
    premium_cost = Column(Float, nullable=False, default=0.0)  # Night/weekend premiums
    travel_reimbursement = Column(Float, nullable=False, default=0.0)

    # Compliance status
    bcea_compliant = Column(Boolean, nullable=False, default=True)
    psira_compliant = Column(Boolean, nullable=False, default=True)
    compliance_issues = Column(JSON, nullable=True)  # List of violation details

    # Solver information
    solver_status = Column(String(50), nullable=True)  # optimal, feasible, infeasible
    solver_objective_value = Column(Float, nullable=True)
    solver_log = Column(Text, nullable=True)
    algorithm_used = Column(String(50), nullable=True)  # hungarian, milp, production_cpsat

    # Fairness metrics
    fairness_score = Column(Float, nullable=True)  # 0-1, higher is better
    max_hours_employee = Column(Float, nullable=True)
    min_hours_employee = Column(Float, nullable=True)
    hours_std_dev = Column(Float, nullable=True)

    # Audit trail
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    published_at = Column(DateTime, nullable=True)
    published_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    shift_assignments = relationship("ShiftAssignment", back_populates="roster", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])
    publisher = relationship("User", foreign_keys=[published_by])

    def __repr__(self):
        return f"<Roster(id={self.roster_id}, code={self.roster_code}, status={self.status}, fill_rate={self.fill_rate:.1%})>"

    @property
    def fill_rate(self) -> float:
        """Calculate fill rate percentage"""
        if self.total_shifts == 0:
            return 0.0
        return self.assigned_shifts / self.total_shifts

    @property
    def optimization_duration_minutes(self) -> float:
        """Get optimization duration in minutes"""
        if self.optimization_duration_seconds is None:
            return 0.0
        return self.optimization_duration_seconds / 60.0

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "roster_id": self.roster_id,
            "roster_code": self.roster_code,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "status": self.status,
            "optimization_started_at": self.optimization_started_at.isoformat() if self.optimization_started_at else None,
            "optimization_completed_at": self.optimization_completed_at.isoformat() if self.optimization_completed_at else None,
            "optimization_duration_seconds": self.optimization_duration_seconds,
            "total_shifts": self.total_shifts,
            "assigned_shifts": self.assigned_shifts,
            "unassigned_shifts": self.unassigned_shifts,
            "fill_rate": self.fill_rate,
            "total_cost": self.total_cost,
            "regular_pay_cost": self.regular_pay_cost,
            "overtime_cost": self.overtime_cost,
            "premium_cost": self.premium_cost,
            "travel_reimbursement": self.travel_reimbursement,
            "bcea_compliant": self.bcea_compliant,
            "psira_compliant": self.psira_compliant,
            "compliance_issues": self.compliance_issues,
            "solver_status": self.solver_status,
            "solver_objective_value": self.solver_objective_value,
            "algorithm_used": self.algorithm_used,
            "fairness_score": self.fairness_score,
            "max_hours_employee": self.max_hours_employee,
            "min_hours_employee": self.min_hours_employee,
            "hours_std_dev": self.hours_std_dev,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "notes": self.notes
        }
