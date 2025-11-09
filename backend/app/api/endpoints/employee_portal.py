"""Employee portal endpoints for self-service features."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, date
from passlib.context import CryptContext

from app.database import get_db
from app.models.employee import Employee
from app.models.certification import Certification

router = APIRouter()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Pydantic schemas
class EmployeeLogin(BaseModel):
    email: str
    password: str


class EmployeeLoginResponse(BaseModel):
    employee_id: int
    email: str
    first_name: str
    last_name: str
    token: str  # JWT token
    is_active_account: bool


class EmployeeProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


class PSIRAUpdate(BaseModel):
    psira_number: str
    psira_expiry_date: date
    psira_grade: str  # A, B, C, D, E


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class EmployeeProfileResponse(BaseModel):
    employee_id: int
    first_name: str
    last_name: str
    id_number: str
    email: str
    phone: Optional[str]
    address: Optional[str]
    role: str
    status: str
    psira_number: Optional[str]
    psira_expiry_date: Optional[date]
    psira_grade: Optional[str]
    emergency_contact_name: Optional[str]
    emergency_contact_phone: Optional[str]
    profile_photo_url: Optional[str]
    is_active_account: bool
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


# Helper functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


# Endpoints
@router.post("/login", response_model=EmployeeLoginResponse)
async def employee_login(login_data: EmployeeLogin, db: Session = Depends(get_db)):
    """Employee login endpoint."""
    employee = db.query(Employee).filter(Employee.email == login_data.email).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not employee.is_active_account:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not activated. Please contact your administrator."
        )

    if not employee.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No password set. Please contact your administrator to set up your account."
        )

    if not verify_password(login_data.password, employee.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Update last login
    employee.last_login = datetime.utcnow()
    db.commit()

    # Generate JWT token (simplified - in production use proper JWT)
    token = f"employee_token_{employee.employee_id}_{datetime.utcnow().timestamp()}"

    return {
        "employee_id": employee.employee_id,
        "email": employee.email,
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "token": token,
        "is_active_account": employee.is_active_account
    }


@router.post("/activate-account")
async def activate_employee_account(
    employee_id: int,
    email: EmailStr,
    password: str,
    db: Session = Depends(get_db)
):
    """Activate employee account with email and password (first-time setup)."""
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )

    if employee.is_active_account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is already activated"
        )

    # Check if email is already in use
    existing = db.query(Employee).filter(
        Employee.email == email,
        Employee.employee_id != employee_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already in use"
        )

    # Set email, password, and activate account
    employee.email = email
    employee.hashed_password = get_password_hash(password)
    employee.is_active_account = True
    db.commit()

    return {"message": "Account activated successfully"}


@router.get("/profile/{employee_id}", response_model=EmployeeProfileResponse)
async def get_employee_profile(employee_id: int, db: Session = Depends(get_db)):
    """Get employee profile."""
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )

    return employee


@router.put("/profile/{employee_id}")
async def update_employee_profile(
    employee_id: int,
    profile_data: EmployeeProfileUpdate,
    db: Session = Depends(get_db)
):
    """Update employee profile information."""
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )

    # Update fields
    for field, value in profile_data.model_dump(exclude_unset=True).items():
        setattr(employee, field, value)

    db.commit()
    db.refresh(employee)

    return {"message": "Profile updated successfully", "employee": employee}


@router.put("/profile/{employee_id}/psira")
async def update_psira_info(
    employee_id: int,
    psira_data: PSIRAUpdate,
    db: Session = Depends(get_db)
):
    """Update PSIRA information."""
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )

    employee.psira_number = psira_data.psira_number
    employee.psira_expiry_date = psira_data.psira_expiry_date
    employee.psira_grade = psira_data.psira_grade

    db.commit()
    db.refresh(employee)

    return {"message": "PSIRA information updated successfully"}


@router.post("/profile/{employee_id}/upload-certificate")
async def upload_certificate(
    employee_id: int,
    cert_type: str,
    issue_date: date,
    expiry_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Upload a certificate (simplified - in production, handle file upload)."""
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )

    # Create certification record
    certification = Certification(
        employee_id=employee_id,
        cert_type=cert_type,
        issue_date=issue_date,
        expiry_date=expiry_date
    )

    db.add(certification)
    db.commit()
    db.refresh(certification)

    return {
        "message": "Certificate uploaded successfully",
        "cert_id": certification.cert_id
    }


@router.get("/profile/{employee_id}/certificates")
async def get_employee_certificates(employee_id: int, db: Session = Depends(get_db)):
    """Get all certificates for an employee."""
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )

    certificates = db.query(Certification).filter(
        Certification.employee_id == employee_id
    ).all()

    return certificates


@router.put("/profile/{employee_id}/change-password")
async def change_password(
    employee_id: int,
    password_data: PasswordChange,
    db: Session = Depends(get_db)
):
    """Change employee password."""
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )

    if not employee.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No password set"
        )

    # Verify current password
    if not verify_password(password_data.current_password, employee.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )

    # Set new password
    employee.hashed_password = get_password_hash(password_data.new_password)
    db.commit()

    return {"message": "Password changed successfully"}
