"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { invoiceApi } from "@/services/api";
import { useToast } from "@/context/ToastContext";
import {
  ArrowLeft,
  Download,
  Send,
  CheckCircle,
  XCircle,
  FileText,
  Printer,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LineItem {
  id: number;
  description: string;
  hours: number;
  shifts: number;
  rate: number;
  amount: number;
}

interface InvoiceDetail {
  id: number;
  invoice_number: string;
  client_id: number;
  client_name?: string;
  client_email?: string;
  client_address?: string;
  client_phone?: string;
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_vat_number?: string;
  invoice_date: string;
  due_date: string;
  period_start: string;
  period_end: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  status: string;
  payment_reference?: string;
  payment_date?: string;
  notes?: string;
  payment_terms?: string;
  purchase_order_number?: string;
  line_items: LineItem[];
}

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  { color: string; darkColor: string; label: string; bgAccent: string }
> = {
  draft: {
    color: "bg-gray-100 text-gray-800",
    darkColor: "dark:bg-gray-700 dark:text-gray-300",
    label: "Draft",
    bgAccent: "border-gray-400",
  },
  sent: {
    color: "bg-blue-100 text-blue-800",
    darkColor: "dark:bg-blue-900/30 dark:text-blue-400",
    label: "Sent",
    bgAccent: "border-blue-500",
  },
  paid: {
    color: "bg-green-100 text-green-800",
    darkColor: "dark:bg-green-900/30 dark:text-green-400",
    label: "Paid",
    bgAccent: "border-green-500",
  },
  overdue: {
    color: "bg-red-100 text-red-800",
    darkColor: "dark:bg-red-900/30 dark:text-red-400",
    label: "Overdue",
    bgAccent: "border-red-500",
  },
  cancelled: {
    color: "bg-gray-200 text-gray-600",
    darkColor: "dark:bg-gray-600 dark:text-gray-400",
    label: "Cancelled",
    bgAccent: "border-gray-500",
  },
};

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status.toLowerCase()] ?? {
      color: "bg-gray-100 text-gray-800",
      darkColor: "dark:bg-gray-700 dark:text-gray-300",
      label: status,
      bgAccent: "border-gray-400",
    }
  );
}

function formatCurrency(amount: number) {
  return `R ${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Workflow steps for the status indicator
const WORKFLOW_STEPS = [
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "paid", label: "Paid" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const invoiceId = Number(params.id);

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Mark paid modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true);
      const response = await invoiceApi.get(invoiceId);
      setInvoice(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to fetch invoice");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (invoiceId) fetchInvoice();
  }, [invoiceId, fetchInvoice]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setActionLoading(true);
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
      toast.success("PDF Downloaded");
    } catch (err: any) {
      toast.error("Download Failed", err.response?.data?.detail || "Failed to download PDF");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      await invoiceApi.updateStatus(invoice.id, "sent");
      toast.success("Invoice Sent", `Invoice ${invoice.invoice_number} marked as sent`);
      await fetchInvoice();
    } catch (err: any) {
      toast.error("Send Failed", err.response?.data?.detail || "Failed to send invoice");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      await invoiceApi.updateStatus(invoice.id, "paid", paymentRef || undefined);
      toast.success("Payment Recorded", `Invoice ${invoice.invoice_number} marked as paid`);
      setShowPayModal(false);
      setPaymentRef("");
      await fetchInvoice();
    } catch (err: any) {
      toast.error("Update Failed", err.response?.data?.detail || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!invoice) return;
    if (!confirm(`Are you sure you want to cancel invoice ${invoice.invoice_number}? This action cannot be undone.`)) return;

    setActionLoading(true);
    try {
      await invoiceApi.updateStatus(invoice.id, "cancelled");
      toast.success("Invoice Cancelled", `Invoice ${invoice.invoice_number} has been cancelled`);
      await fetchInvoice();
    } catch (err: any) {
      toast.error("Cancel Failed", err.response?.data?.detail || "Failed to cancel invoice");
    } finally {
      setActionLoading(false);
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              Loading invoice...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Invoice Not Found
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              {error || "The requested invoice could not be found."}
            </p>
            <button
              onClick={() => router.push("/billing/invoices")}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Back to Invoices
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const cfg = getStatusConfig(invoice.status);
  const currentStepIndex = WORKFLOW_STEPS.findIndex(
    (s) => s.key === invoice.status
  );
  const isCancelled = invoice.status === "cancelled";

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Back button + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <button
            onClick={() => router.push("/billing/invoices")}
            className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Invoices
          </button>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleDownloadPdf}
              disabled={actionLoading}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 flex items-center gap-2 text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>

            {invoice.status === "draft" && (
              <button
                onClick={handleSendInvoice}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm transition-colors"
              >
                <Send className="w-4 h-4" />
                Send to Client
              </button>
            )}

            {(invoice.status === "sent" || invoice.status === "overdue") && (
              <button
                onClick={() => setShowPayModal(true)}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Mark as Paid
              </button>
            )}

            {invoice.status !== "paid" && invoice.status !== "cancelled" && (
              <button
                onClick={handleCancelInvoice}
                disabled={actionLoading}
                className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 flex items-center gap-2 text-sm transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Void / Cancel
              </button>
            )}
          </div>
        </div>

        {/* Status Workflow Indicator */}
        {!isCancelled && (
          <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-4">
            <div className="flex items-center justify-between">
              {WORKFLOW_STEPS.map((step, index) => {
                const isCompleted = currentStepIndex > index;
                const isCurrent = currentStepIndex === index;
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isCompleted
                            ? "bg-green-500 text-white"
                            : isCurrent
                              ? "bg-purple-600 text-white"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          isCurrent
                            ? "text-purple-600 dark:text-purple-400"
                            : isCompleted
                              ? "text-green-600 dark:text-green-400"
                              : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < WORKFLOW_STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-4 ${
                          isCompleted
                            ? "bg-green-500"
                            : "bg-slate-200 dark:bg-slate-700"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cancelled Banner */}
        {isCancelled && (
          <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 px-4 py-3 rounded-lg flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">This invoice has been cancelled.</span>
          </div>
        )}

        {/* Invoice Preview Card */}
        <div className={`bg-white dark:bg-slate-800 shadow rounded-2xl overflow-hidden border-t-4 ${cfg.bgAccent}`}>
          {/* Invoice Header */}
          <div className="p-6 sm:p-8 border-b border-slate-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
              {/* Company Info */}
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {invoice.company_name || "Your Company"}
                </h2>
                {invoice.company_address && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 whitespace-pre-line">
                    {invoice.company_address}
                  </p>
                )}
                {invoice.company_phone && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {invoice.company_phone}
                  </p>
                )}
                {invoice.company_email && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {invoice.company_email}
                  </p>
                )}
                {invoice.company_vat_number && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    VAT: {invoice.company_vat_number}
                  </p>
                )}
              </div>

              {/* Invoice Meta */}
              <div className="text-right">
                <div className="flex items-center gap-3 justify-end mb-2">
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    INVOICE
                  </h3>
                  <span
                    className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${cfg.color} ${cfg.darkColor}`}
                  >
                    {cfg.label}
                  </span>
                </div>
                <p className="text-lg font-mono text-slate-700 dark:text-slate-300">
                  #{invoice.invoice_number}
                </p>
                <div className="mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <p>
                    <span className="font-medium">Date:</span>{" "}
                    {formatDate(invoice.invoice_date)}
                  </p>
                  <p>
                    <span className="font-medium">Due Date:</span>{" "}
                    {formatDate(invoice.due_date)}
                  </p>
                  <p>
                    <span className="font-medium">Period:</span>{" "}
                    {formatDate(invoice.period_start)} -{" "}
                    {formatDate(invoice.period_end)}
                  </p>
                  {invoice.purchase_order_number && (
                    <p>
                      <span className="font-medium">PO #:</span>{" "}
                      {invoice.purchase_order_number}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="p-6 sm:p-8 border-b border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Bill To
            </h4>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {invoice.client_name || `Client #${invoice.client_id}`}
            </p>
            {invoice.client_address && (
              <p className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-line">
                {invoice.client_address}
              </p>
            )}
            {invoice.client_email && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {invoice.client_email}
              </p>
            )}
            {invoice.client_phone && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {invoice.client_phone}
              </p>
            )}
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-12">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Shifts
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {invoice.line_items && invoice.line_items.length > 0 ? (
                  invoice.line_items.map((item, index) => (
                    <tr
                      key={item.id || index}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-200 text-right">
                        {item.hours.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-200 text-right">
                        {item.shifts}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-200 text-right">
                        {formatCurrency(item.rate)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100 text-right">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 text-sm"
                    >
                      No line items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="p-6 sm:p-8 border-t border-slate-200 dark:border-slate-700">
            <div className="flex justify-end">
              <div className="w-full sm:w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    Subtotal
                  </span>
                  <span className="text-slate-900 dark:text-slate-100 font-medium">
                    {formatCurrency(invoice.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    VAT ({invoice.vat_rate ?? 15}%)
                  </span>
                  <span className="text-slate-900 dark:text-slate-100 font-medium">
                    {formatCurrency(invoice.vat_amount)}
                  </span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Total
                    </span>
                    <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(invoice.total_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Info (if paid) */}
          {invoice.status === "paid" && (
            <div className="p-6 sm:p-8 border-t border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h4 className="font-semibold text-green-800 dark:text-green-300">
                  Payment Received
                </h4>
              </div>
              {invoice.payment_date && (
                <p className="text-sm text-green-700 dark:text-green-400">
                  Paid on: {formatDate(invoice.payment_date)}
                </p>
              )}
              {invoice.payment_reference && (
                <p className="text-sm text-green-700 dark:text-green-400">
                  Reference: {invoice.payment_reference}
                </p>
              )}
            </div>
          )}

          {/* Notes & Payment Terms */}
          {(invoice.notes || invoice.payment_terms) && (
            <div className="p-6 sm:p-8 border-t border-slate-200 dark:border-slate-700">
              {invoice.payment_terms && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Payment Terms
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {invoice.payment_terms}
                  </p>
                </div>
              )}
              {invoice.notes && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Notes
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                    {invoice.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mark Paid Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Record Payment
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Invoice {invoice.invoice_number} -{" "}
              {formatCurrency(invoice.total_amount)}
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Payment Reference (optional)
              </label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="e.g., EFT-2026-001, CHQ-12345"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPayModal(false);
                  setPaymentRef("");
                }}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkPaid}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                {actionLoading ? "Processing..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
