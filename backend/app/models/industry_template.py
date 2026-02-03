"""Industry template model for universal workforce management."""

from sqlalchemy import Column, String, Text, JSON, Boolean, DateTime, Integer
from sqlalchemy.sql import func
from app.database import Base


class IndustryTemplate(Base):
    """
    Industry template defining default configuration for a business type.

    Examples: security, hospitality, retail, government, nonprofit, healthcare,
    manufacturing, education, logistics, professional
    """
    __tablename__ = "industry_templates"

    template_id = Column(String(50), primary_key=True)  # e.g., "hospitality"
    display_name = Column(String(200), nullable=False)  # e.g., "Hospitality (Restaurants, Hotels)"
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)  # Icon identifier for UI

    # Template JSON contains: roles, shift_patterns, compliance_rules, hierarchy_template, metrics
    template_json = Column(JSON, nullable=False)

    # Schema version for migration compatibility
    version = Column(String(20), default="1.0", nullable=False)

    # Ordering for UI display
    display_order = Column(Integer, default=0, nullable=False)

    # Active templates can be selected by new organizations
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, onupdate=func.now(), nullable=True)

    def __repr__(self):
        return f"<IndustryTemplate(template_id='{self.template_id}', display_name='{self.display_name}')>"
