import Link from 'next/link'

export function LandingFooter() {
  return (
    <footer className="bg-sky-100 text-black py-8">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
        <p>© 2026 Ivula Technologies. Building Solutions. Solving Problems.</p>
        <div className="flex gap-6">
          <Link href="/login" className="hover:text-sky-700 transition-colors">Sign in</Link>
          <Link href="/signup" className="hover:text-sky-700 transition-colors">Get Started</Link>
          <a href="mailto:hello@ivulatechnologies.com" className="hover:text-sky-700 transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  )
}
