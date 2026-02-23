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
    const iconBgStyles = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-emerald-50 text-emerald-600",
        purple: "bg-purple-50 text-purple-600",
        orange: "bg-amber-50 text-amber-600",
        red: "bg-red-50 text-red-600",
    };

    return (
        <div
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative overflow-hidden group transition-all duration-300 hover:shadow-md animate-slide-up"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
                        {value}
                    </h3>
                    {subtitle && (
                        <p className="text-gray-500 text-xs">{subtitle}</p>
                    )}

                    {trend && (
                        <div className="flex items-center gap-1.5 mt-3">
                            <span
                                className={`flex items-center text-xs font-bold px-1.5 py-0.5 rounded ${trend.direction === "up"
                                    ? "bg-emerald-50 text-emerald-600"
                                    : trend.direction === "down"
                                        ? "bg-red-50 text-red-600"
                                        : "bg-gray-100 text-gray-500"
                                    }`}
                            >
                                {trend.direction === "up" && <ArrowUp className="w-3 h-3 mr-0.5" />}
                                {trend.direction === "down" && <ArrowDown className="w-3 h-3 mr-0.5" />}
                                {trend.direction === "neutral" && <Minus className="w-3 h-3 mr-0.5" />}
                                {Math.abs(trend.value)}%
                            </span>
                            <span className="text-gray-500 text-xs">{trend.label}</span>
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
