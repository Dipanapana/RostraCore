import Link from "next/link";
import { Clock } from "lucide-react";

interface UpcomingShift {
    shift_id: number;
    start_time: string;
    end_time: string;
    site_name: string;
    employee_name: string;
    status: string;
    required_skill: string;
}

interface UpcomingShiftsCardProps {
    shifts: UpcomingShift[];
    delay?: number;
}

export default function UpcomingShiftsCard({ shifts, delay = 0 }: UpcomingShiftsCardProps) {
    return (
        <div
            className="glass-panel p-6 rounded-2xl animate-slide-up h-full"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Upcoming Shifts</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">Next 24 hours</p>
                </div>
                <Link
                    href="/shifts"
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 transition-colors"
                >
                    View All
                </Link>
            </div>

            <div className="space-y-3">
                {shifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-600">
                        <Clock className="w-10 h-10 mb-3 opacity-20" />
                        <p>No upcoming shifts scheduled.</p>
                    </div>
                ) : (
                    shifts.map((shift) => (
                        <div
                            key={shift.shift_id}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border border-slate-200 dark:border-white/5 group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-slate-900 dark:text-white font-medium text-sm">{shift.site_name}</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">{shift.employee_name}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-slate-900 dark:text-white text-sm font-medium font-mono">
                                    {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${shift.status === 'assigned'
                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                    : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                                    }`}>
                                    {shift.status}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
