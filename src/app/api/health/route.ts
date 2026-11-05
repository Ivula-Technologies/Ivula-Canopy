import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Uptime check for UptimeRobot (or any monitor): returns 200 only when the
// required settings are present and the database answers. It lists the
// names of missing settings, never their values.
const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID_STARTER',
  'STRIPE_PRICE_ID_GROWTH',
  'STRIPE_PRICE_ID_PRO',
  'NEXT_PUBLIC_APP_URL',
  'RESEND_API_KEY',
  'CRON_SECRET',
]

export async function GET() {
  const missing = REQUIRED.filter((name) => !process.env[name])
  if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  }

  let database = 'skipped'
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = await createServiceClient()
      const { error } = await supabase.from('organizations').select('id', { head: true, count: 'exact' }).limit(1)
      database = error ? 'error' : 'ok'
    } catch {
      database = 'error'
    }
  }

  const ok = missing.length === 0 && database === 'ok'
  return NextResponse.json(
    { ok, database, missing, time: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  )
}
