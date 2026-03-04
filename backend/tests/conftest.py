"""Shared fixtures for integration tests."""

import pytest
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base, get_db, engine, SessionLocal
from app.main import app
from app.models.user import User, UserRole
from app.models.organization import Organization
from app.auth.security import get_password_hash, create_access_token


@pytest.fixture
def db_session():
    """Get a DB session."""
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def client():
    """FastAPI TestClient using the real DB (endpoints use their own sessions)."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def ensure_test_user():
    """Ensure a test user exists in the DB (created once per test session)."""
    session = SessionLocal()
    try:
        # Ensure org exists
        org = session.query(Organization).filter(Organization.org_code == "CITEST01").first()
        if not org:
            org = Organization(
                company_name="CI Test Security Co",
                org_code="CITEST01",
            )
            session.add(org)
            session.flush()

        user = session.query(User).filter(User.username == "ci_testadmin").first()
        if not user:
            user = User(
                username="ci_testadmin",
                email="ci_testadmin@test.com",
                hashed_password=get_password_hash("TestPass123!"),
                role=UserRole.COMPANY_ADMIN,
                org_id=org.org_id,
                is_active=True,
                is_owner=True,
                is_email_verified=True,
            )
            session.add(user)
        else:
            # Always reset password, email verification, and lockout state
            user.hashed_password = get_password_hash("TestPass123!")
            user.is_email_verified = True
            user.failed_login_attempts = 0
            user.account_locked_until = None
            user.last_failed_login = None
        session.commit()
        return user
    finally:
        session.close()


@pytest.fixture(scope="session")
def ensure_guard_user(ensure_test_user):
    """Ensure a test guard user exists."""
    session = SessionLocal()
    try:
        org = session.query(Organization).filter(Organization.org_code == "CITEST01").first()
        user = session.query(User).filter(User.username == "ci_testguard").first()
        if not user:
            user = User(
                username="ci_testguard",
                email="ci_testguard@test.com",
                hashed_password=get_password_hash("GuardPass123!"),
                role=UserRole.GUARD,
                org_id=org.org_id,
                is_active=True,
                is_email_verified=True,
            )
            session.add(user)
        else:
            user.hashed_password = get_password_hash("GuardPass123!")
            user.is_email_verified = True
            user.failed_login_attempts = 0
            user.account_locked_until = None
        session.commit()
        return user
    finally:
        session.close()


@pytest.fixture
def test_user(ensure_test_user):
    """Return the test user (refreshed from DB, with lockout reset)."""
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.username == "ci_testadmin").first()
        # Reset any account lockout from previous test runs
        if user and (user.failed_login_attempts > 0 or user.account_locked_until):
            user.failed_login_attempts = 0
            user.account_locked_until = None
            user.last_failed_login = None
            session.commit()
            session.refresh(user)
        yield user
    finally:
        session.close()


@pytest.fixture
def test_org(ensure_test_user):
    """Return the test organization."""
    session = SessionLocal()
    try:
        org = session.query(Organization).filter(Organization.org_code == "CITEST01").first()
        yield org
    finally:
        session.close()


@pytest.fixture
def auth_headers(ensure_test_user):
    """Get auth headers for the test admin user."""
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.username == "ci_testadmin").first()
        token = create_access_token(
            data={"sub": str(user.user_id), "username": user.username, "role": user.role.value}
        )
        return {"Authorization": f"Bearer {token}"}
    finally:
        session.close()


@pytest.fixture
def guard_auth_headers(ensure_guard_user):
    """Get auth headers for the test guard user."""
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.username == "ci_testguard").first()
        token = create_access_token(
            data={"sub": str(user.user_id), "username": user.username, "role": user.role.value}
        )
        return {"Authorization": f"Bearer {token}"}
    finally:
        session.close()
