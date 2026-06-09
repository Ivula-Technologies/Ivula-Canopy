import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  async function updateOrgByCustomer(customerId: string, updates: Record<string, unknown>) {
    await supabase.from('organizations').update(updates).eq('stripe_customer_id', customerId)
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const subAny = sub as unknown as Record<string, unknown>
      await updateOrgByCustomer(sub.customer as string, {
        stripe_subscription_id: sub.id,
        stripe_price_id: sub.items.data[0]?.price.id,
        subscription_status: sub.status,
        current_period_end: subAny.current_period_end
          ? new Date((subAny.current_period_end as number) * 1000).toISOString()
          : null,
      })
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await updateOrgByCustomer(sub.customer as string, {
        subscription_status: 'canceled',
      })
      break
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice
      await updateOrgByCustomer(inv.customer as string, {
        subscription_status: 'past_due',
      })
      break
    }
    case 'invoice.payment_succeeded': {
      const inv = event.data.object as Stripe.Invoice
      await updateOrgByCustomer(inv.customer as string, {
        subscription_status: 'active',
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}

export const config = {
  api: { bodyParser: false },
}
