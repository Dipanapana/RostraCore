/**
 * Data Collection Service
 *
 * Comprehensive user data collection for product decisions
 *
 * Integrations:
 * - Hotjar: Heatmaps, session recordings, surveys
 * - Mouseflow: Session replay, form analytics
 * - Custom feedback collection
 * - Feature usage tracking
 *
 * Privacy-first approach - POPIA compliant
 */

import { analytics } from './analytics';

interface HotjarConfig {
  siteId: string;
  version: number;
}

interface MouseflowConfig {
  siteId: string;
}

class DataCollectionService {
  private hotjarInitialized = false;
  private mouseflowInitialized = false;
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Initialize Hotjar for heatmaps and session recordings
   */
  initHotjar(config?: HotjarConfig) {
    if (this.hotjarInitialized || typeof window === 'undefined') return;

    const siteId = config?.siteId || process.env.NEXT_PUBLIC_HOTJAR_SITE_ID;
    const version = config?.version || 6;

    if (!siteId) {
      if (this.isDevelopment) {
        console.log('⚠️ Hotjar site ID not configured');
      }
      return;
    }

    // Hotjar initialization script
    (function(h: any, o: any, t: any, j: any, a?: any, r?: any) {
      h.hj = h.hj || function() {
        (h.hj.q = h.hj.q || []).push(arguments);
      };
      h._hjSettings = { hjid: siteId, hjsv: version };
      a = o.getElementsByTagName('head')[0];
      r = o.createElement('script');
      r.async = 1;
      r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
      a.appendChild(r);
    })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');

    this.hotjarInitialized = true;

    if (this.isDevelopment) {
      console.log('🔥 Hotjar initialized');
    }
  }

  /**
   * Initialize Mouseflow for session replay
   */
  initMouseflow(config?: MouseflowConfig) {
    if (this.mouseflowInitialized || typeof window === 'undefined') return;

    const siteId = config?.siteId || process.env.NEXT_PUBLIC_MOUSEFLOW_SITE_ID;

    if (!siteId) {
      if (this.isDevelopment) {
        console.log('⚠️ Mouseflow site ID not configured');
      }
      return;
    }

    // Mouseflow initialization
    (window as any)._mfq = (window as any)._mfq || [];
    (function() {
      var mf = document.createElement('script');
      mf.type = 'text/javascript';
      mf.defer = true;
      mf.src = `//cdn.mouseflow.com/projects/${siteId}.js`;
      document.getElementsByTagName('head')[0].appendChild(mf);
    })();

    this.mouseflowInitialized = true;

    if (this.isDevelopment) {
      console.log('🖱️ Mouseflow initialized');
    }
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(featureName: string, metadata?: Record<string, any>) {
    // Track in analytics
    analytics.track('page_viewed', {
      feature_name: featureName,
      feature_used: true,
      feature_metadata: metadata,
      timestamp: new Date().toISOString(),
    });

    // Track in Hotjar
    if (this.hotjarInitialized && (window as any).hj) {
      (window as any).hj('event', `feature_${featureName}`);
    }

    // Track in Mouseflow
    if (this.mouseflowInitialized && (window as any)._mfq) {
      (window as any)._mfq.push(['tag', featureName]);
    }

    if (this.isDevelopment) {
      console.log('📊 Feature usage tracked:', featureName, metadata);
    }
  }

  /**
   * Track form interactions
   */
  trackFormInteraction(formName: string, action: 'started' | 'field_focused' | 'abandoned' | 'submitted', fieldName?: string) {
    const eventData = {
      form_name: formName,
      form_action: action,
      field_name: fieldName,
      timestamp: new Date().toISOString(),
    };

    analytics.track('page_viewed', eventData);

    // Hotjar form tracking
    if (this.hotjarInitialized && (window as any).hj) {
      (window as any).hj('event', `form_${action}_${formName}`);
    }

    if (this.isDevelopment) {
      console.log('📝 Form interaction:', eventData);
    }
  }

  /**
   * Track conversion funnel step
   */
  trackFunnelStep(funnelName: string, stepNumber: number, stepName: string, success: boolean, metadata?: Record<string, any>) {
    const eventData = {
      funnel_name: funnelName,
      funnel_step: stepNumber,
      funnel_step_name: stepName,
      funnel_step_success: success,
      ...metadata,
    };

    analytics.track('page_viewed', eventData);

    // Hotjar funnel tracking
    if (this.hotjarInitialized && (window as any).hj) {
      (window as any).hj('event', `funnel_${funnelName}_step_${stepNumber}_${success ? 'success' : 'failed'}`);
    }

    if (this.isDevelopment) {
      console.log('🎯 Funnel step:', eventData);
    }
  }

  /**
   * Identify user for session recordings
   */
  identifyUser(userId: string, attributes?: Record<string, any>) {
    // Identify in analytics
    analytics.identify(userId, attributes);

    // Identify in Hotjar
    if (this.hotjarInitialized && (window as any).hj) {
      (window as any).hj('identify', userId, attributes);
    }

    // Identify in Mouseflow
    if (this.mouseflowInitialized && (window as any)._mfq) {
      (window as any)._mfq.push(['setVariable', 'userId', userId]);
      if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
          (window as any)._mfq.push(['setVariable', key, value]);
        });
      }
    }

    if (this.isDevelopment) {
      console.log('👤 User identified:', userId, attributes);
    }
  }

  /**
   * Trigger Hotjar survey
   */
  triggerSurvey(surveyId: string) {
    if (!this.hotjarInitialized || typeof window === 'undefined') return;

    if ((window as any).hj) {
      (window as any).hj('event', `survey_${surveyId}`);
    }
  }

  /**
   * Tag session with custom attributes
   */
  tagSession(tags: Record<string, string | number | boolean>) {
    // Tag in Mouseflow
    if (this.mouseflowInitialized && (window as any)._mfq) {
      Object.entries(tags).forEach(([key, value]) => {
        (window as any)._mfq.push(['setVariable', key, value]);
      });
    }

    // Tag in Hotjar
    if (this.hotjarInitialized && (window as any).hj) {
      Object.entries(tags).forEach(([key, value]) => {
        (window as any).hj('event', `${key}_${value}`);
      });
    }

    if (this.isDevelopment) {
      console.log('🏷️ Session tagged:', tags);
    }
  }

  /**
   * Track error for session replay context
   */
  trackError(errorType: string, errorMessage: string, errorStack?: string, metadata?: Record<string, any>) {
    const errorData = {
      error_type: errorType,
      error_message: errorMessage,
      error_stack: errorStack,
      url: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    // Track in analytics
    analytics.track('page_viewed', errorData);

    // Tag session with error
    this.tagSession({
      has_error: true,
      error_type: errorType,
    });

    if (this.isDevelopment) {
      console.error('🚨 Error tracked:', errorData);
    }
  }

  /**
   * Track scroll depth (for content engagement)
   */
  trackScrollDepth(percentage: number, pageName?: string) {
    if (percentage % 25 !== 0) return; // Only track 25%, 50%, 75%, 100%

    analytics.track('page_viewed', {
      scroll_depth: percentage,
      page_name: pageName || (typeof window !== 'undefined' ? document.title : ''),
      url: typeof window !== 'undefined' ? window.location.href : '',
    });

    if (this.isDevelopment) {
      console.log(`📜 Scroll depth: ${percentage}%`);
    }
  }

  /**
   * Track time spent on page
   */
  trackTimeOnPage(seconds: number, pageName?: string) {
    analytics.track('page_viewed', {
      time_on_page: seconds,
      page_name: pageName || (typeof window !== 'undefined' ? document.title : ''),
      url: typeof window !== 'undefined' ? window.location.href : '',
    });
  }

  /**
   * Opt user out of tracking (POPIA compliance)
   */
  optOut() {
    if (typeof window === 'undefined') return;

    // Opt out of Hotjar
    if ((window as any).hj) {
      (window as any).hj('optOut');
    }

    // Opt out of Mouseflow
    if ((window as any)._mfq) {
      (window as any)._mfq.push(['stop']);
    }

    // Store opt-out preference
    localStorage.setItem('data_collection_opt_out', 'true');

    if (this.isDevelopment) {
      console.log('🚫 User opted out of tracking');
    }
  }

  /**
   * Check if user has opted out
   */
  hasOptedOut(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('data_collection_opt_out') === 'true';
  }

  /**
   * Initialize all data collection services
   */
  initAll() {
    if (this.hasOptedOut()) {
      console.log('⚠️ Data collection disabled - user opted out');
      return;
    }

    this.initHotjar();
    this.initMouseflow();

    if (this.isDevelopment) {
      console.log('📊 Data collection services initialized');
    }
  }
}

// Singleton instance
export const dataCollection = new DataCollectionService();

// Auto-initialize on import (respects opt-out)
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => dataCollection.initAll());
  } else {
    dataCollection.initAll();
  }
}

/**
 * React Hook for scroll depth tracking
 */
export const useScrollDepthTracking = (pageName?: string) => {
  if (typeof window === 'undefined') return;

  const tracked = new Set<number>();

  const handleScroll = () => {
    const scrollPercentage = Math.round(
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    );

    [25, 50, 75, 100].forEach((milestone) => {
      if (scrollPercentage >= milestone && !tracked.has(milestone)) {
        tracked.add(milestone);
        dataCollection.trackScrollDepth(milestone, pageName);
      }
    });
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  return () => window.removeEventListener('scroll', handleScroll);
};

/**
 * React Hook for time on page tracking
 */
export const useTimeOnPageTracking = (pageName?: string) => {
  if (typeof window === 'undefined') return;

  const startTime = Date.now();

  return () => {
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    dataCollection.trackTimeOnPage(timeSpent, pageName);
  };
};
