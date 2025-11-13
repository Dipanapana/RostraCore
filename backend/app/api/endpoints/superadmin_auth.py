"""Superadmin authentication endpoints - Platform admin login."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from app.database import get_db
from app.models.superadmin_user import SuperadminUser
import os

router = APIRouter()

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/superadmin/auth/login")


# Schemas
class SuperadminLogin(BaseModel):
    username: str
    password: str


class SuperadminToken(BaseModel):
    access_token: str
    token_type: str
    superadmin_id: int
    username: str
    full_name: str
    permissions: list
    is_super: bool


class SuperadminProfile(BaseModel):
    superadmin_id: int
    username: str
    email: str
    full_name: str
    permissions: list
    is_active: bool
    is_super: bool
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


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def authenticate_superadmin(db: Session, username: str, password: str) -> Optional[SuperadminUser]:
    """Authenticate superadmin by username and password."""
    superadmin = db.query(SuperadminUser).filter(
        SuperadminUser.username == username
    ).first()

    if not superadmin:
        return None

    if not verify_password(password, superadmin.hashed_password):
        return None

    return superadmin


async def get_current_superadmin(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> SuperadminUser:
    """Get current authenticated superadmin from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        superadmin_id: int = payload.get("sub")
        if superadmin_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    superadmin = db.query(SuperadminUser).filter(
        SuperadminUser.superadmin_id == int(superadmin_id)
    ).first()

    if superadmin is None:
        raise credentials_exception

    if not superadmin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin account is inactive"
        )

    return superadmin


# === AUTHENTICATION ENDPOINTS ===

@router.post("/login", response_model=SuperadminToken)
async def login_superadmin(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Superadmin login endpoint.

    Separate authentication from organization users.
    Returns JWT token for API access.
    """
    superadmin = authenticate_superadmin(db, form_data.username, form_data.password)

    if not superadmin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not superadmin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin account is inactive"
        )

    # Update last login
    superadmin.last_login = datetime.utcnow()
    db.commit()

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(superadmin.superadmin_id), "type": "superadmin"},
        expires_delta=access_token_expires
    )

    return SuperadminToken(
        access_token=access_token,
        token_type="bearer",
        superadmin_id=superadmin.superadmin_id,
        username=superadmin.username,
        full_name=superadmin.full_name,
        permissions=superadmin.permissions or [],
        is_super=superadmin.is_super
    )


@router.get("/me", response_model=SuperadminProfile)
async def get_superadmin_profile(
    current_superadmin: SuperadminUser = Depends(get_current_superadmin)
):
    """Get current superadmin profile."""
    return current_superadmin


@router.post("/logout")
async def logout_superadmin(
    current_superadmin: SuperadminUser = Depends(get_current_superadmin)
):
    """
    Logout superadmin.

    Token invalidation happens client-side by removing the token.
    """
    return {
        "message": "Logged out successfully",
        "username": current_superadmin.username
    }


@router.put("/change-password")
async def change_superadmin_password(
    current_password: str,
    new_password: str,
    current_superadmin: SuperadminUser = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """Change superadmin password."""

    # Verify current password
    if not verify_password(current_password, current_superadmin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Update password
    current_superadmin.hashed_password = get_password_hash(new_password)
    db.commit()

    return {
        "message": "Password changed successfully",
        "username": current_superadmin.username
    }
