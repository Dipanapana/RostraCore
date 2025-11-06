'use client'

import { useRouter } from 'next/navigation'

export default function DashboardsHome() {
  const router = useRouter()

  const dashboards = [
    {
      name: 'Executive Dashboard',
      description: 'High-level KPIs, revenue metrics, and strategic insights for leadership',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'from-blue-500 to-blue-600',
      route: '/dashboards/executive',
      metrics: ['Revenue Growth', 'Guard Utilization', 'Shift Fill Rate', 'Revenue per Guard']
    },
    {
      name: 'Operations Dashboard',
      description: 'Real-time operational metrics, unfilled shifts, and immediate action items',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      color: 'from-green-500 to-green-600',
      route: '/dashboards/operations',
      metrics: ['Unfilled Shifts', 'Expiring Certifications', 'Attendance Issues', 'Coverage Rate']
    },
    {
      name: 'Financial Dashboard',
      description: 'Budget tracking, payroll analysis, cost optimization, and financial forecasting',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-purple-500 to-purple-600',
      route: '/dashboards/financial',
      metrics: ['Budget Status', 'Payroll Costs', 'Cost per Site', 'Cost Trends']
    },
    {
      name: 'People Analytics',
      description: 'Guard welfare, work-life balance, fairness metrics, and workforce health',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'from-orange-500 to-orange-600',
      route: '/dashboards/people',
      metrics: ['Fairness Score', 'Burnout Risk', 'Work Distribution', 'Attendance Rate']
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Dashboards</h1>
              <p className="text-lg text-gray-600 mt-2">
                Choose a dashboard tailored to your role and needs
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Main Dashboard
            </button>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {dashboards.map((dashboard, index) => (
            <div
              key={index}
              onClick={() => router.push(dashboard.route)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
            >
              {/* Colored Header */}
              <div className={`bg-gradient-to-r ${dashboard.color} p-6 text-white`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="opacity-80 group-hover:opacity-100 transition-opacity">
                    {dashboard.icon}
                  </div>
                  <svg
                    className="w-6 h-6 transform group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold">{dashboard.name}</h2>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-600 mb-6">
                  {dashboard.description}
                </p>

                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-700 mb-3">Key Metrics:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {dashboard.metrics.map((metric, idx) => (
                      <div key={idx} className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {metric}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Multiple Perspectives</h3>
              <p className="text-blue-800">
                Each dashboard is designed for specific user personas and use cases. Executive dashboards focus on strategic KPIs,
                Operations dashboards prioritize action items, Financial dashboards track budgets and costs, and People Analytics
                ensures guard welfare and fairness.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4 text-center border border-gray-200">
            <div className="text-2xl font-bold text-blue-600">4</div>
            <div className="text-xs text-gray-600 mt-1">Dashboards</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 text-center border border-gray-200">
            <div className="text-2xl font-bold text-green-600">30+</div>
            <div className="text-xs text-gray-600 mt-1">Metrics Tracked</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 text-center border border-gray-200">
            <div className="text-2xl font-bold text-purple-600">Real-time</div>
            <div className="text-xs text-gray-600 mt-1">Updates</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 text-center border border-gray-200">
            <div className="text-2xl font-bold text-orange-600">Cached</div>
            <div className="text-xs text-gray-600 mt-1">Performance</div>
          </div>
        </div>
      </div>
    </div>
  )
}
