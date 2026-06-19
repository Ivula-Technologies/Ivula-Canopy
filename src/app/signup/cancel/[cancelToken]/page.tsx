import { createServiceClient } from '@/lib/supabase/server'
import CancelClient from './cancel-client'

export default async function CancelPage({ params }: { params: Promise<{ cancelToken: string }> }) {
  const { cancelToken } = await params
  const admin = await createServiceClient()

  const { data } = await admin
    .from('shift_signups')
    .select('id, first_name, email, status, shifts(title, starts_at, ends_at), events(title)')
    .eq('cancel_token', cancelToken)
    .single()

  // Supabase returns arrays for joined relations; normalize to single objects
  const normalized = data ? {
    ...data,
    shifts: Array.isArray(data.shifts) ? (data.shifts[0] ?? null) : data.shifts,
    events: Array.isArray(data.events) ? (data.events[0] ?? null) : data.events,
  } : null

  return <CancelClient signup={normalized as Parameters<typeof CancelClient>[0]['signup']} cancelToken={cancelToken} />
}
