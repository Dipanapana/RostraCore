"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface DashboardData {
  overview: {
    organizations: { total: number; active: number; inactive: number };
    guards: { total: number; verified: number; available: number };
    jobs: { total: number; active: number; premium: number };
    activity: { total_applications: number; total_hires: number; marketplace_hires: number };
  };
  revenue: {
    total_revenue: number;
    period_days: number;
    revenue_streams: {
      cv_generation: { revenue: number; count: number; average: number };
      marketplace_commission: { revenue: number; count: number; average: number };
      premium_jobs: { revenue: number; count: number; average: number };
      bulk_packages: { revenue: number; count: number; average: number };
    };
  };
  commissions: {
    total_commissions: number;
    pending: { amount: number; count: number };
    in_progress: { amount: number; count: number };
    paid: { amount: number; count: number };
    waived_by_sponsorship: { amount: number; count: number };
    collection_rate_percent: number;
  };
  cv_stats: {
    total_purchases: number;
    completed_purchases: number;
    total_cvs_generated: number;
    total_downloads: number;
    template_popularity: Record<string, number>;
    avg_cvs_per_purchase: number;
  };
  bulk_packages: {
    active_packages_total: number;
    starter: { count: number; total_quota: number; used: number; remaining: number; utilization_percent: number };
    professional: { count: number; total_quota: number; used: number; remaining: number; utilization_percent: number };
    enterprise: { count: number; total_quota: number; used: number; remaining: number; utilization_percent: number };
  };
}

export default function SuperadminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState(30);

  useEffect(() => {
    fetchDashboardData();
  }, [periodDays]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/superadmin/analytics/dashboard?revenue_period_days=${periodDays}`
      );
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading platform data...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">Error: {error || "No data available"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2">Superadmin Dashboard</h1>
            <p className="text-blue-200">RostraCore Platform Analytics</p>
          </div>
          <button
            onClick={() => router.push("/admin/marketplace-pricing")}
            className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-all shadow-lg"
          >
            Manage Pricing
          </button>
        </div>

        {/* Revenue Period Selector */}
        <div className="mb-6 flex gap-2">
          {[7, 30, 90, 365].map((days) => (
            <button
              key={days}
              onClick={() => setPeriodDays(days)}
              className={`px-4 py-2 rounded-lg transition-all ${
                periodDays === days
                  ? "bg-blue-500 text-white"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              {days === 365 ? "1 Year" : `${days} Days`}
            </button>
          ))}
        </div>

        {/* Total Revenue Card */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-8 mb-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white/80 text-xl mb-2">Total Platform Revenue</h2>
              <div className="text-6xl font-bold text-white">
                R{data.revenue.total_revenue.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-white/80 mt-2">Last {data.revenue.period_days} days</p>
            </div>
            <div className="text-white/80 text-right">
              <div className="text-4xl">💰</div>
            </div>
          </div>
        </div>

        {/* Platform Overview Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          {/* Organizations */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="text-blue-300 text-sm mb-2">ORGANIZATIONS</div>
            <div className="text-4xl font-bold text-white mb-2">{data.overview.organizations.total}</div>
            <div className="text-sm text-gray-300">
              <span className="text-green-400">{data.overview.organizations.active} active</span> /{" "}
              <span className="text-gray-500">{data.overview.organizations.inactive} inactive</span>
            </div>
          </div>

          {/* Guards */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="text-purple-300 text-sm mb-2">GUARDS</div>
            <div className="text-4xl font-bold text-white mb-2">{data.overview.guards.total}</div>
            <div className="text-sm text-gray-300">
              <span className="text-green-400">{data.overview.guards.verified} verified</span> /{" "}
              <span className="text-yellow-400">{data.overview.guards.available} available</span>
            </div>
          </div>

          {/* Jobs */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="text-orange-300 text-sm mb-2">JOB POSTINGS</div>
            <div className="text-4xl font-bold text-white mb-2">{data.overview.jobs.total}</div>
            <div className="text-sm text-gray-300">
              <span className="text-green-400">{data.overview.jobs.active} active</span> /{" "}
              <span className="text-yellow-400">{data.overview.jobs.premium} premium</span>
            </div>
          </div>

          {/* Marketplace Hires */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="text-pink-300 text-sm mb-2">MARKETPLACE HIRES</div>
            <div className="text-4xl font-bold text-white mb-2">{data.overview.activity.marketplace_hires}</div>
            <div className="text-sm text-gray-300">
              from {data.overview.activity.total_applications} applications
            </div>
          </div>
        </div>

        {/* Revenue Streams */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">Revenue Breakdown</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {/* CV Generation */}
            <div className="bg-blue-500/20 border border-blue-400 rounded-lg p-4">
              <div className="text-blue-300 text-sm mb-2">CV GENERATION</div>
              <div className="text-3xl font-bold text-white mb-2">
                R{data.revenue.revenue_streams.cv_generation.revenue.toLocaleString()}
              </div>
              <div className="text-sm text-gray-300">
                {data.revenue.revenue_streams.cv_generation.count} purchases
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Avg: R{data.revenue.revenue_streams.cv_generation.average.toFixed(2)}
              </div>
            </div>

            {/* Marketplace Commission */}
            <div className="bg-green-500/20 border border-green-400 rounded-lg p-4">
              <div className="text-green-300 text-sm mb-2">COMMISSION (Guards)</div>
              <div className="text-3xl font-bold text-white mb-2">
                R{data.revenue.revenue_streams.marketplace_commission.revenue.toLocaleString()}
              </div>
              <div className="text-sm text-gray-300">
                {data.revenue.revenue_streams.marketplace_commission.count} hires
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Avg: R{data.revenue.revenue_streams.marketplace_commission.average.toFixed(2)}
              </div>
            </div>

            {/* Premium Jobs */}
            <div className="bg-purple-500/20 border border-purple-400 rounded-lg p-4">
              <div className="text-purple-300 text-sm mb-2">PREMIUM JOBS (Companies)</div>
              <div className="text-3xl font-bold text-white mb-2">
                R{data.revenue.revenue_streams.premium_jobs.revenue.toLocaleString()}
              </div>
              <div className="text-sm text-gray-300">
                {data.revenue.revenue_streams.premium_jobs.count} upgrades
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Avg: R{data.revenue.revenue_streams.premium_jobs.average.toFixed(2)}
              </div>
            </div>

            {/* Bulk Packages */}
            <div className="bg-orange-500/20 border border-orange-400 rounded-lg p-4">
              <div className="text-orange-300 text-sm mb-2">BULK PACKAGES (Companies)</div>
              <div className="text-3xl font-bold text-white mb-2">
                R{data.revenue.revenue_streams.bulk_packages.revenue.toLocaleString()}
              </div>
              <div className="text-sm text-gray-300">
                {data.revenue.revenue_streams.bulk_packages.count} packages
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Avg: R{data.revenue.revenue_streams.bulk_packages.average.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Commission Collection */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">Commission Collection Status</h2>
          <div className="grid md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-gray-400 text-sm mb-2">TOTAL</div>
              <div className="text-2xl font-bold text-white">
                R{data.commissions.total_commissions.toLocaleString()}
              </div>
            </div>
            <div className="bg-yellow-500/20 border border-yellow-400 rounded-lg p-4 text-center">
              <div className="text-yellow-300 text-sm mb-2">PENDING</div>
              <div className="text-2xl font-bold text-white">
                R{data.commissions.pending.amount.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 mt-1">{data.commissions.pending.count} guards</div>
            </div>
            <div className="bg-blue-500/20 border border-blue-400 rounded-lg p-4 text-center">
              <div className="text-blue-300 text-sm mb-2">IN PROGRESS</div>
              <div className="text-2xl font-bold text-white">
                R{data.commissions.in_progress.amount.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 mt-1">{data.commissions.in_progress.count} guards</div>
            </div>
            <div className="bg-green-500/20 border border-green-400 rounded-lg p-4 text-center">
              <div className="text-green-300 text-sm mb-2">PAID</div>
              <div className="text-2xl font-bold text-white">
                R{data.commissions.paid.amount.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 mt-1">{data.commissions.paid.count} guards</div>
            </div>
            <div className="bg-purple-500/20 border border-purple-400 rounded-lg p-4 text-center">
              <div className="text-purple-300 text-sm mb-2">WAIVED</div>
              <div className="text-2xl font-bold text-white">
                R{data.commissions.waived_by_sponsorship.amount.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 mt-1">{data.commissions.waived_by_sponsorship.count} sponsored</div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-400 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold">Collection Rate</span>
              <span className="text-3xl font-bold text-green-400">
                {data.commissions.collection_rate_percent}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 mt-3">
              <div
                className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full"
                style={{ width: `${data.commissions.collection_rate_percent}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* CV Generation Stats */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">CV Generation Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Purchases</span>
                <span className="text-2xl font-bold text-white">{data.cv_stats.total_purchases}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">CVs Generated</span>
                <span className="text-2xl font-bold text-white">{data.cv_stats.total_cvs_generated}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Downloads</span>
                <span className="text-2xl font-bold text-white">{data.cv_stats.total_downloads}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Avg CVs/Purchase</span>
                <span className="text-2xl font-bold text-white">{data.cv_stats.avg_cvs_per_purchase}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="text-sm text-gray-400 mb-2">Template Popularity</div>
                {Object.entries(data.cv_stats.template_popularity).map(([template, count]) => (
                  <div key={template} className="flex justify-between items-center mb-2">
                    <span className="text-gray-300 capitalize">{template}</span>
                    <span className="text-white font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bulk Packages Utilization */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Bulk Package Utilization</h2>
            <div className="space-y-4">
              {(["starter", "professional", "enterprise"] as const).map((pkg) => {
                const pkgData = data.bulk_packages[pkg];
                return (
                  <div key={pkg} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-bold capitalize">{pkg}</span>
                      <span className="text-green-400">{pkgData.count} active</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                      <div>
                        <div className="text-gray-400">Quota</div>
                        <div className="text-white font-bold">{pkgData.total_quota}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Used</div>
                        <div className="text-white font-bold">{pkgData.used}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Remaining</div>
                        <div className="text-white font-bold">{pkgData.remaining}</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                        style={{ width: `${pkgData.utilization_percent}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 text-right">
                      {pkgData.utilization_percent}% utilized
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
