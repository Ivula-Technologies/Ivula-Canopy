import { describe, expect, it } from 'vitest'
import { runInNewContext } from 'node:vm'
import { APP_PLATFORM_SCRIPT, UPLOAD_KEY_SHA256, assetLinks } from './app-platform'

// Runs the inline <head> script against a fake page and reports what it did.
function runScript({ path = '/dashboard', search = '', referrer = '', stored = {} as Record<string, string> } = {}) {
  const attrs: Record<string, string> = {}
  let redirectedTo: string | null = null
  const store = { ...stored }
  runInNewContext(APP_PLATFORM_SCRIPT, {
    URLSearchParams,
    window: { sessionStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v } } },
    location: { pathname: path, search, replace: (to: string) => { redirectedTo = to } },
    document: { referrer, documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v } } },
  })
  return { app: attrs['data-app'] ?? null, redirectedTo, store }
}

describe('Google Play app detection', () => {
  it('leaves ordinary browser visits alone', () => {
    expect(runScript({ path: '/' })).toMatchObject({ app: null, redirectedTo: null })
  })

  it('marks the app when it opens with ?app=android and remembers it for the tab', () => {
    const first = runScript({ search: '?app=android' })
    expect(first.app).toBe('android')
    expect(runScript({ path: '/events', stored: first.store }).app).toBe('android')
  })

  it('recognises a launch from the Android app by its referrer', () => {
    expect(runScript({ referrer: 'android-app://com.ivulatechnologies.canopy/' }).app).toBe('android')
  })

  it('sends the app from the pricing landing page to the dashboard', () => {
    expect(runScript({ path: '/', search: '?app=android' }).redirectedTo).toBe('/dashboard')
    expect(runScript({ path: '/members', search: '?app=android' }).redirectedTo).toBeNull()
  })
})

describe('assetLinks', () => {
  it('always includes the upload key and adds Play signing keys from the setting, once each', () => {
    const [link] = assetLinks(' aa:bb , AA:BB,,' + UPLOAD_KEY_SHA256.toLowerCase())
    expect(link.target.package_name).toBe('com.ivulatechnologies.canopy')
    expect(link.target.sha256_cert_fingerprints).toEqual([UPLOAD_KEY_SHA256, 'AA:BB'])
  })
})
