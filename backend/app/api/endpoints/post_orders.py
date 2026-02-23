"""Post order / site instructions endpoints."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.security import get_current_org_id, get_current_user
from app.database import get_db
from app.models.employee import Employee
from app.models.post_order import PostOrder, PostOrderAcknowledgment, PostOrderStatus
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class PostOrderCreate(BaseModel):
    site_id: int
    title: str
    content: str
    effective_from: Optional[str] = None
    effective_until: Optional[str] = None
    requires_acknowledgment: bool = True
    status: str = "draft"


class PostOrderUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    effective_from: Optional[str] = None
    effective_until: Optional[str] = None
    requires_acknowledgment: Optional[bool] = None
    status: Optional[str] = None


def _to_response(po: PostOrder, db: Session) -> dict:
    ack_count = db.query(PostOrderAcknowledgment).filter(
        PostOrderAcknowledgment.post_order_id == po.post_order_id
    ).count()

    return {
        "post_order_id": po.post_order_id,
        "org_id": po.org_id,
        "site_id": po.site_id,
        "site_name": po.site.site_name if po.site else None,
        "title": po.title,
        "content": po.content,
        "version": po.version,
        "effective_from": po.effective_from.isoformat() if po.effective_from else None,
        "effective_until": po.effective_until.isoformat() if po.effective_until else None,
        "status": po.status.value if hasattr(po.status, 'value') else po.status,
        "requires_acknowledgment": po.requires_acknowledgment,
        "acknowledgment_count": ack_count,
        "created_at": po.created_at.isoformat() if po.created_at else None,
        "updated_at": po.updated_at.isoformat() if po.updated_at else None,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_post_order(
    data: PostOrderCreate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Create a new post order / site instruction."""
    po = PostOrder(
        org_id=org_id,
        site_id=data.site_id,
        title=data.title,
        content=data.content,
        effective_from=datetime.fromisoformat(data.effective_from) if data.effective_from else None,
        effective_until=datetime.fromisoformat(data.effective_until) if data.effective_until else None,
        requires_acknowledgment=data.requires_acknowledgment,
        status=data.status if data.status in [s.value for s in PostOrderStatus] else PostOrderStatus.DRAFT,
        created_by_user_id=current_user.user_id,
    )
    db.add(po)
    db.commit()
    db.refresh(po)
    return _to_response(po, db)


@router.get("/")
def list_post_orders(
    site_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List all post orders for the organization."""
    query = db.query(PostOrder).filter(PostOrder.org_id == org_id)

    if site_id:
        query = query.filter(PostOrder.site_id == site_id)
    if status_filter:
        query = query.filter(PostOrder.status == status_filter)

    orders = query.order_by(PostOrder.created_at.desc()).offset(skip).limit(limit).all()
    return [_to_response(po, db) for po in orders]


@router.get("/site/{site_id}/active")
def get_active_orders_for_site(
    site_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Get active post orders for a specific site (used by mobile at shift start)."""
    orders = (
        db.query(PostOrder)
        .filter(
            PostOrder.org_id == org_id,
            PostOrder.site_id == site_id,
            PostOrder.status == PostOrderStatus.ACTIVE,
        )
        .order_by(PostOrder.version.desc())
        .all()
    )
    return [_to_response(po, db) for po in orders]


@router.get("/{post_order_id}")
def get_post_order(
    post_order_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Get a specific post order."""
    po = db.query(PostOrder).filter(
        PostOrder.post_order_id == post_order_id,
        PostOrder.org_id == org_id,
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Post order not found.")
    return _to_response(po, db)


@router.put("/{post_order_id}")
def update_post_order(
    post_order_id: int,
    data: PostOrderUpdate,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Update a post order."""
    po = db.query(PostOrder).filter(
        PostOrder.post_order_id == post_order_id,
        PostOrder.org_id == org_id,
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Post order not found.")

    if data.title is not None:
        po.title = data.title
    if data.content is not None:
        po.content = data.content
        po.version = (po.version or 1) + 1
    if data.effective_from is not None:
        po.effective_from = datetime.fromisoformat(data.effective_from) if data.effective_from else None
    if data.effective_until is not None:
        po.effective_until = datetime.fromisoformat(data.effective_until) if data.effective_until else None
    if data.requires_acknowledgment is not None:
        po.requires_acknowledgment = data.requires_acknowledgment
    if data.status is not None and data.status in [s.value for s in PostOrderStatus]:
        po.status = data.status

    db.commit()
    db.refresh(po)
    return _to_response(po, db)


@router.post("/{post_order_id}/acknowledge")
def acknowledge_post_order(
    post_order_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Guard acknowledges a post order."""
    po = db.query(PostOrder).filter(
        PostOrder.post_order_id == post_order_id,
        PostOrder.org_id == org_id,
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Post order not found.")

    employee = db.query(Employee).filter(
        Employee.email == current_user.email,
        Employee.org_id == org_id,
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee record not found.")

    # Check if already acknowledged
    existing = db.query(PostOrderAcknowledgment).filter(
        PostOrderAcknowledgment.post_order_id == post_order_id,
        PostOrderAcknowledgment.employee_id == employee.employee_id,
    ).first()
    if existing:
        return {"status": "already_acknowledged", "acknowledged_at": existing.acknowledged_at.isoformat()}

    ack = PostOrderAcknowledgment(
        post_order_id=post_order_id,
        employee_id=employee.employee_id,
    )
    db.add(ack)
    db.commit()

    return {"status": "acknowledged", "acknowledged_at": ack.acknowledged_at.isoformat()}


@router.get("/{post_order_id}/acknowledgments")
def get_acknowledgments(
    post_order_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Get acknowledgment status for a post order."""
    po = db.query(PostOrder).filter(
        PostOrder.post_order_id == post_order_id,
        PostOrder.org_id == org_id,
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Post order not found.")

    acks = db.query(PostOrderAcknowledgment).filter(
        PostOrderAcknowledgment.post_order_id == post_order_id
    ).all()

    return [
        {
            "employee_id": a.employee_id,
            "employee_name": f"{a.employee.first_name} {a.employee.last_name}" if a.employee else "Unknown",
            "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
        }
        for a in acks
    ]


@router.delete("/{post_order_id}")
def delete_post_order(
    post_order_id: int,
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Delete a post order."""
    po = db.query(PostOrder).filter(
        PostOrder.post_order_id == post_order_id,
        PostOrder.org_id == org_id,
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Post order not found.")

    db.delete(po)
    db.commit()
    return {"status": "ok", "message": "Post order deleted."}
