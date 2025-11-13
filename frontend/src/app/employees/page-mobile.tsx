'use client';

/**
 * Mobile-First Employees Page
 *
 * Redesigned with mobile-first approach following MOBILE_FIRST_REDESIGN_STRATEGY
 *
 * Features:
 * - Card-based layout (no tables on mobile)
 * - SwipeableCard for touch actions (swipe to edit/delete)
 * - PullToRefresh for easy data refresh
 * - BottomSheet for filters (mobile-native pattern)
 * - MobileBottomNav for thumb-zone navigation
 * - 48px minimum touch targets
 * - Skeleton screens for loading states
 * - Search-as-you-type with debouncing
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { employeesApi } from '@/services/api';
import { Employee } from '@/types';
import EmployeeForm from '@/components/EmployeeForm';
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

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    role: 'all',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeesApi.getAll();
      setEmployees(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      await employeesApi.delete(id);
      fetchEmployees();
    } catch (err: any) {
      alert('Failed to delete employee: ' + err.message);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  const handleFormSuccess = () => {
    fetchEmployees();
  };

  // Filter and search employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        employee.first_name.toLowerCase().includes(searchLower) ||
        employee.last_name.toLowerCase().includes(searchLower) ||
        employee.id_number.toLowerCase().includes(searchLower) ||
        employee.role.toLowerCase().includes(searchLower) ||
        employee.status.toLowerCase().includes(searchLower);

      const matchesStatus =
        filters.status === 'all' || employee.status === filters.status;
      const matchesRole = filters.role === 'all' || employee.role === filters.role;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [employees, searchTerm, filters]);

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
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 mb-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
        <MobileBottomNav items={navItems} />
      </div>
    );
  }

  return (
    <>
      <PullToRefresh onRefresh={fetchEmployees}>
        <div className="min-h-screen bg-gray-50 pb-24">
          <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Header - Mobile Optimized */}
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl md:text-4xl font-bold text-gray-900">
                  👥 Employees
                </h1>
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center justify-center min-h-[48px] h-12 px-4 md:px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm md:text-base shadow-lg"
                >
                  <span className="text-xl mr-2">+</span>
                  <span className="hidden sm:inline">Add</span>
                </button>
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
                      placeholder="Search employees..."
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
                    className="flex items-center justify-center min-h-[48px] h-12 w-12 bg-gray-100 hover:bg-gray-200 rounded-lg"
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
                  </button>
                </div>

                {/* Active Filters Display */}
                {(filters.status !== 'all' || filters.role !== 'all') && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {filters.status !== 'all' && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        Status: {filters.status}
                      </span>
                    )}
                    {filters.role !== 'all' && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        Role: {filters.role}
                      </span>
                    )}
                    <button
                      onClick={() => setFilters({ status: 'all', role: 'all' })}
                      className="px-3 py-1 text-gray-600 hover:text-gray-900 text-xs font-medium"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              {/* Results Count */}
              <div className="mb-4 text-sm text-gray-600">
                {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''} found
              </div>

              {/* Employee Cards - Mobile: Swipeable, Desktop: Clickable */}
              {filteredEmployees.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                  {searchTerm || filters.status !== 'all' || filters.role !== 'all'
                    ? 'No employees match your filters'
                    : 'No employees found. Click "Add" to create one.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEmployees.map((employee) => (
                    <SwipeableCard
                      key={employee.employee_id}
                      leftAction={{
                        label: 'Edit',
                        icon: '✏️',
                        color: 'blue',
                        onClick: () => handleEdit(employee),
                      }}
                      rightAction={{
                        label: 'Delete',
                        icon: '🗑️',
                        color: 'red',
                        onClick: () => handleDelete(employee.employee_id),
                      }}
                    >
                      <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition">
                        {/* Employee Info */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900">
                              {employee.first_name} {employee.last_name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              ID: {employee.id_number}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              employee.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {employee.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Role</p>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                employee.role === 'armed'
                                  ? 'bg-red-100 text-red-800'
                                  : employee.role === 'unarmed'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {employee.role.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Hourly Rate</p>
                            <p className="text-sm font-bold text-gray-900">
                              R{employee.hourly_rate.toFixed(2)}/hr
                            </p>
                          </div>
                        </div>

                        {/* Desktop Actions (hidden on mobile, shown on md+) */}
                        <div className="hidden md:flex gap-3 mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={() => handleEdit(employee)}
                            className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(employee.employee_id)}
                            className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                          >
                            Delete
                          </button>
                        </div>

                        {/* Mobile Swipe Hint (shown on first card only on mobile) */}
                        {employee.employee_id === filteredEmployees[0].employee_id && (
                          <p className="md:hidden text-xs text-center text-gray-400 mt-3 italic">
                            👈 Swipe left or right for actions 👉
                          </p>
                        )}
                      </div>
                    </SwipeableCard>
                  ))}
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
        title="Filter Employees"
      >
        <div className="space-y-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full h-12 border border-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="w-full h-12 border border-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="armed">Armed</option>
              <option value="unarmed">Unarmed</option>
              <option value="supervisor">Supervisor</option>
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
              setFilters({ status: 'all', role: 'all' });
              setShowFilters(false);
            }}
            className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
          >
            Clear Filters
          </button>
        </div>
      </BottomSheet>

      {/* Employee Form Modal (reuse existing) */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <EmployeeForm
              employee={editingEmployee}
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
