import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath, siteUrl } from '@/lib/site-url'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))
  const base = siteUrl(request)
  const resettingPassword = next.startsWith('/reset-password')

  // Supabase sends people back with ?error=... when a link has expired or was
  // already used.
  if (searchParams.get('error')) {
    return NextResponse.redirect(`${base}${resettingPassword ? '/forgot-password?expired=1' : '/login?link=expired'}`)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      // Usually the email link was opened in a different browser from the one
      // used to sign up. Supabase has already confirmed the email by now, so
      // signing in with the password works.
      return NextResponse.redirect(`${base}${resettingPassword ? '/forgot-password?expired=1' : '/login?link=used'}`)
    }
  }

  return NextResponse.redirect(`${base}${next}`)
}
