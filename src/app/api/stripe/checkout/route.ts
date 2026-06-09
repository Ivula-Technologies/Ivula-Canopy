import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/stripe'

export async function POST(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const { data: org } = await supabase.from('organizations').select('*').eq('id', profile.organization_id).single()
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const session = await createCheckoutSession({
    customerId: org.stripe_customer_id!,
    priceId: process.env.STRIPE_PRICE_ID!,
    orgId: org.id,
    successUrl: `${appUrl}/settings?billing=success`,
    cancelUrl: `${appUrl}/settings?billing=cancelled`,
    trialDays: 0, // Trial already started at signup
  })

  return NextResponse.json({ url: session.url })
}
