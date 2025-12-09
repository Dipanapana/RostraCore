/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

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

  // REMOVED: Rewrites were causing issues - API route handler is the only proxy now
  // The rewrite was taking precedence over the API route for unknown reasons
  // async rewrites() { ... }
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
