"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface AttendanceRecord {
  attend_id: number;
  shift_id: number;
  employee_id: number;
  employee_name: string;
  clock_in: string;
  clock_out: string | null;
  variance_minutes: number;
  notes: string | null;
}

interface Shift {
  shift_id: number;
  site_name: string;
  start_time: string;
  end_time: string;
  assigned_employee_id: number;
  employee_name: string;
}

export default function AttendancePage() {
  const { token } = useAuth();
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceRecord | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchAttendances();
    fetchActiveShifts();
  }, [token]);

  const fetchAttendances = async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/attendance?limit=50`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAttendances(data);
      } else {
        setError("Failed to fetch attendance records");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch attendance records");
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveShifts = async () => {
    if (!token) return;

    try {
      // Fetch shifts for today
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/shifts?date=${today}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setShifts(data);
      }
    } catch (err: any) {
      console.error("Failed to fetch shifts:", err);
    }
  };

  const handleClockIn = async () => {
    if (!selectedShift) {
      setError("Please select a shift");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/attendance/clock-in`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            shift_id: selectedShift.shift_id,
            employee_id: selectedShift.assigned_employee_id,
            notes: notes || null,
          }),
        }
      );

      if (response.ok) {
        setShowClockInModal(false);
        setSelectedShift(null);
        setNotes("");
        fetchAttendances();
        fetchActiveShifts();
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to clock in");
      }
    } catch (err: any) {
      setError(err.message || "Failed to clock in");
    }
  };

  const handleClockOut = async () => {
    if (!selectedAttendance) {
      setError("Please select an attendance record");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/attendance/clock-out`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            attend_id: selectedAttendance.attend_id,
            notes: notes || null,
          }),
        }
      );

      if (response.ok) {
        setShowClockOutModal(false);
        setSelectedAttendance(null);
        setNotes("");
        fetchAttendances();
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to clock out");
      }
    } catch (err: any) {
      setError(err.message || "Failed to clock out");
    }
  };

  const handleDeleteAttendance = async (attendId: number) => {
    if (!confirm("Are you sure you want to delete this attendance record?")) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/attendance/${attendId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        fetchAttendances();
      } else {
        setError("Failed to delete attendance record");
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete attendance record");
    }
  };

  const getVarianceColor = (minutes: number) => {
    if (minutes <= 5 && minutes >= -5) return "text-green-600";
    if (minutes <= 15 && minutes >= -15) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Attendance Tracking</h1>
              <p className="mt-1 text-sm text-gray-500">
                Clock in/out and manage employee attendance
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ← Back to Dashboard
              </Link>
              <button
                onClick={() => setShowClockInModal(true)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Clock In
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Attendance Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shift ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clock In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clock Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No attendance records found. Click "Clock In" to start tracking.
                  </td>
                </tr>
              ) : (
                attendances.map((attendance) => (
                  <tr key={attendance.attend_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {attendance.employee_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {attendance.employee_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {attendance.shift_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(attendance.clock_in).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {attendance.clock_out ? (
                        <span className="text-sm text-gray-900">
                          {new Date(attendance.clock_out).toLocaleString()}
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedAttendance(attendance);
                            setShowClockOutModal(true);
                          }}
                          className="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600"
                        >
                          Clock Out
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${getVarianceColor(attendance.variance_minutes)}`}>
                        {attendance.variance_minutes > 0 ? "+" : ""}{attendance.variance_minutes} min
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {attendance.notes || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteAttendance(attendance.attend_id)}
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

      {/* Clock In Modal */}
      {showClockInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Clock In</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Shift
                </label>
                <select
                  value={selectedShift?.shift_id || ""}
                  onChange={(e) => {
                    const shift = shifts.find(s => s.shift_id === Number(e.target.value));
                    setSelectedShift(shift || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a shift</option>
                  {shifts.map((shift) => (
                    <option key={shift.shift_id} value={shift.shift_id}>
                      {shift.site_name} - {shift.employee_name} ({new Date(shift.start_time).toLocaleTimeString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Add any notes..."
                />
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => {
                  setShowClockInModal(false);
                  setSelectedShift(null);
                  setNotes("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClockIn}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Clock In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clock Out Modal */}
      {showClockOutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Clock Out</h2>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Employee</p>
                <p className="font-semibold">{selectedAttendance?.employee_name}</p>
                <p className="text-sm text-gray-600 mt-2">Clocked in at</p>
                <p className="font-semibold">
                  {selectedAttendance && new Date(selectedAttendance.clock_in).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Add any notes..."
                />
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => {
                  setShowClockOutModal(false);
                  setSelectedAttendance(null);
                  setNotes("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClockOut}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Clock Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
