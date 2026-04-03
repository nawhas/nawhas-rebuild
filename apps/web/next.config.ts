import type { NextConfig } from 'next';

const cdnHostname = process.env.NEXT_PUBLIC_CDN_HOSTNAME;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lint runs in the dedicated CI quality job — skip during `next build` to avoid
  // false positives from Next.js-transformed code (e.g. import() in error.tsx).
  eslint: { ignoreDuringBuilds: true },
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
};

export default nextConfig;
