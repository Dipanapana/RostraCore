/**
 * Analytics Framework
 *
 * Centralized event tracking for conversion optimization
 *
 * Supports:
 * - Event tracking
 * - User identification
 * - Conversion funnels
 * - A/B testing
 * - Multiple providers (Mixpanel, Segment, GA4)
 *
 * Usage:
 * ```typescript
 * import { analytics } from '@/lib/analytics';
 *
 * analytics.track('Button Clicked', { location: 'hero', type: 'primary_cta' });
 * analytics.identify('user123', { email: 'user@example.com', plan: 'professional' });
 * ```
 */

// Event types for type safety
export type AnalyticsEvent =
  // Landing Page Events
  | 'page_viewed'
  | 'cta_clicked'
  | 'video_played'
  | 'language_switched'

  // Pricing Events
  | 'pricing_cta_clicked'
  | 'billing_cycle_toggled'
  | 'roi_calculator_used'

  // Onboarding Events
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_step_skipped'
  | 'onboarding_completed'

  // Conversion Events
  | 'signup_started'
  | 'signup_completed'
  | 'trial_started'
  | 'subscription_created'

  // Feature Usage
  | 'roster_generated'
  | 'employee_added'
  | 'site_created'
  | 'marketplace_viewed'

  // Engagement
  | 'mobile_nav_clicked'
  | 'search_performed'
  | 'filter_applied';

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

export interface UserProperties {
  email?: string;
  name?: string;
  organization?: string;
  plan?: 'starter' | 'professional' | 'enterprise';
  trial_end_date?: string;
  signup_date?: string;
  [key: string]: string | number | boolean | null | undefined;
}

class Analytics {
  private isInitialized = false;
  private isDevelopment = process.env.NODE_ENV === 'development';
  private debugMode = true; // Set to false in production

  /**
   * Initialize analytics providers
   */
  init() {
    if (this.isInitialized) return;

    // In production, you would initialize your analytics providers here:
    // Example with Mixpanel:
    // if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
    //   mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN);
    // }

    // Example with Segment:
    // if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY) {
    //   analytics.load(process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY);
    // }

    this.isInitialized = true;

    if (this.debugMode) {
      console.log('📊 Analytics initialized');
    }
  }

  /**
   * Track an event
   */
  track(eventName: AnalyticsEvent, properties?: EventProperties) {
    this.init();

    const eventData = {
      event: eventName,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        page_url: typeof window !== 'undefined' ? window.location.href : '',
        page_path: typeof window !== 'undefined' ? window.location.pathname : '',
        referrer: typeof window !== 'undefined' ? document.referrer : '',
        user_agent: typeof window !== 'undefined' ? navigator.userAgent : '',
      },
    };

    // Log to console in development
    if (this.debugMode) {
      console.log('📊 Track Event:', eventName, properties);
    }

    // Send to analytics providers
    this.sendToProviders('track', eventData);

    return eventData;
  }

  /**
   * Identify a user
   */
  identify(userId: string, properties?: UserProperties) {
    this.init();

    if (this.debugMode) {
      console.log('👤 Identify User:', userId, properties);
    }

    // Send to analytics providers
    this.sendToProviders('identify', { userId, properties });
  }

  /**
   * Track page view
   */
  page(pageName?: string, properties?: EventProperties) {
    this.init();

    const pageData = {
      name: pageName || (typeof window !== 'undefined' ? document.title : ''),
      properties: {
        ...properties,
        url: typeof window !== 'undefined' ? window.location.href : '',
        path: typeof window !== 'undefined' ? window.location.pathname : '',
        referrer: typeof window !== 'undefined' ? document.referrer : '',
      },
    };

    if (this.debugMode) {
      console.log('📄 Page View:', pageData);
    }

    this.sendToProviders('page', pageData);
  }

  /**
   * Track conversion funnel step
   */
  trackFunnel(funnelName: string, step: number, stepName: string, properties?: EventProperties) {
    this.track('page_viewed' as AnalyticsEvent, {
      funnel_name: funnelName,
      funnel_step: step,
      funnel_step_name: stepName,
      ...properties,
    });
  }

  /**
   * Track A/B test variant
   */
  trackExperiment(experimentName: string, variant: string, properties?: EventProperties) {
    this.track('page_viewed' as AnalyticsEvent, {
      experiment_name: experimentName,
      experiment_variant: variant,
      ...properties,
    });
  }

  /**
   * Send data to analytics providers
   */
  private sendToProviders(method: 'track' | 'identify' | 'page', data: any) {
    // Example: Send to Mixpanel
    // if (typeof window !== 'undefined' && (window as any).mixpanel) {
    //   if (method === 'track') {
    //     (window as any).mixpanel.track(data.event, data.properties);
    //   } else if (method === 'identify') {
    //     (window as any).mixpanel.identify(data.userId);
    //     (window as any).mixpanel.people.set(data.properties);
    //   } else if (method === 'page') {
    //     (window as any).mixpanel.track('Page Viewed', data.properties);
    //   }
    // }

    // Example: Send to Segment
    // if (typeof window !== 'undefined' && (window as any).analytics) {
    //   if (method === 'track') {
    //     (window as any).analytics.track(data.event, data.properties);
    //   } else if (method === 'identify') {
    //     (window as any).analytics.identify(data.userId, data.properties);
    //   } else if (method === 'page') {
    //     (window as any).analytics.page(data.name, data.properties);
    //   }
    // }

    // Example: Send to Google Analytics 4
    // if (typeof window !== 'undefined' && (window as any).gtag) {
    //   if (method === 'track') {
    //     (window as any).gtag('event', data.event, data.properties);
    //   } else if (method === 'page') {
    //     (window as any).gtag('event', 'page_view', data.properties);
    //   }
    // }

    // For now, just store in sessionStorage for debugging
    if (typeof window !== 'undefined' && this.debugMode) {
      const events = JSON.parse(sessionStorage.getItem('analytics_events') || '[]');
      events.push({ method, data, timestamp: new Date().toISOString() });
      sessionStorage.setItem('analytics_events', JSON.stringify(events.slice(-100))); // Keep last 100
    }
  }

  /**
   * Get all tracked events (for debugging)
   */
  getEvents() {
    if (typeof window === 'undefined') return [];
    return JSON.parse(sessionStorage.getItem('analytics_events') || '[]');
  }

  /**
   * Clear all tracked events (for debugging)
   */
  clearEvents() {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('analytics_events');
    }
  }
}

// Singleton instance
export const analytics = new Analytics();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  analytics.init();
}

/**
 * Conversion Funnel Definitions
 */
export const ConversionFunnels = {
  SIGNUP: {
    name: 'Signup Funnel',
    steps: [
      { step: 1, name: 'Landing Page Viewed' },
      { step: 2, name: 'Pricing Page Viewed' },
      { step: 3, name: 'Signup Form Viewed' },
      { step: 4, name: 'Signup Form Submitted' },
      { step: 5, name: 'Email Verified' },
      { step: 6, name: 'Onboarding Started' },
      { step: 7, name: 'Onboarding Completed' },
    ],
  },
  ONBOARDING: {
    name: 'Onboarding Funnel',
    steps: [
      { step: 1, name: 'Add Employees' },
      { step: 2, name: 'Create Site' },
      { step: 3, name: 'Generate Roster' },
      { step: 4, name: 'Invite Team' },
      { step: 5, name: 'Connect Accounting' },
    ],
  },
  MARKETPLACE: {
    name: 'Marketplace Hiring Funnel',
    steps: [
      { step: 1, name: 'Marketplace Viewed' },
      { step: 2, name: 'Search Performed' },
      { step: 3, name: 'Guard Profile Viewed' },
      { step: 4, name: 'Contact Initiated' },
      { step: 5, name: 'Hire Completed' },
    ],
  },
};

/**
 * Helper functions for common tracking patterns
 */
export const trackingHelpers = {
  /**
   * Track CTA click with location context
   */
  trackCTA: (location: string, type: string, additionalProps?: EventProperties) => {
    analytics.track('cta_clicked', {
      location,
      type,
      ...additionalProps,
    });
  },

  /**
   * Track form submission
   */
  trackFormSubmit: (formName: string, success: boolean, errorMessage?: string) => {
    analytics.track('page_viewed' as AnalyticsEvent, {
      form_name: formName,
      form_submitted: true,
      form_success: success,
      form_error: errorMessage || null,
    });
  },

  /**
   * Track feature usage
   */
  trackFeature: (featureName: string, action: string, properties?: EventProperties) => {
    analytics.track('page_viewed' as AnalyticsEvent, {
      feature_name: featureName,
      feature_action: action,
      ...properties,
    });
  },

  /**
   * Track error
   */
  trackError: (errorType: string, errorMessage: string, context?: EventProperties) => {
    analytics.track('page_viewed' as AnalyticsEvent, {
      error_type: errorType,
      error_message: errorMessage,
      ...context,
    });
  },
};

/**
 * React Hook for tracking page views
 */
export const usePageTracking = () => {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    analytics.page(document.title);
    return path;
  }
  return null;
};
