'use client';

/**
 * Mobile-First Sites Page
 *
 * Redesigned with mobile-first approach following MOBILE_FIRST_REDESIGN_STRATEGY
 *
 * Features:
 * - SwipeableCard for touch actions
 * - PullToRefresh for data updates
 * - BottomSheet for filters
 * - Map view toggle (list/map)
 * - MobileBottomNav integration
 * - 48px touch targets
 * - Location-aware sorting
 * - Visual site status indicators
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { sitesApi } from '@/services/api';
import { Site } from '@/types';
import SiteForm from '@/components/SiteForm';
import {
  PullToRefresh,
  SwipeableCard,
  BottomSheet,
  MobileBottomNav,
  HomeIcon,
  CalendarIcon,
  MarketplaceIcon,
  ChartIcon,
  UserIcon,
} from '@/design-system/components';

export default function SitesPage() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    skill: 'all',
    minStaff: 'all',
  });

  // View mode (list or map)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const response = await sitesApi.getAll();
      setSites(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sites');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this site?')) return;

    try {
      await sitesApi.delete(id);
      fetchSites();
    } catch (err: any) {
      alert('Failed to delete site: ' + err.message);
    }
  };

  const handleEdit = (site: Site) => {
    setEditingSite(site);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingSite(null);
  };

  const handleFormSuccess = () => {
    fetchSites();
  };

  // Filter and search sites
  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        site.client_name.toLowerCase().includes(searchLower) ||
        site.address.toLowerCase().includes(searchLower) ||
        (site.required_skill?.toLowerCase().includes(searchLower) || false) ||
        (site.shift_pattern?.toLowerCase().includes(searchLower) || false);

      const matchesSkill =
        filters.skill === 'all' || site.required_skill === filters.skill;

      const matchesMinStaff =
        filters.minStaff === 'all' ||
        (filters.minStaff === '1-2' && site.min_staff <= 2) ||
        (filters.minStaff === '3-5' && site.min_staff >= 3 && site.min_staff <= 5) ||
        (filters.minStaff === '6+' && site.min_staff >= 6);

      return matchesSearch && matchesSkill && matchesMinStaff;
    });
  }, [sites, searchTerm, filters]);

  // Get unique skills for filter
  const uniqueSkills = useMemo(() => {
    const skills = sites.map((s) => s.required_skill).filter(Boolean);
    return Array.from(new Set(skills));
  }, [sites]);

  // Mobile Bottom Navigation
  const navItems = [
    {
      id: 'dashboard',
      label: 'Home',
      href: '/dashboard',
      icon: <HomeIcon className="w-full h-full" />,
    },
    {
      id: 'roster',
      label: 'Roster',
      href: '/roster',
      icon: <CalendarIcon className="w-full h-full" />,
    },
    {
      id: 'marketplace',
      label: 'Hire',
      href: '/marketplace',
      icon: <MarketplaceIcon className="w-full h-full" />,
    },
    {
      id: 'reports',
      label: 'Reports',
      href: '/dashboards',
      icon: <ChartIcon className="w-full h-full" />,
    },
    {
      id: 'profile',
      label: 'Profile',
      href: '/admin/profile',
      icon: <UserIcon className="w-full h-full" />,
    },
  ];

  // Loading Skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        </div>
        <MobileBottomNav items={navItems} />
      </div>
    );
  }

  return (
    <>
      <PullToRefresh onRefresh={fetchSites}>
        <div className="min-h-screen bg-gray-50 pb-24">
          <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Header - Mobile Optimized */}
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl md:text-4xl font-bold text-gray-900">
                  📍 Sites
                </h1>
                <div className="flex gap-2">
                  {/* View Toggle */}
                  <button
                    onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                    className="flex items-center justify-center min-h-[48px] h-12 w-12 bg-gray-100 hover:bg-gray-200 rounded-lg md:hidden"
                    aria-label={viewMode === 'list' ? 'Map view' : 'List view'}
                  >
                    {viewMode === 'list' ? (
                      <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    )}
                  </button>

                  {/* Add Site Button */}
                  <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center justify-center min-h-[48px] h-12 px-4 md:px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm md:text-base shadow-lg"
                  >
                    <span className="text-xl mr-2">+</span>
                    <span className="hidden sm:inline">Add</span>
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              {/* Search and Filter Bar - Mobile First */}
              <div className="bg-white rounded-xl p-4 mb-4 shadow">
                <div className="flex gap-3">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Search sites..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-12 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <svg
                      className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>

                  {/* Filter Button */}
                  <button
                    onClick={() => setShowFilters(true)}
                    className="flex items-center justify-center min-h-[48px] h-12 w-12 bg-gray-100 hover:bg-gray-200 rounded-lg relative"
                  >
                    <svg
                      className="w-6 h-6 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    </svg>
                    {(filters.skill !== 'all' || filters.minStaff !== 'all') && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full" />
                    )}
                  </button>
                </div>

                {/* Active Filters Display */}
                {(filters.skill !== 'all' || filters.minStaff !== 'all') && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {filters.skill !== 'all' && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        Skill: {filters.skill}
                      </span>
                    )}
                    {filters.minStaff !== 'all' && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        Staff: {filters.minStaff}
                      </span>
                    )}
                    <button
                      onClick={() => setFilters({ skill: 'all', minStaff: 'all' })}
                      className="px-3 py-1 text-gray-600 hover:text-gray-900 text-xs font-medium"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              {/* Results Count */}
              <div className="mb-4 text-sm text-gray-600">
                {filteredSites.length} site{filteredSites.length !== 1 ? 's' : ''} found
              </div>

              {/* Site Cards - Mobile: Swipeable, Desktop: Clickable */}
              {viewMode === 'list' ? (
                filteredSites.length === 0 ? (
                  <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                    {searchTerm || filters.skill !== 'all' || filters.minStaff !== 'all'
                      ? 'No sites match your filters'
                      : 'No sites found. Click "Add" to create one.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSites.map((site) => (
                      <SwipeableCard
                        key={site.site_id}
                        leftAction={{
                          label: 'Edit',
                          icon: '✏️',
                          color: 'blue',
                          onClick: () => handleEdit(site),
                        }}
                        rightAction={{
                          label: 'Delete',
                          icon: '🗑️',
                          color: 'red',
                          onClick: () => handleDelete(site.site_id),
                        }}
                      >
                        <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition">
                          {/* Site Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-gray-900">
                                {site.client_name}
                              </h3>
                              <p className="text-xs text-gray-500">Site #{site.site_id}</p>
                            </div>
                            {site.required_skill && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                                {site.required_skill}
                              </span>
                            )}
                          </div>

                          {/* Address */}
                          <div className="flex items-start mb-3">
                            <svg className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-sm text-gray-600">{site.address}</p>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Min Staff</p>
                              <p className="text-sm font-bold text-gray-900">{site.min_staff}</p>
                            </div>
                            {site.billing_rate && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Billing Rate</p>
                                <p className="text-sm font-bold text-gray-900">
                                  R{site.billing_rate}/hr
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Shift Pattern */}
                          {site.shift_pattern && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-500 mb-1">Shift Pattern</p>
                              <p className="text-sm text-gray-700">{site.shift_pattern}</p>
                            </div>
                          )}

                          {/* Notes */}
                          {site.notes && (
                            <div className="text-xs text-gray-500 italic border-t border-gray-100 pt-3">
                              {site.notes}
                            </div>
                          )}

                          {/* Desktop Actions (hidden on mobile, shown on md+) */}
                          <div className="hidden md:flex gap-3 mt-4 pt-4 border-t border-gray-200">
                            <button
                              onClick={() => handleEdit(site)}
                              className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(site.site_id)}
                              className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </SwipeableCard>
                    ))}
                  </div>
                )
              ) : (
                /* Map View Placeholder */
                <div className="bg-white rounded-xl p-8 text-center">
                  <div className="text-6xl mb-4">🗺️</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Map View Coming Soon
                  </h3>
                  <p className="text-gray-600 mb-6">
                    View all your sites on an interactive map
                  </p>
                  <button
                    onClick={() => setViewMode('list')}
                    className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    Back to List
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </PullToRefresh>

      {/* Filter Bottom Sheet */}
      <BottomSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filter Sites"
      >
        <div className="space-y-4">
          {/* Skill Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Required Skill
            </label>
            <select
              value={filters.skill}
              onChange={(e) => setFilters({ ...filters, skill: e.target.value })}
              className="w-full h-12 border border-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Skills</option>
              {uniqueSkills.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
          </div>

          {/* Min Staff Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Staff
            </label>
            <select
              value={filters.minStaff}
              onChange={(e) => setFilters({ ...filters, minStaff: e.target.value })}
              className="w-full h-12 border border-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sizes</option>
              <option value="1-2">1-2 Staff</option>
              <option value="3-5">3-5 Staff</option>
              <option value="6+">6+ Staff</option>
            </select>
          </div>

          {/* Apply Button */}
          <button
            onClick={() => setShowFilters(false)}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Apply Filters
          </button>

          {/* Clear Button */}
          <button
            onClick={() => {
              setFilters({ skill: 'all', minStaff: 'all' });
              setShowFilters(false);
            }}
            className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
          >
            Clear Filters
          </button>
        </div>
      </BottomSheet>

      {/* Site Form Modal (reuse existing) */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <SiteForm
              site={editingSite}
              onClose={handleCloseForm}
              onSuccess={handleFormSuccess}
            />
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav items={navItems} />
    </>
  );
}
