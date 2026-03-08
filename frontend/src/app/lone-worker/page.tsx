"use client";

import { useState, useEffect, useCallback } from "react";
import { loneWorkerApi } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  UserCheck,
  AlertTriangle,
  Clock,
  MapPin,
  RefreshCw,
  Shield,
  AlertCircle,
  Radio,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LoneWorkerSession {
  session_id: number;
  org_id: number;
  employee_id: number;
  employee_name: string | null;
  shift_id: number | null;
  site_id: number | null;
  site_name: string | null;
  check_in_interval_minutes: number;
  status: string;
  last_check_in: string | null;
  next_check_in_due: string | null;
  missed_check_ins: number;
  escalation_level: number;
  last_latitude: number | null;
  last_longitude: number | null;
  started_at: string | null;
  ended_at: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  active:    { label: "Active",    classes: "bg-green-100 text-green-800" },
  overdue:   { label: "Overdue",   classes: "bg-amber-100 text-amber-800 animate-pulse" },
  escalated: { label: "Escalated", classes: "bg-red-100 text-red-800 animate-pulse font-bold" },
  ended:     { label: "Ended",     classes: "bg-gray-100 text-gray-600" },
};

const ESCALATION_CONFIG: Record<number, { label: string; classes: string }> = {
  0: { label: "None", classes: "text-green-600" },
  1: { label: "Level 1 — Warning", classes: "text-yellow-600" },
  2: { label: "Level 2 — Supervisor Alert", classes: "text-orange-600" },
  3: { label: "Level 3 — Emergency", classes: "text-red-600 font-bold" },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function timeUntil(iso: string | null): string {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "OVERDUE";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function LoneWorkerPage() {
  const [activeSessions, setActiveSessions] = useState<LoneWorkerSession[]>([]);
  const [overdueSessions, setOverdueSessions] = useState<LoneWorkerSession[]>([]);
  const [allSessions, setAllSessions] = useState<LoneWorkerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"monitoring" | "history">("monitoring");
  const [endingId, setEndingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [activeRes, overdueRes, allRes] = await Promise.all([
        loneWorkerApi.getActive(),
        loneWorkerApi.getOverdue(),
        loneWorkerApi.list({ limit: 100 }),
      ]);
      setActiveSessions(activeRes.data || []);
      setOverdueSessions(overdueRes.data || []);
      setAllSessions(allRes.data.sessions || []);
    } catch {
      setActiveSessions([]);
      setOverdueSessions([]);
      setAllSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleEndSession = async (sessionId: number) => {
    setEndingId(sessionId);
    try {
      await loneWorkerApi.end(sessionId);
      await loadData();
    } catch {
      // ignore
    } finally {
      setEndingId(null);
    }
  };

  const overdueCount = overdueSessions.length;
  const activeCount = activeSessions.length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Lone Worker Protection"
        subtitle="Monitor solo guards with periodic check-in tracking and escalation"
        icon={<UserCheck className="text-blue-600" size={28} />}
        actions={
          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-sm font-bold text-red-800 animate-pulse">
                <AlertTriangle size={14} />
                {overdueCount} Overdue
              </span>
            )}
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
              {activeCount} Active
            </span>
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Overdue Banner */}
      {overdueCount > 0 && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <h2 className="text-lg font-semibold text-amber-800 flex items-center gap-2 mb-3">
            <AlertCircle className="animate-pulse" size={20} />
            Overdue Check-Ins
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {overdueSessions.map((s) => {
              const escConf = ESCALATION_CONFIG[s.escalation_level] || ESCALATION_CONFIG[0];
              return (
                <div key={s.session_id} className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">{s.employee_name || "Unknown"}</p>
                    <span className={`text-xs font-medium ${escConf.classes}`}>{escConf.label}</span>
                  </div>
                  {s.site_name && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin size={10} /> {s.site_name}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Last check-in: {timeAgo(s.last_check_in)}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Missed: {s.missed_check_ins} check-in{s.missed_check_ins !== 1 ? "s" : ""}
                  </p>
                  {s.last_latitude && s.last_longitude && (
                    <p className="text-xs text-blue-600 mt-1">
                      Last GPS: {s.last_latitude.toFixed(5)}, {s.last_longitude.toFixed(5)}
                    </p>
                  )}
                  <div className="mt-3">
                    <button
                      onClick={() => handleEndSession(s.session_id)}
                      disabled={endingId === s.session_id}
                      className="w-full rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {endingId === s.session_id ? "Ending..." : "End Session"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 pb-2">
        <button
          onClick={() => setTab("monitoring")}
          className={`pb-2 text-sm font-medium ${
            tab === "monitoring" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Live Monitoring ({activeCount})
        </button>
        <button
          onClick={() => setTab("history")}
          className={`pb-2 text-sm font-medium ${
            tab === "history" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Session History
        </button>
      </div>

      {/* Live Monitoring Tab */}
      {tab === "monitoring" && (
        <>
          {activeCount === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <Shield size={48} className="mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Active Sessions</h3>
              <p className="text-sm text-gray-500 mt-1">No guards are currently in lone worker monitoring mode.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeSessions.map((s) => {
                const statusConf = STATUS_CONFIG[s.status] || STATUS_CONFIG.active;
                const escConf = ESCALATION_CONFIG[s.escalation_level] || ESCALATION_CONFIG[0];
                const due = timeUntil(s.next_check_in_due);
                const isOverdue = due === "OVERDUE";

                return (
                  <div key={s.session_id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900">{s.employee_name || "Unknown"}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${statusConf.classes}`}>
                        {statusConf.label}
                      </span>
                    </div>
                    {s.site_name && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin size={10} /> {s.site_name}
                      </p>
                    )}
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={10} /> Interval: every {s.check_in_interval_minutes}min
                      </p>
                      <p className="text-xs text-gray-500">
                        Last check-in: {timeAgo(s.last_check_in)}
                      </p>
                      <p className={`text-xs font-medium ${isOverdue ? "text-red-600" : "text-green-600"}`}>
                        Next due: {due}
                      </p>
                      {s.escalation_level > 0 && (
                        <p className={`text-xs ${escConf.classes}`}>
                          Escalation: {escConf.label}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Started: {fmtDate(s.started_at)}
                    </p>
                    <button
                      onClick={() => handleEndSession(s.session_id)}
                      disabled={endingId === s.session_id}
                      className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {endingId === s.session_id ? "Ending..." : "End Session"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Guard</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Interval</th>
                <th className="px-4 py-3">Missed</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Ended</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allSessions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No lone worker sessions found
                  </td>
                </tr>
              )}
              {allSessions.map((s) => {
                const statusConf = STATUS_CONFIG[s.status] || STATUS_CONFIG.active;
                return (
                  <tr key={s.session_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{s.employee_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{s.site_name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${statusConf.classes}`}>
                        {statusConf.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.check_in_interval_minutes}min</td>
                    <td className="px-4 py-3 text-gray-500">{s.missed_check_ins}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(s.started_at)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(s.ended_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
