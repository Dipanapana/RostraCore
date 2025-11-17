"""Sites API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.schemas import SiteCreate, SiteUpdate, SiteResponse
from app.services.site_service import SiteService
from app.auth.security import get_current_org_id

router = APIRouter()


@router.get("/", response_model=List[SiteResponse])
async def get_sites(
    skip: int = 0,
    limit: int = 100,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Get all sites (filtered by organization)."""
    sites = SiteService.get_all(db, skip=skip, limit=limit, org_id=org_id)
    return sites


@router.get("/{site_id}", response_model=SiteResponse)
async def get_site(
    site_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Get site by ID (filtered by organization)."""
    site = SiteService.get_by_id(db, site_id, org_id=org_id)
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site with ID {site_id} not found"
        )
    return site


@router.post("/", response_model=SiteResponse, status_code=status.HTTP_201_CREATED)
async def create_site(
    site_data: SiteCreate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Create new site (automatically assigned to user's organization)."""
    site = SiteService.create(db, site_data, org_id=org_id)
    return site


@router.put("/{site_id}", response_model=SiteResponse)
async def update_site(
    site_id: int,
    site_data: SiteUpdate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Update site (filtered by organization)."""
    site = SiteService.update(db, site_id, site_data, org_id=org_id)
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site with ID {site_id} not found"
        )
    return site


@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_site(
    site_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Delete site (filtered by organization)."""
    success = SiteService.delete(db, site_id, org_id=org_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site with ID {site_id} not found"
        )
    return None
