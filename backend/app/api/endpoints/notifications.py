"""Notification endpoints — in-app notifications and push token registration."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.auth.security import get_current_org_id, get_current_user
from app.database import get_db
from app.models.notification import Notification, NotificationType, PushToken
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class PushTokenRegister(BaseModel):
    token: str
    platform: str  # 'ios' or 'android'


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _notification_to_dict(n: Notification) -> dict:
    return {
        "notification_id": n.notification_id,
        "title": n.title,
        "message": n.message,
        "notification_type": n.notification_type,
        "is_read": n.is_read,
        "read_at": n.read_at.isoformat() if n.read_at else None,
        "reference_type": n.reference_type,
        "reference_id": n.reference_id,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/")
def list_notifications(
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Return notifications for the authenticated user, newest first."""
    query = db.query(Notification).filter(
        Notification.user_id == current_user.user_id,
        Notification.org_id == org_id,
    )

    if unread_only:
        query = query.filter(Notification.is_read == False)

    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.user_id,
        Notification.org_id == org_id,
        Notification.is_read == False,
    ).count()

    return {
        "notifications": [_notification_to_dict(n) for n in notifications],
        "unread_count": unread_count,
        "total": len(notifications),
    }


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Mark a single notification as read."""
    notification = db.query(Notification).filter(
        Notification.notification_id == notification_id,
        Notification.user_id == current_user.user_id,
        Notification.org_id == org_id,
    ).first()

    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.commit()
        db.refresh(notification)

    return _notification_to_dict(notification)


@router.patch("/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Mark all of the current user's notifications as read."""
    now = datetime.utcnow()
    updated = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.user_id,
            Notification.org_id == org_id,
            Notification.is_read == False,
        )
        .all()
    )
    for n in updated:
        n.is_read = True
        n.read_at = now
    db.commit()

    return {"marked_read": len(updated)}


@router.post("/push-token", status_code=status.HTTP_201_CREATED)
def register_push_token(
    data: PushTokenRegister,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Register or update a mobile push notification token for the current user.

    If the token already exists it is updated to point at the current user
    (handles device hand-overs between users).
    """
    valid_platforms = ("ios", "android")
    if data.platform not in valid_platforms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"platform must be one of: {valid_platforms}",
        )

    # Upsert: update if token already registered, else create
    existing = db.query(PushToken).filter(PushToken.token == data.token).first()
    if existing:
        existing.user_id = current_user.user_id
        existing.platform = data.platform
        db.commit()
        return {"message": "Push token updated.", "token_id": existing.token_id}

    push_token = PushToken(
        user_id=current_user.user_id,
        token=data.token,
        platform=data.platform,
    )
    db.add(push_token)
    db.commit()
    db.refresh(push_token)

    return {"message": "Push token registered.", "token_id": push_token.token_id}


@router.delete("/push-token")
def unregister_push_token(
    token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a push token (called on logout or app uninstall)."""
    push_token = db.query(PushToken).filter(
        PushToken.token == token,
        PushToken.user_id == current_user.user_id,
    ).first()

    if push_token:
        db.delete(push_token)
        db.commit()

    return {"message": "Push token removed."}
