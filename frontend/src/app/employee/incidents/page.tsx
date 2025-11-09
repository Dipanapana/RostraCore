"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface IncidentReport {
  incident_id: number;
  incident_date: string;
  incident_type: string;
  severity: string;
  status: string;
  description: string;
  site_name: string;
  supervisor_reviewed: boolean;
  created_at: string;
}

interface Site {
  site_id: number;
  client_name: string;
  site_name: string;
}

export default function IncidentReportsPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [token, setToken] = useState("");
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    site_id: "",
    incident_date: new Date().toISOString().slice(0, 16),
    incident_type: "suspicious_activity",
    severity: "medium",
    incident_category: "operational",
    location_details: "",
    exact_location: "",
    description: "",
    action_taken: "",
    outcome: "",
    suspect_details: "",
    victim_details: "",
    witness_details: "",
    police_notified: false,
    police_case_number: "",
    police_station: "",
    client_notified: false,
    injuries_reported: false,
    medical_attention_required: false,
    ambulance_called: false,
    property_damage: false,
    property_damage_description: "",
    estimated_loss_value: "",
    evidence_collected: false,
    evidence_description: "",
    follow_up_required: false,
    follow_up_notes: "",
  });

  useEffect(() => {
    const storedToken = localStorage.getItem("employee_token");
    const storedId = localStorage.getItem("employee_id");

    if (!storedToken || !storedId) {
      router.push("/employee/login");
      return;
    }

    setToken(storedToken);
    setEmployeeId(Number(storedId));
    fetchIncidents(Number(storedId), storedToken);
    fetchSites(storedToken);
  }, [router]);

  const fetchIncidents = async (empId: number, authToken: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/incident-reports?employee_id=${empId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setIncidents(data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  };

  const fetchSites = async (authToken: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/sites`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setSites(data);
      }
    } catch (err) {
      console.error("Failed to fetch sites:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/incident-reports`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            employee_id: employeeId,
            ...formData,
            site_id: Number(formData.site_id),
            incident_date: new Date(formData.incident_date).toISOString(),
            estimated_loss_value: formData.estimated_loss_value ? Number(formData.estimated_loss_value) : null,
          }),
        }
      );

      if (response.ok) {
        setSuccess("Incident report submitted successfully!");
        setShowModal(false);
        resetForm();
        fetchIncidents(employeeId!, token);
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to submit incident report");
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit incident report");
    }
  };

  const resetForm = () => {
    setFormData({
      site_id: "",
      incident_date: new Date().toISOString().slice(0, 16),
      incident_type: "suspicious_activity",
      severity: "medium",
      incident_category: "operational",
      location_details: "",
      exact_location: "",
      description: "",
      action_taken: "",
      outcome: "",
      suspect_details: "",
      victim_details: "",
      witness_details: "",
      police_notified: false,
      police_case_number: "",
      police_station: "",
      client_notified: false,
      injuries_reported: false,
      medical_attention_required: false,
      ambulance_called: false,
      property_damage: false,
      property_damage_description: "",
      estimated_loss_value: "",
      evidence_collected: false,
      evidence_description: "",
      follow_up_required: false,
      follow_up_notes: "",
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500/20 text-red-300 border-red-500/50";
      case "high": return "bg-orange-500/20 text-orange-300 border-orange-500/50";
      case "medium": return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";
      case "low": return "bg-green-500/20 text-green-300 border-green-500/50";
      default: return "bg-gray-500/20 text-gray-300 border-gray-500/50";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Incident Reports</h1>
              <p className="text-gray-300 mt-1">Report and track security incidents</p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/employee/dashboard"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition"
              >
                ← Back
              </Link>
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-semibold"
              >
                🚨 Report Incident
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
            {error}
            <button onClick={() => setError("")} className="float-right text-red-200">×</button>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg">
            {success}
            <button onClick={() => setSuccess("")} className="float-right text-green-200">×</button>
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-4">My Incident Reports</h2>
            {incidents.length === 0 ? (
              <p className="text-gray-400">No incident reports found.</p>
            ) : (
              <div className="space-y-4">
                {incidents.map((incident) => (
                  <div
                    key={incident.incident_id}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-white capitalize">
                          {incident.incident_type.replace(/_/g, " ")}
                        </h3>
                        <p className="text-sm text-gray-300 mt-1">
                          {new Date(incident.incident_date).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-400">{incident.site_name}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(incident.severity)}`}>
                          {incident.severity}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          incident.supervisor_reviewed
                            ? "bg-green-500/20 text-green-300"
                            : "bg-yellow-500/20 text-yellow-300"
                        }`}>
                          {incident.supervisor_reviewed ? "Reviewed" : "Pending Review"}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-2">{incident.description}</p>
                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Reported: {new Date(incident.created_at).toLocaleDateString()}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        incident.status === "closed" ? "bg-gray-500/20 text-gray-300" :
                        incident.status === "resolved" ? "bg-green-500/20 text-green-300" :
                        incident.status === "under_investigation" ? "bg-blue-500/20 text-blue-300" :
                        "bg-orange-500/20 text-orange-300"
                      }`}>
                        {incident.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Incident Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-xl p-8 max-w-4xl w-full my-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">🚨 Report Incident</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="bg-white/5 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Site *</label>
                    <select
                      value={formData.site_id}
                      onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-red-500"
                      required
                    >
                      <option value="">Select Site</option>
                      {sites.map((site) => (
                        <option key={site.site_id} value={site.site_id}>
                          {site.client_name} - {site.site_name || "Main Site"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Incident Date/Time *</label>
                    <input
                      type="datetime-local"
                      value={formData.incident_date}
                      onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Incident Type *</label>
                    <select
                      value={formData.incident_type}
                      onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-red-500"
                      required
                    >
                      <option value="theft">Theft</option>
                      <option value="burglary">Burglary</option>
                      <option value="assault">Assault</option>
                      <option value="trespassing">Trespassing</option>
                      <option value="vandalism">Vandalism</option>
                      <option value="suspicious_activity">Suspicious Activity</option>
                      <option value="fire">Fire</option>
                      <option value="medical_emergency">Medical Emergency</option>
                      <option value="equipment_failure">Equipment Failure</option>
                      <option value="access_control_breach">Access Control Breach</option>
                      <option value="vehicle_incident">Vehicle Incident</option>
                      <option value="armed_robbery">Armed Robbery</option>
                      <option value="protest_unrest">Protest/Unrest</option>
                      <option value="bomb_threat">Bomb Threat</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Severity *</label>
                    <select
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-red-500"
                      required
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-200 mb-2">Exact Location</label>
                    <input
                      type="text"
                      value={formData.exact_location}
                      onChange={(e) => setFormData({ ...formData, exact_location: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-red-500"
                      placeholder="e.g., Main gate, Building A entrance, Parking lot section 2"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-white/5 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Incident Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Description *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-red-500"
                      placeholder="Provide detailed description of what happened..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Action Taken</label>
                    <textarea
                      value={formData.action_taken}
                      onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-red-500"
                      placeholder="What actions did you take in response?"
                    />
                  </div>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="bg-white/5 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Additional Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <label className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={formData.police_notified}
                      onChange={(e) => setFormData({ ...formData, police_notified: e.target.checked })}
                      className="mr-2"
                    />
                    Police Notified
                  </label>

                  <label className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={formData.client_notified}
                      onChange={(e) => setFormData({ ...formData, client_notified: e.target.checked })}
                      className="mr-2"
                    />
                    Client Notified
                  </label>

                  <label className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={formData.injuries_reported}
                      onChange={(e) => setFormData({ ...formData, injuries_reported: e.target.checked })}
                      className="mr-2"
                    />
                    Injuries Reported
                  </label>

                  <label className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={formData.medical_attention_required}
                      onChange={(e) => setFormData({ ...formData, medical_attention_required: e.target.checked })}
                      className="mr-2"
                    />
                    Medical Attention Required
                  </label>

                  <label className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={formData.ambulance_called}
                      onChange={(e) => setFormData({ ...formData, ambulance_called: e.target.checked })}
                      className="mr-2"
                    />
                    Ambulance Called
                  </label>

                  <label className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={formData.property_damage}
                      onChange={(e) => setFormData({ ...formData, property_damage: e.target.checked })}
                      className="mr-2"
                    />
                    Property Damage
                  </label>

                  <label className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={formData.evidence_collected}
                      onChange={(e) => setFormData({ ...formData, evidence_collected: e.target.checked })}
                      className="mr-2"
                    />
                    Evidence Collected
                  </label>

                  <label className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={formData.follow_up_required}
                      onChange={(e) => setFormData({ ...formData, follow_up_required: e.target.checked })}
                      className="mr-2"
                    />
                    Follow-up Required
                  </label>
                </div>

                {formData.police_notified && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Police Case Number</label>
                      <input
                        type="text"
                        value={formData.police_case_number}
                        onChange={(e) => setFormData({ ...formData, police_case_number: e.target.value })}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Police Station</label>
                      <input
                        type="text"
                        value={formData.police_station}
                        onChange={(e) => setFormData({ ...formData, police_station: e.target.value })}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                )}

                {formData.property_damage && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Property Damage Description</label>
                      <textarea
                        value={formData.property_damage_description}
                        onChange={(e) => setFormData({ ...formData, property_damage_description: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Estimated Loss (ZAR)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.estimated_loss_value}
                        onChange={(e) => setFormData({ ...formData, estimated_loss_value: e.target.value })}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-white/20 rounded-lg text-white hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-semibold"
                >
                  Submit Incident Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
