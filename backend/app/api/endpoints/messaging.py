"""In-app messaging endpoints for team communication."""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.auth.security import get_current_org_id, get_current_user
from app.database import get_db
from app.models.messaging import ChatChannel, ChannelMember, ChatMessage, ChannelType
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CreateChannel(BaseModel):
    name: str
    channel_type: str = "group"
    site_id: Optional[int] = None
    member_user_ids: List[int] = []


class SendMessage(BaseModel):
    content: str
    message_type: str = "text"


class ChannelResponse(BaseModel):
    channel_id: int
    name: Optional[str]
    channel_type: str
    site_id: Optional[int]
    site_name: Optional[str] = None
    member_count: int
    last_message: Optional[str] = None
    last_message_at: Optional[str] = None
    unread_count: int = 0
    created_at: str


class MessageResponse(BaseModel):
    message_id: int
    channel_id: int
    sender_id: int
    sender_name: str
    content: str
    message_type: str
    sent_at: str


def _channel_response(ch: ChatChannel, current_user_id: int, db: Session) -> dict:
    # Get member count
    member_count = db.query(ChannelMember).filter(ChannelMember.channel_id == ch.channel_id).count()

    # Get last message
    last_msg = (
        db.query(ChatMessage)
        .filter(ChatMessage.channel_id == ch.channel_id)
        .order_by(desc(ChatMessage.sent_at))
        .first()
    )

    # Get unread count
    membership = (
        db.query(ChannelMember)
        .filter(ChannelMember.channel_id == ch.channel_id, ChannelMember.user_id == current_user_id)
        .first()
    )
    unread = 0
    if membership and membership.last_read_at:
        unread = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.channel_id == ch.channel_id,
                ChatMessage.sent_at > membership.last_read_at,
                ChatMessage.sender_id != current_user_id,
            )
            .count()
        )
    elif membership:
        unread = db.query(ChatMessage).filter(
            ChatMessage.channel_id == ch.channel_id,
            ChatMessage.sender_id != current_user_id,
        ).count()

    return {
        "channel_id": ch.channel_id,
        "name": ch.name,
        "channel_type": ch.channel_type.value if hasattr(ch.channel_type, 'value') else ch.channel_type,
        "site_id": ch.site_id,
        "site_name": ch.site.site_name if ch.site else None,
        "member_count": member_count,
        "last_message": last_msg.content[:100] if last_msg else None,
        "last_message_at": last_msg.sent_at.isoformat() if last_msg else None,
        "unread_count": unread,
        "created_at": ch.created_at.isoformat() if ch.created_at else None,
    }


def _message_response(msg: ChatMessage) -> dict:
    sender_name = msg.sender.email if msg.sender else "Unknown"
    if msg.sender and hasattr(msg.sender, 'full_name') and msg.sender.full_name:
        sender_name = msg.sender.full_name

    return {
        "message_id": msg.message_id,
        "channel_id": msg.channel_id,
        "sender_id": msg.sender_id,
        "sender_name": sender_name,
        "content": msg.content,
        "message_type": msg.message_type or "text",
        "sent_at": msg.sent_at.isoformat() if msg.sent_at else None,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/channels", status_code=status.HTTP_201_CREATED)
def create_channel(
    data: CreateChannel,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Create a new messaging channel."""
    valid_types = [t.value for t in ChannelType]
    if data.channel_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid channel type. Must be one of: {valid_types}",
        )

    channel = ChatChannel(
        org_id=org_id,
        channel_type=data.channel_type,
        name=data.name,
        site_id=data.site_id,
        created_by_user_id=current_user.user_id,
    )
    db.add(channel)
    db.flush()

    # Add creator as member
    db.add(ChannelMember(channel_id=channel.channel_id, user_id=current_user.user_id))

    # Add other members
    for uid in data.member_user_ids:
        if uid != current_user.user_id:
            user = db.query(User).filter(User.user_id == uid, User.org_id == org_id).first()
            if user:
                db.add(ChannelMember(channel_id=channel.channel_id, user_id=uid))

    db.commit()
    db.refresh(channel)

    return _channel_response(channel, current_user.user_id, db)


@router.get("/channels")
def list_channels(
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List all channels the current user is a member of."""
    channel_ids = [
        m.channel_id
        for m in db.query(ChannelMember.channel_id)
        .filter(ChannelMember.user_id == current_user.user_id)
        .all()
    ]

    channels = (
        db.query(ChatChannel)
        .filter(ChatChannel.channel_id.in_(channel_ids), ChatChannel.org_id == org_id, ChatChannel.is_active == True)
        .order_by(ChatChannel.created_at.desc())
        .all()
    )

    return [_channel_response(ch, current_user.user_id, db) for ch in channels]


@router.get("/channels/{channel_id}/messages")
def get_channel_messages(
    channel_id: int,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Get message history for a channel (paginated)."""
    # Verify membership
    membership = db.query(ChannelMember).filter(
        ChannelMember.channel_id == channel_id,
        ChannelMember.user_id == current_user.user_id,
    ).first()

    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this channel.")

    # Mark as read
    membership.last_read_at = datetime.utcnow()

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.channel_id == channel_id)
        .order_by(desc(ChatMessage.sent_at))
        .offset(skip)
        .limit(limit)
        .all()
    )

    db.commit()

    # Return in chronological order
    return [_message_response(m) for m in reversed(messages)]


@router.post("/channels/{channel_id}/messages")
def send_message(
    channel_id: int,
    data: SendMessage,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Send a message in a channel."""
    # Verify membership
    membership = db.query(ChannelMember).filter(
        ChannelMember.channel_id == channel_id,
        ChannelMember.user_id == current_user.user_id,
    ).first()

    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this channel.")

    msg = ChatMessage(
        channel_id=channel_id,
        sender_id=current_user.user_id,
        content=data.content,
        message_type=data.message_type,
    )
    db.add(msg)

    # Mark sender's read time
    membership.last_read_at = datetime.utcnow()

    db.commit()
    db.refresh(msg)

    return _message_response(msg)


@router.post("/channels/{channel_id}/members")
def add_member(
    channel_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Add a user to a channel."""
    channel = db.query(ChatChannel).filter(
        ChatChannel.channel_id == channel_id,
        ChatChannel.org_id == org_id,
    ).first()

    if not channel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found.")

    existing = db.query(ChannelMember).filter(
        ChannelMember.channel_id == channel_id,
        ChannelMember.user_id == user_id,
    ).first()

    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a member.")

    target_user = db.query(User).filter(User.user_id == user_id, User.org_id == org_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in organization.")

    db.add(ChannelMember(channel_id=channel_id, user_id=user_id))
    db.commit()

    return {"status": "ok", "message": f"User added to channel."}


@router.get("/channels/{channel_id}/members")
def list_channel_members(
    channel_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List all members of a channel."""
    members = (
        db.query(ChannelMember)
        .filter(ChannelMember.channel_id == channel_id)
        .all()
    )

    result = []
    for m in members:
        user = m.user
        result.append({
            "user_id": m.user_id,
            "name": user.full_name if user and hasattr(user, 'full_name') else (user.email if user else "Unknown"),
            "email": user.email if user else None,
            "joined_at": m.joined_at.isoformat() if m.joined_at else None,
        })

    return result
