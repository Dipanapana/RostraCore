"use client";

import { Calendar, Users, Shield, Briefcase, Calculator, Clock } from 'lucide-react';

const features = [
    {
        icon: Calendar,
        title: "Automated Roster Generation",
        description: "Generate optimal shift schedules in minutes using our AI-driven algorithm that considers availability and certifications.",
        color: "blue"
    },
    {
        icon: Users,
        title: "Guard Management",
        description: "Centralized database for all your security officers. Track performance, history, and client assignments.",
        color: "indigo"
    },
    {
        icon: Shield,
        title: "PSIRA Compliance",
        description: "Never miss a renewal. Automated tracking and alerts for PSIRA certifications and firearm competencies.",
        color: "emerald"
    },
    {
        icon: Briefcase,
        title: "Client & Site Management",
        description: "Organize contracts by site. Set specific billing rates and requirements for each location.",
        color: "purple"
    },
    {
        icon: Calculator,
        title: "Payroll Integration",
        description: "Automatically calculate hours worked, overtime, and Sunday time. Export directly to your payroll system.",
        color: "pink"
    },
    {
        icon: Clock,
        title: "Time & Attendance",
        description: "Real-time tracking of guard attendance. GPS-verified clock-ins and exception reporting.",
        color: "cyan"
    }
];

export default function Features() {
    return (
        <section id="features" className="py-24 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
                        Everything You Need to <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                            Secure Your Operations
                        </span>
                    </h2>
                    <p className="text-lg text-slate-600">
                        Powerful tools designed specifically for the unique challenges of the South African security industry.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="glass-card p-8 rounded-2xl hover:bg-white/5 transition-all duration-300 group border border-white/5 hover:border-blue-500/30"
                        >
                            <div className={`w-14 h-14 rounded-xl bg-${feature.color}-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-${feature.color}-500/20`}>
                                <feature.icon className={`w-7 h-7 text-${feature.color}-400`} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                                {feature.title}
                            </h3>
                            <p className="text-slate-600 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
