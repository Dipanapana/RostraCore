"use client";

import { Search, Mail, Bell, Command } from "lucide-react";
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function TopHeader() {
  return (
    <header className="sticky top-0 z-30 px-6 py-4">
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-white/5 px-4 py-3 flex items-center justify-between shadow-lg backdrop-blur-xl bg-white/80 dark:bg-slate-900/50">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
            <input
              type="text"
              placeholder="Search anything..."
              className="w-full pl-10 pr-12 py-2 bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-xl text-sm text-slate-900 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5">
              <Command className="w-3 h-3 text-slate-600 dark:text-slate-400" />
              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">K</span>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3 ml-6">
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
