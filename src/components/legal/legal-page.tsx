import Link from 'next/link'
import Image from 'next/image'

// Shared frame for the Terms and Privacy pages.
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/canopy-mark.svg" alt="" width={41} height={32} className="h-8 w-auto object-contain" />
            <span className="font-display text-xl font-bold text-canopy-900">Canopy</span>
          </Link>
          <Link href="/signup" className="text-sm font-medium text-canopy-700 hover:underline">Start free trial</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold text-canopy-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated {updated}</p>
        <div className="mt-8 space-y-6 text-[15px] leading-7 text-gray-700 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_a]:text-canopy-700 [&_a]:underline">
          {children}
        </div>
      </main>
      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        <Link href="/terms" className="hover:text-canopy-700">Terms</Link>
        <span className="mx-2">·</span>
        <Link href="/privacy" className="hover:text-canopy-700">Privacy</Link>
        <span className="mx-2">·</span>
        <a href="mailto:hello@ivulatechnologies.com" className="hover:text-canopy-700">hello@ivulatechnologies.com</a>
      </footer>
    </div>
  )
}
