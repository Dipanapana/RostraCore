"""Roster snapshot model for versioned roster state capture."""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class RosterSnapshot(Base):
    """Point-in-time snapshot of a roster for version history and rollback."""

    __tablename__ = "roster_snapshots"

    snapshot_id = Column(Integer, primary_key=True, index=True)
    roster_id = Column(
        Integer,
        ForeignKey("rosters.roster_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    org_id = Column(
        Integer,
        ForeignKey("organizations.org_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    version = Column(Integer, nullable=False)
    snapshot_data = Column(JSONB, nullable=False)  # Full roster state at this version
    label = Column(String(100), nullable=True)  # Human-readable label, e.g., "Before publish"

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    roster = relationship("Roster", backref="snapshots")
    creator = relationship("User", foreign_keys=[created_by])

    def __repr__(self):
        return (
            f"<RosterSnapshot(snapshot_id={self.snapshot_id}, roster_id={self.roster_id}, "
            f"version={self.version})>"
        )
