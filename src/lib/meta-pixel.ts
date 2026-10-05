// Meta (Facebook/Instagram) Pixel helpers. The pixel only loads when
// NEXT_PUBLIC_META_PIXEL_ID is set, so every call here is a safe no-op otherwise.

type Fbq = (command: 'init' | 'track' | 'trackCustom', name: string, params?: Record<string, unknown>) => void

declare global {
  interface Window {
    fbq?: Fbq
  }
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || ''

export function trackMetaEvent(name: string, params?: Record<string, unknown>) {
  if (!META_PIXEL_ID || typeof window === 'undefined' || !window.fbq) return
  window.fbq('track', name, params)
}
