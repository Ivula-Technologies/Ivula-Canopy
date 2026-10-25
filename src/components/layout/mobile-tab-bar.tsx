'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, CalendarDays, CheckSquare, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

// Fired to open the sidebar drawer from outside it (see Sidebar).
export const OPEN_MENU_EVENT = 'canopy:open-menu'

const tabs = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
]

// Phone-style tab bar for the pages staff open most. Everything else stays in
// the drawer behind "More". Hidden on lg, where the sidebar is always shown.
export function MobileTabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main"
      className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium',
                  active ? 'text-canopy-700' : 'text-gray-500'
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          )
        })}
        <li>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_MENU_EVENT))}
            className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-gray-500"
          >
            <Menu className="h-5 w-5" />
            More
          </button>
        </li>
      </ul>
    </nav>
  )
}
