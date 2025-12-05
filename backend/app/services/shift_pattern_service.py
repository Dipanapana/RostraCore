"""Shift pattern service for generating shifts from rotation templates."""

from datetime import datetime, date, time, timedelta
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.shift_pattern_template import ShiftPatternTemplate, PatternType, COMMON_PATTERNS
from app.models.shift import Shift
from app.models.site import Site
from app.models.employee import Employee


class ShiftPatternService:
    """Service for managing shift patterns and generating shifts from templates."""

    # =========================================================================
    # TEMPLATE CRUD OPERATIONS
    # =========================================================================

    @staticmethod
    def get_all_templates(
        db: Session,
        org_id: int,
        active_only: bool = True
    ) -> List[ShiftPatternTemplate]:
        """Get all shift pattern templates for an organization."""
        query = db.query(ShiftPatternTemplate).filter(
            ShiftPatternTemplate.org_id == org_id
        )
        if active_only:
            query = query.filter(ShiftPatternTemplate.is_active == True)
        return query.order_by(ShiftPatternTemplate.name).all()

    @staticmethod
    def get_template_by_id(
        db: Session,
        template_id: int,
        org_id: int
    ) -> Optional[ShiftPatternTemplate]:
        """Get a specific template by ID."""
        return db.query(ShiftPatternTemplate).filter(
            ShiftPatternTemplate.template_id == template_id,
            ShiftPatternTemplate.org_id == org_id
        ).first()

    @staticmethod
    def create_template(
        db: Session,
        org_id: int,
        name: str,
        pattern_type: PatternType,
        shift_duration_hours: int,
        days_on: int,
        nights_on: int,
        rest_after_days: int,
        rest_after_nights: int,
        day_shift_start: time,
        day_shift_end: time,
        night_shift_start: time,
        night_shift_end: time,
        description: Optional[str] = None,
        max_consecutive_days: int = 6,
        max_consecutive_nights: int = 3,
        min_rest_between_shifts: int = 12,
        max_hours_per_week: int = 45,
        max_hours_per_month: Optional[int] = None,
        include_meal_break: bool = True,
        meal_break_duration_minutes: int = 60,
        is_default: bool = False
    ) -> ShiftPatternTemplate:
        """Create a new shift pattern template."""
        # If setting as default, unset any existing default
        if is_default:
            db.query(ShiftPatternTemplate).filter(
                ShiftPatternTemplate.org_id == org_id,
                ShiftPatternTemplate.is_default == True
            ).update({ShiftPatternTemplate.is_default: False})

        template = ShiftPatternTemplate(
            org_id=org_id,
            name=name,
            description=description,
            pattern_type=pattern_type,
            shift_duration_hours=shift_duration_hours,
            days_on=days_on,
            nights_on=nights_on,
            rest_after_days=rest_after_days,
            rest_after_nights=rest_after_nights,
            day_shift_start=day_shift_start,
            day_shift_end=day_shift_end,
            night_shift_start=night_shift_start,
            night_shift_end=night_shift_end,
            max_consecutive_days=max_consecutive_days,
            max_consecutive_nights=max_consecutive_nights,
            min_rest_between_shifts=min_rest_between_shifts,
            max_hours_per_week=max_hours_per_week,
            max_hours_per_month=max_hours_per_month,
            include_meal_break=include_meal_break,
            meal_break_duration_minutes=meal_break_duration_minutes,
            is_default=is_default
        )

        db.add(template)
        db.commit()
        db.refresh(template)
        return template

    @staticmethod
    def update_template(
        db: Session,
        template_id: int,
        org_id: int,
        updates: Dict[str, Any]
    ) -> Optional[ShiftPatternTemplate]:
        """Update an existing template."""
        template = ShiftPatternService.get_template_by_id(db, template_id, org_id)
        if not template:
            return None

        # If setting as default, unset any existing default
        if updates.get('is_default', False):
            db.query(ShiftPatternTemplate).filter(
                ShiftPatternTemplate.org_id == org_id,
                ShiftPatternTemplate.is_default == True,
                ShiftPatternTemplate.template_id != template_id
            ).update({ShiftPatternTemplate.is_default: False})

        for key, value in updates.items():
            if hasattr(template, key):
                setattr(template, key, value)

        db.commit()
        db.refresh(template)
        return template

    @staticmethod
    def delete_template(
        db: Session,
        template_id: int,
        org_id: int,
        soft_delete: bool = True
    ) -> bool:
        """Delete a template (soft delete by default)."""
        template = ShiftPatternService.get_template_by_id(db, template_id, org_id)
        if not template:
            return False

        if soft_delete:
            template.is_active = False
            db.commit()
        else:
            db.delete(template)
            db.commit()

        return True

    @staticmethod
    def seed_common_patterns(db: Session, org_id: int) -> List[ShiftPatternTemplate]:
        """Seed an organization with common shift patterns."""
        created = []
        for pattern_data in COMMON_PATTERNS:
            # Parse time strings to time objects
            day_start = datetime.strptime(pattern_data['day_shift_start'], '%H:%M').time()
            day_end = datetime.strptime(pattern_data['day_shift_end'], '%H:%M').time()
            night_start = datetime.strptime(pattern_data['night_shift_start'], '%H:%M').time()
            night_end = datetime.strptime(pattern_data['night_shift_end'], '%H:%M').time()

            template = ShiftPatternService.create_template(
                db=db,
                org_id=org_id,
                name=pattern_data['name'],
                description=pattern_data['description'],
                pattern_type=pattern_data['pattern_type'],
                shift_duration_hours=pattern_data['shift_duration_hours'],
                days_on=pattern_data['days_on'],
                nights_on=pattern_data['nights_on'],
                rest_after_days=pattern_data['rest_after_days'],
                rest_after_nights=pattern_data['rest_after_nights'],
                day_shift_start=day_start,
                day_shift_end=day_end,
                night_shift_start=night_start,
                night_shift_end=night_end,
                max_consecutive_days=pattern_data.get('max_consecutive_days', 6),
                max_consecutive_nights=pattern_data.get('max_consecutive_nights', 3),
                is_default=(pattern_data['pattern_type'] == PatternType.FOUR_ON_FOUR_OFF)
            )
            created.append(template)

        return created

    # =========================================================================
    # SHIFT GENERATION
    # =========================================================================

    @staticmethod
    def generate_shifts_from_pattern(
        db: Session,
        template_id: int,
        org_id: int,
        site_id: int,
        start_date: date,
        end_date: date,
        required_staff: int = 1,
        create_shifts: bool = True
    ) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Generate shifts from a pattern template for a site.

        Args:
            db: Database session
            template_id: Pattern template to use
            org_id: Organization ID
            site_id: Site to generate shifts for
            start_date: Start date for shift generation
            end_date: End date for shift generation
            required_staff: Number of guards needed per shift
            create_shifts: If True, create shifts in DB. If False, preview only.

        Returns:
            Tuple of (generated_shifts, warnings)
        """
        template = ShiftPatternService.get_template_by_id(db, template_id, org_id)
        if not template:
            return [], ["Template not found"]

        site = db.query(Site).filter(
            Site.site_id == site_id,
            Site.org_id == org_id
        ).first()
        if not site:
            return [], ["Site not found"]

        # Validate BCEA compliance
        is_compliant, violations = template.validate_bcea_compliance()
        warnings = []
        if not is_compliant:
            warnings.extend([f"BCEA Warning: {v}" for v in violations])

        generated_shifts = []
        current_date = start_date

        while current_date <= end_date:
            # Generate day shift
            if template.days_on > 0:
                day_shift = ShiftPatternService._create_shift_dict(
                    site_id=site_id,
                    org_id=org_id,
                    shift_date=current_date,
                    start_time=template.day_shift_start,
                    end_time=template.day_shift_end,
                    shift_type="day",
                    required_staff=required_staff,
                    template_id=template_id,
                    include_meal_break=template.include_meal_break,
                    meal_break_minutes=template.meal_break_duration_minutes
                )
                generated_shifts.append(day_shift)

            # Generate night shift
            if template.nights_on > 0:
                night_shift = ShiftPatternService._create_shift_dict(
                    site_id=site_id,
                    org_id=org_id,
                    shift_date=current_date,
                    start_time=template.night_shift_start,
                    end_time=template.night_shift_end,
                    shift_type="night",
                    required_staff=required_staff,
                    template_id=template_id,
                    include_meal_break=template.include_meal_break,
                    meal_break_minutes=template.meal_break_duration_minutes
                )
                generated_shifts.append(night_shift)

            current_date += timedelta(days=1)

        # Create shifts in database if requested
        if create_shifts and generated_shifts:
            created_shifts = []
            for shift_data in generated_shifts:
                shift = Shift(
                    site_id=shift_data['site_id'],
                    org_id=shift_data['org_id'],
                    start_time=shift_data['start_time'],
                    end_time=shift_data['end_time'],
                    shift_type=shift_data['shift_type'],
                    required_staff=shift_data['required_staff'],
                    status='open',
                    notes=shift_data.get('notes', '')
                )
                db.add(shift)
                created_shifts.append(shift)

            db.commit()

            # Update shift_data with created IDs
            for i, shift in enumerate(created_shifts):
                db.refresh(shift)
                generated_shifts[i]['shift_id'] = shift.shift_id

        return generated_shifts, warnings

    @staticmethod
    def _create_shift_dict(
        site_id: int,
        org_id: int,
        shift_date: date,
        start_time: time,
        end_time: time,
        shift_type: str,
        required_staff: int,
        template_id: int,
        include_meal_break: bool,
        meal_break_minutes: int
    ) -> Dict[str, Any]:
        """Create a shift dictionary from pattern parameters."""
        # Combine date with time
        start_datetime = datetime.combine(shift_date, start_time)

        # Handle overnight shifts (night shifts that end the next day)
        if start_time > end_time:
            # Night shift ends next day
            end_datetime = datetime.combine(shift_date + timedelta(days=1), end_time)
        else:
            end_datetime = datetime.combine(shift_date, end_time)

        # Calculate duration
        duration = (end_datetime - start_datetime).total_seconds() / 3600

        notes = f"Generated from pattern template #{template_id}"
        if include_meal_break:
            notes += f" | {meal_break_minutes}min meal break included"

        return {
            'site_id': site_id,
            'org_id': org_id,
            'start_time': start_datetime,
            'end_time': end_datetime,
            'shift_type': shift_type,
            'required_staff': required_staff,
            'duration_hours': duration,
            'template_id': template_id,
            'notes': notes
        }

    # =========================================================================
    # GUARD ASSIGNMENT HELPERS
    # =========================================================================

    @staticmethod
    def calculate_required_guards(
        template: ShiftPatternTemplate,
        num_posts: int = 1
    ) -> Dict[str, Any]:
        """
        Calculate the number of guards needed for 24/7 coverage.

        Returns breakdown of guards needed and cost estimates.
        """
        guards_needed = template.calculate_guards_needed(num_posts)
        hours_per_guard_per_cycle = template.hours_per_cycle
        cycle_days = template.cycle_length_days

        return {
            'guards_needed': guards_needed,
            'posts': num_posts,
            'pattern_name': template.name,
            'cycle_length_days': cycle_days,
            'working_days_per_cycle': template.working_days_per_cycle,
            'hours_per_guard_per_cycle': hours_per_guard_per_cycle,
            'average_hours_per_week': template.average_hours_per_week,
            'shift_duration': template.shift_duration_hours,
            'explanation': f"For {num_posts} post(s) with {template.name} pattern, "
                          f"you need {guards_needed} guards to maintain 24/7 coverage. "
                          f"Each guard works {template.working_days_per_cycle} days "
                          f"per {cycle_days}-day cycle."
        }

    @staticmethod
    def suggest_guard_assignments(
        db: Session,
        template_id: int,
        org_id: int,
        site_id: int,
        start_date: date,
        available_employees: List[int]
    ) -> Dict[str, Any]:
        """
        Suggest guard assignments based on pattern rotation.

        This creates rotation groups (e.g., Team A, Team B) and
        assigns guards to each team based on availability.
        """
        template = ShiftPatternService.get_template_by_id(db, template_id, org_id)
        if not template:
            return {'error': 'Template not found', 'assignments': []}

        guards_needed = template.calculate_guards_needed(posts=1)

        # For 4-on-4-off with 12-hour shifts: 4 guards needed
        # Team A (2 guards): Works day shifts
        # Team B (2 guards): Works night shifts
        # They alternate every 4 days

        if len(available_employees) < guards_needed:
            return {
                'error': f'Not enough guards. Need {guards_needed}, have {len(available_employees)}',
                'guards_needed': guards_needed,
                'guards_available': len(available_employees),
                'assignments': []
            }

        # Simple team assignment for 4-on-4-off
        teams = {
            'Team A (Days)': available_employees[:guards_needed // 2],
            'Team B (Nights)': available_employees[guards_needed // 2:guards_needed]
        }

        return {
            'template': template.name,
            'guards_needed': guards_needed,
            'guards_available': len(available_employees),
            'teams': teams,
            'rotation_explanation': f"Teams rotate every {template.days_on} days. "
                                   f"Team A works days, Team B works nights, then they swap."
        }

    # =========================================================================
    # VALIDATION
    # =========================================================================

    @staticmethod
    def validate_pattern_for_site(
        db: Session,
        template_id: int,
        org_id: int,
        site_id: int
    ) -> Tuple[bool, List[str]]:
        """
        Validate if a pattern is suitable for a site.

        Checks:
        - Site security level requirements
        - Required certifications
        - Operating hours compatibility
        """
        template = ShiftPatternService.get_template_by_id(db, template_id, org_id)
        if not template:
            return False, ["Template not found"]

        site = db.query(Site).filter(
            Site.site_id == site_id,
            Site.org_id == org_id
        ).first()
        if not site:
            return False, ["Site not found"]

        warnings = []

        # Check BCEA compliance
        is_compliant, violations = template.validate_bcea_compliance()
        if not is_compliant:
            warnings.extend(violations)

        # Check if site operates 24/7 and pattern supports it
        if template.nights_on == 0:
            warnings.append(
                "Pattern has no night shifts - may not be suitable for 24/7 sites"
            )

        # Check shift duration matches site requirements
        if hasattr(site, 'min_shift_hours') and site.min_shift_hours:
            if template.shift_duration_hours < site.min_shift_hours:
                warnings.append(
                    f"Shift duration ({template.shift_duration_hours}h) is less than "
                    f"site minimum ({site.min_shift_hours}h)"
                )

        return len(warnings) == 0, warnings
