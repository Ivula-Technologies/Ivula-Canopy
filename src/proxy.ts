import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Next.js 16 renamed middleware to proxy. It runs on Node.js and refreshes the
// Supabase session cookie, then sends signed-out visitors of private pages to /login.
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // The app manifest, service worker and offline page must load signed out,
    // or phones can't install the app from the login screen.
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
