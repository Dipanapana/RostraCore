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
    def assign_employee(db: Session, shift_id: int, employee_id: int, roster_id: Optional[int] = None) -> Optional[Shift]:
        """
        Assign employee to shift.

        FIXED: Now creates ShiftAssignment record in addition to updating Shift.assigned_employee_id
        This resolves the dual tracking issue where assignments were only tracked in one place.

        Args:
            db: Database session
            shift_id: ID of shift to assign
            employee_id: ID of employee to assign
            roster_id: Optional roster ID for tracking (can be None for manual assignments)

        Returns:
            Updated Shift object or None if shift not found
        """
        from app.models.shift_assignment import ShiftAssignment
        from app.models.employee import Employee

        db_shift = ShiftService.get_by_id(db, shift_id)
        if not db_shift:
            return None

        # Get employee for cost calculation
        employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not employee:
            return None

        # Update shift assignment (old system - kept for backward compatibility)
        db_shift.assigned_employee_id = employee_id
        db_shift.status = "confirmed"

        # FIXED: Create or update ShiftAssignment record (new system)
        # Check if assignment already exists
        existing_assignment = db.query(ShiftAssignment).filter(
            ShiftAssignment.shift_id == shift_id
        ).first()

        if existing_assignment:
            # Update existing assignment
            existing_assignment.employee_id = employee_id
            if roster_id:
                existing_assignment.roster_id = roster_id
        else:
            # Create new assignment
            assignment = ShiftAssignment(
                shift_id=shift_id,
                employee_id=employee_id,
                roster_id=roster_id  # Can be None for manual assignments
            )
            # Calculate cost breakdown
            assignment.calculate_cost(db_shift, employee)
            db.add(assignment)

        db.commit()
        db.refresh(db_shift)
        return db_shift
