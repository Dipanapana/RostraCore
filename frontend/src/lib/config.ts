/**
 * Centralized API Configuration
 *
 * SOLUTION: Use Vercel rewrites to proxy API calls.
 * - Browser requests /api/v1/* from same origin (HTTPS, no Mixed Content)
 * - Vercel rewrites to Railway backend server-to-server
 *
 * @version 3.0 - Dec 8 2025 - Use Vercel rewrites proxy
 */

/**
 * Get the API URL base.
 * Returns empty string for production (use same-origin via Vercel rewrites)
 * Returns localhost URL for development
 */
export function getApiUrl(): string {
  // In development, use localhost backend
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
  }

  // In production, use same-origin (Vercel rewrites to Railway)
  // Empty string means /api/v1/clients becomes same-origin request
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
