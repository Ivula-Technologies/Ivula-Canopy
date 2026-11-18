import type { NextConfig } from 'next'

// Basic browser protections for every page. Canopy is never shown inside
// another site's frame, so framing is limited to Canopy itself.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
]

const nextConfig: NextConfig = {
  // Shown by /api/health and in alert emails, so you can tell which build is live.
  env: {
    CANOPY_BUILD: (process.env.GITHUB_SHA || 'dev').slice(0, 7),
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
