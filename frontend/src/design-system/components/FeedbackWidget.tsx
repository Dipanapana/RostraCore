/**
 * Feedback Widget Component
 *
 * Collects user feedback at strategic moments
 * Based on psychological timing principles
 *
 * Features:
 * - Quick feedback (emoji reactions)
 * - Detailed feedback (text input)
 * - Bug reporting
 * - Feature requests
 * - Smart timing (after success moments)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button, Card } from './index';
import { dataCollection } from '@/lib/dataCollection';
import { analytics } from '@/lib/analytics';

export type FeedbackType = 'general' | 'bug' | 'feature_request' | 'nps';

export interface FeedbackWidgetProps {
  trigger?: 'button' | 'auto';
  autoTriggerDelay?: number; // milliseconds
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  onFeedbackSubmit?: (feedback: FeedbackData) => void;
}

export interface FeedbackData {
  type: FeedbackType;
  rating?: number; // 1-5 stars or 0-10 NPS
  message: string;
  email?: string;
  metadata: {
    url: string;
    userAgent: string;
    timestamp: string;
    [key: string]: any;
  };
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({
  trigger = 'button',
  autoTriggerDelay = 30000, // 30 seconds
  position = 'bottom-right',
  onFeedbackSubmit,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'type' | 'rating' | 'message' | 'success'>('type');
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [rating, setRating] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-trigger logic
  useEffect(() => {
    if (trigger === 'auto' && !sessionStorage.getItem('feedback_shown')) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem('feedback_shown', 'true');
        analytics.track('page_viewed', { feedback_widget_auto_shown: true });
      }, autoTriggerDelay);

      return () => clearTimeout(timer);
    }
  }, [trigger, autoTriggerDelay]);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const feedbackData: FeedbackData = {
      type: feedbackType,
      rating: feedbackType === 'nps' || step === 'rating' ? rating : undefined,
      message,
      email: email || undefined,
      metadata: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
    };

    // Track in analytics
    analytics.track('page_viewed', {
      feedback_submitted: true,
      feedback_type: feedbackType,
      feedback_rating: rating,
      feedback_has_message: Boolean(message),
      feedback_has_email: Boolean(email),
    });

    // Tag session for review
    dataCollection.tagSession({
      has_feedback: true,
      feedback_type: feedbackType,
      feedback_rating: rating,
    });

    // Call custom handler
    if (onFeedbackSubmit) {
      await onFeedbackSubmit(feedbackData);
    } else {
      // Default: Send to API
      try {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feedbackData),
        });
      } catch (error) {
        console.error('Failed to submit feedback:', error);
      }
    }

    setIsSubmitting(false);
    setStep('success');

    // Reset after 3 seconds
    setTimeout(() => {
      setIsOpen(false);
      resetForm();
    }, 3000);
  };

  const resetForm = () => {
    setStep('type');
    setFeedbackType('general');
    setRating(0);
    setMessage('');
    setEmail('');
  };

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  return (
    <>
      {/* Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            analytics.track('page_viewed', { feedback_widget_opened: true });
          }}
          className={`
            fixed ${positionClasses[position]} z-40
            bg-primary-500 hover:bg-primary-600
            text-white font-semibold
            px-6 py-3 rounded-full shadow-lg
            transition-all duration-300 hover:scale-105
            flex items-center gap-2
          `}
          aria-label="Give feedback"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
            <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
          </svg>
          Feedback
        </button>
      )}

      {/* Feedback Widget */}
      {isOpen && (
        <div className={`fixed ${positionClasses[position]} z-50 w-96 max-w-[calc(100vw-2rem)]`}>
          <Card variant="elevated" padding="none" className="shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-accent-500 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg">
                {step === 'success' ? '✅ Thank you!' : '💬 Share Your Feedback'}
              </h3>
              <button
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Step 1: Choose Type */}
              {step === 'type' && (
                <div className="space-y-4">
                  <p className="text-gray-700 mb-4">What would you like to share?</p>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { type: 'general', icon: '💭', label: 'General Feedback' },
                      { type: 'bug', icon: '🐛', label: 'Report a Bug' },
                      { type: 'feature_request', icon: '💡', label: 'Feature Request' },
                      { type: 'nps', icon: '⭐', label: 'Rate Us (NPS)' },
                    ].map((option) => (
                      <button
                        key={option.type}
                        onClick={() => {
                          setFeedbackType(option.type as FeedbackType);
                          setStep(option.type === 'nps' || option.type === 'general' ? 'rating' : 'message');
                        }}
                        className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all group"
                      >
                        <span className="text-3xl">{option.icon}</span>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700 text-center">
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Rating (for general/NPS) */}
              {step === 'rating' && (
                <div className="space-y-4">
                  <p className="text-gray-700">
                    {feedbackType === 'nps'
                      ? 'How likely are you to recommend RostraCore to another security company owner?'
                      : 'How would you rate your experience?'}
                  </p>

                  {feedbackType === 'nps' ? (
                    // NPS Scale (0-10)
                    <div className="grid grid-cols-11 gap-1">
                      {Array.from({ length: 11 }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => setRating(i)}
                          className={`
                            h-12 rounded-lg font-bold text-sm transition-all
                            ${
                              rating === i
                                ? 'bg-primary-500 text-white scale-110'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }
                          `}
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                  ) : (
                    // Star Rating (1-5)
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className="transition-transform hover:scale-125"
                        >
                          <svg
                            className={`w-12 h-12 ${
                              star <= rating ? 'text-accent-500' : 'text-gray-300'
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Not likely</span>
                    <span>Very likely</span>
                  </div>

                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => setStep('message')}
                    disabled={rating === 0}
                  >
                    Continue
                  </Button>
                </div>
              )}

              {/* Step 3: Message */}
              {step === 'message' && (
                <div className="space-y-4">
                  <p className="text-gray-700">
                    {feedbackType === 'bug'
                      ? 'Please describe the bug you encountered:'
                      : feedbackType === 'feature_request'
                      ? 'What feature would you like to see?'
                      : 'Tell us more (optional):'}
                  </p>

                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      feedbackType === 'bug'
                        ? 'What happened? What did you expect to happen?'
                        : feedbackType === 'feature_request'
                        ? 'Describe the feature and how it would help you...'
                        : 'Your feedback...'
                    }
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none"
                  />

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email (optional - for follow-up)"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={() => setStep(feedbackType === 'nps' || feedbackType === 'general' ? 'rating' : 'type')}
                    >
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={handleSubmit}
                      loading={isSubmitting}
                      disabled={feedbackType !== 'general' && !message}
                    >
                      Submit
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Success */}
              {step === 'success' && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🎉</div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">
                    Thank you!
                  </h4>
                  <p className="text-gray-600">
                    Your feedback helps us make RostraCore better for everyone.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

/**
 * Quick Emoji Feedback
 * Simple emoji reactions for quick feedback
 */
export interface QuickFeedbackProps {
  question: string;
  onFeedback: (emoji: string) => void;
  className?: string;
}

export const QuickFeedback: React.FC<QuickFeedbackProps> = ({
  question,
  onFeedback,
  className = '',
}) => {
  const [selected, setSelected] = useState<string | null>(null);

  const emojis = [
    { emoji: '😍', label: 'Love it' },
    { emoji: '😊', label: 'Good' },
    { emoji: '😐', label: 'Okay' },
    { emoji: '😕', label: 'Not great' },
    { emoji: '😤', label: 'Frustrated' },
  ];

  return (
    <div className={`bg-primary-50 border border-primary-200 rounded-xl p-6 ${className}`}>
      <p className="text-gray-900 font-medium mb-4 text-center">{question}</p>

      <div className="flex justify-center gap-3">
        {emojis.map(({ emoji, label }) => (
          <button
            key={emoji}
            onClick={() => {
              setSelected(emoji);
              onFeedback(emoji);
              analytics.track('page_viewed', {
                quick_feedback_emoji: emoji,
                quick_feedback_label: label,
              });
            }}
            className={`
              text-4xl p-3 rounded-full transition-all
              ${
                selected === emoji
                  ? 'bg-primary-500 scale-125'
                  : 'hover:bg-white hover:scale-110'
              }
            `}
            aria-label={label}
            title={label}
          >
            {emoji}
          </button>
        ))}
      </div>

      {selected && (
        <p className="text-center text-sm text-success-600 font-medium mt-4">
          ✅ Thank you for your feedback!
        </p>
      )}
    </div>
  );
};

/**
 * Example Usage:
 *
 * // Full feedback widget
 * <FeedbackWidget
 *   trigger="button"
 *   position="bottom-right"
 *   onFeedbackSubmit={async (feedback) => {
 *     console.log('Feedback:', feedback);
 *   }}
 * />
 *
 * // Quick emoji feedback
 * <QuickFeedback
 *   question="How was your experience generating that roster?"
 *   onFeedback={(emoji) => console.log('User selected:', emoji)}
 * />
 */
