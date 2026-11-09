import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserAccess, type Permissions } from '@/lib/permissions'

// Who may do what with kids check-in:
// - child records (add, edit, archive): "Manage members"
// - the check-in desk (check in, check out): "Manage events" or "Manage members"
export function canManageChildren(p: Permissions) {
  return p.manage_members
}

export function canRunKidsDesk(p: Permissions) {
  return p.manage_events || p.manage_members
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}

type KidsContext = {
  userId: string
  orgId: string
  permissions: Permissions
  supabase: SupabaseClient
  admin: SupabaseClient
}

/** Signed-in user in an organization with the needed kids permission, or the error response to return. */
export async function kidsContext(need: 'records' | 'desk'): Promise<KidsContext | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getUserAccess(supabase, user.id)
  const allowed = need === 'records' ? canManageChildren(access.permissions) : canRunKidsDesk(access.permissions)
  if (!allowed) {
    return NextResponse.json(
      { error: need === 'records' ? 'You do not have permission to edit children’s records' : 'You do not have permission to run kids check-in' },
      { status: 403 }
    )
  }
  if (!access.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const admin = await createServiceClient()
  return { userId: user.id, orgId: access.organizationId, permissions: access.permissions, supabase, admin }
}
