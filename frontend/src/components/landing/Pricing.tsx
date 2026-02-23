"use client";

import Link from 'next/link';
import { Check, Shield, Zap, Users } from 'lucide-react';

const features = [
    "AI-powered roster optimization",
    "PSIRA grade enforcement",
    "BCEA compliance checks",
    "Automated payroll calculation",
    "Multi-site management",
    "Shift pattern templates",
    "Advanced reporting",
    "Email & phone support",
];

export default function Pricing() {
    return (
        <section id="pricing" className="py-24 relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
                        Simple, Per-Guard Pricing
                    </h2>
                    <p className="text-lg text-gray-600">
                        Pay only for active guards. No hidden fees. Cancel anytime.
                    </p>
                </div>

                {/* Single Pricing Card */}
                <div className="max-w-lg mx-auto">
                    <div className="relative rounded-3xl p-10 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-500 shadow-[0_0_60px_rgba(59,130,246,0.2)]">
                        {/* Badge */}
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-1.5 rounded-full text-sm font-bold shadow-lg">
                            14-Day Free Trial
                        </div>

                        {/* Price */}
                        <div className="text-center mb-8 pt-4">
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-2xl text-gray-600">R</span>
                                <span className="text-7xl font-bold text-gray-900">29</span>
                            </div>
                            <p className="text-xl text-gray-600 mt-2">per guard / month</p>
                            <p className="text-sm text-gray-500 mt-1">Excluding VAT</p>
                        </div>

                        {/* CTA Button */}
                        <Link
                            href="/register"
                            className="block w-full py-4 px-6 rounded-xl text-center font-bold text-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] mb-8"
                        >
                            Start Free Trial
                        </Link>

                        {/* Features Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {features.map((feature, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="mt-0.5 p-1 rounded-full bg-blue-500/20">
                                        <Check className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <span className="text-sm text-gray-700">{feature}</span>
                                </div>
                            ))}
                        </div>

                        {/* Trust Signals */}
                        <div className="mt-8 pt-8 border-t border-blue-200">
                            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-blue-500" />
                                    <span>PSIRA Compliant</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-blue-500" />
                                    <span>60-Second Rosters</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-500" />
                                    <span>Unlimited Sites</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Money Back Guarantee */}
                    <p className="text-center text-sm text-gray-500 mt-6">
                        No credit card required for trial • Cancel anytime
                    </p>
                </div>
            </div>
        </section>
    );
}
