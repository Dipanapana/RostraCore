'use client'

import { useState, useEffect } from 'react'

interface SecurityLoadingSpinnerProps {
  message?: string
  elapsedSeconds?: number
}

export default function SecurityLoadingSpinner({
  message = 'Optimizing roster assignments...',
  elapsedSeconds = 0
}: SecurityLoadingSpinnerProps) {
  const [currentPuzzle, setCurrentPuzzle] = useState(0)
  const [progress, setProgress] = useState(0)
  const [animationPhase, setAnimationPhase] = useState(0)

  // Security-themed puzzles that rotate during loading
  const securityPuzzles = [
    {
      title: "PSIRA Compliance Check",
      description: "Validating guard certifications and active registration status",
      icon: "🛡️",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      title: "BCEA Labor Law Verification",
      description: "Ensuring 48-hour weekly limits and 8-hour rest periods",
      icon: "⚖️",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      title: "Shift Pattern Analysis",
      description: "Analyzing 168 shift slots across 8 security sites",
      icon: "🔍",
      gradient: "from-green-500 to-teal-500"
    },
    {
      title: "Cost Optimization Engine",
      description: "Minimizing overtime while maximizing coverage",
      icon: "💰",
      gradient: "from-yellow-500 to-orange-500"
    },
    {
      title: "Skills Matrix Matching",
      description: "Matching guard qualifications to site requirements",
      icon: "🎯",
      gradient: "from-red-500 to-pink-500"
    },
    {
      title: "Fairness Algorithm",
      description: "Distributing hours equitably across 71 security personnel",
      icon: "⚡",
      gradient: "from-indigo-500 to-purple-500"
    }
  ]

  // Rotate through puzzles every 5 seconds
  useEffect(() => {
    const puzzleInterval = setInterval(() => {
      setCurrentPuzzle((prev) => (prev + 1) % securityPuzzles.length)
      setProgress(0)
    }, 5000)

    return () => clearInterval(puzzleInterval)
  }, [securityPuzzles.length])

  // Smooth progress bar animation
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev + 1) % 101)
    }, 50)

    return () => clearInterval(progressInterval)
  }, [currentPuzzle])

  // Hexagon pulse animation
  useEffect(() => {
    const animationInterval = setInterval(() => {
      setAnimationPhase((prev) => (prev + 1) % 6)
    }, 200)

    return () => clearInterval(animationInterval)
  }, [])

  const puzzle = securityPuzzles[currentPuzzle]

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center z-50">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'grid-move 20s linear infinite'
        }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-8">
        {/* Main hexagonal spinner */}
        <div className="flex justify-center mb-8">
          <div className="relative w-40 h-40">
            {/* Outer rotating hexagon */}
            <div className="absolute inset-0 animate-spin-slow">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <polygon
                  points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
                  fill="none"
                  stroke="url(#gradient1)"
                  strokeWidth="2"
                  className="opacity-60"
                />
                <defs>
                  <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Middle counter-rotating hexagon */}
            <div className="absolute inset-4 animate-spin-reverse">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <polygon
                  points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
                  fill="none"
                  stroke="url(#gradient2)"
                  strokeWidth="3"
                  className="opacity-80"
                />
                <defs>
                  <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Inner pulsing core */}
            <div className="absolute inset-8 flex items-center justify-center">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${puzzle.gradient}
                             animate-pulse flex items-center justify-center text-3xl shadow-2xl`}>
                {puzzle.icon}
              </div>
            </div>

            {/* Orbiting security nodes */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-lg shadow-blue-500/50"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `
                    translate(-50%, -50%)
                    rotate(${i * 60 + animationPhase * 60}deg)
                    translateY(-60px)
                  `,
                  opacity: animationPhase === i ? 1 : 0.3,
                  transition: 'opacity 0.2s ease-in-out'
                }}
              />
            ))}
          </div>
        </div>

        {/* Current puzzle card */}
        <div className={`bg-gradient-to-br ${puzzle.gradient} p-1 rounded-2xl mb-6
                        transform transition-all duration-500 hover:scale-105 shadow-2xl`}>
          <div className="bg-slate-900 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-4xl">{puzzle.icon}</div>
              <h3 className="text-2xl font-bold text-white">{puzzle.title}</h3>
            </div>
            <p className="text-slate-300 text-lg mb-4">{puzzle.description}</p>

            {/* Progress bar */}
            <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${puzzle.gradient}
                           rounded-full transition-all duration-50 ease-linear`}
                style={{ width: `${progress}%` }}
              />
              <div className={`absolute inset-y-0 left-0 bg-gradient-to-r ${puzzle.gradient}
                             opacity-50 blur-sm rounded-full transition-all duration-50 ease-linear`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Status message and timer */}
        <div className="text-center space-y-3">
          <p className="text-xl text-blue-100 font-medium animate-pulse">
            {message}
          </p>
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm">
              {elapsedSeconds > 0 ? `${elapsedSeconds}s elapsed` : 'Processing...'}
            </span>
          </div>

          {/* Estimated time remaining */}
          {elapsedSeconds > 30 && (
            <div className="text-sm text-amber-400 animate-pulse">
              Large roster detected - This may take up to 3 minutes
            </div>
          )}

          {/* Processing stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">168</div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">Shifts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">71</div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">Guards</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {currentPuzzle + 1}/{securityPuzzles.length}
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">Checks</div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes grid-move {
          0% { transform: translateY(0); }
          100% { transform: translateY(50px); }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        .animate-spin-reverse {
          animation: spin-reverse 6s linear infinite;
        }
      `}</style>
    </div>
  )
}
