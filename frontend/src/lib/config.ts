/**
 * Centralized API Configuration
 *
 * SOLUTION: Use Vercel rewrites to proxy API calls.
 * - Browser requests /api/v1/* from same origin (HTTPS, no Mixed Content)
 * - Vercel rewrites to Railway backend server-to-server
 *
 * @version 5.0 - Dec 8 2025 - Added console log for deployment verification
 */

// Log version on load to verify deployment
if (typeof window !== 'undefined') {
  console.log('[RostraCore] API Config v5.0 loaded - using Vercel rewrites');
}

/**
 * Get the API URL base.
 * ALWAYS returns empty string (same-origin).
 * - Production: Vercel rewrites proxy /api/* to Railway
 * - Development: Next.js rewrites proxy /api/* to localhost:8000
 *
 * IMPORTANT: Do NOT use process.env.NEXT_PUBLIC_API_URL here!
 * Vercel may have an old env var set that would override our empty string.
 */
export function getApiUrl(): string {
  // Always same-origin — Next.js rewrites (dev) and Vercel rewrites (prod)
  // handle proxying to the backend
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
