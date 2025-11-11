# RostraCore Mobile-First Redesign Strategy

## Executive Summary

This document presents a comprehensive mobile-first redesign strategy for RostraCore, synthesizing insights from our strategic framework (Emotional Journey Map, Implementation Roadmap, Product Design Strategy, and Technical Architecture Strategy). The redesign transforms RostraCore from a desktop-first application into a mobile-optimized platform that serves three distinct personas across different device capabilities and connectivity constraints.

**Key Transformation Goals:**
- **Primary Focus:** Mobile-first UI/UX for 80%+ mobile users
- **Persona-Driven:** Tailored experiences for Owner (Themba), Scheduler (Lindiwe), and Guard (Sipho)
- **Offline-Capable:** Progressive Web App with service workers
- **Performance:** <1.5s landing page, <2s dashboard load
- **Accessibility:** SMS-first for guards with limited data
- **Timeline:** 12-week phased implementation

---

## 1. Current State Assessment

### 1.1 Desktop-First Limitations

**Critical Issues:**
1. **Touch Targets Too Small:** Buttons and links below 48x48px minimum
2. **Desktop-Optimized Layouts:** Multi-column layouts break on mobile
3. **Form Complexity:** Long forms require excessive scrolling on mobile
4. **Table-Heavy UI:** Data tables don't translate well to small screens
5. **No Offline Support:** Requires constant internet connection
6. **No Native Feel:** Web app doesn't feel like native mobile experience

**Impact on User Personas:**

| Persona | Role | Device | Pain Points |
|---------|------|--------|-------------|
| **Themba** | Owner | Mobile (70% of time) | Small buttons, overwhelming dashboards, slow load times |
| **Lindiwe** | Scheduler | Mobile (60% of time) | Difficult to manage shifts on phone, poor bulk editing |
| **Sipho** | Guard | Mobile only (100%) | Can't afford data for web browsing, needs offline schedule access |

### 1.2 Mobile Usage Statistics (Projected)

Based on our target market analysis:
- **80% of users access RostraCore via mobile devices**
- **45% of guards have limited smartphone data plans**
- **60% of scheduling actions happen outside office hours (mobile context)**
- **Average session length: 3-5 minutes (mobile quick-action pattern)**

---

## 2. Mobile-First Design Principles

### 2.1 "Calm Confidence" Philosophy for Mobile

Our core design philosophy adapts to mobile constraints:

**Desktop:** Information density, multi-tasking, precision controls
**Mobile:** Focus, clarity, touch-friendly, progressive disclosure

**Mobile-Specific Principles:**

1. **One Primary Action Per Screen**
   - Clear single call-to-action above the fold
   - Secondary actions in bottom sheet or overflow menu
   - Avoid decision paralysis (Hick's Law)

2. **Touch-First Interaction**
   - Minimum 48x48px touch targets (WCAG 2.1 AAA)
   - Spacing between interactive elements: 8px minimum
   - Thumb-zone optimization (bottom 1/3 of screen)

3. **Progressive Disclosure**
   - Show only essential info by default
   - Use accordions, bottom sheets, and modals for details
   - Respect Miller's Law (7±2 items visible)

4. **Offline-First Mentality**
   - Cache critical data for offline viewing
   - Queue actions when offline, sync when online
   - Show clear offline/online status

5. **Performance as UX**
   - Every 100ms delay = 1% conversion drop
   - Skeleton screens while loading
   - Optimistic UI updates (show success immediately)

### 2.2 Psychology-Driven Mobile UX

**Emotional Journey Mapping for Mobile:**

| Stage | Emotion | Mobile Experience | Mobile Design Pattern |
|-------|---------|-------------------|----------------------|
| **Discovery** | Fear → Hope | Landing page on phone | Big hero message, single CTA, trust badges |
| **Onboarding** | Anxiety | Sign-up form on mobile | Step-by-step (not all-at-once), progress indicator |
| **First Use** | Anxiety → Confidence | Dashboard on mobile | Guided tour, tooltips, "Quick Win" prompts |
| **Regular Use** | Confidence | Daily tasks on mobile | Muscle memory UI, shortcuts, pull-to-refresh |
| **Mastery** | Trust | Advanced features | Power-user gestures, bulk actions, customization |

**Mobile-Specific Psychological Triggers:**

1. **Zeigarnik Effect (Mobile):**
   - Push notifications for incomplete tasks
   - Home screen badge counts (e.g., "3 pending rosters")
   - Pull-to-refresh to check for updates

2. **Peak-End Rule (Mobile):**
   - Celebration animations on mobile (larger, full-screen)
   - Success confetti feels more impactful on mobile
   - End-of-shift summary with gamification

3. **Loss Aversion (Mobile):**
   - "You have 3 unfilled shifts" (prominent alert)
   - Push notification: "Shift tomorrow still needs coverage"
   - Visual indicators: Red badges, warning icons

---

## 3. Persona-Specific Mobile Redesign

### 3.1 Persona 1: Themba (Security Company Owner)

**Device Context:** iPhone 13 Pro, 5G, uses mobile 70% of time (office + on-site)

**Mobile Priorities:**

1. **Big Touch Targets**
   - Dashboard cards: minimum 64px height
   - Primary CTAs: 56px height (larger than standard)
   - Spacing: 16px between cards

2. **Instant Calculations**
   - Cost preview updates as you type
   - Real-time profit margin display
   - No "calculate" button needed (auto-update)

3. **WhatsApp Integration**
   - "Share via WhatsApp" button on invoices
   - Click-to-WhatsApp links for client contacts
   - WhatsApp quick replies for common tasks

4. **Minimal Text, Maximum Data**
   - Use numbers, icons, and charts
   - Avoid long paragraphs
   - Summary cards with drill-down for details

**Mobile Dashboard Redesign:**

```
┌─────────────────────────────────────┐
│  👋 Morning, Themba                 │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🟢 All Systems Green        │   │
│  │ 47 guards on shift today    │   │
│  └─────────────────────────────┘   │
│                                     │
│  💰 This Week's Revenue             │
│  ┌─────────────────────────────┐   │
│  │  R 127,450                  │   │
│  │  ↑ 12% vs last week         │   │
│  └─────────────────────────────┘   │
│  [Tap for breakdown]                │
│                                     │
│  ⚠️ Action Required                 │
│  ┌─────────────────────────────┐   │
│  │  3 shifts need coverage     │   │
│  │  Tomorrow, 06:00-18:00      │   │
│  │  [Fill Shifts] ─────────>   │   │
│  └─────────────────────────────┘   │
│                                     │
│  Quick Actions                      │
│  ┌─────┐ ┌─────┐ ┌─────┐          │
│  │ 🚀  │ │ ➕  │ │ 📊  │          │
│  │Gen  │ │Add  │ │View │          │
│  │Roster│ │Shift│ │Sched│          │
│  └─────┘ └─────┘ └─────┘          │
└─────────────────────────────────────┘
```

**Key Changes:**
- Vertical card layout (not horizontal)
- Large touch targets (64px min)
- Single primary action per card
- Numbers prominent, text minimal
- Bottom navigation for quick actions

### 3.2 Persona 2: Lindiwe (Scheduler/Admin)

**Device Context:** Samsung Galaxy S21, uses mobile 60% of time (desk + home)

**Mobile Priorities:**

1. **Bulk Actions on Mobile**
   - Multi-select with checkboxes (48x48px)
   - Floating action button for bulk operations
   - "Select All" in one tap

2. **Filters That Work on Mobile**
   - Bottom sheet filter panel
   - Clear visual indicators for active filters
   - One-tap to clear all filters

3. **Calendar View Optimized**
   - Swipe left/right for dates
   - Tap day to see shift details in bottom sheet
   - Visual status indicators (color-coded)

**Mobile Roster Management Redesign:**

```
┌─────────────────────────────────────┐
│  📅 Week of Nov 5-12           [≡]  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Filters Active: 2          │   │
│  │  [Site: Mall] [Status: Open]│   │
│  │  [Clear All]                │   │
│  └─────────────────────────────┘   │
│                                     │
│  Mon Nov 5 ───────────────────────  │
│  ☐ Mall Entrance - 06:00-18:00     │
│     📍 Sandton  👤 John M.          │
│     Status: 🟢 Filled               │
│                                     │
│  ☐ Office Lobby - 18:00-06:00      │
│     📍 Rosebank  👤 Unassigned      │
│     Status: 🔴 Urgent               │
│                                     │
│  Tue Nov 6 ───────────────────────  │
│  ☐ Mall Entrance - 06:00-18:00     │
│     📍 Sandton  👤 Sarah K.         │
│     Status: 🟢 Filled               │
│                                     │
│  [2 Selected]                       │
│  ┌─────────────────────────────┐   │
│  │ Bulk Actions          [↑]   │   │
│  │ • Assign Guard              │   │
│  │ • Change Status             │   │
│  │ • Delete Shifts             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌──────┐                           │
│  │  +   │ Add Shift                 │
│  └──────┘                           │
└─────────────────────────────────────┘
```

**Key Changes:**
- Checkboxes for multi-select (left-aligned)
- Bottom sheet for bulk actions
- Swipeable date navigation
- Card-based shift display (not table)
- Floating action button for primary action

### 3.3 Persona 3: Sipho (Security Guard)

**Device Context:** Budget Android (Tecno Spark), limited data, needs offline access

**Mobile Priorities:**

1. **SMS-First Communication**
   - Receive schedule via SMS
   - SMS link to view full schedule (loads once, cached)
   - SMS shift reminders (no data needed)

2. **Offline Schedule Viewing**
   - Download schedule for the week
   - View shifts without internet
   - Sync changes when Wi-Fi available

3. **Simple Language, Visual Interface**
   - Multilingual: English, Zulu, Afrikaans, Xhosa
   - Icons + text labels
   - Visual calendar (not tables)

4. **Data Efficiency**
   - Lightweight pages (<100KB)
   - Images compressed
   - Progressive loading

**Mobile Guard Schedule Redesign:**

```
┌─────────────────────────────────────┐
│  🛡️ Sawubona, Sipho         [🌐 ✓]  │
│  (Hello, Sipho)                     │
│                                     │
│  📅 Your Shifts This Week           │
│                                     │
│  TODAY - Mon Nov 5                  │
│  ┌─────────────────────────────┐   │
│  │  🏢 Sandton Mall Entrance   │   │
│  │  ⏰ 06:00 - 18:00 (12 hrs)  │   │
│  │  📍 Sandton City            │   │
│  │                             │   │
│  │  [Check In] ───────────>    │   │
│  └─────────────────────────────┘   │
│                                     │
│  TOMORROW - Tue Nov 6               │
│  ┌─────────────────────────────┐   │
│  │  🏢 Office Building Lobby   │   │
│  │  ⏰ 18:00 - 06:00 (12 hrs)  │   │
│  │  📍 Rosebank               │   │
│  │                             │   │
│  │  [View Details]             │   │
│  └─────────────────────────────┘   │
│                                     │
│  REST DAY - Wed Nov 7               │
│  ┌─────────────────────────────┐   │
│  │  😊 No shifts scheduled     │   │
│  │  Enjoy your day off!        │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Download Full Week]               │
│  (Uses 50KB data - view offline)   │
│                                     │
│  Language: English [Change]         │
└─────────────────────────────────────┘
```

**Key Changes:**
- Day-by-day visual layout
- Large text, high contrast
- Multilingual support (shown in header)
- Offline download option with data usage info
- Simple check-in button (primary action)
- No tables, all cards

---

## 4. Page-by-Page Mobile Redesign Specifications

### 4.1 Priority Pages (Week 7 Focus)

Based on Implementation Roadmap, these 5 pages are highest priority:

#### Page 1: Landing Page

**Desktop Issues:**
- Hero section too tall (requires scrolling)
- Multi-column layout breaks on mobile
- CTA buttons too small
- Too much text

**Mobile-First Redesign:**

**Layout:**
- Single column, vertical flow
- Hero section: 60vh height (fits above fold)
- CTA button: 56px height, full-width (max 320px)
- Social proof section: horizontal scroll cards

**Performance:**
- Target: <1.5s First Contentful Paint
- Lazy load below-fold images
- Inline critical CSS
- Defer non-critical JS

**Wireframe:**
```
┌─────────────────────────────────────┐
│  [Logo]              [Menu ≡]       │
│                                     │
│  Stop rostering headaches.          │
│  Start saving time.                 │
│                                     │
│  AI-powered scheduling for          │
│  security companies.                │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Start Free Trial ─────────> │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Hero Image]                       │
│                                     │
│  ──────────────────────────────────  │
│                                     │
│  Trusted by 50+ SA Companies        │
│  [Logo] [Logo] [Logo] →             │
│  (Horizontal scroll)                │
│                                     │
│  ──────────────────────────────────  │
│                                     │
│  How It Works                       │
│  ┌─────────────────────────────┐   │
│  │  1️⃣ Add Your Guards        │   │
│  │  Upload or manually enter   │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  2️⃣ Generate Roster        │   │
│  │  AI optimizes in seconds    │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  3️⃣ Share & Track          │   │
│  │  WhatsApp, SMS, or email    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Start Free Trial ─────────> │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Technical Implementation:**
```typescript
// Mobile-first responsive design
<div className="
  container
  mx-auto
  px-4 sm:px-6 lg:px-8
  max-w-sm sm:max-w-2xl lg:max-w-7xl
">
  {/* Hero Section */}
  <section className="
    min-h-[60vh]
    flex flex-col
    justify-center
    items-center
    text-center
    py-12 sm:py-16
  ">
    <h1 className="
      text-4xl sm:text-5xl lg:text-6xl
      font-bold
      mb-6
      leading-tight
    ">
      Stop rostering headaches.<br />
      Start saving time.
    </h1>

    <p className="
      text-lg sm:text-xl
      text-gray-600
      mb-8
      max-w-2xl
    ">
      AI-powered scheduling for security companies.
    </p>

    <button className="
      w-full sm:w-auto
      min-w-[280px]
      h-14
      bg-blue-600
      text-white
      rounded-lg
      text-lg font-semibold
      hover:bg-blue-700
      active:bg-blue-800
      transition-colors
      shadow-lg
    ">
      Start Free Trial →
    </button>
  </section>
</div>
```

#### Page 2: Dashboard

**Desktop Issues:**
- Multi-column grid doesn't stack well on mobile
- Small metric cards hard to read
- Too much information density

**Mobile-First Redesign:**

**Layout:**
- Vertical stack of cards
- Primary metrics at top (revenue, alerts)
- Secondary metrics collapsible
- Quick actions in thumb zone (bottom 1/3)

**Performance:**
- Target: <2s Time to Interactive
- Redis caching for metrics (5-minute TTL)
- Skeleton screens while loading
- Progressive enhancement

**Wireframe:**
```
┌─────────────────────────────────────┐
│  👋 Morning, Themba          [🔔 3] │
│                                     │
│  Pull down to refresh...            │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🟢 All Systems Green        │   │
│  │ 47 guards on shift today    │   │
│  └─────────────────────────────┘   │
│                                     │
│  💰 This Week                       │
│  ┌───────────┬─────────────────┐   │
│  │ R 127,450 │ ↑ 12% vs last   │   │
│  │ Revenue   │ week            │   │
│  └───────────┴─────────────────┘   │
│                                     │
│  ⚠️ Action Required (3)             │
│  ┌─────────────────────────────┐   │
│  │ 3 shifts need coverage      │   │
│  │ Tomorrow 06:00-18:00        │   │
│  │ [Fill Now] ────────────>    │   │
│  └─────────────────────────────┘   │
│                                     │
│  📊 Key Metrics            [v]      │
│  (Collapsed - tap to expand)        │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Quick Actions                      │
│  ┌──────┬──────┬──────┬──────┐     │
│  │ 🚀   │ ➕   │ 📊   │ 💰   │     │
│  │Gen   │Add   │View  │Pay   │     │
│  │Roster│Shift │Sched │roll  │     │
│  └──────┴──────┴──────┴──────┘     │
└─────────────────────────────────────┘
```

**Technical Implementation:**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { Skeleton, PullToRefresh, MetricCard } from '@/components';

export default function MobileDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pull-to-refresh
  const handleRefresh = async () => {
    setLoading(true);
    const response = await fetch('/api/v1/dashboard/metrics');
    const data = await response.json();
    setMetrics(data);
    setLoading(false);
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="flex flex-col gap-4 p-4">
        {/* Status Banner */}
        <MetricCard
          variant="success"
          icon="🟢"
          title="All Systems Green"
          subtitle={`${metrics.guards_on_shift} guards on shift today`}
        />

        {/* Revenue Card */}
        <MetricCard
          icon="💰"
          title="This Week"
          metric={formatCurrency(metrics.weekly_revenue)}
          trend={`↑ ${metrics.revenue_change}% vs last week`}
          trendPositive={metrics.revenue_change > 0}
        />

        {/* Action Required */}
        {metrics.unfilled_shifts > 0 && (
          <MetricCard
            variant="warning"
            icon="⚠️"
            title={`Action Required (${metrics.unfilled_shifts})`}
            subtitle={`${metrics.unfilled_shifts} shifts need coverage`}
            action={{
              label: 'Fill Now',
              href: '/admin/roster?filter=unfilled'
            }}
          />
        )}

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </PullToRefresh>
  );
}
```

#### Page 3: Roster Generation

**Desktop Issues:**
- Form is single long page (requires scrolling)
- Date pickers not mobile-optimized
- Advanced options overwhelm users

**Mobile-First Redesign:**

**Layout:**
- Step-by-step wizard (not all-at-once form)
- Native date pickers on mobile
- Advanced options behind "Advanced Settings" toggle
- Progress indicator at top

**Wireframe:**
```
┌─────────────────────────────────────┐
│  Generate Roster              [X]   │
│  ●●○○ Step 2 of 4                   │
│                                     │
│  Select Date Range                  │
│                                     │
│  Start Date                         │
│  ┌─────────────────────────────┐   │
│  │ Mon, Nov 5, 2025      [📅] │   │
│  └─────────────────────────────┘   │
│                                     │
│  End Date                           │
│  ┌─────────────────────────────┐   │
│  │ Sun, Nov 12, 2025     [📅] │   │
│  └─────────────────────────────┘   │
│                                     │
│  Duration: 7 days                   │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  [< Back]          [Next Step >]   │
└─────────────────────────────────────┘
```

**Multi-Step Flow:**
1. **Step 1:** Select sites (checkboxes)
2. **Step 2:** Date range (native date pickers)
3. **Step 3:** Constraints (toggles for overtime, travel limits)
4. **Step 4:** Review & Generate (summary + confirmation)

**Technical Implementation:**
```typescript
'use client';

import { useState } from 'react';
import { Wizard, DatePicker, Button } from '@/components';

export default function MobileRosterGeneration() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    sites: [],
    startDate: null,
    endDate: null,
    constraints: {
      maxHoursWeek: 48,
      minRestHours: 8,
      maxDistanceKm: 50,
    }
  });

  const steps = [
    {
      title: 'Select Sites',
      component: <SiteSelection
        selected={formData.sites}
        onChange={(sites) => setFormData({...formData, sites})}
      />
    },
    {
      title: 'Select Date Range',
      component: <DateRangeSelection
        startDate={formData.startDate}
        endDate={formData.endDate}
        onChange={(dates) => setFormData({...formData, ...dates})}
      />
    },
    {
      title: 'Set Constraints',
      component: <ConstraintsSelection
        constraints={formData.constraints}
        onChange={(constraints) => setFormData({...formData, constraints})}
      />
    },
    {
      title: 'Review & Generate',
      component: <RosterSummary formData={formData} />
    }
  ];

  return (
    <Wizard
      steps={steps}
      currentStep={step}
      onStepChange={setStep}
      onComplete={handleGenerate}
    />
  );
}
```

#### Page 4: Employee List

**Desktop Issues:**
- Data table with many columns
- Hard to scroll horizontally on mobile
- Actions hidden in dropdown menus

**Mobile-First Redesign:**

**Layout:**
- Card-based list (not table)
- Swipe left on card to reveal actions
- Primary info visible, secondary in expansion
- Search and filter in sticky header

**Wireframe:**
```
┌─────────────────────────────────────┐
│  Employees                    [≡]   │
│  ┌───────────────────────────┐     │
│  │ 🔍 Search employees...    │     │
│  └───────────────────────────┘     │
│  [All] [Active] [On Leave]         │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 👤 John Mkhize              │ ← │
│  │ ID: EMP001                  │   │
│  │ 📍 Sandton Region           │   │
│  │ 🟢 Active • 47 hrs/week     │   │
│  └─────────────────────────────┘   │
│  (Swipe left for actions)           │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 👤 Sarah Khumalo            │   │
│  │ ID: EMP002                  │   │
│  │ 📍 Rosebank Region          │   │
│  │ 🟡 On Leave • Until Nov 10  │   │
│  │ [v] View Details            │   │
│  │                             │   │
│  │ ┌─────────────────────────┐ │   │
│  │ │ Phone: +27 82 123 4567  │ │   │
│  │ │ Email: sarah@example... │ │   │
│  │ │ Cert Expiry: Jan 2026   │ │   │
│  │ │ [Edit] [View Schedule]  │ │   │
│  │ └─────────────────────────┘ │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 👤 Michael van der Merwe    │   │
│  │ ID: EMP003                  │   │
│  │ 📍 Centurion Region         │   │
│  │ 🟢 Active • 42 hrs/week     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌──────┐                           │
│  │  +   │ Add Employee              │
│  └──────┘                           │
└─────────────────────────────────────┘
```

**Swipe Actions:**
```
Swipe left on card reveals:
┌─────────────────────────────────────┐
│  👤 John Mkhize           │ [✏️] [📅]│
│  ID: EMP001               │ Edit View│
│  📍 Sandton Region        │          │
│  🟢 Active • 47 hrs/week  │          │
└─────────────────────────────────────┘
```

**Technical Implementation:**
```typescript
'use client';

import { useState } from 'react';
import { SwipeableCard, SearchBar, FilterTabs } from '@/components';

export default function MobileEmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex flex-col h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white z-10 p-4 border-b">
        <SearchBar
          placeholder="Search employees..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
        <FilterTabs
          tabs={['All', 'Active', 'On Leave', 'Inactive']}
          active={filter}
          onChange={setFilter}
        />
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto">
        {employees.map(employee => (
          <SwipeableCard
            key={employee.id}
            onSwipeLeft={() => showActions(employee)}
            onSwipeRight={() => hideActions(employee)}
          >
            <EmployeeCard employee={employee} />
          </SwipeableCard>
        ))}
      </div>

      {/* Floating Action Button */}
      <button className="
        fixed
        bottom-20
        right-4
        w-14 h-14
        bg-blue-600
        text-white
        rounded-full
        shadow-lg
        flex items-center justify-center
        text-2xl
      ">
        +
      </button>
    </div>
  );
}
```

#### Page 5: Shift List

**Desktop Issues:**
- Similar table issues as Employee List
- Status indicators too small
- Bulk actions difficult on mobile

**Mobile-First Redesign:**

**Layout:**
- Grouped by date (natural mobile pattern)
- Color-coded status badges
- Swipe for quick actions
- Multi-select mode with checkboxes

**Wireframe:**
```
┌─────────────────────────────────────┐
│  Shifts                       [≡]   │
│  ┌───────────────────────────┐     │
│  │ 🔍 Search shifts...       │     │
│  └───────────────────────────┘     │
│  [All] [Filled] [Unfilled]          │
│                                     │
│  TODAY - Mon Nov 5                  │
│  ┌─────────────────────────────┐   │
│  │ ☐ Mall Entrance - Day Shift │   │
│  │ ⏰ 06:00 - 18:00 (12 hrs)   │   │
│  │ 👤 John Mkhize              │   │
│  │ 📍 Sandton                  │   │
│  │ 🟢 Filled                   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ☐ Office Lobby - Night Shift│   │
│  │ ⏰ 18:00 - 06:00 (12 hrs)   │   │
│  │ 👤 Unassigned               │   │
│  │ 📍 Rosebank                 │   │
│  │ 🔴 Urgent                   │   │
│  └─────────────────────────────┘   │
│                                     │
│  TOMORROW - Tue Nov 6               │
│  ┌─────────────────────────────┐   │
│  │ ☐ Mall Entrance - Day Shift │   │
│  │ ⏰ 06:00 - 18:00 (12 hrs)   │   │
│  │ 👤 Sarah Khumalo            │   │
│  │ 📍 Sandton                  │   │
│  │ 🟢 Filled                   │   │
│  └─────────────────────────────┘   │
│                                     │
│  [2 Selected]                       │
│  ┌─────────────────────────────┐   │
│  │ Bulk Actions          [↑]   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌──────┐                           │
│  │  +   │ Add Shift                 │
│  └──────┘                           │
└─────────────────────────────────────┘
```

---

## 5. Mobile Design System

### 5.1 Touch-Friendly Component Library

**Button Sizes:**
```typescript
// Minimum touch target: 48x48px (WCAG 2.1 AAA)
// Recommended: 56px height for primary actions

export const ButtonSizes = {
  // Mobile-optimized sizes
  small: 'h-12 px-4 text-sm',      // 48px height
  medium: 'h-14 px-6 text-base',   // 56px height (recommended)
  large: 'h-16 px-8 text-lg',      // 64px height (hero CTAs)

  // Full-width on mobile, auto on desktop
  responsive: 'w-full sm:w-auto h-14',
};

// Example usage
<button className={`
  ${ButtonSizes.medium}
  bg-blue-600
  text-white
  rounded-lg
  active:bg-blue-700
  transition-colors
`}>
  Primary Action
</button>
```

**Spacing System:**
```typescript
// 8px base unit for consistency
export const Spacing = {
  xs: '4px',   // 0.5 units - tight spacing
  sm: '8px',   // 1 unit - default
  md: '16px',  // 2 units - card padding
  lg: '24px',  // 3 units - section spacing
  xl: '32px',  // 4 units - large sections
  xxl: '48px', // 6 units - page sections
};

// Mobile-specific spacing
export const MobileSpacing = {
  // Minimum spacing between touch targets
  touchGap: '8px',

  // Safe area insets for notched phones
  safeTop: 'pt-safe-top',
  safeBottom: 'pb-safe-bottom',

  // Bottom navigation spacing
  bottomNavHeight: '64px',
  bottomNavOffset: 'pb-20', // Content padding when nav is visible
};
```

**Typography:**
```typescript
// Mobile-optimized font sizes
export const Typography = {
  // Headings
  h1: 'text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight',
  h2: 'text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight',
  h3: 'text-xl sm:text-2xl lg:text-3xl font-semibold',
  h4: 'text-lg sm:text-xl font-semibold',

  // Body text - minimum 16px for readability
  body: 'text-base leading-relaxed',      // 16px
  bodyLarge: 'text-lg leading-relaxed',   // 18px
  bodySmall: 'text-sm leading-normal',    // 14px

  // Captions and labels
  caption: 'text-xs text-gray-600',       // 12px
  label: 'text-sm font-medium text-gray-700',

  // Monospace for data
  data: 'font-mono text-base tabular-nums',
};

// Line height for touch targets
export const LineHeight = {
  tight: '1.25',   // Headings
  normal: '1.5',   // Body text
  relaxed: '1.75', // Long-form content
};
```

**Color System:**
```typescript
// Mobile-optimized contrast ratios (WCAG AAA)
export const Colors = {
  // Primary (Navy Blue - Trust)
  primary: {
    50: '#E6F0FF',
    100: '#CCE0FF',
    500: '#1E3A8A',  // Main brand color
    600: '#1E40AF',  // Hover state
    700: '#1E3A8A',  // Active state
    900: '#0F172A',
  },

  // Accent (Gold - Premium)
  accent: {
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
  },

  // Status colors (high contrast for mobile)
  status: {
    success: '#10B981',  // Green
    warning: '#F59E0B',  // Gold
    error: '#EF4444',    // Red
    info: '#3B82F6',     // Blue
  },

  // Neutrals
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    500: '#6B7280',
    700: '#374151',
    900: '#111827',
  },
};
```

### 5.2 Mobile Navigation Patterns

**Bottom Navigation (Primary):**
```typescript
// Design System Component
export function MobileBottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="
      fixed
      bottom-0
      left-0
      right-0
      bg-white
      border-t
      border-gray-200
      safe-area-inset-bottom
      z-50
      md:hidden
    ">
      <div className="flex justify-around items-center h-16">
        {items.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                flex
                flex-col
                items-center
                justify-center
                min-w-[64px]
                py-2
                px-1
                ${isActive ? 'text-blue-600' : 'text-gray-600'}
              `}
            >
              {/* Icon - 24x24px */}
              <div className="w-6 h-6 mb-1">
                {item.icon}
              </div>

              {/* Label */}
              <span className="text-xs font-medium">
                {item.label}
              </span>

              {/* Badge */}
              {item.badge && (
                <span className="
                  absolute
                  top-1
                  right-1
                  bg-red-500
                  text-white
                  text-xs
                  rounded-full
                  w-5 h-5
                  flex items-center justify-center
                ">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

**Bottom Sheet (Modals):**
```typescript
// Native mobile feel - slides up from bottom
export function BottomSheet({
  isOpen,
  onClose,
  children
}: BottomSheetProps) {
  return (
    <Dialog open={isOpen} onClose={onClose}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50">
        <Dialog.Panel className="
          bg-white
          rounded-t-2xl
          shadow-xl
          max-h-[90vh]
          overflow-y-auto
          safe-area-inset-bottom
        ">
          {/* Handle bar for pull-down */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Content */}
          <div className="p-6">
            {children}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
```

**Pull-to-Refresh:**
```typescript
export function PullToRefresh({
  onRefresh,
  children
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleTouchStart = (e: TouchEvent) => {
    // Track touch start position
  };

  const handleTouchMove = (e: TouchEvent) => {
    // Calculate pull distance
    // Show refresh indicator when > 80px
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 80) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    setPullDistance(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Refresh indicator */}
      {pullDistance > 0 && (
        <div className="flex justify-center py-4">
          <RefreshIcon spinning={refreshing} />
        </div>
      )}

      {children}
    </div>
  );
}
```

### 5.3 Mobile Form Patterns

**Step-by-Step Forms (Wizard):**
```typescript
// Break long forms into steps
export function MobileWizard({ steps, onComplete }: WizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});

  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress indicator */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-xs text-gray-500">
            {Math.round((currentStep + 1) / steps.length * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${(currentStep + 1) / steps.length * 100}%` }}
          />
        </div>
      </div>

      {/* Current step content */}
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-2xl font-bold mb-6">
          {steps[currentStep].title}
        </h2>
        {steps[currentStep].component}
      </div>

      {/* Navigation buttons (sticky footer) */}
      <div className="bg-white border-t p-4 flex gap-3">
        {!isFirstStep && (
          <button
            onClick={() => setCurrentStep(currentStep - 1)}
            className="flex-1 h-12 border border-gray-300 rounded-lg"
          >
            ← Back
          </button>
        )}
        <button
          onClick={() => {
            if (isLastStep) {
              onComplete(formData);
            } else {
              setCurrentStep(currentStep + 1);
            }
          }}
          className="flex-1 h-12 bg-blue-600 text-white rounded-lg"
        >
          {isLastStep ? 'Complete' : 'Next Step →'}
        </button>
      </div>
    </div>
  );
}
```

**Native Input Types:**
```typescript
// Use HTML5 input types for better mobile experience
export function MobileFormInputs() {
  return (
    <>
      {/* Telephone - opens numeric keypad */}
      <input
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="+27 82 123 4567"
        className="h-12 px-4 border rounded-lg w-full"
      />

      {/* Email - shows @ on keyboard */}
      <input
        type="email"
        inputMode="email"
        placeholder="john@example.com"
        className="h-12 px-4 border rounded-lg w-full"
      />

      {/* Number - shows numeric keypad */}
      <input
        type="number"
        inputMode="decimal"
        placeholder="1250.00"
        className="h-12 px-4 border rounded-lg w-full"
      />

      {/* Date - native date picker */}
      <input
        type="date"
        className="h-12 px-4 border rounded-lg w-full"
      />

      {/* Time - native time picker */}
      <input
        type="time"
        className="h-12 px-4 border rounded-lg w-full"
      />
    </>
  );
}
```

---

## 6. Progressive Web App (PWA) Implementation

### 6.1 Service Worker Strategy

**Offline Capabilities:**

```typescript
// service-worker.ts
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache critical assets
precacheAndRoute(self.__WB_MANIFEST);

// HTML pages - Network first, cache fallback
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
);

// API responses - Network first for fresh data
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// Static assets - Cache first
registerRoute(
  ({ request }) => request.destination === 'image' ||
                   request.destination === 'font' ||
                   request.destination === 'style',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-shifts') {
    event.waitUntil(syncOfflineShifts());
  }
});

async function syncOfflineShifts() {
  const offlineActions = await getOfflineActions();

  for (const action of offlineActions) {
    try {
      await fetch(action.url, {
        method: action.method,
        body: JSON.stringify(action.data),
      });
      await markActionSynced(action.id);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}
```

### 6.2 App Manifest

```json
{
  "name": "RostraCore - Security Rostering",
  "short_name": "RostraCore",
  "description": "AI-powered rostering for security companies",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1E3A8A",
  "theme_color": "#1E3A8A",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/dashboard-mobile.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshots/roster-mobile.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "categories": ["business", "productivity"],
  "prefer_related_applications": false
}
```

### 6.3 Offline Indicator Component

```typescript
'use client';

import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="
      fixed
      top-0
      left-0
      right-0
      bg-yellow-500
      text-white
      px-4
      py-2
      text-center
      text-sm
      font-medium
      z-50
    ">
      📡 You're offline. Changes will sync when you're back online.
    </div>
  );
}
```

### 6.4 Install Prompt

```typescript
'use client';

import { useEffect, useState } from 'react';

export function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);

      // Show prompt after user has used app for 2 minutes
      setTimeout(() => setShowPrompt(true), 2 * 60 * 1000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    const result = await installPrompt.userChoice;

    if (result.outcome === 'accepted') {
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="
      fixed
      bottom-20
      left-4
      right-4
      bg-white
      rounded-lg
      shadow-xl
      p-4
      border
      border-gray-200
      z-50
    ">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Install RostraCore</h3>
          <p className="text-sm text-gray-600">
            Add to your home screen for quick access and offline use.
          </p>
        </div>
        <button
          onClick={() => setShowPrompt(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleInstall}
          className="flex-1 h-10 bg-blue-600 text-white rounded-lg font-medium"
        >
          Install
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="flex-1 h-10 border border-gray-300 rounded-lg"
        >
          Not Now
        </button>
      </div>
    </div>
  );
}
```

---

## 7. Technical Architecture for Mobile

### 7.1 Performance Optimization

**Critical Performance Targets:**

| Metric | Target | Mobile Strategy |
|--------|--------|----------------|
| First Contentful Paint (FCP) | <1.5s | Inline critical CSS, defer non-critical JS |
| Largest Contentful Paint (LCP) | <2.5s | Optimize images, use CDN, lazy load below fold |
| Time to Interactive (TTI) | <2s | Code splitting, reduce JavaScript bundle |
| Cumulative Layout Shift (CLS) | <0.1 | Set explicit dimensions for images/videos |
| First Input Delay (FID) | <100ms | Reduce main thread work, use web workers |

**Implementation:**

```typescript
// next.config.js
module.exports = {
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compression
  compress: true,

  // Code splitting
  experimental: {
    optimizeCss: true,
  },

  // Headers for caching
  async headers() {
    return [
      {
        source: '/(.*).(jpg|jpeg|png|gif|svg|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

**Lazy Loading Strategy:**

```typescript
// Lazy load components below the fold
import dynamic from 'next/dynamic';

const DashboardCharts = dynamic(() => import('./DashboardCharts'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

const EmployeeTable = dynamic(() => import('./EmployeeTable'), {
  loading: () => <TableSkeleton />,
});

export function Dashboard() {
  return (
    <div>
      {/* Above the fold - loaded immediately */}
      <DashboardHeader />
      <QuickActions />

      {/* Below the fold - lazy loaded */}
      <DashboardCharts />
      <EmployeeTable />
    </div>
  );
}
```

**Image Optimization:**

```typescript
// Use Next.js Image component with mobile-first approach
import Image from 'next/image';

export function ResponsiveImage({ src, alt }: ImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={600}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      quality={85}
      placeholder="blur"
      loading="lazy"
    />
  );
}
```

### 7.2 Redis Caching Layer

**Caching Strategy:**

```python
# backend/app/core/cache.py
import redis
import json
from typing import Optional, Any
from functools import wraps

# Initialize Redis client
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    password=settings.REDIS_PASSWORD,
    decode_responses=True
)

def cache_response(ttl: int = 300):
    """
    Decorator to cache API responses
    ttl: Time to live in seconds (default 5 minutes)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and args
            cache_key = f"{func.__name__}:{str(args)}:{str(kwargs)}"

            # Try to get from cache
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)

            # If not in cache, execute function
            result = await func(*args, **kwargs)

            # Store in cache
            redis_client.setex(
                cache_key,
                ttl,
                json.dumps(result, default=str)
            )

            return result
        return wrapper
    return decorator

# Usage example
@router.get("/dashboard/metrics")
@cache_response(ttl=300)  # Cache for 5 minutes
async def get_dashboard_metrics(
    org_id: int,
    db: Session = Depends(get_db)
):
    """Cached dashboard metrics for mobile performance"""
    return {
        "weekly_revenue": calculate_weekly_revenue(org_id, db),
        "guards_on_shift": count_guards_on_shift(org_id, db),
        "unfilled_shifts": count_unfilled_shifts(org_id, db),
    }
```

**Cache Invalidation:**

```python
# Invalidate cache when data changes
@router.post("/shifts")
async def create_shift(
    shift: ShiftCreate,
    db: Session = Depends(get_db)
):
    """Create shift and invalidate relevant caches"""

    # Create shift
    new_shift = Shift(**shift.dict())
    db.add(new_shift)
    db.commit()

    # Invalidate caches
    redis_client.delete(f"dashboard_metrics:{shift.org_id}")
    redis_client.delete(f"shifts_list:{shift.org_id}")
    redis_client.delete(f"unfilled_shifts:{shift.org_id}")

    return new_shift
```

### 7.3 Async Job Queue with Celery

**Long-Running Tasks:**

```python
# backend/app/core/celery.py
from celery import Celery

celery_app = Celery(
    "rostracore",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

@celery_app.task(bind=True)
def generate_roster_task(
    self,
    start_date: str,
    end_date: str,
    site_ids: Optional[List[int]] = None
):
    """
    Async roster generation for mobile users
    Updates progress for real-time feedback
    """

    # Update progress: 0%
    self.update_state(
        state='OPTIMIZING',
        meta={'progress': 0, 'status': 'Initializing...'}
    )

    # Load data
    self.update_state(
        state='OPTIMIZING',
        meta={'progress': 20, 'status': 'Loading employee data...'}
    )

    # Run optimizer
    optimizer = ProductionRosterOptimizer(db)

    self.update_state(
        state='OPTIMIZING',
        meta={'progress': 40, 'status': 'Optimizing assignments...'}
    )

    result = optimizer.optimize(start_date, end_date, site_ids)

    # Finalize
    self.update_state(
        state='OPTIMIZING',
        meta={'progress': 90, 'status': 'Finalizing roster...'}
    )

    return {
        'status': 'SUCCESS',
        'progress': 100,
        'result': result
    }

# API endpoint
@router.post("/jobs/roster/generate")
async def start_roster_generation(
    request: RosterGenerateRequest,
    db: Session = Depends(get_db)
):
    """Start async roster generation job"""

    # Start Celery task
    task = generate_roster_task.delay(
        request.start_date,
        request.end_date,
        request.site_ids
    )

    return {
        "job_id": task.id,
        "status": "PENDING",
        "message": "Roster generation started"
    }

@router.get("/jobs/status/{job_id}")
async def get_job_status(job_id: str):
    """Poll job status for mobile UI"""

    task = celery_app.AsyncResult(job_id)

    if task.state == 'PENDING':
        response = {
            'status': 'PENDING',
            'progress': 0,
            'message': 'Waiting to start...'
        }
    elif task.state == 'OPTIMIZING':
        response = {
            'status': 'OPTIMIZING',
            'progress': task.info.get('progress', 0),
            'message': task.info.get('status', 'Processing...')
        }
    elif task.state == 'SUCCESS':
        response = {
            'status': 'SUCCESS',
            'progress': 100,
            'result': task.result
        }
    else:
        response = {
            'status': 'FAILURE',
            'progress': 0,
            'error': str(task.info)
        }

    return response
```

**Mobile Polling Pattern:**

```typescript
// Frontend - Poll job status every 2 seconds
export function useRosterGeneration() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const startGeneration = async (params: RosterParams) => {
    setLoading(true);

    const response = await fetch('/api/v1/jobs/roster/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    const data = await response.json();
    setJobId(data.job_id);
  };

  // Poll for status
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      const response = await fetch(`/api/v1/jobs/status/${jobId}`);
      const data = await response.json();
      setStatus(data);

      if (data.status === 'SUCCESS' || data.status === 'FAILURE') {
        setLoading(false);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  return { startGeneration, status, loading };
}
```

### 7.4 APM with Sentry

**Error Tracking & Performance Monitoring:**

```python
# backend/app/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    environment=settings.SENTRY_ENVIRONMENT,
    integrations=[FastApiIntegration()],

    # Performance monitoring
    traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
    profiles_sample_rate=settings.SENTRY_PROFILES_SAMPLE_RATE,

    # Mobile-specific tracking
    send_default_pii=False,  # Privacy
    attach_stacktrace=True,
    max_breadcrumbs=50,
)

# Tag mobile requests
@app.middleware("http")
async def tag_mobile_requests(request: Request, call_next):
    user_agent = request.headers.get("user-agent", "")
    is_mobile = "Mobile" in user_agent or "Android" in user_agent

    with sentry_sdk.configure_scope() as scope:
        scope.set_tag("device_type", "mobile" if is_mobile else "desktop")
        scope.set_tag("user_agent", user_agent)

    response = await call_next(request)
    return response
```

---

## 8. Implementation Roadmap

### 8.1 12-Week Timeline

**Phase 1: Foundation (Weeks 1-2)**

**Week 1: Mobile Audit & Design System**
- [ ] Audit all pages on mobile devices (iPhone SE, Galaxy S8)
- [ ] Document mobile UX issues with screenshots
- [ ] Create mobile-first design system (buttons, spacing, typography)
- [ ] Set up Tailwind CSS with mobile-first utilities
- [ ] Create component library (Bottom Nav, Bottom Sheet, Pull-to-Refresh)

**Week 2: Infrastructure Setup**
- [ ] Set up Redis caching layer
- [ ] Configure Celery for async jobs
- [ ] Implement Sentry APM
- [ ] Set up performance monitoring dashboards
- [ ] Create performance budget alerts

**Phase 2: Core Pages (Weeks 3-5)**

**Week 3: Priority Pages Redesign**
- [ ] Redesign Landing Page (mobile-first)
- [ ] Redesign Dashboard (mobile-first)
- [ ] Implement skeleton screens
- [ ] Add pull-to-refresh to dashboard
- [ ] Performance testing and optimization

**Week 4: Roster & Employee Pages**
- [ ] Redesign Roster Generation (step-by-step wizard)
- [ ] Redesign Employee List (card-based, swipeable)
- [ ] Implement bottom sheets for modals
- [ ] Add multi-select with bulk actions
- [ ] Touch target size audit and fixes

**Week 5: Shift Management**
- [ ] Redesign Shift List (grouped by date)
- [ ] Implement swipe actions
- [ ] Add filters in bottom sheet
- [ ] Calendar view optimization
- [ ] Performance testing

**Phase 3: PWA & Offline (Weeks 6-7)**

**Week 6: Progressive Web App**
- [ ] Create app manifest
- [ ] Design app icons (72px to 512px)
- [ ] Implement service worker
- [ ] Add offline indicator
- [ ] Test "Add to Home Screen" flow

**Week 7: Offline Capabilities**
- [ ] Implement offline data caching
- [ ] Add background sync for actions
- [ ] Create offline guard schedule viewer
- [ ] Test offline → online sync
- [ ] SMS integration for guards

**Phase 4: Persona-Specific Features (Weeks 8-9)**

**Week 8: Owner (Themba) Features**
- [ ] WhatsApp integration
- [ ] Big touch targets and simplified dashboard
- [ ] Instant calculations (no "calculate" button)
- [ ] Revenue/cost visualization charts
- [ ] Mobile-optimized reports

**Week 9: Scheduler (Lindiwe) & Guard (Sipho) Features**
- [ ] Bulk actions UI for schedulers
- [ ] Advanced filters in bottom sheet
- [ ] Multilingual support (English, Zulu, Afrikaans, Xhosa)
- [ ] Guard schedule download for offline
- [ ] Data usage optimization (<100KB pages)

**Phase 5: Performance & Polish (Weeks 10-11)**

**Week 10: Performance Optimization**
- [ ] Achieve <1.5s landing page FCP
- [ ] Achieve <2s dashboard TTI
- [ ] Image optimization (AVIF, WebP)
- [ ] Code splitting and lazy loading
- [ ] Redis cache tuning

**Week 11: Testing & QA**
- [ ] Real device testing (10+ devices)
- [ ] Network throttling tests (3G, slow 4G)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Cross-browser testing (Safari, Chrome, Samsung Internet)
- [ ] Bug fixes

**Phase 6: Launch (Week 12)**

**Week 12: Launch & Monitoring**
- [ ] Beta launch to 10 test companies
- [ ] Monitor Sentry for errors
- [ ] Track Core Web Vitals
- [ ] Gather user feedback
- [ ] Iterate based on feedback
- [ ] Public launch

### 8.2 Resource Allocation

**Team Requirements:**

| Role | Weeks 1-2 | Weeks 3-5 | Weeks 6-7 | Weeks 8-9 | Weeks 10-12 |
|------|-----------|-----------|-----------|-----------|-------------|
| Frontend Developer | Full-time | Full-time | Full-time | Full-time | Full-time |
| UI/UX Designer | Full-time | Part-time | Part-time | Part-time | Part-time |
| Backend Developer | Part-time | Part-time | Full-time | Part-time | Part-time |
| QA Engineer | - | - | Part-time | Part-time | Full-time |

**Estimated Effort:**
- **Design:** 3-4 weeks (frontend designer)
- **Development:** 8-9 weeks (frontend + backend)
- **Testing & QA:** 2-3 weeks
- **Total:** 12 weeks with 1-2 person team

---

## 9. Success Metrics

### 9.1 Performance Metrics

**Core Web Vitals (Mobile):**

| Metric | Before | Target | Measurement Tool |
|--------|--------|--------|-----------------|
| Largest Contentful Paint (LCP) | 4.2s | <2.5s | Google PageSpeed Insights |
| First Input Delay (FID) | 180ms | <100ms | Chrome DevTools |
| Cumulative Layout Shift (CLS) | 0.25 | <0.1 | Lighthouse |
| Time to Interactive (TTI) | 5.1s | <2.0s | WebPageTest |
| First Contentful Paint (FCP) | 2.8s | <1.5s | Lighthouse |

**API Performance:**

| Endpoint | Current | Target |
|----------|---------|--------|
| `/api/v1/dashboard/metrics` | 850ms | <100ms (with Redis) |
| `/api/v1/roster/generate` | 29s | <10s (with Celery) |
| `/api/v1/employees` | 420ms | <200ms |
| `/api/v1/shifts` | 380ms | <200ms |

### 9.2 User Experience Metrics

**Mobile Usability:**

| Metric | Target |
|--------|--------|
| Touch target success rate | >95% (all targets ≥48px) |
| Form completion rate (mobile) | >80% (vs <50% current) |
| Mobile bounce rate | <40% (vs 65% current) |
| Session duration (mobile) | >5 minutes |
| PWA install rate | >15% of monthly users |

**Persona-Specific Metrics:**

| Persona | Metric | Target |
|---------|--------|--------|
| **Themba (Owner)** | Dashboard load time | <2s |
| | Weekly revenue visibility | Above fold |
| | WhatsApp share clicks | >30% of invoices |
| **Lindiwe (Scheduler)** | Bulk action usage | >50% of shift edits |
| | Filter usage rate | >60% of sessions |
| | Mobile roster creation | >40% vs desktop |
| **Sipho (Guard)** | Offline schedule views | >70% of views |
| | SMS click-through rate | >80% |
| | Data usage per session | <100KB |

### 9.3 Business Impact Metrics

**Conversion & Engagement:**

| Metric | Current | Target (Post-Redesign) |
|--------|---------|----------------------|
| Mobile sign-up conversion | 1.2% | >3.5% |
| Free trial activation (mobile) | 45% | >70% |
| Mobile feature adoption | 30% | >60% |
| Mobile user retention (30-day) | 35% | >55% |
| Mobile NPS score | 32 | >50 |

**Operational Efficiency:**

| Metric | Target |
|--------|--------|
| Roster generation time (mobile) | <10s (vs 29s current) |
| Form abandonment rate | <20% (vs 55% current) |
| Mobile support tickets | -40% (clearer UI) |
| Mobile session success rate | >85% |

---

## 10. Risk Mitigation

### 10.1 Technical Risks

**Risk 1: Performance Targets Not Met**

**Mitigation:**
- Set up performance budget alerts in CI/CD
- Monitor Core Web Vitals in production (Sentry)
- A/B test performance improvements
- Use progressive enhancement (fast baseline, enhanced for modern devices)

**Risk 2: Offline Sync Conflicts**

**Mitigation:**
- Implement conflict resolution UI (show user both versions)
- Use last-write-wins for simple fields
- Queue actions with timestamps for sync
- Test extensively with network throttling

**Risk 3: PWA Installation Friction**

**Mitigation:**
- Show install prompt only after 2 minutes of usage
- Provide clear value proposition ("Access offline, faster loading")
- A/B test different prompt timing and copy
- Track install funnel and optimize

### 10.2 User Adoption Risks

**Risk 1: Users Don't Understand New Mobile UI**

**Mitigation:**
- Create interactive onboarding tutorial
- Show tooltips for new patterns (swipe actions, pull-to-refresh)
- Provide "What's New" changelog with screenshots
- Offer live webinar for existing customers

**Risk 2: Desktop Users Feel Neglected**

**Mitigation:**
- Mobile-first ≠ mobile-only
- Use responsive design (works on desktop too)
- Enhance desktop with keyboard shortcuts
- Communicate that desktop experience improves too

**Risk 3: Guard Adoption (Low Smartphone Penetration)**

**Mitigation:**
- Prioritize SMS-first approach
- Make web view data-efficient (<100KB)
- Provide USSD code option for feature phones
- Partner with clients to provide basic smartphones

### 10.3 Timeline Risks

**Risk 1: Scope Creep**

**Mitigation:**
- Lock scope for each 2-week sprint
- Use MoSCoW prioritization (Must/Should/Could/Won't)
- Create backlog for post-launch features
- Strict change request process

**Risk 2: Delays in Testing**

**Mitigation:**
- Start device testing in Week 3 (parallel with development)
- Automate regression tests (Playwright)
- Allocate 20% buffer time in Weeks 10-11
- Have backup devices ready for testing

---

## 11. Next Steps

### 11.1 Immediate Actions (This Week)

1. **Mobile Audit:**
   - [ ] Test all current pages on iPhone SE and Galaxy S8
   - [ ] Screenshot all mobile UX issues
   - [ ] Document touch target sizes
   - [ ] List pages requiring redesign

2. **Stakeholder Alignment:**
   - [ ] Present this strategy to leadership
   - [ ] Get approval on timeline and resources
   - [ ] Identify beta test companies
   - [ ] Set success metrics baselines

3. **Technical Setup:**
   - [ ] Set up Redis on development environment
   - [ ] Configure Celery workers
   - [ ] Install Sentry SDK
   - [ ] Create performance monitoring dashboard

### 11.2 Week 1 Sprint Plan

**Design Track:**
- Create mobile-first design system in Figma
- Design 5 priority pages (landing, dashboard, roster, employees, shifts)
- Create interactive prototypes for user testing
- Conduct usability testing with 5 users

**Development Track:**
- Set up Tailwind CSS with mobile-first breakpoints
- Create base component library (Button, Card, Input)
- Implement MobileBottomNav component
- Implement BottomSheet component
- Set up Redis caching infrastructure

**Documentation:**
- Document mobile design patterns
- Create component usage guide
- Write technical implementation specs
- Set up project management board (Linear/Jira)

### 11.3 Communication Plan

**Internal:**
- Weekly progress updates to leadership
- Daily standups with development team
- Bi-weekly design reviews
- Slack channel for mobile redesign discussions

**External:**
- Monthly newsletter to customers about upcoming mobile improvements
- Beta program invitation (Week 10)
- Webinar for existing customers (Week 11)
- Launch announcement and case study (Week 12)

---

## 12. Conclusion

This mobile-first redesign strategy transforms RostraCore from a desktop-centric application into a mobile-optimized platform that serves the real-world needs of our three core personas:

1. **Themba (Owner):** Big buttons, instant calculations, WhatsApp integration
2. **Lindiwe (Scheduler):** Mobile-friendly bulk actions, filters, and roster management
3. **Sipho (Guard):** Offline schedule access, SMS-first, data-efficient, multilingual

**Key Differentiators:**
- **Psychology-Driven UX:** Leveraging Hick's Law, Miller's Law, and Peak-End Rule
- **Offline-First:** PWA with service workers for guards with limited connectivity
- **Performance-Obsessed:** <1.5s landing page, <2s dashboard (6-7x faster with Redis)
- **Persona-Tailored:** Different experiences for different users and devices
- **12-Week Timeline:** Aggressive but achievable with proper resourcing

**Expected Impact:**
- 3x mobile conversion rate (1.2% → 3.5%)
- 40% faster roster generation (<10s vs 29s)
- 70% offline usage for guards
- 55% mobile user retention (vs 35% current)

This redesign positions RostraCore as the premier mobile-first rostering platform for the South African security industry, directly addressing the pain points identified in our strategic framework while maintaining our "Calm Confidence" design philosophy.

**The mobile-first future starts now.**

---

**Document Version:** 1.0
**Last Updated:** November 10, 2025
**Author:** RostraCore Product Team
**Status:** Ready for Implementation
