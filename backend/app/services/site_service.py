"""Site service for CRUD operations."""

from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.site import Site
from app.models.schemas import SiteCreate, SiteUpdate


class SiteService:
    """Service for site-related operations."""

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100, org_id: Optional[int] = None) -> List[Site]:
        """Get all sites (optionally filtered by organization)."""
        query = db.query(Site)
        if org_id is not None:
            query = query.filter(Site.org_id == org_id)
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_by_id(db: Session, site_id: int, org_id: Optional[int] = None) -> Optional[Site]:
        """Get site by ID (optionally filtered by organization)."""
        query = db.query(Site).filter(Site.site_id == site_id)
        if org_id is not None:
            query = query.filter(Site.org_id == org_id)
        return query.first()

    @staticmethod
    def create(db: Session, site_data: SiteCreate, org_id: Optional[int] = None) -> Site:
        """Create new site."""
        site_dict = site_data.model_dump()
        if org_id is not None:
            site_dict['org_id'] = org_id
        db_site = Site(**site_dict)
        db.add(db_site)
        db.commit()
        db.refresh(db_site)
        return db_site

    @staticmethod
    def update(db: Session, site_id: int, site_data: SiteUpdate, org_id: Optional[int] = None) -> Optional[Site]:
        """Update site (optionally filtered by organization)."""
        db_site = SiteService.get_by_id(db, site_id, org_id=org_id)
        if not db_site:
            return None

        update_data = site_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_site, field, value)

        db.commit()
        db.refresh(db_site)
        return db_site

    @staticmethod
    def delete(db: Session, site_id: int, org_id: Optional[int] = None) -> bool:
        """Delete site (optionally filtered by organization)."""
        db_site = SiteService.get_by_id(db, site_id, org_id=org_id)
        if not db_site:
            return False

        db.delete(db_site)
        db.commit()
        return True
