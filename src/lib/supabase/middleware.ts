import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!key) {
    throw new Error('Missing Supabase publishable key')
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // API routes handle their own auth — redirecting them to /login turns
  // JSON requests into HTML 405s and breaks fetch() callers
  if (pathname.startsWith('/api')) {
    return supabaseResponse
  }

  // Public routes (no auth required). Volunteers open sign-up, cancel and
  // check-in links without an account, so everything under /signup/ and
  // /checkin/ must stay reachable.
  const publicRoutes = [
    '/', '/login', '/signup', '/callback', '/forgot-password', '/reset-password',
    '/terms', '/privacy', '/robots.txt', '/sitemap.xml',
  ]
  const isPublicRoute =
    publicRoutes.includes(pathname) ||
    pathname.startsWith('/signup/') ||
    pathname.startsWith('/checkin/')

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
