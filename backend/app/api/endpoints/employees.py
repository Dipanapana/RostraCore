"""Employees API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.schemas import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from app.services.employee_service import EmployeeService
from app.services.excel_import_service import ExcelImportService
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=List[EmployeeResponse])
async def get_employees(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all employees with optional status filter (filtered by organization)."""
    org_id = current_user.org_id or 1
    employees = EmployeeService.get_all(
        db,
        skip=skip,
        limit=limit,
        status=status_filter,
        org_id=org_id
    )
    return employees


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get employee by ID (filtered by organization)."""
    org_id = current_user.org_id or 1
    employee = EmployeeService.get_by_id(db, employee_id, org_id=org_id)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )
    return employee


@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    employee_data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new employee (automatically assigned to user's organization)."""
    org_id = current_user.org_id or 1

    # Check if ID number already exists in this organization
    existing = EmployeeService.get_by_id_number(db, employee_data.id_number, org_id=org_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee with ID number {employee_data.id_number} already exists"
        )

    # Set org_id from current user if not provided
    if employee_data.org_id is None:
        employee_data.org_id = org_id

    employee = EmployeeService.create(db, employee_data)
    return employee


@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update employee (filtered by organization)."""
    org_id = current_user.org_id or 1
    employee = EmployeeService.update(db, employee_id, employee_data, org_id=org_id)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )
    return employee


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete employee (filtered by organization)."""
    org_id = current_user.org_id or 1
    success = EmployeeService.delete(db, employee_id, org_id=org_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )
    return None


@router.post("/import-excel")
async def import_employees_from_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Import employees from Excel file.

    Upload an Excel file (.xlsx) with employee data to bulk import.

    Required columns: first_name, last_name, id_number
    Optional columns: email, phone, role_name, psira_number, hourly_rate,
                     home_address, emergency_contact, emergency_phone

    Returns detailed import results with success/error counts.
    """
    # Verify file is Excel
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an Excel file (.xlsx or .xls)"
        )

    # Read file content
    content = await file.read()

    # Import employees
    result = ExcelImportService.import_employees(
        db=db,
        file_content=content,
        organization_id=current_user.organization_id
    )

    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )

    return result


@router.get("/download-template")
async def download_employee_template():
    """
    Download Excel template for employee import.

    Returns an Excel file with sample data and correct column headers.
    """
    template_bytes = ExcelImportService.generate_employee_template()

    return Response(
        content=template_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=employee_import_template.xlsx"
        }
    )
