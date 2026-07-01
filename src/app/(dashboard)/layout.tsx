import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { TrialBanner } from '@/components/billing/trial-banner'
import { getAccessState } from '@/lib/subscription'
import { getPermissionsFromProfile } from '@/lib/permissions'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Self-heal: users created while the auth trigger was broken have no
  // profile row. Redirecting them to /login loops forever (middleware sends
  // signed-in users back here), so create the missing profile instead.
  if (!profile) {
    const admin = await createServiceClient()
    const { data: created } = await admin
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email!,
        full_name: (user.user_metadata?.full_name as string) || '',
        role: (user.user_metadata?.role as string) || 'org_admin',
      })
      .select()
      .single()
    profile = created
  }

  if (!profile) redirect('/onboarding')

  // Super admin without org — send to super admin panel (future)
  if (!profile.organization_id && profile.role !== 'super_admin') {
    redirect('/onboarding')
  }

  const { data: org } = profile.organization_id
    ? await supabase.from('organizations').select('*').eq('id', profile.organization_id).single()
    : { data: null }

  // Sidebar requires an org — without this guard a null org crashes the
  // client render and the user sees a blank page
  if (!org) redirect('/onboarding')

  const access = getAccessState(org)
  const { permissions } = getPermissionsFromProfile(profile)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar org={org} profile={profile} />
      {/* On mobile the sidebar is a drawer (no left margin) but a 14h top bar
          covers the content, so pad the top. On lg the sidebar is static so
          we offset by its width and drop the top padding. */}
      <main className="flex-1 lg:ml-64 overflow-y-auto pt-14 lg:pt-0">
        <TrialBanner access={access} canManageBilling={permissions.manage_billing} />
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
