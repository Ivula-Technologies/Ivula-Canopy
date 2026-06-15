import Link from 'next/link'
import Image from 'next/image'
import { Users, CalendarDays, BarChart3, Shield, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/ivula.png" alt="Ivula" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="text-xl font-bold text-[#1B2559]">Ivula</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Start free trial</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 border border-cyan-200 px-4 py-1.5 text-sm text-cyan-700 mb-6">
            <Zap className="h-3.5 w-3.5" /> 14-day free trial, no credit card required
          </div>
          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
            The operating system for{' '}
            <span className="text-[#00C4F4]">mission-driven organizations</span>
          </h1>
          <p className="text-xl text-gray-500 mb-8 leading-relaxed">
            Manage members, coordinate teams, track attendance, and measure engagement —
            all in one platform built for nonprofits, churches, and community organizations.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg">Get started free</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">Sign in</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Everything your organization needs
          </h2>
          <p className="text-center text-gray-500 mb-12">
            Replace your spreadsheets, WhatsApp groups, and disconnected tools with one platform.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: 'Member Management',
                desc: 'Complete member directory with profiles, contact info, team assignments, and activity history.',
              },
              {
                icon: CalendarDays,
                title: 'Events & Attendance',
                desc: 'Schedule events and track attendance via admin checklist or QR code self-check-in.',
              },
              {
                icon: BarChart3,
                title: 'Analytics & Insights',
                desc: 'Real-time dashboards showing engagement trends, at-risk members, and organizational health.',
              },
              {
                icon: Users,
                title: 'Teams & Departments',
                desc: 'Organize members into teams, committees, and ministries with leadership assignments.',
              },
              {
                icon: Shield,
                title: 'Secure & Isolated',
                desc: 'Each organization\'s data is completely isolated. Role-based access control built in.',
              },
              {
                icon: Zap,
                title: 'Communication Tools',
                desc: 'Send announcements, event reminders, and member alerts across your organization.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 mb-4">
                  <Icon className="h-5 w-5 text-[#00C4F4]" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to lead with clarity?
          </h2>
          <p className="text-gray-500 mb-8">
            Join organizations that have replaced chaos with structure. Start your free trial today.
          </p>
          <Link href="/signup">
            <Button size="lg">Start your free trial</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-b border-gray-100 px-6 py-8 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} Ivula Technologies. Building Solutions. Solving Problems.</p>
      </footer>
    </div>
  )
}
