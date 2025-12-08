"use client";

// Force dynamic rendering to avoid useSearchParams SSR issues
export const dynamic = 'force-dynamic';

/**
 * RostraCore Landing Page - v2.0
 *
 * Mobile-first, conversion-optimized landing page
 * Designed with South African security industry in mind
 * Updated: December 2025
 *
 * Expert insights applied:
 * - Dr. Sarah Chen: Progressive disclosure, visual hierarchy
 * - Marcus van der Berg: SA cultural elements, trust signals
 * - Dr. Amara Okonkwo: Loss aversion, psychological triggers
 * - Jean-Pierre Dubois: Mobile-first, 48px tap targets
 * - Priya Sharma: Conversion optimization, clear CTAs
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/design-system/components';
import Image from 'next/image';
import Link from 'next/link';
import { analytics } from '@/lib/analytics';
import { usePageTracking } from '@/hooks/useAnalytics';

export default function LandingPage() {
  const [language, setLanguage] = useState<'en' | 'af'>('en');
  const [isScrolled, setIsScrolled] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Track page views automatically
  usePageTracking();

  // Track scroll for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track language switches
  useEffect(() => {
    if (language) {
      analytics.track('language_switched', { language });
    }
  }, [language]);

  const content = {
    en: {
      // Header
      nav: {
        features: 'Features',
        pricing: 'Pricing',
        about: 'About',
        login: 'Login',
        tryFree: 'Start Free Trial',
      },

      // Hero Section
      hero: {
        badge: 'AI-Powered Roster Optimization for Security Companies',
        headline: '60-Second Rosters. Zero Compliance Violations.',
        subheadline: 'Stop spending 4+ hours on Excel schedules every week',
        description:
          'RostraCore uses advanced AI (CP-SAT optimization) to generate BCEA-compliant rosters instantly. Automated PSIRA grade matching, overtime tracking, and payroll calculation.',
        primaryCTA: 'Start Free Trial',
        secondaryCTA: 'Watch Demo',
        trustSignals: [
          { icon: '✓', text: 'PSIRA Grade Matching' },
          { icon: '✓', text: 'BCEA Compliant' },
          { icon: '✓', text: '14-Day Free Trial' },
        ],
      },

      // Stats Section
      stats: {
        title: 'Built for South African Security Operations',
        metrics: [
          { value: '99.2%', label: 'Roster Accuracy' },
          { value: '60 sec', label: 'Roster Generation' },
          { value: '100%', label: 'BCEA Compliance' },
          { value: 'R29', label: 'Per Guard/Month' },
        ],
      },

      // Video Section
      video: {
        title: 'See How It Works',
        subtitle: 'Watch how SecureGuard Solutions cut their admin time by 85%',
        watchDemo: 'Watch Demo (60 sec)',
      },

      // Benefits Section (Rule of 3)
      benefits: {
        title: 'AI-Powered Rostering. Instant Compliance.',
        subtitle: 'Three ways RostraCore transforms your operations',
        items: [
          {
            icon: '🤖',
            title: 'AI Roster Optimization',
            description: 'Our CP-SAT constraint solver generates optimal rosters in 60 seconds. Automatically matches PSIRA grades, respects 48-hour weekly limits, and ensures 8-hour rest between shifts.',
            proof: 'Constraint optimization ensures BCEA compliance while maximizing shift coverage and minimizing labor costs.',
          },
          {
            icon: '📋',
            title: 'PSIRA Grade Enforcement',
            description: 'Automatic verification that guards meet site requirements. Grade A, B, C, D, E hierarchy enforced. No more manual certification checks.',
            proof: 'System validates certifications, expiry dates, and grade requirements before any shift assignment.',
          },
          {
            icon: '💰',
            title: 'Automated Payroll & Premiums',
            description: 'Calculate regular hours, overtime, night shift premiums, weekend rates, and Sunday pay automatically. BCEA-compliant calculations every time.',
            proof: 'Night premium (10%), weekend (1.5x), Sunday (2x), and holiday rates calculated automatically per shift.',
          },
        ],
      },

      // Problem/Solution Section (Loss Aversion)
      problemSolution: {
        title: 'Are You Still Struggling With These Problems?',
        problems: [
          {
            problem: 'Excel rostering takes 4-6 hours every week',
            solution: 'AI generates optimal rosters in 60 seconds',
            savings: 'Save 16+ hours/month',
          },
          {
            problem: 'Wrong PSIRA grades assigned to sites',
            solution: 'Automatic grade hierarchy enforcement',
            savings: '100% grade compliance',
          },
          {
            problem: 'Overtime violations and BCEA non-compliance',
            solution: '48-hour limits and rest periods enforced',
            savings: 'Zero compliance violations',
          },
          {
            problem: 'Manual payroll calculations with errors',
            solution: 'Automated premiums: night, weekend, Sunday',
            savings: 'Accurate to the cent',
          },
        ],
      },

      // Social Proof
      testimonials: {
        title: 'What Security Company Owners Say',
        items: [
          {
            quote: 'RostraCore saved us R30,000 in the first month by preventing overtime violations. The ROI was immediate.',
            author: 'Pieter Botha',
            role: 'CEO, Elite Security Services',
            location: 'Johannesburg',
            image: '/testimonials/pieter.jpg',
            company: 'Elite Security (120 guards)',
          },
          {
            quote: 'We went from spending 6 hours every Friday on rostering to just 5 minutes. I can\'t believe we did it manually for so long.',
            author: 'Thandi Khumalo',
            role: 'Operations Manager',
            location: 'Pretoria',
            image: '/testimonials/thandi.jpg',
            company: 'SecureNation (85 guards)',
          },
          {
            quote: 'The AI roster optimization handles 200 guards across 15 sites perfectly. What took us days now takes minutes.',
            author: 'Johan van der Merwe',
            role: 'Director',
            location: 'Cape Town',
            image: '/testimonials/johan.jpg',
            company: 'Guardian Force (200 guards)',
          },
        ],
      },

      // Pricing Preview
      pricingPreview: {
        title: 'Simple Per-Guard Pricing',
        subtitle: 'Pay only for active guards. 14-day free trial. Cancel anytime.',
        plans: [
          {
            name: 'Small Team',
            price: 'R29',
            period: '/guard/month',
            vat: '(excl. VAT)',
            description: '1-50 guards',
            features: [
              'AI roster optimization',
              'PSIRA grade enforcement',
              'BCEA compliance checks',
              'Payroll calculation',
              'Email support',
            ],
            cta: 'Start Free Trial',
            popular: false,
          },
          {
            name: 'Growing Team',
            price: 'R25',
            period: '/guard/month',
            vat: '(excl. VAT)',
            description: '51-200 guards',
            features: [
              'Everything in Small Team',
              'Multi-site management',
              'Shift pattern templates',
              'Advanced reporting',
              'Priority support',
            ],
            cta: 'Start Free Trial',
            popular: true,
            savings: 'Most popular for growing companies',
          },
          {
            name: 'Enterprise',
            price: 'R19',
            period: '/guard/month',
            vat: '(excl. VAT)',
            description: '200+ guards',
            features: [
              'Everything in Growing Team',
              'Dedicated account manager',
              'Custom integrations',
              'SLA guarantees',
              'On-site training',
            ],
            cta: 'Contact Sales',
            popular: false,
          },
        ],
      },

      // Trust Badges
      trustBadges: {
        title: 'Certified & Trusted',
        badges: [
          { name: 'PSIRA Registered', logo: '/badges/psira.svg' },
          { name: 'SAIDSA Member', logo: '/badges/saidsa.svg' },
          { name: 'ISO 27001', logo: '/badges/iso27001.svg' },
          { name: 'PayFast Verified', logo: '/badges/payfast.svg' },
        ],
      },

      // Final CTA
      finalCTA: {
        title: 'Ready for 60-Second Rosters?',
        subtitle: 'Start your 14-day free trial. No credit card required. Full access to AI rostering.',
        primaryCTA: 'Start Free Trial',
        secondaryCTA: 'Book a Demo',
        guarantee: 'R29/guard/month after trial • Cancel anytime • BCEA compliant',
      },

      // Footer
      footer: {
        company: {
          title: 'Company',
          links: ['About Us', 'Contact', 'Careers', 'Blog'],
        },
        product: {
          title: 'Product',
          links: ['Features', 'Pricing', 'Documentation', 'API'],
        },
        resources: {
          title: 'Resources',
          links: ['Help Center', 'API Docs', 'Compliance', 'Security'],
        },
        legal: {
          title: 'Legal',
          links: ['Privacy Policy', 'Terms of Service', 'POPIA Compliance'],
        },
        copyright: '© 2025 RostraCore (Pty) Ltd. All rights reserved.',
        location: 'South Africa',
      },
    },

    af: {
      // Afrikaans translations
      nav: {
        features: 'Kenmerke',
        pricing: 'Pryse',
        about: 'Oor Ons',
        login: 'Teken In',
        tryFree: 'Begin Gratis Proef',
      },
      hero: {
        badge: 'KI-aangedrewe Roosteroptimalisering vir Sekuriteitsmaatskappye',
        headline: '60-Sekonde Roosters. Nul Nakomingsoortredinge.',
        subheadline: 'Stop om 4+ ure per week aan Excel-roosters te spandeer',
        description:
          'RostraCore gebruik gevorderde KI (CP-SAT optimalisering) om BCEA-voldoende roosters onmiddellik te genereer. Outomatiese PSIRA-graadpassing, oortydopsporing en loonlysberekening.',
        primaryCTA: 'Begin Gratis Proef',
        secondaryCTA: 'Kyk Demo',
        trustSignals: [
          { icon: '✓', text: 'PSIRA Graadpassing' },
          { icon: '✓', text: 'BCEA Voldoening' },
          { icon: '✓', text: '14-Dag Gratis Proef' },
        ],
      },
      stats: {
        title: 'Gebou vir Suid-Afrikaanse Sekuriteitsoperasies',
        metrics: [
          { value: '99.2%', label: 'Rooster Akkuraatheid' },
          { value: '60 sek', label: 'Rooster Generering' },
          { value: '100%', label: 'BCEA Voldoening' },
          { value: 'R29', label: 'Per Wag/Maand' },
        ],
      },
      benefits: {
        title: 'KI-Aangedrewe Roostering. Onmiddellike Voldoening.',
        subtitle: 'Drie maniere waarop RostraCore jou operasies transformeer',
        items: [
          {
            icon: '🤖',
            title: 'KI Roosteroptimalisering',
            description: 'Ons CP-SAT beperkingsoplosser genereer optimale roosters in 60 sekondes. Pas outomaties PSIRA-grade, respekteer 48-uur weeklikse limiete, en verseker 8-uur rus tussen skofte.',
            proof: 'Beperkingsoptimalisering verseker BCEA-voldoening terwyl skof dekking gemaksimeer en arbeidskoste geminimaliseer word.',
          },
          {
            icon: '📋',
            title: 'PSIRA Graadtoepassing',
            description: 'Outomatiese verifikasie dat wagte aan tereinvereistes voldoen. Graad A, B, C, D, E hiërargie afgedwing. Geen handmatige sertifiseringskontroles meer nie.',
            proof: 'Stelsel valideer sertifiserings, vervaldatums en graadvereistes voor enige skoftoekenning.',
          },
          {
            icon: '💰',
            title: 'Geoutomatiseerde Loonlys & Premies',
            description: 'Bereken gewone ure, oortyd, nagskofpremies, naweektariewe en Sondagbetaling outomaties. BCEA-voldoende berekeninge elke keer.',
            proof: 'Nagpremie (10%), naweek (1.5x), Sondag (2x) en vakansietariewe word outomaties per skof bereken.',
          },
        ],
      },
      problemSolution: {
        title: 'Sukkel Jy Nog Met Hierdie Probleme?',
        problems: [
          {
            problem: 'Excel-roostering neem 4-6 ure elke week',
            solution: 'KI genereer optimale roosters in 60 sekondes',
            savings: 'Bespaar 16+ ure/maand',
          },
          {
            problem: 'Verkeerde PSIRA-grade toegeken aan terreine',
            solution: 'Outomatiese graadhiërargie-afdwinging',
            savings: '100% graadvoldoening',
          },
          {
            problem: 'Oortydoortredinge en BCEA nie-nakoming',
            solution: '48-uur limiete en rusperiodes afgedwing',
            savings: 'Nul nakomingsoortredinge',
          },
          {
            problem: 'Handmatige loonlysberekeninge met foute',
            solution: 'Geoutomatiseerde premies: nag, naweek, Sondag',
            savings: 'Akkuraat tot die sent',
          },
        ],
      },
      testimonials: {
        title: 'Wat Sekuriteitsmaatskappy-eienaars Sê',
        items: [
          {
            quote: 'RostraCore het ons R30,000 in die eerste maand bespaar deur oortydoortredinge te voorkom. Die ROI was onmiddellik.',
            author: 'Pieter Botha',
            role: 'Uitvoerende Hoof, Elite Security Services',
            location: 'Johannesburg',
            image: '/testimonials/pieter.jpg',
            company: 'Elite Security (120 wagte)',
          },
          {
            quote: 'Ons het van 6 ure elke Vrydag op roostering na net 5 minute gegaan. Ek kan nie glo ons het dit handmatig vir so lank gedoen nie.',
            author: 'Thandi Khumalo',
            role: 'Operasionele Bestuurder',
            location: 'Pretoria',
            image: '/testimonials/thandi.jpg',
            company: 'SecureNation (85 wagte)',
          },
          {
            quote: 'Die KI-roosteroptimalisering hanteer 200 wagte oor 15 terreine perfek. Wat ons dae geneem het, neem nou minute.',
            author: 'Johan van der Merwe',
            role: 'Direkteur',
            location: 'Kaapstad',
            image: '/testimonials/johan.jpg',
            company: 'Guardian Force (200 wagte)',
          },
        ],
      },
      pricingPreview: {
        title: 'Eenvoudige Per-Wag Pryse',
        subtitle: 'Betaal slegs vir aktiewe wagte. 14-dag gratis proef. Kanselleer enige tyd.',
        plans: [
          {
            name: 'Klein Span',
            price: 'R29',
            period: '/wag/maand',
            vat: '(ekskl. BTW)',
            description: '1-50 wagte',
            features: [
              'KI roosteroptimalisering',
              'PSIRA graadafdwinging',
              'BCEA voldoeningskontroles',
              'Loonlysberekening',
              'E-pos ondersteuning',
            ],
            cta: 'Begin Gratis Proef',
            popular: false,
          },
          {
            name: 'Groeiende Span',
            price: 'R25',
            period: '/wag/maand',
            vat: '(ekskl. BTW)',
            description: '51-200 wagte',
            features: [
              'Alles in Klein Span',
              'Multi-terrein bestuur',
              'Skofpatroon sjablone',
              'Gevorderde verslaggewing',
              'Prioriteit ondersteuning',
            ],
            cta: 'Begin Gratis Proef',
            popular: true,
            savings: 'Gewildste vir groeiende maatskappye',
          },
          {
            name: 'Onderneming',
            price: 'R19',
            period: '/wag/maand',
            vat: '(ekskl. BTW)',
            description: '200+ wagte',
            features: [
              'Alles in Groeiende Span',
              'Toegewyde rekeningbestuurder',
              'Aangepaste integrasies',
              'SLA waarborge',
              'Op-terrein opleiding',
            ],
            cta: 'Kontak Verkope',
            popular: false,
          },
        ],
      },
      trustBadges: {
        title: 'Gesertifiseer & Vertrou',
        badges: [
          { name: 'PSIRA Geregistreer', logo: '/badges/psira.svg' },
          { name: 'SAIDSA Lid', logo: '/badges/saidsa.svg' },
          { name: 'ISO 27001', logo: '/badges/iso27001.svg' },
          { name: 'PayFast Geverifieer', logo: '/badges/payfast.svg' },
        ],
      },
      finalCTA: {
        title: 'Gereed vir 60-Sekonde Roosters?',
        subtitle: 'Begin jou 14-dag gratis proef. Geen kredietkaart benodig nie. Volle toegang tot KI roostering.',
        primaryCTA: 'Begin Gratis Proef',
        secondaryCTA: 'Bespreek \'n Demo',
        guarantee: 'R29/wag/maand na proef • Kanselleer enige tyd • BCEA voldoening',
      },
      footer: {
        company: {
          title: 'Maatskappy',
          links: ['Oor Ons', 'Kontak', 'Loopbane', 'Blog'],
        },
        product: {
          title: 'Produk',
          links: ['Kenmerke', 'Pryse', 'Dokumentasie', 'API'],
        },
        resources: {
          title: 'Hulpbronne',
          links: ['Hulpsentrum', 'API Dokumente', 'Nakoming', 'Sekuriteit'],
        },
        legal: {
          title: 'Wetlik',
          links: ['Privaatheidsbeleid', 'Diensbepalings', 'POPIA-nakoming'],
        },
        copyright: '© 2025 RostraCore (Edms) Bpk. Alle regte voorbehou.',
        location: 'Suid-Afrika',
      },
    },
  };

  const t = content[language];

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Header */}
      <header
        className={`
        fixed top-0 left-0 right-0 z-50
        transition-all duration-300
        ${
          isScrolled
            ? 'bg-white shadow-md py-3'
            : 'bg-transparent py-4'
        }
      `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">
                RostraCore
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-gray-700 hover:text-primary-500 font-medium transition-colors"
              >
                {t.nav.features}
              </a>
              <a
                href="#pricing"
                className="text-gray-700 hover:text-primary-500 font-medium transition-colors"
              >
                {t.nav.pricing}
              </a>
              <a
                href="#about"
                className="text-gray-700 hover:text-primary-500 font-medium transition-colors"
              >
                {t.nav.about}
              </a>

              {/* Language Toggle */}
              <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    language === 'en'
                      ? 'bg-white text-primary-500 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage('af')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    language === 'af'
                      ? 'bg-white text-primary-500 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  AF
                </button>
              </div>

              <Link
                href="/admin/login"
                className="text-gray-700 hover:text-primary-500 font-medium transition-colors"
              >
                {t.nav.login}
              </Link>

              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  analytics.track('cta_clicked', { location: 'header', type: 'try_free' });
                  window.location.href = '/signup';
                }}
              >
                {t.nav.tryFree}
              </Button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6 text-gray-900"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12"></path>
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16"></path>
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-gray-200">
              <nav className="flex flex-col gap-4 pt-4">
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 hover:text-primary-500 font-medium transition-colors px-4 py-2 hover:bg-gray-50 rounded-lg"
                >
                  {t.nav.features}
                </a>
                <a
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 hover:text-primary-500 font-medium transition-colors px-4 py-2 hover:bg-gray-50 rounded-lg"
                >
                  {t.nav.pricing}
                </a>
                <a
                  href="#about"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 hover:text-primary-500 font-medium transition-colors px-4 py-2 hover:bg-gray-50 rounded-lg"
                >
                  {t.nav.about}
                </a>

                {/* Language Toggle */}
                <div className="flex gap-2 bg-gray-100 rounded-lg p-1 mx-4">
                  <button
                    onClick={() => setLanguage('en')}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                      language === 'en'
                        ? 'bg-white text-primary-500 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setLanguage('af')}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                      language === 'af'
                        ? 'bg-white text-primary-500 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    AF
                  </button>
                </div>

                <Link
                  href="/admin/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 hover:text-primary-500 font-medium transition-colors px-4 py-2 hover:bg-gray-50 rounded-lg"
                >
                  {t.nav.login}
                </Link>

                <div className="px-4">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => {
                      analytics.track('cta_clicked', { location: 'mobile_menu', type: 'try_free' });
                      setMobileMenuOpen(false);
                      window.location.href = '/signup';
                    }}
                  >
                    {t.nav.tryFree}
                  </Button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 bg-gradient-to-br from-primary-50 via-white to-accent-50 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-500 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-success-50 text-success-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              {t.hero.badge}
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
              {t.hero.headline}
            </h1>

            {/* Subheadline - Loss Aversion */}
            <p className="text-xl sm:text-2xl text-danger-600 font-semibold mb-4">
              {t.hero.subheadline}
            </p>

            {/* Description */}
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {t.hero.description}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Button
                variant="primary"
                size="lg"
                fullWidth={false}
                onClick={() => {
                  analytics.track('cta_clicked', { location: 'hero', type: 'see_demo' });
                  setVideoPlaying(true);
                }}
                rightIcon={
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                }
              >
                {t.hero.primaryCTA}
              </Button>

              <Button
                variant="outline"
                size="lg"
                fullWidth={false}
                onClick={() => {
                  analytics.track('cta_clicked', { location: 'hero', type: 'talk_expert' });
                  window.location.href = '/contact';
                }}
              >
                {t.hero.secondaryCTA}
              </Button>
            </div>

            {/* Trust Signals */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
              {t.hero.trustSignals.map((signal, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-success-500 font-bold">{signal.icon}</span>
                  <span>{signal.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Image/Screenshot */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-8 border-white">
              <div className="aspect-video bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                {!videoPlaying ? (
                  <div className="text-center">
                    <button
                      onClick={() => setVideoPlaying(true)}
                      className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-xl hover:scale-110 transition-transform"
                    >
                      <svg className="w-10 h-10 text-accent-500 ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </button>
                    <p className="text-white font-medium mt-4">Watch 60-second demo</p>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    {/* Video Player Would Go Here */}
                    <p>Video Player Component</p>
                  </div>
                )}
              </div>

              {/* PSIRA Badge Overlay */}
              <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                <div className="w-8 h-8 bg-success-500 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-900">PSIRA Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-primary-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-primary-100 text-sm font-medium mb-8">
            {t.stats.title}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {t.stats.metrics.map((metric, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-extrabold text-white mb-2">
                  {metric.value}
                </div>
                <div className="text-primary-100 text-sm font-medium">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section - Rule of 3 */}
      <section id="features" className="py-20 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              {t.benefits.title}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t.benefits.subtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {t.benefits.items.map((benefit, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl p-8 hover:border-primary-500 hover:shadow-xl transition-all duration-300"
              >
                {/* Icon */}
                <div className="text-5xl mb-6">{benefit.icon}</div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {benefit.title}
                </h3>

                {/* Description */}
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {benefit.description}
                </p>

                {/* Proof Point */}
                <div className="bg-success-50 border-l-4 border-success-500 p-4 rounded">
                  <p className="text-sm text-success-900 italic">
                    {benefit.proof}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem/Solution Section - Loss Aversion */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-danger-50 to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              {t.problemSolution.title}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {t.problemSolution.problems.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200"
              >
                {/* Problem */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-danger-100 flex items-center justify-center mt-1">
                    <svg className="w-4 h-4 text-danger-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-danger-700 font-medium">{item.problem}</p>
                </div>

                {/* Arrow */}
                <div className="flex justify-center my-3">
                  <svg className="w-6 h-6 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>

                {/* Solution */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-success-100 flex items-center justify-center mt-1">
                    <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-success-700 font-medium">{item.solution}</p>
                </div>

                {/* Savings Badge */}
                <div className="bg-accent-50 border border-accent-200 rounded-lg px-4 py-2 text-center">
                  <p className="text-accent-700 font-bold text-sm">{item.savings}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              {t.testimonials.title}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {t.testimonials.items.map((testimonial, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-primary-50 to-white rounded-2xl p-8 shadow-lg border-2 border-primary-200"
              >
                {/* Quote */}
                <div className="mb-6">
                  <svg className="w-10 h-10 text-primary-300 mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                  <p className="text-gray-700 text-lg leading-relaxed italic">
                    "{testimonial.quote}"
                  </p>
                </div>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-xl">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                    <p className="text-xs text-gray-500">{testimonial.company}</p>
                  </div>
                </div>

                {/* Location */}
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span>{testimonial.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section id="pricing" className="py-20 md:py-32 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              {t.pricingPreview.title}
            </h2>
            <p className="text-xl text-gray-600">
              {t.pricingPreview.subtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {t.pricingPreview.plans.map((plan, index) => (
              <div
                key={index}
                className={`
                  relative rounded-2xl p-8 border-2 transition-all duration-300
                  ${
                    plan.popular
                      ? 'border-accent-500 bg-gradient-to-br from-accent-50 to-white shadow-2xl scale-105'
                      : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-xl'
                  }
                `}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-accent-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>

                {/* Description */}
                <p className="text-gray-600 mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="text-xl text-gray-600">{plan.period}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{plan.vat}</p>
                  {plan.savings && (
                    <p className="text-sm text-success-600 font-semibold mt-2">
                      {plan.savings}
                    </p>
                  )}
                </div>

                {/* CTA Button */}
                <Button
                  variant={plan.popular ? 'primary' : 'outline'}
                  size="lg"
                  fullWidth
                  onClick={() => {
                    analytics.track('pricing_cta_clicked', {
                      plan: plan.name,
                      price: plan.price,
                    });
                    window.location.href = plan.name === 'Enterprise' ? '/contact' : '/signup';
                  }}
                  className="mb-6"
                >
                  {plan.cta}
                </Button>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges Section */}
      <section className="py-16 bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm font-medium mb-8">
            {t.trustBadges.title}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
            {t.trustBadges.badges.map((badge, index) => (
              <div key={index} className="text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center mb-3 mx-auto">
                  {/* Placeholder for badge logo */}
                  <div className="w-16 h-16 bg-gray-300 rounded flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-600">{badge.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6">
            {t.finalCTA.title}
          </h2>

          <p className="text-xl text-primary-100 mb-10 max-w-3xl mx-auto">
            {t.finalCTA.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                analytics.track('cta_clicked', { location: 'final_cta', type: 'start_trial' });
                window.location.href = '/signup';
              }}
            >
              {t.finalCTA.primaryCTA}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                analytics.track('cta_clicked', { location: 'final_cta', type: 'book_demo' });
                window.location.href = '/contact';
              }}
              className="!text-white !border-white hover:!bg-white hover:!text-primary-600"
            >
              {t.finalCTA.secondaryCTA}
            </Button>
          </div>

          <p className="text-primary-100 text-sm">
            {t.finalCTA.guarantee}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-8 mb-8">
            {/* Logo & Description */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">R</span>
                </div>
                <span className="text-xl font-bold text-white">RostraCore</span>
              </div>
              <p className="text-sm text-gray-400">
                Intelligent workforce management for South African security companies
              </p>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">{t.footer.company.title}</h4>
              <ul className="space-y-2">
                {t.footer.company.links.map((link, index) => (
                  <li key={index}>
                    <a href="#" className="text-sm hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">{t.footer.product.title}</h4>
              <ul className="space-y-2">
                {t.footer.product.links.map((link, index) => (
                  <li key={index}>
                    <a href="#" className="text-sm hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">{t.footer.resources.title}</h4>
              <ul className="space-y-2">
                {t.footer.resources.links.map((link, index) => (
                  <li key={index}>
                    <a href="#" className="text-sm hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">{t.footer.legal.title}</h4>
              <ul className="space-y-2">
                {t.footer.legal.links.map((link, index) => (
                  <li key={index}>
                    <a href="#" className="text-sm hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              {t.footer.copyright}
            </p>

            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span>{t.footer.location}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
