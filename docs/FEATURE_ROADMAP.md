# RostraCore Feature Roadmap
**Last Updated:** February 2026

---

## EasyRoster Competitive Analysis

EasyRoster is a 25-year South African workforce management platform targeting the security, cleaning, and facilities sectors. This roadmap incorporates features identified through competitive analysis to ensure RostraCore achieves and maintains a clear advantage.

### Where RostraCore Already Leads

| Feature | RostraCore Advantage |
|---------|---------------------|
| Patrol Management | Full QR/NFC/GPS checkpoint scanning — EasyRoster has no patrol module |
| Incident Reporting | Structured capture with severity/GPS/photos — not in EasyRoster |
| SARS-compliant Invoicing | Native invoice PDF generation + payment tracking — EasyRoster only exports to payroll systems |
| PSIRA Certification Tracking | Expiry monitoring and compliance — EasyRoster has generic qualifications |
| MILP Roster Optimisation | OR-Tools integer programming — EasyRoster uses rule-based scheduling |
| Mobile-first GPS Attendance | Purpose-built RN app with GPS — EasyRoster relies on 3rd-party biometric hardware |
| Multi-tenant SaaS | Full white-label multi-org architecture — EasyRoster appears single-org |
| Integrated SA Payroll | PAYE/UIF/SDL tax tables built-in — EasyRoster exports to external payroll systems |

---

## Upcoming Waves — Competitive Gap Closure

### Wave 36 — Personnel Blacklisting ✅ (Implemented)
**EasyRoster gap:** Guard restrictions per client/site
- Block specific guards from being assigned to specific clients or sites
- Restriction reason tracking with audit trail
- Surfaced on employee profile + client/site detail pages
- Roster generator respects all active restrictions

---

### Wave 37 — Non-productive Time Types
**EasyRoster gap:** IOD, Training, Suspension as exception types
- Add `exception_type` to leave/attendance: `iod` (Injury on Duty), `training`, `suspension`, `unpaid_leave`
- IOD does not consume leave balance
- Training days tracked separately for compliance reporting
- Suspension blocks guard from shift assignments for the period
- Dashboard exception summary card

---

### Wave 38 — Spare Guard Pool Management
**EasyRoster gap:** Auto-calculate relief guard headcount
- Based on active guard count + historical leave patterns, suggest how many spare/relief guards to maintain
- "Spare Pool" section on roster dashboard
- Configurable coverage buffer % per site
- Alert when spare pool drops below threshold

---

### Wave 39 — Over/Under Posting Alerts
**EasyRoster gap:** Real-time warning when shift has fewer guards than site minimum
- Sites already have `min_staff` field
- Add `/api/v1/shifts/coverage-gaps` endpoint returning understaffed shifts
- Dashboard widget: "X shifts are understaffed this week"
- Roster page highlights red for shifts below minimum
- Email/notification alert when a site goes below minimum

---

### Wave 40 — Wage-to-Revenue Dashboard
**EasyRoster gap:** Per-contract profitability ratio tracking
- Calculate `wage_cost / billing_revenue` per client contract
- Client detail page: profitability % badge (green ≥70%, amber 50-69%, red <50%)
- Dashboard: Top 5 most/least profitable clients
- Report: Profitability trend over time (monthly)

---

### Wave 41 — Payroll Export (Sage/Pastel/VIP)
**EasyRoster gap:** Export to 3rd-party payroll systems
- CSV export format compatible with Sage 300, Pastel Evolution, VIP Payroll
- Column mapping configuration per payroll system
- Export includes: employee number, hours, overtime, gross pay, deductions, net pay
- Download from payroll summary page

---

### Wave 42 — Performance & Disciplinary Records
**EasyRoster gap:** Structured employee performance tracking
- Performance evaluation model: date, score (1–5), evaluator, notes, categories
- Disciplinary case model: date, type (warning/final/dismissal), reason, outcome
- Employee detail page: Performance & Disciplinary tabs
- Dashboard: Guards with recent disciplinary actions flagged

---

### Wave 43 — Client Portal (Read-only)
**Unique differentiator:** Let clients log in and view their own site data
- Separate `client_portal` role with read-only access
- Clients can view: their sites, active guards, daily attendance, recent incidents, invoices
- No access to other organisations' data
- Branded client-facing view

---

### Wave 44 — AI Absence Prediction
**From AI Enhancement Strategy**
- ML model predicting guard absence probability (7-day forecast)
- Risk score per guard: Low / Medium / High
- Dashboard alert: "3 guards at high absence risk this Friday"
- Pre-schedule backup suggestions

---

### Wave 45 — WhatsApp / SMS Notifications
**From AI Enhancement Strategy**
- Guard shift reminders via WhatsApp Business API or SMS gateway
- Leave approval/rejection notifications via WhatsApp
- Client incident alerts via SMS
- Configurable notification preferences per user

---

## AI Enhancement Roadmap (Long-term)

See `docs/archive/AI_ENHANCEMENT_STRATEGY.md` for detailed ROI calculations on:

| Feature | Priority | Est. Annual ROI |
|---------|---------|----------------|
| Intelligent Roster Optimisation | HIGH | R290,400 |
| Predictive Guard Availability | HIGH | R57,600 |
| Automated PSIRA Compliance | HIGH | R86,000 |
| Client Churn Prediction | HIGH | R510,000 |
| AI Incident Report Generation | MEDIUM | R31,920 |
| Demand Forecasting & Dynamic Pricing | MEDIUM | R1,200,000 |
| AI Virtual Assistant (WhatsApp) | LOW | R120,000 |
| Sentiment Analysis | LOW | R180,000 |

**Total projected annual ROI from AI features: R2,695,520**

---

## Completed Waves (Summary)

| Wave | Feature |
|------|---------|
| 1–7 | Foundation: multi-tenancy, auth, employees, shifts, roster MILP, payroll, billing |
| 8 | Invoice list page, PDF generator (3 SARS templates) |
| 9–15 | Certifications, leave management, incident reporting, patrol tours |
| 16–20 | Dashboard redesign, mobile app foundation |
| 21–25 | Mobile check-in GPS, mobile patrol scanner, mobile payslips |
| 26–28 | Admin dashboard, leave approval mobile, mobile incidents |
| 29 | Universal landing page, subscription tiers |
| 30 | Employee detail page + View Profile link |
| 31 | Frontend notifications centre + bell badge |
| 32 | Mobile leave balance widget |
| 33 | Site detail page |
| 34 | Client detail page |
| 35 | Mobile notification unread badge (Zustand store + tabBarBadge) |
| 36 | Personnel Blacklisting — guard-client/site restrictions |
