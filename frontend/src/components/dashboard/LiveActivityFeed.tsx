import { AlertTriangle, CheckCircle2, UserPlus, Clock } from "lucide-react";

interface ActivityItem {
    id: string;
    type: "alert" | "success" | "info" | "warning";
    message: string;
    time: string;
}

interface LiveActivityFeedProps {
    activities: ActivityItem[];
}

export default function LiveActivityFeed({ activities }: LiveActivityFeedProps) {
    const getIcon = (type: string) => {
        switch (type) {
            case "alert":
                return <AlertTriangle className="w-4 h-4 text-red-400" />;
            case "success":
                return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
            case "warning":
                return <Clock className="w-4 h-4 text-amber-400" />;
            default:
                return <UserPlus className="w-4 h-4 text-blue-400" />;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case "alert":
                return "bg-red-500/10 border-red-500/20";
            case "success":
                return "bg-emerald-500/10 border-emerald-500/20";
            case "warning":
                return "bg-amber-500/10 border-amber-500/20";
            default:
                return "bg-blue-500/10 border-blue-500/20";
        }
    };

    return (
        <div className="glass-panel p-6 rounded-2xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Live Activity</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">Real-time system events</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Live</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {activities.map((activity) => (
                    <div
                        key={activity.id}
                        className={`p-3 rounded-xl border ${getBgColor(
                            activity.type
                        )} flex items-start gap-3 transition-all hover:bg-opacity-20`}
                    >
                        <div className="mt-0.5">{getIcon(activity.type)}</div>
                        <div className="flex-1">
                            <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">{activity.message}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{activity.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
