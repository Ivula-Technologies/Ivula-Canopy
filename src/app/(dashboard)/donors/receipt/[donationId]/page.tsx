import { redirect, notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ReceiptClient } from './receipt-client'

export default async function ReceiptPage({ params }: { params: Promise<{ donationId: string }> }) {
  const { donationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect('/onboarding')

  const admin = await createServiceClient()
  const [{ data: donation }, { data: org }] = await Promise.all([
    admin
      .from('donations')
      .select('*, donor:donors(first_name, last_name, email, address)')
      .eq('id', donationId)
      .eq('organization_id', profile.organization_id)
      .single(),
    admin
      .from('organizations')
      .select('name, address, website, logo_url')
      .eq('id', profile.organization_id)
      .single(),
  ])

  if (!donation) notFound()

  return <ReceiptClient donation={donation} org={org || { name: '' }} />
}
