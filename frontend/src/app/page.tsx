"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER - Sticky Navigation */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          isScrolled
            ? 'bg-white shadow-md py-4'
            : 'bg-white py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">RostraCore</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-gray-600 hover:text-primary-500 font-medium transition-colors"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-gray-600 hover:text-primary-500 font-medium transition-colors"
              >
                Pricing
              </a>
              <a
                href="#about"
                className="text-gray-600 hover:text-primary-500 font-medium transition-colors"
              >
                About
              </a>
              <Link
                href="/login"
                className="text-gray-600 hover:text-primary-500 font-medium transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all hover:shadow-md"
              >
                Start Free Trial
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div>
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 bg-success-50 text-success-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Built for South African Security Companies
              </div>

              {/* Headline - Benefit Focused */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Manage Your Security Workforce in{' '}
                <span className="text-primary-500">Minutes, Not Hours</span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Automated roster generation, PSIRA compliance tracking, and workforce management built specifically for South African security companies.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:shadow-lg"
                >
                  Start 14-Day Free Trial
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center bg-white hover:bg-gray-50 text-primary-500 border-2 border-primary-500 px-8 py-4 rounded-lg font-semibold text-lg transition-all"
                >
                  View Pricing
                </a>
              </div>

              {/* Trust Signals */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>PSIRA Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>POPIA Certified</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>South African Owned</span>
                </div>
              </div>
            </div>

            {/* Right: Dashboard Screenshot */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-8 border-white">
                {/* Placeholder for dashboard screenshot */}
                <div className="aspect-video bg-gradient-to-br from-primary-50 to-gray-100 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-20 h-20 bg-primary-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 font-medium">RostraCore Dashboard</p>
                    <p className="text-sm text-gray-500 mt-2">See your security operations at a glance</p>
                  </div>
                </div>

                {/* PSIRA Badge Overlay */}
                <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                  <div className="w-8 h-8 bg-success-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">PSIRA Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-20 md:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Your Security Operations
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed for South African security companies
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1: Roster Generation */}
            <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-primary-500 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Automated Roster Generation
              </h3>
              <p className="text-gray-600 mb-4">
                Generate optimal shift schedules in minutes. Our algorithm considers guard availability, certifications, and site requirements.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Multi-guard shift assignments
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Recurring shift templates
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Pending/confirmed workflow
                </li>
              </ul>
            </div>

            {/* Feature 2: Employee Management */}
            <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-primary-500 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Guard Management
              </h3>
              <p className="text-gray-600 mb-4">
                Manage your entire security workforce from one central location. Track certifications, availability, and client assignments.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Complete guard profiles
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Availability tracking
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Client dedication
                </li>
              </ul>
            </div>

            {/* Feature 3: PSIRA Compliance */}
            <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-primary-500 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                PSIRA Certification Tracking
              </h3>
              <p className="text-gray-600 mb-4">
                Never miss a certification renewal. Automatic expiry alerts and compliance reporting keep you audit-ready.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  30-day expiry warnings
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Soft cert matching
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Compliance reports
                </li>
              </ul>
            </div>

            {/* Feature 4: Multi-Tenancy */}
            <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-primary-500 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Client & Site Management
              </h3>
              <p className="text-gray-600 mb-4">
                Organize your contracts by client and site. Track billable hours and manage multiple locations effortlessly.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Multi-client support
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Site-specific billing rates
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  GPS location tracking
                </li>
              </ul>
            </div>

            {/* Feature 5: Payroll */}
            <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-primary-500 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Payroll Calculations
              </h3>
              <p className="text-gray-600 mb-4">
                Accurate payroll based on shift assignments. Calculate hours, generate reports, and export for payment processing.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Shift-based calculations
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Per-employee reports
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  CSV exports
                </li>
              </ul>
            </div>

            {/* Feature 6: Billable Hours */}
            <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-primary-500 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Billable Hours Tracking
              </h3>
              <p className="text-gray-600 mb-4">
                Track billable hours per client and site. Generate invoicing reports with detailed breakdowns for accurate billing.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Per-client tracking
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Site-level breakdown
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Invoice-ready reports
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="py-20 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Get Started in 3 Simple Steps
            </h2>
            <p className="text-xl text-gray-600">
              From signup to your first roster in under 30 minutes
            </p>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {/* Step 1 */}
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 text-white rounded-full text-2xl font-bold mb-6">
                1
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Sign Up Free
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Create your account and start your 14-day free trial. No credit card required.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 text-white rounded-full text-2xl font-bold mb-6">
                2
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Add Your Guards
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Import your security guards, certifications, and client sites in minutes.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 text-white rounded-full text-2xl font-bold mb-6">
                3
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Generate Rosters
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Let our system create optimized shift schedules automatically. Review and confirm.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="py-20 md:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your team size. Start with a 14-day free trial.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Basic Plan */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-primary-500 hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Basic
              </h3>
              <p className="text-gray-600 mb-6">
                Perfect for small security companies
              </p>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold text-gray-900">R1,499</span>
                  <span className="text-xl text-gray-600">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">(excl. VAT)</p>
              </div>

              {/* CTA */}
              <Link
                href="/register"
                className="block w-full bg-white hover:bg-primary-50 text-primary-500 border-2 border-primary-500 text-center px-6 py-3 rounded-lg font-semibold transition-all mb-6"
              >
                Start Free Trial
              </Link>

              {/* Features */}
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Up to 50 security guards</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Automated roster generation</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">PSIRA certification tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Basic payroll calculations</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Email support</span>
                </li>
              </ul>
            </div>

            {/* Pro Plan - POPULAR */}
            <div className="bg-white rounded-2xl p-8 border-2 border-primary-500 shadow-xl relative transform scale-105">
              {/* Popular Badge */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                  Most Popular
                </div>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Professional
              </h3>
              <p className="text-gray-600 mb-6">
                For growing security companies
              </p>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold text-gray-900">R3,499</span>
                  <span className="text-xl text-gray-600">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">(excl. VAT)</p>
              </div>

              {/* CTA */}
              <Link
                href="/register"
                className="block w-full bg-primary-500 hover:bg-primary-600 text-white text-center px-6 py-3 rounded-lg font-semibold transition-all mb-6 shadow-md"
              >
                Start Free Trial
              </Link>

              {/* Features */}
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Up to 200 security guards</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Everything in Basic</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Billable hours tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Priority email support</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Data export (CSV)</span>
                </li>
              </ul>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-primary-500 hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Enterprise
              </h3>
              <p className="text-gray-600 mb-6">
                For large security operations
              </p>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold text-gray-900">R7,999</span>
                  <span className="text-xl text-gray-600">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">(excl. VAT)</p>
              </div>

              {/* CTA */}
              <Link
                href="/register"
                className="block w-full bg-white hover:bg-primary-50 text-primary-500 border-2 border-primary-500 text-center px-6 py-3 rounded-lg font-semibold transition-all mb-6"
              >
                Start Free Trial
              </Link>

              {/* Features */}
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Unlimited security guards</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Everything in Professional</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Dedicated account manager</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Phone support</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Custom integrations</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20 md:py-32 bg-primary-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Security Operations?
          </h2>
          <p className="text-xl text-primary-100 mb-10 max-w-3xl mx-auto">
            Join security companies across South Africa using RostraCore to save time and reduce costs
          </p>

          {/* CTA Button */}
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-primary-500 px-10 py-5 rounded-lg font-bold text-xl transition-all hover:shadow-2xl"
          >
            Start 14-Day Free Trial
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>

          {/* Subtext */}
          <p className="text-primary-100 text-sm mt-6">
            No credit card required • Cancel anytime • Data stays in South Africa
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="about" className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Logo & Description */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">R</span>
                </div>
                <span className="text-xl font-bold text-white">RostraCore</span>
              </div>
              <p className="text-sm text-gray-400">
                Professional workforce management for South African security companies
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#features" className="text-sm hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-sm hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <Link href="/register" className="text-sm hover:text-white transition-colors">
                    Start Trial
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#about" className="text-sm hover:text-white transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="mailto:support@rostracore.co.za" className="text-sm hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/privacy" className="text-sm hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" className="text-sm hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="/popia" className="text-sm hover:text-white transition-colors">
                    POPIA Compliance
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              © 2025 RostraCore (Pty) Ltd. All rights reserved.
            </p>

            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span>South Africa</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
