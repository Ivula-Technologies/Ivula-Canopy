import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://canopy.ivulatechnologies.com'),
  title: {
    default: 'Nonprofit & Church Management Software | Ivula Canopy',
    template: '%s | Ivula Canopy',
  },
  description:
    'Manage people, volunteers, events, attendance, announcements, and reports in one simple workspace. Built for growing nonprofits, churches, and community organizations.',
  keywords: [
    'nonprofit management software',
    'church management software',
    'volunteer management software',
    'attendance tracking software',
    'community organization management',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Ivula Canopy',
    title: 'Nonprofit & Church Management Software | Ivula Canopy',
    description: 'Bring people, programs, attendance, volunteers, and reporting into one organized workspace.',
  },
  twitter: {
    card: 'summary',
    title: 'Nonprofit & Church Management Software | Ivula Canopy',
    description: 'Bring people, programs, attendance, volunteers, and reporting into one organized workspace.',
  },
  icons: {
    icon: '/ivula.png',
    shortcut: '/ivula.png',
    apple: '/ivula.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} antialiased bg-gray-50 text-gray-900`}>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
