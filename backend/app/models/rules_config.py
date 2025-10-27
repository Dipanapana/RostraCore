"""Rules configuration model."""

from sqlalchemy import Column, Integer, String, Float, Boolean
from app.database import Base


class RulesConfig(Base):
    """Global rostering constraints model."""

    __tablename__ = "rules_config"

    rule_id = Column(Integer, primary_key=True, index=True)
    rule_name = Column(String(100), unique=True, nullable=False)
    rule_type = Column(String(50), nullable=False)  # max_hours, min_rest, ot_threshold, etc.
    value_int = Column(Integer)
    value_float = Column(Float)
    value_string = Column(String(200))
    enabled = Column(Boolean, default=True)
    description = Column(String(500))

    def __repr__(self):
        return f"<RulesConfig {self.rule_id}: {self.rule_name}>"
