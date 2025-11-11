'use client';

/**
 * PWA Install Prompt Component
 *
 * Shows a dismissible banner prompting users to install the app
 * Displays only when:
 * - App is not already installed
 * - Install prompt is available
 * - User hasn't dismissed it recently
 */

import { useState, useEffect } from 'react';
import { promptInstall, canInstall, isAppInstalled } from '@/utils/pwa';

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if we should show the prompt
    const shouldShow =
      !isAppInstalled() &&
      canInstall() &&
      !localStorage.getItem('pwa-install-dismissed');

    setShowPrompt(shouldShow);

    // Listen for install availability
    const handleInstallAvailable = () => {
      if (!isAppInstalled() && !localStorage.getItem('pwa-install-dismissed')) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
    };
  }, []);

  const handleInstall = async () => {
    const installed = await promptInstall();

    if (installed) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());

    // Re-show after 7 days
    setTimeout(() => {
      localStorage.removeItem('pwa-install-dismissed');
    }, 7 * 24 * 60 * 60 * 1000);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-40 animate-slide-up">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-2xl p-4 text-white">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <div className="text-3xl mr-3">📱</div>
            <div>
              <h3 className="font-bold text-lg">Install RostraCore</h3>
              <p className="text-blue-100 text-sm">Add to home screen</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Benefits */}
        <ul className="space-y-2 mb-4 text-sm">
          <li className="flex items-center">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>Works offline</span>
          </li>
          <li className="flex items-center">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>Faster loading</span>
          </li>
          <li className="flex items-center">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>App-like experience</span>
          </li>
        </ul>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 h-10 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 h-10 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Slide-up animation for install prompt
 */
const styles = `
  @keyframes slide-up {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
