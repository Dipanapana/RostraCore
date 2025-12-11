"""Sites API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.schemas import SiteCreate, SiteUpdate, SiteResponse
from app.models.site import Site
from app.models.user import User
from app.services.site_service import SiteService
from app.services.client_filter_service import ClientFilterService
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


@router.get("/", response_model=List[SiteResponse])
async def get_sites(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """
    Get all sites filtered by organization and client access.

    - Owners: See all sites in the organization
    - Non-owners: See sites belonging to their managed clients only
    """
    # Get accessible clients for this user (includes org + user level filtering)
    accessible_clients = ClientFilterService.get_accessible_clients_for_user(db, current_user)

    query = db.query(Site).filter(Site.org_id == org_id)

    # Apply client-level filtering
    if accessible_clients is not None:  # None = full access
        if not accessible_clients:  # Empty = no access
            return []
        query = query.filter(Site.client_id.in_(accessible_clients))

    sites = query.offset(skip).limit(limit).all()
    return sites


@router.get("/{site_id}", response_model=SiteResponse)
async def get_site(
    site_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Get site by ID (filtered by organization and client access)."""
    site = SiteService.get_by_id(db, site_id, org_id=org_id)
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site with ID {site_id} not found"
        )

    # Check client-level access
    if not ClientFilterService.is_client_accessible(db, org_id, site.client_id, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this site's client"
        )

    return site


@router.post("/", response_model=SiteResponse, status_code=status.HTTP_201_CREATED)
async def create_site(
    site_data: SiteCreate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Create new site (automatically assigned to user's organization)."""
    # Check if user has access to the client for which site is being created
    if site_data.client_id:
        if not ClientFilterService.is_client_accessible(db, org_id, site_data.client_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to create sites for this client"
            )

    site = SiteService.create(db, site_data, org_id=org_id)
    return site


@router.put("/{site_id}", response_model=SiteResponse)
async def update_site(
    site_id: int,
    site_data: SiteUpdate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Update site (filtered by organization and client access)."""
    # First check if site exists
    existing_site = SiteService.get_by_id(db, site_id, org_id=org_id)
    if not existing_site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site with ID {site_id} not found"
        )

    # Check client-level access for existing site
    if not ClientFilterService.is_client_accessible(db, org_id, existing_site.client_id, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this site's client"
        )

    # If changing client_id, check access to new client
    if site_data.client_id and site_data.client_id != existing_site.client_id:
        if not ClientFilterService.is_client_accessible(db, org_id, site_data.client_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to the target client"
            )

    site = SiteService.update(db, site_id, site_data, org_id=org_id)
    return site


@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_site(
    site_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Delete site (filtered by organization and client access)."""
    # First check if site exists
    existing_site = SiteService.get_by_id(db, site_id, org_id=org_id)
    if not existing_site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site with ID {site_id} not found"
        )

    # Check client-level access
    if not ClientFilterService.is_client_accessible(db, org_id, existing_site.client_id, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this site's client"
        )

    success = SiteService.delete(db, site_id, org_id=org_id)
    return None
