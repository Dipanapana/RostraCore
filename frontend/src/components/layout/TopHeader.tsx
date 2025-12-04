"use client";

import { Mail, Bell } from "lucide-react";
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function TopHeader() {
  return (
    <header className="sticky top-0 z-30 px-6 py-4">
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-white/5 px-4 py-3 flex items-center justify-end shadow-lg backdrop-blur-xl bg-white/80 dark:bg-slate-900/50">
        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Mail Icon */}
          <button className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white relative group">
            <Mail className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900" />
          </button>

          {/* Notification Bell */}
          <button className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white relative group">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
          </button>

          <div className="w-px h-8 bg-slate-200 dark:bg-white/5 mx-1" />

          {/* Date/Time (Optional "Smart" Feature) */}
          <div className="hidden md:block text-right mr-2">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
