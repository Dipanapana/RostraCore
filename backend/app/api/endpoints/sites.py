"""Sites API endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter()


@router.get("/")
async def get_sites(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all sites."""
    return {"message": "Get sites endpoint"}


@router.get("/{site_id}")
async def get_site(
    site_id: int,
    db: Session = Depends(get_db)
):
    """Get site by ID."""
    return {"message": f"Get site {site_id}"}


@router.post("/")
async def create_site(
    db: Session = Depends(get_db)
):
    """Create new site."""
    return {"message": "Create site endpoint"}


@router.put("/{site_id}")
async def update_site(
    site_id: int,
    db: Session = Depends(get_db)
):
    """Update site."""
    return {"message": f"Update site {site_id}"}


@router.delete("/{site_id}")
async def delete_site(
    site_id: int,
    db: Session = Depends(get_db)
):
    """Delete site."""
    return {"message": f"Delete site {site_id}"}
