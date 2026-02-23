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
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-slide-up h-full"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Critical Alerts</h3>
                    <p className="text-gray-500 text-sm">Requires attention</p>
                </div>
                {hasAlerts ? (
                    <button className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
                        Dismiss All
                    </button>
                ) : null}
            </div>

            <div className="space-y-3">
                {metrics?.certifications.expiring_soon ? (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-amber-700 font-medium text-sm">Certifications Expiring</h4>
                            <p className="text-gray-600 text-xs mt-1 leading-relaxed">
                                <span className="text-gray-900 font-bold">{metrics.certifications.expiring_soon}</span> employee certifications require renewal within 30 days.
                            </p>
                            <Link
                                href="/certifications"
                                className="text-xs text-amber-600 hover:text-amber-500 mt-2 inline-flex items-center gap-1 font-medium group"
                            >
                                Review Certifications
                                <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                            </Link>
                        </div>
                    </div>
                ) : null}

                {metrics?.shifts.unassigned ? (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-red-700 font-medium text-sm">Unassigned Shifts</h4>
                            <p className="text-gray-600 text-xs mt-1 leading-relaxed">
                                <span className="text-gray-900 font-bold">{metrics.shifts.unassigned}</span> shifts are currently unassigned. Immediate action required.
                            </p>
                            <Link
                                href="/roster"
                                className="text-xs text-red-600 hover:text-red-500 mt-2 inline-flex items-center gap-1 font-medium group"
                            >
                                Assign Shifts
                                <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                            </Link>
                        </div>
                    </div>
                ) : null}

                {!hasAlerts && (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        </div>
                        <p className="text-gray-700 font-medium">All systems operational</p>
                        <p className="text-xs text-gray-400 mt-1">No critical alerts at this time</p>
                    </div>
                )}
            </div>
        </div>
    );
}
