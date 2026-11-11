// The Google Play app (android/) is this website in a Trusted Web Activity.
// Play requires its own billing for subscriptions bought inside an app, and we
// keep every payment on the website instead, so the app never shows prices,
// plan pickers or checkout.
//
// The app opens /dashboard?app=android. This script remembers that for the
// app's own tab (sessionStorage, so ordinary Chrome tabs on the same phone still
// show pricing) and sets <html data-app="android"> before the first paint.
// globals.css then hides everything marked data-hide-in-app and shows anything
// marked data-only-in-app, and the pages in APP_REDIRECTS send the app elsewhere.

/** Marketing pages with prices: inside the app they open the dashboard instead. */
export const APP_REDIRECTS: Record<string, string> = {
  '/': '/dashboard',
}

export const APP_PLATFORM_SCRIPT = `(function(){try{var k='app_platform',s=window.sessionStorage;if(new URLSearchParams(location.search).get('app')==='android'||document.referrer.indexOf('android-app://')===0)s.setItem(k,'android');if(s.getItem(k)!=='android')return;document.documentElement.setAttribute('data-app','android');var to=${JSON.stringify(APP_REDIRECTS)}[location.pathname.replace(/(.)\\/$/,'$1')];if(to)location.replace(to)}catch(e){}})()`

/** Package name of the Play app, and the upload key's fingerprint (android/README.md). */
export const ANDROID_PACKAGE = 'com.ivulatechnologies.canopy'
export const UPLOAD_KEY_SHA256 =
  'DA:4A:C3:F4:37:3B:61:82:10:D1:9F:12:33:06:22:9B:1B:27:1D:F1:83:34:C5:37:AE:2D:7A:03:85:F5:DC:CB'

/**
 * Digital Asset Links: proves to Android that the Play app and this site belong
 * together, so the app opens full screen without a browser bar. Play re-signs
 * the app with its own key, whose fingerprint (Play Console > App integrity) goes
 * in ANDROID_SHA256_FINGERPRINTS, comma-separated; no rebuild needed.
 */
export function assetLinks(extraFingerprints = process.env.ANDROID_SHA256_FINGERPRINTS ?? '') {
  const fingerprints = [UPLOAD_KEY_SHA256, ...extraFingerprints.split(',')]
    .map((f) => f.trim().toUpperCase())
    .filter((f, i, all) => f && all.indexOf(f) === i)
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: ANDROID_PACKAGE, sha256_cert_fingerprints: fingerprints },
    },
  ]
}
