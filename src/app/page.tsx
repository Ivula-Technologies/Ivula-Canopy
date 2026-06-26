import { LandingNav } from '@/components/landing/nav'
import { LandingHero } from '@/components/landing/hero'
import { LandingFeatures } from '@/components/landing/features'
import { LandingHowItWorks } from '@/components/landing/how-it-works'
import { LandingAudience } from '@/components/landing/audience'
import { LandingFooter } from '@/components/landing/footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingAudience />
      <LandingFooter />
    </div>
  )
}
