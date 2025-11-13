"use client";

import { useState, useEffect } from "react";

interface Employee {
  employee_id: number;
  first_name: string;
  last_name: string;
  email: string;
  system_role: string | null;
  can_login: boolean;
  login_email: string | null;
  login_enabled: boolean;
  permissions: string[];
  last_login: string | null;
}

interface AvailablePermission {
  key: string;
  label: string;
}

interface RolePermissions {
  role: string;
  permissions: AvailablePermission[];
}

export default function EmployeePermissionsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesWithAccess, setEmployeesWithAccess] = useState<Employee[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<RolePermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isAssigningRole, setIsAssigningRole] = useState(false);

  const [formData, setFormData] = useState({
    system_role: "employee" as "admin" | "supervisor" | "employee",
    can_login: true,
    login_email: "",
    permissions: [] as string[],
    password: "",
  });

  const organizationId = 1; // TODO: Get from auth context

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all employees
      const employeesResponse = await fetch(
        `http://localhost:8000/api/v1/employees?organization_id=${organizationId}`
      );
      const employeesData = await employeesResponse.json();
      setEmployees(employeesData);

      // Fetch employees with access
      const accessResponse = await fetch(
        `http://localhost:8000/api/v1/employee-permissions/employees/with-access?organization_id=${organizationId}`
      );
      const accessData = await accessResponse.json();
      setEmployeesWithAccess(accessData);

      // Fetch available permissions
      const permissionsResponse = await fetch(
        "http://localhost:8000/api/v1/employee-permissions/available-permissions"
      );
      const permissionsData = await permissionsResponse.json();
      setAvailablePermissions(permissionsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("❌ Failed to load employee data");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedEmployee) return;

    try {
      // Assign role
      const roleResponse = await fetch(
        "http://localhost:8000/api/v1/employee-permissions/employees/assign-role",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employee_id: selectedEmployee.employee_id,
            system_role: formData.system_role,
            can_login: formData.can_login,
            login_email: formData.login_email || selectedEmployee.email,
            permissions: formData.permissions,
          }),
        }
      );

      if (!roleResponse.ok) {
        const error = await roleResponse.json();
        throw new Error(error.detail || "Failed to assign role");
      }

      // Set password if provided
      if (formData.password) {
        const passwordResponse = await fetch(
          "http://localhost:8000/api/v1/employee-permissions/employees/set-password",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              employee_id: selectedEmployee.employee_id,
              password: formData.password,
            }),
          }
        );

        if (!passwordResponse.ok) {
          throw new Error("Role assigned but failed to set password");
        }
      }

      alert("✅ Employee role and permissions assigned successfully!");
      setIsAssigningRole(false);
      setSelectedEmployee(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error assigning role:", error);
      alert(`❌ ${error.message}`);
    }
  };

  const handleRevokeAccess = async (employeeId: number, employeeName: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${employeeName}?`)) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/employee-permissions/employees/${employeeId}/revoke-access`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to revoke access");
      }

      alert("✅ Employee access revoked successfully!");
      fetchData();
    } catch (error) {
      console.error("Error revoking access:", error);
      alert("❌ Failed to revoke access");
    }
  };

  const handleRoleChange = (role: "admin" | "supervisor" | "employee") => {
    setFormData({
      ...formData,
      system_role: role,
      permissions: [], // Reset permissions when role changes
    });
  };

  const handlePermissionToggle = (permissionKey: string) => {
    setFormData({
      ...formData,
      permissions: formData.permissions.includes(permissionKey)
        ? formData.permissions.filter((p) => p !== permissionKey)
        : [...formData.permissions, permissionKey],
    });
  };

  const resetForm = () => {
    setFormData({
      system_role: "employee",
      can_login: true,
      login_email: "",
      permissions: [],
      password: "",
    });
  };

  const getCurrentRolePermissions = (): AvailablePermission[] => {
    const rolePerms = availablePermissions.find((rp) => rp.role === formData.system_role);
    return rolePerms?.permissions || [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
        <div className="text-white text-center">Loading employees...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Employee Access Management</h1>
          <p className="text-gray-400">
            Grant selective login access to admins, supervisors, and employees
          </p>
        </div>

        {/* Assign Role Form */}
        {isAssigningRole && selectedEmployee && (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 mb-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">
              Assign Role: {selectedEmployee.first_name} {selectedEmployee.last_name}
            </h2>

            <div className="space-y-6">
              {/* Role Selection */}
              <div>
                <label className="block text-gray-300 mb-3 font-semibold">Select Role</label>
                <div className="grid md:grid-cols-3 gap-4">
                  {["admin", "supervisor", "employee"].map((role) => (
                    <button
                      key={role}
                      onClick={() => handleRoleChange(role as any)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.system_role === role
                          ? "border-blue-500 bg-blue-500/20 text-white"
                          : "border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500"
                      }`}
                    >
                      <div className="font-bold text-lg capitalize">{role}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {role === "admin" && "Full system access"}
                        {role === "supervisor" && "Manage shifts & reports"}
                        {role === "employee" && "View own data"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Login Email */}
              <div>
                <label className="block text-gray-300 mb-2 font-semibold">Login Email</label>
                <input
                  type="email"
                  value={formData.login_email || selectedEmployee.email || ""}
                  onChange={(e) => setFormData({ ...formData, login_email: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="employee@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-gray-300 mb-2 font-semibold">Set Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="Minimum 8 characters"
                  minLength={8}
                />
                <p className="text-gray-400 text-sm mt-1">
                  Employee will use this password to login to the system
                </p>
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-gray-300 mb-4 font-semibold">
                  Permissions for {formData.system_role} role
                </label>
                <div className="grid md:grid-cols-2 gap-3">
                  {getCurrentRolePermissions().map((permission) => (
                    <label
                      key={permission.key}
                      className="flex items-center space-x-3 text-gray-300 cursor-pointer bg-gray-700/50 p-3 rounded-lg hover:bg-gray-700 transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(permission.key)}
                        onChange={() => handlePermissionToggle(permission.key)}
                        className="w-5 h-5 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <span>{permission.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Allow Login Toggle */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.can_login}
                  onChange={(e) => setFormData({ ...formData, can_login: e.target.checked })}
                  className="w-5 h-5 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-300 font-semibold">Allow system login</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 mt-8">
              <button
                onClick={handleAssignRole}
                disabled={!formData.password}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign Role & Grant Access
              </button>
              <button
                onClick={() => {
                  setIsAssigningRole(false);
                  setSelectedEmployee(null);
                  resetForm();
                }}
                className="bg-gray-700 text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Employees WITH Access */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Employees with System Access ({employeesWithAccess.length})
            </h2>

            <div className="space-y-4">
              {employeesWithAccess.map((emp) => (
                <div
                  key={emp.employee_id}
                  className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {emp.first_name} {emp.last_name}
                      </h3>
                      <p className="text-gray-400 text-sm">{emp.login_email || emp.email}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        emp.system_role === "admin"
                          ? "bg-red-500/20 text-red-400"
                          : emp.system_role === "supervisor"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {emp.system_role?.toUpperCase()}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="text-gray-400 text-xs font-semibold mb-2">PERMISSIONS</div>
                    <div className="flex flex-wrap gap-2">
                      {emp.permissions.length > 0 ? (
                        emp.permissions.map((perm) => (
                          <span
                            key={perm}
                            className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded"
                          >
                            {perm}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500 text-sm">No specific permissions</span>
                      )}
                    </div>
                  </div>

                  {emp.last_login && (
                    <div className="text-sm text-gray-400 mb-4">
                      Last login: {new Date(emp.last_login).toLocaleString()}
                    </div>
                  )}

                  <button
                    onClick={() =>
                      handleRevokeAccess(emp.employee_id, `${emp.first_name} ${emp.last_name}`)
                    }
                    className="w-full bg-red-500/20 text-red-400 px-4 py-2 rounded-lg font-semibold hover:bg-red-500/30 transition-all"
                  >
                    Revoke Access
                  </button>
                </div>
              ))}

              {employeesWithAccess.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  No employees have been granted system access yet
                </div>
              )}
            </div>
          </div>

          {/* Employees WITHOUT Access */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Employees without Access (
              {employees.filter((e) => !employeesWithAccess.find((ea) => ea.employee_id === e.employee_id)).length})
            </h2>

            <div className="space-y-4">
              {employees
                .filter((e) => !employeesWithAccess.find((ea) => ea.employee_id === e.employee_id))
                .map((emp) => (
                  <div
                    key={emp.employee_id}
                    className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700"
                  >
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-white">
                        {emp.first_name} {emp.last_name}
                      </h3>
                      <p className="text-gray-400 text-sm">{emp.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setIsAssigningRole(true);
                        setFormData({
                          ...formData,
                          login_email: emp.email || "",
                        });
                      }}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all"
                    >
                      Grant System Access
                    </button>
                  </div>
                ))}

              {employees.filter((e) => !employeesWithAccess.find((ea) => ea.employee_id === e.employee_id))
                .length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  All employees have been granted system access
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
