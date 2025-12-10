"use client";

import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import MobileBottomNav from "./MobileBottomNav";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200">
      <Sidebar />
      <main className="flex-1 lg:ml-0 relative">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10">
          <TopHeader />
          {/* Add bottom padding on mobile for the bottom nav */}
          <div className="p-6 lg:p-8 pb-24 lg:pb-8">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
