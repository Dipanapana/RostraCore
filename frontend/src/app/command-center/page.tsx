"use client";

import { useState, useEffect, useCallback } from "react";
import { emergencyApi, loneWorkerApi, incidentsApi } from "@/services/api";
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
  low: "bg-gray-700 text-gray-300",
  medium: "bg-amber-900/60 text-amber-300",
  high: "bg-orange-900/60 text-orange-300",
  critical: "bg-red-900/60 text-red-300 animate-pulse",
};

const ESCALATION_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "OK", color: "text-green-400" },
  1: { label: "L1", color: "text-yellow-400" },
  2: { label: "L2", color: "text-orange-400" },
  3: { label: "L3", color: "text-red-400" },
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Radio className={emergencyCount > 0 ? "text-red-400 animate-pulse" : "text-blue-400"} size={28} />
            Command Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time operational overview — auto-refreshes every 10s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Last: {fmtTime(lastRefresh.toISOString())}</span>
          <button onClick={loadData} className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`rounded-lg border p-4 ${emergencyCount > 0 ? "border-red-700 bg-red-950/40 animate-pulse" : "border-slate-700 bg-slate-800"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Siren size={18} className={emergencyCount > 0 ? "text-red-400" : "text-slate-500"} />
            <span className="text-xs uppercase text-slate-400">Emergency Alerts</span>
          </div>
          <p className={`text-3xl font-bold ${emergencyCount > 0 ? "text-red-400" : "text-white"}`}>{emergencyCount}</p>
        </div>
        <div className={`rounded-lg border p-4 ${overdueWorkers > 0 ? "border-amber-700 bg-amber-950/30" : "border-slate-700 bg-slate-800"}`}>
          <div className="flex items-center gap-2 mb-2">
            <UserCheck size={18} className={overdueWorkers > 0 ? "text-amber-400" : "text-slate-500"} />
            <span className="text-xs uppercase text-slate-400">Lone Workers Overdue</span>
          </div>
          <p className={`text-3xl font-bold ${overdueWorkers > 0 ? "text-amber-400" : "text-white"}`}>{overdueWorkers}</p>
          <p className="text-xs text-slate-500 mt-1">{loneworkers.length} active sessions</p>
        </div>
        <div className={`rounded-lg border p-4 ${openIncidents > 0 ? "border-orange-700 bg-orange-950/30" : "border-slate-700 bg-slate-800"}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className={openIncidents > 0 ? "text-orange-400" : "text-slate-500"} />
            <span className="text-xs uppercase text-slate-400">Open Incidents</span>
          </div>
          <p className={`text-3xl font-bold ${openIncidents > 0 ? "text-orange-400" : "text-white"}`}>{openIncidents}</p>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Emergency Alerts Panel */}
        <div className="rounded-lg border border-slate-700 bg-slate-800">
          <div className="flex items-center gap-2 border-b border-slate-700 px-4 py-3">
            <Siren size={16} className="text-red-400" />
            <h2 className="text-sm font-medium text-white">Emergency Alerts</h2>
            <span className="ml-auto rounded-full bg-red-900/50 px-2 py-0.5 text-xs text-red-300">{emergencyCount}</span>
          </div>
          <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
            {emergencyCount === 0 ? (
              <div className="py-6 text-center">
                <Shield size={32} className="mx-auto text-green-500 mb-2" />
                <p className="text-sm text-green-400">All Clear</p>
              </div>
            ) : (
              alerts.map((a) => (
                <div key={a.alert_id} className="rounded border border-red-800/50 bg-slate-900/50 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-red-300 uppercase">{a.alert_type}</span>
                    <span className="text-xs text-slate-500">{timeAgo(a.triggered_at)}</span>
                  </div>
                  <p className="text-sm text-white">{a.employee_name || a.triggered_by_name || "Unknown"}</p>
                  {a.site_name && <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={10} />{a.site_name}</p>}
                  {a.latitude && a.longitude && <p className="text-xs text-blue-400">GPS: {a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}</p>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lone Worker Panel */}
        <div className="rounded-lg border border-slate-700 bg-slate-800">
          <div className="flex items-center gap-2 border-b border-slate-700 px-4 py-3">
            <UserCheck size={16} className="text-blue-400" />
            <h2 className="text-sm font-medium text-white">Lone Workers</h2>
            <span className="ml-auto rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">{loneworkers.length}</span>
          </div>
          <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
            {loneworkers.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No active lone worker sessions</p>
            ) : (
              loneworkers.map((s) => {
                const escConf = ESCALATION_LABELS[s.escalation_level] || ESCALATION_LABELS[0];
                const isOverdue = s.status === "overdue" || s.status === "escalated";
                return (
                  <div key={s.session_id} className={`rounded border p-3 ${isOverdue ? "border-amber-800/50 bg-amber-950/20" : "border-slate-700 bg-slate-900/50"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-white">{s.employee_name || "Unknown"}</p>
                      <span className={`text-xs font-medium ${escConf.color}`}>{escConf.label}</span>
                    </div>
                    {s.site_name && <p className="text-xs text-slate-400">{s.site_name}</p>}
                    <p className="text-xs text-slate-500">
                      Last check-in: {timeAgo(s.last_check_in)}
                      {s.missed_check_ins > 0 && <span className="text-red-400 ml-1">({s.missed_check_ins} missed)</span>}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Incidents Panel */}
        <div className="rounded-lg border border-slate-700 bg-slate-800">
          <div className="flex items-center gap-2 border-b border-slate-700 px-4 py-3">
            <AlertTriangle size={16} className="text-orange-400" />
            <h2 className="text-sm font-medium text-white">Open Incidents</h2>
            <span className="ml-auto rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">{openIncidents}</span>
          </div>
          <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
            {incidents.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No open incidents</p>
            ) : (
              incidents.map((i) => {
                const sevCls = SEVERITY_COLORS[i.severity] || SEVERITY_COLORS.medium;
                return (
                  <div key={i.incident_id} className="rounded border border-slate-700 bg-slate-900/50 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${sevCls}`}>{i.severity}</span>
                      <span className="text-xs text-slate-500">{timeAgo(i.reported_at)}</span>
                    </div>
                    <p className="text-sm text-white capitalize">{i.incident_type?.replace(/_/g, " ")}</p>
                    {i.site_name && <p className="text-xs text-slate-400">{i.site_name}</p>}
                    <p className="text-xs text-slate-500 mt-1 truncate">{i.description}</p>
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
