const steps = [
  { number: '01', title: 'Create your workspace', description: 'Set up your nonprofit, church, youth program, or community group in minutes.' },
  { number: '02', title: 'Bring your people in', description: 'Add members, volunteers, staff, and stakeholders so the whole team works from the same list.' },
  { number: '03', title: 'Coordinate programs', description: 'Create teams, events, shifts, and activities that match how your organization actually operates.' },
  { number: '04', title: 'Track participation', description: 'Capture attendance, volunteer hours, and engagement signals as work happens.' },
  { number: '05', title: 'Report with confidence', description: 'Use dashboards and exports to brief staff, boards, donors, and program leaders.' },
]

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="bg-slate-50 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Simple rollout</p>
          <h2 className="mt-3 text-4xl font-bold text-gray-900">Launch without a complicated implementation project</h2>
          <p className="mt-4 text-lg text-gray-600">
            Ivula Canopy is designed for lean teams that need practical software they can adopt quickly.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step) => (
            <div key={step.number} className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-gray-100">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-800 text-lg font-bold text-white">
                {step.number}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
