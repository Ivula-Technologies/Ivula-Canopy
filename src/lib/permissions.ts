import type { SupabaseClient } from '@supabase/supabase-js'

// The full set of permission flags a role can grant.
export const PERMISSION_KEYS = [
  'manage_members',
  'delete_members',
  'manage_teams',
  'manage_events',
  'manage_announcements',
  'manage_billing',
  'manage_staff',
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number]

export type Permissions = Record<PermissionKey, boolean>

// Human-readable labels + descriptions for the role editor UI.
export const PERMISSION_META: { key: PermissionKey; label: string; description: string }[] = [
  { key: 'manage_members', label: 'Manage members', description: 'Add and edit members' },
  { key: 'delete_members', label: 'Delete members', description: 'Permanently remove members' },
  { key: 'manage_teams', label: 'Manage teams', description: 'Create, edit and assign teams' },
  { key: 'manage_events', label: 'Manage events', description: 'Create and edit events & attendance' },
  { key: 'manage_announcements', label: 'Manage announcements', description: 'Post and send announcements' },
  { key: 'manage_billing', label: 'Manage billing', description: 'View and change the subscription' },
  { key: 'manage_staff', label: 'Manage staff & roles', description: 'Invite logins and define roles' },
]

export const NO_PERMISSIONS: Permissions = {
  manage_members: false,
  delete_members: false,
  manage_teams: false,
  manage_events: false,
  manage_announcements: false,
  manage_billing: false,
  manage_staff: false,
}

export interface UserAccess {
  permissions: Permissions
  roleName: string
  isSuperAdmin: boolean
}

// Derive permissions from a profile row that already has the role join embedded.
// Use this when you have the profile in hand to avoid a second DB round-trip.
export function getPermissionsFromProfile(profile: {
  role?: string | null
  assigned_role?: unknown
} | null): UserAccess {
  const isSuperAdmin = profile?.role === 'super_admin'
  const rel = profile?.assigned_role as unknown
  const r = (Array.isArray(rel) ? rel[0] : rel) as (Permissions & { name: string }) | null

  if (isSuperAdmin) {
    return {
      isSuperAdmin: true,
      roleName: 'Super Admin',
      permissions: PERMISSION_KEYS.reduce((acc, k) => ({ ...acc, [k]: true }), {} as Permissions),
    }
  }
  if (!r) {
    return { isSuperAdmin: false, roleName: 'No role', permissions: { ...NO_PERMISSIONS } }
  }
  return {
    isSuperAdmin: false,
    roleName: r.name,
    permissions: PERMISSION_KEYS.reduce((acc, k) => ({ ...acc, [k]: !!r[k] }), {} as Permissions),
  }
}

// Load the signed-in user's effective permissions by joining profile -> role.
// super_admin always gets everything.
export async function getUserAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<UserAccess> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, assigned_role:roles(name, manage_members, delete_members, manage_teams, manage_events, manage_announcements, manage_billing, manage_staff)')
    .eq('id', userId)
    .single()

  return getPermissionsFromProfile(profile)
}
