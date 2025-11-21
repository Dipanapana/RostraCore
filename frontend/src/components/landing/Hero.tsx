"use client";

import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function Hero() {
    return (
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px] animate-pulse-glow" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse-glow delay-300" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left: Content */}
                    <div className="text-center lg:text-left">
                        {/* Trust Badge */}
                        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-8 animate-slide-up">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Built for South African Security Companies</span>
                        </div>

                        {/* Headline */}
                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-slate-900 mb-6 leading-tight animate-slide-up delay-100">
                            Security Management <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                                Reimagined
                            </span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-lg sm:text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0 animate-slide-up delay-200">
                            Automate rosters, track PSIRA compliance, and manage your workforce with military-grade precision. The all-in-one platform for modern security operations.
                        </p>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-slide-up delay-300">
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] border border-blue-500/50 group"
                            >
                                Start 14-Day Free Trial
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <a
                                href="#features"
                                className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-bold text-lg text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all"
                            >
                                View Features
                            </a>
                        </div>

                        {/* Trust Signals */}
                        <div className="mt-12 flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-4 text-sm text-slate-500 animate-slide-up delay-300">
                            {['PSIRA Compliant', 'POPIA Certified', 'South African Owned'].map((item) => (
                                <div key={item} className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Visual */}
                    <div className="relative lg:h-[600px] flex items-center justify-center animate-float">
                        <div className="relative w-full max-w-lg aspect-square">
                            {/* Abstract Dashboard Representation */}
                            <div className="absolute inset-0 bg-white rounded-3xl border-2 border-slate-200 p-6 transform rotate-3 hover:rotate-0 transition-all duration-500 shadow-2xl hover:shadow-3xl">
                                <div className="h-full w-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl overflow-hidden relative border border-slate-200">
                                    {/* Header Bar */}
                                    <div className="h-14 border-b border-slate-200 flex items-center px-5 gap-2.5 bg-white">
                                        <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-lg shadow-red-500/30" />
                                        <div className="w-3.5 h-3.5 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/30" />
                                        <div className="w-3.5 h-3.5 rounded-full bg-green-500 shadow-lg shadow-green-500/30" />
                                    </div>
                                    {/* Content Mockup */}
                                    <div className="p-6 space-y-4">
                                        <div className="flex gap-4">
                                            <div className="w-1/3 h-24 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 shadow-md" />
                                            <div className="w-1/3 h-24 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 shadow-md" />
                                            <div className="w-1/3 h-24 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 shadow-md" />
                                        </div>
                                        <div className="h-40 rounded-xl bg-white border-2 border-slate-200 shadow-md" />
                                        <div className="space-y-2">
                                            <div className="h-8 w-3/4 rounded-lg bg-white border border-slate-200 shadow-sm" />
                                            <div className="h-8 w-1/2 rounded-lg bg-white border border-slate-200 shadow-sm" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Elements */}
                            <div className="absolute -top-6 -right-6 bg-white p-5 rounded-2xl animate-float delay-100 shadow-2xl border-2 border-emerald-500/30 hover:border-emerald-500/50 transition-all hover:scale-105">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                        <ShieldCheck className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-600 font-medium">Compliance Status</p>
                                        <p className="text-base font-bold text-emerald-600">100% Verified</p>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute -bottom-6 -left-6 bg-white p-5 rounded-2xl animate-float delay-200 shadow-2xl border-2 border-blue-500/30 hover:border-blue-500/50 transition-all hover:scale-105">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                        <CheckCircle2 className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-600 font-medium">Active Guards</p>
                                        <p className="text-base font-bold text-blue-600">Shift Active</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
