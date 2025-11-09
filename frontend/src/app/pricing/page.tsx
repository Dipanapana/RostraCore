"use client";

/**
 * RostraCore Pricing Page
 *
 * Bold pricing with clear value propositions
 * Features:
 * - Annual savings calculator
 * - Feature comparison table
 * - ROI calculator
 * - Social proof per plan
 * - Risk reversal messaging
 */

import React, { useState } from 'react';
import { Button, Card } from '@/design-system/components';
import Link from 'next/link';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [numberOfGuards, setNumberOfGuards] = useState(50);

  // ROI Calculator
  const calculateROI = (guards: number) => {
    const hoursPerWeek = 20; // Time saved on rostering
    const hourlyRate = 250; // Average admin hourly rate
    const overtimeSavings = 300 * guards; // R300 per guard per month
    const hiringTimeSaved = 2000; // Per hire

    const monthlySavings = {
      timeSavings: (hoursPerWeek * 4 * hourlyRate),
      overtimeSavings: overtimeSavings,
      hiringSavings: hiringTimeSaved,
    };

    return {
      monthly: monthlySavings.timeSavings + monthlySavings.overtimeSavings,
      annual: (monthlySavings.timeSavings + monthlySavings.overtimeSavings) * 12,
    };
  };

  const roi = calculateROI(numberOfGuards);

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      tagline: 'Perfect for small security companies',
      monthlyPrice: 499,
      annualPrice: 4990,
      maxEmployees: 25,
      maxSites: 5,
      maxClients: 3,
      maxSupervisors: 2,
      popular: false,
      features: {
        rostering: true,
        payroll: true,
        marketplace: true,
        analytics: false,
        api: false,
        bulkRostering: false,
        prioritySupport: false,
        customIntegrations: false,
      },
      testimonial: {
        quote: "RostraCore Starter was perfect for us. We're a small operation and it has everything we need.",
        author: "Thabo Ndlovu",
        company: "SafeGuard Security (18 guards)",
      },
    },
    {
      id: 'professional',
      name: 'Professional',
      tagline: 'For growing security companies',
      monthlyPrice: 999,
      annualPrice: 9990,
      maxEmployees: 100,
      maxSites: 20,
      maxClients: 10,
      maxSupervisors: 5,
      popular: true,
      savings: 'Save R2,388/year',
      features: {
        rostering: true,
        payroll: true,
        marketplace: true,
        analytics: true,
        api: false,
        bulkRostering: true,
        prioritySupport: true,
        customIntegrations: false,
      },
      testimonial: {
        quote: "We upgraded to Professional after 2 months. The AI rostering alone saved us 15 hours per week.",
        author: "Johan van Zyl",
        company: "SecureGuard Solutions (85 guards)",
      },
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      tagline: 'For large security operations',
      monthlyPrice: 2499,
      annualPrice: 24990,
      maxEmployees: null,
      maxSites: null,
      maxClients: null,
      maxSupervisors: null,
      popular: false,
      savings: 'Save R5,000/year',
      features: {
        rostering: true,
        payroll: true,
        marketplace: true,
        analytics: true,
        api: true,
        bulkRostering: true,
        prioritySupport: true,
        customIntegrations: true,
      },
      testimonial: {
        quote: "Enterprise plan with API access lets us integrate with our ERP. Complete visibility across all operations.",
        author: "Pieter Botha",
        company: "Elite Security (250+ guards)",
      },
    },
  ];

  const featureComparison = [
    { name: 'Rostering & Scheduling', key: 'rostering' },
    { name: 'Payroll Management', key: 'payroll' },
    { name: 'Marketplace Access', key: 'marketplace' },
    { name: 'Advanced Analytics', key: 'analytics' },
    { name: 'Bulk Rostering', key: 'bulkRostering' },
    { name: 'Priority Support', key: 'prioritySupport' },
    { name: 'API Access', key: 'api' },
    { name: 'Custom Integrations', key: 'customIntegrations' },
  ];

  const getPrice = (plan: typeof plans[0]) => {
    return billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  };

  const annualDiscount = (monthlyPrice: number, annualPrice: number) => {
    const monthlyTotal = monthlyPrice * 12;
    const savings = monthlyTotal - annualPrice;
    return Math.round((savings / monthlyTotal) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/landing" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <span className="text-xl font-bold text-gray-900">RostraCore</span>
            </Link>

            <nav className="flex items-center gap-6">
              <Link href="/landing" className="text-gray-600 hover:text-gray-900">
                Home
              </Link>
              <Link href="/admin/login" className="text-gray-600 hover:text-gray-900">
                Login
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-primary-500 to-accent-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-primary-100 mb-8 max-w-3xl mx-auto">
            No hidden fees. Cancel anytime. 14-day free trial on all plans.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center gap-4 bg-white rounded-2xl p-2 shadow-lg">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all relative ${
                billingCycle === 'annual'
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual
              <span className="absolute -top-2 -right-2 bg-success-500 text-white text-xs px-2 py-1 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 -mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                variant={plan.popular ? 'elevated' : 'default'}
                padding="lg"
                className={`relative ${
                  plan.popular ? 'ring-4 ring-accent-500 scale-105' : ''
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-accent-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                      MOST POPULAR
                    </div>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600">{plan.tagline}</p>
                </div>

                {/* Price - BOLD */}
                <div className="text-center mb-8">
                  <div className="flex items-start justify-center gap-1 mb-2">
                    <span className="text-3xl font-bold text-gray-900 mt-2">R</span>
                    <span className="text-7xl font-extrabold text-gray-900">
                      {getPrice(plan).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-600 text-lg">
                    per {billingCycle === 'monthly' ? 'month' : 'year'}
                  </p>
                  {billingCycle === 'annual' && (
                    <p className="text-success-600 font-semibold mt-2">
                      💰 {plan.savings}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">(excl. VAT)</p>
                </div>

                {/* CTA Button */}
                <Button
                  variant={plan.popular ? 'primary' : 'outline'}
                  size="lg"
                  fullWidth
                  className="mb-8"
                  onClick={() => {
                    window.location.href = plan.id === 'enterprise' ? '/contact' : '/signup';
                  }}
                >
                  {plan.id === 'enterprise' ? 'Contact Sales' : 'Start Free Trial'}
                </Button>

                {/* Limits */}
                <div className="space-y-3 mb-8 pb-8 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Employees</span>
                    <span className="font-bold text-gray-900">
                      {plan.maxEmployees ? `Up to ${plan.maxEmployees}` : 'Unlimited'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Sites</span>
                    <span className="font-bold text-gray-900">
                      {plan.maxSites ? `Up to ${plan.maxSites}` : 'Unlimited'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Clients</span>
                    <span className="font-bold text-gray-900">
                      {plan.maxClients ? `Up to ${plan.maxClients}` : 'Unlimited'}
                    </span>
                  </div>
                </div>

                {/* Features Checklist */}
                <ul className="space-y-4 mb-8">
                  {Object.entries(plan.features).map(([key, enabled]) => (
                    <li key={key} className="flex items-start gap-3">
                      {enabled ? (
                        <svg className="w-6 h-6 text-success-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-gray-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={enabled ? 'text-gray-700' : 'text-gray-400'}>
                        {featureComparison.find((f) => f.key === key)?.name}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Testimonial */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 italic mb-3">
                    "{plan.testimonial.quote}"
                  </p>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {plan.testimonial.author}
                    </p>
                    <p className="text-xs text-gray-600">
                      {plan.testimonial.company}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Calculate Your ROI
            </h2>
            <p className="text-xl text-gray-600">
              See how much you'll save with RostraCore
            </p>
          </div>

          <Card variant="elevated" padding="lg">
            <div className="mb-8">
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                How many guards do you manage?
              </label>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={numberOfGuards}
                onChange={(e) => setNumberOfGuards(Number(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <div className="flex justify-between mt-2">
                <span className="text-sm text-gray-600">10</span>
                <span className="text-2xl font-bold text-primary-500">
                  {numberOfGuards} guards
                </span>
                <span className="text-sm text-gray-600">500</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-danger-50 to-white rounded-2xl p-8 border-2 border-danger-200">
                <div className="text-sm text-danger-600 font-semibold mb-2">
                  WITHOUT ROSTRACORE
                </div>
                <div className="text-4xl font-extrabold text-danger-700 mb-4">
                  -R{roi.monthly.toLocaleString()}/mo
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="text-danger-500">✗</span>
                    20 hours/week on manual rostering
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-danger-500">✗</span>
                    Overtime violations & fines
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-danger-500">✗</span>
                    3 weeks to hire qualified guards
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-success-50 to-white rounded-2xl p-8 border-2 border-success-200">
                <div className="text-sm text-success-600 font-semibold mb-2">
                  WITH ROSTRACORE
                </div>
                <div className="text-4xl font-extrabold text-success-700 mb-4">
                  +R{roi.monthly.toLocaleString()}/mo
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="text-success-500">✓</span>
                    Generate rosters in 60 seconds
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-success-500">✓</span>
                    Zero overtime violations
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-success-500">✓</span>
                    Hire guards in 48 hours
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 text-center">
              <div className="bg-accent-50 rounded-xl p-6 border-2 border-accent-200">
                <div className="text-sm text-accent-700 font-semibold mb-2">
                  YOUR ANNUAL SAVINGS
                </div>
                <div className="text-5xl font-extrabold text-accent-700">
                  R{roi.annual.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  That's {Math.round(roi.annual / 999)}x the cost of Professional plan
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Compare Plans
            </h2>
            <p className="text-xl text-gray-600">
              Find the perfect plan for your security company
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Features
                    </th>
                    {plans.map((plan) => (
                      <th
                        key={plan.id}
                        className={`px-6 py-4 text-center ${
                          plan.popular ? 'bg-accent-50' : ''
                        }`}
                      >
                        <div className="text-lg font-bold text-gray-900">{plan.name}</div>
                        <div className="text-2xl font-extrabold text-primary-500 mt-2">
                          R{plan.monthlyPrice}
                        </div>
                        <div className="text-xs text-gray-600">/month</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {featureComparison.map((feature, index) => (
                    <tr key={feature.key} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {feature.name}
                      </td>
                      {plans.map((plan) => (
                        <td
                          key={plan.id}
                          className={`px-6 py-4 text-center ${
                            plan.popular ? 'bg-accent-50/50' : ''
                          }`}
                        >
                          {plan.features[feature.key as keyof typeof plan.features] ? (
                            <svg className="w-6 h-6 text-success-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                q: 'Can I change plans later?',
                a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate the difference.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards via PayFast, as well as EFT and direct debit for annual plans.',
              },
              {
                q: 'Is my data safe?',
                a: 'Absolutely. We use bank-level encryption, and all data stays in South Africa. We\'re ISO 27001 certified and POPIA compliant.',
              },
              {
                q: 'What happens after the 14-day trial?',
                a: 'You\'ll be automatically billed for your chosen plan. If you cancel before the trial ends, you won\'t be charged anything.',
              },
              {
                q: 'Do you offer refunds?',
                a: 'Yes. We offer a 30-day money-back guarantee on all annual plans. Monthly plans can be cancelled anytime.',
              },
            ].map((faq, index) => (
              <Card key={index} padding="lg">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-primary-500 to-accent-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-6">
            Ready to Transform Your Security Business?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Start your 14-day free trial. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => (window.location.href = '/signup')}
            >
              Start Free Trial
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => (window.location.href = '/contact')}
              className="!text-white !border-white hover:!bg-white hover:!text-primary-600"
            >
              Talk to Sales
            </Button>
          </div>
          <p className="text-primary-100 text-sm mt-6">
            Join 150+ security companies • Cancel anytime • Data stays in SA
          </p>
        </div>
      </section>
    </div>
  );
}
