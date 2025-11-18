"""Certification model."""

import enum
from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base


class PSIRAGrade(str, enum.Enum):
    """PSIRA security grade levels with hierarchy (E < D < C < B < A)"""
    GRADE_E = "E"  # Lowest grade
    GRADE_D = "D"
    GRADE_C = "C"
    GRADE_B = "B"
    GRADE_A = "A"  # Highest grade

    @classmethod
    def get_hierarchy_value(cls, grade: 'PSIRAGrade') -> int:
        """Get numeric value for grade hierarchy comparison"""
        hierarchy = {
            cls.GRADE_E: 1,
            cls.GRADE_D: 2,
            cls.GRADE_C: 3,
            cls.GRADE_B: 4,
            cls.GRADE_A: 5,
        }
        return hierarchy.get(grade, 0)

    @classmethod
    def can_work_grade(cls, guard_grade: 'PSIRAGrade', required_grade: 'PSIRAGrade') -> bool:
        """Check if guard's grade is sufficient for required grade"""
        # Higher or equal grade can work lower grade shifts
        return cls.get_hierarchy_value(guard_grade) >= cls.get_hierarchy_value(required_grade)


class FirearmCompetencyType(str, enum.Enum):
    """Firearm competency certification types"""
    HANDGUN = "handgun"
    SHOTGUN = "shotgun"
    RIFLE = "rifle"
    AUTOMATIC = "automatic"  # Automatic/semi-automatic weapons


class Certification(Base):
    """Training & licenses model with PSIRA compliance."""

    __tablename__ = "certifications"

    cert_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False, index=True)
    cert_type = Column(String(100), nullable=False)
    issue_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False, index=True)
    verified = Column(Boolean, default=False)
    cert_number = Column(String(100))
    issuing_authority = Column(String(200))

    # PSIRA-specific fields
    psira_grade = Column(SQLEnum(PSIRAGrade), nullable=True, index=True)  # Security grade (A-E)
    firearm_competency = Column(SQLEnum(FirearmCompetencyType), nullable=True)  # Firearm type certified for

    # Relationships
    employee = relationship("Employee", back_populates="certifications")

    def __repr__(self):
        return f"<Certification {self.cert_id}: {self.cert_type} for Employee {self.employee_id}>"

    def is_valid_for_date(self, check_date) -> bool:
        """Check if certification is valid for a specific date"""
        return self.verified and self.expiry_date >= check_date

    def days_until_expiry(self, from_date=None) -> int:
        """Calculate days until expiry from given date (defaults to today)"""
        from datetime import date
        reference_date = from_date if from_date else date.today()
        return (self.expiry_date - reference_date).days

    def is_expiring_soon(self, days_threshold: int = 30, from_date=None) -> bool:
        """Check if certification expires within threshold days"""
        days_left = self.days_until_expiry(from_date)
        return 0 <= days_left <= days_threshold
