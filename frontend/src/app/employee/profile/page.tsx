"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface EmployeeProfile {
  employee_id: number;
  first_name: string;
  last_name: string;
  id_number: string;
  email: string;
  phone: string | null;
  address: string | null;
  role: string;
  status: string;
  psira_number: string | null;
  psira_expiry_date: string | null;
  psira_grade: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

export default function EmployeeProfilePage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("personal");

  const [personalForm, setPersonalForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });

  const [psiraForm, setPsiraForm] = useState({
    psira_number: "",
    psira_expiry_date: "",
    psira_grade: "",
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
    fetchProfile(Number(storedId), storedToken);
  }, [router]);

  const fetchProfile = async (empId: number, authToken: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/employee-portal/profile/${empId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProfile(data);

        // Populate forms
        setPersonalForm({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone: data.phone || "",
          address: data.address || "",
          emergency_contact_name: data.emergency_contact_name || "",
          emergency_contact_phone: data.emergency_contact_phone || "",
        });

        setPsiraForm({
          psira_number: data.psira_number || "",
          psira_expiry_date: data.psira_expiry_date?.split('T')[0] || "",
          psira_grade: data.psira_grade || "",
        });
      } else {
        setError("Failed to load profile");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/employee-portal/profile/${employeeId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(personalForm),
        }
      );

      if (response.ok) {
        setSuccess("Personal information updated successfully!");
        fetchProfile(employeeId!, token);
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to update profile");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    }
  };

  const handlePsiraUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/employee-portal/profile/${employeeId}/psira`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(psiraForm),
        }
      );

      if (response.ok) {
        setSuccess("PSIRA information updated successfully!");
        fetchProfile(employeeId!, token);
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to update PSIRA info");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update PSIRA info");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading profile...</div>
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
              <h1 className="text-3xl font-bold text-white">My Profile</h1>
              <p className="text-gray-300 mt-1">Manage your personal information and PSIRA details</p>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Profile Card */}
        {profile && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
            <div className="flex items-center">
              <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center text-3xl text-white font-bold">
                {profile.first_name.charAt(0)}{profile.last_name.charAt(0)}
              </div>
              <div className="ml-6">
                <h2 className="text-2xl font-bold text-white">
                  {profile.first_name} {profile.last_name}
                </h2>
                <p className="text-gray-300">{profile.role.toUpperCase()} - ID: {profile.id_number}</p>
                <p className="text-gray-400 text-sm">{profile.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          <div className="flex border-b border-white/20">
            <button
              onClick={() => setActiveTab("personal")}
              className={`flex-1 px-6 py-4 text-white font-semibold transition ${
                activeTab === "personal"
                  ? "bg-purple-600/30 border-b-2 border-purple-500"
                  : "hover:bg-white/5"
              }`}
            >
              Personal Information
            </button>
            <button
              onClick={() => setActiveTab("psira")}
              className={`flex-1 px-6 py-4 text-white font-semibold transition ${
                activeTab === "psira"
                  ? "bg-purple-600/30 border-b-2 border-purple-500"
                  : "hover:bg-white/5"
              }`}
            >
              PSIRA Information
            </button>
            <button
              onClick={() => setActiveTab("certificates")}
              className={`flex-1 px-6 py-4 text-white font-semibold transition ${
                activeTab === "certificates"
                  ? "bg-purple-600/30 border-b-2 border-purple-500"
                  : "hover:bg-white/5"
              }`}
            >
              Certificates
            </button>
          </div>

          <div className="p-6">
            {/* Personal Information Tab */}
            {activeTab === "personal" && (
              <form onSubmit={handlePersonalUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={personalForm.first_name}
                      onChange={(e) => setPersonalForm({ ...personalForm, first_name: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={personalForm.last_name}
                      onChange={(e) => setPersonalForm({ ...personalForm, last_name: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={personalForm.phone}
                      onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                      placeholder="+27 XX XXX XXXX"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      value={personalForm.emergency_contact_name}
                      onChange={(e) => setPersonalForm({ ...personalForm, emergency_contact_name: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Emergency Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={personalForm.emergency_contact_phone}
                      onChange={(e) => setPersonalForm({ ...personalForm, emergency_contact_phone: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Address
                  </label>
                  <textarea
                    value={personalForm.address}
                    onChange={(e) => setPersonalForm({ ...personalForm, address: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
                >
                  Update Personal Information
                </button>
              </form>
            )}

            {/* PSIRA Information Tab */}
            {activeTab === "psira" && (
              <form onSubmit={handlePsiraUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      PSIRA Number *
                    </label>
                    <input
                      type="text"
                      value={psiraForm.psira_number}
                      onChange={(e) => setPsiraForm({ ...psiraForm, psira_number: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      PSIRA Grade *
                    </label>
                    <select
                      value={psiraForm.psira_grade}
                      onChange={(e) => setPsiraForm({ ...psiraForm, psira_grade: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="">Select Grade</option>
                      <option value="A">Grade A</option>
                      <option value="B">Grade B</option>
                      <option value="C">Grade C</option>
                      <option value="D">Grade D</option>
                      <option value="E">Grade E</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Expiry Date *
                    </label>
                    <input
                      type="date"
                      value={psiraForm.psira_expiry_date}
                      onChange={(e) => setPsiraForm({ ...psiraForm, psira_expiry_date: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>

                <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded-lg">
                  <strong>Important:</strong> Ensure your PSIRA registration is always up to date. You will not be assigned to shifts if your PSIRA is expired.
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
                >
                  Update PSIRA Information
                </button>
              </form>
            )}

            {/* Certificates Tab */}
            {activeTab === "certificates" && (
              <div className="space-y-4">
                <p className="text-gray-300">
                  Upload your certificates to keep your profile up to date.
                </p>

                <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center">
                  <div className="text-5xl mb-4">📄</div>
                  <p className="text-white font-semibold mb-2">Upload Certificate</p>
                  <p className="text-gray-400 text-sm mb-4">
                    Drag and drop files here, or click to browse
                  </p>
                  <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition">
                    Browse Files
                  </button>
                </div>

                <div className="text-gray-400 text-sm">
                  <p>Supported file types: PDF, JPG, PNG (Max 5MB)</p>
                  <p className="mt-1">Accepted certificates: Training certificates, qualifications, licenses</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
