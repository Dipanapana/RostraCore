"""Employee RBAC management endpoints - Organization admins manage employee permissions."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr
from app.database import get_db
from app.models.employee import Employee
from passlib.context import CryptContext

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# === SCHEMAS ===

class EmployeeRoleAssign(BaseModel):
    employee_id: int
    system_role: str = Field(..., pattern="^(admin|supervisor|employee)$")
    can_login: bool = True
    login_email: Optional[EmailStr] = None
    permissions: List[str] = Field(default_factory=list)


class EmployeePasswordSet(BaseModel):
    employee_id: int
    password: str = Field(..., min_length=8)


class EmployeePermissionUpdate(BaseModel):
    permissions: List[str]


class EmployeeRoleResponse(BaseModel):
    employee_id: int
    first_name: str
    last_name: str
    email: Optional[str]
    system_role: Optional[str]
    can_login: bool
    login_email: Optional[str]
    login_enabled: bool
    permissions: Optional[List[str]]
    last_login: Optional[str]

    class Config:
        from_attributes = True


class AvailablePermissions(BaseModel):
    role: str
    permissions: List[Dict[str, str]]


# === AVAILABLE PERMISSIONS BY ROLE ===

ROLE_PERMISSIONS = {
    "admin": [
        {"key": "view_dashboard", "label": "View Dashboard"},
        {"key": "manage_employees", "label": "Manage Employees"},
        {"key": "manage_roster", "label": "Manage Roster"},
        {"key": "manage_shifts", "label": "Manage Shifts"},
        {"key": "view_payroll", "label": "View Payroll"},
        {"key": "manage_payroll", "label": "Manage Payroll"},
        {"key": "manage_clients", "label": "Manage Clients"},
        {"key": "manage_sites", "label": "Manage Sites"},
        {"key": "view_reports", "label": "View Reports"},
        {"key": "manage_organization", "label": "Manage Organization Settings"},
        {"key": "marketplace_access", "label": "Access Marketplace"},
        {"key": "manage_job_postings", "label": "Manage Job Postings"},
    ],
    "supervisor": [
        {"key": "view_dashboard", "label": "View Dashboard"},
        {"key": "view_employees", "label": "View Employees"},
        {"key": "view_roster", "label": "View Roster"},
        {"key": "manage_shifts", "label": "Manage Shifts"},
        {"key": "view_payroll", "label": "View Payroll"},
        {"key": "view_reports", "label": "View Reports"},
        {"key": "manage_attendance", "label": "Manage Attendance"},
    ],
    "employee": [
        {"key": "view_dashboard", "label": "View Dashboard"},
        {"key": "view_own_shifts", "label": "View Own Shifts"},
        {"key": "view_own_payroll", "label": "View Own Payroll"},
        {"key": "submit_timesheet", "label": "Submit Timesheet"},
    ]
}


# === ENDPOINTS ===

@router.get("/available-permissions", response_model=List[AvailablePermissions])
async def get_available_permissions():
    """
    Get available permissions for each role.

    Used by organization admin to see what permissions can be assigned.
    """
    result = []
    for role, permissions in ROLE_PERMISSIONS.items():
        result.append(AvailablePermissions(
            role=role,
            permissions=permissions
        ))
    return result


@router.get("/employees/{employee_id}/permissions", response_model=EmployeeRoleResponse)
async def get_employee_permissions(
    employee_id: int,
    db: Session = Depends(get_db)
):
    """Get an employee's role and permissions."""

    employee = db.query(Employee).filter(
        Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    return EmployeeRoleResponse(
        employee_id=employee.employee_id,
        first_name=employee.first_name,
        last_name=employee.last_name,
        email=employee.email,
        system_role=employee.system_role,
        can_login=employee.can_login or False,
        login_email=employee.login_email,
        login_enabled=employee.login_enabled or False,
        permissions=employee.permissions or [],
        last_login=employee.last_login.isoformat() if employee.last_login else None
    )


@router.post("/employees/assign-role", response_model=EmployeeRoleResponse)
async def assign_employee_role(
    role_data: EmployeeRoleAssign,
    db: Session = Depends(get_db)
):
    """
    Assign role and permissions to an employee.

    Organization admin only. Grants selective login access to employees.
    """

    employee = db.query(Employee).filter(
        Employee.employee_id == role_data.employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    # Validate role
    if role_data.system_role not in ['admin', 'supervisor', 'employee']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid system role. Must be admin, supervisor, or employee"
        )

    # Validate permissions are appropriate for role
    valid_permissions = [p["key"] for p in ROLE_PERMISSIONS.get(role_data.system_role, [])]
    invalid_perms = [p for p in role_data.permissions if p not in valid_permissions]

    if invalid_perms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid permissions for role '{role_data.system_role}': {', '.join(invalid_perms)}"
        )

    # Update employee
    employee.system_role = role_data.system_role
    employee.can_login = role_data.can_login
    employee.login_email = role_data.login_email or employee.email
    employee.permissions = role_data.permissions

    # If granting login access, ensure login is enabled
    if role_data.can_login:
        employee.login_enabled = True
    else:
        employee.login_enabled = False

    db.commit()
    db.refresh(employee)

    return EmployeeRoleResponse(
        employee_id=employee.employee_id,
        first_name=employee.first_name,
        last_name=employee.last_name,
        email=employee.email,
        system_role=employee.system_role,
        can_login=employee.can_login or False,
        login_email=employee.login_email,
        login_enabled=employee.login_enabled or False,
        permissions=employee.permissions or [],
        last_login=employee.last_login.isoformat() if employee.last_login else None
    )


@router.post("/employees/set-password")
async def set_employee_password(
    password_data: EmployeePasswordSet,
    db: Session = Depends(get_db)
):
    """
    Set or reset an employee's login password.

    Organization admin only. Required before employee can login.
    """

    employee = db.query(Employee).filter(
        Employee.employee_id == password_data.employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    if not employee.can_login:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee does not have login access. Assign a role first."
        )

    # Hash and set password
    hashed_password = pwd_context.hash(password_data.password)
    employee.login_password = hashed_password
    employee.login_enabled = True

    db.commit()

    return {
        "message": "Password set successfully",
        "employee_id": employee.employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "login_enabled": employee.login_enabled
    }


@router.put("/employees/{employee_id}/permissions", response_model=EmployeeRoleResponse)
async def update_employee_permissions(
    employee_id: int,
    permission_data: EmployeePermissionUpdate,
    db: Session = Depends(get_db)
):
    """Update an employee's permissions without changing their role."""

    employee = db.query(Employee).filter(
        Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    if not employee.system_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee has no assigned role. Assign a role first."
        )

    # Validate permissions are appropriate for role
    valid_permissions = [p["key"] for p in ROLE_PERMISSIONS.get(employee.system_role, [])]
    invalid_perms = [p for p in permission_data.permissions if p not in valid_permissions]

    if invalid_perms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid permissions for role '{employee.system_role}': {', '.join(invalid_perms)}"
        )

    employee.permissions = permission_data.permissions
    db.commit()
    db.refresh(employee)

    return EmployeeRoleResponse(
        employee_id=employee.employee_id,
        first_name=employee.first_name,
        last_name=employee.last_name,
        email=employee.email,
        system_role=employee.system_role,
        can_login=employee.can_login or False,
        login_email=employee.login_email,
        login_enabled=employee.login_enabled or False,
        permissions=employee.permissions or [],
        last_login=employee.last_login.isoformat() if employee.last_login else None
    )


@router.post("/employees/{employee_id}/revoke-access")
async def revoke_employee_access(
    employee_id: int,
    db: Session = Depends(get_db)
):
    """Revoke an employee's login access."""

    employee = db.query(Employee).filter(
        Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    employee.can_login = False
    employee.login_enabled = False
    employee.system_role = None
    employee.permissions = []

    db.commit()

    return {
        "message": "Employee access revoked successfully",
        "employee_id": employee.employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}"
    }


@router.get("/employees/with-access", response_model=List[EmployeeRoleResponse])
async def list_employees_with_access(
    organization_id: int,
    db: Session = Depends(get_db)
):
    """List all employees with login access for an organization."""

    employees = db.query(Employee).filter(
        Employee.organization_id == organization_id,
        Employee.can_login == True
    ).all()

    result = []
    for employee in employees:
        result.append(EmployeeRoleResponse(
            employee_id=employee.employee_id,
            first_name=employee.first_name,
            last_name=employee.last_name,
            email=employee.email,
            system_role=employee.system_role,
            can_login=employee.can_login or False,
            login_email=employee.login_email,
            login_enabled=employee.login_enabled or False,
            permissions=employee.permissions or [],
            last_login=employee.last_login.isoformat() if employee.last_login else None
        ))

    return result
