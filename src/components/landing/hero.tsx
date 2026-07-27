import Link from 'next/link'
import Image from 'next/image'

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
            A simpler way to run people-powered programs
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-950 sm:text-5xl md:text-6xl">
            Stop running your organization from scattered spreadsheets.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Ivula Canopy gives growing U.S. nonprofits, churches, and community teams one clear place to manage people,
            volunteers, events, attendance, announcements, and reports.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex justify-center rounded-lg bg-sky-700 px-6 py-3 font-semibold text-white shadow-lg shadow-sky-700/20 transition-colors duration-200 hover:bg-sky-600"
            >
              Start your free trial
            </Link>
            <a
              href="mailto:hello@ivulatechnologies.com?subject=Ivula%20Canopy%20Demo%20Request"
              className="inline-flex justify-center rounded-lg border border-sky-600 bg-white px-6 py-3 font-semibold text-sky-700 transition-colors duration-200 hover:bg-sky-50"
            >
              Request a Demo
            </a>
          </div>
          <p className="mt-3 text-center text-sm text-gray-500 sm:text-left">14 days free. No credit card required.</p>

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
            <Image
              src="/landing/participation.png"
              alt="Program participation dashboard"
              width={527}
              height={433}
              sizes="(min-width: 1024px) 34vw, 72vw"
              className="w-full rounded-xl"
            />
          </div>

          {/* Main Dashboard */}
          <div className="absolute left-1/2 top-4 z-30 w-[94%] -translate-x-1/2 rounded-2xl bg-white p-3 shadow-2xl transition-transform duration-300 hover:scale-[1.02]">
            <Image
              src="/landing/engagement.png"
              alt="Engagement dashboard"
              width={1072}
              height={455}
              sizes="(min-width: 1024px) 45vw, 94vw"
              priority
              className="w-full rounded-xl"
            />
          </div>

          {/* Right Dashboard */}
          <div className="absolute right-0 top-72 z-20 w-[72%] rounded-2xl bg-white p-3 shadow-2xl transition-transform duration-300 hover:scale-[1.02] sm:-right-8 sm:w-[75%]">
            <Image
              src="/landing/attendance.png"
              alt="Attendance dashboard"
              width={511}
              height={424}
              sizes="(min-width: 1024px) 34vw, 72vw"
              className="w-full rounded-xl"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
