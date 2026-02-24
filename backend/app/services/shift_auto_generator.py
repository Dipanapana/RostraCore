"""Auto-generate shifts from site staffing profiles.

Reads SiteStaffingProfile records for each site and creates Shift records
covering the requested date range, respecting day/night periods and
weekday/weekend requirements.
"""

from datetime import date, datetime, time, timedelta
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.shift import Shift, ShiftStatus
from app.models.site import Site
from app.models.site_staffing_profile import (
    SiteStaffingProfile, PeriodType, DayType,
)
from app.services.staffing_profile_service import StaffingProfileService


class ShiftAutoGenerator:
    """Generate shift records automatically from site staffing profiles."""

    # Default shift times when no profile exists
    DEFAULT_DAY_START = time(6, 0)
    DEFAULT_DAY_END = time(18, 0)
    DEFAULT_NIGHT_START = time(18, 0)
    DEFAULT_NIGHT_END = time(6, 0)  # next day

    @classmethod
    def generate_shifts_for_site(
        cls,
        db: Session,
        org_id: int,
        site_id: int,
        start_date: date,
        end_date: date,
    ) -> List[Shift]:
        """
        Generate shift records for a single site from its staffing profiles.

        For each day in the range, matches active profiles against day type
        (weekday/weekend) and period type (day/night) to create the correct
        number of shifts with proper requirements.

        Skips creation if a shift with the same site + start_time + end_time
        already exists (idempotent).

        Returns:
            List of newly created Shift objects.
        """
        svc = StaffingProfileService(db)
        profiles = svc.get_profiles_for_site(site_id, active_only=True)
        site = db.query(Site).filter(Site.site_id == site_id).first()
        if not site:
            return []

        created_shifts: List[Shift] = []
        current = start_date

        while current <= end_date:
            if profiles:
                # Group profiles by period type for this day
                day_profiles = cls._matching_profiles(profiles, current, is_day=True)
                night_profiles = cls._matching_profiles(profiles, current, is_day=False)

                # Create day shift(s) from matching profiles
                for profile in day_profiles:
                    shift_start, shift_end = cls._profile_to_datetimes(profile, current)
                    shift = cls._create_shift_if_new(
                        db, org_id, site_id, shift_start, shift_end, profile, site,
                    )
                    if shift:
                        created_shifts.append(shift)

                # Create night shift(s) from matching profiles
                for profile in night_profiles:
                    shift_start, shift_end = cls._profile_to_datetimes(profile, current)
                    shift = cls._create_shift_if_new(
                        db, org_id, site_id, shift_start, shift_end, profile, site,
                    )
                    if shift:
                        created_shifts.append(shift)

                # If no profiles matched this day at all, use site defaults
                if not day_profiles and not night_profiles:
                    cls._create_default_shifts(
                        db, org_id, site, current, created_shifts,
                    )
            else:
                # No profiles at all — use site defaults (day + night)
                cls._create_default_shifts(
                    db, org_id, site, current, created_shifts,
                )

            current += timedelta(days=1)

        if created_shifts:
            db.commit()

        return created_shifts

    @classmethod
    def generate_shifts_for_org(
        cls,
        db: Session,
        org_id: int,
        site_ids: Optional[List[int]],
        start_date: date,
        end_date: date,
    ) -> Dict:
        """
        Generate shifts for multiple sites within an organization.

        Args:
            site_ids: List of site IDs. If None, generates for all org sites.

        Returns:
            Summary dict: { shifts_created, by_site, skipped_existing }
        """
        if site_ids is None:
            sites = db.query(Site).filter(Site.org_id == org_id).all()
            site_ids = [s.site_id for s in sites]

        total_created = 0
        by_site: Dict[int, int] = {}

        for sid in site_ids:
            shifts = cls.generate_shifts_for_site(db, org_id, sid, start_date, end_date)
            count = len(shifts)
            by_site[sid] = count
            total_created += count

        # Get site names for the response
        sites_map = {
            s.site_id: s.site_name
            for s in db.query(Site).filter(Site.site_id.in_(site_ids)).all()
        }
        by_site_named = {
            sites_map.get(sid, f"Site {sid}"): count
            for sid, count in by_site.items()
        }

        return {
            "shifts_created": total_created,
            "by_site": by_site_named,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "sites_processed": len(site_ids),
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @classmethod
    def _matching_profiles(
        cls,
        profiles: List[SiteStaffingProfile],
        check_date: date,
        is_day: bool,
    ) -> List[SiteStaffingProfile]:
        """Return profiles that match the given date and day/night period."""
        check_time = time(10, 0) if is_day else time(22, 0)
        matched = []
        seen_keys = set()  # avoid duplicates from overlapping profiles

        for p in profiles:
            if not p.matches_datetime(check_date, check_time):
                continue
            # Deduplicate by period_type so we don't create 2 day shifts
            key = (p.period_type, p.day_type)
            if key in seen_keys:
                continue
            seen_keys.add(key)
            matched.append(p)

        return matched

    @classmethod
    def _profile_to_datetimes(
        cls,
        profile: SiteStaffingProfile,
        check_date: date,
    ) -> Tuple[datetime, datetime]:
        """Convert a profile's period type to concrete start/end datetimes."""
        if profile.period_type == PeriodType.CUSTOM and profile.custom_start_time and profile.custom_end_time:
            start_t = profile.custom_start_time
            end_t = profile.custom_end_time
        elif profile.period_type == PeriodType.DAY:
            start_t = cls.DEFAULT_DAY_START
            end_t = cls.DEFAULT_DAY_END
        elif profile.period_type == PeriodType.NIGHT:
            start_t = cls.DEFAULT_NIGHT_START
            end_t = cls.DEFAULT_NIGHT_END
        elif profile.period_type == PeriodType.ALL_DAY:
            # ALL_DAY: split into day + night handled at caller level
            # Here, treat as a full day shift
            start_t = cls.DEFAULT_DAY_START
            end_t = cls.DEFAULT_DAY_END
        else:
            start_t = cls.DEFAULT_DAY_START
            end_t = cls.DEFAULT_DAY_END

        shift_start = datetime.combine(check_date, start_t)

        # Night shifts cross midnight
        if end_t < start_t:
            shift_end = datetime.combine(check_date + timedelta(days=1), end_t)
        else:
            shift_end = datetime.combine(check_date, end_t)

        return shift_start, shift_end

    @classmethod
    def _create_shift_if_new(
        cls,
        db: Session,
        org_id: int,
        site_id: int,
        shift_start: datetime,
        shift_end: datetime,
        profile: Optional[SiteStaffingProfile],
        site: Site,
    ) -> Optional[Shift]:
        """Create a shift only if one doesn't already exist for this slot."""
        existing = db.query(Shift).filter(
            Shift.org_id == org_id,
            Shift.site_id == site_id,
            Shift.start_time == shift_start,
            Shift.end_time == shift_end,
        ).first()

        if existing:
            return None

        required_staff = profile.required_staff if profile else (site.min_staff or 1)
        required_skill = (profile.required_skill if profile else site.required_skill) or None
        requires_firearm = profile.requires_firearm if profile else False

        duration_hours = (shift_end - shift_start).total_seconds() / 3600

        shift = Shift(
            org_id=org_id,
            site_id=site_id,
            start_time=shift_start,
            end_time=shift_end,
            required_staff=required_staff,
            required_skill=required_skill,
            requires_firearm=requires_firearm,
            status=ShiftStatus.PLANNED,
            includes_meal_break=duration_hours > 5,
            meal_break_duration_minutes=60 if duration_hours > 5 else 0,
        )

        if profile and profile.required_psira_grade:
            from app.models.certification import PSIRAGrade
            grade_map = {
                "A": PSIRAGrade.GRADE_A,
                "B": PSIRAGrade.GRADE_B,
                "C": PSIRAGrade.GRADE_C,
                "D": PSIRAGrade.GRADE_D,
                "E": PSIRAGrade.GRADE_E,
            }
            grade_val = profile.required_psira_grade.value if hasattr(profile.required_psira_grade, 'value') else str(profile.required_psira_grade)
            if grade_val in grade_map:
                shift.required_psira_grade = grade_map[grade_val]

        db.add(shift)
        return shift

    @classmethod
    def _create_default_shifts(
        cls,
        db: Session,
        org_id: int,
        site: Site,
        check_date: date,
        created_shifts: List[Shift],
    ) -> None:
        """Create default day + night shifts when no profiles match."""
        # Day shift
        day_start = datetime.combine(check_date, cls.DEFAULT_DAY_START)
        day_end = datetime.combine(check_date, cls.DEFAULT_DAY_END)
        shift = cls._create_shift_if_new(
            db, org_id, site.site_id, day_start, day_end, None, site,
        )
        if shift:
            created_shifts.append(shift)

        # Night shift
        night_start = datetime.combine(check_date, cls.DEFAULT_NIGHT_START)
        night_end = datetime.combine(check_date + timedelta(days=1), cls.DEFAULT_NIGHT_END)
        shift = cls._create_shift_if_new(
            db, org_id, site.site_id, night_start, night_end, None, site,
        )
        if shift:
            created_shifts.append(shift)
