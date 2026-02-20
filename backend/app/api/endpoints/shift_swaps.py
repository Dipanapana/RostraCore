"""Shift swap request endpoints.

Guards request to swap a shift with another qualified guard.
Flow: create → peer accepts/declines → manager approves/rejects → assignments updated.
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.shift_swap import ShiftSwap, SwapStatus
from app.models.shift_assignment import ShiftAssignment
from app.models.shift import Shift
from app.models.employee import Employee
from app.models.site import Site
from app.models.user import User
from app.auth.security import get_current_org_id, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class SwapCreate(BaseModel):
    requester_assignment_id: int
    target_employee_id: int
    target_assignment_id: Optional[int] = None  # If trading shifts (both swap)
    reason: Optional[str] = None


class SwapResponse(BaseModel):
    swap_id: int
    org_id: int
    status: str
    reason: Optional[str] = None
    rejection_reason: Optional[str] = None

    # Requester info
    requester_employee_id: int
    requester_name: str
    requester_assignment_id: int
    requester_shift_date: Optional[str] = None
    requester_shift_time: Optional[str] = None
    requester_site_name: Optional[str] = None

    # Target info
    target_employee_id: int
    target_name: str
    target_assignment_id: Optional[int] = None
    target_shift_date: Optional[str] = None
    target_shift_time: Optional[str] = None
    target_site_name: Optional[str] = None

    # Timestamps
    created_at: datetime
    updated_at: datetime
    responded_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by_name: Optional[str] = None

    class Config:
        from_attributes = True


def _build_response(swap: ShiftSwap, db: Session) -> dict:
    """Build a rich response dict from a ShiftSwap row."""
    # Requester info
    req_emp = db.query(Employee).get(swap.requester_employee_id)
    req_assign = db.query(ShiftAssignment).get(swap.requester_assignment_id)
    req_shift = db.query(Shift).get(req_assign.shift_id) if req_assign else None
    req_site = db.query(Site).get(req_shift.site_id) if req_shift else None

    # Target info
    tgt_emp = db.query(Employee).get(swap.target_employee_id)
    tgt_assign = db.query(ShiftAssignment).get(swap.target_assignment_id) if swap.target_assignment_id else None
    tgt_shift = db.query(Shift).get(tgt_assign.shift_id) if tgt_assign else None
    tgt_site = db.query(Site).get(tgt_shift.site_id) if tgt_shift else None

    # Reviewer
    reviewer_name = None
    if swap.reviewed_by:
        reviewer = db.query(User).get(swap.reviewed_by)
        reviewer_name = f"{reviewer.first_name} {reviewer.last_name}" if reviewer else None

    return {
        "swap_id": swap.swap_id,
        "org_id": swap.org_id,
        "status": swap.status,
        "reason": swap.reason,
        "rejection_reason": swap.rejection_reason,
        "requester_employee_id": swap.requester_employee_id,
        "requester_name": f"{req_emp.first_name} {req_emp.last_name}" if req_emp else "Unknown",
        "requester_assignment_id": swap.requester_assignment_id,
        "requester_shift_date": req_shift.start_time.strftime("%Y-%m-%d") if req_shift else None,
        "requester_shift_time": f"{req_shift.start_time.strftime('%H:%M')}–{req_shift.end_time.strftime('%H:%M')}" if req_shift else None,
        "requester_site_name": req_site.site_name if req_site else None,
        "target_employee_id": swap.target_employee_id,
        "target_name": f"{tgt_emp.first_name} {tgt_emp.last_name}" if tgt_emp else "Unknown",
        "target_assignment_id": swap.target_assignment_id,
        "target_shift_date": tgt_shift.start_time.strftime("%Y-%m-%d") if tgt_shift else None,
        "target_shift_time": f"{tgt_shift.start_time.strftime('%H:%M')}–{tgt_shift.end_time.strftime('%H:%M')}" if tgt_shift else None,
        "target_site_name": tgt_site.site_name if tgt_site else None,
        "created_at": swap.created_at,
        "updated_at": swap.updated_at,
        "responded_at": swap.responded_at,
        "reviewed_at": swap.reviewed_at,
        "reviewed_by_name": reviewer_name,
    }


# ---------------------------------------------------------------------------
# UPCOMING ASSIGNMENTS (for create-swap dropdown)
# ---------------------------------------------------------------------------

@router.get("/upcoming-assignments")
def upcoming_assignments(
    limit: int = Query(200, le=500),
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """Return upcoming shift assignments for the org (for swap-create dropdown)."""
    rows = (
        db.query(ShiftAssignment, Shift, Site, Employee)
        .join(Shift, ShiftAssignment.shift_id == Shift.shift_id)
        .join(Site, Shift.site_id == Site.site_id)
        .join(Employee, ShiftAssignment.employee_id == Employee.employee_id)
        .filter(
            Shift.org_id == org_id,
            Shift.start_time >= datetime.utcnow(),
            ShiftAssignment.status.in_(["pending", "confirmed"]),
        )
        .order_by(Shift.start_time)
        .limit(limit)
        .all()
    )

    return [
        {
            "assignment_id": a.assignment_id,
            "employee_id": a.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}",
            "shift_id": s.shift_id,
            "shift_date": s.start_time.strftime("%Y-%m-%d"),
            "shift_time": f"{s.start_time.strftime('%H:%M')}–{s.end_time.strftime('%H:%M')}",
            "site_name": site.site_name,
        }
        for a, s, site, emp in rows
    ]


# ---------------------------------------------------------------------------
# LIST swap requests
# ---------------------------------------------------------------------------

@router.get("/")
def list_swaps(
    status_filter: Optional[str] = Query(None, alias="status"),
    employee_id: Optional[int] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db),
):
    """List shift swap requests for the organisation."""
    q = db.query(ShiftSwap).filter(ShiftSwap.org_id == org_id)

    if status_filter:
        q = q.filter(ShiftSwap.status == status_filter)

    if employee_id:
        q = q.filter(
            (ShiftSwap.requester_employee_id == employee_id)
            | (ShiftSwap.target_employee_id == employee_id)
        )

    total = q.count()
    swaps = q.order_by(ShiftSwap.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "items": [_build_response(s, db) for s in swaps],
        "total": total,
    }


# ---------------------------------------------------------------------------
# CREATE swap request
# ---------------------------------------------------------------------------

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_swap(
    body: SwapCreate,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new shift swap request."""
    # Validate requester assignment exists and belongs to org
    req_assign = (
        db.query(ShiftAssignment)
        .join(Shift, ShiftAssignment.shift_id == Shift.shift_id)
        .filter(
            ShiftAssignment.assignment_id == body.requester_assignment_id,
            Shift.org_id == org_id,
        )
        .first()
    )
    if not req_assign:
        raise HTTPException(status_code=404, detail="Requester assignment not found")

    req_shift = db.query(Shift).get(req_assign.shift_id)
    if req_shift and req_shift.start_time < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Cannot swap a shift that has already started")

    # Validate target employee exists in org
    tgt_emp = db.query(Employee).filter(
        Employee.employee_id == body.target_employee_id,
        Employee.org_id == org_id,
    ).first()
    if not tgt_emp:
        raise HTTPException(status_code=404, detail="Target employee not found")

    # Validate target assignment if provided
    if body.target_assignment_id:
        tgt_assign = (
            db.query(ShiftAssignment)
            .join(Shift, ShiftAssignment.shift_id == Shift.shift_id)
            .filter(
                ShiftAssignment.assignment_id == body.target_assignment_id,
                ShiftAssignment.employee_id == body.target_employee_id,
                Shift.org_id == org_id,
            )
            .first()
        )
        if not tgt_assign:
            raise HTTPException(status_code=404, detail="Target assignment not found")

    # Check for duplicate pending swaps
    existing = db.query(ShiftSwap).filter(
        ShiftSwap.requester_assignment_id == body.requester_assignment_id,
        ShiftSwap.status.in_([SwapStatus.PENDING_PEER.value, SwapStatus.PENDING_APPROVAL.value]),
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="A pending swap request already exists for this assignment")

    swap = ShiftSwap(
        org_id=org_id,
        requester_employee_id=req_assign.employee_id,
        requester_assignment_id=body.requester_assignment_id,
        target_employee_id=body.target_employee_id,
        target_assignment_id=body.target_assignment_id,
        reason=body.reason,
        status=SwapStatus.PENDING_PEER.value,
    )
    db.add(swap)
    db.commit()
    db.refresh(swap)

    return _build_response(swap, db)


# ---------------------------------------------------------------------------
# PEER RESPOND (accept / decline)
# ---------------------------------------------------------------------------

@router.post("/{swap_id}/respond")
def peer_respond(
    swap_id: int,
    accept: bool = True,
    decline_reason: Optional[str] = None,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Target guard accepts or declines the swap request."""
    swap = db.query(ShiftSwap).filter(
        ShiftSwap.swap_id == swap_id,
        ShiftSwap.org_id == org_id,
    ).first()
    if not swap:
        raise HTTPException(status_code=404, detail="Swap request not found")

    if swap.status != SwapStatus.PENDING_PEER.value:
        raise HTTPException(status_code=400, detail=f"Swap is {swap.status}, cannot respond")

    now = datetime.utcnow()
    if accept:
        swap.status = SwapStatus.PENDING_APPROVAL.value
    else:
        swap.status = SwapStatus.DECLINED.value
        swap.rejection_reason = decline_reason
    swap.responded_at = now
    swap.updated_at = now
    db.commit()
    db.refresh(swap)

    return _build_response(swap, db)


# ---------------------------------------------------------------------------
# MANAGER REVIEW (approve / reject)
# ---------------------------------------------------------------------------

@router.post("/{swap_id}/review")
def manager_review(
    swap_id: int,
    approve: bool = True,
    rejection_reason: Optional[str] = None,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manager approves or rejects the swap. On approval, assignments are updated."""
    swap = db.query(ShiftSwap).filter(
        ShiftSwap.swap_id == swap_id,
        ShiftSwap.org_id == org_id,
    ).first()
    if not swap:
        raise HTTPException(status_code=404, detail="Swap request not found")

    if swap.status != SwapStatus.PENDING_APPROVAL.value:
        raise HTTPException(status_code=400, detail=f"Swap is {swap.status}, cannot review")

    now = datetime.utcnow()
    swap.reviewed_at = now
    swap.reviewed_by = current_user.user_id
    swap.updated_at = now

    if not approve:
        swap.status = SwapStatus.REJECTED.value
        swap.rejection_reason = rejection_reason
        db.commit()
        db.refresh(swap)
        return _build_response(swap, db)

    # ── Execute the swap ──────────────────────────────────────────
    req_assign = db.query(ShiftAssignment).get(swap.requester_assignment_id)
    if not req_assign:
        raise HTTPException(status_code=400, detail="Requester assignment no longer exists")

    if swap.target_assignment_id:
        # Full trade: swap employee_ids on both assignments
        tgt_assign = db.query(ShiftAssignment).get(swap.target_assignment_id)
        if not tgt_assign:
            raise HTTPException(status_code=400, detail="Target assignment no longer exists")

        req_assign.employee_id, tgt_assign.employee_id = tgt_assign.employee_id, req_assign.employee_id
    else:
        # One-way swap: reassign the shift to the target guard
        req_assign.employee_id = swap.target_employee_id

    swap.status = SwapStatus.APPROVED.value
    db.commit()
    db.refresh(swap)

    return _build_response(swap, db)


# ---------------------------------------------------------------------------
# CANCEL (requester withdraws)
# ---------------------------------------------------------------------------

@router.post("/{swap_id}/cancel")
def cancel_swap(
    swap_id: int,
    org_id: int = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Requester cancels a pending swap request."""
    swap = db.query(ShiftSwap).filter(
        ShiftSwap.swap_id == swap_id,
        ShiftSwap.org_id == org_id,
    ).first()
    if not swap:
        raise HTTPException(status_code=404, detail="Swap request not found")

    if swap.status not in (SwapStatus.PENDING_PEER.value, SwapStatus.PENDING_APPROVAL.value):
        raise HTTPException(status_code=400, detail=f"Cannot cancel a {swap.status} swap")

    swap.status = SwapStatus.CANCELLED.value
    swap.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(swap)

    return _build_response(swap, db)
