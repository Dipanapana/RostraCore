"""Shift Pattern API endpoints for managing rotation templates."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, time, datetime
from pydantic import BaseModel, Field

from app.database import get_db
from app.auth.security import get_current_org_id
from app.services.shift_pattern_service import ShiftPatternService
from app.models.shift_pattern_template import PatternType


router = APIRouter()


# =============================================================================
# SCHEMAS
# =============================================================================

class ShiftPatternTemplateBase(BaseModel):
    """Base schema for shift pattern template."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    pattern_type: PatternType = PatternType.FOUR_ON_FOUR_OFF
    shift_duration_hours: int = Field(default=12, ge=4, le=16)
    days_on: int = Field(default=4, ge=0, le=7)
    nights_on: int = Field(default=4, ge=0, le=7)
    rest_after_days: int = Field(default=4, ge=0, le=14)
    rest_after_nights: int = Field(default=4, ge=0, le=14)
    day_shift_start: time
    day_shift_end: time
    night_shift_start: time
    night_shift_end: time
    max_consecutive_days: int = Field(default=6, ge=1, le=7)
    max_consecutive_nights: int = Field(default=3, ge=1, le=7)
    min_rest_between_shifts: int = Field(default=12, ge=8, le=24)
    max_hours_per_week: int = Field(default=45, ge=20, le=60)
    max_hours_per_month: Optional[int] = Field(default=None, ge=100, le=300)
    include_meal_break: bool = True
    meal_break_duration_minutes: int = Field(default=60, ge=30, le=120)
    is_default: bool = False


class ShiftPatternTemplateCreate(ShiftPatternTemplateBase):
    """Schema for creating a new template."""
    pass


class ShiftPatternTemplateUpdate(BaseModel):
    """Schema for updating a template."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = None
    pattern_type: Optional[PatternType] = None
    shift_duration_hours: Optional[int] = Field(default=None, ge=4, le=16)
    days_on: Optional[int] = Field(default=None, ge=0, le=7)
    nights_on: Optional[int] = Field(default=None, ge=0, le=7)
    rest_after_days: Optional[int] = Field(default=None, ge=0, le=14)
    rest_after_nights: Optional[int] = Field(default=None, ge=0, le=14)
    day_shift_start: Optional[time] = None
    day_shift_end: Optional[time] = None
    night_shift_start: Optional[time] = None
    night_shift_end: Optional[time] = None
    max_consecutive_days: Optional[int] = Field(default=None, ge=1, le=7)
    max_consecutive_nights: Optional[int] = Field(default=None, ge=1, le=7)
    min_rest_between_shifts: Optional[int] = Field(default=None, ge=8, le=24)
    max_hours_per_week: Optional[int] = Field(default=None, ge=20, le=60)
    max_hours_per_month: Optional[int] = Field(default=None, ge=100, le=300)
    include_meal_break: Optional[bool] = None
    meal_break_duration_minutes: Optional[int] = Field(default=None, ge=30, le=120)
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class ShiftPatternTemplateResponse(ShiftPatternTemplateBase):
    """Schema for template response."""
    template_id: int
    org_id: int
    is_active: bool
    cycle_length_days: int
    working_days_per_cycle: int
    hours_per_cycle: float
    average_hours_per_week: float
    is_bcea_compliant: bool
    bcea_violations: List[str]

    class Config:
        from_attributes = True


class GenerateShiftsRequest(BaseModel):
    """Schema for shift generation request."""
    template_id: int
    site_id: int
    start_date: date
    end_date: date
    required_staff: int = Field(default=1, ge=1, le=10)
    preview_only: bool = False


class GenerateShiftsResponse(BaseModel):
    """Schema for shift generation response."""
    shifts_generated: int
    preview_only: bool
    warnings: List[str]
    shifts: List[dict]


class GuardCalculationRequest(BaseModel):
    """Schema for guard calculation request."""
    template_id: int
    num_posts: int = Field(default=1, ge=1, le=20)


class GuardCalculationResponse(BaseModel):
    """Schema for guard calculation response."""
    guards_needed: int
    posts: int
    pattern_name: str
    cycle_length_days: int
    working_days_per_cycle: int
    hours_per_guard_per_cycle: float
    average_hours_per_week: float
    shift_duration: int
    explanation: str


class BCEAValidationResponse(BaseModel):
    """Schema for BCEA validation response."""
    is_compliant: bool
    violations: List[str]
    template_name: str
    average_weekly_hours: float


# =============================================================================
# TEMPLATE CRUD ENDPOINTS
# =============================================================================

@router.get("/templates", response_model=List[ShiftPatternTemplateResponse])
async def list_templates(
    active_only: bool = Query(default=True, description="Only return active templates"),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    List all shift pattern templates for the organization.

    Returns templates with calculated properties like cycle length and BCEA compliance.
    """
    templates = ShiftPatternService.get_all_templates(db, org_id, active_only)

    return [
        ShiftPatternTemplateResponse(
            template_id=t.template_id,
            org_id=t.org_id,
            name=t.name,
            description=t.description,
            pattern_type=t.pattern_type,
            shift_duration_hours=t.shift_duration_hours,
            days_on=t.days_on,
            nights_on=t.nights_on,
            rest_after_days=t.rest_after_days,
            rest_after_nights=t.rest_after_nights,
            day_shift_start=t.day_shift_start,
            day_shift_end=t.day_shift_end,
            night_shift_start=t.night_shift_start,
            night_shift_end=t.night_shift_end,
            max_consecutive_days=t.max_consecutive_days,
            max_consecutive_nights=t.max_consecutive_nights,
            min_rest_between_shifts=t.min_rest_between_shifts,
            max_hours_per_week=t.max_hours_per_week,
            max_hours_per_month=t.max_hours_per_month,
            include_meal_break=t.include_meal_break,
            meal_break_duration_minutes=t.meal_break_duration_minutes,
            is_default=t.is_default,
            is_active=t.is_active,
            cycle_length_days=t.cycle_length_days,
            working_days_per_cycle=t.working_days_per_cycle,
            hours_per_cycle=t.hours_per_cycle,
            average_hours_per_week=t.average_hours_per_week,
            is_bcea_compliant=t.validate_bcea_compliance()[0],
            bcea_violations=t.validate_bcea_compliance()[1]
        )
        for t in templates
    ]


@router.get("/templates/{template_id}", response_model=ShiftPatternTemplateResponse)
async def get_template(
    template_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Get a specific shift pattern template by ID."""
    template = ShiftPatternService.get_template_by_id(db, template_id, org_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with ID {template_id} not found"
        )

    is_compliant, violations = template.validate_bcea_compliance()

    return ShiftPatternTemplateResponse(
        template_id=template.template_id,
        org_id=template.org_id,
        name=template.name,
        description=template.description,
        pattern_type=template.pattern_type,
        shift_duration_hours=template.shift_duration_hours,
        days_on=template.days_on,
        nights_on=template.nights_on,
        rest_after_days=template.rest_after_days,
        rest_after_nights=template.rest_after_nights,
        day_shift_start=template.day_shift_start,
        day_shift_end=template.day_shift_end,
        night_shift_start=template.night_shift_start,
        night_shift_end=template.night_shift_end,
        max_consecutive_days=template.max_consecutive_days,
        max_consecutive_nights=template.max_consecutive_nights,
        min_rest_between_shifts=template.min_rest_between_shifts,
        max_hours_per_week=template.max_hours_per_week,
        max_hours_per_month=template.max_hours_per_month,
        include_meal_break=template.include_meal_break,
        meal_break_duration_minutes=template.meal_break_duration_minutes,
        is_default=template.is_default,
        is_active=template.is_active,
        cycle_length_days=template.cycle_length_days,
        working_days_per_cycle=template.working_days_per_cycle,
        hours_per_cycle=template.hours_per_cycle,
        average_hours_per_week=template.average_hours_per_week,
        is_bcea_compliant=is_compliant,
        bcea_violations=violations
    )


@router.post("/templates", response_model=ShiftPatternTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_data: ShiftPatternTemplateCreate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Create a new shift pattern template.

    The template will be automatically validated for BCEA compliance.
    """
    template = ShiftPatternService.create_template(
        db=db,
        org_id=org_id,
        name=template_data.name,
        description=template_data.description,
        pattern_type=template_data.pattern_type,
        shift_duration_hours=template_data.shift_duration_hours,
        days_on=template_data.days_on,
        nights_on=template_data.nights_on,
        rest_after_days=template_data.rest_after_days,
        rest_after_nights=template_data.rest_after_nights,
        day_shift_start=template_data.day_shift_start,
        day_shift_end=template_data.day_shift_end,
        night_shift_start=template_data.night_shift_start,
        night_shift_end=template_data.night_shift_end,
        max_consecutive_days=template_data.max_consecutive_days,
        max_consecutive_nights=template_data.max_consecutive_nights,
        min_rest_between_shifts=template_data.min_rest_between_shifts,
        max_hours_per_week=template_data.max_hours_per_week,
        max_hours_per_month=template_data.max_hours_per_month,
        include_meal_break=template_data.include_meal_break,
        meal_break_duration_minutes=template_data.meal_break_duration_minutes,
        is_default=template_data.is_default
    )

    is_compliant, violations = template.validate_bcea_compliance()

    return ShiftPatternTemplateResponse(
        template_id=template.template_id,
        org_id=template.org_id,
        name=template.name,
        description=template.description,
        pattern_type=template.pattern_type,
        shift_duration_hours=template.shift_duration_hours,
        days_on=template.days_on,
        nights_on=template.nights_on,
        rest_after_days=template.rest_after_days,
        rest_after_nights=template.rest_after_nights,
        day_shift_start=template.day_shift_start,
        day_shift_end=template.day_shift_end,
        night_shift_start=template.night_shift_start,
        night_shift_end=template.night_shift_end,
        max_consecutive_days=template.max_consecutive_days,
        max_consecutive_nights=template.max_consecutive_nights,
        min_rest_between_shifts=template.min_rest_between_shifts,
        max_hours_per_week=template.max_hours_per_week,
        max_hours_per_month=template.max_hours_per_month,
        include_meal_break=template.include_meal_break,
        meal_break_duration_minutes=template.meal_break_duration_minutes,
        is_default=template.is_default,
        is_active=template.is_active,
        cycle_length_days=template.cycle_length_days,
        working_days_per_cycle=template.working_days_per_cycle,
        hours_per_cycle=template.hours_per_cycle,
        average_hours_per_week=template.average_hours_per_week,
        is_bcea_compliant=is_compliant,
        bcea_violations=violations
    )


@router.patch("/templates/{template_id}", response_model=ShiftPatternTemplateResponse)
async def update_template(
    template_id: int,
    template_data: ShiftPatternTemplateUpdate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Update an existing shift pattern template."""
    updates = template_data.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )

    template = ShiftPatternService.update_template(db, template_id, org_id, updates)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with ID {template_id} not found"
        )

    is_compliant, violations = template.validate_bcea_compliance()

    return ShiftPatternTemplateResponse(
        template_id=template.template_id,
        org_id=template.org_id,
        name=template.name,
        description=template.description,
        pattern_type=template.pattern_type,
        shift_duration_hours=template.shift_duration_hours,
        days_on=template.days_on,
        nights_on=template.nights_on,
        rest_after_days=template.rest_after_days,
        rest_after_nights=template.rest_after_nights,
        day_shift_start=template.day_shift_start,
        day_shift_end=template.day_shift_end,
        night_shift_start=template.night_shift_start,
        night_shift_end=template.night_shift_end,
        max_consecutive_days=template.max_consecutive_days,
        max_consecutive_nights=template.max_consecutive_nights,
        min_rest_between_shifts=template.min_rest_between_shifts,
        max_hours_per_week=template.max_hours_per_week,
        max_hours_per_month=template.max_hours_per_month,
        include_meal_break=template.include_meal_break,
        meal_break_duration_minutes=template.meal_break_duration_minutes,
        is_default=template.is_default,
        is_active=template.is_active,
        cycle_length_days=template.cycle_length_days,
        working_days_per_cycle=template.working_days_per_cycle,
        hours_per_cycle=template.hours_per_cycle,
        average_hours_per_week=template.average_hours_per_week,
        is_bcea_compliant=is_compliant,
        bcea_violations=violations
    )


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    hard_delete: bool = Query(default=False, description="Permanently delete instead of soft delete"),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Delete a shift pattern template.

    By default, performs a soft delete (sets is_active=False).
    Use hard_delete=true to permanently remove.
    """
    success = ShiftPatternService.delete_template(
        db, template_id, org_id, soft_delete=not hard_delete
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with ID {template_id} not found"
        )
    return None


# =============================================================================
# SEED & UTILITY ENDPOINTS
# =============================================================================

@router.post("/templates/seed", response_model=List[ShiftPatternTemplateResponse])
async def seed_common_patterns(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Seed the organization with common shift patterns.

    Creates 4-on-4-off, 2-2-3, 6-on-3-off, and 5-on-2-off patterns.
    Only call this once per organization.
    """
    # Check if patterns already exist
    existing = ShiftPatternService.get_all_templates(db, org_id, active_only=False)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization already has shift patterns. Delete existing patterns first."
        )

    templates = ShiftPatternService.seed_common_patterns(db, org_id)

    return [
        ShiftPatternTemplateResponse(
            template_id=t.template_id,
            org_id=t.org_id,
            name=t.name,
            description=t.description,
            pattern_type=t.pattern_type,
            shift_duration_hours=t.shift_duration_hours,
            days_on=t.days_on,
            nights_on=t.nights_on,
            rest_after_days=t.rest_after_days,
            rest_after_nights=t.rest_after_nights,
            day_shift_start=t.day_shift_start,
            day_shift_end=t.day_shift_end,
            night_shift_start=t.night_shift_start,
            night_shift_end=t.night_shift_end,
            max_consecutive_days=t.max_consecutive_days,
            max_consecutive_nights=t.max_consecutive_nights,
            min_rest_between_shifts=t.min_rest_between_shifts,
            max_hours_per_week=t.max_hours_per_week,
            max_hours_per_month=t.max_hours_per_month,
            include_meal_break=t.include_meal_break,
            meal_break_duration_minutes=t.meal_break_duration_minutes,
            is_default=t.is_default,
            is_active=t.is_active,
            cycle_length_days=t.cycle_length_days,
            working_days_per_cycle=t.working_days_per_cycle,
            hours_per_cycle=t.hours_per_cycle,
            average_hours_per_week=t.average_hours_per_week,
            is_bcea_compliant=t.validate_bcea_compliance()[0],
            bcea_violations=t.validate_bcea_compliance()[1]
        )
        for t in templates
    ]


# =============================================================================
# SHIFT GENERATION ENDPOINTS
# =============================================================================

@router.post("/generate", response_model=GenerateShiftsResponse)
async def generate_shifts(
    request: GenerateShiftsRequest,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Generate shifts from a pattern template for a site.

    Set preview_only=true to see what would be generated without creating shifts.
    """
    # Validate date range
    if request.end_date < request.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )

    max_days = 90  # Max 3 months at a time
    date_diff = (request.end_date - request.start_date).days
    if date_diff > max_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Date range cannot exceed {max_days} days. Please generate in smaller batches."
        )

    shifts, warnings = ShiftPatternService.generate_shifts_from_pattern(
        db=db,
        template_id=request.template_id,
        org_id=org_id,
        site_id=request.site_id,
        start_date=request.start_date,
        end_date=request.end_date,
        required_staff=request.required_staff,
        create_shifts=not request.preview_only
    )

    if not shifts and "not found" in str(warnings):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=warnings[0] if warnings else "Template or site not found"
        )

    return GenerateShiftsResponse(
        shifts_generated=len(shifts),
        preview_only=request.preview_only,
        warnings=warnings,
        shifts=shifts
    )


# =============================================================================
# CALCULATION & VALIDATION ENDPOINTS
# =============================================================================

@router.post("/calculate-guards", response_model=GuardCalculationResponse)
async def calculate_guards_needed(
    request: GuardCalculationRequest,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Calculate the number of guards needed for 24/7 coverage.

    Provides breakdown of staffing requirements based on the pattern.
    """
    template = ShiftPatternService.get_template_by_id(db, request.template_id, org_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with ID {request.template_id} not found"
        )

    result = ShiftPatternService.calculate_required_guards(template, request.num_posts)

    return GuardCalculationResponse(**result)


@router.get("/templates/{template_id}/validate-bcea", response_model=BCEAValidationResponse)
async def validate_bcea_compliance(
    template_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Validate a template against BCEA (Basic Conditions of Employment Act) requirements.

    Checks:
    - Maximum 45 ordinary hours per week (55 with overtime)
    - Maximum 6 consecutive working days
    - Maximum 3-4 consecutive night shifts (fatigue management)
    - Minimum 12 hours rest between shifts
    - Mandatory meal breaks for shifts > 5 hours
    """
    template = ShiftPatternService.get_template_by_id(db, template_id, org_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with ID {template_id} not found"
        )

    is_compliant, violations = template.validate_bcea_compliance()

    return BCEAValidationResponse(
        is_compliant=is_compliant,
        violations=violations,
        template_name=template.name,
        average_weekly_hours=template.average_hours_per_week
    )
