"""Marketplace settings endpoints - Superadmin configurable pricing."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.models.marketplace_settings import MarketplaceSettings
from pydantic import BaseModel, Field

router = APIRouter()


# Schemas
class SettingUpdate(BaseModel):
    setting_value: Dict[str, Any]
    description: str = None


class SettingResponse(BaseModel):
    setting_id: int
    setting_key: str
    setting_value: Dict[str, Any]
    description: str
    category: str
    updated_at: str

    class Config:
        from_attributes = True


class CVPricingUpdate(BaseModel):
    amount: float = Field(gt=0, description="Price in ZAR")
    currency: str = "ZAR"


class CommissionUpdate(BaseModel):
    amount: float = Field(gt=0, description="Commission amount in ZAR")
    currency: str = "ZAR"
    deduction_method: str = Field(pattern="^(full|split)$", description="full or split")
    installments: int = Field(ge=1, le=12, description="Number of installments (1-12)")


class PremiumJobTierUpdate(BaseModel):
    price: float = Field(gt=0)
    duration_days: int = Field(ge=1, le=90)
    boost_multiplier: float = Field(gt=0)
    priority_rank: int = Field(ge=1, le=10)


class BulkPackageUpdate(BaseModel):
    hires: int = Field(gt=0)
    price: float = Field(gt=0)
    price_per_hire: float = Field(gt=0)
    discount_percent: float = Field(ge=0, le=100)


# === CV GENERATION PRICING ===

@router.get("/cv-pricing", response_model=Dict[str, Any])
async def get_cv_pricing(db: Session = Depends(get_db)):
    """Get current CV generation pricing."""
    return MarketplaceSettings.get_setting(db, 'cv_generation_price', {'amount': 60, 'currency': 'ZAR'})


@router.put("/cv-pricing")
async def update_cv_pricing(
    pricing: CVPricingUpdate,
    db: Session = Depends(get_db)
):
    """Update CV generation pricing (Superadmin only)."""

    setting_value = {
        'amount': pricing.amount,
        'currency': pricing.currency
    }

    MarketplaceSettings.update_setting(db, 'cv_generation_price', setting_value)

    return {
        "message": "CV pricing updated successfully",
        "new_pricing": setting_value
    }


# === MARKETPLACE COMMISSION ===

@router.get("/commission-settings", response_model=Dict[str, Any])
async def get_commission_settings(db: Session = Depends(get_db)):
    """Get current marketplace commission settings."""
    return MarketplaceSettings.get_commission_settings(db)


@router.put("/commission-settings")
async def update_commission_settings(
    commission: CommissionUpdate,
    db: Session = Depends(get_db)
):
    """
    Update marketplace commission settings (Superadmin only).

    This commission is deducted from the hired guard's salary.
    """

    setting_value = {
        'amount': commission.amount,
        'currency': commission.currency,
        'deduction_method': commission.deduction_method,
        'installments': commission.installments
    }

    MarketplaceSettings.update_setting(db, 'marketplace_commission', setting_value)

    return {
        "message": "Commission settings updated successfully",
        "new_settings": setting_value,
        "note": f"Will deduct R{commission.amount} from guard's salary "
                f"({commission.deduction_method}: "
                f"{'full amount on first payroll' if commission.deduction_method == 'full' else f'R{commission.amount/commission.installments:.2f} over {commission.installments} payments'})"
    }


# === PREMIUM JOB TIERS ===

@router.get("/premium-tiers", response_model=Dict[str, Dict[str, Any]])
async def get_premium_tiers(db: Session = Depends(get_db)):
    """Get all premium job tier pricing."""

    return {
        'bronze': MarketplaceSettings.get_premium_job_pricing(db, 'bronze'),
        'silver': MarketplaceSettings.get_premium_job_pricing(db, 'silver'),
        'gold': MarketplaceSettings.get_premium_job_pricing(db, 'gold')
    }


@router.put("/premium-tiers/{tier}")
async def update_premium_tier(
    tier: str,
    pricing: PremiumJobTierUpdate,
    db: Session = Depends(get_db)
):
    """Update premium job tier pricing (Superadmin only)."""

    if tier.lower() not in ['bronze', 'silver', 'gold']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tier. Must be bronze, silver, or gold"
        )

    setting_value = {
        'price': pricing.price,
        'duration_days': pricing.duration_days,
        'boost_multiplier': pricing.boost_multiplier,
        'priority_rank': pricing.priority_rank
    }

    key = f'premium_job_{tier.lower()}'
    MarketplaceSettings.update_setting(db, key, setting_value)

    return {
        "message": f"{tier.capitalize()} tier updated successfully",
        "new_pricing": setting_value
    }


# === BULK PACKAGES ===

@router.get("/bulk-packages", response_model=Dict[str, Dict[str, Any]])
async def get_bulk_packages(db: Session = Depends(get_db)):
    """Get all bulk package pricing."""

    return {
        'starter': MarketplaceSettings.get_bulk_package_pricing(db, 'starter'),
        'professional': MarketplaceSettings.get_bulk_package_pricing(db, 'professional'),
        'enterprise': MarketplaceSettings.get_bulk_package_pricing(db, 'enterprise')
    }


@router.put("/bulk-packages/{package_type}")
async def update_bulk_package(
    package_type: str,
    package: BulkPackageUpdate,
    db: Session = Depends(get_db)
):
    """Update bulk package pricing (Superadmin only)."""

    if package_type.lower() not in ['starter', 'professional', 'enterprise']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid package type. Must be starter, professional, or enterprise"
        )

    setting_value = {
        'hires': package.hires,
        'price': package.price,
        'price_per_hire': package.price_per_hire,
        'discount_percent': package.discount_percent
    }

    key = f'bulk_package_{package_type.lower()}'
    MarketplaceSettings.update_setting(db, key, setting_value)

    return {
        "message": f"{package_type.capitalize()} package updated successfully",
        "new_pricing": setting_value
    }


# === ALL SETTINGS ===

@router.get("/all", response_model=List[SettingResponse])
async def get_all_settings(
    category: str = None,
    db: Session = Depends(get_db)
):
    """Get all marketplace settings."""

    query = db.query(MarketplaceSettings)

    if category:
        query = query.filter(MarketplaceSettings.category == category)

    settings = query.all()
    return settings


@router.get("/pricing-summary", response_model=Dict[str, Any])
async def get_pricing_summary(db: Session = Depends(get_db)):
    """
    Get complete pricing summary for dashboard display.

    Returns all pricing in one call for easy display.
    """

    commission_settings = MarketplaceSettings.get_commission_settings(db)

    return {
        "cv_generation": {
            "price": MarketplaceSettings.get_cv_price(db),
            "currency": "ZAR",
            "description": "One-time CV generation service"
        },
        "marketplace_commission": {
            "amount": commission_settings.get('amount', 500),
            "currency": commission_settings.get('currency', 'ZAR'),
            "deduction_method": commission_settings.get('deduction_method', 'split'),
            "installments": commission_settings.get('installments', 3),
            "description": "Deducted from hired guard's salary",
            "per_installment": commission_settings.get('amount', 500) / commission_settings.get('installments', 3)
        },
        "premium_jobs": {
            "bronze": MarketplaceSettings.get_premium_job_pricing(db, 'bronze'),
            "silver": MarketplaceSettings.get_premium_job_pricing(db, 'silver'),
            "gold": MarketplaceSettings.get_premium_job_pricing(db, 'gold')
        },
        "bulk_packages": {
            "starter": MarketplaceSettings.get_bulk_package_pricing(db, 'starter'),
            "professional": MarketplaceSettings.get_bulk_package_pricing(db, 'professional'),
            "enterprise": MarketplaceSettings.get_bulk_package_pricing(db, 'enterprise')
        }
    }
