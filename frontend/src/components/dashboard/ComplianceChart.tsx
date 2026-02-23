"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ComplianceChartProps {
    data: { name: string; value: number; color: string }[];
    score: number;
}

export default function ComplianceChart({ data, score }: ComplianceChartProps) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-full flex flex-col">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Compliance Health</h3>
                <p className="text-gray-500 text-sm">Certification & PSIRA Status</p>
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
                                backgroundColor: "rgba(255, 255, 255, 0.95)",
                                border: "1px solid #e2e8f0",
                                borderRadius: "12px",
                                color: "#0f172a",
                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                            }}
                            itemStyle={{ color: "#0f172a" }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Score */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-gray-900">{score}%</span>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Score</span>
                </div>
            </div>

            <div className="mt-4 space-y-2">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-gray-600">{item.name}</span>
                        </div>
                        <span className="font-medium text-gray-900">{item.value}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
