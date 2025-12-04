import { LucideIcon, ArrowUp, ArrowDown, Minus } from "lucide-react";

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        label: string;
        direction: "up" | "down" | "neutral";
    };
    color?: "blue" | "green" | "purple" | "orange" | "red";
    delay?: number;
}

export default function MetricCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    color = "blue",
    delay = 0,
}: MetricCardProps) {
    const colorStyles = {
        blue: "from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/20",
        green: "from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/20",
        purple: "from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/20",
        orange: "from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/20",
        red: "from-red-500/20 to-red-600/5 text-red-400 border-red-500/20",
    };

    const iconBgStyles = {
        blue: "bg-blue-500/20 text-blue-400",
        green: "bg-emerald-500/20 text-emerald-400",
        purple: "bg-purple-500/20 text-purple-400",
        orange: "bg-amber-500/20 text-amber-400",
        red: "bg-red-500/20 text-red-400",
    };

    return (
        <div
            className={`glass-panel p-6 rounded-2xl relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 animate-slide-up`}
            style={{ animationDelay: `${delay}ms` }}
        >
            {/* Background Gradient */}
            <div
                className={`absolute inset-0 bg-gradient-to-br ${colorStyles[color]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
            />

            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                        {value}
                    </h3>
                    {subtitle && (
                        <p className="text-slate-600 dark:text-slate-400 text-xs">{subtitle}</p>
                    )}

                    {trend && (
                        <div className="flex items-center gap-1.5 mt-3">
                            <span
                                className={`flex items-center text-xs font-bold px-1.5 py-0.5 rounded ${trend.direction === "up"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : trend.direction === "down"
                                        ? "bg-red-500/10 text-red-400"
                                        : "bg-slate-500/10 text-slate-400"
                                    }`}
                            >
                                {trend.direction === "up" && <ArrowUp className="w-3 h-3 mr-0.5" />}
                                {trend.direction === "down" && <ArrowDown className="w-3 h-3 mr-0.5" />}
                                {trend.direction === "neutral" && <Minus className="w-3 h-3 mr-0.5" />}
                                {Math.abs(trend.value)}%
                            </span>
                            <span className="text-slate-600 text-xs">{trend.label}</span>
                        </div>
                    )}
                </div>

                <div className={`p-3 rounded-xl ${iconBgStyles[color]} transition-transform group-hover:scale-110 duration-300`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
}
