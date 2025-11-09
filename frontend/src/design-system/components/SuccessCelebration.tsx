/**
 * Success Celebration Component
 *
 * Triggers dopamine through visual celebration
 * Used at key emotional transition moments
 *
 * Psychology: Celebrates achievements to build confidence
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Button } from './Button';

export interface SuccessCelebrationProps {
  title: string;
  message: string;
  stats?: Array<{
    label: string;
    value: string;
    icon?: string;
  }>;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  showConfetti?: boolean;
  onClose?: () => void;
}

export const SuccessCelebration: React.FC<SuccessCelebrationProps> = ({
  title,
  message,
  stats = [],
  primaryAction,
  secondaryAction,
  showConfetti = true,
  onClose,
}) => {
  const [confettiPieces, setConfettiPieces] = useState<Array<{
    id: number;
    left: number;
    delay: number;
    duration: number;
    color: string;
  }>>([]);

  useEffect(() => {
    if (showConfetti) {
      // Generate random confetti pieces
      const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100, // Random position across width
        delay: Math.random() * 0.5, // Stagger animation
        duration: 2 + Math.random() * 1, // Random fall speed
        color: ['#FF6B35', '#0A2540', '#2D6A4F', '#F59E0B'][Math.floor(Math.random() * 4)],
      }));
      setConfettiPieces(pieces);

      // Clean up after animation
      const timer = setTimeout(() => setConfettiPieces([]), 3500);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {confettiPieces.map((piece) => (
            <div
              key={piece.id}
              className="absolute w-3 h-3 rounded-full animate-confetti"
              style={{
                left: `${piece.left}%`,
                top: '-20px',
                backgroundColor: piece.color,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Success Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Icon */}
        <div className="bg-gradient-to-br from-success-50 to-success-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-success-500 rounded-full mb-4 animate-bounce-slow">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            {title}
          </h2>
          <p className="text-lg text-gray-700">
            {message}
          </p>
        </div>

        {/* Stats */}
        {stats.length > 0 && (
          <div className="px-8 py-6 bg-gray-50 border-y border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  {stat.icon && <div className="text-3xl mb-2">{stat.icon}</div>}
                  <div className="text-2xl font-bold text-primary-600">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-8 space-y-3">
          {primaryAction && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </Button>
          )}

          {secondaryAction && (
            <Button
              variant="outline"
              size="lg"
              fullWidth
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes scale-in {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        :global(.animate-confetti) {
          animation: confetti ease-in forwards;
        }

        :global(.animate-scale-in) {
          animation: scale-in 0.3s ease-out;
        }

        :global(.animate-bounce-slow) {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

/**
 * Example Usage:
 *
 * <SuccessCelebration
 *   title="🎉 Your First Roster is Ready!"
 *   message="This would have taken 4 hours manually. You did it in 2 minutes."
 *   stats={[
 *     { label: 'Time Saved', value: '3h 58min', icon: '⏱️' },
 *     { label: 'Guards Rostered', value: '12', icon: '👥' },
 *   ]}
 *   primaryAction={{
 *     label: 'Review Roster',
 *     onClick: () => router.push('/roster'),
 *   }}
 *   secondaryAction={{
 *     label: 'Create Another',
 *     onClick: () => setShowModal(false),
 *   }}
 *   showConfetti={true}
 * />
 */
