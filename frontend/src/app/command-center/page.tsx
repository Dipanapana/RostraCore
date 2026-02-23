"use client";

import { useState, useEffect, useCallback } from "react";
import { emergencyApi, loneWorkerApi, incidentsApi } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import {
  Radio,
  Siren,
  UserCheck,
  AlertTriangle,
  MapPin,
  Clock,
  Shield,
  RefreshCw,
  CheckCircle,
  Navigation,
  Activity,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmergencyAlert {
  alert_id: number;
  employee_name: string | null;
  alert_type: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  site_name: string | null;
  triggered_at: string;
  triggered_by_name: string | null;
}

interface LoneWorkerSession {
  session_id: number;
  employee_name: string | null;
  site_name: string | null;
  status: string;
  last_check_in: string | null;
  next_check_in_due: string | null;
  missed_check_ins: number;
  escalation_level: number;
}

interface Incident {
  incident_id: number;
  site_name: string | null;
  incident_type: string;
  severity: string;
  status: string;
  reported_at: string | null;
  description: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(iso: string | null): string {
  if (!iso) return "\u2014";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800 animate-pulse",
};

const ESCALATION_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "OK", color: "text-green-600" },
  1: { label: "L1", color: "text-yellow-600" },
  2: { label: "L2", color: "text-orange-600" },
  3: { label: "L3", color: "text-red-600" },
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CommandCenterPage() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loneworkers, setLoneworkers] = useState<LoneWorkerSession[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadData = useCallback(async () => {
    try {
      const [alertRes, lwRes, incRes] = await Promise.all([
        emergencyApi.getActive(),
        loneWorkerApi.getActive(),
        incidentsApi.list({ status_filter: "reported", limit: 20 }),
      ]);
      setAlerts(alertRes.data || []);
      setLoneworkers(lwRes.data || []);
      setIncidents(incRes.data || []);
      setLastRefresh(new Date());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const emergencyCount = alerts.length;
  const overdueWorkers = loneworkers.filter(s => s.status === "overdue" || s.status === "escalated").length;
  const openIncidents = incidents.length;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        backHref="/dashboard"
        backLabel="Back to Dashboard"
        title="Command Center"
        subtitle="Real-time operational overview — auto-refreshes every 10s"
        icon={<Radio className={emergencyCount > 0 ? "text-red-600 animate-pulse" : "text-blue-600"} size={28} />}
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Last: {fmtTime(lastRefresh.toISOString())}</span>
            <button onClick={loadData} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        }
      />

      {/* Status Indicators */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`rounded-xl border p-4 shadow-sm ${emergencyCount > 0 ? "border-red-300 bg-red-50 animate-pulse" : "border-gray-200 bg-white"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Siren size={18} className={emergencyCount > 0 ? "text-red-600" : "text-gray-400"} />
            <span className="text-xs uppercase text-gray-500">Emergency Alerts</span>
          </div>
          <p className={`text-3xl font-bold ${emergencyCount > 0 ? "text-red-600" : "text-gray-900"}`}>{emergencyCount}</p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm ${overdueWorkers > 0 ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"}`}>
          <div className="flex items-center gap-2 mb-2">
            <UserCheck size={18} className={overdueWorkers > 0 ? "text-amber-600" : "text-gray-400"} />
            <span className="text-xs uppercase text-gray-500">Lone Workers Overdue</span>
          </div>
          <p className={`text-3xl font-bold ${overdueWorkers > 0 ? "text-amber-600" : "text-gray-900"}`}>{overdueWorkers}</p>
          <p className="text-xs text-gray-400 mt-1">{loneworkers.length} active sessions</p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm ${openIncidents > 0 ? "border-orange-300 bg-orange-50" : "border-gray-200 bg-white"}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className={openIncidents > 0 ? "text-orange-600" : "text-gray-400"} />
            <span className="text-xs uppercase text-gray-500">Open Incidents</span>
          </div>
          <p className={`text-3xl font-bold ${openIncidents > 0 ? "text-orange-600" : "text-gray-900"}`}>{openIncidents}</p>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Emergency Alerts Panel */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
            <Siren size={16} className="text-red-600" />
            <h2 className="text-sm font-medium text-gray-900">Emergency Alerts</h2>
            <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">{emergencyCount}</span>
          </div>
          <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
            {emergencyCount === 0 ? (
              <div className="py-6 text-center">
                <Shield size={32} className="mx-auto text-green-500 mb-2" />
                <p className="text-sm text-green-600">All Clear</p>
              </div>
            ) : (
              alerts.map((a) => (
                <div key={a.alert_id} className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-red-800 uppercase">{a.alert_type}</span>
                    <span className="text-xs text-gray-400">{timeAgo(a.triggered_at)}</span>
                  </div>
                  <p className="text-sm text-gray-900">{a.employee_name || a.triggered_by_name || "Unknown"}</p>
                  {a.site_name && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10} />{a.site_name}</p>}
                  {a.latitude && a.longitude && <p className="text-xs text-blue-600">GPS: {a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}</p>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lone Worker Panel */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
            <UserCheck size={16} className="text-blue-600" />
            <h2 className="text-sm font-medium text-gray-900">Lone Workers</h2>
            <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{loneworkers.length}</span>
          </div>
          <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
            {loneworkers.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No active lone worker sessions</p>
            ) : (
              loneworkers.map((s) => {
                const escConf = ESCALATION_LABELS[s.escalation_level] || ESCALATION_LABELS[0];
                const isOverdue = s.status === "overdue" || s.status === "escalated";
                return (
                  <div key={s.session_id} className={`rounded-lg border p-3 ${isOverdue ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-gray-900">{s.employee_name || "Unknown"}</p>
                      <span className={`text-xs font-medium ${escConf.color}`}>{escConf.label}</span>
                    </div>
                    {s.site_name && <p className="text-xs text-gray-500">{s.site_name}</p>}
                    <p className="text-xs text-gray-400">
                      Last check-in: {timeAgo(s.last_check_in)}
                      {s.missed_check_ins > 0 && <span className="text-red-600 ml-1">({s.missed_check_ins} missed)</span>}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Incidents Panel */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
            <AlertTriangle size={16} className="text-orange-600" />
            <h2 className="text-sm font-medium text-gray-900">Open Incidents</h2>
            <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{openIncidents}</span>
          </div>
          <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
            {incidents.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No open incidents</p>
            ) : (
              incidents.map((i) => {
                const sevCls = SEVERITY_COLORS[i.severity] || SEVERITY_COLORS.medium;
                return (
                  <div key={i.incident_id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${sevCls}`}>{i.severity}</span>
                      <span className="text-xs text-gray-400">{timeAgo(i.reported_at)}</span>
                    </div>
                    <p className="text-sm text-gray-900 capitalize">{i.incident_type?.replace(/_/g, " ")}</p>
                    {i.site_name && <p className="text-xs text-gray-500">{i.site_name}</p>}
                    <p className="text-xs text-gray-400 mt-1 truncate">{i.description}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
