import Link from 'next/link'

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 bg-white flex justify-between items-center px-6 md:px-8 py-4 shadow-sm">
      {/* Logo */}
      <div className="h-10 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/ivula.png" alt="Ivula Logo" className="w-auto h-10 object-contain" />
        <h1 className="text-xl md:text-2xl font-bold text-sky-700">IVULA CANOPY</h1>
      </div>

      {/* Navigation Links */}
      <div className="hidden md:flex gap-8 font-medium text-gray-700">
        <a href="#features" className="hover:text-blue-600 transition-colors duration-200">Features</a>
        <a href="#how-it-works" className="hover:text-blue-600 transition-colors duration-200">How It Works</a>
        <a href="#audience" className="hover:text-blue-600 transition-colors duration-200">Audience</a>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 items-center">
        <Link
          href="/login"
          className="hidden sm:inline-block text-sky-700 px-4 py-2.5 rounded-lg hover:bg-sky-50 transition-colors duration-200 font-medium"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="bg-sky-700 text-white px-5 md:px-6 py-2.5 md:py-3 rounded-lg hover:bg-sky-600 transition-colors duration-200 inline-block font-medium"
        >
          Get Started
        </Link>
      </div>
    </nav>
  )
}
