"""Roster Preferences API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.roster_preferences import (
    RosterPreferences,
    ConstraintScope,
    ConstraintLevel,
    EmergencyShiftRequest
)
from app.models.user import User
from app.api.deps import get_current_user
from app.services.constraint_resolver import ConstraintResolver
from pydantic import BaseModel, Field

router = APIRouter()


# === Pydantic Schemas ===

class RosterPreferencesBase(BaseModel):
    """Base schema for roster preferences"""
    scope: ConstraintScope
    client_id: Optional[int] = None
    site_id: Optional[int] = None
    employee_id: Optional[int] = None

    # Enforcement levels
    psira_compliance_level: Optional[ConstraintLevel] = None
    skill_matching_level: Optional[ConstraintLevel] = None
    availability_check_level: Optional[ConstraintLevel] = None
    client_assignment_level: Optional[ConstraintLevel] = None

    # BCEA compliance
    max_hours_week: Optional[int] = Field(None, ge=40, le=60)
    max_hours_week_level: Optional[ConstraintLevel] = None
    min_rest_hours: Optional[int] = Field(None, ge=6, le=12)
    min_rest_hours_level: Optional[ConstraintLevel] = None
    max_consecutive_days: Optional[int] = Field(None, ge=5, le=7)
    max_consecutive_days_level: Optional[ConstraintLevel] = None
    max_consecutive_nights: Optional[int] = Field(None, ge=2, le=5)
    max_consecutive_nights_level: Optional[ConstraintLevel] = None

    # Soft constraints
    fairness_weight: Optional[float] = Field(None, ge=0.0, le=1.0)
    max_distance_km: Optional[float] = Field(None, ge=0.0, le=500.0)
    max_distance_level: Optional[ConstraintLevel] = None
    prefer_client_experience: Optional[bool] = None
    prefer_site_experience: Optional[bool] = None

    # Premium pay settings
    night_shift_premium_amount: Optional[float] = Field(None, ge=0.0, description="Additional Rands per hour for night shifts")
    sunday_premium_percentage: Optional[float] = Field(None, ge=0.0, le=200.0, description="Percentage premium for Sundays")
    holiday_premium_percentage: Optional[float] = Field(None, ge=0.0, le=300.0, description="Percentage premium for public holidays")

    # Emergency mode
    allow_emergency_overrides: Optional[bool] = None
    emergency_relaxed_constraints: Optional[List[str]] = None
    notes: Optional[str] = None


class RosterPreferencesCreate(RosterPreferencesBase):
    """Schema for creating preferences"""
    pass


class RosterPreferencesUpdate(BaseModel):
    """Schema for updating preferences (all fields optional)"""
    # Enforcement levels
    psira_compliance_level: Optional[ConstraintLevel] = None
    skill_matching_level: Optional[ConstraintLevel] = None
    availability_check_level: Optional[ConstraintLevel] = None
    client_assignment_level: Optional[ConstraintLevel] = None

    # BCEA compliance
    max_hours_week: Optional[int] = Field(None, ge=40, le=60)
    max_hours_week_level: Optional[ConstraintLevel] = None
    min_rest_hours: Optional[int] = Field(None, ge=6, le=12)
    min_rest_hours_level: Optional[ConstraintLevel] = None
    max_consecutive_days: Optional[int] = Field(None, ge=5, le=7)
    max_consecutive_days_level: Optional[ConstraintLevel] = None
    max_consecutive_nights: Optional[int] = Field(None, ge=2, le=5)
    max_consecutive_nights_level: Optional[ConstraintLevel] = None

    # Soft constraints
    fairness_weight: Optional[float] = Field(None, ge=0.0, le=1.0)
    max_distance_km: Optional[float] = Field(None, ge=0.0, le=500.0)
    max_distance_level: Optional[ConstraintLevel] = None
    prefer_client_experience: Optional[bool] = None
    prefer_site_experience: Optional[bool] = None

    # Premium pay settings
    night_shift_premium_amount: Optional[float] = Field(None, ge=0.0, description="Additional Rands per hour for night shifts")
    sunday_premium_percentage: Optional[float] = Field(None, ge=0.0, le=200.0, description="Percentage premium for Sundays")
    holiday_premium_percentage: Optional[float] = Field(None, ge=0.0, le=300.0, description="Percentage premium for public holidays")

    # Emergency mode
    allow_emergency_overrides: Optional[bool] = None
    emergency_relaxed_constraints: Optional[List[str]] = None
    notes: Optional[str] = None


class RosterPreferencesResponse(RosterPreferencesBase):
    """Schema for preference responses"""
    preference_id: int
    org_id: int

    class Config:
        from_attributes = True


class EmergencyShiftRequestCreate(BaseModel):
    """Schema for creating emergency shift request"""
    original_shift_id: int
    original_employee_id: Optional[int] = None
    reason: str = Field(..., min_length=5, max_length=500)


class EmergencyShiftRequestResponse(BaseModel):
    """Schema for emergency shift request response"""
    request_id: int
    org_id: int
    original_shift_id: int
    original_employee_id: Optional[int]
    replacement_employee_id: Optional[int]
    reason: str
    requested_by: Optional[int]
    requested_at: int
    violated_constraints: List[str]
    status: str
    resolved_at: Optional[int]

    class Config:
        from_attributes = True


# === Preferences Endpoints ===

@router.get("/", response_model=List[RosterPreferencesResponse])
async def get_all_preferences(
    scope: Optional[ConstraintScope] = Query(None, description="Filter by scope"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all roster preferences for the organization.

    Optionally filter by scope (organization, client, site, employee).
    """
    org_id = current_user.org_id or 1

    query = db.query(RosterPreferences).filter(RosterPreferences.org_id == org_id)

    if scope:
        query = query.filter(RosterPreferences.scope == scope)

    preferences = query.all()
    return preferences


@router.get("/{preference_id}", response_model=RosterPreferencesResponse)
async def get_preference(
    preference_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get specific preference by ID."""
    org_id = current_user.org_id or 1

    preference = db.query(RosterPreferences).filter(
        RosterPreferences.preference_id == preference_id,
        RosterPreferences.org_id == org_id
    ).first()

    if not preference:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Preference with ID {preference_id} not found"
        )

    return preference


@router.post("/", response_model=RosterPreferencesResponse, status_code=status.HTTP_201_CREATED)
async def create_preference(
    preference_data: RosterPreferencesCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create new roster preference.

    Validates that the scope matches the provided IDs:
    - ORGANIZATION: No client/site/employee IDs
    - CLIENT: client_id required
    - SITE: site_id required
    - EMPLOYEE: employee_id required
    """
    org_id = current_user.org_id or 1

    # Validate scope-specific requirements
    if preference_data.scope == ConstraintScope.ORGANIZATION:
        if preference_data.client_id or preference_data.site_id or preference_data.employee_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization scope should not have client/site/employee IDs"
            )
    elif preference_data.scope == ConstraintScope.CLIENT:
        if not preference_data.client_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client scope requires client_id"
            )
    elif preference_data.scope == ConstraintScope.SITE:
        if not preference_data.site_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Site scope requires site_id"
            )
    elif preference_data.scope == ConstraintScope.EMPLOYEE:
        if not preference_data.employee_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee scope requires employee_id"
            )

    # Check if preference already exists for this scope
    existing = db.query(RosterPreferences).filter(
        RosterPreferences.org_id == org_id,
        RosterPreferences.scope == preference_data.scope,
        RosterPreferences.client_id == preference_data.client_id,
        RosterPreferences.site_id == preference_data.site_id,
        RosterPreferences.employee_id == preference_data.employee_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Preference already exists for this {preference_data.scope.value}"
        )

    # Create preference
    preference = RosterPreferences(
        org_id=org_id,
        **preference_data.model_dump()
    )

    db.add(preference)
    db.commit()
    db.refresh(preference)

    # Clear constraint cache for this org
    resolver = ConstraintResolver(db)
    resolver.clear_cache(org_id)

    return preference


@router.put("/{preference_id}", response_model=RosterPreferencesResponse)
async def update_preference(
    preference_id: int,
    preference_data: RosterPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update existing preference."""
    org_id = current_user.org_id or 1

    preference = db.query(RosterPreferences).filter(
        RosterPreferences.preference_id == preference_id,
        RosterPreferences.org_id == org_id
    ).first()

    if not preference:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Preference with ID {preference_id} not found"
        )

    # Update fields
    update_data = preference_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(preference, field, value)

    db.commit()
    db.refresh(preference)

    # Clear constraint cache
    resolver = ConstraintResolver(db)
    resolver.clear_cache(org_id)

    return preference


@router.delete("/{preference_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_preference(
    preference_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete preference (reverts to parent scope).

    Deleting a preference causes the system to fall back to the next level
    in the hierarchy (Employee → Site → Client → Org → System).
    """
    org_id = current_user.org_id or 1

    preference = db.query(RosterPreferences).filter(
        RosterPreferences.preference_id == preference_id,
        RosterPreferences.org_id == org_id
    ).first()

    if not preference:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Preference with ID {preference_id} not found"
        )

    db.delete(preference)
    db.commit()

    # Clear constraint cache
    resolver = ConstraintResolver(db)
    resolver.clear_cache(org_id)

    return None


@router.get("/resolve/preview")
async def preview_resolved_constraints(
    employee_id: Optional[int] = Query(None, description="Employee ID"),
    site_id: Optional[int] = Query(None, description="Site ID"),
    client_id: Optional[int] = Query(None, description="Client ID"),
    emergency_mode: bool = Query(False, description="Enable emergency mode"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Preview resolved constraints for given context.

    Shows the final constraint values after applying the hierarchy:
    Employee → Site → Client → Organization → System

    Useful for debugging and understanding which constraints are active.
    """
    org_id = current_user.org_id or 1

    resolver = ConstraintResolver(db)
    constraints = resolver.resolve_constraints(
        org_id=org_id,
        employee_id=employee_id,
        site_id=site_id,
        client_id=client_id,
        emergency_mode=emergency_mode
    )

    summary = resolver.get_constraint_summary(constraints)

    return {
        "context": {
            "org_id": org_id,
            "employee_id": employee_id,
            "site_id": site_id,
            "client_id": client_id,
            "emergency_mode": emergency_mode
        },
        "resolved_constraints": summary
    }


# === Emergency Shift Endpoints ===

@router.post("/emergency-shifts", response_model=EmergencyShiftRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_emergency_request(
    request_data: EmergencyShiftRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create emergency shift replacement request.

    Use this when a guard calls in sick or there's an urgent need for replacement.
    The system will attempt to find replacements with relaxed constraints.
    """
    from datetime import datetime as dt
    org_id = current_user.org_id or 1

    # Verify shift exists
    from app.models.shift import Shift
    shift = db.query(Shift).filter(Shift.shift_id == request_data.original_shift_id).first()
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with ID {request_data.original_shift_id} not found"
        )

    # Create emergency request
    emergency_request = EmergencyShiftRequest(
        org_id=org_id,
        original_shift_id=request_data.original_shift_id,
        original_employee_id=request_data.original_employee_id,
        reason=request_data.reason,
        requested_by=current_user.user_id,
        requested_at=int(dt.utcnow().timestamp()),
        status="pending"
    )

    db.add(emergency_request)
    db.commit()
    db.refresh(emergency_request)

    return emergency_request


@router.get("/emergency-shifts", response_model=List[EmergencyShiftRequestResponse])
async def get_emergency_requests(
    status_filter: Optional[str] = Query(None, description="Filter by status (pending/filled/cancelled)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all emergency shift requests for the organization."""
    org_id = current_user.org_id or 1

    query = db.query(EmergencyShiftRequest).filter(EmergencyShiftRequest.org_id == org_id)

    if status_filter:
        query = query.filter(EmergencyShiftRequest.status == status_filter)

    requests = query.order_by(EmergencyShiftRequest.requested_at.desc()).all()
    return requests


@router.post("/emergency-shifts/{request_id}/resolve")
async def resolve_emergency_request(
    request_id: int,
    replacement_employee_id: int,
    assignment_id: int,
    violated_constraints: List[str] = [],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark emergency request as resolved with replacement details.

    Records which constraints were violated to maintain audit trail.
    """
    from datetime import datetime as dt
    org_id = current_user.org_id or 1

    request = db.query(EmergencyShiftRequest).filter(
        EmergencyShiftRequest.request_id == request_id,
        EmergencyShiftRequest.org_id == org_id
    ).first()

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Emergency request with ID {request_id} not found"
        )

    if request.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Request already {request.status}"
        )

    # Update request
    request.replacement_employee_id = replacement_employee_id
    request.replacement_shift_assignment_id = assignment_id
    request.violated_constraints = violated_constraints
    request.status = "filled"
    request.resolved_at = int(dt.utcnow().timestamp())

    db.commit()
    db.refresh(request)

    return {
        "message": "Emergency request resolved successfully",
        "request": request
    }
