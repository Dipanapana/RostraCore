"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getApiUrl } from "@/lib/config";
import TableSkeleton from "@/components/ui/TableSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import { Building2 } from "lucide-react";

interface Client {
  client_id: number;
  org_id: number;
  client_name: string;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  billing_rate: number | null;
  target_margin_pct: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  site_count?: number;
  // Company registration & compliance
  registration_number: string | null;
  company_type: string | null;
  income_tax_number: string | null;
  bbee_level: number | null;
  bbee_certificate_expiry: string | null;
  industry_sector: string | null;
  // Payment terms
  payment_terms_days: number | null;
  requires_purchase_order: boolean | null;
  // Invoice/billing
  vat_number: string | null;
  billing_address: string | null;
  billing_email: string | null;
  billing_contact_name: string | null;
  // Operations contact
  operations_contact_name: string | null;
  operations_contact_email: string | null;
  operations_contact_phone: string | null;
  // Emergency contact
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  // Location
  province: string | null;
  city: string | null;
}

const COMPANY_TYPES = [
  { value: '', label: 'Select...' },
  { value: 'pty_ltd', label: '(Pty) Ltd' },
  { value: 'cc', label: 'Close Corporation (CC)' },
  { value: 'municipality', label: 'Municipality' },
  { value: 'soe', label: 'State-Owned Enterprise' },
  { value: 'npc', label: 'Non-Profit Company (NPC)' },
  { value: 'trust', label: 'Trust' },
  { value: 'sole_proprietor', label: 'Sole Proprietor' },
  { value: 'other', label: 'Other' },
];

const INDUSTRY_SECTORS = [
  { value: '', label: 'Select...' },
  { value: 'government', label: 'Government' },
  { value: 'retail', label: 'Retail' },
  { value: 'mining', label: 'Mining' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'financial', label: 'Financial Services' },
  { value: 'other', label: 'Other' },
];

const SA_PROVINCES = [
  '', 'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape',
  'Free State', 'Mpumalanga', 'Limpopo', 'North West', 'Northern Cape',
];

const PAYMENT_TERMS = [
  { value: '7', label: 'Net 7 days' },
  { value: '14', label: 'Net 14 days' },
  { value: '30', label: 'Net 30 days' },
  { value: '60', label: 'Net 60 days' },
  { value: '90', label: 'Net 90 days' },
];

export default function ClientsPage() {
  const { token, user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    client_name: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    contract_start_date: "",
    contract_end_date: "",
    billing_rate: "",
    target_margin_pct: "",
    status: "active",
    notes: "",
    registration_number: "",
    company_type: "",
    income_tax_number: "",
    bbee_level: "",
    bbee_certificate_expiry: "",
    industry_sector: "",
    payment_terms_days: "30",
    requires_purchase_order: false as boolean,
    vat_number: "",
    billing_address: "",
    billing_email: "",
    billing_contact_name: "",
    operations_contact_name: "",
    operations_contact_email: "",
    operations_contact_phone: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    province: "",
    city: "",
  });

  // Date range filter state
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);

  useEffect(() => {
    fetchClients();
  }, [token]);

  // Apply date range filter for contract dates
  useEffect(() => {
    if (!filterStartDate && !filterEndDate) {
      setFilteredClients(clients);
      return;
    }

    const filtered = clients.filter((client) => {
      if (!client.contract_start_date) return false;

      const contractStart = new Date(client.contract_start_date);
      const contractEnd = client.contract_end_date ? new Date(client.contract_end_date) : null;

      if (filterStartDate && filterEndDate) {
        const filterStart = new Date(filterStartDate);
        const filterEnd = new Date(filterEndDate);
        // Check if contract period overlaps with filter range
        const startInRange = contractStart <= filterEnd;
        const endInRange = !contractEnd || contractEnd >= filterStart;
        return startInRange && endInRange;
      } else if (filterStartDate) {
        const filterStart = new Date(filterStartDate);
        return !contractEnd || contractEnd >= filterStart;
      } else if (filterEndDate) {
        const filterEnd = new Date(filterEndDate);
        return contractStart <= filterEnd;
      }
      return true;
    });

    setFilteredClients(filtered);
  }, [clients, filterStartDate, filterEndDate]);

  const fetchClients = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/clients`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setClients(Array.isArray(data) ? data : []);
        setError("");
      } else {
        setError(`Failed to fetch clients: ${response.status} ${response.statusText}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch clients");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingClient
        ? `${getApiUrl()}/api/v1/clients/${editingClient.client_id}`
        : `${getApiUrl()}/api/v1/clients`;

      const method = editingClient ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          org_id: user?.org_id ?? 1,
          billing_rate: formData.billing_rate ? Number(formData.billing_rate) : null,
          target_margin_pct: formData.target_margin_pct ? Number(formData.target_margin_pct) : null,
          bbee_level: formData.bbee_level ? Number(formData.bbee_level) : null,
          bbee_certificate_expiry: formData.bbee_certificate_expiry || null,
          payment_terms_days: formData.payment_terms_days ? Number(formData.payment_terms_days) : null,
          registration_number: formData.registration_number || null,
          company_type: formData.company_type || null,
          income_tax_number: formData.income_tax_number || null,
          industry_sector: formData.industry_sector || null,
          vat_number: formData.vat_number || null,
          billing_address: formData.billing_address || null,
          billing_email: formData.billing_email || null,
          billing_contact_name: formData.billing_contact_name || null,
          operations_contact_name: formData.operations_contact_name || null,
          operations_contact_email: formData.operations_contact_email || null,
          operations_contact_phone: formData.operations_contact_phone || null,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_phone: formData.emergency_contact_phone || null,
          province: formData.province || null,
          city: formData.city || null,
        }),
      });

      if (response.ok) {
        setShowModal(false);
        setEditingClient(null);
        resetForm();
        fetchClients();
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to save client");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save client");
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      client_name: client.client_name,
      contact_person: client.contact_person || "",
      contact_email: client.contact_email || "",
      contact_phone: client.contact_phone || "",
      address: client.address || "",
      contract_start_date: client.contract_start_date?.split('T')[0] || "",
      contract_end_date: client.contract_end_date?.split('T')[0] || "",
      billing_rate: client.billing_rate?.toString() || "",
      target_margin_pct: client.target_margin_pct?.toString() || "",
      status: client.status,
      notes: client.notes || "",
      registration_number: client.registration_number || "",
      company_type: client.company_type || "",
      income_tax_number: client.income_tax_number || "",
      bbee_level: client.bbee_level?.toString() || "",
      bbee_certificate_expiry: client.bbee_certificate_expiry?.split('T')[0] || "",
      industry_sector: client.industry_sector || "",
      payment_terms_days: client.payment_terms_days?.toString() || "30",
      requires_purchase_order: client.requires_purchase_order || false,
      vat_number: client.vat_number || "",
      billing_address: client.billing_address || "",
      billing_email: client.billing_email || "",
      billing_contact_name: client.billing_contact_name || "",
      operations_contact_name: client.operations_contact_name || "",
      operations_contact_email: client.operations_contact_email || "",
      operations_contact_phone: client.operations_contact_phone || "",
      emergency_contact_name: client.emergency_contact_name || "",
      emergency_contact_phone: client.emergency_contact_phone || "",
      province: client.province || "",
      city: client.city || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (clientId: number) => {
    if (!confirm("Are you sure you want to delete this client?")) {
      return;
    }

    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/clients/${clientId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        fetchClients();
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to delete client");
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete client");
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: "",
      contact_person: "",
      contact_email: "",
      contact_phone: "",
      address: "",
      contract_start_date: "",
      contract_end_date: "",
      billing_rate: "",
      target_margin_pct: "",
      status: "active",
      notes: "",
      registration_number: "",
      company_type: "",
      income_tax_number: "",
      bbee_level: "",
      bbee_certificate_expiry: "",
      industry_sector: "",
      payment_terms_days: "30",
      requires_purchase_order: false,
      vat_number: "",
      billing_address: "",
      billing_email: "",
      billing_contact_name: "",
      operations_contact_name: "",
      operations_contact_email: "",
      operations_contact_phone: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      province: "",
      city: "",
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-7 w-48 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-72 bg-gray-100 rounded" />
          </div>
          <TableSkeleton rows={6} columns={5} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Client Management</h1>
            <p className="text-gray-600">
              Manage your clients (municipalities, departments, etc.)
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingClient(null);
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Add Client
          </button>
        </div>

        {/* Main Content */}
        <div>
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
              <button
                onClick={() => setError("")}
                className="float-right text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-gray-500 text-sm font-medium">Total Clients</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{clients.length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-gray-500 text-sm font-medium">Active Contracts</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {clients.filter(c => c.status === "active").length}
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-gray-500 text-sm font-medium">Total Sites</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {clients.reduce((sum, c) => sum + (c.site_count || 0), 0)}
              </p>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
            <div className="flex items-center gap-4">
              <label className="text-gray-700 font-medium">Filter by Contract Period:</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Start Date"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="End Date"
                />
                {(filterStartDate || filterEndDate) && (
                  <button
                    onClick={() => {
                      setFilterStartDate("");
                      setFilterEndDate("");
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              <div className="ml-auto text-sm text-gray-600">
                Showing {filteredClients.length} of {clients.length} clients
              </div>
            </div>
          </div>

          {/* Clients Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sites
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Billing Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target Margin
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      {clients.length === 0 ? (
                        <EmptyState
                          icon={Building2}
                          title="No clients yet"
                          description="Add your first client to get started"
                          actionLabel="Add Client"
                          onAction={() => {
                            resetForm();
                            setEditingClient(null);
                            setShowModal(true);
                          }}
                        />
                      ) : (
                        <div className="px-6 py-12 text-center text-gray-500">
                          No clients match the selected date range.
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => (
                    <tr key={client.client_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {client.client_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <Link
                          href={`/sites?client_id=${client.client_id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {client.site_count || 0} sites
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${client.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-800"
                          }`}>
                          {client.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.billing_rate ? `R ${client.billing_rate}/hr` : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {client.target_margin_pct != null ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                            {client.target_margin_pct}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/clients/${client.client_id}`}
                          className="text-violet-600 hover:text-violet-900 mr-4"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleEdit(client)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(client.client_id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                {editingClient ? "Edit Client" : "Add New Client"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Section: Basic Info */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                      <input id="client_name" type="text" value={formData.client_name} onChange={(e) => setFormData({ ...formData, client_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                    </div>
                    <div>
                      <label htmlFor="client_status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select id="client_status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="industry_sector" className="block text-sm font-medium text-gray-700 mb-1">Industry Sector</label>
                      <select id="industry_sector" value={formData.industry_sector} onChange={(e) => setFormData({ ...formData, industry_sector: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        {INDUSTRY_SECTORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="company_type" className="block text-sm font-medium text-gray-700 mb-1">Company Type</label>
                      <select id="company_type" value={formData.company_type} onChange={(e) => setFormData({ ...formData, company_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        {COMPANY_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section: Registration & Compliance */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Registration & Compliance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="registration_number" className="block text-sm font-medium text-gray-700 mb-1">CIPC Registration No.</label>
                      <input id="registration_number" type="text" value={formData.registration_number} onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })} placeholder="e.g. 2020/123456/07" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label htmlFor="vat_number" className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label>
                      <input id="vat_number" type="text" value={formData.vat_number} onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })} placeholder="e.g. 4123456789" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label htmlFor="income_tax_number" className="block text-sm font-medium text-gray-700 mb-1">Income Tax Number</label>
                      <input id="income_tax_number" type="text" value={formData.income_tax_number} onChange={(e) => setFormData({ ...formData, income_tax_number: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label htmlFor="bbee_level" className="block text-sm font-medium text-gray-700 mb-1">B-BBEE Level</label>
                      <select id="bbee_level" value={formData.bbee_level} onChange={(e) => setFormData({ ...formData, bbee_level: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">Not specified</option>
                        {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Level {n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="bbee_certificate_expiry" className="block text-sm font-medium text-gray-700 mb-1">B-BBEE Certificate Expiry</label>
                      <input id="bbee_certificate_expiry" type="date" value={formData.bbee_certificate_expiry} onChange={(e) => setFormData({ ...formData, bbee_certificate_expiry: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>
                </div>

                {/* Section: Primary Contact */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Primary Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                      <input id="contact_person" type="text" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input id="contact_email" type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input id="contact_phone" type="tel" value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>
                </div>

                {/* Section: Operations Contact */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Operations Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="ops_contact_name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input id="ops_contact_name" type="text" value={formData.operations_contact_name} onChange={(e) => setFormData({ ...formData, operations_contact_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label htmlFor="ops_contact_email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input id="ops_contact_email" type="email" value={formData.operations_contact_email} onChange={(e) => setFormData({ ...formData, operations_contact_email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label htmlFor="ops_contact_phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input id="ops_contact_phone" type="tel" value={formData.operations_contact_phone} onChange={(e) => setFormData({ ...formData, operations_contact_phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>
                </div>

                {/* Section: Emergency Contact */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="emergency_name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input id="emergency_name" type="text" value={formData.emergency_contact_name} onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label htmlFor="emergency_phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input id="emergency_phone" type="tel" value={formData.emergency_contact_phone} onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>
                </div>

                {/* Section: Billing & Contract */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Billing & Contract</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="billing_rate" className="block text-sm font-medium text-gray-700 mb-1">Billing Rate (R/hr)</label>
                      <input id="billing_rate" type="number" step="0.01" value={formData.billing_rate} onChange={(e) => setFormData({ ...formData, billing_rate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label htmlFor="target_margin_pct" className="block text-sm font-medium text-gray-700 mb-1">Target Margin %</label>
                      <input id="target_margin_pct" type="number" step="0.1" min="0" max="100" value={formData.target_margin_pct} onChange={(e) => setFormData({ ...formData, target_margin_pct: e.target.value })} placeholder="e.g. 30" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label htmlFor="contract_start_date" className="block text-sm font-medium text-gray-700 mb-1">Contract Start</label>
                      <input id="contract_start_date" type="date" value={formData.contract_start_date} onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label htmlFor="contract_end_date" className="block text-sm font-medium text-gray-700 mb-1">Contract End</label>
                      <input id="contract_end_date" type="date" value={formData.contract_end_date} onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label htmlFor="payment_terms_days" className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                      <select id="payment_terms_days" value={formData.payment_terms_days} onChange={(e) => setFormData({ ...formData, payment_terms_days: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        {PAYMENT_TERMS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center pt-6">
                      <input type="checkbox" id="requires_po" checked={formData.requires_purchase_order} onChange={(e) => setFormData({ ...formData, requires_purchase_order: e.target.checked })} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                      <label htmlFor="requires_po" className="ml-2 text-sm font-medium text-gray-700">Requires Purchase Order</label>
                    </div>
                    <div>
                      <label htmlFor="billing_contact_name" className="block text-sm font-medium text-gray-700 mb-1">Billing Contact</label>
                      <input id="billing_contact_name" type="text" value={formData.billing_contact_name} onChange={(e) => setFormData({ ...formData, billing_contact_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label htmlFor="billing_email" className="block text-sm font-medium text-gray-700 mb-1">Billing Email</label>
                      <input id="billing_email" type="email" value={formData.billing_email} onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label htmlFor="billing_address" className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
                    <textarea id="billing_address" value={formData.billing_address} onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>

                {/* Section: Location */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Location</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="client_province" className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                      <select id="client_province" value={formData.province} onChange={(e) => setFormData({ ...formData, province: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        {SA_PROVINCES.map(p => <option key={p} value={p}>{p || 'Select...'}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="client_city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input id="client_city" type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label htmlFor="client_address" className="block text-sm font-medium text-gray-700 mb-1">Physical Address</label>
                    <textarea id="client_address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>

                {/* Section: Notes */}
                <div>
                  <label htmlFor="client_notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea id="client_notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>

                <div className="mt-6 flex gap-4">
                  <button type="button" onClick={() => { setShowModal(false); setEditingClient(null); resetForm(); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {editingClient ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
