"""Attendance and geofence models."""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class VerificationMethod(str, enum.Enum):
    """Attendance verification methods."""
    BIOMETRIC_FACE = "biometric_face"
    BIOMETRIC_FINGERPRINT = "biometric_fingerprint"
    GPS_ONLY = "gps_only"
    MANUAL_HR_APPROVED = "manual_hr_approved"


class AttendanceRecord(Base):
    """Attendance record with biometric and GPS verification."""

    __tablename__ = "attendance_records"

    record_id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # Employee relationship
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)

    # Site relationship
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="SET NULL"), nullable=True, index=True)

    # Attendance timing
    clock_in_at = Column(DateTime(timezone=True), nullable=False)
    clock_out_at = Column(DateTime(timezone=True), nullable=True)

    # Verification details
    verification_method = Column(String(30), nullable=False)  # biometric_face, biometric_fingerprint, gps_only, manual_hr_approved
    biometric_confidence = Column(Numeric(5, 2), nullable=True)  # 0-100

    # GPS data
    gps_lat = Column(Numeric(10, 7), nullable=True)
    gps_lng = Column(Numeric(10, 7), nullable=True)
    gps_accuracy = Column(Numeric(8, 2), nullable=True)  # meters
    gps_validated = Column(Boolean, default=False)

    # Device information
    device_type = Column(String(50), nullable=True)  # phone, desktop, hardware_terminal

    # HR review
    requires_hr_review = Column(Boolean, default=False)
    hr_reviewed_by = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    hr_reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Notes
    notes = Column(Text, nullable=True)  # JSON array of log notes

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    employee = relationship("Employee")
    site = relationship("Site")
    reviewer = relationship("User", foreign_keys=[hr_reviewed_by])

    def __repr__(self):
        return f"<AttendanceRecord {self.record_id}: Employee {self.employee_id}, Clock-in {self.clock_in_at}>"


class SiteGeofence(Base):
    """GPS geofence definition for site attendance validation."""

    __tablename__ = "site_geofences"

    geofence_id = Column(Integer, primary_key=True, index=True)

    # Multi-tenancy
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # Site relationship (one-to-one)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="CASCADE"), nullable=False, unique=True)

    # Geofence parameters
    center_lat = Column(Numeric(10, 7), nullable=False)
    center_lng = Column(Numeric(10, 7), nullable=False)
    radius_meters = Column(Integer, nullable=False, default=200)  # 100m site + 2x50m GPS error buffer

    # Status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    site = relationship("Site")

    def __repr__(self):
        return f"<SiteGeofence {self.geofence_id}: Site {self.site_id}, Radius {self.radius_meters}m>"
