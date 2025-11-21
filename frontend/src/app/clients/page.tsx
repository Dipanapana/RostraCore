"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";

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
  status: string;
  notes: string | null;
  created_at: string;
  site_count?: number;
}

export default function ClientsPage() {
  const { token } = useAuth();
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
    status: "active",
    notes: "",
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
      console.log("[CLIENTS] No token available, waiting for auth...");
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log("[CLIENTS] Fetching clients with token...");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/clients`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("[CLIENTS] Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("[CLIENTS] Fetched", data.length, "clients");
        setClients(data);
        setError("");
      } else {
        const errorText = await response.text();
        console.error("[CLIENTS] Error response:", errorText);
        setError(`Failed to fetch clients: ${response.status} ${response.statusText}`);
      }
    } catch (err: any) {
      console.error("[CLIENTS] Fetch error:", err);
      setError(err.message || "Failed to fetch clients");
    } finally {
      setLoading(false);
      console.log("[CLIENTS] Fetch complete, loading=false");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingClient
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/clients/${editingClient.client_id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/clients`;

      const method = editingClient ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          org_id: 1, // TODO: Get from auth context
          billing_rate: formData.billing_rate ? Number(formData.billing_rate) : null,
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
      status: client.status,
      notes: client.notes || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (clientId: number) => {
    if (!confirm("Are you sure you want to delete this client?")) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/clients/${clientId}`,
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
      status: "active",
      notes: "",
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading clients...</p>
          </div>
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Client Management</h1>
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
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            + Add Client
          </button>
        </div>

        {/* Main Content */}
        <div>
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
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
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Total Clients</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{clients.length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Active Contracts</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {clients.filter(c => c.status === "active").length}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Total Sites</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {clients.reduce((sum, c) => sum + (c.site_count || 0), 0)}
              </p>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="flex items-center gap-4">
              <label className="text-gray-700 font-medium">Filter by Contract Period:</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Start Date"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Person
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      {clients.length === 0
                        ? 'No clients found. Click "Add Client" to create one.'
                        : 'No clients match the selected date range.'}
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
                        {client.contact_person || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{client.contact_email || "-"}</div>
                        <div className="text-sm text-gray-500">{client.contact_phone || "-"}</div>
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
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                          }`}>
                          {client.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.billing_rate ? `R ${client.billing_rate}/hr` : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(client)}
                          className="text-emerald-600 hover:text-emerald-900 mr-4"
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingClient ? "Edit Client" : "Add New Client"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client Name *
                    </label>
                    <input
                      type="text"
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Billing Rate (R/hr)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.billing_rate}
                      onChange={(e) => setFormData({ ...formData, billing_rate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contract Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.contract_start_date}
                      onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contract End Date
                    </label>
                    <input
                      type="date"
                      value={formData.contract_end_date}
                      onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div className="mt-6 flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingClient(null);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
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
