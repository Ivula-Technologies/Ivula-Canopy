import type { NextRequest } from 'next/server'

// The address people use to reach Canopy. On cPanel the Node server sits
// behind Apache, so request.url carries the internal address
// (http://0.0.0.0:3000) and redirects built from it lead nowhere.
export function siteUrl(req?: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '')
  if (configured) return configured
  const host = req?.headers.get('x-forwarded-host') || req?.headers.get('host')
  if (host) {
    const proto = req?.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https'
    return `${proto}://${host}`
  }
  return 'http://localhost:3000'
}

// Only paths on this site, so a crafted link can't bounce people elsewhere.
export function safeNextPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback
  return next
}
