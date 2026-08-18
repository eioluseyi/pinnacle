import { getLocalIpAddress } from '@pinnacle/utils';
import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  allowedDevOrigins: [getLocalIpAddress() || '0.0.0.0'],
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
  // Only enable static export for production builds, leaving dev mode dynamic for rewrites & APIs
  ...(isProd ? { output: 'export' } : {}),

  distDir: 'next-out',
  trailingSlash: true,

  // Rewrites only run in dev mode (when output: 'export' is false)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
