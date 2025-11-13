"use client";

import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 lg:ml-0">
        <TopHeader />
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
