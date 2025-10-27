"""Shift service for CRUD operations."""

from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.models.shift import Shift
from app.models.schemas import ShiftCreate, ShiftUpdate


class ShiftService:
    """Service for shift-related operations."""

    @staticmethod
    def get_all(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        site_id: Optional[int] = None,
        employee_id: Optional[int] = None,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Shift]:
        """Get all shifts with optional filtering."""
        query = db.query(Shift)

        if site_id:
            query = query.filter(Shift.site_id == site_id)
        if employee_id:
            query = query.filter(Shift.assigned_employee_id == employee_id)
        if status:
            query = query.filter(Shift.status == status)
        if start_date:
            query = query.filter(Shift.start_time >= start_date)
        if end_date:
            query = query.filter(Shift.end_time <= end_date)

        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_by_id(db: Session, shift_id: int) -> Optional[Shift]:
        """Get shift by ID."""
        return db.query(Shift).filter(Shift.shift_id == shift_id).first()

    @staticmethod
    def create(db: Session, shift_data: ShiftCreate) -> Shift:
        """Create new shift."""
        db_shift = Shift(**shift_data.model_dump())
        db.add(db_shift)
        db.commit()
        db.refresh(db_shift)
        return db_shift

    @staticmethod
    def update(db: Session, shift_id: int, shift_data: ShiftUpdate) -> Optional[Shift]:
        """Update shift."""
        db_shift = ShiftService.get_by_id(db, shift_id)
        if not db_shift:
            return None

        update_data = shift_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_shift, field, value)

        db.commit()
        db.refresh(db_shift)
        return db_shift

    @staticmethod
    def delete(db: Session, shift_id: int) -> bool:
        """Delete shift."""
        db_shift = ShiftService.get_by_id(db, shift_id)
        if not db_shift:
            return False

        db.delete(db_shift)
        db.commit()
        return True

    @staticmethod
    def get_unassigned_shifts(
        db: Session,
        start_date: datetime,
        end_date: datetime,
        site_ids: Optional[List[int]] = None
    ) -> List[Shift]:
        """Get shifts without assigned employees in date range."""
        query = db.query(Shift).filter(
            Shift.assigned_employee_id.is_(None),
            Shift.start_time >= start_date,
            Shift.end_time <= end_date
        )

        if site_ids:
            query = query.filter(Shift.site_id.in_(site_ids))

        return query.all()

    @staticmethod
    def assign_employee(db: Session, shift_id: int, employee_id: int) -> Optional[Shift]:
        """Assign employee to shift."""
        db_shift = ShiftService.get_by_id(db, shift_id)
        if not db_shift:
            return None

        db_shift.assigned_employee_id = employee_id
        db_shift.status = "confirmed"
        db.commit()
        db.refresh(db_shift)
        return db_shift
