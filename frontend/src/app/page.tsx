"use client";

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

export default function Home() {
  const { isAuthenticated, user, logout } = useAuth();
  const [scrollY, setScrollY] = useState(0)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('scroll', handleScroll)
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <main className="relative min-h-screen overflow-hidden bg-black">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        {/* Gradient Orbs */}
        <div
          className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-blue-600/30 to-purple-600/30 blur-3xl animate-pulse"
          style={{
            top: '10%',
            left: `${20 + mousePosition.x * 0.02}%`,
            transition: 'all 0.3s ease-out'
          }}
        />
        <div
          className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-3xl animate-pulse"
          style={{
            bottom: '5%',
            right: `${10 + mousePosition.y * 0.02}%`,
            animationDelay: '1s',
            transition: 'all 0.3s ease-out'
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-r from-purple-500/25 to-pink-500/25 blur-3xl animate-pulse"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animationDelay: '2s'
          }}
        />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />

        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-400 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${10 + Math.random() * 10}s`
              }}
            />
          ))}
        </div>
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
            className="backdrop-blur-md bg-gradient-to-r from-purple-600/80 to-blue-600/80 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-full transition-all hover:scale-105 font-medium border border-white/20 inline-block"
          >
            Login
          </Link>
        )}
      </div>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-6xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 backdrop-blur-md bg-white/10 px-6 py-2 rounded-full border border-white/20 mb-8 animate-fadeIn">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white/90 text-sm font-medium">The Future of Security Management</span>
          </div>

          {/* Main Heading */}
          <h1
            className="text-7xl md:text-8xl font-black mb-6 bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent animate-fadeIn leading-tight"
            style={{
              animationDelay: '0.2s',
              textShadow: '0 0 80px rgba(59, 130, 246, 0.5)'
            }}
          >
            RostraCore
          </h1>

          <p
            className="text-2xl md:text-3xl font-bold text-white/90 mb-4 animate-fadeIn"
            style={{ animationDelay: '0.4s' }}
          >
            Revolutionizing Security in South Africa
          </p>

          <p
            className="text-lg text-white/70 max-w-3xl mx-auto mb-12 animate-fadeIn leading-relaxed"
            style={{ animationDelay: '0.6s' }}
          >
            AI-powered roster optimization meets South African security excellence.
            Manage guards, certifications, and shifts with military precision.
            Built for the future of private security.
          </p>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fadeIn"
            style={{ animationDelay: '0.8s' }}
          >
            <Link
              href="/dashboard"
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full font-bold text-white overflow-hidden transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/50"
            >
              <span className="relative z-10 flex items-center gap-2">
                Launch Dashboard
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

            <Link
              href="/roster"
              className="px-8 py-4 backdrop-blur-md bg-white/10 border border-white/20 rounded-full font-bold text-white hover:bg-white/20 transition-all hover:scale-105"
            >
              <span className="flex items-center gap-2">
                🤖 AI Roster Generator
              </span>
            </Link>
          </div>

          {/* Stats */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto animate-fadeIn"
            style={{ animationDelay: '1s' }}
          >
            {[
              { value: '99.9%', label: 'Uptime' },
              { value: '< 2s', label: 'Roster Generation' },
              { value: 'PSIRA', label: 'Compliant' },
              { value: '24/7', label: 'Support' }
            ].map((stat, idx) => (
              <div key={idx} className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-white/60">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Complete Security Management Suite
            </h2>
            <p className="text-xl text-white/70">
              Everything you need to run a modern security company in South Africa
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                href: '/dashboard',
                icon: '📊',
                title: 'Command Center',
                desc: 'Real-time analytics, metrics, and actionable insights at your fingertips',
                color: 'from-purple-600 to-blue-600',
                special: true
              },
              {
                href: '/employees',
                icon: '👥',
                title: 'Guard Management',
                desc: 'Complete PSIRA compliance tracking, skills, and certification management',
                color: 'from-blue-600 to-cyan-600'
              },
              {
                href: '/sites',
                icon: '📍',
                title: 'Site Control',
                desc: 'Client locations, requirements, and shift patterns in one place',
                color: 'from-cyan-600 to-teal-600'
              },
              {
                href: '/shifts',
                icon: '📅',
                title: 'Shift Scheduler',
                desc: 'Advanced filtering, assignments, and real-time shift management',
                color: 'from-teal-600 to-green-600'
              },
              {
                href: '/roster',
                icon: '🤖',
                title: 'AI Roster Engine',
                desc: 'Constraint-based optimization generates perfect rosters in seconds',
                color: 'from-green-600 to-emerald-600',
                special: true
              },
              {
                href: '/certifications',
                icon: '🎖️',
                title: 'Certifications',
                desc: 'Track PSIRA grades, firearms, and training with expiry alerts',
                color: 'from-orange-600 to-red-600'
              }
            ].map((item, idx) => (
              <Link key={idx} href={item.href}>
                <div className={`group relative p-8 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-2xl ${item.special ? 'ring-2 ring-blue-500/50' : ''}`}>
                  {item.special && (
                    <div className="absolute -top-3 -right-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                      POPULAR
                    </div>
                  )}
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{item.icon}</div>
                  <h3 className="text-2xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-white/70 mb-4 leading-relaxed">{item.desc}</p>
                  <div className={`inline-flex items-center gap-2 text-white font-semibold group-hover:gap-3 transition-all`}>
                    <span className="bg-gradient-to-r ${item.color} bg-clip-text text-transparent">Access Now</span>
                    <svg className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Key Features Section */}
      <div className="relative z-10 px-6 py-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Built for South African Security
            </h2>
            <p className="text-xl text-white/70">
              Engineered with local expertise, powered by global technology
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: '🎯', title: 'Smart Matching', desc: 'AI-powered skill & certification matching' },
              { icon: '💰', title: 'Cost Control', desc: 'Real-time budget optimization & forecasting' },
              { icon: '✅', title: 'PSIRA Ready', desc: 'Full compliance with SA regulations' },
              { icon: '⚡', title: 'Lightning Fast', desc: 'Generate rosters in under 2 seconds' },
              { icon: '📱', title: 'Mobile Ready', desc: 'Access anywhere, anytime' },
              { icon: '🔒', title: 'Secure', desc: 'Bank-level encryption & security' },
              { icon: '📈', title: 'Analytics', desc: 'Deep insights into operations' },
              { icon: '🌍', title: 'ZAR Native', desc: 'Built for South African Rand' }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all hover:scale-105"
                style={{
                  animationDelay: `${idx * 0.1}s`
                }}
              >
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h4 className="text-lg font-bold text-white mb-2">{feature.title}</h4>
                <p className="text-sm text-white/60">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-white mb-6">
            Ready to Transform Your Security Operations?
          </h2>
          <p className="text-xl text-white/70 mb-8">
            Join the future of security management in South Africa
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full font-bold text-white text-lg hover:scale-105 transition-all hover:shadow-2xl hover:shadow-blue-500/50"
          >
            Get Started Now
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full p-1">
          <div className="w-1.5 h-3 bg-white/50 rounded-full mx-auto animate-pulse" />
        </div>
      </div>
    </main>
  )
}
