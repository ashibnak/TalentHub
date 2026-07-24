import type { NextConfig } from 'next';

// Security headers applied to every response. The app is fully same-origin
// (next/font self-hosts Vazirmatn; avatars are same-origin/data URIs; no CDN),
// so a tight CSP holds. 'unsafe-inline'/'unsafe-eval' are required by Next's
// runtime and dev HMR; 'unsafe-inline' on styles covers Tailwind's inline vars.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
