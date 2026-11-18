import { createServiceClient } from '@/lib/supabase/server'
import { createStripeCustomer, deleteStripeCustomer } from '@/lib/stripe'

type Org = { id: string; name: string; stripe_customer_id?: string | null }

/**
 * Returns the organization's Stripe customer, creating it the first time.
 *
 * Two admins choosing a plan at the same moment can each create a customer
 * in Stripe. The save below only fills an empty column, so the first one
 * saved wins; the other request switches to the winner and deletes its own,
 * and both checkouts end up on the same customer. Billing columns are
 * writable only by the service role (migration 010).
 */
export async function ensureStripeCustomer(org: Org, email: string): Promise<string> {
  if (org.stripe_customer_id) return org.stripe_customer_id

  const created = await createStripeCustomer(email, org.name, org.id)
  const admin = await createServiceClient()
  const { data: saved, error } = await admin
    .from('organizations')
    .update({ stripe_customer_id: created.id })
    .eq('id', org.id)
    .is('stripe_customer_id', null)
    .select('id')
  if (error) throw error
  if (saved?.length) return created.id

  const { data: current, error: readError } = await admin
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', org.id)
    .single()
  if (readError) throw readError
  const winner = current?.stripe_customer_id as string | null | undefined
  if (!winner) throw new Error('Could not save the Stripe customer for this organization')
  // A double click gets the same customer back from Stripe, so only delete
  // ours when it really is a second one.
  if (winner !== created.id) await deleteStripeCustomer(created.id)
  return winner
}
