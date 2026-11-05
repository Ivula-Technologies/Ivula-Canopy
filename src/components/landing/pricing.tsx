import Link from 'next/link'
import { PLANS, formatPeopleLimit } from '@/lib/plans'
import { Reveal, Stagger, StaggerItem } from './motion'

const included = [
  'Volunteer shifts with public sign-up links and reminders',
  'QR code check-in and attendance tracking',
  'Volunteer hours portal',
  'Donor records and printable receipts',
  'Teams, events, tasks and announcements',
  'Reports and CSV exports',
]

export function LandingPricing() {
  return (
    <section id="pricing" className="bg-white px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-canopy-700">Pricing</p>
          <h2 className="mt-3 text-4xl font-bold text-gray-900">Every feature on every plan</h2>
          <p className="mt-4 text-lg text-gray-600">
            Pick a plan by the size of your community. Try everything free for 14 days, no credit card required.
          </p>
        </Reveal>

        <Stagger className="mt-12 grid gap-6 md:grid-cols-3" stagger={0.1}>
          {PLANS.map((plan) => {
            const featured = plan.id === 'growth'
            return (
              <StaggerItem
                key={plan.id}
                hover
                className={`flex flex-col rounded-2xl p-8 shadow-sm ${
                  featured ? 'bg-canopy-900 text-sun-50 ring-2 ring-sun-400' : 'bg-canopy-50 text-gray-900 ring-1 ring-canopy-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  {featured && (
                    <span className="rounded-full bg-sun-400 px-3 py-1 text-xs font-semibold text-canopy-950">Most popular</span>
                  )}
                </div>
                <p className={`mt-2 text-sm ${featured ? 'text-canopy-100' : 'text-gray-600'}`}>{plan.tagline}</p>
                <p className="mt-6">
                  <span className="text-5xl font-bold">${plan.monthlyPrice}</span>
                  <span className={featured ? 'text-canopy-100' : 'text-gray-600'}> / month</span>
                </p>
                <p className={`mt-2 font-medium ${featured ? 'text-sun-300' : 'text-canopy-700'}`}>{formatPeopleLimit(plan)}</p>
                <Link
                  href="/signup"
                  className={`mt-8 rounded-lg px-6 py-3 text-center font-semibold transition-colors ${
                    featured ? 'bg-sun-400 text-canopy-950 hover:bg-sun-300' : 'bg-canopy-700 text-white hover:bg-canopy-600'
                  }`}
                >
                  Start free trial
                </Link>
              </StaggerItem>
            )
          })}
        </Stagger>

        <Reveal delay={0.1} className="mx-auto mt-10 max-w-3xl rounded-2xl bg-canopy-50/60 p-6 ring-1 ring-canopy-100">
          <p className="text-center text-sm font-semibold uppercase tracking-wide text-canopy-700">Included on every plan</p>
          <ul className="mt-4 grid gap-2 text-gray-700 sm:grid-cols-2">
            {included.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-canopy-600">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
