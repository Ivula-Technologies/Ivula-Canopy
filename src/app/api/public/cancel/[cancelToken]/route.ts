import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { clientIp } from '@/lib/rate-limit'
import { durableRateLimit } from '@/lib/durable-rate-limit'

export async function POST(req: NextRequest, { params }: { params: Promise<{ cancelToken: string }> }) {
  const limited = await durableRateLimit(`cancel:${clientIp(req)}`, 60, 10 * 60_000)
  if (limited) return limited
  const { cancelToken } = await params
  const admin = await createServiceClient()

  const { data: signup, error } = await admin
    .from('shift_signups')
    .select('id, status')
    .eq('cancel_token', cancelToken)
    .single()

  if (error || !signup) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (signup.status === 'cancelled') return NextResponse.json({ error: 'Already cancelled' }, { status: 409 })

  await admin.from('shift_signups').update({ status: 'cancelled' }).eq('id', signup.id)

  return NextResponse.json({ ok: true })
}
