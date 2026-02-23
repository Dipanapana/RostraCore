"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/ui/PageHeader";
import { invoiceApi } from "@/services/api";
import { useToast } from "@/context/ToastContext";
import {
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
  { color: string; label: string; bgAccent: string }
> = {
  draft: {
    color: "bg-gray-100 text-gray-800",

    label: "Draft",
    bgAccent: "border-gray-400",
  },
  sent: {
    color: "bg-blue-100 text-blue-800",

    label: "Sent",
    bgAccent: "border-blue-500",
  },
  paid: {
    color: "bg-emerald-50 text-emerald-700",

    label: "Paid",
    bgAccent: "border-green-500",
  },
  overdue: {
    color: "bg-red-50 text-red-700",

    label: "Overdue",
    bgAccent: "border-red-500",
  },
  cancelled: {
    color: "bg-gray-200 text-gray-600",

    label: "Cancelled",
    bgAccent: "border-gray-500",
  },
};

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status.toLowerCase()] ?? {
      color: "bg-gray-100 text-gray-800",
  
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
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">
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
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invoice Not Found
            </h2>
            <p className="text-gray-500 mb-4">
              {error || "The requested invoice could not be found."}
            </p>
            <PageHeader backHref="/billing/invoices" backLabel="Back to Invoices" />
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
          <PageHeader backHref="/billing/invoices" backLabel="Back to Invoices" />

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleDownloadPdf}
              disabled={actionLoading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2 text-sm transition-colors"
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Mark as Paid
              </button>
            )}

            {invoice.status !== "paid" && invoice.status !== "cancelled" && (
              <button
                onClick={handleCancelInvoice}
                disabled={actionLoading}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 flex items-center gap-2 text-sm transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Void / Cancel
              </button>
            )}
          </div>
        </div>

        {/* Status Workflow Indicator */}
        {!isCancelled && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
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
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-500"
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
                            ? "text-blue-600"
                            : isCompleted
                              ? "text-green-600"
                              : "text-gray-500"
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
                            : "bg-gray-200"
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
          <div className="bg-gray-50 border border-gray-200 text-gray-600 px-4 py-3 rounded-lg flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">This invoice has been cancelled.</span>
          </div>
        )}

        {/* Invoice Preview Card */}
        <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden border-t-4 ${cfg.bgAccent}`}>
          {/* Invoice Header */}
          <div className="p-6 sm:p-8 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
              {/* Company Info */}
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {invoice.company_name || "Your Company"}
                </h2>
                {invoice.company_address && (
                  <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">
                    {invoice.company_address}
                  </p>
                )}
                {invoice.company_phone && (
                  <p className="text-sm text-gray-500">
                    {invoice.company_phone}
                  </p>
                )}
                {invoice.company_email && (
                  <p className="text-sm text-gray-500">
                    {invoice.company_email}
                  </p>
                )}
                {invoice.company_vat_number && (
                  <p className="text-sm text-gray-500">
                    VAT: {invoice.company_vat_number}
                  </p>
                )}
              </div>

              {/* Invoice Meta */}
              <div className="text-right">
                <div className="flex items-center gap-3 justify-end mb-2">
                  <h3 className="text-2xl font-semibold text-gray-900">
                    INVOICE
                  </h3>
                  <span
                    className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${cfg.color}`}
                  >
                    {cfg.label}
                  </span>
                </div>
                <p className="text-lg font-mono text-gray-700">
                  #{invoice.invoice_number}
                </p>
                <div className="mt-3 space-y-1 text-sm text-gray-500">
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
          <div className="p-6 sm:p-8 border-b border-gray-200">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Bill To
            </h4>
            <p className="text-lg font-semibold text-gray-900">
              {invoice.client_name || `Client #${invoice.client_id}`}
            </p>
            {invoice.client_address && (
              <p className="text-sm text-gray-500 whitespace-pre-line">
                {invoice.client_address}
              </p>
            )}
            {invoice.client_email && (
              <p className="text-sm text-gray-500">
                {invoice.client_email}
              </p>
            )}
            {invoice.client_phone && (
              <p className="text-sm text-gray-500">
                {invoice.client_phone}
              </p>
            )}
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shifts
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.line_items && invoice.line_items.length > 0 ? (
                  invoice.line_items.map((item, index) => (
                    <tr
                      key={item.id || index}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {item.hours.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {item.shifts}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {formatCurrency(item.rate)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500 text-sm"
                    >
                      No line items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="p-6 sm:p-8 border-t border-gray-200">
            <div className="flex justify-end">
              <div className="w-full sm:w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    Subtotal
                  </span>
                  <span className="text-gray-900 font-medium">
                    {formatCurrency(invoice.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    VAT ({invoice.vat_rate ?? 15}%)
                  </span>
                  <span className="text-gray-900 font-medium">
                    {formatCurrency(invoice.vat_amount)}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      Total
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(invoice.total_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Info (if paid) */}
          {invoice.status === "paid" && (
            <div className="p-6 sm:p-8 border-t border-green-200 bg-green-50">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-green-800">
                  Payment Received
                </h4>
              </div>
              {invoice.payment_date && (
                <p className="text-sm text-green-700">
                  Paid on: {formatDate(invoice.payment_date)}
                </p>
              )}
              {invoice.payment_reference && (
                <p className="text-sm text-green-700">
                  Reference: {invoice.payment_reference}
                </p>
              )}
            </div>
          )}

          {/* Notes & Payment Terms */}
          {(invoice.notes || invoice.payment_terms) && (
            <div className="p-6 sm:p-8 border-t border-gray-200">
              {invoice.payment_terms && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Payment Terms
                  </h4>
                  <p className="text-sm text-gray-700">
                    {invoice.payment_terms}
                  </p>
                </div>
              )}
              {invoice.notes && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Notes
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
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
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Record Payment
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Invoice {invoice.invoice_number} -{" "}
              {formatCurrency(invoice.total_amount)}
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
                  setShowPayModal(false);
                  setPaymentRef("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkPaid}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
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
