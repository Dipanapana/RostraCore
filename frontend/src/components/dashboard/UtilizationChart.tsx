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

interface UtilizationChartProps {
    data: any[];
}

export default function UtilizationChart({ data }: UtilizationChartProps) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-full">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Workforce Utilization</h3>
                    <p className="text-gray-500 text-sm">Employee deployment vs. Capacity</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-xs text-gray-500">Deployed</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                        <span className="text-xs text-gray-500">Capacity</span>
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#94a3b8"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#94a3b8"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
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
                        <Area
                            type="monotone"
                            dataKey="capacity"
                            stroke="#cbd5e1"
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
