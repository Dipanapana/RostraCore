"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { invoiceApi, clientsApi } from "@/services/api";
import { useToast } from "@/context/ToastContext";
import {
  Plus,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  FileText,
  DollarSign,
  AlertTriangle,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Invoice {
  id: number;
  invoice_number: string;
  client_id: number;
  client_name?: string;
  invoice_date: string;
  due_date: string;
  period_start: string;
  period_end: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  status: string;
  payment_reference?: string;
  notes?: string;
}

interface InvoiceSummary {
  total_outstanding: number;
  total_overdue: number;
  total_paid_this_month: number;
  draft_count: number;
  sent_count: number;
  overdue_count: number;
  paid_count: number;
}

interface Client {
  client_id: number;
  name: string;
}

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  { color: string; label: string }
> = {
  draft: {
    color: "bg-gray-100 text-gray-800",

    label: "Draft",
  },
  sent: {
    color: "bg-blue-100 text-blue-800",

    label: "Sent",
  },
  paid: {
    color: "bg-emerald-50 text-emerald-700",

    label: "Paid",
  },
  overdue: {
    color: "bg-red-50 text-red-700",

    label: "Overdue",
  },
  cancelled: {
    color: "bg-gray-200 text-gray-600",

    label: "Cancelled",
  },
};

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status.toLowerCase()] ?? {
      color: "bg-gray-100 text-gray-800",
  
      label: status,
    }
  );
}

function formatCurrency(amount: number) {
  return `R ${(amount ?? 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InvoicesPage() {
  const router = useRouter();
  const toast = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [filterClient, setFilterClient] = useState<number | "">("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Mark paid modal
  const [markPaidInvoice, setMarkPaidInvoice] = useState<Invoice | null>(null);
  const [paymentRef, setPaymentRef] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchInvoices = useCallback(async () => {
    try {
      const params: any = { skip: page * pageSize, limit: pageSize };
      if (filterClient) params.client_id = filterClient;
      if (filterStatus) params.status = filterStatus;
      const response = await invoiceApi.list(params);
      setInvoices(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to fetch invoices");
    }
  }, [page, filterClient, filterStatus]);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await invoiceApi.getSummary();
      setSummary(response.data);
    } catch (err: any) {
      // Summary is non-critical, just log
      console.error("Failed to fetch invoice summary:", err);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const response = await clientsApi.getAll();
      setClients(response.data);
    } catch (err: any) {
      console.error("Failed to fetch clients:", err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchInvoices(), fetchSummary(), fetchClients()]);
      setLoading(false);
    };
    loadData();
  }, [fetchInvoices, fetchSummary, fetchClients]);

  // Re-fetch invoices when filters change
  useEffect(() => {
    setPage(0);
  }, [filterClient, filterStatus]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const handleDownloadPdf = async (invoice: Invoice) => {
    setActionLoading(invoice.id);
    try {
      const response = await invoiceApi.downloadPdf(invoice.id);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice_${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("PDF Downloaded", `Invoice ${invoice.invoice_number} downloaded`);
    } catch (err: any) {
      toast.error("Download Failed", err.response?.data?.detail || "Failed to download PDF");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async () => {
    if (!markPaidInvoice) return;

    setActionLoading(markPaidInvoice.id);
    try {
      await invoiceApi.updateStatus(markPaidInvoice.id, "paid", paymentRef || undefined);
      toast.success("Invoice Paid", `Invoice ${markPaidInvoice.invoice_number} marked as paid`);
      setMarkPaidInvoice(null);
      setPaymentRef("");
      await fetchInvoices();
      await fetchSummary();
    } catch (err: any) {
      toast.error("Update Failed", err.response?.data?.detail || "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoice.invoice_number}?`)) return;

    setActionLoading(invoice.id);
    try {
      await invoiceApi.delete(invoice.id);
      toast.success("Invoice Deleted", `Invoice ${invoice.invoice_number} has been deleted`);
      await fetchInvoices();
      await fetchSummary();
    } catch (err: any) {
      toast.error("Delete Failed", err.response?.data?.detail || "Failed to delete invoice");
    } finally {
      setActionLoading(null);
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              Loading invoices...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Invoice Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Generate, track, and manage client invoices
            </p>
          </div>
          <button
            onClick={() => router.push("/billing/invoices/new")}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Generate Invoice
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-800 font-bold text-lg leading-none"
            >
              x
            </button>
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Outstanding
                  </p>
                  <p className="mt-1 text-xl font-bold text-blue-600">
                    {formatCurrency(summary.total_outstanding)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {summary.sent_count + summary.overdue_count} invoice{summary.sent_count + summary.overdue_count !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Overdue Amount
                  </p>
                  <p className="mt-1 text-xl font-bold text-red-600">
                    {formatCurrency(summary.total_overdue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {summary.overdue_count} invoice{summary.overdue_count !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid This Month
                  </p>
                  <p className="mt-1 text-xl font-bold text-green-600">
                    {formatCurrency(summary.total_paid_this_month)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {summary.paid_count} invoice{summary.paid_count !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-full">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-gray-400">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Drafts
                  </p>
                  <p className="mt-1 text-xl font-bold text-gray-700">
                    {summary.draft_count}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Awaiting review
                  </p>
                </div>
                <div className="p-3 bg-gray-100 rounded-full">
                  <Clock className="w-5 h-5 text-gray-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 text-gray-500">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters</span>
            </div>

            <select
              value={filterClient}
              onChange={(e) =>
                setFilterClient(e.target.value ? Number(e.target.value) : "")
              }
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client.client_id} value={client.client_id}>
                  {client.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {(filterClient || filterStatus) && (
              <button
                onClick={() => {
                  setFilterClient("");
                  setFilterStatus("");
                }}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Clear filters
              </button>
            )}

            <div className="sm:ml-auto text-sm text-gray-500">
              Showing {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg font-medium">No invoices found</p>
                      <p className="mt-1 text-sm">
                        {filterClient || filterStatus
                          ? "Try adjusting your filters"
                          : 'Click "Generate Invoice" to create your first invoice'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => {
                    const cfg = getStatusConfig(invoice.status);
                    const isActionLoading = actionLoading === invoice.id;
                    return (
                      <tr
                        key={invoice.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {invoice.invoice_number}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {invoice.client_name || `Client #${invoice.client_id}`}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(invoice.invoice_date)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Due: {formatDate(invoice.due_date)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(invoice.period_start)}
                          </div>
                          <div className="text-xs text-gray-500">
                            to {formatDate(invoice.period_end)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(invoice.total_amount)}
                          </div>
                          <div className="text-xs text-gray-500">
                            incl. VAT
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${cfg.color}`}
                          >
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() =>
                                router.push(`/billing/invoices/${invoice.id}`)
                              }
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                              title="View invoice"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(invoice)}
                              disabled={isActionLoading}
                              className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {(invoice.status === "sent" ||
                              invoice.status === "overdue") && (
                              <button
                                onClick={() => setMarkPaidInvoice(invoice)}
                                disabled={isActionLoading}
                                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                                title="Mark as paid"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {invoice.status === "draft" && (
                              <button
                                onClick={() => handleDelete(invoice)}
                                disabled={isActionLoading}
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                title="Delete draft"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {invoices.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page + 1}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={invoices.length < pageSize}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mark Paid Modal */}
      {markPaidInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Mark Invoice as Paid
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Invoice {markPaidInvoice.invoice_number} -{" "}
              {formatCurrency(markPaidInvoice.total_amount)}
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Reference (optional)
              </label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="e.g., EFT-2026-001, CHQ-12345"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMarkPaidInvoice(null);
                  setPaymentRef("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkPaid}
                disabled={actionLoading === markPaidInvoice.id}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                {actionLoading === markPaidInvoice.id
                  ? "Processing..."
                  : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
