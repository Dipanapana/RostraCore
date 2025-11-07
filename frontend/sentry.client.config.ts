/**
 * Sentry Client Configuration
 * Captures errors and performance data in the browser
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "development";

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,

    // Performance Monitoring
    tracesSampleRate: 0.1, // Capture 10% of transactions for performance monitoring

    // Session Replay
    replaysSessionSampleRate: 0.1, // Sample 10% of sessions
    replaysOnErrorSampleRate: 1.0, // Sample 100% of sessions with errors

    // Integrations
    integrations: [
      new Sentry.BrowserTracing({
        // Track user interactions
        tracingOrigins: ["localhost", process.env.NEXT_PUBLIC_API_URL || ""],
      }),
      new Sentry.Replay({
        // Mask sensitive data
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Release tracking
    release: "rostracore-frontend@1.0.0",

    // Error filtering
    beforeSend(event, hint) {
      // Filter out certain errors
      const error = hint.originalException;

      // Ignore ResizeObserver errors (common false positives)
      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string' &&
        error.message.includes('ResizeObserver')
      ) {
        return null;
      }

      return event;
    },

    // Additional configuration
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random plugins/extensions
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      // Network errors
      'NetworkError',
      'Network request failed',
    ],
  });
}
