import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'
import { slugify } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const { name, adminId, adminEmail, adminName } = await req.json()

    if (!name || !adminId || !adminEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Ensure unique slug
    let slug = slugify(name)
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()
    if (existing) slug = `${slug}-${Date.now()}`

    // Create organization — Stripe customer is created lazily at checkout
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
        subscription_status: 'trialing',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (orgError) throw orgError

    // Seed the org's default roles and capture the Administrator role for the creator
    const { data: seededRoles, error: rolesError } = await supabase
      .from('roles')
      .insert([
        { organization_id: org.id, name: 'Administrator', description: 'Full access to everything', is_system: true,
          manage_members: true, delete_members: true, manage_teams: true, manage_events: true,
          manage_announcements: true, manage_billing: true, manage_staff: true },
        { organization_id: org.id, name: 'Leader', description: 'Manage members, teams, events and announcements',
          manage_members: true, delete_members: false, manage_teams: true, manage_events: true,
          manage_announcements: true, manage_billing: false, manage_staff: false },
        { organization_id: org.id, name: 'Member', description: 'View-only access' },
      ])
      .select('id, name')
    // Don't fail signup if seeding breaks (e.g. roles table missing) — the
    // admin still gets full access via the legacy-role fallback. But log it
    // loudly so a broken roles table never silently locks admins out again.
    if (rolesError) console.error('Role seeding failed for org', org.id, ':', rolesError.message)
    const adminRoleId = seededRoles?.find((r) => r.name === 'Administrator')?.id || null

    // Wait for the auth trigger to create the profile row (it runs async after signUp)
    let profile = null
    for (let i = 0; i < 10; i++) {
      const { data } = await supabase.from('profiles').select('id').eq('id', adminId).single()
      if (data) { profile = data; break }
      await new Promise(r => setTimeout(r, 300))
    }

    if (!profile) {
      // Trigger didn't fire — create the profile manually
      await supabase.from('profiles').upsert({
        id: adminId,
        email: adminEmail,
        full_name: adminName || '',
        role: 'org_admin',
      })
    }

    // Link admin profile to org and create their member record in parallel
    const [profileUpdate, memberInsert] = await Promise.all([
      supabase
        .from('profiles')
        .update({
          organization_id: org.id,
          full_name: adminName,
          role: 'org_admin',
          role_id: adminRoleId,
        })
        .eq('id', adminId),
      supabase.from('members').insert({
        organization_id: org.id,
        profile_id: adminId,
        first_name: adminName?.split(' ')[0] || 'Admin',
        last_name: adminName?.split(' ').slice(1).join(' ') || '',
        email: adminEmail,
        status: 'active',
      }),
    ])

    if (profileUpdate.error) console.error('Profile update error:', profileUpdate.error)
    if (memberInsert.error) console.error('Member insert error:', memberInsert.error)

    // Send welcome email (non-blocking — never slows down signup)
    sendWelcomeEmail(adminEmail, name, adminName || 'Admin').catch(() => {})

    return NextResponse.json({ org }, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('POST /api/organizations:', msg)
    return NextResponse.json({ error: msg || 'Failed to create organization' }, { status: 500 })
  }
}
