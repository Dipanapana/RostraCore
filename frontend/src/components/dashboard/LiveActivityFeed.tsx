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
                return <AlertTriangle className="w-4 h-4 text-red-500" />;
            case "success":
                return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case "warning":
                return <Clock className="w-4 h-4 text-amber-500" />;
            default:
                return <UserPlus className="w-4 h-4 text-blue-500" />;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case "alert":
                return "bg-red-50 border-red-200";
            case "success":
                return "bg-emerald-50 border-emerald-200";
            case "warning":
                return "bg-amber-50 border-amber-200";
            default:
                return "bg-blue-50 border-blue-200";
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Live Activity</h3>
                    <p className="text-gray-500 text-sm">Real-time system events</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs text-emerald-600 font-medium">Live</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {activities.map((activity) => (
                    <div
                        key={activity.id}
                        className={`p-3 rounded-xl border ${getBgColor(
                            activity.type
                        )} flex items-start gap-3 transition-all`}
                    >
                        <div className="mt-0.5">{getIcon(activity.type)}</div>
                        <div className="flex-1">
                            <p className="text-sm text-gray-800 leading-snug">{activity.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
