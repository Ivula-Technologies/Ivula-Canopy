import Link from 'next/link'

export function LandingCta() {
  return (
    <section className="bg-sky-800 px-6 py-20 text-white">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-200">Ready when you are</p>
        <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Give your team one place to run the work that matters.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-sky-100">
          Start organizing people, programs, and participation today. You can explore Canopy for 14 days with no credit card required.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="rounded-lg bg-white px-6 py-3 font-semibold text-sky-800 transition-colors hover:bg-sky-50">
            Start free for 14 days
          </Link>
          <a href="mailto:hello@ivulatechnologies.com?subject=Ivula%20Canopy%20Demo%20Request" className="rounded-lg border border-sky-300 px-6 py-3 font-semibold text-white transition-colors hover:bg-sky-700">
            Talk to our team
          </a>
        </div>
      </div>
    </section>
  )
}
