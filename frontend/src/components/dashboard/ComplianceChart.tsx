"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ComplianceChartProps {
    data: { name: string; value: number; color: string }[];
    score: number;
}

import { useTheme } from '@/context/ThemeContext';

export default function ComplianceChart({ data, score }: ComplianceChartProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div className="glass-panel p-6 rounded-2xl border border-white/5 h-full flex flex-col">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Compliance Health</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Certification & PSIRA Status</p>
            </div>

            <div className="flex-1 relative min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
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
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Score */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-slate-900 dark:text-white">{score}%</span>
                    <span className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">Score</span>
                </div>
            </div>

            <div className="mt-4 space-y-2">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white">{item.value}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
