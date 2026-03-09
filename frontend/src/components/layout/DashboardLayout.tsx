"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import { useAuth } from "@/context/AuthContext";
import { canAccessRoute, UserRole } from "@/config/permissions";

const FULL_ACCESS_ROLES: UserRole[] = ["admin", "company_admin", "superadmin"];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const role = (user?.role?.toLowerCase() ?? "guard") as UserRole;
  const isFullAccess = FULL_ACCESS_ROLES.includes(role);

  useEffect(() => {
    if (user && !isFullAccess && !canAccessRoute(role, pathname)) {
      router.push("/dashboard");
    }
  }, [user, pathname, role, isFullAccess, router]);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <Sidebar />
      <main id="main-content" className="flex-1 min-w-0 relative">
        <div className="relative z-10">
          <TopHeader />
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
