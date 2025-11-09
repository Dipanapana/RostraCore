"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UpcomingShift {
  shift_id: number;
  start_time: string;
  end_time: string;
  site_name: string;
  status: string;
}

interface LeaveRequest {
  leave_id: number;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: string;
}

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [upcomingShifts, setUpcomingShifts] = useState<UpcomingShift[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    // Check if employee is logged in
    const storedToken = localStorage.getItem("employee_token");
    const storedId = localStorage.getItem("employee_id");
    const storedName = localStorage.getItem("employee_name");

    if (!storedToken || !storedId) {
      router.push("/employee/login");
      return;
    }

    setToken(storedToken);
    setEmployeeId(Number(storedId));
    setEmployeeName(storedName || "Employee");
    setLoading(false);

    fetchDashboardData(Number(storedId), storedToken);
  }, [router]);

  const fetchDashboardData = async (empId: number, authToken: string) => {
    try {
      // Fetch upcoming shifts (simplified - would need actual endpoint)
      // For now, we'll just show empty state
      setUpcomingShifts([]);

      // Fetch leave requests
      const leaveResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/leave-requests?employee_id=${empId}&limit=5`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      if (leaveResponse.ok) {
        const leaveData = await leaveResponse.json();
        setLeaveRequests(leaveData);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("employee_token");
    localStorage.removeItem("employee_id");
    localStorage.removeItem("employee_name");
    router.push("/employee/login");
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
              <h1 className="text-3xl font-bold text-white">Welcome back, {employeeName}!</h1>
              <p className="text-gray-300 mt-1">Your employee dashboard</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/50 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            href="/employee/profile"
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/20 transition"
          >
            <div className="text-5xl mb-4">👤</div>
            <h3 className="text-xl font-bold text-white">My Profile</h3>
            <p className="text-gray-300 text-sm mt-2">
              Update personal info, PSIRA details
            </p>
          </Link>

          <Link
            href="/employee/clock"
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/20 transition"
          >
            <div className="text-5xl mb-4">⏰</div>
            <h3 className="text-xl font-bold text-white">Clock In/Out</h3>
            <p className="text-gray-300 text-sm mt-2">
              Track your shift attendance
            </p>
          </Link>

          <Link
            href="/employee/leave"
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/20 transition"
          >
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-white">Request Leave</h3>
            <p className="text-gray-300 text-sm mt-2">
              Submit and manage leave requests
            </p>
          </Link>

          <Link
            href="/employee/certificates"
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/20 transition"
          >
            <div className="text-5xl mb-4">📄</div>
            <h3 className="text-xl font-bold text-white">Certificates</h3>
            <p className="text-gray-300 text-sm mt-2">
              Upload and manage certificates
            </p>
          </Link>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Shifts */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Upcoming Shifts</h2>
            {upcomingShifts.length === 0 ? (
              <p className="text-gray-400">No upcoming shifts scheduled.</p>
            ) : (
              <div className="space-y-3">
                {upcomingShifts.map((shift) => (
                  <div
                    key={shift.shift_id}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                  >
                    <div className="font-semibold text-white">{shift.site_name}</div>
                    <p className="text-sm text-gray-300 mt-1">
                      {new Date(shift.start_time).toLocaleString()} -{" "}
                      {new Date(shift.end_time).toLocaleTimeString()}
                    </p>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs mt-2 inline-block">
                      {shift.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave Requests */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Recent Leave Requests</h2>
            {leaveRequests.length === 0 ? (
              <p className="text-gray-400">No leave requests found.</p>
            ) : (
              <div className="space-y-3">
                {leaveRequests.map((leave) => (
                  <div
                    key={leave.leave_id}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-white capitalize">
                          {leave.leave_type.replace(/_/g, " ")}
                        </div>
                        <p className="text-sm text-gray-300 mt-1">
                          {new Date(leave.start_date).toLocaleDateString()} -{" "}
                          {new Date(leave.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
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
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/employee/leave"
              className="mt-4 block text-center text-purple-400 hover:text-purple-300 transition"
            >
              View All →
            </Link>
          </div>
        </div>

        {/* Info Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">📱 Mobile App Coming Soon</h3>
            <p className="text-gray-300 text-sm">
              Access your dashboard, clock in/out, and request leave from your mobile device.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">🔔 Notifications</h3>
            <p className="text-gray-300 text-sm">
              Get notified about shift assignments, leave approvals, and important updates.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">💰 Payslips</h3>
            <p className="text-gray-300 text-sm">
              View and download your monthly payslips directly from your dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
