import Link from 'next/link'

export function LandingHero() {
  return (
    <section className="bg-gradient-to-br from-sky-300 to-white min-h-[80vh] flex items-center px-6 py-16">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        {/* Left Side */}
        <div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight text-gray-900">
            Empower Your Community with Better Engagement
          </h1>

          <p className="mt-6 text-lg text-gray-600 max-w-xl">
            Manage people, volunteers, programs, teams, and engagement insights
            with a modern platform built for real organizational work.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="bg-sky-700 text-white px-6 py-3 rounded-lg hover:bg-sky-600 transition-colors duration-200 inline-block font-medium"
            >
              Get Started Free
            </Link>
            <a
              href="mailto:hello@ivulatechnologies.com?subject=Ivula%20Canopy%20Demo%20Request"
              className="border border-sky-600 text-sky-700 px-6 py-3 rounded-lg hover:bg-sky-50 transition-colors duration-200 inline-block font-medium"
            >
              Request a Demo
            </a>
          </div>
        </div>

        {/* Right Side Dashboard Showcase */}
        <div className="hidden md:block relative h-[650px] w-full">
          {/* Left Dashboard */}
          <div className="absolute -left-8 top-72 w-[75%] bg-white p-3 rounded-2xl shadow-2xl hover:scale-105 transition-transform duration-300 z-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/participation.png" alt="Program Participation" className="rounded-xl w-full" />
          </div>

          {/* Main Dashboard */}
          <div className="absolute left-1/2 -translate-x-1/2 top-4 w-[93%] bg-white p-3 rounded-2xl shadow-2xl hover:scale-105 transition-transform duration-300 z-30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/engagement.png" alt="Engagement dashboard" className="rounded-xl w-full" />
          </div>

          {/* Right Dashboard */}
          <div className="absolute -right-8 top-72 w-[75%] bg-white p-3 rounded-2xl shadow-2xl hover:scale-105 transition-transform duration-300 z-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/attendance.png" alt="Attendance dashboard" className="rounded-xl w-full" />
          </div>
        </div>
      </div>
    </section>
  )
}
