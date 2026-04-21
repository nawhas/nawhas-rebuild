import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';
import withBundleAnalyzer from '@next/bundle-analyzer';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const cdnHostname = process.env.NEXT_PUBLIC_CDN_HOSTNAME;
const isProd = process.env.NODE_ENV === 'production';
const hasSentryDsn = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN?.trim());
const hasSentryAuthToken = Boolean(process.env.SENTRY_AUTH_TOKEN?.trim());
const isSentryEnabled = hasSentryDsn && hasSentryAuthToken;

// S3/MinIO sources used in CSP (dev: localhost + minio container, prod: CDN hostname)
const s3Sources = [
  'http://localhost:9000',
  'http://minio:9000',
  ...(cdnHostname ? [`https://${cdnHostname}`] : []),
].join(' ');

// Permissive CSP baseline — allows YouTube embeds, S3/MinIO audio, Next.js inline scripts
function buildCsp(): string {
  const directives = [
    "default-src 'self'",
    // Next.js App Router requires unsafe-inline; unsafe-eval needed for dev HMR
    `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"} https://www.youtube.com https://www.youtube-nocookie.com`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https: ${s3Sources}`,
    `media-src 'self' blob: https: ${s3Sources}`,
    'frame-src https://www.youtube.com https://www.youtube-nocookie.com',
    // connect-src: same-origin API, Sentry error reporting, S3 audio presigned URLs
    // Localhost WebSocket (Next.js HMR) is dev-only — must not appear in production headers.
    `connect-src 'self' https://sentry.io https://*.ingest.sentry.io ${s3Sources}${isProd ? '' : ' ws://localhost:3000 wss://localhost:3000'}`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  return directives.join('; ');
}

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Next 16 removed the `eslint` config key — `next build` no longer invokes ESLint.
  // Lint runs in the dedicated CI quality job via `pnpm -F @nawhas/web lint`.
  output: 'standalone',
  transpilePackages: ['@nawhas/db', '@nawhas/types', '@nawhas/ui'],
  images: {
    remotePatterns: [
      // MinIO (dev — accessed from host machine)
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
      // MinIO (dev — accessed from within docker compose network)
      {
        protocol: 'http',
        hostname: 'minio',
        port: '9000',
        pathname: '/**',
      },
      // Production CDN / S3-compatible host — set NEXT_PUBLIC_CDN_HOSTNAME in prod
      ...(cdnHostname
        ? [
            {
              protocol: 'https' as const,
              hostname: cdnHostname,
              pathname: '/**',
            },
          ]
        : []),
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: buildCsp() },
      // HSTS only in production — not safe to preload in dev (localhost not HTTPS)
      ...(isProd
        ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
        : []),
    ];

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

const withAnalyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });
const baseConfig = withAnalyzer(withNextIntl(nextConfig));

const sentryOptions = {
  // Sentry organisation/project slugs — set these in CI via SENTRY_ORG / SENTRY_PROJECT
  ...(process.env.SENTRY_ORG ? { org: process.env.SENTRY_ORG } : {}),
  ...(process.env.SENTRY_PROJECT ? { project: process.env.SENTRY_PROJECT } : {}),

  // Auth token used to upload source maps; set SENTRY_AUTH_TOKEN in CI
  ...(process.env.SENTRY_AUTH_TOKEN ? { authToken: process.env.SENTRY_AUTH_TOKEN } : {}),

  // Only upload source maps in production builds
  sourcemaps: {
    disable: process.env.NODE_ENV !== 'production',
  },

  // Hide the "Sentry is building" progress bar in CI logs
  silent: !process.env.CI,

  // Prevent Sentry from wrapping server components with extra try/catch —
  // Next.js already surfaces those errors; double-wrapping adds noise.
  autoInstrumentServerFunctions: false,

  // Exclude Replay worker from the client bundle — we do not use session
  // replay (replaysSessionSampleRate: 0) so the ~50 kB gz Replay SDK is
  // pure dead weight on every page load.
  bundleSizeOptimizations: {
    excludeReplayWorker: true,
  },
};

if (!isSentryEnabled) {
  const missing = [
    ...(!hasSentryDsn ? ['NEXT_PUBLIC_SENTRY_DSN'] : []),
    ...(!hasSentryAuthToken ? ['SENTRY_AUTH_TOKEN'] : []),
  ];
  console.warn(
    `[sentry] Disabled because required env vars are missing: ${missing.join(', ')}`,
  );
}

export default isSentryEnabled
  ? withSentryConfig(baseConfig, sentryOptions)
  : baseConfig;
