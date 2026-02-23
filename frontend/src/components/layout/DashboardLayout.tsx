"use client";

import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <Sidebar />
      <main className="flex-1 min-w-0 relative">
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
