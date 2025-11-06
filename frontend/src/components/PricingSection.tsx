"use client";

import { useState } from 'react';
import Link from 'next/link';

interface PricingTier {
  name: string;
  price: number;
  annualPrice: number;
  description: string;
  savings: string;
  maxGuards: string;
  features: string[];
  popular?: boolean;
  cta: string;
  ctaLink: string;
}

const tiers: PricingTier[] = [
  {
    name: 'STARTER',
    price: 499,
    annualPrice: 479,
    description: '1-30 guards',
    savings: 'Save ~R15K/mo',
    maxGuards: 'Up to 30 guards',
    features: [
      'Unlimited shifts',
      'AI roster generator',
      'PSIRA & BCEA compliance',
      'Dashboard analytics',
      'Export (CSV, Excel, PDF)',
      'Email support'
    ],
    cta: 'Start Free Trial',
    ctaLink: '/login'
  },
  {
    name: 'PROFESSIONAL',
    price: 1299,
    annualPrice: 1039,
    description: '30-100 guards',
    savings: 'Save ~R40K/mo',
    maxGuards: 'Up to 100 guards',
    features: [
      'Everything in STARTER, plus:',
      'Multi-user access (5 users)',
      'WhatsApp integration',
      'SMS notifications',
      'Mobile app access',
      'Bulk imports',
      'Payroll integration',
      'Auto-fill replacements'
    ],
    popular: true,
    cta: 'Start Free Trial',
    ctaLink: '/login'
  },
  {
    name: 'BUSINESS',
    price: 2999,
    annualPrice: 2399,
    description: '100-300 guards',
    savings: 'Save ~R120K/mo',
    maxGuards: 'Up to 300 guards',
    features: [
      'Everything in PROFESSIONAL, plus:',
      'Priority support',
      'Custom branding',
      'API access',
      'Advanced analytics',
      'Multi-branch management',
      '10 users included',
      'Phone support'
    ],
    cta: 'Start Free Trial',
    ctaLink: '/login'
  },
  {
    name: 'ENTERPRISE',
    price: 0,
    annualPrice: 0,
    description: '300+ guards',
    savings: 'Custom ROI analysis',
    maxGuards: 'Unlimited guards',
    features: [
      'Everything in BUSINESS, plus:',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'White-label option',
      'Onsite training',
      '24/7 phone support',
      'Unlimited users'
    ],
    cta: 'Contact Sales',
    ctaLink: '/login'
  }
];

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  const calculateSavings = (price: number, annualPrice: number) => {
    const monthlySavings = price - annualPrice;
    const annualSavings = monthlySavings * 12;
    return annualSavings;
  };

  return (
    <div className="relative z-10 px-6 py-20 border-t border-white/10">
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-white mb-4">
            Simple, Honest Pricing
          </h2>
          <p className="text-xl text-white/70 mb-8">
            No hidden fees. No per-user charges. No surprises.
            <br />
            Choose your plan, cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center backdrop-blur-md bg-white/10 border border-white/20 rounded-full p-1">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2 rounded-full transition-all ${
                !isAnnual ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' : 'text-white/70'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2 rounded-full transition-all ${
                isAnnual ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' : 'text-white/70'
              }`}
            >
              Annual <span className="text-green-400 font-semibold">(Save 20%)</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier, idx) => (
            <div
              key={idx}
              className={`relative backdrop-blur-md bg-white/5 border rounded-2xl p-6 hover:bg-white/10 transition-all ${
                tier.popular
                  ? 'border-blue-500 ring-2 ring-blue-500/50 scale-105'
                  : 'border-white/10'
              }`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold px-4 py-1 rounded-full">
                  ⭐ MOST POPULAR
                </div>
              )}

              {/* Tier Name */}
              <div className="text-center mb-6">
                <h3 className="text-sm font-bold text-white/60 mb-2">{tier.name}</h3>

                {/* Price */}
                <div className="mb-2">
                  {tier.price === 0 ? (
                    <div className="text-4xl font-bold text-white">Custom</div>
                  ) : (
                    <>
                      <div className="text-5xl font-bold text-white">
                        R{isAnnual ? tier.annualPrice.toLocaleString() : tier.price.toLocaleString()}
                      </div>
                      <div className="text-white/60 text-sm">per month</div>
                      {isAnnual && tier.price !== 0 && (
                        <div className="text-green-400 text-xs font-semibold mt-1">
                          Save R{calculateSavings(tier.price, tier.annualPrice).toLocaleString()}/year
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Savings */}
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg px-3 py-2 mb-2">
                  <div className="text-green-300 font-bold text-lg">{tier.savings}</div>
                </div>

                {/* Description */}
                <div className="text-white/70 text-sm font-medium">{tier.description}</div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {tier.features.map((feature, fIdx) => (
                  <li key={fIdx} className="flex items-start gap-2 text-white/80 text-sm">
                    <span className="text-green-400 flex-shrink-0 mt-0.5">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link
                href={tier.ctaLink}
                className={`block w-full text-center px-6 py-3 rounded-full font-bold transition-all hover:scale-105 ${
                  tier.popular
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-xl hover:shadow-blue-500/50'
                    : 'border border-white/30 text-white hover:bg-white/10'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Below Pricing Info */}
        <div className="mt-12 text-center space-y-4">
          <p className="text-white/60 text-sm">
            ✓ No credit card required for 14-day trial &nbsp;&nbsp;
            ✓ Cancel anytime &nbsp;&nbsp;
            ✓ POPIA compliant &nbsp;&nbsp;
            ✓ Local SA support
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-2"
            >
              📊 Take 1-minute plan quiz →
            </Link>
            <span className="text-white/40">|</span>
            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-2"
            >
              💬 Questions? Chat with us or call 010 880 1234
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
