"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Shield, Mail, Phone, MapPin, ArrowRight } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="relative bg-slate-50 pt-4 pb-12 border-t border-slate-200">
            {/* CTA Section */}
            <div className="relative w-full max-w-4xl mx-auto px-4 -mt-20 mb-16">
                <div className="glass-panel rounded-3xl p-8 md:p-12 text-center border border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.15)] overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />

                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                        Ready to Transform Your Security Operations?
                    </h2>
                    <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
                        Join forward-thinking security companies across South Africa. Start your 14-day free trial today.
                    </p>
                    <Link
                        href="/register"
                        className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:shadow-lg"
                    >
                        Get Started Now
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-4 gap-12 mb-12">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <Link href="/" className="flex items-center gap-3 mb-6">
                            <div className="relative h-10 w-40">
                                <Image
                                    src="/rostracore-logo.svg"
                                    alt="RostraCore"
                                    fill
                                    className="object-contain object-left"
                                />
                            </div>
                        </Link>
                        <p className="text-slate-600 max-w-sm leading-relaxed">
                            The premier workforce management platform built specifically for the South African security industry. PSIRA compliant, POPIA ready.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="text-slate-900 font-bold mb-6">Product</h4>
                        <ul className="space-y-4">
                            <li><a href="#features" className="text-slate-600 hover:text-blue-600 transition-colors">Features</a></li>
                            <li><a href="#pricing" className="text-slate-600 hover:text-blue-600 transition-colors">Pricing</a></li>
                            <li><Link href="/login" className="text-slate-600 hover:text-blue-600 transition-colors">Login</Link></li>
                            <li><Link href="/register" className="text-slate-600 hover:text-blue-600 transition-colors">Start Trial</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-slate-900 font-bold mb-6">Contact</h4>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-3 text-slate-600">
                                <Mail className="w-4 h-4 text-blue-600" />
                                <a href="mailto:support@rostracore.co.za" className="hover:text-slate-900 transition-colors">support@rostracore.co.za</a>
                            </li>
                            <li className="flex items-center gap-3 text-slate-600">
                                <Phone className="w-4 h-4 text-blue-600" />
                                <span>+27 (0) 11 123 4567</span>
                            </li>
                            <li className="flex items-center gap-3 text-slate-600">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                <span>Johannesburg, South Africa</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-slate-500 text-sm">
                        © 2025 RostraCore (Pty) Ltd. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-sm text-slate-500">
                        <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
