import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface AlertsCardProps {
    metrics: {
        certifications: { expiring_soon: number; expired: number };
        shifts: { unassigned: number };
    } | null;
    delay?: number;
}

export default function AlertsCard({ metrics, delay = 0 }: AlertsCardProps) {
    const hasAlerts = metrics?.certifications.expiring_soon || metrics?.shifts.unassigned;

    return (
        <div
            className="glass-panel p-6 rounded-2xl animate-slide-up h-full"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Critical Alerts</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">Requires attention</p>
                </div>
                {hasAlerts ? (
                    <button className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        Dismiss All
                    </button>
                ) : null}
            </div>

            <div className="space-y-3">
                {metrics?.certifications.expiring_soon ? (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/15 transition-colors">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-amber-700 dark:text-amber-400 font-medium text-sm">Certifications Expiring</h4>
                            <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                                <span className="text-slate-900 dark:text-white font-bold">{metrics.certifications.expiring_soon}</span> employee certifications require renewal within 30 days.
                            </p>
                            <Link
                                href="/certifications"
                                className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 mt-2 inline-flex items-center gap-1 font-medium group"
                            >
                                Review Certifications
                                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                            </Link>
                        </div>
                    </div>
                ) : null}

                {metrics?.shifts.unassigned ? (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/15 transition-colors">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-red-700 dark:text-red-400 font-medium text-sm">Unassigned Shifts</h4>
                            <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                                <span className="text-slate-900 dark:text-white font-bold">{metrics.shifts.unassigned}</span> shifts are currently unassigned. Immediate action required.
                            </p>
                            <Link
                                href="/roster"
                                className="text-xs text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 mt-2 inline-flex items-center gap-1 font-medium group"
                            >
                                Assign Shifts
                                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                            </Link>
                        </div>
                    </div>
                ) : null}

                {!hasAlerts && (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-600">
                        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-emerald-600/50 dark:text-emerald-500/50" />
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium">All systems operational</p>
                        <p className="text-xs text-slate-600 dark:text-slate-600 mt-1">No critical alerts at this time</p>
                    </div>
                )}
            </div>
        </div>
    );
}
