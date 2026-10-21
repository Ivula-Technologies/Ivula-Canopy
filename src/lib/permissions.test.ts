import { describe, expect, it } from 'vitest'
import { getPermissionsFromProfile } from './permissions'

describe('getPermissionsFromProfile', () => {
  it('uses the assigned role when there is one', () => {
    const access = getPermissionsFromProfile({
      role: 'org_admin',
      organization_id: 'org-1',
      assigned_role: { name: 'Greeter lead', manage_events: true, manage_billing: false },
    })
    expect(access.organizationId).toBe('org-1')
    expect(access.permissions.manage_events).toBe(true)
    expect(access.permissions.manage_billing).toBe(false)
  })

  it('falls back to the legacy text role', () => {
    const leader = getPermissionsFromProfile({ role: 'org_leader', organization_id: 'org-1', assigned_role: null })
    expect(leader.permissions.manage_events).toBe(true)
    expect(leader.permissions.manage_billing).toBe(false)
  })

  it('gives a plain member and a missing profile nothing', () => {
    expect(Object.values(getPermissionsFromProfile({ role: 'member', assigned_role: null }).permissions).some(Boolean)).toBe(false)
    expect(getPermissionsFromProfile(null).organizationId).toBeNull()
  })
})
