# RostraCore Coding Standards Guide

Based on principles from "The Pragmatic Programmer" by Andrew Hunt and David Thomas.

---

## Core Principles

### 1. DRY - Don't Repeat Yourself

> "Every piece of knowledge must have a single, unambiguous, authoritative representation within a system."

**In RostraCore:**
- Reuse existing models and schemas instead of creating duplicates
- Use helper functions for repeated logic (e.g., `get_current_user`, `get_organization_filtered`)
- Database relationships should be defined once in models

```python
# Good: Reuse existing function
from app.auth.dependencies import get_current_user

# Bad: Duplicate authentication logic
def my_endpoint(request: Request):
    token = request.headers.get("Authorization")
    # ... duplicate validation logic
```

### 2. Orthogonality

> "Eliminate effects between unrelated things."

**In RostraCore:**
- Endpoints should do one thing well
- Services should not depend on each other unnecessarily
- Models should be self-contained

```python
# Good: Single responsibility
def calculate_shift_premium(shift: Shift) -> float:
    """Calculate premium for this shift only."""
    return shift.paid_hours * premium_rate

# Bad: Mixed responsibilities
def calculate_and_save_and_notify(shift, employee, db):
    # Does too many unrelated things
```

### 3. Reversibility

> "There are no final decisions."

**In RostraCore:**
- Use configuration files (`.env`) for settings that may change
- Database migrations allow schema evolution
- Abstract external dependencies

```python
# Good: Configurable
MAX_HOURS_WEEK = settings.MAX_HOURS_WEEK  # 48 by default, configurable

# Bad: Hardcoded
MAX_HOURS_WEEK = 48  # Can't change without code modification
```

---

## Python Standards (Backend)

### Naming Conventions

```python
# Classes: PascalCase
class ShiftAssignment:
    pass

# Functions and variables: snake_case
def calculate_overtime_pay():
    regular_hours = 0

# Constants: UPPER_SNAKE_CASE
MAX_HOURS_WEEK = 48
MIN_REST_HOURS = 8

# Private methods: _leading_underscore
def _validate_internal():
    pass
```

### Type Hints

Always use type hints for function signatures:

```python
# Good
def get_employee(db: Session, employee_id: int) -> Optional[Employee]:
    return db.query(Employee).filter(Employee.employee_id == employee_id).first()

# Bad
def get_employee(db, employee_id):
    return db.query(Employee).filter(Employee.employee_id == employee_id).first()
```

### Docstrings

Use docstrings for public functions and classes:

```python
def generate_roster(
    shifts: List[Shift],
    employees: List[Employee],
    config: RosterConfig
) -> RosterResult:
    """
    Generate optimal roster assignments using CP-SAT solver.

    Args:
        shifts: List of shifts to fill
        employees: Available employees
        config: Roster generation configuration

    Returns:
        RosterResult with assignments and optimization stats

    Raises:
        InfeasibleError: If no valid roster can be generated
    """
```

### Error Handling

```python
# Good: Specific exceptions with context
if not employee.is_available(shift):
    raise HTTPException(
        status_code=400,
        detail=f"Employee {employee.employee_id} not available for shift {shift.shift_id}"
    )

# Bad: Generic exceptions
if not employee.is_available(shift):
    raise Exception("Error")
```

---

## TypeScript Standards (Frontend)

### Component Structure

```typescript
// components/EmployeeCard.tsx

// 1. Imports
import { Employee } from '@/types/employee';
import { formatName } from '@/utils/format';

// 2. Types/Interfaces
interface EmployeeCardProps {
  employee: Employee;
  onSelect: (id: number) => void;
}

// 3. Component
export function EmployeeCard({ employee, onSelect }: EmployeeCardProps) {
  // 4. Hooks first
  const [isLoading, setIsLoading] = useState(false);

  // 5. Handlers
  const handleClick = () => {
    onSelect(employee.employee_id);
  };

  // 6. Render
  return (
    <div onClick={handleClick}>
      {formatName(employee)}
    </div>
  );
}
```

### API Calls

Use the centralized API service:

```typescript
// Good: Use api service
import api from '@/services/api';

const employees = await api.get('/employees/');

// Bad: Direct fetch
const response = await fetch('http://localhost:8000/api/v1/employees/', {
  headers: { Authorization: `Bearer ${token}` }
});
```

---

## Database Conventions

### Model Naming

```python
# Table names: plural, snake_case
__tablename__ = "shift_assignments"

# Primary keys: singular_id
shift_id = Column(Integer, primary_key=True)

# Foreign keys: referenced_table_id
employee_id = Column(Integer, ForeignKey("employees.employee_id"))
```

### Relationships

```python
# Always define both sides of relationship
class Shift(Base):
    site_id = Column(Integer, ForeignKey("sites.site_id"))
    site = relationship("Site", back_populates="shifts")

class Site(Base):
    shifts = relationship("Shift", back_populates="site")
```

### Migrations

- Always use Alembic for schema changes
- Never modify database directly in production
- Descriptive migration names

```bash
# Good
alembic revision -m "add_assigned_client_id_to_employees"

# Bad
alembic revision -m "update"
```

---

## Security Standards

### Input Validation

Always validate input at API boundaries:

```python
# Good: Pydantic validation
class EmployeeCreate(BaseModel):
    email: EmailStr
    psira_number: str = Field(min_length=7, max_length=10)
    hourly_rate: float = Field(ge=0, le=1000)

# Bad: Trust input
def create_employee(email: str, rate: float):
    # No validation
```

### Authentication

- Use JWT tokens with expiration
- Store sensitive data in httpOnly cookies
- Validate org_id on every request

```python
# Always filter by org_id
employees = db.query(Employee).filter(
    Employee.org_id == current_user.org_id
).all()
```

---

## Code Review Checklist

Before submitting code:

- [ ] No hardcoded secrets or credentials
- [ ] Type hints on all function signatures
- [ ] Error messages are helpful but not revealing
- [ ] Database queries are filtered by org_id
- [ ] New endpoints have authentication
- [ ] Migrations are reversible where possible
- [ ] No console.log or print statements in production code
- [ ] Tests pass locally

---

## Pragmatic Tips Applied

| Tip | Application in RostraCore |
|-----|---------------------------|
| "Care about your craft" | Clean, readable code > clever code |
| "Think! About your work" | Question requirements before implementing |
| "Provide options, don't make excuses" | Return multiple approaches when blocked |
| "Don't live with broken windows" | Fix linting errors immediately |
| "Be a catalyst for change" | Propose improvements in PR reviews |
| "Remember the big picture" | Consider multi-tenant impact |
| "Make quality a requirements issue" | Discuss testing expectations upfront |
| "Invest regularly in your knowledge portfolio" | Keep dependencies updated |
| "Critically analyze what you read" | Verify library security before use |
| "It's both what you say and how you say it" | Clear commit messages and docs |

---

## File Organization

```
backend/
├── app/
│   ├── api/
│   │   └── endpoints/      # One file per resource
│   ├── models/             # SQLAlchemy models
│   ├── services/           # Business logic
│   ├── algorithms/         # Complex computations
│   └── auth/               # Authentication
├── migrations/             # Alembic migrations
└── tests/                  # Test files mirror app structure

frontend/
├── src/
│   ├── app/                # Next.js pages
│   ├── components/         # Reusable components
│   ├── services/           # API calls
│   ├── context/            # React context
│   └── utils/              # Helper functions
└── public/                 # Static assets
```

---

## Getting Help

- Check existing code for patterns
- Consult the deployment guide for setup
- Review recent commits for style
- Ask questions in PR comments
