import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@nawhas/db', '@nawhas/types', '@nawhas/ui'],
};

export default nextConfig;
