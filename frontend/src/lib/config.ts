/**
 * Centralized API Configuration
 *
 * SOLUTION: Use Vercel rewrites to proxy API calls.
 * - Browser requests /api/v1/* from same origin (HTTPS, no Mixed Content)
 * - Vercel rewrites to Railway backend server-to-server
 *
 * @version 4.0 - Dec 8 2025 - Hardcode empty string, ignore env vars
 */

/**
 * Get the API URL base.
 * Returns empty string for production (use same-origin via Vercel rewrites)
 * Returns localhost URL for development
 *
 * IMPORTANT: Do NOT use process.env.NEXT_PUBLIC_API_URL here!
 * Vercel may have an old env var set that would override our empty string.
 */
export function getApiUrl(): string {
  // ONLY use localhost in development - check hostname directly
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8001';
  }

  // ALWAYS return empty string in production
  // This makes requests same-origin, Vercel rewrites handle the rest
  return '';
}

// For backwards compatibility
export const API_URL = '';

// Helper to make API calls with the correct base URL
export function apiUrl(path: string): string {
  const base = getApiUrl();
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}
