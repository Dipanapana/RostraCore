"""Site service for CRUD operations."""

from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.site import Site
from app.models.schemas import SiteCreate, SiteUpdate


class SiteService:
    """Service for site-related operations."""

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[Site]:
        """Get all sites."""
        return db.query(Site).offset(skip).limit(limit).all()

    @staticmethod
    def get_by_id(db: Session, site_id: int) -> Optional[Site]:
        """Get site by ID."""
        return db.query(Site).filter(Site.site_id == site_id).first()

    @staticmethod
    def create(db: Session, site_data: SiteCreate) -> Site:
        """Create new site."""
        db_site = Site(**site_data.model_dump())
        db.add(db_site)
        db.commit()
        db.refresh(db_site)
        return db_site

    @staticmethod
    def update(db: Session, site_id: int, site_data: SiteUpdate) -> Optional[Site]:
        """Update site."""
        db_site = SiteService.get_by_id(db, site_id)
        if not db_site:
            return None

        update_data = site_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_site, field, value)

        db.commit()
        db.refresh(db_site)
        return db_site

    @staticmethod
    def delete(db: Session, site_id: int) -> bool:
        """Delete site."""
        db_site = SiteService.get_by_id(db, site_id)
        if not db_site:
            return False

        db.delete(db_site)
        db.commit()
        return True
