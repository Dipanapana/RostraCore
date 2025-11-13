"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface LeaveRequest {
  leave_id: number;
  start_date: string;
  end_date: string;
  leave_type: string;
  reason: string | null;
  status: string;
  created_at: string;
  rejection_reason: string | null;
}

export default function EmployeeLeavePage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [token, setToken] = useState("");
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    leave_type: "annual",
    reason: "",
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
    fetchLeaveRequests(Number(storedId), storedToken);
  }, [router]);

  const fetchLeaveRequests = async (empId: number, authToken: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/leave-requests?employee_id=${empId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLeaveRequests(data);
      } else {
        setError("Failed to load leave requests");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/leave-requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            employee_id: employeeId,
            start_date: new Date(formData.start_date).toISOString(),
            end_date: new Date(formData.end_date).toISOString(),
            leave_type: formData.leave_type,
            reason: formData.reason || null,
          }),
        }
      );

      if (response.ok) {
        setSuccess("Leave request submitted successfully!");
        setShowModal(false);
        setFormData({
          start_date: "",
          end_date: "",
          leave_type: "annual",
          reason: "",
        });
        fetchLeaveRequests(employeeId!, token);
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to submit leave request");
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit leave request");
    }
  };

  const handleCancel = async (leaveId: number) => {
    if (!confirm("Are you sure you want to cancel this leave request?")) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/leave-requests/${leaveId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setSuccess("Leave request cancelled successfully");
        fetchLeaveRequests(employeeId!, token);
      } else {
        setError("Failed to cancel leave request");
      }
    } catch (err: any) {
      setError(err.message || "Failed to cancel leave request");
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
              <h1 className="text-3xl font-bold text-white">Leave Requests</h1>
              <p className="text-gray-300 mt-1">Manage your leave and time off</p>
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
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
              >
                + Request Leave
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-4">My Leave Requests</h2>
                {leaveRequests.length === 0 ? (
                  <p className="text-gray-400">No leave requests found.</p>
                ) : (
                  <div className="space-y-4">
                    {leaveRequests.map((leave) => (
                      <div
                        key={leave.leave_id}
                        className="bg-white/5 rounded-lg p-4 border border-white/10"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-white capitalize">
                              {leave.leave_type.replace(/_/g, " ")} Leave
                            </h3>
                            <p className="text-sm text-gray-300 mt-1">
                              {new Date(leave.start_date).toLocaleDateString()} -{" "}
                              {new Date(leave.end_date).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              leave.status === "approved"
                                ? "bg-green-500/20 text-green-300"
                                : leave.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-300"
                                : "bg-red-500/20 text-red-300"
                            }`}
                          >
                            {leave.status}
                          </span>
                        </div>
                        {leave.reason && (
                          <p className="text-sm text-gray-400 mt-2">
                            <strong>Reason:</strong> {leave.reason}
                          </p>
                        )}
                        {leave.rejection_reason && (
                          <p className="text-sm text-red-300 mt-2">
                            <strong>Rejection Reason:</strong> {leave.rejection_reason}
                          </p>
                        )}
                        {(leave.status === "pending" || leave.status === "approved") && (
                          <button
                            onClick={() => handleCancel(leave.leave_id)}
                            className="mt-3 text-sm text-red-400 hover:text-red-300"
                          >
                            Cancel Request
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Leave Balance</h3>
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-300 text-sm">Annual Leave</p>
                  <p className="text-2xl font-bold text-white">15 days</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-300 text-sm">Sick Leave</p>
                  <p className="text-2xl font-bold text-white">10 days</p>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-3">Leave Types</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Annual Leave</li>
                <li>• Sick Leave</li>
                <li>• Family Responsibility</li>
                <li>• Unpaid Leave</li>
                <li>• Study Leave</li>
                <li>• Maternity/Paternity</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Request Leave</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Leave Type
                </label>
                <select
                  value={formData.leave_type}
                  onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="family_responsibility">Family Responsibility</option>
                  <option value="unpaid">Unpaid Leave</option>
                  <option value="study">Study Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="paternity">Paternity Leave</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                  placeholder="Provide a reason for your leave..."
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-white/20 rounded-lg text-white hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
