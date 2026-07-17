import Link from 'next/link'

const proofPoints = [
  'Built for U.S. nonprofits, churches, and community teams',
  'Volunteer hours, attendance, teams, announcements, and reports in one place',
  'Simple enough for part-time admins and volunteer coordinators',
]

export function LandingHero() {
  return (
    <section className="overflow-hidden bg-gradient-to-br from-sky-50 via-white to-cyan-50 px-6 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
        {/* Left Side */}
        <div>
          <p className="mb-4 inline-flex rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-800 shadow-sm">
            Member and volunteer operations without spreadsheet chaos
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-950 sm:text-5xl md:text-6xl">
            Run your community organization with less admin work and clearer insight.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Ivula Canopy helps growing U.S. churches, nonprofits, youth programs, and volunteer groups manage people,
            events, attendance, teams, outreach, and engagement from one easy dashboard.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex justify-center rounded-lg bg-sky-700 px-6 py-3 font-semibold text-white shadow-lg shadow-sky-700/20 transition-colors duration-200 hover:bg-sky-600"
            >
              Start Free
            </Link>
            <a
              href="mailto:hello@ivulatechnologies.com?subject=Ivula%20Canopy%20Demo%20Request"
              className="inline-flex justify-center rounded-lg border border-sky-600 bg-white px-6 py-3 font-semibold text-sky-700 transition-colors duration-200 hover:bg-sky-50"
            >
              Request a Demo
            </a>
          </div>

          <ul className="mt-8 grid gap-3 text-sm text-gray-700 sm:grid-cols-3">
            {proofPoints.map((point) => (
              <li key={point} className="rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm">
                <span className="mb-2 block h-1.5 w-8 rounded-full bg-sky-500" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Right Side Dashboard Showcase */}
        <div className="relative mx-auto h-[520px] w-full max-w-xl sm:h-[620px] lg:h-[650px]">
          {/* Left Dashboard */}
          <div className="absolute left-0 top-72 z-10 w-[72%] rounded-2xl bg-white p-3 shadow-2xl transition-transform duration-300 hover:scale-[1.02] sm:-left-8 sm:w-[75%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/participation.png" alt="Program participation dashboard" className="w-full rounded-xl" />
          </div>

          {/* Main Dashboard */}
          <div className="absolute left-1/2 top-4 z-30 w-[94%] -translate-x-1/2 rounded-2xl bg-white p-3 shadow-2xl transition-transform duration-300 hover:scale-[1.02]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/engagement.png" alt="Engagement dashboard" className="w-full rounded-xl" />
          </div>

          {/* Right Dashboard */}
          <div className="absolute right-0 top-72 z-20 w-[72%] rounded-2xl bg-white p-3 shadow-2xl transition-transform duration-300 hover:scale-[1.02] sm:-right-8 sm:w-[75%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/attendance.png" alt="Attendance dashboard" className="w-full rounded-xl" />
          </div>
        </div>
      </div>
    </section>
  )
}
