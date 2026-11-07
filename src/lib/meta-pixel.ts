// Meta (Facebook/Instagram) Pixel helpers. The pixel only loads when
// NEXT_PUBLIC_META_PIXEL_ID is set, so every call here is a safe no-op otherwise.

type Fbq = (command: 'init' | 'track' | 'trackCustom', name: string, params?: Record<string, unknown>) => void

declare global {
  interface Window {
    fbq?: Fbq
  }
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || ''

// The pixel only measures the public pages an ad sends people to. It never runs in the
// signed-in app or on the pages volunteers, members and signers open (/serve, /signup/<token>,
// /checkin, /portal), because those hold church members' details. The privacy policy says so.
const PIXEL_PAGES = new Set(['/', '/signup'])

export function isPixelPage(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return PIXEL_PAGES.has(path)
}

export function trackMetaEvent(name: string, params?: Record<string, unknown>) {
  if (!META_PIXEL_ID || typeof window === 'undefined' || !window.fbq) return
  if (!isPixelPage(window.location.pathname)) return
  window.fbq('track', name, params)
}
