'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { superadminApi } from '@/services/api'
import Sidebar from '@/components/layout/Sidebar'
import TopHeader from '@/components/layout/TopHeader'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Target,
  Shield,
  Zap,
  Calendar,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  UserPlus,
  Mail,
  X,
  Trash2,
} from 'lucide-react'

interface Analytics {
  generated_at: string
  revenue: {
    mrr: number
    arr: number
    arpu: number
    arpg: number
    revenue_per_shift: number
    mrr_growth_rate: number
    total_guards_billable: number
    projected_next_month_mrr: number
  }
  operations: {
    shift_fill_rate: number
    guard_utilization_rate: number
    avg_hours_per_guard_weekly: number
    overtime_rate: number
    certification_compliance_rate: number
    expiring_certs_30_days: number
    avg_shifts_per_site_weekly: number
    unfilled_shifts_count: number
    sites_with_coverage_gaps: number
  }
  customer_health: {
    avg_engagement_score: number
    at_risk_organizations: number
    healthy_organizations: number
    power_users: number
    avg_days_since_last_roster: number
    orgs_no_activity_7_days: number
    orgs_no_activity_30_days: number
    feature_adoption_rates: Record<string, number>
  }
  growth: {
    trial_conversion_rate: number
    avg_time_to_conversion_days: number
    new_signups_this_week: number
    new_signups_this_month: number
    churn_rate_monthly: number
    net_revenue_retention: number
    logo_retention_rate: number
    expansion_revenue: number
  }
  insights: {
    total_guard_hours_this_month: number
    total_shifts_this_month: number
    busiest_day_of_week: string
    peak_shift_hour: number
    avg_guards_per_client: number
    largest_organization: string
    fastest_growing_org: string | null
    highest_churn_risk_org: string | null
    revenue_concentration_top3: number
    guard_concentration_top3: number
    week_over_week_guard_growth: number
    month_over_month_shift_growth: number
  }
  top_organizations_by_revenue: Array<{
    org_id: number
    company_name: string
    revenue: number
    guards: number
    subscription_status: string
  }>
  at_risk_organizations: Array<{
    org_id: number
    org_code: string
    company_name: string
    health_score: number
    risk_level: string
    risk_factors: string[]
    recommended_actions: string[]
    lifetime_value: number
  }>
  expansion_opportunities: Array<{
    org_id: number
    company_name: string
    signals: string[]
    current_guards: number
    health_score: number
  }>
  daily_signups: Array<{ date: string; count: number }>
  daily_shifts: Array<{ date: string; count: number }>
  daily_revenue: Array<{ date: string; amount: number }>
}

interface Invitation {
  invitation_id: number
  email: string
  invited_by: number | null
  invited_by_username: string | null
  created_at: string
  expires_at: string
  accepted_at: string | null
  revoked: boolean
}

interface Organization {
  org_id: number
  org_code: string
  company_name: string
  subscription_status: string
  subscription_tier: string
  is_active: boolean
  employee_count: number
  active_employee_count: number
  client_count: number
  site_count: number
  user_count: number
  trial_end_date: string | null
  trial_days_remaining: number | null
  monthly_rate_per_guard: number
  estimated_monthly_cost: number
  payfast_active: boolean
  created_at: string
}

export default function SuperadminPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'organizations' | 'health' | 'growth' | 'invitations'>('overview')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  // Invitation state
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFullName, setInviteFullName] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
        return
      }
      if (user.role?.toLowerCase() !== 'superadmin') {
        router.push('/dashboard')
        return
      }
      fetchData()
    }
  }, [authLoading, user, router])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [analyticsRes, orgsRes] = await Promise.all([
        superadminApi.getComprehensiveAnalytics(),
        superadminApi.getOrganizations({ status: statusFilter || undefined, search: searchTerm || undefined })
      ])
      setAnalytics(analyticsRes.data)
      setOrganizations(orgsRes.data)
      setError(null)
    } catch (err: any) {
      console.error('Failed to fetch superadmin data:', err)
      if (err.response?.status === 403) {
        setError('Access denied. Superadmin privileges required.')
      } else {
        setError(err.response?.data?.detail || 'Failed to load data')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role?.toLowerCase() === 'superadmin' && !authLoading && activeTab === 'organizations') {
      const timer = setTimeout(() => fetchData(), 300)
      return () => clearTimeout(timer)
    }
  }, [statusFilter, searchTerm])

  const handleExtendTrial = async (orgId: number, orgName: string) => {
    const days = prompt(`Extend trial for ${orgName} by how many days?`, '30')
    if (!days) return
    const daysNum = parseInt(days)
    if (isNaN(daysNum) || daysNum <= 0) {
      alert('Please enter a valid number of days')
      return
    }
    try {
      setActionLoading(orgId)
      await superadminApi.extendTrial(orgId, daysNum)
      alert(`Trial extended by ${daysNum} days for ${orgName}`)
      fetchData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to extend trial')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSuspend = async (orgId: number, orgName: string) => {
    const reason = prompt(`Reason for suspending ${orgName}:`)
    if (reason === null) return
    try {
      setActionLoading(orgId)
      await superadminApi.suspendOrganization(orgId, reason)
      alert(`${orgName} has been suspended`)
      fetchData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to suspend organization')
    } finally {
      setActionLoading(null)
    }
  }

  const handleActivate = async (orgId: number, orgName: string) => {
    if (!confirm(`Activate ${orgName}?`)) return
    try {
      setActionLoading(orgId)
      await superadminApi.activateOrganization(orgId)
      alert(`${orgName} has been activated`)
      fetchData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to activate organization')
    } finally {
      setActionLoading(null)
    }
  }

  // Invitation functions
  const fetchInvitations = async () => {
    try {
      const res = await superadminApi.getInvitations()
      setInvitations(res.data.invitations || [])
    } catch (err: any) {
      console.error('Failed to fetch invitations:', err)
    }
  }

  const handleInviteSuperadmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    setInviteError(null)
    try {
      await superadminApi.inviteSuperadmin({ email: inviteEmail, full_name: inviteFullName })
      setShowInviteModal(false)
      setInviteEmail('')
      setInviteFullName('')
      alert('Invitation sent successfully!')
      fetchInvitations()
    } catch (err: any) {
      setInviteError(err.response?.data?.detail || 'Failed to send invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRevokeInvitation = async (invitationId: number) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return
    try {
      await superadminApi.revokeInvitation(invitationId)
      alert('Invitation revoked successfully')
      fetchInvitations()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to revoke invitation')
    }
  }

  // Fetch invitations when tab changes to invitations
  useEffect(() => {
    if (activeTab === 'invitations' && user?.role?.toLowerCase() === 'superadmin') {
      fetchInvitations()
    }
  }, [activeTab, user])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
  }

  const formatPercent = (value: number) => `${value.toFixed(1)}%`

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-ZA')
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      trial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    }
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status] || colors.cancelled}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getRiskBadge = (level: string) => {
    const colors: Record<string, string> = {
      low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    }
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[level] || colors.medium}`}>
        {level.toUpperCase()}
      </span>
    )
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">Loading Superadmin Analytics...</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Crunching the numbers...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 text-lg mb-4">{error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <TopHeader />
        <main className="flex-1 p-6 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Shield className="w-8 h-8 text-amber-500" />
                Platform Command Center
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Real-time analytics and organization management
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Invite SuperAdmin
              </button>
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Data
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-slate-700">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'organizations', label: 'Organizations', icon: Building2 },
              { id: 'health', label: 'Customer Health', icon: Activity },
              { id: 'growth', label: 'Growth & Revenue', icon: TrendingUp },
              { id: 'invitations', label: 'Invitations', icon: Mail },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {analytics && activeTab === 'overview' && (
            <>
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* MRR Card */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-8 h-8 opacity-80" />
                    <span className={`flex items-center text-sm ${analytics.revenue.mrr_growth_rate >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                      {analytics.revenue.mrr_growth_rate >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {formatPercent(Math.abs(analytics.revenue.mrr_growth_rate))}
                    </span>
                  </div>
                  <p className="text-sm opacity-80">Monthly Recurring Revenue</p>
                  <p className="text-3xl font-bold">{formatCurrency(analytics.revenue.mrr)}</p>
                  <p className="text-xs opacity-70 mt-1">ARR: {formatCurrency(analytics.revenue.arr)}</p>
                </div>

                {/* Total Guards */}
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-8 h-8 opacity-80" />
                    <span className="text-sm text-blue-200">Billable</span>
                  </div>
                  <p className="text-sm opacity-80">Total Guards Managed</p>
                  <p className="text-3xl font-bold">{analytics.revenue.total_guards_billable.toLocaleString()}</p>
                  <p className="text-xs opacity-70 mt-1">ARPG: {formatCurrency(analytics.revenue.arpg)}</p>
                </div>

                {/* Organizations */}
                <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-5 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Building2 className="w-8 h-8 opacity-80" />
                    <span className="text-sm text-purple-200">{analytics.customer_health.healthy_organizations} Healthy</span>
                  </div>
                  <p className="text-sm opacity-80">Active Organizations</p>
                  <p className="text-3xl font-bold">{analytics.customer_health.healthy_organizations + analytics.customer_health.at_risk_organizations}</p>
                  <p className="text-xs opacity-70 mt-1">Power Users: {analytics.customer_health.power_users}</p>
                </div>

                {/* Shift Fill Rate */}
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="w-8 h-8 opacity-80" />
                    <span className="text-sm text-amber-200">Operations</span>
                  </div>
                  <p className="text-sm opacity-80">Shift Fill Rate</p>
                  <p className="text-3xl font-bold">{formatPercent(analytics.operations.shift_fill_rate)}</p>
                  <p className="text-xs opacity-70 mt-1">{analytics.operations.unfilled_shifts_count} unfilled</p>
                </div>
              </div>

              {/* Insights Section */}
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                {/* Platform Insights */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    Platform Insights
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                      <span className="text-gray-600 dark:text-gray-400">Busiest Day</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{analytics.insights.busiest_day_of_week}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                      <span className="text-gray-600 dark:text-gray-400">Peak Hour</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{analytics.insights.peak_shift_hour}:00</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                      <span className="text-gray-600 dark:text-gray-400">Largest Org</span>
                      <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[150px]">{analytics.insights.largest_organization}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                      <span className="text-gray-600 dark:text-gray-400">Guards/Client</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{analytics.insights.avg_guards_per_client.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600 dark:text-gray-400">Monthly Shifts</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{analytics.insights.total_shifts_this_month.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Concentration Risk */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-blue-500" />
                    Concentration Risk
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Revenue (Top 3)</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatPercent(analytics.insights.revenue_concentration_top3)}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${analytics.insights.revenue_concentration_top3 > 70 ? 'bg-red-500' : analytics.insights.revenue_concentration_top3 > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(analytics.insights.revenue_concentration_top3, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {analytics.insights.revenue_concentration_top3 > 70 ? 'High risk - diversify' : analytics.insights.revenue_concentration_top3 > 50 ? 'Moderate - monitor' : 'Healthy distribution'}
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Guards (Top 3)</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatPercent(analytics.insights.guard_concentration_top3)}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${analytics.insights.guard_concentration_top3 > 70 ? 'bg-red-500' : analytics.insights.guard_concentration_top3 > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(analytics.insights.guard_concentration_top3, 100)}%` }}
                        />
                      </div>
                    </div>
                    {analytics.insights.highest_churn_risk_org && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Highest churn risk: <strong>{analytics.insights.highest_churn_risk_org}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Operations Health */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-500" />
                    Operations Health
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                      <span className="text-gray-600 dark:text-gray-400">Guard Utilization</span>
                      <span className={`font-semibold ${analytics.operations.guard_utilization_rate > 80 ? 'text-green-600' : analytics.operations.guard_utilization_rate > 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {formatPercent(analytics.operations.guard_utilization_rate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                      <span className="text-gray-600 dark:text-gray-400">Cert Compliance</span>
                      <span className={`font-semibold ${analytics.operations.certification_compliance_rate > 90 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {formatPercent(analytics.operations.certification_compliance_rate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                      <span className="text-gray-600 dark:text-gray-400">Avg Hours/Guard</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{analytics.operations.avg_hours_per_guard_weekly.toFixed(1)}h/wk</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                      <span className="text-gray-600 dark:text-gray-400">Expiring Certs</span>
                      <span className={`font-semibold ${analytics.operations.expiring_certs_30_days > 10 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                        {analytics.operations.expiring_certs_30_days} (30 days)
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600 dark:text-gray-400">Coverage Gaps</span>
                      <span className={`font-semibold ${analytics.operations.sites_with_coverage_gaps > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {analytics.operations.sites_with_coverage_gaps} sites
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* At Risk Organizations */}
              {analytics.at_risk_organizations.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    At-Risk Organizations ({analytics.at_risk_organizations.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                          <th className="pb-3">Organization</th>
                          <th className="pb-3">Risk Level</th>
                          <th className="pb-3">Health Score</th>
                          <th className="pb-3">LTV</th>
                          <th className="pb-3">Risk Factors</th>
                          <th className="pb-3">Recommended Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {analytics.at_risk_organizations.map((org) => (
                          <tr key={org.org_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                            <td className="py-3">
                              <p className="font-medium text-gray-900 dark:text-white">{org.company_name}</p>
                              <p className="text-sm text-gray-500">{org.org_code}</p>
                            </td>
                            <td className="py-3">{getRiskBadge(org.risk_level)}</td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${org.health_score > 70 ? 'bg-green-500' : org.health_score > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    style={{ width: `${org.health_score}%` }}
                                  />
                                </div>
                                <span className="text-sm text-gray-600 dark:text-gray-400">{org.health_score}</span>
                              </div>
                            </td>
                            <td className="py-3 text-gray-900 dark:text-white">{formatCurrency(org.lifetime_value)}</td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-1">
                                {org.risk_factors.slice(0, 2).map((factor, i) => (
                                  <span key={i} className="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
                                    {factor}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-1">
                                {org.recommended_actions.slice(0, 2).map((action, i) => (
                                  <span key={i} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                                    {action}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Top Revenue Organizations */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Top Organizations by Revenue
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                        <th className="pb-3">#</th>
                        <th className="pb-3">Organization</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Guards</th>
                        <th className="pb-3">Monthly Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {analytics.top_organizations_by_revenue.map((org, index) => (
                        <tr key={org.org_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                          <td className="py-3 text-gray-500 dark:text-gray-400">{index + 1}</td>
                          <td className="py-3 font-medium text-gray-900 dark:text-white">{org.company_name}</td>
                          <td className="py-3">{getStatusBadge(org.subscription_status)}</td>
                          <td className="py-3 text-gray-900 dark:text-white">{org.guards}</td>
                          <td className="py-3 font-semibold text-green-600">{formatCurrency(org.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {analytics && activeTab === 'health' && (
            <>
              {/* Customer Health Overview */}
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Healthy</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.customer_health.healthy_organizations}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">At Risk</p>
                      <p className="text-2xl font-bold text-red-600">{analytics.customer_health.at_risk_organizations}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Zap className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Power Users</p>
                      <p className="text-2xl font-bold text-purple-600">{analytics.customer_health.power_users}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Activity className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Avg Engagement</p>
                      <p className="text-2xl font-bold text-blue-600">{analytics.customer_health.avg_engagement_score.toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Adoption */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Feature Adoption Rates</h3>
                <div className="grid md:grid-cols-5 gap-4">
                  {Object.entries(analytics.customer_health.feature_adoption_rates).map(([feature, rate]) => (
                    <div key={feature} className="text-center">
                      <div className="relative w-24 h-24 mx-auto mb-2">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200 dark:text-slate-700" />
                          <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={`${rate * 2.51} 251`} className="text-blue-500" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-900 dark:text-white">
                          {rate.toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{feature.replace(/_/g, ' ')}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Warnings */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-500" />
                    Activity Warnings
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <p className="text-yellow-800 dark:text-yellow-200 font-medium">No activity in 7 days</p>
                      <p className="text-2xl font-bold text-yellow-600">{analytics.customer_health.orgs_no_activity_7_days} organizations</p>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-red-800 dark:text-red-200 font-medium">No activity in 30 days</p>
                      <p className="text-2xl font-bold text-red-600">{analytics.customer_health.orgs_no_activity_30_days} organizations</p>
                    </div>
                  </div>
                </div>

                {/* Expansion Opportunities */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Expansion Opportunities
                  </h3>
                  <div className="space-y-3">
                    {analytics.expansion_opportunities.length > 0 ? (
                      analytics.expansion_opportunities.map((org) => (
                        <div key={org.org_id} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="font-medium text-gray-900 dark:text-white">{org.company_name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Health: {org.health_score}/100</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {org.signals.map((signal, i) => (
                              <span key={i} className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                                {signal}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">No expansion opportunities identified</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {analytics && activeTab === 'growth' && (
            <>
              {/* Growth Metrics */}
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Trial Conversion</p>
                  <p className="text-3xl font-bold text-green-600">{formatPercent(analytics.growth.trial_conversion_rate)}</p>
                  <p className="text-xs text-gray-500 mt-1">Avg {analytics.growth.avg_time_to_conversion_days} days to convert</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Churn</p>
                  <p className="text-3xl font-bold text-red-600">{formatPercent(analytics.growth.churn_rate_monthly)}</p>
                  <p className="text-xs text-gray-500 mt-1">Logo retention: {formatPercent(analytics.growth.logo_retention_rate)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Net Revenue Retention</p>
                  <p className={`text-3xl font-bold ${analytics.growth.net_revenue_retention >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(analytics.growth.net_revenue_retention)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Expansion: {formatCurrency(analytics.growth.expansion_revenue)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">New Signups</p>
                  <p className="text-3xl font-bold text-blue-600">{analytics.growth.new_signups_this_month}</p>
                  <p className="text-xs text-gray-500 mt-1">This week: {analytics.growth.new_signups_this_week}</p>
                </div>
              </div>

              {/* Revenue Breakdown */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Breakdown</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">ARPU (Per Org)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(analytics.revenue.arpu)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">ARPG (Per Guard)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(analytics.revenue.arpg)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">Revenue/Shift</span>
                      <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(analytics.revenue.revenue_per_shift)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <span className="text-green-600 dark:text-green-400">Projected MRR (Next Month)</span>
                      <span className="font-bold text-green-600">{formatCurrency(analytics.revenue.projected_next_month_mrr)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Growth Trends</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">MRR Growth (MoM)</span>
                      <span className={`font-bold flex items-center gap-1 ${analytics.revenue.mrr_growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analytics.revenue.mrr_growth_rate >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {formatPercent(Math.abs(analytics.revenue.mrr_growth_rate))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">Guard Growth (WoW)</span>
                      <span className={`font-bold flex items-center gap-1 ${analytics.insights.week_over_week_guard_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analytics.insights.week_over_week_guard_growth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {formatPercent(Math.abs(analytics.insights.week_over_week_guard_growth))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">Shift Growth (MoM)</span>
                      <span className={`font-bold flex items-center gap-1 ${analytics.insights.month_over_month_shift_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analytics.insights.month_over_month_shift_growth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {formatPercent(Math.abs(analytics.insights.month_over_month_shift_growth))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'organizations' && (
            <>
              {/* Filters */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 mb-6">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    >
                      <option value="">All</option>
                      <option value="trial">Trial</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Company name or code..."
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Organizations Table */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
                <div className="px-5 py-4 border-b dark:border-slate-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Organizations ({organizations.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Organization</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Trial</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Guards</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {organizations.map((org) => (
                        <tr key={org.org_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 dark:text-white">{org.company_name}</p>
                            <p className="text-sm text-gray-500">{org.org_code}</p>
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(org.subscription_status)}
                            {org.payfast_active && <span className="ml-2 text-xs text-green-600">PayFast</span>}
                          </td>
                          <td className="px-4 py-3">
                            {org.subscription_status === 'trial' && org.trial_days_remaining !== null ? (
                              <span className={org.trial_days_remaining <= 5 ? 'text-orange-600 font-medium' : 'text-gray-900 dark:text-white'}>
                                {org.trial_days_remaining} days left
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-900 dark:text-white">{org.active_employee_count}</p>
                            <p className="text-xs text-gray-500">of {org.employee_count}</p>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                            {formatCurrency(org.estimated_monthly_cost)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{formatDate(org.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {org.subscription_status === 'trial' && (
                                <button
                                  onClick={() => handleExtendTrial(org.org_id, org.company_name)}
                                  disabled={actionLoading === org.org_id}
                                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                                >
                                  Extend
                                </button>
                              )}
                              {org.subscription_status === 'suspended' ? (
                                <button
                                  onClick={() => handleActivate(org.org_id, org.company_name)}
                                  disabled={actionLoading === org.org_id}
                                  className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                                >
                                  Reactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSuspend(org.org_id, org.company_name)}
                                  disabled={actionLoading === org.org_id}
                                  className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                                >
                                  Suspend
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {organizations.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No organizations found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'invitations' && (
            <>
              {/* Invitations List */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
                <div className="px-5 py-4 border-b dark:border-slate-700 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-500" />
                    SuperAdmin Invitations
                  </h2>
                  <button
                    onClick={fetchInvitations}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Refresh
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Invited By</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Expires</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {invitations.map((invitation) => {
                        const isExpired = new Date(invitation.expires_at) < new Date()
                        const status = invitation.accepted_at
                          ? 'Accepted'
                          : invitation.revoked
                          ? 'Revoked'
                          : isExpired
                          ? 'Expired'
                          : 'Pending'
                        const statusColor =
                          status === 'Accepted'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : status === 'Revoked'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : status === 'Expired'
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'

                        return (
                          <tr key={invitation.invitation_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900 dark:text-white">{invitation.email}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                              {invitation.invited_by_username || 'System'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {formatDate(invitation.created_at)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {formatDate(invitation.expires_at)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                {status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {status === 'Pending' && (
                                <button
                                  onClick={() => handleRevokeInvitation(invitation.invitation_id)}
                                  className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Revoke
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                      {invitations.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                            No invitations yet. Click "Invite SuperAdmin" to send one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Invite SuperAdmin Modal */}
          {showInviteModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4">
                <div className="flex items-center justify-between px-6 py-4 border-b dark:border-slate-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-blue-500" />
                    Invite SuperAdmin
                  </h3>
                  <button
                    onClick={() => {
                      setShowInviteModal(false)
                      setInviteError(null)
                      setInviteEmail('')
                      setInviteFullName('')
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleInviteSuperadmin} className="p-6">
                  {inviteError && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>
                    </div>
                  )}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      placeholder="admin@example.com"
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={inviteFullName}
                      onChange={(e) => setInviteFullName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    An email will be sent with a secure link to set up their account. The invitation expires in 7 days.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowInviteModal(false)
                        setInviteError(null)
                        setInviteEmail('')
                        setInviteFullName('')
                      }}
                      className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviteLoading || !inviteEmail}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {inviteLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          Send Invitation
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {analytics && (
              <p>Data generated at {new Date(analytics.generated_at).toLocaleString('en-ZA')}</p>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
