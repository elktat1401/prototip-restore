import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Prototip: lint/typing build'i bloke etmesin; demo hızlı ayağa kalksın.
  eslint: { ignoreDuringBuilds: true },
  // PGlite (WASM) ve pg sunucu tarafında dış paket olarak kalsın (bundle edilmesin).
  serverExternalPackages: ['@electric-sql/pglite', 'pg']
};

export default nextConfig;
