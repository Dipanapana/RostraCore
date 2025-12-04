# Flexible Constraint Management System Design

## Overview
Multi-level constraint configuration system to handle real-world organizational needs like sick leave, emergency coverage, and client-specific requirements.

## Design Principles

###  1. **Hierarchy of Overrides**
```
System Defaults (config.py)
    ↓
Organization Preferences (Company-wide)
    ↓
Client Overrides (Per-client requirements)
    ↓
Site Overrides (Location-specific)
    ↓
Employee Overrides (Individual restrictions/preferences)
```

### 2. **Constraint Enforcement Levels**

| Level | Behavior | Use Case |
|-------|----------|----------|
| **HARD** | Must be satisfied, blocks assignment | BCEA legal requirements, Safety critical |
| **SOFT** | Preferred but can be violated with penalty | Travel distance, shift preferences |
| **WARNING** | Violated but allowed, shows warning | PSIRA compliance (testing phase) |
| **DISABLED** | Constraint not enforced | Testing, emergency situations |

## Data Model

### **RosterPreferences**
Multi-level configuration table with scope-based precedence.

**Key Fields:**
- `scope`: ORGANIZATION | CLIENT | SITE | EMPLOYEE
- `org_id`: Always required (multi-tenancy)
- `client_id`, `site_id`, `employee_id`: Optional based on scope
- Per-constraint enforcement levels
- Per-constraint values (max_hours_week, min_rest_hours, etc.)

**Constraint Categories:**

#### A. Compliance Constraints
- ✅ `psira_compliance_level` - Already implemented as WARNING
- `skill_matching_level` - HARD (default)
- `availability_check_level` - HARD (default)
- `client_assignment_level` - HARD (default)

#### B. BCEA Labor Law Constraints
- `max_hours_week` + `level` - 48h (BCEA), can relax to 60h
- `min_rest_hours` + `level` - 8h (BCEA)
- `max_consecutive_days` + `level` - 6 days (BCEA)
- `max_consecutive_nights` + `level` - 3 nights (Safety)

#### C. Soft Preferences
- `fairness_weight` - How much to prioritize equal hour distribution (0.0-1.0)
- `max_distance_km` + `level` - Travel distance limit
- `prefer_client_experience` - Boolean flag
- `prefer_site_experience` - Boolean flag

#### D. Emergency Mode
- `allow_emergency_overrides` - Boolean
- `emergency_relaxed_constraints` - JSON array of constraints to relax

### **EmergencyShiftRequest**
Audit trail for urgent shift replacements.

**Workflow:**
1. Admin marks employee as unavailable (sick, emergency)
2. System creates EmergencyShiftRequest
3. System attempts to find replacement with relaxed constraints
4. Tracks which constraints were violated
5. Requires admin approval for assignment
6. Maintains audit trail

## Implementation Plan

### Phase 1: Database & Models ✅
- [x] Create `roster_preferences` table
- [x] Create `emergency_shift_requests` table
- [ ] Add relationship fields to Organization, Client, Site, Employee models
- [ ] Create Alembic migration

### Phase 2: Constraint Resolution Service
- [ ] Create `ConstraintResolver` service class
- [ ] Implement hierarchical preference lookup
- [ ] Implement constraint merging logic (Employee → Site → Client → Org → System)
- [ ] Cache resolved constraints per org/client/site/employee

### Phase 3: Algorithm Integration
- [ ] Update `ProductionRosterOptimizer._check_feasibility()` to use resolved constraints
- [ ] Update `ProductionRosterOptimizer._add_weekly_hours_constraints()` to use org-specific limits
- [ ] Update `ProductionRosterOptimizer._add_rest_period_constraints()` to use org-specific minimums
- [ ] Add constraint violation warnings to optimization results

### Phase 4: Emergency Mode
- [ ] Create `EmergencyShiftService` for urgent replacements
- [ ] Implement constraint relaxation for emergency mode
- [ ] Create API endpoint: `POST /api/v1/shifts/{shift_id}/emergency-replacement`
- [ ] Add notification system for emergency requests

### Phase 5: API Endpoints
```python
# Preferences Management
GET    /api/v1/roster-preferences                    # List all for org
GET    /api/v1/roster-preferences/{scope}/{id}       # Get specific (e.g., /client/123)
POST   /api/v1/roster-preferences                    # Create new
PUT    /api/v1/roster-preferences/{preference_id}    # Update
DELETE /api/v1/roster-preferences/{preference_id}    # Delete (revert to parent)

# Emergency Requests
POST   /api/v1/emergency-shifts                      # Create emergency request
GET    /api/v1/emergency-shifts                      # List pending requests
POST   /api/v1/emergency-shifts/{id}/resolve         # Mark as resolved
GET    /api/v1/emergency-shifts/audit                # Audit trail
```

### Phase 6: Frontend UI
#### Settings Page (`/settings/roster-constraints`)
```tsx
<ConstraintManager>
  <TabGroup>
    <Tab name="Organization">
      <ConstraintForm scope="organization" />
    </Tab>
    <Tab name="Clients">
      <ClientList onSelect={(client) => <ConstraintForm scope="client" clientId={client.id} />} />
    </Tab>
    <Tab name="Sites">
      <SiteList onSelect={(site) => <ConstraintForm scope="site" siteId={site.id} />} />
    </Tab>
    <Tab name="Employees">
      <EmployeeList onSelect={(emp) => <ConstraintForm scope="employee" employeeId={emp.id} />} />
    </Tab>
  </TabGroup>
</ConstraintManager>
```

#### Constraint Form Component
```tsx
interface ConstraintFormProps {
  constraint: string
  value: number
  level: "hard" | "soft" | "warning" | "disabled"
  defaultValue: number
  onChange: (value, level) => void
}

// Example: Max Weekly Hours
<ConstraintControl
  label="Maximum Weekly Hours"
  description="BCEA default: 48 hours"
  value={48}
  level="hard"
  options={[
    { value: 48, label: "48 hours (BCEA Compliant)" },
    { value: 54, label: "54 hours (Moderate)" },
    { value: 60, label: "60 hours (Relaxed)" },
  ]}
  levelOptions={["hard", "soft", "warning", "disabled"]}
/>
```

#### Emergency Shift Replacement
```tsx
<EmergencyReplacementModal shiftId={123}>
  <EmployeeSelector
    filter={employee => canWorkShift(employee, shift, "emergency")}
    highlightViolations={true}
  />
  <ConstraintViolationWarnings violations={["max_hours_week: 52/48"]} />
  <ReasonInput required placeholder="Sick leave - COVID" />
  <ConfirmButton requiresApproval={true} />
</EmergencyReplacementModal>
```

## Use Cases

### 1. **Sick Leave Replacement**
```
Scenario: Guard calls in sick 2 hours before shift
Steps:
1. Admin marks shift as "emergency_replacement_needed"
2. System finds available guards with emergency_mode=true
3. System relaxes: availability_check, min_rest_hours (6h instead of 8h)
4. Shows violations to admin: "⚠️ Rest period: 6h/8h"
5. Admin approves replacement
6. Audit trail records: "Emergency: Sick leave - violated min_rest"
```

### 2. **Client-Specific Requirements**
```
Scenario: Banking client requires Grade A only, stricter PSIRA
Steps:
1. Admin creates client-level preference
2. Sets: psira_compliance_level = HARD (vs WARNING for org)
3. Sets: min_grade = GRADE_A
4. Roster algorithm uses client override
5. Only Grade A guards with valid PSIRA assigned to this client
```

### 3. **Site-Specific Constraints**
```
Scenario: Remote mine site - guards willing to work 60h weeks
Steps:
1. Admin creates site-level preference
2. Sets: max_hours_week = 60, level = HARD
3. Sets: max_consecutive_days = 7 (vs org default 6)
4. Only affects this site
5. Other sites still use org default (48h, 6 days)
```

### 4. **Employee Restrictions**
```
Scenario: Guard has medical restriction - max 40h/week
Steps:
1. Admin creates employee-level preference
2. Sets: max_hours_week = 40, level = HARD
3. Overrides all parent settings
4. Roster algorithm never assigns more than 40h to this guard
```

## Algorithm Changes

### Constraint Resolution Pseudocode
```python
def get_effective_constraints(employee, shift):
    """Resolve constraints using hierarchical lookup"""

    # Start with system defaults
    constraints = SystemDefaults.copy()

    # Apply organization-level
    org_prefs = get_preferences(scope="organization", org_id=employee.org_id)
    if org_prefs:
        constraints.update(org_prefs)

    # Apply client-level (if shift has client)
    if shift.client_id:
        client_prefs = get_preferences(scope="client", client_id=shift.client_id)
        if client_prefs:
            constraints.update(client_prefs)

    # Apply site-level
    if shift.site_id:
        site_prefs = get_preferences(scope="site", site_id=shift.site_id)
        if site_prefs:
            constraints.update(site_prefs)

    # Apply employee-level (highest priority)
    emp_prefs = get_preferences(scope="employee", employee_id=employee.id)
    if emp_prefs:
        constraints.update(emp_prefs)

    return constraints
```

### Constraint Checking with Levels
```python
def check_constraint(value, limit, level):
    """Check constraint based on enforcement level"""

    if level == ConstraintLevel.DISABLED:
        return (True, [])  # Always pass

    violated = value > limit

    if level == ConstraintLevel.HARD:
        return (not violated, [] if not violated else [f"Hard violation: {value}/{limit}"])

    elif level == ConstraintLevel.SOFT:
        # Soft constraints add penalty to objective function
        penalty = max(0, value - limit) * SOFT_CONSTRAINT_WEIGHT
        return (True, [], penalty)

    elif level == ConstraintLevel.WARNING:
        warning = f"⚠️ {value}/{limit}" if violated else ""
        return (True, [warning] if warning else [])
```

## Benefits

1. **Flexibility**: Handle real-world exceptions without code changes
2. **Compliance**: Track when BCEA rules are relaxed and why
3. **Audit Trail**: Full history of emergency overrides
4. **Client Satisfaction**: Meet client-specific requirements
5. **Scalability**: Add new constraints without database migrations
6. **Multi-tenancy**: Each org can have different policies

## Future Enhancements

- **Time-based Rules**: Different constraints for day vs night shifts
- **Seasonal Overrides**: Relax constraints during busy season
- **Automated Approvals**: Auto-approve emergency replacements within parameters
- **Predictive Alerts**: Warn when upcoming week will violate constraints
- **Constraint Templates**: Pre-defined sets for different industries

## OptaPy Decision

**Recommendation: Stick with OR-Tools CP-SAT**

Reasons:
- Performance: OptaPy is 3-10x slower due to Python/Java interop
- Current Success: CP-SAT handles 500+ guards with partitioning
- Multi-tenancy: Better suited for concurrent solving
- Constraint Flexibility: Can achieve same flexibility with this design
- Cost/Benefit: Performance penalty not worth marginal modeling convenience
