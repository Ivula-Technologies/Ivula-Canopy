'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'
import { getSubscriptionLabel, formatDate } from '@/lib/utils'
import type { Organization, Profile } from '@/types'

interface Props {
  org: Organization
  profile: Profile
}

export function SettingsClient({ org, profile }: Props) {
  const [orgForm, setOrgForm] = useState({
    name: org.name,
    description: org.description || '',
    website: org.website || '',
    phone: org.phone || '',
    address: org.address || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState('')

  async function saveOrg() {
    setSaving(true)
    await fetch(`/api/organizations/${org.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orgForm),
    })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  async function manageSubscription() {
    setBillingLoading(true)
    setBillingError('')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not open billing portal')
      window.location.href = data.url
    } catch (e) {
      setBillingError(e instanceof Error ? e.message : 'Something went wrong')
      setBillingLoading(false)
    }
  }

  async function startSubscription() {
    setBillingLoading(true)
    setBillingError('')
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout')
      window.location.href = data.url
    } catch (e) {
      setBillingError(e instanceof Error ? e.message : 'Something went wrong')
      setBillingLoading(false)
    }
  }

  const subLabel = getSubscriptionLabel(org.subscription_status, org.trial_ends_at)
  const hasStripe = !!org.stripe_customer_id

  return (
    <div>
      <PageHeader title="Settings" description="Manage your organization and billing" />

      <div className="space-y-6 max-w-2xl">
        {/* Organization details */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Profile</CardTitle>
            <CardDescription>Update your organization&apos;s public information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Organization name"
              value={orgForm.name}
              onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
            />
            <Textarea
              label="Description"
              value={orgForm.description}
              onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
              rows={2}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Website"
                type="url"
                value={orgForm.website}
                onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
              />
              <Input
                label="Phone"
                value={orgForm.phone}
                onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
              />
            </div>
            <Input
              label="Address"
              value={orgForm.address}
              onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
            />
            <Button onClick={saveOrg} loading={saving}>
              {saved ? '✓ Saved' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Billing */}
        <Card>
          <CardHeader>
            <CardTitle>Billing & Subscription</CardTitle>
            <CardDescription>Manage your plan and payment method</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4 p-4 rounded-lg bg-gray-50">
              <div>
                <p className="font-medium text-gray-900">Current plan</p>
                <p className="text-sm text-gray-500">
                  {org.subscription_status === 'active'
                    ? `Renews ${org.current_period_end ? formatDate(org.current_period_end) : 'monthly'}`
                    : org.trial_ends_at
                    ? `Trial ends ${formatDate(org.trial_ends_at)}`
                    : 'No active subscription'}
                </p>
              </div>
              <Badge
                variant={
                  org.subscription_status === 'active'
                    ? 'default'
                    : org.subscription_status === 'trialing'
                    ? 'warning'
                    : 'destructive'
                }
              >
                {subLabel}
              </Badge>
            </div>

            {billingError && (
              <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {billingError}
              </div>
            )}

            {org.subscription_status === 'active' ? (
              <Button variant="outline" onClick={manageSubscription} loading={billingLoading}>
                Manage Subscription
              </Button>
            ) : (
              <Button onClick={startSubscription} loading={billingLoading}>
                Upgrade to Paid Plan
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Account info */}
        <Card>
          <CardHeader>
            <CardTitle>Your Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-900">{profile.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Role</span>
                <Badge variant="secondary">{profile.role.replace('_', ' ')}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Member since</span>
                <span className="text-gray-900">{formatDate(profile.created_at)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
