# UI Redesign Plan - Donezo Dashboard Style

## GuardianOS Modern UI Transformation

**Target Design:** Clean, white, professional dashboard like Donezo
**Current Design:** Purple gradient, older style
**Goal:** Complete visual overhaul for modern, professional appearance

---

## Design System

### Color Palette

**Primary Colors:**
```css
--primary-green: #10B981;      /* Main brand color - green */
--primary-green-dark: #059669; /* Hover states */
--primary-green-light: #D1FAE5; /* Backgrounds */

--secondary-blue: #3B82F6;     /* Secondary actions */
--secondary-blue-dark: #2563EB;

--background-white: #FFFFFF;    /* Main background */
--background-gray: #F9FAFB;     /* Secondary background */
--background-gray-dark: #F3F4F6; /* Card backgrounds */

--text-primary: #111827;        /* Main text */
--text-secondary: #6B7280;      /* Secondary text */
--text-muted: #9CA3AF;          /* Placeholder text */

--border-color: #E5E7EB;        /* Borders */
--border-color-dark: #D1D5DB;

--success: #10B981;
--warning: #F59E0B;
--error: #EF4444;
--info: #3B82F6;
```

---

### Typography

**Font Family:**
```css
--font-primary: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'SF Mono', Consolas, monospace;
```

**Font Sizes:**
```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

**Font Weights:**
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

### Spacing System

```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
```

---

### Border Radius

```css
--radius-sm: 0.375rem;  /* 6px */
--radius-md: 0.5rem;    /* 8px */
--radius-lg: 0.75rem;   /* 12px */
--radius-xl: 1rem;      /* 16px */
--radius-full: 9999px;  /* Full rounded */
```

---

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

---

## Implementation Steps

### Step 1: Install Required Dependencies

```bash
cd frontend
npm install @headlessui/react @heroicons/react clsx tailwind-merge
```

---

### Step 2: Update Tailwind Configuration

**File:** `frontend/tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Green
        primary: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981', // Main
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        // Gray scale
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'sans-serif'],
        mono: ['SF Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        'card': '12px',
      },
    },
  },
  plugins: [],
}
```

---

### Step 3: Create Global Styles

**File:** `frontend/src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-gray-200;
  }

  body {
    @apply bg-gray-50 text-gray-900 font-sans antialiased;
  }

  h1 {
    @apply text-3xl font-bold text-gray-900;
  }

  h2 {
    @apply text-2xl font-semibold text-gray-900;
  }

  h3 {
    @apply text-xl font-semibold text-gray-800;
  }

  h4 {
    @apply text-lg font-medium text-gray-800;
  }
}

@layer components {
  /* Card Component */
  .card {
    @apply bg-white rounded-card shadow-card p-6;
  }

  .card:hover {
    @apply shadow-card-hover;
  }

  /* Button Components */
  .btn {
    @apply px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed;
  }

  .btn-primary {
    @apply btn bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700;
  }

  .btn-secondary {
    @apply btn bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300;
  }

  .btn-danger {
    @apply btn bg-red-500 text-white hover:bg-red-600 active:bg-red-700;
  }

  .btn-sm {
    @apply px-3 py-1.5 text-sm;
  }

  .btn-lg {
    @apply px-6 py-3 text-lg;
  }

  /* Input Components */
  .input {
    @apply w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all;
  }

  .input-error {
    @apply border-red-500 focus:ring-red-500 focus:border-red-500;
  }

  /* Label */
  .label {
    @apply block text-sm font-medium text-gray-700 mb-1.5;
  }

  /* Badge */
  .badge {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
  }

  .badge-success {
    @apply badge bg-green-100 text-green-800;
  }

  .badge-warning {
    @apply badge bg-yellow-100 text-yellow-800;
  }

  .badge-error {
    @apply badge bg-red-100 text-red-800;
  }

  .badge-info {
    @apply badge bg-blue-100 text-blue-800;
  }

  .badge-gray {
    @apply badge bg-gray-100 text-gray-800;
  }

  /* Table */
  .table {
    @apply w-full text-left border-collapse;
  }

  .table thead {
    @apply bg-gray-50 border-b border-gray-200;
  }

  .table th {
    @apply px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider;
  }

  .table td {
    @apply px-6 py-4 text-sm text-gray-900 border-b border-gray-200;
  }

  .table tbody tr:hover {
    @apply bg-gray-50;
  }

  /* Stats Card */
  .stat-card {
    @apply bg-white rounded-card shadow-card p-6;
  }

  .stat-value {
    @apply text-3xl font-bold text-gray-900;
  }

  .stat-label {
    @apply text-sm text-gray-500 mt-1;
  }

  .stat-change-positive {
    @apply text-green-600 text-sm font-medium;
  }

  .stat-change-negative {
    @apply text-red-600 text-sm font-medium;
  }
}

/* Remove old purple gradients */
.gradient-bg {
  @apply bg-gray-50; /* Replace with clean background */
}
```

---

### Step 4: Create Reusable Components

#### Button Component

**File:** `frontend/src/components/Button.tsx`

```typescript
import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}) => {
  return (
    <button
      className={clsx(
        // Base styles
        'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',

        // Variants
        {
          'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500':
            variant === 'primary',
          'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500':
            variant === 'secondary',
          'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500':
            variant === 'danger',
          'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500':
            variant === 'ghost',
        },

        // Sizes
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },

        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};
```

---

#### Card Component

**File:** `frontend/src/components/Card.tsx`

```typescript
import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hover = false }) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-card shadow-card p-6',
        hover && 'transition-shadow duration-200 hover:shadow-card-hover',
        className
      )}
    >
      {children}
    </div>
  );
};
```

---

#### Stat Card Component

**File:** `frontend/src/components/StatCard.tsx`

```typescript
import React from 'react';
import { Card } from './Card';
import { clsx } from 'clsx';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: {
    value: string;
    positive: boolean;
  };
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, change, icon }) => {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {change && (
            <p
              className={clsx(
                'text-sm font-medium mt-2 flex items-center',
                change.positive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {change.positive ? '↑' : '↓'} {change.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-primary-50 rounded-lg text-primary-600">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};
```

---

### Step 5: Redesign Dashboard Page

**File:** `frontend/src/app/dashboard/page.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/Card";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/Button";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Welcome back! Here's your overview
            </p>
          </div>
          <Button variant="primary">
            Generate Roster
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            label="Total Employees"
            value="42"
            change={{ value: "8% vs last month", positive: true }}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
          <StatCard
            label="Active Sites"
            value="8"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />
          <StatCard
            label="Shifts This Week"
            value="156"
            change={{ value: "12 unfilled", positive: false }}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
          <StatCard
            label="Monthly Cost"
            value="R 245,000"
            change={{ value: "5% under budget", positive: true }}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Shifts */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Upcoming Shifts
            </h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Main Gate - Morning</p>
                    <p className="text-sm text-gray-500">Today, 8:00 AM - 4:00 PM</p>
                  </div>
                  <span className="badge-success">Assigned</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Expiring Certifications */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Expiring Certifications
            </h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">John Doe</p>
                    <p className="text-sm text-gray-500">PSIRA Grade C - Expires in 15 days</p>
                  </div>
                  <span className="badge-warning">Expiring</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

---

### Step 6: Update Navigation/Sidebar

**File:** `frontend/src/components/Navigation.tsx`

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "📊" },
  { name: "Employees", href: "/employees", icon: "👥" },
  { name: "Clients", href: "/clients", icon: "🏢" },
  { name: "Shifts", href: "/shifts", icon: "📅" },
  { name: "Roster", href: "/roster", icon: "📋" },
  { name: "Reports", href: "/reports", icon: "📈" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="w-64 bg-white border-r border-gray-200 min-h-screen p-4">
      {/* Logo */}
      <div className="mb-8 px-4">
        <h1 className="text-2xl font-bold text-primary-600">GuardianOS</h1>
        <p className="text-xs text-gray-500 mt-1">Security Management</p>
      </div>

      {/* Navigation Links */}
      <div className="space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={clsx(
              "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
              pathname === item.href
                ? "bg-primary-50 text-primary-700"
                : "text-gray-700 hover:bg-gray-50"
            )}
          >
            <span className="mr-3 text-lg">{item.icon}</span>
            {item.name}
          </Link>
        ))}
      </div>

      {/* User Section */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-900">Admin User</p>
          <p className="text-xs text-gray-500">admin@example.com</p>
        </div>
      </div>
    </nav>
  );
}
```

---

### Step 7: Complete File Updates Checklist

**Files to Update:**

- [ ] `tailwind.config.js` - Add design tokens
- [ ] `globals.css` - Add component styles
- [ ] `components/Button.tsx` - Create button component
- [ ] `components/Card.tsx` - Create card component
- [ ] `components/StatCard.tsx` - Create stat card component
- [ ] `components/Navigation.tsx` - Update navigation
- [ ] `app/dashboard/page.tsx` - Redesign dashboard
- [ ] `app/employees/page.tsx` - Apply new styles
- [ ] `app/clients/page.tsx` - Apply new styles
- [ ] `app/shifts/page.tsx` - Apply new styles
- [ ] `app/roster/page.tsx` - Apply new styles
- [ ] `app/login/page.tsx` - Modernize login page

---

### Step 8: Remove Old Styles

**Search and Remove:**

- Purple gradients: `.gradient-purple`, `bg-purple-*`
- Old card styles: `.old-card`, `.legacy-*`
- Inline styles with purple colors
- Old button styles with gradients

```bash
# Search for purple references
grep -r "purple" frontend/src --include="*.tsx" --include="*.css"

# Search for gradient references
grep -r "gradient" frontend/src --include="*.tsx" --include="*.css"
```

---

## Testing Checklist

- [ ] All pages use white/gray backgrounds (no purple)
- [ ] Navigation is clean with green accents
- [ ] Cards have subtle shadows and rounded corners
- [ ] Buttons use new design system
- [ ] Typography is consistent
- [ ] Stats cards display correctly
- [ ] Tables are styled properly
- [ ] Forms use new input styles
- [ ] Mobile responsive on all pages
- [ ] Dark mode support (optional)

---

## Before & After Comparison

### Old Design (RostraCore):
- Purple gradient backgrounds
- Heavier shadows
- Inconsistent spacing
- Mixed color schemes
- Cluttered UI

### New Design (GuardianOS):
- Clean white backgrounds
- Subtle shadows
- Consistent 8px spacing grid
- Green primary, gray secondary
- Minimalist, professional

---

## Deployment

After completing the redesign:

```bash
# Test locally
cd frontend
npm run dev

# Build for production
npm run build

# Deploy
npm run start
```

---

**Next Steps:** Start with Step 1 (dependencies) and work through systematically. Test each component as you build it.
