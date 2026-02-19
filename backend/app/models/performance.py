"""
Employee performance evaluation and disciplinary case models.
"""

from sqlalchemy import Column, Integer, String, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class EmployeeEvaluation(Base):
    """
    Structured performance evaluation for an employee.
    Scores 1–5 per category plus an overall score and free-text notes.
    """
    __tablename__ = "employee_evaluations"

    evaluation_id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)

    # Evaluation details
    evaluation_date = Column(Date, nullable=False)
    evaluator_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    evaluator_name = Column(String(200), nullable=True)  # Stored denormalised for history

    # Scores 1–5 (1 = poor, 5 = excellent)
    overall_score = Column(Integer, nullable=False)
    punctuality_score = Column(Integer, nullable=True)
    conduct_score = Column(Integer, nullable=True)
    performance_score = Column(Integer, nullable=True)
    appearance_score = Column(Integer, nullable=True)
    communication_score = Column(Integer, nullable=True)

    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    employee = relationship("Employee")
    evaluator = relationship("User", foreign_keys=[evaluator_id])

    def __repr__(self):
        return f"<EmployeeEvaluation(id={self.evaluation_id}, emp={self.employee_id}, score={self.overall_score})>"

    def to_dict(self):
        return {
            "evaluation_id": self.evaluation_id,
            "org_id": self.org_id,
            "employee_id": self.employee_id,
            "evaluation_date": self.evaluation_date.isoformat() if self.evaluation_date else None,
            "evaluator_id": self.evaluator_id,
            "evaluator_name": self.evaluator_name,
            "overall_score": self.overall_score,
            "punctuality_score": self.punctuality_score,
            "conduct_score": self.conduct_score,
            "performance_score": self.performance_score,
            "appearance_score": self.appearance_score,
            "communication_score": self.communication_score,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class DisciplinaryCase(Base):
    """
    Formal disciplinary case record for an employee.
    Tracks verbal/written warnings, suspensions, and dismissals.
    """
    __tablename__ = "disciplinary_cases"

    case_id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)

    # Case details
    incident_date = Column(Date, nullable=False)
    # verbal_warning | written_warning | final_warning | suspension | dismissal
    case_type = Column(String(50), nullable=False)
    reason = Column(Text, nullable=False)
    outcome = Column(Text, nullable=True)

    # Who issued the disciplinary action
    issued_by_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    issued_by_name = Column(String(200), nullable=True)  # Denormalised for history

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    employee = relationship("Employee")
    issuer = relationship("User", foreign_keys=[issued_by_id])

    def __repr__(self):
        return f"<DisciplinaryCase(id={self.case_id}, emp={self.employee_id}, type={self.case_type})>"

    def to_dict(self):
        return {
            "case_id": self.case_id,
            "org_id": self.org_id,
            "employee_id": self.employee_id,
            "incident_date": self.incident_date.isoformat() if self.incident_date else None,
            "case_type": self.case_type,
            "reason": self.reason,
            "outcome": self.outcome,
            "issued_by_id": self.issued_by_id,
            "issued_by_name": self.issued_by_name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
