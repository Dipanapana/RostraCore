"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { attendanceApi, employeesApi, sitesApi } from "@/services/api";
import { useToast } from "@/context/ToastContext";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  Users,
  MapPin,
  Filter,
  Activity,
  Camera,
} from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AttendanceRecord {
  assignment_id: number;
  employee_id: number;
  employee_name: string;
  site_id: number | null;
  site_name: string;
  shift_id: number;
  shift_start: string | null;
  shift_end: string | null;
  scheduled_hours: number | null;
  checked_in: boolean;
  check_in_time: string | null;
  checked_out: boolean;
  check_out_time: string | null;
  actual_hours: number | null;
  attendance_status: "present" | "in_progress" | "no_show" | "scheduled";
  is_late: boolean;
  check_in_photo_url?: string | null;
  check_out_photo_url?: string | null;
  check_in_photo_verified?: boolean | null;
  check_out_photo_verified?: boolean | null;
}

interface AttendanceSummary {
  total: number;
  present: number;
  in_progress: number;
  no_show: number;
  late: number;
}

interface Employee {
  employee_id: number;
  first_name: string;
  last_name: string;
}

interface Site {
  site_id: number;
  site_name: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getThisWeek(): { start: string; end: string } {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }).toISOString().split("T")[0],
    end: endOfWeek(now, { weekStartsOn: 1 }).toISOString().split("T")[0],
  };
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "HH:mm");
  } catch {
    return "—";
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "EEE d MMM");
  } catch {
    return "—";
  }
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({
  status,
  isLate,
}: {
  status: AttendanceRecord["attendance_status"];
  isLate: boolean;
}) {
  const map = {
    present: {
      label: "Present",
      cls: "bg-emerald-50 text-emerald-700",
      icon: CheckCircle2,
    },
    in_progress: {
      label: "On Duty",
      cls: "bg-blue-100 text-blue-700",
      icon: Activity,
    },
    no_show: {
      label: "No Show",
      cls: "bg-red-100 text-red-700",
      icon: XCircle,
    },
    scheduled: {
      label: "Scheduled",
      cls: "bg-gray-100 text-gray-500",
      icon: Clock,
    },
  };

  const { label, cls, icon: Icon } = map[status] ?? map.scheduled;

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
      >
        <Icon className="w-3 h-3" />
        {label}
      </span>
      {isLate && status !== "no_show" && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          <AlertTriangle className="w-3 h-3" />
          Late
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AttendancePage() {
  const { showToast } = useToast();
  const week = useMemo(() => getThisWeek(), []);

  const [startDate, setStartDate] = useState(week.start);
  const [endDate, setEndDate] = useState(week.end);
  const [filterEmployee, setFilterEmployee] = useState<string>("");
  const [filterSite, setFilterSite] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  // Load filter options once
  useEffect(() => {
    Promise.allSettled([
      employeesApi.getAll({ status: "active" }),
      sitesApi.getAll(),
    ]).then(([empRes, siteRes]) => {
      if (empRes.status === "fulfilled")
        setEmployees(empRes.value.data?.employees || empRes.value.data || []);
      if (siteRes.status === "fulfilled")
        setSites(siteRes.value.data?.sites || siteRes.value.data || []);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.getRecords({
        start_date: startDate,
        end_date: endDate,
        employee_id: filterEmployee ? Number(filterEmployee) : undefined,
        site_id: filterSite ? Number(filterSite) : undefined,
        attendance_status: filterStatus || undefined,
        limit: 500,
      });
      setRecords(res.data?.records || []);
      setSummary(res.data?.summary || null);
    } catch {
      showToast("Failed to load attendance records", "error");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, filterEmployee, filterSite, filterStatus, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Attendance
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Guard check-in and check-out records with GPS verification
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-gray-400" />
              <select
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="">All Employees</option>
                {employees.map((e) => (
                  <option key={e.employee_id} value={e.employee_id}>
                    {e.first_name} {e.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400" />
              <select
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="">All Sites</option>
                {sites.map((s) => (
                  <option key={s.site_id} value={s.site_id}>
                    {s.site_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="">All Statuses</option>
                <option value="present">Present</option>
                <option value="in_progress">On Duty</option>
                <option value="no_show">No Show</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
          </div>
        </div>

        {/* KPI row */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard
              label="Total Shifts"
              value={summary.total}
              icon={Clock}
              color="bg-gray-500"
            />
            <KpiCard
              label="Present"
              value={summary.present}
              icon={CheckCircle2}
              color="bg-green-500"
            />
            <KpiCard
              label="No Show"
              value={summary.no_show}
              icon={XCircle}
              color="bg-red-500"
            />
            <KpiCard
              label="Late Arrivals"
              value={summary.late}
              icon={AlertTriangle}
              color="bg-amber-500"
            />
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 className="w-7 h-7 animate-spin mr-3" />
              Loading attendance…
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Clock className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No records for this period</p>
              <p className="text-xs mt-1 text-gray-400">
                Adjust the date range or filters
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Guard
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Site
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Scheduled
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Checked In
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Checked Out
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Actual Hrs
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">
                      Photo
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">
                      Verified
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((r) => (
                    <tr
                      key={r.assignment_id}
                      className={`hover:bg-gray-50 transition-colors ${
                        r.attendance_status === "no_show"
                          ? "bg-red-50/40"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {r.employee_name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {r.site_name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {fmtDate(r.shift_start)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {r.shift_start ? fmtTime(r.shift_start) : "—"}
                        {" – "}
                        {r.shift_end ? fmtTime(r.shift_end) : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {r.check_in_time ? (
                          <span className="text-green-600 font-medium">
                            {fmtTime(r.check_in_time)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {r.check_out_time ? (
                          <span className="text-blue-600 font-medium">
                            {fmtTime(r.check_out_time)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {r.actual_hours != null ? (
                          <span className="font-medium">{r.actual_hours.toFixed(1)}h</span>
                        ) : r.scheduled_hours != null ? (
                          <span className="text-gray-400">
                            {r.scheduled_hours.toFixed(1)}h sched.
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={r.attendance_status}
                          isLate={r.is_late}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.check_in_photo_url ? (
                          <a
                            href={r.check_in_photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-8 h-8 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            title="View check-in photo"
                          >
                            <Camera className="w-4 h-4 text-blue-600" />
                          </a>
                        ) : (
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-50 rounded-lg">
                            <Camera className="w-4 h-4 text-gray-300" />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.check_in_photo_verified === true ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </span>
                        ) : r.check_in_photo_verified === false ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3" />
                            Failed
                          </span>
                        ) : r.check_in_photo_url ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
