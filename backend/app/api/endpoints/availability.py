"""Availability API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from datetime import date, time
from app.database import get_db
from app.models.availability import Availability
from app.models.employee import Employee
from app.auth.security import get_current_org_id
from pydantic import BaseModel
from pydantic.functional_serializers import field_serializer

router = APIRouter()


class AvailabilityCreate(BaseModel):
    employee_id: int
    date: date
    start_time: str
    end_time: str
    available: bool


class AvailabilityUpdate(BaseModel):
    date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    available: Optional[bool] = None


class AvailabilityResponse(BaseModel):
    avail_id: int
    employee_id: int
    date: date
    start_time: str
    end_time: str
    available: bool

    class Config:
        from_attributes = True

    @field_serializer('start_time', 'end_time')
    def serialize_time(self, value: time) -> str:
        """Convert time objects to HH:MM:SS format."""
        if isinstance(value, time):
            return value.strftime('%H:%M:%S')
        return value


@router.get("/")
async def get_availability(
    employee_id: Optional[int] = None,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Get availability records (filtered by organization via employee)."""
    query = db.query(Availability).join(Employee).filter(Employee.org_id == org_id)
    if employee_id:
        query = query.filter(Availability.employee_id == employee_id)
    availabilities = query.all()

    # Convert to dict with proper time formatting
    result = []
    for avail in availabilities:
        result.append({
            "avail_id": avail.avail_id,
            "employee_id": avail.employee_id,
            "date": avail.date,
            "start_time": avail.start_time.strftime('%H:%M:%S') if isinstance(avail.start_time, time) else avail.start_time,
            "end_time": avail.end_time.strftime('%H:%M:%S') if isinstance(avail.end_time, time) else avail.end_time,
            "available": avail.available
        })
    return result


@router.get("/{avail_id}", response_model=AvailabilityResponse)
async def get_availability_by_id(
    avail_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Get specific availability record (filtered by organization via employee)."""
    availability = db.query(Availability).join(Employee).filter(
        Availability.avail_id == avail_id,
        Employee.org_id == org_id
    ).first()
    if not availability:
        raise HTTPException(status_code=404, detail="Availability record not found")
    return availability


@router.post("/", response_model=AvailabilityResponse, status_code=status.HTTP_201_CREATED)
async def create_availability(
    availability_data: AvailabilityCreate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Create availability record (employee must belong to organization)."""
    # Verify employee belongs to organization
    employee = db.query(Employee).filter(
        Employee.employee_id == availability_data.employee_id,
        Employee.org_id == org_id
    ).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {availability_data.employee_id} not found in your organization"
        )

    availability = Availability(**availability_data.model_dump())
    db.add(availability)
    db.commit()
    db.refresh(availability)
    return availability


@router.put("/{avail_id}", response_model=AvailabilityResponse)
async def update_availability(
    avail_id: int,
    availability_data: AvailabilityUpdate,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Update availability record (filtered by organization via employee)."""
    availability = db.query(Availability).join(Employee).filter(
        Availability.avail_id == avail_id,
        Employee.org_id == org_id
    ).first()
    if not availability:
        raise HTTPException(status_code=404, detail="Availability record not found")

    for key, value in availability_data.model_dump(exclude_unset=True).items():
        setattr(availability, key, value)

    db.commit()
    db.refresh(availability)
    return availability


@router.delete("/{avail_id}")
async def delete_availability(
    avail_id: int,
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    """Delete availability record (filtered by organization via employee)."""
    availability = db.query(Availability).join(Employee).filter(
        Availability.avail_id == avail_id,
        Employee.org_id == org_id
    ).first()
    if not availability:
        raise HTTPException(status_code=404, detail="Availability record not found")

    db.delete(availability)
    db.commit()
    return {"message": f"Availability record {avail_id} deleted successfully"}
