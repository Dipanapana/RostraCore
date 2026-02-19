/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Prevent Next.js from stripping trailing slashes on API proxy URLs.
  // FastAPI expects trailing slashes on router-root endpoints (/incidents/).
  // Without this, Next.js 308-redirects /api/v1/incidents/ → /api/v1/incidents
  // then FastAPI 307-redirects back — leaking the backend hostname and
  // dropping the Authorization header on the cross-origin redirect.
  skipTrailingSlashRedirect: true,

  // Generate unique build ID for cache busting
  generateBuildId: async () => {
    return `build-v6-${Date.now()}`
  },

  // Force no caching on JS bundles to fix stale deployment issues
  async headers() {
    return [
      {
        source: '/:path*.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
        ],
      },
    ]
  },

  // Allow useSearchParams in client components without Suspense boundary
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },

  env: {
    // Use relative URL - API calls go through Vercel rewrites (no Mixed Content!)
    NEXT_PUBLIC_API_URL: '',
  },

  // Disable source maps for development performance
  productionBrowserSourceMaps: false,

  // Ignore ESLint errors during production builds (Vercel deployment)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Ignore TypeScript errors during production builds (react-dnd ref type issues)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Proxy API requests in development to avoid CORS (same-origin)
  // In production, Vercel rewrites handle this server-to-server
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8000/api/:path*',
        },
      ]
    }
    return []
  },
}

// Inject Sentry config via withSentryConfig if Sentry is enabled
const sentryWebpackPluginOptions = {
  // Suppress all Sentry warnings during build
  silent: true,

  // For source map upload (requires SENTRY_AUTH_TOKEN)
  // Upload source maps during build
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Don't upload source maps if no auth token
  dryRun: !process.env.SENTRY_AUTH_TOKEN,
};

// Only wrap with Sentry if DSN is configured
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  const { withSentryConfig } = require('@sentry/nextjs');
  module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
} else {
  module.exports = nextConfig;
}
