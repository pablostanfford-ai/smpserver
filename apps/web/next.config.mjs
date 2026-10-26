/** @type {import('next').NextConfig} */
const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',

  // Все /api/* запросы проксируются в Express — cookies остаются same-origin,
  // поэтому браузер не требует CORS и CSRF-защита работает без послаблений.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_INTERNAL_URL}/api/:path*` }];
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'crafatar.com' },
      { protocol: 'https', hostname: 'minotar.net' },
      { protocol: 'https', hostname: 'mc-heads.net' },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
