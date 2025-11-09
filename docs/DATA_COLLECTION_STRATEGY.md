# Data Collection Strategy - RostraCore

**Author:** Multi-disciplinary Expert Panel
**Date:** 2025-11-09
**Purpose:** Comprehensive strategy for collecting user data to inform product decisions

---

## Overview

This document outlines RostraCore's data collection strategy designed to gather actionable insights while respecting user privacy and maintaining POPIA compliance.

**Core Principle:** *Data should drive decisions, not assumptions.*

---

## Table of Contents

1. [Data Collection Tools](#data-collection-tools)
2. [What We Track](#what-we-track)
3. [Privacy & Compliance](#privacy--compliance)
4. [Implementation Guide](#implementation-guide)
5. [Dashboard & Insights](#dashboard--insights)
6. [Action Plan](#action-plan)

---

## Data Collection Tools

### 1. **Heatmaps & Session Recordings**

**Tools:** Hotjar, Mouseflow

**Purpose:**
- Visual representation of user interactions
- Identify UX friction points
- Understand user behavior patterns
- Watch actual user sessions (with consent)

**What We Learn:**
- Where users click (click maps)
- How far users scroll (scroll maps)
- Where users get stuck (session recordings)
- Form abandonment points

**Implementation:**
```typescript
import { dataCollection } from '@/lib/dataCollection';

// Auto-initialized on app load
dataCollection.initHotjar();
dataCollection.initMouseflow();

// Tag sessions for easy filtering
dataCollection.tagSession({
  plan: 'professional',
  onboarding_complete: true,
});
```

**Configuration:**
```bash
# .env.local
NEXT_PUBLIC_HOTJAR_SITE_ID=your_site_id
NEXT_PUBLIC_MOUSEFLOW_SITE_ID=your_site_id
```

---

### 2. **Feature Usage Tracking**

**Purpose:**
- Track which features are actually used
- Measure feature adoption rates
- Identify underused features
- Guide product roadmap

**What We Track:**
- Feature access frequency
- Time spent per feature
- User count per feature
- Feature combinations (workflows)

**Implementation:**
```typescript
import { dataCollection } from '@/lib/dataCollection';

// Track feature usage
dataCollection.trackFeatureUsage('roster_generation', {
  roster_type: 'weekly',
  guards_count: 12,
  generation_time_seconds: 23,
});
```

**Metrics Collected:**
- Unique users per feature
- Sessions per feature
- Average time spent
- Trend (up/down/stable)
- Correlation with retention

---

### 3. **Conversion Funnel Analysis**

**Purpose:**
- Identify where users drop off
- Optimize conversion rates
- Find friction points in user journey
- Measure impact of changes

**Funnels Tracked:**
1. **Signup Funnel**
   - Landing Page → Pricing → Signup → Email Verified → Onboarding → Paid

2. **Onboarding Funnel**
   - Start → Add Employees → Create Site → Generate Roster → Invite Team → Connect Accounting

3. **Marketplace Funnel**
   - View → Search → Profile → Contact → Hire

**Implementation:**
```typescript
import { dataCollection } from '@/lib/dataCollection';

// Track funnel step
dataCollection.trackFunnelStep(
  'signup_funnel',
  3,
  'email_verified',
  true,
  { verification_time_seconds: 45 }
);
```

---

### 4. **User Feedback Collection**

**Tools:** Custom FeedbackWidget, QuickFeedback

**Purpose:**
- Collect qualitative insights
- Understand user pain points
- Identify feature requests
- Track sentiment

**Collection Methods:**

**a) Feedback Widget**
- General feedback
- Bug reports
- Feature requests
- Triggered after key moments

**b) Quick Emoji Feedback**
- Simple emotion reactions
- Minimal friction
- After completing tasks

**c) NPS Surveys**
- Triggered after 14/30/90 days
- Measures customer loyalty
- Identifies promoters vs detractors

**Implementation:**
```typescript
import { FeedbackWidget, QuickFeedback, NPSSurvey } from '@/design-system/components';

// Feedback widget (bottom-right trigger)
<FeedbackWidget
  trigger="button"
  position="bottom-right"
  onFeedbackSubmit={async (feedback) => {
    await fetch('/api/feedback', {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
  }}
/>

// Quick emoji feedback
<QuickFeedback
  question="How was your experience generating that roster?"
  onFeedback={(emoji) => console.log('User selected:', emoji)}
/>

// NPS Survey (auto-trigger after 14 days)
<NPSSurvey
  triggerAfterDays={14}
  onComplete={async (score, feedback) => {
    await submitNPS(score, feedback);
  }}
/>
```

---

### 5. **Form Analytics**

**Purpose:**
- Track form abandonment
- Identify problematic fields
- Measure completion rates
- Optimize conversion

**What We Track:**
- Form started
- Field focused/blurred
- Time per field
- Abandoned forms
- Successful submissions

**Implementation:**
```typescript
import { dataCollection } from '@/lib/dataCollection';

// Track form interactions
dataCollection.trackFormInteraction('signup_form', 'started');
dataCollection.trackFormInteraction('signup_form', 'field_focused', 'email');
dataCollection.trackFormInteraction('signup_form', 'submitted');
```

---

### 6. **Scroll Depth & Time Tracking**

**Purpose:**
- Measure content engagement
- Identify boring sections
- Optimize page length
- Understand reading behavior

**What We Track:**
- Scroll depth (25%, 50%, 75%, 100%)
- Time on page
- Active vs idle time
- Return visits

**Implementation:**
```typescript
import { useScrollDepthTracking, useTimeOnPageTracking } from '@/lib/dataCollection';

function LandingPage() {
  // Auto-track scroll depth
  useScrollDepthTracking('Landing Page');

  // Auto-track time on page
  useTimeOnPageTracking('Landing Page');

  return <div>...</div>;
}
```

---

## What We Track

### User Journey Events

| Event | When | Why |
|-------|------|-----|
| `page_viewed` | Every page load | Traffic analysis |
| `cta_clicked` | CTA button clicked | Conversion tracking |
| `video_played` | Demo video played | Engagement |
| `language_switched` | EN/AF toggle | Language preference |
| `signup_started` | Signup form opened | Funnel entry |
| `signup_completed` | Account created | Conversion |
| `onboarding_started` | Onboarding begins | Activation funnel |
| `onboarding_step_completed` | Each step done | Step completion rates |
| `roster_generated` | Roster created | Core feature usage |
| `employee_added` | Employee added | Feature adoption |
| `nps_survey_completed` | NPS submitted | Customer satisfaction |
| `feedback_submitted` | Feedback given | Product insights |

### User Properties

| Property | Type | Purpose |
|----------|------|---------|
| `user_id` | string | Unique identifier |
| `email` | string | Contact |
| `plan` | string | Subscription tier |
| `signup_date` | date | Cohort analysis |
| `trial_end_date` | date | Conversion prediction |
| `company_size` | number | Segmentation |
| `guards_count` | number | Usage indicator |
| `language` | string | Localization |
| `onboarding_complete` | boolean | Activation status |

---

## Privacy & Compliance

### POPIA Compliance

**Personal Information Protection Act (South Africa)**

✅ **We DO:**
- Explicitly request consent for tracking
- Allow users to opt-out easily
- Store data in South Africa
- Encrypt all personal data
- Provide data deletion on request
- Maintain transparent privacy policy

❌ **We DON'T:**
- Track without consent
- Share data with third parties (except processors)
- Store sensitive data unnecessarily
- Track users who opted out

### Opt-Out Mechanism

```typescript
import { dataCollection } from '@/lib/dataCollection';

// User opts out
dataCollection.optOut();

// Check opt-out status
if (dataCollection.hasOptedOut()) {
  // Don't track
}
```

**UI Component:**
```typescript
<button onClick={() => {
  dataCollection.optOut();
  alert('You have opted out of tracking');
}}>
  Opt Out of Tracking
</button>
```

### Data Retention

- **Analytics events:** 90 days
- **Session recordings:** 30 days (or until reviewed)
- **Feedback:** Indefinitely (anonymized after 1 year)
- **NPS scores:** Indefinitely (for trend analysis)

---

## Implementation Guide

### Step 1: Initialize Services

In your root layout or `_app.tsx`:

```typescript
import { dataCollection } from '@/lib/dataCollection';
import { analytics } from '@/lib/analytics';

// Auto-initialized on import, respects opt-out
```

### Step 2: Track Page Views

```typescript
import { usePageTracking } from '@/hooks/useAnalytics';

function MyPage() {
  usePageTracking(); // Auto-tracks page view

  return <div>...</div>;
}
```

### Step 3: Track Events

```typescript
import { analytics } from '@/lib/analytics';

<Button onClick={() => {
  analytics.track('cta_clicked', {
    location: 'hero',
    type: 'start_trial',
  });
}}>
  Start Free Trial
</Button>
```

### Step 4: Identify Users

```typescript
import { dataCollection } from '@/lib/dataCollection';

// After login
dataCollection.identifyUser(userId, {
  email: user.email,
  plan: user.subscription.plan,
  guards_count: user.company.guards_count,
});
```

### Step 5: Tag Sessions

```typescript
import { dataCollection } from '@/lib/dataCollection';

// Tag session for filtering
dataCollection.tagSession({
  has_error: true,
  error_type: 'payment_failed',
});
```

### Step 6: Add Feedback Widget

```typescript
import { FeedbackWidget } from '@/design-system/components';

// In your layout
<FeedbackWidget trigger="button" position="bottom-right" />
```

---

## Dashboard & Insights

### Access Data Insights Dashboard

Navigate to: `/admin/data-insights`

**Features:**
- Feature usage analytics
- Conversion funnel visualization
- User behavior metrics
- Data-driven recommendations

### Key Metrics

**Feature Usage:**
- Unique users per feature
- Session count
- Average time spent
- Trend analysis (up/down/stable)

**Conversion Funnels:**
- Step-by-step user count
- Drop-off percentages
- Conversion rates
- Bottleneck identification

**User Behavior:**
- Average session duration
- Pages per session
- Return rate (7-day)
- Mobile vs desktop usage

---

## Action Plan

### Week 1: Setup & Integration

**Day 1-2: Configure Services**
- [ ] Set up Hotjar account
- [ ] Set up Mouseflow account
- [ ] Add API keys to `.env.local`
- [ ] Verify initialization

**Day 3-4: Add Tracking**
- [ ] Add page view tracking to all routes
- [ ] Add event tracking to CTAs
- [ ] Add feature usage tracking to core features
- [ ] Test in development

**Day 5-7: Widgets & Surveys**
- [ ] Add FeedbackWidget to layout
- [ ] Configure NPS survey trigger
- [ ] Add QuickFeedback to key moments
- [ ] Test all interactions

### Week 2: Collection & Analysis

**Day 8-10: Monitor Data**
- [ ] Review session recordings daily
- [ ] Analyze heatmaps
- [ ] Check funnel drop-offs
- [ ] Review feedback submissions

**Day 11-14: First Insights**
- [ ] Identify top 3 friction points
- [ ] Document user behavior patterns
- [ ] Create hypothesis for improvements
- [ ] Plan A/B tests

### Month 1: Iterate & Optimize

**Ongoing:**
- Daily: Review feedback & NPS
- Weekly: Analyze funnels for changes
- Bi-weekly: Review session recordings
- Monthly: Full data review & roadmap update

---

## Best Practices

### 1. **Don't Over-Track**
- Focus on actionable events
- Avoid tracking noise
- Keep event names consistent

### 2. **Protect Privacy**
- Never track sensitive data (passwords, credit cards)
- Mask PII in recordings
- Respect opt-outs immediately

### 3. **Act on Data**
- Set aside time to review data weekly
- Turn insights into hypotheses
- Test hypotheses with A/B tests
- Measure impact of changes

### 4. **Share Insights**
- Weekly data review meetings
- Share key metrics with team
- Document learnings
- Celebrate wins

---

## Success Metrics

### Targets (3 Months)

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Signup Conversion | 6.7% | 10% | 🟡 |
| Onboarding Completion | 77% | 85% | 🟢 |
| Feature Adoption (Marketplace) | 59% | 75% | 🔴 |
| NPS Score | TBD | 50+ | 🟡 |
| Return Rate (7-day) | 67% | 75% | 🟢 |

**Legend:**
- 🟢 On track
- 🟡 Needs attention
- 🔴 Action required

---

## Tools Reference

### Data Collection Service

```typescript
import { dataCollection } from '@/lib/dataCollection';

// Methods available:
dataCollection.initHotjar()
dataCollection.initMouseflow()
dataCollection.trackFeatureUsage(name, metadata)
dataCollection.trackFormInteraction(form, action, field)
dataCollection.trackFunnelStep(funnel, step, name, success, metadata)
dataCollection.identifyUser(userId, attributes)
dataCollection.tagSession(tags)
dataCollection.trackError(type, message, stack, metadata)
dataCollection.trackScrollDepth(percentage, page)
dataCollection.trackTimeOnPage(seconds, page)
dataCollection.optOut()
dataCollection.hasOptedOut()
```

### React Hooks

```typescript
import {
  useScrollDepthTracking,
  useTimeOnPageTracking,
} from '@/lib/dataCollection';

import {
  usePageTracking,
  useAnalytics,
  useFormTracking,
  useExperiment,
} from '@/hooks/useAnalytics';
```

### Components

```typescript
import {
  FeedbackWidget,
  QuickFeedback,
  NPSSurvey,
  NPSBadge,
} from '@/design-system/components';
```

---

## Troubleshooting

**Problem:** Hotjar/Mouseflow not loading

**Solution:**
- Check API keys in `.env.local`
- Verify domain is whitelisted in service settings
- Check browser console for errors
- Ensure user hasn't opted out

**Problem:** Events not appearing in analytics

**Solution:**
- Check `sessionStorage` for events (debug mode)
- Verify analytics service is initialized
- Check network tab for API calls
- Review event naming consistency

**Problem:** Too much data, can't find insights

**Solution:**
- Focus on 3-5 key metrics
- Use dashboard filters (time range, user segments)
- Create saved views for common analyses
- Schedule weekly review sessions

---

## Next Steps

1. ✅ **Implemented:** Data collection infrastructure
2. ✅ **Implemented:** Feedback & NPS systems
3. ✅ **Implemented:** Analytics dashboards
4. **TODO:** Set up automated reporting
5. **TODO:** Create A/B testing framework
6. **TODO:** Build predictive churn models
7. **TODO:** Implement customer health scores

---

**Remember:** Data is only valuable if it leads to action. Review → Hypothesis → Test → Measure → Iterate.

*End of Document*
