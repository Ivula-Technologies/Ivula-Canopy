const features = [
  {
    title: 'People Directory',
    description:
      'Keep members, volunteers, staff, donors, and stakeholders organized with the context your team needs to serve them well.',
  },
  {
    title: 'Volunteer Coordination',
    description:
      'Group people into teams, ministries, committees, projects, or departments so coordinators always know who is responsible for what.',
  },
  {
    title: 'Events & Attendance',
    description:
      'Plan activities, track participation, and understand which programs are helping people stay connected.',
  },
  {
    title: 'Engagement Dashboard',
    description:
      'Turn day-to-day activity into leadership-ready insight about participation trends, volunteer activity, and organizational growth.',
  },
  {
    title: 'Announcements',
    description: 'Reach the right people quickly with centralized announcements instead of scattered texts and email threads.',
  },
  {
    title: 'Reports & Exports',
    description: 'Create clear reports and CSV exports for board meetings, staff reviews, donor updates, and operational planning.',
  },
]

const outcomes = [
  'Reduce duplicate data entry',
  'Give leaders one shared source of truth',
  'Help volunteers and staff save time every week',
]

export function LandingFeatures() {
  return (
    <section id="features" className="bg-sky-50 px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Built for daily operations</p>
          <h2 className="mt-3 text-4xl font-bold text-gray-900">Everything your community team needs to stay organized</h2>
          <p className="mt-4 text-lg text-gray-600">
            Replace disconnected spreadsheets and scattered tools with a single workspace for the people, programs, and
            decisions that keep your organization moving.
          </p>
        </div>

        <div className="mt-10 grid gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-100 sm:grid-cols-3">
          {outcomes.map((outcome) => (
            <div key={outcome} className="rounded-xl bg-sky-50 px-4 py-3 text-center text-sm font-semibold text-sky-900">
              {outcome}
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-3 leading-7 text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
