/**
 * NPS (Net Promoter Score) Survey Component
 *
 * Measures customer loyalty and satisfaction
 * Triggers at strategic moments in the user journey
 *
 * NPS Categories:
 * - 0-6: Detractors (unhappy customers)
 * - 7-8: Passives (satisfied but not enthusiastic)
 * - 9-10: Promoters (loyal enthusiasts)
 *
 * Formula: NPS = % Promoters - % Detractors
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button, Card } from './index';
import { analytics } from '@/lib/analytics';
import { dataCollection } from '@/lib/dataCollection';

export interface NPSSurveyProps {
  onComplete?: (score: number, feedback?: string) => void;
  onDismiss?: () => void;
  triggerAfterDays?: number; // Auto-trigger after X days of usage
  showOnMount?: boolean;
  customQuestion?: string;
}

export const NPSSurvey: React.FC<NPSSurveyProps> = ({
  onComplete,
  onDismiss,
  triggerAfterDays = 14,
  showOnMount = false,
  customQuestion,
}) => {
  const [isVisible, setIsVisible] = useState(showOnMount);
  const [step, setStep] = useState<'score' | 'feedback' | 'success'>('score');
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-trigger logic
  useEffect(() => {
    if (!showOnMount) {
      checkAndTriggerNPS();
    }
  }, [showOnMount, triggerAfterDays]);

  const checkAndTriggerNPS = () => {
    const lastShown = localStorage.getItem('nps_last_shown');
    const dismissed = localStorage.getItem('nps_dismissed');
    const completed = localStorage.getItem('nps_completed');

    // Don't show if dismissed or completed recently (within 90 days)
    if (dismissed || completed) {
      const lastDate = new Date(dismissed || completed || '');
      const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSince < 90) {
        return; // Don't show again for 90 days
      }
    }

    // Check if user has been active for X days
    const signupDate = localStorage.getItem('user_signup_date');
    if (signupDate) {
      const daysSinceSignup = (Date.now() - new Date(signupDate).getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceSignup >= triggerAfterDays) {
        setIsVisible(true);
        localStorage.setItem('nps_last_shown', new Date().toISOString());

        analytics.track('page_viewed', {
          nps_survey_shown: true,
          days_since_signup: daysSinceSignup,
        });
      }
    }
  };

  const handleScoreSelect = (selectedScore: number) => {
    setScore(selectedScore);
    setStep('feedback');

    analytics.track('page_viewed', {
      nps_score_selected: selectedScore,
      nps_category: getCategoryForScore(selectedScore),
    });

    dataCollection.tagSession({
      nps_score: selectedScore,
      nps_category: getCategoryForScore(selectedScore),
    });
  };

  const handleSubmit = async () => {
    if (score === null) return;

    setIsSubmitting(true);

    const npsData = {
      score,
      feedback: feedback || undefined,
      category: getCategoryForScore(score),
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    // Track in analytics
    analytics.track('page_viewed', {
      nps_survey_completed: true,
      nps_score: score,
      nps_category: npsData.category,
      nps_has_feedback: Boolean(feedback),
    });

    // Tag session
    dataCollection.tagSession({
      nps_completed: true,
      nps_score: score,
    });

    // Store completion
    localStorage.setItem('nps_completed', new Date().toISOString());
    localStorage.setItem('nps_last_score', score.toString());

    // Call custom handler
    if (onComplete) {
      await onComplete(score, feedback || undefined);
    } else {
      // Default: Send to API
      try {
        await fetch('/api/nps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(npsData),
        });
      } catch (error) {
        console.error('Failed to submit NPS:', error);
      }
    }

    setIsSubmitting(false);
    setStep('success');

    // Auto-close after 3 seconds
    setTimeout(() => {
      setIsVisible(false);
    }, 3000);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('nps_dismissed', new Date().toISOString());

    analytics.track('page_viewed', {
      nps_survey_dismissed: true,
      nps_step: step,
    });

    if (onDismiss) {
      onDismiss();
    }
  };

  const getCategoryForScore = (score: number): 'detractor' | 'passive' | 'promoter' => {
    if (score <= 6) return 'detractor';
    if (score <= 8) return 'passive';
    return 'promoter';
  };

  const getFeedbackPrompt = (score: number): string => {
    if (score <= 6) {
      return "We're sorry to hear that. What can we do better?";
    }
    if (score <= 8) {
      return 'Thanks! What would make RostraCore a 9 or 10 for you?';
    }
    return "That's great! What do you love most about RostraCore?";
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <Card variant="elevated" padding="none" className="max-w-2xl w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-accent-500 p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-2xl">Quick Question</h3>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-primary-100">Help us serve you better (takes 30 seconds)</p>
        </div>

        <div className="p-8">
          {/* Step 1: Score Selection */}
          {step === 'score' && (
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-gray-900 text-center">
                {customQuestion ||
                  'How likely are you to recommend RostraCore to another security company owner?'}
              </h4>

              {/* NPS Scale (0-10) */}
              <div className="grid grid-cols-11 gap-2">
                {Array.from({ length: 11 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => handleScoreSelect(i)}
                    className={`
                      h-16 rounded-xl font-bold text-lg transition-all
                      ${
                        score === i
                          ? 'bg-primary-500 text-white scale-110 shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                      }
                    `}
                  >
                    {i}
                  </button>
                ))}
              </div>

              {/* Labels */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-danger-600 font-medium">Not at all likely</span>
                <span className="text-success-600 font-medium">Extremely likely</span>
              </div>

              {/* Category Indicators */}
              <div className="grid grid-cols-3 gap-4 mt-8 text-center text-xs">
                <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                  <div className="font-bold text-danger-700">0-6</div>
                  <div className="text-danger-600">Detractors</div>
                </div>
                <div className="p-3 bg-accent-50 border border-accent-200 rounded-lg">
                  <div className="font-bold text-accent-700">7-8</div>
                  <div className="text-accent-600">Passives</div>
                </div>
                <div className="p-3 bg-success-50 border border-success-200 rounded-lg">
                  <div className="font-bold text-success-700">9-10</div>
                  <div className="text-success-600">Promoters</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Feedback */}
          {step === 'feedback' && score !== null && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">
                  {score <= 6 ? '😕' : score <= 8 ? '😊' : '🎉'}
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  You selected: {score}/10
                </h4>
                <p className="text-gray-600">{getFeedbackPrompt(score)}</p>
              </div>

              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Your thoughts (optional)..."
                rows={5}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none"
                autoFocus
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setStep('score')}
                >
                  Change Score
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleSubmit}
                  loading={isSubmitting}
                >
                  {feedback ? 'Submit Feedback' : 'Skip & Continue'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="text-7xl mb-6">🙏</div>
              <h4 className="text-3xl font-bold text-gray-900 mb-4">
                Thank You!
              </h4>
              <p className="text-lg text-gray-600 mb-6">
                Your feedback helps us build a better product for the South African security industry.
              </p>

              {score !== null && score >= 9 && (
                <div className="bg-success-50 border border-success-200 rounded-xl p-6">
                  <p className="text-success-900 font-medium mb-4">
                    Love RostraCore? Help other security companies discover us!
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        // Open referral program
                        window.location.href = '/referrals';
                      }}
                    >
                      Refer a Friend (Get 1 Month Free)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        :global(.animate-fade-in) {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

/**
 * NPS Badge - Show current NPS score
 */
export interface NPSBadgeProps {
  score: number;
  totalResponses: number;
  className?: string;
}

export const NPSBadge: React.FC<NPSBadgeProps> = ({ score, totalResponses, className = '' }) => {
  const getColor = (nps: number) => {
    if (nps >= 50) return 'text-success-600 bg-success-50 border-success-200';
    if (nps >= 0) return 'text-accent-600 bg-accent-50 border-accent-200';
    return 'text-danger-600 bg-danger-50 border-danger-200';
  };

  const getLabel = (nps: number) => {
    if (nps >= 70) return 'Excellent';
    if (nps >= 50) return 'Great';
    if (nps >= 30) return 'Good';
    if (nps >= 0) return 'Needs Work';
    return 'Poor';
  };

  return (
    <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl border-2 ${getColor(score)} ${className}`}>
      <div>
        <div className="text-3xl font-extrabold">{score}</div>
        <div className="text-xs font-medium opacity-75">NPS Score</div>
      </div>
      <div className="border-l-2 border-current/20 pl-3">
        <div className="text-sm font-bold">{getLabel(score)}</div>
        <div className="text-xs opacity-75">{totalResponses} responses</div>
      </div>
    </div>
  );
};

/**
 * Example Usage:
 *
 * // NPS Survey (auto-trigger after 14 days)
 * <NPSSurvey
 *   triggerAfterDays={14}
 *   onComplete={async (score, feedback) => {
 *     console.log('NPS Score:', score);
 *     console.log('Feedback:', feedback);
 *   }}
 * />
 *
 * // NPS Badge (display current score)
 * <NPSBadge score={52} totalResponses={147} />
 */
