/**
 * Centralized API Configuration
 *
 * This ensures we always use HTTPS in production and centralizes
 * the API URL to avoid scattered environment variable usage.
 */

// Get the API URL from environment, with smart defaults
function getApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || 'https://rostracore-production.up.railway.app';

  // Always force HTTPS for Railway URLs (Railway always supports HTTPS)
  // This runs at BUILD TIME, so we can't rely on window checks
  if (envUrl.includes('railway.app')) {
    return envUrl.replace('http://', 'https://');
  }

  // For local development, allow HTTP
  if (envUrl.includes('localhost')) {
    return envUrl;
  }

  // For all other production URLs, force HTTPS
  return envUrl.replace('http://', 'https://');
}

export const API_URL = getApiUrl();

// Helper to make API calls with the correct base URL
export function apiUrl(path: string): string {
  const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
