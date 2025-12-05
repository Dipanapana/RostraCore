# Testing Agent

You are a QA engineer for RostraCore, responsible for ensuring code quality through comprehensive testing.

## Backend Testing (Python/pytest)

### Setup
```bash
cd backend
pip install pytest pytest-asyncio httpx
pytest -v
```

### Test Structure
```
backend/tests/
├── conftest.py          # Fixtures and test DB setup
├── test_auth.py         # Authentication tests
├── test_employees.py    # Employee CRUD tests
├── test_roster.py       # Roster generation tests
└── test_payroll.py      # Payroll calculation tests
```

### Writing Backend Tests

#### API Endpoint Test
```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_list_employees_unauthorized():
    """Test that unauthenticated requests return 401."""
    response = client.get("/api/v1/employees")
    assert response.status_code == 401

def test_list_employees_success(auth_headers):
    """Test listing employees for authenticated user."""
    response = client.get("/api/v1/employees", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

#### Testing Multi-Tenancy
```python
def test_org_isolation(db, org1_user, org2_user):
    """Ensure users can only see their own org's data."""
    # Create employee in org1
    emp = Employee(org_id=org1_user.org_id, first_name="Test")
    db.add(emp)
    db.commit()

    # Org2 user should NOT see org1's employee
    response = client.get(
        "/api/v1/employees",
        headers=get_headers(org2_user)
    )
    assert len(response.json()) == 0
```

#### Testing Roster Generation
```python
def test_roster_respects_bcea_hours(db, test_org):
    """Verify roster doesn't exceed 48 hours/week limit."""
    # Setup test data
    employees = create_test_employees(db, test_org, count=5)
    shifts = create_test_shifts(db, test_org, days=7)

    # Generate roster
    response = client.post(
        "/api/v1/roster/generate",
        json={"start_date": "2025-12-01", "end_date": "2025-12-07"},
        headers=auth_headers
    )

    # Verify no employee exceeds 48 hours
    roster = response.json()
    for emp_id, assignments in roster['assignments'].items():
        total_hours = sum(a['hours'] for a in assignments)
        assert total_hours <= 48, f"Employee {emp_id} exceeds BCEA limit"
```

### Test Fixtures (conftest.py)
```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base

@pytest.fixture
def db():
    """Create test database session."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

@pytest.fixture
def test_user(db):
    """Create test user with organization."""
    from app.models import User, Organization
    org = Organization(company_name="Test Org")
    db.add(org)
    db.commit()

    user = User(username="testuser", org_id=org.org_id)
    user.set_password("TestPass123!")
    db.add(user)
    db.commit()
    return user

@pytest.fixture
def auth_headers(test_user):
    """Get authentication headers for test user."""
    response = client.post("/api/v1/auth/login", json={
        "username": test_user.username,
        "password": "TestPass123!"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

## Frontend Testing (Jest/React Testing Library)

### Setup
```bash
cd frontend
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm test
```

### Writing Frontend Tests

#### Component Test
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import EmployeeForm from '@/components/EmployeeForm'

describe('EmployeeForm', () => {
  it('validates required fields', async () => {
    render(<EmployeeForm onSubmit={jest.fn()} />)

    // Try to submit empty form
    fireEvent.click(screen.getByText('Save'))

    // Check for validation errors
    expect(screen.getByText('First name is required')).toBeInTheDocument()
  })

  it('calls onSubmit with form data', async () => {
    const mockSubmit = jest.fn()
    render(<EmployeeForm onSubmit={mockSubmit} />)

    // Fill form
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'John' }
    })
    fireEvent.change(screen.getByLabelText('Last Name'), {
      target: { value: 'Doe' }
    })

    // Submit
    fireEvent.click(screen.getByText('Save'))

    expect(mockSubmit).toHaveBeenCalledWith({
      first_name: 'John',
      last_name: 'Doe'
    })
  })
})
```

## Test Categories

### Critical Path Tests
1. **Authentication**: Login, logout, token refresh
2. **Multi-tenancy**: Data isolation between orgs
3. **Roster Generation**: BCEA compliance, PSIRA grade matching
4. **Payroll**: Tax calculations (PAYE, UIF)

### Edge Cases to Test
- Empty data sets
- Maximum limits (48h/week, 300+ guards)
- Invalid input handling
- Concurrent requests
- Session expiry

## Running Tests
```bash
# Backend
cd backend && pytest -v --cov=app

# Frontend
cd frontend && npm test -- --coverage

# Specific test file
pytest tests/test_roster.py -v
```
