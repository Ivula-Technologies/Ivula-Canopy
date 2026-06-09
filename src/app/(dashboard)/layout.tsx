import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Super admin without org — send to super admin panel (future)
  if (!profile.organization_id && profile.role !== 'super_admin') {
    redirect('/onboarding')
  }

  const { data: org } = profile.organization_id
    ? await supabase.from('organizations').select('*').eq('id', profile.organization_id).single()
    : { data: null }

  if (!org && profile.role !== 'super_admin') redirect('/onboarding')

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar org={org!} profile={profile} />
      <main className="flex-1 ml-64 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
