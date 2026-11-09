import { Reveal, Stagger, StaggerItem } from './motion'

const features = [
  {
    title: 'People Directory',
    description:
      'Keep members, volunteers, staff, donors, and stakeholders organized with the context your team needs to serve them well.',
  },
  {
    title: 'Volunteer Scheduling',
    description:
      'Post shifts, share one sign-up link for every opening, send reminders automatically, and email the people on each roster.',
  },
  {
    title: 'Events & Attendance',
    description:
      'Plan one-off or repeating events, check people in with a QR code, and see which programs keep people connected.',
  },
  {
    title: 'Kids Check-in',
    description:
      'Check families in at the door, print name labels with allergies, and hand each child back only to an adult holding the matching pickup tag.',
  },
  {
    title: 'Announcements',
    description: 'Reach the right people quickly with centralized announcements instead of scattered texts and email threads.',
  },
  {
    title: 'Dashboard & Reports',
    description:
      'See participation and volunteer trends at a glance, then export clear reports for board meetings, donor updates, and planning.',
  },
]

const outcomes = [
  'Reduce duplicate data entry',
  'Give leaders one shared source of truth',
  'Help volunteers and staff save time every week',
]

export function LandingFeatures() {
  return (
    <section id="features" className="bg-canopy-50 px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-canopy-700">Built for daily operations</p>
          <h2 className="mt-3 text-4xl font-bold text-gray-900">Everything your community team needs to stay organized</h2>
          <p className="mt-4 text-lg text-gray-600">
            Replace disconnected spreadsheets and scattered tools with a single workspace for the people, programs, and
            decisions that keep your organization moving.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-10 grid gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-canopy-100 sm:grid-cols-3">
          {outcomes.map((outcome) => (
            <div key={outcome} className="rounded-xl bg-canopy-50 px-4 py-3 text-center text-sm font-semibold text-canopy-900">
              {outcome}
            </div>
          ))}
        </Reveal>

        <Stagger className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <StaggerItem key={feature.title} hover className="rounded-2xl border border-canopy-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-3 leading-7 text-gray-600">{feature.description}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
