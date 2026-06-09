import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBillingPortalSession } from '@/lib/stripe'

export async function POST(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  const { data: org } = await supabase.from('organizations').select('stripe_customer_id').eq('id', profile!.organization_id!).single()

  if (!org?.stripe_customer_id) return NextResponse.json({ error: 'No Stripe customer' }, { status: 400 })

  const session = await createBillingPortalSession(
    org.stripe_customer_id,
    `${process.env.NEXT_PUBLIC_APP_URL}/settings`
  )

  return NextResponse.json({ url: session.url })
}
