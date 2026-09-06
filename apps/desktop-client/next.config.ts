import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';
const distDir = './dist/next';
const nextConfig: NextConfig = {
  distDir,
  ...(!isDev && { output: 'export' }),
  ...(!isDev && { assetPrefix: './' }),
  trailingSlash: true,
};

export default nextConfig;
