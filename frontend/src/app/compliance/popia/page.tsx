"use client";

import { useState, useEffect, useCallback } from "react";
import { popiaApi, employeesApi } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  Shield,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Users,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONSENT_TYPES = ["employment", "biometric", "marketing", "cctv", "gps_tracking"];
const CONSENT_LABELS: Record<string, string> = {
  employment: "Employment",
  biometric: "Biometric",
  marketing: "Marketing",
  cctv: "CCTV",
  gps_tracking: "GPS Tracking",
};

const LAWFUL_BASES = ["consent", "contract", "legal_obligation", "legitimate_interest"];
const LAWFUL_LABELS: Record<string, string> = {
  consent: "Consent",
  contract: "Contract",
  legal_obligation: "Legal Obligation",
  legitimate_interest: "Legitimate Interest",
};

const REQUEST_TYPES = ["access", "rectification", "erasure", "portability", "objection"];
const REQUEST_LABELS: Record<string, string> = {
  access: "Access",
  rectification: "Rectification",
  erasure: "Erasure",
  portability: "Portability",
  objection: "Objection",
};

const REQUEST_STATUSES = ["received", "processing", "completed", "denied"];
const STATUS_CONF: Record<string, { label: string; classes: string }> = {
  received: { label: "Received", classes: "bg-blue-100 text-blue-800" },
  processing: { label: "Processing", classes: "bg-amber-100 text-amber-800" },
  completed: { label: "Completed", classes: "bg-green-100 text-green-800" },
  denied: { label: "Denied", classes: "bg-red-100 text-red-800" },
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-ZA", { dateStyle: "medium" });
}

// ---------------------------------------------------------------------------
// Dashboard Card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  accent = "text-blue-600",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <Icon className={`w-8 h-8 ${accent} opacity-70`} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Request Modal
// ---------------------------------------------------------------------------

function CreateRequestModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reqType, setReqType] = useState("access");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !description.trim()) return;
    setSaving(true);
    try {
      await popiaApi.createRequest({
        requestor_name: name,
        requestor_email: email,
        request_type: reqType,
        description,
      });
      onCreated();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">New Data Subject Request</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Requestor Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Requestor Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Request Type</label>
            <select
              value={reqType}
              onChange={(e) => setReqType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            >
              {REQUEST_TYPES.map((t) => (
                <option key={t} value={t}>
                  {REQUEST_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the data subject request..."
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !name.trim() || !email.trim() || !description.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {saving ? "Saving..." : "Create Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Record Consent Modal
// ---------------------------------------------------------------------------

function RecordConsentModal({
  employees,
  onClose,
  onCreated,
}: {
  employees: any[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.employee_id || 0);
  const [consentType, setConsentType] = useState("employment");
  const [purpose, setPurpose] = useState("");
  const [lawfulBasis, setLawfulBasis] = useState("consent");
  const [dataCategories, setDataCategories] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!purpose.trim()) return;
    setSaving(true);
    try {
      await popiaApi.recordConsent({
        employee_id: employeeId,
        consent_type: consentType,
        purpose,
        lawful_basis: lawfulBasis,
        data_categories: dataCategories || null,
      });
      onCreated();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Record Consent</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Employee</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            >
              {employees.map((emp: any) => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Consent Type</label>
            <select
              value={consentType}
              onChange={(e) => setConsentType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            >
              {CONSENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CONSENT_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Purpose</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Purpose of data processing..."
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Lawful Basis</label>
            <select
              value={lawfulBasis}
              onChange={(e) => setLawfulBasis(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            >
              {LAWFUL_BASES.map((b) => (
                <option key={b} value={b}>
                  {LAWFUL_LABELS[b]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Data Categories (optional)</label>
            <input
              type="text"
              value={dataCategories}
              onChange={(e) => setDataCategories(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. personal, biometric, financial"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !purpose.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {saving ? "Saving..." : "Record Consent"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function POPIACompliancePage() {
  const [tab, setTab] = useState<"consents" | "requests">("consents");
  const [dashboard, setDashboard] = useState<any>(null);
  const [consents, setConsents] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [filterConsentType, setFilterConsentType] = useState("");
  const [filterRequestStatus, setFilterRequestStatus] = useState("");

  const fetchDashboard = useCallback(async () => {
    try {
      const { data } = await popiaApi.getDashboard();
      setDashboard(data);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchConsents = useCallback(async () => {
    try {
      const params: any = {};
      if (filterConsentType) params.consent_type = filterConsentType;
      const { data } = await popiaApi.listConsents(params);
      setConsents(Array.isArray(data) ? data : data.items || []);
    } catch {
      /* ignore */
    }
  }, [filterConsentType]);

  const fetchRequests = useCallback(async () => {
    try {
      const params: any = {};
      if (filterRequestStatus) params.status_filter = filterRequestStatus;
      const { data } = await popiaApi.listRequests(params);
      setRequests(Array.isArray(data) ? data : data.items || []);
    } catch {
      /* ignore */
    }
  }, [filterRequestStatus]);

  const fetchEmployees = useCallback(async () => {
    try {
      const { data } = await employeesApi.getAll({ status: "active", limit: 500 });
      setEmployees(data.items || data || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDashboard(), fetchConsents(), fetchRequests(), fetchEmployees()]).finally(
      () => setLoading(false)
    );
  }, [fetchDashboard, fetchConsents, fetchRequests, fetchEmployees]);

  const handleWithdraw = async (consentId: number) => {
    if (!confirm("Withdraw this consent? This action cannot be undone.")) return;
    try {
      await popiaApi.withdrawConsent(consentId);
      fetchConsents();
      fetchDashboard();
    } catch {
      /* ignore */
    }
  };

  const handleUpdateRequestStatus = async (requestId: number, newStatus: string) => {
    try {
      await popiaApi.updateRequest(requestId, { status: newStatus });
      fetchRequests();
      fetchDashboard();
    } catch {
      /* ignore */
    }
  };

  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <DashboardLayout>
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="POPIA Compliance"
        subtitle="Protection of Personal Information Act -- consent management and data subject requests"
        icon={<Shield className="w-7 h-7 text-blue-600" />}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setShowConsentModal(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> Record Consent
            </button>
            <button
              onClick={() => setShowRequestModal(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FileText className="w-4 h-4" /> New Request
            </button>
          </div>
        }
      />

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total Consents" value={dashboard.total_consents} icon={Users} accent="text-blue-600" />
          <StatCard label="Active" value={dashboard.active_consents} icon={CheckCircle} accent="text-green-600" />
          <StatCard label="Withdrawn" value={dashboard.withdrawn_consents} icon={XCircle} accent="text-gray-400" />
          <StatCard label="Total Requests" value={dashboard.total_requests} icon={FileText} accent="text-purple-600" />
          <StatCard label="Pending" value={dashboard.pending_requests} icon={Clock} accent="text-amber-600" />
          <StatCard
            label="Overdue"
            value={dashboard.overdue_requests}
            icon={AlertTriangle}
            accent={dashboard.overdue_requests > 0 ? "text-red-600" : "text-gray-400"}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab("consents")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "consents"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          Consent Management
        </button>
        <button
          onClick={() => setTab("requests")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "requests"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          Data Subject Requests
        </button>
      </div>

      {/* Consent Tab */}
      {tab === "consents" && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">Type:</label>
            <select
              value={filterConsentType}
              onChange={(e) => setFilterConsentType(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All</option>
              {CONSENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CONSENT_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Purpose</th>
                  <th className="px-4 py-3">Lawful Basis</th>
                  <th className="px-4 py-3">Granted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {consents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No consent records found.
                    </td>
                  </tr>
                ) : (
                  consents.map((c: any) => (
                    <tr key={c.consent_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {c.employee_name || `Employee #${c.employee_id}`}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {CONSENT_LABELS[c.consent_type] || c.consent_type}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                        {c.purpose}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {LAWFUL_LABELS[c.lawful_basis] || c.lawful_basis}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(c.granted_at)}</td>
                      <td className="px-4 py-3">
                        {c.is_active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                            <XCircle className="w-3 h-3" /> Withdrawn
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.is_active ? (
                          <button
                            onClick={() => handleWithdraw(c.consent_id)}
                            className="rounded-lg px-3 py-1 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50"
                          >
                            Withdraw
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {fmtDate(c.withdrawn_at)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Requests Tab */}
      {tab === "requests" && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">Status:</label>
            <select
              value={filterRequestStatus}
              onChange={(e) => setFilterRequestStatus(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All</option>
              {REQUEST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_CONF[s]?.label || s}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Requestor</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No data subject requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((r: any) => {
                    const conf = STATUS_CONF[r.status] || {
                      label: r.status,
                      classes: "bg-gray-100 text-gray-700",
                    };
                    const isOverdue =
                      r.due_date &&
                      !["completed", "denied"].includes(r.status) &&
                      new Date(r.due_date) < new Date();

                    return (
                      <tr key={r.request_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900 font-medium">{r.requestor_name}</td>
                        <td className="px-4 py-3 text-gray-600">{r.requestor_email}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {REQUEST_LABELS[r.request_type] || r.request_type}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                          {r.description}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${conf.classes}`}
                          >
                            {conf.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={isOverdue ? "text-red-600 font-medium" : "text-gray-500"}>
                            {fmtDate(r.due_date)}
                            {isOverdue && " (overdue)"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{fmtDate(r.created_at)}</td>
                        <td className="px-4 py-3">
                          {!["completed", "denied"].includes(r.status) ? (
                            <select
                              value={r.status}
                              onChange={(e) =>
                                handleUpdateRequestStatus(r.request_id, e.target.value)
                              }
                              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                            >
                              {REQUEST_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {STATUS_CONF[s]?.label || s}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-gray-400">
                              {r.completed_at ? fmtDate(r.completed_at) : "\u2014"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showConsentModal && (
        <RecordConsentModal
          employees={employees}
          onClose={() => setShowConsentModal(false)}
          onCreated={() => {
            setShowConsentModal(false);
            fetchConsents();
            fetchDashboard();
          }}
        />
      )}

      {showRequestModal && (
        <CreateRequestModal
          onClose={() => setShowRequestModal(false)}
          onCreated={() => {
            setShowRequestModal(false);
            fetchRequests();
            fetchDashboard();
          }}
        />
      )}
    </div>
    </DashboardLayout>
  );
}
