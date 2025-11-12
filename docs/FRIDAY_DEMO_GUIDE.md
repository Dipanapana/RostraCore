# GuardianOS - Friday Demo Guide

## Demo Overview
**Date:** Friday
**Duration:** 30-45 minutes
**Focus:** Core roster management workflow for security companies

---

## Pre-Demo Checklist

### Technical Setup (Complete Before Client Arrives)
- [ ] Backend running on `localhost:8000`
- [ ] Frontend running on `localhost:3000`
- [ ] Redis running
- [ ] Celery worker running
- [ ] Database has clean demo data
- [ ] Test login credentials ready

### Demo Materials Ready
- [ ] Employee import Excel template downloaded
- [ ] Site import Excel template downloaded
- [ ] Sample Excel files with 10 employees and 5 sites
- [ ] Backup demo data if import fails

---

## Demo Flow (30 minutes)

### 1. Introduction (2 minutes)
**Script:**
"Welcome! Today I'll show you GuardianOS, our AI-powered security workforce management platform. We'll walk through the complete workflow from adding employees and sites to generating optimized rosters."

**Key Points:**
- Built specifically for South African security companies
- PSIRA and BCEA compliant
- Saves time and reduces costs through intelligent scheduling

---

### 2. Employee Management (10 minutes)
 
#### Manual Employee Creation (3 minutes)
**Navigate to:** `/employees`

**Action:** Create 1-2 employees manually
- Click "Add Employee"
- Fill in details:
  - First Name: John
  - Last Name: Doe
  - ID Number: 8001011234567
  - Email: john.doe@demo.com
  - Phone: +27821234567
  - Role: Guard
  - PSIRA Number: 1234567
  - Hourly Rate: R55.00
  - Home Address: 123 Main St, Johannesburg

**Talking Points:**
- "Each guard needs PSIRA certification - we track that automatically"
- "Hourly rates feed directly into cost calculations"
- "Home addresses used for distance optimization (Phase 2)"

#### Excel Import (7 minutes)
**Action:** Import employees via Excel

1. Click "Download Template"
   - Show the template structure
   - Point out required vs optional fields

2. Click "Import from Excel"
   - Upload prepared file with 10 employees
   - Show import results:
     - X employees imported successfully
     - Y skipped (duplicates)
     - Z errors (if any)

**Talking Points:**
- "Bulk import saves hours when onboarding large teams"
- "System validates ID numbers and detects duplicates"
- "Import 100+ employees in seconds vs hours of manual entry"

---

### 3. Client & Site Management (8 minutes)

#### Create Clients Manually (3 minutes)
**Navigate to:** `/clients`

**Action:** Create 2-3 clients
- ABC Corporation
  - Contact: manager@abc.com
  - Phone: +27115551234
- XYZ Warehouse Ltd
- SecureOffice Properties

**Talking Points:**
- "Each client can have multiple sites"
- "Track client contracts and billing separately"

#### Add Sites (5 minutes)
**Navigate to:** `/sites`

**Action:** Create sites for each client
- ABC Corporation - Head Office
  - Address: 123 Business Rd, Sandton, Gauteng
  - Shift Pattern: Day (08:00-17:00)
  - Billing Rate: R180/hour
  - Min Staff: 2 guards

- ABC Corporation - Warehouse
  - Address: 789 Industrial Park, Midrand
  - Shift Pattern: 12hr (07:00-19:00 / 19:00-07:00)
  - Billing Rate: R200/hour
  - Min Staff: 3 guards

- XYZ Warehouse - Main Depot
  - Shift Pattern: Night (19:00-07:00)
  - Min Staff: 4 guards

**Talking Points:**
- "Different shifts patterns for each site"
- "Billing rates vary by site complexity"
- "Min staff ensures security coverage"

**Option:** Show Excel import for sites if time permits

---

### 4. Certification Management (3 minutes)
**Navigate to:** `/certifications`

**Action:** Add certifications for guards
- John Doe - PSIRA Grade C - Valid until 2025-12-31
- Jane Smith - First Aid - Valid until 2025-06-30

**Talking Points:**
- "System tracks cert expiry dates"
- "Automated reminders before expiration"
- "Compliance reporting for audits"

---

### 5. Roster Generation - THE MAIN EVENT (12 minutes)

**Navigate to:** `/roster`

**Action:** Generate roster for next week

1. Click "Generate Roster"
2. Select Date Range: Next Monday - Sunday (7 days)
3. Select Sites: ABC Head Office, ABC Warehouse, XYZ Depot
4. Algorithm: Production (CP-SAT)
5. Click "Generate"

**Wait for generation (15-30 seconds):**
- Show loading state
- Mention: "AI analyzing 100+ factors: availability, skills, BCEA limits, fairness"

**Results Screen:**
- **Summary Stats:**
  - 42 shifts scheduled
  - 8 employees utilized
  - R12,450 total cost
  - 98% coverage
  - Fairness score: 0.85

- **Weekly Calendar View:**
  - Show each guard's schedule
  - Color-coded by site
  - Highlight BCEA compliance (no guard over 48 hours)

- **Cost Breakdown:**
  - Per site costs
  - Per employee hours
  - Overtime calculations

**Talking Points:**
- "This would take 2-3 hours manually - done in 30 seconds"
- "System ensures no BCEA violations (48-hour limit)"
- "Distributes hours fairly across all guards"
- "Minimizes overtime costs"
- "One-click to confirm and notify guards"

6. Click "Confirm Roster"
   - Show confirmation
   - Mention: "Guards would receive SMS/email notifications"

---

### 6. Client-Specific Roster (3 minutes)
**Navigate to:** `/roster`

**Action:** Generate roster for specific client

1. Click "Generate for Client"
2. Select Client: ABC Corporation
3. Date Range: Next week
4. Click "Generate"

**Result:** Roster for all ABC sites only

**Talking Points:**
- "Quickly generate client-specific schedules"
- "Perfect for contract-based billing"
- "Show clients their dedicated schedule"

---

### 7. Dashboard Overview (2 minutes)
**Navigate to:** `/dashboard`

**Show:**
- Active shifts today
- Upcoming shifts this week
- Budget vs actual spend
- Guard utilization rates
- Recent incidents/reports

**Talking Points:**
- "Real-time operational overview"
- "Spot issues before they become problems"
- "Financial tracking in one place"

---

## Key Value Propositions (Memorize These)

### Time Savings
- **Manual Rostering:** 2-3 hours per week
- **With GuardianOS:** 30 seconds
- **Annual Savings:** 100+ hours = R50,000+ in admin time

### Cost Optimization
- **Average Cost Reduction:** 15-20% through:
  - Optimal shift assignments
  - Minimized overtime
  - Better guard utilization
  - Reduced admin overhead

### Compliance
- **BCEA Compliance:** 100% automatic
  - 48-hour weekly limit
  - 11-hour daily limit
  - 8-hour rest periods
- **PSIRA Tracking:** Automatic expiry alerts
- **Audit Ready:** Complete records for DoL inspections

### Scalability
- **Handles:** 5 to 5,000 employees
- **Pricing:** R45/guard/month
  - 10 guards = R450/month
  - 50 guards = R2,250/month
  - 100 guards = R4,500/month

---

## Objection Handling

### "We already use Excel"
"Excel works for small teams, but as you grow, it becomes error-prone and time-consuming. One BCEA violation fine costs more than a year of GuardianOS. Plus, you can't optimize costs or track compliance automatically."

### "Too expensive"
"At R45/guard/month, if you have 20 guards, that's R900/month. Our customers typically save 15-20% on payroll costs through better optimization - that's R10,000+ per month for a mid-sized company. The system pays for itself in the first month."

### "Our team won't adapt to new software"
"Our interface is as simple as Excel but much more powerful. Plus, guards use mobile app - no training needed. We also provide onboarding support and training."

### "What if something goes wrong?"
"We have 99.9% uptime, automatic backups, and email/phone support. Plus, you can always export data to Excel if needed."

---

## Technical FAQs

### Q: What if I need to make manual changes after generation?
**A:** You can manually adjust any shift assignment. The system recalculates costs automatically.

### Q: Can I save roster templates?
**A:** Yes, you can save common patterns and reuse them. (Note: Implement this feature before Friday if possible)

### Q: How does mobile app work?
**A:** Guards clock in/out via GPS, submit incident reports with photos, and view their schedules. (Show API documentation if pressed)

### Q: Can we customize the algorithm?
**A:** Yes, you can adjust priorities: cost vs fairness vs coverage. We can also add custom constraints for your specific needs.

### Q: Integration with payroll?
**A:** Excel export ready for payroll systems. API available for direct integration.

---

## Closing (1 minute)

**Action Items:**
1. Provide pricing proposal (R45/guard/month)
2. Offer 14-day free trial
3. Schedule follow-up for onboarding

**Next Steps:**
- "Would you like to start with a pilot? We can get you up and running with your first roster in 1 week."
- "I'll send you the proposal today and we can discuss implementation timeline."

**Final Statement:**
"GuardianOS is built by security professionals for security professionals. We understand PSIRA, BCEA, and the unique challenges of workforce management in South Africa. Let's make your rostering effortless."

---

## Backup Plan (If Technical Issues)

### If Roster Generation Fails:
1. Have pre-generated roster screenshots
2. Show sample output on staging environment
3. Explain algorithm benefits conceptually

### If Import Fails:
1. Have employees pre-loaded
2. Show manual creation process thoroughly
3. Emphasize bulk import in follow-up

### If Demo Crashes:
1. Have PDF of screenshots showing full workflow
2. Switch to staging environment: https://demo.guardianos.co.za
3. Reschedule for technical deep-dive

---

## Post-Demo Follow-Up

### Within 24 Hours:
- [ ] Send proposal email with pricing
- [ ] Include Excel templates
- [ ] Share demo video/recording
- [ ] Provide ROI calculation for their specific size

### Within 3 Days:
- [ ] Follow-up call to answer questions
- [ ] Customize demo for their specific needs
- [ ] Provide implementation timeline

### Within 7 Days:
- [ ] Close deal or schedule next meeting
- [ ] Begin onboarding if approved

---

## Success Metrics

**Demo Considered Successful If:**
- Client understands core value proposition
- Client sees roster generation working
- Client expresses interest in trial/purchase
- Meeting scheduled for next steps

**Ideal Outcome:**
- Signed contract for 14-day trial
- First roster scheduled for next week
- Client enthusiastic about rollout

---

## Demo Data Summary

**Pre-loaded for Demo:**
- 12-15 employees (mix of guards, managers)
- 3 clients
- 5-6 sites across different shift patterns
- Valid PSIRA certifications
- Realistic addresses (Johannesburg/Gauteng area)

**Generated During Demo:**
- 1 week roster (42-50 shifts)
- Client-specific roster
- Cost breakdown report

---

Good luck! Remember: **Confidence, clarity, and enthusiasm win demos.**
