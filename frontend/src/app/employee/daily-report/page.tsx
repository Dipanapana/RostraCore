"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface DailyReport {
  ob_id: number;
  site_id: number;
  site_name?: string;
  client_name?: string;
  employee_name?: string;
  ob_date: string;
  shift_start: string;
  shift_end: string | null;
  weather_conditions: string | null;
  patrol_rounds_completed: number | null;
  visitors_logged: number;
  visitor_details: any[] | null;
  equipment_checked: boolean;
  equipment_status: string | null;
  equipment_issues: string | null;
  incidents_summary: string | null;
  observations: string | null;
  handover_notes: string | null;
  relieving_officer_id: number | null;
  relieving_officer_name?: string;
  keys_handed_over: boolean;
  supervisor_reviewed: boolean;
  supervisor_comments: string | null;
  created_at: string;
}

interface Site {
  site_id: number;
  site_name: string;
}

export default function EmployeeDailyReportPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [printReport, setPrintReport] = useState<DailyReport | null>(null);

  const [formData, setFormData] = useState({
    site_id: "",
    ob_date: new Date().toISOString().slice(0, 10),
    shift_start: new Date().toISOString().slice(0, 16),
    shift_end: "",
    weather_conditions: "",
    patrol_rounds_completed: "",
    visitors_logged: "0",
    visitor_details: [] as any[],
    equipment_checked: false,
    equipment_status: "",
    equipment_issues: "",
    incidents_summary: "",
    observations: "",
    handover_notes: "",
    relieving_officer_id: "",
    keys_handed_over: false,
  });

  const [visitorForm, setVisitorForm] = useState({
    name: "",
    company: "",
    purpose: "",
    time_in: "",
    time_out: "",
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
    setLoading(false);

    fetchReports(Number(storedId), storedToken);
    fetchSites(storedToken);
  }, [router]);

  const fetchReports = async (empId: number, authToken: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/daily-reports?employee_id=${empId}&limit=20`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (err) {
      console.error("Failed to fetch daily reports:", err);
    }
  };

  const fetchSites = async (authToken: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/sites`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSites(data);
      }
    } catch (err) {
      console.error("Failed to fetch sites:", err);
    }
  };

  const handleAddVisitor = () => {
    if (visitorForm.name && visitorForm.time_in) {
      const newVisitor = { ...visitorForm };
      setFormData({
        ...formData,
        visitor_details: [...formData.visitor_details, newVisitor],
        visitors_logged: (formData.visitor_details.length + 1).toString(),
      });
      setVisitorForm({
        name: "",
        company: "",
        purpose: "",
        time_in: "",
        time_out: "",
      });
    }
  };

  const handleRemoveVisitor = (index: number) => {
    const updatedVisitors = formData.visitor_details.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      visitor_details: updatedVisitors,
      visitors_logged: updatedVisitors.length.toString(),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const payload = {
        site_id: Number(formData.site_id),
        ob_date: formData.ob_date,
        shift_start: formData.shift_start,
        shift_end: formData.shift_end || null,
        weather_conditions: formData.weather_conditions || null,
        patrol_rounds_completed: formData.patrol_rounds_completed
          ? Number(formData.patrol_rounds_completed)
          : null,
        visitors_logged: Number(formData.visitors_logged),
        visitor_details: formData.visitor_details.length > 0 ? formData.visitor_details : null,
        equipment_checked: formData.equipment_checked,
        equipment_status: formData.equipment_status || null,
        equipment_issues: formData.equipment_issues || null,
        incidents_summary: formData.incidents_summary || null,
        observations: formData.observations || null,
        handover_notes: formData.handover_notes || null,
        relieving_officer_id: formData.relieving_officer_id
          ? Number(formData.relieving_officer_id)
          : null,
        keys_handed_over: formData.keys_handed_over,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/daily-reports`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        setSuccess("Daily report submitted successfully!");
        setShowForm(false);
        fetchReports(employeeId!, token);
        // Reset form
        setFormData({
          site_id: "",
          ob_date: new Date().toISOString().slice(0, 10),
          shift_start: new Date().toISOString().slice(0, 16),
          shift_end: "",
          weather_conditions: "",
          patrol_rounds_completed: "",
          visitors_logged: "0",
          visitor_details: [],
          equipment_checked: false,
          equipment_status: "",
          equipment_issues: "",
          incidents_summary: "",
          observations: "",
          handover_notes: "",
          relieving_officer_id: "",
          keys_handed_over: false,
        });
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to submit daily report");
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit daily report");
    }
  };

  const fetchReportDetails = async (obId: number) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/daily-reports/${obId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setPrintReport(data);
        // Trigger print after state updates
        setTimeout(() => window.print(), 100);
      }
    } catch (err) {
      console.error("Failed to fetch report details:", err);
      setError("Failed to load report details for printing");
    }
  };

  const handlePrint = (obId: number) => {
    fetchReportDetails(obId);
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
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Daily Occurrence Book</h1>
              <p className="text-gray-300 mt-1">Log your shift activities and observations</p>
            </div>
            <Link
              href="/employee/dashboard"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
            {error}
            <button
              onClick={() => setError("")}
              className="float-right text-red-200 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg">
            {success}
            <button
              onClick={() => setSuccess("")}
              className="float-right text-green-200 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* Submit New Report Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
          >
            {showForm ? "Cancel" : "+ New Daily Report"}
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-900 rounded-xl border border-white/20 w-full max-w-4xl my-8">
              <div className="sticky top-0 bg-slate-900 border-b border-white/20 p-6 rounded-t-xl z-10">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-white">New Daily Report (OB)</h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Shift Information */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Shift Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Site *
                      </label>
                      <select
                        value={formData.site_id}
                        onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                        required
                      >
                        <option value="">Select Site</option>
                        {sites.map((site) => (
                          <option key={site.site_id} value={site.site_id}>
                            {site.site_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={formData.ob_date}
                        onChange={(e) => setFormData({ ...formData, ob_date: e.target.value })}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Shift Start *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.shift_start}
                        onChange={(e) => setFormData({ ...formData, shift_start: e.target.value })}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Shift End
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.shift_end}
                        onChange={(e) => setFormData({ ...formData, shift_end: e.target.value })}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Weather Conditions
                      </label>
                      <input
                        type="text"
                        value={formData.weather_conditions}
                        onChange={(e) => setFormData({ ...formData, weather_conditions: e.target.value })}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., Clear, Rainy, Windy"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Patrol Rounds Completed
                      </label>
                      <input
                        type="number"
                        value={formData.patrol_rounds_completed}
                        onChange={(e) => setFormData({ ...formData, patrol_rounds_completed: e.target.value })}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Visitor Management */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Visitors</h3>

                  {/* Add Visitor Form */}
                  <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <h4 className="text-sm font-semibold text-white mb-3">Add Visitor</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={visitorForm.name}
                        onChange={(e) => setVisitorForm({ ...visitorForm, name: e.target.value })}
                        className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                        placeholder="Visitor Name *"
                      />
                      <input
                        type="text"
                        value={visitorForm.company}
                        onChange={(e) => setVisitorForm({ ...visitorForm, company: e.target.value })}
                        className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                        placeholder="Company"
                      />
                      <input
                        type="text"
                        value={visitorForm.purpose}
                        onChange={(e) => setVisitorForm({ ...visitorForm, purpose: e.target.value })}
                        className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                        placeholder="Purpose of Visit"
                      />
                      <input
                        type="time"
                        value={visitorForm.time_in}
                        onChange={(e) => setVisitorForm({ ...visitorForm, time_in: e.target.value })}
                        className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500"
                        placeholder="Time In *"
                      />
                      <input
                        type="time"
                        value={visitorForm.time_out}
                        onChange={(e) => setVisitorForm({ ...visitorForm, time_out: e.target.value })}
                        className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500"
                        placeholder="Time Out"
                      />
                      <button
                        type="button"
                        onClick={handleAddVisitor}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition"
                      >
                        + Add Visitor
                      </button>
                    </div>
                  </div>

                  {/* Visitors List */}
                  {formData.visitor_details.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-white">Logged Visitors ({formData.visitor_details.length})</h4>
                      {formData.visitor_details.map((visitor, index) => (
                        <div key={index} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10">
                          <div className="text-sm text-white">
                            <span className="font-semibold">{visitor.name}</span>
                            {visitor.company && <span className="text-gray-400"> - {visitor.company}</span>}
                            <div className="text-xs text-gray-400 mt-1">
                              {visitor.purpose && <span>{visitor.purpose} | </span>}
                              In: {visitor.time_in}
                              {visitor.time_out && <span> | Out: {visitor.time_out}</span>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveVisitor(index)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Equipment Check */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Equipment Check</h3>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.equipment_checked}
                        onChange={(e) => setFormData({ ...formData, equipment_checked: e.target.checked })}
                        className="w-5 h-5 bg-white/10 border-white/20 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <label className="ml-3 text-sm text-gray-200">
                        Equipment check completed
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Equipment Status
                      </label>
                      <textarea
                        value={formData.equipment_status}
                        onChange={(e) => setFormData({ ...formData, equipment_status: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                        placeholder="List equipment checked and their status..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Equipment Issues (if any)
                      </label>
                      <textarea
                        value={formData.equipment_issues}
                        onChange={(e) => setFormData({ ...formData, equipment_issues: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                        placeholder="Describe any equipment problems or maintenance needed..."
                      />
                    </div>
                  </div>
                </div>

                {/* Incidents & Observations */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Incidents & Observations</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Incidents Summary
                      </label>
                      <textarea
                        value={formData.incidents_summary}
                        onChange={(e) => setFormData({ ...formData, incidents_summary: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                        placeholder="Brief summary of any incidents during shift..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        General Observations
                      </label>
                      <textarea
                        value={formData.observations}
                        onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                        placeholder="Any notable observations, unusual activities, or important notes..."
                      />
                    </div>
                  </div>
                </div>

                {/* Handover */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Handover</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Handover Notes
                      </label>
                      <textarea
                        value={formData.handover_notes}
                        onChange={(e) => setFormData({ ...formData, handover_notes: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                        placeholder="Information for the next shift..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-200 mb-2">
                          Relieving Officer ID
                        </label>
                        <input
                          type="number"
                          value={formData.relieving_officer_id}
                          onChange={(e) => setFormData({ ...formData, relieving_officer_id: e.target.value })}
                          className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                          placeholder="Next officer's employee ID"
                        />
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.keys_handed_over}
                          onChange={(e) => setFormData({ ...formData, keys_handed_over: e.target.checked })}
                          className="w-5 h-5 bg-white/10 border-white/20 rounded focus:ring-2 focus:ring-purple-500"
                        />
                        <label className="ml-3 text-sm text-gray-200">
                          Keys handed over to next officer
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="sticky bottom-0 bg-slate-900 pt-4 border-t border-white/20">
                  <button
                    type="submit"
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
                  >
                    Submit Daily Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reports List */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">Your Daily Reports</h2>

          {reports.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-gray-400 text-lg">No daily reports submitted yet.</p>
              <p className="text-gray-500 text-sm mt-2">
                Click "New Daily Report" to log your shift activities.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.ob_id}
                  className="bg-white/5 rounded-lg p-5 border border-white/10 hover:bg-white/10 transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">
                          {report.site_name || `Site #${report.site_id}`}
                        </h3>
                        {report.supervisor_reviewed && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-300 border border-green-500/50 rounded text-xs">
                            ✓ Reviewed
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {new Date(report.ob_date).toLocaleDateString()} - Shift: {new Date(report.shift_start).toLocaleTimeString()}
                        {report.shift_end && ` to ${new Date(report.shift_end).toLocaleTimeString()}`}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-400">
                      Submitted: {new Date(report.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    {report.weather_conditions && (
                      <div className="text-sm">
                        <span className="text-gray-400">Weather:</span>
                        <span className="text-white ml-2">{report.weather_conditions}</span>
                      </div>
                    )}
                    {report.patrol_rounds_completed !== null && (
                      <div className="text-sm">
                        <span className="text-gray-400">Patrols:</span>
                        <span className="text-white ml-2">{report.patrol_rounds_completed}</span>
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="text-gray-400">Visitors:</span>
                      <span className="text-white ml-2">{report.visitors_logged}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-400">Equipment:</span>
                      <span className={`ml-2 ${report.equipment_checked ? "text-green-300" : "text-yellow-300"}`}>
                        {report.equipment_checked ? "✓ Checked" : "Not Checked"}
                      </span>
                    </div>
                  </div>

                  {report.observations && (
                    <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-xs text-gray-400 mb-1">Observations:</p>
                      <p className="text-sm text-gray-200">{report.observations}</p>
                    </div>
                  )}

                  {report.incidents_summary && (
                    <div className="mt-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                      <p className="text-xs text-yellow-300 mb-1">Incidents Summary:</p>
                      <p className="text-sm text-yellow-100">{report.incidents_summary}</p>
                    </div>
                  )}

                  {report.supervisor_comments && (
                    <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                      <p className="text-xs text-blue-300 mb-1">Supervisor Comments:</p>
                      <p className="text-sm text-blue-100">{report.supervisor_comments}</p>
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handlePrint(report.ob_id)}
                      className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition print:hidden"
                      title="Print daily report"
                    >
                      🖨️ Print Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Printable Daily Report - Professional Format */}
      {printReport && (
        <div className="hidden print:block fixed inset-0 bg-white z-[9999]">
          <style jsx global>{`
            @media print {
              @page {
                size: A4;
                margin: 2cm;
              }
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div className="p-8 text-black max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-6 border-b-2 border-black pb-4">
              <h1 className="text-2xl font-bold uppercase">Daily Occurrence Book</h1>
              <p className="text-sm mt-1">Shift Activity Report</p>
              <p className="text-xs mt-1">OB Reference: OB-{printReport.ob_id.toString().padStart(6, '0')}</p>
            </div>

            {/* Report Information */}
            <div className="mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="border border-black p-2">
                  <span className="font-bold">Client:</span> {printReport.client_name || 'N/A'}
                </div>
                <div className="border border-black p-2">
                  <span className="font-bold">Site:</span> {printReport.site_name}
                </div>
                <div className="border border-black p-2">
                  <span className="font-bold">Security Officer:</span> {printReport.employee_name || 'Employee'}
                </div>
                <div className="border border-black p-2">
                  <span className="font-bold">Date:</span> {new Date(printReport.ob_date).toLocaleDateString()}
                </div>
                <div className="border border-black p-2">
                  <span className="font-bold">Shift Start:</span> {new Date(printReport.shift_start).toLocaleTimeString()}
                </div>
                <div className="border border-black p-2">
                  <span className="font-bold">Shift End:</span> {printReport.shift_end ? new Date(printReport.shift_end).toLocaleTimeString() : 'In Progress'}
                </div>
              </div>
            </div>

            {/* Weather & Patrol Info */}
            <div className="mb-6">
              <h2 className="text-lg font-bold border-b border-black mb-2">Shift Overview</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {printReport.weather_conditions && (
                  <div className="border border-black p-2">
                    <span className="font-bold">Weather Conditions:</span> {printReport.weather_conditions}
                  </div>
                )}
                <div className="border border-black p-2">
                  <span className="font-bold">Patrol Rounds Completed:</span> {printReport.patrol_rounds_completed || 'N/A'}
                </div>
              </div>
            </div>

            {/* Visitors */}
            {printReport.visitors_logged > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold border-b border-black mb-2">Visitors Log ({printReport.visitors_logged})</h2>
                {printReport.visitor_details && printReport.visitor_details.length > 0 ? (
                  <table className="w-full border-collapse border border-black text-sm">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="border border-black p-2 text-left">Name</th>
                        <th className="border border-black p-2 text-left">Company</th>
                        <th className="border border-black p-2 text-left">Purpose</th>
                        <th className="border border-black p-2 text-left">Time In</th>
                        <th className="border border-black p-2 text-left">Time Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printReport.visitor_details.map((visitor: any, index: number) => (
                        <tr key={index}>
                          <td className="border border-black p-2">{visitor.name}</td>
                          <td className="border border-black p-2">{visitor.company || '-'}</td>
                          <td className="border border-black p-2">{visitor.purpose || '-'}</td>
                          <td className="border border-black p-2">{visitor.time_in}</td>
                          <td className="border border-black p-2">{visitor.time_out || 'Still on site'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm border border-black p-2">Visitors logged but details not recorded</p>
                )}
              </div>
            )}

            {/* Equipment Check */}
            <div className="mb-6">
              <h2 className="text-lg font-bold border-b border-black mb-2">Equipment Check</h2>
              <div className="border border-black p-2 text-sm mb-2">
                <input type="checkbox" checked={printReport.equipment_checked} readOnly /> Equipment Check Completed
              </div>

              {printReport.equipment_status && (
                <div className="border border-black p-3 text-sm mb-2">
                  <p className="font-bold mb-1">Equipment Status:</p>
                  <p className="whitespace-pre-wrap">{printReport.equipment_status}</p>
                </div>
              )}

              {printReport.equipment_issues && (
                <div className="border border-black p-3 text-sm bg-yellow-50">
                  <p className="font-bold mb-1">Equipment Issues:</p>
                  <p className="whitespace-pre-wrap">{printReport.equipment_issues}</p>
                </div>
              )}
            </div>

            {/* Incidents & Observations */}
            <div className="mb-6">
              <h2 className="text-lg font-bold border-b border-black mb-2">Incidents & Observations</h2>

              {printReport.incidents_summary && (
                <div className="border border-black p-3 text-sm mb-2 bg-yellow-50">
                  <p className="font-bold mb-1">Incidents Summary:</p>
                  <p className="whitespace-pre-wrap">{printReport.incidents_summary}</p>
                </div>
              )}

              {printReport.observations && (
                <div className="border border-black p-3 text-sm">
                  <p className="font-bold mb-1">General Observations:</p>
                  <p className="whitespace-pre-wrap">{printReport.observations}</p>
                </div>
              )}

              {!printReport.incidents_summary && !printReport.observations && (
                <p className="text-sm border border-black p-2">No incidents or observations reported</p>
              )}
            </div>

            {/* Handover */}
            <div className="mb-6">
              <h2 className="text-lg font-bold border-b border-black mb-2">Shift Handover</h2>

              <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                <div className="border border-black p-2">
                  <span className="font-bold">Relieving Officer ID:</span> {printReport.relieving_officer_id || 'N/A'}
                </div>
                <div className="border border-black p-2">
                  <input type="checkbox" checked={printReport.keys_handed_over} readOnly /> Keys Handed Over
                </div>
              </div>

              {printReport.handover_notes && (
                <div className="border border-black p-3 text-sm">
                  <p className="font-bold mb-1">Handover Notes:</p>
                  <p className="whitespace-pre-wrap">{printReport.handover_notes}</p>
                </div>
              )}
            </div>

            {/* Supervisor Review */}
            {printReport.supervisor_reviewed && (
              <div className="mb-6">
                <h2 className="text-lg font-bold border-b border-black mb-2">Supervisor Review</h2>
                <div className="border border-black p-3 text-sm">
                  <p><span className="font-bold">Status:</span> REVIEWED & APPROVED</p>
                  {printReport.supervisor_comments && (
                    <p className="mt-2"><span className="font-bold">Comments:</span> {printReport.supervisor_comments}</p>
                  )}
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="mt-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="border-t-2 border-black pt-2">
                  <p className="text-sm font-bold">Security Officer Signature</p>
                  <p className="text-xs mt-1">Date: {new Date(printReport.created_at).toLocaleDateString()}</p>
                  <p className="text-xs">Time: {new Date(printReport.created_at).toLocaleTimeString()}</p>
                </div>
                <div className="border-t-2 border-black pt-2">
                  <p className="text-sm font-bold">Relieving Officer Signature</p>
                  <p className="text-xs mt-1">Date: _____________________</p>
                  <p className="text-xs">Time: _____________________</p>
                </div>
              </div>
              <div className="mt-6 border-t-2 border-black pt-2">
                <p className="text-sm font-bold">Supervisor Signature</p>
                <p className="text-xs mt-1">Date: _____________________</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-400 text-xs text-center text-gray-600">
              <p>This report is confidential and intended for official use only.</p>
              <p>Security Daily Occurrence Book | Generated: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
