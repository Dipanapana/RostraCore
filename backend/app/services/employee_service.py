"""Employee service for CRUD operations."""

from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.employee import Employee
from app.models.schemas import EmployeeCreate, EmployeeUpdate


class EmployeeService:
    """Service for employee-related operations."""

    @staticmethod
    def get_all(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        org_id: Optional[int] = None
    ) -> List[Employee]:
        """Get all employees with optional filtering by organization."""
        query = db.query(Employee)

        # Filter by organization if provided
        if org_id is not None:
            query = query.filter(Employee.org_id == org_id)

        if status:
            query = query.filter(Employee.status == status)

        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_by_id(db: Session, employee_id: int, org_id: Optional[int] = None) -> Optional[Employee]:
        """Get employee by ID, optionally filtered by organization."""
        query = db.query(Employee).filter(Employee.employee_id == employee_id)

        if org_id is not None:
            query = query.filter(Employee.org_id == org_id)

        return query.first()

    @staticmethod
    def get_by_id_number(db: Session, id_number: str, org_id: Optional[int] = None) -> Optional[Employee]:
        """Get employee by ID number, optionally filtered by organization."""
        query = db.query(Employee).filter(Employee.id_number == id_number)

        if org_id is not None:
            query = query.filter(Employee.org_id == org_id)

        return query.first()

    @staticmethod
    def create(db: Session, employee_data: EmployeeCreate) -> Employee:
        """Create new employee."""
        db_employee = Employee(**employee_data.model_dump())
        db.add(db_employee)
        db.commit()
        db.refresh(db_employee)
        return db_employee

    @staticmethod
    def update(db: Session, employee_id: int, employee_data: EmployeeUpdate, org_id: Optional[int] = None) -> Optional[Employee]:
        """Update employee, optionally filtered by organization."""
        db_employee = EmployeeService.get_by_id(db, employee_id, org_id=org_id)
        if not db_employee:
            return None

        update_data = employee_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_employee, field, value)

        db.commit()
        db.refresh(db_employee)
        return db_employee

    @staticmethod
    def delete(db: Session, employee_id: int, org_id: Optional[int] = None) -> bool:
        """Delete employee, optionally filtered by organization."""
        db_employee = EmployeeService.get_by_id(db, employee_id, org_id=org_id)
        if not db_employee:
            return False

        db.delete(db_employee)
        db.commit()
        return True

    @staticmethod
    def get_active_employees(db: Session, org_id: Optional[int] = None) -> List[Employee]:
        """Get all active employees, optionally filtered by organization."""
        query = db.query(Employee).filter(Employee.status == "active")

        if org_id is not None:
            query = query.filter(Employee.org_id == org_id)

        return query.all()
