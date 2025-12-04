"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { useTheme } from '@/context/ThemeContext';

interface UtilizationChartProps {
    data: any[];
}

export default function UtilizationChart({ data }: UtilizationChartProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div className="glass-panel p-6 rounded-2xl border border-white/5 h-full">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Workforce Utilization</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">Guard deployment vs. Capacity</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">Deployed</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">Capacity</span>
                    </div>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorDeployed" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke={isDark ? "#64748b" : "#94a3b8"}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke={isDark ? "#64748b" : "#94a3b8"}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: isDark ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.9)",
                                border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                                borderRadius: "12px",
                                color: isDark ? "#fff" : "#0f172a",
                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                            }}
                            itemStyle={{ color: isDark ? "#fff" : "#0f172a" }}
                        />
                        <Area
                            type="monotone"
                            dataKey="capacity"
                            stroke={isDark ? "#475569" : "#cbd5e1"}
                            strokeWidth={2}
                            fill="transparent"
                            strokeDasharray="5 5"
                        />
                        <Area
                            type="monotone"
                            dataKey="deployed"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorDeployed)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
