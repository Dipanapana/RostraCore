"use client";

import Link from 'next/link';
import { Check } from 'lucide-react';

const plans = [
    {
        name: "Basic",
        price: "1,499",
        description: "Essential tools for small security companies",
        features: [
            "Up to 50 security guards",
            "Automated roster generation",
            "PSIRA certification tracking",
            "Basic payroll export",
            "Email support"
        ],
        highlight: false
    },
    {
        name: "Professional",
        price: "3,499",
        description: "Advanced management for growing fleets",
        features: [
            "Up to 200 security guards",
            "Everything in Basic",
            "Billable hours tracking",
            "Client portal access",
            "Priority email & phone support"
        ],
        highlight: true
    },
    {
        name: "Enterprise",
        price: "7,999",
        description: "Full control for large-scale operations",
        features: [
            "Unlimited security guards",
            "Everything in Professional",
            "Custom API integrations",
            "Dedicated account manager",
            "SLA guarantees"
        ],
        highlight: false
    }
];

export default function Pricing() {
    return (
        <section id="pricing" className="py-24 relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
                        Simple, Transparent Pricing
                    </h2>
                    <p className="text-lg text-slate-600">
                        Choose the plan that fits your scale. No hidden fees.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className={`relative rounded-2xl p-8 transition-all duration-300 ${plan.highlight
                                ? 'glass-panel border-2 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.15)] transform md:-translate-y-4'
                                : 'glass-card border border-white/5 hover:border-white/10'
                                }`}
                        >
                            {plan.highlight && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                                    Most Popular
                                </div>
                            )}

                            <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                            <p className="text-slate-600 mb-6 text-sm">{plan.description}</p>

                            <div className="mb-8">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm text-slate-600">R</span>
                                    <span className="text-5xl font-bold text-slate-900">{plan.price}</span>
                                    <span className="text-slate-600">/mo</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Excluding VAT</p>
                            </div>

                            <Link
                                href="/register"
                                className={`block w-full py-3 px-6 rounded-xl text-center font-bold transition-all ${plan.highlight
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/25'
                                    : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                                    }`}
                            >
                                Start Free Trial
                            </Link>

                            <div className="mt-8 space-y-4">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className={`mt-1 p-0.5 rounded-full ${plan.highlight ? 'bg-blue-500/20' : 'bg-slate-800'}`}>
                                            <Check className={`w-3 h-3 ${plan.highlight ? 'text-blue-400' : 'text-slate-400'}`} />
                                        </div>
                                        <span className="text-sm text-slate-700">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
