"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";

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

  // Date range filter state
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filteredAttendances, setFilteredAttendances] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    fetchAttendances();
    fetchActiveShifts();
  }, [token]);

  // Apply date range filter
  useEffect(() => {
    if (!filterStartDate && !filterEndDate) {
      setFilteredAttendances(attendances);
      return;
    }

    const filtered = attendances.filter((attendance) => {
      const clockInDate = new Date(attendance.clock_in);

      if (filterStartDate && filterEndDate) {
        const filterStart = new Date(filterStartDate);
        const filterEnd = new Date(filterEndDate);
        filterEnd.setHours(23, 59, 59, 999); // Include the entire end date
        return clockInDate >= filterStart && clockInDate <= filterEnd;
      } else if (filterStartDate) {
        const filterStart = new Date(filterStartDate);
        return clockInDate >= filterStart;
      } else if (filterEndDate) {
        const filterEnd = new Date(filterEndDate);
        filterEnd.setHours(23, 59, 59, 999);
        return clockInDate <= filterEnd;
      }
      return true;
    });

    setFilteredAttendances(filtered);
  }, [attendances, filterStartDate, filterEndDate]);

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
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading attendance records...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Attendance Tracking</h1>
              <p className="text-gray-600">
                Clock in/out and manage employee attendance
              </p>
            </div>
            <div>
              <button
                onClick={() => setShowClockInModal(true)}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm"
              >
                Clock In
              </button>
            </div>
          </div>
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

        {/* Date Range Filter */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-gray-700 font-medium">Filter by Date:</label>
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
              Showing {filteredAttendances.length} of {attendances.length} records
            </div>
          </div>
        </div>

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
              {filteredAttendances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {attendances.length === 0
                      ? 'No attendance records found. Click "Clock In" to start tracking.'
                      : 'No attendance records match the selected date range.'}
                  </td>
                </tr>
              ) : (
                filteredAttendances.map((attendance) => (
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
      </DashboardLayout>

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
    </>
  );
}
