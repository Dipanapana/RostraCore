'use client';

/**
 * Mobile-First Roster Page
 *
 * Redesigned with mobile-first approach following MOBILE_FIRST_REDESIGN_STRATEGY
 *
 * Features:
 * - Multi-step wizard for roster generation (mobile-friendly)
 * - Full-screen progress overlay with cancellation
 * - Card-based results display (no tables)
 * - PullToRefresh for list view
 * - MobileBottomNav integration
 * - 48px touch targets
 * - Swipeable shift cards
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { rosterApi } from '@/services/api';
import { RosterWizard, RosterGenerationParams } from '@/components/RosterWizard';
import {
  PullToRefresh,
  SwipeableCard,
  MobileBottomNav,
  HomeIcon,
  CalendarIcon,
  MarketplaceIcon,
  ChartIcon,
  UserIcon,
} from '@/design-system/components';

type JobStatus = 'PENDING' | 'STARTED' | 'PROGRESS' | 'SUCCESS' | 'FAILURE';

interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  progress: number;
  status_message?: string;
  stage?: string;
  result?: any;
  error?: string;
  completed_at?: string;
}

export default function RosterPage() {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Async job state
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect for elapsed seconds
  useEffect(() => {
    if (loading) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [loading]);

  // Poll for job status
  useEffect(() => {
    if (jobId && loading) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/status/${jobId}`
          );
          const data: JobStatusResponse = await response.json();
          setJobStatus(data);

          if (data.status === 'SUCCESS') {
            setResult(data.result);
            setLoading(false);
            setJobId(null);

            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          } else if (data.status === 'FAILURE') {
            setError(data.error || 'Job failed');
            setLoading(false);
            setJobId(null);

            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
        } catch (err: any) {
          console.error('Error polling job status:', err);
        }
      }, 2000);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }
  }, [jobId, loading]);

  const handleGenerate = async (params: RosterGenerationParams) => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      setJobStatus(null);
      setShowWizard(false);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/roster/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            start_date: params.startDate,
            end_date: params.endDate,
            site_ids: params.siteIds,
            algorithm: params.algorithm,
            budget_limit: params.budgetLimit,
            user_id: 1,
            org_id: 1,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to start roster generation job');
      }

      const data = await response.json();
      setJobId(data.job_id);
    } catch (err: any) {
      setError(err.message || 'Failed to generate roster');
      setLoading(false);
    }
  };

  const handleCancelJob = async () => {
    if (!jobId) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/cancel/${jobId}`, {
        method: 'DELETE',
      });

      setLoading(false);
      setJobId(null);
      setJobStatus(null);

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    } catch (err: any) {
      console.error('Error canceling job:', err);
    }
  };

  const handleConfirm = async () => {
    if (!result || !result.assignments) return;

    try {
      setLoading(true);
      await rosterApi.confirm(result.assignments);
      alert('Roster confirmed successfully!');
      setResult(null);
    } catch (err: any) {
      alert('Failed to confirm roster: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    // Refresh logic if needed
  };

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

  return (
    <>
      {/* Wizard Modal - Full Screen on Mobile */}
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-white md:bg-black md:bg-opacity-50 md:flex md:items-center md:justify-center">
          <div className="h-full md:h-auto md:max-w-2xl md:w-full md:max-h-[90vh] md:rounded-xl md:overflow-hidden">
            <RosterWizard
              onGenerate={handleGenerate}
              onCancel={() => setShowWizard(false)}
            />
          </div>
        </div>
      )}

      {/* Progress Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 md:p-8 max-w-md w-full mx-4">
            <div className="text-center">
              {/* Animated spinner */}
              <div className="mb-4 flex justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
              </div>

              {/* Status message */}
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {jobStatus?.status_message || 'Initializing optimization...'}
              </h3>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${jobStatus?.progress || 0}%` }}
                ></div>
              </div>

              {/* Progress percentage */}
              <div className="text-sm text-gray-600 mb-4">
                {jobStatus?.progress || 0}% complete
                {jobStatus?.stage && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({jobStatus.stage})
                  </span>
                )}
              </div>

              {/* Elapsed time */}
              <div className="text-xs text-gray-500 mb-4">
                Elapsed time: {elapsedSeconds}s
              </div>

              {/* Cancel button */}
              <button
                onClick={handleCancelJob}
                className="min-h-[48px] h-12 px-6 text-red-600 hover:text-red-700 font-medium border-2 border-red-600 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen bg-gray-50 pb-24">
          <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl md:text-4xl font-bold text-gray-900">
                  📋 Roster
                </h1>
                <button
                  onClick={() => setShowWizard(true)}
                  className="flex items-center justify-center min-h-[48px] h-12 px-4 md:px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg"
                >
                  <span className="text-xl mr-2">+</span>
                  <span>Generate</span>
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              {/* Results */}
              {result ? (
                <div className="space-y-4">
                  {/* Summary Card */}
                  <div className="bg-white rounded-xl p-6 shadow">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      ✅ Roster Generated
                    </h2>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Shifts</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {result.summary?.total_shifts || result.assignments?.length || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Assigned</p>
                        <p className="text-2xl font-bold text-green-600">
                          {result.summary?.assigned_shifts || result.assignments?.length || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Unassigned</p>
                        <p className="text-2xl font-bold text-red-600">
                          {result.summary?.unassigned_shifts || result.unfilled_shifts?.length || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Cost</p>
                        <p className="text-2xl font-bold text-blue-600">
                          R{result.summary?.total_cost?.toLocaleString() || '0'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleConfirm}
                      className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                    >
                      Confirm & Save Roster
                    </button>
                  </div>

                  {/* Assignments */}
                  {result.assignments && result.assignments.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3">
                        Assigned Shifts ({result.assignments.length})
                      </h3>
                      <div className="space-y-3">
                        {result.assignments.map((assignment: any, index: number) => (
                          <div
                            key={index}
                            className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-900">
                                  {assignment.employee_name || `Employee #${assignment.employee_id}`}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {assignment.site_name || `Site #${assignment.site_id}`}
                                </p>
                              </div>
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                Assigned
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(assignment.start_time).toLocaleString()} -{' '}
                              {new Date(assignment.end_time).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unfilled Shifts */}
                  {result.unfilled_shifts && result.unfilled_shifts.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3">
                        ⚠️ Unfilled Shifts ({result.unfilled_shifts.length})
                      </h3>
                      <div className="space-y-3">
                        {result.unfilled_shifts.map((shift: any, index: number) => (
                          <div
                            key={index}
                            className="bg-red-50 rounded-xl p-4 border border-red-200"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-900">
                                  {shift.site_name || `Site #${shift.site_id}`}
                                </h4>
                                <p className="text-sm text-red-600">No available employee</p>
                              </div>
                              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                                Unfilled
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(shift.start_time).toLocaleString()} -{' '}
                              {new Date(shift.end_time).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl p-8 text-center">
                  <div className="text-6xl mb-4">📅</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No Roster Generated
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Click "Generate" to create a new roster using our optimization wizard
                  </p>
                  <button
                    onClick={() => setShowWizard(true)}
                    className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </PullToRefresh>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav items={navItems} />
    </>
  );
}
