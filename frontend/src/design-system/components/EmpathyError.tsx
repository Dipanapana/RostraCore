/**
 * Empathetic Error Component
 *
 * Handles errors with empathy, not blame
 * Prevents users from regressing to Fear state
 *
 * Psychology: Errors as learning moments, not failures
 */

'use client';

import React from 'react';
import { Button } from './Button';

export type ErrorSeverity = 'info' | 'warning' | 'error';

export interface ErrorSolution {
  label: string;
  onClick: () => void;
}

export interface EmpathyErrorProps {
  severity?: ErrorSeverity;
  title?: string;
  message: string;
  explanation?: string;
  solutions?: ErrorSolution[];
  supportLink?: {
    label?: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  className?: string;
}

export const EmpathyError: React.FC<EmpathyErrorProps> = ({
  severity = 'warning',
  title,
  message,
  explanation,
  solutions = [],
  supportLink,
  onDismiss,
  className = '',
}) => {
  const config = {
    info: {
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      ),
      bgColor: 'bg-primary-50',
      borderColor: 'border-primary-300',
      iconColor: 'text-primary-500',
      textColor: 'text-primary-900',
      defaultTitle: 'Just so you know',
    },
    warning: {
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
      bgColor: 'bg-accent-50',
      borderColor: 'border-accent-300',
      iconColor: 'text-accent-500',
      textColor: 'text-accent-900',
      defaultTitle: 'Heads up',
    },
    error: {
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      ),
      bgColor: 'bg-danger-50',
      borderColor: 'border-danger-300',
      iconColor: 'text-danger-500',
      textColor: 'text-danger-900',
      defaultTitle: 'Oops',
    },
  };

  const { icon, bgColor, borderColor, iconColor, textColor, defaultTitle } = config[severity];

  return (
    <div className={`${bgColor} border-2 ${borderColor} rounded-xl p-6 ${className}`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 ${iconColor}`}>
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          {(title || defaultTitle) && (
            <h4 className={`font-bold ${textColor} mb-2`}>
              {title || defaultTitle}
            </h4>
          )}

          {/* Message */}
          <p className={`${textColor} mb-3 leading-relaxed`}>
            {message}
          </p>

          {/* Explanation (Why it matters) */}
          {explanation && (
            <p className="text-gray-700 text-sm mb-4 leading-relaxed bg-white/50 p-3 rounded-lg">
              💡 {explanation}
            </p>
          )}

          {/* Solutions */}
          {solutions.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-sm font-semibold text-gray-900">
                Here's what you can do:
              </p>
              {solutions.map((solution, index) => (
                <button
                  key={index}
                  onClick={solution.onClick}
                  className="flex items-center gap-2 w-full text-left px-4 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold group-hover:bg-primary-500 group-hover:text-white transition-colors">
                    {index + 1}
                  </span>
                  <span className="text-gray-900 font-medium">
                    {solution.label}
                  </span>
                  <svg
                    className="w-5 h-5 text-gray-400 ml-auto group-hover:text-primary-500 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}

          {/* Support Link */}
          {supportLink && (
            <div className="border-t border-gray-300 pt-4">
              <button
                onClick={supportLink.onClick}
                className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                {supportLink.label || 'Contact Support (We\'re here to help!)'}
              </button>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Inline Error (for form validation)
 */
export interface InlineErrorProps {
  message: string;
  suggestion?: string;
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({ message, suggestion, className = '' }) => {
  return (
    <div className={`flex items-start gap-2 text-sm mt-2 ${className}`}>
      <svg className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      <div>
        <p className="text-danger-700 font-medium">{message}</p>
        {suggestion && (
          <p className="text-gray-600 mt-1">{suggestion}</p>
        )}
      </div>
    </div>
  );
};

/**
 * Success Message (positive feedback)
 */
export interface SuccessMessageProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({ message, action, className = '' }) => {
  return (
    <div className={`bg-success-50 border-2 border-success-300 rounded-xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-success-500 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-success-900 font-medium">{message}</p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-sm text-success-700 hover:text-success-800 font-semibold underline"
            >
              {action.label} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Example Usage:
 *
 * // Empathetic Error with Solutions
 * <EmpathyError
 *   severity="error"
 *   title="Hmm, that ID number looks too short"
 *   message="Oops! That ID number is only 12 digits."
 *   explanation="South African IDs are always 13 digits, which helps us verify PSIRA compliance and calculate accurate leave days."
 *   solutions={[
 *     {
 *       label: 'Double-check and try again',
 *       onClick: () => setShowError(false),
 *     },
 *     {
 *       label: 'Use passport number instead',
 *       onClick: () => setFieldType('passport'),
 *     },
 *   ]}
 *   supportLink={{
 *     label: 'Need help? Chat with us',
 *     onClick: () => openChat(),
 *   }}
 * />
 *
 * // Inline Form Error
 * <InlineError
 *   message="Please enter a valid phone number"
 *   suggestion="SA phone numbers start with 0 and have 10 digits"
 * />
 *
 * // Success Message
 * <SuccessMessage
 *   message="Employee added successfully!"
 *   action={{
 *     label: 'Add another employee',
 *     onClick: () => resetForm(),
 *   }}
 * />
 */
