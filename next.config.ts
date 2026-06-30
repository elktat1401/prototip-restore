import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Prototip: lint/typing build'i bloke etmesin; demo hızlı ayağa kalksın.
  eslint: { ignoreDuringBuilds: true }
};

export default nextConfig;
