"""Skills matrix model."""

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.database import Base


class SkillsMatrix(Base):
    """Links employees to multiple skill tags model."""

    __tablename__ = "skills_matrix"

    skill_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False, index=True)
    skill_name = Column(String(100), nullable=False)  # armed response, driver, dog handler, etc.
    proficiency_level = Column(String(50))  # beginner, intermediate, expert
    certified = Column(Boolean, default=False)
    cert_expiry_date = Column(Date)

    # Relationships
    employee = relationship("Employee", back_populates="skills")

    def __repr__(self):
        return f"<SkillsMatrix {self.skill_id}: Employee {self.employee_id} - {self.skill_name}>"
