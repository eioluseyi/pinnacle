import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
  output: 'standalone',
  allowedDevOrigins: ['192.168.1.143', '192.168.199.175', '10.84.207.175'],
};

export default nextConfig;
