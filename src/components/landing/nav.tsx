import Link from 'next/link'
import Image from 'next/image'

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 bg-white flex justify-between items-center px-6 md:px-8 py-4 shadow-sm">
      {/* Logo */}
      <div className="h-10 flex items-center gap-3">
        <Image src="/canopy-mark.svg" alt="" width={46} height={36} className="h-9 w-auto object-contain" />
        <span className="font-display text-2xl md:text-3xl font-bold text-canopy-900">Canopy</span>
      </div>

      {/* Navigation Links */}
      <div className="hidden md:flex gap-8 font-medium text-gray-700">
        <a href="#features" className="hover:text-canopy-600 transition-colors duration-200">Features</a>
        <a href="#how-it-works" className="hover:text-canopy-600 transition-colors duration-200">How It Works</a>
        <a href="#audience" className="hover:text-canopy-600 transition-colors duration-200">Who It Serves</a>
        <a href="#faq" className="hover:text-canopy-600 transition-colors duration-200">FAQ</a>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 items-center">
        <Link
          href="/login"
          className="hidden sm:inline-block text-canopy-700 px-4 py-2.5 rounded-lg hover:bg-canopy-50 transition-colors duration-200 font-medium"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="bg-canopy-700 text-white px-5 md:px-6 py-2.5 md:py-3 rounded-lg hover:bg-canopy-600 transition-colors duration-200 inline-block font-medium"
        >
          Start free
        </Link>
      </div>
    </nav>
  )
}
