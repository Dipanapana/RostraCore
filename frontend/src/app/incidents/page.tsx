"use client";

import { useState, useEffect, useCallback } from "react";
import { incidentsApi } from "@/services/api";
import { AlertTriangle, CheckCircle, Search, RefreshCw, Clock, ShieldAlert } from "lucide-react";
import DashboardLayout from '@/components/layout/DashboardLayout'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Incident {
  incident_id: number;
  site_id: number | null;
  site_name: string | null;
  incident_type: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "reported" | "investigating" | "resolved" | "closed";
  reported_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  latitude: number | null;
  longitude: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG: Record<string, { label: string; classes: string }> = {
  low:      { label: "Low",      classes: "bg-gray-200 text-gray-700" },
  medium:   { label: "Medium",   classes: "bg-amber-900/60 text-amber-300" },
  high:     { label: "High",     classes: "bg-orange-900/60 text-orange-300" },
  critical: { label: "Critical", classes: "bg-red-900/60 text-red-300 font-bold" },
};

const STATUS_CONFIG: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
  reported:     { label: "Reported",     classes: "bg-blue-900/50 text-blue-300",   icon: <AlertTriangle size={12} /> },
  investigating:{ label: "Investigating",classes: "bg-yellow-900/50 text-yellow-300",icon: <Clock size={12} /> },
  resolved:     { label: "Resolved",     classes: "bg-green-900/50 text-green-300", icon: <CheckCircle size={12} /> },
  closed:       { label: "Closed",       classes: "bg-gray-200 text-gray-500",    icon: <CheckCircle size={12} /> },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function truncate(s: string, n = 80): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// ---------------------------------------------------------------------------
// Resolve modal
// ---------------------------------------------------------------------------

function ResolveModal({
  incident,
  onClose,
  onSave,
}: {
  incident: Incident;
  onClose: () => void;
  onSave: (notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(notes);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Resolve Incident #{incident.incident_id}</h2>
        <p className="text-sm text-gray-500 mb-4">{incident.site_name ?? "Unknown site"} — {incident.incident_type}</p>
        <label className="block text-sm text-gray-700 mb-2">Resolution Notes</label>
        <textarea
          className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
          rows={4}
          placeholder="Describe how the incident was resolved…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <div className="flex gap-3 mt-4 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Mark Resolved"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [resolveTarget, setResolveTarget] = useState<Incident | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await incidentsApi.list({
        severity: severityFilter || undefined,
        status_filter: statusFilter || undefined,
        limit: 200,
      });
      setIncidents(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Failed to load incidents", e);
    } finally {
      setLoading(false);
    }
  }, [severityFilter, statusFilter]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  const markInvestigating = async (incident: Incident) => {
    setActionLoading(incident.incident_id);
    try {
      await incidentsApi.updateStatus(incident.incident_id, "investigating");
      await fetchIncidents();
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (notes: string) => {
    if (!resolveTarget) return;
    await incidentsApi.updateStatus(resolveTarget.incident_id, "resolved", notes);
    setResolveTarget(null);
    await fetchIncidents();
  };

  // Client-side text search
  const displayed = search.trim()
    ? incidents.filter(i =>
        i.description.toLowerCase().includes(search.toLowerCase()) ||
        (i.site_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        i.incident_type.toLowerCase().includes(search.toLowerCase())
      )
    : incidents;

  // Summary counts
  const counts = {
    total: incidents.length,
    critical: incidents.filter(i => i.severity === "critical").length,
    open: incidents.filter(i => ["reported", "investigating"].includes(i.status)).length,
    resolved: incidents.filter(i => i.status === "resolved").length,
  };

  return (
    <DashboardLayout>
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="text-red-400" size={24} />
            Incident Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">Security incidents filed by guards via the mobile app</p>
        </div>
        <button
          onClick={fetchIncidents}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total",    value: counts.total,    color: "text-gray-700" },
          { label: "Critical", value: counts.critical, color: "text-red-400" },
          { label: "Open",     value: counts.open,     color: "text-amber-400" },
          { label: "Resolved", value: counts.resolved, color: "text-green-400" },
        ].map(c => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{c.label}</p>
            <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search description, site, type…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="">All Severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="">All Statuses</option>
          <option value="reported">Reported</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading incidents…</div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertTriangle size={32} className="text-gray-400" />
            <p className="text-gray-400 text-sm">No incidents found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Site</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Severity</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reported</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((inc, idx) => {
                  const sev = SEVERITY_CONFIG[inc.severity] ?? SEVERITY_CONFIG.low;
                  const sts = STATUS_CONFIG[inc.status] ?? STATUS_CONFIG.reported;
                  const isOpen = ["reported", "investigating"].includes(inc.status);
                  const busy = actionLoading === inc.incident_id;
                  return (
                    <tr
                      key={inc.incident_id}
                      className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? "" : "bg-gray-50"}`}
                    >
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{inc.incident_id}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{inc.site_name ?? <span className="text-gray-400">—</span>}</td>
                      <td className="px-4 py-3 text-gray-700 capitalize">{inc.incident_type.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${sev.classes}`}>
                          {sev.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs">{truncate(inc.description)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtDate(inc.reported_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${sts.classes}`}>
                          {sts.icon}
                          {sts.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isOpen && (
                          <div className="flex gap-2">
                            {inc.status === "reported" && (
                              <button
                                onClick={() => markInvestigating(inc)}
                                disabled={busy}
                                className="px-2 py-1 rounded text-xs bg-yellow-900/50 text-yellow-300 hover:bg-yellow-800/60 disabled:opacity-50 transition-colors whitespace-nowrap"
                              >
                                {busy ? "…" : "Investigate"}
                              </button>
                            )}
                            <button
                              onClick={() => setResolveTarget(inc)}
                              disabled={busy}
                              className="px-2 py-1 rounded text-xs bg-green-900/50 text-green-300 hover:bg-green-800/60 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                              Resolve
                            </button>
                          </div>
                        )}
                        {inc.status === "resolved" && inc.resolution_notes && (
                          <span className="text-xs text-gray-400 italic">{truncate(inc.resolution_notes, 40)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3 text-right">{displayed.length} incident{displayed.length !== 1 ? "s" : ""} shown</p>

      {/* Resolve modal */}
      {resolveTarget && (
        <ResolveModal
          incident={resolveTarget}
          onClose={() => setResolveTarget(null)}
          onSave={handleResolve}
        />
      )}
    </div>
    </DashboardLayout>
  );
}
