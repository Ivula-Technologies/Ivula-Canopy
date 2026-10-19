import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBillingPortalSession } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
    if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 400 })

    const { data: org } = await supabase
      .from('organizations').select('stripe_customer_id').eq('id', profile.organization_id).single()
    if (!org?.stripe_customer_id) {
      return NextResponse.json({ error: 'Choose a plan first to set up billing.' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
    const session = await createBillingPortalSession(org.stripe_customer_id, `${appUrl}/settings`)
    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Could not open billing'
    console.error('POST /api/stripe/portal:', msg)
    return NextResponse.json({ error: 'Could not open billing right now. Please try again.' }, { status: 500 })
  }
}
