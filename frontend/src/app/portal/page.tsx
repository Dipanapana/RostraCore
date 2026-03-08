"use client";

import { useState, useEffect, useCallback } from "react";
import { clientPortalApi } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Building2,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Receipt,
  MapPin,
  Clock,
  RefreshCw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PortalDashboard {
  client_name: string;
  total_sites: number;
  active_shifts_this_month: number;
  incidents_this_month: number;
  open_incidents: number;
  sites: { site_id: number; site_name: string; address: string | null }[];
}

interface Incident {
  incident_id: number;
  site_name: string | null;
  incident_type: string;
  description: string;
  severity: string;
  status: string;
  reported_at: string | null;
  resolved_at: string | null;
}

interface ScheduleShift {
  shift_id: number;
  site_name: string | null;
  start_time: string | null;
  end_time: string | null;
  guards_required: number | null;
  status: string;
}

interface Invoice {
  invoice_id: number;
  invoice_number: string;
  invoice_date: string | null;
  due_date: string | null;
  total_amount: number;
  status: string;
  period_start: string | null;
  period_end: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-ZA", { dateStyle: "medium" });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(amount);
}

const SEVERITY_CLASSES: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ClientPortalPage() {
  const [dashboard, setDashboard] = useState<PortalDashboard | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [schedule, setSchedule] = useState<ScheduleShift[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "incidents" | "schedule" | "invoices">("overview");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, incRes, schRes, invRes] = await Promise.all([
        clientPortalApi.getDashboard(),
        clientPortalApi.getIncidents({ limit: 20 }),
        clientPortalApi.getSchedule({ days: 14 }),
        clientPortalApi.getInvoices({ limit: 20 }),
      ]);
      setDashboard(dashRes.data);
      setIncidents(incRes.data || []);
      setSchedule(schRes.data || []);
      setInvoices(invRes.data || []);
    } catch {
      // May fail if user has no client_id
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!dashboard) {
    return (
      <DashboardLayout>
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <ShieldCheck size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Client Portal</h3>
          <p className="text-sm text-gray-500 mt-1">No client association found for your account.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`${dashboard.client_name} — Portal`}
        subtitle="Your security operations at a glance"
        icon={<Building2 className="text-blue-600" size={28} />}
        actions={
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs uppercase mb-2">
            <MapPin size={14} /> Sites
          </div>
          <p className="text-2xl font-bold text-gray-900">{dashboard.total_sites}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs uppercase mb-2">
            <Calendar size={14} /> Shifts This Month
          </div>
          <p className="text-2xl font-bold text-gray-900">{dashboard.active_shifts_this_month}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs uppercase mb-2">
            <AlertTriangle size={14} /> Incidents This Month
          </div>
          <p className="text-2xl font-bold text-gray-900">{dashboard.incidents_this_month}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 text-xs uppercase mb-2">
            <AlertTriangle size={14} /> Open Incidents
          </div>
          <p className="text-2xl font-bold text-amber-600">{dashboard.open_incidents}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 pb-2">
        {(["overview", "incidents", "schedule", "invoices"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium capitalize ${
              tab === t ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboard.sites.map((site) => (
            <div key={site.site_id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <MapPin size={14} className="text-blue-600" /> {site.site_name}
              </p>
              {site.address && <p className="text-xs text-gray-500 mt-1">{site.address}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Incidents Tab */}
      {tab === "incidents" && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reported</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {incidents.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No incidents found</td></tr>
              ) : incidents.map((i) => (
                <tr key={i.incident_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 capitalize">{i.incident_type?.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-gray-600">{i.site_name || "\u2014"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${SEVERITY_CLASSES[i.severity] || ""}`}>
                      {i.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{i.status}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDateTime(i.reported_at)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{i.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Schedule Tab */}
      {tab === "schedule" && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Guards</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schedule.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No upcoming shifts</td></tr>
              ) : schedule.map((s) => (
                <tr key={s.shift_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{s.site_name || "\u2014"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{fmtDate(s.start_time)}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {s.start_time ? new Date(s.start_time).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) : "\u2014"} {"\u2014"}{" "}
                    {s.end_time ? new Date(s.end_time).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) : "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.guards_required || "\u2014"}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoices Tab */}
      {tab === "invoices" && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No invoices found</td></tr>
              ) : invoices.map((inv) => (
                <tr key={inv.invoice_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{fmtDate(inv.invoice_date)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(inv.period_start)} {"\u2014"} {fmtDate(inv.period_end)}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{fmtCurrency(inv.total_amount)}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{fmtDate(inv.due_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      inv.status === "paid" ? "bg-green-100 text-green-800" :
                      inv.status === "overdue" ? "bg-red-100 text-red-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
