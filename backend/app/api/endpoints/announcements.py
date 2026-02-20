"""Company announcements / noticeboard endpoints."""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.announcement import Announcement
from app.models.site import Site
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: str = "normal"
    category: Optional[str] = None
    site_id: Optional[int] = None
    is_pinned: bool = False
    expires_at: Optional[datetime] = None


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    site_id: Optional[int] = None
    is_pinned: Optional[bool] = None
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None


def _build_response(a: Announcement, db: Session) -> dict:
    site = db.query(Site).get(a.site_id) if a.site_id else None
    return {
        "announcement_id": a.announcement_id,
        "title": a.title,
        "content": a.content,
        "priority": a.priority,
        "category": a.category,
        "site_id": a.site_id,
        "site_name": site.site_name if site else None,
        "is_pinned": a.is_pinned,
        "is_active": a.is_active,
        "published_at": a.published_at,
        "expires_at": a.expires_at,
        "author_user_id": a.author_user_id,
        "author_name": a.author_name,
        "created_at": a.created_at,
    }


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("/")
def list_announcements(
    site_id: Optional[int] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    active_only: bool = True,
    search: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List announcements."""
    q = db.query(Announcement).filter(Announcement.org_id == org_id)
    if active_only:
        q = q.filter(Announcement.is_active == True)
    if site_id:
        q = q.filter((Announcement.site_id == site_id) | (Announcement.site_id == None))
    if priority:
        q = q.filter(Announcement.priority == priority)
    if category:
        q = q.filter(Announcement.category == category)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (Announcement.title.ilike(like)) |
            (Announcement.content.ilike(like))
        )

    total = q.count()
    items = q.order_by(
        Announcement.is_pinned.desc(),
        Announcement.published_at.desc(),
    ).offset(offset).limit(limit).all()
    return {"items": [_build_response(a, db) for a in items], "total": total}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_announcement(
    body: AnnouncementCreate,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Publish a new announcement."""
    a = Announcement(
        org_id=org_id,
        title=body.title,
        content=body.content,
        priority=body.priority,
        category=body.category,
        site_id=body.site_id if body.site_id else None,
        is_pinned=body.is_pinned,
        expires_at=body.expires_at,
        author_user_id=current_user.user_id,
        author_name=current_user.full_name or current_user.email,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return _build_response(a, db)


@router.put("/{announcement_id}/")
def update_announcement(
    announcement_id: int,
    body: AnnouncementUpdate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Update an announcement."""
    a = db.query(Announcement).filter(
        Announcement.announcement_id == announcement_id,
        Announcement.org_id == org_id,
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Announcement not found")

    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(a, field, val)
    a.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(a)
    return _build_response(a, db)


@router.delete("/{announcement_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(
    announcement_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Delete an announcement."""
    a = db.query(Announcement).filter(
        Announcement.announcement_id == announcement_id,
        Announcement.org_id == org_id,
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Announcement not found")
    db.delete(a)
    db.commit()


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard/")
def announcement_dashboard(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Announcements overview."""
    all_items = db.query(Announcement).filter(Announcement.org_id == org_id).all()

    now = datetime.utcnow()
    active = [a for a in all_items if a.is_active]
    pinned = sum(1 for a in active if a.is_pinned)
    expired = sum(1 for a in active if a.expires_at and a.expires_at <= now)

    # By priority
    priority_counts: dict = {}
    for a in active:
        priority_counts[a.priority or "normal"] = priority_counts.get(a.priority or "normal", 0) + 1

    # By category
    category_counts: dict = {}
    for a in active:
        cat = a.category or "uncategorised"
        category_counts[cat] = category_counts.get(cat, 0) + 1

    # Recent (last 7 days)
    week_ago = now - timedelta(days=7)
    recent = sum(1 for a in active if a.published_at and a.published_at >= week_ago)

    return {
        "total_active": len(active),
        "pinned": pinned,
        "expired": expired,
        "recent_7d": recent,
        "by_priority": sorted(priority_counts.items(), key=lambda x: x[1], reverse=True),
        "by_category": sorted(category_counts.items(), key=lambda x: x[1], reverse=True),
    }
