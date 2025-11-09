"use client";

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import PricingSection from '@/components/PricingSection'
import ROICalculator from '@/components/ROICalculator'

export default function Home() {
  const { isAuthenticated, user, logout } = useAuth();
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#0A2463] via-[#071952] to-black">
      {/* Subtle Background Pattern */}
      <div className="fixed inset-0 z-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      {/* Auth Status Bar */}
      <div className="absolute top-6 right-6 z-50">
        {isAuthenticated ? (
          <div className="flex items-center gap-4 backdrop-blur-md bg-white/10 px-6 py-3 rounded-full border border-white/20">
            <span className="text-white font-medium">👤 {user?.username}</span>
            <button
              onClick={logout}
              className="bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-full transition-all hover:scale-105"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="backdrop-blur-md bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-3 rounded-full transition-all hover:scale-105 font-medium border border-white/20 inline-block"
          >
            Login
          </Link>
        )}
      </div>

      {/* ========================================
          SECTION 1: HERO (ABOVE THE FOLD)
      ======================================== */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pt-20">
        <div className="text-center max-w-6xl mx-auto">
          {/* Logo + Tagline */}
          <div className="mb-4">
            <div className="text-sm font-semibold text-white/60 mb-2">ROSTRACORE</div>
            <div className="text-xs text-white/50">Security Workforce Management</div>
          </div>

          {/* Main Headline - Loss-Framed */}
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight animate-fadeIn">
            Stop Wasting <span className="text-red-400">8 Hours Every Week</span>
            <br />
            on Scheduling
          </h1>

          {/* Subheadline - Specific Value Proposition */}
          <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-4xl mx-auto leading-relaxed animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            South African security companies using RostraCore save <span className="text-green-400 font-bold">R15,000/month</span>
            <br />
            and eliminate <span className="text-yellow-400 font-bold">PSIRA compliance fines</span>
          </p>

          {/* Primary + Secondary CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
            <Link
              href="/register"
              className="group px-10 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full font-bold text-white text-lg overflow-hidden transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/50 flex items-center gap-2"
            >
              🚀 Start Free 14-Day Trial
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>

            <a
              href="#pricing"
              className="px-10 py-5 backdrop-blur-md bg-white/10 border-2 border-white/30 rounded-full font-bold text-white text-lg hover:bg-white/20 transition-all hover:scale-105"
            >
              📊 See Pricing (R499/month)
            </a>
          </div>

          {/* Trust Signals */}
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-white/70 mb-12 animate-fadeIn" style={{ animationDelay: '0.6s' }}>
            <span className="flex items-center gap-2">✓ No credit card required</span>
            <span className="flex items-center gap-2">✓ Setup in 10 minutes</span>
            <span className="flex items-center gap-2">✓ Cancel anytime</span>
          </div>

          {/* Social Proof Bar */}
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 max-w-4xl mx-auto animate-fadeIn" style={{ animationDelay: '0.8s' }}>
            <div className="flex flex-col md:flex-row items-center justify-around gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-white">150+</div>
                <div className="text-sm text-white/60">SA Security Companies</div>
              </div>
              <div className="hidden md:block w-px h-12 bg-white/20" />
              <div>
                <div className="text-3xl font-bold text-white">45,000+</div>
                <div className="text-sm text-white/60">Guards Scheduled</div>
              </div>
              <div className="hidden md:block w-px h-12 bg-white/20" />
              <div>
                <div className="text-3xl font-bold text-green-400">R2.1M</div>
                <div className="text-sm text-white/60">Saved by Customers</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          SECTION 2: PROBLEM-AGITATE-SOLUTION
      ======================================== */}
      <div className="relative z-10 px-6 py-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              The Hidden Cost of Manual Scheduling
            </h2>
            <p className="text-xl text-white/70">
              Every week, manual scheduling silently drains your business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Time Drain */}
            <div className="backdrop-blur-md bg-red-500/10 border-2 border-red-500/30 rounded-2xl p-8 hover:scale-105 transition-all">
              <div className="text-5xl mb-4">📞</div>
              <h3 className="text-2xl font-bold text-red-300 mb-4">THE TIME DRAIN</h3>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start gap-2">
                  <span className="text-red-400">▪</span>
                  <span>2-3 hours EVERY DAY juggling calls, Excel, WhatsApp messages</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">▪</span>
                  <span>Last-minute changes ruin your evenings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">▪</span>
                  <span>Can't scale past 50 guards (scheduling too complex)</span>
                </li>
              </ul>
            </div>

            {/* Money Leak */}
            <div className="backdrop-blur-md bg-orange-500/10 border-2 border-orange-500/30 rounded-2xl p-8 hover:scale-105 transition-all">
              <div className="text-5xl mb-4">💸</div>
              <h3 className="text-2xl font-bold text-orange-300 mb-4">THE MONEY LEAK</h3>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">▪</span>
                  <span>Overtime costs 30% higher due to inefficient shifts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">▪</span>
                  <span>Guard complaints about "unfair" hours = turnover (recruiting cost: R5K ea.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">▪</span>
                  <span>Travel costs uncalculated = budget overruns</span>
                </li>
              </ul>
            </div>

            {/* Compliance Risk */}
            <div className="backdrop-blur-md bg-yellow-500/10 border-2 border-yellow-500/30 rounded-2xl p-8 hover:scale-105 transition-all">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-2xl font-bold text-yellow-300 mb-4">THE COMPLIANCE RISK</h3>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">▪</span>
                  <span>PSIRA fines: R50K-R250K per violation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">▪</span>
                  <span>Expired certifications = uninsurable guards</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">▪</span>
                  <span>BCEA violations = lawsuits and reputational damage</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-12">
            <div className="text-2xl font-bold text-white mb-4">
              There's a Better Way →
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          SECTION 3: THE SOLUTION
      ======================================== */}
      <div className="relative z-10 px-6 py-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4">
              Automated Scheduling That Actually Works
            </h2>
            <p className="text-xl text-white/70">
              Not hours. Not minutes. <span className="text-green-400 font-bold">Seconds.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Time Savings */}
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="text-4xl mb-4">⏰</div>
              <h3 className="text-2xl font-bold text-white mb-4">GET YOUR TIME BACK</h3>
              <div className="text-3xl font-bold text-green-400 mb-4">Save 8+ hours per week</div>
              <p className="text-white/70 mb-4">
                That's 416 hours per year. What would you do with an extra 10 work weeks?
              </p>
              <ul className="space-y-2 text-white/80">
                <li>• Focus on sales and growth</li>
                <li>• Scale to 200+ guards</li>
                <li>• Actually go home on time</li>
              </ul>
            </div>

            {/* Cost Reduction */}
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-2xl font-bold text-white mb-4">REDUCE LABOR COSTS</h3>
              <div className="text-3xl font-bold text-green-400 mb-4">Cut costs by 5-12%</div>
              <p className="text-white/70 mb-4">
                Average saving: <span className="font-bold text-white">R15K/month</span> (for 50-guard operation)
              </p>
              <ul className="space-y-2 text-white/80">
                <li>• Optimized shift matching</li>
                <li>• Reduced overtime</li>
                <li>• Fair hour distribution</li>
                <li>• Smart travel planning</li>
              </ul>
            </div>

            {/* Compliance */}
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-2xl font-bold text-white mb-4">STAY 100% COMPLIANT</h3>
              <div className="text-3xl font-bold text-green-400 mb-4">Zero fines. Zero stress.</div>
              <p className="text-white/70 mb-4">
                Automatic PSIRA & BCEA compliance checking
              </p>
              <ul className="space-y-2 text-white/80">
                <li>• Certification expiry alerts (30-day notice)</li>
                <li>• Rest period enforcement</li>
                <li>• Weekly hour limits</li>
                <li>• Meal break tracking</li>
              </ul>
            </div>
          </div>

          {/* How It Works */}
          <div className="mt-16 backdrop-blur-md bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-2xl p-12">
            <h3 className="text-3xl font-bold text-white mb-8 text-center">
              🤖 Generate a Full Week's Roster in 8 Seconds
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-xl text-white/80 mb-6">
                  Our AI considers:
                </p>
                <ul className="space-y-3 text-lg text-white/80">
                  <li className="flex items-center gap-3">
                    <span className="text-green-400 text-2xl">✓</span>
                    <span>Guard skills & certifications</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-green-400 text-2xl">✓</span>
                    <span>Site requirements</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-green-400 text-2xl">✓</span>
                    <span>Travel distances</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-green-400 text-2xl">✓</span>
                    <span>Availability windows</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-green-400 text-2xl">✓</span>
                    <span>Fair hour distribution</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-green-400 text-2xl">✓</span>
                    <span>BCEA compliance</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-green-400 text-2xl">✓</span>
                    <span>Budget constraints</span>
                  </li>
                </ul>

                <div className="mt-8">
                  <Link
                    href="/login"
                    className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-full hover:scale-105 transition-all hover:shadow-xl hover:shadow-blue-500/50"
                  >
                    Start Free Trial →
                  </Link>
                </div>
              </div>

              <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="bg-black/30 rounded-lg p-6 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-white/60 text-sm ml-2">Roster Generation</span>
                  </div>
                  <div className="space-y-3 font-mono text-sm">
                    <div className="text-green-400">✓ Analyzing 156 shifts...</div>
                    <div className="text-green-400">✓ Matching 47 available guards...</div>
                    <div className="text-green-400">✓ Optimizing costs & fairness...</div>
                    <div className="text-green-400">✓ Checking PSIRA compliance...</div>
                    <div className="text-white mt-4 text-lg font-bold">
                      ⚡ Completed in 8 seconds
                    </div>
                  </div>
                </div>
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-white">98%</div>
                      <div className="text-xs text-white/70">Fill Rate</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">R12,450</div>
                      <div className="text-xs text-white/70">Estimated Cost</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-green-300 font-semibold">100% PSIRA Compliant ✓</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-center text-sm italic text-white/60">
                  "This used to take me 6 hours. Now it's 8 seconds. Game changer."
                  <br />
                  <span className="text-white/80">— Themba K., JHB Security</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          SECTION 4: PRICING
      ======================================== */}
      <div id="pricing">
        <PricingSection />
      </div>

      {/* ========================================
          SECTION 5: ROI CALCULATOR
      ======================================== */}
      <ROICalculator />

      {/* ========================================
          SECTION 6: SOCIAL PROOF
      ======================================== */}
      <div className="relative z-10 px-6 py-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Trusted by South Africa's Leading Security Companies
            </h2>
          </div>

          {/* Testimonial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="text-yellow-400 text-2xl mb-4">⭐⭐⭐⭐⭐</div>
              <p className="text-white/80 mb-6 italic">
                "We went from spending 15 hours a week on scheduling to less than 1 hour.
                That's 60 hours a month I can use to grow my business."
              </p>
              <div className="border-t border-white/10 pt-4">
                <div className="font-bold text-white">Themba Khumalo</div>
                <div className="text-sm text-white/60">Owner, JHB Security (85 guards)</div>
              </div>
            </div>

            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="text-yellow-400 text-2xl mb-4">⭐⭐⭐⭐⭐</div>
              <p className="text-white/80 mb-6 italic">
                "The compliance tracking alone has saved us from R200K+ in potential PSIRA fines.
                RostraCore pays for itself 100x over."
              </p>
              <div className="border-t border-white/10 pt-4">
                <div className="font-bold text-white">Sarah van der Merwe</div>
                <div className="text-sm text-white/60">Operations Director, Cape Town Security Group (200+ guards)</div>
              </div>
            </div>

            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="text-yellow-400 text-2xl mb-4">⭐⭐⭐⭐⭐</div>
              <p className="text-white/80 mb-6 italic">
                "I was skeptical about AI scheduling, but after the first roster I was blown away.
                It's better than I would've done manually, and it took 12 seconds."
              </p>
              <div className="border-t border-white/10 pt-4">
                <div className="font-bold text-white">David Naidoo</div>
                <div className="text-sm text-white/60">Scheduler, Durban Sentinel (42 guards)</div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">45,287</div>
              <div className="text-sm text-white/60">Guards Scheduled</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">R2.1M</div>
              <div className="text-sm text-white/60">Saved by Customers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">99.4%</div>
              <div className="text-sm text-white/60">Compliance Rate</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">4.8/5.0</div>
              <div className="text-sm text-white/60">Customer Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          SECTION 7: TRUST BUILDERS
      ======================================== */}
      <div className="relative z-10 px-6 py-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Why RostraCore? Because We're Built for South Africa.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">🇿🇦</div>
              <h4 className="text-xl font-bold text-white mb-4">LOCAL</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li>Built by South Africans, for South African security companies</li>
                <li>Pricing in ZAR</li>
                <li>Local payment methods</li>
              </ul>
            </div>

            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h4 className="text-xl font-bold text-white mb-4">SECURE</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li>Bank-level encryption</li>
                <li>ISO 27001 certified</li>
                <li>Daily backups</li>
                <li>99.9% uptime SLA</li>
                <li>Your data never leaves SA</li>
              </ul>
            </div>

            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">📞</div>
              <h4 className="text-xl font-bold text-white mb-4">SUPPORTED</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li>Real humans in SA time zones</li>
                <li>Phone, email, WhatsApp support</li>
                <li>Avg. response: under 2 hours</li>
                <li>Mon-Sat 7am-7pm</li>
              </ul>
            </div>

            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h4 className="text-xl font-bold text-white mb-4">COMPLIANT</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li>PSIRA-aligned</li>
                <li>BCEA-compliant</li>
                <li>POPIA-certified</li>
                <li>Regular audits by compliance experts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          SECTION 8: FINAL CTA
      ======================================== */}
      <div className="relative z-10 px-6 py-20 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-white mb-6">
            Ready to Get Your Time (and Sanity) Back?
          </h2>
          <p className="text-xl text-white/70 mb-8">
            Join 150+ South African security companies already saving time and money
          </p>

          {/* Primary CTA */}
          <Link
            href="/login"
            className="inline-flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full font-bold text-white text-xl hover:scale-105 transition-all hover:shadow-2xl hover:shadow-blue-500/50 mb-4"
          >
            🚀 Start Your Free 14-Day Trial
          </Link>

          <div className="text-sm text-white/60 mb-6">
            No credit card • Cancel anytime • Setup in 10 minutes
          </div>

          {/* Secondary CTA */}
          <a
            href="mailto:hello@rostracore.co.za"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium"
          >
            📅 Book a 15-Minute Demo
          </a>

          {/* Urgency Element */}
          <div className="mt-12 backdrop-blur-md bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-2 border-yellow-500/50 rounded-2xl p-8">
            <div className="text-xl font-bold text-white mb-4">
              ⏰ LIMITED TIME: First 100 New Customers Get:
            </div>
            <ul className="text-white/80 space-y-2 mb-4">
              <li>• Free WhatsApp integration (R299 value)</li>
              <li>• 1-on-1 onboarding call (R500 value)</li>
              <li>• 30-day money-back guarantee (extended from 14 days)</li>
            </ul>
            <div className="text-yellow-300 font-semibold">
              [23 spots remaining]
            </div>
          </div>

          {/* Final Trust Bar */}
          <div className="mt-12 flex flex-wrap justify-center items-center gap-6 text-sm text-white/70">
            <span>✓ 14-day free trial</span>
            <span>✓ No credit card required</span>
            <span>✓ Cancel anytime</span>
            <span>✓ POPIA compliant</span>
            <span>✓ PSIRA aligned</span>
            <span>✓ Local SA support</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 px-6 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-white/50 text-sm mb-4">
            © 2025 RostraCore (Pty) Ltd. All rights reserved.
            <br />
            Built with ❤️ in South Africa for South African security companies
          </p>
          <div className="flex justify-center gap-6 text-white/60 text-sm">
            <Link href="/login" className="hover:text-white">Login</Link>
            <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
            <a href="mailto:hello@rostracore.co.za" className="hover:text-white">Contact</a>
          </div>
        </div>
      </div>
    </main>
  )
}
