# Security Rostering Implementation Plan
## Multi-Guard Sites, Multi-Tenancy & Advanced Features

**Version:** 1.0
**Date:** November 2025
**Target:** Production-ready SaaS Platform

---

## Executive Summary

Transform RostraCore into a multi-tenant SaaS platform supporting realistic security industry requirements:
- **Multi-guard shifts** with supervisor requirements
- **PSIRA grade compliance** (A-E grades)
- **Multi-tenancy** for multiple security companies
- **Advanced user roles** and permissions
- **CSV/Excel import** for bulk operations

---

## 1. Security Industry Research Findings

### 1.1 PSIRA Security Grades (South Africa)

| Grade | Role | Responsibilities | Min Salary (2024) |
|-------|------|------------------|-------------------|
| **A** | Senior Management | Strategic oversight | R6,907/month |
| **B** | Supervisor/Team Leader | 5-8 guards supervision | R6,400/month |
| **C** | Security Officer | Patrol, emergency response | R5,726/month |
| **D** | Access Control | Gates, screening | R5,726/month |
| **E** | Basic Security | Static posts | R5,726/month |

**Key Requirements:**
- All guards must have valid PSIRA registration
- Grades A-C can work armed (with firearm competency)
- Grade B required for every 5-8 Grade C/D/E guards
- Grades expire annually and must be renewed

### 1.2 Site Staffing Models

#### Small Sites (1-2 guards)
- **Examples:** Small retail, office buildings, parking lots
- **Staffing:** Single guard per shift, no supervisor required
- **Typical Shifts:** 8-12 hour shifts
- **Grade:** E or D

#### Medium Sites (3-10 guards)
- **Examples:** Shopping malls, factories, warehouses
- **Staffing:** 3-5 guards per shift, 1 supervisor required
- **Supervisor Ratio:** 1:5 (1 supervisor per 5 guards)
- **Positions:** Control room (1), Patrol (2-3), Gate (1-2)
- **Typical Shifts:** 12 hour shifts (day/night rotation)
- **Grades:** 1x B (supervisor), rest C/D/E

#### Large Sites (10+ guards)
- **Examples:** Airports, industrial complexes, hospitals
- **Staffing:** 10-20 guards per shift, 2-3 supervisors
- **Supervisor Ratio:** 1:7-8 (multiple teams)
- **Positions:** Control room, multiple patrol teams, gates, response team
- **Typical Shifts:** 8-12 hour shifts with overlap
- **Grades:** Multiple B (supervisors), mix of C/D/E

### 1.3 Common Shift Configurations

**Standard Shift Types:**
- **8-hour shifts:** 06:00-14:00, 14:00-22:00, 22:00-06:00 (3 shifts/day)
- **12-hour shifts:** 06:00-18:00, 18:00-06:00 (2 shifts/day)
- **24-hour shifts:** Rare, only for remote/rural sites

**Multi-Guard Positions:**
- Control Room Operator (Grade C/D)
- Mobile Patrol (Grade C, armed if needed)
- Gate/Access Control (Grade D/E)
- Supervisor/Team Leader (Grade B)
- Armed Response (Grade C with firearm competency)

---

## 2. Database Schema Updates

### 2.1 Multi-Tenancy Foundation

```sql
-- Organizations (Tenants)
CREATE TABLE organizations (
    org_id SERIAL PRIMARY KEY,
    org_code VARCHAR(20) UNIQUE NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    psira_company_registration VARCHAR(50),
    subscription_tier VARCHAR(20) NOT NULL, -- starter, professional, business, enterprise
    subscription_status VARCHAR(20) NOT NULL, -- active, suspended, cancelled
    max_employees INTEGER,
    max_sites INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Add tenant_id to ALL existing tables
ALTER TABLE employees ADD COLUMN tenant_id INTEGER REFERENCES organizations(org_id);
ALTER TABLE sites ADD COLUMN tenant_id INTEGER REFERENCES organizations(org_id);
ALTER TABLE shifts ADD COLUMN tenant_id INTEGER REFERENCES organizations(org_id);
ALTER TABLE rosters ADD COLUMN tenant_id INTEGER REFERENCES organizations(org_id);
-- ... etc for all tables

-- Row-Level Security Policies
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employees
    USING (tenant_id = current_setting('app.current_tenant')::int);
```

### 2.2 Enhanced Employee Model

```sql
ALTER TABLE employees ADD COLUMN psira_grade VARCHAR(1) CHECK (psira_grade IN ('A', 'B', 'C', 'D', 'E'));
ALTER TABLE employees ADD COLUMN psira_number VARCHAR(20) UNIQUE;
ALTER TABLE employees ADD COLUMN psira_expiry_date DATE;
ALTER TABLE employees ADD COLUMN service_type VARCHAR(20) CHECK (service_type IN ('static', 'patrol', 'armed_response', 'control_room'));
ALTER TABLE employees ADD COLUMN is_armed BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN firearm_competency_number VARCHAR(50);
ALTER TABLE employees ADD COLUMN firearm_competency_expiry DATE;
ALTER TABLE employees ADD COLUMN is_supervisor BOOLEAN DEFAULT FALSE;
```

### 2.3 Multi-Guard Site Configuration

```sql
ALTER TABLE sites ADD COLUMN min_guards_per_shift INTEGER DEFAULT 1;
ALTER TABLE sites ADD COLUMN max_guards_per_shift INTEGER DEFAULT 1;
ALTER TABLE sites ADD COLUMN requires_supervisor BOOLEAN DEFAULT FALSE;
ALTER TABLE sites ADD COLUMN supervisor_ratio INTEGER DEFAULT 5; -- 1 supervisor per X guards
ALTER TABLE sites ADD COLUMN required_psira_grades VARCHAR(10)[]; -- ['B', 'C', 'D']
ALTER TABLE sites ADD COLUMN requires_armed BOOLEAN DEFAULT FALSE;
ALTER TABLE sites ADD COLUMN has_control_room BOOLEAN DEFAULT FALSE;
```

### 2.4 Shift Groups (Multi-Guard Shifts)

```sql
CREATE TABLE shift_groups (
    shift_group_id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES organizations(org_id),
    site_id INTEGER REFERENCES sites(site_id),
    group_name VARCHAR(100),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    required_guards INTEGER NOT NULL,
    required_supervisors INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE shifts ADD COLUMN shift_group_id INTEGER REFERENCES shift_groups(shift_group_id);
ALTER TABLE shifts ADD COLUMN position_type VARCHAR(50); -- 'control_room', 'patrol', 'gate', 'supervisor'
ALTER TABLE shifts ADD COLUMN required_psira_grade VARCHAR(1);
```

### 2.5 User Roles & Permissions

```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES organizations(org_id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL, -- super_admin, company_admin, site_manager, supervisor, guard
    employee_id INTEGER REFERENCES employees(employee_id), -- NULL for admins
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP
);

CREATE TABLE permissions (
    permission_id SERIAL PRIMARY KEY,
    role VARCHAR(20) NOT NULL,
    resource VARCHAR(50) NOT NULL, -- employees, sites, shifts, rosters, reports
    can_create BOOLEAN DEFAULT FALSE,
    can_read BOOLEAN DEFAULT FALSE,
    can_update BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE
);

-- Seed default permissions
INSERT INTO permissions (role, resource, can_create, can_read, can_update, can_delete) VALUES
('super_admin', '*', TRUE, TRUE, TRUE, TRUE),
('company_admin', 'employees', TRUE, TRUE, TRUE, TRUE),
('company_admin', 'sites', TRUE, TRUE, TRUE, TRUE),
('company_admin', 'shifts', TRUE, TRUE, TRUE, TRUE),
('site_manager', 'shifts', TRUE, TRUE, TRUE, FALSE),
('site_manager', 'rosters', FALSE, TRUE, FALSE, FALSE),
('supervisor', 'shifts', FALSE, TRUE, FALSE, FALSE),
('guard', 'shifts', FALSE, TRUE, FALSE, FALSE);
```

---

## 3. API Endpoints (New & Enhanced)

### 3.1 Multi-Tenancy

```
GET    /api/v1/organizations/current          - Get current tenant info
PUT    /api/v1/organizations/current          - Update tenant settings
GET    /api/v1/organizations/subscription     - Get subscription details
POST   /api/v1/organizations/upgrade          - Upgrade subscription tier
```

### 3.2 Multi-Guard Shift Groups

```
GET    /api/v1/shift-groups                   - List all shift groups
POST   /api/v1/shift-groups                   - Create shift group (with multiple positions)
GET    /api/v1/shift-groups/{id}              - Get shift group details
PUT    /api/v1/shift-groups/{id}              - Update shift group
DELETE /api/v1/shift-groups/{id}              - Delete shift group
POST   /api/v1/shift-groups/{id}/publish      - Publish to create individual shifts
```

**Create Shift Group Example:**
```json
{
  "site_id": 5,
  "group_name": "Mall Day Shift - Team A",
  "start_time": "2025-11-10T06:00:00",
  "end_time": "2025-11-10T18:00:00",
  "positions": [
    {
      "position_type": "supervisor",
      "required_psira_grade": "B",
      "count": 1
    },
    {
      "position_type": "control_room",
      "required_psira_grade": "C",
      "count": 1
    },
    {
      "position_type": "patrol",
      "required_psira_grade": "C",
      "required_armed": true,
      "count": 2
    },
    {
      "position_type": "gate",
      "required_psira_grade": "D",
      "count": 2
    }
  ]
}
```

### 3.3 Compliance Endpoints

```
GET    /api/v1/compliance/overview            - Dashboard summary
GET    /api/v1/compliance/psira-expiring      - Guards with expiring PSIRA
GET    /api/v1/compliance/supervisor-ratios   - Site supervisor compliance
GET    /api/v1/compliance/bcea-violations     - BCEA labor law violations
POST   /api/v1/compliance/audit               - Run compliance audit
```

### 3.4 Bulk Import/Export

```
POST   /api/v1/import/employees               - Upload CSV/Excel
POST   /api/v1/import/sites                   - Upload CSV/Excel
POST   /api/v1/import/shifts                  - Upload CSV/Excel
GET    /api/v1/import/template/{entity}       - Download CSV template

POST   /api/v1/export/employees               - Export employees to Excel
POST   /api/v1/export/rosters                 - Export roster to Excel
POST   /api/v1/export/payroll                 - Export payroll data
```

### 3.5 User Management

```
GET    /api/v1/users                          - List users in tenant
POST   /api/v1/users                          - Create user (with role)
PUT    /api/v1/users/{id}                     - Update user
DELETE /api/v1/users/{id}                     - Deactivate user
PUT    /api/v1/users/{id}/role                - Change user role
GET    /api/v1/users/me                       - Get current user info
GET    /api/v1/permissions                    - Get permission matrix
```

---

## 4. Optimizer Algorithm Updates

### 4.1 Multi-Guard Shift Constraints

```python
# New constraint: Supervisor ratio per site
def _add_supervisor_ratio_constraint(self):
    """Ensure 1 supervisor per X guards per shift"""
    for shift_group in self.shift_groups:
        supervisor_vars = []
        guard_vars = []

        for emp in self.employees:
            if emp.psira_grade == 'B' and emp.is_supervisor:
                supervisor_vars.append(...)
            elif emp.psira_grade in ['C', 'D', 'E']:
                guard_vars.append(...)

        # supervisor_count * ratio >= guard_count
        self.model.Add(
            sum(supervisor_vars) * shift_group.supervisor_ratio >= sum(guard_vars)
        )

# New constraint: PSIRA grade matching
def _add_psira_grade_constraint(self):
    """Ensure shifts get guards with correct PSIRA grade"""
    for shift in self.shifts:
        for emp in self.employees:
            if shift.required_psira_grade and emp.psira_grade != shift.required_psira_grade:
                # Don't create assignment variable for mismatched grades
                continue
```

---

## 5. Frontend UI Updates

### 5.1 Enhanced Site Creation Form

```typescript
// Add multi-guard configuration
interface SiteFormData {
  // ... existing fields
  staffing_config: {
    min_guards_per_shift: number;
    max_guards_per_shift: number;
    requires_supervisor: boolean;
    supervisor_ratio: number; // 1 supervisor per X guards
    required_psira_grades: string[]; // ['B', 'C', 'D']
    requires_armed: boolean;
    positions: {
      position_type: string;
      count: number;
      required_grade: string;
    }[];
  }
}
```

### 5.2 Shift Group Creation UI

```
┌─────────────────────────────────────────────────────┐
│ Create Shift Group                                  │
├─────────────────────────────────────────────────────┤
│ Site: [Select Site ▼] Sandton City Mall            │
│ Date: [2025-11-10] Time: [06:00] - [18:00]         │
│                                                     │
│ Positions Required:                                 │
│ ┌───────────────────────────────────────────────┐   │
│ │ ☑ Supervisor (Grade B)         Count: [1]    │   │
│ │ ☑ Control Room (Grade C)       Count: [1]    │   │
│ │ ☑ Mobile Patrol (Grade C) 🔫   Count: [2]    │   │
│ │ ☑ Gate Access (Grade D)        Count: [2]    │   │
│ └───────────────────────────────────────────────┘   │
│                                                     │
│ Total Guards: 6  |  Total Supervisors: 1           │
│ Ratio Check: ✓ 1:5 (Compliant)                     │
│                                                     │
│ [Cancel]              [Create Shift Group →]        │
└─────────────────────────────────────────────────────┘
```

### 5.3 Roster Table with Position Types

```
┌──────────────────────────────────────────────────────────────────────┐
│ Employee            │ Position       │ Grade │ Start     │ End       │
├──────────────────────────────────────────────────────────────────────┤
│ John Doe            │ Supervisor     │  B    │ Nov 5, 06 │ Nov 5, 18 │
│ Jane Smith          │ Control Room   │  C    │ Nov 5, 06 │ Nov 5, 18 │
│ Mike Johnson 🔫     │ Patrol         │  C    │ Nov 5, 06 │ Nov 5, 18 │
│ Sarah Williams 🔫   │ Patrol         │  C    │ Nov 5, 06 │ Nov 5, 18 │
│ Tom Brown           │ Gate           │  D    │ Nov 5, 06 │ Nov 5, 18 │
│ Lisa Davis          │ Gate           │  D    │ Nov 5, 06 │ Nov 5, 18 │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 6. CSV Import Templates

### 6.1 Employee Import Template

```csv
first_name,last_name,id_number,psira_number,psira_grade,psira_expiry,role,service_type,is_armed,hourly_rate,email,phone
John,Doe,8501015800088,PSR123456,B,2026-01-15,supervisor,patrol,true,75.50,john@example.com,0821234567
Jane,Smith,9002025800089,PSR123457,C,2025-12-20,security_officer,control_room,false,65.00,jane@example.com,0829876543
```

### 6.2 Site Import Template

```csv
client_name,address,gps_lat,gps_lng,min_guards,max_guards,requires_supervisor,supervisor_ratio,required_grades,requires_armed
Sandton City Mall,-26.1076,28.0567,5,8,true,5,"B,C,D",true
Menlyn Park Mall,-25.7847,28.2774,4,6,true,5,"B,C,D",false
```

---

## 7. Implementation Phases

### Phase 1: Multi-Tenancy Foundation (Week 1-2)
- [ ] Add organizations table and tenant_id to all tables
- [ ] Implement Row-Level Security (RLS) policies
- [ ] Create organization management endpoints
- [ ] Add user authentication with tenant context
- [ ] Test data isolation between tenants

### Phase 2: PSIRA Grades & Multi-Guard Sites (Week 3-4)
- [ ] Add PSIRA grade fields to employees
- [ ] Add multi-guard configuration to sites
- [ ] Create shift_groups table and endpoints
- [ ] Update site creation form with staffing config
- [ ] Add PSIRA expiry tracking

### Phase 3: Enhanced Optimizer (Week 5-6)
- [ ] Update optimizer for multi-guard shifts
- [ ] Add supervisor ratio constraints
- [ ] Add PSIRA grade matching constraints
- [ ] Add position type assignment logic
- [ ] Test with various site configurations

### Phase 4: User Roles & Permissions (Week 7-8)
- [ ] Create users and permissions tables
- [ ] Implement RBAC middleware
- [ ] Add user management UI
- [ ] Create permission matrix UI
- [ ] Test role-based access

### Phase 5: CSV Import/Export (Week 9-10)
- [ ] Create import templates
- [ ] Build CSV/Excel parser
- [ ] Add import validation logic
- [ ] Create import UI with progress tracking
- [ ] Add export functionality for all entities

### Phase 6: Compliance Dashboard (Week 11-12)
- [ ] Build compliance overview endpoint
- [ ] Create PSIRA expiry alerts
- [ ] Add supervisor ratio monitoring
- [ ] Build compliance dashboard UI
- [ ] Add automated compliance reports

### Phase 7: Testing & Polish (Week 13-14)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] UI/UX refinement
- [ ] Documentation

### Phase 8: Production Deployment (Week 15-16)
- [ ] Set up production infrastructure
- [ ] Configure SSL and domain
- [ ] Set up payment gateway (PayFast)
- [ ] Create onboarding flow
- [ ] Launch beta program

---

## 8. Success Metrics

**Technical:**
- Support 100+ tenants on single database
- < 2s roster generation for 100 guards, 500 shifts
- 99.9% uptime
- Zero data leakage between tenants

**Business:**
- 90% PSIRA compliance for all rosters
- 95% supervisor ratio compliance
- < 5% failed roster generations
- 80% user satisfaction score

---

## Next Steps

1. **Immediate:** Review and approve this plan
2. **Week 1:** Start Phase 1 (Multi-Tenancy Foundation)
3. **Week 3:** Demo multi-tenant setup to stakeholders
4. **Week 5:** Beta test with 2-3 security companies
5. **Week 8:** Launch MVP for first paying customers

---

**Document Owner:** Development Team
**Last Updated:** November 2025
**Status:** Ready for Implementation
