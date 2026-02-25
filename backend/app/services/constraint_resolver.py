"""
Constraint Resolution Service
Resolves rostering constraints using hierarchical preference lookup with caching.
"""

import logging
from typing import Dict, Optional, Any
from dataclasses import dataclass, field
from sqlalchemy.orm import Session
from app.models.roster_preferences import RosterPreferences, ConstraintLevel, ConstraintScope
from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class ResolvedConstraints:
    """
    Resolved constraint configuration for an employee-shift pair.

    This dataclass holds the final constraint values after applying
    the hierarchical override system (Employee > Site > Client > Org > System).
    """

    # === CONSTRAINT ENFORCEMENT LEVELS ===
    psira_compliance_level: ConstraintLevel = ConstraintLevel.WARNING
    skill_matching_level: ConstraintLevel = ConstraintLevel.HARD
    availability_check_level: ConstraintLevel = ConstraintLevel.HARD
    client_assignment_level: ConstraintLevel = ConstraintLevel.HARD

    # === BCEA COMPLIANCE SETTINGS ===
    max_hours_week: int = 48
    max_hours_week_level: ConstraintLevel = ConstraintLevel.HARD

    min_rest_hours: int = 12
    min_rest_hours_level: ConstraintLevel = ConstraintLevel.HARD

    max_consecutive_days: int = 6
    max_consecutive_days_level: ConstraintLevel = ConstraintLevel.HARD

    max_consecutive_nights: int = 3
    max_consecutive_nights_level: ConstraintLevel = ConstraintLevel.SOFT

    # === SOFT CONSTRAINTS ===
    fairness_weight: float = 0.15
    max_distance_km: float = 50.0
    max_distance_level: ConstraintLevel = ConstraintLevel.SOFT
    prefer_client_experience: bool = True
    prefer_site_experience: bool = True

    # === EMERGENCY MODE ===
    allow_emergency_overrides: bool = True
    emergency_relaxed_constraints: list = field(default_factory=list)

    # === METADATA ===
    source_scopes: Dict[str, ConstraintScope] = field(default_factory=dict)
    # Tracks which scope each constraint came from for debugging

    @classmethod
    def from_system_defaults(cls) -> 'ResolvedConstraints':
        """Create ResolvedConstraints from system settings."""
        return cls(
            max_hours_week=settings.MAX_HOURS_WEEK,
            min_rest_hours=settings.MIN_REST_HOURS,
            max_consecutive_days=settings.MAX_CONSECUTIVE_DAYS,
            max_consecutive_nights=settings.MAX_CONSECUTIVE_NIGHTS,
            fairness_weight=settings.FAIRNESS_WEIGHT,
            max_distance_km=settings.MAX_DISTANCE_KM,
            psira_compliance_level=ConstraintLevel.WARNING if settings.SKIP_CERTIFICATION_CHECK else ConstraintLevel.WARNING,
            skill_matching_level=ConstraintLevel.DISABLED if settings.SKIP_SKILL_MATCHING else ConstraintLevel.HARD,
            availability_check_level=ConstraintLevel.DISABLED if settings.SKIP_AVAILABILITY_CHECK else ConstraintLevel.HARD,
        )


class ConstraintResolver:
    """
    Service for resolving constraints using hierarchical preference lookup.

    Precedence Order (highest to lowest):
    1. Employee-level overrides
    2. Site-level overrides
    3. Client-level overrides
    4. Organization-level defaults
    5. System defaults (from config.py)

    Uses caching to avoid repeated database queries.
    """

    def __init__(self, db: Session):
        self.db = db
        self._cache: Dict[str, RosterPreferences] = {}

    def resolve_constraints(
        self,
        org_id: int,
        employee_id: Optional[int] = None,
        site_id: Optional[int] = None,
        client_id: Optional[int] = None,
        emergency_mode: bool = False
    ) -> ResolvedConstraints:
        """
        Resolve constraints using hierarchical lookup.

        Args:
            org_id: Organization ID (required for multi-tenancy)
            employee_id: Optional employee ID for employee-level overrides
            site_id: Optional site ID for site-level overrides
            client_id: Optional client ID for client-level overrides
            emergency_mode: If True, apply emergency constraint relaxation

        Returns:
            ResolvedConstraints with final values after hierarchy resolution
        """
        # Start with system defaults
        constraints = ResolvedConstraints.from_system_defaults()

        # Track which scope each constraint came from
        source_tracking = {}

        # Apply organization-level preferences
        org_prefs = self._get_preferences(ConstraintScope.ORGANIZATION, org_id=org_id)
        if org_prefs:
            self._apply_preferences(constraints, org_prefs, source_tracking, ConstraintScope.ORGANIZATION)

        # Apply client-level preferences (if provided)
        if client_id:
            client_prefs = self._get_preferences(ConstraintScope.CLIENT, org_id=org_id, client_id=client_id)
            if client_prefs:
                self._apply_preferences(constraints, client_prefs, source_tracking, ConstraintScope.CLIENT)

        # Apply site-level preferences (if provided)
        if site_id:
            site_prefs = self._get_preferences(ConstraintScope.SITE, org_id=org_id, site_id=site_id)
            if site_prefs:
                self._apply_preferences(constraints, site_prefs, source_tracking, ConstraintScope.SITE)

        # Apply employee-level preferences (if provided) - highest priority
        if employee_id:
            emp_prefs = self._get_preferences(ConstraintScope.EMPLOYEE, org_id=org_id, employee_id=employee_id)
            if emp_prefs:
                self._apply_preferences(constraints, emp_prefs, source_tracking, ConstraintScope.EMPLOYEE)

        # Apply emergency mode relaxation if enabled
        if emergency_mode:
            self._apply_emergency_mode(constraints, org_prefs or ResolvedConstraints.from_system_defaults())

        constraints.source_scopes = source_tracking
        return constraints

    def _get_preferences(
        self,
        scope: ConstraintScope,
        org_id: int,
        client_id: Optional[int] = None,
        site_id: Optional[int] = None,
        employee_id: Optional[int] = None
    ) -> Optional[RosterPreferences]:
        """
        Get preferences for a specific scope with caching.

        Args:
            scope: The constraint scope to fetch
            org_id: Organization ID
            client_id: Client ID (for CLIENT scope)
            site_id: Site ID (for SITE scope)
            employee_id: Employee ID (for EMPLOYEE scope)

        Returns:
            RosterPreferences object or None if not found
        """
        # Build cache key
        cache_key = f"{scope.value}:{org_id}"
        if client_id:
            cache_key += f":client_{client_id}"
        if site_id:
            cache_key += f":site_{site_id}"
        if employee_id:
            cache_key += f":employee_{employee_id}"

        # Check cache
        if cache_key in self._cache:
            return self._cache[cache_key]

        # Build query
        query = self.db.query(RosterPreferences).filter(
            RosterPreferences.scope == scope,
            RosterPreferences.org_id == org_id
        )

        # Add scope-specific filters
        if scope == ConstraintScope.CLIENT and client_id:
            query = query.filter(RosterPreferences.client_id == client_id)
        elif scope == ConstraintScope.SITE and site_id:
            query = query.filter(RosterPreferences.site_id == site_id)
        elif scope == ConstraintScope.EMPLOYEE and employee_id:
            query = query.filter(RosterPreferences.employee_id == employee_id)

        # Fetch from database
        preferences = query.first()

        # Cache result (even if None to avoid repeated DB queries)
        self._cache[cache_key] = preferences

        return preferences

    def _apply_preferences(
        self,
        constraints: ResolvedConstraints,
        preferences: RosterPreferences,
        source_tracking: Dict[str, ConstraintScope],
        scope: ConstraintScope
    ) -> None:
        """
        Apply preferences to resolved constraints.

        Only overwrites values that are explicitly set in the preferences.
        Updates source tracking for debugging.

        Args:
            constraints: ResolvedConstraints to update
            preferences: RosterPreferences to apply
            source_tracking: Dict tracking which scope each constraint came from
            scope: Current scope being applied
        """
        # Apply constraint enforcement levels
        if preferences.psira_compliance_level:
            constraints.psira_compliance_level = preferences.psira_compliance_level
            source_tracking['psira_compliance_level'] = scope

        if preferences.skill_matching_level:
            constraints.skill_matching_level = preferences.skill_matching_level
            source_tracking['skill_matching_level'] = scope

        if preferences.availability_check_level:
            constraints.availability_check_level = preferences.availability_check_level
            source_tracking['availability_check_level'] = scope

        if preferences.client_assignment_level:
            constraints.client_assignment_level = preferences.client_assignment_level
            source_tracking['client_assignment_level'] = scope

        # Apply BCEA constraints
        if preferences.max_hours_week is not None:
            constraints.max_hours_week = preferences.max_hours_week
            source_tracking['max_hours_week'] = scope

        if preferences.max_hours_week_level:
            constraints.max_hours_week_level = preferences.max_hours_week_level
            source_tracking['max_hours_week_level'] = scope

        if preferences.min_rest_hours is not None:
            constraints.min_rest_hours = preferences.min_rest_hours
            source_tracking['min_rest_hours'] = scope

        if preferences.min_rest_hours_level:
            constraints.min_rest_hours_level = preferences.min_rest_hours_level
            source_tracking['min_rest_hours_level'] = scope

        if preferences.max_consecutive_days is not None:
            constraints.max_consecutive_days = preferences.max_consecutive_days
            source_tracking['max_consecutive_days'] = scope

        if preferences.max_consecutive_days_level:
            constraints.max_consecutive_days_level = preferences.max_consecutive_days_level
            source_tracking['max_consecutive_days_level'] = scope

        if preferences.max_consecutive_nights is not None:
            constraints.max_consecutive_nights = preferences.max_consecutive_nights
            source_tracking['max_consecutive_nights'] = scope

        if preferences.max_consecutive_nights_level:
            constraints.max_consecutive_nights_level = preferences.max_consecutive_nights_level
            source_tracking['max_consecutive_nights_level'] = scope

        # Apply soft constraints
        if preferences.fairness_weight is not None:
            constraints.fairness_weight = preferences.fairness_weight
            source_tracking['fairness_weight'] = scope

        if preferences.max_distance_km is not None:
            constraints.max_distance_km = preferences.max_distance_km
            source_tracking['max_distance_km'] = scope

        if preferences.max_distance_level:
            constraints.max_distance_level = preferences.max_distance_level
            source_tracking['max_distance_level'] = scope

        if preferences.prefer_client_experience is not None:
            constraints.prefer_client_experience = preferences.prefer_client_experience
            source_tracking['prefer_client_experience'] = scope

        if preferences.prefer_site_experience is not None:
            constraints.prefer_site_experience = preferences.prefer_site_experience
            source_tracking['prefer_site_experience'] = scope

        # Apply emergency mode settings
        if preferences.allow_emergency_overrides is not None:
            constraints.allow_emergency_overrides = preferences.allow_emergency_overrides
            source_tracking['allow_emergency_overrides'] = scope

        if preferences.emergency_relaxed_constraints:
            constraints.emergency_relaxed_constraints = preferences.emergency_relaxed_constraints
            source_tracking['emergency_relaxed_constraints'] = scope

    def _apply_emergency_mode(
        self,
        constraints: ResolvedConstraints,
        org_prefs: RosterPreferences
    ) -> None:
        """
        Apply emergency mode constraint relaxation.

        Relaxes constraints specified in emergency_relaxed_constraints list.
        Common relaxations:
        - availability_check: DISABLED
        - min_rest_hours: Reduced to 6h
        - max_hours_week: Increased to allow overtime

        Args:
            constraints: ResolvedConstraints to modify
            org_prefs: Organization preferences containing emergency config
        """
        if not constraints.allow_emergency_overrides:
            logger.warning("Emergency mode requested but emergency_overrides disabled")
            return

        relaxed = constraints.emergency_relaxed_constraints or []

        logger.info(f"Applying emergency mode: relaxing {len(relaxed)} constraints")

        for constraint_name in relaxed:
            if constraint_name == "availability_check":
                constraints.availability_check_level = ConstraintLevel.WARNING
                logger.info("Emergency: Relaxed availability_check to WARNING")

            elif constraint_name == "min_rest_hours":
                # Reduce to 6 hours for emergencies
                constraints.min_rest_hours = 6
                constraints.min_rest_hours_level = ConstraintLevel.WARNING
                logger.info("Emergency: Relaxed min_rest_hours to 6h (WARNING)")

            elif constraint_name == "max_hours_week":
                # Allow up to 60 hours in emergency
                constraints.max_hours_week = 60
                constraints.max_hours_week_level = ConstraintLevel.WARNING
                logger.info("Emergency: Relaxed max_hours_week to 60h (WARNING)")

            elif constraint_name == "max_consecutive_days":
                # Allow up to 7 consecutive days
                constraints.max_consecutive_days = 7
                constraints.max_consecutive_days_level = ConstraintLevel.WARNING
                logger.info("Emergency: Relaxed max_consecutive_days to 7 (WARNING)")

            elif constraint_name == "psira_compliance":
                # Already WARNING by default, but ensure it's not HARD
                constraints.psira_compliance_level = ConstraintLevel.WARNING
                logger.info("Emergency: Ensured psira_compliance is WARNING")

            elif constraint_name == "skill_matching":
                # Relax skill matching to soft constraint
                constraints.skill_matching_level = ConstraintLevel.SOFT
                logger.info("Emergency: Relaxed skill_matching to SOFT")

    def clear_cache(self, org_id: Optional[int] = None) -> None:
        """
        Clear the constraint cache.

        Args:
            org_id: If provided, only clear cache for this org.
                   If None, clear entire cache.
        """
        if org_id is None:
            self._cache.clear()
            logger.info("Cleared entire constraint cache")
        else:
            keys_to_remove = [k for k in self._cache.keys() if f":{org_id}" in k]
            for key in keys_to_remove:
                del self._cache[key]
            logger.info(f"Cleared constraint cache for org_id={org_id}")

    def get_constraint_summary(
        self,
        constraints: ResolvedConstraints
    ) -> Dict[str, Any]:
        """
        Get a human-readable summary of resolved constraints.

        Useful for logging and debugging.

        Args:
            constraints: ResolvedConstraints to summarize

        Returns:
            Dict with constraint values and their sources
        """
        return {
            "bcea_compliance": {
                "max_hours_week": {
                    "value": constraints.max_hours_week,
                    "level": constraints.max_hours_week_level.value,
                    "source": constraints.source_scopes.get('max_hours_week', 'system').value
                },
                "min_rest_hours": {
                    "value": constraints.min_rest_hours,
                    "level": constraints.min_rest_hours_level.value,
                    "source": constraints.source_scopes.get('min_rest_hours', 'system').value
                },
                "max_consecutive_days": {
                    "value": constraints.max_consecutive_days,
                    "level": constraints.max_consecutive_days_level.value,
                    "source": constraints.source_scopes.get('max_consecutive_days', 'system').value
                }
            },
            "enforcement_levels": {
                "psira_compliance": constraints.psira_compliance_level.value,
                "skill_matching": constraints.skill_matching_level.value,
                "availability_check": constraints.availability_check_level.value
            },
            "soft_constraints": {
                "fairness_weight": constraints.fairness_weight,
                "max_distance_km": constraints.max_distance_km,
                "prefer_client_experience": constraints.prefer_client_experience
            },
            "emergency_mode": {
                "enabled": constraints.allow_emergency_overrides,
                "relaxed_constraints": constraints.emergency_relaxed_constraints
            }
        }
