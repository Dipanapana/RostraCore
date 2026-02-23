"use client";

import { useState, useEffect, useCallback } from "react";
import { reportScheduleApi } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import {
  Calendar,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  Mail,
  RefreshCw,
  FileText,
  AlertCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Schedule {
  schedule_id: number;
  name: string;
  report_type: string;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  time_of_day: string;
  recipients: string[];
  client_id: number | null;
  client_name: string | null;
  site_ids: number[];
  enabled: boolean;
  last_sent_at: string | null;
  last_error: string | null;
  created_at: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REPORT_TYPES: Record<string, string> = {
  daily_activity: "Daily Activity",
  weekly_summary: "Weekly Summary",
  monthly_compliance: "Monthly Compliance",
  incident_summary: "Incident Summary",
  patrol_report: "Patrol Report",
  attendance_report: "Attendance Report",
  payroll_summary: "Payroll Summary",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

// ---------------------------------------------------------------------------
// Create Modal
// ---------------------------------------------------------------------------

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [reportType, setReportType] = useState("daily_activity");
  const [frequency, setFrequency] = useState("daily");
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [timeOfDay, setTimeOfDay] = useState("08:00");
  const [recipientsStr, setRecipientsStr] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const recipients = recipientsStr.split(",").map(e => e.trim()).filter(Boolean);
      await reportScheduleApi.create({
        name,
        report_type: reportType,
        frequency,
        day_of_week: frequency === "weekly" ? dayOfWeek : null,
        day_of_month: frequency === "monthly" ? dayOfMonth : null,
        time_of_day: timeOfDay,
        recipients,
      });
      onCreated();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">New Report Schedule</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Schedule Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekly Client Report"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Report Type</label>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500">
                {Object.entries(REPORT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Frequency</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          {frequency === "weekly" && (
            <div>
              <label className="block text-sm text-gray-500 mb-1">Day of Week</label>
              <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500">
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
          )}
          {frequency === "monthly" && (
            <div>
              <label className="block text-sm text-gray-500 mb-1">Day of Month</label>
              <input type="number" min={1} max={28} value={dayOfMonth} onChange={(e) => setDayOfMonth(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-500 mb-1">Time (HH:MM)</label>
            <input type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Recipients (comma-separated emails)</label>
            <input type="text" value={recipientsStr} onChange={(e) => setRecipientsStr(e.target.value)} placeholder="client@example.com, manager@example.com"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !name.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Creating..." : "Create Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ReportSchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportScheduleApi.list();
      setSchedules(res.data || []);
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggle = async (id: number) => {
    setTogglingId(id);
    try {
      await reportScheduleApi.toggle(id);
      await loadData();
    } catch {} finally { setTogglingId(null); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this report schedule?")) return;
    setDeletingId(id);
    try {
      await reportScheduleApi.delete(id);
      await loadData();
    } catch {} finally { setDeletingId(null); }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/reports"
        backLabel="Back to Reports"
        title="Report Schedules"
        subtitle="Automated report generation and email delivery"
        icon={<Calendar className="text-blue-600" size={28} />}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Plus size={14} /> New Schedule
            </button>
          </div>
        }
      />

      {schedules.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Schedules</h3>
          <p className="text-sm text-gray-500 mt-1">Create an automated report schedule to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((s) => (
            <div key={s.schedule_id} className={`rounded-xl border ${s.enabled ? "border-gray-200" : "border-gray-100"} bg-white p-4 shadow-sm ${!s.enabled ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900">{s.name}</h3>
                <button onClick={() => handleToggle(s.schedule_id)} disabled={togglingId === s.schedule_id} className="text-gray-400 hover:text-gray-700">
                  {s.enabled ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
                </button>
              </div>
              <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800 mb-2">
                {REPORT_TYPES[s.report_type] || s.report_type}
              </span>
              <div className="space-y-1 text-xs text-gray-500">
                <p className="flex items-center gap-1"><Clock size={10} /> {s.frequency} at {s.time_of_day}
                  {s.frequency === "weekly" && s.day_of_week !== null ? ` (${DAYS[s.day_of_week]})` : ""}
                  {s.frequency === "monthly" && s.day_of_month ? ` (day ${s.day_of_month})` : ""}
                </p>
                <p className="flex items-center gap-1"><Mail size={10} /> {s.recipients.length} recipient{s.recipients.length !== 1 ? "s" : ""}</p>
                <p>Last sent: {fmtDate(s.last_sent_at)}</p>
                {s.last_error && (
                  <p className="text-red-600 flex items-center gap-1"><AlertCircle size={10} /> {s.last_error}</p>
                )}
              </div>
              <div className="mt-3 flex justify-end">
                <button onClick={() => handleDelete(s.schedule_id)} disabled={deletingId === s.schedule_id}
                  className="text-red-500 hover:text-red-700 p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadData(); }} />
      )}
    </div>
  );
}
