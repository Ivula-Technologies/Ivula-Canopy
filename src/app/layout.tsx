import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Ivula Canopy — The OS for Mission-Driven Organizations',
  description:
    'Manage your members, teams, attendance, and engagement from one platform. Built for nonprofits, churches, and community organizations.',
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
