# Roadmap: RostraCore Universal Transformation

## Overview

Transformation from specialized security guard rostering platform to universal workforce management system serving ANY business type (restaurant, petrol station, factory, NGO, municipality, hospital, retail, etc.) across multiple countries. 15 phases across 5 milestones, delivering biometric-verified attendance, ghost worker detection, multi-country compliance, and industry-specific templates.

## Phases

**Phase Numbering:**
- Integer phases (0, 1, 2, 3...): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 0: Universal Foundation & Industry Templates** - Make system work for ANY business type
- [x] **Phase 0.1: Desktop-First Architecture** - Desktop Tauri app with full offline mode (COMPLETE 2026-02-04)
- [x] **Phase 0.2: Localization & Multi-Country Compliance** - Support ANY country's currency, tax, labor laws, language (COMPLETE 2026-02-05)
- [ ] **Phase 1: Biometric Integration Foundation** - Hardware terminals + phone-based facial recognition
- [ ] **Phase 2: Ghost Worker Detection Engine** - Anomaly detection algorithms to flag ghost employees
- [ ] **Phase 3: Organizational Structure & Hierarchy** - Multi-level org structures, departments, reporting lines
- [ ] **Phase 4: Risk Management Module** - Incident reporting, employee risk scoring, background checks
- [ ] **Phase 5: Asset Management System** - Equipment tracking, lifecycle management, depreciation
- [ ] **Phase 6: Asset Barcode/RFID Integration** - Physical asset audits via barcode/RFID scanning
- [ ] **Phase 7: Document Management System** - Centralized file storage, version control, RBAC
- [ ] **Phase 8: Approval Workflows & Digital Signatures** - Multi-level approval routing, e-signatures
- [ ] **Phase 9: Segregation of Duties (SoD) Enforcement** - Prevent collusion via SoD matrix
- [ ] **Phase 10: Machine Learning - Anomaly Detection** - ML models for ghost detection, turnover prediction
- [ ] **Phase 11: GenAI Applications** - LLM-powered document classification, incident summaries, compliance chatbot
- [ ] **Phase 12: Advanced Analytics & Executive Dashboards** - Industry-specific workforce analytics
- [ ] **Phase 13: Extension Marketplace & API Ecosystem** - Third-party developers build industry modules
- [ ] **Phase 14: Self-Hosted & White-Label Deployment** - On-premise deployment for government/enterprise
- [ ] **Phase 15: Training Academy & Certification Program** - In-app training, certification tracks, live support

## Phase Details

### Phase 0: Universal Foundation & Industry Templates
**Goal**: Make system work for ANY business type (restaurant, petrol station, factory, NGO, municipality, etc.), not just security companies
**Depends on**: Nothing (foundational phase)
**Requirements**: UNIVERSAL-01, UNIVERSAL-02, UNIVERSAL-03, UNIVERSAL-04, UNIVERSAL-05, UNIVERSAL-06
**Success Criteria** (what must be TRUE):
  1. Restaurant owner selects "Hospitality" → System loads waiter/chef roles, 6-8h shifts, food handler cert requirements
  2. Petrol station owner selects "Retail" → System loads cashier roles, fuel reconciliation tracking, cash register shifts
  3. NGO coordinator selects "Non-Profit" → System loads volunteer tracking, donor reporting, project-based time
  4. Municipality selects "Government" → System loads department hierarchy, procurement workflows, citizen service metrics
  5. User completes setup wizard in < 5 minutes (proven via usability testing)
  6. System scales: Works for 5-employee restaurant AND 5,000-employee municipality
**Plans**: 3 plans

Plans:
- [ ] 00-01-PLAN.md — Industry template engine & database schema (Wave 1)
- [ ] 00-02-PLAN.md — Setup wizard UI with industry selection (Wave 2, depends on 00-01)
- [ ] 00-03-PLAN.md — Multi-level tenancy architecture (Wave 2, depends on 00-01)

---

### Phase 0.1: Desktop-First Architecture
**Goal**: Desktop Tauri app with full offline mode for office-based users. Roster changes and attendance approval work without internet.
**Depends on**: Phase 0
**Requirements**: DESKTOP-01, DESKTOP-02, DESKTOP-03, DESKTOP-04, DESKTOP-05
**Success Criteria** (what must be TRUE):
  1. Desktop app caches employee, roster, and attendance data to local SQLite database
  2. Roster changes (reassign shifts) work offline and queue for sync when connection returns
  3. Attendance approval works offline and syncs automatically
  4. UI shows clear offline/online status with yellow banner when offline
  5. Employee changes and payroll processing blocked when offline (require connection)
  6. Manual "Sync Now" button triggers immediate queue replay
**Plans**: 5 plans

Plans:
- [x] 00.1-01: SQLite local database with tauri-plugin-sql (Wave 1)
- [x] 00.1-02: React Query offline-aware persistence (Wave 1)
- [x] 00.1-03: Offline data hooks with SQLite fallback (Wave 2, depends on 00.1-01, 00.1-02)
- [x] 00.1-04: Mutation queue and sync manager (Wave 2, depends on 00.1-01, 00.1-02)
- [x] 00.1-05: Offline UI components (Wave 3, depends on 00.1-03, 00.1-04)

---

### Phase 0.2: Localization & Multi-Country Compliance
**Goal**: Support ANY country's currency, tax system, labor laws, language. Not just South Africa.
**Depends on**: Phase 0
**Requirements**: LOCALE-01, LOCALE-02, LOCALE-03, LOCALE-04, LOCALE-05, LOCALE-06
**Success Criteria** (what must be TRUE):
  1. User selects "South Africa" → System loads ZAR currency, PAYE/UIF tax, BCEA compliance (48h week)
  2. User selects "USA" → System loads USD currency, Federal/State tax, FLSA compliance (40h week, overtime)
  3. User selects "Nigeria" → System loads NGN currency, Nigeria PAYE, Labour Act compliance
  4. Payroll calculates correctly for 5+ countries (verified via test cases)
  5. UI displays in user's language (auto-detect browser language, allow manual override)
  6. Adding new country = upload JSON config (no code changes)
**Plans**: 4 plans

Plans:
- [x] 00.2-01: Country config foundation + DB models + currency formatting (Wave 1)
- [x] 00.2-02: Internationalization (i18n) framework with next-intl (Wave 1)
- [x] 00.2-03: Tax engine + labor law engine TDD (Wave 2, depends on 00.2-01)
- [x] 00.2-04: Exchange rate service + payroll integration (Wave 2, depends on 00.2-01)

---

### Phase 1: Biometric Integration Foundation (Hardware + Phone)
**Goal**: Multi-modal attendance verification with phone-based facial recognition, hardware fingerprint (WebAuthn), and GPS-only geofence validation. HR enrolls employees, employees clock in with adaptive thresholds, attendance tracked with confidence scores.
**Depends on**: Phase 0.1 (desktop architecture), Phase 0.2 (localization)
**Requirements**: BIOMETRIC-01, BIOMETRIC-02, BIOMETRIC-03, BIOMETRIC-04
**Success Criteria** (what must be TRUE):
  1. **Hardware option**: Guard clocks in using fingerprint scanner at designated site (< 2 sec verification)
  2. **Phone option**: Waiter clocks in using phone camera facial recognition (< 3 sec verification)
  3. **Budget option**: Cashier clocks in using phone app + GPS only (no biometric, geofence validation)
  4. GPS coordinates validate employee is within geofence (200m radius with accuracy buffer)
  5. Attendance event logged with timestamp, biometric confidence, GPS, device type
  6. Payroll system pulls verified attendance (not manual sheets)
  7. Works for: Security guard, restaurant waiter, petrol station cashier, factory worker, NGO volunteer
**Plans**: 6 plans

Plans:
- [ ] 01-01-PLAN.md — DB models (biometric templates, attendance records, geofences) + Alembic migration + geofence utility (Wave 1)
- [ ] 01-02-PLAN.md — Verification engine + adaptive thresholds TDD (Wave 2, depends on 01-01)
- [ ] 01-03-PLAN.md — Enrollment service with DeepFace + pgcrypto encryption + liveness detection (Wave 2, depends on 01-01)
- [ ] 01-04-PLAN.md — Clock-in API endpoints + attendance endpoints + Pydantic schemas (Wave 3, depends on 01-02, 01-03)
- [ ] 01-05-PLAN.md — Frontend enrollment UI with face-api.js + real-time quality feedback (Wave 4, depends on 01-04)
- [ ] 01-06-PLAN.md — Frontend clock-in flow + geolocation + attendance dashboard + HR review queue (Wave 4, depends on 01-04)

---

### Phase 2: Ghost Worker Detection Engine
**Goal**: Implement anomaly detection algorithms to flag potential ghost employees
**Depends on**: Phase 1 (requires biometric attendance data)
**Requirements**: GHOST-01, GHOST-02, GHOST-03, GHOST-04, GHOST-05
**Success Criteria** (what must be TRUE):
  1. System flags employee with duplicate ID numbers across orgs
  2. Alert generated when employee paid but zero biometric activity for 30 days
  3. System rejects second clock-in if physically impossible (distance/time)
  4. Finance dashboard shows "Ghost Worker Risk Score" per employee
  5. Cannot create employee without biometric enrollment (prevents collusion)
**Plans**: 4 plans

Plans:
- [ ] 02-01: Duplicate detection algorithm (Sizwe leads)
- [ ] 02-02: Attendance anomaly detection (Sizwe leads)
- [ ] 02-03: Collusion prevention workflow (Refilwe + Steve lead)
- [ ] 02-04: Ghost worker dashboard (Prince + Sizwe lead)

---

### Phase 3: Organizational Structure & Hierarchy
**Goal**: Extend employee model to support multi-level org structures, departments, reporting lines
**Depends on**: Phase 2
**Requirements**: ORG-01, ORG-02, ORG-03, ORG-04, ORG-05
**Success Criteria** (what must be TRUE):
  1. HR manager can create departments with sub-departments (3+ levels deep)
  2. Employee has assigned supervisor with visible reporting chain
  3. Org chart visualization shows full hierarchy
  4. Position can be vacant or filled (FTE tracking)
  5. Payroll costs rolled up by department and cost center
**Plans**: 2 plans

Plans:
- [ ] 03-01: Organizational structure data model (Refilwe + Steve lead)
- [ ] 03-02: Org chart UI visualization (Prince leads)

---

### Phase 4: Risk Management Module
**Goal**: Add incident reporting, employee risk scoring, background check integration
**Depends on**: Phase 3 (requires org structure for incident assignments)
**Requirements**: RISK-01, RISK-02, RISK-03, RISK-04, RISK-05
**Success Criteria** (what must be TRUE):
  1. Site manager can submit incident report from mobile app with photo attachment
  2. Incident routed to appropriate investigation team based on category
  3. Employee risk score calculated (criminal history + incident history + cert expiry)
  4. HR dashboard shows high-risk employees flagged
  5. Cannot assign high-risk employee to restricted client/site
**Plans**: 3 plans

Plans:
- [ ] 04-01: Incident data model and API (Steve leads)
- [ ] 04-02: Incident reporting UI (Prince leads)
- [ ] 04-03: Risk scoring algorithm (Sizwe + Refilwe lead)

---

### Phase 5: Asset Management System
**Goal**: Track equipment assigned to employees, lifecycle management, depreciation
**Depends on**: Phase 3 (requires employee/org structure)
**Requirements**: ASSET-01, ASSET-02, ASSET-03, ASSET-04, ASSET-05
**Success Criteria** (what must be TRUE):
  1. HR assigns uniform, radio, firearm to new guard with serial numbers logged
  2. Asset location tracked (employee X, storage Y, or repair Z)
  3. Maintenance schedule reminder sent 30 days before service due
  4. Depreciation auto-calculated monthly (straight-line or accelerated)
  5. Employee offboarding checklist blocks completion until all assets returned
**Plans**: 3 plans

Plans:
- [ ] 05-01: Asset data model and assignment logic (Steve leads)
- [ ] 05-02: Asset lifecycle tracking (Refilwe leads)
- [ ] 05-03: Asset management UI (Prince leads)

---

### Phase 6: Asset Barcode/RFID Integration
**Goal**: Physical asset audits via barcode scanning, RFID tracking
**Depends on**: Phase 5
**Requirements**: ASSET-06, ASSET-07, ASSET-08, ASSET-09
**Success Criteria** (what must be TRUE):
  1. Asset manager can print barcode labels for equipment
  2. Mobile app scans barcode and updates asset location
  3. RFID reader detects assets in storage room (bulk scan)
  4. Audit report shows missing/misplaced assets
  5. Discrepancy workflow routes to finance for write-off approval
**Plans**: 2 plans

Plans:
- [ ] 06-01: Barcode/RFID device integration API (John leads)
- [ ] 06-02: Mobile asset audit app (Prince leads)

---

### Phase 7: Document Management System
**Goal**: Centralized employee file storage, version control, role-based access
**Depends on**: Phase 3 (requires org structure for RBAC)
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, DOC-06
**Success Criteria** (what must be TRUE):
  1. HR uploads employee contract (PDF) with automatic version tracking
  2. Only HR and legal roles can view medical records (RBAC enforced)
  3. Document download logged with timestamp and user ID
  4. Full-text search finds "firearm competency" across all certs
  5. Deleted documents retained for 5 years (compliance), then auto-purged
**Plans**: 3 plans

Plans:
- [ ] 07-01: Document storage service (Steve leads)
- [ ] 07-02: RBAC and access audit (Steve + Refilwe lead)
- [ ] 07-03: Document management UI (Prince leads)

---

### Phase 8: Approval Workflows & Digital Signatures
**Goal**: Multi-level approval routing, electronic signatures, workflow automation
**Depends on**: Phase 7
**Requirements**: WORKFLOW-01, WORKFLOW-02, WORKFLOW-03, WORKFLOW-04, WORKFLOW-05
**Success Criteria** (what must be TRUE):
  1. Employment contract requires HR signature → Legal review → CEO approval
  2. Approval task routed to next approver automatically
  3. Employee signs offer letter electronically (legally binding)
  4. Overdue approvals escalate to manager after 48 hours
  5. Finance can bulk-approve 50 expense claims in single action
**Plans**: 2 plans

Plans:
- [ ] 08-01: Approval workflow engine (Steve leads)
- [ ] 08-02: Digital signature integration (Steve + Prince lead)

---

### Phase 9: Segregation of Duties (SoD) Enforcement
**Goal**: Prevent collusion by enforcing separation between create/approve/pay functions
**Depends on**: Phase 8 (requires approval workflows)
**Requirements**: SOD-01, SOD-02, SOD-03, SOD-04, SOD-05
**Success Criteria** (what must be TRUE):
  1. System prevents same user having both "Create Employee" and "Approve Payroll" permissions
  2. Alert generated when user attempts conflicting transaction
  3. SoD exception requires VP approval with documented reason
  4. Audit report shows all SoD violations and exceptions
  5. Cannot circumvent by switching roles (cross-session check)
**Plans**: 2 plans

Plans:
- [ ] 09-01: SoD matrix enforcement engine (Steve leads)
- [ ] 09-02: SoD compliance dashboard (Refilwe + Prince lead)

---

### Phase 10: Machine Learning - Anomaly Detection Models
**Goal**: Deploy ML models for ghost employee detection, turnover prediction, fraud scoring
**Depends on**: Phase 2 (requires historical data from ghost detection)
**Requirements**: ML-01, ML-02, ML-03, ML-04, ML-05
**Success Criteria** (what must be TRUE):
  1. ML model flags employee with anomalous attendance (trained on 90-day history)
  2. Duplicate identity detected when biometric embedding similarity > 95%
  3. Fraud score (0-1) displayed on employee profile with explanation (SHAP values)
  4. Predicted turnover list generated weekly with 70%+ accuracy
  5. Model retraining triggered when accuracy drops below 65%
**Plans**: 3 plans

Plans:
- [ ] 10-01: ML feature engineering pipeline (Sizwe leads)
- [ ] 10-02: Model training and deployment (Sizwe leads)
- [ ] 10-03: Model monitoring dashboard (Sizwe + Prince lead)

---

### Phase 11: GenAI Applications
**Goal**: LLM-powered document classification, incident summarization, compliance Q&A
**Depends on**: Phase 7 (requires document repository)
**Requirements**: GENAI-01, GENAI-02, GENAI-03, GENAI-04
**Success Criteria** (what must be TRUE):
  1. Uploaded document auto-tagged as "Employment Contract" with 90%+ accuracy
  2. Incident report summarized in 2-3 sentences for executive dashboard
  3. User asks "What is max overtime per week?" → Chatbot responds "12 hours (BCEA Section 9)"
  4. Anomaly flag includes plain English explanation: "Employee clocked in at Site A and Site B 10 minutes apart, physically impossible"
**Plans**: 2 plans

Plans:
- [ ] 11-01: Document classification model (Sizwe leads)
- [ ] 11-02: Compliance chatbot (RAG system) (Sizwe leads)

---

### Phase 12: Advanced Analytics & Executive Dashboards (Industry-Specific)
**Goal**: Workforce analytics, predictive insights, compliance scorecards for C-suite
**Depends on**: Phase 10 (requires ML models)
**Requirements**: ANALYTICS-01, ANALYTICS-02, ANALYTICS-03, ANALYTICS-04, ANALYTICS-05, ANALYTICS-06
**Success Criteria** (what must be TRUE):
  1. CEO dashboard shows: Headcount trend (last 12 months), Turnover rate, Ghost worker risk score, Compliance %
  2. Heat map visualizes: Site x Time = Attendance fill rate
  3. System recommends: "Hire 5 more guards for Q4 based on demand forecast"
  4. Compliance heat map highlights: "Department X has 12 expired certifications (high risk)"
  5. Finance can build custom report: "Labor cost by client, filtered by last quarter"
**Plans**: 3 plans

Plans:
- [ ] 12-01: Analytics data warehouse + custom report builder (Steve + Sizwe lead)
- [ ] 12-02: Industry-agnostic executive dashboards (Prince + Sizwe lead)
- [ ] 12-03: Industry-specific dashboard templates (Refilwe + Prince + Sizwe lead)

---

### Phase 13: Extension Marketplace & API Ecosystem
**Goal**: Enable third-party developers to build industry-specific modules. We can't build everything - let partners extend the platform.
**Depends on**: Phase 12 (analytics foundation)
**Requirements**: MARKETPLACE-01, MARKETPLACE-02, MARKETPLACE-03, MARKETPLACE-04, MARKETPLACE-05, MARKETPLACE-06
**Success Criteria** (what must be TRUE):
  1. Third-party developer can build extension using public API (documented, tested)
  2. Developer submits extension to marketplace (automated review process)
  3. Client browses marketplace, installs "Restaurant Module" with one click
  4. Extension integrates seamlessly (uses RostraCore auth, data models, UI framework)
  5. Developer receives 70% of extension subscription revenue
  6. 10+ extensions live in marketplace within 6 months of launch
**Plans**: 2 plans

Plans:
- [ ] 13-01: Public API + developer portal (Steve leads)
- [ ] 13-02: Marketplace platform + 3 example extensions (Steve + Refilwe + Prince lead)

---

### Phase 14: Self-Hosted & White-Label Deployment
**Goal**: Support government/enterprise clients who require on-premise deployment or custom branding
**Depends on**: Phase 13 (API ecosystem complete)
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05, DEPLOY-06
**Success Criteria** (what must be TRUE):
  1. Government client runs `./install.sh` on their servers → Full RostraCore deployment in 30 minutes
  2. White-label client configures custom domain `hr.petrolchain.co.za`, uploads logo → Branded instance live
  3. Data residency: South African client's data NEVER leaves South African servers (POPIA compliance)
  4. Air-gapped: Military base with no internet can deploy and run (USB installation media)
  5. Updates: New version released → Client runs `docker-compose pull && docker-compose up -d` → Updated with zero downtime
**Plans**: 2 plans

Plans:
- [ ] 14-01: Docker + Kubernetes packaging (Steve leads)
- [ ] 14-02: White-label configuration + multi-region deployment (Steve leads)

---

### Phase 15: Training Academy & Certification Program
**Goal**: "Leave people happier than when we entered" - comprehensive training built into the system
**Depends on**: Phase 14 (full platform complete)
**Requirements**: TRAINING-01, TRAINING-02, TRAINING-03, TRAINING-04, TRAINING-05, TRAINING-06
**Success Criteria** (what must be TRUE):
  1. New user logs in → 3-minute welcome video auto-plays (skippable)
  2. First-time actions → Tooltip overlay guides user (e.g., "Click here to add your first employee")
  3. Admin completes certification course → Badge displayed on profile
  4. User stuck → Clicks "Help" → Live chat connects within 2 minutes
  5. Search "How do I approve overtime?" → Video tutorial + step-by-step guide
  6. Client satisfaction survey: 90%+ report "Easy to learn, helpful training"
**Plans**: 2 plans

Plans:
- [ ] 15-01: Training content creation + certification platform (Refilwe + Prince lead)
- [ ] 15-02: In-app help system + live chat integration (Prince + Steve lead)

---

## Progress

**Execution Order:**
Phases execute in numeric order: 0 → 0.1 → 0.2 → 1 → 2 → 3... → 15

**Milestones:**
- **v0.5 Universal Foundation** (Phases 0-0.2): Industry templates + mobile-first + localization
- **v1.0 Biometric Verification** (Phases 1-3): Multi-modal biometric + ghost worker detection
- **v1.5 Risk & Assets** (Phases 4-6): Risk management + asset tracking modules
- **v2.0 Documents & Compliance** (Phases 7-9): File management + approval workflows
- **v2.5 Advanced Analytics** (Phases 10-15): ML models + predictive insights + marketplace

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Universal Foundation | 3/3 | Complete | 2026-02-04 |
| 0.1. Desktop-First | 5/5 | Complete | 2026-02-04 |
| 0.2. Localization | 4/4 | Complete | 2026-02-05 |
| 1. Biometric Integration | 0/6 | Not started | - |
| 2. Ghost Worker Detection | 0/4 | Not started | - |
| 3. Org Structure | 0/2 | Not started | - |
| 4. Risk Management | 0/3 | Not started | - |
| 5. Asset Management | 0/3 | Not started | - |
| 6. Asset Barcode/RFID | 0/2 | Not started | - |
| 7. Document Management | 0/3 | Not started | - |
| 8. Approval Workflows | 0/2 | Not started | - |
| 9. SoD Enforcement | 0/2 | Not started | - |
| 10. Machine Learning | 0/3 | Not started | - |
| 11. GenAI Applications | 0/2 | Not started | - |
| 12. Advanced Analytics | 0/3 | Not started | - |
| 13. Extension Marketplace | 0/2 | Not started | - |
| 14. Self-Hosted Deployment | 0/2 | Not started | - |
| 15. Training Academy | 0/2 | Not started | - |

---

*Roadmap Version*: 1.3
*Created*: 2026-02-04
*Last Updated*: 2026-02-05
