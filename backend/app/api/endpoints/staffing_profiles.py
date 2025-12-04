"""API endpoints for site staffing profiles."""

from datetime import date, time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.site_staffing_profile import (
    SiteStaffingProfile, PeriodType, DayType, PSIRAGradeRequirement
)
from app.services.staffing_profile_service import StaffingProfileService

router = APIRouter()


# Pydantic schemas
class StaffingProfileBase(BaseModel):
    profile_name: str = Field(..., max_length=100)
    period_type: str = Field(..., description="day, night, all_day, or custom")
    day_type: str = Field(..., description="weekday, weekend, monday-sunday, public_holiday, or all")
    required_staff: int = Field(1, ge=1)
    required_skill: Optional[str] = None
    required_psira_grade: Optional[str] = None
    requires_firearm: bool = False
    priority: int = Field(0, ge=0)
    custom_start_time: Optional[str] = None  # HH:MM format
    custom_end_time: Optional[str] = None


class StaffingProfileCreate(StaffingProfileBase):
    pass


class StaffingProfileUpdate(BaseModel):
    profile_name: Optional[str] = None
    period_type: Optional[str] = None
    day_type: Optional[str] = None
    required_staff: Optional[int] = None
    required_skill: Optional[str] = None
    required_psira_grade: Optional[str] = None
    requires_firearm: Optional[bool] = None
    priority: Optional[int] = None
    custom_start_time: Optional[str] = None
    custom_end_time: Optional[str] = None
    is_active: Optional[bool] = None


class StaffingProfileResponse(BaseModel):
    profile_id: int
    site_id: int
    org_id: int
    profile_name: str
    period_type: str
    day_type: str
    required_staff: int
    required_skill: Optional[str]
    required_psira_grade: Optional[str]
    requires_firearm: bool
    priority: int
    custom_start_time: Optional[str]
    custom_end_time: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


class StandardProfilesCreate(BaseModel):
    weekday_day_staff: int = Field(4, ge=1, description="Guards needed weekday daytime")
    weekday_night_staff: int = Field(2, ge=1, description="Guards needed weekday nighttime")
    weekend_day_staff: int = Field(2, ge=1, description="Guards needed weekend daytime")
    weekend_night_staff: int = Field(1, ge=1, description="Guards needed weekend nighttime")


class StaffingPreviewRequest(BaseModel):
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD


def parse_time(time_str: Optional[str]) -> Optional[time]:
    """Parse HH:MM time string to time object."""
    if not time_str:
        return None
    try:
        parts = time_str.split(":")
        return time(int(parts[0]), int(parts[1]))
    except (ValueError, IndexError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid time format: {time_str}. Use HH:MM format."
        )


def parse_period_type(value: str) -> PeriodType:
    """Parse string to PeriodType enum."""
    try:
        return PeriodType(value.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid period_type: {value}. Must be one of: day, night, all_day, custom"
        )


def parse_day_type(value: str) -> DayType:
    """Parse string to DayType enum."""
    try:
        return DayType(value.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid day_type: {value}. Must be one of: weekday, weekend, monday-sunday, public_holiday, all"
        )


def parse_psira_grade(value: Optional[str]) -> Optional[PSIRAGradeRequirement]:
    """Parse string to PSIRAGradeRequirement enum."""
    if not value:
        return None
    try:
        return PSIRAGradeRequirement(value.upper() if len(value) == 1 else value.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid PSIRA grade: {value}. Must be one of: A, B, C, D, E, any"
        )


def profile_to_response(profile: SiteStaffingProfile) -> dict:
    """Convert model to response dict."""
    return {
        "profile_id": profile.profile_id,
        "site_id": profile.site_id,
        "org_id": profile.org_id,
        "profile_name": profile.profile_name,
        "period_type": profile.period_type.value,
        "day_type": profile.day_type.value,
        "required_staff": profile.required_staff,
        "required_skill": profile.required_skill,
        "required_psira_grade": profile.required_psira_grade.value if profile.required_psira_grade else None,
        "requires_firearm": profile.requires_firearm or False,
        "priority": profile.priority,
        "custom_start_time": profile.custom_start_time.strftime("%H:%M") if profile.custom_start_time else None,
        "custom_end_time": profile.custom_end_time.strftime("%H:%M") if profile.custom_end_time else None,
        "is_active": profile.is_active
    }


@router.get("/sites/{site_id}/staffing-profiles", response_model=List[StaffingProfileResponse])
async def get_site_staffing_profiles(
    site_id: int,
    active_only: bool = Query(True, description="Only return active profiles"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all staffing profiles for a site."""
    # Verify site exists and user has access
    site = db.query(Site).filter(Site.site_id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    if not current_user.is_superadmin and site.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this site")

    service = StaffingProfileService(db)
    profiles = service.get_profiles_for_site(site_id, active_only=active_only)

    return [profile_to_response(p) for p in profiles]


@router.post("/sites/{site_id}/staffing-profiles", response_model=StaffingProfileResponse)
async def create_staffing_profile(
    site_id: int,
    profile_data: StaffingProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new staffing profile for a site."""
    # Verify site exists and user has access
    site = db.query(Site).filter(Site.site_id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    if not current_user.is_superadmin and site.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this site")

    service = StaffingProfileService(db)

    profile = service.create_profile(
        org_id=site.org_id,
        site_id=site_id,
        profile_name=profile_data.profile_name,
        period_type=parse_period_type(profile_data.period_type),
        day_type=parse_day_type(profile_data.day_type),
        required_staff=profile_data.required_staff,
        custom_start_time=parse_time(profile_data.custom_start_time),
        custom_end_time=parse_time(profile_data.custom_end_time),
        required_skill=profile_data.required_skill,
        required_psira_grade=parse_psira_grade(profile_data.required_psira_grade),
        requires_firearm=profile_data.requires_firearm,
        priority=profile_data.priority
    )

    return profile_to_response(profile)


@router.post("/sites/{site_id}/staffing-profiles/standard", response_model=List[StaffingProfileResponse])
async def create_standard_profiles(
    site_id: int,
    config: StandardProfilesCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a standard set of 4 staffing profiles for a site:
    - Weekday Day
    - Weekday Night
    - Weekend Day
    - Weekend Night
    """
    # Verify site exists and user has access
    site = db.query(Site).filter(Site.site_id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    if not current_user.is_superadmin and site.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this site")

    service = StaffingProfileService(db)

    profiles = service.create_standard_profiles_for_site(
        org_id=site.org_id,
        site_id=site_id,
        weekday_day_staff=config.weekday_day_staff,
        weekday_night_staff=config.weekday_night_staff,
        weekend_day_staff=config.weekend_day_staff,
        weekend_night_staff=config.weekend_night_staff
    )

    return [profile_to_response(p) for p in profiles]


@router.get("/sites/{site_id}/staffing-profiles/{profile_id}", response_model=StaffingProfileResponse)
async def get_staffing_profile(
    site_id: int,
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific staffing profile."""
    profile = db.query(SiteStaffingProfile).filter(
        SiteStaffingProfile.profile_id == profile_id,
        SiteStaffingProfile.site_id == site_id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if not current_user.is_superadmin and profile.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this profile")

    return profile_to_response(profile)


@router.put("/sites/{site_id}/staffing-profiles/{profile_id}", response_model=StaffingProfileResponse)
async def update_staffing_profile(
    site_id: int,
    profile_id: int,
    profile_data: StaffingProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a staffing profile."""
    profile = db.query(SiteStaffingProfile).filter(
        SiteStaffingProfile.profile_id == profile_id,
        SiteStaffingProfile.site_id == site_id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if not current_user.is_superadmin and profile.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this profile")

    service = StaffingProfileService(db)

    update_data = {}
    if profile_data.profile_name is not None:
        update_data["profile_name"] = profile_data.profile_name
    if profile_data.period_type is not None:
        update_data["period_type"] = parse_period_type(profile_data.period_type)
    if profile_data.day_type is not None:
        update_data["day_type"] = parse_day_type(profile_data.day_type)
    if profile_data.required_staff is not None:
        update_data["required_staff"] = profile_data.required_staff
    if profile_data.required_skill is not None:
        update_data["required_skill"] = profile_data.required_skill
    if profile_data.required_psira_grade is not None:
        update_data["required_psira_grade"] = parse_psira_grade(profile_data.required_psira_grade)
    if profile_data.requires_firearm is not None:
        update_data["requires_firearm"] = profile_data.requires_firearm
    if profile_data.priority is not None:
        update_data["priority"] = profile_data.priority
    if profile_data.custom_start_time is not None:
        update_data["custom_start_time"] = parse_time(profile_data.custom_start_time)
    if profile_data.custom_end_time is not None:
        update_data["custom_end_time"] = parse_time(profile_data.custom_end_time)
    if profile_data.is_active is not None:
        update_data["is_active"] = profile_data.is_active

    updated_profile = service.update_profile(profile_id, **update_data)

    return profile_to_response(updated_profile)


@router.delete("/sites/{site_id}/staffing-profiles/{profile_id}")
async def delete_staffing_profile(
    site_id: int,
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a staffing profile."""
    profile = db.query(SiteStaffingProfile).filter(
        SiteStaffingProfile.profile_id == profile_id,
        SiteStaffingProfile.site_id == site_id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if not current_user.is_superadmin and profile.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this profile")

    service = StaffingProfileService(db)
    service.delete_profile(profile_id)

    return {"message": "Profile deleted successfully"}


@router.post("/sites/{site_id}/staffing-preview")
async def get_staffing_preview(
    site_id: int,
    request: StaffingPreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Preview staffing requirements for a site over a date range.

    Returns staffing requirements for each day/night period.
    """
    # Verify site exists and user has access
    site = db.query(Site).filter(Site.site_id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    if not current_user.is_superadmin and site.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this site")

    try:
        start_date = date.fromisoformat(request.start_date)
        end_date = date.fromisoformat(request.end_date)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD."
        )

    if end_date < start_date:
        raise HTTPException(
            status_code=400,
            detail="end_date must be after start_date"
        )

    # Limit preview to 31 days
    if (end_date - start_date).days > 31:
        raise HTTPException(
            status_code=400,
            detail="Preview limited to 31 days maximum"
        )

    service = StaffingProfileService(db)
    preview = service.preview_staffing_for_date_range(site_id, start_date, end_date)

    return {
        "site_id": site_id,
        "site_name": site.site_name or site.client_name,
        "preview": preview
    }
