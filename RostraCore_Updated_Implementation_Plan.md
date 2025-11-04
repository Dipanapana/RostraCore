# RostraCore - Updated Implementation Plan

**Last Updated:** November 2025
**Current Status:** 65-70% Complete (MVP Functional)
**Priority:** Fix Critical Issues → Complete Core Features → Add Advanced Features

---

## Executive Summary

RostraCore has successfully implemented:
- ✅ Core roster generation (Hungarian + MILP algorithms)
- ✅ Full CRUD APIs for all entities
- ✅ Professional frontend dashboard with analytics
- ✅ Basic BCEA compliance (48h weekly, 8h rest)
- ✅ Authentication and authorization
- ✅ Export functionality (PDF, Excel, CSV)

**Current Critical Issue**: Roster generation showing "cost matrix is infeasible" error - needs immediate debugging and fixing.

**Missing Critical Features**:
- Automated PSIRA/BCEA compliance tracking
- Calendar visualization
- Emergency re-optimization
- Mobile app backend

---

## Current Project State Summary

### ✅ Fully Implemented (Production Ready)
1. Database models: Employee, Site, Shift, Certification, Availability, Attendance, Payroll
2. REST API: Full CRUD for all entities + specialized endpoints
3. Roster generation algorithms: Hungarian (scipy) + MILP (OR-Tools CP-SAT)
4. Frontend: Dashboard, employee/site/shift management, roster generation UI
5. Authentication: JWT-based auth with password hashing
6. Export: PDF, Excel, CSV generation
7. Basic constraints: Skills, certifications, distance, weekly hours, rest periods

### ⚠️ Partially Implemented
1. Compliance system: Basic cert storage but no automated checking
2. Fairness: Basic MILP fairness but no night/weekend distribution
3. Payroll: Summaries tracked but no specialized export formats

### ❌ Not Implemented
1. Automated PSIRA/BCEA violation tracking
2. Roster/ShiftAssignment models (using simplified direct assignment)
3. Emergency re-optimization for sick calls
4. Shift swap workflow
5. Calendar view in frontend
6. Mobile app backend
7. Client portal
8. ML features (forecasting, fatigue scoring)

---

## Priority 1: Fix Critical Roster Generation Issue (URGENT - 1-2 days)

### Issue Description
Roster generation failing with "cost matrix is infeasible" error despite having:
- 31 active employees
- 8 unassigned shifts
- Valid certifications (not expired)
- Proper skill matching setup

### Root Cause Analysis Needed
Debug logging has been added to:
- `backend/app/api/endpoints/roster.py` - Algorithm selection
- `backend/app/algorithms/milp_roster_generator.py` - Feasibility checking

### Tasks
- [ ] 1.1: Run roster generation and capture debug output
- [ ] 1.2: Analyze feasibility matrix constraint violations
- [ ] 1.3: Identify which constraints are causing 0% feasibility
- [ ] 1.4: Fix constraint logic (likely certification matching or availability checking)
- [ ] 1.5: Verify MILP algorithm is actually running (not Hungarian)
- [ ] 1.6: Test with relaxed constraints if needed
- [ ] 1.7: Update sample data if certifications/availability are missing

### Expected Debug Output
```
[ROSTER DEBUG] ROSTER_ALGORITHM from settings: milp
[MILP DEBUG] Found 8 unassigned shifts and 31 active employees
[MILP DEBUG] Feasibility: 0/248 pairs are feasible (0.0%)
[MILP DEBUG] NO FEASIBLE PAIRS - Checking reasons:
[MILP DEBUG]   - invalid_certification: 248 violations
```

### Success Criteria
- ✅ Roster generation completes successfully
- ✅ At least 70% of shifts assigned
- ✅ All BCEA constraints satisfied (48h, 8h rest)
- ✅ Debug output shows feasible pairs

---

## Priority 2: Complete Core Features (2-4 weeks)

### 2.1: Implement Roster & ShiftAssignment Models (3 days)

**Why**: Current system uses direct `shift.assigned_employee_id`. Need proper Roster entity for:
- Tracking optimization metadata (solver status, costs, duration)
- Managing roster lifecycle (draft → optimizing → optimized → published)
- Supporting multiple roster versions
- Proper audit trail

**Tasks**:
- [ ] Create `Roster` model with fields:
  - `roster_id`, `roster_code`, `start_date`, `end_date`
  - `status` (draft, optimizing, optimized, published, active, completed)
  - `optimization_started_at`, `optimization_completed_at`, `optimization_duration_seconds`
  - `total_shifts`, `assigned_shifts`, `unassigned_shifts`
  - `total_cost`, `regular_pay_cost`, `overtime_cost`, `premium_cost`
  - `bcea_compliant`, `psira_compliant`, `compliance_issues` (JSON)
  - `solver_status`, `solver_objective_value`, `solver_log`
  - `created_by`, `published_by`, `published_at`

- [ ] Create `ShiftAssignment` model with fields:
  - `assignment_id`, `shift_id`, `employee_id`, `roster_id`
  - `assigned_at`, `assigned_by`
  - `regular_hours`, `overtime_hours`, `regular_pay`, `overtime_pay`
  - `night_premium`, `weekend_premium`, `travel_reimbursement`, `total_cost`
  - `is_confirmed`, `confirmation_datetime`
  - `checked_in`, `check_in_time`, `checked_out`, `check_out_time`

- [ ] Update `Shift` model:
  - Keep `assigned_employee_id` for quick lookups
  - Add relationship to ShiftAssignment
  - Add `roster_id` foreign key

- [ ] Create Alembic migration
- [ ] Update roster generation endpoints to use new models
- [ ] Update frontend to handle roster entities

**Success Criteria**:
- ✅ Can create rosters in database
- ✅ ShiftAssignment tracks all cost breakdown
- ✅ Roster stores optimization metadata
- ✅ Backward compatible with existing shifts

---

### 2.2: Add Missing BCEA Constraints (2 days)

**Current State**: Basic constraints (48h, 8h rest) enforced in optimizer but:
- ❌ No meal break validation (BCEA requires break after 5h)
- ❌ No consecutive days limit (max 6 days)
- ❌ No meal break duration tracking

**Tasks**:
- [ ] Update `Shift` model to add:
  - `includes_meal_break` (Boolean)
  - `meal_break_duration_minutes` (Integer, default 60)

- [ ] Update MILP optimizer `_add_meal_break_constraints()`:
  ```python
  def _add_meal_break_constraints(self):
      """Ensure shifts >5 hours include meal breaks."""
      for shift in self.shifts:
          if shift.duration_hours > 5 and not shift.includes_meal_break:
              # Mark as requiring meal break
              # Could also adjust paid hours: paid = duration - 1
              pass
  ```

- [ ] Update Hungarian/MILP `_add_consecutive_days_limit()`:
  ```python
  def _add_consecutive_days_limit(self):
      """Prevent guards from working >6 consecutive days."""
      MAX_CONSECUTIVE = 6
      # Group shifts by date
      # For each employee, check 7-day windows
      # Add constraint: sum(works_on_day) <= 6 for any 7-day window
  ```

- [ ] Add validation in shift creation API:
  ```python
  if shift.duration_hours > 5:
      if not shift.includes_meal_break:
          raise HTTPException(400, "Shifts >5h require meal break")
  ```

**Success Criteria**:
- ✅ Shifts >5h must declare meal break
- ✅ Optimizer enforces max 6 consecutive days
- ✅ Meal break time excluded from paid hours

---

### 2.3: Add Fairness Balancing (2 days)

**Current State**: MILP has basic fairness (minimize max hours) but doesn't balance:
- Night shifts
- Weekend shifts
- Unpopular shifts

**Tasks**:
- [ ] Enhance MILP `_add_fairness_constraints()`:
  ```python
  def _add_fairness_constraints(self):
      """Balance workload fairly across guards."""

      # 1. Balance night shifts
      night_shifts = [s for s in self.shifts if s.shift_type == "night"]
      if night_shifts:
          # Create variables: nights_per_employee[emp_id]
          # Add constraint: max_nights - min_nights <= 2
          # Or add to objective: minimize(max_nights - min_nights)

      # 2. Balance weekend shifts
      weekend_shifts = [s for s in self.shifts if s.is_weekend]
      if weekend_shifts:
          # Same approach as night shifts

      # 3. Balance total hours
      # Already done in existing code
  ```

- [ ] Add fairness metrics to roster summary:
  ```python
  {
      "fairness_score": 0.85,  # 0-1, higher is better
      "max_hours_employee": 46,
      "min_hours_employee": 38,
      "hours_std_dev": 3.2,
      "night_shifts_distribution": [3, 3, 2, 4, 3],  # per employee
      "weekend_shifts_distribution": [2, 2, 1, 2, 2]
  }
  ```

**Success Criteria**:
- ✅ Night shifts distributed evenly (max difference ≤ 2)
- ✅ Weekend shifts distributed evenly
- ✅ Fairness score visible in dashboard

---

## Priority 3: Implement Automated Compliance System (1-2 weeks)

### 3.1: PSIRA Compliance Service (Phase 4 from plan)

**Purpose**: Automate PSIRA registration expiry tracking

**Tasks**:
- [ ] Create `PSIRAAlert` model:
  ```python
  class PSIRAAlert(Base):
      __tablename__ = "psira_alerts"
      alert_id: int
      employee_id: int  # FK
      alert_type: str  # "expiry_warning", "expired", "suspended"
      days_until_expiry: int
      expiry_date: datetime
      is_resolved: bool
      resolved_at: datetime
      resolved_by: int
      created_at: datetime
  ```

- [ ] Create `PSIRAComplianceService`:
  ```python
  class PSIRAComplianceService:
      def check_all_employees(self):
          """Check PSIRA for all active employees."""
          # Query employees where status = ACTIVE
          # For each: check psira_expiry_date
          # If expires in 60/30/7 days: create alert
          # If expired: create critical alert

      def get_active_alerts(self):
          """Get unresolved alerts."""
          return db.query(PSIRAAlert).filter(is_resolved=False).all()

      def get_expired_employees(self):
          """Get employees with expired PSIRA."""
          return db.query(Employee).filter(
              psira_expiry_date < now
          ).all()

      def generate_compliance_report(start_date, end_date):
          """Generate compliance report."""
          # Count: compliant, expiring_soon, expired
          # Return compliance_rate percentage
  ```

- [ ] Create API endpoints in `/api/v1/compliance`:
  ```python
  POST /psira/check-all       # Run compliance check
  GET  /psira/alerts          # List active alerts
  GET  /psira/expired         # List expired employees
  GET  /psira/report          # Compliance report
  ```

- [ ] Add scheduled task (Celery or APScheduler):
  ```python
  # Run daily at 6 AM
  @scheduler.scheduled_job('cron', hour=6)
  def daily_psira_check():
      service = PSIRAComplianceService(db)
      alerts_created = service.check_all_employees()
      logger.info(f"Created {alerts_created} PSIRA alerts")
  ```

- [ ] Update frontend dashboard:
  - Add "PSIRA Alerts" widget
  - Show count of expiring/expired certifications
  - Link to compliance page

**Success Criteria**:
- ✅ Alerts created automatically at 60/30/7 days
- ✅ Dashboard shows PSIRA compliance status
- ✅ Email/notification sent for critical alerts
- ✅ Expired employees excluded from roster generation

---

### 3.2: BCEA Compliance Service (Phase 5 from plan)

**Purpose**: Detect and track labor law violations

**Tasks**:
- [ ] Create `BCEAViolation` model:
  ```python
  class BCEAViolation(Base):
      __tablename__ = "bcea_violations"
      violation_id: int
      employee_id: int  # FK
      shift_id: int  # FK (optional)
      roster_id: int  # FK (optional)
      violation_type: str  # "weekly_hours_exceeded", "insufficient_rest", etc.
      violation_description: str
      severity: str  # "critical", "high", "medium", "low"
      rule_limit: float  # e.g., 48 hours
      actual_value: float  # e.g., 52 hours
      detected_at: datetime
      is_resolved: bool
      resolved_at: datetime
      resolution_notes: str
  ```

- [ ] Create `BCEAComplianceService`:
  ```python
  class BCEAComplianceService:
      def check_roster_compliance(roster_id):
          """Check if roster is BCEA compliant."""
          # Get all assignments for roster
          # Group by employee
          # For each employee:
          #   - Check weekly hours <= 48
          #   - Check rest periods >= 8h
          #   - Check meal breaks after 5h
          #   - Check consecutive days <= 6
          # Create BCEAViolation for each issue
          # Return compliance report

      def calculate_overtime_pay(employee, hours):
          """Calculate OT according to BCEA."""
          # 0-45h: Regular rate
          # 46-48h: 1.5x rate
          # >48h: 2x rate (if authorized)

      def get_violations_report(start_date, end_date):
          """Generate violations report."""
          # Group by type
          # Count by severity
          # Return summary
  ```

- [ ] Integrate with optimizer:
  ```python
  # In OptimizerService.optimize_roster():
  if success:
      # After saving assignments
      bcea_service = BCEAComplianceService(db)
      compliance = bcea_service.check_roster_compliance(roster_id)

      roster.bcea_compliant = compliance['is_compliant']
      roster.compliance_issues = compliance['violations']

      if not compliance['is_compliant']:
          logger.warning(f"Roster has {len(compliance['violations'])} violations")
  ```

- [ ] Create API endpoints `/api/v1/compliance/bcea`:
  ```python
  POST /check-roster/{roster_id}  # Check specific roster
  GET  /violations                # List all violations
  GET  /report                    # Violations report
  GET  /overtime-calculator       # Calculate OT pay
  ```

- [ ] Add compliance dashboard page:
  - List all violations
  - Filter by type/severity
  - Show trends over time
  - Export violations report

**Success Criteria**:
- ✅ Every roster checked for BCEA compliance
- ✅ Violations logged to database
- ✅ Dashboard shows compliance status
- ✅ Can generate audit reports
- ✅ Overtime calculated correctly per BCEA rules

---

## Priority 4: Emergency Re-Optimization (3-4 days)

### Purpose
Handle real-time changes like:
- Guard calls in sick
- Emergency shift added
- Guard cancels shift

### Tasks
- [ ] Create `/api/v1/roster/emergency-reoptimize` endpoint:
  ```python
  @router.post("/{roster_id}/emergency-reoptimize")
  def emergency_reoptimize(
      roster_id: int,
      scenario: EmergencyScenario,  # sick_call, cancellation, new_shift
      affected_shift_ids: List[int],
      db: Session = Depends(get_db)
  ):
      """Re-optimize roster for emergency changes."""

      # Get current roster
      roster = get_roster(roster_id)

      # Mark affected shifts as unassigned
      for shift_id in affected_shift_ids:
          shift = get_shift(shift_id)
          shift.assigned_employee_id = None
          shift.status = "urgent"

      # Get available employees (exclude sick ones)
      available_employees = get_available_employees(
          exclude_sick=True,
          exclude_on_leave=True
      )

      # Run incremental optimization
      # Only reassign affected shifts + nearby time slots
      optimizer = MILPRosterGenerator(db)
      optimizer.incremental_mode = True
      optimizer.locked_assignments = get_confirmed_assignments(roster_id)

      result = optimizer.solve()

      # Notify affected employees via SMS/push notification
      notify_employees(result['new_assignments'])

      return result
  ```

- [ ] Add `incremental_mode` to MILP optimizer:
  ```python
  def build_model(self):
      if self.incremental_mode:
          # Lock existing assignments
          for (emp_id, shift_id) in self.locked_assignments:
              self.model.Add(self.x[emp_id, shift_id] == 1)

          # Only create variables for unassigned shifts
  ```

- [ ] Add notification service:
  ```python
  def notify_employees(assignments: List[Assignment]):
      for assignment in assignments:
          employee = get_employee(assignment.employee_id)
          shift = get_shift(assignment.shift_id)

          # Send SMS
          send_sms(
              to=employee.phone,
              message=f"Emergency shift assigned: {shift.site.name} on {shift.start_time}"
          )

          # Send push notification (if mobile app exists)
          send_push(employee.user_id, "New urgent shift assigned")
  ```

- [ ] Add frontend "Emergency Optimize" button:
  - Modal to select affected shifts
  - Select reason (sick call, cancellation, etc.)
  - Show re-optimization progress
  - Display new assignments
  - Confirm button to apply changes

**Success Criteria**:
- ✅ Can re-optimize in <10 seconds
- ✅ Existing assignments preserved unless affected
- ✅ Employees notified of changes
- ✅ Audit log tracks emergency changes

---

## Priority 5: Calendar Visualization (1 week)

### Purpose
Replace table view with visual calendar for roster

### Tasks
- [ ] Install FullCalendar or React Big Calendar:
  ```bash
  npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
  ```

- [ ] Create `CalendarView` component:
  ```typescript
  import FullCalendar from '@fullcalendar/react'
  import dayGridPlugin from '@fullcalendar/daygrid'
  import timeGridPlugin from '@fullcalendar/timegrid'
  import interactionPlugin from '@fullcalendar/interaction'

  export default function RosterCalendar() {
      const [events, setEvents] = useState([])

      useEffect(() => {
          // Fetch shifts and convert to calendar events
          const calendarEvents = shifts.map(shift => ({
              id: shift.shift_id,
              title: `${shift.employee.name} @ ${shift.site.name}`,
              start: shift.start_time,
              end: shift.end_time,
              backgroundColor: shift.employee ? '#10b981' : '#ef4444',
              extendedProps: {
                  employee_id: shift.employee_id,
                  site_id: shift.site_id,
                  status: shift.status
              }
          }))
          setEvents(calendarEvents)
      }, [shifts])

      const handleEventClick = (info) => {
          // Show shift details modal
          showShiftModal(info.event.id)
      }

      const handleDateSelect = (selectInfo) => {
          // Create new shift in this time slot
          showCreateShiftModal(selectInfo.start, selectInfo.end)
      }

      return (
          <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              events={events}
              editable={true}
              selectable={true}
              eventClick={handleEventClick}
              select={handleDateSelect}
              height="auto"
          />
      )
  }
  ```

- [ ] Add drag-and-drop assignment:
  ```typescript
  const handleEventDrop = async (info) => {
      const shift_id = info.event.id
      const new_start = info.event.start
      const new_end = info.event.end

      // Update shift times
      await api.put(`/shifts/${shift_id}`, {
          start_time: new_start,
          end_time: new_end
      })

      // Revalidate constraints
      const validation = await api.post('/roster/validate-shift', {shift_id})
      if (!validation.is_valid) {
          alert(validation.error_message)
          info.revert()  // Revert drag
      }
  }
  ```

- [ ] Add color coding:
  - Green: Assigned shifts
  - Red: Unassigned shifts
  - Yellow: Overtime shifts
  - Blue: Night shifts
  - Purple: Weekend shifts

- [ ] Add filters:
  - Filter by employee
  - Filter by site
  - Filter by shift status
  - Filter by skill level

**Success Criteria**:
- ✅ Weekly/monthly calendar view
- ✅ Color-coded shifts
- ✅ Click to view details
- ✅ Drag-and-drop to reassign
- ✅ Filter and search functionality

---

## Priority 6: Shift Swap Workflow (3-4 days)

### Purpose
Allow guards to request shift swaps with approval workflow

### Tasks
- [ ] Create `ShiftSwapRequest` model:
  ```python
  class ShiftSwapRequest(Base):
      __tablename__ = "shift_swap_requests"
      request_id: int
      requesting_employee_id: int  # FK - who wants to give away shift
      target_employee_id: int  # FK - who wants to take shift
      original_shift_id: int  # FK
      requested_at: datetime
      status: str  # "pending", "approved", "rejected", "cancelled"
      reviewed_by: int  # FK to User
      reviewed_at: datetime
      rejection_reason: str
      is_valid: bool  # Constraint validation result
      validation_errors: JSON
  ```

- [ ] Create API endpoints `/api/v1/shifts/swap`:
  ```python
  @router.post("/request-swap")
  def request_swap(
      original_shift_id: int,
      target_employee_id: int,
      requesting_employee_id: int,
      db: Session = Depends(get_db)
  ):
      """Request to swap shift with another employee."""

      # Validate swap is feasible
      validation = validate_swap(
          original_shift_id,
          requesting_employee_id,
          target_employee_id
      )

      if not validation.is_valid:
          return {"error": validation.errors}

      # Create swap request
      request = ShiftSwapRequest(
          requesting_employee_id=requesting_employee_id,
          target_employee_id=target_employee_id,
          original_shift_id=original_shift_id,
          status="pending",
          is_valid=validation.is_valid,
          validation_errors=validation.errors
      )
      db.add(request)
      db.commit()

      # Notify target employee
      notify_employee(target_employee_id, f"Swap request for shift {original_shift_id}")

      return request

  @router.post("/{request_id}/approve")
  def approve_swap(request_id: int, user_id: int, db: Session = Depends(get_db)):
      """Approve shift swap request."""
      request = get_request(request_id)

      # Double-check validation
      if not request.is_valid:
          raise HTTPException(400, "Swap is not valid")

      # Execute swap
      shift = get_shift(request.original_shift_id)
      shift.assigned_employee_id = request.target_employee_id

      request.status = "approved"
      request.reviewed_by = user_id
      request.reviewed_at = datetime.now()

      db.commit()

      # Notify both employees
      notify_both_employees(request)

      return {"success": True}

  def validate_swap(shift_id, from_employee_id, to_employee_id):
      """Check if swap violates constraints."""
      shift = get_shift(shift_id)
      from_emp = get_employee(from_employee_id)
      to_emp = get_employee(to_employee_id)

      errors = []

      # Check skills
      if not has_skill(to_emp, shift.required_skill):
          errors.append("Target employee lacks required skill")

      # Check certification
      if not has_valid_cert(to_emp, shift.start_time):
          errors.append("Target employee certification expired")

      # Check weekly hours
      if would_exceed_hours(to_emp, shift):
          errors.append("Would exceed 48h weekly limit")

      # Check rest periods
      if would_violate_rest(to_emp, shift):
          errors.append("Would violate 8h rest period")

      # Check availability
      if not is_available(to_emp, shift):
          errors.append("Target employee not available")

      return {
          "is_valid": len(errors) == 0,
          "errors": errors
      }
  ```

- [ ] Add frontend swap request UI:
  - "Request Swap" button on shift detail
  - Modal to select target employee
  - Show validation results
  - List pending swap requests
  - Approve/reject buttons for managers

**Success Criteria**:
- ✅ Guards can request swaps
- ✅ Validation prevents invalid swaps
- ✅ Managers can approve/reject
- ✅ Both employees notified
- ✅ Audit trail of all swaps

---

## Priority 7: Mobile App Backend (Phase 8 - 4-6 weeks)

**Deferred to Phase 2** - Not critical for MVP

### High-Level Requirements
1. Guard authentication (JWT tokens)
2. View assigned shifts API
3. GPS-based clock in/out
4. Submit shift swap requests
5. View payroll summaries
6. Push notifications

---

## Priority 8: Advanced Analytics & ML (Phase 12 - 8+ weeks)

**Deferred to Phase 3** - "Nice to have" features

### Features
1. ML demand forecasting (predict future shift needs)
2. Fatigue risk scoring (detect overworked guards)
3. Cost optimization trends
4. Budget forecasting
5. Anomaly detection

---

## Testing Strategy

### Unit Tests (Required before production)
```python
# tests/test_optimizer.py
def test_hungarian_basic_assignment():
    """Test Hungarian assigns guards to shifts."""
    # Create 5 guards, 5 shifts
    # Run optimizer
    # Assert all shifts assigned

def test_milp_respects_weekly_hours():
    """Test MILP enforces 48h limit."""
    # Create scenario with 60h potential
    # Run MILP
    # Assert all guards <= 48h

def test_bcea_rest_period():
    """Test 8h rest enforcement."""
    # Create shifts 6h apart
    # Run optimizer
    # Assert guard not assigned both

def test_psira_expiry_exclusion():
    """Test expired PSIRA guards excluded."""
    # Create guard with expired PSIRA
    # Run optimizer
    # Assert guard not assigned

def test_fairness_balancing():
    """Test MILP balances workload."""
    # Create 10 guards, 40 shifts
    # Run MILP
    # Assert max_hours - min_hours <= 6
```

### Integration Tests
```python
# tests/test_api.py
def test_roster_generation_api():
    """Test full roster generation flow."""
    # POST /api/v1/roster/generate
    # Assert 200 OK
    # Assert assignments returned
    # Assert costs calculated

def test_emergency_reoptimize():
    """Test emergency re-optimization."""
    # Create roster
    # Mark shift as sick call
    # POST /roster/emergency-reoptimize
    # Assert new assignment found
```

### Load Testing
```bash
# Use Locust or K6
locust -f tests/load_test.py --users 100 --spawn-rate 10
```

**Targets**:
- 100 concurrent users
- <500ms API response time (p95)
- Roster optimization <30 seconds for 50 guards

---

## Deployment Checklist

### Pre-Production
- [ ] Security audit and penetration testing
- [ ] Load testing (100+ users)
- [ ] Backup system configured (daily automated backups)
- [ ] Error monitoring (Sentry) configured
- [ ] Logging (ELK stack or CloudWatch)
- [ ] Database migrations tested
- [ ] Environment variables secured (Vault or AWS Secrets Manager)
- [ ] SSL certificates installed
- [ ] CORS properly configured (whitelist only)
- [ ] API rate limiting enabled
- [ ] Database connection pooling optimized
- [ ] Cache layer added (Redis)

### Documentation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] User manual for managers
- [ ] Guard mobile app guide
- [ ] Troubleshooting guide
- [ ] Deployment runbook
- [ ] Disaster recovery plan

### Monitoring
- [ ] Uptime monitoring (Pingdom or StatusCake)
- [ ] Performance monitoring (New Relic or Datadog)
- [ ] Error tracking (Sentry)
- [ ] Log aggregation (ELK or Splunk)
- [ ] Alerting (PagerDuty or Opsgenie)

---

## Success Metrics (KPIs)

### Technical Performance
- Average roster solve time: <30 seconds for 50 guards
- API response time (p95): <500ms
- Uptime: 99.9%
- Error rate: <0.1%

### Business Impact
- PSIRA compliance rate: 100%
- BCEA violation count: 0
- Overtime reduction: 15% vs manual rostering
- Labor cost reduction: 10%
- Payroll error rate: <1%
- Time to generate roster: <5 minutes vs 2-4 hours manual

### User Satisfaction
- Manager adoption: 90%+
- Guard app usage: 70%+
- Client retention: 85%+
- Support tickets: <10/week

---

## Timeline (Updated)

### Immediate (1-2 days)
- ✅ Fix critical roster generation issue
- ✅ Debug feasibility constraints
- ✅ Verify MILP algorithm working

### Week 1-2
- Complete Roster/ShiftAssignment models
- Add missing BCEA constraints (meal breaks, consecutive days)
- Enhance fairness balancing

### Week 3-4
- Implement PSIRA compliance service
- Implement BCEA violation tracking
- Create compliance dashboard

### Week 5-6
- Emergency re-optimization
- Shift swap workflow
- Calendar visualization

### Week 7-10 (Optional)
- Mobile app backend
- Push notifications
- Advanced analytics

---

## Conclusion

**Current State**: RostraCore has a solid foundation with working algorithms, complete APIs, and functional frontend. The core rostering capability is ~70% complete.

**Next Steps**:
1. **Critical**: Fix roster generation infeasibility issue (1-2 days)
2. **Important**: Complete core features (Roster models, BCEA constraints, fairness) (2-4 weeks)
3. **Valuable**: Add compliance automation (PSIRA/BCEA services) (1-2 weeks)
4. **Nice-to-have**: Calendar view, mobile app, ML features (4-12 weeks)

**Recommendation**: Focus on fixing critical issues and completing core features before adding advanced capabilities. The system is already valuable for basic rostering; make it rock-solid before expanding scope.

---

**Generated with Claude Code - Updated Implementation Plan**
