import Link from 'next/link'
import Image from 'next/image'
import { DriftingGlow, Reveal, Stagger, StaggerItem } from './motion'

const proofPoints = [
  'Built for U.S. nonprofits, churches, and community teams',
  'Volunteer hours, attendance, teams, announcements, and reports in one place',
  'Simple enough for part-time admins and volunteer coordinators',
]

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-canopy-950 via-canopy-900 to-canopy-700 px-6 py-16 sm:py-20 lg:py-24">
      <DriftingGlow className="-left-32 -top-32 h-96 w-96 bg-sun-400/20" />
      <DriftingGlow className="-bottom-40 right-0 h-[28rem] w-[28rem] bg-canopy-400/30" distance={-50} duration={18} />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
        {/* Left Side */}
        <Stagger stagger={0.12}>
          <StaggerItem>
          <p className="mb-4 inline-flex rounded-full border border-sun-300/30 bg-white/5 px-4 py-2 text-sm font-semibold text-sun-200 shadow-sm">
            A simpler way to run people-powered programs
          </p>
          </StaggerItem>
          <StaggerItem>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-sun-100 sm:text-5xl md:text-6xl">
            Stop running your organization from scattered spreadsheets.
          </h1>
          </StaggerItem>
          <StaggerItem>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-canopy-100">
            Ivula Canopy gives growing U.S. nonprofits, churches, and community teams one clear place to manage people,
            volunteers, events, attendance, announcements, and reports.
          </p>
          </StaggerItem>
          <StaggerItem>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex justify-center rounded-lg bg-sun-400 px-6 py-3 font-semibold text-canopy-950 shadow-lg shadow-sun-500/30 transition-colors duration-200 hover:bg-sun-300"
            >
              Start your free trial
            </Link>
            <a
              href="mailto:hello@ivulatechnologies.com?subject=Ivula%20Canopy%20Demo%20Request"
              className="inline-flex justify-center rounded-lg border border-sun-200/60 bg-transparent px-6 py-3 font-semibold text-sun-100 transition-colors duration-200 hover:bg-white/10"
            >
              Request a Demo
            </a>
          </div>
          <p className="mt-3 text-center text-sm text-canopy-200 sm:text-left">14 days free. No credit card required.</p>

          </StaggerItem>
          <StaggerItem>
          <ul className="mt-8 grid gap-3 text-sm text-canopy-50 sm:grid-cols-3">
            {proofPoints.map((point) => (
              <li key={point} className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-sm">
                <span className="mb-2 block h-1.5 w-8 rounded-full bg-sun-400" />
                {point}
              </li>
            ))}
          </ul>
          </StaggerItem>
        </Stagger>

        {/* Right Side Dashboard Showcase */}
        <Reveal delay={0.3} y={48} className="relative mx-auto h-[520px] w-full max-w-xl sm:h-[620px] lg:h-[650px]">
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
        </Reveal>
      </div>
    </section>
  )
}
