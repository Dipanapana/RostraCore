"use client";

import { Upload, MapPin, Zap } from 'lucide-react';

const steps = [
    {
        step: '1',
        icon: Upload,
        title: 'Add Your Guards',
        description: 'Import employee profiles, certifications, and availability in minutes.',
    },
    {
        step: '2',
        icon: MapPin,
        title: 'Set Site Requirements',
        description: 'Define sites, PSIRA grades needed, and shift patterns per location.',
    },
    {
        step: '3',
        icon: Zap,
        title: 'Generate in 60 Seconds',
        description: 'AI assigns the right guard to every shift. Review, adjust, and export.',
    },
];

export default function HowItWorks() {
    return (
        <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-14">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        How It Works
                    </h2>
                    <p className="text-lg text-gray-600">
                        Get your security operation running in three simple steps
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                    {steps.map((item) => (
                        <div key={item.step} className="text-center group">
                            <div className="relative mx-auto mb-5">
                                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                                    <item.icon className="w-7 h-7" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border-2 border-blue-600 text-blue-600 text-xs font-bold flex items-center justify-center shadow-sm">
                                    {item.step}
                                </div>
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 mb-2">{item.title}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{item.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
