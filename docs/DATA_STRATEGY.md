# RostraCore Data & Analytics Strategy

## Philosophy: "Measure to Matter"

Every data point collected must serve one of three purposes:
1. **Understand user pain** - Where do users struggle?
2. **Prove product value** - What outcomes do we create?
3. **Guide product evolution** - What should we build next?

---

## 1. DATA COLLECTION FRAMEWORK

### A. User Behavior Analytics

#### **Events to Track** (Priority 1 - Implement First)

**Onboarding Journey:**
- `user_signup_started` - First visit to signup page
- `user_signup_completed` - Account created
- `first_employee_added` - First meaningful action
- `first_site_added` - Second setup step
- `first_shift_created` - Third setup step
- `first_roster_generated` - "Aha!" moment
- `onboarding_completed` - All setup done (Time-to-value metric)

**Core Feature Usage:**
- `roster_generated` - With attributes: algorithm_used, shift_count, duration_seconds, fill_rate
- `roster_confirmed` - User accepts recommendations
- `roster_manual_override` - User rejects algorithm (signals optimization issues)
- `shift_created_manual` - vs. `shift_created_bulk` (workflow preference)
- `employee_filtered` - Track most-used filters
- `export_triggered` - Format: PDF/CSV/Excel (business value signal)

**Engagement Indicators:**
- `dashboard_viewed` - Session frequency
- `feature_clicked` - Track navigation patterns
- `search_performed` - What users are looking for
- `help_accessed` - Where users get stuck

**Friction Points:**
- `form_abandoned` - Which forms lose users?
- `error_encountered` - What breaks?
- `optimization_timeout` - Algorithm performance issues
- `constraint_violation` - Common compliance errors

#### **User Properties to Track**

**Firmographics:**
- Company size (# of guards)
- Geographic region (Gauteng, Western Cape, etc.)
- Subscription tier
- Industry vertical (Corporate, Residential, Event, etc.)

**Behavioral Cohorts:**
- Days since signup
- Feature adoption score (0-100)
- Engagement frequency (daily/weekly/monthly/churned)
- Power user indicators (API usage, bulk operations, etc.)

### B. Business Metrics (North Star Metrics)

**Primary North Star: Time Saved Per Roster**
- Baseline: Manual rostering = 4-8 hours
- Target: RostraCore = 10 minutes
- Measure: `(manual_time - rostracore_time) * rosters_per_week * hourly_rate`

**Secondary Metrics:**
1. **Cost Optimization** - Money saved via optimized scheduling
2. **Compliance Rate** - % of rosters 100% BCEA/PSIRA compliant
3. **Employee Fairness** - Gini coefficient of hour distribution
4. **Customer Health Score** - Composite of usage + satisfaction + growth

### C. Product Health Metrics

**Activation Metrics:**
- % users who complete onboarding in <30 minutes
- % users who generate first roster within 24 hours
- % users who invite team members

**Engagement Metrics:**
- DAU/MAU ratio (stickiness)
- Rosters generated per week per customer
- Features used per session
- Session duration (should be SHORT - efficiency is the goal)

**Retention Metrics:**
- 7-day, 30-day, 90-day retention cohorts
- Churn rate by subscription tier
- Net revenue retention

**Growth Metrics:**
- Viral coefficient (invites sent / users)
- Upgrade rate (starter → professional → business)
- Referral rate

---

## 2. PREDICTIVE ANALYTICS MODELS

### Model 1: Shift Fill Prediction

**Input Features:**
- Historical fill rate by site
- Day of week, time of day
- Seasonality factors
- Weather data (optional)
- Employee availability pool size
- Required skills rarity

**Output:**
- Fill probability (0-1)
- Expected cost to fill
- Recommended posting time

**Business Value:** Proactive warning system - "This shift is at risk of being unfilled"

### Model 2: Employee Churn Prediction

**Input Features:**
- Hours worked trend (increasing/decreasing)
- Shift rejection rate
- Certification expiry approaching
- Distance from home to sites (average)
- Roster fairness score received
- Pay variance (overtime vs. regular)

**Output:**
- Churn risk score (low/medium/high)
- Retention intervention suggestions

**Business Value:** Reduce recruitment costs, maintain quality guard pool

### Model 3: Cost Forecasting

**Input Features:**
- Historical shift patterns
- Seasonal demand (holidays, events)
- Employee availability trends
- Overtime rates historical
- Fuel price trends

**Output:**
- 30-day cost forecast with confidence intervals
- Budget alert thresholds

**Business Value:** Cash flow planning for security companies

### Model 4: Roster Quality Score

**Input Features:**
- Fill rate
- Compliance violations
- Cost vs. budget
- Fairness score
- Manual override rate
- Employee acceptance rate

**Output:**
- Quality score (0-100)
- Improvement recommendations

**Business Value:** Make algorithm trustworthy through transparency

---

## 3. ANALYTICS DATABASE SCHEMA

### New Tables to Add:

```sql
-- User behavior events
CREATE TABLE analytics_events (
    event_id UUID PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    org_id INTEGER REFERENCES organizations(org_id),
    event_name VARCHAR(100) NOT NULL,
    event_properties JSONB,  -- Flexible key-value pairs
    session_id UUID,
    timestamp TIMESTAMPTZ DEFAULT NOW(),

    -- Device context
    user_agent TEXT,
    ip_address INET,
    device_type VARCHAR(50),  -- mobile/tablet/desktop
    browser VARCHAR(50),

    -- Performance metrics
    page_load_time_ms INTEGER,

    INDEX idx_event_name (event_name),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_org_id (org_id)
);

-- Aggregated daily metrics per organization
CREATE TABLE analytics_daily_metrics (
    metric_id SERIAL PRIMARY KEY,
    org_id INTEGER REFERENCES organizations(org_id),
    date DATE NOT NULL,

    -- Usage metrics
    active_users INTEGER,
    rosters_generated INTEGER,
    shifts_created INTEGER,
    employees_added INTEGER,

    -- Quality metrics
    avg_roster_fill_rate DECIMAL(5,2),
    avg_optimization_time_seconds DECIMAL(8,2),
    compliance_rate DECIMAL(5,2),

    -- Financial metrics
    total_cost_scheduled DECIMAL(12,2),
    avg_cost_per_shift DECIMAL(8,2),

    -- Engagement metrics
    sessions_count INTEGER,
    avg_session_duration_minutes DECIMAL(8,2),
    features_used_count INTEGER,

    UNIQUE(org_id, date),
    INDEX idx_org_date (org_id, date)
);

-- Customer health scores
CREATE TABLE customer_health_scores (
    score_id SERIAL PRIMARY KEY,
    org_id INTEGER REFERENCES organizations(org_id),
    calculated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Composite score
    overall_score INTEGER,  -- 0-100
    health_status VARCHAR(20),  -- healthy/at_risk/churning

    -- Component scores
    usage_score INTEGER,  -- How often they use it
    adoption_score INTEGER,  -- How many features they use
    satisfaction_score INTEGER,  -- Based on behavior proxies
    growth_score INTEGER,  -- Increasing usage trend

    -- Actionable insights
    churn_risk DECIMAL(3,2),  -- 0-1 probability
    recommendations JSONB,  -- Suggested actions

    INDEX idx_org_id (org_id),
    INDEX idx_health_status (health_status)
);

-- Feature usage tracking
CREATE TABLE feature_usage_stats (
    stat_id SERIAL PRIMARY KEY,
    org_id INTEGER REFERENCES organizations(org_id),
    feature_name VARCHAR(100),

    -- Usage counts
    usage_count INTEGER DEFAULT 0,
    unique_users_count INTEGER DEFAULT 0,

    -- Timing
    first_used_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,

    -- Engagement
    avg_uses_per_week DECIMAL(8,2),

    UNIQUE(org_id, feature_name),
    INDEX idx_org_feature (org_id, feature_name)
);

-- A/B test framework
CREATE TABLE ab_tests (
    test_id SERIAL PRIMARY KEY,
    test_name VARCHAR(100) UNIQUE,
    description TEXT,

    start_date DATE,
    end_date DATE,

    variant_a_config JSONB,
    variant_b_config JSONB,

    status VARCHAR(20),  -- draft/running/completed/cancelled

    -- Results
    variant_a_conversions INTEGER DEFAULT 0,
    variant_a_exposures INTEGER DEFAULT 0,
    variant_b_conversions INTEGER DEFAULT 0,
    variant_b_exposures INTEGER DEFAULT 0,

    winner VARCHAR(10)  -- A/B/inconclusive
);

CREATE TABLE ab_test_assignments (
    assignment_id SERIAL PRIMARY KEY,
    test_id INTEGER REFERENCES ab_tests(test_id),
    user_id INTEGER REFERENCES users(user_id),
    variant VARCHAR(1),  -- A or B
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    converted BOOLEAN DEFAULT FALSE,

    UNIQUE(test_id, user_id)
);
```

---

## 4. ANALYTICS DASHBOARDS TO BUILD

### Dashboard 1: Executive Overview (For Business Owners)
**Purpose:** Show business value in 30 seconds

**Key Metrics:**
- 💰 Total Cost Savings This Month (vs. manual scheduling)
- ⏱️ Time Saved This Week (hours)
- ✅ Compliance Rate (%)
- 📈 Roster Fill Rate Trend (7-day chart)
- 👥 Active Guards This Week
- 🎯 Customer Health Score

**Design:** BIG numbers, minimal text, traffic light colors

### Dashboard 2: Operations Dashboard (For Schedulers)
**Purpose:** Day-to-day scheduling efficiency

**Key Metrics:**
- Upcoming Shifts (next 48 hours)
- Unfilled Shifts (with urgency indicators)
- At-Risk Shifts (predicted fill < 70%)
- Employee Availability Today
- Certification Expiries (next 14 days)
- Quick Actions (Generate Roster, Add Shift, etc.)

**Design:** Action-oriented, real-time updates, notifications

### Dashboard 3: Financial Dashboard (For Finance/Owners)
**Purpose:** Budget control and forecasting

**Key Metrics:**
- Actual vs. Budget (MTD)
- Cost Breakdown (Regular/OT/Premiums/Travel)
- 30-Day Forecast with confidence bands
- Cost per Shift Trend
- Payroll Summary by Employee
- Export to Excel button

**Design:** Charts, tables, export functionality

### Dashboard 4: People Analytics (For HR/Management)
**Purpose:** Guard welfare and fairness

**Key Metrics:**
- Hours Distribution (histogram - is it fair?)
- Employee Utilization Rate
- Churn Risk Employees (with reasons)
- Certification Compliance Status
- Top Performers (most reliable guards)
- Satisfaction Proxies (shift acceptance rate, punctuality)

**Design:** People-focused, empathetic tone

### Dashboard 5: Product Analytics (For Internal/Admin)
**Purpose:** Product team insights

**Key Metrics:**
- Feature Adoption Funnel
- User Cohort Retention
- Algorithm Performance (by type)
- Error Rates and Types
- Support Ticket Trends
- A/B Test Results

**Design:** Technical, detailed, data-dense

---

## 5. DATA INSTRUMENTATION PLAN

### Phase 1: Foundation (Week 1-2)
1. Add `analytics_events` table
2. Create event tracking service (backend)
3. Instrument 10 critical events (signup, first roster, etc.)
4. Build basic event viewer (admin only)

### Phase 2: Dashboards (Week 3-4)
1. Add `analytics_daily_metrics` table
2. Create aggregation jobs (run nightly)
3. Build Executive Dashboard
4. Build Operations Dashboard

### Phase 3: Intelligence (Week 5-8)
1. Add `customer_health_scores` table
2. Build churn prediction model
3. Build shift fill prediction model
4. Create proactive alert system

### Phase 4: Optimization (Week 9-12)
1. Add A/B testing framework
2. Implement feature flags
3. Build experimentation dashboard
4. Run first A/B test on pricing page

---

## 6. DATA GOVERNANCE & PRIVACY

### POPIA Compliance (South African Data Protection)
- **Consent:** Explicit opt-in for analytics tracking
- **Purpose Limitation:** Only collect data for stated purposes
- **Data Minimization:** Don't track PII unnecessarily
- **Retention:** Delete event data after 24 months
- **Access Controls:** Role-based access to analytics dashboards

### Data Security
- Encrypt analytics data at rest
- Anonymize IP addresses (store subnet only)
- No sensitive data in event properties (no passwords, ID numbers)
- Regular security audits

### Ethical Considerations
- **Algorithmic Fairness:** Monitor for bias in roster assignments
- **Transparency:** Show guards how/why they were assigned
- **Worker Dignity:** Use data to improve fairness, not exploitation

---

## 7. SUCCESS METRICS FOR DATA STRATEGY

**After 3 Months:**
- [ ] 100% of critical user journeys instrumented
- [ ] Executive Dashboard in production
- [ ] Baseline metrics established for all KPIs
- [ ] First predictive model deployed (shift fill)

**After 6 Months:**
- [ ] Customer health scores automated
- [ ] Churn reduced by 15% via proactive interventions
- [ ] 5+ A/B tests completed
- [ ] Data-driven product roadmap established

**After 12 Months:**
- [ ] RostraCore is "self-optimizing" via ML
- [ ] Customers cite "insights" as top value driver
- [ ] Product decisions backed by data 90%+ of time
- [ ] Analytics dashboard competitive differentiator

---

## 8. TECHNOLOGY RECOMMENDATIONS

**Analytics Stack:**
- **Events:** Segment.com or Mixpanel (or self-hosted PostHog)
- **Dashboards:** Metabase (open-source) or Looker
- **Data Warehouse:** PostgreSQL (current) + TimescaleDB extension for time-series
- **ML Models:** scikit-learn (current), MLflow for model management
- **Real-time:** Redis for live metrics caching

**Instrumentation:**
- **Frontend:** Analytics.js wrapper around chosen provider
- **Backend:** Python decorators for automatic event tracking
- **Infrastructure:** Prometheus + Grafana for system metrics

---

## SUMMARY: Why This Matters

**Current State:** RostraCore is a "black box" - we don't know if it's working, for whom, or why.

**Future State:** RostraCore becomes a **learning system** that:
1. **Understands** each customer's unique needs through behavioral data
2. **Predicts** problems before they occur (unfilled shifts, churn, costs)
3. **Optimizes** itself continuously through A/B testing
4. **Proves** its value quantitatively to customers

**The data strategy transforms RostraCore from a tool into a competitive moat.**

---

*Next Steps: Review with team, prioritize Phase 1 implementation, allocate engineering resources.*
