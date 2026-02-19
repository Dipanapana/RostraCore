"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { employeesApi, certificationsApi, api } from "@/services/api";
import { Employee } from "@/types";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Shield,
  Award,
  Clock,
  Calendar,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Building2,
  Pencil,
} from "lucide-react";
import { format, parseISO, isPast, addDays } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Certification {
  certification_id: number;
  cert_type: string;
  cert_number: string;
  issue_date: string | null;
  expiry_date: string | null;
  is_active: boolean;
}

interface LeaveBalance {
  leave_type: string;
  used: number;
  entitled: number;
  remaining: number;
}

interface EmployeeShift {
  assignment_id: number;
  shift_id: number;
  start_time: string;
  end_time: string;
  site_name: string | null;
  status: string;
  checked_in: boolean;
  check_in_time: string | null;
  checked_out: boolean;
  check_out_time: string | null;
  total_hours: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "d MMM yyyy");
  } catch {
    return iso;
  }
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "HH:mm");
  } catch {
    return "—";
  }
}

function certExpiryStatus(expiryDate: string | null): "valid" | "expiring" | "expired" {
  if (!expiryDate) return "valid";
  try {
    const exp = parseISO(expiryDate);
    if (isPast(exp)) return "expired";
    if (isPast(addDays(exp, -30))) return "expiring";
    return "valid";
  } catch {
    return "valid";
  }
}

// ---------------------------------------------------------------------------
// Section card wrapper
// ---------------------------------------------------------------------------

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-purple-500" />
        <h2 className="font-semibold text-slate-800 dark:text-slate-200">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 text-right max-w-[60%]">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = Number(params.id);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [recentShifts, setRecentShifts] = useState<EmployeeShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!employeeId) return;

    async function load() {
      try {
        const [empRes, certRes, leaveRes, shiftsRes] = await Promise.allSettled([
          employeesApi.getById(employeeId),
          certificationsApi.getAll({ employee_id: employeeId }),
          api.get(`/api/v1/leave/balances/${employeeId}`),
          api.get(`/api/v1/employees/${employeeId}/shifts`, {
            params: { limit: 10 },
          }),
        ]);

        if (empRes.status === "fulfilled") {
          setEmployee(empRes.value.data);
        } else {
          setNotFound(true);
          return;
        }

        if (certRes.status === "fulfilled") {
          const data = certRes.value.data;
          setCertifications(data?.certifications ?? data ?? []);
        }

        if (leaveRes.status === "fulfilled") {
          const data = leaveRes.value.data;
          setLeaveBalances(data?.balances ?? data ?? []);
        }

        if (shiftsRes.status === "fulfilled") {
          const data = shiftsRes.value.data;
          const shifts = data?.assignments ?? data?.shifts ?? data ?? [];
          // Sort most recent first
          setRecentShifts(
            [...shifts].sort(
              (a: any, b: any) =>
                new Date(b.start_time ?? 0).getTime() - new Date(a.start_time ?? 0).getTime()
            ).slice(0, 10)
          );
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [employeeId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mr-3" />
          Loading employee profile…
        </div>
      </DashboardLayout>
    );
  }

  if (notFound || !employee) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
          <User className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">Employee not found</p>
          <Link href="/employees" className="mt-4 text-purple-600 hover:underline text-sm">
            ← Back to Employees
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const fullName = `${employee.first_name} ${employee.last_name}`;
  const initials = (employee.first_name[0] + (employee.last_name[0] ?? "")).toUpperCase();

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back nav */}
        <Link
          href="/employees"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Employees
        </Link>

        {/* Hero card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-2xl font-bold">{initials}</span>
            </div>

            {/* Name & badges */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{fullName}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    employee.status === "active"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                >
                  {employee.status.toUpperCase()}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    employee.role === "armed"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}
                >
                  {employee.role.toUpperCase()}
                </span>
                {employee.is_supervisor && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    SUPERVISOR
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400 mt-2">
                {employee.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {employee.email}
                  </span>
                )}
                {employee.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {employee.phone}
                  </span>
                )}
                {employee.psira_grade && (
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> PSIRA Grade {employee.psira_grade}
                  </span>
                )}
              </div>

              {/* Key stats row */}
              <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Hourly Rate</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    R{(employee.hourly_rate ?? 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Max Hrs/Week</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {employee.max_hours_week}h
                  </p>
                </div>
                {employee.employee_number && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Employee #</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {employee.employee_number}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Pay Type</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100 capitalize">
                    {employee.pay_type.replace("_", " ")}
                  </p>
                </div>
              </div>
            </div>

            {/* Edit button */}
            <Link
              href="/employees"
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-slate-600 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-400 rounded-lg text-sm font-medium transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Link>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal info */}
          <Section title="Personal Details" icon={User}>
            <InfoRow label="ID Number" value={employee.id_number} />
            <InfoRow label="Gender" value={employee.gender} />
            <InfoRow label="Address" value={employee.address} />
            <InfoRow label="Province" value={employee.province} />
            <InfoRow label="Tax Number" value={employee.tax_number} />
            <InfoRow label="Emergency Contact" value={employee.emergency_contact_name} />
            <InfoRow label="Emergency Phone" value={employee.emergency_contact_phone} />
            {!employee.address && !employee.gender && !employee.tax_number && (
              <p className="text-sm text-slate-400 py-2">No additional personal details recorded.</p>
            )}
          </Section>

          {/* PSIRA & Banking */}
          <Section title="PSIRA & Banking" icon={Shield}>
            <InfoRow label="PSIRA Number" value={employee.psira_number} />
            <InfoRow label="PSIRA Grade" value={employee.psira_grade} />
            <InfoRow label="PSIRA Expiry" value={fmtDate(employee.psira_expiry_date)} />
            <InfoRow label="Bank Name" value={employee.bank_name} />
            <InfoRow label="Account Number" value={employee.account_number} />
            <InfoRow label="Branch Code" value={employee.branch_code} />
            <InfoRow label="Account Type" value={employee.account_type} />
            {!employee.psira_number && !employee.bank_name && (
              <p className="text-sm text-slate-400 py-2">No PSIRA or banking details recorded.</p>
            )}
          </Section>
        </div>

        {/* Certifications */}
        <Section title="Certifications" icon={Award}>
          {certifications.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">No certifications recorded.</p>
          ) : (
            <div className="space-y-2">
              {certifications.map((cert) => {
                const expStatus = certExpiryStatus(cert.expiry_date);
                return (
                  <div
                    key={cert.certification_id}
                    className="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{cert.cert_type}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{cert.cert_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Expires {fmtDate(cert.expiry_date)}
                      </p>
                      {expStatus === "expired" && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
                          <AlertTriangle className="w-3 h-3" /> Expired
                        </span>
                      )}
                      {expStatus === "expiring" && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                          <AlertTriangle className="w-3 h-3" /> Expiring Soon
                        </span>
                      )}
                      {expStatus === "valid" && cert.expiry_date && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Valid
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Leave Balances */}
        {leaveBalances.length > 0 && (
          <Section title="Leave Balances" icon={Calendar}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {leaveBalances.map((bal) => (
                <div
                  key={bal.leave_type}
                  className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 text-center"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mb-1">
                    {bal.leave_type.replace("_", " ")} Leave
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{bal.remaining}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {bal.used} used / {bal.entitled} entitled
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Recent Shifts */}
        <Section title="Recent Shifts" icon={Clock}>
          {recentShifts.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">No shifts recorded yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Date</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Site</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Time</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Hrs</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                  {recentShifts.map((s: any) => (
                    <tr key={s.assignment_id ?? s.shift_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                      <td className="px-2 py-2.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {fmtDate(s.start_time)}
                      </td>
                      <td className="px-2 py-2.5 text-slate-600 dark:text-slate-400">
                        {s.site_name ?? "—"}
                      </td>
                      <td className="px-2 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {fmtTime(s.start_time)} – {fmtTime(s.end_time)}
                      </td>
                      <td className="px-2 py-2.5 text-slate-600 dark:text-slate-400">
                        {s.total_hours ? `${s.total_hours.toFixed(1)}h` : "—"}
                      </td>
                      <td className="px-2 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            s.checked_in && s.checked_out
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : s.checked_in
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                          }`}
                        >
                          {s.checked_in && s.checked_out
                            ? "Completed"
                            : s.checked_in
                            ? "On Duty"
                            : (s.status ?? "scheduled")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </DashboardLayout>
  );
}
