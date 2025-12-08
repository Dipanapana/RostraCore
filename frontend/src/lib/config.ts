/**
 * Centralized API Configuration
 *
 * This ensures we always use HTTPS in production and centralizes
 * the API URL to avoid scattered environment variable usage.
 */

// Get the API URL from environment, with smart defaults
function getApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  // If env var is set, use it (but ensure HTTPS in production)
  if (envUrl) {
    // Force HTTPS if we're in production (browser check)
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      return envUrl.replace('http://', 'https://');
    }
    return envUrl;
  }

  // Default: production Railway URL
  return 'https://rostracore-production.up.railway.app';
}

export const API_URL = getApiUrl();

// Helper to make API calls with the correct base URL
export function apiUrl(path: string): string {
  const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
