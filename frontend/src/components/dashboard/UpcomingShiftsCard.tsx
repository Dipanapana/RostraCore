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
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-slide-up h-full"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Upcoming Shifts</h3>
                    <p className="text-gray-500 text-sm">Next 24 hours</p>
                </div>
                <Link
                    href="/shifts"
                    className="text-xs font-medium text-blue-600 hover:text-blue-500 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 transition-colors"
                >
                    View All
                </Link>
            </div>

            <div className="space-y-3">
                {shifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <Clock className="w-10 h-10 mb-3 opacity-30" />
                        <p className="text-gray-500">No upcoming shifts scheduled.</p>
                    </div>
                ) : (
                    shifts.map((shift) => (
                        <div
                            key={shift.shift_id}
                            className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200 group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-gray-900 font-medium text-sm">{shift.site_name}</p>
                                    <p className="text-xs text-gray-500">{shift.employee_name}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-900 text-sm font-medium font-mono">
                                    {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${shift.status === 'assigned'
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-600 border border-amber-200'
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
