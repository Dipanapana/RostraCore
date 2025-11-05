"""Shift Groups API endpoints for multi-guard shift management."""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel, Field

from app.database import get_db
from app.models.shift_group import ShiftGroup, ShiftGroupStatus
from app.models.shift import Shift


router = APIRouter()


# Pydantic schemas
class ShiftGroupBase(BaseModel):
    """Base shift group schema."""
    site_id: int = Field(..., gt=0)
    group_name: Optional[str] = Field(None, max_length=100)
    group_code: Optional[str] = Field(None, max_length=50)
    start_time: datetime
    end_time: datetime
    required_guards: int = Field(..., gt=0)
    required_supervisors: int = Field(default=0, ge=0)
    notes: Optional[str] = None


class ShiftGroupCreate(ShiftGroupBase):
    """Schema for creating a shift group."""
    pass


class ShiftGroupUpdate(BaseModel):
    """Schema for updating a shift group."""
    group_name: Optional[str] = Field(None, max_length=100)
    group_code: Optional[str] = Field(None, max_length=50)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    required_guards: Optional[int] = Field(None, gt=0)
    required_supervisors: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None
    status: Optional[ShiftGroupStatus] = None


class ShiftGroupResponse(ShiftGroupBase):
    """Schema for shift group response."""
    shift_group_id: int
    tenant_id: int
    status: ShiftGroupStatus
    total_positions: int
    duration_hours: float
    created_at: str
    created_by: Optional[str]

    class Config:
        from_attributes = True


class ShiftGroupPublish(BaseModel):
    """Schema for publishing a shift group (creating individual shifts)."""
    create_positions: bool = Field(
        default=True,
        description="Automatically create individual shift positions"
    )


class ShiftGroupStats(BaseModel):
    """Shift group statistics."""
    total_groups: int
    by_status: dict
    total_positions_needed: int
    avg_guards_per_group: float
    avg_supervisors_per_group: float


# Helper function to get current tenant ID (will be replaced with proper auth later)
def get_current_tenant_id() -> int:
    """
    Get current tenant ID from auth context.

    TODO: Replace with proper JWT token-based tenant extraction.
    For now, returns the default tenant ID.
    """
    return 1  # Default tenant


@router.post("/", response_model=ShiftGroupResponse, status_code=status.HTTP_201_CREATED)
async def create_shift_group(
    shift_group_data: ShiftGroupCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new shift group.

    A shift group represents a single time slot requiring multiple guards.
    After creation, publish it to generate individual shift positions.
    """
    tenant_id = get_current_tenant_id()

    # Validate start_time < end_time
    if shift_group_data.start_time >= shift_group_data.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start time must be before end time"
        )

    # Create shift group
    new_group = ShiftGroup(
        tenant_id=tenant_id,
        site_id=shift_group_data.site_id,
        group_name=shift_group_data.group_name,
        group_code=shift_group_data.group_code,
        start_time=shift_group_data.start_time,
        end_time=shift_group_data.end_time,
        required_guards=shift_group_data.required_guards,
        required_supervisors=shift_group_data.required_supervisors,
        notes=shift_group_data.notes,
        status=ShiftGroupStatus.DRAFT
    )

    # Validate staffing
    is_valid, message = new_group.validate_staffing()
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid staffing configuration: {message}"
        )

    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    return ShiftGroupResponse(
        shift_group_id=new_group.shift_group_id,
        tenant_id=new_group.tenant_id,
        site_id=new_group.site_id,
        group_name=new_group.group_name,
        group_code=new_group.group_code,
        start_time=new_group.start_time,
        end_time=new_group.end_time,
        required_guards=new_group.required_guards,
        required_supervisors=new_group.required_supervisors,
        status=new_group.status,
        total_positions=new_group.total_positions,
        duration_hours=new_group.duration_hours,
        notes=new_group.notes,
        created_at=new_group.created_at.isoformat() if new_group.created_at else None,
        created_by=new_group.created_by
    )


@router.get("/", response_model=List[ShiftGroupResponse])
async def list_shift_groups(
    site_id: Optional[int] = Query(None, description="Filter by site"),
    status: Optional[ShiftGroupStatus] = Query(None, description="Filter by status"),
    start_date: Optional[datetime] = Query(None, description="Filter groups starting after this date"),
    end_date: Optional[datetime] = Query(None, description="Filter groups ending before this date"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    List shift groups with optional filters.
    """
    tenant_id = get_current_tenant_id()

    query = db.query(ShiftGroup).filter(ShiftGroup.tenant_id == tenant_id)

    if site_id:
        query = query.filter(ShiftGroup.site_id == site_id)

    if status:
        query = query.filter(ShiftGroup.status == status)

    if start_date:
        query = query.filter(ShiftGroup.start_time >= start_date)

    if end_date:
        query = query.filter(ShiftGroup.end_time <= end_date)

    shift_groups = query.order_by(ShiftGroup.start_time.desc()).offset(skip).limit(limit).all()

    return [
        ShiftGroupResponse(
            shift_group_id=group.shift_group_id,
            tenant_id=group.tenant_id,
            site_id=group.site_id,
            group_name=group.group_name,
            group_code=group.group_code,
            start_time=group.start_time,
            end_time=group.end_time,
            required_guards=group.required_guards,
            required_supervisors=group.required_supervisors,
            status=group.status,
            total_positions=group.total_positions,
            duration_hours=group.duration_hours,
            notes=group.notes,
            created_at=group.created_at.isoformat() if group.created_at else None,
            created_by=group.created_by
        )
        for group in shift_groups
    ]


@router.get("/stats", response_model=ShiftGroupStats)
async def get_shift_group_stats(
    site_id: Optional[int] = Query(None, description="Filter by site"),
    start_date: Optional[datetime] = Query(None, description="Stats from this date"),
    end_date: Optional[datetime] = Query(None, description="Stats until this date"),
    db: Session = Depends(get_db)
):
    """
    Get shift group statistics.
    """
    from sqlalchemy import func

    tenant_id = get_current_tenant_id()

    query = db.query(ShiftGroup).filter(ShiftGroup.tenant_id == tenant_id)

    if site_id:
        query = query.filter(ShiftGroup.site_id == site_id)

    if start_date:
        query = query.filter(ShiftGroup.start_time >= start_date)

    if end_date:
        query = query.filter(ShiftGroup.end_time <= end_date)

    all_groups = query.all()

    total_groups = len(all_groups)

    # Count by status
    by_status = {}
    for status_value in ShiftGroupStatus:
        count = sum(1 for g in all_groups if g.status == status_value)
        by_status[status_value.value] = count

    # Calculate totals
    total_positions_needed = sum(g.total_positions for g in all_groups)
    avg_guards_per_group = (sum(g.required_guards for g in all_groups) / total_groups) if total_groups > 0 else 0
    avg_supervisors_per_group = (sum(g.required_supervisors for g in all_groups) / total_groups) if total_groups > 0 else 0

    return ShiftGroupStats(
        total_groups=total_groups,
        by_status=by_status,
        total_positions_needed=total_positions_needed,
        avg_guards_per_group=round(avg_guards_per_group, 2),
        avg_supervisors_per_group=round(avg_supervisors_per_group, 2)
    )


@router.get("/{shift_group_id}", response_model=ShiftGroupResponse)
async def get_shift_group(
    shift_group_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific shift group by ID.
    """
    tenant_id = get_current_tenant_id()

    group = db.query(ShiftGroup).filter(
        and_(
            ShiftGroup.shift_group_id == shift_group_id,
            ShiftGroup.tenant_id == tenant_id
        )
    ).first()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift group with ID {shift_group_id} not found"
        )

    return ShiftGroupResponse(
        shift_group_id=group.shift_group_id,
        tenant_id=group.tenant_id,
        site_id=group.site_id,
        group_name=group.group_name,
        group_code=group.group_code,
        start_time=group.start_time,
        end_time=group.end_time,
        required_guards=group.required_guards,
        required_supervisors=group.required_supervisors,
        status=group.status,
        total_positions=group.total_positions,
        duration_hours=group.duration_hours,
        notes=group.notes,
        created_at=group.created_at.isoformat() if group.created_at else None,
        created_by=group.created_by
    )


@router.put("/{shift_group_id}", response_model=ShiftGroupResponse)
async def update_shift_group(
    shift_group_id: int,
    update_data: ShiftGroupUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a shift group.

    Only DRAFT shift groups can be modified.
    """
    tenant_id = get_current_tenant_id()

    group = db.query(ShiftGroup).filter(
        and_(
            ShiftGroup.shift_group_id == shift_group_id,
            ShiftGroup.tenant_id == tenant_id
        )
    ).first()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift group with ID {shift_group_id} not found"
        )

    # Only allow updates to DRAFT groups (unless just changing status)
    if group.status != ShiftGroupStatus.DRAFT and update_data.status is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only modify DRAFT shift groups. Publish or cancel first."
        )

    # Update fields that are provided
    update_dict = update_data.model_dump(exclude_unset=True)

    # Validate time range if either time is updated
    if 'start_time' in update_dict or 'end_time' in update_dict:
        start = update_dict.get('start_time', group.start_time)
        end = update_dict.get('end_time', group.end_time)
        if start >= end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start time must be before end time"
            )

    for field, value in update_dict.items():
        setattr(group, field, value)

    # Validate staffing if guards or supervisors changed
    if 'required_guards' in update_dict or 'required_supervisors' in update_dict:
        is_valid, message = group.validate_staffing()
        if not is_valid:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid staffing configuration: {message}"
            )

    db.commit()
    db.refresh(group)

    return ShiftGroupResponse(
        shift_group_id=group.shift_group_id,
        tenant_id=group.tenant_id,
        site_id=group.site_id,
        group_name=group.group_name,
        group_code=group.group_code,
        start_time=group.start_time,
        end_time=group.end_time,
        required_guards=group.required_guards,
        required_supervisors=group.required_supervisors,
        status=group.status,
        total_positions=group.total_positions,
        duration_hours=group.duration_hours,
        notes=group.notes,
        created_at=group.created_at.isoformat() if group.created_at else None,
        created_by=group.created_by
    )


@router.post("/{shift_group_id}/publish", response_model=dict)
async def publish_shift_group(
    shift_group_id: int,
    publish_data: ShiftGroupPublish,
    db: Session = Depends(get_db)
):
    """
    Publish a shift group, creating individual shift positions.

    This creates separate Shift records for each required position:
    - {required_guards} guard shifts
    - {required_supervisors} supervisor shifts
    """
    tenant_id = get_current_tenant_id()

    group = db.query(ShiftGroup).filter(
        and_(
            ShiftGroup.shift_group_id == shift_group_id,
            ShiftGroup.tenant_id == tenant_id
        )
    ).first()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift group with ID {shift_group_id} not found"
        )

    if group.status != ShiftGroupStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only publish DRAFT shift groups. Current status: {group.status.value}"
        )

    created_shifts = []

    if publish_data.create_positions:
        # Create supervisor shifts
        for i in range(group.required_supervisors):
            shift = Shift(
                tenant_id=tenant_id,
                site_id=group.site_id,
                shift_group_id=group.shift_group_id,
                start_time=group.start_time,
                end_time=group.end_time,
                position="Supervisor",
                notes=f"{group.group_name or 'Shift Group'} - Supervisor {i+1}"
            )
            db.add(shift)
            created_shifts.append(f"Supervisor {i+1}")

        # Create guard shifts
        for i in range(group.required_guards):
            shift = Shift(
                tenant_id=tenant_id,
                site_id=group.site_id,
                shift_group_id=group.shift_group_id,
                start_time=group.start_time,
                end_time=group.end_time,
                position="Guard",
                notes=f"{group.group_name or 'Shift Group'} - Guard {i+1}"
            )
            db.add(shift)
            created_shifts.append(f"Guard {i+1}")

    # Update group status
    group.status = ShiftGroupStatus.PUBLISHED

    db.commit()

    return {
        "message": f"Shift group {shift_group_id} published successfully",
        "shift_group_id": shift_group_id,
        "status": "published",
        "positions_created": len(created_shifts),
        "created_positions": created_shifts
    }


@router.delete("/{shift_group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shift_group(
    shift_group_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a shift group.

    Only DRAFT or CANCELLED shift groups can be deleted.
    Published groups must be cancelled first.
    """
    tenant_id = get_current_tenant_id()

    group = db.query(ShiftGroup).filter(
        and_(
            ShiftGroup.shift_group_id == shift_group_id,
            ShiftGroup.tenant_id == tenant_id
        )
    ).first()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift group with ID {shift_group_id} not found"
        )

    if group.status not in [ShiftGroupStatus.DRAFT, ShiftGroupStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete {group.status.value} shift group. Only DRAFT or CANCELLED groups can be deleted."
        )

    # Check if there are associated shifts
    shift_count = db.query(Shift).filter(Shift.shift_group_id == shift_group_id).count()
    if shift_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete shift group with {shift_count} associated shifts. Delete shifts first or cancel the group."
        )

    db.delete(group)
    db.commit()

    return None
