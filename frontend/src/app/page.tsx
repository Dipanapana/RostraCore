"use client";

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import PricingSection from '@/components/PricingSection'

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
            <span className="text-white font-medium">{user?.username}</span>
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
        <div className="text-center max-w-5xl mx-auto">
          {/* Logo + Tagline */}
          <div className="mb-8">
            <div className="text-lg font-bold text-white mb-2">GUARDIANOS</div>
            <div className="text-sm text-white/60">Security Workforce Management for South Africa</div>
          </div>

          {/* Main Headline - Clear Value Proposition */}
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight animate-fadeIn">
            Professional Roster Management
            <br />
            <span className="text-blue-400">for Security Companies</span>
          </h1>

          {/* Subheadline - Specific, Honest */}
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            Automated shift scheduling, PSIRA compliance tracking, and workforce management
            <br className="hidden md:block" />
            built specifically for South African security operations
          </p>

          {/* Single, Clear CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
            <Link
              href="/register"
              className="group px-10 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full font-bold text-white text-lg overflow-hidden transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/50 flex items-center gap-2"
            >
              Request Access
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>

            <a
              href="#pricing"
              className="px-10 py-4 backdrop-blur-md bg-white/10 border-2 border-white/30 rounded-full font-bold text-white text-lg hover:bg-white/20 transition-all hover:scale-105"
            >
              View Pricing
            </a>
          </div>

          {/* Trust Signals - Honest, No Fake Numbers */}
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-white/70 mb-12 animate-fadeIn" style={{ animationDelay: '0.6s' }}>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              PSIRA-Aligned
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              BCEA-Compliant
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              POPIA-Certified
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5z" />
              </svg>
              South African Owned
            </span>
          </div>

          {/* Registration Process Preview */}
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 max-w-3xl mx-auto animate-fadeIn" style={{ animationDelay: '0.8s' }}>
            <h3 className="text-xl font-bold text-white mb-6">Getting Started</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div>
                <div className="text-3xl font-bold text-blue-400 mb-2">1</div>
                <div className="text-sm font-bold text-white mb-1">Register Company</div>
                <div className="text-xs text-white/60">Provide company details & PSIRA number</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-400 mb-2">2</div>
                <div className="text-sm font-bold text-white mb-1">Verification</div>
                <div className="text-xs text-white/60">Email verification + company review (24-48hrs)</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-400 mb-2">3</div>
                <div className="text-sm font-bold text-white mb-1">Start Managing</div>
                <div className="text-xs text-white/60">Add guards, create rosters, track compliance</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          SECTION 2: CORE BENEFITS
      ======================================== */}
      <div className="relative z-10 px-6 py-20 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Everything You Need to Manage Your Security Workforce
            </h2>
            <p className="text-xl text-white/70">
              Six core features. No complexity. No hidden costs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Roster Generation */}
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-xl font-bold text-white mb-3">Roster Generation</h3>
              <p className="text-white/70 text-sm mb-4">
                AI-powered roster generation considering skills, availability, and compliance requirements
              </p>
              <ul className="space-y-2 text-sm text-white/60">
                <li>• Custom shift templates</li>
                <li>• Fair hour distribution</li>
                <li>• BCEA compliance checks</li>
              </ul>
            </div>

            {/* Employee Management */}
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-bold text-white mb-3">Employee Management</h3>
              <p className="text-white/70 text-sm mb-4">
                Complete guard profiles with skills, certifications, and availability tracking
              </p>
              <ul className="space-y-2 text-sm text-white/60">
                <li>• Bulk import/export</li>
                <li>• Skills matrix</li>
                <li>• Leave management</li>
              </ul>
            </div>

            {/* Site Management */}
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="text-4xl mb-4">🏢</div>
              <h3 className="text-xl font-bold text-white mb-3">Site & Client Management</h3>
              <p className="text-white/70 text-sm mb-4">
                Manage all your client sites and their specific security requirements
              </p>
              <ul className="space-y-2 text-sm text-white/60">
                <li>• Site profiles</li>
                <li>• Required certifications</li>
                <li>• Contact management</li>
              </ul>
            </div>

            {/* Shift Management */}
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="text-4xl mb-4">⏰</div>
              <h3 className="text-xl font-bold text-white mb-3">Shift Management</h3>
              <p className="text-white/70 text-sm mb-4">
                Define and manage shift patterns, hours, and requirements
              </p>
              <ul className="space-y-2 text-sm text-white/60">
                <li>• Flexible scheduling</li>
                <li>• Shift swaps</li>
                <li>• Overtime tracking</li>
              </ul>
            </div>

            {/* Certification Tracking */}
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-white mb-3">Certification Tracking</h3>
              <p className="text-white/70 text-sm mb-4">
                Automatic alerts for expiring PSIRA certifications and compliance documents
              </p>
              <ul className="space-y-2 text-sm text-white/60">
                <li>• 30-day expiry alerts</li>
                <li>• Document storage</li>
                <li>• Compliance reporting</li>
              </ul>
            </div>

            {/* Analytics */}
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-white mb-3">Basic Analytics</h3>
              <p className="text-white/70 text-sm mb-4">
                Simple dashboards to track your operations and workforce utilization
              </p>
              <ul className="space-y-2 text-sm text-white/60">
                <li>• Shift fill rates</li>
                <li>• Guard utilization</li>
                <li>• Cost summaries</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          SECTION 3: PRICING
      ======================================== */}
      <div id="pricing">
        <PricingSection />
      </div>

      {/* ========================================
          SECTION 4: WHY GUARDIANOS
      ======================================== */}
      <div className="relative z-10 px-6 py-20 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Built for South African Security Companies
            </h2>
            <p className="text-xl text-white/70">
              Local regulations. Local support. Local commitment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">🇿🇦</div>
              <h4 className="text-xl font-bold text-white mb-4">South African</h4>
              <p className="text-white/70 text-sm">
                Developed in South Africa with deep understanding of local security industry requirements and regulations
              </p>
            </div>

            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h4 className="text-xl font-bold text-white mb-4">Secure & Reliable</h4>
              <p className="text-white/70 text-sm">
                Bank-level encryption, daily backups, and secure data hosting. Your data stays in South Africa.
              </p>
            </div>

            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">📞</div>
              <h4 className="text-xl font-bold text-white mb-4">Local Support</h4>
              <p className="text-white/70 text-sm">
                Real support from South Africans in SA time zones. Email and phone support Mon-Fri 8am-6pm SAST.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          SECTION 5: FINAL CTA
      ======================================== */}
      <div className="relative z-10 px-6 py-20 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Modernize Your Security Operations?
          </h2>
          <p className="text-xl text-white/70 mb-8">
            Request access and we'll review your application within 24-48 hours
          </p>

          {/* Primary CTA */}
          <Link
            href="/register"
            className="inline-flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full font-bold text-white text-xl hover:scale-105 transition-all hover:shadow-2xl hover:shadow-blue-500/50 mb-6"
          >
            Request Access
          </Link>

          <div className="text-sm text-white/60 mb-8">
            Company verification required • PSIRA registration validated
          </div>

          {/* Contact Option */}
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8">
            <h3 className="text-lg font-bold text-white mb-4">Have Questions?</h3>
            <p className="text-white/70 mb-4">
              Contact us for more information or to discuss your specific requirements
            </p>
            <a
              href="mailto:hello@guardianos.co.za"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              hello@guardianos.co.za
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 px-6 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <p className="text-white/50 text-sm mb-2">
              © 2025 GuardianOS (Pty) Ltd. All rights reserved.
            </p>
            <p className="text-white/40 text-xs">
              Professional workforce management software for the South African security industry
            </p>
          </div>
          <div className="flex justify-center gap-6 text-white/60 text-sm">
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            <Link href="/register" className="hover:text-white transition-colors">Register</Link>
            <a href="mailto:hello@guardianos.co.za" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </main>
  )
}
