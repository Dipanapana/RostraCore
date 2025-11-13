"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function PricingSection() {
  const [guardCount, setGuardCount] = useState(50);

  const calculateMonthly = (guards: number) => guards * 45;
  const calculateAnnual = (guards: number) => guards * 45 * 12;

  return (
    <div className="relative z-10 px-6 py-20 border-t border-white/10">
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-white/70 mb-4">
            One clear rate. No hidden fees. No surprises.
          </p>
          <p className="text-lg text-white/60">
            Only pay for active guards on your roster
          </p>
        </div>

        {/* Main Pricing Card */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="backdrop-blur-md bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30 rounded-3xl p-10 relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-transparent rounded-full blur-3xl"></div>

            <div className="relative z-10">
              {/* Price Per Guard */}
              <div className="text-center mb-8">
                <div className="text-white/70 text-sm font-medium mb-2">Per Guard, Per Month</div>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-6xl md:text-7xl font-bold text-white">R45</span>
                  <div className="text-left">
                    <div className="text-white/80 text-sm">per guard</div>
                    <div className="text-white/60 text-xs">per month</div>
                  </div>
                </div>
                <p className="text-white/70 text-sm max-w-xl mx-auto">
                  Pay only for the guards actively managed on your platform.
                  <br />No setup fees. No user limits. No hidden costs.
                </p>
              </div>

              {/* Interactive Calculator */}
              <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-8 mb-8">
                <h4 className="text-lg font-bold text-white mb-6 text-center">Calculate Your Monthly Cost</h4>

                {/* Slider */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-white/80 text-sm">Number of Guards:</label>
                    <span className="text-2xl font-bold text-white">{guardCount}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    step="10"
                    value={guardCount}
                    onChange={(e) => setGuardCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(6, 182, 212) ${((guardCount - 10) / 290) * 100}%, rgba(255,255,255,0.2) ${((guardCount - 10) / 290) * 100}%, rgba(255,255,255,0.2) 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-2">
                    <span>10</span>
                    <span>300</span>
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-white/20">
                    <span className="text-white/70">{guardCount} guards × R45/month</span>
                    <span className="text-2xl font-bold text-white" suppressHydrationWarning>
                      R{calculateMonthly(guardCount).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/60">Annual cost (12 months)</span>
                    <span className="text-white/80" suppressHydrationWarning>
                      R{calculateAnnual(guardCount).toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mt-4">
                    <div className="text-center">
                      <div className="text-xs text-green-300 mb-1">Cost Per Guard Per Day</div>
                      <div className="text-2xl font-bold text-green-400">R1.50</div>
                      <div className="text-xs text-green-300/70 mt-1">Less than a cup of coffee!</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Included */}
              <div className="mb-8">
                <h4 className="text-center text-white font-bold mb-6">Everything Included</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/80 text-sm">AI Roster Generation</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/80 text-sm">Employee Management</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/80 text-sm">Site & Client Management</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/80 text-sm">Shift Scheduling</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/80 text-sm">PSIRA Compliance Tracking</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/80 text-sm">Basic Analytics Dashboard</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/80 text-sm">Unlimited Admin Users</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/80 text-sm">Email Support</span>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="text-center">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-full hover:scale-105 transition-all hover:shadow-xl hover:shadow-blue-500/50"
                >
                  Request Access
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <p className="text-white/60 text-sm mt-4">
                  Company verification required • 24-48 hour approval
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="text-3xl mb-2">💳</div>
            <h4 className="text-white font-bold mb-2">No Setup Fees</h4>
            <p className="text-white/60 text-sm">Start immediately after approval with zero setup costs</p>
          </div>

          <div className="text-center">
            <div className="text-3xl mb-2">📊</div>
            <h4 className="text-white font-bold mb-2">Scale Up or Down</h4>
            <p className="text-white/60 text-sm">Add or remove guards anytime. Pay only for active guards.</p>
          </div>

          <div className="text-center">
            <div className="text-3xl mb-2">🔒</div>
            <h4 className="text-white font-bold mb-2">No Contracts</h4>
            <p className="text-white/60 text-sm">Cancel anytime. No long-term commitments required.</p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">Pricing Questions</h3>
          <div className="space-y-4">
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6">
              <h4 className="text-white font-bold mb-2">What counts as an "active guard"?</h4>
              <p className="text-white/70 text-sm">
                Any guard profile in your system that you're actively scheduling and managing. You can deactivate guards who leave or are on extended leave to stop being charged for them.
              </p>
            </div>

            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6">
              <h4 className="text-white font-bold mb-2">How is billing calculated?</h4>
              <p className="text-white/70 text-sm">
                We count your active guards at the end of each month and bill you R45 per guard. For example, if you have 50 active guards, your monthly bill is R2,250.
              </p>
            </div>

            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6">
              <h4 className="text-white font-bold mb-2">Are there any other fees?</h4>
              <p className="text-white/70 text-sm">
                No. The R45 per guard per month includes everything - unlimited admin users, full feature access, email support, and all updates. No hidden fees.
              </p>
            </div>

            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6">
              <h4 className="text-white font-bold mb-2">What if I need more features?</h4>
              <p className="text-white/70 text-sm">
                Contact us at hello@guardianos.co.za to discuss custom requirements, integrations, or additional features for your specific needs.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Signals */}
        <div className="mt-12 text-center">
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-white/60">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              POPIA Compliant
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Secure Payment Processing
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              South African Company
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}
