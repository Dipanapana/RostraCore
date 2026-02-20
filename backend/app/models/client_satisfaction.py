"""Client satisfaction survey / rating model."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from app.database import Base


class ClientSatisfaction(Base):
    __tablename__ = "client_satisfaction"

    survey_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="SET NULL"), nullable=True, index=True)

    # Rating fields (1-5 scale)
    overall_rating = Column(Float, nullable=False)
    service_quality = Column(Float, nullable=True)
    response_time = Column(Float, nullable=True)
    professionalism = Column(Float, nullable=True)
    communication = Column(Float, nullable=True)

    # Feedback
    feedback = Column(Text, nullable=True)
    areas_of_improvement = Column(Text, nullable=True)

    # Metadata
    survey_period = Column(String(20), nullable=True)  # e.g., "2026-01", "2026-Q1"
    surveyed_by = Column(String(200), nullable=True)  # person who conducted survey
    respondent_name = Column(String(200), nullable=True)
    respondent_role = Column(String(100), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
