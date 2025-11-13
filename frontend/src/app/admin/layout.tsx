/**
 * Admin Layout
 *
 * Provides consistent layout with mobile bottom navigation
 * for all admin pages
 */

'use client';

import React from 'react';
import {
  MobileBottomNav,
  HomeIcon,
  CalendarIcon,
  MarketplaceIcon,
  ChartIcon,
  UserIcon,
  type NavItem,
} from '@/design-system/components';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Define navigation items for admin area
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Home',
      href: '/admin/dashboard',
      icon: <HomeIcon className="w-full h-full" />,
    },
    {
      id: 'roster',
      label: 'Roster',
      href: '/admin/roster',
      icon: <CalendarIcon className="w-full h-full" />,
      badge: 3, // Example: 3 pending rosters
    },
    {
      id: 'marketplace',
      label: 'Hire',
      href: '/admin/marketplace',
      icon: <MarketplaceIcon className="w-full h-full" />,
    },
    {
      id: 'reports',
      label: 'Reports',
      href: '/admin/reports',
      icon: <ChartIcon className="w-full h-full" />,
    },
    {
      id: 'profile',
      label: 'Profile',
      href: '/admin/profile',
      icon: <UserIcon className="w-full h-full" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="pb-24 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation - Only visible on mobile */}
      <MobileBottomNav items={navItems} />
    </div>
  );
}
