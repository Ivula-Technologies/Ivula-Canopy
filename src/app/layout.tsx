import type { Metadata, Viewport } from 'next'
import { Geist, Lora } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { MetaPixel } from '@/components/analytics/meta-pixel'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })
const lora = Lora({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-lora' })

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
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Canopy' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nonprofit & Church Management Software | Ivula Canopy',
    description: 'Bring people, programs, attendance, volunteers, and reporting into one organized workspace.',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1b3d33',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={lora.variable}>
      <body className={`${geist.className} antialiased bg-gray-50 text-gray-900`}>
        {children}
        <SpeedInsights />
        <MetaPixel />
      </body>
    </html>
  )
}
