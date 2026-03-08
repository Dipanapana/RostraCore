"use client";

import { useState, useEffect, useCallback } from "react";
import { patrolsApi } from "@/services/api";
import {
  Route,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  MapPin,
  Shield,
  ChevronRight,
} from "lucide-react";
import DashboardLayout from '@/components/layout/DashboardLayout'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Checkpoint {
  checkpoint_id: number;
  name: string;
  sequence_order: number;
}

interface Tour {
  tour_id: number;
  name: string;
  site_id: number | null;
  site_name?: string | null;
  checkpoints: Checkpoint[];
  is_active: boolean;
}

interface Scan {
  scan_id: number;
  checkpoint_name: string;
  scanned_at: string;
  latitude: number | null;
  longitude: number | null;
}

interface Run {
  run_id: number;
  tour_id: number;
  tour_name: string;
  status: "in_progress" | "completed" | "abandoned";
  started_at: string;
  completed_at: string | null;
  total_checkpoints: number;
  scans_completed: number;
  scans: Scan[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RUN_STATUS = {
  in_progress: {
    label: "In Progress",
    classes: "bg-blue-100 text-blue-700",
    icon: <Clock size={12} />,
  },
  completed: {
    label: "Completed",
    classes: "bg-emerald-50 text-emerald-700",
    icon: <CheckCircle2 size={12} />,
  },
  abandoned: {
    label: "Abandoned",
    classes: "bg-red-100 text-red-700",
    icon: <XCircle size={12} />,
  },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-ZA", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function duration(start: string, end: string | null): string {
  if (!end) return "ongoing";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function completionPct(scanned: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((scanned / total) * 100);
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({ pct, status }: { pct: number; status: string }) {
  const colour =
    status === "completed"
      ? "bg-green-500"
      : status === "abandoned"
      ? "bg-red-500"
      : "bg-blue-500";
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${colour}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PatrolsPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [runFilter, setRunFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [runsLoading, setRunsLoading] = useState(false);
  const [expandedRun, setExpandedRun] = useState<number | null>(null);

  const fetchTours = useCallback(async () => {
    setLoading(true);
    try {
      const res = await patrolsApi.listTours();
      setTours(res.data);
      if (res.data.length > 0 && !selectedTour) {
        setSelectedTour(res.data[0]);
      }
    } catch (e) {
      console.error("Failed to load tours", e);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRuns = useCallback(async () => {
    if (!selectedTour) return;
    setRunsLoading(true);
    try {
      const res = await patrolsApi.listRuns({
        tour_id: selectedTour.tour_id,
        run_status: runFilter || undefined,
        limit: 50,
      });
      setRuns(res.data);
    } catch (e) {
      console.error("Failed to load runs", e);
    } finally {
      setRunsLoading(false);
    }
  }, [selectedTour, runFilter]);

  useEffect(() => { fetchTours(); }, [fetchTours]);
  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  // Summary for selected tour
  const completed = runs.filter(r => r.status === "completed").length;
  const inProgress = runs.filter(r => r.status === "in_progress").length;
  const abandoned = runs.filter(r => r.status === "abandoned").length;

  return (
    <DashboardLayout>
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Route className="text-violet-400" size={24} />
            Patrol Monitoring
          </h1>
          <p className="text-sm text-gray-500 mt-1">Guard patrol tours and checkpoint completion</p>
        </div>
        <button
          onClick={() => { fetchTours(); fetchRuns(); }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-100 text-sm text-gray-700 transition-colors"
        >
          <RefreshCw size={14} className={(loading || runsLoading) ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Tour list ────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">Patrol Tours ({tours.length})</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>
            ) : tours.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Route size={28} className="text-gray-400" />
                <p className="text-gray-400 text-sm">No patrol tours configured</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {tours.map(tour => {
                  const isSelected = selectedTour?.tour_id === tour.tour_id;
                  return (
                    <li key={tour.tour_id}>
                      <button
                        onClick={() => { setSelectedTour(tour); setExpandedRun(null); }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors flex items-center justify-between gap-2 ${isSelected ? "bg-gray-100 border-l-2 border-violet-500" : ""}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? "text-violet-600" : "text-gray-800"}`}>
                            {tour.name}
                          </p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} />
                            {tour.site_name ?? `Site #${tour.site_id ?? "?"}`}
                            <span className="mx-1">·</span>
                            <Shield size={10} />
                            {tour.checkpoints?.length ?? 0} checkpoints
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!tour.is_active && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">inactive</span>
                          )}
                          <ChevronRight size={14} className="text-gray-400" />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ── RIGHT: Runs for selected tour ──────────────────────────── */}
        <div className="lg:col-span-2">
          {!selectedTour ? (
            <div className="bg-white border border-gray-200 rounded-xl flex items-center justify-center py-24">
              <p className="text-gray-400 text-sm">Select a patrol tour to view runs</p>
            </div>
          ) : (
            <>
              {/* Tour summary cards */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Completed", value: completed, color: "text-green-600" },
                  { label: "In Progress", value: inProgress, color: "text-blue-600" },
                  { label: "Abandoned",  value: abandoned,  color: "text-red-600" },
                ].map(c => (
                  <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{c.label}</p>
                    <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                  </div>
                ))}
              </div>

              {/* Filter bar */}
              <div className="flex items-center gap-3 mb-3">
                <p className="text-sm font-semibold text-gray-700 flex-1">
                  {selectedTour.name} — Recent Runs
                </p>
                <select
                  value={runFilter}
                  onChange={e => setRunFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="abandoned">Abandoned</option>
                </select>
              </div>

              {/* Runs list */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {runsLoading ? (
                  <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading runs…</div>
                ) : runs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Route size={28} className="text-gray-400" />
                    <p className="text-gray-400 text-sm">No patrol runs found</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {runs.map(run => {
                      const sts = RUN_STATUS[run.status] ?? RUN_STATUS.abandoned;
                      const pct = completionPct(run.scans_completed, run.total_checkpoints);
                      const isExpanded = expandedRun === run.run_id;
                      return (
                        <li key={run.run_id}>
                          <button
                            onClick={() => setExpandedRun(isExpanded ? null : run.run_id)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {/* Status badge */}
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${sts.classes} shrink-0`}>
                                {sts.icon}
                                {sts.label}
                              </span>

                              {/* Date + duration */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700">{fmtDate(run.started_at)}</p>
                              </div>

                              <div className="text-xs text-gray-400 shrink-0">
                                {duration(run.started_at, run.completed_at)}
                              </div>

                              {/* Checkpoint count */}
                              <div className="text-xs text-gray-500 shrink-0 w-16 text-right">
                                {run.scans_completed}/{run.total_checkpoints} CPs
                              </div>

                              <ChevronRight
                                size={14}
                                className={`text-gray-400 transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                              />
                            </div>

                            {/* Progress bar */}
                            <div className="mt-2">
                              <ProgressBar pct={pct} status={run.status} />
                            </div>
                          </button>

                          {/* Expanded: scan details */}
                          {isExpanded && (
                            <div className="px-4 pb-3 bg-gray-50">
                              {run.scans.length === 0 ? (
                                <p className="text-xs text-gray-400 italic py-2">No checkpoints scanned</p>
                              ) : (
                                <ul className="space-y-1 pt-1">
                                  {run.scans.map((scan, i) => (
                                    <li key={scan.scan_id} className="flex items-center gap-3 text-xs text-gray-500">
                                      <span className="w-5 h-5 rounded-full bg-emerald-50 text-green-600 flex items-center justify-center font-bold shrink-0">
                                        {i + 1}
                                      </span>
                                      <span className="flex-1 text-gray-700">{scan.checkpoint_name}</span>
                                      <span className="text-gray-400">{fmtDate(scan.scanned_at)}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-2 text-right">{runs.length} run{runs.length !== 1 ? "s" : ""} shown</p>
            </>
          )}
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}
