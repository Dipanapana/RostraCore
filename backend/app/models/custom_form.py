"""Custom digital form models — template-based dynamic forms."""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class FormStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class FormTemplate(Base):
    """Dynamic form template with configurable fields."""

    __tablename__ = "form_templates"

    template_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    form_type = Column(String(50), nullable=False, default="checklist")  # inspection, checklist, report, audit
    fields = Column(JSON, nullable=False, default=list)  # JSON schema for form fields
    status = Column(SQLEnum(FormStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=FormStatus.DRAFT, index=True)
    requires_signature = Column(Boolean, nullable=False, default=False)

    created_by_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    submissions = relationship("FormSubmission", back_populates="template", cascade="all, delete-orphan")


class FormSubmission(Base):
    """Submitted instance of a form template."""

    __tablename__ = "form_submissions"

    submission_id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("form_templates.template_id", ondelete="CASCADE"), nullable=False, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    submitted_by_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id"), nullable=True, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.shift_id"), nullable=True)

    data = Column(JSON, nullable=False, default=dict)  # Submitted form data
    photos = Column(JSON, nullable=True)  # Array of photo URLs

    gps_latitude = Column(Float, nullable=True)
    gps_longitude = Column(Float, nullable=True)

    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    template = relationship("FormTemplate", back_populates="submissions")
    submitted_by = relationship("User", foreign_keys=[submitted_by_user_id])
    site = relationship("Site")
