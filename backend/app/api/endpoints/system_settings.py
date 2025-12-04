"""API endpoints for system settings management."""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.auth.security import get_current_user
from app.models.user import User
from app.models.system_settings import SettingKeys
from app.services.system_settings_service import SystemSettingsService

router = APIRouter()


# Pydantic schemas
class SettingUpdate(BaseModel):
    """Request to update a system setting."""
    value: Any
    description: Optional[str] = None


class SettingResponse(BaseModel):
    """Response for a single setting."""
    key: str
    value: Any
    description: Optional[str] = None
    category: str = "general"
    is_public: bool = False


class PricingConfigResponse(BaseModel):
    """Public pricing configuration."""
    monthly_rate_per_guard: float
    free_trial_days: int
    currency: str
    vat_percentage: float
    platform_name: str


class PricingUpdateRequest(BaseModel):
    """Request to update pricing."""
    monthly_rate_per_guard: float


# ==================== Public Endpoints (No Auth Required) ====================

@router.get("/pricing", response_model=PricingConfigResponse)
async def get_pricing_config(db: Session = Depends(get_db)):
    """
    Get public pricing configuration.

    This endpoint is public and can be called without authentication.
    Used by landing pages, pricing calculators, etc.
    """
    service = SystemSettingsService(db)
    config = service.get_pricing_config()

    return PricingConfigResponse(**config)


@router.get("/public", response_model=Dict[str, Any])
async def get_public_settings(db: Session = Depends(get_db)):
    """
    Get all public system settings.

    Returns settings that are marked as public (safe for unauthenticated access).
    """
    service = SystemSettingsService(db)
    return service.get_public_settings()


# ==================== Superadmin Endpoints ====================

@router.get("/all", response_model=Dict[str, Any])
async def get_all_settings(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all system settings (superadmin only).

    Args:
        category: Optional filter by category (billing, features, branding)
    """
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmins can view all settings"
        )

    service = SystemSettingsService(db)
    return service.get_all_settings(category=category)


@router.put("/pricing", response_model=PricingConfigResponse)
async def update_pricing(
    request: PricingUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update pricing configuration (superadmin only).

    This is the main endpoint for superadmin to change per-guard pricing.
    """
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmins can update pricing"
        )

    if request.monthly_rate_per_guard < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Price must be non-negative"
        )

    service = SystemSettingsService(db)

    # Update the pricing setting
    service.set_setting(
        SettingKeys.MONTHLY_RATE_PER_GUARD,
        request.monthly_rate_per_guard,
        updated_by=current_user.user_id
    )

    # Return updated config
    config = service.get_pricing_config()
    return PricingConfigResponse(**config)


@router.put("/{setting_key}")
async def update_setting(
    setting_key: str,
    request: SettingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a specific system setting (superadmin only).

    Args:
        setting_key: The setting key to update
    """
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmins can update settings"
        )

    service = SystemSettingsService(db)

    service.set_setting(
        setting_key,
        request.value,
        description=request.description,
        updated_by=current_user.user_id
    )

    return {
        "message": f"Setting '{setting_key}' updated successfully",
        "key": setting_key,
        "value": request.value
    }


@router.delete("/{setting_key}")
async def delete_setting(
    setting_key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a system setting (resets to default value).

    Args:
        setting_key: The setting key to delete
    """
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmins can delete settings"
        )

    service = SystemSettingsService(db)

    if service.delete_setting(setting_key):
        return {"message": f"Setting '{setting_key}' reset to default"}
    else:
        return {"message": f"Setting '{setting_key}' was not found (already at default)"}


@router.post("/initialize")
async def initialize_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initialize default settings in database (superadmin only).

    Creates default settings if they don't exist.
    """
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmins can initialize settings"
        )

    service = SystemSettingsService(db)
    created = service.initialize_defaults()

    return {
        "message": f"Initialized {created} default settings",
        "settings_created": created
    }
