"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { rolePermissionsApi } from "@/services/api";

interface PermissionsContextType {
  permissions: string[];
  hasPermission: (key: string) => boolean;
  permissionsLoaded: boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: [],
  hasPermission: () => false,
  permissionsLoaded: false,
  refreshPermissions: async () => {},
});

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const fetchPermissions = useCallback(async () => {
    if (!isAuthenticated) {
      setPermissions([]);
      setPermissionsLoaded(false);
      return;
    }
    try {
      const res = await rolePermissionsApi.getMyPermissions();
      setPermissions(res.data.permissions || []);
    } catch {
      // Fall back — if endpoint unavailable, give no permissions (admin/company_admin handled by role)
      setPermissions([]);
    } finally {
      setPermissionsLoaded(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPermissions();
    } else {
      setPermissions([]);
      setPermissionsLoaded(false);
    }
  }, [isAuthenticated, user, fetchPermissions]);

  const hasPermission = useCallback(
    (key: string): boolean => {
      if (!user) return false;
      // Full-access roles always pass
      const role = user.role?.toLowerCase();
      if (role === "admin" || role === "company_admin" || role === "superadmin") {
        return true;
      }
      return permissions.includes(key);
    },
    [user, permissions]
  );

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        hasPermission,
        permissionsLoaded,
        refreshPermissions: fetchPermissions,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
