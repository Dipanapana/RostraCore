"""Patrol tour models — sequential checkpoint scanning for on-post guards."""

import enum

from sqlalchemy import (
    Boolean, Column, DateTime, Enum as SQLEnum,
    Float, ForeignKey, Integer, String, Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class PatrolRunStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class PatrolTour(Base):
    """A named sequence of checkpoints that guards must visit in order."""

    __tablename__ = "patrol_tours"

    tour_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id"), nullable=True, index=True)

    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    checkpoints = relationship(
        "PatrolCheckpoint",
        back_populates="tour",
        order_by="PatrolCheckpoint.order_num",
        cascade="all, delete-orphan",
    )
    site = relationship("Site")


class PatrolCheckpoint(Base):
    """A single point of interest within a patrol tour."""

    __tablename__ = "patrol_checkpoints"

    checkpoint_id = Column(Integer, primary_key=True, index=True)
    tour_id = Column(Integer, ForeignKey("patrol_tours.tour_id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    order_num = Column(Integer, nullable=False)          # Sequence position (1-based)

    # Scan identifiers — guard scans whichever is present
    qr_code = Column(String(500), nullable=True)        # Value encoded in the QR label
    nfc_tag = Column(String(500), nullable=True)        # NFC tag UID

    # Optional GPS anchor for geofence validation
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)

    photo_required = Column(Boolean, nullable=False, default=False)

    # Relationship
    tour = relationship("PatrolTour", back_populates="checkpoints")


class PatrolRun(Base):
    """One execution of a PatrolTour by a guard."""

    __tablename__ = "patrol_runs"

    run_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)
    tour_id = Column(Integer, ForeignKey("patrol_tours.tour_id"), nullable=False, index=True)
    assignment_id = Column(Integer, ForeignKey("shift_assignments.assignment_id"), nullable=True, index=True)
    started_by_employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=True, index=True)

    status = Column(SQLEnum(PatrolRunStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=PatrolRunStatus.IN_PROGRESS, index=True)

    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    tour = relationship("PatrolTour")
    scans = relationship(
        "PatrolScan",
        back_populates="run",
        order_by="PatrolScan.scanned_at",
        cascade="all, delete-orphan",
    )


class PatrolScan(Base):
    """A single checkpoint scan within a PatrolRun."""

    __tablename__ = "patrol_scans"

    scan_id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("patrol_runs.run_id", ondelete="CASCADE"), nullable=False, index=True)
    checkpoint_id = Column(Integer, ForeignKey("patrol_checkpoints.checkpoint_id"), nullable=False, index=True)

    scanned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    photo_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    run = relationship("PatrolRun", back_populates="scans")
    checkpoint = relationship("PatrolCheckpoint")
