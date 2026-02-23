"use client";

import { ShieldCheck, Clock, Users, Building2 } from 'lucide-react';

const stats = [
    { icon: Users, value: "10,000+", label: "Guards Managed", color: "text-blue-600" },
    { icon: Building2, value: "500+", label: "Sites Secured", color: "text-indigo-600" },
    { icon: Clock, value: "< 60s", label: "Roster Generation", color: "text-emerald-600" },
    { icon: ShieldCheck, value: "100%", label: "PSIRA Compliant", color: "text-purple-600" },
];

export default function StatsStrip() {
    return (
        <section className="py-16 border-y border-gray-100 bg-gray-50/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map((stat, i) => (
                        <div key={i} className="text-center">
                            <div className="flex justify-center mb-3">
                                <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center">
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                            </div>
                            <p className={`text-3xl md:text-4xl font-bold ${stat.color}`}>{stat.value}</p>
                            <p className="text-sm text-gray-500 mt-1 font-medium">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
