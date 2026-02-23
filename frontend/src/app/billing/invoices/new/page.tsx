"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/ui/PageHeader";
import { invoiceApi, clientsApi } from "@/services/api";
import { useToast } from "@/context/ToastContext";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Calendar,
  Users,
  Building2,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Client {
  client_id: number;
  client_name: string;
  contact_person?: string;
  contact_email?: string;
  billing_rate?: number;
  status: string;
}

interface GeneratedInvoice {
  invoice_id: number;
  invoice_number: string;
  client_name: string;
  period_start: string;
  period_end: string;
  total_hours: number;
  total_shifts: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  line_items: {
    line_item_id: number;
    site_name?: string;
    description: string;
    hours: number;
    shifts: number;
    rate_per_hour: number;
    amount: number;
  }[];
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS = [
  { id: 1, label: "Select Client", icon: Users },
  { id: 2, label: "Billing Period", icon: Calendar },
  { id: 3, label: "Review & Generate", icon: FileText },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;

        return (
          <div key={step.id} className="flex items-center">
            {idx > 0 && (
              <div
                className={`w-12 h-0.5 mx-1 ${
                  isCompleted
                    ? "bg-blue-500"
                    : "bg-gray-200"
                }`}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  isCompleted
                    ? "bg-blue-600 text-white"
                    : isActive
                    ? "bg-blue-100 text-blue-700 ring-2 ring-blue-500"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-sm font-medium hidden sm:inline ${
                  isActive
                    ? "text-blue-700"
                    : isCompleted
                    ? "text-gray-700"
                    : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Currency formatter
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return `R${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function NewInvoicePage() {
  const router = useRouter();
  const { showToast } = useToast();

  // Wizard state
  const [step, setStep] = useState(1);

  // Step 1: Client selection
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientSearch, setClientSearch] = useState("");

  // Step 2: Period selection
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");

  // Step 3: Generation result
  const [generating, setGenerating] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] =
    useState<GeneratedInvoice | null>(null);
  const [generateError, setGenerateError] = useState("");

  // ---------------------------------------------------------------------------
  // Load clients
  // ---------------------------------------------------------------------------

  const loadClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const response = await clientsApi.getAll();
      const data = response.data;
      const activeClients = (Array.isArray(data) ? data : data.clients || [])
        .filter((c: Client) => c.status === "active");
      setClients(activeClients);
    } catch {
      showToast("Failed to load clients", "error");
    } finally {
      setLoadingClients(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Set sensible defaults for period when a client is selected
  useEffect(() => {
    if (selectedClientId && !periodStart) {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setPeriodStart(firstOfMonth.toISOString().split("T")[0]);
      setPeriodEnd(lastOfMonth.toISOString().split("T")[0]);

      // Due date = 30 days from today
      const due = new Date();
      due.setDate(due.getDate() + 30);
      setDueDate(due.toISOString().split("T")[0]);
    }
  }, [selectedClientId, periodStart]);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const selectedClient = clients.find(
    (c) => c.client_id === selectedClientId
  );

  const filteredClients = clients.filter((c) =>
    c.client_name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // ---------------------------------------------------------------------------
  // Generate invoice
  // ---------------------------------------------------------------------------

  const handleGenerate = async () => {
    if (!selectedClientId || !periodStart || !periodEnd) return;

    setGenerating(true);
    setGenerateError("");

    try {
      const response = await invoiceApi.generate({
        client_id: selectedClientId,
        period_start: periodStart,
        period_end: periodEnd,
        due_date: dueDate || undefined,
        notes: notes || undefined,
        payment_terms: paymentTerms || undefined,
        purchase_order_number: purchaseOrderNumber || undefined,
      });

      setGeneratedInvoice(response.data);
      showToast("Invoice generated successfully!", "success");
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        "Failed to generate invoice. Check that there are confirmed shifts in this period.";
      setGenerateError(msg);
      showToast(msg, "error");
    } finally {
      setGenerating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------

  const canProceedStep1 = selectedClientId !== null;
  const canProceedStep2 = periodStart && periodEnd && periodStart <= periodEnd;

  const goNext = () => {
    if (step === 1 && canProceedStep1) setStep(2);
    else if (step === 2 && canProceedStep2) setStep(3);
  };

  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // ---------------------------------------------------------------------------
  // Render step content
  // ---------------------------------------------------------------------------

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Select Client
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Choose the client to generate an invoice for. Only active clients with
          assigned sites are shown.
        </p>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search clients..."
          value={clientSearch}
          onChange={(e) => setClientSearch(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Client list */}
      {loadingClients ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading clients...
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">
            {clientSearch ? "No clients match your search" : "No active clients found"}
          </p>
        </div>
      ) : (
        <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-1">
          {filteredClients.map((client) => {
            const isSelected = selectedClientId === client.client_id;
            return (
              <button
                key={client.client_id}
                onClick={() => setSelectedClientId(client.client_id)}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`font-medium text-sm ${
                        isSelected
                          ? "text-blue-700"
                          : "text-gray-900"
                      }`}
                    >
                      {client.client_name}
                    </p>
                    {client.contact_person && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Contact: {client.contact_person}
                        {client.contact_email && ` • ${client.contact_email}`}
                      </p>
                    )}
                  </div>
                  {client.billing_rate && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      R{Number(client.billing_rate).toFixed(2)}/hr
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Billing Period & Details
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Set the billing period for{" "}
          <span className="font-medium text-gray-700">
            {selectedClient?.client_name}
          </span>
          . The system will auto-calculate hours from confirmed shift
          assignments.
        </p>
      </div>

      {/* Period dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Period Start *
          </label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Period End *
          </label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {periodStart && periodEnd && periodStart > periodEnd && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          Period start must be before period end
        </div>
      )}

      {/* Due date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Due Date
        </label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full sm:w-1/2 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        <p className="text-xs text-gray-400 mt-1">
          Defaults to 30 days from today if left empty
        </p>
      </div>

      {/* Payment terms & PO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Payment Terms
          </label>
          <select
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="Net 7">Net 7</option>
            <option value="Net 15">Net 15</option>
            <option value="Net 30">Net 30</option>
            <option value="Net 60">Net 60</option>
            <option value="Due on Receipt">Due on Receipt</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Purchase Order # (optional)
          </label>
          <input
            type="text"
            value={purchaseOrderNumber}
            onChange={(e) => setPurchaseOrderNumber(e.target.value)}
            placeholder="e.g. PO-2026-045"
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any additional notes for this invoice..."
          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
        />
      </div>
    </div>
  );

  const renderStep3 = () => {
    // Before generating
    if (!generatedInvoice && !generating) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Review & Generate
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Review the details below and click Generate to create the invoice.
            </p>
          </div>

          {/* Summary card */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">
                  Client
                </span>
                <p className="font-medium text-gray-900">
                  {selectedClient?.client_name}
                </p>
              </div>
              <div>
                <span className="text-gray-500">
                  Billing Rate
                </span>
                <p className="font-medium text-gray-900">
                  {selectedClient?.billing_rate
                    ? `R${Number(selectedClient.billing_rate).toFixed(2)}/hr`
                    : "Per-site rates"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">
                  Period
                </span>
                <p className="font-medium text-gray-900">
                  {formatDate(periodStart)} &mdash; {formatDate(periodEnd)}
                </p>
              </div>
              <div>
                <span className="text-gray-500">
                  Due Date
                </span>
                <p className="font-medium text-gray-900">
                  {dueDate ? formatDate(dueDate) : "30 days from today"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">
                  Payment Terms
                </span>
                <p className="font-medium text-gray-900">
                  {paymentTerms}
                </p>
              </div>
              {purchaseOrderNumber && (
                <div>
                  <span className="text-gray-500">
                    PO Number
                  </span>
                  <p className="font-medium text-gray-900">
                    {purchaseOrderNumber}
                  </p>
                </div>
              )}
            </div>
            {notes && (
              <div className="pt-2 border-t border-gray-200">
                <span className="text-sm text-gray-500">
                  Notes
                </span>
                <p className="text-sm text-gray-700 mt-0.5">
                  {notes}
                </p>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              The invoice will be auto-calculated from confirmed shift
              assignments during this period. Line items will be grouped by
              site.
            </p>
          </div>

          {generateError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                {generateError}
              </p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Invoice...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Generate Invoice
              </>
            )}
          </button>
        </div>
      );
    }

    // Loading state
    if (generating) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <p className="text-sm font-medium">
            Generating invoice for {selectedClient?.client_name}...
          </p>
          <p className="text-xs mt-1">
            Calculating billable hours from confirmed shifts
          </p>
        </div>
      );
    }

    // Generated invoice result
    if (generatedInvoice) {
      return (
        <div className="space-y-6">
          {/* Success banner */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-700">
                Invoice {generatedInvoice.invoice_number} generated
                successfully!
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                Status: Draft — review and send when ready.
              </p>
            </div>
          </div>

          {/* Invoice summary */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {generatedInvoice.invoice_number}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {generatedInvoice.client_name} &bull;{" "}
                    {formatDate(generatedInvoice.period_start)} &ndash;{" "}
                    {formatDate(generatedInvoice.period_end)}
                  </p>
                </div>
                <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                  Draft
                </span>
              </div>
            </div>

            {/* Line items table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-5 py-3 font-medium text-gray-500">
                      Description
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-right">
                      Hours
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-right">
                      Shifts
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-right">
                      Rate
                    </th>
                    <th className="px-5 py-3 font-medium text-gray-500 text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {generatedInvoice.line_items.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-5 py-3 text-gray-900">
                        {item.description}
                        {item.site_name && (
                          <span className="block text-xs text-gray-400 mt-0.5">
                            {item.site_name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {item.hours.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {item.shifts}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {formatCurrency(item.rate_per_hour)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 px-5 py-4 bg-gray-50">
              <div className="flex flex-col items-end gap-1 text-sm">
                <div className="flex gap-8">
                  <span className="text-gray-500">
                    Subtotal
                  </span>
                  <span className="font-medium text-gray-700 w-28 text-right">
                    {formatCurrency(generatedInvoice.subtotal)}
                  </span>
                </div>
                <div className="flex gap-8">
                  <span className="text-gray-500">
                    VAT (15%)
                  </span>
                  <span className="font-medium text-gray-700 w-28 text-right">
                    {formatCurrency(generatedInvoice.tax_amount)}
                  </span>
                </div>
                <div className="flex gap-8 pt-2 border-t border-gray-300 mt-1">
                  <span className="font-semibold text-gray-900">
                    Total
                  </span>
                  <span className="font-bold text-blue-700 w-28 text-right text-base">
                    {formatCurrency(generatedInvoice.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {generatedInvoice.total_hours.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">
                Total Hours
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {generatedInvoice.total_shifts}
              </p>
              <p className="text-xs text-gray-500">
                Total Shifts
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {generatedInvoice.line_items.length}
              </p>
              <p className="text-xs text-gray-500">
                Sites Billed
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() =>
                router.push(
                  `/billing/invoices/${generatedInvoice.invoice_id}`
                )
              }
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <FileText className="w-4 h-4" />
              View Invoice
            </button>
            <button
              onClick={() => {
                setStep(1);
                setSelectedClientId(null);
                setGeneratedInvoice(null);
                setGenerateError("");
                setPeriodStart("");
                setPeriodEnd("");
                setDueDate("");
                setNotes("");
                setPaymentTerms("Net 30");
                setPurchaseOrderNumber("");
              }}
              className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium transition-colors"
            >
              Generate Another
            </button>
            <button
              onClick={() => router.push("/billing/invoices")}
              className="px-5 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              Back to Invoices
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <PageHeader
            backHref="/billing/invoices"
            backLabel="Back to Invoices"
            title="Generate Invoice"
            subtitle="Create a new client invoice from confirmed shift assignments"
          />
        </div>

        {/* Step indicator - hide when showing generated result */}
        {!generatedInvoice && <StepIndicator currentStep={step} />}

        {/* Step content card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        {/* Navigation buttons (steps 1-2 only, not when invoice is generated) */}
        {!generatedInvoice && step < 3 && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={goBack}
              disabled={step === 1}
              className="px-4 py-2.5 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={goNext}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2)
              }
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-colors"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Back button on step 3 before generating */}
        {step === 3 && !generatedInvoice && !generating && (
          <div className="mt-4">
            <button
              onClick={goBack}
              className="px-4 py-2.5 text-gray-600 hover:text-gray-900 flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Period Details
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
