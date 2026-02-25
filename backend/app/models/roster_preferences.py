"""
Roster Preferences Model - Multi-level constraint configuration
Allows organizations to configure rostering constraints at different levels
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class ConstraintLevel(str, enum.Enum):
    """Hierarchy of constraint enforcement levels"""
    HARD = "hard"  # Must be satisfied (blocks assignment)
    SOFT = "soft"  # Preferred but can be violated (penalty in optimization)
    WARNING = "warning"  # Violated but allowed (shows warning)
    DISABLED = "disabled"  # Constraint not enforced


class ConstraintScope(str, enum.Enum):
    """Scope at which constraint applies"""
    ORGANIZATION = "organization"  # Company-wide default
    CLIENT = "client"  # Per-client override
    SITE = "site"  # Per-site override
    EMPLOYEE = "employee"  # Per-employee override


class RosterPreferences(Base):
    """
    Configurable roster generation preferences with multi-level hierarchy.

    Precedence Order (highest to lowest):
    1. Employee-level overrides
    2. Site-level overrides
    3. Client-level overrides
    4. Organization-level defaults
    5. System defaults (from config.py)
    """
    __tablename__ = "roster_preferences"

    preference_id = Column(Integer, primary_key=True, index=True)

    # Scope Definition
    scope = Column(SQLEnum(ConstraintScope), nullable=False, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # Optional Foreign Keys (based on scope)
    client_id = Column(Integer, ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.site_id", ondelete="CASCADE"), nullable=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=True, index=True)

    # === CONSTRAINT ENFORCEMENT LEVELS ===

    # PSIRA Compliance
    psira_compliance_level = Column(SQLEnum(ConstraintLevel), default=ConstraintLevel.WARNING)

    # Skill Matching
    skill_matching_level = Column(SQLEnum(ConstraintLevel), default=ConstraintLevel.HARD)

    # Availability Checking
    availability_check_level = Column(SQLEnum(ConstraintLevel), default=ConstraintLevel.HARD)

    # Client Assignment
    client_assignment_level = Column(SQLEnum(ConstraintLevel), default=ConstraintLevel.HARD)

    # === BCEA COMPLIANCE SETTINGS ===

    # Maximum weekly hours (BCEA: 48, can be relaxed to 60)
    max_hours_week = Column(Integer, default=48)
    max_hours_week_level = Column(SQLEnum(ConstraintLevel), default=ConstraintLevel.HARD)

    # Minimum rest period between shifts (BCEA Section 15(1): 12 hours)
    min_rest_hours = Column(Integer, default=12)
    min_rest_hours_level = Column(SQLEnum(ConstraintLevel), default=ConstraintLevel.HARD)

    # Maximum consecutive working days (BCEA: 6)
    max_consecutive_days = Column(Integer, default=6)
    max_consecutive_days_level = Column(SQLEnum(ConstraintLevel), default=ConstraintLevel.HARD)

    # Maximum consecutive night shifts (Safety: 3)
    max_consecutive_nights = Column(Integer, default=3)
    max_consecutive_nights_level = Column(SQLEnum(ConstraintLevel), default=ConstraintLevel.SOFT)

    # === SOFT CONSTRAINTS (Preferences) ===

    # Fairness weight (0.0 - 1.0) - how much to prioritize equal hour distribution
    fairness_weight = Column(Float, default=0.15)

    # Maximum travel distance in kilometers
    max_distance_km = Column(Float, default=50.0)
    max_distance_level = Column(SQLEnum(ConstraintLevel), default=ConstraintLevel.SOFT)

    # === PREMIUM PAY SETTINGS ===

    # Night shift premium (additional amount in Rands per hour)
    night_shift_premium_amount = Column(Float, default=0.0)

    # Sunday premium (percentage, e.g., 50.0 for 50% extra)
    sunday_premium_percentage = Column(Float, default=50.0)

    # Public holiday premium (percentage, e.g., 100.0 for double pay)
    holiday_premium_percentage = Column(Float, default=100.0)

    # Prefer guards with client-specific experience
    prefer_client_experience = Column(Boolean, default=True)

    # Prefer guards with site-specific experience
    prefer_site_experience = Column(Boolean, default=True)

    # === EMERGENCY MODE ===

    # Allow emergency overrides (for sick leave, urgent replacements)
    allow_emergency_overrides = Column(Boolean, default=True)

    # Which constraints to relax in emergency mode (JSON array of constraint names)
    emergency_relaxed_constraints = Column(JSON, default=list)
    # Example: ["availability_check", "max_hours_week", "min_rest_hours"]

    # === ADVANCED PREFERENCES ===

    # Shift pattern preferences (JSON)
    shift_pattern_preferences = Column(JSON, nullable=True)
    # Example: {"prefer_fixed_shifts": true, "avoid_split_shifts": true}

    # Custom constraint notes/description
    notes = Column(String(500), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="roster_preferences")
    client = relationship("Client", back_populates="roster_preferences")
    site = relationship("Site", back_populates="roster_preferences")
    employee = relationship("Employee", back_populates="roster_preferences")

    def __repr__(self):
        return f"<RosterPreferences(scope={self.scope}, org_id={self.org_id})>"


class EmergencyShiftRequest(Base):
    """
    Track emergency shift requests (sick leave, urgent replacements)
    Allows temporary constraint relaxation with audit trail
    """
    __tablename__ = "emergency_shift_requests"

    request_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=False, index=True)

    # Original assignment that needs replacement
    original_shift_id = Column(Integer, ForeignKey("shifts.shift_id", ondelete="CASCADE"), nullable=False)
    original_employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)

    # Replacement details
    replacement_employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)
    replacement_shift_assignment_id = Column(Integer, ForeignKey("shift_assignments.assignment_id", ondelete="SET NULL"), nullable=True)

    # Request metadata
    reason = Column(String(500), nullable=False)  # "Sick leave", "Personal emergency", etc.
    requested_by = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    requested_at = Column(Integer, nullable=False)  # Unix timestamp

    # Constraint violations accepted for this emergency
    violated_constraints = Column(JSON, default=list)
    # Example: ["max_hours_week: 52/48", "min_rest_hours: 6/8"]

    # Resolution
    status = Column(String(20), default="pending")  # pending, filled, cancelled
    resolved_at = Column(Integer, nullable=True)

    # Relationships
    organization = relationship("Organization")
    original_shift = relationship("Shift", foreign_keys=[original_shift_id])
    original_employee = relationship("Employee", foreign_keys=[original_employee_id])
    replacement_employee = relationship("Employee", foreign_keys=[replacement_employee_id])
    requested_by_user = relationship("User")

    def __repr__(self):
        return f"<EmergencyShiftRequest(shift_id={self.original_shift_id}, status={self.status})>"
