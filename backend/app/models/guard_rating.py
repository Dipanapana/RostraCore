"""Guard Rating model for rating employees."""

from sqlalchemy import Column, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class GuardRating(Base):
    """Guard rating model - For rating employees after they've worked."""

    __tablename__ = "guard_ratings"

    rating_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)
    rated_by = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)  # Supervisor
    job_id = Column(Integer, ForeignKey("job_postings.job_id", ondelete="SET NULL"), nullable=True)

    # Ratings (1-5 scale)
    overall_rating = Column(Integer, nullable=False)
    punctuality_rating = Column(Integer, nullable=True)
    professionalism_rating = Column(Integer, nullable=True)
    competence_rating = Column(Integer, nullable=True)
    reliability_rating = Column(Integer, nullable=True)

    # Comments
    comments = Column(Text, nullable=True)
    strengths = Column(Text, nullable=True)
    areas_for_improvement = Column(Text, nullable=True)

    # Would hire again?
    would_rehire = Column(Boolean, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    employee = relationship("Employee", foreign_keys=[employee_id], back_populates="ratings")
    supervisor = relationship("Employee", foreign_keys=[rated_by])
    job = relationship("JobPosting")

    def __repr__(self):
        return f"<GuardRating {self.rating_id}: Employee {self.employee_id} - {self.overall_rating}/5>"
