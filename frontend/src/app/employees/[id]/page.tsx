"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { employeesApi, certificationsApi, api, clientsApi, guardRestrictionsApi, employeeEvaluationsApi, employeeDisciplinaryApi } from "@/services/api";
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
  Ban,
  Trash2,
  Plus,
  Star,
  FileWarning,
} from "lucide-react";
import { format, parseISO, isPast, addDays } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GuardRestriction {
  restriction_id: number;
  employee_id: number;
  employee_name: string;
  client_id: number | null;
  client_name: string | null;
  site_id: number | null;
  site_name: string | null;
  reason: string | null;
  created_at: string;
}

interface ClientOption {
  client_id: number;
  client_name: string;
}

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

interface EmployeeEvaluation {
  evaluation_id: number;
  evaluation_date: string;
  evaluator_name: string | null;
  overall_score: number;
  punctuality_score: number | null;
  conduct_score: number | null;
  performance_score: number | null;
  appearance_score: number | null;
  communication_score: number | null;
  notes: string | null;
  created_at: string;
}

interface DisciplinaryCase {
  case_id: number;
  incident_date: string;
  case_type: string;
  reason: string;
  outcome: string | null;
  issued_by_name: string | null;
  created_at: string;
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
  const [restrictions, setRestrictions] = useState<GuardRestriction[]>([]);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [evaluations, setEvaluations] = useState<EmployeeEvaluation[]>([]);
  const [disciplinaryCases, setDisciplinaryCases] = useState<DisciplinaryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Restriction form state
  const [restrictClientId, setRestrictClientId] = useState<string>('');
  const [restrictReason, setRestrictReason] = useState<string>('');
  const [restrictAdding, setRestrictAdding] = useState(false);

  // Evaluation form state
  const [evalDate, setEvalDate] = useState('');
  const [evalOverall, setEvalOverall] = useState('3');
  const [evalPunctuality, setEvalPunctuality] = useState('');
  const [evalConduct, setEvalConduct] = useState('');
  const [evalPerformance, setEvalPerformance] = useState('');
  const [evalAppearance, setEvalAppearance] = useState('');
  const [evalCommunication, setEvalCommunication] = useState('');
  const [evalNotes, setEvalNotes] = useState('');
  const [evalSaving, setEvalSaving] = useState(false);
  const [showEvalForm, setShowEvalForm] = useState(false);

  // Disciplinary form state
  const [discDate, setDiscDate] = useState('');
  const [discType, setDiscType] = useState('verbal_warning');
  const [discReason, setDiscReason] = useState('');
  const [discOutcome, setDiscOutcome] = useState('');
  const [discSaving, setDiscSaving] = useState(false);
  const [showDiscForm, setShowDiscForm] = useState(false);

  useEffect(() => {
    if (!employeeId) return;

    async function load() {
      try {
        const [empRes, certRes, leaveRes, shiftsRes, restrictRes, clientsRes, evalRes, discRes] = await Promise.allSettled([
          employeesApi.getById(employeeId),
          certificationsApi.getAll({ employee_id: employeeId }),
          api.get(`/api/v1/leave/balances/${employeeId}`),
          api.get(`/api/v1/employees/${employeeId}/shifts`, { params: { limit: 10 } }),
          guardRestrictionsApi.list({ employee_id: employeeId }),
          clientsApi.getAll(),
          employeeEvaluationsApi.list(employeeId),
          employeeDisciplinaryApi.list(employeeId),
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
          setRecentShifts(
            [...shifts].sort(
              (a: any, b: any) =>
                new Date(b.start_time ?? 0).getTime() - new Date(a.start_time ?? 0).getTime()
            ).slice(0, 10)
          );
        }

        if (restrictRes.status === "fulfilled") {
          setRestrictions(restrictRes.value.data ?? []);
        }

        if (clientsRes.status === "fulfilled") {
          const data = clientsRes.value.data;
          setClientOptions(Array.isArray(data) ? data : data?.clients ?? []);
        }

        if (evalRes.status === "fulfilled") {
          setEvaluations(evalRes.value.data ?? []);
        }

        if (discRes.status === "fulfilled") {
          setDisciplinaryCases(discRes.value.data ?? []);
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

  const handleAddRestriction = async () => {
    if (!restrictClientId) return;
    setRestrictAdding(true);
    try {
      const res = await guardRestrictionsApi.create({
        employee_id: employeeId,
        client_id: Number(restrictClientId),
        reason: restrictReason.trim() || undefined,
      });
      setRestrictions((prev) => [res.data, ...prev]);
      setRestrictClientId('');
      setRestrictReason('');
    } catch {
      // Silently fail — duplicate restrictions return 409
    } finally {
      setRestrictAdding(false);
    }
  };

  const handleRemoveRestriction = async (restrictionId: number) => {
    setRestrictions((prev) => prev.filter((r) => r.restriction_id !== restrictionId));
    try {
      await guardRestrictionsApi.remove(restrictionId);
    } catch {
      // Reload on error
      const res = await guardRestrictionsApi.list({ employee_id: employeeId });
      setRestrictions(res.data ?? []);
    }
  };

  const handleAddEvaluation = async () => {
    if (!evalDate || !evalOverall) return;
    setEvalSaving(true);
    try {
      const res = await employeeEvaluationsApi.create(employeeId, {
        evaluation_date: evalDate,
        overall_score: Number(evalOverall),
        punctuality_score: evalPunctuality ? Number(evalPunctuality) : null,
        conduct_score: evalConduct ? Number(evalConduct) : null,
        performance_score: evalPerformance ? Number(evalPerformance) : null,
        appearance_score: evalAppearance ? Number(evalAppearance) : null,
        communication_score: evalCommunication ? Number(evalCommunication) : null,
        notes: evalNotes.trim() || undefined,
      });
      setEvaluations((prev) => [res.data, ...prev]);
      setEvalDate(''); setEvalOverall('3'); setEvalPunctuality(''); setEvalConduct('');
      setEvalPerformance(''); setEvalAppearance(''); setEvalCommunication(''); setEvalNotes('');
      setShowEvalForm(false);
    } catch { /* ignore */ } finally {
      setEvalSaving(false);
    }
  };

  const handleDeleteEvaluation = async (evaluationId: number) => {
    setEvaluations((prev) => prev.filter((e) => e.evaluation_id !== evaluationId));
    try {
      await employeeEvaluationsApi.remove(employeeId, evaluationId);
    } catch {
      const res = await employeeEvaluationsApi.list(employeeId);
      setEvaluations(res.data ?? []);
    }
  };

  const handleAddDisciplinary = async () => {
    if (!discDate || !discReason.trim()) return;
    setDiscSaving(true);
    try {
      const res = await employeeDisciplinaryApi.create(employeeId, {
        incident_date: discDate,
        case_type: discType,
        reason: discReason.trim(),
        outcome: discOutcome.trim() || undefined,
      });
      setDisciplinaryCases((prev) => [res.data, ...prev]);
      setDiscDate(''); setDiscReason(''); setDiscOutcome(''); setDiscType('verbal_warning');
      setShowDiscForm(false);
    } catch { /* ignore */ } finally {
      setDiscSaving(false);
    }
  };

  const handleDeleteDisciplinary = async (caseId: number) => {
    setDisciplinaryCases((prev) => prev.filter((c) => c.case_id !== caseId));
    try {
      await employeeDisciplinaryApi.remove(employeeId, caseId);
    } catch {
      const res = await employeeDisciplinaryApi.list(employeeId);
      setDisciplinaryCases(res.data ?? []);
    }
  };

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

        {/* Site & Client Restrictions */}
        <Section title="Client Restrictions" icon={Ban}>
          {/* Add restriction form */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
            <select
              value={restrictClientId}
              onChange={(e) => setRestrictClientId(e.target.value)}
              className="flex-1 text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <option value="">Select client to restrict…</option>
              {clientOptions.map((c) => (
                <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Reason (optional)"
              value={restrictReason}
              onChange={(e) => setRestrictReason(e.target.value)}
              className="flex-1 text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <button
              onClick={handleAddRestriction}
              disabled={!restrictClientId || restrictAdding}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {restrictAdding ? 'Adding…' : 'Add'}
            </button>
          </div>

          {restrictions.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">No client restrictions — guard can be assigned anywhere.</p>
          ) : (
            <div className="space-y-2">
              {restrictions.map((r) => (
                <div
                  key={r.restriction_id}
                  className="flex items-center justify-between px-3 py-2.5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Ban className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {r.client_name ?? r.site_name ?? `ID ${r.client_id ?? r.site_id}`}
                      </p>
                      {r.reason && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{r.reason}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveRestriction(r.restriction_id)}
                    className="ml-3 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                    title="Remove restriction"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Performance Evaluations */}
        <Section title="Performance Evaluations" icon={Star}>
          {/* Toggle form */}
          <div className="mb-4">
            <button
              onClick={() => setShowEvalForm((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {showEvalForm ? "Cancel" : "Add Evaluation"}
            </button>
          </div>

          {showEvalForm && (
            <div className="mb-5 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Date *</label>
                  <input
                    type="date"
                    value={evalDate}
                    onChange={(e) => setEvalDate(e.target.value)}
                    className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Overall Score (1–5) *</label>
                  <select
                    value={evalOverall}
                    onChange={(e) => setEvalOverall(e.target.value)}
                    className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {["","Poor","Below Average","Average","Good","Excellent"][n]}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  ["Punctuality", evalPunctuality, setEvalPunctuality],
                  ["Conduct", evalConduct, setEvalConduct],
                  ["Performance", evalPerformance, setEvalPerformance],
                  ["Appearance", evalAppearance, setEvalAppearance],
                  ["Communication", evalCommunication, setEvalCommunication],
                ].map(([label, val, setter]: any) => (
                  <div key={label as string}>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label as string}</label>
                    <select
                      value={val as string}
                      onChange={(e) => setter(e.target.value)}
                      className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      <option value="">—</option>
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Notes</label>
                <textarea
                  value={evalNotes}
                  onChange={(e) => setEvalNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes…"
                  className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
              </div>
              <button
                onClick={handleAddEvaluation}
                disabled={!evalDate || evalSaving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {evalSaving ? "Saving…" : "Save Evaluation"}
              </button>
            </div>
          )}

          {evaluations.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">No evaluations recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {evaluations.map((ev) => (
                <div key={ev.evaluation_id} className="flex items-start justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{fmtDate(ev.evaluation_date)}</span>
                      {/* Star score */}
                      <span className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} className={`w-3.5 h-3.5 ${n <= ev.overall_score ? "text-amber-400 fill-amber-400" : "text-slate-300 dark:text-slate-600"}`} />
                        ))}
                        <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">{ev.overall_score}/5</span>
                      </span>
                      {ev.evaluator_name && (
                        <span className="text-xs text-slate-400">by {ev.evaluator_name}</span>
                      )}
                    </div>
                    {/* Category scores */}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                      {[
                        ["Punct.", ev.punctuality_score],
                        ["Conduct", ev.conduct_score],
                        ["Perf.", ev.performance_score],
                        ["Appear.", ev.appearance_score],
                        ["Comm.", ev.communication_score],
                      ].filter(([, v]) => v != null).map(([lbl, v]) => (
                        <span key={lbl as string} className="text-xs text-slate-500 dark:text-slate-400">
                          {lbl}: <span className="font-medium text-slate-700 dark:text-slate-300">{String(v)}</span>
                        </span>
                      ))}
                    </div>
                    {ev.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">{ev.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteEvaluation(ev.evaluation_id)}
                    className="ml-3 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                    title="Delete evaluation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Disciplinary Cases */}
        <Section title="Disciplinary Record" icon={FileWarning}>
          {/* Toggle form */}
          <div className="mb-4">
            <button
              onClick={() => setShowDiscForm((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {showDiscForm ? "Cancel" : "Add Case"}
            </button>
          </div>

          {showDiscForm && (
            <div className="mb-5 p-4 bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Incident Date *</label>
                  <input
                    type="date"
                    value={discDate}
                    onChange={(e) => setDiscDate(e.target.value)}
                    className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Case Type *</label>
                  <select
                    value={discType}
                    onChange={(e) => setDiscType(e.target.value)}
                    className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    <option value="verbal_warning">Verbal Warning</option>
                    <option value="written_warning">Written Warning</option>
                    <option value="final_warning">Final Warning</option>
                    <option value="suspension">Suspension</option>
                    <option value="dismissal">Dismissal</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Reason *</label>
                <textarea
                  value={discReason}
                  onChange={(e) => setDiscReason(e.target.value)}
                  rows={2}
                  placeholder="Describe the reason for this disciplinary action…"
                  className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Outcome</label>
                <input
                  type="text"
                  value={discOutcome}
                  onChange={(e) => setDiscOutcome(e.target.value)}
                  placeholder="e.g. 3-day suspension, final warning issued (optional)"
                  className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <button
                onClick={handleAddDisciplinary}
                disabled={!discDate || !discReason.trim() || discSaving}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {discSaving ? "Saving…" : "Save Case"}
              </button>
            </div>
          )}

          {disciplinaryCases.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">No disciplinary cases on record.</p>
          ) : (
            <div className="space-y-3">
              {disciplinaryCases.map((dc) => {
                const badgeColor: Record<string, string> = {
                  verbal_warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                  written_warning: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                  final_warning: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                  suspension: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                  dismissal: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300",
                };
                return (
                  <div key={dc.case_id} className="flex items-start justify-between px-4 py-3 bg-red-50/40 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{fmtDate(dc.incident_date)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeColor[dc.case_type] ?? "bg-slate-100 text-slate-600"}`}>
                          {dc.case_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                        {dc.issued_by_name && (
                          <span className="text-xs text-slate-400">by {dc.issued_by_name}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{dc.reason}</p>
                      {dc.outcome && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Outcome: {dc.outcome}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteDisciplinary(dc.case_id)}
                      className="ml-3 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                      title="Delete case"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

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
