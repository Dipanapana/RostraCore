# Multi-Tenancy Migration Guide

**Date:** November 14, 2025
**Status:** ✅ **CODE READY - MIGRATION PENDING**

---

## 🎯 What Changed

Employees now have **multi-tenancy support**:

1. ✅ **`org_id`** - Every employee belongs to an organization (required)
2. ✅ **`assigned_client_id`** - Employees can be assigned to a specific client (optional)

### Data Model:

```
Organization (Security Company)
    ↓ has many
  ┌─────────────┬──────────────┐
  │             │              │
Users       Employees      Clients
            (guards)       (municipalities)
                ↓              ↓
              Shifts  ←────  Sites
```

### Key Relationships:

- **Organization → Employees**: One-to-many (employees belong to one org)
- **Organization → Clients**: One-to-many (clients belong to one org)
- **Client → Employees**: One-to-many (employees can be assigned to one primary client)
- **Employees → Shifts**: One-to-many (guards work many shifts)

---

## 📋 Files Modified

### Models Updated:
1. ✅ `backend/app/models/employee.py`
   - Added `org_id` (required, ForeignKey to organizations)
   - Added `assigned_client_id` (optional, ForeignKey to clients)
   - Added `organization` relationship
   - Added `assigned_client` relationship

2. ✅ `backend/app/models/organization.py`
   - Added `employees` relationship

### Migration Created:
3. ✅ `backend/migrations/versions/905700cf27c2_add_org_id_and_client_id_to_employees.py`
   - Adds `org_id` column (with default value 1 for existing employees)
   - Adds `assigned_client_id` column (nullable)
   - Creates foreign keys and indexes

### Scripts Updated:
4. ✅ `backend/add_test_employees.py`
   - Now requires org_id for all employees
   - Can assign employees to specific clients
   - Shows multi-tenancy information

---

## ⚙️ Migration Steps (Windows)

### Step 1: Backup Your Database

**IMPORTANT:** Always backup before running migrations!

```bash
# Windows PostgreSQL backup
"C:\Program Files\PostgreSQL\14\bin\pg_dump.exe" -U postgres -d rostracore_db > backup_before_multiten ancy.sql
```

### Step 2: Check Current Migration State

```bash
cd backend
alembic current
```

Expected output: Shows current migration version

### Step 3: Run the Migration

```bash
cd backend
alembic upgrade head
```

**Expected output:**
```
INFO  [alembic.runtime.migration] Running upgrade 79ce11b0e76c -> 905700cf27c2, add_org_id_and_client_id_to_employees
```

**What this does:**
1. Adds `org_id` column to `employees` table (nullable first)
2. Sets `org_id = 1` for all existing employees (assigns to first organization)
3. Makes `org_id` non-nullable
4. Adds `assigned_client_id` column (nullable)
5. Creates foreign keys and indexes

### Step 4: Verify Migration

```bash
cd backend
python -c "
from app.database import SessionLocal
from app.models.employee import Employee
from sqlalchemy import inspect

db = SessionLocal()
inspector = inspect(db.get_bind())
columns = inspector.get_columns('employees')

print('Employees table columns:')
for col in columns:
    if col['name'] in ['org_id', 'assigned_client_id']:
        print(f'  ✓ {col[\"name\"]}: {col[\"type\"]} (nullable={col[\"nullable\"]})')

db.close()
"
```

**Expected output:**
```
Employees table columns:
  ✓ org_id: INTEGER (nullable=False)
  ✓ assigned_client_id: INTEGER (nullable=True)
```

### Step 5: Add Test Employees

```bash
cd backend
python add_test_employees.py
```

This will:
- Create 5 security guards for your organization
- Assign 3 to a specific client (if clients exist)
- Leave 2 available for any client

---

## 🔍 Verifying Multi-Tenancy Works

### Check Employees Have Organization:

```bash
cd backend
python -c "
from app.database import SessionLocal
from app.models.employee import Employee

db = SessionLocal()

employees = db.query(Employee).all()
print(f'Total employees: {len(employees)}')

for emp in employees[:5]:
    client_name = emp.assigned_client.client_name if emp.assigned_client_id else 'Any client'
    print(f'  - {emp.first_name} {emp.last_name}')
    print(f'    Org: {emp.organization.company_name} (ID: {emp.org_id})')
    print(f'    Assigned to: {client_name}')
    print()

db.close()
"
```

### Check Dashboard Counts by Organization:

```bash
cd backend
python -c "
from app.database import SessionLocal
from app.models.employee import Employee
from app.models.organization import Organization

db = SessionLocal()

orgs = db.query(Organization).all()
for org in orgs:
    emp_count = db.query(Employee).filter(Employee.org_id == org.org_id).count()
    print(f'{org.company_name}: {emp_count} employees')

db.close()
"
```

---

## 🚨 Rollback (If Needed)

If something goes wrong, you can rollback:

```bash
cd backend
alembic downgrade -1
```

This will:
- Remove `assigned_client_id` column
- Remove `org_id` column
- Drop foreign keys and indexes

**Then restore from backup:**
```bash
# Stop backend first!
"C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -d rostracore_db < backup_before_multitenancy.sql
```

---

## 📊 Impact on Existing Code

### ⚠️ Breaking Changes:

**Creating employees now REQUIRES `org_id`:**

```python
# OLD (will fail after migration)
employee = Employee(
    first_name="John",
    last_name="Doe",
    # ... other fields
)

# NEW (required)
employee = Employee(
    org_id=current_user.org_id,  # REQUIRED!
    assigned_client_id=client_id,  # Optional
    first_name="John",
    last_name="Doe",
    # ... other fields
)
```

### ✅ Queries Should Filter by Organization:

```python
# Get employees for current user's organization
employees = db.query(Employee).filter(
    Employee.org_id == current_user.org_id
).all()

# Get employees assigned to a specific client
client_employees = db.query(Employee).filter(
    Employee.assigned_client_id == client_id
).all()
```

---

## 🔧 Next Steps

After running the migration, you should:

1. ✅ Update dashboard queries to filter by `org_id`
2. ✅ Update employee creation forms to include organization selection
3. ✅ Update employee endpoints to filter by user's organization
4. ✅ Add UI to assign/unassign employees to clients
5. ✅ Test roster generation with multi-tenancy

---

## 💡 Business Rules

### Organization Assignment:
- **Every employee MUST belong to one organization**
- When creating employees, use the current user's `org_id`
- Employees can only be managed by users in the same organization

### Client Assignment:
- **Optional:** Employees can be assigned to a primary client
- Employees with `assigned_client_id = NULL` are available for ANY client
- Employees with a specific `assigned_client_id` work primarily for that client
- This doesn't prevent them from being assigned to other clients' shifts

### Use Cases:

**Example 1: Dedicated Guards**
- Guard A is assigned to "City Hall" (assigned_client_id = 5)
- Primarily works City Hall shifts
- Can still cover shifts at other sites if needed

**Example 2: Flex Pool**
- Guard B has no client assignment (assigned_client_id = NULL)
- Available for any client's shifts
- Can be assigned anywhere

---

## 📝 Testing Checklist

- [ ] Run migration successfully
- [ ] Verify columns were added
- [ ] Add test employees
- [ ] Check employees have `org_id`
- [ ] Check client assignments work
- [ ] Dashboard shows correct employee count
- [ ] Employee management page filters by org
- [ ] Roster generation respects organization boundaries
- [ ] Backup and rollback procedure works

---

## ✅ Summary

**What this migration enables:**

✅ **Multi-Tenant SaaS**: Each security company has their own employee pool
✅ **Client Assignment**: Guards can be dedicated to specific clients
✅ **Data Isolation**: Organizations only see their own employees
✅ **Flexible Workforce**: Mix of dedicated and flex pool guards

**Safe to run:** Yes, existing employees will be assigned to organization ID 1

**Reversible:** Yes, can rollback if needed

---

**Ready to migrate? Run the commands in Step 2-5 above!** 🚀
