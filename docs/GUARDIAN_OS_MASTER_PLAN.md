# GuardianOS - Master Implementation Plan
**From: Elite Engineering Team (Meta/xAI/Nvidia Level)**
**Date:** November 12, 2025
**Status:** In Progress

---

## Mission
Transform RostraCore into **GuardianOS** - South Africa's leading AI-powered security guard management platform.

## ✅ Completed
1. **Critical Bug Fix** - Employee hours calculation now uses actual shift duration instead of hardcoded 8 hours
2. **Excel Import System** - Bulk import for employees and sites with validation
3. **Demo Preparation** - Complete Friday demo guide with sample data files
4. **PayFast Recurring Billing** - Full subscription integration with per-guard billing
5. **Client-Specific Rosters** - API endpoint `/api/v1/roster/generate-for-client/{client_id}` implemented
6. **Subscription Service** - Complete subscription lifecycle management (create, pause, cancel)
7. **Organization Subscription Fields** - Database schema updated with PayFast subscription tracking

---

## 🎯 Active Sprint: Week 1 Foundation

### Priority 1: Branding (2 hours)
- [ ] Update backend config (`APP_NAME = "GuardianOS"`)
- [ ] Rebrand landing page
- [ ] Update pricing page
- [ ] Change dashboard headers
- [ ] Update email templates

### Priority 2: 14-Day Trial System (4 hours)
**Backend:**
- [ ] Add `trial_start_date`, `trial_end_date` to Organization model
- [ ] Create `TrialService` class
- [ ] Daily cron job to check trial expiration
- [ ] Email reminders (Day 7, 12, 14)
- [ ] Auto-convert to paid after trial

**Frontend:**
- [ ] Trial countdown banner
- [ ] "Upgrade Now" modal
- [ ] Feature limit warnings

### Priority 3: PayFast Recurring Billing ✅ COMPLETE
- [x] Extend PayFast integration for subscriptions
- [x] Per-guard billing calculation (`active_guards × R45`)
- [x] Subscription lifecycle (create, pause, unpause, cancel)
- [ ] Invoice generation service (PDF)
- [ ] Payment history UI
- [ ] Failed payment handling (dunning)

### Priority 4: Client-Specific Rosters ✅ COMPLETE
- [ ] Add client dropdown to roster wizard (frontend)
- [ ] Filter sites by selected client (frontend)
- [ ] Save client-specific templates (frontend)
- [x] API endpoint: `/api/v1/roster/generate-for-client/{client_id}`

---

## 🚀 Priority 5: Guard Mobile App (React Native Expo)

### App Architecture
```
guardian-guard-app/
├── app/                    # Expo Router
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── pin-setup.tsx
│   ├── (tabs)/
│   │   ├── index.tsx      # Today's Shifts
│   │   ├── schedule.tsx
│   │   ├── reports.tsx
│   │   └── profile.tsx
│   ├── shift/[id].tsx
│   ├── check-in.tsx
│   ├── check-out.tsx
│   ├── incident-report.tsx
│   ├── ob-report.tsx      # Occurrence Book
│   └── patrol.tsx
├── components/
│   ├── ShiftCard.tsx
│   ├── GPSCheckIn.tsx
│   ├── ReportForm.tsx
│   └── PatrolScanner.tsx
└── services/
    ├── api.ts
    ├── auth.ts
    ├── gps.ts
    └── offline.ts
```

### Core Features

#### 1. GPS Check-In/Out
- Verify guard is within 200m of site
- Photo capture on check-in
- Offline support (queue when offline)
- Early/late flagging

#### 2. Incident Reports
**Fields:**
- Incident type (security breach, medical, fire, etc.)
- Date/time
- Location (GPS + description)
- Detailed narrative
- Actions taken
- Witnesses (names, contacts)
- Injuries (yes/no + details)
- Police notified (case number)
- Photos (up to 5)
- Video (up to 60 seconds)
- Signatures (guard + witnesses)

#### 3. OB (Occurrence Book) Reports
**Categories:**
- Visitor Log (name, ID, time in/out)
- Key Handover (keys issued/returned)
- Alarm Activations (zone, response)
- Patrol Completed (areas checked)
- Equipment Status (working/faulty)
- General Observations

**Features:**
- Time-stamped entries
- Photo attachments (up to 3)
- Supervisor review flag
- Quick entry templates

#### 4. Shift Posts & Patrols
- Assigned patrol routes per site
- QR code checkpoint scanning
- NFC tag scanning (optional)
- Timed patrol reminders
- Patrol history log

#### 5. Supervisor Features (Role-Based)
- Live guard tracking (map view)
- Approve incident reports
- Review OB entries
- Assign emergency tasks
- Broadcast messages to all guards

---

## Mobile App API Endpoints

### Authentication
```
POST   /api/v1/mobile/auth/login
POST   /api/v1/mobile/auth/pin-login
POST   /api/v1/mobile/auth/refresh
POST   /api/v1/mobile/auth/setup-pin
```

### Shifts
```
GET    /api/v1/mobile/shifts/today
GET    /api/v1/mobile/shifts/upcoming
GET    /api/v1/mobile/shifts/{id}
POST   /api/v1/mobile/shifts/{id}/check-in
POST   /api/v1/mobile/shifts/{id}/check-out
```

### OB Reports
```
POST   /api/v1/mobile/ob/entries
GET    /api/v1/mobile/ob/entries
GET    /api/v1/mobile/ob/categories
POST   /api/v1/mobile/ob/{id}/photos
```

### Incident Reports
```
POST   /api/v1/mobile/incidents
GET    /api/v1/mobile/incidents
POST   /api/v1/mobile/incidents/{id}/photos
POST   /api/v1/mobile/incidents/{id}/video
POST   /api/v1/mobile/incidents/{id}/signatures
```

### Patrols
```
GET    /api/v1/mobile/patrols/routes
POST   /api/v1/mobile/patrols/scan
GET    /api/v1/mobile/patrols/history
```

### Supervisor
```
GET    /api/v1/mobile/supervisor/guards-on-duty
GET    /api/v1/mobile/supervisor/locations
POST   /api/v1/mobile/supervisor/broadcast
GET    /api/v1/mobile/supervisor/incidents/pending
```

---

## Tech Stack

### Backend (FastAPI)
- Python 3.13
- PostgreSQL
- Redis (caching + Celery)
- Google OR-Tools (roster optimization)
- PayFast API
- SendGrid (emails)

### Frontend (Next.js)
- React 18
- TypeScript
- Tailwind CSS
- Zustand (state)
- React Query (API cache)

### Mobile (React Native Expo)
- Expo SDK 50
- Expo Router (navigation)
- React Native Paper (UI)
- Zustand (state)
- Expo Location (GPS)
- Expo Camera (photos/video)
- Expo Barcode Scanner (QR/NFC)

---

## Implementation Timeline

### Week 1: Foundation ✅
- [x] Fix employee hours calculation
- [ ] Rebrand to GuardianOS
- [ ] 14-day trial system
- [ ] PayFast recurring billing
- [ ] Client-specific rosters

### Week 2: Mobile MVP
- [ ] Scaffold React Native app
- [ ] Authentication (login + PIN)
- [ ] Today's shifts view
- [ ] GPS check-in/out
- [ ] Basic OB entry

### Week 3: Reports & Patrols
- [ ] Full incident report form
- [ ] Photo/video upload
- [ ] OB categories & templates
- [ ] Patrol QR scanning
- [ ] Offline sync

### Week 4: Supervisor & Polish
- [ ] Supervisor dashboard (web)
- [ ] Live guard tracking
- [ ] Push notifications
- [ ] Performance optimization
- [ ] App store prep

---

## Success Metrics

**Trial Conversion:**
- Target: 40% trial → paid
- Track: Feature usage, trial day engagement

**Mobile Adoption:**
- Target: 80% guards use app daily
- Track: Check-ins, report submissions

**Roster ROI:**
- Target: 15% labor cost savings
- Track: Algorithm efficiency, unfilled shifts

**Revenue:**
- Target: R100K MRR by Month 6
- Calculation: 2,000 guards × R45/month

---

## Competitive Advantage

| Feature | GuardianOS | Deputy | Shift Admin |
|---------|-----------|---------|-------------|
| **AI Rostering** | ✅ 3 algorithms | ❌ Manual | ❌ Basic |
| **PSIRA Compliance** | ✅ Built-in | ❌ Not SA | ⚠️ Partial |
| **Mobile App** | ✅ OB + Patrols | ✅ Basic | ❌ None |
| **Per-Guard Billing** | ✅ R45/guard | ❌ Flat fee | ❌ Flat fee |
| **14-Day Trial** | ✅ No CC | ⚠️ Limited | ⚠️ Demo only |
| **Price** | R499-R2,499 | R800+ | R299 |

---

## Next Steps

1. ✅ Confirm plan approval
2. 🔄 Complete Week 1 foundation
3. ⏭️ Scaffold React Native app
4. ⏭️ Build mobile APIs

---

**Lead Engineer:** Claude (AI Engineering Specialist)
**Target Launch:** December 15, 2025
**Current Phase:** Week 1 - Foundation

