/**
 * Centralized API Configuration
 *
 * CRITICAL: This module handles the Mixed Content issue where API calls
 * use http:// when the page is served over https://.
 *
 * The fix works at RUNTIME, not build time, to handle cached old builds.
 *
 * @version 2.0 - Dec 8 2025 - Force HTTPS at runtime
 */

// Build-time URL (may be http:// if old build is cached)
const BUILD_TIME_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rostracore-production.up.railway.app';

/**
 * Get the API URL with HTTPS forced at RUNTIME.
 * Call this function for every API request to ensure HTTPS.
 */
export function getApiUrl(): string {
  let url = BUILD_TIME_URL;

  // RUNTIME check - if page is HTTPS, force API to HTTPS
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    url = url.replace('http://', 'https://');
  }

  // Also force HTTPS for Railway URLs regardless (Railway always supports HTTPS)
  if (url.includes('railway.app')) {
    url = url.replace('http://', 'https://');
  }

  return url;
}

// For backwards compatibility - but prefer getApiUrl() for fetch calls
export const API_URL = (() => {
  let url = BUILD_TIME_URL;
  // Force HTTPS for Railway at build time
  if (url.includes('railway.app')) {
    url = url.replace('http://', 'https://');
  }
  return url;
})();

// Helper to make API calls with the correct base URL
export function apiUrl(path: string): string {
  const base = getApiUrl();
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}
