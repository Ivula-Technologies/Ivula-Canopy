import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ cancelToken: string }> }) {
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
