/**
 * Contextual Help Component
 *
 * Reduces anxiety by providing just-in-time assistance
 * Shows help exactly when and where users need it
 *
 * Psychology: Reduces cognitive load, builds confidence
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface ContextualHelpProps {
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  helpType?: 'info' | 'warning' | 'tip';
  children: React.ReactNode;
  className?: string;
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  title,
  content,
  position = 'top',
  helpType = 'info',
  children,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const iconColors = {
    info: 'text-primary-500',
    warning: 'text-accent-500',
    tip: 'text-success-500',
  };

  const tooltipColors = {
    info: 'bg-primary-50 border-primary-200',
    warning: 'bg-accent-50 border-accent-200',
    tip: 'bg-success-50 border-success-200',
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  };

  return (
    <div ref={containerRef} className={`relative inline-flex items-center gap-2 ${className}`}>
      {children}

      {/* Help Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 ${iconColors[helpType]} border-current flex items-center justify-center hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
        aria-label="Show help"
      >
        <span className="text-xs font-bold">?</span>
      </button>

      {/* Tooltip */}
      {isOpen && (
        <div
          className={`
            absolute z-50 ${positionClasses[position]}
            w-72 p-4 rounded-lg shadow-xl border-2
            ${tooltipColors[helpType]}
            animate-fade-in
          `}
        >
          {/* Arrow */}
          <div
            className={`
              absolute w-3 h-3 transform rotate-45
              ${tooltipColors[helpType]}
              ${position === 'top' ? 'bottom-[-8px] left-1/2 -translate-x-1/2 border-b-2 border-r-2' : ''}
              ${position === 'bottom' ? 'top-[-8px] left-1/2 -translate-x-1/2 border-t-2 border-l-2' : ''}
              ${position === 'left' ? 'right-[-8px] top-1/2 -translate-y-1/2 border-r-2 border-t-2' : ''}
              ${position === 'right' ? 'left-[-8px] top-1/2 -translate-y-1/2 border-l-2 border-b-2' : ''}
            `}
          />

          {/* Content */}
          <div className="relative">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute -top-2 -right-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h4 className="font-bold text-gray-900 mb-2 pr-4">
              {title}
            </h4>

            <p className="text-sm text-gray-700 leading-relaxed">
              {content}
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        :global(.animate-fade-in) {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

/**
 * Quick Help Component (Inline Hint)
 * For smaller, less intrusive help text
 */
export interface QuickHelpProps {
  children: React.ReactNode;
  className?: string;
}

export const QuickHelp: React.FC<QuickHelpProps> = ({ children, className = '' }) => {
  return (
    <div className={`flex items-start gap-2 p-3 bg-primary-50 border border-primary-200 rounded-lg ${className}`}>
      <svg className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
      <div className="text-sm text-primary-900">
        {children}
      </div>
    </div>
  );
};

/**
 * Pro Tip Component
 * For advanced tips and best practices
 */
export interface ProTipProps {
  children: React.ReactNode;
  className?: string;
}

export const ProTip: React.FC<ProTipProps> = ({ children, className = '' }) => {
  return (
    <div className={`flex items-start gap-3 p-4 bg-gradient-to-r from-accent-50 to-success-50 border-2 border-accent-200 rounded-xl ${className}`}>
      <div className="flex-shrink-0 w-8 h-8 bg-accent-500 rounded-full flex items-center justify-center">
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </div>
      <div>
        <div className="font-semibold text-accent-900 mb-1">💡 Pro Tip</div>
        <div className="text-sm text-gray-700">
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * Example Usage:
 *
 * // Contextual Help (with tooltip)
 * <ContextualHelp
 *   title="Why do we need this?"
 *   content="South African ID numbers help us verify PSIRA compliance and ensure accurate payroll calculations."
 *   position="right"
 *   helpType="info"
 * >
 *   <Input label="ID Number" />
 * </ContextualHelp>
 *
 * // Quick Help (inline hint)
 * <QuickHelp>
 *   Don't worry, you can change this later in Settings
 * </QuickHelp>
 *
 * // Pro Tip
 * <ProTip>
 *   Add guards in bulk by uploading a CSV file. This can save you 20 minutes if you have 50+ employees.
 * </ProTip>
 */
