"""Service for managing and resolving site staffing profiles."""

from datetime import date, time, datetime
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.site_staffing_profile import (
    SiteStaffingProfile, PeriodType, DayType, PSIRAGradeRequirement
)
from app.models.site import Site


class StaffingProfileService:
    """Service for site staffing profile operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_profiles_for_site(
        self,
        site_id: int,
        active_only: bool = True
    ) -> List[SiteStaffingProfile]:
        """Get all staffing profiles for a site."""
        query = self.db.query(SiteStaffingProfile).filter(
            SiteStaffingProfile.site_id == site_id
        )
        if active_only:
            query = query.filter(SiteStaffingProfile.is_active == True)
        return query.order_by(SiteStaffingProfile.priority.desc()).all()

    def get_matching_profile(
        self,
        site_id: int,
        check_date: date,
        check_time: time
    ) -> Optional[SiteStaffingProfile]:
        """
        Get the highest priority profile that matches the given date/time.

        Args:
            site_id: The site to check
            check_date: The date to check
            check_time: The time to check

        Returns:
            The matching profile with highest priority, or None if no match
        """
        profiles = self.get_profiles_for_site(site_id, active_only=True)

        matching_profiles = []
        for profile in profiles:
            if profile.matches_datetime(check_date, check_time):
                matching_profiles.append(profile)

        if not matching_profiles:
            return None

        # Return highest priority match (already sorted by priority desc)
        return matching_profiles[0]

    def calculate_required_staff(
        self,
        site_id: int,
        check_date: date,
        check_time: time,
        fallback_to_site_default: bool = True
    ) -> int:
        """
        Calculate required staff for a site at a given date/time.

        Priority:
        1. Matching staffing profile (highest priority wins)
        2. Site's min_staff default (if fallback enabled)
        3. 1 (absolute fallback)

        Args:
            site_id: The site to check
            check_date: The date to check
            check_time: The time to check
            fallback_to_site_default: Whether to fallback to site.min_staff

        Returns:
            Number of required staff
        """
        profile = self.get_matching_profile(site_id, check_date, check_time)

        if profile:
            return profile.required_staff

        if fallback_to_site_default:
            site = self.db.query(Site).filter(Site.site_id == site_id).first()
            if site and site.min_staff:
                return site.min_staff

        return 1  # Absolute fallback

    def get_staffing_requirements(
        self,
        site_id: int,
        check_date: date,
        check_time: time
    ) -> dict:
        """
        Get full staffing requirements for a site at a given date/time.

        Returns dict with:
        - required_staff: int
        - required_skill: Optional[str]
        - required_psira_grade: Optional[str]
        - requires_firearm: bool
        - profile_name: Optional[str] (if matched from profile)
        - is_from_profile: bool
        """
        profile = self.get_matching_profile(site_id, check_date, check_time)

        if profile:
            return {
                "required_staff": profile.required_staff,
                "required_skill": profile.required_skill,
                "required_psira_grade": profile.required_psira_grade.value if profile.required_psira_grade else None,
                "requires_firearm": profile.requires_firearm or False,
                "profile_name": profile.profile_name,
                "is_from_profile": True
            }

        # Fallback to site defaults
        site = self.db.query(Site).filter(Site.site_id == site_id).first()
        if site:
            return {
                "required_staff": site.min_staff or 1,
                "required_skill": site.required_skill,
                "required_psira_grade": None,
                "requires_firearm": False,
                "profile_name": None,
                "is_from_profile": False
            }

        return {
            "required_staff": 1,
            "required_skill": None,
            "required_psira_grade": None,
            "requires_firearm": False,
            "profile_name": None,
            "is_from_profile": False
        }

    def preview_staffing_for_date_range(
        self,
        site_id: int,
        start_date: date,
        end_date: date,
        time_slots: List[time] = None
    ) -> List[dict]:
        """
        Preview staffing requirements for a date range.

        Args:
            site_id: The site to check
            start_date: Start of date range
            end_date: End of date range
            time_slots: Specific times to check (default: day/night shifts)

        Returns:
            List of dicts with date, time, and staffing requirements
        """
        if time_slots is None:
            # Default: check start of day shift (06:00) and night shift (18:00)
            time_slots = [time(6, 0), time(18, 0)]

        results = []
        current_date = start_date

        while current_date <= end_date:
            for slot_time in time_slots:
                requirements = self.get_staffing_requirements(
                    site_id, current_date, slot_time
                )
                results.append({
                    "date": current_date.isoformat(),
                    "time": slot_time.strftime("%H:%M"),
                    "day_name": current_date.strftime("%A"),
                    "is_weekend": current_date.weekday() >= 5,
                    **requirements
                })
            current_date = date(current_date.year, current_date.month, current_date.day + 1) if current_date.day < 28 else \
                          (date(current_date.year, current_date.month + 1, 1) if current_date.month < 12 else date(current_date.year + 1, 1, 1))

        return results

    def create_profile(
        self,
        org_id: int,
        site_id: int,
        profile_name: str,
        period_type: PeriodType,
        day_type: DayType,
        required_staff: int,
        custom_start_time: time = None,
        custom_end_time: time = None,
        required_skill: str = None,
        required_psira_grade: PSIRAGradeRequirement = None,
        requires_firearm: bool = False,
        priority: int = 0
    ) -> SiteStaffingProfile:
        """Create a new staffing profile."""
        profile = SiteStaffingProfile(
            org_id=org_id,
            site_id=site_id,
            profile_name=profile_name,
            period_type=period_type,
            day_type=day_type,
            required_staff=required_staff,
            custom_start_time=custom_start_time,
            custom_end_time=custom_end_time,
            required_skill=required_skill,
            required_psira_grade=required_psira_grade,
            requires_firearm=requires_firearm,
            priority=priority,
            is_active=True
        )
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def update_profile(
        self,
        profile_id: int,
        **kwargs
    ) -> Optional[SiteStaffingProfile]:
        """Update an existing staffing profile."""
        profile = self.db.query(SiteStaffingProfile).filter(
            SiteStaffingProfile.profile_id == profile_id
        ).first()

        if not profile:
            return None

        for key, value in kwargs.items():
            if hasattr(profile, key):
                setattr(profile, key, value)

        self.db.commit()
        self.db.refresh(profile)
        return profile

    def delete_profile(self, profile_id: int) -> bool:
        """Delete a staffing profile."""
        profile = self.db.query(SiteStaffingProfile).filter(
            SiteStaffingProfile.profile_id == profile_id
        ).first()

        if not profile:
            return False

        self.db.delete(profile)
        self.db.commit()
        return True

    def create_standard_profiles_for_site(
        self,
        org_id: int,
        site_id: int,
        weekday_day_staff: int = 4,
        weekday_night_staff: int = 2,
        weekend_day_staff: int = 2,
        weekend_night_staff: int = 1
    ) -> List[SiteStaffingProfile]:
        """
        Create a standard set of 4 profiles for a site:
        - Weekday Day
        - Weekday Night
        - Weekend Day
        - Weekend Night

        This is a convenience method for quickly setting up typical staffing.
        """
        profiles = []

        # Weekday Day
        profiles.append(self.create_profile(
            org_id=org_id,
            site_id=site_id,
            profile_name="Weekday Day",
            period_type=PeriodType.DAY,
            day_type=DayType.WEEKDAY,
            required_staff=weekday_day_staff,
            priority=10
        ))

        # Weekday Night
        profiles.append(self.create_profile(
            org_id=org_id,
            site_id=site_id,
            profile_name="Weekday Night",
            period_type=PeriodType.NIGHT,
            day_type=DayType.WEEKDAY,
            required_staff=weekday_night_staff,
            priority=10
        ))

        # Weekend Day
        profiles.append(self.create_profile(
            org_id=org_id,
            site_id=site_id,
            profile_name="Weekend Day",
            period_type=PeriodType.DAY,
            day_type=DayType.WEEKEND,
            required_staff=weekend_day_staff,
            priority=10
        ))

        # Weekend Night
        profiles.append(self.create_profile(
            org_id=org_id,
            site_id=site_id,
            profile_name="Weekend Night",
            period_type=PeriodType.NIGHT,
            day_type=DayType.WEEKEND,
            required_staff=weekend_night_staff,
            priority=10
        ))

        return profiles
