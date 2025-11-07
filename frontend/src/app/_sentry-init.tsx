"use client";

/**
 * Client-side Sentry Initialization
 * This must be imported in a client component to initialize Sentry in the browser
 */

import { useEffect } from 'react';

// Import Sentry client config (this will initialize Sentry)
import '../../sentry.client.config';

export function SentryInit() {
  useEffect(() => {
    // Sentry is already initialized by the import above
    // This component just ensures it runs on the client
  }, []);

  return null;
}
