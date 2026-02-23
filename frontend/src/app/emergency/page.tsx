"use client";

import { useState, useEffect, useCallback } from "react";
import { emergencyApi } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import {
  Siren,
  CheckCircle,
  RefreshCw,
  Clock,
  MapPin,
  Shield,
  AlertTriangle,
  Phone,
  Navigation,
  Radio,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmergencyAlert {
  alert_id: number;
  org_id: number;
  employee_id: number | null;
  employee_name: string | null;
  alert_type: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  site_id: number | null;
  site_name: string | null;
  shift_id: number | null;
  notes: string | null;
  related_incident_id: number | null;
  acknowledged_by_user_id: number | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  triggered_at: string;
  triggered_by_name: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALERT_TYPE_CONFIG: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
  panic:   { label: "PANIC",   classes: "bg-red-100 text-red-800 font-bold animate-pulse", icon: <Siren size={12} /> },
  duress:  { label: "DURESS",  classes: "bg-orange-100 text-orange-800 font-bold animate-pulse", icon: <AlertTriangle size={12} /> },
  medical: { label: "MEDICAL", classes: "bg-blue-100 text-blue-800 font-bold", icon: <Phone size={12} /> },
  fire:    { label: "FIRE",    classes: "bg-amber-100 text-amber-800 font-bold animate-pulse", icon: <AlertTriangle size={12} /> },
};

const STATUS_CONFIG: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
  active:       { label: "ACTIVE",       classes: "bg-red-100 text-red-800 animate-pulse",    icon: <Siren size={12} /> },
  acknowledged: { label: "Acknowledged", classes: "bg-yellow-100 text-yellow-800", icon: <CheckCircle size={12} /> },
  dispatched:   { label: "Dispatched",   classes: "bg-blue-100 text-blue-800",   icon: <Navigation size={12} /> },
  resolved:     { label: "Resolved",     classes: "bg-green-100 text-green-800", icon: <CheckCircle size={12} /> },
  false_alarm:  { label: "False Alarm",  classes: "bg-gray-100 text-gray-600",      icon: <Shield size={12} /> },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// Resolve Modal
// ---------------------------------------------------------------------------

function ResolveModal({
  alert,
  onClose,
  onResolved,
}: {
  alert: EmergencyAlert;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [falseAlarm, setFalseAlarm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!notes.trim()) return;
    setSaving(true);
    try {
      await emergencyApi.resolve(alert.alert_id, {
        resolution_notes: notes,
        false_alarm: falseAlarm,
      });
      onResolved();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resolve Emergency Alert</h3>
        <p className="text-sm text-gray-500 mb-4">
          Alert #{alert.alert_id} &mdash; {alert.alert_type.toUpperCase()} by {alert.employee_name || alert.triggered_by_name || "Unknown"}
        </p>
        <textarea
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
          rows={4}
          placeholder="Resolution notes (required)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <label className="flex items-center gap-2 mt-3 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={falseAlarm}
            onChange={(e) => setFalseAlarm(e.target.checked)}
            className="rounded border-gray-300 bg-white"
          />
          Mark as false alarm
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !notes.trim()}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "Resolving..." : "Resolve Alert"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function EmergencyPage() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [allAlerts, setAllAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "all">("active");
  const [statusFilter, setStatusFilter] = useState("");
  const [resolving, setResolving] = useState<EmergencyAlert | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchActive = useCallback(async () => {
    try {
      const res = await emergencyApi.getActive();
      setAlerts(res.data);
    } catch {
      setAlerts([]);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const res = await emergencyApi.list({ status_filter: statusFilter || undefined, limit: 100 });
      setAllAlerts(res.data.alerts || []);
    } catch {
      setAllAlerts([]);
    }
  }, [statusFilter]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchActive(), fetchAll()]);
    setLoading(false);
  }, [fetchActive, fetchAll]);

  useEffect(() => {
    loadData();
    const interval = setInterval(fetchActive, 10000);
    return () => clearInterval(interval);
  }, [loadData, fetchActive]);

  useEffect(() => {
    fetchAll();
  }, [statusFilter, fetchAll]);

  const handleAcknowledge = async (alertId: number) => {
    setActionLoading(alertId);
    try {
      await emergencyApi.acknowledge(alertId);
      await loadData();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleDispatch = async (alertId: number) => {
    setActionLoading(alertId);
    try {
      await emergencyApi.dispatch(alertId);
      await loadData();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const activeCount = alerts.length;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        backHref="/dashboard"
        backLabel="Back to Dashboard"
        title="Emergency Alerts"
        subtitle="Command center for panic/duress alerts and emergency response"
        icon={<Siren className={activeCount > 0 ? "text-red-500 animate-pulse" : "text-gray-400"} size={28} />}
        actions={
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-sm font-bold text-red-800 animate-pulse">
                <Siren size={14} />
                {activeCount} Active {activeCount === 1 ? "Alert" : "Alerts"}
              </span>
            )}
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

      {/* Active Alerts Banner */}
      {activeCount > 0 && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4">
          <h2 className="text-lg font-semibold text-red-800 flex items-center gap-2 mb-3">
            <Radio className="animate-pulse" size={20} />
            Active Emergency Alerts
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.map((alert) => {
              const typeConf = ALERT_TYPE_CONFIG[alert.alert_type] || ALERT_TYPE_CONFIG.panic;
              const statusConf = STATUS_CONFIG[alert.status] || STATUS_CONFIG.active;

              return (
                <div
                  key={alert.alert_id}
                  className="rounded-xl border border-red-200 bg-white p-4 shadow-sm shadow-red-100"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${typeConf.classes}`}>
                      {typeConf.icon}
                      {typeConf.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${statusConf.classes}`}>
                      {statusConf.icon}
                      {statusConf.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {alert.employee_name || alert.triggered_by_name || "Unknown Guard"}
                  </p>
                  {alert.site_name && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin size={10} />
                      {alert.site_name}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Clock size={10} />
                    {timeAgo(alert.triggered_at)} &mdash; {fmtDate(alert.triggered_at)}
                  </p>
                  {alert.latitude && alert.longitude && (
                    <p className="text-xs text-blue-600 mt-1">
                      GPS: {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}
                    </p>
                  )}
                  {alert.notes && (
                    <p className="text-xs text-gray-500 mt-1 italic">{alert.notes}</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    {alert.status === "active" && (
                      <button
                        onClick={() => handleAcknowledge(alert.alert_id)}
                        disabled={actionLoading === alert.alert_id}
                        className="flex-1 rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
                      >
                        {actionLoading === alert.alert_id ? "..." : "Acknowledge"}
                      </button>
                    )}
                    {(alert.status === "active" || alert.status === "acknowledged") && (
                      <button
                        onClick={() => handleDispatch(alert.alert_id)}
                        disabled={actionLoading === alert.alert_id}
                        className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {actionLoading === alert.alert_id ? "..." : "Dispatch"}
                      </button>
                    )}
                    <button
                      onClick={() => setResolving(alert)}
                      className="flex-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    >
                      Resolve
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
          onClick={() => setTab("active")}
          className={`pb-2 text-sm font-medium ${
            tab === "active"
              ? "border-b-2 border-red-500 text-red-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setTab("all")}
          className={`pb-2 text-sm font-medium ${
            tab === "all"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          All History
        </button>
      </div>

      {/* All History Tab */}
      {tab === "all" && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="dispatched">Dispatched</option>
              <option value="resolved">Resolved</option>
              <option value="false_alarm">False Alarm</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Guard</th>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Triggered</th>
                  <th className="px-4 py-3">Resolved</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allAlerts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No emergency alerts found
                    </td>
                  </tr>
                )}
                {allAlerts.map((alert) => {
                  const typeConf = ALERT_TYPE_CONFIG[alert.alert_type] || ALERT_TYPE_CONFIG.panic;
                  const statusConf = STATUS_CONFIG[alert.status] || STATUS_CONFIG.active;

                  return (
                    <tr key={alert.alert_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">#{alert.alert_id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${typeConf.classes}`}>
                          {typeConf.icon}
                          {typeConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{alert.employee_name || alert.triggered_by_name || "\u2014"}</td>
                      <td className="px-4 py-3 text-gray-600">{alert.site_name || "\u2014"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${statusConf.classes}`}>
                          {statusConf.icon}
                          {statusConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(alert.triggered_at)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(alert.resolved_at)}</td>
                      <td className="px-4 py-3">
                        {(alert.status === "active" || alert.status === "acknowledged" || alert.status === "dispatched") && (
                          <button
                            onClick={() => setResolving(alert)}
                            className="rounded-lg bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                          >
                            Resolve
                          </button>
                        )}
                        {alert.resolution_notes && (
                          <span className="text-xs text-gray-400 ml-2" title={alert.resolution_notes}>
                            {alert.resolution_notes.slice(0, 30)}...
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active tab - show cards if no alerts in banner already */}
      {tab === "active" && activeCount === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <Shield size={48} className="mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">All Clear</h3>
          <p className="text-sm text-gray-500 mt-1">No active emergency alerts. All guards are safe.</p>
        </div>
      )}

      {/* Resolve Modal */}
      {resolving && (
        <ResolveModal
          alert={resolving}
          onClose={() => setResolving(null)}
          onResolved={() => {
            setResolving(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
