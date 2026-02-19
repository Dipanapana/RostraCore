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
    classes: "bg-blue-900/50 text-blue-300",
    icon: <Clock size={12} />,
  },
  completed: {
    label: "Completed",
    classes: "bg-green-900/50 text-green-300",
    icon: <CheckCircle2 size={12} />,
  },
  abandoned: {
    label: "Abandoned",
    classes: "bg-red-900/50 text-red-300",
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
    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Route className="text-violet-400" size={24} />
            Patrol Monitoring
          </h1>
          <p className="text-sm text-slate-400 mt-1">Guard patrol tours and checkpoint completion</p>
        </div>
        <button
          onClick={() => { fetchTours(); fetchRuns(); }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-slate-300 transition-colors"
        >
          <RefreshCw size={14} className={(loading || runsLoading) ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Tour list ────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700">
              <h2 className="text-sm font-semibold text-slate-300">Patrol Tours ({tours.length})</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-500 text-sm">Loading…</div>
            ) : tours.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Route size={28} className="text-slate-600" />
                <p className="text-slate-500 text-sm">No patrol tours configured</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-700/50">
                {tours.map(tour => {
                  const isSelected = selectedTour?.tour_id === tour.tour_id;
                  return (
                    <li key={tour.tour_id}>
                      <button
                        onClick={() => { setSelectedTour(tour); setExpandedRun(null); }}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-700/50 transition-colors flex items-center justify-between gap-2 ${isSelected ? "bg-slate-700/60 border-l-2 border-violet-500" : ""}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? "text-violet-300" : "text-slate-200"}`}>
                            {tour.name}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} />
                            {tour.site_name ?? `Site #${tour.site_id ?? "?"}`}
                            <span className="mx-1">·</span>
                            <Shield size={10} />
                            {tour.checkpoints?.length ?? 0} checkpoints
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!tour.is_active && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-500">inactive</span>
                          )}
                          <ChevronRight size={14} className="text-slate-600" />
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
            <div className="bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center py-24">
              <p className="text-slate-500 text-sm">Select a patrol tour to view runs</p>
            </div>
          ) : (
            <>
              {/* Tour summary cards */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Completed", value: completed, color: "text-green-400" },
                  { label: "In Progress", value: inProgress, color: "text-blue-400" },
                  { label: "Abandoned",  value: abandoned,  color: "text-red-400" },
                ].map(c => (
                  <div key={c.label} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{c.label}</p>
                    <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                  </div>
                ))}
              </div>

              {/* Filter bar */}
              <div className="flex items-center gap-3 mb-3">
                <p className="text-sm font-semibold text-slate-300 flex-1">
                  {selectedTour.name} — Recent Runs
                </p>
                <select
                  value={runFilter}
                  onChange={e => setRunFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="abandoned">Abandoned</option>
                </select>
              </div>

              {/* Runs list */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                {runsLoading ? (
                  <div className="flex items-center justify-center py-12 text-slate-500 text-sm">Loading runs…</div>
                ) : runs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Route size={28} className="text-slate-600" />
                    <p className="text-slate-500 text-sm">No patrol runs found</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-700/50">
                    {runs.map(run => {
                      const sts = RUN_STATUS[run.status] ?? RUN_STATUS.abandoned;
                      const pct = completionPct(run.scans_completed, run.total_checkpoints);
                      const isExpanded = expandedRun === run.run_id;
                      return (
                        <li key={run.run_id}>
                          <button
                            onClick={() => setExpandedRun(isExpanded ? null : run.run_id)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-700/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {/* Status badge */}
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${sts.classes} shrink-0`}>
                                {sts.icon}
                                {sts.label}
                              </span>

                              {/* Date + duration */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-300">{fmtDate(run.started_at)}</p>
                              </div>

                              <div className="text-xs text-slate-500 shrink-0">
                                {duration(run.started_at, run.completed_at)}
                              </div>

                              {/* Checkpoint count */}
                              <div className="text-xs text-slate-400 shrink-0 w-16 text-right">
                                {run.scans_completed}/{run.total_checkpoints} CPs
                              </div>

                              <ChevronRight
                                size={14}
                                className={`text-slate-600 transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                              />
                            </div>

                            {/* Progress bar */}
                            <div className="mt-2">
                              <ProgressBar pct={pct} status={run.status} />
                            </div>
                          </button>

                          {/* Expanded: scan details */}
                          {isExpanded && (
                            <div className="px-4 pb-3 bg-slate-900/40">
                              {run.scans.length === 0 ? (
                                <p className="text-xs text-slate-600 italic py-2">No checkpoints scanned</p>
                              ) : (
                                <ul className="space-y-1 pt-1">
                                  {run.scans.map((scan, i) => (
                                    <li key={scan.scan_id} className="flex items-center gap-3 text-xs text-slate-400">
                                      <span className="w-5 h-5 rounded-full bg-green-900/40 text-green-400 flex items-center justify-center font-bold shrink-0">
                                        {i + 1}
                                      </span>
                                      <span className="flex-1 text-slate-300">{scan.checkpoint_name}</span>
                                      <span className="text-slate-500">{fmtDate(scan.scanned_at)}</span>
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

              <p className="text-xs text-slate-600 mt-2 text-right">{runs.length} run{runs.length !== 1 ? "s" : ""} shown</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
