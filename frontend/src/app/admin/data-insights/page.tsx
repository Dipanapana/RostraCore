"use client";

/**
 * Data Insights Dashboard
 *
 * Comprehensive dashboard for:
 * - Feature usage tracking
 * - Conversion funnel analysis
 * - User behavior insights
 * - Product decision support
 *
 * For product managers and decision-makers
 */

import React, { useState, useEffect } from 'react';
import { Button, Card } from '@/design-system/components';
import { analytics } from '@/lib/analytics';

interface FeatureUsage {
  name: string;
  users: number;
  sessions: number;
  avgTimeSpent: number; // seconds
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

interface FunnelStep {
  name: string;
  users: number;
  dropoff: number;
  conversionRate: number;
}

export default function DataInsightsPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [activeTab, setActiveTab] = useState<'features' | 'funnels' | 'behavior'>('features');

  // Mock data (replace with API calls)
  const featureUsage: FeatureUsage[] = [
    { name: 'Roster Generation', users: 142, sessions: 1283, avgTimeSpent: 127, trend: 'up', trendPercent: 15 },
    { name: 'Employee Management', users: 138, sessions: 892, avgTimeSpent: 245, trend: 'up', trendPercent: 8 },
    { name: 'Marketplace Hiring', users: 89, sessions: 423, avgTimeSpent: 312, trend: 'down', trendPercent: 5 },
    { name: 'Payroll Management', users: 112, sessions: 534, avgTimeSpent: 189, trend: 'stable', trendPercent: 2 },
    { name: 'Analytics Dashboard', users: 76, sessions: 234, avgTimeSpent: 156, trend: 'up', trendPercent: 22 },
    { name: 'Site Management', users: 134, sessions: 756, avgTimeSpent: 98, trend: 'stable', trendPercent: 1 },
  ];

  const signupFunnel: FunnelStep[] = [
    { name: 'Landing Page Visit', users: 1000, dropoff: 0, conversionRate: 100 },
    { name: 'Pricing Page View', users: 450, dropoff: 55, conversionRate: 45 },
    { name: 'Signup Form Start', users: 320, dropoff: 29, conversionRate: 32 },
    { name: 'Email Verified', users: 245, dropoff: 23, conversionRate: 24.5 },
    { name: 'Onboarding Complete', users: 189, dropoff: 23, conversionRate: 18.9 },
    { name: 'First Roster Generated', users: 156, dropoff: 17, conversionRate: 15.6 },
    { name: 'Paid Subscription', users: 67, dropoff: 57, conversionRate: 6.7 },
  ];

  const onboardingFunnel: FunnelStep[] = [
    { name: 'Onboarding Started', users: 245, dropoff: 0, conversionRate: 100 },
    { name: 'Added Employees', users: 221, dropoff: 10, conversionRate: 90.2 },
    { name: 'Created Site', users: 207, dropoff: 6, conversionRate: 84.5 },
    { name: 'Generated Roster', users: 189, dropoff: 9, conversionRate: 77.1 },
    { name: 'Invited Team', users: 134, dropoff: 29, conversionRate: 54.7 },
    { name: 'Connected Accounting', users: 67, dropoff: 50, conversionRate: 27.3 },
  ];

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') {
      return <span className="text-success-500">↗</span>;
    }
    if (trend === 'down') {
      return <span className="text-danger-500">↘</span>;
    }
    return <span className="text-gray-400">→</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Data Insights Dashboard
          </h1>
          <p className="text-gray-600">
            Product usage data and conversion analytics for decision-making
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm">
            {['7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range as typeof timeRange)}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Last {range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={() => {
              // Export data
              const data = { featureUsage, signupFunnel, onboardingFunnel };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `data-insights-${timeRange}.json`;
              a.click();
            }}
          >
            Export Data
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          {[
            { id: 'features', label: 'Feature Usage', icon: '📊' },
            { id: 'funnels', label: 'Conversion Funnels', icon: '🎯' },
            { id: 'behavior', label: 'User Behavior', icon: '👥' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors border-b-4 ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feature Usage Tab */}
        {activeTab === 'features' && (
          <div className="space-y-6">
            <Card padding="lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Feature Usage (Last {timeRange === '7d' ? '7 Days' : timeRange === '30d' ? '30 Days' : '90 Days'})
              </h2>

              <div className="space-y-4">
                {featureUsage
                  .sort((a, b) => b.users - a.users)
                  .map((feature, index) => (
                    <div
                      key={feature.name}
                      className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200 hover:border-primary-500 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-bold text-primary-500">
                            #{index + 1}
                          </div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {feature.name}
                          </h3>
                          <div className="flex items-center gap-1 text-sm">
                            {getTrendIcon(feature.trend)}
                            <span
                              className={
                                feature.trend === 'up'
                                  ? 'text-success-600'
                                  : feature.trend === 'down'
                                  ? 'text-danger-600'
                                  : 'text-gray-500'
                              }
                            >
                              {feature.trendPercent}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-6">
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Unique Users</div>
                          <div className="text-3xl font-bold text-gray-900">
                            {feature.users}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Total Sessions</div>
                          <div className="text-3xl font-bold text-gray-900">
                            {feature.sessions}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Avg. Time Spent</div>
                          <div className="text-3xl font-bold text-gray-900">
                            {formatTime(feature.avgTimeSpent)}
                          </div>
                        </div>
                      </div>

                      {/* Usage Bar */}
                      <div className="mt-4">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
                            style={{ width: `${(feature.users / 150) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>

            {/* Key Insights */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card padding="lg" className="bg-success-50 border-2 border-success-200">
                <div className="text-3xl mb-3">🏆</div>
                <div className="text-sm text-success-600 font-semibold mb-1">
                  Most Popular
                </div>
                <div className="text-xl font-bold text-gray-900">
                  Roster Generation
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  142 users, 1,283 sessions
                </div>
              </Card>

              <Card padding="lg" className="bg-accent-50 border-2 border-accent-200">
                <div className="text-3xl mb-3">⚡</div>
                <div className="text-sm text-accent-600 font-semibold mb-1">
                  Fastest Growing
                </div>
                <div className="text-xl font-bold text-gray-900">
                  Analytics Dashboard
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  +22% growth this period
                </div>
              </Card>

              <Card padding="lg" className="bg-danger-50 border-2 border-danger-200">
                <div className="text-3xl mb-3">⚠️</div>
                <div className="text-sm text-danger-600 font-semibold mb-1">
                  Needs Attention
                </div>
                <div className="text-xl font-bold text-gray-900">
                  Marketplace Hiring
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  -5% decline, investigate UX
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Conversion Funnels Tab */}
        {activeTab === 'funnels' && (
          <div className="space-y-8">
            {/* Signup Funnel */}
            <Card padding="lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Signup Conversion Funnel
              </h2>

              <div className="space-y-4">
                {signupFunnel.map((step, index) => (
                  <div key={step.name} className="relative">
                    {/* Connection Line */}
                    {index < signupFunnel.length - 1 && (
                      <div className="absolute left-1/2 top-full h-4 w-0.5 bg-gray-300 transform -translate-x-1/2" />
                    )}

                    <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl p-6 border-2 border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {step.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-3xl font-extrabold text-primary-600">
                              {step.users}
                            </div>
                            <div className="text-sm text-gray-600">users</div>
                          </div>
                          {step.dropoff > 0 && (
                            <div className="text-right">
                              <div className="text-2xl font-bold text-danger-600">
                                -{step.dropoff}%
                              </div>
                              <div className="text-sm text-gray-600">drop-off</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            step.conversionRate >= 50
                              ? 'bg-success-500'
                              : step.conversionRate >= 20
                              ? 'bg-accent-500'
                              : 'bg-danger-500'
                          }`}
                          style={{ width: `${step.conversionRate}%` }}
                        />
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        {step.conversionRate}% conversion rate
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-8 grid grid-cols-3 gap-6">
                <div className="bg-primary-50 rounded-xl p-6 border border-primary-200">
                  <div className="text-sm text-primary-600 font-semibold mb-1">
                    Overall Conversion
                  </div>
                  <div className="text-4xl font-extrabold text-primary-700">
                    6.7%
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    From landing to paid
                  </div>
                </div>

                <div className="bg-danger-50 rounded-xl p-6 border border-danger-200">
                  <div className="text-sm text-danger-600 font-semibold mb-1">
                    Biggest Drop-off
                  </div>
                  <div className="text-4xl font-extrabold text-danger-700">
                    57%
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    First Roster → Paid
                  </div>
                </div>

                <div className="bg-accent-50 rounded-xl p-6 border border-accent-200">
                  <div className="text-sm text-accent-600 font-semibold mb-1">
                    Best Performing
                  </div>
                  <div className="text-4xl font-extrabold text-accent-700">
                    90%
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    Onboarding → Employees
                  </div>
                </div>
              </div>
            </Card>

            {/* Onboarding Funnel */}
            <Card padding="lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Onboarding Completion Funnel
              </h2>

              <div className="grid grid-cols-6 gap-2">
                {onboardingFunnel.map((step, index) => {
                  const height = (step.conversionRate / 100) * 200; // Max 200px

                  return (
                    <div key={step.name} className="flex flex-col items-center">
                      <div
                        className="w-full bg-gradient-to-t from-primary-500 to-accent-500 rounded-t-lg transition-all hover:opacity-80"
                        style={{ height: `${height}px` }}
                      />
                      <div className="mt-3 text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {step.users}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {step.conversionRate}%
                        </div>
                        <div className="text-xs text-gray-500 mt-2 leading-tight">
                          {step.name}
                        </div>
                        {step.dropoff > 0 && (
                          <div className="text-xs text-danger-600 font-semibold mt-1">
                            -{step.dropoff}%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">💡</div>
                  <div>
                    <div className="font-bold text-yellow-900 mb-2">
                      Key Insight
                    </div>
                    <p className="text-sm text-yellow-800">
                      50% of users drop off when connecting accounting software. Consider:
                      making this step optional, adding more integrations, or improving
                      the connection UX.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* User Behavior Tab */}
        {activeTab === 'behavior' && (
          <div className="space-y-6">
            <Card padding="lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                User Behavior Insights
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-primary-50 rounded-xl p-6 border border-primary-200">
                  <h3 className="font-bold text-gray-900 mb-4">
                    Session Duration
                  </h3>
                  <div className="text-5xl font-extrabold text-primary-600 mb-2">
                    8m 34s
                  </div>
                  <div className="text-sm text-gray-600">
                    Average time per session
                  </div>
                  <div className="text-xs text-success-600 font-semibold mt-2">
                    ↗ +12% vs last period
                  </div>
                </div>

                <div className="bg-accent-50 rounded-xl p-6 border border-accent-200">
                  <h3 className="font-bold text-gray-900 mb-4">
                    Pages Per Session
                  </h3>
                  <div className="text-5xl font-extrabold text-accent-600 mb-2">
                    4.7
                  </div>
                  <div className="text-sm text-gray-600">
                    Average pages viewed
                  </div>
                  <div className="text-xs text-success-600 font-semibold mt-2">
                    ↗ +8% vs last period
                  </div>
                </div>

                <div className="bg-success-50 rounded-xl p-6 border border-success-200">
                  <h3 className="font-bold text-gray-900 mb-4">
                    Return Rate
                  </h3>
                  <div className="text-5xl font-extrabold text-success-600 mb-2">
                    67%
                  </div>
                  <div className="text-sm text-gray-600">
                    Users return within 7 days
                  </div>
                  <div className="text-xs text-success-600 font-semibold mt-2">
                    ↗ +15% vs last period
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-4">
                    Mobile Usage
                  </h3>
                  <div className="text-5xl font-extrabold text-gray-900 mb-2">
                    43%
                  </div>
                  <div className="text-sm text-gray-600">
                    Sessions on mobile devices
                  </div>
                  <div className="text-xs text-accent-600 font-semibold mt-2">
                    → Stable vs last period
                  </div>
                </div>
              </div>
            </Card>

            {/* Recommendations */}
            <Card padding="lg" className="bg-gradient-to-br from-primary-50 to-accent-50 border-2 border-primary-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                🎯 Data-Driven Recommendations
              </h2>

              <div className="space-y-4">
                {[
                  {
                    priority: 'High',
                    title: 'Optimize Roster → Paid conversion',
                    description: '57% of users drop off after first roster. Add value demonstration or pricing reminder.',
                    impact: 'Could increase paid conversions by 20-30%',
                  },
                  {
                    priority: 'Medium',
                    title: 'Improve Marketplace UX',
                    description: 'Marketplace usage declining by 5%. User research needed to identify friction points.',
                    impact: 'Potential to increase hiring feature adoption',
                  },
                  {
                    priority: 'Low',
                    title: 'Make accounting integration optional',
                    description: '50% drop-off at this onboarding step. Consider moving to settings.',
                    impact: 'Could improve onboarding completion by 25%',
                  },
                ].map((rec, index) => (
                  <div key={index} className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            rec.priority === 'High'
                              ? 'bg-danger-100 text-danger-700'
                              : rec.priority === 'Medium'
                              ? 'bg-accent-100 text-accent-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {rec.priority} Priority
                        </span>
                        <h3 className="font-bold text-gray-900">{rec.title}</h3>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-2">{rec.description}</p>
                    <p className="text-sm text-success-600 font-semibold">
                      💡 {rec.impact}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
