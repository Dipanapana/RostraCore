# Multi-Tenancy Migration Setup Guide

## Overview

This document guides you through applying the multi-tenancy and multi-guard shift migrations to your RostraCore database.

## What's Included

### New Database Tables
- **organizations**: Tenant management with subscription tiers and usage limits
- **shift_groups**: Multi-guard shift orchestration

### Modified Tables
The following tables now include a `tenant_id` column:
- employees
- sites
- shifts
- rosters
- shift_assignments
- availability
- certifications
- skills_matrix
- expenses
- attendance
- payroll

### New API Endpoints

**Organizations API** (`/api/v1/organizations/`)
- `POST /` - Create organization
- `GET /current` - Get current organization
- `PUT /current` - Update current organization
- `GET /current/usage` - Get usage statistics
- `GET /` - List all organizations (Super Admin)
- `GET /{org_id}` - Get organization by ID

**Shift Groups API** (`/api/v1/shift-groups/`)
- `POST /` - Create shift group
- `GET /` - List shift groups (with filters)
- `GET /stats` - Get shift group statistics
- `GET /{id}` - Get shift group by ID
- `PUT /{id}` - Update shift group
- `POST /{id}/publish` - Publish shift group (create positions)
- `DELETE /{id}` - Delete shift group

## Prerequisites

1. PostgreSQL 14+ installed and running
2. Existing `rostracore_db` database
3. Database credentials

## Step 1: Configure Database Connection

The system needs the correct PostgreSQL connection string. Currently in `.env`:

```
DATABASE_URL=postgresql://postgres@localhost:5432/rostracore_db
```

**Action Required**: Update the `.env` file with your PostgreSQL password:

```bash
# Open backend/.env and update:
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/rostracore_db
```

Replace `YOUR_PASSWORD` with your PostgreSQL password.

## Step 2: Verify Migration Files

Four migration files have been created in `backend/migrations/versions/`:

1. **add_multi_tenancy_foundation.py**
   - Creates `organizations` table
   - Adds `tenant_id` to all tables
   - Creates default organization
   - Backfills existing data

2. **add_psira_grades_to_employees.py**
   - Adds PSIRA grade fields (A-E)
   - Adds service_type and firearm competency
   - Adds is_supervisor flag

3. **add_multi_guard_site_config.py**
   - Adds min/max guards configuration
   - Adds supervisor ratio settings
   - Adds required PSIRA grades array

4. **add_shift_groups.py**
   - Creates `shift_groups` table
   - Adds shift_group_id to shifts
   - Adds position_type to shifts

## Step 3: Apply Migrations

Once you've updated the database connection string in `.env`:

```bash
cd backend
alembic upgrade head
```

Expected output:
```
INFO  [alembic.runtime.migration] Running upgrade 110e433d0604 -> add_multi_tenancy
INFO  [alembic.runtime.migration] Running upgrade add_multi_tenancy -> add_psira_grades
INFO  [alembic.runtime.migration] Running upgrade add_psira_grades -> add_multi_guard_config
INFO  [alembic.runtime.migration] Running upgrade add_multi_guard_config -> add_shift_groups
```

## Step 4: Verify Migration

Check that the migrations applied successfully:

```bash
# Check organizations table
psql -U postgres -d rostracore_db -c "SELECT * FROM organizations;"

# Check tenant_id column added
psql -U postgres -d rostracore_db -c "\d employees"

# Check shift_groups table
psql -U postgres -d rostracore_db -c "\d shift_groups"
```

## Step 5: Test API Endpoints

Start the backend server:

```bash
cd backend
python -m app.main
```

Visit the API docs at `http://localhost:8000/docs` and test:

1. **GET /api/v1/organizations/current** - Should return default organization
2. **GET /api/v1/organizations/current/usage** - Should show current usage stats
3. **POST /api/v1/shift-groups/** - Create a test shift group
4. **GET /api/v1/shift-groups/** - List shift groups

## Rollback Instructions

If you need to rollback the migrations:

```bash
cd backend
alembic downgrade add_multi_tenancy  # Rollback all 4 migrations
```

Or rollback one at a time:
```bash
alembic downgrade -1  # Rollback one migration
```

## Default Organization

The migration automatically creates a default organization:
- **org_code**: DEFAULT
- **company_name**: Default Organization
- **subscription_tier**: enterprise (unlimited)
- **subscription_status**: active

All existing data is automatically assigned to this organization.

## Subscription Tiers

| Tier | Max Employees | Max Sites | Max Shifts/Month |
|------|---------------|-----------|------------------|
| Starter | 30 | 5 | 500 |
| Professional | 100 | 15 | 2,000 |
| Business | 250 | 50 | 5,000 |
| Enterprise | Unlimited | Unlimited | Unlimited |

## Multi-Guard Shift Workflow

### Creating Multi-Guard Shifts

1. **Create a Shift Group** (DRAFT status):
```json
POST /api/v1/shift-groups/
{
  "site_id": 1,
  "group_name": "Mall Day Shift",
  "start_time": "2025-11-06T08:00:00",
  "end_time": "2025-11-06T20:00:00",
  "required_guards": 6,
  "required_supervisors": 1
}
```

2. **Publish the Shift Group**:
```json
POST /api/v1/shift-groups/{id}/publish
{
  "create_positions": true
}
```

This automatically creates:
- 1 supervisor shift
- 6 guard shifts

All with the same time slot at the same site.

3. **Generate Roster**: Run roster generation as usual. The optimizer will assign employees to each position.

## Troubleshooting

### Issue: "password authentication failed"
- Check your PostgreSQL password in `.env`
- Try connecting with psql: `psql -U postgres -d rostracore_db`

### Issue: "near '(': syntax error"
- This means SQLite is being used instead of PostgreSQL
- Verify `DATABASE_URL` in `.env` starts with `postgresql://`

### Issue: "Organizations table already exists"
- Migrations may have been partially applied
- Check migration status: `alembic current`
- If needed, stamp the database: `alembic stamp head`

### Issue: "ModuleNotFoundError: No module named 'app.models.organization'"
- Restart the backend server to reload models
- Verify `backend/app/models/__init__.py` exports Organization and ShiftGroup

## Next Steps

After successful migration:

1. **Phase 2**: Update roster optimizer for multi-guard shifts
2. **Phase 3**: Build shift group UI
3. **Phase 4**: Implement user roles and RBAC
4. **Phase 5**: Add CSV/Excel import functionality
5. **Phase 6**: Build compliance monitoring

See `SECURITY_ROSTERING_IMPLEMENTATION_PLAN.md` for the complete roadmap.

## Support

If you encounter issues:
1. Check the migration logs in the terminal
2. Verify database connection with psql
3. Review the migration files in `backend/migrations/versions/`
4. Check that all models are properly imported in `backend/migrations/env.py`
