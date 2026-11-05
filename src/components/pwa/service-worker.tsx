'use client'

import { useEffect } from 'react'

// Registers /sw.js so staff can install Canopy on a phone and see an offline
// page instead of the browser's error when they lose signal.
export function ServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}
