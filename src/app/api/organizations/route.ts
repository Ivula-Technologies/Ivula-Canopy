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

    // Link admin profile to org and create their member record in parallel
    await Promise.all([
      supabase
        .from('profiles')
        .update({
          organization_id: org.id,
          full_name: adminName,
          role: 'org_admin',
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

    // Send welcome email (non-blocking — never slows down signup)
    sendWelcomeEmail(adminEmail, name, adminName || 'Admin').catch(() => {})

    return NextResponse.json({ org }, { status: 201 })
  } catch (error) {
    console.error('POST /api/organizations:', error)
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
  }
}
