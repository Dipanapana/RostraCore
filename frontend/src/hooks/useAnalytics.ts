/**
 * Analytics React Hook
 *
 * Provides easy access to analytics in React components
 * with automatic page view tracking
 */

'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analytics, type AnalyticsEvent, type EventProperties } from '@/lib/analytics';

/**
 * Hook for tracking page views automatically
 */
export function usePageTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      const url = searchParams ? `${pathname}?${searchParams}` : pathname;
      analytics.page(document.title, {
        path: pathname,
        search: searchParams?.toString() || '',
      });
    }
  }, [pathname, searchParams]);
}

/**
 * Hook for accessing analytics methods
 */
export function useAnalytics() {
  return {
    track: (event: AnalyticsEvent, properties?: EventProperties) => {
      analytics.track(event, properties);
    },

    identify: (userId: string, properties?: any) => {
      analytics.identify(userId, properties);
    },

    trackFunnel: (funnelName: string, step: number, stepName: string, properties?: EventProperties) => {
      analytics.trackFunnel(funnelName, step, stepName, properties);
    },

    trackExperiment: (experimentName: string, variant: string, properties?: EventProperties) => {
      analytics.trackExperiment(experimentName, variant, properties);
    },
  };
}

/**
 * Hook for tracking component mount/unmount
 */
export function useComponentTracking(componentName: string, properties?: EventProperties) {
  useEffect(() => {
    analytics.track('page_viewed', {
      component_name: componentName,
      component_action: 'mounted',
      ...properties,
    });

    return () => {
      analytics.track('page_viewed', {
        component_name: componentName,
        component_action: 'unmounted',
        ...properties,
      });
    };
  }, [componentName, properties]);
}

/**
 * Hook for tracking form interactions
 */
export function useFormTracking(formName: string) {
  return {
    trackStart: () => {
      analytics.track('page_viewed', {
        form_name: formName,
        form_action: 'started',
      });
    },

    trackField: (fieldName: string, action: 'focused' | 'blurred' | 'changed') => {
      analytics.track('page_viewed', {
        form_name: formName,
        field_name: fieldName,
        field_action: action,
      });
    },

    trackSubmit: (success: boolean, errorMessage?: string) => {
      analytics.track('page_viewed', {
        form_name: formName,
        form_action: 'submitted',
        form_success: success,
        form_error: errorMessage || null,
      });
    },

    trackAbandon: () => {
      analytics.track('page_viewed', {
        form_name: formName,
        form_action: 'abandoned',
      });
    },
  };
}

/**
 * Hook for A/B testing
 */
export function useExperiment(experimentName: string, variants: string[]) {
  // Simple variant assignment based on user (in production, use a proper A/B testing service)
  const getVariant = () => {
    if (typeof window === 'undefined') return variants[0];

    const storageKey = `experiment_${experimentName}`;
    const stored = sessionStorage.getItem(storageKey);

    if (stored && variants.includes(stored)) {
      return stored;
    }

    // Random assignment
    const variant = variants[Math.floor(Math.random() * variants.length)];
    sessionStorage.setItem(storageKey, variant);

    // Track variant assignment
    analytics.trackExperiment(experimentName, variant);

    return variant;
  };

  const variant = getVariant();

  return {
    variant,
    isVariant: (variantName: string) => variant === variantName,
  };
}
