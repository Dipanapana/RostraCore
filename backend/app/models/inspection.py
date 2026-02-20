"""
Site Inspection Checklists — configurable checklists for guard patrol inspections.

Admins create checklist templates per site. Guards complete inspections during patrols,
checking off items and adding notes/photos. Management reviews completion rates.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Float, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum


class InspectionTemplate(Base):
    """A reusable checklist template assigned to a site."""
    __tablename__ = "inspection_templates"

    template_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id"), nullable=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    # JSON array of checklist items: [{"key": "fire_ext", "label": "Fire extinguisher present", "required": true}, ...]
    items = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)

    # Relationships
    site = relationship("Site")
    inspections = relationship("Inspection", back_populates="template")

    def __repr__(self):
        return f"<InspectionTemplate(id={self.template_id}, name={self.name})>"


class InspectionStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FLAGGED = "flagged"  # Guard flagged issues


class Inspection(Base):
    """A completed (or in-progress) inspection by a guard."""
    __tablename__ = "inspections"

    inspection_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id"), nullable=False, index=True)
    template_id = Column(Integer, ForeignKey("inspection_templates.template_id"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False, index=True)

    status = Column(String(20), nullable=False, default=InspectionStatus.IN_PROGRESS.value)
    # JSON object: {"fire_ext": {"checked": true, "note": "ok"}, "doors": {"checked": false, "note": "Door 3 jammed"}, ...}
    responses = Column(JSON, nullable=False, default=dict)
    overall_notes = Column(Text, nullable=True)
    score_pct = Column(Float, nullable=True)  # % of required items checked

    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    template = relationship("InspectionTemplate", back_populates="inspections")
    site = relationship("Site")
    employee = relationship("Employee")

    def __repr__(self):
        return f"<Inspection(id={self.inspection_id}, template={self.template_id}, status={self.status})>"
