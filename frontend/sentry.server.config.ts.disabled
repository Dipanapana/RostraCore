/**
 * Sentry Server Configuration
 * Captures errors and performance data on the Next.js server
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "development";

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,

    // Performance Monitoring
    tracesSampleRate: 0.1, // Capture 10% of transactions

    // Release tracking
    release: "rostracore-frontend@1.0.0",

    // Server-specific integrations
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
    ],

    // Error filtering
    beforeSend(event) {
      // Server-side errors are always important
      return event;
    },
  });
}
