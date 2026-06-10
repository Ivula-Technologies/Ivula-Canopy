'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UsersRound,
  CalendarDays,
  BarChart3,
  Megaphone,
  Settings,
  LogOut,
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Organization, Profile } from '@/types'
import { getInitials, getSubscriptionLabel } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/teams', label: 'Teams', icon: UsersRound },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

interface SidebarProps {
  org: Organization
  profile: Profile
}

export function Sidebar({ org, profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const subLabel = getSubscriptionLabel(org.subscription_status, org.trial_ends_at)
  const isTrialWarning =
    org.subscription_status === 'trialing' || org.subscription_status === 'past_due'

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <Image src="/logo.svg" alt="Ivula Technologies" width={80} height={28} className="h-7 w-auto" />
        <p className="text-xs text-gray-400 truncate max-w-[120px]">{org.name}</p>
      </div>

      {/* Trial/billing banner */}
      {isTrialWarning && (
        <div className="mx-3 mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
          <p className="text-xs text-amber-400 font-medium">{subLabel}</p>
          <Link href="/settings?tab=billing" className="text-xs text-amber-300 hover:underline">
            Upgrade now →
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-[#00C4F4] text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: profile + settings */}
      <div className="border-t border-gray-800 px-3 py-3 space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-[#00C4F4] text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2 mt-1">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#00C4F4] text-xs font-bold">
            {getInitials(profile.full_name || profile.email)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-200 truncate">
              {profile.full_name || 'Admin'}
            </p>
            <p className="text-xs text-gray-500 truncate">{profile.role.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
